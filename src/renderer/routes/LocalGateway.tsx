import React from 'react';
import {
  Copy,
  KeyRound,
  PlayCircle,
  Power,
  RefreshCw,
  RotateCcw,
  Server,
  ShieldCheck,
  Square,
  Trash2,
  Upload,
} from 'lucide-react';
import { Badge, Button, Input, SurfaceCard } from '../components';
import { api } from '../lib/api';
import type { NexusGatewayApiKey, NexusGatewayStatus, NexusUsageRecord } from '../lib/types';
import { copyToClipboard } from '../lib/utils';

function hasError<T>(value: T | { error: string }): value is { error: string } {
  return Boolean(value && typeof value === 'object' && 'error' in value);
}

export default function LocalGateway() {
  const [status, setStatus] = React.useState<NexusGatewayStatus | null>(null);
  const [requests, setRequests] = React.useState<NexusUsageRecord[]>([]);
  const [keys, setKeys] = React.useState<NexusGatewayApiKey[]>([]);
  const [newKeyName, setNewKeyName] = React.useState('LocalAI Nexus Gateway Key');
  const [copyOnceKey, setCopyOnceKey] = React.useState('');
  const [envExport, setEnvExport] = React.useState<Record<string, unknown> | null>(null);
  const [configImportText, setConfigImportText] = React.useState('');
  const [configImportResult, setConfigImportResult] = React.useState<unknown>(null);
  const [message, setMessage] = React.useState('');

  const load = React.useCallback(async () => {
    const [gatewayResult, usageResult, keyResult] = await Promise.all([
      api.gateway.status().catch(() => null),
      api.usage.list({ limit: 30 }).catch(() => []),
      api.gateway.keys().catch(() => []),
    ]);
    if (gatewayResult && typeof gatewayResult === 'object' && !('error' in gatewayResult)) {
      setStatus(gatewayResult);
    }
    setRequests(
      Array.isArray(usageResult)
        ? usageResult.filter((item) => item.endpoint.startsWith('/v1') || item.endpoint === '/responses')
        : [],
    );
    setKeys(Array.isArray(keyResult) ? keyResult : []);
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const start = async () => {
    const result = await api.gateway.start();
    setMessage(hasError(result) ? result.error : 'Gateway 已启动。');
    await load();
  };

  const stop = async () => {
    const result = await api.gateway.stop();
    setMessage(hasError(result) ? result.error : 'Gateway 已停止。');
    await load();
  };

  const createKey = async () => {
    const result = await api.gateway.createKey({ name: newKeyName });
    if (hasError(result)) {
      setMessage(result.error);
      return;
    }
    setCopyOnceKey(result.rawKey);
    setMessage('Gateway API Key 已创建，原始密钥只显示一次。');
    const exported = await api.gateway.exportEnv(result.rawKey);
    setEnvExport(exported && typeof exported === 'object' ? (exported as Record<string, unknown>) : null);
    await load();
  };

  const resetKey = async (id: string) => {
    const result = await api.gateway.resetKey(id);
    if (hasError(result)) {
      setMessage(result.error);
      return;
    }
    setCopyOnceKey(result.rawKey);
    setMessage('Gateway API Key 已重置，旧密钥立即失效。');
    await load();
  };

  const disableKey = async (id: string) => {
    const result = await api.gateway.disableKey(id);
    setMessage(hasError(result) ? result.error : 'Gateway API Key 已停用。');
    await load();
  };

  const deleteKey = async (id: string) => {
    const result = await api.gateway.deleteKey(id);
    setMessage(hasError(result) ? result.error : 'Gateway API Key 已删除。');
    await load();
  };

  const previewGatewayImport = async () => {
    const result = await api.gateway.importPreview(configImportText);
    setConfigImportResult(result);
    setMessage(hasError(result) ? result.error : 'Gateway 配置导入预览已生成，包含 preview、merge、backup、audit 计划。');
  };

  const applyGatewayImport = async () => {
    const result = await api.gateway.importApply(configImportText);
    setConfigImportResult(result);
    setMessage(hasError(result) ? result.error : 'Gateway 配置导入记录已合并，本流程不写入外部 Codex/Claude Code 配置。');
    await load();
  };

  return (
    <div className="mx-auto max-w-7xl space-y-5 p-6">
      <section className="surface-card p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">本地 Gateway</h1>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              OpenAI 兼容入口、Provider 路由、trace 和本地 API Key 控制面。
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={load} icon={<RefreshCw className="h-4 w-4" />}>刷新</Button>
            {status?.online ? (
              <Button variant="secondary" onClick={stop} icon={<Square className="h-4 w-4" />}>停止</Button>
            ) : (
              <Button onClick={start} icon={<PlayCircle className="h-4 w-4" />}>启动</Button>
            )}
          </div>
        </div>
      </section>

      {message && (
        <div className="rounded-tool border border-accent-500/30 bg-accent-500/10 p-3 text-sm text-[var(--accent)]">
          {message}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <SurfaceCard className="p-5">
          <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]"><Power className="h-4 w-4" /> 状态</div>
          <div className="mt-2 text-xl font-bold">{status?.online ? '在线' : '离线'}</div>
          <Badge>{status?.providerCount ?? 0} 个 Provider</Badge>
        </SurfaceCard>
        <SurfaceCard className="p-5">
          <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]"><Server className="h-4 w-4" /> Root URL</div>
          <button className="mt-2 font-mono text-sm" onClick={() => void copyToClipboard(status?.defaultBaseUrlHint ?? 'http://127.0.0.1:8317')}>
            {status?.defaultBaseUrlHint ?? 'http://127.0.0.1:8317'}
          </button>
        </SurfaceCard>
        <SurfaceCard className="p-5">
          <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]"><Copy className="h-4 w-4" /> /v1 URL</div>
          <button className="mt-2 font-mono text-sm" onClick={() => void copyToClipboard(status?.v1BaseUrlHint ?? 'http://127.0.0.1:8317/v1')}>
            {status?.v1BaseUrlHint ?? 'http://127.0.0.1:8317/v1'}
          </button>
        </SurfaceCard>
      </div>

      <SurfaceCard className="p-5">
        <h2 className="text-base font-semibold">支持端点</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {['GET /health', 'GET /v1/models', 'POST /v1/chat/completions', 'POST /v1/responses', 'POST /responses', 'POST /v1/messages', 'POST /v1/embeddings'].map((item) => (
            <Badge key={item}>{item}</Badge>
          ))}
        </div>
        {status?.lastTraceId && (
          <p className="mt-4 text-sm text-[var(--text-secondary)]">
            最近 trace: <span className="font-mono">{status.lastTraceId}</span> / {status.lastRouteReason}
          </p>
        )}
      </SurfaceCard>

      <SurfaceCard className="p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-base font-semibold">
              <KeyRound className="h-4 w-4" /> Gateway API Key
            </h2>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">密钥只保存 hash，列表只显示脱敏值。</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              value={newKeyName}
              onChange={(event) => setNewKeyName(event.target.value)}
              aria-label="Gateway API Key 名称"
              wrapperClassName="min-w-[260px]"
            />
            <Button onClick={createKey} icon={<KeyRound className="h-4 w-4" />}>创建 Key</Button>
          </div>
        </div>

        {copyOnceKey && (
          <div className="mt-4 rounded-tool border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
            <div className="font-semibold text-amber-700 dark:text-amber-300">只显示一次</div>
            <button className="mt-2 break-all font-mono text-xs" onClick={() => void copyToClipboard(copyOnceKey)}>
              {copyOnceKey}
            </button>
          </div>
        )}

        <div className="mt-4 space-y-2">
          {keys.map((key) => (
            <div key={key.id} className="flex flex-col gap-3 rounded-tool border border-[var(--border)] bg-[var(--surface-muted)] p-3 text-sm md:flex-row md:items-center md:justify-between">
              <div>
                <div className="font-semibold">{key.name}</div>
                <div className="mt-1 font-mono text-xs text-[var(--text-muted)]">
                  {key.maskedKey} / {key.status} / {key.endpointWhitelist.join(', ')}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="secondary" onClick={() => void copyToClipboard(key.maskedKey)} icon={<Copy className="h-4 w-4" />}>复制</Button>
                <Button size="sm" variant="secondary" onClick={() => void resetKey(key.id)} icon={<RotateCcw className="h-4 w-4" />}>重置</Button>
                <Button size="sm" variant="secondary" onClick={() => void disableKey(key.id)}>停用</Button>
                <Button size="sm" variant="danger" onClick={() => void deleteKey(key.id)} icon={<Trash2 className="h-4 w-4" />}>删除</Button>
              </div>
            </div>
          ))}
          {keys.length === 0 && (
            <div className="rounded-tool border border-[var(--border)] bg-[var(--surface-muted)] p-3 text-sm text-[var(--text-secondary)]">
              尚未创建 Gateway Key；当前为诊断开放模式。
            </div>
          )}
        </div>

        {envExport && (
          <pre className="mt-4 max-h-48 overflow-auto rounded-tool bg-black/80 p-4 text-xs text-white">
            {JSON.stringify(envExport, null, 2)}
          </pre>
        )}
      </SurfaceCard>

      <SurfaceCard className="p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-base font-semibold">
              <ShieldCheck className="h-4 w-4" /> Gateway 配置导入 / 导出
            </h2>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              支持 ccs、sub2api、cc-switch、claude-code、codex 和 openai-env 片段的脱敏预览；应用时只合并本地导入记录并保留 backup/audit 证据。
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={previewGatewayImport} icon={<ShieldCheck className="h-4 w-4" />}>预览导入</Button>
            <Button onClick={applyGatewayImport} icon={<Upload className="h-4 w-4" />}>合并记录</Button>
          </div>
        </div>
        <textarea
          value={configImportText}
          onChange={(event) => setConfigImportText(event.target.value)}
          placeholder="粘贴 ccs/sub2api/cc-switch/Codex/Claude Code/OpenAI env JSON 或环境变量片段，系统会先生成 preview、merge、backup、audit 计划。"
          className="mt-4 min-h-[120px] w-full rounded-tool border border-[var(--border)] bg-[var(--surface-muted)] p-3 font-mono text-xs text-[var(--text-primary)]"
        />
        {configImportResult !== null && (
          <pre className="mt-4 max-h-56 overflow-auto rounded-tool bg-black/80 p-4 text-xs text-white">
            {JSON.stringify(configImportResult, null, 2)}
          </pre>
        )}
      </SurfaceCard>

      <SurfaceCard className="p-5">
        <h2 className="text-base font-semibold">Gateway 请求用量</h2>
        <div className="mt-4 space-y-2">
          {requests.map((request) => (
            <div key={request.id} className="rounded-tool border border-[var(--border)] bg-[var(--surface-muted)] p-3 text-sm">
              <div className="font-semibold">{request.endpoint}</div>
              <div className="text-xs text-[var(--text-muted)]">{request.requestId} / {request.failureCategory} / {request.latencyMs}ms</div>
            </div>
          ))}
          {requests.length === 0 && <div className="text-sm text-[var(--text-muted)]">暂无 Gateway 请求。</div>}
        </div>
      </SurfaceCard>
    </div>
  );
}
