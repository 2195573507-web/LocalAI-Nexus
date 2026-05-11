import React from 'react';
import { PackageCheck, RefreshCw, ToggleLeft, ToggleRight } from 'lucide-react';
import { Badge, Button, EmptyState, SurfaceCard } from '../components';
import { api } from '../lib/api';
import type { NexusTemplateBundle } from '../lib/types';

export default function Ecosystem() {
  const [bundles, setBundles] = React.useState<NexusTemplateBundle[]>([]);
  const [loading, setLoading] = React.useState(true);

  const load = React.useCallback(async () => {
    setLoading(true);
    const result = await api.templateBundles.list().catch(() => []);
    setBundles(Array.isArray(result) ? result : []);
    setLoading(false);
  }, []);

  React.useEffect(() => { void load(); }, [load]);

  const toggle = async (bundle: NexusTemplateBundle) => {
    await api.templateBundles.toggle(bundle.id, !bundle.enabled);
    await load();
  };

  if (loading) return <div className="mx-auto max-w-7xl p-6"><div className="surface-card p-6">正在加载本地生态...</div></div>;

  return (
    <div className="mx-auto max-w-7xl space-y-5 p-6">
      <section className="surface-card p-6"><div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between"><div><h1 className="text-2xl font-bold">本地生态</h1><p className="mt-2 text-sm text-[var(--text-secondary)]">本地专用注册表，用于 Skills、模板包、Workflow 包、MCP/工具目录、验证、风险预览和迁移规则。</p></div><Button variant="secondary" onClick={load} icon={<RefreshCw className="h-4 w-4" />}>刷新</Button></div></section>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {bundles.map((bundle) => (
          <SurfaceCard key={bundle.id} className="p-5">
            <div className="flex items-start justify-between gap-3"><div><h2 className="font-semibold">{bundle.name}</h2><p className="mt-1 text-sm text-[var(--text-secondary)]">{bundle.description}</p></div><button aria-label={`Toggle ${bundle.name}`} onClick={() => void toggle(bundle)}>{bundle.enabled ? <ToggleRight className="h-5 w-5 text-emerald-500" /> : <ToggleLeft className="h-5 w-5" />}</button></div>
            <div className="mt-4 flex flex-wrap gap-2"><Badge>{bundle.type}</Badge><Badge>{bundle.riskLevel}</Badge><Badge>{bundle.localOnly ? '仅本地' : '已阻止'}</Badge><Badge>{bundle.version}</Badge></div>
            <div className="mt-4 space-y-2 text-xs text-[var(--text-secondary)]">{bundle.assumptions.map((item) => <p key={item}>- {item}</p>)}</div>
            <div className="mt-4 rounded-tool border border-[var(--border)] bg-[var(--surface-muted)] p-3 text-xs">{bundle.templates.length} 个模板 / 非法远程包会在安装前被拒绝。</div>
          </SurfaceCard>
        ))}
      </div>
      {bundles.length === 0 && <SurfaceCard className="p-8"><EmptyState icon={PackageCheck} title="暂无本地包" description="内置本地包会显示在这里。自定义导入必须仅本地可用并通过验证。" /></SurfaceCard>}
    </div>
  );
}
