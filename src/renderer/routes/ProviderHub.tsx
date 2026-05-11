import React from 'react';
import { Activity, Edit3, KeyRound, PauseCircle, Plus, RefreshCw, RotateCcw, Server, ShieldCheck, Trash2 } from 'lucide-react';
import { Badge, Button, EmptyState, Input, Modal, SurfaceCard } from '../components';
import { api } from '../lib/api';
import type { ProviderPreset, ProviderSetting } from '../lib/types';
import { PROVIDER_PRESETS, presetToProvider } from '../../shared/providerPresets';
import { generateId } from '../lib/utils';

const emptyProvider: Pick<ProviderSetting, 'providerName' | 'baseUrl' | 'apiKey' | 'modelName' | 'enabled' | 'memoryEnabled' | 'memoryInjectionMode' | 'maxMemoryItems' | 'maxMemoryChars'> = {
  providerName: '',
  baseUrl: '',
  apiKey: '',
  modelName: '',
  enabled: true,
  memoryEnabled: true,
  memoryInjectionMode: 'balanced' as const,
  maxMemoryItems: 10,
  maxMemoryChars: 8000,
};

export default function ProviderHub() {
  const [providers, setProviders] = React.useState<ProviderSetting[]>([]);
  const [presets, setPresets] = React.useState<ProviderPreset[]>(PROVIDER_PRESETS);
  const [active, setActive] = React.useState({ providerRef: '', model: '' });
  const [loading, setLoading] = React.useState(true);
  const [message, setMessage] = React.useState('');
  const [open, setOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState('');
  const [deleteTarget, setDeleteTarget] = React.useState<ProviderSetting | null>(null);
  const [disableTarget, setDisableTarget] = React.useState<ProviderSetting | null>(null);
  const [presetId, setPresetId] = React.useState('openai-compatible');
  const [form, setForm] = React.useState<Partial<ProviderSetting>>(emptyProvider);

  const load = React.useCallback(async () => {
    setLoading(true);
    const [providerList, presetList, activeResult] = await Promise.all([
      api.providers.list().catch(() => []),
      api.providers.presets().catch(() => []),
      api.providers.getActive().catch(() => ({ providerRef: '', model: '' })),
    ]);
    setProviders(Array.isArray(providerList) ? providerList : []);
    if (Array.isArray(presetList) && presetList.length) setPresets(presetList);
    if (!('error' in activeResult)) setActive(activeResult);
    setLoading(false);
  }, []);

  React.useEffect(() => { void load(); }, [load]);

  const resetFromPreset = (nextPresetId = presetId) => {
    const preset = presets.find((item) => item.providerId === nextPresetId) ?? presets[0];
    const base = preset ? presetToProvider(preset) : {};
    setPresetId(nextPresetId);
    setForm({ ...emptyProvider, ...base, apiKey: '' });
    setEditingId('');
  };

  const openEdit = (provider: ProviderSetting, rotateKey = false) => {
    setEditingId(provider.id);
    setPresetId(provider.providerId ?? 'custom');
    setForm({
      ...emptyProvider,
      ...provider,
      apiKey: rotateKey ? '' : provider.apiKey || '',
    });
    setOpen(true);
  };

  const save = async () => {
    const preset = presets.find((item) => item.providerId === presetId) ?? presets[0];
    const payload = {
      ...(preset ? presetToProvider(preset, form) : {}),
      ...form,
      providerId: preset?.providerId ?? presetId,
      id: editingId || generateId(),
    } as ProviderSetting;
    const saved = editingId ? await api.providers.update(editingId, payload) : await api.providers.create(payload);
    if (!saved) setMessage('Provider 保存失败。');
    else if ('error' in saved) setMessage(typeof saved.error === 'string' ? saved.error : 'Provider 保存失败。');
    else {
      setMessage(`${editingId ? '已更新' : '已保存'} ${saved.providerName}`);
      setOpen(false);
      setEditingId('');
      await load();
    }
  };

  const test = async (provider: ProviderSetting) => {
    const result = await api.providers.testConnection(provider.id);
    setMessage('error' in result ? String(result.error) : String(result.message ?? 'Provider 测试完成。'));
    await load();
  };

  const switchProvider = async (provider: ProviderSetting) => {
    const result = await api.providers.setActive({ providerRef: provider.id, model: provider.modelName, scope: 'workspace' });
    setMessage('error' in result ? result.error : `当前 Provider：${provider.providerName} / ${provider.modelName}`);
    await load();
  };

  const toggleEnabled = async (provider: ProviderSetting, enabled: boolean) => {
    const result = await api.providers.update(provider.id, { enabled });
    setMessage(!result ? 'Provider 更新失败。' : 'error' in result ? String(result.error) : `${provider.providerName} 已${enabled ? '启用' : '禁用'}。`);
    setDisableTarget(null);
    await load();
  };

  const removeProvider = async (provider: ProviderSetting) => {
    await api.providers.delete(provider.id);
    setMessage(`已删除 ${provider.providerName}。`);
    setDeleteTarget(null);
    await load();
  };

  if (loading) return <div className="mx-auto max-w-7xl p-6"><div className="surface-card p-6">正在加载 Provider 中心...</div></div>;

  return (
    <div className="mx-auto max-w-7xl space-y-5 p-6">
      <section className="surface-card p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">Provider 中心</h1>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">创建、测试、切换并审计 OpenAI 兼容、Anthropic 兼容、Gemini、Ollama 和自定义 Provider。明文密钥只留在主进程。</p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={load} icon={<RefreshCw className="h-4 w-4" />}>刷新</Button>
            <Button onClick={() => { resetFromPreset(); setOpen(true); }} icon={<Plus className="h-4 w-4" />}>添加 Provider</Button>
          </div>
        </div>
      </section>

      {message && <div className="rounded-tool border border-accent-500/30 bg-accent-500/10 p-3 text-sm text-[var(--accent)]">{message}</div>}

      {providers.length === 0 ? (
        <SurfaceCard className="p-8">
          <EmptyState icon={Server} title="暂无 Provider" description="添加本地 mock Provider 用于 CI 安全路由，或配置带脱敏凭据的兼容 Provider。" actionLabel="添加 Provider" onAction={() => setOpen(true)} />
        </SurfaceCard>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {providers.map((provider) => (
            <SurfaceCard key={provider.id} className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="truncate text-base font-semibold text-[var(--text-primary)]">{provider.providerName}</h2>
                  <p className="mt-1 truncate font-mono text-xs text-[var(--text-muted)]">{provider.baseUrl}</p>
                </div>
                {active.providerRef === provider.id && <Badge>当前</Badge>}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Badge>{provider.providerId ?? 'custom'}</Badge>
                <Badge>{provider.modelName}</Badge>
                <Badge>{provider.enabled === false ? '已禁用' : '已启用'}</Badge>
                <Badge>{provider.lastTestStatus ?? '未测试'}</Badge>
                {provider.supportsStreaming && <Badge>支持流式</Badge>}
              </div>
              <div className="mt-4 rounded-tool border border-[var(--border)] bg-[var(--surface-muted)] p-3 text-xs text-[var(--text-secondary)]">
                <div className="flex items-center gap-2"><ShieldCheck className="h-3.5 w-3.5" /> 密钥：{provider.apiKey || provider.needsApiKey === false ? '已脱敏或不需要' : '缺失'}</div>
                <div className="mt-1 flex items-center gap-2"><Activity className="h-3.5 w-3.5" /> {provider.lastTestMessage ?? '设为当前 Provider 前请先运行诊断。'}</div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button size="sm" variant="secondary" onClick={() => void test(provider)}>测试</Button>
                <Button size="sm" onClick={() => void switchProvider(provider)}>设为当前</Button>
                <Button size="sm" variant="ghost" onClick={() => openEdit(provider)} aria-label={`编辑 ${provider.providerName}`}>
                  <Edit3 className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => openEdit(provider, true)} aria-label={`Rotate key for ${provider.providerName}`}>
                  <RotateCcw className="h-4 w-4" />
                </Button>
                {provider.enabled === false ? (
                  <Button size="sm" variant="secondary" onClick={() => void toggleEnabled(provider, true)}>启用</Button>
                ) : (
                <Button size="sm" variant="ghost" onClick={() => setDisableTarget(provider)} aria-label={`禁用 ${provider.providerName}`}>
                    <PauseCircle className="h-4 w-4" />
                  </Button>
                )}
                <Button size="sm" variant="ghost" className="text-red-500" onClick={() => setDeleteTarget(provider)} aria-label={`删除 ${provider.providerName}`}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </SurfaceCard>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => { setOpen(false); setEditingId(''); }} title={editingId ? '编辑 Provider' : '添加 Provider'} size="lg">
        <div className="space-y-4">
          <label className="block text-xs font-semibold text-[var(--text-secondary)]">Preset</label>
          <select className="control-input" value={presetId} onChange={(event) => resetFromPreset(event.target.value)}>
            {presets.map((preset) => <option key={preset.providerId} value={preset.providerId}>{preset.displayName}</option>)}
            <option value="localai-mock">LocalAI Mock</option>
          </select>
          <div className="grid gap-3 md:grid-cols-2">
            <Input label="名称" value={form.providerName} onChange={(event) => setForm((prev) => ({ ...prev, providerName: event.target.value }))} />
            <Input label="模型" value={form.modelName} onChange={(event) => setForm((prev) => ({ ...prev, modelName: event.target.value }))} />
          </div>
          <Input label="Base URL" value={form.baseUrl} onChange={(event) => setForm((prev) => ({ ...prev, baseUrl: event.target.value }))} />
          <Input label={editingId ? 'API Key / 轮换凭据' : 'API Key'} type="password" icon={<KeyRound className="h-4 w-4" />} value={form.apiKey} onChange={(event) => setForm((prev) => ({ ...prev, apiKey: event.target.value }))} placeholder="受保护存储；保存后渲染进程只看到脱敏值。" />
          <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
            <input type="checkbox" checked={form.enabled !== false} onChange={(event) => setForm((prev) => ({ ...prev, enabled: event.target.checked }))} />
            启用路由
          </label>
        </div>
        <div className="mt-5 flex justify-end gap-2 border-t border-[var(--border)] pt-4">
          <Button variant="ghost" onClick={() => setOpen(false)}>取消</Button>
          <Button onClick={save}>{editingId ? '更新 Provider' : '保存 Provider'}</Button>
        </div>
      </Modal>

      <Modal open={!!disableTarget} onClose={() => setDisableTarget(null)} title="禁用 Provider" size="sm">
        <p className="text-sm text-[var(--text-secondary)]">禁用 {disableTarget?.providerName}？模型路由会跳过它，并记录审计事件。</p>
        <div className="mt-5 flex justify-end gap-2 border-t border-[var(--border)] pt-4">
          <Button variant="ghost" onClick={() => setDisableTarget(null)}>取消</Button>
          <Button variant="secondary" onClick={() => disableTarget && void toggleEnabled(disableTarget, false)}>禁用</Button>
        </div>
      </Modal>

      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="删除 Provider" size="sm">
        <p className="text-sm text-[var(--text-secondary)]">删除 {deleteTarget?.providerName}？Runtime 配置和历史 trace 会保留，但该 Provider 不再参与路由。</p>
        <div className="mt-5 flex justify-end gap-2 border-t border-[var(--border)] pt-4">
          <Button variant="ghost" onClick={() => setDeleteTarget(null)}>取消</Button>
          <Button variant="danger" onClick={() => deleteTarget && void removeProvider(deleteTarget)}>删除</Button>
        </div>
      </Modal>
    </div>
  );
}
