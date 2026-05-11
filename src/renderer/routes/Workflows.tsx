import React from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  GitBranch,
  Layers,
  Pause,
  Play,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  Settings,
  Square,
  Workflow as WorkflowIcon,
} from 'lucide-react';
import { api } from '../lib/api';
import type { AgentWorkflowTemplate, Project, Run, Workflow, WorkflowNode, WorkflowVersion } from '../lib/types';

function hasError<T>(value: T | { error: string }): value is { error: string } {
  return Boolean(value && typeof value === 'object' && 'error' in value);
}

function nodeColor(type: string) {
  const map: Record<string, string> = {
    start: 'border-emerald-400/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200',
    prompt: 'border-blue-400/30 bg-blue-500/10 text-blue-700 dark:text-blue-200',
    llm: 'border-violet-400/30 bg-violet-500/10 text-violet-700 dark:text-violet-200',
    tool: 'border-amber-400/30 bg-amber-500/10 text-amber-700 dark:text-amber-200',
    condition: 'border-cyan-400/30 bg-cyan-500/10 text-cyan-700 dark:text-cyan-200',
    human_approval: 'border-rose-400/30 bg-rose-500/10 text-rose-700 dark:text-rose-200',
    output: 'border-slate-400/30 bg-slate-500/10 text-[var(--text-primary)] dark:text-[var(--text-primary)]',
  };
  return map[type] ?? map.output;
}

export default function Workflows() {
  const [projects, setProjects] = React.useState<Project[]>([]);
  const [templates, setTemplates] = React.useState<AgentWorkflowTemplate[]>([]);
  const [workflows, setWorkflows] = React.useState<Workflow[]>([]);
  const [versions, setVersions] = React.useState<WorkflowVersion[]>([]);
  const [runs, setRuns] = React.useState<Run[]>([]);
  const [runEvents, setRunEvents] = React.useState<Array<{ id: string; title?: string; detail?: string; status?: string }>>([]);
  const [selectedProjectId, setSelectedProjectId] = React.useState('');
  const [selectedTemplateId, setSelectedTemplateId] = React.useState('');
  const [selectedWorkflowId, setSelectedWorkflowId] = React.useState('');
  const [selectedWorkflow, setSelectedWorkflow] = React.useState<Workflow | null>(null);
  const [runInput, setRunInput] = React.useState('请把这个需求整理成一个可执行计划。');
  const [status, setStatus] = React.useState('');
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(true);

  const selectedTemplate = templates.find((template) => template.id === selectedTemplateId);

  const loadBase = React.useCallback(async () => {
    setLoading(true);
    setError('');
    const [projectResult, templateResult] = await Promise.all([
      api.projects.list(),
      api.workflows.templates(),
    ]);
    const safeProjects = Array.isArray(projectResult) ? projectResult : [];
    const safeTemplates = Array.isArray(templateResult) ? templateResult : [];
    setProjects(safeProjects);
    setTemplates(safeTemplates);
    setSelectedProjectId((current) => current || safeProjects[0]?.id || '');
    setSelectedTemplateId((current) => current || safeTemplates[0]?.id || '');
    setLoading(false);
  }, []);

  const loadProjectWorkflows = React.useCallback(async (projectId: string) => {
    if (!projectId) return;
    const [workflowResult, runsResult, eventsResult] = await Promise.all([
      api.workflows.list(projectId),
      api.runs.list(projectId),
      api.runs.events(projectId),
    ]);
    if (hasError(workflowResult)) {
      setError(workflowResult.error);
      return;
    }
    setWorkflows(workflowResult);
    setRuns(Array.isArray(runsResult) ? runsResult : []);
    setRunEvents(Array.isArray(eventsResult) ? eventsResult as never : []);
    setSelectedWorkflowId((current) => current || workflowResult[0]?.id || '');
  }, []);

  const loadWorkflow = React.useCallback(async (workflowId: string) => {
    if (!workflowId) {
      setSelectedWorkflow(null);
      setVersions([]);
      return;
    }
    const [workflowResult, versionsResult] = await Promise.all([
      api.workflows.get(workflowId),
      api.workflows.versions(workflowId),
    ]);
    if (hasError(workflowResult)) {
      setError(workflowResult.error);
      return;
    }
    setSelectedWorkflow(workflowResult);
    setVersions(Array.isArray(versionsResult) ? versionsResult : []);
  }, []);

  React.useEffect(() => {
    void loadBase();
  }, [loadBase]);

  React.useEffect(() => {
    void loadProjectWorkflows(selectedProjectId);
  }, [selectedProjectId, loadProjectWorkflows]);

  React.useEffect(() => {
    void loadWorkflow(selectedWorkflowId);
  }, [selectedWorkflowId, loadWorkflow]);

  const createFromTemplate = async () => {
    if (!selectedProjectId || !selectedTemplateId) {
      setError('请先选择项目和模板。下一步：到项目页创建一个项目，或选择一个现有项目。');
      return;
    }
    setStatus('正在从模板创建 Workflow...');
    setError('');
    const result = await api.workflows.createFromTemplate({
      projectId: selectedProjectId,
      templateId: selectedTemplateId,
      name: selectedTemplate?.name,
    });
    if (hasError(result)) {
      setError(`${result.error}。下一步：确认你对该项目有编辑权限。`);
      setStatus('');
      return;
    }
    setSelectedWorkflowId(result.id);
    await loadProjectWorkflows(selectedProjectId);
    setStatus('已创建 Workflow，可以直接运行示例。');
  };

  const updateNodePrompt = (nodeId: string, value: string) => {
    setSelectedWorkflow((workflow) => {
      if (!workflow) return workflow;
      return {
        ...workflow,
        nodes: workflow.nodes.map((node) =>
          node.id === nodeId ? { ...node, config: { ...node.config, prompt: value } } : node,
        ),
      };
    });
  };

  const saveWorkflow = async () => {
    if (!selectedWorkflow) return;
    setStatus('正在保存 Workflow 版本...');
    const result = await api.workflows.save(selectedWorkflow.id, {
      nodes: selectedWorkflow.nodes,
      edges: selectedWorkflow.edges,
      name: selectedWorkflow.name,
      description: selectedWorkflow.description,
      versionMessage: 'Saved from beginner workflow editor',
    });
    if (hasError(result)) {
      setError(`${result.error}。下一步：检查项目权限或重新登录。`);
      setStatus('');
      return;
    }
    setSelectedWorkflow(result);
    await loadWorkflow(result.id);
    setStatus(`已保存 v${result.version}。`);
  };

  const runSelectedWorkflow = async () => {
    if (!selectedWorkflow) {
      setError('请先创建或选择一个 Workflow。下一步：点击“从模板创建”。');
      return;
    }
    setStatus('正在运行 Workflow...');
    setError('');
    const result = await api.workflows.run({ workflowId: selectedWorkflow.id, input: runInput });
    if (hasError(result)) {
      setError(`${result.error}。下一步：检查节点配置、Provider 或项目权限。`);
      setStatus('');
      return;
    }
    await Promise.all([loadProjectWorkflows(selectedWorkflow.projectId), loadWorkflow(selectedWorkflow.id)]);
    setStatus(result.result.nextStep ? `${result.result.summary} 下一步：${result.result.nextStep}` : result.result.summary);
  };

  const controlRun = async (runId: string, action: string) => {
    const result = await api.workflows.controlRun(runId, action);
    if (hasError(result)) {
      setError(result.error);
      return;
    }
    await loadProjectWorkflows(result.projectId);
    const actionLabel: Record<string, string> = {
      pause: '暂停',
      cancel: '取消',
      retry: '重试安全节点',
      resume: '恢复',
    };
    setStatus(`Workflow 运行已${actionLabel[action] ?? action}：${result.status}`);
  };

  const editablePromptNodes = selectedWorkflow?.nodes.filter((node) => node.type === 'prompt' || node.type === 'llm') ?? [];
  const recentWorkflowRuns = runs.filter((run) => run.metadata && (run.metadata as { workflowId?: string }).workflowId === selectedWorkflowId).slice(0, 5);

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl p-6">
        <div className="surface-card p-6 text-sm text-[var(--text-secondary)]">正在加载 Workflow Studio...</div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-5 p-6">
      <section className="surface-card p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-xs font-semibold text-accent-600 dark:text-accent-300">
              <WorkflowIcon className="h-4 w-4" />
              本地优先 Agent Workflow Studio
            </div>
            <h1 className="mt-3 text-2xl font-bold text-[var(--text-primary)]">从模板创建、编辑并运行 Workflow</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--text-secondary)]">
              新手路径：选择项目和模板，检查 Start / Prompt / LLM / Tool / Condition / Human Approval / Output 节点，运行后查看 Timeline / Trace。错误会告诉你原因和下一步怎么修。
            </p>
          </div>
          <button onClick={() => void loadBase()} className="btn-secondary" title="刷新" aria-label="刷新">
            <RefreshCw className="h-4 w-4" />
            刷新
          </button>
        </div>
      </section>

      {error && (
        <div className="surface-card border-red-400/40 bg-red-500/10 p-4 text-sm text-red-700 dark:text-red-200">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4" />
            <span>{error}</span>
          </div>
        </div>
      )}
      {status && (
        <div className="surface-card border-emerald-400/30 bg-emerald-500/10 p-4 text-sm text-emerald-700 dark:text-emerald-200">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 h-4 w-4" />
            <span>{status}</span>
          </div>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="space-y-5">
          <div className="surface-card p-5">
            <h2 className="flex items-center gap-2 text-base font-semibold text-[var(--text-primary)]">
              <Plus className="h-4 w-4 text-accent-500" />
              1. 选择入口
            </h2>
            <div className="mt-4 space-y-3">
              <label className="block text-xs font-semibold text-[var(--text-secondary)]">项目</label>
              <select className="control-input" value={selectedProjectId} onChange={(event) => setSelectedProjectId(event.target.value)}>
                <option value="">请选择项目</option>
                {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
              </select>
              <label className="block text-xs font-semibold text-[var(--text-secondary)]">模板</label>
              <select className="control-input" value={selectedTemplateId} onChange={(event) => setSelectedTemplateId(event.target.value)}>
                {templates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}
              </select>
              {selectedTemplate && (
                <p className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 text-xs leading-5 text-[var(--text-secondary)]">
                  {selectedTemplate.description}
                </p>
              )}
              <button className="btn-primary w-full justify-center" onClick={createFromTemplate}>
                <Plus className="h-4 w-4" />
                从模板创建
              </button>
            </div>
          </div>

          <div className="surface-card p-5">
            <h2 className="flex items-center gap-2 text-base font-semibold text-[var(--text-primary)]">
              <Layers className="h-4 w-4 text-accent-500" />
              已有 Workflow
            </h2>
            <div className="mt-3 space-y-2">
              {workflows.length === 0 ? (
                <p className="rounded-lg border border-dashed border-[var(--border)] p-3 text-sm text-[var(--text-secondary)]">
                  还没有 Workflow。下一步：选择一个模板并创建。
                </p>
              ) : workflows.map((workflow) => (
                <button
                  key={workflow.id}
                  onClick={() => setSelectedWorkflowId(workflow.id)}
                  className={`w-full rounded-lg border p-3 text-left text-sm transition-colors ${selectedWorkflowId === workflow.id ? 'border-accent-400 bg-accent-500/10' : 'border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-hover)]'}`}
                >
                  <div className="font-semibold text-[var(--text-primary)]">{workflow.name}</div>
                  <div className="mt-1 text-xs text-[var(--text-secondary)]">v{workflow.version} · {workflow.nodes.length} 节点</div>
                </button>
              ))}
            </div>
          </div>
        </aside>

        <main className="space-y-5">
          <section className="surface-card p-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">2. 编辑基础节点</h2>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">当前先用结构化表单保证可用，后续可以升级为画布。</p>
              </div>
              <button className="btn-secondary" onClick={saveWorkflow} disabled={!selectedWorkflow}>
                <Save className="h-4 w-4" />
                保存版本
              </button>
            </div>

            {selectedWorkflow ? (
              <div className="mt-5 space-y-4">
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {selectedWorkflow.nodes.map((node: WorkflowNode) => (
                    <div key={node.id} className={`rounded-lg border p-3 ${nodeColor(node.type)}`}>
                      <div className="text-xs font-semibold uppercase">{node.type.replace('_', ' ')}</div>
                      <div className="mt-1 text-sm font-bold">{node.title}</div>
                      <p className="mt-1 min-h-[40px] text-xs leading-5 opacity-85">{node.description || '可配置节点'}</p>
                    </div>
                  ))}
                </div>

                {editablePromptNodes.map((node) => (
                  <label key={node.id} className="block">
                    <span className="text-xs font-semibold text-[var(--text-secondary)]">{node.title} 配置</span>
                    <textarea
                      className="control-input mt-1 min-h-[96px]"
                      value={node.config.prompt || node.config.model || ''}
                      onChange={(event) => updateNodePrompt(node.id, event.target.value)}
                      placeholder="填写 Prompt 或模型说明"
                    />
                  </label>
                ))}
              </div>
            ) : (
              <div className="mt-5 rounded-lg border border-dashed border-[var(--border)] p-5 text-sm text-[var(--text-secondary)]">
                请选择或创建一个 Workflow。下一步：左侧点击“从模板创建”。
              </div>
            )}
          </section>

          <section className="surface-card p-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">3. 运行并查看 Trace</h2>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">运行会写入 Run、RunEvent 和审计日志；Provider 未配置时会给出修复建议。</p>
              </div>
              <button className="btn-primary" onClick={runSelectedWorkflow} disabled={!selectedWorkflow}>
                <Play className="h-4 w-4" />
                运行 Workflow
              </button>
            </div>
            <textarea className="control-input mt-4 min-h-[80px]" value={runInput} onChange={(event) => setRunInput(event.target.value)} />

            <div className="mt-5 grid gap-4 xl:grid-cols-2">
              <div>
                <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
                  <Clock3 className="h-4 w-4 text-accent-500" />
                  最近运行
                </h3>
                <div className="space-y-2">
                  {recentWorkflowRuns.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-[var(--border)] p-3 text-sm text-[var(--text-secondary)]">暂无运行记录。下一步：点击运行。</p>
                  ) : recentWorkflowRuns.map((run) => (
                    <article key={run.id} className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-semibold text-[var(--text-primary)]">{run.title}</span>
                        <span className="text-xs text-[var(--text-secondary)]">{run.status}</span>
                      </div>
                      <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">{run.summary}</p>
                      {run.error && <p className="mt-1 text-xs text-red-600 dark:text-red-300">错误原因：{run.error}</p>}
                      <div className="mt-2 flex flex-wrap gap-2">
                        <button className="btn-secondary min-h-[30px] px-2 py-1 text-xs" onClick={() => void controlRun(run.id, 'pause')} aria-label="暂停 Workflow 运行">
                          <Pause className="h-3.5 w-3.5" /> 暂停
                        </button>
                        <button className="btn-secondary min-h-[30px] px-2 py-1 text-xs" onClick={() => void controlRun(run.id, 'cancel')} aria-label="取消 Workflow 运行">
                          <Square className="h-3.5 w-3.5" /> 取消
                        </button>
                        <button className="btn-secondary min-h-[30px] px-2 py-1 text-xs" onClick={() => void controlRun(run.id, 'retry')} aria-label="重试安全 Workflow 节点">
                          <RotateCcw className="h-3.5 w-3.5" /> 重试安全节点
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
                  <GitBranch className="h-4 w-4 text-accent-500" />
                  Timeline / Trace
                </h3>
                <div className="space-y-2">
                  {runEvents.slice(0, 8).map((event) => (
                    <div key={event.id} className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3">
                      <div className="flex items-center gap-2">
                        <Settings className="h-3.5 w-3.5 text-[var(--text-secondary)]" />
                        <span className="text-sm font-semibold text-[var(--text-primary)]">{event.title || '运行事件'}</span>
                        <span className="ml-auto text-xs text-[var(--text-secondary)]">{event.status}</span>
                      </div>
                      {event.detail && <p className="mt-1 text-xs text-[var(--text-secondary)]">{event.detail}</p>}
                    </div>
                  ))}
                  {runEvents.length === 0 && (
                    <p className="rounded-lg border border-dashed border-[var(--border)] p-3 text-sm text-[var(--text-secondary)]">暂无 Trace。运行后会在这里显示节点级事件。</p>
                  )}
                </div>
              </div>
            </div>
          </section>

          <section className="surface-card p-5">
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">4. 版本记录</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {versions.length === 0 ? (
                <span className="text-sm text-[var(--text-secondary)]">暂无版本。保存后会自动生成 WorkflowVersion。</span>
              ) : versions.map((version) => (
                <span key={version.id} className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs text-[var(--text-secondary)]">
                  v{version.version} · {version.message}
                </span>
              ))}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
