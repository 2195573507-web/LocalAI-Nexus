import { randomUUID } from 'crypto';
import type {
  AgentExecutionRecord,
  NexusEvaluationRun,
  NexusFailureCategory,
  NexusObservabilityReport,
  NexusTraceSummary,
  NexusUsageRecord,
  RunEvent,
} from '../../../shared/types.js';
import { sanitizeObject } from '../../../shared/secretRedaction.js';
import storage from '../../storage.js';
import { recordAudit } from '../../audit.js';
import { summarizeUsage } from '../usage/usageService.js';

function countByCategory(records: NexusUsageRecord[]) {
  const counts = new Map<NexusFailureCategory, number>();
  for (const record of records) {
    if (record.success) continue;
    counts.set(record.failureCategory, (counts.get(record.failureCategory) ?? 0) + 1);
  }
  return [...counts.entries()].map(([category, count]) => ({ category, count }));
}

function gatewayTrace(record: NexusUsageRecord): NexusTraceSummary {
  return {
    traceId: record.requestId ?? record.id,
    source: 'gateway',
    operation: record.endpoint,
    status: record.success ? 'success' : 'failure',
    startedAt: record.createdAt,
    latencyMs: record.latencyMs,
    errorCategory: record.success ? undefined : record.failureCategory,
    redaction: 'secrets-redacted',
  };
}

function runEventTrace(event: RunEvent): NexusTraceSummary {
  return {
    traceId: event.executionId ?? event.runId ?? event.auditEventId ?? event.id,
    source: event.type.startsWith('agent') ? 'agent' : event.type.startsWith('gateway') ? 'gateway' : 'workflow',
    operation: event.type,
    status: event.status,
    startedAt: event.createdAt,
    redaction: 'secrets-redacted',
  };
}

export async function runMockEvaluation(input: {
  name?: string;
  target?: 'prompt' | 'model';
  promptId?: string;
  providerId?: string;
  model?: string;
  output?: string;
} = {}): Promise<NexusEvaluationRun> {
  const output = String(input.output ?? '');
  const score = Math.max(0.1, Math.min(1, output ? 0.7 + Math.min(output.length, 600) / 2000 : 0.62));
  const status = score >= 0.75 ? 'passed' : score >= 0.5 ? 'warning' : 'failed';
  const findings = [
    output ? 'Mock evaluator found usable structured output.' : 'Mock evaluator used diagnostic baseline because no output was supplied.',
    'Live LLM-as-judge is intentionally skipped without credentials.',
  ];
  const run: NexusEvaluationRun = {
    id: randomUUID(),
    name: String(input.name || 'Local mock prompt/model evaluation'),
    target: input.target ?? 'prompt',
    promptId: input.promptId,
    providerId: input.providerId,
    model: input.model,
    score: Number(score.toFixed(3)),
    status,
    findings,
    redaction: 'secrets-redacted',
    mode: 'mock',
    createdAt: new Date().toISOString(),
  };
  await storage.create<NexusEvaluationRun>('evaluationRuns', sanitizeObject(run) as NexusEvaluationRun).catch(() => undefined);
  return run;
}

export async function generateObservabilityReport(options: {
  includeMockEvaluation?: boolean;
  evaluationOutput?: string;
} = {}): Promise<NexusObservabilityReport> {
  const [usage, records, runEvents] = await Promise.all([
    summarizeUsage(),
    storage.getAll<NexusUsageRecord>('tokenUsage').catch(() => []),
    storage.getAll<RunEvent>('runEvents').catch(() => []),
  ]);
  const recentRecords = records.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 100);
  const recentEvents = runEvents.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 100);
  const traces = [
    ...recentRecords.slice(0, 30).map(gatewayTrace),
    ...recentEvents.slice(0, 30).map(runEventTrace),
  ].sort((a, b) => b.startedAt.localeCompare(a.startedAt)).slice(0, 50);
  const slowRequests = recentRecords
    .filter((record) => record.latencyMs >= Math.max(1000, usage.p95LatencyMs))
    .slice(0, 20);
  const report: NexusObservabilityReport = {
    id: randomUUID(),
    generatedAt: new Date().toISOString(),
    usage,
    traces,
    slowRequests,
    errorCategories: countByCategory(recentRecords),
    evaluation: options.includeMockEvaluation ? await runMockEvaluation({ output: options.evaluationOutput }) : undefined,
    reportRedaction: 'secrets-redacted',
    compatibility: 'legacy-usage-and-run-events',
  };
  await recordAudit({
    type: 'admin.operation',
    action: 'observability.report.generate',
    status: 'success',
    severity: 'info',
    actor: {},
    resource: { type: 'observability_report', id: report.id },
    metadata: sanitizeObject({ traceCount: report.traces.length, slowRequestCount: report.slowRequests.length }),
  }).catch(() => undefined);
  return sanitizeObject(report) as NexusObservabilityReport;
}

export async function createFeedbackFromExecution(execution: AgentExecutionRecord): Promise<NexusEvaluationRun> {
  return runMockEvaluation({
    name: `Execution feedback: ${execution.id}`,
    target: 'prompt',
    output: `${execution.outputSummary}\n${execution.errorSummary ?? ''}`,
  });
}
