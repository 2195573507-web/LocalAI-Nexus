import { randomUUID } from 'crypto';
import type {
  AgentExecutionRecord,
  NexusEvaluationDatasetSummary,
  NexusEvaluationRun,
  NexusFailureCategory,
  NexusObservabilityExportSummary,
  NexusObservabilityReport,
  NexusRedTeamFinding,
  NexusTraceDetail,
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

function traceDetail(trace: NexusTraceSummary): NexusTraceDetail {
  const latency = trace.latencyMs;
  const durationBucket: NexusTraceDetail['durationBucket'] = latency === undefined
    ? 'unknown'
    : latency >= 3000
      ? 'slow'
      : latency >= 800
        ? 'normal'
        : 'fast';
  const details = [
    { label: 'source', value: trace.source },
    { label: 'operation', value: trace.operation },
    { label: 'status', value: trace.status },
    { label: 'startedAt', value: trace.startedAt },
  ];
  if (latency !== undefined) details.push({ label: 'latencyMs', value: String(latency) });
  if (trace.errorCategory) details.push({ label: 'errorCategory', value: trace.errorCategory });
  return {
    ...trace,
    durationBucket,
    relatedRecordId: trace.traceId,
    details,
  };
}

function summarizeEvaluationDataset(runs: NexusEvaluationRun[], now = new Date()): NexusEvaluationDatasetSummary {
  const passCount = runs.filter((run) => run.status === 'passed').length;
  const warningCount = runs.filter((run) => run.status === 'warning').length;
  const failCount = runs.filter((run) => run.status === 'failed').length;
  const averageScore = runs.length > 0
    ? Number((runs.reduce((sum, run) => sum + run.score, 0) / runs.length).toFixed(3))
    : 0;
  return {
    id: randomUUID(),
    generatedAt: now.toISOString(),
    sampleCount: runs.length,
    passCount,
    warningCount,
    failCount,
    averageScore,
    latestRuns: [...runs]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 5)
      .map((run) => ({
        id: run.id,
        name: run.name,
        status: run.status,
        score: run.score,
        createdAt: run.createdAt,
      })),
    mode: 'mock-local',
    redaction: 'secrets-redacted',
  };
}

function buildRedTeamFindings(report: {
  traces: NexusTraceSummary[];
  errorCategories: Array<{ category: NexusFailureCategory; count: number }>;
  evaluation?: NexusEvaluationRun;
}): NexusRedTeamFinding[] {
  const findings: NexusRedTeamFinding[] = [];
  if (report.errorCategories.some((item) => ['401', '403'].includes(item.category))) {
    findings.push({
      id: `redteam-auth-${randomUUID()}`,
      risk: 'unsafe-tooling',
      severity: 'warning',
      title: 'Gateway auth denial pattern detected',
      detail: 'Recent traces include authentication or permission failures. This is useful evidence for API key policy tests.',
      recommendation: 'Keep denied requests in the report and verify the key or permission boundary before live provider smoke.',
    });
  }
  if (report.evaluation?.status === 'failed') {
    findings.push({
      id: `redteam-eval-${randomUUID()}`,
      risk: 'prompt-injection',
      severity: 'warning',
      title: 'Mock evaluation failed',
      detail: 'The local mock evaluator marked the latest sample as failed, so the prompt/model output needs review before reuse.',
      recommendation: 'Add the failing sample to a future credentialed evaluation dataset and keep the local report redacted.',
    });
  }
  if (report.traces.length === 0) {
    findings.push({
      id: `redteam-empty-${randomUUID()}`,
      risk: 'none',
      severity: 'info',
      title: 'No traces available yet',
      detail: 'The report is generated without recent Gateway, Agent, or Workflow traces.',
      recommendation: 'Run a local Gateway or Workflow smoke before treating observability as representative.',
    });
  }
  return findings.length > 0
    ? findings
    : [{
      id: `redteam-clean-${randomUUID()}`,
      risk: 'none',
      severity: 'info',
      title: 'No local red-team issue detected',
      detail: 'The current local report has traces and no auth denial or failed mock evaluation patterns.',
      recommendation: 'Keep this as CI-safe evidence; credentialed red-team tests still require user-approved provider keys.',
    }];
}

function buildExportSummary(report: Omit<NexusObservabilityReport, 'exportSummary'>): NexusObservabilityExportSummary {
  const lines = [
    '# LocalAI Nexus Observability Report',
    '',
    `Generated: ${report.generatedAt}`,
    `Trace count: ${report.traces.length}`,
    `Slow requests: ${report.slowRequests.length}`,
    `Error categories: ${report.errorCategories.length}`,
    `Evaluation: ${report.evaluation?.status ?? 'not-run'}`,
    `Evaluation dataset: ${report.evaluationDataset.sampleCount} local runs, average ${report.evaluationDataset.averageScore}`,
    `Red-team findings: ${report.redTeamFindings.length}`,
    '',
    '## Recent Traces',
    ...report.traces.slice(0, 10).map((trace) =>
      `- ${trace.status.toUpperCase()} ${trace.source}/${trace.operation} (${trace.traceId})`,
    ),
    '',
    '## Trace Detail',
    ...report.traceDetails.slice(0, 10).map((trace) =>
      `- ${trace.traceId}: ${trace.durationBucket}; ${trace.details.map((item) => `${item.label}=${item.value}`).join(', ')}`,
    ),
    '',
    '## Error Categories',
    ...(report.errorCategories.length > 0
      ? report.errorCategories.map((item) => `- ${item.category}: ${item.count}`)
      : ['- none']),
    '',
    '## Local Red-Team Findings',
    ...report.redTeamFindings.map((finding) => `- ${finding.severity.toUpperCase()} ${finding.title}: ${finding.recommendation}`),
    '',
    'Redaction: secrets-redacted',
  ];
  return {
    id: randomUUID(),
    generatedAt: report.generatedAt,
    traceCount: report.traces.length,
    slowRequestCount: report.slowRequests.length,
    errorCategoryCount: report.errorCategories.length,
    evaluationStatus: report.evaluation?.status,
    suggestedFilename: `localai-nexus-observability-${report.generatedAt.slice(0, 10)}.md`,
    markdown: lines.join('\n'),
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
  const [usage, records, runEvents, evaluationRunsBefore] = await Promise.all([
    summarizeUsage(),
    storage.getAll<NexusUsageRecord>('tokenUsage').catch(() => []),
    storage.getAll<RunEvent>('runEvents').catch(() => []),
    storage.getAll<NexusEvaluationRun>('evaluationRuns').catch(() => []),
  ]);
  const recentRecords = records.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 100);
  const recentEvents = runEvents.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 100);
  const traces = [
    ...recentRecords.slice(0, 30).map(gatewayTrace),
    ...recentEvents.slice(0, 30).map(runEventTrace),
  ].sort((a, b) => b.startedAt.localeCompare(a.startedAt)).slice(0, 50);
  const evaluation = options.includeMockEvaluation ? await runMockEvaluation({ output: options.evaluationOutput }) : undefined;
  const evaluationDataset = summarizeEvaluationDataset(evaluation ? [...evaluationRunsBefore, evaluation] : evaluationRunsBefore);
  const slowRequests = recentRecords
    .filter((record) => record.latencyMs >= Math.max(1000, usage.p95LatencyMs))
    .slice(0, 20);
  const reportBase: Omit<NexusObservabilityReport, 'exportSummary'> = {
    id: randomUUID(),
    generatedAt: new Date().toISOString(),
    usage,
    traces,
    slowRequests,
    errorCategories: countByCategory(recentRecords),
    traceDetails: traces.slice(0, 20).map(traceDetail),
    evaluation,
    evaluationDataset,
    redTeamFindings: [],
    reportRedaction: 'secrets-redacted',
    compatibility: 'legacy-usage-and-run-events',
  };
  reportBase.redTeamFindings = buildRedTeamFindings(reportBase);
  const report: NexusObservabilityReport = {
    ...reportBase,
    exportSummary: buildExportSummary(reportBase),
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
