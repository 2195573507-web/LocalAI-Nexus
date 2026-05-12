import { randomUUID } from 'crypto';
import type {
  NexusFailureCategory,
  NexusUsageRecord,
  NexusUsageSummary,
  ProviderSetting,
} from '../../../shared/types.js';
import storage from '../../storage.js';

export interface RecordUsageInput {
  provider?: Partial<ProviderSetting> & { id?: string };
  gatewayKeyId?: string;
  gatewayMaskedKey?: string;
  model?: string;
  endpoint: string;
  projectId?: string;
  workflowId?: string;
  agentId?: string;
  skillId?: string;
  inputTokens?: number;
  outputTokens?: number;
  success: boolean;
  failureCategory?: NexusFailureCategory;
  statusCode?: number;
  latencyMs: number;
  requestId?: string;
}

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

function startOfWeek(date: Date): number {
  const copy = new Date(date);
  const day = copy.getDay() || 7;
  copy.setDate(copy.getDate() - day + 1);
  return startOfDay(copy);
}

function startOfMonth(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), 1).getTime();
}

function percentile(values: number[], p: number): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[index] ?? 0;
}

function ratio(part: number, total: number): number {
  return total === 0 ? 0 : Number((part / total).toFixed(4));
}

function groupBy<T>(
  records: NexusUsageRecord[],
  keyFn: (record: NexusUsageRecord) => string,
  labelFn: (record: NexusUsageRecord) => T,
) {
  const groups = new Map<string, { label: T; records: NexusUsageRecord[] }>();
  for (const record of records) {
    const key = keyFn(record);
    const existing = groups.get(key);
    if (existing) existing.records.push(record);
    else groups.set(key, { label: labelFn(record), records: [record] });
  }
  return [...groups.entries()].map(([key, group]) => ({ key, ...group }));
}

export async function recordUsage(input: RecordUsageInput): Promise<NexusUsageRecord> {
  const inputTokens = Math.max(0, Math.floor(input.inputTokens ?? 0));
  const outputTokens = Math.max(0, Math.floor(input.outputTokens ?? 0));
  const now = new Date().toISOString();
  return storage.create<NexusUsageRecord>('tokenUsage', {
    id: randomUUID(),
    providerId: input.provider?.id,
    providerName: input.provider?.providerName,
    gatewayKeyId: input.gatewayKeyId,
    gatewayMaskedKey: input.gatewayMaskedKey,
    model: input.model ?? input.provider?.modelName,
    endpoint: input.endpoint,
    projectId: input.projectId,
    workflowId: input.workflowId,
    agentId: input.agentId,
    skillId: input.skillId,
    inputTokens,
    outputTokens,
    totalTokens: inputTokens + outputTokens,
    success: input.success,
    failureCategory: input.failureCategory ?? (input.success ? 'none' : 'unknown'),
    statusCode: input.statusCode,
    latencyMs: Math.max(0, Math.floor(input.latencyMs)),
    requestId: input.requestId,
    createdAt: now,
  });
}

export async function listUsageRecords(filters: {
  providerId?: string;
  model?: string;
  projectId?: string;
  workflowId?: string;
  agentId?: string;
  limit?: number;
} = {}): Promise<NexusUsageRecord[]> {
  let records = await storage.getAll<NexusUsageRecord>('tokenUsage');
  if (filters.providerId) records = records.filter((record) => record.providerId === filters.providerId);
  if (filters.model) records = records.filter((record) => record.model === filters.model);
  if (filters.projectId) records = records.filter((record) => record.projectId === filters.projectId);
  if (filters.workflowId) records = records.filter((record) => record.workflowId === filters.workflowId);
  if (filters.agentId) records = records.filter((record) => record.agentId === filters.agentId);
  return records
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, Math.min(Math.max(Number(filters.limit) || 200, 1), 1000));
}

export async function summarizeUsage(now = new Date()): Promise<NexusUsageSummary> {
  const records = await storage.getAll<NexusUsageRecord>('tokenUsage');
  const nowMs = now.getTime();
  const today = startOfDay(now);
  const week = startOfWeek(now);
  const month = startOfMonth(now);
  const inRange = records.filter((record) => {
    const time = new Date(record.createdAt).getTime();
    return Number.isFinite(time) && time <= nowMs;
  });
  const monthRecords = inRange.filter((record) => new Date(record.createdAt).getTime() >= month);
  const successes = monthRecords.filter((record) => record.success).length;
  const failures = monthRecords.length - successes;
  const latencies = monthRecords.map((record) => record.latencyMs).filter((value) => value >= 0);
  const recentFailure = inRange.find((record) => !record.success);

  const providerGroups = groupBy(
    monthRecords,
    (record) => record.providerId || 'unassigned',
    (record) => ({ providerId: record.providerId || 'unassigned', providerName: record.providerName || 'Unassigned' }),
  );
  const modelGroups = groupBy(
    monthRecords,
    (record) => record.model || 'unknown',
    (record) => ({ model: record.model || 'unknown' }),
  );

  return {
    todayRequests: inRange.filter((record) => new Date(record.createdAt).getTime() >= today).length,
    weekRequests: inRange.filter((record) => new Date(record.createdAt).getTime() >= week).length,
    monthRequests: monthRecords.length,
    inputTokens: monthRecords.reduce((sum, record) => sum + record.inputTokens, 0),
    outputTokens: monthRecords.reduce((sum, record) => sum + record.outputTokens, 0),
    totalTokens: monthRecords.reduce((sum, record) => sum + record.totalTokens, 0),
    successRate: ratio(successes, monthRecords.length),
    failureRate: ratio(failures, monthRecords.length),
    averageLatencyMs: latencies.length
      ? Math.round(latencies.reduce((sum, value) => sum + value, 0) / latencies.length)
      : 0,
    p95LatencyMs: percentile(latencies, 95),
    recentFailureReason: recentFailure
      ? `${recentFailure.failureCategory}${recentFailure.statusCode ? ` (${recentFailure.statusCode})` : ''}`
      : undefined,
    byProvider: providerGroups.map((group) => {
      const ok = group.records.filter((record) => record.success).length;
      return {
        providerId: group.label.providerId,
        providerName: group.label.providerName,
        requests: group.records.length,
        totalTokens: group.records.reduce((sum, record) => sum + record.totalTokens, 0),
        successRate: ratio(ok, group.records.length),
      };
    }),
    byModel: modelGroups.map((group) => {
      const ok = group.records.filter((record) => record.success).length;
      return {
        model: group.label.model,
        requests: group.records.length,
        totalTokens: group.records.reduce((sum, record) => sum + record.totalTokens, 0),
        successRate: ratio(ok, group.records.length),
      };
    }),
  };
}

export function classifyFailure(statusCode?: number, message = ''): NexusFailureCategory {
  if (statusCode === 401) return '401';
  if (statusCode === 403) return '403';
  if (statusCode === 404) return message.toLowerCase().includes('model') ? 'model_not_found' : '404';
  if (statusCode === 429) return '429';
  const lower = message.toLowerCase();
  if (lower.includes('timeout')) return 'timeout';
  if (lower.includes('model') && lower.includes('not')) return 'model_not_found';
  if (lower.includes('base url') || lower.includes('base_url')) return 'base_url_mismatch';
  if (lower.includes('protocol')) return 'protocol_error';
  return statusCode || message ? 'unknown' : 'none';
}
