import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'crypto';
import type {
  NexusGatewayAccessDecision,
  NexusGatewayApiKey,
  NexusGatewayApiKeyCreateRequest,
  NexusGatewayApiKeyCreateResult,
  NexusGatewayApiKeyStatus,
} from '../../../shared/types.js';
import storage from '../../storage.js';

const DEFAULT_ENDPOINTS = ['/v1/chat/completions', '/v1/responses', '/v1/messages', '/v1/embeddings', '/v1/models'];
const DEFAULT_SCOPES = ['gateway:invoke'];
const GATEWAY_KEY_PREFIX = 'lnx_';
const MINUTE_MS = 60_000;

function hashGatewayKey(rawKey: string): string {
  return createHash('sha256').update(rawKey).digest('hex');
}

function maskGatewayKey(rawKey: string): string {
  return `${rawKey.slice(0, 7)}...${rawKey.slice(-4)}`;
}

function normalizeStringList(value: unknown, fallback: string[]): string[] {
  const source = Array.isArray(value) ? value : fallback;
  const normalized = source
    .map((item) => String(item).trim())
    .filter(Boolean);
  return [...new Set(normalized.length ? normalized : fallback)];
}

function normalizeLimit(value: unknown, fallback: number): number {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric >= 0 ? Math.floor(numeric) : fallback;
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a, 'hex');
  const right = Buffer.from(b, 'hex');
  return left.length === right.length && timingSafeEqual(left, right);
}

function parseTime(value?: string): number {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
}

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

function startOfMonth(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), 1).getTime();
}

async function evaluateGatewayKeyPolicy(key: NexusGatewayApiKey, now: Date): Promise<NexusGatewayAccessDecision | null> {
  const nowMs = now.getTime();
  const gatewayRequests = await storage.getAll<{
    id: string;
    gatewayKeyId?: string;
    createdAt?: string;
  }>('gatewayRequests').catch(() => []);
  const keyRequests = gatewayRequests.filter((request) => request.gatewayKeyId === key.id);
  const day = startOfDay(now);
  const month = startOfMonth(now);
  const dailyRequests = keyRequests.filter((request) => parseTime(request.createdAt) >= day).length;
  const monthlyRequests = keyRequests.filter((request) => parseTime(request.createdAt) >= month).length;
  const recentRequests = keyRequests.filter((request) => nowMs - parseTime(request.createdAt) < MINUTE_MS).length;
  const activeRequests = (await storage.getAll<{
    id: string;
    gatewayKeyId?: string;
  }>('activeGatewayRequests').catch(() => []))
    .filter((request) => request.gatewayKeyId === key.id)
    .length;

  if (key.dailyQuota > 0 && dailyRequests >= key.dailyQuota) {
    return {
      allowed: false,
      reason: `Gateway API key daily request quota ${key.dailyQuota} is exhausted.`,
      statusCode: 429,
      keyId: key.id,
      maskedKey: key.maskedKey,
      failureCategory: '429',
      diagnosticOpenMode: false,
    };
  }
  if (key.monthlyQuota > 0 && monthlyRequests >= key.monthlyQuota) {
    return {
      allowed: false,
      reason: `Gateway API key monthly request quota ${key.monthlyQuota} is exhausted.`,
      statusCode: 429,
      keyId: key.id,
      maskedKey: key.maskedKey,
      failureCategory: '429',
      diagnosticOpenMode: false,
    };
  }
  if (key.rateLimitPerMinute > 0 && recentRequests >= key.rateLimitPerMinute) {
    return {
      allowed: false,
      reason: `Gateway API key rate limit ${key.rateLimitPerMinute}/minute is reached.`,
      statusCode: 429,
      keyId: key.id,
      maskedKey: key.maskedKey,
      failureCategory: '429',
      retryAfterSeconds: 60,
      diagnosticOpenMode: false,
    };
  }
  if (key.concurrencyLimit > 0 && activeRequests >= key.concurrencyLimit) {
    return {
      allowed: false,
      reason: `Gateway API key concurrency limit ${key.concurrencyLimit} is reached.`,
      statusCode: 429,
      keyId: key.id,
      maskedKey: key.maskedKey,
      failureCategory: '429',
      retryAfterSeconds: 5,
      diagnosticOpenMode: false,
    };
  }
  return null;
}

export function createRawGatewayKey(now = new Date()): string {
  const entropy = randomBytes(24).toString('base64url');
  const day = now.toISOString().slice(0, 10).replace(/-/g, '');
  return `${GATEWAY_KEY_PREFIX}${day}_${entropy}`;
}

export async function listGatewayApiKeys(): Promise<NexusGatewayApiKey[]> {
  const keys = await storage.getAll<NexusGatewayApiKey>('gatewayApiKeys');
  return keys
    .filter((key) => key.status !== 'deleted')
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function createGatewayApiKey(
  request: NexusGatewayApiKeyCreateRequest,
  actorUserId?: string,
  now = new Date(),
): Promise<NexusGatewayApiKeyCreateResult> {
  const rawKey = createRawGatewayKey(now);
  const timestamp = now.toISOString();
  const key: NexusGatewayApiKey = {
    id: randomUUID(),
    name: String(request.name || 'LocalAI Nexus Gateway Key').trim().slice(0, 80),
    keyHash: hashGatewayKey(rawKey),
    maskedKey: maskGatewayKey(rawKey),
    status: 'active',
    scopes: normalizeStringList(request.scopes, DEFAULT_SCOPES),
    endpointWhitelist: normalizeStringList(request.endpointWhitelist, DEFAULT_ENDPOINTS),
    modelWhitelist: normalizeStringList(request.modelWhitelist, ['*']),
    dailyQuota: normalizeLimit(request.dailyQuota, 0),
    monthlyQuota: normalizeLimit(request.monthlyQuota, 0),
    rateLimitPerMinute: normalizeLimit(request.rateLimitPerMinute, 60),
    concurrencyLimit: normalizeLimit(request.concurrencyLimit, 1),
    createdByUserId: actorUserId,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  const saved = await storage.create<NexusGatewayApiKey>('gatewayApiKeys', key);
  return {
    key: saved,
    rawKey,
    copyOnceWarning: 'This local Gateway API key is shown once. Store it now; LocalAI Nexus keeps only a hash afterward.',
  };
}

export async function updateGatewayApiKeyStatus(
  id: string,
  status: Exclude<NexusGatewayApiKeyStatus, 'active'>,
): Promise<NexusGatewayApiKey> {
  const existing = await storage.getById<NexusGatewayApiKey>('gatewayApiKeys', id);
  if (!existing) throw new Error('Gateway API key not found.');
  const updated = await storage.update<NexusGatewayApiKey>('gatewayApiKeys', id, {
    status,
    updatedAt: new Date().toISOString(),
    deletedAt: status === 'deleted' ? new Date().toISOString() : existing.deletedAt,
  });
  if (!updated) throw new Error('Gateway API key update failed.');
  return updated;
}

export async function resetGatewayApiKey(
  id: string,
  now = new Date(),
): Promise<NexusGatewayApiKeyCreateResult> {
  const existing = await storage.getById<NexusGatewayApiKey>('gatewayApiKeys', id);
  if (!existing) throw new Error('Gateway API key not found.');
  const rawKey = createRawGatewayKey(now);
  const updated = await storage.update<NexusGatewayApiKey>('gatewayApiKeys', id, {
    keyHash: hashGatewayKey(rawKey),
    maskedKey: maskGatewayKey(rawKey),
    status: 'active',
    updatedAt: now.toISOString(),
    deletedAt: undefined,
  });
  if (!updated) throw new Error('Gateway API key reset failed.');
  return {
    key: updated,
    rawKey,
    copyOnceWarning: 'This reset key is shown once. Existing client secrets stop working immediately.',
  };
}

function extractBearerKey(authorization?: string, xApiKey?: string): string {
  if (xApiKey?.trim()) return xApiKey.trim();
  const match = authorization?.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() ?? '';
}

export async function evaluateGatewayAccess(input: {
  authorization?: string;
  xApiKey?: string;
  endpoint: string;
  model?: string;
  method?: string;
  now?: Date;
}): Promise<NexusGatewayAccessDecision> {
  const keys = await listGatewayApiKeys();
  if (keys.length === 0) {
    return {
      allowed: true,
      reason: 'No local Gateway API keys are configured; diagnostic open mode is active.',
      statusCode: 200,
      diagnosticOpenMode: true,
    };
  }
  const rawKey = extractBearerKey(input.authorization, input.xApiKey);
  if (!rawKey) {
    return {
      allowed: false,
      reason: 'Missing Authorization bearer token or x-api-key header.',
      statusCode: 401,
      diagnosticOpenMode: false,
    };
  }
  const hash = hashGatewayKey(rawKey);
  const key = keys.find((candidate) => candidate.status === 'active' && safeEqual(candidate.keyHash, hash));
  if (!key) {
    return {
      allowed: false,
      reason: 'Gateway API key was not found or is disabled.',
      statusCode: 403,
      diagnosticOpenMode: false,
    };
  }
  if (!key.endpointWhitelist.includes('*') && !key.endpointWhitelist.includes(input.endpoint)) {
    return {
      allowed: false,
      reason: `Gateway API key is not allowed to call ${input.endpoint}.`,
      statusCode: 403,
      keyId: key.id,
      maskedKey: key.maskedKey,
      diagnosticOpenMode: false,
    };
  }
  if (input.model && !key.modelWhitelist.includes('*') && !key.modelWhitelist.includes(input.model)) {
    return {
      allowed: false,
      reason: `Gateway API key is not allowed to use model ${input.model}.`,
      statusCode: 403,
      keyId: key.id,
      maskedKey: key.maskedKey,
      diagnosticOpenMode: false,
    };
  }
  const now = input.now ?? new Date();
  const policyDenial = await evaluateGatewayKeyPolicy(key, now);
  if (policyDenial) return policyDenial;

  await storage.update<NexusGatewayApiKey>('gatewayApiKeys', key.id, {
    lastUsedAt: now.toISOString(),
    updatedAt: key.updatedAt,
  }).catch(() => undefined);
  return {
    allowed: true,
    reason: 'Gateway API key accepted.',
    statusCode: 200,
    keyId: key.id,
    maskedKey: key.maskedKey,
    diagnosticOpenMode: false,
  };
}

export function buildGatewayEnvExport(input: {
  baseUrl: string;
  rawKey?: string;
  maskedKey?: string;
  model?: string;
}) {
  const key = input.rawKey ?? input.maskedKey ?? '<paste-local-gateway-key>';
  const model = input.model || 'localai-nexus-diagnostic';
  return {
    powershell: `$env:OPENAI_BASE_URL="${input.baseUrl}/v1"; $env:OPENAI_API_KEY="${key}"; $env:OPENAI_MODEL="${model}"`,
    bash: `export OPENAI_BASE_URL="${input.baseUrl}/v1"\nexport OPENAI_API_KEY="${key}"\nexport OPENAI_MODEL="${model}"`,
    cmd: `set OPENAI_BASE_URL=${input.baseUrl}/v1\r\nset OPENAI_API_KEY=${key}\r\nset OPENAI_MODEL=${model}`,
    codex: {
      base_url: `${input.baseUrl}/v1`,
      api_key_env: 'OPENAI_API_KEY',
      model,
    },
    claudeCode: {
      ANTHROPIC_BASE_URL: `${input.baseUrl}/v1`,
      ANTHROPIC_AUTH_TOKEN: key,
      ANTHROPIC_MODEL: model,
    },
    redaction: input.rawKey ? 'copy-once-secret' : 'masked-or-placeholder',
  };
}
