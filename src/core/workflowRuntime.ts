import type {
  Workflow,
  WorkflowEdge,
  WorkflowNode,
  WorkflowNodeTrace,
  WorkflowRunResult,
} from '../shared/workflowTypes.js';

function nowIso(): string {
  return new Date().toISOString();
}

function summarize(value: string | undefined, fallback: string): string {
  const text = (value || fallback).trim();
  return text.length > 140 ? `${text.slice(0, 137)}...` : text;
}

function nextNode(edges: WorkflowEdge[], currentNodeId: string, condition?: string): string | undefined {
  const candidates = edges.filter((edge) => edge.source === currentNodeId);
  if (condition) {
    return candidates.find((edge) => edge.condition === condition)?.target ?? candidates[0]?.target;
  }
  return candidates[0]?.target;
}

function conditionPasses(expression: string | undefined, input: string): boolean {
  const expr = (expression || '').trim().toLowerCase();
  if (!expr) return true;
  if (expr.includes('contains:')) {
    const needle = expr.split('contains:')[1]?.trim() ?? '';
    return needle.length === 0 || input.toLowerCase().includes(needle);
  }
  if (expr.includes('not-empty')) return input.trim().length > 0;
  return !['false', 'no', 'reject', 'blocked'].includes(expr);
}

function traceFor(node: WorkflowNode, input: string): WorkflowNodeTrace {
  const startedAt = nowIso();
  return {
    id: `${node.id}-${Date.now()}`,
    nodeId: node.id,
    nodeTitle: node.title,
    nodeType: node.type,
    status: 'running',
    startedAt,
    inputSummary: summarize(input, 'No input'),
  };
}

function finishTrace(trace: WorkflowNodeTrace, patch: Partial<WorkflowNodeTrace>): WorkflowNodeTrace {
  const endedAt = nowIso();
  return {
    ...trace,
    ...patch,
    endedAt,
    durationMs: Math.max(1, new Date(endedAt).getTime() - new Date(trace.startedAt).getTime()),
  };
}

export function validateWorkflow(workflow: Workflow): string[] {
  const errors: string[] = [];
  const nodeIds = new Set(workflow.nodes.map((node) => node.id));
  if (!workflow.nodes.some((node) => node.type === 'start')) errors.push('Workflow 必须包含 Start 节点。');
  if (!workflow.nodes.some((node) => node.type === 'output')) errors.push('Workflow 必须包含 Output 节点。');
  for (const edge of workflow.edges) {
    if (!nodeIds.has(edge.source)) errors.push(`连线 ${edge.id} 缺少源节点。`);
    if (!nodeIds.has(edge.target)) errors.push(`连线 ${edge.id} 缺少目标节点。`);
  }
  return errors;
}

export function runWorkflow(workflow: Workflow, input = ''): WorkflowRunResult {
  const validationErrors = validateWorkflow(workflow);
  if (validationErrors.length > 0) {
    return {
      status: 'failed',
      summary: 'Workflow 无法运行，因为图结构不完整。',
      output: '',
      error: validationErrors.join(' '),
      nextStep: '打开 Workflow 编辑器，补齐缺失的 Start/Output 节点或修复断开的连线。',
      nodeTrace: [],
    };
  }

  const nodes = new Map(workflow.nodes.map((node) => [node.id, node]));
  const trace: WorkflowNodeTrace[] = [];
  let cursor = workflow.nodes.find((node) => node.type === 'start')?.id;
  let currentInput = input || '新手示例输入';
  let output = '';
  const visited = new Set<string>();

  while (cursor) {
    if (visited.has(cursor)) {
      return {
        status: 'failed',
        summary: 'Workflow 已停止，因为检测到循环。',
        output,
        error: `节点 ${cursor} 被访问了两次。`,
        nextStep: '移除循环，或在后续版本中添加显式循环控制节点。',
        nodeTrace: trace,
      };
    }
    visited.add(cursor);

    const node = nodes.get(cursor);
    if (!node) {
      return {
        status: 'failed',
        summary: 'Workflow 已停止，因为有连线指向缺失节点。',
        output,
        error: `缺失节点：${cursor}`,
        nextStep: '打开编辑器，删除或修复这条断开的连线。',
        nodeTrace: trace,
      };
    }

    const active = traceFor(node, currentInput);

    if (node.type === 'start') {
      currentInput = summarize(currentInput, 'Workflow 已启动');
      trace.push(finishTrace(active, { status: 'success', outputSummary: 'Workflow 已启动。' }));
      cursor = nextNode(workflow.edges, node.id);
      continue;
    }

    if (node.type === 'prompt') {
      currentInput = node.config.prompt || currentInput;
      trace.push(finishTrace(active, { status: 'success', outputSummary: summarize(currentInput, 'Prompt 已准备。') }));
      cursor = nextNode(workflow.edges, node.id);
      continue;
    }

    if (node.type === 'llm') {
      if (!node.config.providerRef && !node.config.model) {
        trace.push(finishTrace(active, {
          status: 'failure',
          failureReason: 'LLM 节点没有配置 Provider 或模型。',
          nextStep: '前往 Provider 设置，添加 API Key，然后为该节点选择 Provider/模型。',
        }));
        return {
          status: 'failed',
          summary: '缺少 LLM 配置。',
          output,
          error: 'LLM 节点没有配置 Provider 或模型。',
          nextStep: '配置 Provider/API Key 并选择模型后再运行。',
          nodeTrace: trace,
        };
      }
      currentInput = `LLM 草稿（${node.config.model || '已配置模型'}）：${summarize(currentInput, 'Prompt')}`;
      trace.push(finishTrace(active, { status: 'success', outputSummary: currentInput }));
      cursor = nextNode(workflow.edges, node.id);
      continue;
    }

    if (node.type === 'tool') {
      const toolName = node.config.toolName || 'local.echo';
      currentInput = `Tool ${toolName} 已完成本地 dry-run 输出。`;
      trace.push(finishTrace(active, { status: 'success', outputSummary: currentInput }));
      cursor = nextNode(workflow.edges, node.id);
      continue;
    }

    if (node.type === 'condition') {
      const passed = conditionPasses(node.config.conditionExpression, currentInput);
      trace.push(finishTrace(active, {
        status: 'success',
        outputSummary: passed ? '条件通过。' : '条件未通过。',
      }));
      cursor = nextNode(workflow.edges, node.id, passed ? 'true' : 'false');
      continue;
    }

    if (node.type === 'human_approval') {
      const approved = !currentInput.toLowerCase().includes('reject');
      if (!approved) {
        trace.push(finishTrace(active, {
          status: 'blocked',
          outputSummary: '等待人工审批。',
          nextStep: '检查生成内容，审批后重新运行。',
        }));
        return {
          status: 'blocked',
          summary: 'Workflow 正在等待人工审批。',
          output,
          nextStep: '审批或修改草稿后，再次运行 Workflow。',
          nodeTrace: trace,
        };
      }
      trace.push(finishTrace(active, { status: 'success', outputSummary: '已由本地模拟审核通过。' }));
      cursor = nextNode(workflow.edges, node.id, 'approved');
      continue;
    }

    if (node.type === 'output') {
      output = node.config.sampleOutput || currentInput;
      trace.push(finishTrace(active, { status: 'success', outputSummary: summarize(output, '已生成输出。') }));
      cursor = undefined;
    }
  }

  return {
    status: 'success',
    summary: `Workflow “${workflow.name}” 已完成，生成 ${trace.length} 条 trace 事件。`,
    output,
    nodeTrace: trace,
  };
}
