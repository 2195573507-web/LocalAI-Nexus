import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  ArrowRight,
  Brain,
  CheckCircle2,
  CheckSquare,
  Circle,
  ClipboardCheck,
  Database,
  FileSearch,
  FolderKanban,
  GitBranch,
  KeyRound,
  PlayCircle,
  RefreshCw,
  Settings,
  Shield,
  Sparkles,
  Wand2,
  Workflow,
} from 'lucide-react';
import { api } from '../lib/api';
import { EmptyState, SurfaceCard, StatCard } from '../components/';
import type {
  Memory,
  NexusGatewayStatus,
  NexusHealthCheckResult,
  NexusUsageSummary,
  Project,
  ProviderSetting,
  SavedPrompt,
  Task,
} from '../lib/types';
import { formatRelativeDate, truncate } from '../lib/utils';

const now = Date.now();

const DEMO_PROJECTS: Project[] = [
  {
    id: 'demo-nexus-1',
    name: '本地编码控制台',
    idea: '用于协调 AI 编码 Agent、Prompt、日志、记忆和发布说明的本地工作区。',
    platform: 'Desktop',
    techStack: 'Electron, React, TypeScript, Tailwind',
    uiStyle: '紧凑桌面工具',
    difficulty: 'Medium',
    status: 'active',
    createdAt: new Date(now - 10 * 864e5).toISOString(),
    updatedAt: new Date(now - 2 * 3600e3).toISOString(),
  },
  {
    id: 'demo-nexus-2',
    name: 'Provider 切换台',
    idea: '跟踪本地和 OpenAI 兼容 Provider，同时避免在 Prompt 或导出文件中暴露密钥。',
    platform: 'Desktop',
    techStack: 'Node.js, Electron IPC',
    uiStyle: '紧凑管理界面',
    difficulty: 'Hard',
    status: 'planning',
    createdAt: new Date(now - 5 * 864e5).toISOString(),
    updatedAt: new Date(now - 12 * 3600e3).toISOString(),
  },
  {
    id: 'demo-nexus-3',
    name: '记忆恢复工具包',
    idea: '记录决策、问题修复和交接上下文，让其他模型可以干净接手项目。',
    platform: 'Web',
    techStack: 'React, JSON storage',
    uiStyle: '知识管理界面',
    difficulty: 'Medium',
    status: 'done',
    createdAt: new Date(now - 21 * 864e5).toISOString(),
    updatedAt: new Date(now - 3 * 864e5).toISOString(),
  },
];

const DEMO_TASKS: Task[] = [
  { id: 'task-1', projectId: 'demo-nexus-1', title: '连接第一个本地项目', status: 'done', priority: 'high', createdAt: new Date(now - 6 * 864e5).toISOString() },
  { id: 'task-2', projectId: 'demo-nexus-1', title: '为下一个编码 Agent 生成任务 Prompt', status: 'in_progress', priority: 'high', createdAt: new Date(now - 2 * 864e5).toISOString() },
  { id: 'task-3', projectId: 'demo-nexus-2', title: '在写入 Prompt 前测试 Provider 连接', status: 'todo', priority: 'medium', createdAt: new Date(now - 864e5).toISOString() },
  { id: 'task-4', projectId: 'demo-nexus-3', title: '保存 Shared Memory 恢复上下文', status: 'done', priority: 'medium', createdAt: new Date(now - 4 * 864e5).toISOString() },
];

const DEMO_PROMPTS: SavedPrompt[] = [
  { id: 'prompt-1', name: '实现交接 Prompt', templateId: 'handoff', variables: {}, content: '读取本地项目上下文，保留现有改动，实施下一个明确任务，并报告验证结果。', starred: true, favorite: true, createdAt: new Date(now - 2 * 3600e3).toISOString() },
  { id: 'prompt-2', name: '安全审查 Prompt', templateId: 'safety', variables: {}, content: '执行前检查命令是否存在破坏性行为、密钥泄露和更安全替代方案。', starred: false, createdAt: new Date(now - 2 * 864e5).toISOString() },
];

const DEMO_MEMORIES: Memory[] = [
  { id: 'memory-1', type: 'decision', title: '本地优先编排', content: '除非用户主动导出，否则项目上下文、Provider 设置和记忆都留在本地。', tags: ['local-first', 'architecture'], importance: 5, status: 'active', projectId: 'demo-nexus-1', lastUsedAt: new Date(now - 3600e3).toISOString(), createdAt: new Date(now - 5 * 864e5).toISOString(), updatedAt: new Date(now - 3600e3).toISOString() },
  { id: 'memory-2', type: 'safety_check', title: '快捷方式启动策略', content: '桌面快捷方式应优先指向 Electron 入口，并跳过 devtools，减少启动噪音。', tags: ['launcher', 'safety'], importance: 4, status: 'active', projectId: 'demo-nexus-1', lastUsedAt: new Date(now - 2 * 3600e3).toISOString(), createdAt: new Date(now - 3 * 864e5).toISOString(), updatedAt: new Date(now - 2 * 3600e3).toISOString() },
];

const statusLabel: Record<string, string> = {
  active: '进行中',
  planning: '规划中',
  paused: '已暂停',
  done: '已完成',
};

const statusClass: Record<string, string> = {
  active: 'border-emerald-400/30 bg-emerald-500/15 text-emerald-600 dark:text-emerald-300',
  planning: 'border-blue-400/30 bg-blue-500/15 text-blue-600 dark:text-blue-300',
  paused: 'border-amber-400/30 bg-amber-500/15 text-amber-600 dark:text-amber-300',
  done: 'border-slate-400/30 bg-slate-500/15 text-[var(--text-secondary)] dark:text-slate-300',
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [prompts, setPrompts] = useState<SavedPrompt[]>([]);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [riskCount, setRiskCount] = useState(0);
  const [providers, setProviders] = useState<ProviderSetting[]>([]);
  const [activeProvider, setActiveProvider] = useState({ providerRef: '', model: '' });
  const [gatewayStatus, setGatewayStatus] = useState<NexusGatewayStatus | null>(null);
  const [usageSummary, setUsageSummary] = useState<NexusUsageSummary | null>(null);
  const [healthState, setHealthState] = useState<{ latest: NexusHealthCheckResult[]; byStatus: Record<string, number> } | null>(null);
  const [loading, setLoading] = useState(true);
  const [apiAvailable, setApiAvailable] = useState(true);
  const [gatewayBusy, setGatewayBusy] = useState(false);

  const applyDemoData = useCallback(() => {
    setApiAvailable(false);
    setProjects(DEMO_PROJECTS);
    setTasks(DEMO_TASKS);
    setPrompts(DEMO_PROMPTS);
    setMemories(DEMO_MEMORIES);
    setRiskCount(DEMO_MEMORIES.filter((memory) => memory.type === 'safety_check').length);
    setProviders([]);
    setActiveProvider({ providerRef: '', model: '' });
    setGatewayStatus(null);
    setUsageSummary(null);
    setHealthState(null);
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      if (!api || typeof api.projects?.list !== 'function') {
        applyDemoData();
        return;
      }

      const [
        projectResult,
        taskResult,
        promptResult,
        memoryResult,
        providerResult,
        activeResult,
        gatewayResult,
        usageResult,
        healthResult,
      ] = await Promise.all([
        api.projects.list(),
        api.tasks.list(),
        api.prompts.list(),
        api.memory.list(),
        api.providers.list().catch(() => []),
        api.providers.getActive().catch(() => ({ providerRef: '', model: '' })),
        api.gateway.status().catch(() => null),
        api.usage.summary().catch(() => null),
        api.health.summary().catch(() => null),
      ]);

      const projectList = Array.isArray(projectResult) ? projectResult : [];
      const taskList = Array.isArray(taskResult) ? taskResult : [];
      const promptList = Array.isArray(promptResult) ? promptResult : [];
      const memoryList = Array.isArray(memoryResult) ? memoryResult : [];

      setApiAvailable(true);
      setProjects(projectList);
      setTasks(taskList);
      setPrompts(promptList);
      setMemories(memoryList);
      setProviders(Array.isArray(providerResult) ? providerResult : []);
      if (activeResult && typeof activeResult === 'object' && !('error' in activeResult)) {
        setActiveProvider({ providerRef: activeResult.providerRef, model: activeResult.model });
      }
      if (gatewayResult && typeof gatewayResult === 'object' && !('error' in gatewayResult)) {
        setGatewayStatus(gatewayResult);
      }
      if (usageResult && typeof usageResult === 'object' && !('error' in usageResult)) {
        setUsageSummary(usageResult);
      }
      if (healthResult && typeof healthResult === 'object' && !('error' in healthResult)) {
        setHealthState(healthResult);
      }
      setRiskCount(
        memoryList.filter((memory) => memory.type === 'safety_check' || (memory.tags || []).includes('safety')).length,
      );
    } catch (error) {
      console.error('Dashboard fetch error:', error);
      applyDemoData();
    } finally {
      setLoading(false);
    }
  }, [applyDemoData]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const recentProjects = useMemo(
    () => [...projects].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).slice(0, 4),
    [projects],
  );

  const recentPrompts = useMemo(
    () => [...prompts].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 4),
    [prompts],
  );

  const hasProjects = projects.length > 0;
  const hasTasks = tasks.length > 0;
  const hasPrompts = prompts.length > 0;
  const hasMemories = memories.length > 0;
  const hasSafetyChecks = riskCount > 0;
  const activeProviderRecord = providers.find((provider) => provider.id === activeProvider.providerRef);
  const providerHealth = healthState?.latest[0]?.status ?? '未知';
  const recentFailure = usageSummary?.recentFailureReason ?? '暂无';
  const gatewayOnline = Boolean(gatewayStatus?.online);

  const startGateway = async () => {
    setGatewayBusy(true);
    try {
      const status = await api.gateway.start();
      if (status && typeof status === 'object' && !('error' in status)) setGatewayStatus(status);
      await fetchData();
    } finally {
      setGatewayBusy(false);
    }
  };

  const firstRunSteps = [
    {
      label: 'Provider',
      title: '添加 Provider',
      body: '连接 OpenAI 兼容、Anthropic 兼容、Gemini、Ollama 或自定义本地 Provider。',
      icon: KeyRound,
      route: '/providers',
      done: providers.length > 0,
    },
    {
      label: 'Gateway',
      title: '启动本地 Gateway',
      body: '在 http://127.0.0.1:8317 暴露本地 OpenAI 兼容 Gateway。',
      icon: Activity,
      route: '/gateway',
      done: gatewayOnline,
    },
    {
      label: 'Workflow',
      title: '创建第一个 Workflow',
      body: '把任务、Prompt Skill、Provider 路由和审计时间线绑定成可重复运行。',
      icon: Workflow,
      route: '/workflows',
      done: hasTasks,
    },
    {
      label: 'Project',
      title: '创建或打开项目',
      body: '让 Agent 执行前先记录目标、约束、技术栈和交付边界。',
      icon: FolderKanban,
      route: '/projects',
      done: hasProjects,
    },
    {
      label: 'Prompt',
      title: '生成交接 Prompt',
      body: '把明确任务转换为 Codex、Claude Code、Cursor 或其他 Agent 可执行的 Prompt。',
      icon: Wand2,
      route: '/prompts',
      done: hasPrompts,
    },
    {
      label: 'Guard',
      title: '检查高风险命令',
      body: '命令真正触碰本地工作区前，先通过 Safety 做风险检查。',
      icon: Shield,
      route: '/safety',
      done: hasSafetyChecks,
    },
    {
      label: 'Memory',
      title: '保存恢复上下文',
      body: '保存决策、修复和交接说明，让下一个模型不用猜测即可接手。',
      icon: Brain,
      route: '/memory',
      done: hasMemories,
    },
  ];

  const nextStep = firstRunSteps.find((step) => !step.done) || firstRunSteps[firstRunSteps.length - 1];

  const quickActions = [
    { label: 'Provider 中心', icon: Settings, route: '/providers', tone: 'text-blue-500' },
    { label: 'Runtime 配置', icon: Activity, route: '/runtime', tone: 'text-emerald-500' },
    { label: 'Skill 中心', icon: Wand2, route: '/skills', tone: 'text-violet-500' },
    { label: '诊断中心', icon: FileSearch, route: '/diagnostics', tone: 'text-amber-500' },
    { label: 'Shared Memory', icon: Brain, route: '/memory', tone: 'text-rose-500' },
    { label: 'Git 时间线', icon: GitBranch, route: '/git', tone: 'text-cyan-500' },
  ];

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl space-y-6 px-6 py-8 animate-pulse">
        <div className="h-44 rounded-panel bg-[var(--surface-muted)]" />
        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="h-28 rounded-panel bg-[var(--surface-muted)]" />
          ))}
        </div>
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="h-72 rounded-panel bg-[var(--surface-muted)]" />
          <div className="h-72 rounded-panel bg-[var(--surface-muted)]" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-7 px-6 py-8">
      {!apiAvailable && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-400/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-200">
          <Sparkles className="h-4 w-4 shrink-0" />
          当前会话无法访问桌面数据桥，LocalAI Nexus 正在显示安全演示数据。
        </div>
      )}

      <section className="surface-card overflow-hidden p-0">
        <div className="grid gap-6 p-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:p-7">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-xs font-semibold text-accent-700 dark:text-accent-300">
              <Activity className="h-3.5 w-3.5" />
              本地优先 AI 编排中心
            </div>
            <h1 className="mt-4 text-3xl font-bold tracking-tight text-[var(--text-primary)] dark:text-[var(--text-primary)]">
              LocalAI Nexus
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--text-secondary)] dark:text-[var(--text-secondary)]">
              在一个本地控制台中管理项目、模型 Provider、任务 Prompt、安全检查、日志、Git 上下文和 Shared Memory。
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => {
                  if (nextStep.label === 'Gateway') void startGateway();
                  else navigate(nextStep.route);
                }}
                className="focus-ring inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-accent-600 px-4 py-2.5 text-sm font-semibold text-white  transition-colors hover:bg-accent-500"
                disabled={gatewayBusy}
              >
                {gatewayBusy ? '正在启动 Gateway...' : `继续：${nextStep.title}`}
                <ArrowRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => void fetchData()}
                className="focus-ring inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm font-semibold text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-hover)] dark:text-[var(--text-primary)] dark:hover:bg-[var(--surface-hover)]"
              >
                <RefreshCw className="h-4 w-4" />
                刷新
              </button>
            </div>
          </div>

          <div className="rounded-panel border border-[var(--border)] bg-[var(--surface-muted)] p-4  dark:bg-[var(--surface-muted)]">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase text-[var(--text-muted)] dark:text-[var(--text-secondary)]">
              <ClipboardCheck className="h-4 w-4" />
              首次运行检查清单
            </div>
            <div className="mt-4 space-y-2">
              {firstRunSteps.slice(0, 3).map((step) => (
                <button
                  key={step.label}
                  type="button"
                  onClick={() => {
                    if (step.label === 'Gateway') void startGateway();
                    else navigate(step.route);
                  }}
                  className="focus-ring flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-[var(--surface-hover)] dark:hover:bg-[var(--surface-hover)]"
                >
                  {step.done ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <Circle className="h-4 w-4 text-[var(--text-muted)]" />}
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]">{step.title}</span>
                  <ArrowRight className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SurfaceCard className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase text-[var(--text-muted)] dark:text-[var(--text-muted)]">Gateway</p>
              <h2 className="mt-1 text-lg font-bold text-[var(--text-primary)] dark:text-[var(--text-primary)]">
                {gatewayOnline ? '在线' : '离线'}
              </h2>
              <p className="mt-1 text-xs text-[var(--text-secondary)] dark:text-[var(--text-secondary)]">
                {gatewayStatus?.baseUrl ?? 'http://127.0.0.1:8317'}
              </p>
            </div>
            <span className={`rounded-full px-2 py-1 text-xs font-semibold ${gatewayOnline ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300' : 'bg-amber-500/15 text-amber-600 dark:text-amber-300'}`}>
              {gatewayOnline ? '就绪' : '需要启动'}
            </span>
          </div>
          {!gatewayOnline && (
            <button
              type="button"
              onClick={() => void startGateway()}
              className="focus-ring mt-3 inline-flex min-h-[36px] items-center gap-2 rounded-lg border border-[var(--border)] px-3 py-2 text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-hover)] dark:text-[var(--text-primary)] dark:hover:bg-[var(--surface-hover)]"
              disabled={gatewayBusy}
            >
              <PlayCircle className="h-3.5 w-3.5" />
              {gatewayBusy ? '启动中' : '启动 Gateway'}
            </button>
          )}
        </SurfaceCard>

        <SurfaceCard className="p-4">
          <p className="text-xs font-semibold uppercase text-[var(--text-muted)] dark:text-[var(--text-muted)]">默认 Provider</p>
          <h2 className="mt-1 truncate text-lg font-bold text-[var(--text-primary)] dark:text-[var(--text-primary)]">
            {activeProviderRecord?.providerName || '未选择'}
          </h2>
          <p className="mt-1 truncate text-xs text-[var(--text-secondary)] dark:text-[var(--text-secondary)]">
            {activeProvider.model || activeProviderRecord?.modelName || '请在 Provider 中心选择模型'}
          </p>
        </SurfaceCard>

        <SurfaceCard className="p-4">
          <p className="text-xs font-semibold uppercase text-[var(--text-muted)] dark:text-[var(--text-muted)]">今日 Token</p>
          <h2 className="mt-1 text-lg font-bold tabular-nums text-[var(--text-primary)] dark:text-[var(--text-primary)]">
            {usageSummary?.totalTokens ?? 0}
          </h2>
          <p className="mt-1 text-xs text-[var(--text-secondary)] dark:text-[var(--text-secondary)]">
            {usageSummary?.todayRequests ?? 0} 次请求 / 失败率 {Math.round((usageSummary?.failureRate ?? 0) * 100)}%
          </p>
        </SurfaceCard>

        <SurfaceCard className="p-4">
          <p className="text-xs font-semibold uppercase text-[var(--text-muted)] dark:text-[var(--text-muted)]">健康状态</p>
          <h2 className="mt-1 text-lg font-bold text-[var(--text-primary)] dark:text-[var(--text-primary)]">{providerHealth}</h2>
          <p className="mt-1 truncate text-xs text-[var(--text-secondary)] dark:text-[var(--text-secondary)]">
            最近失败：{recentFailure}
          </p>
        </SurfaceCard>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
        <StatCard icon={FolderKanban} label="项目" value={projects.length} color="blue" onClick={() => navigate('/projects')} />
        <StatCard icon={CheckSquare} label="任务" value={tasks.length} color="emerald" onClick={() => navigate('/projects')} />
        <StatCard icon={Wand2} label="Prompt" value={prompts.length} color="purple" onClick={() => navigate('/prompts')} />
        <StatCard icon={Shield} label="安全检查" value={riskCount} color="amber" onClick={() => navigate('/safety')} />
        <StatCard icon={Brain} label="记忆" value={memories.length} color="pink" onClick={() => navigate('/memory')} />
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-6">
        {quickActions.map((action) => (
          <button
            key={action.label}
            type="button"
            onClick={() => navigate(action.route)}
            className="focus-ring flex min-h-[76px] items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-left  transition-colors hover:bg-[var(--surface-hover)] dark:hover:bg-[var(--surface-hover)]"
          >
            <action.icon className={`h-5 w-5 shrink-0 ${action.tone}`} />
            <span className="min-w-0 text-sm font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]">{action.label}</span>
          </button>
        ))}
      </div>

      <SurfaceCard className="p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]">Nexus 路径</h2>
            <p className="mt-1 text-sm text-[var(--text-secondary)] dark:text-[var(--text-secondary)]">
              从最初想法到可恢复 Agent 交接的实用路径。
            </p>
          </div>
          <span className="text-xs font-medium text-[var(--text-muted)] dark:text-[var(--text-muted)]">本地数据、明确交接、更安全执行</span>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3 xl:grid-cols-6">
          {firstRunSteps.map((step) => (
            <button
              key={step.label}
              type="button"
              onClick={() => navigate(step.route)}
              className="focus-ring min-h-[176px] rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] p-4 text-left transition-colors hover:bg-[var(--surface-hover)] dark:bg-[var(--surface-muted)] dark:hover:bg-[var(--surface-hover)]"
            >
              <div className="flex items-center justify-between">
                <step.icon className="h-5 w-5 text-accent-500" />
                {step.done ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <Circle className="h-4 w-4 text-[var(--text-muted)]" />}
              </div>
              <div className="mt-4 text-[11px] font-semibold uppercase text-[var(--text-muted)] dark:text-[var(--text-muted)]">{step.label}</div>
              <h3 className="mt-1 text-sm font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]">{step.title}</h3>
              <p className="mt-2 text-xs leading-5 text-[var(--text-secondary)] dark:text-[var(--text-secondary)]">{step.body}</p>
            </button>
          ))}
        </div>
      </SurfaceCard>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SurfaceCard className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]">
              <FolderKanban className="h-4 w-4 text-blue-500" />
              最近项目
            </h2>
            <button type="button" onClick={() => navigate('/projects')} className="text-xs font-semibold text-accent-600 dark:text-accent-300">
              查看全部
            </button>
          </div>
          {recentProjects.length > 0 ? (
            <div className="space-y-2">
              {recentProjects.map((project) => (
                <button
                  key={project.id}
                  type="button"
                  onClick={() => navigate(`/projects/${project.id}`)}
                  className="focus-ring w-full rounded-lg border border-transparent bg-[var(--surface-muted)] p-3 text-left transition-colors hover:border-[var(--border)] hover:bg-[var(--surface-hover)] dark:bg-[var(--surface-muted)] dark:hover:bg-[var(--surface-hover)]"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="min-w-0 truncate text-sm font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]">{project.name}</span>
                    <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${statusClass[project.status] || statusClass.done}`}>
                      {statusLabel[project.status] || project.status}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-[var(--text-secondary)] dark:text-[var(--text-secondary)]">{truncate(project.idea, 96)}</p>
                  <p className="mt-2 text-[11px] text-[var(--text-muted)] dark:text-[var(--text-muted)]">{formatRelativeDate(project.updatedAt)}</p>
                </button>
              ))}
            </div>
          ) : (
            <EmptyState icon={FolderKanban} title="暂无项目" description="创建项目后再构建可恢复的 AI Workflow。" actionLabel="创建项目" onAction={() => navigate('/projects')} />
          )}
        </SurfaceCard>

        <SurfaceCard className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]">
              <Wand2 className="h-4 w-4 text-violet-500" />
              最近 Prompt
            </h2>
            <button type="button" onClick={() => navigate('/prompts')} className="text-xs font-semibold text-accent-600 dark:text-accent-300">
              打开实验室
            </button>
          </div>
          {recentPrompts.length > 0 ? (
            <div className="space-y-2">
              {recentPrompts.map((prompt) => (
                <button
                  key={prompt.id}
                  type="button"
                  onClick={() => navigate('/prompts')}
                  className="focus-ring flex w-full items-center gap-3 rounded-lg border border-transparent bg-[var(--surface-muted)] p-3 text-left transition-colors hover:border-[var(--border)] hover:bg-[var(--surface-hover)] dark:bg-[var(--surface-muted)] dark:hover:bg-[var(--surface-hover)]"
                >
                  <Database className="h-4 w-4 shrink-0 text-violet-500" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]">{prompt.name || prompt.title || '未命名 Prompt'}</div>
                    <div className="mt-0.5 truncate text-xs text-[var(--text-secondary)] dark:text-[var(--text-secondary)]">{truncate(prompt.content, 84)}</div>
                  </div>
                  {(prompt.starred || prompt.favorite) && <Sparkles className="h-4 w-4 shrink-0 text-amber-500" />}
                </button>
              ))}
            </div>
          ) : (
            <EmptyState icon={Wand2} title="暂无已保存 Prompt" description="使用 Prompt Lab 把任务转换为可复用的 Agent 交接。" actionLabel="打开 Prompt Lab" onAction={() => navigate('/prompts')} />
          )}
        </SurfaceCard>
      </div>

      <p className="pb-2 text-center text-xs text-[var(--text-muted)] dark:text-[var(--text-muted)]">
        LocalAI Nexus {apiAvailable ? '' : '- 演示模式'}
      </p>
    </div>
  );
}
