import { IPC_CHANNELS } from './types.js';

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
  buildPlanPath: string;
  summary: string;
  routes: string[];
  ipcChannels: string[];
  permissions: string[];
  auditEvents: string[];
  storageCollections: string[];
  testFiles: string[];
  status: 'implemented' | 'partial' | 'planned';
  completionPercent: number;
  completedCapabilities: string[];
  incompleteCapabilities: string[];
}

export interface LocalAiRouteContract {
  path: string;
  moduleId: LocalAiModuleId;
  label: string;
  legacyAlias?: boolean;
  permission?: string;
}

export interface LocalAiStorageContract {
  collection: string;
  moduleId: LocalAiModuleId;
  schemaVersion: number;
  redaction: 'none' | 'secrets-redacted' | 'renderer-masked';
  backup: 'included' | 'manifest-only' | 'excluded';
}

export interface LocalAiIpcContract {
  channel: string;
  moduleId: LocalAiModuleId;
  permission: string;
  auditEvent?: string;
}

export const LOCALAI_MODULE_REGISTRY: LocalAiModuleContract[] = [
  {
    id: '00-modular-refactor',
    name: 'Modular Refactor Contract',
    buildPlanPath: 'docs/build-plans/00-modular-refactor-master-plan/build-plan.md',
    summary: 'Build-plan inventory, navigation configuration, shared module registry, route contracts, IPC contracts, and storage contracts exist; main handlers are still being migrated out of global files.',
    routes: ['/'],
    ipcChannels: ['module:registry'],
    permissions: ['app:read'],
    auditEvents: ['module.contract.verified'],
    storageCollections: [],
    testFiles: ['tests/unit/moduleRegistry.test.ts'],
    status: 'partial',
    completionPercent: 55,
    completedCapabilities: ['Build-plan inventory', 'Navigation groups', 'Shared module registry', 'Route contract registry', 'IPC contract registry', 'Storage contract registry'],
    incompleteCapabilities: ['Per-module IPC handler files', 'Repository implementation registry', 'Migration runner', 'Compatibility deprecation ledger'],
  },
  {
    id: '01-workspace',
    name: 'Workspace and Project Center',
    buildPlanPath: 'docs/build-plans/01-workspace-and-project-center/build-plan.md',
    summary: 'Dashboard, Project Hub, project detail, onboarding, search/filter/archive, quick module entry, and workspace summary IPC are visible; project import/apply remains incomplete.',
    routes: ['/', '/projects', '/projects/:id', '/settings'],
    ipcChannels: ['workspace:summary', 'project:list', 'project:create', 'project:update', 'project:delete', 'config:export', 'config:importPreview'],
    permissions: ['project:read', 'project:write', 'settings:read'],
    auditEvents: ['workspace.summary.viewed', 'project.create', 'project.update', 'project.archive', 'config.export', 'config.import'],
    storageCollections: ['projects', 'tasks', 'runs'],
    testFiles: ['tests/e2e/app.spec.ts', 'tests/unit/moduleRegistry.test.ts'],
    status: 'partial',
    completionPercent: 82,
    completedCapabilities: ['Dashboard onboarding', 'Project CRUD shell', 'Search/filter/archive UI', 'Project detail aggregation', 'Workspace summary IPC', 'E2E navigation coverage'],
    incompleteCapabilities: ['Project import/apply flow', 'OnboardingState persistence', 'Project template import/export audit'],
  },
  {
    id: '02-providers',
    name: 'AI Resources and Model Providers',
    buildPlanPath: 'docs/build-plans/02-ai-resources-and-model-providers/build-plan.md',
    summary: 'Provider Hub, presets, masked key storage, connection tests, active provider switching, router/runtime/health surfaces exist; live model sync and full capability matrix are next-stage.',
    routes: ['/providers', '/router', '/runtime', '/health'],
    ipcChannels: ['provider:list', 'provider:create', 'provider:update', 'provider:delete', 'provider:test', 'provider:active:set'],
    permissions: ['provider:read', 'provider:write'],
    auditEvents: ['provider.create', 'provider.update', 'provider.delete', 'provider.connection_test', 'provider.active_switch'],
    storageCollections: ['providerSettings', 'healthChecks', 'modelRoutes'],
    testFiles: ['tests/unit/localaiNexusServices.test.ts', 'tests/unit/configPortability.test.ts'],
    status: 'partial',
    completionPercent: 72,
    completedCapabilities: ['Provider CRUD', 'Preset creation', 'Masked credential handling', 'Connection diagnostics', 'Active provider switching'],
    incompleteCapabilities: ['Live provider confidence without user keys', 'Model sync', 'Full capability matrix', 'Key rotation flow', 'Provider import/apply UI'],
  },
  {
    id: '03-gateway',
    name: 'Local Gateway and API Keys',
    buildPlanPath: 'docs/build-plans/03-local-gateway-and-api-keys/build-plan.md',
    summary: 'Local OpenAI-compatible endpoints, Gateway key CRUD/reset/disable/delete, key policy enforcement, usage logs, and ccs/sub2api/cc-switch import preview are implemented locally.',
    routes: ['/gateway', '/tokens'],
    ipcChannels: ['gateway:status', 'gateway:start', 'gateway:stop', 'gateway:restart', 'gateway:key:list', 'gateway:key:create', 'gateway:key:disable', 'gateway:key:delete', 'gateway:key:reset', 'gateway:importPreview', 'gateway:importApply'],
    permissions: ['gateway:read', 'gateway:write'],
    auditEvents: ['gateway.started', 'gateway.key.created', 'gateway.key.disabled', 'gateway.key.deleted', 'gateway.key.reset', 'gateway.request.completed', 'gateway.request.denied', 'gateway.embeddings.completed'],
    storageCollections: ['gatewayApiKeys', 'gatewayRequests', 'tokenUsage', 'tokenPolicies'],
    testFiles: ['tests/unit/gatewayKeyService.test.ts', 'tests/unit/localaiNexusServices.test.ts'],
    status: 'partial',
    completionPercent: 90,
    completedCapabilities: ['Gateway start/stop/restart/status', 'OpenAI-compatible local endpoints', 'Key CRUD and copy-once export', 'Quota/rate/concurrency enforcement', 'Config import preview/apply ledger'],
    incompleteCapabilities: ['Real upstream streaming', 'Credentialed live provider forwarding', 'Images/audio/batches endpoints'],
  },
  {
    id: '04-agents-workflow',
    name: 'Agent Workflow and MCP',
    buildPlanPath: 'docs/build-plans/04-agent-workflow-and-mcp/build-plan.md',
    summary: 'Agent Studio, Workflow Studio, demo run records, run controls, workflow publish/rollback, MCP allowlist checks, and timeline evidence exist; risky external tool approval remains incomplete.',
    routes: ['/agents', '/workflows', '/skills', '/prompts'],
    ipcChannels: ['agent:list', 'agent:create', 'agent:execution:control', 'workflow:run', 'workflow:run:control', 'workflow:publish', 'workflow:rollback', 'mcp:gateway:evaluate'],
    permissions: ['project:read', 'project:write', 'run:write', 'mcp:write', 'skill:read'],
    auditEvents: ['agent.create', 'agent.execution.control', 'workflow.run', 'workflow.run.control', 'workflow.publish', 'workflow.rollback', 'mcp.allowed', 'mcp.denied'],
    storageCollections: ['agents', 'agentExecutions', 'workflows', 'workflowVersions', 'runEvents', 'mcpAllowlist'],
    testFiles: ['tests/unit/agentCore.test.ts', 'tests/unit/workflowRuntime.test.ts', 'tests/unit/workflowVersioning.test.ts', 'tests/unit/mcpGateway.test.ts'],
    status: 'partial',
    completionPercent: 76,
    completedCapabilities: ['Agent CRUD shell', 'Demo execution persistence', 'Workflow template/run path', 'Pause/cancel/retry/resume records', 'Workflow publish/rollback', 'MCP allowlist evaluation'],
    incompleteCapabilities: ['Visual workflow canvas', 'External MCP tool discovery', 'Risky tool approval modal', 'Workflow import/export'],
  },
  {
    id: '05-knowledge-memory',
    name: 'Knowledge Prompt and Memory Assets',
    buildPlanPath: 'docs/build-plans/05-knowledge-prompt-and-memory/build-plan.md',
    summary: 'Prompt Lab, Knowledge Base, Shared Memory Hub, context/recovery packs, knowledge asset summary, document preview, main-process local file import, retrieval test, and redaction flows exist; full embedding-backed RAG indexing remains incomplete.',
    routes: ['/knowledge', '/memory', '/prompts'],
    ipcChannels: ['memory:list', 'memory:create', 'memory:update', 'memory:import', 'memory:generateContext', 'knowledge:assets:summary', 'knowledge:document:preview', 'knowledge:document:importLocalFile', 'knowledge:retrieval:test'],
    permissions: ['memory:read', 'memory:write', 'memory:export', 'prompt:write'],
    auditEvents: ['memory.create', 'memory.update', 'memory.import', 'knowledge.document.previewed', 'knowledge.document.imported', 'knowledge.retrieval.tested', 'prompt.version.created'],
    storageCollections: ['memories', 'prompts', 'knowledgeDocuments'],
    testFiles: ['tests/unit/knowledgeService.test.ts', 'tests/unit/memoryInjection.test.ts'],
    status: 'partial',
    completionPercent: 80,
    completedCapabilities: ['Prompt CRUD/versioning path', 'Memory lifecycle and filters', 'Context pack preview', 'Knowledge Base route', 'Knowledge asset summary', 'Knowledge preview/local file import/retrieval tests', 'Secret redaction coverage'],
    incompleteCapabilities: ['Embedding provider binding', 'Persistent vector index', 'RAG quality evaluation', 'Multi-file parser adapters'],
  },
  {
    id: '06-observability',
    name: 'Observability Evaluation and Feedback',
    buildPlanPath: 'docs/build-plans/06-observability-evaluation-and-feedback/build-plan.md',
    summary: 'Token Center, Diagnostics, Log Analyzer, usage records, observability report export, trace lookup, mock evaluation dataset management, and feedback records exist; credentialed red-team loops remain incomplete.',
    routes: ['/diagnostics', '/logs', '/tokens'],
    ipcChannels: ['observability:report:generate', 'observability:trace:get', 'eval:mock:run', 'eval:dataset:list', 'eval:dataset:delete', 'usage:summary', 'usage:list', 'runEvents:list'],
    permissions: ['admin:audit', 'provider:read', 'project:read', 'memory:export'],
    auditEvents: ['observability.report.generate', 'observability.trace.get', 'eval.mock.completed', 'eval.dataset.list', 'eval.dataset.delete', 'feedback.created'],
    storageCollections: ['tokenUsage', 'gatewayRequests', 'runEvents', 'evaluationRuns', 'agentFeedback'],
    testFiles: ['tests/unit/observabilityService.test.ts', 'tests/unit/localaiNexusServices.test.ts'],
    status: 'partial',
    completionPercent: 78,
    completedCapabilities: ['Usage summaries', 'Diagnostics panel', 'Admin-scoped trace lookup/detail list', 'Log analyzer', 'Mock evaluation dataset CRUD', 'Redacted observability report', 'Report export UI'],
    incompleteCapabilities: ['Credentialed red-team suite', 'Closed-loop feedback automation'],
  },
  {
    id: '07-security-ops',
    name: 'Identity Security Audit and Ops',
    buildPlanPath: 'docs/build-plans/07-identity-security-audit-and-ops/build-plan.md',
    summary: 'Login, first-password-change, admin users, RBAC/ACL, audit hash/export, security report, backup/restore preview, repair preview, merge-only restore apply, settings, and shortcut verification are locally implemented.',
    routes: ['/security', '/admin/users', '/admin/audit', '/settings', '/diagnostics'],
    ipcChannels: ['auth:login', 'auth:changePassword', 'user:list', 'audit:list', 'audit:export', 'security:report:generate', 'ops:backup:preview', 'ops:repair:preview', 'ops:restore:preview', 'ops:restore:apply'],
    permissions: ['admin:users', 'admin:audit', 'ops:backup', 'ops:restore', 'settings:read', 'settings:write'],
    auditEvents: ['auth.login.succeeded', 'auth.password.changed', 'permission.denied', 'audit.exported', 'ops.backup.previewed', 'ops.repair.previewed', 'ops.restore.previewed', 'ops.restore.applied'],
    storageCollections: ['users', 'sessions', 'auditLogs', 'settings'],
    testFiles: ['tests/unit/auth.test.ts', 'tests/unit/audit.test.ts', 'tests/unit/opsBackupService.test.ts'],
    status: 'partial',
    completionPercent: 84,
    completedCapabilities: ['Local login/session', 'Admin users', 'RBAC/ACL guards', 'Tamper-evident audit export', 'Backup/restore/repair preview', 'Merge-only restore apply', 'Theme/language settings'],
    incompleteCapabilities: ['Secret rotation', 'Migration runner', 'Repair apply flow', 'Full diagnostics export workflow'],
  },
];

export const LOCALAI_ROUTE_CONTRACTS: LocalAiRouteContract[] = LOCALAI_MODULE_REGISTRY.flatMap((module) =>
  module.routes.map((route) => ({
    path: route,
    moduleId: module.id,
    label: module.name,
    permission: module.permissions[0],
  })),
);

export const LEGACY_ROUTE_CONTRACTS: LocalAiRouteContract[] = [
  { path: '/prompt-lab', moduleId: '04-agents-workflow', label: 'Prompt Lab legacy alias', legacyAlias: true, permission: 'prompt:write' },
  { path: '/log-analyzer', moduleId: '06-observability', label: 'Log Analyzer legacy alias', legacyAlias: true, permission: 'project:read' },
  { path: '/git-timeline', moduleId: '06-observability', label: 'Git Timeline legacy alias', legacyAlias: true, permission: 'git:read' },
  { path: '/safety-box', moduleId: '07-security-ops', label: 'Safety Guard legacy alias', legacyAlias: true, permission: 'admin:audit' },
  { path: '/shared-memory-hub', moduleId: '05-knowledge-memory', label: 'Shared Memory legacy alias', legacyAlias: true, permission: 'memory:read' },
];

export const LOCALAI_STORAGE_CONTRACTS: LocalAiStorageContract[] = [
  { collection: 'projects', moduleId: '01-workspace', schemaVersion: 1, redaction: 'none', backup: 'included' },
  { collection: 'tasks', moduleId: '01-workspace', schemaVersion: 1, redaction: 'none', backup: 'included' },
  { collection: 'runs', moduleId: '01-workspace', schemaVersion: 1, redaction: 'secrets-redacted', backup: 'included' },
  { collection: 'providerSettings', moduleId: '02-providers', schemaVersion: 1, redaction: 'renderer-masked', backup: 'included' },
  { collection: 'healthChecks', moduleId: '02-providers', schemaVersion: 1, redaction: 'secrets-redacted', backup: 'included' },
  { collection: 'modelRoutes', moduleId: '02-providers', schemaVersion: 1, redaction: 'secrets-redacted', backup: 'included' },
  { collection: 'gatewayApiKeys', moduleId: '03-gateway', schemaVersion: 1, redaction: 'renderer-masked', backup: 'manifest-only' },
  { collection: 'gatewayRequests', moduleId: '03-gateway', schemaVersion: 1, redaction: 'secrets-redacted', backup: 'included' },
  { collection: 'tokenUsage', moduleId: '03-gateway', schemaVersion: 1, redaction: 'secrets-redacted', backup: 'included' },
  { collection: 'tokenPolicies', moduleId: '03-gateway', schemaVersion: 1, redaction: 'secrets-redacted', backup: 'included' },
  { collection: 'activeGatewayRequests', moduleId: '03-gateway', schemaVersion: 1, redaction: 'secrets-redacted', backup: 'excluded' },
  { collection: 'agents', moduleId: '04-agents-workflow', schemaVersion: 1, redaction: 'secrets-redacted', backup: 'included' },
  { collection: 'agentExecutions', moduleId: '04-agents-workflow', schemaVersion: 1, redaction: 'secrets-redacted', backup: 'included' },
  { collection: 'agentFeedback', moduleId: '04-agents-workflow', schemaVersion: 1, redaction: 'secrets-redacted', backup: 'included' },
  { collection: 'workflows', moduleId: '04-agents-workflow', schemaVersion: 1, redaction: 'secrets-redacted', backup: 'included' },
  { collection: 'workflowVersions', moduleId: '04-agents-workflow', schemaVersion: 1, redaction: 'secrets-redacted', backup: 'included' },
  { collection: 'mcpAllowlist', moduleId: '04-agents-workflow', schemaVersion: 1, redaction: 'secrets-redacted', backup: 'included' },
  { collection: 'prompts', moduleId: '05-knowledge-memory', schemaVersion: 1, redaction: 'secrets-redacted', backup: 'included' },
  { collection: 'memories', moduleId: '05-knowledge-memory', schemaVersion: 1, redaction: 'secrets-redacted', backup: 'included' },
  { collection: 'knowledgeDocuments', moduleId: '05-knowledge-memory', schemaVersion: 1, redaction: 'secrets-redacted', backup: 'included' },
  { collection: 'runEvents', moduleId: '06-observability', schemaVersion: 1, redaction: 'secrets-redacted', backup: 'included' },
  { collection: 'diagnosticReports', moduleId: '06-observability', schemaVersion: 1, redaction: 'secrets-redacted', backup: 'included' },
  { collection: 'evaluationRuns', moduleId: '06-observability', schemaVersion: 1, redaction: 'secrets-redacted', backup: 'included' },
  { collection: 'users', moduleId: '07-security-ops', schemaVersion: 1, redaction: 'renderer-masked', backup: 'manifest-only' },
  { collection: 'sessions', moduleId: '07-security-ops', schemaVersion: 1, redaction: 'renderer-masked', backup: 'excluded' },
  { collection: 'auditLogs', moduleId: '07-security-ops', schemaVersion: 1, redaction: 'secrets-redacted', backup: 'included' },
  { collection: 'settings', moduleId: '07-security-ops', schemaVersion: 1, redaction: 'secrets-redacted', backup: 'included' },
  { collection: 'riskChecks', moduleId: '07-security-ops', schemaVersion: 1, redaction: 'secrets-redacted', backup: 'included' },
  { collection: 'backupManifests', moduleId: '07-security-ops', schemaVersion: 1, redaction: 'secrets-redacted', backup: 'included' },
  { collection: 'runtimeProfiles', moduleId: '02-providers', schemaVersion: 1, redaction: 'secrets-redacted', backup: 'included' },
  { collection: 'templateBundles', moduleId: '04-agents-workflow', schemaVersion: 1, redaction: 'secrets-redacted', backup: 'included' },
  { collection: 'skills', moduleId: '04-agents-workflow', schemaVersion: 1, redaction: 'secrets-redacted', backup: 'included' },
  { collection: 'skillRuns', moduleId: '04-agents-workflow', schemaVersion: 1, redaction: 'secrets-redacted', backup: 'included' },
  { collection: 'skillsRegistry', moduleId: '04-agents-workflow', schemaVersion: 1, redaction: 'secrets-redacted', backup: 'included' },
];

export const LOCALAI_IPC_CONTRACTS: LocalAiIpcContract[] = LOCALAI_MODULE_REGISTRY.flatMap((module) =>
  module.ipcChannels.map((channel) => ({
    channel,
    moduleId: module.id,
    permission: module.permissions[0] ?? 'app:read',
    auditEvent: module.auditEvents[0],
  })),
);

export function getModuleStorageCollections(id: LocalAiModuleId): string[] {
  return LOCALAI_STORAGE_CONTRACTS.filter((contract) => contract.moduleId === id).map((contract) => contract.collection);
}

export function getAllRegisteredStorageCollections(): string[] {
  return [...new Set(LOCALAI_STORAGE_CONTRACTS.map((contract) => contract.collection))];
}

export function getModuleContract(id: LocalAiModuleId): LocalAiModuleContract {
  const contract = LOCALAI_MODULE_REGISTRY.find((module) => module.id === id);
  if (!contract) throw new Error(`Unknown LocalAI Nexus module: ${id}`);
  return contract;
}

export function getIpcContract(channel: string): LocalAiIpcContract | undefined {
  return LOCALAI_IPC_CONTRACTS.find((contract) => contract.channel === channel);
}

export function getRouteContract(path: string): LocalAiRouteContract | undefined {
  return [...LOCALAI_ROUTE_CONTRACTS, ...LEGACY_ROUTE_CONTRACTS].find((contract) => contract.path === path);
}

export const REQUIRED_BUILD_PLAN_CHANNELS = [
  IPC_CHANNELS.WORKSPACE_SUMMARY,
  IPC_CHANNELS.GATEWAY_RESTART,
  IPC_CHANNELS.GATEWAY_IMPORT_PREVIEW,
  IPC_CHANNELS.KNOWLEDGE_ASSETS_SUMMARY,
  IPC_CHANNELS.KNOWLEDGE_DOCUMENT_PREVIEW,
  IPC_CHANNELS.KNOWLEDGE_DOCUMENT_IMPORT_LOCAL_FILE,
  IPC_CHANNELS.OBSERVABILITY_REPORT_GENERATE,
  IPC_CHANNELS.OBSERVABILITY_TRACE_GET,
  IPC_CHANNELS.EVAL_DATASET_LIST,
  IPC_CHANNELS.EVAL_DATASET_DELETE,
  IPC_CHANNELS.OPS_BACKUP_PREVIEW,
  IPC_CHANNELS.OPS_REPAIR_PREVIEW,
  IPC_CHANNELS.OPS_RESTORE_APPLY,
];
