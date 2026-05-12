import { randomUUID } from 'crypto';
import type {
  NexusTokenPolicy,
  NexusTokenPolicyEvaluation,
  NexusUsageRecord,
  ProviderSetting,
} from '../../../shared/types.js';
import storage from '../../storage.js';

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

function startOfMonth(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), 1).getTime();
}

function parseTime(value?: string): number {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
}

function matchesPolicy(policy: NexusTokenPolicy, provider: ProviderSetting, model?: string): boolean {
  if (!policy.enabled) return false;
  if (policy.providerId && policy.providerId !== provider.id) return false;
  if (policy.model && policy.model !== (model || provider.modelName)) return false;
  return true;
}

function providerPolicyFromProvider(provider: ProviderSetting): NexusTokenPolicy | null {
  const dailyQuota = Number(provider.dailyQuota ?? 0);
  const monthlyQuota = Number(provider.monthlyQuota ?? 0);
  const concurrencyLimit = Number(provider.concurrencyLimit ?? 0);
  const hasCooldown = parseTime(provider.cooldownUntil) > Date.now();
  if (dailyQuota <= 0 && monthlyQuota <= 0 && concurrencyLimit <= 0 && !hasCooldown) return null;
  return {
    id: `provider-inline-${provider.id}`,
    providerId: provider.id,
    model: provider.modelName,
    dailyQuota,
    monthlyQuota,
    concurrencyLimit,
    cooldownMinutes: 0,
    enabled: true,
    reason: provider.cooldownUntil ? `Provider cooldown is active until ${provider.cooldownUntil}.` : 'Provider inline quota policy.',
    createdAt: provider.createdAt,
    updatedAt: provider.updatedAt ?? new Date().toISOString(),
  };
}

function mergePolicies(policies: NexusTokenPolicy[]): NexusTokenPolicy {
  const now = new Date().toISOString();
  return policies.reduce<NexusTokenPolicy>((merged, policy) => ({
    ...merged,
    providerId: merged.providerId ?? policy.providerId,
    model: merged.model ?? policy.model,
    dailyQuota: Math.max(merged.dailyQuota, Number(policy.dailyQuota ?? 0)),
    monthlyQuota: Math.max(merged.monthlyQuota, Number(policy.monthlyQuota ?? 0)),
    concurrencyLimit: Math.max(merged.concurrencyLimit, Number(policy.concurrencyLimit ?? 0)),
    cooldownMinutes: Math.max(merged.cooldownMinutes, Number(policy.cooldownMinutes ?? 0)),
    reason: [merged.reason, policy.reason].filter(Boolean).join(' '),
    enabled: merged.enabled || policy.enabled,
    updatedAt: policy.updatedAt || merged.updatedAt,
  }), {
    id: `merged-${randomUUID()}`,
    dailyQuota: 0,
    monthlyQuota: 0,
    concurrencyLimit: 0,
    cooldownMinutes: 0,
    enabled: false,
    updatedAt: now,
  });
}

export async function listTokenPolicies(): Promise<NexusTokenPolicy[]> {
  return storage.getAll<NexusTokenPolicy>('tokenPolicies').catch(() => []);
}

export async function upsertTokenPolicy(input: Partial<NexusTokenPolicy>): Promise<NexusTokenPolicy> {
  const now = new Date().toISOString();
  const policy: NexusTokenPolicy = {
    id: String(input.id || randomUUID()),
    providerId: input.providerId ? String(input.providerId) : undefined,
    model: input.model ? String(input.model) : undefined,
    dailyQuota: Math.max(0, Math.floor(Number(input.dailyQuota ?? 0))),
    monthlyQuota: Math.max(0, Math.floor(Number(input.monthlyQuota ?? 0))),
    concurrencyLimit: Math.max(0, Math.floor(Number(input.concurrencyLimit ?? 0))),
    cooldownMinutes: Math.max(0, Math.floor(Number(input.cooldownMinutes ?? 0))),
    enabled: input.enabled !== false,
    reason: input.reason ? String(input.reason).slice(0, 240) : undefined,
    createdAt: input.createdAt ?? now,
    updatedAt: now,
  };
  const existing = await storage.getById('tokenPolicies', policy.id).catch(() => null);
  return existing
    ? storage.update<NexusTokenPolicy>('tokenPolicies', policy.id, policy).then((saved) => saved ?? policy)
    : storage.create<NexusTokenPolicy>('tokenPolicies', policy);
}

export async function markGatewayRequestActive(
  id: string,
  providerId?: string,
  model?: string,
  gatewayKeyId?: string,
): Promise<void> {
  await storage.create('activeGatewayRequests', {
    id,
    providerId,
    model,
    gatewayKeyId,
    startedAt: new Date().toISOString(),
  } as never).catch(() => undefined);
}

export async function clearGatewayRequestActive(id: string): Promise<void> {
  await storage.delete('activeGatewayRequests', id).catch(() => undefined);
}

export async function evaluateTokenPolicy(provider: ProviderSetting, model?: string, now = new Date()): Promise<NexusTokenPolicyEvaluation> {
  const storedPolicies = await listTokenPolicies();
  const inlinePolicy = providerPolicyFromProvider(provider);
  const matching = [
    ...storedPolicies.filter((policy) => matchesPolicy(policy, provider, model)),
    ...(inlinePolicy ? [inlinePolicy] : []),
  ];
  const policy = matching.length ? mergePolicies(matching) : null;
  const checkedAt = now.toISOString();
  const usage = await storage.getAll<NexusUsageRecord>('tokenUsage').catch(() => []);
  const active = await storage.getAll<{ id: string; providerId?: string; model?: string; startedAt?: string }>('activeGatewayRequests').catch(() => []);
  const targetModel = model || provider.modelName;
  const providerUsage = usage.filter((record) => record.providerId === provider.id && (!targetModel || record.model === targetModel));
  const day = startOfDay(now);
  const month = startOfMonth(now);
  const dailyTokens = providerUsage
    .filter((record) => new Date(record.createdAt).getTime() >= day)
    .reduce((sum, record) => sum + record.totalTokens, 0);
  const monthlyTokens = providerUsage
    .filter((record) => new Date(record.createdAt).getTime() >= month)
    .reduce((sum, record) => sum + record.totalTokens, 0);
  const activeRequests = active.filter((request) => request.providerId === provider.id && (!targetModel || request.model === targetModel)).length;
  const providerCooldownUntil = parseTime(provider.cooldownUntil);
  const policyCooldownMs = policy?.cooldownMinutes ? parseTime(policy.updatedAt) + policy.cooldownMinutes * 60_000 : 0;
  const cooldownUntilMs = Math.max(providerCooldownUntil, policyCooldownMs);
  const dailyQuota = Number(policy?.dailyQuota ?? 0);
  const monthlyQuota = Number(policy?.monthlyQuota ?? 0);
  const concurrencyLimit = Number(policy?.concurrencyLimit ?? 0);

  if (cooldownUntilMs > now.getTime()) {
    return {
      providerId: provider.id,
      model: targetModel,
      state: 'cooldown',
      reason: `Token policy cooldown is active until ${new Date(cooldownUntilMs).toISOString()}.`,
      dailyTokens,
      monthlyTokens,
      activeRequests,
      dailyQuota,
      monthlyQuota,
      concurrencyLimit,
      cooldownUntil: new Date(cooldownUntilMs).toISOString(),
      checkedAt,
    };
  }

  if ((dailyQuota > 0 && dailyTokens >= dailyQuota) || (monthlyQuota > 0 && monthlyTokens >= monthlyQuota)) {
    return {
      providerId: provider.id,
      model: targetModel,
      state: 'quota_exhausted',
      reason: `Token quota exhausted for ${provider.providerName}.`,
      dailyTokens,
      monthlyTokens,
      activeRequests,
      dailyQuota,
      monthlyQuota,
      concurrencyLimit,
      checkedAt,
    };
  }

  if (concurrencyLimit > 0 && activeRequests >= concurrencyLimit) {
    return {
      providerId: provider.id,
      model: targetModel,
      state: 'concurrency_limited',
      reason: `Concurrency limit ${concurrencyLimit} reached for ${provider.providerName}.`,
      dailyTokens,
      monthlyTokens,
      activeRequests,
      dailyQuota,
      monthlyQuota,
      concurrencyLimit,
      checkedAt,
    };
  }

  return {
    providerId: provider.id,
    model: targetModel,
    state: policy ? 'available' : 'unconfigured',
    reason: policy ? 'Token policy allows routing.' : 'No explicit token policy is configured; provider remains available.',
    dailyTokens,
    monthlyTokens,
    activeRequests,
    dailyQuota,
    monthlyQuota,
    concurrencyLimit,
    checkedAt,
  };
}
