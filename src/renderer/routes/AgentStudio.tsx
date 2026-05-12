import React from 'react';
import { Bot, FolderKanban, Pause, PlayCircle, RefreshCw, RotateCcw, Square, UserCheck, Workflow } from 'lucide-react';
import { Badge, Button, EmptyState, SurfaceCard } from '../components';
import { api } from '../lib/api';
import type { AgentExecutionRecord, AgentRecord } from '../lib/types';
import { createDemoAgent } from '../../shared/agentCore';

export default function AgentStudio() {
  const [agents, setAgents] = React.useState<AgentRecord[]>([]);
  const [executions, setExecutions] = React.useState<AgentExecutionRecord[]>([]);
  const [selected, setSelected] = React.useState('');
  const [message, setMessage] = React.useState('');

  const load = React.useCallback(async () => {
    const agentResult = await api.agents.list().catch(() => []);
    const list = Array.isArray(agentResult) ? agentResult : [];
    setAgents(list);
    const selectedId = selected || list[0]?.id || '';
    setSelected(selectedId);
    if (selectedId) {
      const executionResult = await api.agents.executions(selectedId).catch(() => []);
      setExecutions(Array.isArray(executionResult) ? executionResult : []);
    }
  }, [selected]);

  React.useEffect(() => { void load(); }, [load]);

  const createDemo = async () => {
    const demoAgent = createDemoAgent();
    const created = await api.agents.create(demoAgent);
    if ('error' in created) {
      setMessage(created.error);
      return;
    }
    setAgents((current) => [created, ...current.filter((agent) => agent.id !== created.id)]);
    setSelected(created.id);
    const executionResult = await api.agents.executions(created.id).catch(() => []);
    setExecutions(Array.isArray(executionResult) ? executionResult : []);
    setMessage(`已创建 ${created.name}，并生成一条本地模拟执行记录。下一步：运行示例 Workflow 查看 Trace。`);
  };

  const controlExecution = async (executionId: string, action: string) => {
    const result = await api.agents.controlExecution(executionId, action);
    const actionLabel: Record<string, string> = {
      pause: '暂停',
      cancel: '取消',
      retry: '重试安全节点',
      resume: '恢复',
    };
    setMessage('error' in result ? result.error : `执行控制：${actionLabel[action] ?? action}，当前状态 ${result.status}`);
    await load();
  };

  return (
    <div className="mx-auto max-w-7xl space-y-5 p-6">
      <section className="surface-card p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Agent 工作台</h1>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              第一次使用时，先创建“新手演示 Agent”。它不需要 API Key，会生成本地模拟执行记录，帮助你理解 Agent、Workflow、Trace 的关系。
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={load} icon={<RefreshCw className="h-4 w-4" />}>刷新</Button>
            <Button onClick={createDemo} icon={<PlayCircle className="h-4 w-4" />}>创建第一个 Agent</Button>
          </div>
        </div>
      </section>
      <SurfaceCard className="p-4">
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-tool border border-[var(--border)] bg-[var(--surface-muted)] p-3">
            <div className="flex items-center gap-2 text-sm font-semibold"><Bot className="h-4 w-4 text-accent-500" /> 1. Agent</div>
            <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">定义角色、模型、工具边界和记忆范围。</p>
          </div>
          <div className="rounded-tool border border-[var(--border)] bg-[var(--surface-muted)] p-3">
            <div className="flex items-center gap-2 text-sm font-semibold"><Workflow className="h-4 w-4 text-accent-500" /> 2. Workflow</div>
            <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">把 Agent 的执行步骤变成可重复运行的节点。</p>
          </div>
          <div className="rounded-tool border border-[var(--border)] bg-[var(--surface-muted)] p-3">
            <div className="flex items-center gap-2 text-sm font-semibold"><FolderKanban className="h-4 w-4 text-accent-500" /> 3. 结果</div>
            <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">运行后查看输出、失败原因、Token 和审计记录。</p>
          </div>
        </div>
      </SurfaceCard>
      {message && <div className="rounded-tool border border-accent-500/30 bg-accent-500/10 p-3 text-sm text-[var(--accent)]">{message}</div>}
      <div className="grid gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
        <div className="space-y-2">
          {agents.map((agent) => <button key={agent.id} onClick={() => setSelected(agent.id)} className={`w-full rounded-tool border p-3 text-left ${selected === agent.id ? 'border-accent-500 bg-accent-500/10' : 'border-[var(--border)] bg-[var(--surface)]'}`}><div className="font-semibold">{agent.name}</div><div className="mt-1 text-xs text-[var(--text-muted)]">{agent.description}</div><div className="mt-2 flex gap-1"><Badge>{agent.status}</Badge><Badge>{agent.lastHealthStatus}</Badge></div></button>)}
          {agents.length === 0 && <SurfaceCard className="p-6"><EmptyState icon={Bot} title="暂无 Agent" description="创建一个无需 API Key 的演示 Agent，马上看到执行记录长什么样。" actionLabel="创建第一个 Agent" onAction={createDemo} /></SurfaceCard>}
        </div>
        <SurfaceCard className="p-5">
          <h2 className="flex items-center gap-2 text-base font-semibold"><UserCheck className="h-4 w-4" /> 执行时间线</h2>
          <div className="mt-4 space-y-2">
            {executions.map((execution) => (
              <div key={execution.id} className="rounded-tool border border-[var(--border)] bg-[var(--surface-muted)] p-3 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge>{execution.status}</Badge>
                  <span className="font-semibold">{execution.inputSummary}</span>
                </div>
                <p className="mt-1 text-xs text-[var(--text-secondary)]">{execution.outputSummary || execution.errorSummary}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button size="sm" variant="ghost" onClick={() => void controlExecution(execution.id, 'pause')} icon={<Pause className="h-3.5 w-3.5" />}>暂停</Button>
                  <Button size="sm" variant="ghost" onClick={() => void controlExecution(execution.id, 'cancel')} icon={<Square className="h-3.5 w-3.5" />}>取消</Button>
                  <Button size="sm" variant="ghost" onClick={() => void controlExecution(execution.id, 'retry')} icon={<RotateCcw className="h-3.5 w-3.5" />}>重试安全节点</Button>
                  <Button size="sm" variant="secondary" onClick={() => void controlExecution(execution.id, 'resume')}>恢复</Button>
                </div>
                {execution.customData && (
                  <p className="mt-2 text-xs text-[var(--text-muted)]">
                    负责人、Provider、模型、上下文和 Token 归因已经写入执行记录。
                  </p>
                )}
              </div>
            ))}
            {executions.length === 0 && <EmptyState icon={Bot} title="暂无执行记录" description="创建演示 Agent 后会自动生成一条本地模拟记录；运行 Workflow 后也会在这里看到 Provider、工具、上下文来源、Token 用量和失败原因。" actionLabel="生成演示记录" onAction={createDemo} />}
          </div>
        </SurfaceCard>
      </div>
    </div>
  );
}
