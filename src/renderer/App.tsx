import React, { Suspense, lazy } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { KeyRound, ShieldCheck } from 'lucide-react';
import Layout from './components/Layout';
import ErrorBoundary from './components/ErrorBoundary';
import Button from './components/Button';
import Input from './components/Input';
import { AuthProvider, useAuth } from './lib/auth';
import { hasPermission, type Permission } from './lib/permissions';
import { I18nProvider, useI18n } from './lib/i18n';
import { ThemeProvider } from './lib/theme';

const Login = lazy(() => import('./routes/Login'));
const Dashboard = lazy(() => import('./routes/Dashboard'));
const ProviderHub = lazy(() => import('./routes/ProviderHub'));
const TokenCenter = lazy(() => import('./routes/TokenCenter'));
const HealthMonitor = lazy(() => import('./routes/HealthMonitor'));
const ModelRouter = lazy(() => import('./routes/ModelRouter'));
const LocalGateway = lazy(() => import('./routes/LocalGateway'));
const RuntimeSwitcher = lazy(() => import('./routes/RuntimeSwitcher'));
const Diagnostics = lazy(() => import('./routes/Diagnostics'));
const AgentStudio = lazy(() => import('./routes/AgentStudio'));
const SecurityCenter = lazy(() => import('./routes/SecurityCenter'));
const Ecosystem = lazy(() => import('./routes/Ecosystem'));
const Workflows = lazy(() => import('./routes/Workflows'));
const Projects = lazy(() => import('./routes/Projects'));
const ProjectDetail = lazy(() => import('./routes/ProjectDetail'));
const PromptLab = lazy(() => import('./routes/PromptLab'));
const LogAnalyzer = lazy(() => import('./routes/LogAnalyzer'));
const GitTimeline = lazy(() => import('./routes/GitTimeline'));
const SafetyBox = lazy(() => import('./routes/SafetyBox'));
const SharedMemoryHub = lazy(() => import('./routes/SharedMemoryHub'));
const Skills = lazy(() => import('./routes/Skills'));
const Settings = lazy(() => import('./routes/Settings'));
const AdminUsers = lazy(() => import('./routes/AdminUsers'));
const AdminAudit = lazy(() => import('./routes/AdminAudit'));

function PageLoader() {
  const { t } = useI18n();
  return (
    <div className="flex h-64 items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
        <span className="text-sm text-[var(--text-tertiary)]">{t('page.loading')}</span>
      </div>
    </div>
  );
}

function routeElement(name: string, element: React.ReactNode) {
  return <ErrorBoundary routeName={name}>{element}</ErrorBoundary>;
}

function ProtectedShell({ children }: { children: React.ReactNode }) {
  const { loading, user } = useAuth();
  const location = useLocation();
  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <Layout>{children}</Layout>;
}

function RequirePermission({ permission, children }: { permission: Permission; children: React.ReactNode }) {
  const { user } = useAuth();
  const { t } = useI18n();
  if (!hasPermission(user, permission)) {
    return (
      <div className="p-6">
        <div className="surface-card p-5">
          <h2 className="text-xl font-bold text-[var(--text-primary)] dark:text-[var(--text-primary)]">{t('auth.accessDenied')}</h2>
          <p className="mt-2 text-sm text-[var(--text-muted)] dark:text-[var(--text-muted)]">{t('auth.routeRequires', { permission })}</p>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}

function passwordChangeMessage(message: string) {
  if (message.includes('Current password is incorrect')) {
    return '当前密码不正确。默认管理员首次登录时，当前密码请填写 123456。';
  }
  if (message.includes('Password must be at least 6 characters')) {
    return '新密码至少需要 6 位。请设置一个只有你知道的新密码。';
  }
  if (message.includes('Authentication required')) {
    return '登录会话已过期。请回到登录页重新登录后再修改密码。';
  }
  return message;
}

function ForcePasswordChange({ children }: { children: React.ReactNode }) {
  const { user, setUser } = useAuth();
  const [currentPassword, setCurrentPassword] = React.useState('');
  const [newPassword, setNewPassword] = React.useState('');
  const [error, setError] = React.useState('');
  const [changing, setChanging] = React.useState(false);

  if (!user?.mustChangePassword) return <>{children}</>;

  const change = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    if (!currentPassword.trim()) {
      setError('请输入当前密码。默认管理员首次登录时，当前密码是 123456。');
      return;
    }
    if (newPassword.length < 6) {
      setError('新密码至少需要 6 位。');
      return;
    }
    setChanging(true);
    try {
      const { api } = await import('./lib/api');
      const result = await api.auth.changePassword({ currentPassword, newPassword });
      if (result && typeof result === 'object' && 'error' in result) {
        setError(passwordChangeMessage(String(result.error)));
        return;
      }
      setUser(result);
    } finally {
      setChanging(false);
    }
  };

  return (
    <div className="flex min-h-screen w-screen items-center justify-center p-6">
      <form onSubmit={change} className="surface-card w-full max-w-md space-y-4 p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-panel bg-accent-500/15 text-accent-600 dark:text-accent-300">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-[var(--text-primary)] dark:text-[var(--text-primary)]">请先修改默认管理员密码</h2>
            <p className="text-sm text-[var(--text-muted)] dark:text-[var(--text-muted)]">
              你已经登录默认管理员账号。为保护本地工作区，请先把初始密码 123456 改成你自己的密码。
            </p>
          </div>
        </div>
        <Input
          aria-label="Current password"
          label="当前密码"
          type="password"
          value={currentPassword}
          onChange={(event) => setCurrentPassword(event.target.value)}
          placeholder="首次登录填写 123456"
          autoComplete="current-password"
          icon={<KeyRound className="h-4 w-4" />}
        />
        <Input
          aria-label="New password"
          label="新密码"
          type="password"
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
          placeholder="至少 6 位"
          autoComplete="new-password"
          icon={<KeyRound className="h-4 w-4" />}
        />
        {error && (
          <div className="rounded-panel border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-300">
            {error}
          </div>
        )}
        <Button type="submit" fullWidth loading={changing}>
          修改密码并进入 LocalAI Nexus
        </Button>
      </form>
    </div>
  );
}

function AppRoutes() {
  return (
    <ForcePasswordChange>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/login" element={routeElement('Login', <Login />)} />
          <Route path="/" element={routeElement('LocalAI Nexus Dashboard', <Dashboard />)} />
          <Route path="/providers" element={routeElement('Provider Hub', <ProviderHub />)} />
          <Route path="/tokens" element={routeElement('Token Center', <TokenCenter />)} />
          <Route path="/health" element={routeElement('Health Monitor', <HealthMonitor />)} />
          <Route path="/router" element={routeElement('Model Router', <ModelRouter />)} />
          <Route path="/gateway" element={routeElement('Local Gateway', <LocalGateway />)} />
          <Route path="/runtime" element={routeElement('Runtime Switcher', <RuntimeSwitcher />)} />
          <Route path="/diagnostics" element={routeElement('Diagnostics', <Diagnostics />)} />
          <Route path="/agents" element={routeElement('Agent Studio', <AgentStudio />)} />
          <Route path="/security" element={routeElement('Security Center', <SecurityCenter />)} />
          <Route path="/ecosystem" element={routeElement('Local Ecosystem', <Ecosystem />)} />
          <Route path="/workflows" element={routeElement('Workflows', <Workflows />)} />
          <Route path="/projects" element={routeElement('Projects', <Projects />)} />
          <Route path="/projects/:id" element={routeElement('Project Detail', <ProjectDetail />)} />
          <Route path="/prompts" element={routeElement('Prompt Lab', <PromptLab />)} />
          <Route path="/prompt-lab" element={routeElement('Prompt Lab', <PromptLab />)} />
          <Route path="/logs" element={routeElement('Log Analyzer', <LogAnalyzer />)} />
          <Route path="/log-analyzer" element={routeElement('Log Analyzer', <LogAnalyzer />)} />
          <Route path="/git" element={routeElement('Git Timeline', <GitTimeline />)} />
          <Route path="/git-timeline" element={routeElement('Git Timeline', <GitTimeline />)} />
          <Route path="/safety" element={routeElement('Safety Guard', <SafetyBox />)} />
          <Route path="/safety-box" element={routeElement('Safety Guard', <SafetyBox />)} />
          <Route path="/memory" element={routeElement('Shared Memory', <SharedMemoryHub />)} />
          <Route path="/shared-memory-hub" element={routeElement('Shared Memory', <SharedMemoryHub />)} />
          <Route path="/skills" element={routeElement('Skills', <Skills />)} />
          <Route
            path="/admin/users"
            element={routeElement(
              'Admin Users',
              <RequirePermission permission="admin:users">
                <AdminUsers />
              </RequirePermission>,
            )}
          />
          <Route
            path="/admin/audit"
            element={routeElement(
              'Audit Logs',
              <RequirePermission permission="admin:audit">
                <AdminAudit />
              </RequirePermission>,
            )}
          />
          <Route path="/settings" element={routeElement('Settings', <Settings />)} />
        </Routes>
      </Suspense>
    </ForcePasswordChange>
  );
}

export default function App() {
  return (
    <I18nProvider>
      <ThemeProvider>
        <AuthProvider>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/login" element={routeElement('Login', <Login />)} />
              <Route
                path="/*"
                element={
                  <ProtectedShell>
                    <AppRoutes />
                  </ProtectedShell>
                }
              />
            </Routes>
          </Suspense>
        </AuthProvider>
      </ThemeProvider>
    </I18nProvider>
  );
}
