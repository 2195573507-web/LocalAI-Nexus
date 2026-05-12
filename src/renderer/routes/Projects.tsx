import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  Archive,
  Clock,
  Cpu,
  FolderKanban,
  Globe,
  Layers,
  Monitor,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Smartphone,
  Terminal,
  X,
} from 'lucide-react';
import { api } from '../lib/api';
import { Badge, Button, EmptyState, Input, Modal, SurfaceCard, Textarea } from '../components/';
import type { Difficulty, Platform, Project, ProjectStatus } from '../lib/types';
import { classNames, formatRelativeDate, generateId, truncate } from '../lib/utils';

const DEMO_PROJECTS: Project[] = [
  {
    id: 'demo-1',
    name: '1 分钟上手示例',
    idea: '打开项目、创建演示 Agent、运行示例 Workflow，并查看一次完整本地模拟结果。',
    platform: 'Desktop',
    techStack: 'LocalAI Nexus, Demo Agent, Beginner Workflow',
    uiStyle: '紧凑桌面工作台',
    difficulty: 'Medium',
    status: 'active',
    createdAt: new Date(Date.now() - 7 * 864e5).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'demo-2',
    name: 'Provider 切换练习',
    idea: '添加本地或云端 Provider，检查健康状态，并让 Workflow 使用默认模型。',
    platform: 'Desktop',
    techStack: 'Provider Preset, Gateway, Health Monitor',
    uiStyle: '配置型控制台',
    difficulty: 'Hard',
    status: 'planning',
    createdAt: new Date(Date.now() - 3 * 864e5).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'demo-3',
    name: '记忆恢复工具包',
    idea: '保存决策、修复和交接上下文，让下一个模型可以直接接手。',
    platform: 'Web',
    techStack: 'React, JSON storage',
    uiStyle: '知识管理界面',
    difficulty: 'Medium',
    status: 'done',
    createdAt: new Date(Date.now() - 14 * 864e5).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 864e5).toISOString(),
  },
];

const PLATFORMS: Platform[] = ['Web', 'Desktop', 'CLI', 'Mobile', 'Embedded', 'Other'];
const DIFFICULTIES: Difficulty[] = ['Easy', 'Medium', 'Hard'];
const STATUSES: { value: ProjectStatus | 'all'; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'planning', label: '规划中' },
  { value: 'active', label: '进行中' },
  { value: 'paused', label: '已暂停' },
  { value: 'done', label: '已完成' },
  { value: 'archived', label: '已归档' },
];

const PLATFORM_LABELS: Record<Platform, string> = {
  Web: 'Web',
  Desktop: 'Desktop',
  CLI: 'CLI',
  Mobile: 'Mobile',
  Embedded: 'Embedded',
  Other: 'Other',
};

const PlatformIcon: Record<Platform, React.ComponentType<{ className?: string }>> = {
  Web: Globe,
  Desktop: Monitor,
  CLI: Terminal,
  Mobile: Smartphone,
  Embedded: Cpu,
  Other: Layers,
};

const statusVariant: Record<ProjectStatus, 'default' | 'success' | 'warning' | 'info'> = {
  planning: 'info',
  active: 'success',
  paused: 'warning',
  done: 'default',
  archived: 'default',
};

const difficultyVariant: Record<Difficulty, 'default' | 'success' | 'warning' | 'danger'> = {
  Easy: 'success',
  Medium: 'warning',
  Hard: 'danger',
};

const isProject = (value: unknown): value is Project =>
  Boolean(
    value &&
      typeof value === 'object' &&
      typeof (value as Project).id === 'string' &&
      typeof (value as Project).name === 'string' &&
      typeof (value as Project).idea === 'string',
  );

const getApiError = (value: unknown, fallback: string) => {
  if (!value || typeof value !== 'object' || !('error' in value)) return null;
  const error = (value as { error?: unknown }).error;
  return typeof error === 'string' && error.trim() ? error : fallback;
};

export default function Projects() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [apiAvailable, setApiAvailable] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | 'all'>('all');
  const [showNewModal, setShowNewModal] = useState(false);
  const [archiveTarget, setArchiveTarget] = useState<Project | null>(null);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [form, setForm] = useState({
    name: '',
    idea: '',
    platform: 'Web' as Platform,
    techStack: '',
    uiStyle: '',
    difficulty: 'Medium' as Difficulty,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (!api || typeof api.projects?.list !== 'function') {
        setApiAvailable(false);
        setProjects(DEMO_PROJECTS);
        return;
      }
      const data = await api.projects.list();
      setApiAvailable(true);
      setProjects(Array.isArray(data) ? data : []);
    } catch (err: unknown) {
      setApiAvailable(false);
      setProjects(DEMO_PROJECTS);
      setError(err instanceof Error ? err.message : '项目数据桥不可用。');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchProjects();
  }, [fetchProjects]);

  const filtered = useMemo(() => {
    return projects.filter((project) => {
      const q = search.trim().toLowerCase();
      const matchesSearch =
        !q ||
        project.name.toLowerCase().includes(q) ||
        project.idea.toLowerCase().includes(q) ||
        project.techStack?.toLowerCase().includes(q);
      const matchesStatus = statusFilter === 'all' || project.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [projects, search, statusFilter]);

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!form.name.trim()) errors.name = '请填写项目名称。';
    if (!form.idea.trim()) errors.idea = '请写一句项目目标，方便 Agent 知道要做什么。';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const resetForm = () => {
    setForm({ name: '', idea: '', platform: 'Web', techStack: '', uiStyle: '', difficulty: 'Medium' });
    setFormErrors({});
  };

  const handleCreate = async () => {
    if (!validateForm()) return;
    setSaving(true);
    try {
      const newProject: Project = {
        id: generateId(),
        name: form.name.trim(),
        idea: form.idea.trim(),
        platform: form.platform,
        techStack: form.techStack.trim(),
        uiStyle: form.uiStyle.trim(),
        difficulty: form.difficulty,
        status: 'planning',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const createdProject =
        api && typeof api.projects?.create === 'function'
          ? await api.projects.create(newProject)
          : newProject;
      const createError = getApiError(createdProject, '项目创建失败。');
      if (createError) throw new Error(createError);
      const savedProject = isProject(createdProject) ? createdProject : newProject;
      setProjects((prev) => [savedProject, ...prev]);
      resetForm();
      setShowNewModal(false);
      navigate(`/projects/${savedProject.id}?next=plan`, {
        state: { highlightPlan: true, project: savedProject },
      });
    } catch (err: unknown) {
      setFormErrors({ _form: err instanceof Error ? err.message : '项目创建失败。' });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingProject || !validateForm()) return;
    setSaving(true);
    try {
      const updated: Project = {
        ...editingProject,
        name: form.name.trim(),
        idea: form.idea.trim(),
        platform: form.platform,
        techStack: form.techStack.trim(),
        uiStyle: form.uiStyle.trim(),
        difficulty: form.difficulty,
        updatedAt: new Date().toISOString(),
      };
      if (api && typeof api.projects?.update === 'function') {
        await api.projects.update(updated);
      }
      setProjects((prev) => prev.map((project) => (project.id === updated.id ? updated : project)));
      resetForm();
      setEditingProject(null);
    } catch (err: unknown) {
      setFormErrors({ _form: err instanceof Error ? err.message : '项目更新失败。' });
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async () => {
    if (!archiveTarget) return;
    try {
      if (api && typeof api.projects?.delete === 'function') {
        await api.projects.delete(archiveTarget.id);
      }
      setProjects((prev) =>
        prev.map((project) =>
          project.id === archiveTarget.id
            ? {
                ...project,
                status: 'archived',
                archivedAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              }
            : project,
        ),
      );
      setArchiveTarget(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '项目归档失败。');
    }
  };

  const openEdit = (project: Project) => {
    setEditingProject(project);
    setForm({
      name: project.name,
      idea: project.idea,
      platform: project.platform,
      techStack: project.techStack || '',
      uiStyle: project.uiStyle || '',
      difficulty: project.difficulty,
    });
    setFormErrors({});
  };

  const openNew = () => {
    resetForm();
    setEditingProject(null);
    setShowNewModal(true);
  };

  const renderFormFields = () => (
    <div className="space-y-4">
      {formErrors._form && (
        <div className="rounded-panel border border-[var(--danger)] bg-[var(--danger-muted)] px-3 py-2 text-sm text-[var(--danger)]">
          {formErrors._form}
        </div>
      )}

      <Input
        label="项目名称 *"
        value={form.name}
        onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
        placeholder="例如：我的第一个 AI 项目"
        error={formErrors.name}
      />

      <Textarea
        label="目标 *"
        value={form.idea}
        onChange={(event) => setForm((current) => ({ ...current, idea: event.target.value }))}
        placeholder="用一句话说明要做什么、给谁用、希望得到什么结果。"
        rows={4}
        error={formErrors.idea}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
            平台
          </span>
          <select
            value={form.platform}
            onChange={(event) => setForm((current) => ({ ...current, platform: event.target.value as Platform }))}
            className="control-input"
          >
            {PLATFORMS.map((platform) => (
              <option key={platform} value={platform}>
                {PLATFORM_LABELS[platform]}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
            难度
          </span>
          <select
            value={form.difficulty}
            onChange={(event) => setForm((current) => ({ ...current, difficulty: event.target.value as Difficulty }))}
            className="control-input"
          >
            {DIFFICULTIES.map((difficulty) => (
              <option key={difficulty} value={difficulty}>
                {difficulty}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          label="技术栈"
          value={form.techStack}
          onChange={(event) => setForm((current) => ({ ...current, techStack: event.target.value }))}
          placeholder="React, Node.js, Python"
        />
        <Input
          label="界面方向"
          value={form.uiStyle}
          onChange={(event) => setForm((current) => ({ ...current, uiStyle: event.target.value }))}
          placeholder="紧凑桌面工具"
        />
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl space-y-5 p-5 animate-pulse">
        <div className="h-10 w-56 rounded-panel bg-[var(--surface-muted)]" />
        <div className="h-12 rounded-panel bg-[var(--surface-muted)]" />
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-44 rounded-panel bg-[var(--surface-muted)]" />
          ))}
        </div>
      </div>
    );
  }

  if (error && projects.length === 0) {
    return (
      <div className="mx-auto max-w-7xl p-5">
        <SurfaceCard className="p-8 text-center">
          <AlertTriangle className="mx-auto mb-3 h-10 w-10 text-[var(--danger)]" />
          <h2 className="mb-2 text-lg font-semibold text-[var(--text-primary)]">项目加载失败</h2>
          <p className="mb-4 text-sm text-[var(--text-secondary)]">{error}</p>
          <Button onClick={() => void fetchProjects()} icon={<RefreshCw className="h-4 w-4" />}>
            重试
          </Button>
        </SurfaceCard>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-5 p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">项目</h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            共 {projects.length} 个项目，当前显示 {filtered.length} 个。先打开示例或新建项目，再配置 Agent 和 Workflow。
          </p>
        </div>
        <Button onClick={openNew} icon={<Plus className="h-4 w-4" />}>
          创建第一个项目
        </Button>
      </div>

      {!apiAvailable && (
        <div className="rounded-panel border border-[var(--warning)] bg-[var(--warning-muted)] px-3 py-2 text-sm text-[var(--warning)]">
          当前显示演示数据，因为本次会话无法访问桌面数据桥。
        </div>
      )}

      {error && projects.length > 0 && (
        <div className="rounded-panel border border-[var(--danger)] bg-[var(--danger-muted)] px-3 py-2 text-sm text-[var(--danger)]">
          {error}
        </div>
      )}

      <SurfaceCard padding="md">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="搜索项目、目标或技术栈..."
              className="control-input pl-9 pr-9"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="focus-ring absolute right-2 top-1/2 -translate-y-1/2 rounded-tool p-1 text-[var(--text-muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]"
                aria-label="清空搜索"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {STATUSES.map((status) => (
              <button
                key={status.value}
                type="button"
                onClick={() => setStatusFilter(status.value)}
                className={classNames(
                  'focus-ring rounded-tool border px-3 py-2 text-xs font-semibold transition-colors',
                  statusFilter === status.value
                    ? 'border-[var(--accent)] bg-[var(--accent-muted)] text-[var(--accent)]'
                    : 'border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]',
                )}
              >
                {status.label}
              </button>
            ))}
          </div>
        </div>
      </SurfaceCard>

      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((project) => {
            const PIcon = PlatformIcon[project.platform] || Layers;
            return (
              <SurfaceCard
                key={project.id}
                className="group p-4"
                hoverable
                onClick={() => navigate(`/projects/${project.id}`)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <PIcon className="h-4 w-4 shrink-0 text-[var(--accent)]" />
                      <h3 className="truncate text-sm font-semibold text-[var(--text-primary)]">{project.name}</h3>
                    </div>
                    <p className="mt-2 min-h-[40px] text-xs leading-5 text-[var(--text-secondary)]">
                      {truncate(project.idea, 132)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        openEdit(project);
                      }}
                      className="focus-ring rounded-tool p-1.5 text-[var(--text-muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]"
                      aria-label={`编辑 ${project.name}`}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    {project.status !== 'archived' && (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          setArchiveTarget(project);
                        }}
                        className="focus-ring rounded-tool p-1.5 text-[var(--text-muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]"
                        aria-label={`归档 ${project.name}`}
                      >
                        <Archive className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Badge variant={statusVariant[project.status] ?? 'default'} dot>
                    {STATUSES.find((status) => status.value === project.status)?.label || project.status}
                  </Badge>
                  <Badge variant="default" icon={<PIcon className="h-3 w-3" />}>
                    {PLATFORM_LABELS[project.platform] ?? project.platform}
                  </Badge>
                  <Badge variant={difficultyVariant[project.difficulty] ?? 'default'}>
                    {project.difficulty}
                  </Badge>
                </div>

                <div className="mt-3 border-t border-[var(--border)] pt-3">
                  <p className="truncate text-xs text-[var(--text-muted)]">{project.techStack || '未设置技术栈'}</p>
                  <div className="mt-2 flex items-center gap-1 text-[11px] text-[var(--text-muted)]">
                    <Clock className="h-3 w-3" />
                    {formatRelativeDate(project.updatedAt || project.createdAt)}
                  </div>
                </div>
              </SurfaceCard>
            );
          })}
        </div>
      ) : (
        <SurfaceCard className="p-8">
          <EmptyState
            icon={FolderKanban}
            title={search || statusFilter !== 'all' ? '没有匹配项目' : '暂无项目'}
            description={
              search || statusFilter !== 'all'
                ? '调整搜索词或状态筛选，查找其他项目。'
                : '项目是 LocalAI Nexus 的起点。先定义目标，然后创建 Agent、运行 Workflow、保存 Prompt 和 Memory。'
            }
            actionLabel="创建第一个项目"
            onAction={openNew}
          />
        </SurfaceCard>
      )}

      <Modal
        open={showNewModal || Boolean(editingProject)}
        onClose={() => {
          setShowNewModal(false);
          setEditingProject(null);
          resetForm();
        }}
        title={editingProject ? '编辑项目' : '新建项目'}
        size="md"
      >
        {renderFormFields()}
        <div className="mt-6 flex justify-end gap-3 border-t border-[var(--border)] pt-4">
          <Button
            variant="ghost"
            onClick={() => {
              setShowNewModal(false);
              setEditingProject(null);
              resetForm();
            }}
          >
            取消
          </Button>
          <Button
            onClick={editingProject ? handleUpdate : handleCreate}
            loading={saving}
            icon={editingProject ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          >
            {editingProject ? '保存修改' : '创建项目'}
          </Button>
        </div>
      </Modal>

      <Modal open={Boolean(archiveTarget)} onClose={() => setArchiveTarget(null)} title="归档项目" size="sm">
        <div className="py-3 text-center">
          <Archive className="mx-auto mb-3 h-10 w-10 text-[var(--text-muted)]" />
          <p className="mb-1 font-medium text-[var(--text-primary)]">归档“{archiveTarget?.name}”？</p>
          <p className="text-sm text-[var(--text-secondary)]">
            项目记录会保留在本地存储中，并标记为已归档；相关任务、记忆和运行记录不会被删除。
          </p>
        </div>
        <div className="mt-4 flex justify-center gap-3 border-t border-[var(--border)] pt-4">
          <Button variant="ghost" onClick={() => setArchiveTarget(null)}>
            取消
          </Button>
          <Button variant="secondary" onClick={handleArchive} icon={<Archive className="h-4 w-4" />}>
            归档
          </Button>
        </div>
      </Modal>
    </div>
  );
}
