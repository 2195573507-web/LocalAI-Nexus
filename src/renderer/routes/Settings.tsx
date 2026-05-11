import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Check,
  Cpu,
  Database,
  Download,
  Eye,
  EyeOff,
  Globe,
  HardDrive,
  Key,
  Plus,
  Puzzle,
  RefreshCw,
  Server,
  Settings2,
  Shield,
  SlidersHorizontal,
  Trash2,
  Upload,
} from 'lucide-react';
import { api } from '../lib/api';
import { Badge, Button, EmptyState, SurfaceCard, Input, Modal } from '../components/';
import type {
  AppSettings,
  Language,
  MemoryInjectionMode,
  ProviderPreset,
  ProviderSetting,
  SkillRegistryEntry,
  ThemeMode,
} from '../lib/types';
import { PROVIDER_PRESETS, presetToProvider } from '../../shared/providerPresets';
import { classNames, generateId } from '../lib/utils';
import { useI18n } from '../lib/i18n';
import { useThemePreference } from '../lib/theme';

const MASKED_API_KEY_PREFIX = 'Saved key ending in ';

function isMaskedApiKey(value: string): boolean {
  return value === '' || value === '[REDACTED]' || value.startsWith(MASKED_API_KEY_PREFIX);
}

const DEFAULT_SETTINGS: AppSettings = {
  theme: 'system',
  language: 'zh',
  defaultProjectPath: '',
  defaultAITool: 'Claude Code',
  dataPath: '',
  appVersion: '1.1.1',
};

const emptyProviderForm = {
  providerName: '',
  baseUrl: '',
  apiKey: '',
  modelName: '',
  enabled: true,
  memoryEnabled: true,
  memoryInjectionMode: 'balanced' as MemoryInjectionMode,
  maxMemoryItems: 10,
  maxMemoryChars: 8000,
};

export default function Settings() {
  const { language, setLanguage, t } = useI18n();
  const { theme, setTheme } = useThemePreference();
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [providers, setProviders] = useState<ProviderSetting[]>([]);
  const [presets, setPresets] = useState<ProviderPreset[]>(PROVIDER_PRESETS);
  const [active, setActive] = useState({ providerRef: '', model: '', agentDefaultProviderRef: '' });
  const [mcpAllowlist, setMcpAllowlist] = useState<Array<Record<string, unknown>>>([]);
  const [skillsRegistry, setSkillsRegistry] = useState<SkillRegistryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [showProviderModal, setShowProviderModal] = useState(false);
  const [editingProvider, setEditingProvider] = useState<ProviderSetting | null>(null);
  const [selectedPresetId, setSelectedPresetId] = useState('openai-compatible');
  const [showApiKey, setShowApiKey] = useState(false);
  const [providerForm, setProviderForm] = useState(emptyProviderForm);
  const [importText, setImportText] = useState('');
  const [importPreview, setImportPreview] = useState<unknown>(null);
  const [exportManifest, setExportManifest] = useState<string>('');

  const activeProvider = useMemo(
    () => providers.find((provider) => provider.id === active.providerRef),
    [active.providerRef, providers],
  );

  const resetProviderForm = useCallback((presetId = selectedPresetId) => {
    const preset = presets.find((item) => item.providerId === presetId) ?? presets[0];
    const base = preset ? presetToProvider(preset) : null;
    setProviderForm({
      ...emptyProviderForm,
      providerName: base?.providerName ?? '',
      baseUrl: base?.baseUrl ?? '',
      modelName: base?.modelName ?? '',
      memoryInjectionMode: 'balanced',
    });
    setSelectedPresetId(presetId);
    setShowApiKey(false);
  }, [presets, selectedPresetId]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [settingsResult, providerList, presetList, activeConfig, mcpEntries, registry] = await Promise.all([
        api.settings.getAll(),
        api.providers.list(),
        api.providers.presets(),
        api.providers.getActive(),
        api.mcp.allowlist().catch(() => []),
        api.skills.registry().catch(() => []),
      ]);
      setSettings({ ...DEFAULT_SETTINGS, ...settingsResult });
      setProviders(Array.isArray(providerList) ? providerList : []);
      if (Array.isArray(presetList) && presetList.length > 0) setPresets(presetList);
      if (!('error' in activeConfig)) {
        setActive({
          providerRef: activeConfig.providerRef,
          model: activeConfig.model,
          agentDefaultProviderRef: activeConfig.agentDefaultProviderRef ?? '',
        });
      }
      if (Array.isArray(mcpEntries)) setMcpAllowlist(mcpEntries as Array<Record<string, unknown>>);
      if (Array.isArray(registry)) setSkillsRegistry(registry);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const saveSettings = async () => {
    setSaving(true);
    try {
      await api.settings.update({ ...settings, theme, language });
      setMessage(t('settings.saved'));
    } finally {
      setSaving(false);
      window.setTimeout(() => setMessage(null), 2200);
    }
  };

  const saveProvider = async () => {
    if (!providerForm.providerName.trim() || !providerForm.modelName.trim()) return;
    const preset = presets.find((item) => item.providerId === selectedPresetId) ?? presets[0];
    const payload = {
      ...(preset ? presetToProvider(preset, providerForm) : {}),
      ...providerForm,
      providerId: preset?.providerId ?? selectedPresetId,
      id: editingProvider?.id ?? generateId(),
    } as ProviderSetting;
    const saved = editingProvider
      ? await api.providers.update(editingProvider.id, payload)
      : await api.providers.create(payload);
    if (saved && typeof saved === 'object' && 'error' in saved) {
      setMessage(t('settings.providerSaveFailed', { error: String(saved.error) }));
      return;
    }
    setShowProviderModal(false);
    setEditingProvider(null);
    resetProviderForm();
    await load();
  };

  const editProvider = (provider: ProviderSetting) => {
    setEditingProvider(provider);
    setSelectedPresetId(provider.providerId ?? 'custom-provider');
    setProviderForm({
      providerName: provider.providerName,
      baseUrl: provider.baseUrl,
      apiKey: isMaskedApiKey(provider.apiKey) ? '' : provider.apiKey,
      modelName: provider.modelName,
      enabled: provider.enabled,
      memoryEnabled: provider.memoryEnabled,
      memoryInjectionMode: provider.memoryInjectionMode,
      maxMemoryItems: provider.maxMemoryItems,
      maxMemoryChars: provider.maxMemoryChars,
    });
    setShowProviderModal(true);
  };

  const testProvider = async (provider: ProviderSetting) => {
    const result = await api.providers.testConnection(provider.id);
    setMessage('error' in result ? `${t('settings.providerTestFailed')}：${result.error}` : `${result.ok ? t('settings.providerTestPassed') : t('settings.providerTestFailed')}：${result.message}`);
    await load();
  };

  const switchProvider = async (provider: ProviderSetting) => {
    const result = await api.providers.setActive({ providerRef: provider.id, model: provider.modelName, scope: 'workspace' });
    if ('error' in result) {
      setMessage(result.error === 'provider_secret_missing' ? t('settings.providerSecretMissing') : t('settings.providerSwitchFailed', { error: result.error }));
      return;
    }
    setActive({ providerRef: result.providerRef, model: result.model, agentDefaultProviderRef: result.providerRef });
    setMessage(t('settings.providerSwitched', { provider: provider.providerName, model: provider.modelName }));
  };

  const exportConfig = async () => {
    const bundle = await api.config.exportAll();
    if (bundle && typeof bundle === 'object' && 'error' in bundle) {
      setMessage(t('settings.exportFailed', { error: bundle.error }));
      return;
    }
    await api.export.json(bundle, `localai-nexus-config-${Date.now()}.json`);
    setExportManifest(JSON.stringify((bundle as { manifest?: unknown }).manifest ?? {}, null, 2));
  };

  const previewImport = async () => {
    const preview = await api.config.importPreview(importText);
    setImportPreview(preview);
  };

  const applyImport = async () => {
    const result = await api.config.importApply(importText);
    setImportPreview(result);
    await load();
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-6 animate-pulse">
        <div className="h-10 w-40 rounded-lg bg-[var(--surface-muted)]" />
        <div className="h-52 rounded-lg bg-[var(--surface-muted)]" />
        <div className="h-52 rounded-lg bg-[var(--surface-muted)]" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-[var(--text-primary)] dark:text-[var(--text-primary)]">{t('settings.title')}</h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
          {t('settings.subtitle')}
        </p>
      </div>

      {message && (
        <div className="rounded-lg border border-blue-400/30 bg-blue-500/10 px-4 py-3 text-sm text-blue-700 dark:text-blue-200">
          {message}
        </div>
      )}

      <SurfaceCard className="p-6 space-y-5">
        <h2 className="flex items-center gap-2 text-base font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]">
          <Settings2 className="h-5 w-5 text-blue-500" /> {t('settings.general')}
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-1.5 text-xs font-medium text-[var(--text-muted)] dark:text-[var(--text-muted)]">
            {t('settings.theme')}
            <select value={theme} onChange={(event) => setTheme(event.target.value as ThemeMode)} className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)] dark:text-[var(--text-primary)]">
              <option value="system">{t('theme.system')}</option>
              <option value="light">{t('theme.light')}</option>
              <option value="dark">{t('theme.dark')}</option>
            </select>
          </label>
          <label className="space-y-1.5 text-xs font-medium text-[var(--text-muted)] dark:text-[var(--text-muted)]">
            {t('settings.language')}
            <select value={language} onChange={(event) => setLanguage(event.target.value as Language)} className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)] dark:text-[var(--text-primary)]">
              <option value="zh">中文</option>
              <option value="en">English</option>
            </select>
          </label>
          <label className="space-y-1.5 text-xs font-medium text-[var(--text-muted)] dark:text-[var(--text-muted)]">
            {t('settings.defaultProjectPath')}
            <Input value={settings.defaultProjectPath} onChange={(event) => setSettings((prev) => ({ ...prev, defaultProjectPath: event.target.value }))} />
          </label>
          <label className="space-y-1.5 text-xs font-medium text-[var(--text-muted)] dark:text-[var(--text-muted)]">
            {t('settings.dataPath')}
            <Input value={settings.dataPath} readOnly className="font-mono opacity-70" />
          </label>
          <label className="space-y-1.5 text-xs font-medium text-[var(--text-muted)] dark:text-[var(--text-muted)]">
            {t('settings.version')}
            <Input value={settings.appVersion ?? settings.version ?? ''} readOnly className="font-mono tabular-nums opacity-70" />
          </label>
        </div>
        <Button onClick={saveSettings} loading={saving} icon={<Check className="h-4 w-4" />}>{t('settings.saveSettings')}</Button>
      </SurfaceCard>

      <SurfaceCard className="p-6 space-y-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-base font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]">
              <SlidersHorizontal className="h-5 w-5 text-purple-500" /> {t('settings.currentModel')}
            </h2>
            <p className="mt-1 text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
              {t('settings.current', { value: activeProvider ? `${activeProvider.providerName} / ${active.model || activeProvider.modelName}` : t('settings.noProvider') })}
            </p>
          </div>
          <Button onClick={() => { setEditingProvider(null); resetProviderForm(); setShowProviderModal(true); }} icon={<Plus className="h-4 w-4" />}>
            {t('settings.addProvider')}
          </Button>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {providers.map((provider) => (
            <div key={provider.id} className="rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]">{provider.providerName}</h3>
                    {active.providerRef === provider.id && <Badge className="border-emerald-500/30 bg-emerald-500/15 text-emerald-500">{t('settings.providerCurrent')}</Badge>}
                    {provider.lastTestStatus === 'failure' && <Badge className="border-red-500/30 bg-red-500/15 text-red-400">{t('settings.providerTestFailed')}</Badge>}
                    {provider.apiKey === '' && provider.needsApiKey !== false && <Badge className="border-amber-500/30 bg-amber-500/15 text-amber-500">{t('settings.missingKey')}</Badge>}
                  </div>
                  <p className="mt-2 flex items-center gap-1 truncate text-xs text-[var(--text-muted)] dark:text-[var(--text-muted)]">
                    <Globe className="h-3 w-3" /> <span className="font-mono">{provider.baseUrl}</span>
                  </p>
                  <p className="mt-1 flex items-center gap-1 text-xs text-[var(--text-muted)] dark:text-[var(--text-muted)]">
                    <Cpu className="h-3 w-3" /> <span>{provider.modelName}</span>
                  </p>
                  {provider.lastTestMessage && <p className="mt-2 text-xs text-[var(--text-muted)] dark:text-[var(--text-muted)]">{provider.lastTestMessage}</p>}
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button size="sm" variant="ghost" onClick={() => void switchProvider(provider)}>{t('settings.switchProvider')}</Button>
                <Button size="sm" variant="ghost" onClick={() => void testProvider(provider)}>{t('settings.testConnection')}</Button>
                <Button size="sm" variant="ghost" onClick={() => editProvider(provider)}>{t('common.edit')}</Button>
                <Button size="sm" variant="ghost" onClick={() => void api.providers.delete(provider.id).then(load)} className="text-red-500">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
        {providers.length === 0 && (
          <EmptyState icon={Server} title={t('settings.noProviders')} description={t('settings.noProvidersBody')} actionLabel={t('settings.addProviderTitle')} onAction={() => setShowProviderModal(true)} />
        )}
      </SurfaceCard>

      <SurfaceCard className="p-6 space-y-5">
        <h2 className="flex items-center gap-2 text-base font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]">
          <Server className="h-5 w-5 text-purple-500" /> {t('settings.providerPresetCenter')}
        </h2>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {presets.map((preset) => (
            <button
              key={preset.providerId}
              type="button"
              onClick={() => { setEditingProvider(null); resetProviderForm(preset.providerId); setShowProviderModal(true); }}
              className="rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] p-4 text-left transition-colors hover:bg-[var(--surface-muted)]"
            >
              <div className="font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]">{preset.displayName}</div>
              <div className="mt-2 text-xs text-[var(--text-muted)] dark:text-[var(--text-muted)]">{preset.docsHint}</div>
              <div className="mt-3 flex flex-wrap gap-1">
                {preset.needsApiKey ? <Badge>API Key</Badge> : <Badge>{t('settings.localNoKey')}</Badge>}
                {preset.supportsStreaming && <Badge>Streaming</Badge>}
                {preset.supportsVision && <Badge>Vision</Badge>}
              </div>
            </button>
          ))}
        </div>
      </SurfaceCard>

      <SurfaceCard className="p-6 space-y-5">
        <h2 className="flex items-center gap-2 text-base font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]">
          <Shield className="h-5 w-5 text-emerald-500" /> {t('settings.mcpSkills')}
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] p-4">
            <h3 className="font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]">{t('settings.mcpAllowlist')}</h3>
            <p className="mt-1 text-xs text-[var(--text-muted)] dark:text-[var(--text-muted)]">{t('settings.mcpAllowlistBody')}</p>
            <div className="mt-3 space-y-2">
              {mcpAllowlist.slice(0, 5).map((entry) => (
                <div key={String(entry.id)} className="flex items-center justify-between rounded-lg bg-[var(--surface-muted)] px-3 py-2 text-xs dark:bg-[var(--surface-muted)]">
                  <span className="font-mono">{String(entry.serverName)}:{String(entry.toolName)}</span>
                  <Badge>{entry.enabled ? t('common.enabled') : t('common.disabled')}</Badge>
                </div>
              ))}
              {mcpAllowlist.length === 0 && <p className="text-sm text-[var(--text-muted)] dark:text-[var(--text-muted)]">{t('settings.mcpEmpty')}</p>}
            </div>
          </div>
          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] p-4">
            <h3 className="flex items-center gap-2 font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]">
              <Puzzle className="h-4 w-4" /> {t('settings.skillsRegistry')}
            </h3>
            <p className="mt-1 text-xs text-[var(--text-muted)] dark:text-[var(--text-muted)]">{t('settings.skillsRegistryBody')}</p>
            <div className="mt-3 space-y-2">
              {skillsRegistry.map((skill) => (
                <div key={skill.id} className="flex items-center justify-between gap-2 rounded-lg bg-[var(--surface-muted)] px-3 py-2 text-xs dark:bg-[var(--surface-muted)]">
                  <span>{skill.name}</span>
                  <button
                    type="button"
                    className={classNames('rounded-md px-2 py-1', skill.enabled ? 'bg-emerald-500/15 text-emerald-500' : 'bg-[var(--surface-muted)] text-[var(--text-muted)]')}
                    onClick={() => void api.skills.toggleRegistry(skill.id, !skill.enabled).then(load)}
                  >
                    {skill.enabled ? t('common.enabled') : t('common.disabled')}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </SurfaceCard>

      <SurfaceCard className="p-6 space-y-5">
        <h2 className="flex items-center gap-2 text-base font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]">
          <HardDrive className="h-5 w-5 text-amber-500" /> {t('settings.importExport')}
        </h2>
        <p className="text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
          {t('settings.importExportBody')}
        </p>
        <div className="flex flex-wrap gap-3">
          <Button variant="ghost" onClick={exportConfig} icon={<Download className="h-4 w-4" />}>{t('settings.exportSafeConfig')}</Button>
          <Button variant="ghost" onClick={previewImport} icon={<AlertTriangle className="h-4 w-4" />}>{t('settings.previewImport')}</Button>
          <Button variant="ghost" onClick={applyImport} icon={<Upload className="h-4 w-4" />}>{t('settings.applyImport')}</Button>
        </div>
        <textarea
          value={importText}
          onChange={(event) => setImportText(event.target.value)}
          placeholder={t('settings.importPlaceholder')}
          className="min-h-[120px] w-full rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] p-3 font-mono text-sm text-[var(--text-primary)] dark:text-[var(--text-primary)]"
        />
        {(exportManifest || importPreview !== null) && (
          <pre className="max-h-56 overflow-auto rounded-lg bg-black/80 p-3 text-xs text-[var(--text-primary)]">
            {exportManifest || JSON.stringify(importPreview, null, 2)}
          </pre>
        )}
      </SurfaceCard>

      <Modal
        open={showProviderModal}
        onClose={() => { setShowProviderModal(false); setEditingProvider(null); resetProviderForm(); }}
        title={editingProvider ? t('settings.editProviderTitle') : t('settings.addProviderTitle')}
        size="lg"
      >
        <div className="space-y-4">
          {!editingProvider && (
            <label className="block text-xs font-medium text-[var(--text-muted)]">
              {t('settings.providerPreset')}
              <select
                value={selectedPresetId}
                onChange={(event) => resetProviderForm(event.target.value)}
                className="mt-1.5 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2 text-sm text-[var(--text-primary)]"
              >
                {presets.map((preset) => <option key={preset.providerId} value={preset.providerId} className="bg-[var(--surface)]">{preset.displayName}</option>)}
              </select>
            </label>
          )}
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block text-xs font-medium text-[var(--text-muted)]">{t('settings.name')}<Input value={providerForm.providerName} onChange={(event) => setProviderForm((prev) => ({ ...prev, providerName: event.target.value }))} /></label>
            <label className="block text-xs font-medium text-[var(--text-muted)]">{t('settings.model')}<Input value={providerForm.modelName} onChange={(event) => setProviderForm((prev) => ({ ...prev, modelName: event.target.value }))} /></label>
          </div>
          <label className="block text-xs font-medium text-[var(--text-muted)]">Base URL<Input value={providerForm.baseUrl} onChange={(event) => setProviderForm((prev) => ({ ...prev, baseUrl: event.target.value }))} className="font-mono" /></label>
          <label className="block text-xs font-medium text-[var(--text-muted)]">
            {t('settings.apiKey')}
            <div className="relative mt-1.5">
              <Input type={showApiKey ? 'text' : 'password'} value={providerForm.apiKey} onChange={(event) => setProviderForm((prev) => ({ ...prev, apiKey: event.target.value }))} placeholder={t('settings.apiKeyPlaceholder')} className="font-mono pr-10" />
              <button type="button" onClick={() => setShowApiKey((value) => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">
                {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </label>
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]"><input type="checkbox" checked={providerForm.enabled} onChange={(event) => setProviderForm((prev) => ({ ...prev, enabled: event.target.checked }))} /> {t('settings.enabled')}</label>
            <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]"><input type="checkbox" checked={providerForm.memoryEnabled} onChange={(event) => setProviderForm((prev) => ({ ...prev, memoryEnabled: event.target.checked }))} /> {t('settings.memoryInjection')}</label>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3 border-t border-[var(--border)] pt-4">
          <Button variant="ghost" onClick={() => setShowProviderModal(false)}>{t('common.cancel')}</Button>
          <Button onClick={saveProvider} icon={<Key className="h-4 w-4" />}>{t('settings.saveProvider')}</Button>
        </div>
      </Modal>
    </div>
  );
}
