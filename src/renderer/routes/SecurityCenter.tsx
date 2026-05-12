import React from 'react';
import { Download, RefreshCw, ShieldAlert } from 'lucide-react';
import { Badge, Button, SurfaceCard, Textarea } from '../components';
import { api } from '../lib/api';
import type { AuditEvent, NexusBackupManifest, NexusRestorePreview, NexusSecurityReport } from '../lib/types';

function hasError<T>(value: T | { error: string }): value is { error: string } {
  return Boolean(value && typeof value === 'object' && 'error' in value);
}

export default function SecurityCenter() {
  const [report, setReport] = React.useState<NexusSecurityReport | null>(null);
  const [audit, setAudit] = React.useState<AuditEvent[]>([]);
  const [backup, setBackup] = React.useState<NexusBackupManifest | null>(null);
  const [restoreRaw, setRestoreRaw] = React.useState('{"manifest":{"id":"preview","createdAt":"2026-05-12T00:00:00.000Z","mode":"created","collections":[],"checksum":"preview","redaction":"secrets-redacted","restoreRequiresPreview":true}}');
  const [restorePreview, setRestorePreview] = React.useState<NexusRestorePreview | null>(null);
  const [message, setMessage] = React.useState('');

  const load = React.useCallback(async () => {
    const [reportResult, auditResult, backupResult] = await Promise.all([
      api.security.report('workspace').catch(() => null),
      api.audit.list({ limit: 50 }).catch(() => []),
      api.ops.backupPreview().catch(() => null),
    ]);
    if (reportResult && typeof reportResult === 'object' && !('error' in reportResult)) setReport(reportResult);
    setAudit(Array.isArray(auditResult) ? auditResult : []);
    if (backupResult && typeof backupResult === 'object' && !('error' in backupResult)) setBackup(backupResult);
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const exportReport = async () => {
    if (!report) return;
    await api.export.json(report, `localai-nexus-security-${Date.now()}.json`);
    setMessage('安全报告已导出，密钥已脱敏。');
  };

  const createBackup = async () => {
    const result = await api.ops.createBackup();
    if (hasError(result)) {
      setMessage(result.error);
      return;
    }
    setBackup(result);
    setMessage('备份清单已创建。当前实现保存脱敏清单，不导出原始密钥。');
  };

  const previewRestore = async () => {
    const result = await api.ops.restorePreview(restoreRaw);
    if (hasError(result)) {
      setMessage(result.error);
      return;
    }
    setRestorePreview(result);
    setMessage(result.ok ? '恢复预览完成，尚未写入任何数据。' : '恢复预览发现错误。');
  };

  return (
    <div className="mx-auto max-w-7xl space-y-5 p-6">
      <section className="surface-card p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold">安全中心</h1>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              查看 Auth、RBAC、ACL、审计、脱敏、Provider 风险、备份和恢复预览。
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={load} icon={<RefreshCw className="h-4 w-4" />}>刷新</Button>
            <Button onClick={exportReport} icon={<Download className="h-4 w-4" />}>导出</Button>
          </div>
        </div>
      </section>

      {message && <div className="rounded-tool border border-accent-500/30 bg-accent-500/10 p-3 text-sm text-[var(--accent)]">{message}</div>}

      <div className="grid gap-4 md:grid-cols-4">
        <SurfaceCard className="p-5"><div className="text-xs text-[var(--text-muted)]">审计事件</div><div className="mt-2 text-2xl font-bold">{report?.auditEventCount ?? audit.length}</div></SurfaceCard>
        <SurfaceCard className="p-5"><div className="text-xs text-[var(--text-muted)]">已拒绝</div><div className="mt-2 text-2xl font-bold">{report?.deniedEventCount ?? 0}</div></SurfaceCard>
        <SurfaceCard className="p-5"><div className="text-xs text-[var(--text-muted)]">Provider 风险</div><div className="mt-2 text-2xl font-bold">{report?.providerRiskCount ?? 0}</div></SurfaceCard>
        <SurfaceCard className="p-5"><div className="text-xs text-[var(--text-muted)]">备份集合</div><div className="mt-2 text-2xl font-bold">{backup?.collections.length ?? 0}</div></SurfaceCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <SurfaceCard className="p-5">
          <h2 className="flex items-center gap-2 text-base font-semibold"><ShieldAlert className="h-4 w-4" /> 风险发现</h2>
          <div className="mt-4 space-y-2">
            {(report?.findings ?? []).map((finding) => (
              <div key={finding.id} className="rounded-tool border border-[var(--border)] bg-[var(--surface-muted)] p-3 text-sm">
                <div className="flex items-center gap-2"><Badge>{finding.severity}</Badge><span className="font-semibold">{finding.title}</span></div>
                <p className="mt-1 text-xs text-[var(--text-secondary)]">{finding.detail}</p>
                <p className="mt-1 text-xs text-[var(--text-muted)]">{finding.recommendation}</p>
              </div>
            ))}
          </div>
        </SurfaceCard>

        <SurfaceCard className="p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold">备份与恢复预览</h2>
            <Button size="sm" onClick={createBackup}>创建清单</Button>
          </div>
          <div className="mt-3 rounded-tool border border-[var(--border)] bg-[var(--surface-muted)] p-3 text-xs">
            <div>模式：{backup?.mode ?? 'dry-run'}</div>
            <div>校验：{backup?.checksum ?? 'pending'}</div>
            <div>脱敏：{backup?.redaction ?? 'secrets-redacted'}</div>
          </div>
          <Textarea
            className="mt-4 min-h-[120px] font-mono text-xs"
            label="恢复 JSON 预览"
            value={restoreRaw}
            onChange={(event) => setRestoreRaw(event.target.value)}
          />
          <Button className="mt-3" variant="secondary" onClick={previewRestore}>预览恢复</Button>
          {restorePreview && (
            <div className="mt-3 rounded-tool border border-[var(--border)] bg-[var(--surface-muted)] p-3 text-xs">
              <div>状态：{restorePreview.ok ? '可预览' : '有错误'}</div>
              <div>变更集合：{restorePreview.changes.length}</div>
              <div>警告：{restorePreview.warnings.length} / 错误：{restorePreview.errors.length}</div>
            </div>
          )}
        </SurfaceCard>
      </div>

      <SurfaceCard className="p-5">
        <h2 className="text-base font-semibold">最近审计</h2>
        <div className="mt-4 space-y-2">
          {audit.slice(0, 12).map((event) => (
            <div key={event.id} className="rounded-tool border border-[var(--border)] bg-[var(--surface-muted)] p-3 text-xs">
              <div className="font-semibold">{event.action}</div>
              <div className="text-[var(--text-muted)]">{event.status} / {event.severity} / {event.createdAt}</div>
            </div>
          ))}
        </div>
      </SurfaceCard>
    </div>
  );
}
