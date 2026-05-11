import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
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
  Trash2,
  X,
} from 'lucide-react';
import { api } from '../lib/api';
import { Badge, Button, EmptyState, SurfaceCard, Input, Modal, Textarea } from '../components/';
import type { Difficulty, Platform, Project, ProjectStatus } from '../lib/types';
import { classNames, formatRelativeDate, generateId, truncate } from '../lib/utils';

const DEMO_PROJECTS: Project[] = [
  {
    id: 'demo-1',
    name: 'Local coding cockpit',
    idea: 'Coordinate agents, prompts, logs, git context, and memory from a compact desktop surface.',
    platform: 'Desktop',
    techStack: 'Electron, React, TypeScript',
    uiStyle: 'Compact configuration tool',
    difficulty: 'Medium',
    status: 'active',
    createdAt: new Date(Date.now() - 7 * 864e5).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'demo-2',
    name: 'Provider switchboard',
    idea: 'Track model providers, gateway status, masked secrets, and health diagnostics.',
    platform: 'Desktop',
    techStack: 'Node.js, Electron IPC',
    uiStyle: 'Dense admin panel',
    difficulty: 'Hard',
    status: 'planning',
    createdAt: new Date(Date.now() - 3 * 864e5).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'demo-3',
    name: 'Memory recovery kit',
    idea: 'Capture decisions and fixes so another model can resume work without losing context.',
    platform: 'Web',
    techStack: 'React, JSON storage',
    uiStyle: 'Clean knowledge hub',
    difficulty: 'Medium',
    status: 'done',
    createdAt: new Date(Date.now() - 14 * 864e5).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 864e5).toISOString(),
  },
];

const PLATFORMS: Platform[] = ['Web', 'Desktop', 'CLI', 'Mobile', 'Embedded', 'Other'];
const DIFFICULTIES: Difficulty[] = ['Easy', 'Medium', 'Hard'];
const STATUSES: { value: ProjectStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'planning', label: 'Planning' },
  { value: 'active', label: 'Active' },
  { value: 'paused', label: 'Paused' },
  { value: 'done', label: 'Done' },
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

const getCreateError = (value: unknown) => {
  if (!value || typeof value !== 'object' || !('error' in value)) return null;
  const error = (value as { error?: unknown }).error;
  return typeof error === 'string' && error.trim() ? error : 'Project create failed';
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
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);
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
      console.error('Projects fetch error:', err);
      setApiAvailable(false);
      setProjects(DEMO_PROJECTS);
      setError(err instanceof Error ? err.message : 'Project data bridge is unavailable.');
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
    if (!form.name.trim()) errors.name = 'Project name is required.';
    if (!form.idea.trim()) errors.idea = 'Project goal is required.';
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
      const createError = getCreateError(createdProject);
      if (createError) throw new Error(createError);
      const savedProject = isProject(createdProject) ? createdProject : newProject;
      setProjects((prev) => [savedProject, ...prev]);
      resetForm();
      setShowNewModal(false);
      navigate(`/projects/${savedProject.id}?next=plan`, {
        state: { highlightPlan: true, project: savedProject },
      });
    } catch (err: unknown) {
      setFormErrors({ _form: err instanceof Error ? err.message : 'Project create failed.' });
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
      setFormErrors({ _form: err instanceof Error ? err.message : 'Project update failed.' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      if (api && typeof api.projects?.delete === 'function') {
        await api.projects.delete(deleteTarget.id);
      }
      setProjects((prev) => prev.filter((project) => project.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err: unknown) {
      console.error('Delete error:', err);
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
        label="Project name *"
        value={form.name}
        onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
        placeholder="e.g. Provider switchboard"
        error={formErrors.name}
      />

      <Textarea
        label="Goal *"
        value={form.idea}
        onChange={(event) => setForm((current) => ({ ...current, idea: event.target.value }))}
        placeholder="Describe the project goal, constraints, and expected outcome."
        rows={4}
        error={formErrors.idea}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
            Platform
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
            Difficulty
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
          label="Tech stack"
          value={form.techStack}
          onChange={(event) => setForm((current) => ({ ...current, techStack: event.target.value }))}
          placeholder="React, Node.js, Python"
        />
        <Input
          label="UI direction"
          value={form.uiStyle}
          onChange={(event) => setForm((current) => ({ ...current, uiStyle: event.target.value }))}
          placeholder="Compact desktop tool"
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
          <h2 className="mb-2 text-lg font-semibold text-[var(--text-primary)]">Projects failed to load</h2>
          <p className="mb-4 text-sm text-[var(--text-secondary)]">{error}</p>
          <Button onClick={() => void fetchProjects()} icon={<RefreshCw className="h-4 w-4" />}>
            Retry
          </Button>
        </SurfaceCard>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-5 p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">Projects</h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            {filtered.length} of {projects.length} projects. Start here, then configure agents and workflows.
          </p>
        </div>
        <Button onClick={openNew} icon={<Plus className="h-4 w-4" />}>
          New project
        </Button>
      </div>

      {!apiAvailable && (
        <div className="rounded-panel border border-[var(--warning)] bg-[var(--warning-muted)] px-3 py-2 text-sm text-[var(--warning)]">
          Demo data is shown because the desktop data bridge is unavailable in this session.
        </div>
      )}

      <SurfaceCard padding="md">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search projects, goals, or stack..."
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
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        setDeleteTarget(project);
                      }}
                      className="focus-ring rounded-tool p-1.5 text-[var(--text-muted)] hover:bg-[var(--danger-muted)] hover:text-[var(--danger)]"
                      aria-label={`删除 ${project.name}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
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
                : '先创建项目定义目标，再配置 Agent 和 Workflow。'
            }
            actionLabel="新建项目"
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

      <Modal open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} title="删除项目" size="sm">
        <div className="py-3 text-center">
          <Trash2 className="mx-auto mb-3 h-10 w-10 text-[var(--danger)]" />
          <p className="mb-1 font-medium text-[var(--text-primary)]">删除“{deleteTarget?.name}”？</p>
          <p className="text-sm text-[var(--text-secondary)]">
            这会从本地存储移除该项目，相关任务和记忆可能变成孤立记录。
          </p>
        </div>
        <div className="mt-4 flex justify-center gap-3 border-t border-[var(--border)] pt-4">
          <Button variant="ghost" onClick={() => setDeleteTarget(null)}>
            取消
          </Button>
          <Button variant="danger" onClick={handleDelete} icon={<Trash2 className="h-4 w-4" />}>
            删除
          </Button>
        </div>
      </Modal>
    </div>
  );
}
