import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, Search } from 'lucide-react';
import type { AuditEvent } from '../../shared/auditTypes';
import Button from '../components/Button';
import SurfaceCard from '../components/SurfaceCard';
import Input from '../components/Input';
import Badge from '../components/Badge';
import { api } from '../lib/api';
import { isAuthError } from '../lib/session';

export default function AdminAudit() {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const result = await api.audit.list({ search, limit: 250 });
    if (isAuthError(result)) setError(result.error);
    else setEvents(result);
  }, [search]);

  useEffect(() => {
    void load();
  }, [load]);

  const securityEvents = useMemo(
    () => events.filter((event) => event.severity !== 'info' || event.status !== 'success'),
    [events],
  );

  const exportAudit = async () => {
    const result = await api.audit.exportAll();
    if (isAuthError(result)) {
      setError(result.error);
      return;
    }
    await api.export.json(result, `agentflow-audit-${Date.now()}.json`);
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[var(--text-primary)] dark:text-slate-100">审计日志</h2>
          <p className="text-sm text-[var(--text-muted)] dark:text-[var(--text-muted)]">搜索 Auth、权限、管理员和安全事件。</p>
        </div>
        <Button variant="secondary" icon={<Download className="h-4 w-4" />} onClick={() => void exportAudit()}>
          导出
        </Button>
      </div>

      <SurfaceCard padding="md">
        <div className="flex flex-col gap-3 md:flex-row md:items-end">
          <Input label="搜索" value={search} onChange={(event) => setSearch(event.target.value)} icon={<Search className="h-4 w-4" />} wrapperClassName="flex-1" />
          <Button variant="secondary" onClick={() => void load()}>搜索</Button>
        </div>
        {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
      </SurfaceCard>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <SurfaceCard padding="md"><p className="text-sm text-[var(--text-muted)]">事件</p><p className="text-2xl font-bold">{events.length}</p></SurfaceCard>
        <SurfaceCard padding="md"><p className="text-sm text-[var(--text-muted)]">安全事件</p><p className="text-2xl font-bold">{securityEvents.length}</p></SurfaceCard>
        <SurfaceCard padding="md"><p className="text-sm text-[var(--text-muted)]">已拒绝</p><p className="text-2xl font-bold">{events.filter((event) => event.status === 'denied').length}</p></SurfaceCard>
      </div>

      <div data-testid="audit-log-panel" className="space-y-3">
        {events.map((event) => (
          <SurfaceCard key={event.id} padding="md">
            <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold text-[var(--text-primary)] dark:text-slate-100">{event.action}</h3>
                  <Badge variant={event.status === 'success' ? 'success' : event.status === 'denied' ? 'danger' : 'warning'}>{event.status}</Badge>
                  <Badge variant={event.severity === 'critical' ? 'danger' : event.severity === 'warning' ? 'warning' : 'default'}>{event.severity}</Badge>
                </div>
                <p className="text-sm text-[var(--text-muted)] dark:text-[var(--text-muted)]">
                  {event.actor.email || 'system'} / {event.resource?.type || 'event'} {event.resource?.label ? `/ ${event.resource.label}` : ''}
                </p>
              </div>
              <time className="text-xs text-[var(--text-muted)]">{new Date(event.createdAt).toLocaleString()}</time>
            </div>
          </SurfaceCard>
        ))}
      </div>
    </div>
  );
}
