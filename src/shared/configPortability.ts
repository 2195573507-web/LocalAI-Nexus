import { sanitizeObject } from './secretRedaction.js';
import { PROVIDER_PRESETS } from './providerPresets.js';
import type {
  ConfigBundle,
  ConfigExportManifest,
  NexusGatewayApiKey,
  NexusGatewayConfigImportPreview,
  NexusGatewayConfigMergeAction,
  NexusGatewayConfigSource,
  Project,
  ProviderSetting,
  SkillRegistryEntry,
} from './types.js';

const MAX_IMPORT_BYTES = 512 * 1024;
const SCRIPT_KEYS = new Set(['script', 'scripts', 'command', 'commands', 'postinstall', 'preinstall']);
const SECRET_LIKE_TEXT = /^(?:sk-|lnx_|Bearer\s+|hf_|AIza)/i;

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, val]) => `${JSON.stringify(key)}:${stableStringify(val)}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

export function simpleHash(value: unknown): string {
  const text = stableStringify(value);
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `fnv1a-${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

function omitSecretFields<T extends Record<string, unknown>>(record: T): T {
  const clean = sanitizeObject(record) as T;
  delete (clean as Record<string, unknown>).apiKey;
  delete (clean as Record<string, unknown>).sessionToken;
  delete (clean as Record<string, unknown>).cookie;
  delete (clean as Record<string, unknown>).authorization;
  return clean;
}

export function buildConfigBundle(input: {
  providers?: ProviderSetting[];
  projects?: Project[];
  gatewayKeys?: NexusGatewayApiKey[];
  gatewayConfigImports?: Array<Record<string, unknown>>;
  agents?: Array<Record<string, unknown>>;
  templates?: Array<Record<string, unknown>>;
  mcpAllowlist?: Array<Record<string, unknown>>;
  skillsRegistry?: SkillRegistryEntry[];
  now?: Date;
}): ConfigBundle {
  const bundleWithoutManifest = {
    providerPresets: PROVIDER_PRESETS,
    providers: (input.providers ?? []).map((provider) => omitSecretFields(provider as unknown as Record<string, unknown>)),
    projectDefaults: (input.projects ?? []).map((project) => ({
      projectId: project.id,
      defaultProviderRef: project.defaultProviderRef,
      defaultModel: project.defaultModel,
    })),
    gatewayKeys: (input.gatewayKeys ?? []).map((key) => omitSecretFields({
      id: key.id,
      name: key.name,
      maskedKey: key.maskedKey,
      status: key.status,
      scopes: key.scopes,
      endpointWhitelist: key.endpointWhitelist,
      modelWhitelist: key.modelWhitelist,
      dailyQuota: key.dailyQuota,
      monthlyQuota: key.monthlyQuota,
      rateLimitPerMinute: key.rateLimitPerMinute,
      concurrencyLimit: key.concurrencyLimit,
      createdByUserId: key.createdByUserId,
      createdAt: key.createdAt,
      updatedAt: key.updatedAt,
      lastUsedAt: key.lastUsedAt,
      redaction: 'hash-omitted',
    })),
    gatewayConfigImports: (input.gatewayConfigImports ?? []).map(omitSecretFields),
    agents: (input.agents ?? []).map(omitSecretFields),
    templates: (input.templates ?? []).map(omitSecretFields),
    mcpAllowlist: (input.mcpAllowlist ?? []).map(omitSecretFields),
    skillsRegistry: (input.skillsRegistry ?? []).map((skill) => ({ ...skill })),
  };
  const manifest: ConfigExportManifest = {
    version: 1,
    exportedAt: (input.now ?? new Date()).toISOString(),
    hash: simpleHash(bundleWithoutManifest),
    redaction: 'secrets-omitted',
    counts: {
      providers: bundleWithoutManifest.providers.length,
      projectDefaults: bundleWithoutManifest.projectDefaults.length,
      gatewayKeys: bundleWithoutManifest.gatewayKeys.length,
      gatewayConfigImports: bundleWithoutManifest.gatewayConfigImports.length,
      agents: bundleWithoutManifest.agents.length,
      templates: bundleWithoutManifest.templates.length,
      mcpAllowlist: bundleWithoutManifest.mcpAllowlist.length,
      skillsRegistry: bundleWithoutManifest.skillsRegistry.length,
    },
  };
  return { manifest, ...bundleWithoutManifest };
}

function hasDangerousKeys(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(hasDangerousKeys);
  if (!value || typeof value !== 'object') return false;
  return Object.entries(value as Record<string, unknown>).some(([key, val]) => {
    const normalized = key.toLowerCase();
    if (SCRIPT_KEYS.has(normalized)) return true;
    if (typeof val === 'string' && /(\.\.\/|\.\.\\|<script|javascript:|powershell|cmd\.exe)/i.test(val)) return true;
    return hasDangerousKeys(val);
  });
}

export function previewConfigImport(raw: string): {
  ok: boolean;
  warnings: string[];
  errors: string[];
  bundle?: ConfigBundle;
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (Buffer.byteLength(raw, 'utf8') > MAX_IMPORT_BYTES) {
    errors.push('Import file is too large.');
    return { ok: false, warnings, errors };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    errors.push('Import file is not valid JSON.');
    return { ok: false, warnings, errors };
  }
  if (!parsed || typeof parsed !== 'object') errors.push('Import root must be an object.');
  if (hasDangerousKeys(parsed)) errors.push('Import contains script, command, path traversal, or HTML script-like content.');
  const candidate = parsed as Partial<ConfigBundle>;
  if (!candidate.manifest || candidate.manifest.version !== 1) errors.push('Manifest version is missing or unsupported.');
  for (const key of ['providers', 'projectDefaults', 'gatewayKeys', 'gatewayConfigImports', 'agents', 'templates', 'mcpAllowlist', 'skillsRegistry'] as const) {
    if (candidate[key] !== undefined && !Array.isArray(candidate[key])) errors.push(`${key} must be an array.`);
  }
  if (candidate.manifest?.hash) {
    const { manifest: _manifest, ...rest } = candidate as ConfigBundle;
    const actual = simpleHash(rest);
    if (actual !== candidate.manifest.hash) warnings.push('Manifest hash does not match payload; review before applying.');
  }
  return {
    ok: errors.length === 0,
    warnings,
    errors,
    bundle: errors.length === 0 ? sanitizeObject(candidate) as ConfigBundle : undefined,
  };
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function collectStrings(value: unknown, matcher: (text: string) => boolean, limit = 20): string[] {
  const results: string[] = [];
  const visit = (current: unknown) => {
    if (results.length >= limit) return;
    if (typeof current === 'string') {
      const trimmed = current.trim();
      if (trimmed && matcher(trimmed)) results.push(trimmed);
      return;
    }
    if (Array.isArray(current)) {
      current.forEach(visit);
      return;
    }
    if (current && typeof current === 'object') {
      Object.values(current as Record<string, unknown>).forEach(visit);
    }
  };
  visit(value);
  return [...new Set(results)];
}

function countKeyRefs(value: unknown): number {
  let count = 0;
  const visit = (current: unknown, keyHint = '') => {
    if (typeof current === 'string') {
      if (SECRET_LIKE_TEXT.test(current.trim()) || /api[_-]?key|auth[_-]?token|authorization/i.test(keyHint)) count += 1;
      return;
    }
    if (Array.isArray(current)) {
      current.forEach((item) => visit(item, keyHint));
      return;
    }
    if (current && typeof current === 'object') {
      for (const [key, val] of Object.entries(current as Record<string, unknown>)) visit(val, key);
    }
  };
  visit(value);
  return count;
}

function detectGatewayConfigSource(payload: Record<string, unknown>, raw: string): NexusGatewayConfigSource {
  const lower = raw.toLowerCase();
  if (payload.manifest && Array.isArray(payload.gatewayConfigImports)) return 'localai-nexus';
  if (lower.includes('cc-switch') || lower.includes('claudecode') || lower.includes('claude_code') || lower.includes('profiles')) return 'cc-switch';
  if (lower.includes('sub2api') || lower.includes('subscription') || lower.includes('subconverter')) return 'sub2api';
  if (lower.includes('ccs') || lower.includes('claude code settings') || lower.includes('anthropic_base_url')) return 'ccs';
  if (lower.includes('anthropic_base_url') || lower.includes('anthropic_auth_token')) return 'claude-code';
  if (lower.includes('openai_base_url') || lower.includes('openai_api_key') || lower.includes('openai_model')) return 'openai-env';
  if (lower.includes('base_url') && (lower.includes('api_key_env') || lower.includes('model_provider'))) return 'codex';
  return 'unknown';
}

function countProfiles(payload: Record<string, unknown>): number {
  const candidates = [payload.profiles, payload.providers, payload.endpoints, payload.configs, payload.routes];
  let arrayCount = 0;
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) arrayCount += candidate.length;
  }
  if (arrayCount > 0) return arrayCount;
  const profiles = asRecord(payload.profiles);
  return Object.keys(profiles).length;
}

function buildGatewayMergePlan(source: NexusGatewayConfigSource, normalized: Record<string, unknown>): NexusGatewayConfigMergeAction[] {
  const baseUrls = Array.isArray(normalized.baseUrls) ? normalized.baseUrls : [];
  const models = Array.isArray(normalized.models) ? normalized.models : [];
  const actions: NexusGatewayConfigMergeAction[] = [
    {
      target: 'gateway.config.imports',
      action: 'backup',
      label: 'Create redacted local backup checkpoint',
      detail: 'A redacted import record is stored before any merge so the original external file is never overwritten.',
      riskLevel: 'low',
    },
    {
      target: 'gateway.config.imports',
      action: 'merge',
      label: `Record ${source} import preview`,
      detail: `Merge ${baseUrls.length} base URL hint(s) and ${models.length} model hint(s) into the local Gateway import ledger.`,
      riskLevel: 'medium',
    },
    {
      target: 'gatewayApiKeys',
      action: 'skip',
      label: 'Do not import raw API keys',
      detail: 'External secrets are redacted. Local Gateway keys still must be generated copy-once inside LocalAI Nexus.',
      riskLevel: 'low',
    },
  ];
  if (source === 'claude-code' || source === 'cc-switch' || source === 'ccs') {
    actions.push({
      target: 'claude-code.settings',
      action: 'preview',
      label: 'Preview Claude Code settings merge',
      detail: 'Settings JSON is inspected for merge intent, but this flow does not silently write external Claude Code settings.',
      riskLevel: 'medium',
    });
  }
  if (source === 'codex' || source === 'cc-switch' || source === 'openai-env') {
    actions.push({
      target: 'codex.config',
      action: 'preview',
      label: 'Preview Codex/OpenAI-compatible export',
      detail: 'Codex base_url/api_key_env hints are preserved as redacted metadata for user review.',
      riskLevel: 'medium',
    });
  }
  if (source === 'openai-env') {
    actions.push({
      target: 'runtime.env',
      action: 'preview',
      label: 'Preview environment variable migration',
      detail: 'OPENAI_* environment snippets are normalized into copyable Gateway runtime guidance.',
      riskLevel: 'low',
    });
  }
  return actions;
}

export function previewGatewayConfigImport(raw: string): NexusGatewayConfigImportPreview {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (Buffer.byteLength(raw, 'utf8') > MAX_IMPORT_BYTES) {
    errors.push('Gateway config import is too large.');
  }
  let parsed: unknown = {};
  if (errors.length === 0) {
    try {
      parsed = JSON.parse(raw);
    } catch {
      const env: Record<string, string> = {};
      for (const line of raw.split(/\r?\n/)) {
        const match = line.match(/(?:export\s+|\$env:|set\s+)?([A-Z_]+)\s*[:=]\s*["']?([^"'\r\n]+)["']?/i);
        if (match) env[match[1].toUpperCase()] = match[2].trim();
      }
      if (Object.keys(env).length > 0) parsed = { env };
      else errors.push('Gateway config import requires JSON or OPENAI_/ANTHROPIC_ environment lines.');
    }
  }
  const payload = asRecord(parsed);
  if (hasDangerousKeys(payload)) errors.push('Gateway config import contains script, command, path traversal, or HTML script-like content.');
  const source = detectGatewayConfigSource(payload, raw);
  if (source === 'unknown') warnings.push('External config source was not recognized; only a redacted dry-run record can be stored.');
  const baseUrls = collectStrings(payload, (text) => /^https?:\/\//i.test(text) || /^mock:\/\//i.test(text));
  const models = collectStrings(payload, (text) => /(?:gpt|claude|deepseek|qwen|gemini|llama|localai|mock)/i.test(text) && !/^https?:\/\//i.test(text) && !SECRET_LIKE_TEXT.test(text), 30);
  const keyRefCount = countKeyRefs(payload);
  const profileCount = countProfiles(payload);
  if (keyRefCount > 0) warnings.push('API key-like values were detected and redacted; create Local Gateway keys inside LocalAI Nexus instead of importing raw secrets.');
  const normalized = sanitizeObject({
    source,
    baseUrls,
    models,
    profileCount,
    keyRefCount,
    payload,
  }) as Record<string, unknown>;
  const mergePlan = buildGatewayMergePlan(source, normalized);
  return {
    ok: errors.length === 0,
    source,
    warnings,
    errors,
    redaction: 'secrets-redacted',
    detected: {
      baseUrls,
      models,
      profileCount,
      keyRefCount,
      gatewayPolicyCount: Array.isArray(payload.gatewayKeys) ? payload.gatewayKeys.length : 0,
      supportedTargets: ['ccs', 'sub2api', 'cc-switch', 'claude-code', 'codex', 'openai-env', 'localai-nexus'],
    },
    mergePlan,
    backup: {
      required: true,
      collections: ['gatewayApiKeys', 'settings', 'auditLogs'],
      redaction: 'secrets-redacted',
    },
    audit: {
      action: 'gateway.config.imported',
      metadata: {
        source,
        profileCount,
        keyRefCount,
        redaction: 'secrets-redacted',
      },
    },
    normalized: errors.length === 0 ? normalized : undefined,
  };
}
