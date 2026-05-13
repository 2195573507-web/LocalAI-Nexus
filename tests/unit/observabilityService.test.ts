import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import * as nodeCrypto from 'node:crypto';
import type { NexusUsageRecord, RunEvent } from '../../src/shared/types';

const collections = new Map<string, Array<Record<string, unknown>>>();

let generateObservabilityReport: typeof import('../../src/main/domain/observability/observabilityService').generateObservabilityReport;
let getTraceDetail: typeof import('../../src/main/domain/observability/observabilityService').getTraceDetail;
let listEvaluationDataset: typeof import('../../src/main/domain/observability/observabilityService').listEvaluationDataset;
let deleteEvaluationRun: typeof import('../../src/main/domain/observability/observabilityService').deleteEvaluationRun;
let runMockEvaluation: typeof import('../../src/main/domain/observability/observabilityService').runMockEvaluation;

vi.stubGlobal('require', (id: string) => {
  if (id === 'crypto') return nodeCrypto;
  throw new Error(`Unexpected CommonJS require in observability service test: ${id}`);
});

vi.mock('../../src/main/storage', () => ({
  default: {
    async getAll<T>(collection: string): Promise<T[]> {
      return ((collections.get(collection) ?? []) as T[]).map((item) => ({ ...item }));
    },
    async create<T extends { id: string }>(collection: string, item: T): Promise<T> {
      const items = collections.get(collection) ?? [];
      items.push({ ...item });
      collections.set(collection, items);
      return { ...item };
    },
    async delete(collection: string, id: string): Promise<boolean> {
      const items = collections.get(collection) ?? [];
      const next = items.filter((item) => item.id !== id);
      collections.set(collection, next);
      return next.length !== items.length;
    },
  },
}));

vi.mock('../../src/main/audit', () => ({
  recordAudit: async () => undefined,
}));

function seed(collection: string, items: Array<Record<string, unknown>>) {
  collections.set(collection, items.map((item) => ({ ...item })));
}

describe('observability service', () => {
  beforeAll(async () => {
    ({
      deleteEvaluationRun,
      generateObservabilityReport,
      getTraceDetail,
      listEvaluationDataset,
      runMockEvaluation,
    } = await import('../../src/main/domain/observability/observabilityService'));
  });

  beforeEach(() => {
    collections.clear();
  });

  it('builds traces, slow request data, and mock evaluation from local records', async () => {
    seed('tokenUsage', [
      {
        id: 'usage-1',
        model: 'gpt-local',
        endpoint: '/v1/responses',
        inputTokens: 10,
        outputTokens: 5,
        totalTokens: 15,
        success: true,
        failureCategory: 'none',
        latencyMs: 1500,
        requestId: 'trace-ok',
        createdAt: '2026-05-12T00:00:00.000Z',
      },
      {
        id: 'usage-2',
        model: 'gpt-local',
        endpoint: '/v1/chat/completions',
        inputTokens: 1,
        outputTokens: 0,
        totalTokens: 1,
        success: false,
        failureCategory: '403',
        latencyMs: 20,
        requestId: 'trace-denied',
        createdAt: '2026-05-12T00:01:00.000Z',
      },
    ] satisfies NexusUsageRecord[]);
    seed('runEvents', [
      {
        id: 'event-1',
        type: 'agent.execution',
        status: 'success',
        title: 'Agent finished',
        createdAt: '2026-05-12T00:02:00.000Z',
      },
    ] satisfies RunEvent[]);

    const report = await generateObservabilityReport({
      includeMockEvaluation: true,
      evaluationOutput: 'structured answer with enough local diagnostic detail to cross the mock evaluator pass threshold and keep the dataset sample in the passed bucket',
    });
    expect(report.traces.map((trace) => trace.traceId)).toEqual(expect.arrayContaining(['trace-ok', 'trace-denied', 'event-1']));
    expect(report.errorCategories).toContainEqual({ category: '403', count: 1 });
    expect(report.slowRequests[0].requestId).toBe('trace-ok');
    expect(report.evaluation?.mode).toBe('mock');
    expect(report.exportSummary).toMatchObject({
      traceCount: 3,
      slowRequestCount: 1,
      errorCategoryCount: 1,
      redaction: 'secrets-redacted',
    });
    expect(report.traceDetails.map((trace) => trace.traceId)).toEqual(expect.arrayContaining(['trace-ok', 'trace-denied']));
    expect(report.traceDetails.find((trace) => trace.traceId === 'trace-ok')).toMatchObject({
      durationBucket: 'normal',
      relatedRecordId: 'trace-ok',
    });
    expect(report.evaluationDataset).toMatchObject({
      sampleCount: 1,
      passCount: 1,
      mode: 'mock-local',
      redaction: 'secrets-redacted',
    });
    expect(report.redTeamFindings.some((finding) => finding.title.includes('auth denial'))).toBe(true);
    expect(report.exportSummary?.markdown).toContain('LocalAI Nexus Observability Report');
    expect(report.exportSummary?.markdown).toContain('Trace Detail');
    expect(report.exportSummary?.markdown).toContain('Local Red-Team Findings');
    expect(report.exportSummary?.suggestedFilename).toMatch(/localai-nexus-observability-/);
    expect(JSON.stringify(report)).not.toContain('sk-');
  });

  it('returns an empty local report safely for a new workspace', async () => {
    const report = await generateObservabilityReport();
    expect(report.traces).toEqual([]);
    expect(report.traceDetails).toEqual([]);
    expect(report.evaluationDataset).toMatchObject({
      sampleCount: 0,
      passCount: 0,
      warningCount: 0,
      failCount: 0,
      averageScore: 0,
      redaction: 'secrets-redacted',
    });
    expect(report.redTeamFindings.some((finding) => finding.title === 'No traces available yet')).toBe(true);
  });

  it('persists mock evaluation runs as redacted local records', async () => {
    const evaluation = await runMockEvaluation({ output: 'good output' });
    expect(evaluation.score).toBeGreaterThan(0.7);
    expect(evaluation.redaction).toBe('secrets-redacted');
    expect(collections.get('evaluationRuns')).toHaveLength(1);
  });

  it('lists and deletes local evaluation dataset runs without leaking secrets', async () => {
    seed('evaluationRuns', [
      {
        id: 'eval-old',
        name: 'Old warning',
        target: 'prompt',
        score: 0.6,
        status: 'warning',
        findings: ['Bearer secret was redacted before display'],
        redaction: 'secrets-redacted',
        mode: 'mock',
        createdAt: '2026-05-12T00:00:00.000Z',
      },
      {
        id: 'eval-new',
        name: 'New pass',
        target: 'model',
        score: 0.9,
        status: 'passed',
        findings: ['sk-token-like sample remains sanitized in caller output'],
        redaction: 'secrets-redacted',
        mode: 'mock',
        createdAt: '2026-05-12T01:00:00.000Z',
      },
    ]);

    const dataset = await listEvaluationDataset();
    expect(dataset.summary).toMatchObject({
      sampleCount: 2,
      passCount: 1,
      warningCount: 1,
      failCount: 0,
      averageScore: 0.75,
      mode: 'mock-local',
      redaction: 'secrets-redacted',
    });
    expect(dataset.runs.map((run) => run.id)).toEqual(['eval-new', 'eval-old']);

    const deleted = await deleteEvaluationRun('eval-old');
    expect(deleted).toMatchObject({
      ok: true,
      deleted: true,
      remaining: 1,
      redaction: 'secrets-redacted',
    });
    expect((await listEvaluationDataset()).runs.map((run) => run.id)).toEqual(['eval-new']);
  });

  it('loads trace detail by gateway request id and run event id', async () => {
    seed('tokenUsage', [
      {
        id: 'usage-1',
        model: 'gpt-local',
        endpoint: '/v1/messages',
        inputTokens: 4,
        outputTokens: 8,
        totalTokens: 12,
        success: false,
        failureCategory: 'timeout',
        latencyMs: 4000,
        requestId: 'trace-timeout',
        createdAt: '2026-05-12T00:00:00.000Z',
      },
    ] satisfies NexusUsageRecord[]);
    seed('runEvents', [
      {
        id: 'event-1',
        executionId: 'exec-1',
        type: 'agent.execution',
        status: 'success',
        title: 'Agent finished',
        createdAt: '2026-05-12T00:02:00.000Z',
      },
    ] satisfies RunEvent[]);

    await expect(getTraceDetail('trace-timeout')).resolves.toMatchObject({
      traceId: 'trace-timeout',
      source: 'gateway',
      durationBucket: 'slow',
      errorCategory: 'timeout',
    });
    await expect(getTraceDetail('exec-1')).resolves.toMatchObject({
      traceId: 'exec-1',
      source: 'agent',
      durationBucket: 'unknown',
    });
    await expect(getTraceDetail('missing')).resolves.toBeNull();
  });
});
