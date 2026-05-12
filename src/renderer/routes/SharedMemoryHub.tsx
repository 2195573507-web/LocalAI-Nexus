import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Brain,
  Search,
  Plus,
  Download,
  Upload,
  Sparkles,
  Copy,
  Check,
  Pencil,
  Trash2,
  Archive,
  RotateCcw,
  Star,
  X,
  Filter,
  ChevronDown,
  AlertTriangle,
  RefreshCw,
  Clock,
  Tag,
  FolderKanban,
  Layers,
  Cpu,
  Globe,
  Database,
  FileJson,
  FileText,
  EyeOff,
  Zap,
  CheckCircle,
  AlertCircle,
  MoreHorizontal,
  Import,
} from 'lucide-react';
import { api } from '../lib/api';
import { retrieveMemories } from '../lib/memoryRetriever';
import { generateSharedMemoryContext } from '../lib/memoryInjection';
import { injectMemoryIntoPrompt } from '../lib/memoryInjection';
import { containsSecret, redactSecrets } from '../lib/secretRedaction';
import { exportMemoriesToMarkdown, exportJSON } from '../lib/exporters';
import { SurfaceCard, EmptyState, Button, Input, Textarea, Badge, Modal } from '../components/';
import type {
  Memory,
  MemoryType,
  MemoryStatus,
  MemoryInjectionMode,
  NexusContextPackPreview,
  NexusKnowledgeDocumentPreview,
  NexusKnowledgeRetrievalResult,
  NexusRecoveryPack,
  Project,
} from '../lib/types';
import { generateId, formatRelativeDate, copyToClipboard, classNames, truncate } from '../lib/utils';

// ── Demo data ──────────────────────────────────────────────────────────────
const DEMO_MEMORIES: Memory[] = [
  {
    id: 'm1', type: 'project_context', title: '1 分钟上手示例目标',
    content: '项目目标：打开示例项目，创建新手演示 Agent，运行示例 Workflow，并在 Trace 中看到一次完整本地模拟结果。',
    tags: ['onboarding', 'demo', 'project'],
    importance: 5, status: 'active',
    projectId: 'demo-1',
    lastUsedAt: new Date(Date.now() - 2 * 3600e3).toISOString(),
    createdAt: new Date(Date.now() - 7 * 864e5).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'm2', type: 'decision', title: '首次运行先用本地演示',
    content: '决策：新用户不需要先配置 API Key。先用内置示例跑通项目、Agent、Workflow、Prompt 和 Memory，再配置真实 Provider。',
    tags: ['beginner', 'provider', 'decision'],
    importance: 4, status: 'active',
    projectId: 'demo-1',
    lastUsedAt: new Date(Date.now() - 8 * 3600e3).toISOString(),
    createdAt: new Date(Date.now() - 5 * 864e5).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'm3', type: 'prompt_pattern', title: '新手交接 Prompt 模式',
    content: 'Prompt 模式：说明项目目标、已有结果、下一步任务、验收标准和禁止事项。要求 Agent 输出修改文件、测试结果和下一轮建议。',
    tags: ['prompt', 'handoff', 'beginner'],
    importance: 5, status: 'active',
    lastUsedAt: new Date(Date.now() - 24 * 3600e3).toISOString(),
    createdAt: new Date(Date.now() - 3 * 864e5).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'm4', type: 'security', title: 'API Key 不写入 Memory',
    content: '安全规则：Provider API Key 只保存在本地 Provider 配置中；Prompt、日志、Memory 和导出文件只允许出现脱敏信息。',
    tags: ['security', 'provider', 'redaction'],
    importance: 5, status: 'active',
    projectId: 'demo-1',
    lastUsedAt: new Date(Date.now() - 5 * 3600e3).toISOString(),
    createdAt: new Date(Date.now() - 6 * 864e5).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'm5', type: 'knowledge', title: 'Workflow 运行结果怎么看',
    content: '运行示例 Workflow 后，先看状态提示，再看最近运行和 Timeline / Trace。Trace 会列出每个节点的输入、输出摘要和下一步。',
    tags: ['workflow', 'trace', 'result'],
    importance: 3, status: 'active',
    projectId: 'demo-1',
    lastUsedAt: new Date(Date.now() - 10 * 3600e3).toISOString(),
    createdAt: new Date(Date.now() - 8 * 864e5).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'm6', type: 'issue_fix', title: '空状态需要给下一步',
    content: '修复记录：项目、Agent、Workflow、Prompt、Memory 和 Settings 的空状态不能只显示空列表，必须说明用途、给示例，并提供下一步按钮。',
    tags: ['empty-state', 'ux', 'fix'],
    importance: 3, status: 'pending',
    projectId: 'demo-1',
    lastUsedAt: new Date(Date.now() - 1 * 864e5).toISOString(),
    createdAt: new Date(Date.now() - 1 * 864e5).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'm7', type: 'knowledge', title: '设置真实模型的顺序',
    content: '步骤：选择 Provider 预设，粘贴 API Key，测试连接，切换为当前 Provider，再回到 Workflow 运行真实模型。',
    tags: ['settings', 'provider', 'api-key'],
    importance: 4, status: 'active',
    lastUsedAt: new Date(Date.now() - 12 * 3600e3).toISOString(),
    createdAt: new Date(Date.now() - 10 * 864e5).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'm8', type: 'decision', title: '界面保持轻量 flat tool 风格',
    content: '决策：LocalAI Nexus 使用紧凑、清晰、低干扰的桌面工具界面。避免 heavy blur、大面积透明玻璃效果和装饰性动效。',
    tags: ['ui', 'flat-tool', 'decision'],
    importance: 3, status: 'archived',
    projectId: 'demo-1',
    lastUsedAt: new Date(Date.now() - 30 * 864e5).toISOString(),
    createdAt: new Date(Date.now() - 15 * 864e5).toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const DEMO_PROJECTS: Project[] = [
  { id: 'demo-1', name: '1 分钟上手示例', idea: '跑通项目、Agent、Workflow、Prompt 和 Memory。', platform: 'Desktop', techStack: 'LocalAI Nexus', uiStyle: 'Flat desktop tool', difficulty: 'Easy', status: 'active', createdAt: '', updatedAt: '' },
  { id: 'demo-2', name: 'Provider 配置练习', idea: '选择预设、填写 API Key、测试连接。', platform: 'Desktop', techStack: 'Provider Presets', uiStyle: 'Settings panel', difficulty: 'Easy', status: 'planning', createdAt: '', updatedAt: '' },
];

// ── Constants ──────────────────────────────────────────────────────────────
const MEMORY_TYPES: MemoryType[] = [
  'user_preference',
  'project_context',
  'decision',
  'issue_fix',
  'api_provider',
  'prompt_pattern',
  'environment',
  'pattern',
  'insight',
  'knowledge',
  'code_snippet',
  'security',
  'git_summary',
  'log_analysis',
  'safety_check',
];
const MEMORY_STATUSES: MemoryStatus[] = ['active', 'pending', 'archived'];
const INJECTION_MODES: MemoryInjectionMode[] = ['off', 'minimal', 'balanced', 'full'];
const MAX_IMPORT_BYTES = 2 * 1024 * 1024;

const MEMORY_TYPE_LABELS: Record<MemoryType, string> = {
  user_preference: '用户偏好',
  project_context: '项目上下文',
  decision: '决策',
  issue_fix: '问题修复',
  api_provider: 'API 配置',
  prompt_pattern: 'Prompt 模式',
  environment: '环境',
  pattern: '模式',
  insight: '洞察',
  knowledge: '知识',
  code_snippet: '代码片段',
  security: '安全',
  git_summary: 'Git 摘要',
  log_analysis: '日志分析',
  safety_check: '安全检查',
};

const MEMORY_STATUS_LABELS: Record<MemoryStatus, string> = {
  active: '进行中',
  pending: '待确认',
  archived: '已归档',
};

const INJECTION_MODE_LABELS: Record<MemoryInjectionMode, string> = {
  off: '关闭',
  minimal: '最小',
  balanced: '平衡',
  full: '完整',
};

const TYPE_COLORS: Record<string, string> = {
  decision: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  pattern: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  insight: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  knowledge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  code_snippet: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  security: 'bg-red-500/20 text-red-300 border-red-500/30',
  issue_fix: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
  user_preference: 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/30',
  project_context: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  api_provider: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
  prompt_pattern: 'bg-violet-500/20 text-violet-300 border-violet-500/30',
  environment: 'bg-lime-500/20 text-lime-300 border-lime-500/30',
  git_summary: 'bg-pink-500/20 text-pink-300 border-pink-500/30',
  log_analysis: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  safety_check: 'bg-green-500/20 text-green-300 border-green-500/30',
};

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  pending: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  archived: 'bg-[var(--surface-muted)] text-[var(--text-muted)] border-[var(--border)]',
};

function normalizeMemoryImportItem(item: Partial<Memory>): Memory {
  const now = new Date().toISOString();
  const rawTags = (item as { tags?: unknown }).tags;
  const tags = Array.isArray(rawTags)
    ? rawTags.map((tag) => String(tag).trim()).filter(Boolean).slice(0, 20)
    : typeof rawTags === 'string'
      ? rawTags.split(',').map((tag: string) => tag.trim()).filter(Boolean).slice(0, 20)
      : [];
  const type = MEMORY_TYPES.includes(item.type as MemoryType) ? item.type as MemoryType : 'knowledge';
  const status = MEMORY_STATUSES.includes(item.status as MemoryStatus) ? item.status as MemoryStatus : 'active';

  return {
    id: item.id ? String(item.id) : generateId(),
    type,
    title: String(item.title ?? '导入的记忆').slice(0, 160),
    content: typeof item.content === 'string' ? item.content : JSON.stringify(item.content ?? ''),
    tags,
    importance: Math.min(5, Math.max(1, Number(item.importance) || 3)),
    status,
    projectId: item.projectId ? String(item.projectId) : undefined,
    providerScope: item.providerScope ? String(item.providerScope) : undefined,
    modelScope: item.modelScope ? String(item.modelScope) : undefined,
    metadata: item.metadata && typeof item.metadata === 'object' ? item.metadata : undefined,
    lastUsedAt: item.lastUsedAt ? String(item.lastUsedAt) : now,
    createdAt: item.createdAt ? String(item.createdAt) : now,
    updatedAt: now,
  };
}

// ── Component ──────────────────────────────────────────────────────────────
export default function SharedMemoryHub() {
  // Data
  const [memories, setMemories] = useState<Memory[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [apiAvailable, setApiAvailable] = useState(true);

  // Search & filters
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingMemory, setEditingMemory] = useState<Memory | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Memory | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showContextModal, setShowContextModal] = useState(false);
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number; errors: string[] } | null>(null);

  // Form
  const [form, setForm] = useState({
    type: 'knowledge' as MemoryType,
    title: '',
    content: '',
    tags: '',
    projectId: '',
    providerScope: '',
    modelScope: '',
    importance: 3,
    status: 'active' as MemoryStatus,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  // Context generation
  const [contextInjectionMode, setContextInjectionMode] = useState<MemoryInjectionMode>('balanced');
  const [generatedContext, setGeneratedContext] = useState<string>('');
  const [contextPreview, setContextPreview] = useState<NexusContextPackPreview | null>(null);
  const [recoveryPack, setRecoveryPack] = useState<NexusRecoveryPack | null>(null);
  const [generatingContext, setGeneratingContext] = useState(false);
  const [copiedContext, setCopiedContext] = useState(false);
  const [knowledgeText, setKnowledgeText] = useState('Workflow trace output links every node result to Gateway trace IDs. api_key=sk-demo-secret should be redacted.');
  const [knowledgeQuery, setKnowledgeQuery] = useState('Workflow trace Gateway');
  const [knowledgePreview, setKnowledgePreview] = useState<NexusKnowledgeDocumentPreview | null>(null);
  const [knowledgeRetrieval, setKnowledgeRetrieval] = useState<NexusKnowledgeRetrievalResult | null>(null);
  const [knowledgeMessage, setKnowledgeMessage] = useState('');

  // UI state
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Fetch data ────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let mems: Memory[] = [];
      let projs: Project[] = [];

      if (api && typeof api.memory?.list === 'function') {
        mems = await api.memory.list();
      } else {
        setApiAvailable(false);
        mems = DEMO_MEMORIES;
      }

      if (api && typeof api.projects?.list === 'function') {
        projs = await api.projects.list();
      } else {
        projs = DEMO_PROJECTS;
      }

      setMemories(Array.isArray(mems) ? mems : DEMO_MEMORIES);
      setProjects(Array.isArray(projs) ? projs : DEMO_PROJECTS);
    } catch (err: any) {
      console.error('Memory fetch error:', err);
      setApiAvailable(false);
      setMemories(DEMO_MEMORIES);
      setProjects(DEMO_PROJECTS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Filtered memories ─────────────────────────────────────────────────
  const filteredMemories = useMemo(() => {
    return memories.filter((m) => {
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        m.title.toLowerCase().includes(q) ||
        m.content.toLowerCase().includes(q) ||
        (m.tags || []).some((t) => t.toLowerCase().includes(q));
      const matchType = typeFilter === 'all' || m.type === typeFilter;
      const matchProject = projectFilter === 'all' || m.projectId === projectFilter;
      const matchStatus = statusFilter === 'all' || m.status === statusFilter;
      return matchSearch && matchType && matchProject && matchStatus;
    });
  }, [memories, search, typeFilter, projectFilter, statusFilter]);

  const pendingMemories = useMemo(
    () => memories.filter((m) => m.status === 'pending'),
    [memories]
  );

  // ── Form handlers ─────────────────────────────────────────────────────
  const resetForm = () => {
    setForm({ type: 'knowledge', title: '', content: '', tags: '', projectId: '', providerScope: '', modelScope: '', importance: 3, status: 'active' });
    setFormErrors({});
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!form.title.trim()) errors.title = '标题不能为空';
    if (!form.content.trim()) errors.content = '内容不能为空';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreate = async () => {
    if (!validateForm()) return;
    setSaving(true);
    try {
      const memory: Memory = {
        id: generateId(),
        type: form.type,
        title: form.title.trim(),
        content: form.content.trim(),
        tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
        importance: form.importance,
        status: form.status,
        projectId: form.projectId || undefined,
        providerScope: form.providerScope || undefined,
        modelScope: form.modelScope || undefined,
        lastUsedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      if (api && typeof api.memory?.create === 'function') {
        await api.memory.create(memory);
      }

      setMemories((prev) => [memory, ...prev]);
      resetForm();
      setShowCreateModal(false);
    } catch { /* silently handle */ } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingMemory || !validateForm()) return;
    setSaving(true);
    try {
      const updated: Memory = {
        ...editingMemory,
        type: form.type,
        title: form.title.trim(),
        content: form.content.trim(),
        tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
        importance: form.importance,
        status: form.status,
        projectId: form.projectId || undefined,
        providerScope: form.providerScope || undefined,
        modelScope: form.modelScope || undefined,
        updatedAt: new Date().toISOString(),
      };

      if (api && typeof api.memory?.update === 'function') {
        await api.memory.update(updated);
      }

      setMemories((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
      resetForm();
      setEditingMemory(null);
    } catch { /* silently handle */ } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      if (api && typeof api.memory?.delete === 'function') {
        await api.memory.delete(deleteTarget.id);
      }
      setMemories((prev) => prev.filter((m) => m.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch {}
  };

  const handleToggleStatus = async (memory: Memory) => {
    const newStatus: MemoryStatus = memory.status === 'active' ? 'archived' : 'active';
    const updated = { ...memory, status: newStatus, updatedAt: new Date().toISOString() };

    if (api && typeof api.memory?.update === 'function') {
      try { await api.memory.update(updated); } catch {}
    }
    setMemories((prev) => prev.map((m) => (m.id === memory.id ? updated : m)));
  };

  const handleConfirmPending = async (memory: Memory) => {
    const updated = { ...memory, status: 'active' as MemoryStatus, updatedAt: new Date().toISOString() };
    if (api && typeof api.memory?.update === 'function') {
      try { await api.memory.update(updated); } catch {}
    }
    setMemories((prev) => prev.map((m) => (m.id === memory.id ? updated : m)));
  };

  const openEdit = (memory: Memory) => {
    setEditingMemory(memory);
    setForm({
      type: memory.type,
      title: memory.title,
      content: memory.content,
      tags: (memory.tags || []).join(', '),
      projectId: memory.projectId || '',
      providerScope: memory.providerScope || '',
      modelScope: memory.modelScope || '',
      importance: memory.importance,
      status: memory.status,
    });
    setFormErrors({});
  };

  // ── Export all as JSON ────────────────────────────────────────────────
  const handleExportJSON = async () => {
    try {
      // Redact secrets before export
      const redacted = memories.map((m) => {
        let content = m.content;
        if (containsSecret(content)) {
          content = redactSecrets(content);
        }
        return { ...m, content };
      });

      const json = JSON.stringify(redacted, null, 2);
      if (api && typeof api.export?.exportJSON === 'function') {
        await api.export.exportJSON(json, `memories_${Date.now()}.json`);
      } else {
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `memories_${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch {}
  };

  // ── Export current project as Markdown ────────────────────────────────
  const handleExportMarkdown = async () => {
    try {
      const md = exportMemoriesToMarkdown(memories, projectFilter !== 'all' ? projectFilter : undefined);
      if (api && typeof api.export?.exportMarkdown === 'function') {
        await api.export.exportMarkdown(md, `memories_project_${projectFilter}.md`);
      } else {
        const blob = new Blob([md], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `memories_${Date.now()}.md`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch {}
  };

  // ── Import JSON ───────────────────────────────────────────────────────
  const handleImportJSON = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      if (file.size > MAX_IMPORT_BYTES) {
        setImportResult({
          imported: 0,
          skipped: 1,
          errors: ['导入文件超过 2MB，请拆分后再导入。'],
        });
        e.target.value = '';
        return;
      }
      const text = await file.text();
      const data = JSON.parse(text);
      const items: Partial<Memory>[] = Array.isArray(data) ? data : [data];

      let imported = 0;
      let skipped = 0;
      const importErrors: string[] = [];

      for (const item of items) {
        // Skip secrets-only containers
        if (item.content && containsSecret(item.content)) {
          item.content = redactSecrets(item.content);
          // If after redaction the content is empty, skip
          if (!item.content || item.content.trim() === '[REDACTED]' || item.content.trim() === '') {
            skipped++;
            continue;
          }
        }

        // Skip items without meaningful content
        if (!item.title && !item.content) {
          skipped++;
          continue;
        }

        const memory = normalizeMemoryImportItem(item);

        if (api && typeof api.memory?.create === 'function') {
          try {
            await api.memory.create(memory);
          } catch {
            importErrors.push(`导入失败：${memory.title}`);
            continue;
          }
        }

        setMemories((prev) => {
          if (prev.find((m) => m.id === memory.id)) {
            return prev.map((m) => (m.id === memory.id ? memory : m));
          }
          return [memory, ...prev];
        });
        imported++;
      }

      setImportResult({ imported, skipped, errors: importErrors });
      e.target.value = '';
    } catch (err: any) {
      setImportResult({ imported: 0, skipped: 0, errors: [`解析失败：${err.message}`] });
    }

    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ── Context generation ────────────────────────────────────────────────
  const handleGenerateContext = async () => {
    setGeneratingContext(true);
    try {
      const activeMemories = memories.filter((m) => m.status === 'active');
      const context = generateSharedMemoryContext(activeMemories, contextInjectionMode);
      const projectName = projectFilter !== 'all'
        ? projects.find((project) => project.id === projectFilter)?.name ?? projectFilter
        : 'LocalAI Nexus';
      const recoveryPrompt = `# LocalAI Nexus 跨模型恢复上下文 Prompt

项目名：${projectName}
当前方案：LocalAI Nexus 桌面端主窗口
可用启动方式：桌面快捷方式或 npm.cmd run dev
已知限制：真实 Provider 运行需要用户配置 API Key；内置示例可本地模拟运行。
下一步：打开示例项目，运行示例 Workflow，保存结果到 Project Detail。

${context || '[Shared Memory Context]\\n- 项目背景：\\n  - 暂无记录\\n- 已做决策：\\n  - 暂无记录\\n- 当前进度：\\n  - 暂无记录\\n- 已知问题：\\n  - 暂无记录\\n- 用户偏好：\\n  - 暂无记录\\n- API Provider 注意事项：\\n  - 暂无记录\\n[/Shared Memory Context]'}`;

      setGeneratedContext(recoveryPrompt);
      const projectId = projectFilter !== 'all' ? projectFilter : undefined;
      const [previewResult, packResult] = await Promise.all([
        api.contextPack.preview({ projectId }).catch(() => null),
        api.contextPack.recoveryPack({ projectId }).catch(() => null),
      ]);
      if (previewResult && typeof previewResult === 'object' && !('error' in previewResult)) {
        setContextPreview(previewResult);
        setGeneratedContext(previewResult.prompt || recoveryPrompt);
      }
      if (packResult && typeof packResult === 'object' && !('error' in packResult)) {
        setRecoveryPack(packResult);
      }
    } catch (err) {
      console.error('Generate memory context failed:', err);
      setGeneratedContext('# 生成上下文失败\n\n请稍后重试。');
    } finally {
      setGeneratingContext(false);
    }
  };

  // ── Copy helper ───────────────────────────────────────────────────────
  const handleCopy = async (text: string, key: string) => {
    await copyToClipboard(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleKnowledgePreview = async () => {
    const preview = await api.knowledge.previewDocument({
      title: 'Local knowledge preview',
      content: knowledgeText,
    });
    if (preview && typeof preview === 'object' && 'error' in preview) {
      setKnowledgeMessage(preview.error);
      return;
    }
    setKnowledgePreview(preview);
    const retrieval = await api.knowledge.testRetrieval({
      query: knowledgeQuery,
      topK: 3,
    });
    if (retrieval && typeof retrieval === 'object' && 'error' in retrieval) {
      setKnowledgeMessage(retrieval.error);
      return;
    }
    setKnowledgeRetrieval(retrieval);
    setKnowledgeMessage('知识文档已完成本地解析、脱敏和检索测试。');
  };

  // ── Importance stars ──────────────────────────────────────────────────
  const renderStars = (importance: number) => (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={classNames(
            'w-3 h-3',
            s <= importance ? 'text-amber-400 fill-amber-400' : 'text-[var(--text-muted)]'
          )}
        />
      ))}
    </div>
  );

  // ── Form fields component ─────────────────────────────────────────────
  const renderFormFields = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">类型</label>
          <select
            value={form.type}
            onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as MemoryType }))}
            className="w-full px-3 py-2 rounded-panel bg-[var(--surface-muted)] border border-[var(--border)] text-[var(--text-primary)] text-sm
                       focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          >
            {MEMORY_TYPES.map((t) => (
              <option key={t} value={t} className="bg-[var(--surface)]">{MEMORY_TYPE_LABELS[t] ?? t}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">状态</label>
          <select
            value={form.status}
            onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as MemoryStatus }))}
            className="w-full px-3 py-2 rounded-panel bg-[var(--surface-muted)] border border-[var(--border)] text-[var(--text-primary)] text-sm
                       focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          >
            {MEMORY_STATUSES.map((s) => (
              <option key={s} value={s} className="bg-[var(--surface)]">
                {MEMORY_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">标题 *</label>
        <Input
          value={form.title}
          onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          placeholder="记忆标题"
          error={formErrors.title}
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">内容 *</label>
        <Textarea
          value={form.content}
          onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
          placeholder="记忆内容 — 包括决策理由、代码片段、经验教训等"
          rows={5}
          error={formErrors.content}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">标签 (逗号分隔)</label>
          <Input
            value={form.tags}
            onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
            placeholder="architecture, frontend"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">关联项目</label>
          <select
            value={form.projectId}
            onChange={(e) => setForm((f) => ({ ...f, projectId: e.target.value }))}
            className="w-full px-3 py-2 rounded-panel bg-[var(--surface-muted)] border border-[var(--border)] text-[var(--text-primary)] text-sm
                       focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          >
            <option value="" className="bg-[var(--surface)]">无</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id} className="bg-[var(--surface)]">{p.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">接口范围</label>
          <Input
            value={form.providerScope}
            onChange={(e) => setForm((f) => ({ ...f, providerScope: e.target.value }))}
            placeholder="如: openai"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">模型范围</label>
          <Input
            value={form.modelScope}
            onChange={(e) => setForm((f) => ({ ...f, modelScope: e.target.value }))}
            placeholder="如: gpt-4"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">
          重要性: {form.importance} / 5
        </label>
        <input
          type="range"
          min={1}
          max={5}
          value={form.importance}
          onChange={(e) => setForm((f) => ({ ...f, importance: Number(e.target.value) }))}
          className="w-full h-1.5 rounded-full appearance-none bg-[var(--surface-muted)] cursor-pointer
                     [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4
                     [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full
                     [&::-webkit-slider-thumb]:bg-amber-400 [&::-webkit-slider-thumb]:cursor-pointer"
        />
      </div>
    </div>
  );

  // ── Loading state ─────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6 animate-pulse">
        <div className="h-10 w-48 rounded-panel bg-[var(--surface-muted)]" />
        <div className="flex gap-3">
          <div className="h-10 flex-1 rounded-panel bg-[var(--surface-muted)]" />
          <div className="h-10 w-28 rounded-panel bg-[var(--surface-muted)]" />
          <div className="h-10 w-28 rounded-panel bg-[var(--surface-muted)]" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-44 rounded-panel bg-[var(--surface-muted)] border border-[var(--border)]" />
          ))}
        </div>
      </div>
    );
  }

  // ── Error state ───────────────────────────────────────────────────────
  if (error && memories.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-8">
        <SurfaceCard className="p-12 text-center">
          <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">加载失败</h2>
          <p className="text-[var(--text-muted)] mb-4">{error}</p>
          <Button onClick={fetchData} icon={<RefreshCw className="w-4 h-4" />}>重试</Button>
        </SurfaceCard>
      </div>
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-[var(--text-primary)] tracking-tight">共享记忆中心</h1>
          <p className="text-[var(--text-muted)] text-sm mt-1">
            把项目决策、修复记录和偏好保存成可复用上下文，之后可生成恢复 Prompt。
          </p>
          <p className="text-[var(--text-muted)] text-xs mt-1">
            当前显示 {filteredMemories.length} / {memories.length} 条记忆
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => { resetForm(); setShowCreateModal(true); }} icon={<Plus className="w-4 h-4" />}>
            新增记忆
          </Button>
          <Button variant="ghost" onClick={handleExportJSON} icon={<Download className="w-4 h-4" />}>
            导出 JSON
          </Button>
          <Button variant="ghost" onClick={() => { setShowImportModal(true); setImportResult(null); }} icon={<Upload className="w-4 h-4" />}>
            导入 JSON
          </Button>
          <Button variant="ghost" onClick={() => { setShowContextModal(true); setGeneratedContext(''); setContextPreview(null); setRecoveryPack(null); }} icon={<Sparkles className="w-4 h-4" />}>
            生成跨模型恢复 Prompt
          </Button>
          {projectFilter !== 'all' && (
            <Button variant="ghost" onClick={handleExportMarkdown} icon={<FileText className="w-4 h-4" />}>
              导出 Markdown
            </Button>
          )}
        </div>
      </div>

      {/* Search & filters */}
      <SurfaceCard className="p-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索记忆标题、内容、标签..."
              className="w-full pl-10 pr-4 py-2 rounded-panel bg-[var(--surface-muted)] border border-[var(--border)] text-[var(--text-primary)] text-sm
                         placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 rounded-panel bg-[var(--surface-muted)] border border-[var(--border)] text-[var(--text-secondary)] text-xs
                       focus:outline-none focus:ring-2 focus:ring-blue-500/50 min-w-[100px]"
          >
            <option value="all" className="bg-[var(--surface)]">全部类型</option>
            {MEMORY_TYPES.map((t) => (
              <option key={t} value={t} className="bg-[var(--surface)]">{MEMORY_TYPE_LABELS[t] ?? t}</option>
            ))}
          </select>

          <select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            className="px-3 py-2 rounded-panel bg-[var(--surface-muted)] border border-[var(--border)] text-[var(--text-secondary)] text-xs
                       focus:outline-none focus:ring-2 focus:ring-blue-500/50 min-w-[120px]"
          >
            <option value="all" className="bg-[var(--surface)]">全部项目</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id} className="bg-[var(--surface)]">{p.name}</option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-panel bg-[var(--surface-muted)] border border-[var(--border)] text-[var(--text-secondary)] text-xs
                       focus:outline-none focus:ring-2 focus:ring-blue-500/50 min-w-[100px]"
          >
            <option value="all" className="bg-[var(--surface)]">全部状态</option>
            <option value="active" className="bg-[var(--surface)]">进行中</option>
            <option value="pending" className="bg-[var(--surface)]">待确认</option>
            <option value="archived" className="bg-[var(--surface)]">已归档</option>
          </select>
        </div>
      </SurfaceCard>

      <SurfaceCard className="p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl">
            <h2 className="flex items-center gap-2 text-base font-semibold text-[var(--text-primary)]">
              <FileJson className="h-4 w-4" /> 知识文档预览
            </h2>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              本地解析文档、自动脱敏、生成 chunk，并用 mock retrieval 验证检索命中。
            </p>
          </div>
          <Button variant="secondary" onClick={handleKnowledgePreview} icon={<Database className="h-4 w-4" />}>
            解析并检索
          </Button>
        </div>
        <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_280px]">
          <Textarea
            label="文档内容"
            value={knowledgeText}
            onChange={(event) => setKnowledgeText(event.target.value)}
            rows={4}
          />
          <Input
            label="检索问题"
            value={knowledgeQuery}
            onChange={(event) => setKnowledgeQuery(event.target.value)}
          />
        </div>
        {knowledgeMessage && <div className="mt-3 text-sm text-[var(--accent)]">{knowledgeMessage}</div>}
        {knowledgePreview && (
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            <div className="rounded-tool border border-[var(--border)] bg-[var(--surface-muted)] p-3 text-sm">
              <div className="text-xs text-[var(--text-muted)]">Chunks</div>
              <div className="mt-1 text-xl font-bold">{knowledgePreview.chunkCount}</div>
            </div>
            <div className="rounded-tool border border-[var(--border)] bg-[var(--surface-muted)] p-3 text-sm">
              <div className="text-xs text-[var(--text-muted)]">Redaction</div>
              <div className="mt-1 font-semibold">{knowledgePreview.redaction}</div>
            </div>
            <div className="rounded-tool border border-[var(--border)] bg-[var(--surface-muted)] p-3 text-sm">
              <div className="text-xs text-[var(--text-muted)]">Matches</div>
              <div className="mt-1 text-xl font-bold">{knowledgeRetrieval?.matches.length ?? 0}</div>
            </div>
          </div>
        )}
      </SurfaceCard>

      {/* Pending memories alert */}
      {pendingMemories.length > 0 && (
        <SurfaceCard className="p-4 border-amber-500/20 bg-amber-500/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-300 text-sm">
              <AlertCircle className="w-4 h-4" />
              {pendingMemories.length} 条待确认记忆
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setStatusFilter('pending')}
              icon={<ChevronDown className="w-3.5 h-3.5" />}
            >
              查看待确认
            </Button>
          </div>
          <div className="mt-3 space-y-2">
            {pendingMemories.slice(0, 3).map((m) => (
              <div key={m.id} className="flex items-center justify-between p-2 rounded-lg bg-amber-500/5 border border-amber-500/10">
                <div className="flex items-center gap-2 min-w-0">
                  <Badge className={TYPE_COLORS[m.type] || 'bg-[var(--surface-muted)] text-[var(--text-muted)]'}>
                    {MEMORY_TYPE_LABELS[m.type] ?? m.type}
                  </Badge>
                  <span className="text-sm text-[var(--text-secondary)] truncate">{m.title}</span>
                </div>
                <Button
                  size="sm"
                  onClick={() => handleConfirmPending(m)}
                  icon={<CheckCircle className="w-3.5 h-3.5" />}
                >
                  确认
                </Button>
              </div>
            ))}
            {pendingMemories.length > 3 && (
              <p className="text-xs text-[var(--text-muted)] text-center">
                还有 {pendingMemories.length - 3} 条待确认...
              </p>
            )}
          </div>
        </SurfaceCard>
      )}

      {/* Memory cards grid */}
      {filteredMemories.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMemories.map((memory) => {
            const project = memory.projectId
              ? projects.find((p) => p.id === memory.projectId)
              : null;

            return (
              <SurfaceCard
                key={memory.id}
                className={classNames(
                  'p-4 flex flex-col group transition-all',
                  memory.status === 'archived' && 'opacity-60'
                )}
              >
                {/* Top row: type + actions */}
                <div className="flex items-start justify-between mb-2">
                  <Badge className={TYPE_COLORS[memory.type] || 'bg-[var(--surface-muted)] text-[var(--text-muted)]'}>
                    {MEMORY_TYPE_LABELS[memory.type] ?? memory.type}
                  </Badge>
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => openEdit(memory)}
                      className="p-1 rounded hover:bg-[var(--surface-muted)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => handleToggleStatus(memory)}
                      className="p-1 rounded hover:bg-[var(--surface-muted)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                      title={memory.status === 'active' ? '归档' : '恢复为进行中'}
                    >
                      {memory.status === 'archived' ? (
                        <RotateCcw className="w-3 h-3" />
                      ) : (
                        <Archive className="w-3 h-3" />
                      )}
                    </button>
                    <button
                      onClick={() => setDeleteTarget(memory)}
                      className="p-1 rounded hover:bg-red-500/20 text-[var(--text-muted)] hover:text-red-400"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Title */}
                <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1.5 line-clamp-1">
                  {memory.title}
                </h3>

                {/* Content preview */}
                <p className="text-xs text-[var(--text-muted)] mb-3 line-clamp-2 leading-relaxed flex-1">
                  {memory.content}
                </p>

                {/* Tags */}
                {memory.tags && memory.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {memory.tags.slice(0, 4).map((tag, tagIndex) => (
                      <Badge key={`${memory.id}-${tag}-${tagIndex}`} className="text-[10px] bg-[var(--surface-muted)] text-[var(--text-muted)] border-[var(--border)]">
                        {tag}
                      </Badge>
                    ))}
                    {memory.tags.length > 4 && (
                      <Badge className="text-[10px] bg-[var(--surface-muted)] text-[var(--text-muted)] border-[var(--border)]">
                        +{memory.tags.length - 4}
                      </Badge>
                    )}
                  </div>
                )}

                {/* Bottom metadata row */}
                <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)] mt-auto pt-2 border-t border-[var(--border)]">
                  <div className="flex items-center gap-2">
                    <Badge className={STATUS_COLORS[memory.status] || 'bg-[var(--surface-muted)]'}>
                      {MEMORY_STATUS_LABELS[memory.status] ?? memory.status}
                    </Badge>
                    {project && (
                      <span className="flex items-center gap-1">
                        <FolderKanban className="w-3 h-3" /> {project.name}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {renderStars(memory.importance)}
                  </div>
                </div>

                {/* Last used */}
                {memory.lastUsedAt && (
                  <div className="flex items-center gap-1 mt-1.5 text-[10px] text-[var(--text-muted)]">
                    <Clock className="w-3 h-3" />
                    上次使用: {formatRelativeDate(memory.lastUsedAt)}
                  </div>
                )}
              </SurfaceCard>
            );
          })}
        </div>
      ) : (
        <SurfaceCard className="p-12">
          <EmptyState
            icon={Brain}
            title={search || typeFilter !== 'all' || statusFilter !== 'all' ? '没有匹配的记忆' : '暂无共享记忆'}
            description={
              search || typeFilter !== 'all' || statusFilter !== 'all'
                ? '尝试更改筛选条件或搜索词'
                : '创建第一条共享记忆，例如：项目目标、技术栈选择、已修复的问题、模型偏好。'
            }
            actionLabel="创建第一条记忆"
            onAction={() => { resetForm(); setShowCreateModal(true); }}
          />
        </SurfaceCard>
      )}

      {/* ── Create/Edit Modal ─────────────────────────────────────────────── */}
      <Modal
        open={showCreateModal || !!editingMemory}
        onClose={() => { setShowCreateModal(false); setEditingMemory(null); resetForm(); }}
        title={editingMemory ? '编辑记忆' : '新增记忆'}
        size="lg"
      >
        {renderFormFields()}
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-[var(--border)]">
          <Button variant="ghost" onClick={() => { setShowCreateModal(false); setEditingMemory(null); resetForm(); }}>
            取消
          </Button>
          <Button
            onClick={editingMemory ? handleUpdate : handleCreate}
            loading={saving}
            icon={editingMemory ? <Pencil className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          >
            {editingMemory ? '保存修改' : '创建记忆'}
          </Button>
        </div>
      </Modal>

      {/* ── Delete confirmation ───────────────────────────────────────────── */}
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="确认删除" size="sm">
        <div className="text-center py-4">
          <Trash2 className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <p className="text-[var(--text-primary)] font-medium mb-1">删除记忆 &ldquo;{deleteTarget?.title}&rdquo;？</p>
          <p className="text-sm text-[var(--text-muted)]">此操作不可撤销。</p>
        </div>
        <div className="flex justify-center gap-3 mt-4 pt-4 border-t border-[var(--border)]">
          <Button variant="ghost" onClick={() => setDeleteTarget(null)}>取消</Button>
          <Button variant="danger" onClick={handleDelete} icon={<Trash2 className="w-4 h-4" />}>
            确认删除
          </Button>
        </div>
      </Modal>

      {/* ── Import Modal ──────────────────────────────────────────────────── */}
      <Modal open={showImportModal} onClose={() => { setShowImportModal(false); setImportResult(null); }} title="导入 JSON" size="md">
        <div className="space-y-4">
          {!importResult ? (
            <>
              <p className="text-sm text-[var(--text-muted)]">
                选择一个 JSON 文件导入共享记忆。导入过程中会自动过滤包含敏感信息的记忆条目。
              </p>
              <div className="flex flex-col items-center gap-3 p-8 border-2 border-dashed border-[var(--border)] rounded-panel bg-[var(--surface-muted)]">
                <Upload className="w-8 h-8 text-[var(--text-muted)]" />
                <p className="text-sm text-[var(--text-muted)]">拖拽文件到此处或点击选择</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleImportJSON}
                  className="block text-sm text-[var(--text-muted)] file:mr-4 file:py-2 file:px-4 file:rounded-panel
                             file:border-0 file:text-sm file:font-medium file:bg-[var(--surface-muted)] file:text-[var(--text-primary)]
                             hover:file:bg-[var(--surface-muted)] file:cursor-pointer"
                />
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-center gap-2 text-emerald-400">
                <CheckCircle className="w-12 h-12" />
              </div>
              <div className="text-center space-y-2">
                <p className="text-lg font-semibold text-[var(--text-primary)]">导入完成</p>
                <div className="flex justify-center gap-6 text-sm">
                  <span className="text-emerald-400">导入 {importResult.imported} 条</span>
                  <span className="text-amber-400">跳过 {importResult.skipped} 条</span>
                </div>
                {importResult.errors.length > 0 && (
                  <div className="mt-2 text-left">
                    {importResult.errors.map((err, i) => (
                      <p key={i} className="text-xs text-red-400">{err}</p>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-[var(--border)]">
          <Button variant="ghost" onClick={() => { setShowImportModal(false); setImportResult(null); }}>
            {importResult ? '完成' : '取消'}
          </Button>
        </div>
      </Modal>

      {/* ── Context Generation Modal ──────────────────────────────────────── */}
      <Modal
        open={showContextModal}
        onClose={() => { setShowContextModal(false); setGeneratedContext(''); }}
        title="生成跨模型恢复 Prompt"
        size="lg"
      >
        <div className="space-y-4">
          <p className="text-sm text-[var(--text-muted)]">
            生成的 Prompt 包含所有活跃共享记忆的上下文，可以粘贴到任何 AI 模型中以恢复完整的项目知识。
          </p>

          <div className="flex items-center gap-3">
            <label className="text-xs text-[var(--text-muted)]">注入模式:</label>
            <div className="flex gap-1">
              {INJECTION_MODES.filter((m) => m !== 'off').map((mode) => (
                <button
                  key={mode}
                  onClick={() => setContextInjectionMode(mode)}
                  className={classNames(
                    'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                    contextInjectionMode === mode
                      ? 'bg-pink-500/20 text-pink-300 border border-pink-500/30'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-muted)]'
                  )}
                >
                  {INJECTION_MODE_LABELS[mode]}
                </button>
              ))}
            </div>
          </div>

          <Button
            onClick={handleGenerateContext}
            loading={generatingContext}
            icon={<Sparkles className="w-4 h-4" />}
            fullWidth
          >
            生成 Prompt
          </Button>

          {contextPreview && (
            <div className="rounded-panel border border-[var(--border)] bg-[var(--surface-muted)] p-3">
              <h4 className="text-xs font-semibold uppercase text-[var(--text-muted)]">恢复包来源</h4>
              <div className="mt-2 grid gap-2 md:grid-cols-2">
                {contextPreview.sources.map((source) => (
                  <div key={`${source.type}-${source.label}`} className="rounded-tool border border-[var(--border)] bg-[var(--surface)] p-2 text-xs">
                    <div className="font-semibold text-[var(--text-primary)]">{source.label}</div>
                    <div className="mt-1 text-[var(--text-muted)]">
                      {source.included ? '已纳入' : '未纳入'} / {source.redacted ? '已脱敏' : '原始内容'}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-[var(--text-secondary)]">
                <Badge>{contextPreview.memoryCount} 条记忆</Badge>
                <Badge>{contextPreview.staleMemoryCount} 条可能过期</Badge>
                <Badge>{contextPreview.related.length} 条关联</Badge>
              </div>
            </div>
          )}

          {recoveryPack && (
            <div className="rounded-panel border border-[var(--border)] bg-[var(--surface-muted)] p-3 text-xs text-[var(--text-secondary)]">
              <div className="flex flex-wrap items-center gap-2">
                <Badge>{recoveryPack.redaction}</Badge>
                <span>{recoveryPack.memoryIds.length} 条记忆 ID</span>
                <span>{recoveryPack.providerTraceIds.length} 条 Provider Trace</span>
                <span>{recoveryPack.workflowRunIds.length} 次 Workflow 运行</span>
              </div>
              <div className="mt-2 max-h-24 overflow-auto font-mono">{recoveryPack.sourceLabels.join(' | ')}</div>
            </div>
          )}

          {generatedContext && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                  生成的 Prompt
                </h4>
                <button
                  onClick={() => {
                    copyToClipboard(generatedContext);
                    setCopiedContext(true);
                    setTimeout(() => setCopiedContext(false), 2000);
                  }}
                  className="flex items-center gap-1 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                >
                  {copiedContext ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" /> 已复制
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" /> 复制
                    </>
                  )}
                </button>
              </div>
              <pre className="px-4 py-3 rounded-panel bg-[var(--surface-muted)] text-xs text-[var(--text-secondary)] font-mono whitespace-pre-wrap border border-[var(--border)] max-h-96 overflow-y-auto">
                {generatedContext}
              </pre>
            </div>
          )}
        </div>
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-[var(--border)]">
          <Button variant="ghost" onClick={() => { setShowContextModal(false); setGeneratedContext(''); }}>
            关闭
          </Button>
        </div>
      </Modal>

      {/* Hidden file input for import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleImportJSON}
        className="hidden"
      />
    </div>
  );
}
