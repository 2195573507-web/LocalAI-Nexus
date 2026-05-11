import React from 'react';
import { Copy, PlayCircle, Power, RefreshCw, Server, Square } from 'lucide-react';
import { Badge, Button, SurfaceCard } from '../components';
import { api } from '../lib/api';
import type { NexusGatewayStatus, NexusUsageRecord } from '../lib/types';
import { copyToClipboard } from '../lib/utils';

export default function LocalGateway() {
  const [status, setStatus] = React.useState<NexusGatewayStatus | null>(null);
  const [requests, setRequests] = React.useState<NexusUsageRecord[]>([]);
  const [message, setMessage] = React.useState('');

  const load = React.useCallback(async () => {
    const [gatewayResult, usageResult] = await Promise.all([
      api.gateway.status().catch(() => null),
      api.usage.list({ limit: 30 }).catch(() => []),
    ]);
    if (gatewayResult && typeof gatewayResult === 'object' && !('error' in gatewayResult)) setStatus(gatewayResult);
    setRequests(Array.isArray(usageResult) ? usageResult.filter((item) => item.endpoint.startsWith('/v1') || item.endpoint === '/responses') : []);
  }, []);

  React.useEffect(() => { void load(); }, [load]);

  const start = async () => {
    const result = await api.gateway.start();
    setMessage('error' in result ? result.error : 'Gateway 已启动。');
    await load();
  };
  const stop = async () => {
    const result = await api.gateway.stop();
    setMessage('error' in result ? result.error : 'Gateway 已停止。');
    await load();
  };

  return (
    <div className="mx-auto max-w-7xl space-y-5 p-6">
      <section className="surface-card p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">本地 Gateway</h1>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">OpenAI 兼容本地 Gateway，提供 mock Provider 测试、安全路由、trace ID、用量统计和 Base URL 诊断。</p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={load} icon={<RefreshCw className="h-4 w-4" />}>刷新</Button>
            {status?.online ? <Button variant="secondary" onClick={stop} icon={<Square className="h-4 w-4" />}>停止</Button> : <Button onClick={start} icon={<PlayCircle className="h-4 w-4" />}>启动</Button>}
          </div>
        </div>
      </section>
      {message && <div className="rounded-tool border border-accent-500/30 bg-accent-500/10 p-3 text-sm text-[var(--accent)]">{message}</div>}
      <div className="grid gap-4 md:grid-cols-3">
        <SurfaceCard className="p-5"><div className="flex items-center gap-2 text-xs text-[var(--text-muted)]"><Power className="h-4 w-4" /> 状态</div><div className="mt-2 text-xl font-bold">{status?.online ? '在线' : '离线'}</div><Badge>{status?.providerCount ?? 0} 个 Provider</Badge></SurfaceCard>
        <SurfaceCard className="p-5"><div className="flex items-center gap-2 text-xs text-[var(--text-muted)]"><Server className="h-4 w-4" /> Root URL</div><button className="mt-2 font-mono text-sm" onClick={() => void copyToClipboard(status?.defaultBaseUrlHint ?? 'http://127.0.0.1:8317')}>{status?.defaultBaseUrlHint ?? 'http://127.0.0.1:8317'}</button></SurfaceCard>
        <SurfaceCard className="p-5"><div className="flex items-center gap-2 text-xs text-[var(--text-muted)]"><Copy className="h-4 w-4" /> /v1 URL</div><button className="mt-2 font-mono text-sm" onClick={() => void copyToClipboard(status?.v1BaseUrlHint ?? 'http://127.0.0.1:8317/v1')}>{status?.v1BaseUrlHint ?? 'http://127.0.0.1:8317/v1'}</button></SurfaceCard>
      </div>
      <SurfaceCard className="p-5">
        <h2 className="text-base font-semibold">支持的端点</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {['GET /health', 'GET /v1/models', 'POST /v1/chat/completions', 'POST /v1/responses', 'POST /responses', 'POST /v1/messages'].map((item) => <Badge key={item}>{item}</Badge>)}
        </div>
        {status?.lastTraceId && <p className="mt-4 text-sm text-[var(--text-secondary)]">最近 trace：<span className="font-mono">{status.lastTraceId}</span> / {status.lastRouteReason}</p>}
      </SurfaceCard>
      <SurfaceCard className="p-5">
        <h2 className="text-base font-semibold">Gateway 请求用量</h2>
        <div className="mt-4 space-y-2">
          {requests.map((request) => <div key={request.id} className="rounded-tool border border-[var(--border)] bg-[var(--surface-muted)] p-3 text-sm"><div className="font-semibold">{request.endpoint}</div><div className="text-xs text-[var(--text-muted)]">{request.requestId} / {request.failureCategory} / {request.latencyMs}ms</div></div>)}
        </div>
      </SurfaceCard>
    </div>
  );
}
