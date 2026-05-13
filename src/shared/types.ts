// ── Core Data Models ──

export type ProjectStatus = 'planning' | 'active' | 'paused' | 'done' | 'archived'
export type Platform = 'Web' | 'Desktop' | 'CLI' | 'Mobile' | 'Embedded' | 'Other'
export type TaskStatus = 'todo' | 'doing' | 'in_progress' | 'blocked' | 'done'
export type Priority = 'critical' | 'high' | 'medium' | 'low'
export type Difficulty = 'Easy' | 'Medium' | 'Hard'
export type MemoryType =
  | 'user_preference'
  | 'project_context'
  | 'decision'
  | 'issue_fix'
  | 'api_provider'
  | 'prompt_pattern'
  | 'environment'
  | 'pattern'
  | 'insight'
  | 'knowledge'
  | 'code_snippet'
  | 'security'
  | 'git_summary'
  | 'log_analysis'
  | 'safety_check'
export type MemoryStatus = 'active' | 'pending' | 'archived'
export type MemoryInjectionMode = 'off' | 'minimal' | 'balanced' | 'full'
export type RiskLevel = 'safe' | 'low' | 'medium' | 'high' | 'critical' | 'Safe' | 'Low' | 'Medium' | 'High' | 'Critical'
export type ThemeMode = 'light' | 'dark' | 'system'
export type Language = 'zh' | 'en'
export type AITool = 'Claude Code' | 'Codex' | 'Cursor' | 'Other'
export type { UserRole, UserStatus, AuthUser, StoredAuthUser, AuthSession, SessionUser, AuthSessionState, LoginRequest, LoginResult, ChangePasswordRequest, CreateUserRequest, ResetPasswordRequest, UpdateUserRequest, PublicUser } from './authTypes.js'
export type { ResourceAcl, ResourceAclEntry, ResourceRole, ResourceType } from './authTypes.js'
export type { AuditSeverity, AuditStatus, AuditActor, AuditEvent, AuditQuery } from './auditTypes.js'

export interface Project {
  id: string
  ownerUserId?: string
  acl?: import('./authTypes.js').ResourceAcl
  name: string
  idea: string
  platform: Platform
  techStack: string
  uiStyle: string
  difficulty: Difficulty
  status: ProjectStatus
  defaultProviderRef?: string
  defaultModel?: string
  archivedAt?: string
  createdAt: string
  updatedAt: string
}

export interface Task {
  id: string
  projectId: string
  role?: string
  title: string
  description?: string
  input?: string
  output?: string
  acceptance?: string
  assignee?: string
  priority: Priority
  status: TaskStatus
  createdAt: string
  updatedAt?: string
}

export interface SavedPrompt {
  id: string
  projectId?: string
  templateName?: string
  title?: string
  content: string
  favorite?: boolean
  name?: string
  templateId?: string
  variables?: Record<string, string>
  versions?: PromptVersion[]
  starred?: boolean
  createdAt: string
  updatedAt?: string
}

export interface PromptVersion {
  id: string
  version: number
  content: string
  variables?: Record<string, string>
  message?: string
  createdByUserId?: string
  createdAt: string
}

export interface Run {
  id: string
  projectId: string
  actorUserId?: string
  workflowTemplateId?: string
  promptId?: string
  providerId?: string
  versionId?: string
  title: string
  tool: string
  status: string
  log: string
  summary: string
  startedAt?: string
  endedAt?: string
  durationMs?: number
  retryCount?: number
  error?: string
  nodeTrace?: RunNodeTrace[]
  metadata?: Record<string, unknown>
  createdAt: string
}

export interface RunEvent {
  id: string
  runId?: string
  agentId?: string
  executionId?: string
  projectId?: string
  workflowId?: string
  auditEventId?: string
  type: 'run.created' | 'run.updated' | 'permission.denied' | 'audit.recorded' | 'mcp.denied' | 'mcp.allowed' | 'provider.test' | 'provider.switch' | 'gateway.request' | 'usage.recorded' | 'health.check' | 'skill.test' | 'agent.execution' | 'feedback.created'
  status: 'success' | 'failure' | 'denied' | 'info'
  actorUserId?: string
  title: string
  detail?: string
  metadata?: Record<string, unknown>
  createdAt: string
}

export interface McpAllowlistEntry {
  id: string
  serverName: string
  toolName: string
  permission: string
  enabled: boolean
  riskLevel: WorkflowTemplateRisk
  description?: string
  createdAt: string
  updatedAt: string
}

export interface SkillRegistryEntry {
  id: string
  name: string
  description: string
  category: string
  type?: NexusSkillType
  riskLevel?: WorkflowTemplateRisk | 'critical'
  inputSchema?: Record<string, unknown>
  outputSchema?: Record<string, unknown>
  promptTemplate?: string
  testSample?: Record<string, unknown>
  version?: string
  permissions?: string[]
  enabled: boolean
  createdAt: string
  updatedAt: string
}

export type AgentStatus = 'enabled' | 'disabled' | 'archived'
export type AgentType = 'assistant' | 'reviewer' | 'workflow' | 'demo' | 'custom'
export type AgentHealthStatus = 'unknown' | 'healthy' | 'warning' | 'error'

export interface AgentRecord {
  id: string
  name: string
  description: string
  type: AgentType
  status: AgentStatus
  ownerUserId?: string
  projectId?: string
  workflowId?: string
  providerRef?: string
  model?: string
  systemPrompt?: string
  toolsAllowlistRef?: string
  skillsRefs: string[]
  createdAt: string
  updatedAt: string
  lastRunAt?: string
  lastHealthStatus: AgentHealthStatus
  deletedAt?: string
}

export type AgentExecutionStatus = 'queued' | 'running' | 'paused' | 'success' | 'failed' | 'cancelled' | 'demo'

export interface AgentExecutionRecord {
  id: string
  agentId: string
  runId?: string
  workflowId?: string
  projectId?: string
  status: AgentExecutionStatus
  startedAt: string
  finishedAt?: string
  durationMs?: number
  inputSummary: string
  outputSummary: string
  errorSummary?: string
  customData?: Record<string, unknown>
  createdAt: string
}

export type AgentFeedbackStatus = 'open' | 'triaged' | 'resolved' | 'archived'

export interface AgentFeedbackRecord {
  id: string
  agentId?: string
  executionId?: string
  runId?: string
  projectId?: string
  rating: 'positive' | 'neutral' | 'negative'
  title: string
  message: string
  status: AgentFeedbackStatus
  createdByUserId?: string
  createdAt: string
  updatedAt: string
}

export interface McpGatewayRequest {
  serverName: string
  toolName: string
  arguments?: unknown
  projectId?: string
  runId?: string
}

export interface McpGatewayDecision {
  id: string
  serverName: string
  toolName: string
  allowed: boolean
  reason: string
  allowlistEntryId?: string
  riskLevel?: WorkflowTemplateRisk
  sandbox: {
    network: 'denied'
    filesystem: 'read-only'
    commandExecution: 'denied'
    maxArgumentBytes: number
  }
  checkedAt: string
}

export interface RunNodeTrace {
  id: string
  name: string
  status: 'planned' | 'running' | 'success' | 'failed' | 'blocked'
  durationMs?: number
  inputSummary?: string
  outputSummary?: string
  failureReason?: string
  retryCount?: number
}

export interface WorkflowTemplateNode {
  id: string
  name: string
  type: 'input' | 'agent' | 'tool' | 'human' | 'condition' | 'loop' | 'parallel' | 'git' | 'retrieval' | 'output'
  description: string
  input?: string
  output?: string
  safetyNote?: string
  retryAdvice?: string
}

export type WorkflowTemplateDifficulty = 'beginner' | 'intermediate' | 'advanced'
export type WorkflowTemplateRisk = 'low' | 'medium' | 'high'

export interface WorkflowTemplate {
  id: string
  name: string
  purpose: string
  description: string
  scenario: string
  category: string
  difficulty: WorkflowTemplateDifficulty
  riskLevel: WorkflowTemplateRisk
  beginnerRecommended: boolean
  requiresHumanApproval: boolean
  nodes: WorkflowTemplateNode[]
  tags: string[]
}

export interface RiskCheck {
  id: string
  command: string
  riskLevel: RiskLevel
  matchedRules: string[]
  explanation: string
  saferAlternative: string
  createdAt: string
}

export interface Memory {
  id: string
  type: MemoryType
  title: string
  content: string
  tags: string[]
  projectId?: string
  providerScope?: string
  modelScope?: string
  metadata?: Record<string, unknown>
  importance: number
  status: MemoryStatus
  createdAt: string
  updatedAt: string
  lastUsedAt: string
}

export interface MemoryLink {
  id: string
  memoryId: string
  entityType: string
  entityId: string
  createdAt: string
}

export interface ProviderSetting {
  id: string
  providerId?: string
  providerName: string
  displayName?: string
  baseUrl: string
  apiKey: string
  modelName: string
  customHeaders?: Record<string, string>
  proxyUrl?: string
  tags?: NexusProviderTag[]
  riskLevel?: NexusProviderRiskLevel
  dailyQuota?: number
  monthlyQuota?: number
  concurrencyLimit?: number
  cooldownUntil?: string
  recommendedModels?: string[]
  authType?: 'apiKey' | 'none' | 'bearer' | 'custom'
  docsHint?: string
  networkHint?: string
  needsApiKey?: boolean
  supportsStreaming?: boolean
  supportsVision?: boolean
  defaultTimeout?: number
  lastTestStatus?: 'untested' | 'success' | 'failure'
  lastTestMessage?: string
  lastTestedAt?: string
  enabled: boolean
  memoryEnabled: boolean
  memoryInjectionMode: MemoryInjectionMode
  maxMemoryItems: number
  maxMemoryChars: number
  createdAt?: string
  updatedAt?: string
}

export interface AppSettings {
  theme: ThemeMode
  language?: Language
  defaultProjectPath: string
  defaultAITool: AITool
  dataPath: string
  version?: string
  appVersion?: string
  techStack?: string[]
  activeProviderRef?: string
  activeModel?: string
  agentDefaultProviderRef?: string
}

export interface ProviderPreset {
  providerId: string
  displayName: string
  baseUrl: string
  recommendedModels: string[]
  authType: 'apiKey' | 'none' | 'bearer' | 'custom'
  docsHint: string
  networkHint: string
  needsApiKey: boolean
  supportsStreaming: boolean
  supportsVision: boolean
  defaultTimeout: number
}

export interface ActiveProviderConfig {
  providerRef: string
  model: string
  scope: 'workspace' | 'project' | 'agent'
  projectId?: string
  agentId?: string
}

export type NexusProviderKind =
  | 'openai-compatible'
  | 'anthropic-compatible'
  | 'gemini-compatible'
  | 'ollama-local'
  | 'custom'

export type NexusProviderTag =
  | 'default'
  | 'code'
  | 'fast'
  | 'long-context'
  | 'local'
  | 'fallback'

export type NexusProviderRiskLevel = 'low' | 'medium' | 'high' | 'critical'

export type NexusHealthStatus =
  | 'Healthy'
  | 'Degraded'
  | 'RateLimited'
  | 'AuthFailed'
  | 'QuotaLow'
  | 'ModelUnavailable'
  | 'ProtocolError'
  | 'Offline'
  | 'Unknown'

export type NexusFailureCategory =
  | 'none'
  | '401'
  | '403'
  | '404'
  | '429'
  | 'timeout'
  | 'model_not_found'
  | 'protocol_error'
  | 'provider_unavailable'
  | 'base_url_mismatch'
  | 'unknown'

export interface NexusUsageRecord {
  id: string
  providerId?: string
  providerName?: string
  gatewayKeyId?: string
  gatewayMaskedKey?: string
  model?: string
  endpoint: string
  projectId?: string
  workflowId?: string
  agentId?: string
  skillId?: string
  inputTokens: number
  outputTokens: number
  totalTokens: number
  success: boolean
  failureCategory: NexusFailureCategory
  statusCode?: number
  latencyMs: number
  requestId?: string
  createdAt: string
}

export interface NexusUsageSummary {
  todayRequests: number
  weekRequests: number
  monthRequests: number
  inputTokens: number
  outputTokens: number
  totalTokens: number
  successRate: number
  failureRate: number
  averageLatencyMs: number
  p95LatencyMs: number
  recentFailureReason?: string
  byProvider: Array<{ providerId: string; providerName: string; requests: number; totalTokens: number; successRate: number }>
  byModel: Array<{ model: string; requests: number; totalTokens: number; successRate: number }>
}

export interface NexusWorkspaceSummary {
  generatedAt: string
  projects: {
    total: number
    active: number
    archived: number
  }
  tasks: {
    total: number
    open: number
    done: number
    blocked: number
  }
  prompts: {
    total: number
    starred: number
  }
  memory: {
    total: number
    active: number
    pending: number
  }
  providers: {
    total: number
    enabled: number
  }
  gateway: {
    keyCount: number
    activeKeyCount: number
    recentRequestCount: number
  }
  buildPlans: {
    moduleCount: number
    averageCompletionPercent: number
    incompleteModuleCount: number
  }
}

export interface NexusHealthCheckResult {
  id: string
  providerId?: string
  providerName?: string
  baseUrl?: string
  model?: string
  status: NexusHealthStatus
  checks: Array<{ name: string; ok: boolean; message: string; latencyMs?: number }>
  averageLatencyMs: number
  errorRate: number
  failureCategory: NexusFailureCategory
  suggestion: string
  checkedAt: string
}

export type NexusRuntimeProfileKind = 'codex' | 'claude-code' | 'cli' | 'custom'

export interface NexusRuntimeProfile {
  id: string
  name: string
  kind: NexusRuntimeProfileKind
  baseUrl: string
  model: string
  providerRef?: string
  env: Record<string, string>
  json: Record<string, unknown>
  toml: string
  yaml: string
  diagnostics: string[]
  command: string
  redaction: 'no-secrets' | 'requires-user-confirmation'
  updatedAt: string
}

export interface NexusGatewayStatus {
  online: boolean
  host: string
  port: number
  baseUrl: string
  startedAt?: string
  lastError?: string
  activeProviderRef?: string
  activeModel?: string
  providerCount: number
  defaultBaseUrlHint: string
  v1BaseUrlHint: string
  lastTraceId?: string
  lastRouteReason?: string
}

export type NexusGatewayApiKeyStatus = 'active' | 'disabled' | 'deleted'

export interface NexusGatewayApiKey {
  id: string
  name: string
  keyHash: string
  maskedKey: string
  status: NexusGatewayApiKeyStatus
  scopes: string[]
  endpointWhitelist: string[]
  modelWhitelist: string[]
  dailyQuota: number
  monthlyQuota: number
  rateLimitPerMinute: number
  concurrencyLimit: number
  createdByUserId?: string
  createdAt: string
  updatedAt: string
  lastUsedAt?: string
  deletedAt?: string
}

export interface NexusGatewayApiKeyCreateRequest {
  name: string
  scopes?: string[]
  endpointWhitelist?: string[]
  modelWhitelist?: string[]
  dailyQuota?: number
  monthlyQuota?: number
  rateLimitPerMinute?: number
  concurrencyLimit?: number
}

export interface NexusGatewayApiKeyCreateResult {
  key: NexusGatewayApiKey
  rawKey: string
  copyOnceWarning: string
}

export type NexusGatewayConfigSource =
  | 'localai-nexus'
  | 'ccs'
  | 'sub2api'
  | 'cc-switch'
  | 'claude-code'
  | 'codex'
  | 'openai-env'
  | 'unknown'

export interface NexusGatewayConfigMergeAction {
  target: 'gatewayApiKeys' | 'gateway.config.imports' | 'claude-code.settings' | 'codex.config' | 'runtime.env'
  action: 'preview' | 'merge' | 'backup' | 'skip'
  label: string
  detail: string
  riskLevel: 'low' | 'medium' | 'high'
}

export interface NexusGatewayConfigImportPreview {
  ok: boolean
  source: NexusGatewayConfigSource
  warnings: string[]
  errors: string[]
  redaction: 'secrets-redacted'
  detected: {
    baseUrls: string[]
    models: string[]
    profileCount: number
    keyRefCount: number
    gatewayPolicyCount: number
    supportedTargets: NexusGatewayConfigSource[]
  }
  mergePlan: NexusGatewayConfigMergeAction[]
  backup: {
    required: true
    collections: string[]
    redaction: 'secrets-redacted'
  }
  audit: {
    action: 'gateway.config.imported'
    metadata: Record<string, unknown>
  }
  normalized?: Record<string, unknown>
}

export interface NexusGatewayConfigApplyResult {
  ok: boolean
  source: NexusGatewayConfigSource
  imported: number
  warnings: string[]
  mergePlan: NexusGatewayConfigMergeAction[]
  backup: {
    id: string
    createdAt: string
    collections: Array<{ name: string; count: number }>
    hash: string
    redaction: 'secrets-redacted'
  }
  audit: {
    action: 'gateway.config.imported'
    status: 'recorded' | 'not-recorded'
  }
  record: Record<string, unknown>
}

export interface NexusGatewayAccessDecision {
  allowed: boolean
  reason: string
  statusCode: number
  keyId?: string
  maskedKey?: string
  failureCategory?: NexusFailureCategory
  retryAfterSeconds?: number
  diagnosticOpenMode: boolean
}

export type NexusGatewayRequestKind = 'chat.completions' | 'responses' | 'messages' | 'embeddings'
export type NexusGatewayStreamEventType = 'message_start' | 'content_delta' | 'message_delta' | 'message_stop' | 'error'

export interface NexusGatewayForwardInput {
  endpoint: string
  kind: NexusGatewayRequestKind
  body: Record<string, unknown>
  stream?: boolean
  requestId?: string
  signal?: AbortSignal
}

export interface NexusGatewayForwardResult {
  ok: boolean
  statusCode: number
  body: unknown
  providerId?: string
  providerName?: string
  model: string
  routed: boolean
  routeReason: string
  fallbackUsed: boolean
  traceId: string
  inputTokens: number
  outputTokens: number
  latencyMs: number
  failureCategory: NexusFailureCategory
  streamed?: boolean
  cancelled?: boolean
  streamProtocol?: 'mock' | 'sse' | 'buffered'
  events?: Array<{ type: NexusGatewayStreamEventType; data: unknown }>
}

export interface NexusTokenPolicy {
  id: string
  providerId?: string
  model?: string
  dailyQuota: number
  monthlyQuota: number
  concurrencyLimit: number
  cooldownMinutes: number
  enabled: boolean
  reason?: string
  createdAt?: string
  updatedAt: string
}

export interface NexusTokenPolicyEvaluation {
  providerId?: string
  model?: string
  state: 'available' | 'cooldown' | 'quota_exhausted' | 'concurrency_limited' | 'unconfigured'
  reason: string
  dailyTokens: number
  monthlyTokens: number
  activeRequests: number
  dailyQuota: number
  monthlyQuota: number
  concurrencyLimit: number
  cooldownUntil?: string
  checkedAt: string
}

export interface NexusRouterDecision {
  id: string
  providerId?: string
  providerName?: string
  model: string
  intent: string
  reason: string
  fallbackUsed: boolean
  quotaState: NexusTokenPolicyEvaluation['state']
  checkedAt: string
}

export interface NexusSecurityReport {
  id: string
  generatedAt: string
  scope: string
  summary: string
  findings: Array<{ id: string; severity: import('./auditTypes.js').AuditSeverity; title: string; detail: string; recommendation: string }>
  redaction: 'secrets-redacted'
  auditEventCount: number
  deniedEventCount: number
  providerRiskCount: number
  externalUrlPolicy: 'confirm-before-open'
}

export interface NexusTraceSummary {
  traceId: string
  source: 'gateway' | 'workflow' | 'agent' | 'provider' | 'audit'
  operation: string
  status: 'success' | 'failure' | 'denied' | 'info'
  startedAt: string
  endedAt?: string
  latencyMs?: number
  errorCategory?: NexusFailureCategory
  redaction: 'secrets-redacted'
}

export interface NexusTraceDetail extends NexusTraceSummary {
  durationBucket: 'fast' | 'normal' | 'slow' | 'unknown'
  relatedRecordId?: string
  details: Array<{ label: string; value: string }>
}

export interface NexusEvaluationDatasetSummary {
  id: string
  generatedAt: string
  sampleCount: number
  passCount: number
  warningCount: number
  failCount: number
  averageScore: number
  latestRuns: Array<{ id: string; name: string; status: NexusEvaluationRun['status']; score: number; createdAt: string }>
  mode: 'mock-local'
  redaction: 'secrets-redacted'
}

export interface NexusEvaluationDataset {
  id: string
  generatedAt: string
  summary: NexusEvaluationDatasetSummary
  runs: NexusEvaluationRun[]
  redaction: 'secrets-redacted'
}

export interface NexusEvaluationDatasetDeleteResult {
  ok: boolean
  id: string
  deleted: boolean
  remaining: number
  summary: NexusEvaluationDatasetSummary
  redaction: 'secrets-redacted'
}

export interface NexusRedTeamFinding {
  id: string
  risk: 'prompt-injection' | 'secret-exposure' | 'unsafe-tooling' | 'none'
  severity: 'info' | 'warning' | 'critical'
  title: string
  detail: string
  recommendation: string
}

export interface NexusEvaluationRun {
  id: string
  name: string
  target: 'prompt' | 'model'
  providerId?: string
  model?: string
  promptId?: string
  score: number
  status: 'passed' | 'warning' | 'failed'
  findings: string[]
  redaction: 'secrets-redacted'
  mode: 'mock'
  createdAt: string
}

export interface NexusObservabilityReport {
  id: string
  generatedAt: string
  usage: NexusUsageSummary
  traces: NexusTraceSummary[]
  slowRequests: NexusUsageRecord[]
  errorCategories: Array<{ category: NexusFailureCategory; count: number }>
  traceDetails: NexusTraceDetail[]
  evaluation?: NexusEvaluationRun
  evaluationDataset: NexusEvaluationDatasetSummary
  redTeamFindings: NexusRedTeamFinding[]
  exportSummary?: NexusObservabilityExportSummary
  reportRedaction: 'secrets-redacted'
  compatibility: 'legacy-usage-and-run-events'
}

export interface NexusObservabilityExportSummary {
  id: string
  generatedAt: string
  traceCount: number
  slowRequestCount: number
  errorCategoryCount: number
  evaluationStatus?: NexusEvaluationRun['status']
  suggestedFilename: string
  markdown: string
  redaction: 'secrets-redacted'
}

export interface NexusKnowledgeDocumentPreview {
  id: string
  title: string
  chunkCount: number
  chunks: Array<{
    id: string
    text: string
    tokenEstimate: number
    charStart?: number
    charEnd?: number
    keywords?: string[]
    tags?: string[]
    quality?: { state: 'empty' | 'needs-review' | 'ready'; score: number; signals: string[] }
    qualityScore?: number
  }>
  index?: {
    schemaVersion: 1
    indexId: string
    source: 'local-document'
    persisted: true
    builtAt: string
    chunkIds: string[]
    totalTokens: number
    keywords: string[]
    tags: string[]
    qualityState: 'empty' | 'needs-review' | 'ready'
  }
  assetGraph?: {
    nodes: Array<{ id: string; type: 'document' | 'chunk' | 'tag' | 'quality'; label: string }>
    edges: Array<{ from: string; to: string; relation: 'contains' | 'tagged' | 'rated' }>
    summary: {
      documentNodes: number
      chunkNodes: number
      tagNodes: number
      qualityNodes: number
      edgeCount: number
    }
  }
  quality?: { state: 'empty' | 'needs-review' | 'ready'; score: number; signals: string[] }
  source?: {
    type: 'pasted-text' | 'local-file'
    filename?: string
    extension?: string
    sizeBytes?: number
  }
  redaction: 'secrets-redacted'
  createdAt: string
}

export interface NexusKnowledgeRetrievalResult {
  query: string
  topK: number
  matches: Array<{
    chunkId: string
    title: string
    text: string
    score: number
    tokenEstimate?: number
    chunkTokenEstimate?: number
    tags?: string[]
    keywords?: string[]
    qualityState?: 'empty' | 'needs-review' | 'ready'
    qualityScore?: number
  }>
  latencyMs: number
  mode: 'mock-local'
  redaction: 'secrets-redacted'
}

export interface NexusKnowledgeAssetSummary {
  id: string
  generatedAt: string
  documentCount: number
  chunkCount: number
  tokenEstimate: number
  promptCount: number
  memoryCount: number
  staleMemoryCount: number
  topTags: Array<{ tag: string; count: number }>
  latestDocuments: Array<{ id: string; title: string; chunkCount: number; createdAt: string }>
  indexedChunkCount?: number
  averageQualityScore?: number
  indexStatus?: {
    persisted: boolean
    indexedDocumentCount: number
    indexedChunkCount: number
    qualityReadyCount: number
    qualityNeedsReviewCount: number
  }
  assetGraph?: {
    documentNodes: number
    chunkNodes: number
    promptNodes: number
    memoryNodes: number
    tagNodes: number
    edgeCount: number
    topRelations: Array<{ label: string; count: number }>
  }
  qualityState?: { state: 'empty' | 'needs-review' | 'ready'; score: number; signals: string[] }
  retrievalReady: boolean
  redaction: 'secrets-redacted'
}

export interface NexusBackupManifest {
  id: string
  createdAt: string
  mode: 'dry-run' | 'created'
  schemaVersion: 1
  collections: Array<{ name: string; count: number; redacted: boolean }>
  checksum: string
  redaction: 'secrets-redacted'
  restoreRequiresPreview: true
  bundle?: {
    collections: string[]
    bytes: number
    hash: string
    redaction: 'secrets-redacted'
  }
}

export interface NexusRestorePreview {
  ok: boolean
  warnings: string[]
  errors: string[]
  manifest?: NexusBackupManifest
  changes: Array<{ collection: string; incoming: number; existing: number; action: 'merge-preview' | 'skip' }>
  applyToken?: string
}

export interface NexusRestoreApplyResult {
  ok: boolean
  appliedAt: string
  manifestId?: string
  before: NexusBackupManifest
  collections: Array<{ collection: string; inserted: number; skipped: number; existingBefore: number }>
  checksum: string
  mode?: 'merge-only'
  summary?: { inserted: number; skipped: number; touchedCollections: number }
  auditRedaction: 'secrets-redacted'
  warnings: string[]
}

export interface NexusOpsRepairPreview {
  id: string
  generatedAt: string
  ok: boolean
  checks: Array<{
    id: string
    name: string
    status: 'pass' | 'warning' | 'fail'
    detail: string
    affectedCollections?: string[]
  }>
  actions: Array<{
    id: string
    label: string
    mode: 'manual' | 'preview-only'
    detail: string
    requiresBackup: boolean
  }>
  warnings: string[]
  errors: string[]
  requiresBackup: true
  redaction: 'secrets-redacted'
}

export interface NexusTemplateBundle {
  id: string
  name: string
  description: string
  type: 'skill' | 'template' | 'workflow' | 'mcp'
  version: string
  riskLevel: WorkflowTemplateRisk | 'critical'
  enabled: boolean
  localOnly: boolean
  assumptions: string[]
  templates: Array<{ id: string; name: string; projectType: string; prompt: string; acceptance: string[] }>
  createdAt: string
  updatedAt: string
}

export interface NexusContextPackPreview {
  id: string
  generatedAt: string
  sources: Array<{ type: 'memory' | 'files' | 'git_diff' | 'logs' | 'terminal_summary' | 'docs' | 'workflow_run' | 'provider_trace'; label: string; included: boolean; redacted: boolean }>
  memoryCount: number
  staleMemoryCount: number
  related: Array<{ memoryId: string; relatedMemoryId: string; reason: string }>
  prompt: string
}

export interface NexusRecoveryPack {
  id: string
  generatedAt: string
  projectId?: string
  sourceLabels: string[]
  memoryIds: string[]
  staleMemoryIds: string[]
  providerTraceIds: string[]
  workflowRunIds: string[]
  redaction: 'secrets-redacted'
  prompt: string
}

export type NexusSkillType =
  | 'prompt'
  | 'tool'
  | 'workflow'
  | 'mcp'
  | 'script'
  | 'agent'
  | 'composite'

export interface NexusSkillTestResult {
  ok: boolean
  skillId: string
  output: string
  input: Record<string, unknown>
  riskLevel: WorkflowTemplateRisk | 'critical'
  tokens: {
    input: number
    output: number
    total: number
  }
  auditEvent?: string
  createdAt: string
}

export interface ConfigExportManifest {
  version: 1
  exportedAt: string
  hash: string
  redaction: 'secrets-omitted'
  counts: Record<string, number>
}

export interface ConfigBundle {
  manifest: ConfigExportManifest
  providerPresets: ProviderPreset[]
  providers: Array<Record<string, unknown>>
  projectDefaults: Array<{ projectId: string; defaultProviderRef?: string; defaultModel?: string }>
  gatewayKeys: Array<Record<string, unknown>>
  gatewayConfigImports: Array<Record<string, unknown>>
  agents: Array<Record<string, unknown>>
  templates: Array<Record<string, unknown>>
  mcpAllowlist: Array<Record<string, unknown>>
  skillsRegistry: SkillRegistryEntry[]
}

// ── Skill types ──

export interface SkillMeta {
  name: string
  description: string
  path?: string
  filePath?: string
  lastModified?: string
  valid: boolean
  missingFields: string[]
}

// ── Log analysis types ──

export interface LogAnalysisResult {
  id?: string
  errorType: string
  summary?: string
  possibleCauses: string[]
  fixSteps: string[]
  suggestedCommands: string[]
  fixPrompt: string
  suggestMemory?: boolean
  analyzedAt?: string
  rawLog?: string
}

// ── Safety check types ──

export interface SafetyCheckResult {
  id?: string
  command?: string
  riskLevel: RiskLevel
  matchedRules: Array<string | { name: string; description: string }>
  explanation: string
  saferAlternative: string
  suggestBackup?: boolean
  suggestIsolation?: boolean
  backupSuggested?: boolean
  isolationSuggested?: boolean
  checkedAt?: string
}

// ── Git timeline types ──

export interface GitCommitEntry {
  hash: string
  message: string
  author: string
  date: string
  files: string[]
}

export type ReleaseTestStatus = 'PASS' | 'FAIL' | 'BLOCKED' | 'UNKNOWN'

export interface ReleaseTestResult {
  command: string
  status: ReleaseTestStatus
  details: string
}

export interface ReleaseStatus {
  version: string
  branch: string
  gitStatus: string
  recentCommits: GitCommitEntry[]
  updateSummary: string[]
  testResults: ReleaseTestResult[]
  progressSummary: string[]
  checkedAt: string
}

// ── Planning types ──

export interface ProjectPlan {
  title?: string
  overview?: string
  summary: string
  prd: string
  architecture: string
  directoryStructure: string
  tasks: Task[]
  testPlan: string
  acceptanceCriteria: string
  devPrompt: string
  claudeCodePrompt?: string
  codexPrompt: string
  cursorPrompt: string
}

export interface PromptTemplateVariable {
  name: string
  key?: string
  label: string
  placeholder: string
  required: boolean
  type?: 'text' | 'textarea'
}

export interface PromptTemplate {
  id?: string
  name: string
  description: string
  category: string
  variables: PromptTemplateVariable[]
  template: string
}

// ── IPC channel names ──

export const IPC_CHANNELS = {
  // Storage
  STORAGE_GET: 'storage:get',
  STORAGE_SET: 'storage:set',
  STORAGE_DELETE: 'storage:delete',
  STORAGE_GET_ALL: 'storage:getAll',

  // Projects
  PROJECT_LIST: 'project:list',
  PROJECT_GET: 'project:get',
  PROJECT_CREATE: 'project:create',
  PROJECT_UPDATE: 'project:update',
  PROJECT_DELETE: 'project:delete',
  PROJECT_ACL_GET: 'project:acl:get',
  PROJECT_ACL_UPDATE: 'project:acl:update',
  WORKSPACE_SUMMARY: 'workspace:summary',

  // Tasks
  TASK_LIST: 'task:list',
  TASK_CREATE: 'task:create',
  TASK_UPDATE: 'task:update',
  TASK_DELETE: 'task:delete',

  // Prompts
  PROMPT_LIST: 'prompt:list',
  PROMPT_CREATE: 'prompt:create',
  PROMPT_UPDATE: 'prompt:update',
  PROMPT_DELETE: 'prompt:delete',

  // Runs
  RUN_LIST: 'run:list',
  RUN_CREATE: 'run:create',
  RUN_EVENTS_LIST: 'runEvents:list',

  // Workflows
  WORKFLOW_TEMPLATE_LIST: 'workflow:templates:list',
  WORKFLOW_LIST: 'workflow:list',
  WORKFLOW_GET: 'workflow:get',
  WORKFLOW_CREATE_FROM_TEMPLATE: 'workflow:createFromTemplate',
  WORKFLOW_SAVE: 'workflow:save',
  WORKFLOW_RUN: 'workflow:run',
  WORKFLOW_RUN_CONTROL: 'workflow:run:control',
  WORKFLOW_VERSION_LIST: 'workflow:versions:list',
  WORKFLOW_PUBLISH: 'workflow:publish',
  WORKFLOW_ROLLBACK: 'workflow:rollback',

  // MCP
  MCP_ALLOWLIST_LIST: 'mcp:allowlist:list',
  MCP_ALLOWLIST_CHECK: 'mcp:allowlist:check',
  MCP_ALLOWLIST_UPSERT: 'mcp:allowlist:upsert',
  MCP_GATEWAY_EVALUATE: 'mcp:gateway:evaluate',

  // Git
  GIT_LOG: 'git:log',
  GIT_STATUS: 'git:status',
  GIT_SUMMARY: 'git:summary',
  RELEASE_STATUS: 'release:status',

  // Memory
  MEMORY_LIST: 'memory:list',
  MEMORY_GET: 'memory:get',
  MEMORY_CREATE: 'memory:create',
  MEMORY_UPDATE: 'memory:update',
  MEMORY_DELETE: 'memory:delete',
  MEMORY_EXPORT: 'memory:export',
  MEMORY_IMPORT: 'memory:import',
  MEMORY_GENERATE_CONTEXT: 'memory:generateContext',

  // Settings
  SETTINGS_GET: 'settings:get',
  SETTINGS_SET: 'settings:set',
  SETTINGS_GET_ALL: 'settings:getAll',
  PROVIDER_LIST: 'provider:list',
  PROVIDER_CREATE: 'provider:create',
  PROVIDER_UPDATE: 'provider:update',
  PROVIDER_DELETE: 'provider:delete',
  PROVIDER_PRESETS: 'provider:presets',
  PROVIDER_TEST: 'provider:test',
  PROVIDER_ACTIVE_GET: 'provider:active:get',
  PROVIDER_ACTIVE_SET: 'provider:active:set',

  // LocalAI Nexus Gateway / Usage / Health / Runtime
  GATEWAY_STATUS: 'gateway:status',
  GATEWAY_START: 'gateway:start',
  GATEWAY_STOP: 'gateway:stop',
  GATEWAY_RESTART: 'gateway:restart',
  GATEWAY_KEY_LIST: 'gateway:key:list',
  GATEWAY_KEY_CREATE: 'gateway:key:create',
  GATEWAY_KEY_DISABLE: 'gateway:key:disable',
  GATEWAY_KEY_DELETE: 'gateway:key:delete',
  GATEWAY_KEY_RESET: 'gateway:key:reset',
  GATEWAY_EXPORT_ENV: 'gateway:export:env',
  GATEWAY_EXPORT_CODEX: 'gateway:export:codex',
  GATEWAY_EXPORT_CLAUDE: 'gateway:export:claude',
  GATEWAY_IMPORT_PREVIEW: 'gateway:importPreview',
  GATEWAY_IMPORT_APPLY: 'gateway:importApply',
  USAGE_SUMMARY: 'usage:summary',
  USAGE_LIST: 'usage:list',
  TOKEN_POLICY_LIST: 'tokenPolicy:list',
  TOKEN_POLICY_UPSERT: 'tokenPolicy:upsert',
  TOKEN_POLICY_EVALUATE: 'tokenPolicy:evaluate',
  HEALTH_SUMMARY: 'health:summary',
  HEALTH_CHECK_PROVIDER: 'health:provider:check',
  RUNTIME_PROFILES_GENERATE: 'runtime:profiles:generate',
  ROUTER_DECISIONS_LIST: 'router:decisions:list',
  SECURITY_REPORT_GENERATE: 'security:report:generate',
  OBSERVABILITY_REPORT_GENERATE: 'observability:report:generate',
  OBSERVABILITY_TRACE_GET: 'observability:trace:get',
  EVAL_MOCK_RUN: 'eval:mock:run',
  EVAL_DATASET_LIST: 'eval:dataset:list',
  EVAL_DATASET_DELETE: 'eval:dataset:delete',
  KNOWLEDGE_ASSETS_SUMMARY: 'knowledge:assets:summary',
  KNOWLEDGE_DOCUMENT_PREVIEW: 'knowledge:document:preview',
  KNOWLEDGE_DOCUMENT_IMPORT_LOCAL_FILE: 'knowledge:document:importLocalFile',
  KNOWLEDGE_RETRIEVAL_TEST: 'knowledge:retrieval:test',
  OPS_BACKUP_PREVIEW: 'ops:backup:preview',
  OPS_BACKUP_CREATE: 'ops:backup:create',
  OPS_RESTORE_PREVIEW: 'ops:restore:preview',
  OPS_RESTORE_APPLY: 'ops:restore:apply',
  OPS_REPAIR_PREVIEW: 'ops:repair:preview',
  CONTEXT_PACK_PREVIEW: 'contextPack:preview',
  CONTEXT_RECOVERY_PACK: 'contextPack:recoveryPack',
  TEMPLATE_BUNDLES_LIST: 'templateBundles:list',
  TEMPLATE_BUNDLES_UPSERT: 'templateBundles:upsert',
  TEMPLATE_BUNDLES_TOGGLE: 'templateBundles:toggle',

  // Agents
  AGENT_LIST: 'agent:list',
  AGENT_GET: 'agent:get',
  AGENT_CREATE: 'agent:create',
  AGENT_UPDATE: 'agent:update',
  AGENT_SOFT_DELETE: 'agent:softDelete',
  AGENT_ENABLE: 'agent:enable',
  AGENT_DISABLE: 'agent:disable',
  AGENT_HEALTH: 'agent:health',
  AGENT_EXECUTIONS_LIST: 'agent:executions:list',
  AGENT_EXECUTION_CONTROL: 'agent:execution:control',
  AGENT_TIMELINE_LIST: 'agent:timeline:list',
  AGENT_FEEDBACK_CREATE: 'agentFeedback:create',
  AGENT_FEEDBACK_LIST: 'agentFeedback:list',
  AGENT_FEEDBACK_GET: 'agentFeedback:get',
  AGENT_FEEDBACK_UPDATE_STATUS: 'agentFeedback:updateStatus',
  AGENT_FEEDBACK_EXPORT: 'agentFeedback:export',
  AGENT_FEEDBACK_SYNTHETIC: 'agentFeedback:createSyntheticFromExecution',

  // Config portability
  CONFIG_EXPORT: 'config:export',
  CONFIG_IMPORT_PREVIEW: 'config:importPreview',
  CONFIG_IMPORT_APPLY: 'config:importApply',

  // Skills registry
  SKILLS_REGISTRY_LIST: 'skillsRegistry:list',
  SKILLS_REGISTRY_UPSERT: 'skillsRegistry:upsert',
  SKILLS_REGISTRY_TOGGLE: 'skillsRegistry:toggle',

  // Export
  EXPORT_MARKDOWN: 'export:markdown',
  EXPORT_JSON: 'export:json',

  // Skills
  SKILLS_LIST: 'skills:list',
  SKILL_READ: 'skill:read',
  SKILL_CREATE: 'skill:create',
  SKILL_TEST: 'skill:test',

  // App
  APP_INFO: 'app:info',
  GET_DATA_PATH: 'app:dataPath',

  // Dialog
  DIALOG_OPEN: 'dialog:open',

  // Auth
  AUTH_BOOTSTRAP: 'auth:bootstrap',
  AUTH_LOGIN: 'auth:login',
  AUTH_LOGOUT: 'auth:logout',
  AUTH_SESSION: 'auth:session',
  AUTH_CHANGE_PASSWORD: 'auth:changePassword',

  // Users / Admin
  USER_LIST: 'user:list',
  USER_CREATE: 'user:create',
  USER_UPDATE: 'user:update',
  USER_RESET_PASSWORD: 'user:resetPassword',
  USER_DIRECTORY: 'user:directory',

  // Audit
  AUDIT_LIST: 'audit:list',
  AUDIT_EXPORT: 'audit:export',
} as const
