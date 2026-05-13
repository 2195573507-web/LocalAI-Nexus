// ── IPC API Wrapper ──
// Provides typed access to window.agentflow exposed by the preload script.
// Components import from here, never from electron directly.

import type {
  Project,
  Task,
  SavedPrompt,
  Run,
  Memory,
  ProviderSetting,
  ProviderPreset,
  ActiveProviderConfig,
  AgentRecord,
  AgentExecutionRecord,
  AgentFeedbackRecord,
  SkillRegistryEntry,
  ConfigBundle,
  AppSettings,
  SkillMeta,
  SafetyCheckResult,
  GitCommitEntry,
  ReleaseStatus,
  MemoryInjectionMode,
  McpGatewayDecision,
  McpGatewayRequest,
  NexusGatewayStatus,
  NexusHealthCheckResult,
  NexusContextPackPreview,
  NexusBackupManifest,
  NexusEvaluationRun,
  NexusRecoveryPack,
  NexusRouterDecision,
  NexusSecurityReport,
  NexusTemplateBundle,
  NexusTokenPolicy,
  NexusTokenPolicyEvaluation,
  NexusRuntimeProfile,
  NexusSkillTestResult,
  NexusUsageRecord,
  NexusUsageSummary,
  NexusGatewayApiKey,
  NexusGatewayApiKeyCreateRequest,
  NexusGatewayApiKeyCreateResult,
  NexusGatewayConfigApplyResult,
  NexusGatewayConfigImportPreview,
  NexusEvaluationDataset,
  NexusEvaluationDatasetDeleteResult,
  NexusKnowledgeAssetSummary,
  NexusKnowledgeDocumentPreview,
  NexusKnowledgeRetrievalResult,
  NexusObservabilityReport,
  NexusOpsRepairPreview,
  NexusTraceDetail,
  NexusRestoreApplyResult,
  NexusRestorePreview,
  NexusWorkspaceSummary,
} from '../../shared/types';
import type {
  Workflow,
  WorkflowRunResult,
  AgentWorkflowTemplate,
  WorkflowPublishResult,
  WorkflowRollbackResult,
  WorkflowVersion,
} from '../../shared/workflowTypes';
import type { AuditEvent, AuditExportManifest, AuditIntegrityReport, AuditQuery } from '../../shared/auditTypes';
import type {
  AuthSessionState,
  ChangePasswordRequest,
  CreateUserRequest,
  LoginRequest,
  LoginResult,
  PublicUser,
  ResourceAcl,
  ResetPasswordRequest,
  ResetPasswordResult,
  SessionUser,
  UpdateUserRequest,
} from '../../shared/authTypes';

// ── Preload API interface ──

interface AgentFlowPreloadAPI {
  auth?: {
    bootstrap(): Promise<{ ok: boolean } | { error: string }>;
    login(request: LoginRequest): Promise<LoginResult | { error: string }>;
    logout(): Promise<boolean | { error: string }>;
    session(sessionId?: string): Promise<AuthSessionState | { error: string }>;
    changePassword(request: ChangePasswordRequest): Promise<SessionUser | { error: string }>;
  };
  users?: {
    list(): Promise<PublicUser[] | { error: string }>;
    directory?(): Promise<PublicUser[] | { error: string }>;
    create(request: CreateUserRequest): Promise<PublicUser | { error: string }>;
    update(request: UpdateUserRequest): Promise<PublicUser | { error: string }>;
    resetPassword(request: ResetPasswordRequest): Promise<ResetPasswordResult | { error: string }>;
  };
  audit?: {
    list(query?: AuditQuery): Promise<AuditEvent[] | { error: string }>;
    exportAll(): Promise<{ auditLogs: AuditEvent[]; integrity?: AuditIntegrityReport; manifest?: AuditExportManifest; exportedAt: string } | { error: string }>;
  };
  storage?: {
    get<T>(key: string): Promise<T | null>;
    set(key: string, value: unknown): Promise<void>;
    delete(key: string): Promise<void>;
    getAll(): Promise<Record<string, unknown>>;
  };
  projects?: {
    list(): Promise<Project[]>;
    summary?(): Promise<NexusWorkspaceSummary | { error: string }>;
    get(id: string): Promise<Project | null>;
    create(project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'> | Project): Promise<Project>;
    update(id: string, updates: Partial<Project>): Promise<Project | null>;
    delete(id: string): Promise<boolean>;
    getAcl?(id: string): Promise<{ projectId: string; acl: ResourceAcl; ownerUserId: string } | { error: string }>;
    updateAcl?(id: string, acl: ResourceAcl): Promise<Project | { error: string }>;
  };
  tasks?: {
    list(projectId?: string): Promise<Task[]>;
    create(task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'> | Task): Promise<Task>;
    update(id: string, updates: Partial<Task>): Promise<Task | null>;
    delete(id: string): Promise<boolean>;
  };
  prompts?: {
    list(projectId?: string): Promise<SavedPrompt[]>;
    create(prompt: Omit<SavedPrompt, 'id' | 'createdAt' | 'updatedAt'> | SavedPrompt): Promise<SavedPrompt>;
    update(id: string, updates: Partial<SavedPrompt>): Promise<SavedPrompt | null>;
    delete(id: string): Promise<boolean>;
  };
  runs?: {
    list(projectId: string): Promise<Run[]>;
    create(run: Omit<Run, 'id'>): Promise<Run>;
    events(projectId?: string): Promise<unknown[]>;
  };
  workflows?: {
    templates(): Promise<AgentWorkflowTemplate[] | { error: string }>;
    list(projectId: string): Promise<Workflow[] | { error: string }>;
    get(workflowId: string): Promise<Workflow | { error: string }>;
    createFromTemplate(data: { projectId: string; templateId: string; name?: string }): Promise<Workflow | { error: string }>;
    save(workflowId: string, data: Partial<Workflow> & { versionMessage?: string }): Promise<Workflow | { error: string }>;
    run(data: { workflowId: string; input?: string }): Promise<{ run: Run; result: WorkflowRunResult } | { error: string }>;
    controlRun?(runId: string, action: string): Promise<Run | { error: string }>;
    versions(workflowId: string): Promise<WorkflowVersion[] | { error: string }>;
    publish?(workflowId: string, message?: string): Promise<WorkflowPublishResult | { error: string }>;
    rollback?(workflowId: string, versionId: string, message?: string): Promise<WorkflowRollbackResult | { error: string }>;
  };
  mcp?: {
    allowlist(): Promise<unknown[]>;
    check(request: { serverName: string; toolName: string }): Promise<{ allowed: boolean } | { error: string }>;
    upsert(entry: unknown): Promise<unknown>;
    evaluate?(request: McpGatewayRequest): Promise<McpGatewayDecision | { error: string }>;
  };
  git?: {
    log(repoPath: string): Promise<GitCommitEntry[]>;
    status(repoPath: string): Promise<string>;
    summary(repoPath: string): Promise<{
      branch: string;
      commitCount: number;
      recentCommits: GitCommitEntry[];
    }>;
  };
  release?: {
    status(repoPath?: string): Promise<ReleaseStatus>;
  };
  memory?: {
    list(filters?: Record<string, unknown>): Promise<Memory[]>;
    get(id: string): Promise<Memory | null>;
    create(memory: Omit<Memory, 'id' | 'createdAt' | 'updatedAt' | 'lastUsedAt'> | Memory): Promise<Memory>;
    update(id: string, updates: Partial<Memory>): Promise<Memory | null>;
    delete(id: string): Promise<boolean>;
    exportAll(): Promise<unknown>;
    importMemories(data: unknown): Promise<unknown>;
    generateContext(options: { projectId?: string; injectionMode?: MemoryInjectionMode }): Promise<string>;
  };
  checkCommandSafety(command: string): Promise<SafetyCheckResult>;
  settings?: {
    get(key?: string): Promise<unknown>;
    set(key: string, value: unknown): Promise<void>;
    getAll(): Promise<AppSettings>;
  };
  providers?: {
    list(): Promise<ProviderSetting[]>;
    create(provider: Omit<ProviderSetting, 'id' | 'createdAt' | 'updatedAt'> | ProviderSetting): Promise<ProviderSetting>;
    update(id: string, updates: Partial<ProviderSetting>): Promise<ProviderSetting | null>;
    delete(id: string): Promise<boolean>;
    presets?(): Promise<ProviderPreset[]>;
    testConnection?(providerId: string): Promise<{ ok: boolean; status: string; message: string; checkedAt: string } | { error: string }>;
    getActive?(): Promise<{ providerRef: string; model: string; agentDefaultProviderRef?: string } | { error: string }>;
    setActive?(config: ActiveProviderConfig): Promise<ActiveProviderConfig | { error: string }>;
  };
  gateway?: {
    status(): Promise<NexusGatewayStatus | { error: string }>;
    start(): Promise<NexusGatewayStatus | { error: string }>;
    stop(): Promise<NexusGatewayStatus | { error: string }>;
    restart?(): Promise<NexusGatewayStatus | { error: string }>;
    keys?(): Promise<NexusGatewayApiKey[] | { error: string }>;
    createKey?(request: NexusGatewayApiKeyCreateRequest): Promise<NexusGatewayApiKeyCreateResult | { error: string }>;
    disableKey?(id: string): Promise<NexusGatewayApiKey | { error: string }>;
    deleteKey?(id: string): Promise<NexusGatewayApiKey | { error: string }>;
    resetKey?(id: string): Promise<NexusGatewayApiKeyCreateResult | { error: string }>;
    exportEnv?(key?: string): Promise<unknown>;
    exportCodex?(key?: string): Promise<unknown>;
    exportClaude?(key?: string): Promise<unknown>;
    importPreview?(raw: string): Promise<NexusGatewayConfigImportPreview | { error: string }>;
    importApply?(raw: string): Promise<NexusGatewayConfigApplyResult | { error: string }>;
  };
  usage?: {
    summary(): Promise<NexusUsageSummary | { error: string }>;
    list(filters?: unknown): Promise<NexusUsageRecord[] | { error: string }>;
  };
  tokenPolicies?: {
    list(): Promise<NexusTokenPolicy[] | { error: string }>;
    upsert(policy: Partial<NexusTokenPolicy>): Promise<NexusTokenPolicy | { error: string }>;
    evaluate(providerId: string, model?: string): Promise<NexusTokenPolicyEvaluation | { error: string }>;
  };
  health?: {
    summary(): Promise<{ latest: NexusHealthCheckResult[]; byStatus: Record<string, number> } | { error: string }>;
    checkProvider(providerId: string): Promise<NexusHealthCheckResult | { error: string }>;
  };
  runtimeProfiles?: {
    generate(): Promise<NexusRuntimeProfile[] | { error: string }>;
  };
  router?: {
    decisions(): Promise<NexusRouterDecision[] | { error: string }>;
  };
  security?: {
    report(scope?: string): Promise<NexusSecurityReport | { error: string }>;
  };
  observability?: {
    report(options?: { includeMockEvaluation?: boolean; evaluationOutput?: string }): Promise<NexusObservabilityReport | { error: string }>;
    getTrace?(traceId: string): Promise<NexusTraceDetail | { error: string }>;
    runMockEvaluation(input?: { name?: string; target?: 'prompt' | 'model'; promptId?: string; providerId?: string; model?: string; output?: string }): Promise<NexusEvaluationRun | { error: string }>;
    listEvaluationDataset?(): Promise<NexusEvaluationDataset | { error: string }>;
    deleteEvaluationRun?(id: string): Promise<NexusEvaluationDatasetDeleteResult | { error: string }>;
  };
  knowledge?: {
    assetsSummary?(): Promise<NexusKnowledgeAssetSummary | { error: string }>;
    previewDocument(input: { title?: string; content: string }): Promise<NexusKnowledgeDocumentPreview | { error: string }>;
    importLocalFile?(): Promise<NexusKnowledgeDocumentPreview | { canceled: true } | { error: string }>;
    testRetrieval(input: { query: string; content?: string; topK?: number }): Promise<NexusKnowledgeRetrievalResult | { error: string }>;
  };
  ops?: {
    backupPreview(): Promise<NexusBackupManifest | { error: string }>;
    createBackup(): Promise<NexusBackupManifest | { error: string }>;
    repairPreview?(): Promise<NexusOpsRepairPreview | { error: string }>;
    restorePreview(raw: string): Promise<NexusRestorePreview | { error: string }>;
    restoreApply?(input: { raw: string; confirmToken: string }): Promise<NexusRestoreApplyResult | { error: string }>;
  };
  contextPack?: {
    preview(options?: { projectId?: string }): Promise<NexusContextPackPreview | { error: string }>;
    recoveryPack(options?: { projectId?: string }): Promise<NexusRecoveryPack | { error: string }>;
  };
  templateBundles?: {
    list(): Promise<NexusTemplateBundle[] | { error: string }>;
    upsert(bundle: Partial<NexusTemplateBundle>): Promise<NexusTemplateBundle | { error: string }>;
    toggle(id: string, enabled: boolean): Promise<NexusTemplateBundle | { error: string }>;
  };
  agents?: {
    list(filters?: { projectId?: string }): Promise<AgentRecord[] | { error: string }>;
    get(id: string): Promise<AgentRecord | { error: string }>;
    create(data: Partial<AgentRecord>): Promise<AgentRecord | { error: string }>;
    update(id: string, data: Partial<AgentRecord>): Promise<AgentRecord | { error: string }>;
    softDelete(id: string): Promise<AgentRecord | { error: string }>;
    enable(id: string): Promise<AgentRecord | { error: string }>;
    disable(id: string): Promise<AgentRecord | { error: string }>;
    health(id: string): Promise<unknown>;
    executions(agentId: string): Promise<AgentExecutionRecord[] | { error: string }>;
    controlExecution?(executionId: string, action: string): Promise<AgentExecutionRecord | { error: string }>;
    timeline(agentId: string): Promise<unknown[] | { error: string }>;
  };
  agentFeedback?: {
    create(data: Partial<AgentFeedbackRecord>): Promise<AgentFeedbackRecord | { error: string }>;
    list(filters?: { projectId?: string; agentId?: string }): Promise<AgentFeedbackRecord[] | { error: string }>;
    get(id: string): Promise<AgentFeedbackRecord | { error: string }>;
    updateStatus(id: string, status: string): Promise<AgentFeedbackRecord | { error: string }>;
    export(filters?: { projectId?: string }): Promise<{ feedback: AgentFeedbackRecord[]; exportedAt: string } | { error: string }>;
    createSyntheticFromExecution(executionId: string): Promise<AgentFeedbackRecord | { error: string }>;
  };
  config?: {
    exportAll(): Promise<ConfigBundle | { error: string }>;
    importPreview(raw: string): Promise<unknown>;
    importApply(raw: string): Promise<unknown>;
  };
  export?: {
    markdown(content: string, filename: string): Promise<string>;
    json(data: unknown, filename: string): Promise<string>;
  };
  skills?: {
    list(): Promise<SkillMeta[]>;
    read(path: string): Promise<string>;
    registry?(): Promise<SkillRegistryEntry[] | { error: string }>;
    upsertRegistry?(entry: SkillRegistryEntry): Promise<SkillRegistryEntry | { error: string }>;
    toggleRegistry?(id: string, enabled: boolean): Promise<SkillRegistryEntry | { error: string }>;
    create?(entry: Partial<SkillRegistryEntry>): Promise<SkillRegistryEntry | { error: string }>;
    test?(skillId: string, input?: Record<string, unknown>): Promise<NexusSkillTestResult | { error: string }>;
  };
  app?: {
    info(): Promise<{
      version: string;
      electronVersion: string;
      nodeVersion: string;
      chromeVersion: string;
    }>;
    getDataPath(): Promise<string>;
  };
  dialog?: {
    open(options: unknown): Promise<{ canceled: boolean; filePaths: string[] }>;
  };

  // Storage
  storageGet<T>(key: string): Promise<T | null>;
  storageSet(key: string, value: unknown): Promise<void>;
  storageDelete(key: string): Promise<void>;
  storageGetAll(): Promise<Record<string, unknown>>;

  // Projects
  listProjects(): Promise<Project[]>;
  getProject(id: string): Promise<Project | null>;
  createProject(
    project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<Project>;
  updateProject(
    id: string,
    updates: Partial<Project>,
  ): Promise<Project | null>;
  deleteProject(id: string): Promise<boolean>;

  // Tasks
  listTasks(projectId?: string): Promise<Task[]>;
  createTask(
    task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<Task>;
  updateTask(id: string, updates: Partial<Task>): Promise<Task | null>;
  deleteTask(id: string): Promise<boolean>;

  // Prompts
  listPrompts(projectId?: string): Promise<SavedPrompt[]>;
  createPrompt(
    prompt: Omit<SavedPrompt, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<SavedPrompt>;
  updatePrompt(
    id: string,
    updates: Partial<SavedPrompt>,
  ): Promise<SavedPrompt | null>;
  deletePrompt(id: string): Promise<boolean>;

  // Runs
  listRuns(projectId: string): Promise<Run[]>;
  createRun(run: Omit<Run, 'id'>): Promise<Run>;

  // Git
  getGitLog(repoPath: string): Promise<GitCommitEntry[]>;
  getGitStatus(repoPath: string): Promise<string>;
  getGitSummary(
    repoPath: string,
  ): Promise<{
    branch: string;
    commitCount: number;
    recentCommits: GitCommitEntry[];
  }>;
  getReleaseStatus?(repoPath?: string): Promise<ReleaseStatus>;

  // Memory
  listMemories(projectId?: string): Promise<Memory[]>;
  getMemory(id: string): Promise<Memory | null>;
  createMemory(
    memory: Omit<Memory, 'id' | 'createdAt' | 'updatedAt' | 'lastUsedAt'>,
  ): Promise<Memory>;
  updateMemory(
    id: string,
    updates: Partial<Memory>,
  ): Promise<Memory | null>;
  deleteMemory(id: string): Promise<boolean>;
  exportMemories(projectId?: string): Promise<string>;
  importMemories(json: string): Promise<number>;
  generateMemoryContext(
    projectId: string,
    mode: MemoryInjectionMode,
  ): Promise<string>;

  // Safety
  checkCommandSafety(command: string): Promise<SafetyCheckResult>;

  // Settings
  getSetting(key: string): Promise<unknown>;
  setSetting(key: string, value: unknown): Promise<void>;
  getAllSettings(): Promise<AppSettings>;
  listProviders(): Promise<ProviderSetting[]>;
  createProvider(
    provider: Omit<ProviderSetting, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<ProviderSetting>;
  updateProvider(
    id: string,
    updates: Partial<ProviderSetting>,
  ): Promise<ProviderSetting | null>;
  deleteProvider(id: string): Promise<boolean>;

  // Export
  exportMarkdown(content: string, filename: string): Promise<string>;
  exportJSON(data: unknown, filename: string): Promise<string>;

  // Skills
  listSkills(): Promise<SkillMeta[]>;
  readSkill(name: string): Promise<string>;

  // App
  getAppInfo(): Promise<{
    version: string;
    electronVersion: string;
    nodeVersion: string;
    chromeVersion: string;
  }>;
  getDataPath(): Promise<string>;

  // Dialog
  openDirectoryDialog(): Promise<string | null>;
  openFileDialog(filters?: {
    name: string;
    extensions: string[];
  }[]): Promise<string | null>;
}

// ── Declaration merging for window.agentflow ──

declare global {
  interface Window {
    agentflow?: AgentFlowPreloadAPI;
  }
}

// ── Fallback helpers ──

/**
 * Wraps a preload call with a fallback for environments where
 * window.agentflow is not defined (unit tests, SSR, etc.).
 */
function apiCall<T>(
  methodName: string,
  fn: (agentflow: AgentFlowPreloadAPI) => Promise<T>,
  fallback: T,
): Promise<T> {
  const bridge = window.agentflow;
  if (!bridge) {
    console.warn(
      `[LocalAI Nexus] window.agentflow is not available. ` +
        `"${methodName}" returning fallback value.`,
    );
    return Promise.resolve(fallback);
  }
  return fn(bridge);
}

/**
 * Same as apiCall but for void returns.
 */
function apiCallVoid(
  methodName: string,
  fn: (agentflow: AgentFlowPreloadAPI) => Promise<void>,
): Promise<void> {
  const bridge = window.agentflow;
  if (!bridge) {
    console.warn(
      `[LocalAI Nexus] window.agentflow is not available. ` +
        `"${methodName}" is a no-op.`,
    );
    return Promise.resolve();
  }
  return fn(bridge);
}

// ── Typed API object ──

export const api = {
  auth: {
    bootstrap: () =>
      apiCall<{ ok: boolean } | { error: string }>(
        'auth.bootstrap',
        (a) => a.auth?.bootstrap() ?? Promise.resolve({ error: 'Auth bridge unavailable.' }),
        { ok: true },
      ),
    login: (request: LoginRequest) =>
      apiCall<LoginResult | { error: string }>(
        'auth.login',
        (a) => a.auth?.login(request) ?? Promise.resolve({ ok: false, error: 'Auth bridge unavailable.' }),
        { ok: false, error: 'Auth bridge unavailable.' },
      ),
    logout: () =>
      apiCall<boolean | { error: string }>(
        'auth.logout',
        (a) => a.auth?.logout() ?? Promise.resolve(false),
        false,
      ),
    session: (sessionId?: string) =>
      apiCall<AuthSessionState | { error: string }>(
        'auth.session',
        (a) => a.auth?.session(sessionId) ?? Promise.resolve({ authenticated: false }),
        { authenticated: false },
      ),
    changePassword: (request: ChangePasswordRequest) =>
      apiCall<SessionUser | { error: string }>(
        'auth.changePassword',
        (a) => a.auth?.changePassword(request) ?? Promise.resolve({ error: 'Auth bridge unavailable.' }),
        { error: 'Auth bridge unavailable.' },
      ),
  },

  users: {
    list: () =>
      apiCall<PublicUser[] | { error: string }>(
        'users.list',
        (a) => a.users?.list() ?? Promise.resolve([]),
        [],
      ),
    directory: () =>
      apiCall<PublicUser[] | { error: string }>(
        'users.directory',
        (a) => a.users?.directory?.() ?? a.users?.list() ?? Promise.resolve([]),
        [],
      ),
    create: (request: CreateUserRequest) =>
      apiCall<PublicUser | { error: string }>(
        'users.create',
        (a) => a.users?.create(request) ?? Promise.resolve({ error: 'User bridge unavailable.' }),
        { error: 'User bridge unavailable.' },
      ),
    update: (request: UpdateUserRequest) =>
      apiCall<PublicUser | { error: string }>(
        'users.update',
        (a) => a.users?.update(request) ?? Promise.resolve({ error: 'User bridge unavailable.' }),
        { error: 'User bridge unavailable.' },
      ),
    resetPassword: (request: ResetPasswordRequest) =>
      apiCall<ResetPasswordResult | { error: string }>(
        'users.resetPassword',
        (a) => a.users?.resetPassword(request) ?? Promise.resolve({ error: 'User bridge unavailable.' }),
        { error: 'User bridge unavailable.' },
      ),
  },

  audit: {
    list: (query?: AuditQuery) =>
      apiCall<AuditEvent[] | { error: string }>(
        'audit.list',
        (a) => a.audit?.list(query) ?? Promise.resolve([]),
        [],
      ),
    exportAll: () =>
      apiCall<{ auditLogs: AuditEvent[]; integrity?: AuditIntegrityReport; manifest?: AuditExportManifest; exportedAt: string } | { error: string }>(
        'audit.exportAll',
        (a) => a.audit?.exportAll() ?? Promise.resolve({ auditLogs: [], exportedAt: new Date().toISOString() }),
        { auditLogs: [], exportedAt: new Date().toISOString() },
      ),
  },

  // ── Storage ──

  storage: {
    get: <T>(key: string) =>
      apiCall<T | null>(
        'storageGet',
        (a) => a.storage?.get<T>(key) ?? a.storageGet<T>(key),
        null,
      ),
    set: (key: string, value: unknown) =>
      apiCallVoid('storageSet', (a) => a.storage?.set(key, value) ?? a.storageSet(key, value)),
    delete: (key: string) =>
      apiCallVoid('storageDelete', (a) => a.storage?.delete(key) ?? a.storageDelete(key)),
    getAll: () =>
      apiCall<Record<string, unknown>>(
        'storageGetAll',
        (a) => a.storage?.getAll() ?? a.storageGetAll(),
        {},
      ),
  },

  // ── Projects ──

  projects: {
    list: () =>
      apiCall<Project[]>('listProjects', (a) => a.projects?.list() ?? a.listProjects(), []),
    summary: () =>
      apiCall<NexusWorkspaceSummary | { error: string }>(
        'projects.summary',
        (a) => a.projects?.summary?.() ?? Promise.resolve({ error: 'Workspace summary bridge unavailable.' }),
        { error: 'Workspace summary bridge unavailable.' },
      ),
    get: (id: string) =>
      apiCall<Project | null>('getProject', (a) => a.projects?.get(id) ?? a.getProject(id), null),
    create: (project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) =>
      apiCall<Project>('createProject', (a) => a.projects?.create(project) ?? a.createProject(project), {
        ...project,
        id: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as Project),
    update: (idOrProject: string | Project, updates?: Partial<Project>) =>
      apiCall<Project | null>(
        'updateProject',
        (a) => {
          const id = typeof idOrProject === 'string' ? idOrProject : idOrProject.id;
          const payload = updates ?? (typeof idOrProject === 'string' ? {} : idOrProject);
          return a.projects?.update(id, payload) ?? a.updateProject(id, payload);
        },
        null,
      ),
    delete: (id: string) =>
      apiCall<boolean>('deleteProject', (a) => a.projects?.delete(id) ?? a.deleteProject(id), false),
    getAcl: (id: string) =>
      apiCall<{ projectId: string; acl: ResourceAcl; ownerUserId: string } | { error: string }>(
        'projects.getAcl',
        (a) => a.projects?.getAcl?.(id) ?? Promise.resolve({ error: 'Project ACL bridge unavailable.' }),
        { error: 'Project ACL bridge unavailable.' },
      ),
    updateAcl: (id: string, acl: ResourceAcl) =>
      apiCall<Project | { error: string }>(
        'projects.updateAcl',
        (a) => a.projects?.updateAcl?.(id, acl) ?? Promise.resolve({ error: 'Project ACL bridge unavailable.' }),
        { error: 'Project ACL bridge unavailable.' },
      ),
  },

  // ── Tasks ──

  tasks: {
    list: (projectId?: string) =>
      apiCall<Task[]>('listTasks', (a) => a.tasks?.list(projectId) ?? a.listTasks(projectId), []),
    listByProject: (projectId: string) =>
      apiCall<Task[]>('listTasks', (a) => a.tasks?.list(projectId) ?? a.listTasks(projectId), []),
    create: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) =>
      apiCall<Task>('createTask', (a) => a.tasks?.create(task) ?? a.createTask(task), {
        ...task,
        id: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as Task),
    update: (idOrTask: string | Task, updates?: Partial<Task>) =>
      apiCall<Task | null>(
        'updateTask',
        (a) => {
          const id = typeof idOrTask === 'string' ? idOrTask : idOrTask.id;
          const payload = updates ?? (typeof idOrTask === 'string' ? {} : idOrTask);
          return a.tasks?.update(id, payload) ?? a.updateTask(id, payload);
        },
        null,
      ),
    delete: (id: string) =>
      apiCall<boolean>('deleteTask', (a) => a.tasks?.delete(id) ?? a.deleteTask(id), false),
  },

  // ── Prompts ──

  prompts: {
    list: (projectId?: string) =>
      apiCall<SavedPrompt[]>(
        'listPrompts',
        (a) => a.prompts?.list(projectId) ?? a.listPrompts(projectId),
        [],
      ),
    create: (prompt: Omit<SavedPrompt, 'id' | 'createdAt' | 'updatedAt'>) =>
      apiCall<SavedPrompt>('createPrompt', (a) => a.prompts?.create(prompt) ?? a.createPrompt(prompt), {
        ...prompt,
        id: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as SavedPrompt),
    update: (idOrPrompt: string | SavedPrompt, updates?: Partial<SavedPrompt>) =>
      apiCall<SavedPrompt | null>(
        'updatePrompt',
        (a) => {
          const id = typeof idOrPrompt === 'string' ? idOrPrompt : idOrPrompt.id;
          const payload = updates ?? (typeof idOrPrompt === 'string' ? {} : idOrPrompt);
          return a.prompts?.update(id, payload) ?? a.updatePrompt(id, payload);
        },
        null,
      ),
    delete: (id: string) =>
      apiCall<boolean>('deletePrompt', (a) => a.prompts?.delete(id) ?? a.deletePrompt(id), false),
  },

  // ── Runs ──

  runs: {
    list: (projectId: string) =>
      apiCall<Run[]>('listRuns', (a) => a.runs?.list(projectId) ?? a.listRuns(projectId), []),
    create: (run: Omit<Run, 'id'>) =>
      apiCall<Run>('createRun', (a) => a.runs?.create(run) ?? a.createRun(run), {
        ...run,
        id: '',
      } as Run),
    events: (projectId?: string) =>
      apiCall<unknown[]>('listRunEvents', (a) => a.runs?.events?.(projectId) ?? Promise.resolve([]), []),
  },

  workflows: {
    templates: () =>
      apiCall<AgentWorkflowTemplate[] | { error: string }>(
        'workflows.templates',
        (a) => a.workflows?.templates() ?? Promise.resolve([]),
        [],
      ),
    list: (projectId: string) =>
      apiCall<Workflow[] | { error: string }>(
        'workflows.list',
        (a) => a.workflows?.list(projectId) ?? Promise.resolve([]),
        [],
      ),
    get: (workflowId: string) =>
      apiCall<Workflow | { error: string }>(
        'workflows.get',
        (a) => a.workflows?.get(workflowId) ?? Promise.resolve({ error: 'Workflow bridge unavailable.' }),
        { error: 'Workflow bridge unavailable.' },
      ),
    createFromTemplate: (data: { projectId: string; templateId: string; name?: string }) =>
      apiCall<Workflow | { error: string }>(
        'workflows.createFromTemplate',
        (a) => a.workflows?.createFromTemplate(data) ?? Promise.resolve({ error: 'Workflow bridge unavailable.' }),
        { error: 'Workflow bridge unavailable.' },
      ),
    save: (workflowId: string, data: Partial<Workflow> & { versionMessage?: string }) =>
      apiCall<Workflow | { error: string }>(
        'workflows.save',
        (a) => a.workflows?.save(workflowId, data) ?? Promise.resolve({ error: 'Workflow bridge unavailable.' }),
        { error: 'Workflow bridge unavailable.' },
      ),
    run: (data: { workflowId: string; input?: string }) =>
      apiCall<{ run: Run; result: WorkflowRunResult } | { error: string }>(
        'workflows.run',
        (a) => a.workflows?.run(data) ?? Promise.resolve({ error: 'Workflow bridge unavailable.' }),
        { error: 'Workflow bridge unavailable.' },
      ),
    controlRun: (runId: string, action: string) =>
      apiCall<Run | { error: string }>(
        'workflows.controlRun',
        (a) => a.workflows?.controlRun?.(runId, action) ?? Promise.resolve({ error: 'Workflow control bridge unavailable.' }),
        { error: 'Workflow control bridge unavailable.' },
      ),
    versions: (workflowId: string) =>
      apiCall<WorkflowVersion[] | { error: string }>(
        'workflows.versions',
        (a) => a.workflows?.versions(workflowId) ?? Promise.resolve([]),
        [],
      ),
    publish: (workflowId: string, message?: string) =>
      apiCall<WorkflowPublishResult | { error: string }>(
        'workflows.publish',
        (a) => a.workflows?.publish?.(workflowId, message) ?? Promise.resolve({ error: 'Workflow publish bridge unavailable.' }),
        { error: 'Workflow publish bridge unavailable.' },
      ),
    rollback: (workflowId: string, versionId: string, message?: string) =>
      apiCall<WorkflowRollbackResult | { error: string }>(
        'workflows.rollback',
        (a) => a.workflows?.rollback?.(workflowId, versionId, message) ?? Promise.resolve({ error: 'Workflow rollback bridge unavailable.' }),
        { error: 'Workflow rollback bridge unavailable.' },
      ),
  },

  mcp: {
    allowlist: () => apiCall<unknown[]>('mcp.allowlist', (a) => a.mcp?.allowlist() ?? Promise.resolve([]), []),
    check: (request: { serverName: string; toolName: string }) =>
      apiCall<{ allowed: boolean } | { error: string }>('mcp.check', (a) => a.mcp?.check(request) ?? Promise.resolve({ allowed: false }), { allowed: false }),
    upsert: (entry: unknown) =>
      apiCall<unknown>('mcp.upsert', (a) => a.mcp?.upsert(entry) ?? Promise.resolve({ error: 'MCP bridge unavailable.' }), { error: 'MCP bridge unavailable.' }),
    evaluate: (request: McpGatewayRequest) =>
      apiCall<McpGatewayDecision | { error: string }>(
        'mcp.evaluate',
        (a) => a.mcp?.evaluate?.(request) ?? Promise.resolve({ error: 'MCP gateway bridge unavailable.' }),
        { error: 'MCP gateway bridge unavailable.' },
      ),
  },

  // ── Git ──

  git: {
    log: (repoPath: string) =>
      apiCall<GitCommitEntry[]>(
        'getGitLog',
        (a) => a.git?.log(repoPath) ?? a.getGitLog(repoPath),
        [],
      ),
    readLog: async (repoPath: string, _options?: { maxCount?: number }) => {
      const commits = await api.git.log(repoPath);
      const summary = await api.git.summary(repoPath);
      return {
        commits,
        branch: summary.branch,
        totalCommits: summary.commitCount,
        recentActivity: `${commits.length} commits loaded`,
        error: undefined as string | undefined,
      };
    },
    status: (repoPath: string) =>
      apiCall<string>(
        'getGitStatus',
        (a) => a.git?.status(repoPath) ?? a.getGitStatus(repoPath),
        '无法获取 Git 状态。',
      ),
    summary: (repoPath: string) =>
      apiCall<{
        branch: string;
        commitCount: number;
        recentCommits: GitCommitEntry[];
      }>('getGitSummary', (a) => a.git?.summary(repoPath) ?? a.getGitSummary(repoPath), {
        branch: '',
        commitCount: 0,
        recentCommits: [],
      }),
  },

  release: {
    status: (repoPath?: string) =>
      apiCall<ReleaseStatus>(
        'getReleaseStatus',
        (a) =>
          a.release?.status(repoPath) ??
          a.getReleaseStatus?.(repoPath) ??
          Promise.resolve({
            version: 'unknown',
            branch: 'unknown',
            gitStatus: 'Release status bridge is unavailable.',
            recentCommits: [],
            updateSummary: [],
            testResults: [],
            progressSummary: [],
            checkedAt: new Date().toISOString(),
          }),
        {
          version: 'unknown',
          branch: 'unknown',
          gitStatus: 'Unable to read release status.',
          recentCommits: [],
          updateSummary: [],
          testResults: [],
          progressSummary: [],
          checkedAt: new Date().toISOString(),
        },
      ),
  },

  // ── Memory ──

  memory: {
    list: (projectId?: string) =>
      apiCall<Memory[]>(
        'listMemories',
        (a) =>
          a.memory?.list(projectId ? { projectId } : undefined) ??
          a.listMemories(projectId),
        [],
      ),
    listByProject: (projectId: string) =>
      apiCall<Memory[]>(
        'listMemories',
        (a) => a.memory?.list({ projectId }) ?? a.listMemories(projectId),
        [],
      ),
    get: (id: string) =>
      apiCall<Memory | null>('getMemory', (a) => a.memory?.get(id) ?? a.getMemory(id), null),
    create: (
      memory: Omit<
        Memory,
        'id' | 'createdAt' | 'updatedAt' | 'lastUsedAt'
      >,
    ) =>
      apiCall<Memory>('createMemory', (a) => a.memory?.create(memory) ?? a.createMemory(memory), {
        ...memory,
        id: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastUsedAt: new Date().toISOString(),
      } as Memory),
    update: (idOrMemory: string | Memory, updates?: Partial<Memory>) =>
      apiCall<Memory | null>(
        'updateMemory',
        (a) => {
          const id = typeof idOrMemory === 'string' ? idOrMemory : idOrMemory.id;
          const payload = updates ?? (typeof idOrMemory === 'string' ? {} : idOrMemory);
          return a.memory?.update(id, payload) ?? a.updateMemory(id, payload);
        },
        null,
      ),
    delete: (id: string) =>
      apiCall<boolean>('deleteMemory', (a) => a.memory?.delete(id) ?? a.deleteMemory(id), false),
    export: (projectId?: string) =>
      apiCall<string>(
        'exportMemories',
        async (a) => {
          const result = a.memory?.exportAll
            ? await a.memory.exportAll()
            : await a.exportMemories(projectId);
          return typeof result === 'string' ? result : JSON.stringify(result);
        },
        '',
      ),
    import: (json: string) =>
      apiCall<number>(
        'importMemories',
        async (a) => {
          const parsed = JSON.parse(json);
          const result = a.memory?.importMemories
            ? await a.memory.importMemories(parsed)
            : await a.importMemories(json);
          if (typeof result === 'number') return result;
          if (result && typeof result === 'object' && 'imported' in result) {
            return Number((result as { imported: unknown }).imported) || 0;
          }
          return 0;
        },
        0,
      ),
    generateContext: (projectId: string, mode: MemoryInjectionMode) =>
      apiCall<string>(
        'generateMemoryContext',
        (a) =>
          a.memory?.generateContext({ projectId, injectionMode: mode }) ??
          a.generateMemoryContext(projectId, mode),
        '',
      ),
  },

  // ── Safety ──

  safety: {
    check: (command: string) =>
      apiCall<SafetyCheckResult>(
        'checkCommandSafety',
        (a) => a.checkCommandSafety ? a.checkCommandSafety(command) : Promise.resolve({
          id: '',
          command,
          riskLevel: 'Safe',
          matchedRules: [],
          explanation: '',
          saferAlternative: '',
          suggestBackup: false,
          suggestIsolation: false,
          checkedAt: new Date().toISOString(),
        }),
        {
          id: '',
          command,
          riskLevel: 'Safe',
          matchedRules: [],
          explanation: '',
          saferAlternative: '',
          suggestBackup: false,
          suggestIsolation: false,
          checkedAt: new Date().toISOString(),
        },
      ),
  },

  // ── Settings ──

  settings: {
    get: (key?: string) =>
      key
        ? apiCall<unknown>(
            'getSetting',
            (a) => a.settings?.get(key) ?? a.getSetting(key),
            null,
          )
        : api.settings.getAll(),
    set: (key: string, value: unknown) =>
      apiCallVoid('setSetting', (a) => a.settings?.set(key, value) ?? a.setSetting(key, value)),
    update: async (settings: AppSettings) => {
      await Promise.all(
        Object.entries(settings).map(([key, value]) => api.settings.set(key, value)),
      );
    },
    reset: async () => {
      await api.settings.update({
        theme: 'system',
        language: 'zh',
        defaultProjectPath: '',
        defaultAITool: 'Claude Code',
        dataPath: '',
        version: '1.0.0',
      });
    },
    getAll: () =>
      apiCall<AppSettings>('getAllSettings', (a) => a.settings?.getAll() ?? a.getAllSettings(), {
        theme: 'system',
        language: 'zh',
        defaultProjectPath: '',
        defaultAITool: 'Claude Code',
        dataPath: '',
        version: '1.0.0',
        appVersion: '1.0.0',
      } as AppSettings),
    providers: {
      list: () =>
        apiCall<ProviderSetting[]>(
          'listProviders',
          (a) => a.providers?.list() ?? a.listProviders(),
          [],
        ),
      create: (
        provider: Omit<
          ProviderSetting,
          'id' | 'createdAt' | 'updatedAt'
        >,
      ) =>
        apiCall<ProviderSetting>(
          'createProvider',
          (a) => a.providers?.create(provider) ?? a.createProvider(provider),
          {
            ...provider,
            id: '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          } as ProviderSetting,
        ),
      update: (idOrProvider: string | ProviderSetting, updates?: Partial<ProviderSetting>) =>
        apiCall<ProviderSetting | null>(
          'updateProvider',
          (a) => {
            const id = typeof idOrProvider === 'string' ? idOrProvider : idOrProvider.id;
            const payload =
              updates ?? (typeof idOrProvider === 'string' ? {} : idOrProvider);
            return a.providers?.update(id, payload) ?? a.updateProvider(id, payload);
          },
          null,
        ),
      delete: (id: string) =>
        apiCall<boolean>(
          'deleteProvider',
          (a) => a.providers?.delete(id) ?? a.deleteProvider(id),
          false,
        ),
      presets: () =>
        apiCall<ProviderPreset[]>(
          'providers.presets',
          (a) => a.providers?.presets?.() ?? Promise.resolve([]),
          [],
        ),
      testConnection: (providerId: string) =>
        apiCall<{ ok: boolean; status: string; message: string; checkedAt: string } | { error: string }>(
          'providers.testConnection',
          (a) => a.providers?.testConnection?.(providerId) ?? Promise.resolve({ error: 'Provider test bridge unavailable.' }),
          { error: 'Provider test bridge unavailable.' },
        ),
      getActive: () =>
        apiCall<{ providerRef: string; model: string; agentDefaultProviderRef?: string } | { error: string }>(
          'providers.getActive',
          (a) => a.providers?.getActive?.() ?? Promise.resolve({ providerRef: '', model: '' }),
          { providerRef: '', model: '' },
        ),
      setActive: (config: ActiveProviderConfig) =>
        apiCall<ActiveProviderConfig | { error: string }>(
          'providers.setActive',
          (a) => a.providers?.setActive?.(config) ?? Promise.resolve({ error: 'Provider switch bridge unavailable.' }),
          { error: 'Provider switch bridge unavailable.' },
        ),
    },
  },

  // ── Export ──

  providers: {
    list: () => api.settings.providers.list(),
    create: (
      provider: Omit<ProviderSetting, 'id' | 'createdAt' | 'updatedAt'> | ProviderSetting,
    ) =>
      api.settings.providers.create(
        provider as Omit<ProviderSetting, 'id' | 'createdAt' | 'updatedAt'>,
      ),
    update: (idOrProvider: string | ProviderSetting, updates?: Partial<ProviderSetting>) =>
      api.settings.providers.update(idOrProvider as ProviderSetting, updates),
    delete: (id: string) => api.settings.providers.delete(id),
    presets: () => api.settings.providers.presets(),
    testConnection: (providerId: string) => api.settings.providers.testConnection(providerId),
    getActive: () => api.settings.providers.getActive(),
    setActive: (config: ActiveProviderConfig) => api.settings.providers.setActive(config),
  },

  gateway: {
    status: () =>
      apiCall<NexusGatewayStatus | { error: string }>(
        'gateway.status',
        (a) => a.gateway?.status() ?? Promise.resolve({ error: 'Gateway bridge unavailable.' }),
        {
          online: false,
          host: '127.0.0.1',
          port: 8317,
          baseUrl: 'http://127.0.0.1:8317',
          providerCount: 0,
          defaultBaseUrlHint: 'http://127.0.0.1:8317',
          v1BaseUrlHint: 'http://127.0.0.1:8317/v1',
        },
      ),
    start: () =>
      apiCall<NexusGatewayStatus | { error: string }>(
        'gateway.start',
        (a) => a.gateway?.start() ?? Promise.resolve({ error: 'Gateway bridge unavailable.' }),
        { error: 'Gateway bridge unavailable.' },
      ),
    stop: () =>
      apiCall<NexusGatewayStatus | { error: string }>(
        'gateway.stop',
        (a) => a.gateway?.stop() ?? Promise.resolve({ error: 'Gateway bridge unavailable.' }),
        { error: 'Gateway bridge unavailable.' },
      ),
    restart: () =>
      apiCall<NexusGatewayStatus | { error: string }>(
        'gateway.restart',
        (a) => a.gateway?.restart?.() ?? Promise.resolve({ error: 'Gateway restart bridge unavailable.' }),
        { error: 'Gateway restart bridge unavailable.' },
      ),
    keys: () =>
      apiCall<NexusGatewayApiKey[] | { error: string }>(
        'gateway.keys',
        (a) => a.gateway?.keys?.() ?? Promise.resolve([]),
        [],
      ),
    createKey: (request: NexusGatewayApiKeyCreateRequest) =>
      apiCall<NexusGatewayApiKeyCreateResult | { error: string }>(
        'gateway.createKey',
        (a) => a.gateway?.createKey?.(request) ?? Promise.resolve({ error: 'Gateway key bridge unavailable.' }),
        { error: 'Gateway key bridge unavailable.' },
      ),
    disableKey: (id: string) =>
      apiCall<NexusGatewayApiKey | { error: string }>(
        'gateway.disableKey',
        (a) => a.gateway?.disableKey?.(id) ?? Promise.resolve({ error: 'Gateway key bridge unavailable.' }),
        { error: 'Gateway key bridge unavailable.' },
      ),
    deleteKey: (id: string) =>
      apiCall<NexusGatewayApiKey | { error: string }>(
        'gateway.deleteKey',
        (a) => a.gateway?.deleteKey?.(id) ?? Promise.resolve({ error: 'Gateway key bridge unavailable.' }),
        { error: 'Gateway key bridge unavailable.' },
      ),
    resetKey: (id: string) =>
      apiCall<NexusGatewayApiKeyCreateResult | { error: string }>(
        'gateway.resetKey',
        (a) => a.gateway?.resetKey?.(id) ?? Promise.resolve({ error: 'Gateway key bridge unavailable.' }),
        { error: 'Gateway key bridge unavailable.' },
      ),
    exportEnv: (key?: string) =>
      apiCall<unknown>(
        'gateway.exportEnv',
        (a) => a.gateway?.exportEnv?.(key) ?? Promise.resolve({ error: 'Gateway export bridge unavailable.' }),
        { error: 'Gateway export bridge unavailable.' },
      ),
    exportCodex: (key?: string) =>
      apiCall<unknown>(
        'gateway.exportCodex',
        (a) => a.gateway?.exportCodex?.(key) ?? Promise.resolve({ error: 'Gateway export bridge unavailable.' }),
        { error: 'Gateway export bridge unavailable.' },
      ),
    exportClaude: (key?: string) =>
      apiCall<unknown>(
        'gateway.exportClaude',
        (a) => a.gateway?.exportClaude?.(key) ?? Promise.resolve({ error: 'Gateway export bridge unavailable.' }),
        { error: 'Gateway export bridge unavailable.' },
      ),
    importPreview: (raw: string) =>
      apiCall<NexusGatewayConfigImportPreview | { error: string }>(
        'gateway.importPreview',
        (a) => a.gateway?.importPreview?.(raw) ?? Promise.resolve({ error: 'Gateway import bridge unavailable.' }),
        { error: 'Gateway import bridge unavailable.' },
      ),
    importApply: (raw: string) =>
      apiCall<NexusGatewayConfigApplyResult | { error: string }>(
        'gateway.importApply',
        (a) => a.gateway?.importApply?.(raw) ?? Promise.resolve({ error: 'Gateway import bridge unavailable.' }),
        { error: 'Gateway import bridge unavailable.' },
      ),
  },

  usage: {
    summary: () =>
      apiCall<NexusUsageSummary | { error: string }>(
        'usage.summary',
        (a) => a.usage?.summary() ?? Promise.resolve({ error: 'Usage bridge unavailable.' }),
        {
          todayRequests: 0,
          weekRequests: 0,
          monthRequests: 0,
          inputTokens: 0,
          outputTokens: 0,
          totalTokens: 0,
          successRate: 0,
          failureRate: 0,
          averageLatencyMs: 0,
          p95LatencyMs: 0,
          byProvider: [],
          byModel: [],
        },
      ),
    list: (filters?: unknown) =>
      apiCall<NexusUsageRecord[] | { error: string }>(
        'usage.list',
        (a) => a.usage?.list(filters) ?? Promise.resolve([]),
        [],
      ),
  },

  tokenPolicies: {
    list: () =>
      apiCall<NexusTokenPolicy[] | { error: string }>(
        'tokenPolicies.list',
        (a) => a.tokenPolicies?.list() ?? Promise.resolve([]),
        [],
      ),
    upsert: (policy: Partial<NexusTokenPolicy>) =>
      apiCall<NexusTokenPolicy | { error: string }>(
        'tokenPolicies.upsert',
        (a) => a.tokenPolicies?.upsert(policy) ?? Promise.resolve({ error: 'Token policy bridge unavailable.' }),
        { error: 'Token policy bridge unavailable.' },
      ),
    evaluate: (providerId: string, model?: string) =>
      apiCall<NexusTokenPolicyEvaluation | { error: string }>(
        'tokenPolicies.evaluate',
        (a) => a.tokenPolicies?.evaluate(providerId, model) ?? Promise.resolve({ error: 'Token policy bridge unavailable.' }),
        { error: 'Token policy bridge unavailable.' },
      ),
  },

  health: {
    summary: () =>
      apiCall<{ latest: NexusHealthCheckResult[]; byStatus: Record<string, number> } | { error: string }>(
        'health.summary',
        (a) => a.health?.summary() ?? Promise.resolve({ latest: [], byStatus: {} }),
        { latest: [], byStatus: {} },
      ),
    checkProvider: (providerId: string) =>
      apiCall<NexusHealthCheckResult | { error: string }>(
        'health.checkProvider',
        (a) => a.health?.checkProvider(providerId) ?? Promise.resolve({ error: 'Health bridge unavailable.' }),
        { error: 'Health bridge unavailable.' },
      ),
  },

  runtimeProfiles: {
    generate: () =>
      apiCall<NexusRuntimeProfile[] | { error: string }>(
        'runtimeProfiles.generate',
        (a) => a.runtimeProfiles?.generate() ?? Promise.resolve([]),
        [],
      ),
  },

  router: {
    decisions: () =>
      apiCall<NexusRouterDecision[] | { error: string }>(
        'router.decisions',
        (a) => a.router?.decisions() ?? Promise.resolve([]),
        [],
      ),
  },

  security: {
    report: (scope?: string) =>
      apiCall<NexusSecurityReport | { error: string }>(
        'security.report',
        (a) => a.security?.report(scope) ?? Promise.resolve({ error: 'Security report bridge unavailable.' }),
        { error: 'Security report bridge unavailable.' },
      ),
  },

  observability: {
    report: (options?: { includeMockEvaluation?: boolean; evaluationOutput?: string }) =>
      apiCall<NexusObservabilityReport | { error: string }>(
        'observability.report',
        (a) => a.observability?.report(options) ?? Promise.resolve({ error: 'Observability bridge unavailable.' }),
        { error: 'Observability bridge unavailable.' },
      ),
    getTrace: (traceId: string) =>
      apiCall<NexusTraceDetail | { error: string }>(
        'observability.getTrace',
        (a) => a.observability?.getTrace?.(traceId) ?? Promise.resolve({ error: 'Trace bridge unavailable.' }),
        { error: 'Trace bridge unavailable.' },
      ),
    runMockEvaluation: (input?: { name?: string; target?: 'prompt' | 'model'; promptId?: string; providerId?: string; model?: string; output?: string }) =>
      apiCall<NexusEvaluationRun | { error: string }>(
        'observability.runMockEvaluation',
        (a) => a.observability?.runMockEvaluation(input) ?? Promise.resolve({ error: 'Evaluation bridge unavailable.' }),
        { error: 'Evaluation bridge unavailable.' },
      ),
    listEvaluationDataset: () =>
      apiCall<NexusEvaluationDataset | { error: string }>(
        'observability.listEvaluationDataset',
        (a) => a.observability?.listEvaluationDataset?.() ?? Promise.resolve({ error: 'Evaluation dataset bridge unavailable.' }),
        { error: 'Evaluation dataset bridge unavailable.' },
      ),
    deleteEvaluationRun: (id: string) =>
      apiCall<NexusEvaluationDatasetDeleteResult | { error: string }>(
        'observability.deleteEvaluationRun',
        (a) => a.observability?.deleteEvaluationRun?.(id) ?? Promise.resolve({ error: 'Evaluation dataset delete bridge unavailable.' }),
        { error: 'Evaluation dataset delete bridge unavailable.' },
      ),
  },

  knowledge: {
    assetsSummary: () =>
      apiCall<NexusKnowledgeAssetSummary | { error: string }>(
        'knowledge.assetsSummary',
        (a) => a.knowledge?.assetsSummary?.() ?? Promise.resolve({ error: 'Knowledge bridge unavailable.' }),
        { error: 'Knowledge bridge unavailable.' },
      ),
    previewDocument: (input: { title?: string; content: string }) =>
      apiCall<NexusKnowledgeDocumentPreview | { error: string }>(
        'knowledge.previewDocument',
        (a) => a.knowledge?.previewDocument(input) ?? Promise.resolve({ error: 'Knowledge bridge unavailable.' }),
        { error: 'Knowledge bridge unavailable.' },
      ),
    importLocalFile: () =>
      apiCall<NexusKnowledgeDocumentPreview | { canceled: true } | { error: string }>(
        'knowledge.importLocalFile',
        (a) => a.knowledge?.importLocalFile?.() ?? Promise.resolve({ error: 'Knowledge local file import bridge unavailable.' }),
        { error: 'Knowledge local file import bridge unavailable.' },
      ),
    testRetrieval: (input: { query: string; content?: string; topK?: number }) =>
      apiCall<NexusKnowledgeRetrievalResult | { error: string }>(
        'knowledge.testRetrieval',
        (a) => a.knowledge?.testRetrieval(input) ?? Promise.resolve({ error: 'Knowledge bridge unavailable.' }),
        { error: 'Knowledge bridge unavailable.' },
      ),
  },

  ops: {
    backupPreview: () =>
      apiCall<NexusBackupManifest | { error: string }>(
        'ops.backupPreview',
        (a) => a.ops?.backupPreview() ?? Promise.resolve({ error: 'Ops bridge unavailable.' }),
        { error: 'Ops bridge unavailable.' },
      ),
    createBackup: () =>
      apiCall<NexusBackupManifest | { error: string }>(
        'ops.createBackup',
        (a) => a.ops?.createBackup() ?? Promise.resolve({ error: 'Ops bridge unavailable.' }),
        { error: 'Ops bridge unavailable.' },
      ),
    repairPreview: () =>
      apiCall<NexusOpsRepairPreview | { error: string }>(
        'ops.repairPreview',
        (a) => a.ops?.repairPreview?.() ?? Promise.resolve({ error: 'Ops repair preview bridge unavailable.' }),
        { error: 'Ops repair preview bridge unavailable.' },
      ),
    restorePreview: (raw: string) =>
      apiCall<NexusRestorePreview | { error: string }>(
        'ops.restorePreview',
        (a) => a.ops?.restorePreview(raw) ?? Promise.resolve({ error: 'Ops bridge unavailable.' }),
        { error: 'Ops bridge unavailable.' },
      ),
    restoreApply: (input: { raw: string; confirmToken: string }) =>
      apiCall<NexusRestoreApplyResult | { error: string }>(
        'ops.restoreApply',
        (a) => a.ops?.restoreApply?.(input) ?? Promise.resolve({ error: 'Ops bridge unavailable.' }),
        { error: 'Ops bridge unavailable.' },
      ),
  },

  contextPack: {
    preview: (options?: { projectId?: string }) =>
      apiCall<NexusContextPackPreview | { error: string }>(
        'contextPack.preview',
        (a) => a.contextPack?.preview(options) ?? Promise.resolve({ error: 'Context pack bridge unavailable.' }),
        { error: 'Context pack bridge unavailable.' },
      ),
    recoveryPack: (options?: { projectId?: string }) =>
      apiCall<NexusRecoveryPack | { error: string }>(
        'contextPack.recoveryPack',
        (a) => a.contextPack?.recoveryPack?.(options) ?? Promise.resolve({ error: 'Recovery pack bridge unavailable.' }),
        { error: 'Recovery pack bridge unavailable.' },
      ),
  },

  templateBundles: {
    list: () =>
      apiCall<NexusTemplateBundle[] | { error: string }>(
        'templateBundles.list',
        (a) => a.templateBundles?.list() ?? Promise.resolve([]),
        [],
      ),
    upsert: (bundle: Partial<NexusTemplateBundle>) =>
      apiCall<NexusTemplateBundle | { error: string }>(
        'templateBundles.upsert',
        (a) => a.templateBundles?.upsert(bundle) ?? Promise.resolve({ error: 'Template bundle bridge unavailable.' }),
        { error: 'Template bundle bridge unavailable.' },
      ),
    toggle: (id: string, enabled: boolean) =>
      apiCall<NexusTemplateBundle | { error: string }>(
        'templateBundles.toggle',
        (a) => a.templateBundles?.toggle(id, enabled) ?? Promise.resolve({ error: 'Template bundle bridge unavailable.' }),
        { error: 'Template bundle bridge unavailable.' },
      ),
  },

  agents: {
    list: (filters?: { projectId?: string }) =>
      apiCall<AgentRecord[] | { error: string }>('agents.list', (a) => a.agents?.list(filters) ?? Promise.resolve([]), []),
    get: (id: string) =>
      apiCall<AgentRecord | { error: string }>('agents.get', (a) => a.agents?.get(id) ?? Promise.resolve({ error: 'Agent bridge unavailable.' }), { error: 'Agent bridge unavailable.' }),
    create: (data: Partial<AgentRecord>) =>
      apiCall<AgentRecord | { error: string }>('agents.create', (a) => a.agents?.create(data) ?? Promise.resolve({ error: 'Agent bridge unavailable.' }), { error: 'Agent bridge unavailable.' }),
    update: (id: string, data: Partial<AgentRecord>) =>
      apiCall<AgentRecord | { error: string }>('agents.update', (a) => a.agents?.update(id, data) ?? Promise.resolve({ error: 'Agent bridge unavailable.' }), { error: 'Agent bridge unavailable.' }),
    softDelete: (id: string) =>
      apiCall<AgentRecord | { error: string }>('agents.softDelete', (a) => a.agents?.softDelete(id) ?? Promise.resolve({ error: 'Agent bridge unavailable.' }), { error: 'Agent bridge unavailable.' }),
    enable: (id: string) =>
      apiCall<AgentRecord | { error: string }>('agents.enable', (a) => a.agents?.enable(id) ?? Promise.resolve({ error: 'Agent bridge unavailable.' }), { error: 'Agent bridge unavailable.' }),
    disable: (id: string) =>
      apiCall<AgentRecord | { error: string }>('agents.disable', (a) => a.agents?.disable(id) ?? Promise.resolve({ error: 'Agent bridge unavailable.' }), { error: 'Agent bridge unavailable.' }),
    health: (id: string) =>
      apiCall<unknown>('agents.health', (a) => a.agents?.health(id) ?? Promise.resolve({ error: 'Agent bridge unavailable.' }), { error: 'Agent bridge unavailable.' }),
    executions: (agentId: string) =>
      apiCall<AgentExecutionRecord[] | { error: string }>('agents.executions', (a) => a.agents?.executions(agentId) ?? Promise.resolve([]), []),
    controlExecution: (executionId: string, action: string) =>
      apiCall<AgentExecutionRecord | { error: string }>('agents.controlExecution', (a) => a.agents?.controlExecution?.(executionId, action) ?? Promise.resolve({ error: 'Agent execution control bridge unavailable.' }), { error: 'Agent execution control bridge unavailable.' }),
    timeline: (agentId: string) =>
      apiCall<unknown[] | { error: string }>('agents.timeline', (a) => a.agents?.timeline(agentId) ?? Promise.resolve([]), []),
  },

  agentFeedback: {
    create: (data: Partial<AgentFeedbackRecord>) =>
      apiCall<AgentFeedbackRecord | { error: string }>('agentFeedback.create', (a) => a.agentFeedback?.create(data) ?? Promise.resolve({ error: 'Feedback bridge unavailable.' }), { error: 'Feedback bridge unavailable.' }),
    list: (filters?: { projectId?: string; agentId?: string }) =>
      apiCall<AgentFeedbackRecord[] | { error: string }>('agentFeedback.list', (a) => a.agentFeedback?.list(filters) ?? Promise.resolve([]), []),
    get: (id: string) =>
      apiCall<AgentFeedbackRecord | { error: string }>('agentFeedback.get', (a) => a.agentFeedback?.get(id) ?? Promise.resolve({ error: 'Feedback bridge unavailable.' }), { error: 'Feedback bridge unavailable.' }),
    updateStatus: (id: string, status: string) =>
      apiCall<AgentFeedbackRecord | { error: string }>('agentFeedback.updateStatus', (a) => a.agentFeedback?.updateStatus(id, status) ?? Promise.resolve({ error: 'Feedback bridge unavailable.' }), { error: 'Feedback bridge unavailable.' }),
    export: (filters?: { projectId?: string }) =>
      apiCall<{ feedback: AgentFeedbackRecord[]; exportedAt: string } | { error: string }>('agentFeedback.export', (a) => a.agentFeedback?.export(filters) ?? Promise.resolve({ feedback: [], exportedAt: new Date().toISOString() }), { feedback: [], exportedAt: new Date().toISOString() }),
    createSyntheticFromExecution: (executionId: string) =>
      apiCall<AgentFeedbackRecord | { error: string }>('agentFeedback.createSyntheticFromExecution', (a) => a.agentFeedback?.createSyntheticFromExecution(executionId) ?? Promise.resolve({ error: 'Feedback bridge unavailable.' }), { error: 'Feedback bridge unavailable.' }),
  },

  config: {
    exportAll: () =>
      apiCall<ConfigBundle | { error: string }>('config.exportAll', (a) => a.config?.exportAll() ?? Promise.resolve({ error: 'Config bridge unavailable.' }), { error: 'Config bridge unavailable.' }),
    importPreview: (raw: string) =>
      apiCall<unknown>('config.importPreview', (a) => a.config?.importPreview(raw) ?? Promise.resolve({ ok: false, errors: ['Config bridge unavailable.'] }), { ok: false, errors: ['Config bridge unavailable.'] }),
    importApply: (raw: string) =>
      apiCall<unknown>('config.importApply', (a) => a.config?.importApply(raw) ?? Promise.resolve({ ok: false, errors: ['Config bridge unavailable.'] }), { ok: false, errors: ['Config bridge unavailable.'] }),
  },

  export: {
    markdown: (content: string, filename: string) =>
      apiCall<string>(
        'exportMarkdown',
        (a) => a.export?.markdown(content, filename) ?? a.exportMarkdown(content, filename),
        '',
      ),
    exportMarkdown: (content: string, filename: string) =>
      api.export.markdown(content, filename),
    json: (data: unknown, filename: string) =>
      apiCall<string>(
        'exportJSON',
        (a) => a.export?.json(data, filename) ?? a.exportJSON(data, filename),
        '',
      ),
    exportJSON: (data: unknown, filename: string) =>
      api.export.json(data, filename),
    exportAll: async () => {
      const data = await api.storage.getAll();
      return api.export.json(data, `localai-nexus-export-${Date.now()}.json`);
    },
  },

  // ── Skills ──

  skills: {
    list: () =>
      apiCall<SkillMeta[]>(
        'listSkills',
        async (a) => {
          const skills = a.skills?.list ? await a.skills.list() : await a.listSkills();
          return skills.map((skill) => ({
            ...skill,
            filePath: skill.filePath ?? skill.path,
            lastModified: skill.lastModified ?? new Date().toISOString(),
          }));
        },
        [],
      ),
    read: (name: string) =>
      apiCall<string>('readSkill', (a) => a.skills?.read(name) ?? a.readSkill(name), ''),
    registry: () =>
      apiCall<SkillRegistryEntry[] | { error: string }>('skills.registry', (a) => a.skills?.registry?.() ?? Promise.resolve([]), []),
    upsertRegistry: (entry: SkillRegistryEntry) =>
      apiCall<SkillRegistryEntry | { error: string }>('skills.upsertRegistry', (a) => a.skills?.upsertRegistry?.(entry) ?? Promise.resolve({ error: 'Skills registry bridge unavailable.' }), { error: 'Skills registry bridge unavailable.' }),
    toggleRegistry: (id: string, enabled: boolean) =>
      apiCall<SkillRegistryEntry | { error: string }>('skills.toggleRegistry', (a) => a.skills?.toggleRegistry?.(id, enabled) ?? Promise.resolve({ error: 'Skills registry bridge unavailable.' }), { error: 'Skills registry bridge unavailable.' }),
    create: (entry: Partial<SkillRegistryEntry>) =>
      apiCall<SkillRegistryEntry | { error: string }>('skills.create', (a) => a.skills?.create?.(entry) ?? Promise.resolve({ error: 'Skill create bridge unavailable.' }), { error: 'Skill create bridge unavailable.' }),
    test: (skillId: string, input?: Record<string, unknown>) =>
      apiCall<NexusSkillTestResult | { error: string }>('skills.test', (a) => a.skills?.test?.(skillId, input) ?? Promise.resolve({ error: 'Skill test bridge unavailable.' }), { error: 'Skill test bridge unavailable.' }),
  },

  // ── App ──

  app: {
    info: () =>
      apiCall<{
        version: string;
        electronVersion: string;
        nodeVersion: string;
        chromeVersion: string;
      }>('getAppInfo', (a) => a.app?.info() ?? a.getAppInfo(), {
        version: '1.0.0',
        electronVersion: '',
        nodeVersion: '',
        chromeVersion: '',
      }),
    dataPath: () =>
      apiCall<string>('getDataPath', (a) => a.app?.getDataPath() ?? a.getDataPath(), ''),
    clearDemoData: async () => undefined,
  },

  // ── Dialog ──

  dialog: {
    open: (options: unknown) =>
      apiCall<{ canceled: boolean; filePaths: string[] }>(
        'openDialog',
        (a) => a.dialog?.open(options) ?? Promise.resolve({ canceled: true, filePaths: [] }),
        { canceled: true, filePaths: [] },
      ),
    openDirectory: () =>
      apiCall<string | null>(
        'openDirectoryDialog',
        async (a) => {
          if (a.dialog?.open) {
            const result = await a.dialog.open({ properties: ['openDirectory'] });
            return result.canceled ? null : result.filePaths[0] ?? null;
          }
          return a.openDirectoryDialog();
        },
        null,
      ),
    openFile: (filters?: { name: string; extensions: string[] }[]) =>
      apiCall<string | null>(
        'openFileDialog',
        async (a) => {
          if (a.dialog?.open) {
            const result = await a.dialog.open({ properties: ['openFile'], filters });
            return result.canceled ? null : result.filePaths[0] ?? null;
          }
          return a.openFileDialog(filters);
        },
        null,
      ),
  },

  import: {
    importAll: async (_path: string) => undefined,
  },

  // ── Health check ──

  /**
   * Returns true if the preload bridge is available.
   */
  isAvailable(): boolean {
    return typeof window !== 'undefined' && window.agentflow !== undefined;
  },
};

export default api;
