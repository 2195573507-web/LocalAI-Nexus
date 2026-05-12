export type LocalAiModuleId =
  | '00-modular-refactor'
  | '01-workspace'
  | '02-providers'
  | '03-gateway'
  | '04-agents-workflow'
  | '05-knowledge-memory'
  | '06-observability'
  | '07-security-ops';

export interface LocalAiModuleContract {
  id: LocalAiModuleId;
  name: string;
  routes: string[];
  ipcChannels: string[];
  permissions: string[];
  auditEvents: string[];
  storageCollections: string[];
  testFiles: string[];
  status: 'implemented' | 'partial' | 'planned';
}

export const LOCALAI_MODULE_REGISTRY: LocalAiModuleContract[] = [
  {
    id: '00-modular-refactor',
    name: 'Modular Refactor Contract',
    routes: ['/'],
    ipcChannels: ['module:registry'],
    permissions: ['app:read'],
    auditEvents: ['module.contract.verified'],
    storageCollections: [],
    testFiles: ['tests/unit/moduleRegistry.test.ts'],
    status: 'implemented',
  },
  {
    id: '01-workspace',
    name: 'Workspace and Project Center',
    routes: ['/', '/projects', '/projects/:id', '/settings'],
    ipcChannels: ['project:list', 'project:create', 'project:update', 'project:delete', 'config:export', 'config:importPreview'],
    permissions: ['project:read', 'project:write', 'settings:read'],
    auditEvents: ['project.create', 'project.update', 'project.archive', 'config.export', 'config.import'],
    storageCollections: ['projects', 'tasks', 'runs'],
    testFiles: ['tests/e2e/app.spec.ts', 'tests/unit/moduleRegistry.test.ts'],
    status: 'implemented',
  },
  {
    id: '02-providers',
    name: 'AI Resources and Model Providers',
    routes: ['/providers', '/router', '/runtime', '/health'],
    ipcChannels: ['provider:list', 'provider:create', 'provider:update', 'provider:delete', 'provider:test', 'provider:active:set'],
    permissions: ['gateway:read', 'gateway:write'],
    auditEvents: ['provider.create', 'provider.update', 'provider.delete', 'provider.connection_test', 'provider.active_switch'],
    storageCollections: ['providerSettings', 'healthChecks', 'modelRoutes'],
    testFiles: ['tests/unit/localaiNexusServices.test.ts', 'tests/unit/configPortability.test.ts'],
    status: 'implemented',
  },
  {
    id: '03-gateway',
    name: 'Local Gateway and API Keys',
    routes: ['/gateway', '/tokens'],
    ipcChannels: ['gateway:status', 'gateway:start', 'gateway:stop', 'gateway:key:list', 'gateway:key:create', 'gateway:key:disable', 'gateway:key:delete', 'gateway:key:reset'],
    permissions: ['provider:read', 'provider:write'],
    auditEvents: ['gateway.started', 'gateway.key.created', 'gateway.key.disabled', 'gateway.key.deleted', 'gateway.key.reset', 'gateway.request.completed', 'gateway.request.denied', 'gateway.embeddings.completed'],
    storageCollections: ['gatewayApiKeys', 'gatewayRequests', 'tokenUsage', 'tokenPolicies'],
    testFiles: ['tests/unit/gatewayKeyService.test.ts', 'tests/unit/localaiNexusServices.test.ts'],
    status: 'implemented',
  },
  {
    id: '04-agents-workflow',
    name: 'Agent Workflow and MCP',
    routes: ['/agents', '/workflows', '/skills', '/prompts'],
    ipcChannels: ['agent:list', 'agent:create', 'agent:execution:control', 'workflow:run', 'workflow:run:control', 'mcp:gateway:evaluate'],
    permissions: ['project:read', 'project:write', 'run:write', 'mcp:write', 'skill:read'],
    auditEvents: ['agent.create', 'agent.execution.control', 'workflow.run', 'workflow.run.control', 'mcp.allowed', 'mcp.denied'],
    storageCollections: ['agents', 'agentExecutions', 'workflows', 'workflowVersions', 'runEvents', 'mcpAllowlist'],
    testFiles: ['tests/unit/agentCore.test.ts', 'tests/unit/workflowRuntime.test.ts', 'tests/unit/mcpGateway.test.ts'],
    status: 'implemented',
  },
  {
    id: '05-knowledge-memory',
    name: 'Knowledge Prompt and Memory Assets',
    routes: ['/memory', '/prompts'],
    ipcChannels: ['memory:list', 'memory:create', 'memory:update', 'memory:import', 'memory:generateContext', 'knowledge:document:preview', 'knowledge:retrieval:test'],
    permissions: ['memory:read', 'memory:write', 'memory:export', 'prompt:write'],
    auditEvents: ['memory.create', 'memory.update', 'memory.import', 'knowledge.document.previewed', 'knowledge.retrieval.tested', 'prompt.version.created'],
    storageCollections: ['memories', 'prompts'],
    testFiles: ['tests/unit/knowledgeService.test.ts', 'tests/unit/memoryInjection.test.ts'],
    status: 'implemented',
  },
  {
    id: '06-observability',
    name: 'Observability Evaluation and Feedback',
    routes: ['/diagnostics', '/logs', '/tokens'],
    ipcChannels: ['observability:report:generate', 'eval:mock:run', 'usage:summary', 'usage:list', 'runEvents:list'],
    permissions: ['provider:read', 'project:read', 'memory:export'],
    auditEvents: ['observability.report.generated', 'eval.mock.completed', 'feedback.created'],
    storageCollections: ['tokenUsage', 'gatewayRequests', 'runEvents', 'agentFeedback'],
    testFiles: ['tests/unit/observabilityService.test.ts', 'tests/unit/localaiNexusServices.test.ts'],
    status: 'implemented',
  },
  {
    id: '07-security-ops',
    name: 'Identity Security Audit and Ops',
    routes: ['/security', '/admin/users', '/admin/audit', '/settings', '/diagnostics'],
    ipcChannels: ['auth:login', 'auth:changePassword', 'user:list', 'audit:list', 'audit:export', 'security:report:generate', 'ops:backup:preview', 'ops:restore:preview'],
    permissions: ['admin:users', 'admin:audit', 'ops:backup', 'ops:restore', 'settings:read', 'settings:write'],
    auditEvents: ['auth.login.succeeded', 'auth.password.changed', 'permission.denied', 'audit.exported', 'ops.backup.previewed', 'ops.restore.previewed'],
    storageCollections: ['users', 'sessions', 'auditLogs', 'settings'],
    testFiles: ['tests/unit/auth.test.ts', 'tests/unit/audit.test.ts', 'tests/unit/opsBackupService.test.ts'],
    status: 'implemented',
  },
];

export function getModuleContract(id: LocalAiModuleId): LocalAiModuleContract {
  const contract = LOCALAI_MODULE_REGISTRY.find((module) => module.id === id);
  if (!contract) throw new Error(`Unknown LocalAI Nexus module: ${id}`);
  return contract;
}
