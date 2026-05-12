import type { AgentExecutionRecord, AgentRecord, ProviderSetting } from './types.js';

export type PreflightCode =
  | 'ok'
  | 'provider_secret_missing'
  | 'permission_denied'
  | 'mcp_denied'
  | 'validation_error'
  | 'safe_storage_unavailable'
  | 'network_error'
  | 'runtime_error'
  | 'agent_disabled';

export interface PreflightResult {
  ok: boolean;
  code: PreflightCode;
  message: string;
  action: string;
}

export const ERROR_MESSAGES_ZH: Record<Exclude<PreflightCode, 'ok'>, { message: string; action: string }> = {
  provider_secret_missing: {
    message: '当前 Provider 缺少 API Key 或密钥不可读取。',
    action: '请进入 Provider Preset Center 重新保存 API Key，或先使用 Demo Agent。',
  },
  permission_denied: {
    message: '当前角色没有执行此操作的权限。',
    action: '请联系管理员授予相应角色，或切换到有权限的账号。',
  },
  mcp_denied: {
    message: 'MCP 工具未在 allowlist 中启用。',
    action: '请在 MCP & Skills 管理页添加或启用对应 server/tool 规则。',
  },
  validation_error: {
    message: '运行前检查发现必要字段不完整。',
    action: '请补齐 Agent 名称、Provider、模型和输入摘要后重试。',
  },
  safe_storage_unavailable: {
    message: '系统安全存储不可用，LocalAI Nexus 已拒绝保存密钥。',
    action: '请在支持 Electron safeStorage 的桌面环境中配置密钥。',
  },
  network_error: {
    message: 'Provider 连接失败或网络不可达。',
    action: '请检查 base URL、代理、防火墙和模型名称。',
  },
  runtime_error: {
    message: '运行时发生未知错误。',
    action: '请查看日志和时间线，复制错误摘要后提交反馈。',
  },
  agent_disabled: {
    message: 'Agent 当前已禁用。',
    action: '请先启用 Agent，或从模板创建一个新的 Demo Agent。',
  },
};

export function mapErrorToChinese(code: PreflightCode): PreflightResult {
  if (code === 'ok') return { ok: true, code, message: '检查通过。', action: '可以开始运行。' };
  return { ok: false, code, ...ERROR_MESSAGES_ZH[code] };
}

export function preflightAgentRun(options: {
  agent?: Pick<AgentRecord, 'name' | 'status' | 'providerRef' | 'model'> | null;
  provider?: Pick<ProviderSetting, 'apiKey' | 'needsApiKey' | 'lastTestStatus'> | null;
  canRun: boolean;
  inputSummary?: string;
  mcpAllowed?: boolean;
}): PreflightResult {
  if (!options.canRun) return mapErrorToChinese('permission_denied');
  if (!options.agent?.name || !options.inputSummary?.trim()) return mapErrorToChinese('validation_error');
  if (options.agent.status !== 'enabled') return mapErrorToChinese('agent_disabled');
  if (options.mcpAllowed === false) return mapErrorToChinese('mcp_denied');
  if (!options.agent.providerRef || !options.agent.model) return mapErrorToChinese('validation_error');
  if (options.provider?.needsApiKey !== false && !options.provider?.apiKey) return mapErrorToChinese('provider_secret_missing');
  if (options.provider?.lastTestStatus === 'failure') return mapErrorToChinese('network_error');
  return mapErrorToChinese('ok');
}

export function createDemoAgent(now = new Date(), id = 'demo-agent'): AgentRecord {
  const timestamp = now.toISOString();
  return {
    id,
    name: '新手演示 Agent',
    description: '无需 API Key 的本地模拟 Agent，用于体验输入、执行记录、时间线和反馈链路。',
    type: 'demo',
    status: 'enabled',
    providerRef: 'demo-provider',
    model: 'mock-local-demo',
    systemPrompt: '你是 LocalAI Nexus 的安全演示 Agent。只生成本地模拟结果，不调用外部工具。',
    toolsAllowlistRef: 'demo-readonly',
    skillsRefs: [],
    createdAt: timestamp,
    updatedAt: timestamp,
    lastHealthStatus: 'healthy',
  };
}

export function createDemoExecution(agentId = 'demo-agent', now = new Date()): AgentExecutionRecord {
  const startedAt = now.toISOString();
  return {
    id: `demo-execution-${now.getTime()}`,
    agentId,
    projectId: 'onboarding-demo-project',
    status: 'demo',
    startedAt,
    finishedAt: startedAt,
    durationMs: 12,
    inputSummary: '演示输入：把一个需求整理成可执行计划。',
    outputSummary: '演示结果：已生成本地模拟响应，并写入执行时间线。',
    customData: { externalCalls: 0, dangerousOperations: false },
    createdAt: startedAt,
  };
}

export const AGENT_TEMPLATES = [
  { id: 'qa-assistant', name: '问答助手', type: 'assistant', description: '面向项目知识库的中文问答 Agent。' },
  { id: 'file-summary', name: '文件总结', type: 'assistant', description: '总结文件或日志，输出结构化摘要。' },
  { id: 'workflow-test', name: '工作流测试', type: 'workflow', description: '验证 workflow 节点、输入输出和回放边界。' },
  { id: 'mcp-demo', name: 'MCP 工具调用演示', type: 'demo', description: '只展示 allowlist 决策，不执行外部工具。' },
  { id: 'code-review-feedback', name: '代码审查反馈', type: 'reviewer', description: '生成审查意见并支持一键反馈。' },
  { id: 'blank-agent', name: '空白 Agent 模板', type: 'custom', description: '从零配置系统提示词、模型和工具边界。' },
] as const;
