import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS } from '../shared/types.js';
import type { McpGatewayRequest, MemoryInjectionMode, NexusGatewayApiKeyCreateRequest } from '../shared/types.js';
import type { AuditQuery } from '../shared/auditTypes.js';
import type { ChangePasswordRequest, CreateUserRequest, LoginRequest, ResetPasswordRequest, UpdateUserRequest } from '../shared/authTypes.js';
import type { Workflow } from '../shared/workflowTypes.js';

// ---------------------------------------------------------------------------
// Type the exposed API so the renderer gets full IntelliSense.
// (Mirrors the shape we attach to the `window.agentflow` object.)
// ---------------------------------------------------------------------------

export interface AgentFlowAPI {
  auth: {
    bootstrap(): Promise<unknown>;
    login(request: LoginRequest): Promise<unknown>;
    logout(): Promise<unknown>;
    session(sessionId?: string): Promise<unknown>;
    changePassword(request: ChangePasswordRequest): Promise<unknown>;
  };
  users: {
    list(): Promise<unknown>;
    directory(): Promise<unknown>;
    create(request: CreateUserRequest): Promise<unknown>;
    update(request: UpdateUserRequest): Promise<unknown>;
    resetPassword(request: ResetPasswordRequest): Promise<unknown>;
  };
  audit: {
    list(query?: AuditQuery): Promise<unknown>;
    exportAll(): Promise<unknown>;
  };
  projects: {
    list(): Promise<unknown>;
    summary(): Promise<unknown>;
    get(id: string): Promise<unknown>;
    create(data: unknown): Promise<unknown>;
    update(id: string, data: unknown): Promise<unknown>;
    delete(id: string): Promise<unknown>;
    getAcl(id: string): Promise<unknown>;
    updateAcl(id: string, acl: unknown): Promise<unknown>;
  };
  tasks: {
    list(projectId: string): Promise<unknown>;
    create(data: unknown): Promise<unknown>;
    update(id: string, data: unknown): Promise<unknown>;
    delete(id: string): Promise<unknown>;
  };
  prompts: {
    list(projectId: string): Promise<unknown>;
    create(data: unknown): Promise<unknown>;
    update(id: string, data: unknown): Promise<unknown>;
    delete(id: string): Promise<unknown>;
  };
  runs: {
    list(projectId: string): Promise<unknown>;
    create(data: unknown): Promise<unknown>;
    events(projectId?: string): Promise<unknown>;
  };
  workflows: {
    templates(): Promise<unknown>;
    list(projectId: string): Promise<unknown>;
    get(workflowId: string): Promise<unknown>;
    createFromTemplate(data: unknown): Promise<unknown>;
    save(workflowId: string, data: Partial<Workflow> & { versionMessage?: string }): Promise<unknown>;
    run(data: unknown): Promise<unknown>;
    controlRun(runId: string, action: string): Promise<unknown>;
    versions(workflowId: string): Promise<unknown>;
    publish(workflowId: string, message?: string): Promise<unknown>;
    rollback(workflowId: string, versionId: string, message?: string): Promise<unknown>;
  };
  mcp: {
    allowlist(): Promise<unknown>;
    check(request: { serverName: string; toolName: string }): Promise<unknown>;
    upsert(entry: unknown): Promise<unknown>;
    evaluate(request: McpGatewayRequest): Promise<unknown>;
  };
  git: {
    log(repoPath: string): Promise<unknown>;
    status(repoPath: string): Promise<unknown>;
    summary(repoPath: string): Promise<unknown>;
  };
  release: {
    status(repoPath?: string): Promise<unknown>;
  };
  memory: {
    list(filters?: Record<string, unknown>): Promise<unknown>;
    get(id: string): Promise<unknown>;
    create(data: unknown): Promise<unknown>;
    update(id: string, data: unknown): Promise<unknown>;
    delete(id: string): Promise<unknown>;
    exportAll(): Promise<unknown>;
    importMemories(data: unknown): Promise<unknown>;
    generateContext(options: { projectId?: string; injectionMode?: MemoryInjectionMode }): Promise<unknown>;
  };
  settings: {
    get(key: string): Promise<unknown>;
    set(key: string, value: unknown): Promise<unknown>;
    getAll(): Promise<unknown>;
  };
  providers: {
    list(): Promise<unknown>;
    create(data: unknown): Promise<unknown>;
    update(id: string, data: unknown): Promise<unknown>;
    delete(id: string): Promise<unknown>;
    presets(): Promise<unknown>;
    testConnection(providerId: string): Promise<unknown>;
    getActive(): Promise<unknown>;
    setActive(config: unknown): Promise<unknown>;
  };
  gateway: {
    status(): Promise<unknown>;
    start(): Promise<unknown>;
    stop(): Promise<unknown>;
    restart(): Promise<unknown>;
    keys(): Promise<unknown>;
    createKey(request: NexusGatewayApiKeyCreateRequest): Promise<unknown>;
    disableKey(id: string): Promise<unknown>;
    deleteKey(id: string): Promise<unknown>;
    resetKey(id: string): Promise<unknown>;
    exportEnv(key?: string): Promise<unknown>;
    exportCodex(key?: string): Promise<unknown>;
    exportClaude(key?: string): Promise<unknown>;
    importPreview(raw: string): Promise<unknown>;
    importApply(raw: string): Promise<unknown>;
  };
  usage: {
    summary(): Promise<unknown>;
    list(filters?: unknown): Promise<unknown>;
  };
  tokenPolicies: {
    list(): Promise<unknown>;
    upsert(policy: unknown): Promise<unknown>;
    evaluate(providerId: string, model?: string): Promise<unknown>;
  };
  health: {
    summary(): Promise<unknown>;
    checkProvider(providerId: string): Promise<unknown>;
  };
  runtimeProfiles: {
    generate(): Promise<unknown>;
  };
  router: {
    decisions(): Promise<unknown>;
  };
  security: {
    report(scope?: string): Promise<unknown>;
  };
  observability: {
    report(options?: unknown): Promise<unknown>;
    getTrace(traceId: string): Promise<unknown>;
    runMockEvaluation(input?: unknown): Promise<unknown>;
    listEvaluationDataset(): Promise<unknown>;
    deleteEvaluationRun(id: string): Promise<unknown>;
  };
  knowledge: {
    assetsSummary(): Promise<unknown>;
    previewDocument(input: { title?: string; content: string }): Promise<unknown>;
    importLocalFile(): Promise<unknown>;
    testRetrieval(input: { query: string; content?: string; topK?: number }): Promise<unknown>;
  };
  ops: {
    backupPreview(): Promise<unknown>;
    createBackup(): Promise<unknown>;
    repairPreview(): Promise<unknown>;
    restorePreview(raw: string): Promise<unknown>;
    restoreApply(input: { raw: string; confirmToken: string }): Promise<unknown>;
  };
  contextPack: {
    preview(options?: unknown): Promise<unknown>;
    recoveryPack(options?: unknown): Promise<unknown>;
  };
  templateBundles: {
    list(): Promise<unknown>;
    upsert(bundle: unknown): Promise<unknown>;
    toggle(id: string, enabled: boolean): Promise<unknown>;
  };
  agents: {
    list(filters?: unknown): Promise<unknown>;
    get(id: string): Promise<unknown>;
    create(data: unknown): Promise<unknown>;
    update(id: string, data: unknown): Promise<unknown>;
    softDelete(id: string): Promise<unknown>;
    enable(id: string): Promise<unknown>;
    disable(id: string): Promise<unknown>;
    health(id: string): Promise<unknown>;
    executions(agentId: string): Promise<unknown>;
    controlExecution(executionId: string, action: string): Promise<unknown>;
    timeline(agentId: string): Promise<unknown>;
  };
  agentFeedback: {
    create(data: unknown): Promise<unknown>;
    list(filters?: unknown): Promise<unknown>;
    get(id: string): Promise<unknown>;
    updateStatus(id: string, status: string): Promise<unknown>;
    export(filters?: unknown): Promise<unknown>;
    createSyntheticFromExecution(executionId: string): Promise<unknown>;
  };
  config: {
    exportAll(): Promise<unknown>;
    importPreview(raw: string): Promise<unknown>;
    importApply(raw: string): Promise<unknown>;
  };
  export: {
    markdown(content: string, filename: string): Promise<unknown>;
    json(data: unknown, filename: string): Promise<unknown>;
  };
  skills: {
    list(): Promise<unknown>;
    read(skillPath: string): Promise<unknown>;
    registry(): Promise<unknown>;
    upsertRegistry(entry: unknown): Promise<unknown>;
    toggleRegistry(id: string, enabled: boolean): Promise<unknown>;
    create(entry: unknown): Promise<unknown>;
    test(skillId: string, input?: Record<string, unknown>): Promise<unknown>;
  };
  app: {
    info(): Promise<unknown>;
    getDataPath(): Promise<unknown>;
  };
  dialog: {
    open(options: unknown): Promise<unknown>;
  };
}

// ---------------------------------------------------------------------------
// Expose
// ---------------------------------------------------------------------------

function buildAuthEnvelope() {
  return { __auth: true };
}

const api: AgentFlowAPI = {
  auth: {
    bootstrap: () => ipcRenderer.invoke(IPC_CHANNELS.AUTH_BOOTSTRAP),
    login: (request: LoginRequest) => ipcRenderer.invoke(IPC_CHANNELS.AUTH_LOGIN, request),
    logout: () => ipcRenderer.invoke(IPC_CHANNELS.AUTH_LOGOUT, buildAuthEnvelope()),
    session: (sessionId?: string) => ipcRenderer.invoke(IPC_CHANNELS.AUTH_SESSION, sessionId),
    changePassword: (request: ChangePasswordRequest) =>
      ipcRenderer.invoke(IPC_CHANNELS.AUTH_CHANGE_PASSWORD, buildAuthEnvelope(), request),
  },

  users: {
    list: () => ipcRenderer.invoke(IPC_CHANNELS.USER_LIST, buildAuthEnvelope()),
    directory: () => ipcRenderer.invoke(IPC_CHANNELS.USER_DIRECTORY, buildAuthEnvelope()),
    create: (request: CreateUserRequest) => ipcRenderer.invoke(IPC_CHANNELS.USER_CREATE, buildAuthEnvelope(), request),
    update: (request: UpdateUserRequest) => ipcRenderer.invoke(IPC_CHANNELS.USER_UPDATE, buildAuthEnvelope(), request),
    resetPassword: (request: ResetPasswordRequest) =>
      ipcRenderer.invoke(IPC_CHANNELS.USER_RESET_PASSWORD, buildAuthEnvelope(), request),
  },

  audit: {
    list: (query?: AuditQuery) => ipcRenderer.invoke(IPC_CHANNELS.AUDIT_LIST, buildAuthEnvelope(), query),
    exportAll: () => ipcRenderer.invoke(IPC_CHANNELS.AUDIT_EXPORT, buildAuthEnvelope()),
  },

  projects: {
    list: () => ipcRenderer.invoke(IPC_CHANNELS.PROJECT_LIST, buildAuthEnvelope()),
    summary: () => ipcRenderer.invoke(IPC_CHANNELS.WORKSPACE_SUMMARY, buildAuthEnvelope()),
    get: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.PROJECT_GET, buildAuthEnvelope(), id),
    create: (data: unknown) => ipcRenderer.invoke(IPC_CHANNELS.PROJECT_CREATE, buildAuthEnvelope(), data),
    update: (id: string, data: unknown) => ipcRenderer.invoke(IPC_CHANNELS.PROJECT_UPDATE, buildAuthEnvelope(), id, data),
    delete: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.PROJECT_DELETE, buildAuthEnvelope(), id),
    getAcl: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.PROJECT_ACL_GET, buildAuthEnvelope(), id),
    updateAcl: (id: string, acl: unknown) => ipcRenderer.invoke(IPC_CHANNELS.PROJECT_ACL_UPDATE, buildAuthEnvelope(), id, acl),
  },

  tasks: {
    list: (projectId: string) => ipcRenderer.invoke(IPC_CHANNELS.TASK_LIST, buildAuthEnvelope(), projectId),
    create: (data: unknown) => ipcRenderer.invoke(IPC_CHANNELS.TASK_CREATE, buildAuthEnvelope(), data),
    update: (id: string, data: unknown) => ipcRenderer.invoke(IPC_CHANNELS.TASK_UPDATE, buildAuthEnvelope(), id, data),
    delete: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.TASK_DELETE, buildAuthEnvelope(), id),
  },

  prompts: {
    list: (projectId: string) => ipcRenderer.invoke(IPC_CHANNELS.PROMPT_LIST, buildAuthEnvelope(), projectId),
    create: (data: unknown) => ipcRenderer.invoke(IPC_CHANNELS.PROMPT_CREATE, buildAuthEnvelope(), data),
    update: (id: string, data: unknown) => ipcRenderer.invoke(IPC_CHANNELS.PROMPT_UPDATE, buildAuthEnvelope(), id, data),
    delete: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.PROMPT_DELETE, buildAuthEnvelope(), id),
  },

  runs: {
    list: (projectId: string) => ipcRenderer.invoke(IPC_CHANNELS.RUN_LIST, buildAuthEnvelope(), projectId),
    create: (data: unknown) => ipcRenderer.invoke(IPC_CHANNELS.RUN_CREATE, buildAuthEnvelope(), data),
    events: (projectId?: string) => ipcRenderer.invoke(IPC_CHANNELS.RUN_EVENTS_LIST, buildAuthEnvelope(), projectId),
  },

  workflows: {
    templates: () => ipcRenderer.invoke(IPC_CHANNELS.WORKFLOW_TEMPLATE_LIST, buildAuthEnvelope()),
    list: (projectId: string) => ipcRenderer.invoke(IPC_CHANNELS.WORKFLOW_LIST, buildAuthEnvelope(), projectId),
    get: (workflowId: string) => ipcRenderer.invoke(IPC_CHANNELS.WORKFLOW_GET, buildAuthEnvelope(), workflowId),
    createFromTemplate: (data: unknown) => ipcRenderer.invoke(IPC_CHANNELS.WORKFLOW_CREATE_FROM_TEMPLATE, buildAuthEnvelope(), data),
    save: (workflowId: string, data: Partial<Workflow> & { versionMessage?: string }) =>
      ipcRenderer.invoke(IPC_CHANNELS.WORKFLOW_SAVE, buildAuthEnvelope(), workflowId, data),
    run: (data: unknown) => ipcRenderer.invoke(IPC_CHANNELS.WORKFLOW_RUN, buildAuthEnvelope(), data),
    controlRun: (runId: string, action: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.WORKFLOW_RUN_CONTROL, buildAuthEnvelope(), runId, action),
    versions: (workflowId: string) => ipcRenderer.invoke(IPC_CHANNELS.WORKFLOW_VERSION_LIST, buildAuthEnvelope(), workflowId),
    publish: (workflowId: string, message?: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.WORKFLOW_PUBLISH, buildAuthEnvelope(), workflowId, message),
    rollback: (workflowId: string, versionId: string, message?: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.WORKFLOW_ROLLBACK, buildAuthEnvelope(), workflowId, versionId, message),
  },

  mcp: {
    allowlist: () => ipcRenderer.invoke(IPC_CHANNELS.MCP_ALLOWLIST_LIST, buildAuthEnvelope()),
    check: (request: { serverName: string; toolName: string }) =>
      ipcRenderer.invoke(IPC_CHANNELS.MCP_ALLOWLIST_CHECK, buildAuthEnvelope(), request),
    upsert: (entry: unknown) => ipcRenderer.invoke(IPC_CHANNELS.MCP_ALLOWLIST_UPSERT, buildAuthEnvelope(), entry),
    evaluate: (request: McpGatewayRequest) =>
      ipcRenderer.invoke(IPC_CHANNELS.MCP_GATEWAY_EVALUATE, buildAuthEnvelope(), request),
  },

  git: {
    log: (repoPath: string) => ipcRenderer.invoke(IPC_CHANNELS.GIT_LOG, buildAuthEnvelope(), repoPath),
    status: (repoPath: string) => ipcRenderer.invoke(IPC_CHANNELS.GIT_STATUS, buildAuthEnvelope(), repoPath),
    summary: (repoPath: string) => ipcRenderer.invoke(IPC_CHANNELS.GIT_SUMMARY, buildAuthEnvelope(), repoPath),
  },

  release: {
    status: (repoPath?: string) => ipcRenderer.invoke(IPC_CHANNELS.RELEASE_STATUS, buildAuthEnvelope(), repoPath),
  },

  memory: {
    list: (filters?: Record<string, unknown>) =>
      ipcRenderer.invoke(IPC_CHANNELS.MEMORY_LIST, buildAuthEnvelope(), filters),
    get: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.MEMORY_GET, buildAuthEnvelope(), id),
    create: (data: unknown) => ipcRenderer.invoke(IPC_CHANNELS.MEMORY_CREATE, buildAuthEnvelope(), data),
    update: (id: string, data: unknown) => ipcRenderer.invoke(IPC_CHANNELS.MEMORY_UPDATE, buildAuthEnvelope(), id, data),
    delete: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.MEMORY_DELETE, buildAuthEnvelope(), id),
    exportAll: () => ipcRenderer.invoke(IPC_CHANNELS.MEMORY_EXPORT, buildAuthEnvelope()),
    importMemories: (data: unknown) => ipcRenderer.invoke(IPC_CHANNELS.MEMORY_IMPORT, buildAuthEnvelope(), data),
    generateContext: (options: { projectId?: string; injectionMode?: MemoryInjectionMode }) =>
      ipcRenderer.invoke(IPC_CHANNELS.MEMORY_GENERATE_CONTEXT, buildAuthEnvelope(), options),
  },

  settings: {
    get: (key: string) => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_GET, buildAuthEnvelope(), key),
    set: (key: string, value: unknown) => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_SET, buildAuthEnvelope(), key, value),
    getAll: () => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_GET_ALL, buildAuthEnvelope()),
  },

  providers: {
    list: () => ipcRenderer.invoke(IPC_CHANNELS.PROVIDER_LIST, buildAuthEnvelope()),
    create: (data: unknown) => ipcRenderer.invoke(IPC_CHANNELS.PROVIDER_CREATE, buildAuthEnvelope(), data),
    update: (id: string, data: unknown) => ipcRenderer.invoke(IPC_CHANNELS.PROVIDER_UPDATE, buildAuthEnvelope(), id, data),
    delete: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.PROVIDER_DELETE, buildAuthEnvelope(), id),
    presets: () => ipcRenderer.invoke(IPC_CHANNELS.PROVIDER_PRESETS, buildAuthEnvelope()),
    testConnection: (providerId: string) => ipcRenderer.invoke(IPC_CHANNELS.PROVIDER_TEST, buildAuthEnvelope(), providerId),
    getActive: () => ipcRenderer.invoke(IPC_CHANNELS.PROVIDER_ACTIVE_GET, buildAuthEnvelope()),
    setActive: (config: unknown) => ipcRenderer.invoke(IPC_CHANNELS.PROVIDER_ACTIVE_SET, buildAuthEnvelope(), config),
  },

  gateway: {
    status: () => ipcRenderer.invoke(IPC_CHANNELS.GATEWAY_STATUS, buildAuthEnvelope()),
    start: () => ipcRenderer.invoke(IPC_CHANNELS.GATEWAY_START, buildAuthEnvelope()),
    stop: () => ipcRenderer.invoke(IPC_CHANNELS.GATEWAY_STOP, buildAuthEnvelope()),
    restart: () => ipcRenderer.invoke(IPC_CHANNELS.GATEWAY_RESTART, buildAuthEnvelope()),
    keys: () => ipcRenderer.invoke(IPC_CHANNELS.GATEWAY_KEY_LIST, buildAuthEnvelope()),
    createKey: (request: NexusGatewayApiKeyCreateRequest) =>
      ipcRenderer.invoke(IPC_CHANNELS.GATEWAY_KEY_CREATE, buildAuthEnvelope(), request),
    disableKey: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.GATEWAY_KEY_DISABLE, buildAuthEnvelope(), id),
    deleteKey: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.GATEWAY_KEY_DELETE, buildAuthEnvelope(), id),
    resetKey: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.GATEWAY_KEY_RESET, buildAuthEnvelope(), id),
    exportEnv: (key?: string) => ipcRenderer.invoke(IPC_CHANNELS.GATEWAY_EXPORT_ENV, buildAuthEnvelope(), key),
    exportCodex: (key?: string) => ipcRenderer.invoke(IPC_CHANNELS.GATEWAY_EXPORT_CODEX, buildAuthEnvelope(), key),
    exportClaude: (key?: string) => ipcRenderer.invoke(IPC_CHANNELS.GATEWAY_EXPORT_CLAUDE, buildAuthEnvelope(), key),
    importPreview: (raw: string) => ipcRenderer.invoke(IPC_CHANNELS.GATEWAY_IMPORT_PREVIEW, buildAuthEnvelope(), raw),
    importApply: (raw: string) => ipcRenderer.invoke(IPC_CHANNELS.GATEWAY_IMPORT_APPLY, buildAuthEnvelope(), raw),
  },

  usage: {
    summary: () => ipcRenderer.invoke(IPC_CHANNELS.USAGE_SUMMARY, buildAuthEnvelope()),
    list: (filters?: unknown) => ipcRenderer.invoke(IPC_CHANNELS.USAGE_LIST, buildAuthEnvelope(), filters),
  },

  tokenPolicies: {
    list: () => ipcRenderer.invoke(IPC_CHANNELS.TOKEN_POLICY_LIST, buildAuthEnvelope()),
    upsert: (policy: unknown) => ipcRenderer.invoke(IPC_CHANNELS.TOKEN_POLICY_UPSERT, buildAuthEnvelope(), policy),
    evaluate: (providerId: string, model?: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.TOKEN_POLICY_EVALUATE, buildAuthEnvelope(), providerId, model),
  },

  health: {
    summary: () => ipcRenderer.invoke(IPC_CHANNELS.HEALTH_SUMMARY, buildAuthEnvelope()),
    checkProvider: (providerId: string) => ipcRenderer.invoke(IPC_CHANNELS.HEALTH_CHECK_PROVIDER, buildAuthEnvelope(), providerId),
  },

  runtimeProfiles: {
    generate: () => ipcRenderer.invoke(IPC_CHANNELS.RUNTIME_PROFILES_GENERATE, buildAuthEnvelope()),
  },

  router: {
    decisions: () => ipcRenderer.invoke(IPC_CHANNELS.ROUTER_DECISIONS_LIST, buildAuthEnvelope()),
  },

  security: {
    report: (scope?: string) => ipcRenderer.invoke(IPC_CHANNELS.SECURITY_REPORT_GENERATE, buildAuthEnvelope(), scope),
  },

  observability: {
    report: (options?: unknown) =>
      ipcRenderer.invoke(IPC_CHANNELS.OBSERVABILITY_REPORT_GENERATE, buildAuthEnvelope(), options),
    getTrace: (traceId: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.OBSERVABILITY_TRACE_GET, buildAuthEnvelope(), traceId),
    runMockEvaluation: (input?: unknown) =>
      ipcRenderer.invoke(IPC_CHANNELS.EVAL_MOCK_RUN, buildAuthEnvelope(), input),
    listEvaluationDataset: () =>
      ipcRenderer.invoke(IPC_CHANNELS.EVAL_DATASET_LIST, buildAuthEnvelope()),
    deleteEvaluationRun: (id: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.EVAL_DATASET_DELETE, buildAuthEnvelope(), id),
  },

  knowledge: {
    assetsSummary: () => ipcRenderer.invoke(IPC_CHANNELS.KNOWLEDGE_ASSETS_SUMMARY, buildAuthEnvelope()),
    previewDocument: (input: { title?: string; content: string }) =>
      ipcRenderer.invoke(IPC_CHANNELS.KNOWLEDGE_DOCUMENT_PREVIEW, buildAuthEnvelope(), input),
    importLocalFile: () =>
      ipcRenderer.invoke(IPC_CHANNELS.KNOWLEDGE_DOCUMENT_IMPORT_LOCAL_FILE, buildAuthEnvelope()),
    testRetrieval: (input: { query: string; content?: string; topK?: number }) =>
      ipcRenderer.invoke(IPC_CHANNELS.KNOWLEDGE_RETRIEVAL_TEST, buildAuthEnvelope(), input),
  },

  ops: {
    backupPreview: () => ipcRenderer.invoke(IPC_CHANNELS.OPS_BACKUP_PREVIEW, buildAuthEnvelope()),
    createBackup: () => ipcRenderer.invoke(IPC_CHANNELS.OPS_BACKUP_CREATE, buildAuthEnvelope()),
    repairPreview: () => ipcRenderer.invoke(IPC_CHANNELS.OPS_REPAIR_PREVIEW, buildAuthEnvelope()),
    restorePreview: (raw: string) => ipcRenderer.invoke(IPC_CHANNELS.OPS_RESTORE_PREVIEW, buildAuthEnvelope(), raw),
    restoreApply: (input: { raw: string; confirmToken: string }) =>
      ipcRenderer.invoke(IPC_CHANNELS.OPS_RESTORE_APPLY, buildAuthEnvelope(), input),
  },

  contextPack: {
    preview: (options?: unknown) => ipcRenderer.invoke(IPC_CHANNELS.CONTEXT_PACK_PREVIEW, buildAuthEnvelope(), options),
    recoveryPack: (options?: unknown) => ipcRenderer.invoke(IPC_CHANNELS.CONTEXT_RECOVERY_PACK, buildAuthEnvelope(), options),
  },

  templateBundles: {
    list: () => ipcRenderer.invoke(IPC_CHANNELS.TEMPLATE_BUNDLES_LIST, buildAuthEnvelope()),
    upsert: (bundle: unknown) => ipcRenderer.invoke(IPC_CHANNELS.TEMPLATE_BUNDLES_UPSERT, buildAuthEnvelope(), bundle),
    toggle: (id: string, enabled: boolean) => ipcRenderer.invoke(IPC_CHANNELS.TEMPLATE_BUNDLES_TOGGLE, buildAuthEnvelope(), id, enabled),
  },

  agents: {
    list: (filters?: unknown) => ipcRenderer.invoke(IPC_CHANNELS.AGENT_LIST, buildAuthEnvelope(), filters),
    get: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.AGENT_GET, buildAuthEnvelope(), id),
    create: (data: unknown) => ipcRenderer.invoke(IPC_CHANNELS.AGENT_CREATE, buildAuthEnvelope(), data),
    update: (id: string, data: unknown) => ipcRenderer.invoke(IPC_CHANNELS.AGENT_UPDATE, buildAuthEnvelope(), id, data),
    softDelete: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.AGENT_SOFT_DELETE, buildAuthEnvelope(), id),
    enable: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.AGENT_ENABLE, buildAuthEnvelope(), id),
    disable: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.AGENT_DISABLE, buildAuthEnvelope(), id),
    health: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.AGENT_HEALTH, buildAuthEnvelope(), id),
    executions: (agentId: string) => ipcRenderer.invoke(IPC_CHANNELS.AGENT_EXECUTIONS_LIST, buildAuthEnvelope(), agentId),
    controlExecution: (executionId: string, action: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.AGENT_EXECUTION_CONTROL, buildAuthEnvelope(), executionId, action),
    timeline: (agentId: string) => ipcRenderer.invoke(IPC_CHANNELS.AGENT_TIMELINE_LIST, buildAuthEnvelope(), agentId),
  },

  agentFeedback: {
    create: (data: unknown) => ipcRenderer.invoke(IPC_CHANNELS.AGENT_FEEDBACK_CREATE, buildAuthEnvelope(), data),
    list: (filters?: unknown) => ipcRenderer.invoke(IPC_CHANNELS.AGENT_FEEDBACK_LIST, buildAuthEnvelope(), filters),
    get: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.AGENT_FEEDBACK_GET, buildAuthEnvelope(), id),
    updateStatus: (id: string, status: string) => ipcRenderer.invoke(IPC_CHANNELS.AGENT_FEEDBACK_UPDATE_STATUS, buildAuthEnvelope(), id, status),
    export: (filters?: unknown) => ipcRenderer.invoke(IPC_CHANNELS.AGENT_FEEDBACK_EXPORT, buildAuthEnvelope(), filters),
    createSyntheticFromExecution: (executionId: string) => ipcRenderer.invoke(IPC_CHANNELS.AGENT_FEEDBACK_SYNTHETIC, buildAuthEnvelope(), executionId),
  },

  config: {
    exportAll: () => ipcRenderer.invoke(IPC_CHANNELS.CONFIG_EXPORT, buildAuthEnvelope()),
    importPreview: (raw: string) => ipcRenderer.invoke(IPC_CHANNELS.CONFIG_IMPORT_PREVIEW, buildAuthEnvelope(), raw),
    importApply: (raw: string) => ipcRenderer.invoke(IPC_CHANNELS.CONFIG_IMPORT_APPLY, buildAuthEnvelope(), raw),
  },

  export: {
    markdown: (content: string, filename: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.EXPORT_MARKDOWN, buildAuthEnvelope(), content, filename),
    json: (data: unknown, filename: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.EXPORT_JSON, buildAuthEnvelope(), data, filename),
  },

  skills: {
    list: () => ipcRenderer.invoke(IPC_CHANNELS.SKILLS_LIST, buildAuthEnvelope()),
    read: (skillPath: string) => ipcRenderer.invoke(IPC_CHANNELS.SKILL_READ, buildAuthEnvelope(), skillPath),
    registry: () => ipcRenderer.invoke(IPC_CHANNELS.SKILLS_REGISTRY_LIST, buildAuthEnvelope()),
    upsertRegistry: (entry: unknown) => ipcRenderer.invoke(IPC_CHANNELS.SKILLS_REGISTRY_UPSERT, buildAuthEnvelope(), entry),
    toggleRegistry: (id: string, enabled: boolean) => ipcRenderer.invoke(IPC_CHANNELS.SKILLS_REGISTRY_TOGGLE, buildAuthEnvelope(), id, enabled),
    create: (entry: unknown) => ipcRenderer.invoke(IPC_CHANNELS.SKILL_CREATE, buildAuthEnvelope(), entry),
    test: (skillId: string, input?: Record<string, unknown>) => ipcRenderer.invoke(IPC_CHANNELS.SKILL_TEST, buildAuthEnvelope(), skillId, input),
  },

  app: {
    info: () => ipcRenderer.invoke(IPC_CHANNELS.APP_INFO),
    getDataPath: () => ipcRenderer.invoke(IPC_CHANNELS.GET_DATA_PATH, buildAuthEnvelope()),
  },

  dialog: {
    open: (options: unknown) => ipcRenderer.invoke(IPC_CHANNELS.DIALOG_OPEN, buildAuthEnvelope(), options),
  },
};

contextBridge.exposeInMainWorld('agentflow', api);
