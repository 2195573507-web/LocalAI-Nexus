import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import * as nodeCrypto from 'node:crypto';
import type { NexusUsageRecord, RunEvent } from '../../src/shared/types';

const collections = new Map<string, Array<Record<string, unknown>>>();

let generateObservabilityReport: typeof import('../../src/main/domain/observability/observabilityService').generateObservabilityReport;
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
    ({ generateObservabilityReport, runMockEvaluation } = await import('../../src/main/domain/observability/observabilityService'));
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

  it('persists mock evaluation runs as redacted local records', async () => {
    const evaluation = await runMockEvaluation({ output: 'good output' });
    expect(evaluation.score).toBeGreaterThan(0.7);
    expect(evaluation.redaction).toBe('secrets-redacted');
    expect(collections.get('evaluationRuns')).toHaveLength(1);
  });
});
