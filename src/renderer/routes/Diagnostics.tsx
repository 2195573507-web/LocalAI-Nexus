import React from 'react';
import {
  Activity,
  BarChart3,
  Download,
  FileJson,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
} from 'lucide-react';
import { Badge, Button, SurfaceCard, Textarea } from '../components';
import { api } from '../lib/api';
import type {
  NexusBackupManifest,
  NexusContextPackPreview,
  NexusGatewayStatus,
  NexusObservabilityReport,
  NexusRestoreApplyResult,
  NexusRestorePreview,
  NexusSecurityReport,
} from '../lib/types';

function hasError(value: unknown): value is { error: string } {
  return Boolean(value && typeof value === 'object' && 'error' in value);
}

function statusVariant(status?: string) {
  if (status === 'success' || status === 'passed') return 'success';
  if (status === 'failure' || status === 'failed' || status === 'denied') return 'danger';
  if (status === 'warning') return 'warning';
  return 'default';
}

export default function Diagnostics() {
  const [gateway, setGateway] = React.useState<NexusGatewayStatus | null>(null);
  const [contextPack, setContextPack] = React.useState<NexusContextPackPreview | null>(null);
  const [security, setSecurity] = React.useState<NexusSecurityReport | null>(null);
  const [observability, setObservability] = React.useState<NexusObservabilityReport | null>(null);
  const [backup, setBackup] = React.useState<NexusBackupManifest | null>(null);
  const [restoreRaw, setRestoreRaw] = React.useState('');
  const [restorePreview, setRestorePreview] = React.useState<NexusRestorePreview | null>(null);
  const [restoreResult, setRestoreResult] = React.useState<NexusRestoreApplyResult | null>(null);
  const [message, setMessage] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    const [gatewayResult, contextResult, securityResult, observabilityResult, backupResult] = await Promise.all([
      api.gateway.status().catch(() => null),
      api.contextPack.preview().catch(() => null),
      api.security.report().catch(() => null),
      api.observability.report({ includeMockEvaluation: true, evaluationOutput: 'Local diagnostic output' }).catch(() => null),
      api.ops.backupPreview().catch(() => null),
    ]);
    if (gatewayResult && !hasError(gatewayResult)) setGateway(gatewayResult);
    if (contextResult && !hasError(contextResult)) setContextPack(contextResult);
    if (securityResult && !hasError(securityResult)) setSecurity(securityResult);
    if (observabilityResult && !hasError(observabilityResult)) setObservability(observabilityResult);
    if (backupResult && !hasError(backupResult)) setBackup(backupResult);
    setLoading(false);
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const exportObservability = async () => {
    if (!observability?.exportSummary) return;
    await api.export.markdown(observability.exportSummary.markdown, observability.exportSummary.suggestedFilename);
    setMessage('观测报告已导出，内容已脱敏。');
  };

  const createBackup = async () => {
    setLoading(true);
    const result = await api.ops.createBackup();
    setLoading(false);
    if (hasError(result)) {
      setMessage(result.error);
      return;
    }
    setBackup(result);
    setMessage(`已创建备份清单：${result.checksum}`);
  };

  const previewRestore = async () => {
    const result = await api.ops.restorePreview(restoreRaw);
    if (hasError(result)) {
      setMessage(result.error);
      return;
    }
    setRestorePreview(result);
    setRestoreResult(null);
    setMessage(result.ok ? 'Restore preview 已通过，可用 applyToken 显式应用。' : 'Restore preview 未通过，请先修复错误。');
  };

  const applyRestore = async () => {
    if (!restorePreview?.applyToken) return;
    const result = await api.ops.restoreApply({ raw: restoreRaw, confirmToken: restorePreview.applyToken });
    if (hasError(result)) {
      setMessage(result.error);
      return;
    }
    setRestoreResult(result);
    setMessage(result.ok ? `Restore apply 完成：${result.checksum}` : result.warnings.join(' '));
    await load();
  };

  return (
    <div className="mx-auto max-w-7xl space-y-5 p-6">
      <section className="surface-card p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">诊断中心</h1>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              集中查看 Gateway、Context Pack、安全报告、Trace、慢请求、mock eval 和备份恢复状态。
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" loading={loading} onClick={load} icon={<RefreshCw className="h-4 w-4" />}>
              刷新
            </Button>
            <Button variant="secondary" onClick={exportObservability} icon={<Download className="h-4 w-4" />}>
              导出观测报告
            </Button>
          </div>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-4">
        <SurfaceCard className="p-5">
          <div className="flex items-center gap-2 text-sm font-semibold"><Activity className="h-4 w-4" /> Gateway</div>
          <div className="mt-3 text-2xl font-bold">{gateway?.online ? '在线' : '离线'}</div>
          <p className="mt-2 text-xs text-[var(--text-muted)]">{gateway?.baseUrl ?? 'http://127.0.0.1:8317'}</p>
          <Badge>{gateway?.lastTraceId ?? '暂无 trace'}</Badge>
        </SurfaceCard>
        <SurfaceCard className="p-5">
          <div className="flex items-center gap-2 text-sm font-semibold"><FileJson className="h-4 w-4" /> Context Pack</div>
          <div className="mt-3 text-2xl font-bold">{contextPack?.memoryCount ?? 0}</div>
          <p className="mt-2 text-xs text-[var(--text-muted)]">{contextPack?.staleMemoryCount ?? 0} 条过期记忆 / {contextPack?.sources.length ?? 0} 个来源</p>
          <Badge>脱敏预览</Badge>
        </SurfaceCard>
        <SurfaceCard className="p-5">
          <div className="flex items-center gap-2 text-sm font-semibold"><ShieldCheck className="h-4 w-4" /> 安全</div>
          <div className="mt-3 text-2xl font-bold">{security?.findings.length ?? 0}</div>
          <p className="mt-2 text-xs text-[var(--text-muted)]">{security?.deniedEventCount ?? 0} 次拒绝 / {security?.providerRiskCount ?? 0} 个 Provider 风险</p>
          <Badge>{security?.redaction ?? 'secrets-redacted'}</Badge>
        </SurfaceCard>
        <SurfaceCard className="p-5">
          <div className="flex items-center gap-2 text-sm font-semibold"><BarChart3 className="h-4 w-4" /> 观测</div>
          <div className="mt-3 text-2xl font-bold">{observability?.traces.length ?? 0}</div>
          <p className="mt-2 text-xs text-[var(--text-muted)]">{observability?.slowRequests.length ?? 0} 个慢请求 / {observability?.errorCategories.length ?? 0} 类错误</p>
          <Badge variant={statusVariant(observability?.evaluation?.status)}>{observability?.evaluation?.status ?? 'mock-eval'}</Badge>
        </SurfaceCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <SurfaceCard className="p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold">Trace 详情</h2>
            <Badge>{observability?.exportSummary?.traceCount ?? 0} traces</Badge>
          </div>
          <div className="mt-4 space-y-2">
            {(observability?.traces ?? []).slice(0, 12).map((trace) => (
              <div key={trace.traceId} className="rounded-tool border border-[var(--border)] bg-[var(--surface-muted)] p-3 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="font-semibold">{trace.source} / {trace.operation}</span>
                  <Badge variant={statusVariant(trace.status)}>{trace.status}</Badge>
                </div>
                <div className="mt-2 grid gap-1 text-[var(--text-muted)] sm:grid-cols-3">
                  <span className="font-mono">{trace.traceId}</span>
                  <span>{new Date(trace.startedAt).toLocaleString()}</span>
                  <span>{trace.latencyMs ? `${trace.latencyMs}ms` : 'latency n/a'}</span>
                </div>
              </div>
            ))}
            {(observability?.traces.length ?? 0) === 0 && <div className="text-sm text-[var(--text-muted)]">暂无 trace。</div>}
          </div>
        </SurfaceCard>

        <SurfaceCard className="p-5">
          <h2 className="text-base font-semibold">恢复 Prompt 预览</h2>
          <pre className="mt-4 max-h-96 overflow-auto rounded-tool bg-black/80 p-4 text-xs text-white">
            {contextPack?.prompt ?? '尚未生成 Context Pack。'}
          </pre>
        </SurfaceCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <SurfaceCard className="p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold">本地评测数据集</h2>
            <Badge variant="info">{observability?.evaluationDataset.mode ?? 'mock-local'}</Badge>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 text-sm md:grid-cols-4">
            <div className="rounded-tool border border-[var(--border)] bg-[var(--surface-muted)] p-3">
              <div className="text-xs text-[var(--text-muted)]">样本</div>
              <div className="mt-1 text-lg font-bold">{observability?.evaluationDataset.sampleCount ?? 0}</div>
            </div>
            <div className="rounded-tool border border-[var(--border)] bg-[var(--surface-muted)] p-3">
              <div className="text-xs text-[var(--text-muted)]">平均分</div>
              <div className="mt-1 text-lg font-bold">{observability?.evaluationDataset.averageScore ?? 0}</div>
            </div>
            <div className="rounded-tool border border-[var(--border)] bg-[var(--surface-muted)] p-3">
              <div className="text-xs text-[var(--text-muted)]">通过</div>
              <div className="mt-1 text-lg font-bold">{observability?.evaluationDataset.passCount ?? 0}</div>
            </div>
            <div className="rounded-tool border border-[var(--border)] bg-[var(--surface-muted)] p-3">
              <div className="text-xs text-[var(--text-muted)]">警告/失败</div>
              <div className="mt-1 text-lg font-bold">
                {(observability?.evaluationDataset.warningCount ?? 0) + (observability?.evaluationDataset.failCount ?? 0)}
              </div>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            {(observability?.evaluationDataset.latestRuns ?? []).map((run) => (
              <div key={run.id} className="rounded-tool border border-[var(--border)] bg-[var(--surface-muted)] p-3 text-xs">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-semibold">{run.name}</span>
                  <Badge variant={statusVariant(run.status)}>{run.status}</Badge>
                </div>
                <div className="mt-1 text-[var(--text-muted)]">score {run.score} · {new Date(run.createdAt).toLocaleString()}</div>
              </div>
            ))}
          </div>
        </SurfaceCard>

        <SurfaceCard className="p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold">本地 Red-Team 提示</h2>
            <Badge>{observability?.redTeamFindings.length ?? 0} findings</Badge>
          </div>
          <div className="mt-4 space-y-2">
            {(observability?.redTeamFindings ?? []).map((finding) => (
              <div key={finding.id} className="rounded-tool border border-[var(--border)] bg-[var(--surface-muted)] p-3 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="font-semibold">{finding.title}</span>
                  <Badge variant={finding.severity === 'critical' ? 'danger' : finding.severity === 'warning' ? 'warning' : 'default'}>{finding.severity}</Badge>
                </div>
                <p className="mt-2 text-[var(--text-secondary)]">{finding.detail}</p>
                <p className="mt-2 text-[var(--text-muted)]">{finding.recommendation}</p>
              </div>
            ))}
          </div>
        </SurfaceCard>
      </div>

      <SurfaceCard className="space-y-4 p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-base font-semibold">备份 / Restore Apply</h2>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Restore 必须先 preview，再用 applyToken 显式应用；当前实现只合并新 id，不覆盖已有记录。
            </p>
          </div>
          <Button variant="secondary" loading={loading} onClick={createBackup} icon={<RotateCcw className="h-4 w-4" />}>
            创建备份清单
          </Button>
        </div>
        <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-tool border border-[var(--border)] bg-[var(--surface-muted)] p-4 text-sm">
            <div className="font-semibold">当前备份预览</div>
            <div className="mt-2 text-xs text-[var(--text-muted)]">checksum: {backup?.checksum ?? 'n/a'}</div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {(backup?.collections ?? []).slice(0, 10).map((collection) => (
                <div key={collection.name} className="rounded-tool border border-[var(--border)] bg-[var(--surface)] p-2">
                  <div className="font-semibold">{collection.name}</div>
                  <div className="text-xs text-[var(--text-muted)]">{collection.count} records</div>
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-3">
            <Textarea
              label="Restore JSON"
              value={restoreRaw}
              onChange={(event) => setRestoreRaw(event.target.value)}
              placeholder='{"manifest":{"schemaVersion":1,"redaction":"secrets-redacted","restoreRequiresPreview":true}}'
              className="min-h-[160px] font-mono"
            />
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={previewRestore}>Preview Restore</Button>
              <Button onClick={applyRestore} disabled={!restorePreview?.ok || !restorePreview.applyToken}>
                Apply Restore
              </Button>
            </div>
            {restorePreview && (
              <div className="rounded-tool border border-[var(--border)] bg-[var(--surface-muted)] p-3 text-xs">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-semibold">Preview: {restorePreview.ok ? 'OK' : 'Blocked'}</span>
                  <Badge variant={restorePreview.ok ? 'success' : 'danger'}>{restorePreview.changes.length} changes</Badge>
                </div>
                <div className="mt-2 font-mono text-[var(--text-muted)]">applyToken: {restorePreview.applyToken ?? 'n/a'}</div>
                {restorePreview.errors.length > 0 && <p className="mt-2 text-[var(--danger)]">{restorePreview.errors.join(' ')}</p>}
              </div>
            )}
            {restoreResult && (
              <div className="rounded-tool border border-[var(--border)] bg-[var(--surface-muted)] p-3 text-xs">
                <div className="font-semibold">Apply: {restoreResult.ok ? 'OK' : 'Rejected'}</div>
                <div className="mt-1 font-mono text-[var(--text-muted)]">{restoreResult.checksum}</div>
                <div className="mt-2 text-[var(--text-muted)]">
                  mode: {restoreResult.mode ?? 'merge-only'} · inserted {restoreResult.summary?.inserted ?? 0} · skipped {restoreResult.summary?.skipped ?? 0}
                </div>
              </div>
            )}
          </div>
        </div>
      </SurfaceCard>

      {message && (
        <div className="rounded-tool border border-[var(--border)] bg-[var(--surface-muted)] p-3 text-sm">
          {message}
        </div>
      )}
    </div>
  );
}
