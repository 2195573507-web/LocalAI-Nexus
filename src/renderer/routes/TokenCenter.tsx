import React from 'react';
import { Activity, BarChart3, Clock, Database, RefreshCw, Save, Zap } from 'lucide-react';
import { Badge, Button, EmptyState, Input, SurfaceCard } from '../components';
import { api } from '../lib/api';
import type { NexusTokenPolicy, NexusTokenPolicyEvaluation, NexusUsageRecord, NexusUsageSummary, ProviderSetting } from '../lib/types';

export default function TokenCenter() {
  const [summary, setSummary] = React.useState<NexusUsageSummary | null>(null);
  const [records, setRecords] = React.useState<NexusUsageRecord[]>([]);
  const [providers, setProviders] = React.useState<ProviderSetting[]>([]);
  const [policies, setPolicies] = React.useState<NexusTokenPolicy[]>([]);
  const [evaluations, setEvaluations] = React.useState<Record<string, NexusTokenPolicyEvaluation>>({});
  const [loading, setLoading] = React.useState(true);
  const [message, setMessage] = React.useState('');
  const [policyForm, setPolicyForm] = React.useState({
    providerId: '',
    model: '',
    dailyQuota: 0,
    monthlyQuota: 0,
    concurrencyLimit: 1,
    cooldownMinutes: 0,
  });

  const load = React.useCallback(async () => {
    setLoading(true);
    const [summaryResult, recordsResult, providerResult, policyResult] = await Promise.all([
      api.usage.summary().catch(() => null),
      api.usage.list({ limit: 100 }).catch(() => []),
      api.providers.list().catch(() => []),
      api.tokenPolicies.list().catch(() => []),
    ]);
    if (summaryResult && typeof summaryResult === 'object' && !('error' in summaryResult)) setSummary(summaryResult);
    setRecords(Array.isArray(recordsResult) ? recordsResult : []);
    const providerList = Array.isArray(providerResult) ? providerResult : [];
    setProviders(providerList);
    setPolicies(Array.isArray(policyResult) ? policyResult : []);
    setPolicyForm((prev) => ({ ...prev, providerId: prev.providerId || providerList[0]?.id || '', model: prev.model || providerList[0]?.modelName || '' }));
    const entries = await Promise.all(providerList.map(async (provider) => {
      const evaluation = await api.tokenPolicies.evaluate(provider.id, provider.modelName).catch(() => null);
      return evaluation && typeof evaluation === 'object' && !('error' in evaluation) ? [provider.id, evaluation] as const : null;
    }));
    setEvaluations(Object.fromEntries(entries.filter(Boolean) as Array<readonly [string, NexusTokenPolicyEvaluation]>));
    setLoading(false);
  }, []);

  React.useEffect(() => { void load(); }, [load]);

  const quotaRows = providers.map((provider) => ({
    provider,
    dailyQuota: provider.dailyQuota ?? 0,
    monthlyQuota: provider.monthlyQuota ?? 0,
    concurrency: provider.concurrencyLimit ?? 1,
    cooldown: provider.cooldownUntil ? new Date(provider.cooldownUntil).toLocaleString() : 'none',
  }));

  const savePolicy = async () => {
    const result = await api.tokenPolicies.upsert({
      providerId: policyForm.providerId || undefined,
      model: policyForm.model || undefined,
      dailyQuota: Number(policyForm.dailyQuota) || 0,
      monthlyQuota: Number(policyForm.monthlyQuota) || 0,
      concurrencyLimit: Number(policyForm.concurrencyLimit) || 0,
      cooldownMinutes: Number(policyForm.cooldownMinutes) || 0,
      enabled: true,
      reason: '从 Token 中心配置',
    });
    setMessage('error' in result ? result.error : `已保存 ${result.providerId ?? result.model ?? '工作区'} 的 Token 策略。`);
    await load();
  };

  if (loading) return <div className="mx-auto max-w-7xl p-6"><div className="surface-card p-6">正在加载 Token 中心...</div></div>;

  return (
    <div className="mx-auto max-w-7xl space-y-5 p-6">
      <section className="surface-card p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">Token 中心</h1>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">跟踪用量、成功率、失败分类、延迟、配额、冷却、并发限制和路由影响。</p>
          </div>
          <Button variant="secondary" onClick={load} icon={<RefreshCw className="h-4 w-4" />}>刷新</Button>
        </div>
      </section>

      {message && <div className="rounded-tool border border-accent-500/30 bg-accent-500/10 p-3 text-sm text-[var(--accent)]">{message}</div>}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SurfaceCard className="p-5"><div className="flex items-center gap-2 text-xs text-[var(--text-muted)]"><Zap className="h-4 w-4" /> Token 总量</div><div className="mt-2 text-2xl font-bold">{summary?.totalTokens ?? 0}</div></SurfaceCard>
        <SurfaceCard className="p-5"><div className="flex items-center gap-2 text-xs text-[var(--text-muted)]"><Activity className="h-4 w-4" /> 今日请求</div><div className="mt-2 text-2xl font-bold">{summary?.todayRequests ?? 0}</div></SurfaceCard>
        <SurfaceCard className="p-5"><div className="flex items-center gap-2 text-xs text-[var(--text-muted)]"><BarChart3 className="h-4 w-4" /> 成功率</div><div className="mt-2 text-2xl font-bold">{Math.round((summary?.successRate ?? 0) * 100)}%</div></SurfaceCard>
        <SurfaceCard className="p-5"><div className="flex items-center gap-2 text-xs text-[var(--text-muted)]"><Clock className="h-4 w-4" /> P95 延迟</div><div className="mt-2 text-2xl font-bold">{summary?.p95LatencyMs ?? 0} ms</div></SurfaceCard>
      </div>

      <SurfaceCard className="p-5">
        <h2 className="text-base font-semibold text-[var(--text-primary)]">Token 策略执行</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <label className="block xl:col-span-2">
            <span className="text-xs font-semibold text-[var(--text-secondary)]">Provider</span>
            <select className="control-input mt-1" value={policyForm.providerId} onChange={(event) => {
              const provider = providers.find((item) => item.id === event.target.value);
              setPolicyForm((prev) => ({ ...prev, providerId: event.target.value, model: provider?.modelName ?? prev.model }));
            }}>
              <option value="">工作区默认</option>
              {providers.map((provider) => <option key={provider.id} value={provider.id}>{provider.providerName}</option>)}
            </select>
          </label>
          <Input label="模型" value={policyForm.model} onChange={(event) => setPolicyForm((prev) => ({ ...prev, model: event.target.value }))} />
          <Input label="日配额" type="number" value={String(policyForm.dailyQuota)} onChange={(event) => setPolicyForm((prev) => ({ ...prev, dailyQuota: Number(event.target.value) }))} />
          <Input label="月配额" type="number" value={String(policyForm.monthlyQuota)} onChange={(event) => setPolicyForm((prev) => ({ ...prev, monthlyQuota: Number(event.target.value) }))} />
          <Input label="并发" type="number" value={String(policyForm.concurrencyLimit)} onChange={(event) => setPolicyForm((prev) => ({ ...prev, concurrencyLimit: Number(event.target.value) }))} />
          <Input label="冷却分钟" type="number" value={String(policyForm.cooldownMinutes)} onChange={(event) => setPolicyForm((prev) => ({ ...prev, cooldownMinutes: Number(event.target.value) }))} />
        </div>
        <div className="mt-3 flex justify-end">
          <Button onClick={savePolicy} icon={<Save className="h-4 w-4" />}>保存策略</Button>
        </div>
      </SurfaceCard>

      <SurfaceCard className="p-5">
        <h2 className="text-base font-semibold text-[var(--text-primary)]">Provider 配额、冷却和路由状态</h2>
        <div className="mt-4 overflow-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="text-xs uppercase text-[var(--text-muted)]"><tr><th className="py-2">Provider</th><th>日配额</th><th>月配额</th><th>并发</th><th>冷却</th><th>路由状态</th><th>原因</th></tr></thead>
            <tbody>
              {quotaRows.map(({ provider, dailyQuota, monthlyQuota, concurrency, cooldown }) => (
                <tr key={provider.id} className="border-t border-[var(--border)]">
                  <td className="py-3 font-semibold">{provider.providerName}</td>
                  <td>{evaluations[provider.id]?.dailyQuota || dailyQuota || '不限'} / 已用 {evaluations[provider.id]?.dailyTokens ?? 0}</td>
                  <td>{evaluations[provider.id]?.monthlyQuota || monthlyQuota || '不限'} / 已用 {evaluations[provider.id]?.monthlyTokens ?? 0}</td>
                  <td>{evaluations[provider.id]?.concurrencyLimit || concurrency}</td>
                  <td>{evaluations[provider.id]?.cooldownUntil ?? cooldown}</td>
                  <td><Badge>{provider.enabled === false ? '已禁用' : evaluations[provider.id]?.state ?? '可用'}</Badge></td>
                  <td className="max-w-[260px] text-xs text-[var(--text-secondary)]">{evaluations[provider.id]?.reason ?? '尚未评估。'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {quotaRows.length === 0 && <EmptyState icon={Database} title="暂无配额策略" description="配置 Provider 后，这里会显示配额和路由状态。" />}
      </SurfaceCard>

      <SurfaceCard className="p-5">
        <h2 className="text-base font-semibold text-[var(--text-primary)]">已保存策略</h2>
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          {policies.map((policy) => (
            <div key={policy.id} className="rounded-tool border border-[var(--border)] bg-[var(--surface-muted)] p-3 text-sm">
              <div className="flex items-center gap-2"><Badge>{policy.enabled ? '已启用' : '已禁用'}</Badge><span className="font-semibold">{policy.providerId ?? '工作区'} / {policy.model ?? '任意模型'}</span></div>
              <p className="mt-1 text-xs text-[var(--text-secondary)]">日配额 {policy.dailyQuota || '不限'}，月配额 {policy.monthlyQuota || '不限'}，并发 {policy.concurrencyLimit || '不限'}，冷却 {policy.cooldownMinutes} 分钟</p>
            </div>
          ))}
          {policies.length === 0 && <EmptyState icon={Database} title="暂无已保存策略" description="保存策略后，模型路由会执行配额、冷却和并发限制。" />}
        </div>
      </SurfaceCard>

      <SurfaceCard className="p-5">
        <h2 className="text-base font-semibold text-[var(--text-primary)]">最近用量</h2>
        <div className="mt-4 space-y-2">
          {records.map((record) => (
            <div key={record.id} className="grid gap-2 rounded-tool border border-[var(--border)] bg-[var(--surface-muted)] p-3 text-sm md:grid-cols-[1fr_120px_120px_120px]">
              <div><div className="font-semibold">{record.endpoint}</div><div className="text-xs text-[var(--text-muted)]">{record.providerName ?? '未分配'} / {record.model ?? '未知'}</div></div>
              <div>{record.totalTokens} Token</div>
              <div>{record.latencyMs} ms</div>
              <Badge>{record.success ? '成功' : record.failureCategory}</Badge>
            </div>
          ))}
          {records.length === 0 && <EmptyState icon={Database} title="暂无用量记录" description="Gateway、Workflow 和 Skill 运行后会在这里记录用量。" />}
        </div>
      </SurfaceCard>
    </div>
  );
}
