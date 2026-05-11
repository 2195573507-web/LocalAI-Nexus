import React, { useEffect, useState } from 'react';
import { KeyRound, Plus, Shield, UserCheck, UserX } from 'lucide-react';
import type { PublicUser, UserRole } from '../../shared/authTypes';
import Button from '../components/Button';
import SurfaceCard from '../components/SurfaceCard';
import Input from '../components/Input';
import Badge from '../components/Badge';
import { api } from '../lib/api';
import { isAuthError } from '../lib/session';

export default function AdminUsers() {
  const [users, setUsers] = useState<PublicUser[]>([]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('user');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [temporaryPassword, setTemporaryPassword] = useState<{ email: string; value: string } | null>(null);

  const load = async () => {
    const result = await api.users.list();
    if (isAuthError(result)) setError(result.error);
    else setUsers(result);
  };

  useEffect(() => {
    void load();
  }, []);

  const create = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setTemporaryPassword(null);
    const result = await api.users.create({ email, password, role, displayName });
    if (isAuthError(result)) {
      setError(result.error);
      return;
    }
    setEmail('');
    setPassword('');
    setDisplayName('');
    await load();
  };

  const updateRole = async (userId: string, nextRole: UserRole) => {
    setError('');
    const result = await api.users.update({ userId, role: nextRole });
    if (isAuthError(result)) setError(result.error);
    await load();
  };

  const toggleStatus = async (user: PublicUser) => {
    setError('');
    const result = await api.users.update({ userId: user.id, status: user.status === 'active' ? 'disabled' : 'active' });
    if (isAuthError(result)) setError(result.error);
    await load();
  };

  const resetPassword = async (userId: string) => {
    setError('');
    setTemporaryPassword(null);
    const result = await api.users.resetPassword({ userId, mustChangePassword: true });
    if (isAuthError(result)) {
      setError(result.error);
      return;
    }
    setTemporaryPassword({ email: result.user.email, value: result.temporaryPassword });
    await load();
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold text-[var(--text-primary)] dark:text-slate-100">管理员用户</h2>
        <p className="text-sm text-[var(--text-muted)] dark:text-[var(--text-muted)]">管理本地用户、角色、状态和密码重置。</p>
      </div>

      <SurfaceCard>
        <form className="grid gap-3 md:grid-cols-[1fr_1fr_140px_160px_auto]" onSubmit={create}>
          <Input label="邮箱" value={email} onChange={(event) => setEmail(event.target.value)} />
          <Input label="显示名" value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
          <div className="flex flex-col gap-1.5">
            <label htmlFor="new-user-role" className="text-xs font-medium text-[var(--text-secondary)] dark:text-[var(--text-muted)] tracking-wide uppercase">角色</label>
            <select id="new-user-role" value={role} onChange={(event) => setRole(event.target.value as UserRole)} className="rounded-panel border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm">
              <option value="user">用户</option>
              <option value="admin">管理员</option>
            </select>
          </div>
          <Input label="临时密码" type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
          <div className="flex items-end">
            <Button type="submit" icon={<Plus className="h-4 w-4" />}>创建</Button>
          </div>
        </form>
        {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
        {temporaryPassword && (
          <div className="mt-3 rounded-lg border border-amber-300/60 bg-amber-50/80 px-3 py-2 text-sm text-amber-900 dark:border-amber-400/30 dark:bg-amber-500/10 dark:text-amber-100">
            {temporaryPassword.email} 的临时密码：<code className="font-mono">{temporaryPassword.value}</code>
          </div>
        )}
      </SurfaceCard>

      <div className="grid gap-3">
        {users.map((user) => (
          <SurfaceCard key={user.id} padding="md">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-[var(--text-primary)] dark:text-slate-100">{user.profile.displayName || user.email}</h3>
                  <Badge variant={user.role === 'admin' ? 'info' : 'default'}>{user.role}</Badge>
                  <Badge variant={user.status === 'active' ? 'success' : 'warning'}>{user.status}</Badge>
                  {user.mustChangePassword && <Badge variant="warning">需要改密</Badge>}
                </div>
                <p className="text-sm text-[var(--text-muted)] dark:text-[var(--text-muted)]">{user.email}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" size="sm" icon={<Shield className="h-4 w-4" />} onClick={() => void updateRole(user.id, user.role === 'admin' ? 'user' : 'admin')}>
                  设为{user.role === 'admin' ? '用户' : '管理员'}
                </Button>
                <Button variant="secondary" size="sm" icon={user.status === 'active' ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />} onClick={() => void toggleStatus(user)}>
                  {user.status === 'active' ? '禁用' : '启用'}
                </Button>
                <Button variant="secondary" size="sm" icon={<KeyRound className="h-4 w-4" />} onClick={() => void resetPassword(user.id)}>
                  重置
                </Button>
              </div>
            </div>
          </SurfaceCard>
        ))}
      </div>
    </div>
  );
}
