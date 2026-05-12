import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Wand2,
  Search,
  Star,
  Copy,
  Check,
  Download,
  Save,
  Trash2,
  Sparkles,
  Brain,
  AlertTriangle,
  RefreshCw,
  ChevronRight,
  Clock,
  FileText,
  ArrowRight,
  Plus,
  GitBranch,
  MousePointerClick,
} from 'lucide-react';
import { api } from '../lib/api';
import {
  PROMPT_TEMPLATES,
  filterPromptTemplates,
  filterWorkflowTemplates,
  fillTemplate,
  getTemplateByName,
  getTemplateVariableKey,
} from '../lib/templates';
import { generateSharedMemoryContext, injectMemoryIntoPrompt } from '../lib/memoryInjection';
import { exportMarkdown } from '../lib/exporters';
import { SurfaceCard, EmptyState, Button, Input, Textarea, Badge, PromptPreview, Modal } from '../components/';
import type {
  Memory, SavedPrompt, MemoryInjectionMode, PromptTemplate,
} from '../lib/types';
import { generateId, formatRelativeDate, copyToClipboard, classNames, truncate } from '../lib/utils';

// ── Demo data ──────────────────────────────────────────────────────────────
const DEMO_SAVED_PROMPTS: SavedPrompt[] = [
  {
    id: 'sp1', name: '新手交接 Prompt', templateId: 'handoff',
    variables: { project_name: 'LocalAI Nexus 上手示例', tech_stack: 'Electron, React, TypeScript' },
    content: '请先阅读项目目标和现有任务，再给出下一步计划。不要执行破坏性命令，完成后报告修改文件、测试结果和下一步建议。',
    starred: true, createdAt: new Date(Date.now() - 2 * 864e5).toISOString(),
  },
  {
    id: 'sp2', name: 'Provider 检查 Prompt', templateId: 'provider-check',
    variables: { provider_name: 'OpenAI Compatible', base_url: 'http://127.0.0.1:8317/v1' },
    content: '检查当前 Provider 配置：确认 Base URL、模型名、API Key 是否存在；先测试连接，再切换为当前模型。不要把 API Key 写入日志或 Memory。',
    starred: false, createdAt: new Date(Date.now() - 5 * 864e5).toISOString(),
  },
];

// ── Component ──────────────────────────────────────────────────────────────
export default function PromptLab() {
  // Templates
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<PromptTemplate | null>(null);
  const [templateSearch, setTemplateSearch] = useState('');
  const [templateMode, setTemplateMode] = useState<'prompt' | 'workflow'>('prompt');
  const [workflowCategory, setWorkflowCategory] = useState('all');
  const [workflowRisk, setWorkflowRisk] = useState<'all' | 'low' | 'medium' | 'high'>('all');
  const [beginnerOnly, setBeginnerOnly] = useState(false);

  // Variables
  const [variableValues, setVariableValues] = useState<Record<string, string>>({});

  // Generation
  const [generatedContent, setGeneratedContent] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  // Memory injection
  const [injectionMode, setInjectionMode] = useState<MemoryInjectionMode>('off');
  const [memoryContext, setMemoryContext] = useState<string>('');
  const [memories, setMemories] = useState<Memory[]>([]);

  // Saved prompts
  const [savedPrompts, setSavedPrompts] = useState<SavedPrompt[]>([]);
  const [savedSearch, setSavedSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [showSaveModal, setShowSaveModal] = useState(false);

  // States
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [apiAvailable, setApiAvailable] = useState(true);

  // ── Init ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        // Load templates
        setTemplates(PROMPT_TEMPLATES || []);
        if (PROMPT_TEMPLATES && PROMPT_TEMPLATES.length > 0) {
          setSelectedTemplate(PROMPT_TEMPLATES[0]);
        }

        // Load saved prompts
        if (api && typeof api.prompts?.list === 'function') {
          const data = await api.prompts.list();
          setSavedPrompts(Array.isArray(data) ? data : []);
        } else {
          setApiAvailable(false);
          setSavedPrompts(DEMO_SAVED_PROMPTS);
        }
        if (api && typeof api.memory?.list === 'function') {
          const memoryData = await api.memory.list();
          setMemories(Array.isArray(memoryData) ? memoryData : []);
        }
      } catch (err: any) {
        console.error('PromptLab init error:', err);
        setApiAvailable(false);
        setSavedPrompts(DEMO_SAVED_PROMPTS);
        setTemplates(PROMPT_TEMPLATES || []);
        if (PROMPT_TEMPLATES && PROMPT_TEMPLATES.length > 0) {
          setSelectedTemplate(PROMPT_TEMPLATES[0]);
        }
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Reset variables when template changes
  useEffect(() => {
    if (selectedTemplate) {
      const defaults: Record<string, string> = {};
      selectedTemplate.variables.forEach((v) => {
        defaults[getTemplateVariableKey(v)] = '';
      });
      setVariableValues(defaults);
      setGeneratedContent(null);
    }
  }, [selectedTemplate]);

  // ── Filtered templates ────────────────────────────────────────────────
  const filteredTemplates = useMemo(() => {
    return filterPromptTemplates(templates, { query: templateSearch });
  }, [templates, templateSearch]);

  const filteredWorkflowTemplates = useMemo(() => {
    return filterWorkflowTemplates({
      query: templateSearch,
      category: workflowCategory,
      riskLevel: workflowRisk,
      beginnerOnly,
    });
  }, [beginnerOnly, templateSearch, workflowCategory, workflowRisk]);

  const selectedWorkflowTemplate =
    templateMode === 'workflow' ? filteredWorkflowTemplates[0] ?? null : null;

  // ── Generate prompt ───────────────────────────────────────────────────
  const handleGenerate = async () => {
    if (!selectedTemplate) return;
    setGenerating(true);
    try {
      let basePrompt = fillTemplate(selectedTemplate, variableValues);

      if (injectionMode !== 'off') {
        try {
          let ctx = memoryContext;
          if (!ctx) {
            ctx = generateSharedMemoryContext(memories, injectionMode);
          }
          if (ctx) {
            basePrompt = injectMemoryIntoPrompt(basePrompt, ctx, injectionMode);
          }
        } catch (err) {
          console.error('Memory injection failed:', err);
        }
      }

      setGeneratedContent(basePrompt);
    } catch (err: any) {
      console.error('Generate error:', err);
    } finally {
      setGenerating(false);
    }
  };

  // ── Save prompt ───────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!selectedTemplate || !generatedContent || !saveName.trim()) return;
    setSaving(true);
    try {
      const saved: SavedPrompt = {
        id: generateId(),
        name: saveName.trim(),
        templateId: selectedTemplate.id ?? selectedTemplate.name,
        variables: { ...variableValues },
        content: generatedContent,
        starred: false,
        createdAt: new Date().toISOString(),
      };

      if (api && typeof api.prompts?.create === 'function') {
        await api.prompts.create(saved);
      }
      setSavedPrompts((prev) => [saved, ...prev]);
      setShowSaveModal(false);
      setSaveName('');
    } catch (err: any) {
      console.error('Save error:', err);
    } finally {
      setSaving(false);
    }
  };

  // ── Export ─────────────────────────────────────────────────────────────
  const handleExport = async () => {
    if (!generatedContent || !selectedTemplate) return;
    const md = exportMarkdown(generatedContent, selectedTemplate.name);
    if (api && typeof api.export?.exportMarkdown === 'function') {
      await api.export.exportMarkdown(md, `${selectedTemplate.name}.md`);
    } else {
      const blob = new Blob([md], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `${selectedTemplate.name}.md`; a.click();
      URL.revokeObjectURL(url);
    }
  };

  // ── Toggle star ───────────────────────────────────────────────────────
  const toggleStar = async (prompt: SavedPrompt) => {
    const updated = { ...prompt, starred: !prompt.starred };
    if (api && typeof api.prompts?.update === 'function') {
      try { await api.prompts.update(updated); } catch {}
    }
    setSavedPrompts((prev) => prev.map((p) => (p.id === prompt.id ? updated : p)));
  };

  // ── Delete saved ──────────────────────────────────────────────────────
  const deleteSaved = async (id: string) => {
    if (api && typeof api.prompts?.delete === 'function') {
      try { await api.prompts.delete(id); } catch {}
    }
    setSavedPrompts((prev) => prev.filter((p) => p.id !== id));
  };

  // ── Load saved prompt into editor ─────────────────────────────────────
  const loadSaved = (prompt: SavedPrompt) => {
    const tmpl = prompt.templateId ? getTemplateByName(prompt.templateId) : undefined;
    if (tmpl) {
      setSelectedTemplate(tmpl);
      setVariableValues(prompt.variables || {});
    }
    setGeneratedContent(prompt.content);
  };

  // ── Filtered saved prompts ────────────────────────────────────────────
  const filteredSaved = useMemo(() => {
    if (!savedSearch) return savedPrompts;
    const q = savedSearch.toLowerCase();
    return savedPrompts.filter(
      (p) => (p.name ?? p.title ?? '').toLowerCase().includes(q) || p.content.toLowerCase().includes(q)
    );
  }, [savedPrompts, savedSearch]);

  // ── Loading state ─────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-4 animate-pulse">
        <div className="h-10 w-48 rounded-panel bg-[var(--surface-muted)]" />
        <div className="flex gap-4 h-[70vh]">
          <div className="w-[30%] rounded-panel bg-[var(--surface-muted)] border border-[var(--border)]" />
          <div className="flex-1 rounded-panel bg-[var(--surface-muted)] border border-[var(--border)]" />
        </div>
      </div>
    );
  }

  // ── Error state ────────────────────────────────────────────────────────
  if (error && templates.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-8">
        <SurfaceCard className="p-12 text-center">
          <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">加载模板失败</h2>
          <p className="text-[var(--text-muted)] mb-4">{error}</p>
          <Button onClick={() => window.location.reload()} icon={<RefreshCw className="w-4 h-4" />}>
            重试
          </Button>
        </SurfaceCard>
      </div>
    );
  }

  // ── Empty templates ───────────────────────────────────────────────────
  if (templates.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-8">
        <EmptyState
          icon={Wand2}
          title="暂无 Prompt 模板"
          description="模板库为空，请检查模板配置"
          actionLabel="刷新"
          onAction={() => window.location.reload()}
        />
      </div>
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[var(--text-primary)] tracking-tight">Prompt Lab</h1>
          <p className="text-[var(--text-muted)] text-sm mt-1">
            模板化 Prompt 生成、工作流模板库和新手下一步指引
          </p>
        </div>
        <div className="inline-flex rounded-panel border border-[var(--border)] bg-[var(--surface)] p-1 shadow-[var(--shadow-sm)]">
          {[
            { key: 'prompt' as const, label: 'Prompt 模板', icon: Wand2 },
            { key: 'workflow' as const, label: '工作流模板', icon: GitBranch },
          ].map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setTemplateMode(item.key)}
              className={classNames(
                'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
                templateMode === item.key
                  ? 'bg-accent-500/15 text-accent-500 dark:text-accent-300'
                  : 'text-[var(--text-muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]',
              )}
            >
              <item.icon className="h-3.5 w-3.5" />
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <SurfaceCard className="p-4">
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <Badge variant="info">新手路径</Badge>
          <span className="text-[var(--text-primary)] dark:text-[var(--text-secondary)]">选择模板</span>
          <ArrowRight className="h-4 w-4 text-[var(--text-muted)]" />
          <span className="text-[var(--text-primary)] dark:text-[var(--text-secondary)]">确认输入</span>
          <ArrowRight className="h-4 w-4 text-[var(--text-muted)]" />
          <span className="text-[var(--text-primary)] dark:text-[var(--text-secondary)]">配置 Provider/API Key</span>
          <ArrowRight className="h-4 w-4 text-[var(--text-muted)]" />
          <span className="text-[var(--text-primary)] dark:text-[var(--text-secondary)]">运行</span>
          <ArrowRight className="h-4 w-4 text-[var(--text-muted)]" />
          <span className="text-[var(--text-primary)] dark:text-[var(--text-secondary)]">保存结果和日志</span>
        </div>
        <p className="mt-2 text-xs text-[var(--text-muted)] dark:text-[var(--text-muted)]">
          不懂 Agent 也可以先点“工作流模板”：选一个场景，看每个节点需要什么输入，再把生成的 Prompt 复制给 Codex、Claude Code 或 Cursor。
        </p>
      </SurfaceCard>

      {/* Main two-panel layout */}
      <div className="flex gap-4 lg:h-[calc(100vh-16rem)] min-h-[600px]">
        {/* ── Left panel: Template list ────────────────────────────────── */}
        <div className="w-[30%] min-w-[240px] flex flex-col gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-muted)]" />
            <input
              value={templateSearch}
              onChange={(e) => setTemplateSearch(e.target.value)}
              placeholder="搜索模板..."
              className="w-full pl-9 pr-3 py-2 rounded-panel bg-[var(--surface-muted)] border border-[var(--border)] text-[var(--text-primary)] text-xs
                         placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />
          </div>

          {templateMode === 'workflow' && (
            <div className="grid gap-2">
              <select
                value={workflowCategory}
                onChange={(event) => setWorkflowCategory(event.target.value)}
                className="w-full rounded-panel border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2 text-xs text-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-accent-400/50"
                aria-label="模板分类"
              >
                <option value="all">全部分类</option>
                <option value="research">调研/知识</option>
                <option value="coding">代码修复</option>
                <option value="planning">并发规划</option>
                <option value="safety">人类确认</option>
                <option value="testing">循环测试</option>
                <option value="release">发布提交</option>
              </select>
              <select
                value={workflowRisk}
                onChange={(event) => setWorkflowRisk(event.target.value as typeof workflowRisk)}
                className="w-full rounded-panel border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2 text-xs text-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-accent-400/50"
                aria-label="风险等级"
              >
                <option value="all">全部风险</option>
                <option value="low">低风险</option>
                <option value="medium">中风险</option>
                <option value="high">高风险</option>
              </select>
              <label className="flex items-center gap-2 rounded-panel border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2 text-xs text-[var(--text-muted)]">
                <input
                  type="checkbox"
                  checked={beginnerOnly}
                  onChange={(event) => setBeginnerOnly(event.target.checked)}
                  className="h-3.5 w-3.5 rounded border-[var(--border)] bg-[var(--surface-muted)] accent-[var(--accent)]"
                />
                只看新手推荐
              </label>
            </div>
          )}

          <SurfaceCard className="flex-1 overflow-y-auto p-2 space-y-1">
            {templateMode === 'workflow' ? (
              filteredWorkflowTemplates.length > 0 ? (
                filteredWorkflowTemplates.map((template) => (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => {
                      setTemplateMode('workflow');
                      setGeneratedContent(null);
                    }}
                    className={classNames(
                      'w-full text-left p-3 rounded-panel transition-all text-sm',
                      selectedWorkflowTemplate?.id === template.id
                        ? 'bg-accent-500/10 border border-accent-500/20 text-[var(--text-primary)]'
                        : 'hover:bg-[var(--surface-muted)] text-[var(--text-muted)] hover:text-[var(--text-primary)]',
                    )}
                  >
                    <div className="font-medium text-xs">{template.name}</div>
                    <div className="text-[11px] text-[var(--text-muted)] mt-0.5 line-clamp-2">
                      {template.purpose}
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                      <Badge className="text-[10px] bg-[var(--surface-muted)] text-[var(--text-muted)] border-[var(--border)]">
                        {template.nodes.length} 节点
                      </Badge>
                      <Badge className="text-[10px] bg-blue-500/10 text-blue-400 border-blue-500/20">
                        {template.difficulty}
                      </Badge>
                      <Badge className="text-[10px] bg-amber-500/10 text-amber-500 border-amber-500/20">
                        {template.riskLevel} risk
                      </Badge>
                      {template.tags.slice(0, 2).map((tag) => (
                        <Badge key={tag} className="text-[10px] bg-purple-500/10 text-purple-400 border-purple-500/20">
                          {tag}
                        </Badge>
                      ))}
                      {template.beginnerRecommended && (
                        <Badge className="text-[10px] bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                          新手推荐
                        </Badge>
                      )}
                      {template.requiresHumanApproval && (
                        <Badge className="text-[10px] bg-red-500/10 text-red-400 border-red-500/20">
                          人工复核
                        </Badge>
                      )}
                    </div>
                  </button>
                ))
              ) : (
                <div className="p-4 text-center text-xs text-[var(--text-muted)]">没有匹配的工作流模板</div>
              )
            ) : filteredTemplates.length > 0 ? (
              filteredTemplates.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSelectedTemplate(t)}
                  className={classNames(
                    'w-full text-left p-3 rounded-panel transition-all text-sm',
                    selectedTemplate?.id === t.id
                      ? 'bg-blue-500/10 border border-blue-500/20 text-[var(--text-primary)]'
                      : 'hover:bg-[var(--surface-muted)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                  )}
                >
                  <div className="font-medium text-xs">{t.name}</div>
                  <div className="text-[11px] text-[var(--text-muted)] mt-0.5 line-clamp-2">
                    {t.description}
                  </div>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <Badge className="text-[10px] bg-[var(--surface-muted)] text-[var(--text-muted)] border-[var(--border)]">
                      {t.variables.length} 变量
                    </Badge>
                    {t.category && (
                      <Badge className="text-[10px] bg-purple-500/10 text-purple-400 border-purple-500/20">
                        {t.category}
                      </Badge>
                    )}
                  </div>
                </button>
              ))
            ) : (
              <div className="p-4 text-center text-xs text-[var(--text-muted)]">没有匹配的模板</div>
            )}
          </SurfaceCard>
        </div>

        {/* ── Right panel: Editor ──────────────────────────────────────── */}
        <div className="flex-1 flex flex-col gap-4 overflow-hidden">
          <SurfaceCard className="p-5 flex-1 overflow-y-auto">
            {templateMode === 'workflow' && selectedWorkflowTemplate ? (
              <div className="space-y-5">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                      {selectedWorkflowTemplate.name}
                    </h3>
                    <Badge variant="info">{selectedWorkflowTemplate.nodes.length} 个节点</Badge>
                    <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20">
                      {selectedWorkflowTemplate.category}
                    </Badge>
                    <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20">
                      {selectedWorkflowTemplate.riskLevel} risk
                    </Badge>
                    {selectedWorkflowTemplate.requiresHumanApproval && (
                      <Badge className="bg-red-500/10 text-red-400 border-red-500/20">
                        需要人工确认
                      </Badge>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-[var(--text-muted)]">{selectedWorkflowTemplate.description}</p>
                  <p className="mt-2 text-xs text-[var(--text-muted)]">
                    适用场景：{selectedWorkflowTemplate.scenario}
                  </p>
                </div>

                <div className="grid gap-3">
                  {selectedWorkflowTemplate.nodes.map((node, index) => (
                    <div
                      key={node.id}
                      className="rounded-panel border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-sm)]"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-panel border border-accent-400/30 bg-accent-400/15 text-xs font-semibold text-accent-400">
                            {index + 1}
                          </div>
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="text-sm font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]">
                                {node.name}
                              </h4>
                              <Badge className="bg-[var(--surface-muted)] text-[var(--text-muted)] border-[var(--border)]">{node.type}</Badge>
                            </div>
                            <p className="mt-1 text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
                              {node.description}
                            </p>
                          </div>
                        </div>
                        <MousePointerClick className="h-4 w-4 text-[var(--text-muted)]" />
                      </div>
                      {(node.input || node.output || node.safetyNote) && (
                        <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
                          {node.input && (
                            <div className="rounded-panel bg-[var(--surface-muted)] p-2 text-[var(--text-secondary)] dark:bg-[var(--surface-muted)] dark:text-[var(--text-muted)]">
                              输入：{node.input}
                            </div>
                          )}
                          {node.output && (
                            <div className="rounded-panel bg-[var(--surface-muted)] p-2 text-[var(--text-secondary)] dark:bg-[var(--surface-muted)] dark:text-[var(--text-muted)]">
                              输出：{node.output}
                            </div>
                          )}
                          {node.safetyNote && (
                            <div className="rounded-panel border border-amber-400/20 bg-amber-400/10 p-2 text-amber-600 dark:text-amber-300 sm:col-span-2">
                              安全提示：{node.safetyNote}
                            </div>
                          )}
                          {node.retryAdvice && (
                            <div className="rounded-panel border border-blue-400/20 bg-blue-400/10 p-2 text-blue-600 dark:text-blue-300 sm:col-span-2">
                              重试建议：{node.retryAdvice}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <SurfaceCard className="p-4">
                  <h4 className="text-sm font-semibold text-[var(--text-primary)]">怎么使用这个模板</h4>
                  <ol className="mt-2 space-y-1 text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
                    <li>1. 先准备项目目标、仓库路径、错误日志或验收标准。</li>
                    <li>2. 按节点顺序把 Prompt 复制给 Codex、Claude Code 或 Cursor 执行。</li>
                    <li>3. 每个节点完成后把结果记到 Project Detail；出错时复制日志给 Log Analyzer。</li>
                  </ol>
                </SurfaceCard>
              </div>
            ) : selectedTemplate ? (
              <div className="space-y-5">
                {/* Template header */}
                <div>
                  <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                    {selectedTemplate.name}
                  </h3>
                  <p className="text-xs text-[var(--text-muted)] mt-1">
                    {selectedTemplate.description}
                  </p>
                </div>

                {/* Variables */}
                {selectedTemplate.variables.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                      模板变量
                    </h4>
                    <div className="space-y-3">
                      {selectedTemplate.variables.map((v) => {
                        const key = getTemplateVariableKey(v);
                        return (
                          <div key={key}>
                            <label className="block text-[11px] font-medium text-[var(--text-muted)] mb-1">
                              {v.label || key}
                              {v.required && <span className="text-red-400 ml-0.5">*</span>}
                            </label>
                            {v.type === 'textarea' || (v.label && v.label.length > 30) ? (
                              <Textarea
                                value={variableValues[key] || ''}
                                onChange={(e) =>
                                  setVariableValues((prev) => ({
                                    ...prev,
                                    [key]: e.target.value,
                                  }))
                                }
                                placeholder={v.placeholder || `输入 ${v.label || key}...`}
                                rows={3}
                              />
                            ) : (
                              <Input
                                value={variableValues[key] || ''}
                                onChange={(e) =>
                                  setVariableValues((prev) => ({
                                    ...prev,
                                    [key]: e.target.value,
                                  }))
                                }
                                placeholder={v.placeholder || `输入 ${v.label || key}...`}
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Memory injection toggle */}
                <div className="border-t border-[var(--border)] pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <label className="flex items-center gap-2 text-xs text-[var(--text-muted)] select-none">
                      <Brain className="w-3.5 h-3.5 text-pink-400" />
                      注入共享记忆 / Inject Shared Memory
                    </label>
                    <select
                      value={injectionMode}
                      onChange={(e) => setInjectionMode(e.target.value as MemoryInjectionMode)}
                      className="px-2 py-1 rounded-lg bg-[var(--surface-muted)] border border-[var(--border)] text-xs text-[var(--text-secondary)]
                                 focus:outline-none focus:ring-2 focus:ring-pink-500/50"
                    >
                      <option value="off">不注入 / Off</option>
                      <option value="minimal">最小 / Minimal</option>
                      <option value="balanced">平衡 / Balanced</option>
                      <option value="full">完整 / Full</option>
                    </select>
                  </div>
                  {injectionMode !== 'off' && (
                    <Textarea
                      value={memoryContext}
                      onChange={(e) => setMemoryContext(e.target.value)}
                      placeholder={
                        memories.length === 0
                          ? '暂无共享记忆。可手动输入上下文，或先到共享记忆中心新增记忆。'
                          : '可选：手动输入共享记忆上下文。留空将自动从记忆库获取。'
                      }
                      rows={2}
                    />
                  )}
                </div>

                {/* Generate button */}
                <Button
                  onClick={handleGenerate}
                  loading={generating}
                  icon={<Sparkles className="w-4 h-4" />}
                  fullWidth
                >
                  生成 Prompt
                </Button>

                {/* Generated prompt */}
                {generatedContent && (
                  <div className="space-y-3 border-t border-[var(--border)] pt-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                        生成的 Prompt
                      </h4>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => {
                            copyToClipboard(generatedContent);
                            setCopied(true);
                            setTimeout(() => setCopied(false), 2000);
                          }}
                          className="p-1.5 rounded-lg hover:bg-[var(--surface-muted)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                          title="复制"
                        >
                          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          onClick={handleExport}
                          className="p-1.5 rounded-lg hover:bg-[var(--surface-muted)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                          title="导出 Markdown"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            setSaveName('');
                            setShowSaveModal(true);
                          }}
                          className="p-1.5 rounded-lg hover:bg-[var(--surface-muted)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                          title="保存"
                        >
                          <Save className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <PromptPreview content={generatedContent} />
                    <div className="rounded-panel border border-[var(--border)] bg-[var(--surface)] p-3">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]">下一步建议</p>
                          <p className="text-xs text-[var(--text-muted)] dark:text-[var(--text-muted)]">
                            复制给 Agent 执行，或保存后回到项目详情记录运行结果。
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              copyToClipboard(generatedContent);
                              setCopied(true);
                              setTimeout(() => setCopied(false), 2000);
                            }}
                            icon={copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                          >
                            复制给 Agent
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setSaveName('');
                              setShowSaveModal(true);
                            }}
                            icon={<Save className="h-3.5 w-3.5" />}
                          >
                            保存模板结果
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-[var(--text-muted)] text-sm">
                从左侧选择一个模板开始
              </div>
            )}
          </SurfaceCard>
        </div>
      </div>

      {/* ── Saved prompts section ─────────────────────────────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[var(--text-primary)] flex items-center gap-2">
            <Save className="w-4 h-4 text-purple-400" />
            已保存的 Prompts
            <Badge className="bg-[var(--surface-muted)] text-[var(--text-muted)] border-[var(--border)]">
              {savedPrompts.length}
            </Badge>
          </h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-muted)]" />
            <input
              value={savedSearch}
              onChange={(e) => setSavedSearch(e.target.value)}
              placeholder="搜索已保存..."
              className="w-56 pl-9 pr-3 py-1.5 rounded-lg bg-[var(--surface-muted)] border border-[var(--border)] text-[var(--text-primary)] text-xs
                         placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />
          </div>
        </div>

        {filteredSaved.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredSaved.map((p) => (
              <SurfaceCard
                key={p.id}
                className="p-4 cursor-pointer hover:scale-[1.01] transition-transform group"
                onClick={() => loadSaved(p)}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-medium text-[var(--text-primary)] truncate">{p.name ?? p.title ?? 'Untitled prompt'}</h4>
                    <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                      {truncate(p.content, 60)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleStar(p); }}
                      className={`p-1 rounded transition-colors ${
                        p.starred ? 'text-amber-400' : 'text-[var(--text-muted)] hover:text-amber-400'
                      }`}
                    >
                      <Star className="w-3.5 h-3.5" fill={p.starred ? 'currentColor' : 'none'} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteSaved(p.id); }}
                      className="p-1 rounded text-[var(--text-muted)] hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="text-[10px] bg-[var(--surface-muted)] text-[var(--text-muted)] border-[var(--border)]">
                    {p.templateId ?? p.templateName ?? 'custom'}
                  </Badge>
                  <span className="text-[10px] text-[var(--text-muted)] flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatRelativeDate(p.createdAt)}
                  </span>
                </div>
              </SurfaceCard>
            ))}
          </div>
        ) : (
          <SurfaceCard className="p-8">
            <EmptyState
              icon={Save}
              title="暂无已保存的 Prompt"
              description={
                savedSearch
                  ? '没有匹配的 Prompt。清空搜索词，或换一个关键词。'
                  : '从左侧选择模板，填写项目目标或错误日志，点击“生成 Prompt”，再保存成第一个可复用交接。'
              }
              actionLabel="生成第一个 Prompt"
              onAction={() => {
                setTemplateMode('prompt');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            />
          </SurfaceCard>
        )}
      </div>

      {/* ── Save Modal ────────────────────────────────────────────────────── */}
      <Modal
        open={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        title="保存 Prompt"
        size="sm"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">名称</label>
            <Input
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              placeholder="给这个 Prompt 起个名字"
              autoFocus
            />
          </div>
          <p className="text-[11px] text-[var(--text-muted)]">
            模板: {selectedTemplate?.name} | 变量: {selectedTemplate?.variables.length} 个
          </p>
        </div>
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-[var(--border)]">
          <Button variant="ghost" onClick={() => setShowSaveModal(false)}>取消</Button>
          <Button onClick={handleSave} loading={saving} icon={<Save className="w-4 h-4" />}>
            保存
          </Button>
        </div>
      </Modal>
    </div>
  );
}
