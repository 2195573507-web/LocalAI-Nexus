import http from 'node:http';
import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { NexusFailureCategory, NexusGatewayForwardResult, NexusGatewayRequestKind, NexusGatewayStatus } from '../../../shared/types.js';
import storage from '../../storage.js';
import { recordAudit } from '../../audit.js';
import { routeModel } from '../router/modelRouter.js';
import { recordUsage } from '../usage/usageService.js';
import { clearGatewayRequestActive, markGatewayRequestActive } from '../usage/tokenPolicyService.js';
import { forwardProviderRequest } from '../provider/providerForwardService.js';
import { evaluateGatewayAccess } from './gatewayKeyService.js';

const HOST = '127.0.0.1';
const PORT = 8317;
let server: http.Server | null = null;
let startedAt = '';
let lastError = '';
let lastTraceId = '';
let lastRouteReason = '';

function json(res: ServerResponse, statusCode: number, body: unknown): void {
  const payload = JSON.stringify(body);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'content-type, authorization, x-api-key, anthropic-version',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  });
  res.end(payload);
}

function readBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.setEncoding('utf8');
    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 2_000_000) {
        reject(new Error('Request body is too large.'));
        req.destroy();
      }
    });
    req.on('end', () => {
      if (!raw.trim()) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error('Request body must be valid JSON.'));
      }
    });
    req.on('error', reject);
  });
}

function gatewayError(code: NexusFailureCategory | 'not_found', message: string, hint?: string, status = 400) {
  return { status, body: { error: { code, message, hint } } };
}

async function handleModels(_req: IncomingMessage, res: ServerResponse): Promise<void> {
  const providers = await storage.getAll<{ id: string; providerName?: string; modelName?: string; enabled?: boolean }>('providerSettings');
  const enabled = providers.filter((provider) => provider.enabled !== false && provider.modelName);
  json(res, 200, {
    object: 'list',
    data: enabled.length
      ? enabled.map((provider) => ({
          id: provider.modelName,
          object: 'model',
          owned_by: provider.providerName || 'localai-nexus',
          provider_id: provider.id,
        }))
      : [{
          id: 'localai-nexus-diagnostic',
          object: 'model',
          owned_by: 'localai-nexus',
        }],
  });
}

async function handleHealth(_req: IncomingMessage, res: ServerResponse): Promise<void> {
  json(res, 200, await getGatewayStatus());
}

function writeStream(res: ServerResponse, result: NexusGatewayForwardResult): void {
  res.writeHead(result.statusCode, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-store',
    Connection: 'keep-alive',
    'Access-Control-Allow-Origin': '*',
  });
  for (const event of result.events ?? []) {
    res.write(`event: ${event.type}\n`);
    res.write(`data: ${JSON.stringify({ ...event, trace_id: result.traceId })}\n\n`);
  }
  res.write(`event: done\n`);
  res.write(`data: ${JSON.stringify({ trace_id: result.traceId, usage: { input_tokens: result.inputTokens, output_tokens: result.outputTokens } })}\n\n`);
  res.write('data: [DONE]\n\n');
  res.end();
}

function attachNexusMetadata(body: unknown, result: NexusGatewayForwardResult): unknown {
  const metadata = {
    routed: result.routed,
    reason: result.routeReason,
    fallbackUsed: result.fallbackUsed,
    traceId: result.traceId,
    providerId: result.providerId,
    providerName: result.providerName,
  };
  if (body && typeof body === 'object' && !Array.isArray(body)) {
    return { ...(body as Record<string, unknown>), nexus: metadata };
  }
  return { data: body, nexus: metadata };
}

async function handleChat(req: IncomingMessage, res: ServerResponse, endpoint: string, kind: NexusGatewayRequestKind): Promise<void> {
  const requestId = randomUUID();
  const body = await readBody(req) as Record<string, unknown>;
  const model = typeof body.model === 'string' ? body.model : undefined;
  const access = await evaluateGatewayAccess({
    authorization: Array.isArray(req.headers.authorization) ? req.headers.authorization[0] : req.headers.authorization,
    xApiKey: Array.isArray(req.headers['x-api-key']) ? req.headers['x-api-key'][0] : req.headers['x-api-key'],
    endpoint,
    model,
    method: req.method,
  });
  if (!access.allowed) {
    const traceId = randomUUID();
    lastTraceId = traceId;
    lastRouteReason = 'gateway_api_key_denied';
    await recordUsage({
      model: model || 'unknown',
      endpoint,
      inputTokens: 0,
      outputTokens: 0,
      success: false,
      failureCategory: access.failureCategory ?? (access.statusCode === 401 ? '401' : access.statusCode === 403 ? '403' : '429'),
      statusCode: access.statusCode,
      latencyMs: 0,
      requestId: traceId,
      gatewayKeyId: access.keyId,
      gatewayMaskedKey: access.maskedKey,
    }).catch(() => undefined);
    await storage.create('gatewayRequests', {
      id: traceId,
      endpoint,
      model: model || 'unknown',
      gatewayKeyId: access.keyId,
      gatewayMaskedKey: access.maskedKey,
      status: 'denied',
      routeReason: access.reason,
      failureCategory: access.failureCategory ?? (access.statusCode === 401 ? '401' : access.statusCode === 403 ? '403' : '429'),
      createdAt: new Date().toISOString(),
    } as never).catch(() => undefined);
    await recordAudit({
      type: 'gateway.request',
      action: endpoint,
      status: 'denied',
      severity: 'warning',
      actor: {},
      resource: { type: 'gateway_request', id: traceId, label: endpoint },
      metadata: {
        keyId: access.keyId,
        maskedKey: access.maskedKey,
        model,
        reason: access.reason,
        retryAfterSeconds: access.retryAfterSeconds,
      },
    }).catch(() => undefined);
    json(res, access.statusCode, {
      error: {
        code: 'gateway_api_key_denied',
        message: access.reason,
        hint: 'Create or enable a local Gateway API key in LocalAI Nexus, then send it as Authorization: Bearer <key> or x-api-key.',
      },
      nexus: {
        traceId,
        redaction: 'secrets-redacted',
      },
    });
    return;
  }
  const route = await routeModel({ model, intent: 'default' });
  const controller = new AbortController();
  req.once('aborted', () => controller.abort());
  res.once('close', () => {
    if (!res.writableEnded) controller.abort();
  });
  await markGatewayRequestActive(requestId, route.provider?.id, route.model, access.keyId);
  const result = await forwardProviderRequest({
    endpoint,
    kind,
    body,
    stream: Boolean(body.stream),
    requestId,
    signal: controller.signal,
  }, route).finally(() => clearGatewayRequestActive(requestId));
  lastTraceId = result.traceId;
  lastRouteReason = result.routeReason;
  await recordUsage({
    provider: route.provider,
    model: result.model,
    endpoint,
    inputTokens: result.inputTokens,
    outputTokens: result.outputTokens,
    success: result.ok,
    failureCategory: result.failureCategory,
    statusCode: result.statusCode,
    latencyMs: result.latencyMs,
    requestId: result.traceId,
    gatewayKeyId: access.keyId,
    gatewayMaskedKey: access.maskedKey,
  });
  await storage.create('gatewayRequests', {
    id: result.traceId,
    endpoint,
    model: result.model,
    providerId: result.providerId,
    gatewayKeyId: access.keyId,
    gatewayMaskedKey: access.maskedKey,
    status: result.ok ? 'success' : 'failure',
    routeReason: result.routeReason,
    failureCategory: result.failureCategory,
    streamed: result.streamed,
    cancelled: result.cancelled,
    streamProtocol: result.streamProtocol,
    createdAt: new Date().toISOString(),
  } as never);
  await recordAudit({
    type: 'gateway.request',
    action: endpoint,
    status: result.ok ? 'success' : 'failure',
    severity: result.ok ? 'info' : 'warning',
    actor: {},
    resource: { type: 'gateway_request', id: result.traceId, label: endpoint },
    metadata: {
      providerId: result.providerId,
      providerName: result.providerName,
      keyId: access.keyId,
      maskedKey: access.maskedKey,
      model: result.model,
      failureCategory: result.failureCategory,
      streamed: result.streamed,
      cancelled: result.cancelled,
      streamProtocol: result.streamProtocol,
      routeReason: result.routeReason,
    },
  }).catch(() => undefined);

  if (result.streamed && result.events?.length) {
    writeStream(res, result);
    return;
  }
  json(res, result.statusCode, attachNexusMetadata(result.body, result));
}

function responsesDiagnostic(res: ServerResponse): void {
  const error = gatewayError(
    'base_url_mismatch',
    'LocalAI Nexus received /responses at the gateway root.',
    'Use Base URL http://127.0.0.1:8317 if your client sends /responses, or use http://127.0.0.1:8317/v1 if your client sends /responses relative to /v1.',
    200,
  );
  json(res, error.status, {
    ...error.body,
    compatibility: {
      rootBaseUrl: 'http://127.0.0.1:8317',
      v1BaseUrl: 'http://127.0.0.1:8317/v1',
      supported: ['/health', '/v1/models', '/v1/chat/completions', '/v1/responses', '/responses', '/v1/messages', '/v1/embeddings'],
    },
  });
}

async function requestHandler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (req.method === 'OPTIONS') {
    json(res, 204, {});
    return;
  }
  const url = new URL(req.url || '/', `http://${HOST}:${PORT}`);
  try {
    if (req.method === 'GET' && url.pathname === '/health') {
      await handleHealth(req, res);
      return;
    }
    if (req.method === 'GET' && url.pathname === '/v1/models') {
      await handleModels(req, res);
      return;
    }
    if (req.method === 'POST' && url.pathname === '/v1/chat/completions') {
      await handleChat(req, res, '/v1/chat/completions', 'chat.completions');
      return;
    }
    if (req.method === 'POST' && url.pathname === '/v1/responses') {
      await handleChat(req, res, '/v1/responses', 'responses');
      return;
    }
    if (req.method === 'POST' && url.pathname === '/responses') {
      responsesDiagnostic(res);
      return;
    }
    if (req.method === 'POST' && url.pathname === '/v1/messages') {
      await handleChat(req, res, '/v1/messages', 'messages');
      return;
    }
    if (req.method === 'POST' && url.pathname === '/v1/embeddings') {
      await handleChat(req, res, '/v1/embeddings', 'embeddings');
      return;
    }
    const error = gatewayError(
      'not_found',
      `Unsupported LocalAI Nexus gateway path: ${url.pathname}`,
      'Supported paths: /health, /v1/models, /v1/chat/completions, /v1/responses, /responses, /v1/messages, /v1/embeddings.',
      404,
    );
    json(res, error.status, error.body);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    lastError = message;
    await recordUsage({
      endpoint: url.pathname,
      inputTokens: 0,
      outputTokens: 0,
      success: false,
      failureCategory: 'protocol_error',
      latencyMs: 0,
    }).catch(() => undefined);
    json(res, 500, { error: { code: 'gateway_error', message, hint: 'Open LocalAI Nexus Diagnostics for details.' } });
  }
}

export async function startGateway(): Promise<NexusGatewayStatus> {
  if (server) return getGatewayStatus();
  server = http.createServer((req, res) => {
    requestHandler(req, res).catch((error) => {
      lastError = error instanceof Error ? error.message : String(error);
      json(res, 500, { error: { code: 'gateway_error', message: lastError } });
    });
  });
  await new Promise<void>((resolve, reject) => {
    server?.once('error', reject);
    server?.listen(PORT, HOST, () => {
      startedAt = new Date().toISOString();
      lastError = '';
      lastTraceId = '';
      lastRouteReason = '';
      resolve();
    });
  }).catch((error) => {
    server = null;
    lastError = error instanceof Error ? error.message : String(error);
    throw error;
  });
  await recordAudit({
    type: 'gateway.request',
    action: 'gateway.start',
    status: 'success',
    severity: 'info',
    actor: {},
    metadata: { host: HOST, port: PORT },
  }).catch(() => undefined);
  return getGatewayStatus();
}

export async function stopGateway(): Promise<NexusGatewayStatus> {
  if (!server) return getGatewayStatus();
  await new Promise<void>((resolve) => {
    server?.close(() => resolve());
  });
  server = null;
  startedAt = '';
  return getGatewayStatus();
}

export async function restartGateway(): Promise<NexusGatewayStatus> {
  if (server) await stopGateway();
  return startGateway();
}

export async function getGatewayStatus(): Promise<NexusGatewayStatus> {
  const providers = await storage.getAll<{ id: string; enabled?: boolean }>('providerSettings').catch(() => []);
  const activeProviderRef = String((await storage.getById<{ id: string; value?: unknown }>('settings', 'activeProviderRef').catch(() => null))?.value ?? '');
  const activeModel = String((await storage.getById<{ id: string; value?: unknown }>('settings', 'activeModel').catch(() => null))?.value ?? '');
  return {
    online: Boolean(server?.listening),
    host: HOST,
    port: PORT,
    baseUrl: `http://${HOST}:${PORT}`,
    startedAt: startedAt || undefined,
    lastError: lastError || undefined,
    activeProviderRef,
    activeModel,
    providerCount: providers.filter((provider) => provider.enabled !== false).length,
    defaultBaseUrlHint: `http://${HOST}:${PORT}`,
    v1BaseUrlHint: `http://${HOST}:${PORT}/v1`,
    lastTraceId: lastTraceId || undefined,
    lastRouteReason: lastRouteReason || undefined,
  };
}
