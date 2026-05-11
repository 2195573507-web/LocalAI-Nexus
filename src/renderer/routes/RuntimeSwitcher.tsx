import React from 'react';
import { Copy, Download, RefreshCw, Terminal } from 'lucide-react';
import { Badge, Button, EmptyState, SurfaceCard } from '../components';
import { api } from '../lib/api';
import type { NexusRuntimeProfile } from '../lib/types';
import { copyToClipboard } from '../lib/utils';

export default function RuntimeSwitcher() {
  const [profiles, setProfiles] = React.useState<NexusRuntimeProfile[]>([]);
  const [selected, setSelected] = React.useState<NexusRuntimeProfile | null>(null);
  const [message, setMessage] = React.useState('');

  const load = React.useCallback(async () => {
    const result = await api.runtimeProfiles.generate();
    const list = Array.isArray(result) ? result : [];
    setProfiles(list);
    setSelected((current) => current ?? list[0] ?? null);
  }, []);

  React.useEffect(() => { void load(); }, [load]);

  const exportProfile = async (profile: NexusRuntimeProfile) => {
    await api.export.json(profile, `localai-nexus-${profile.kind}-profile.json`);
    setMessage(`已导出 ${profile.name}`);
  };

  return (
    <div className="mx-auto max-w-7xl space-y-5 p-6">
      <section className="surface-card p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div><h1 className="text-2xl font-bold">Runtime 切换器</h1><p className="mt-2 text-sm text-[var(--text-secondary)]">为 Codex、Claude Code、Continue 风格 CLI 和自定义 OpenAI 兼容客户端生成脱敏 Runtime 配置。</p></div>
          <Button variant="secondary" onClick={load} icon={<RefreshCw className="h-4 w-4" />}>重新生成</Button>
        </div>
      </section>
      {message && <div className="rounded-tool border border-accent-500/30 bg-accent-500/10 p-3 text-sm text-[var(--accent)]">{message}</div>}
      <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <div className="space-y-2">
          {profiles.map((profile) => <button key={profile.id} className={`w-full rounded-tool border p-3 text-left ${selected?.id === profile.id ? 'border-accent-500 bg-accent-500/10' : 'border-[var(--border)] bg-[var(--surface)]'}`} onClick={() => setSelected(profile)}><div className="font-semibold">{profile.name}</div><div className="mt-1 text-xs text-[var(--text-muted)]">{profile.baseUrl}</div></button>)}
          {profiles.length === 0 && <EmptyState icon={Terminal} title="暂无 Runtime 配置" description="配置或启动 Gateway 后，再重新生成 Runtime 配置。" />}
        </div>
        {selected && (
          <SurfaceCard className="p-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between"><div><h2 className="text-lg font-semibold">{selected.name}</h2><div className="mt-2 flex flex-wrap gap-2"><Badge>{selected.kind}</Badge><Badge>{selected.redaction}</Badge><Badge>{selected.model}</Badge></div></div><div className="flex gap-2"><Button size="sm" variant="secondary" onClick={() => void copyToClipboard(selected.command)} icon={<Copy className="h-4 w-4" />}>复制命令</Button><Button size="sm" onClick={() => void exportProfile(selected)} icon={<Download className="h-4 w-4" />}>导出</Button></div></div>
            <div className="mt-5 grid gap-4 xl:grid-cols-2">
              <pre className="max-h-80 overflow-auto rounded-tool bg-black/80 p-4 text-xs text-white">{selected.toml}</pre>
              <pre className="max-h-80 overflow-auto rounded-tool bg-black/80 p-4 text-xs text-white">{selected.yaml}</pre>
            </div>
            <div className="mt-4 rounded-tool border border-[var(--border)] bg-[var(--surface-muted)] p-3 text-sm"><div className="font-semibold">诊断</div>{selected.diagnostics.map((item) => <p key={item} className="mt-1 text-xs text-[var(--text-secondary)]">{item}</p>)}</div>
          </SurfaceCard>
        )}
      </div>
    </div>
  );
}
