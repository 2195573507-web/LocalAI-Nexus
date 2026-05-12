import React from 'react';
import { Activity, BarChart3, FileJson, RefreshCw, ShieldCheck } from 'lucide-react';
import { Badge, Button, SurfaceCard } from '../components';
import { api } from '../lib/api';
import type {
  NexusContextPackPreview,
  NexusGatewayStatus,
  NexusObservabilityReport,
  NexusSecurityReport,
} from '../lib/types';

export default function Diagnostics() {
  const [gateway, setGateway] = React.useState<NexusGatewayStatus | null>(null);
  const [contextPack, setContextPack] = React.useState<NexusContextPackPreview | null>(null);
  const [security, setSecurity] = React.useState<NexusSecurityReport | null>(null);
  const [observability, setObservability] = React.useState<NexusObservabilityReport | null>(null);

  const load = React.useCallback(async () => {
    const [gatewayResult, contextResult, securityResult, observabilityResult] = await Promise.all([
      api.gateway.status().catch(() => null),
      api.contextPack.preview().catch(() => null),
      api.security.report().catch(() => null),
      api.observability.report({ includeMockEvaluation: true, evaluationOutput: 'Local diagnostic output' }).catch(() => null),
    ]);
    if (gatewayResult && typeof gatewayResult === 'object' && !('error' in gatewayResult)) setGateway(gatewayResult);
    if (contextResult && typeof contextResult === 'object' && !('error' in contextResult)) setContextPack(contextResult);
    if (securityResult && typeof securityResult === 'object' && !('error' in securityResult)) setSecurity(securityResult);
    if (observabilityResult && typeof observabilityResult === 'object' && !('error' in observabilityResult)) setObservability(observabilityResult);
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="mx-auto max-w-7xl space-y-5 p-6">
      <section className="surface-card p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold">诊断中心</h1>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              集中查看 Gateway、Context Pack、安全报告、trace、慢请求和本地模拟评测。
            </p>
          </div>
          <Button variant="secondary" onClick={load} icon={<RefreshCw className="h-4 w-4" />}>刷新</Button>
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
          <Badge>{observability?.evaluation?.status ?? 'mock-eval'}</Badge>
        </SurfaceCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <SurfaceCard className="p-5">
          <h2 className="text-base font-semibold">最近 Trace</h2>
          <div className="mt-4 space-y-2">
            {(observability?.traces ?? []).slice(0, 10).map((trace) => (
              <div key={trace.traceId} className="rounded-tool border border-[var(--border)] bg-[var(--surface-muted)] p-3 text-xs">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-semibold">{trace.operation}</span>
                  <Badge>{trace.status}</Badge>
                </div>
                <div className="mt-1 font-mono text-[var(--text-muted)]">{trace.traceId}</div>
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
    </div>
  );
}
