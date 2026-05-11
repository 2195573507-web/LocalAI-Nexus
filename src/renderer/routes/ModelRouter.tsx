import React from 'react';
import { GitFork, RefreshCw, Route } from 'lucide-react';
import { Badge, Button, EmptyState, SurfaceCard } from '../components';
import { api } from '../lib/api';
import type { NexusRouterDecision, ProviderSetting } from '../lib/types';

export default function ModelRouter() {
  const [providers, setProviders] = React.useState<ProviderSetting[]>([]);
  const [decisions, setDecisions] = React.useState<NexusRouterDecision[]>([]);
  const [loading, setLoading] = React.useState(true);

  const load = React.useCallback(async () => {
    setLoading(true);
    const [providerResult, decisionResult] = await Promise.all([
      api.providers.list().catch(() => []),
      api.router.decisions().catch(() => []),
    ]);
    setProviders(Array.isArray(providerResult) ? providerResult : []);
    setDecisions(Array.isArray(decisionResult) ? decisionResult : []);
    setLoading(false);
  }, []);

  React.useEffect(() => { void load(); }, [load]);

  if (loading) return <div className="mx-auto max-w-7xl p-6"><div className="surface-card p-6">正在加载模型路由...</div></div>;

  return (
    <div className="mx-auto max-w-7xl space-y-5 p-6">
      <section className="surface-card p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">模型路由</h1>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">按标签、请求模型、fallback、配额、冷却和路由 trace 解释 Provider/模型选择。</p>
          </div>
          <Button variant="secondary" onClick={load} icon={<RefreshCw className="h-4 w-4" />}>刷新</Button>
        </div>
      </section>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {providers.map((provider) => (
          <SurfaceCard key={provider.id} className="p-5">
            <div className="flex items-start justify-between gap-3"><h2 className="font-semibold">{provider.providerName}</h2><Badge>{provider.enabled === false ? '已禁用' : '已启用'}</Badge></div>
            <p className="mt-1 text-xs text-[var(--text-muted)]">{provider.modelName}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {(provider.tags ?? []).map((tag) => <Badge key={tag}>{tag}</Badge>)}
              {provider.cooldownUntil && <Badge>冷却中</Badge>}
              {(provider.dailyQuota ?? 0) > 0 && <Badge>日配额 {provider.dailyQuota}</Badge>}
            </div>
          </SurfaceCard>
        ))}
      </div>
      <SurfaceCard className="p-5">
        <h2 className="flex items-center gap-2 text-base font-semibold"><Route className="h-4 w-4" /> 最近决策</h2>
        <div className="mt-4 space-y-2">
          {decisions.map((decision) => (
            <div key={decision.id} className="rounded-tool border border-[var(--border)] bg-[var(--surface-muted)] p-3 text-sm">
              <div className="flex flex-wrap items-center gap-2"><Badge>{decision.quotaState}</Badge><Badge>{decision.fallbackUsed ? 'fallback' : 'primary'}</Badge><span className="font-semibold">{decision.providerName ?? '诊断'} / {decision.model}</span></div>
              <p className="mt-2 text-xs text-[var(--text-secondary)]">{decision.reason}</p>
            </div>
          ))}
          {decisions.length === 0 && <EmptyState icon={GitFork} title="暂无路由决策" description="使用 Gateway、Runtime 切换器或 Workflow 运行后，会生成可追踪的路由决策。" />}
        </div>
      </SurfaceCard>
    </div>
  );
}
