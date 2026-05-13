import { ipcMain, dialog, app, BrowserWindow, type IpcMainInvokeEvent } from 'electron';
import * as path from 'path';
import * as fs from 'fs/promises';
import { randomUUID } from 'crypto';
import { IPC_CHANNELS } from '../shared/types.js';
import type { AgentExecutionRecord, AgentFeedbackRecord, AgentRecord, AgentExecutionStatus, McpAllowlistEntry, McpGatewayRequest, Memory, MemoryType, NexusGatewayApiKey, NexusGatewayApiKeyCreateRequest, NexusGatewayConfigApplyResult, NexusRouterDecision, NexusTemplateBundle, NexusTokenPolicy, NexusWorkspaceSummary, Project, ProviderSetting, ReleaseStatus, ReleaseTestResult, ReleaseTestStatus, Run, SavedPrompt, PromptVersion, SkillRegistryEntry, Task } from '../shared/types.js';
import { sanitizeObject } from '../shared/secretRedaction.js';
import { buildAuditExportManifest } from '../shared/auditCore.js';
import { PROVIDER_PRESETS } from '../shared/providerPresets.js';
import { buildConfigBundle, previewConfigImport, previewGatewayConfigImport, simpleHash } from '../shared/configPortability.js';
import { getAllRegisteredStorageCollections, LOCALAI_MODULE_REGISTRY } from '../shared/moduleRegistry.js';
import storage from './storage.js';
import { getGitLog, getGitStatus, getGitSummary } from './git.js';
import { readSkillsFromDir, fileExists } from './filesystem.js';
import { sanitizeFilePath, sanitizeRealFilePath, validateUserChosenSavePath } from './security.js';
import type { AuditQuery } from '../shared/auditTypes.js';
import type { ChangePasswordRequest, CreateUserRequest, LoginRequest, ResetPasswordRequest, ResourceAcl, ResourceRole, UpdateUserRequest } from '../shared/authTypes.js';
import { assertProjectAccess, canAccessProjectResource, canRole, type Permission, type ResourceAction } from './rbac.js';
import {
  bootstrapAuth,
  changePassword,
  clearActiveRendererSession,
  createUser,
  getActiveRendererSession,
  listUsers,
  login,
  resetPassword,
  sessionState,
  updateUser,
  validateSession,
  type SessionContext,
} from './session.js';
import { listAuditEvents, recordAudit } from './audit.js';
import { verifyAuditIntegrity } from './audit.js';
import { isProtectedSecret, maskSecret, protectSecret, unprotectSecret } from './secureStore.js';
import { evaluateMcpGatewayRequest } from './mcpGateway.js';
import { runWorkflow } from '../core/workflowRuntime.js';
import { BEGINNER_WORKFLOW_TEMPLATES } from '../templates/workflowTemplates.js';
import type { Workflow, WorkflowVersion } from '../shared/workflowTypes.js';
import { getGatewayStatus, restartGateway, startGateway, stopGateway } from './domain/gateway/gatewayService.js';
import {
  buildGatewayEnvExport,
  createGatewayApiKey,
  listGatewayApiKeys,
  resetGatewayApiKey,
  updateGatewayApiKeyStatus,
} from './domain/gateway/gatewayKeyService.js';
import { checkProviderHealth, healthSummary } from './domain/health/healthService.js';
import { listUsageRecords, summarizeUsage } from './domain/usage/usageService.js';
import { evaluateTokenPolicy, listTokenPolicies, upsertTokenPolicy } from './domain/usage/tokenPolicyService.js';
import { generateRuntimeProfiles } from './domain/runtime/runtimeProfileService.js';
import { createPromptSkill, testPromptSkill } from './domain/skills/skillService.js';
import { generateSecurityReport } from './domain/security/securityReportService.js';
import { generateObservabilityReport, runMockEvaluation } from './domain/observability/observabilityService.js';
import { saveKnowledgeDocumentPreview, summarizeKnowledgeAssets, testKnowledgeRetrieval } from './domain/knowledge/knowledgeService.js';
import { applyRestore, createBackupManifest, previewBackup, previewRestore } from './domain/ops/backupService.js';
import { buildRecoveryPack, previewContextPack } from './domain/memory/contextPackService.js';
import { listTemplateBundles, toggleTemplateBundle, upsertTemplateBundle } from './domain/ecosystem/bundleRegistryService.js';
import { createDemoExecution } from '../shared/agentCore.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function handleError(err: unknown): { error: string } {
  if (err instanceof Error) return { error: err.message };
  return { error: String(err) };
}

async function createDemoExecutionForAgent(agent: AgentRecord, context: SessionContext): Promise<AgentExecutionRecord> {
  const execution = createDemoExecution(agent.id, new Date());
  return storage.create('agentExecutions', {
    ...execution,
    projectId: agent.projectId || execution.projectId,
    workflowId: agent.workflowId || execution.workflowId,
    customData: sanitizeObject({
      ...(execution.customData ?? {}),
      ownerUserId: context.user.id,
      providerRef: agent.providerRef,
      model: agent.model,
      humanOwner: context.user.email,
    }) as Record<string, unknown>,
  } as never);
}

const PUBLIC_CHANNELS = new Set<string>([
  IPC_CHANNELS.AUTH_BOOTSTRAP,
  IPC_CHANNELS.AUTH_LOGIN,
  IPC_CHANNELS.AUTH_SESSION,
  IPC_CHANNELS.APP_INFO,
]);

const CHANNEL_PERMISSIONS: Partial<Record<string, Permission>> = {
  [IPC_CHANNELS.AUTH_LOGOUT]: 'app:read',
  [IPC_CHANNELS.AUTH_CHANGE_PASSWORD]: 'app:read',
  [IPC_CHANNELS.STORAGE_GET]: 'admin:users',
  [IPC_CHANNELS.STORAGE_GET_ALL]: 'admin:users',
  [IPC_CHANNELS.STORAGE_SET]: 'admin:users',
  [IPC_CHANNELS.STORAGE_DELETE]: 'admin:users',
  [IPC_CHANNELS.PROJECT_LIST]: 'project:read',
  [IPC_CHANNELS.PROJECT_GET]: 'project:read',
  [IPC_CHANNELS.PROJECT_CREATE]: 'project:write',
  [IPC_CHANNELS.PROJECT_UPDATE]: 'project:write',
  [IPC_CHANNELS.PROJECT_DELETE]: 'project:write',
  [IPC_CHANNELS.PROJECT_ACL_GET]: 'project:read',
  [IPC_CHANNELS.PROJECT_ACL_UPDATE]: 'project:write',
  [IPC_CHANNELS.WORKSPACE_SUMMARY]: 'project:read',
  [IPC_CHANNELS.TASK_LIST]: 'project:read',
  [IPC_CHANNELS.TASK_CREATE]: 'task:write',
  [IPC_CHANNELS.TASK_UPDATE]: 'task:write',
  [IPC_CHANNELS.TASK_DELETE]: 'task:write',
  [IPC_CHANNELS.PROMPT_LIST]: 'project:read',
  [IPC_CHANNELS.PROMPT_CREATE]: 'prompt:write',
  [IPC_CHANNELS.PROMPT_UPDATE]: 'prompt:write',
  [IPC_CHANNELS.PROMPT_DELETE]: 'prompt:write',
  [IPC_CHANNELS.RUN_LIST]: 'project:read',
  [IPC_CHANNELS.RUN_CREATE]: 'run:write',
  [IPC_CHANNELS.RUN_EVENTS_LIST]: 'project:read',
  [IPC_CHANNELS.WORKFLOW_TEMPLATE_LIST]: 'project:read',
  [IPC_CHANNELS.WORKFLOW_LIST]: 'project:read',
  [IPC_CHANNELS.WORKFLOW_GET]: 'project:read',
  [IPC_CHANNELS.WORKFLOW_CREATE_FROM_TEMPLATE]: 'project:write',
  [IPC_CHANNELS.WORKFLOW_SAVE]: 'project:write',
  [IPC_CHANNELS.WORKFLOW_RUN]: 'run:write',
  [IPC_CHANNELS.WORKFLOW_RUN_CONTROL]: 'run:write',
  [IPC_CHANNELS.WORKFLOW_VERSION_LIST]: 'project:read',
  [IPC_CHANNELS.MCP_ALLOWLIST_LIST]: 'mcp:write',
  [IPC_CHANNELS.MCP_ALLOWLIST_CHECK]: 'mcp:write',
  [IPC_CHANNELS.MCP_ALLOWLIST_UPSERT]: 'mcp:write',
  [IPC_CHANNELS.MCP_GATEWAY_EVALUATE]: 'mcp:write',
  [IPC_CHANNELS.GIT_LOG]: 'git:read',
  [IPC_CHANNELS.GIT_STATUS]: 'git:read',
  [IPC_CHANNELS.GIT_SUMMARY]: 'git:read',
  [IPC_CHANNELS.RELEASE_STATUS]: 'git:read',
  [IPC_CHANNELS.MEMORY_LIST]: 'memory:read',
  [IPC_CHANNELS.MEMORY_GET]: 'memory:read',
  [IPC_CHANNELS.MEMORY_CREATE]: 'memory:write',
  [IPC_CHANNELS.MEMORY_UPDATE]: 'memory:write',
  [IPC_CHANNELS.MEMORY_DELETE]: 'memory:write',
  [IPC_CHANNELS.MEMORY_EXPORT]: 'memory:export',
  [IPC_CHANNELS.MEMORY_IMPORT]: 'memory:write',
  [IPC_CHANNELS.MEMORY_GENERATE_CONTEXT]: 'memory:read',
  [IPC_CHANNELS.SETTINGS_GET]: 'settings:read',
  [IPC_CHANNELS.SETTINGS_GET_ALL]: 'settings:read',
  [IPC_CHANNELS.SETTINGS_SET]: 'settings:write',
  [IPC_CHANNELS.PROVIDER_LIST]: 'provider:read',
  [IPC_CHANNELS.PROVIDER_CREATE]: 'provider:write',
  [IPC_CHANNELS.PROVIDER_UPDATE]: 'provider:write',
  [IPC_CHANNELS.PROVIDER_DELETE]: 'provider:write',
  [IPC_CHANNELS.PROVIDER_PRESETS]: 'provider:read',
  [IPC_CHANNELS.PROVIDER_TEST]: 'provider:write',
  [IPC_CHANNELS.PROVIDER_ACTIVE_GET]: 'provider:read',
  [IPC_CHANNELS.PROVIDER_ACTIVE_SET]: 'provider:write',
  [IPC_CHANNELS.GATEWAY_STATUS]: 'gateway:read',
  [IPC_CHANNELS.GATEWAY_START]: 'gateway:write',
  [IPC_CHANNELS.GATEWAY_STOP]: 'gateway:write',
  [IPC_CHANNELS.GATEWAY_RESTART]: 'gateway:write',
  [IPC_CHANNELS.GATEWAY_KEY_LIST]: 'gateway:read',
  [IPC_CHANNELS.GATEWAY_KEY_CREATE]: 'gateway:write',
  [IPC_CHANNELS.GATEWAY_KEY_DISABLE]: 'gateway:write',
  [IPC_CHANNELS.GATEWAY_KEY_DELETE]: 'gateway:write',
  [IPC_CHANNELS.GATEWAY_KEY_RESET]: 'gateway:write',
  [IPC_CHANNELS.GATEWAY_EXPORT_ENV]: 'gateway:read',
  [IPC_CHANNELS.GATEWAY_EXPORT_CODEX]: 'gateway:read',
  [IPC_CHANNELS.GATEWAY_EXPORT_CLAUDE]: 'gateway:read',
  [IPC_CHANNELS.GATEWAY_IMPORT_PREVIEW]: 'gateway:read',
  [IPC_CHANNELS.GATEWAY_IMPORT_APPLY]: 'gateway:write',
  [IPC_CHANNELS.USAGE_SUMMARY]: 'provider:read',
  [IPC_CHANNELS.USAGE_LIST]: 'provider:read',
  [IPC_CHANNELS.TOKEN_POLICY_LIST]: 'provider:read',
  [IPC_CHANNELS.TOKEN_POLICY_UPSERT]: 'provider:write',
  [IPC_CHANNELS.TOKEN_POLICY_EVALUATE]: 'provider:read',
  [IPC_CHANNELS.HEALTH_SUMMARY]: 'provider:read',
  [IPC_CHANNELS.HEALTH_CHECK_PROVIDER]: 'provider:write',
  [IPC_CHANNELS.RUNTIME_PROFILES_GENERATE]: 'provider:read',
  [IPC_CHANNELS.ROUTER_DECISIONS_LIST]: 'provider:read',
  [IPC_CHANNELS.SECURITY_REPORT_GENERATE]: 'admin:audit',
  [IPC_CHANNELS.OBSERVABILITY_REPORT_GENERATE]: 'provider:read',
  [IPC_CHANNELS.EVAL_MOCK_RUN]: 'provider:read',
  [IPC_CHANNELS.KNOWLEDGE_ASSETS_SUMMARY]: 'memory:read',
  [IPC_CHANNELS.KNOWLEDGE_DOCUMENT_PREVIEW]: 'memory:write',
  [IPC_CHANNELS.KNOWLEDGE_RETRIEVAL_TEST]: 'memory:read',
  [IPC_CHANNELS.OPS_BACKUP_PREVIEW]: 'ops:backup',
  [IPC_CHANNELS.OPS_BACKUP_CREATE]: 'ops:backup',
  [IPC_CHANNELS.OPS_RESTORE_PREVIEW]: 'ops:restore',
  [IPC_CHANNELS.OPS_RESTORE_APPLY]: 'ops:restore',
  [IPC_CHANNELS.CONTEXT_PACK_PREVIEW]: 'memory:read',
  [IPC_CHANNELS.CONTEXT_RECOVERY_PACK]: 'memory:export',
  [IPC_CHANNELS.TEMPLATE_BUNDLES_LIST]: 'skill:read',
  [IPC_CHANNELS.TEMPLATE_BUNDLES_UPSERT]: 'mcp:write',
  [IPC_CHANNELS.TEMPLATE_BUNDLES_TOGGLE]: 'mcp:write',
  [IPC_CHANNELS.AGENT_LIST]: 'project:read',
  [IPC_CHANNELS.AGENT_GET]: 'project:read',
  [IPC_CHANNELS.AGENT_CREATE]: 'project:write',
  [IPC_CHANNELS.AGENT_UPDATE]: 'project:write',
  [IPC_CHANNELS.AGENT_SOFT_DELETE]: 'project:write',
  [IPC_CHANNELS.AGENT_ENABLE]: 'project:write',
  [IPC_CHANNELS.AGENT_DISABLE]: 'project:write',
  [IPC_CHANNELS.AGENT_HEALTH]: 'project:read',
  [IPC_CHANNELS.AGENT_EXECUTIONS_LIST]: 'project:read',
  [IPC_CHANNELS.AGENT_EXECUTION_CONTROL]: 'project:write',
  [IPC_CHANNELS.AGENT_TIMELINE_LIST]: 'project:read',
  [IPC_CHANNELS.AGENT_FEEDBACK_CREATE]: 'project:write',
  [IPC_CHANNELS.AGENT_FEEDBACK_LIST]: 'project:read',
  [IPC_CHANNELS.AGENT_FEEDBACK_GET]: 'project:read',
  [IPC_CHANNELS.AGENT_FEEDBACK_UPDATE_STATUS]: 'project:write',
  [IPC_CHANNELS.AGENT_FEEDBACK_EXPORT]: 'memory:export',
  [IPC_CHANNELS.AGENT_FEEDBACK_SYNTHETIC]: 'project:write',
  [IPC_CHANNELS.CONFIG_EXPORT]: 'export:write',
  [IPC_CHANNELS.CONFIG_IMPORT_PREVIEW]: 'settings:read',
  [IPC_CHANNELS.CONFIG_IMPORT_APPLY]: 'settings:write',
  [IPC_CHANNELS.SKILLS_REGISTRY_LIST]: 'skill:read',
  [IPC_CHANNELS.SKILLS_REGISTRY_UPSERT]: 'mcp:write',
  [IPC_CHANNELS.SKILLS_REGISTRY_TOGGLE]: 'mcp:write',
  [IPC_CHANNELS.EXPORT_MARKDOWN]: 'export:write',
  [IPC_CHANNELS.EXPORT_JSON]: 'export:write',
  [IPC_CHANNELS.SKILLS_LIST]: 'skill:read',
  [IPC_CHANNELS.SKILL_READ]: 'skill:read',
  [IPC_CHANNELS.SKILL_CREATE]: 'mcp:write',
  [IPC_CHANNELS.SKILL_TEST]: 'skill:read',
  [IPC_CHANNELS.GET_DATA_PATH]: 'app:read',
  [IPC_CHANNELS.DIALOG_OPEN]: 'dialog:open',
  [IPC_CHANNELS.USER_LIST]: 'admin:users',
  [IPC_CHANNELS.USER_CREATE]: 'admin:users',
  [IPC_CHANNELS.USER_UPDATE]: 'admin:users',
  [IPC_CHANNELS.USER_RESET_PASSWORD]: 'admin:users',
  [IPC_CHANNELS.USER_DIRECTORY]: 'project:write',
  [IPC_CHANNELS.AUDIT_LIST]: 'admin:audit',
  [IPC_CHANNELS.AUDIT_EXPORT]: 'admin:audit',
};

const PASSWORD_CHANGE_ALLOWED = new Set<string>([
  IPC_CHANNELS.AUTH_LOGOUT,
  IPC_CHANNELS.AUTH_CHANGE_PASSWORD,
  IPC_CHANNELS.AUTH_SESSION,
]);

function readAuthHeader(args: unknown[]): { sessionId?: string; sessionToken?: string; rest: unknown[] } {
  const first = args[0];
  if (first && typeof first === 'object' && '__auth' in first) {
    const auth = (first as { __auth?: { sessionId?: unknown; sessionToken?: unknown } }).__auth;
    const active = getActiveRendererSession();
    return { sessionId: typeof auth?.sessionId === 'string' ? auth.sessionId : active.sessionId, sessionToken: active.sessionToken, rest: args.slice(1) };
  }
  return { rest: args };
}

async function guardIpcCall(channel: string, args: unknown[]): Promise<{ args: unknown[]; context?: SessionContext }> {
  const { sessionId, sessionToken, rest } = readAuthHeader(args);
  if (PUBLIC_CHANNELS.has(channel)) return { args };
  const permission = CHANNEL_PERMISSIONS[channel];
  if (!permission) throw new Error(`No IPC permission policy for channel: ${channel}`);
  const context = await validateSession(sessionId, sessionToken);
  if (!context) {
    await recordAudit({
      type: 'permission.denied',
      action: channel,
      status: 'denied',
      severity: 'warning',
      actor: {},
      metadata: { reason: 'missing_or_invalid_session', channel },
    });
    throw new Error('Authentication required.');
  }
  if (!canRole(context.user.role, permission)) {
    await recordAudit({
      type: 'permission.denied',
      action: channel,
      status: 'denied',
      severity: 'warning',
      actor: { userId: context.user.id, email: context.user.email, role: context.user.role, sessionId: context.session.id },
      metadata: { permission, channel },
    });
    throw new Error(`Permission denied: ${permission}`);
  }
  if (context.user.mustChangePassword && !PASSWORD_CHANGE_ALLOWED.has(channel)) {
    await recordAudit({
      type: 'permission.denied',
      action: channel,
      status: 'denied',
      severity: 'critical',
      actor: { userId: context.user.id, email: context.user.email, role: context.user.role, sessionId: context.session.id },
      metadata: { reason: 'must_change_password', channel },
    });
    throw new Error('Password change required before using this workspace.');
  }
  return { args: rest, context };
}

function actorFor(context?: SessionContext) {
  return context
    ? { userId: context.user.id, email: context.user.email, role: context.user.role, sessionId: context.session.id }
    : {};
}

function aclForOwner(context: SessionContext) {
  const now = new Date().toISOString();
  return {
    ownerUserId: context.user.id,
    visibility: 'private' as const,
    entries: [{ userId: context.user.id, role: 'owner' as const, grantedBy: context.user.id, grantedAt: now }],
  };
}

function sanitizeProjectAcl(input: unknown, fallback: ResourceAcl): ResourceAcl {
  const source = input && typeof input === 'object' ? (input as Partial<ResourceAcl>) : {};
  const ownerUserId = String(source.ownerUserId || fallback.ownerUserId);
  const entries = Array.isArray(source.entries) ? source.entries : fallback.entries;
  const allowedRoles = new Set<ResourceRole>(['owner', 'editor', 'viewer']);
  const normalized = entries
    .flatMap((entry) => {
      const role = (entry as { role?: ResourceRole }).role;
      const userId = String((entry as { userId?: unknown }).userId ?? '').trim();
      if (!userId || !role || !allowedRoles.has(role)) return [];
      return [{
        userId,
        role,
        grantedBy: String((entry as { grantedBy?: unknown }).grantedBy ?? ''),
        grantedAt: String((entry as { grantedAt?: unknown }).grantedAt ?? new Date().toISOString()),
      }];
    });
  if (!normalized.some((entry) => entry.userId === ownerUserId && entry.role === 'owner')) {
    normalized.unshift({ userId: ownerUserId, role: 'owner', grantedBy: ownerUserId, grantedAt: new Date().toISOString() });
  }
  return {
    ownerUserId,
    visibility: normalized.length > 1 ? 'shared' : 'private',
    entries: normalized,
  };
}

async function getProjectAclPayload(projectId: string, context: SessionContext | undefined) {
  const project = await storage.getById<Project>('projects', projectId);
  if (!project) throw new Error('Project not found.');
  assertProjectAccess(context as SessionContext, project, 'read');
  const acl = project.acl ?? aclForOwner(context as SessionContext);
  return { projectId, acl, ownerUserId: project.ownerUserId ?? acl.ownerUserId };
}

async function getProjectForAccess(projectId: string) {
  return storage.getById<{ id: string; [key: string]: unknown }>('projects', projectId);
}

async function assertProjectResourceAccess(context: SessionContext | undefined, projectId: string, action: ResourceAction) {
  if (!context) throw new Error('Authentication required.');
  const project = await getProjectForAccess(projectId);
  assertProjectAccess(context, project as never, action);
  return project;
}

async function assertChildResourceAccess(
  context: SessionContext | undefined,
  collection: 'tasks' | 'prompts' | 'runs' | 'memories',
  id: string,
  action: ResourceAction,
) {
  if (!context) throw new Error('Authentication required.');
  const item = await storage.getById<{ id: string; projectId?: string; [key: string]: unknown }>(collection, id);
  if (!item) throw new Error('Resource not found.');
  if (item.projectId) await assertProjectResourceAccess(context, item.projectId, action);
  return item;
}

async function filterProjectScoped<T extends { projectId?: string }>(context: SessionContext | undefined, items: T[]) {
  if (!context) return [];
  if (context.user.role === 'admin') return items;
  const visible: T[] = [];
  for (const item of items) {
    if (!item.projectId) continue;
    const project = await getProjectForAccess(item.projectId);
    if (canAccessProjectResource(context, project as never, 'read')) visible.push(item);
  }
  return visible;
}

async function recordMutationAudit(context: SessionContext | undefined, action: string, resource: { type: string; id?: string; label?: string }, metadata: Record<string, unknown> = {}) {
  if (!context) return;
  await recordAudit({
    type: action === 'run.create' ? 'run.create' : 'admin.operation',
    action,
    status: 'success',
    severity: 'info',
    actor: actorFor(context),
    resource,
    metadata,
  });
}

function buildPromptVersion(
  prompt: Partial<SavedPrompt>,
  previousVersions: PromptVersion[] = [],
  context?: SessionContext,
  message = 'Saved prompt version',
): PromptVersion {
  const nextVersion = previousVersions.reduce((max, version) => Math.max(max, Number(version.version) || 0), 0) + 1;
  return {
    id: randomUUID(),
    version: nextVersion,
    content: String(prompt.content ?? ''),
    variables: prompt.variables,
    message,
    createdByUserId: context?.user.id,
    createdAt: new Date().toISOString(),
  };
}

function assertTrustedIpcSender(event: IpcMainInvokeEvent): void {
  const frameUrl = event.senderFrame?.url ?? '';
  if (frameUrl.startsWith('file://')) return;
  try {
    const parsed = new URL(frameUrl);
    if (parsed.protocol === 'http:' && ['127.0.0.1', 'localhost'].includes(parsed.hostname)) return;
  } catch {
    // Fall through to the denial below.
  }
  throw new Error(`Blocked IPC call from untrusted origin: ${frameUrl || 'unknown'}`);
}

function installIpcOriginGuard(): void {
  const originalHandle = ipcMain.handle.bind(ipcMain);
  ipcMain.handle = ((channel: string, listener: (event: IpcMainInvokeEvent, ...args: unknown[]) => unknown) => {
    return originalHandle(channel, async (event, ...args) => {
      assertTrustedIpcSender(event);
      const guarded = await guardIpcCall(channel, args);
      return listener(event, ...guarded.args, guarded.context);
    });
  }) as typeof ipcMain.handle;
}

const ALLOWED_STORAGE_COLLECTIONS = new Set(getAllRegisteredStorageCollections());

const MASKED_API_KEY_PREFIX = 'Saved key ending in ';

type ProviderRecord = { id: string; providerName?: string; apiKey?: unknown; [key: string]: unknown };

function assertAllowedCollection(collection: string): void {
  if (!ALLOWED_STORAGE_COLLECTIONS.has(collection)) {
    throw new Error(`Storage collection is not allowed: ${collection}`);
  }
}

function sanitizeForCollection(collection: string, value: unknown): unknown {
  if (collection === 'providerSettings') {
    const providers = Array.isArray(value) ? value : value ? [value] : [];
    const masked = providers.map((provider) =>
      maskProviderForRenderer(provider as { apiKey?: string; [key: string]: unknown }),
    );
    return Array.isArray(value) ? masked : masked[0] ?? value;
  }
  if (collection === 'memories') {
    return sanitizeObject(value);
  }
  return value;
}

function sanitizeStorageWriteForCollection(collection: string, value: unknown): unknown {
  if (collection === 'providerSettings') {
    return sanitizeProviderForStorage(value);
  }
  if (collection === 'memories') {
    return sanitizeObject(value);
  }
  return value;
}

function getSkillsRoot(): string {
  return path.resolve(process.cwd(), '.agents', 'skills');
}

function resolveSkillReadPath(skillPath: string): string {
  const skillsRoot = getSkillsRoot();
  const safePath = sanitizeRealFilePath(skillPath, skillsRoot);
  if (path.basename(safePath) !== 'SKILL.md') {
    throw new Error('Only SKILL.md files can be read from the skills directory.');
  }
  return safePath;
}

async function readProjectText(relativePath: string): Promise<string> {
  const safePath = sanitizeFilePath(relativePath, process.cwd());
  return fs.readFile(safePath, 'utf-8');
}

function extractMarkdownBullets(markdown: string, sectionNames: string[], limit = 6): string[] {
  const lines = markdown.split(/\r?\n/);
  const sectionSet = new Set(sectionNames.map((name) => name.toLowerCase()));
  const bullets: string[] = [];
  let collecting = false;

  for (const line of lines) {
    const heading = line.match(/^#{2,4}\s+(.+?)\s*$/);
    if (heading) {
      const headingText = heading[1].replace(/`/g, '').toLowerCase();
      collecting = sectionSet.has(headingText);
      continue;
    }

    if (!collecting) continue;
    const bullet = line.match(/^\s*[-*]\s+(.+?)\s*$/);
    if (bullet) {
      bullets.push(bullet[1].replace(/`/g, '').trim());
      if (bullets.length >= limit) break;
    }
  }

  return bullets;
}

function parseTestStatus(value: string): ReleaseTestStatus {
  const normalized = value.toUpperCase();
  if (normalized.includes('PASS')) return 'PASS';
  if (normalized.includes('FAIL')) return 'FAIL';
  if (normalized.includes('BLOCK') || normalized.includes('SKIP')) return 'BLOCKED';
  return 'UNKNOWN';
}

function extractLatestTestResults(markdown: string, limit = 8): ReleaseTestResult[] {
  const lines = markdown.split(/\r?\n/);
  const latestIndex = lines.findIndex((line) => /latest results/i.test(line));
  const start = latestIndex >= 0 ? latestIndex : 0;
  const results: ReleaseTestResult[] = [];

  for (let index = start; index < lines.length; index += 1) {
    const line = lines[index].trim();
    if (!line.startsWith('|') || line.includes('---')) continue;
    const cells = line
      .split('|')
      .slice(1, -1)
      .map((cell) => cell.trim());
    if (cells.length < 3 || /^check$/i.test(cells[0])) continue;
    results.push({
      command: cells[0].replace(/`/g, ''),
      status: parseTestStatus(cells[1]),
      details: cells[2].replace(/`/g, ''),
    });
    if (results.length >= limit) break;
  }

  return results;
}

async function buildReleaseStatus(repoPath?: string): Promise<ReleaseStatus> {
  const cwd = sanitizeFilePath(repoPath ?? process.cwd());
  const [gitSummary, gitStatus, appInfo, changelog, testReport, progress] = await Promise.all([
    getGitSummary(cwd),
    getGitStatus(cwd),
    Promise.resolve({ version: app.getVersion() }),
    readProjectText('CHANGELOG.md').catch(() => ''),
    readProjectText('handoff/TEST_REPORT.md').catch(() => ''),
    readProjectText('PROJECT_PROGRESS.md').catch(() => ''),
  ]);

  const updateSummary = [
    ...extractMarkdownBullets(changelog, ['Changed', 'Added', 'Fixed'], 4),
    ...extractMarkdownBullets(progress, ['6. 本轮完成记录', '本轮完成记录'], 4),
  ].slice(0, 6);

  return {
    version: appInfo.version,
    branch: gitSummary.branch || 'unknown',
    gitStatus,
    recentCommits: gitSummary.recentCommits.slice(0, 5),
    updateSummary: updateSummary.length
      ? updateSummary
      : ['本轮摘要将从 CHANGELOG.md 与 PROJECT_PROGRESS.md 自动读取。'],
    testResults: extractLatestTestResults(testReport),
    progressSummary: extractMarkdownBullets(progress, ['7. 下一轮建议', '下一轮建议'], 4),
    checkedAt: new Date().toISOString(),
  };
}

function maskApiKey(apiKey: unknown): string {
  return maskSecret(apiKey);
}

function maskProviderForRenderer<T extends { apiKey?: unknown }>(provider: T): T {
  return {
    ...sanitizeObject(provider),
    apiKey: maskApiKey(provider.apiKey),
  };
}

function isMaskedApiKey(value: unknown): boolean {
  return (
    typeof value === 'string' &&
    (value === '' || value === '[REDACTED]' || value.startsWith(MASKED_API_KEY_PREFIX))
  );
}

function sanitizeProviderForStorage(data: unknown, existingApiKey: unknown = ''): unknown {
  const payload = sanitizeObject(data) as { apiKey?: unknown; [key: string]: unknown };
  const source =
    data && typeof data === 'object' ? (data as { apiKey?: unknown; [key: string]: unknown }) : {};
  const submittedApiKey = source.apiKey;

  if (typeof submittedApiKey === 'string') {
    if (isMaskedApiKey(submittedApiKey)) {
      payload.apiKey = existingApiKey;
    } else {
      payload.apiKey = protectSecret(submittedApiKey, 'provider.apiKey');
    }
  }

  return payload;
}

async function migrateProviderSecretIfNeeded(provider: ProviderRecord): Promise<ProviderRecord> {
  if (!provider.apiKey || isProtectedSecret(provider.apiKey) || isMaskedApiKey(provider.apiKey)) return provider;
  if (typeof provider.apiKey !== 'string') return provider;
  try {
    const protectedApiKey = protectSecret(provider.apiKey, 'provider.apiKey');
    const updated = await storage.update('providerSettings', provider.id, { apiKey: protectedApiKey } as never);
    await recordAudit({
      type: 'provider.secret_migrated',
      action: 'provider.secret.migrate',
      status: 'success',
      severity: 'info',
      actor: {},
      resource: { type: 'provider', id: provider.id, label: provider.providerName },
    });
    return (updated ?? { ...provider, apiKey: protectedApiKey }) as ProviderRecord;
  } catch (err) {
    await recordAudit({
      type: 'provider.secret_unreadable',
      action: 'provider.secret.migrate',
      status: 'failure',
      severity: 'warning',
      actor: {},
      resource: { type: 'provider', id: provider.id, label: provider.providerName },
      metadata: { reason: err instanceof Error ? err.message : String(err) },
    });
    return provider;
  }
}

async function listProvidersForRenderer(): Promise<ProviderRecord[]> {
  const providers = await storage.getAll<ProviderRecord>('providerSettings');
  const migrated: ProviderRecord[] = [];
  for (const provider of providers) {
    migrated.push(await migrateProviderSecretIfNeeded(provider));
  }
  return migrated.map(maskProviderForRenderer);
}

async function mergeProviderUpdate(id: string, data: unknown): Promise<unknown> {
  const existing = await storage.getById<ProviderRecord>('providerSettings', id);
  return sanitizeProviderForStorage(data, existing?.apiKey);
}

function providerHasSecret(provider: ProviderRecord): boolean {
  if (provider.needsApiKey === false) return true;
  if (!provider.apiKey) return false;
  if (isProtectedSecret(provider.apiKey)) return Boolean(unprotectSecret(provider.apiKey));
  return typeof provider.apiKey === 'string' && !isMaskedApiKey(provider.apiKey);
}

function readProviderSecret(provider: ProviderRecord): string {
  if (provider.needsApiKey === false || provider.authType === 'none') return '';
  if (!provider.apiKey) return '';
  if (isProtectedSecret(provider.apiKey)) return unprotectSecret(provider.apiKey) || '';
  if (typeof provider.apiKey === 'string' && !isMaskedApiKey(provider.apiKey)) return provider.apiKey;
  return '';
}

function normalizeProviderUrl(baseUrl: unknown): string {
  if (typeof baseUrl !== 'string' || !baseUrl.trim()) throw new Error('Provider base URL is required.');
  const parsed = new URL(baseUrl.trim());
  if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('Provider base URL must use http or https.');
  return parsed.toString().replace(/\/$/, '');
}

async function testProviderConnection(providerId: string, context?: SessionContext) {
  const started = Date.now();
  const provider = await storage.getById<ProviderRecord>('providerSettings', providerId);
  if (!provider) throw new Error('Provider not found.');
  const checkedAt = new Date().toISOString();
  let result: { ok: boolean; status: 'success' | 'failure'; latencyMs: number; checkedAt: string; message: string };
  try {
    const baseUrl = normalizeProviderUrl(provider.baseUrl);
    if (!providerHasSecret(provider)) throw new Error('provider_secret_missing');
    const localOnly = baseUrl.startsWith('http://127.0.0.1') || baseUrl.startsWith('http://localhost');
    result = {
      ok: true,
      status: 'success',
      latencyMs: Date.now() - started,
      checkedAt,
      message: localOnly ? '本地 Provider 地址格式正确。' : 'Provider 配置已通过本地安全检查。',
    };
  } catch (err) {
    const raw = err instanceof Error ? err.message : String(err);
    result = {
      ok: false,
      status: 'failure',
      latencyMs: Date.now() - started,
      checkedAt,
      message: raw === 'provider_secret_missing' ? '缺少 API Key 或安全存储不可读取。' : raw,
    };
  }
  await storage.update('providerSettings', providerId, {
    lastTestStatus: result.status,
    lastTestMessage: result.message,
    lastTestedAt: checkedAt,
  } as never);
  await recordAudit({
    type: 'provider.connection_test',
    action: 'provider.test',
    status: result.ok ? 'success' : 'failure',
    severity: result.ok ? 'info' : 'warning',
    actor: actorFor(context),
    resource: { type: 'provider', id: providerId, label: String(provider.providerName ?? '') },
    metadata: sanitizeObject({ status: result.status, latencyMs: result.latencyMs, message: result.message }),
  });
  await storage.create('runEvents', {
    id: randomUUID(),
    type: 'provider.test',
    status: result.ok ? 'success' : 'failure',
    actorUserId: context?.user.id,
    title: `Provider test: ${String(provider.providerName ?? providerId)}`,
    detail: result.message,
    metadata: sanitizeObject({ providerId, status: result.status, latencyMs: result.latencyMs }),
    createdAt: checkedAt,
  } as never).catch(() => undefined);
  return result;
}

async function testProviderConnectionV2(providerId: string, context?: SessionContext) {
  const started = Date.now();
  const provider = await storage.getById<ProviderRecord>('providerSettings', providerId);
  if (!provider) throw new Error('Provider not found.');
  const checkedAt = new Date().toISOString();
  let result: {
    ok: boolean;
    status: 'success' | 'failure' | 'skipped';
    latencyMs: number;
    checkedAt: string;
    message: string;
    diagnostics: Record<string, { ok: boolean; category: string; message: string }>;
  };

  try {
    const baseUrl = normalizeProviderUrl(provider.baseUrl);
    const providerKind = String(provider.providerId ?? provider.id ?? '');
    const apiKey = readProviderSecret(provider);

    if (providerKind === 'localai-mock' || String(provider.baseUrl ?? '').startsWith('mock://')) {
      result = {
        ok: true,
        status: 'success',
        latencyMs: Date.now() - started,
        checkedAt,
        message: 'Mock provider is ready for CI-safe gateway and streaming tests.',
        diagnostics: {
          models: { ok: true, category: 'mock', message: 'Mock model list is generated locally.' },
          chat: { ok: true, category: 'mock', message: 'Mock chat route is available.' },
          responses: { ok: true, category: 'mock', message: 'Mock responses route is available.' },
        },
      };
    } else if (!providerHasSecret(provider)) {
      throw new Error('provider_secret_missing');
    } else if (providerKind && !['openai-compatible', 'custom-provider', 'custom'].includes(providerKind)) {
      result = {
        ok: false,
        status: 'skipped',
        latencyMs: Date.now() - started,
        checkedAt,
        message: `${String(provider.providerName ?? providerId)} needs protocol conversion before live gateway forwarding.`,
        diagnostics: {
          models: { ok: false, category: 'protocol_error', message: 'Live /v1/models test skipped for non OpenAI-compatible provider.' },
          chat: { ok: false, category: 'protocol_error', message: 'Chat route requires provider-specific conversion.' },
          responses: { ok: false, category: 'protocol_error', message: 'Responses route requires provider-specific conversion.' },
        },
      };
    } else {
      const modelsUrl = `${baseUrl.replace(/\/v1\/?$/i, '')}/v1/models`;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), Number(provider.defaultTimeout ?? 15_000));
      try {
        const response = await fetch(modelsUrl, {
          method: 'GET',
          headers: {
            authorization: apiKey ? `Bearer ${apiKey}` : '',
            'x-localai-nexus-diagnostic': 'models',
          },
          signal: controller.signal,
        });
        const body = await response.text();
        const category = response.ok ? 'success' : response.status === 401 ? 'auth_failure' : response.status === 404 ? 'unsupported_route' : `http_${response.status}`;
        result = {
          ok: response.ok,
          status: response.ok ? 'success' : 'failure',
          latencyMs: Date.now() - started,
          checkedAt,
          message: response.ok ? 'Live provider models endpoint responded successfully.' : `Live provider models endpoint failed: ${category}.`,
          diagnostics: {
            models: { ok: response.ok, category, message: response.ok ? 'GET /v1/models returned a response.' : body.slice(0, 240) || response.statusText },
            chat: { ok: response.ok, category: response.ok ? 'ready' : category, message: response.ok ? 'Chat route can use the same credential and base URL.' : 'Fix models/auth/base URL before chat smoke.' },
            responses: { ok: response.ok, category: response.ok ? 'ready' : category, message: response.ok ? 'Responses route can use the same credential and base URL.' : 'Fix models/auth/base URL before responses smoke.' },
          },
        };
      } finally {
        clearTimeout(timeout);
      }
    }
  } catch (err) {
    const raw = err instanceof Error ? err.message : String(err);
    const category = raw === 'provider_secret_missing'
      ? 'missing_key'
      : raw.toLowerCase().includes('abort')
      ? 'timeout'
      : raw.toLowerCase().includes('url')
      ? 'bad_base_url'
      : 'network_failure';
    result = {
      ok: false,
      status: 'failure',
      latencyMs: Date.now() - started,
      checkedAt,
      message: raw === 'provider_secret_missing' ? 'API key is missing or cannot be read from secure storage.' : raw,
      diagnostics: {
        models: { ok: false, category, message: raw },
        chat: { ok: false, category, message: 'Chat diagnostic waits for a successful models/auth/base URL check.' },
        responses: { ok: false, category, message: 'Responses diagnostic waits for a successful models/auth/base URL check.' },
      },
    };
  }

  await storage.update('providerSettings', providerId, {
    lastTestStatus: result.ok ? 'success' : 'failure',
    lastTestMessage: result.message,
    lastTestedAt: checkedAt,
  } as never);
  await recordAudit({
    type: 'provider.connection_test',
    action: 'provider.test',
    status: result.ok ? 'success' : 'failure',
    severity: result.ok ? 'info' : 'warning',
    actor: actorFor(context),
    resource: { type: 'provider', id: providerId, label: String(provider.providerName ?? '') },
    metadata: sanitizeObject({ status: result.status, latencyMs: result.latencyMs, message: result.message, diagnostics: result.diagnostics }),
  });
  await storage.create('runEvents', {
    id: randomUUID(),
    type: 'provider.test',
    status: result.ok ? 'success' : 'failure',
    actorUserId: context?.user.id,
    title: `Provider test: ${String(provider.providerName ?? providerId)}`,
    detail: result.message,
    metadata: sanitizeObject({ providerId, status: result.status, latencyMs: result.latencyMs, diagnostics: result.diagnostics }),
    createdAt: checkedAt,
  } as never).catch(() => undefined);
  return result;
}

async function setSettingValue(key: string, value: unknown) {
  if (key === 'auth.activeSessionSecret') throw new Error('This setting is managed by the main process.');
  const all = await storage.getAll<{ id: string; [key: string]: unknown }>('settings');
  const existing = all.find((s) => s.id === key);
  if (existing) return storage.update('settings', key, { ...existing, value } as never);
  return storage.create('settings', { id: key, value } as never);
}

async function getSettingValue<T = unknown>(key: string): Promise<T | undefined> {
  const all = await storage.getAll<{ id: string; value?: T }>('settings');
  return all.find((s) => s.id === key)?.value;
}

async function buildWorkspaceSummary(context?: SessionContext): Promise<NexusWorkspaceSummary> {
  const [
    projects,
    tasks,
    prompts,
    memories,
    providers,
    gatewayKeys,
    gatewayRequests,
  ] = await Promise.all([
    storage.getAll<Project>('projects').catch(() => []),
    storage.getAll<Task>('tasks').catch(() => []),
    storage.getAll<SavedPrompt>('prompts').catch(() => []),
    storage.getAll<Memory>('memories').catch(() => []),
    storage.getAll<ProviderSetting>('providerSettings').catch(() => []),
    storage.getAll<NexusGatewayApiKey>('gatewayApiKeys').catch(() => []),
    storage.getAll<{ id: string; createdAt?: string }>('gatewayRequests').catch(() => []),
  ]);
  const visibleProjects = !context || context.user.role === 'admin'
    ? projects
    : projects.filter((project) => canAccessProjectResource(context, project, 'read'));
  const visibleProjectIds = new Set(visibleProjects.map((project) => project.id));
  const isVisibleProjectItem = (item: { projectId?: string }) => !item.projectId || visibleProjectIds.has(item.projectId);
  const visibleTasks = !context || context.user.role === 'admin' ? tasks : tasks.filter(isVisibleProjectItem);
  const visiblePrompts = !context || context.user.role === 'admin' ? prompts : prompts.filter(isVisibleProjectItem);
  const visibleMemories = !context || context.user.role === 'admin' ? memories : memories.filter(isVisibleProjectItem);
  const moduleCount = LOCALAI_MODULE_REGISTRY.length;
  const averageCompletionPercent = Math.round(
    LOCALAI_MODULE_REGISTRY.reduce((sum, module) => sum + module.completionPercent, 0) / moduleCount,
  );

  return {
    generatedAt: new Date().toISOString(),
    projects: {
      total: visibleProjects.length,
      active: visibleProjects.filter((project) => project.status !== 'archived').length,
      archived: visibleProjects.filter((project) => project.status === 'archived').length,
    },
    tasks: {
      total: visibleTasks.length,
      open: visibleTasks.filter((task) => !['done', 'blocked'].includes(task.status)).length,
      done: visibleTasks.filter((task) => task.status === 'done').length,
      blocked: visibleTasks.filter((task) => task.status === 'blocked').length,
    },
    prompts: {
      total: visiblePrompts.length,
      starred: visiblePrompts.filter((prompt) => Boolean(prompt.starred || prompt.favorite)).length,
    },
    memory: {
      total: visibleMemories.length,
      active: visibleMemories.filter((memory) => memory.status === 'active').length,
      pending: visibleMemories.filter((memory) => memory.status === 'pending').length,
    },
    providers: {
      total: providers.length,
      enabled: providers.filter((provider) => provider.enabled !== false).length,
    },
    gateway: {
      keyCount: gatewayKeys.filter((key) => key.status !== 'deleted').length,
      activeKeyCount: gatewayKeys.filter((key) => key.status === 'active').length,
      recentRequestCount: gatewayRequests.length,
    },
    buildPlans: {
      moduleCount,
      averageCompletionPercent,
      incompleteModuleCount: LOCALAI_MODULE_REGISTRY.filter((module) => module.status !== 'implemented').length,
    },
  };
}

async function createGatewayConfigImportRecord(raw: string, context?: SessionContext): Promise<NexusGatewayConfigApplyResult> {
  const preview = previewGatewayConfigImport(raw);
  if (!preview.ok || !preview.normalized) {
    return {
      ok: false,
      source: preview.source,
      imported: 0,
      warnings: preview.warnings,
      mergePlan: preview.mergePlan,
      backup: {
        id: '',
        createdAt: new Date().toISOString(),
        collections: [],
        hash: '',
        redaction: 'secrets-redacted',
      },
      audit: { action: 'gateway.config.imported', status: 'not-recorded' },
      record: { errors: preview.errors },
    };
  }

  const now = new Date().toISOString();
  const [gatewayKeys, settings, auditLogs] = await Promise.all([
    storage.getAll<NexusGatewayApiKey>('gatewayApiKeys').catch(() => []),
    storage.getAll<{ id: string; value?: unknown }>('settings').catch(() => []),
    storage.getAll<{ id: string; [key: string]: unknown }>('auditLogs').catch(() => []),
  ]);
  const backupSeed = sanitizeObject({
    createdAt: now,
    collections: {
      gatewayApiKeys: gatewayKeys,
      settings,
      auditLogs,
    },
    redaction: 'secrets-redacted',
  }) as Record<string, unknown>;
  const backup = {
    id: randomUUID(),
    createdAt: now,
    collections: [
      { name: 'gatewayApiKeys', count: gatewayKeys.length },
      { name: 'settings', count: settings.length },
      { name: 'auditLogs', count: auditLogs.length },
    ],
    hash: simpleHash(backupSeed),
    redaction: 'secrets-redacted' as const,
  };
  const record = sanitizeObject({
    id: randomUUID(),
    source: preview.source,
    detected: preview.detected,
    normalized: preview.normalized,
    mergePlan: preview.mergePlan,
    backup,
    redaction: 'secrets-redacted',
    createdByUserId: context?.user.id,
    createdAt: now,
  }) as Record<string, unknown>;
  await setSettingValue('gateway.config.imports', [
    ...(await getSettingValue<Array<Record<string, unknown>>>('gateway.config.imports') ?? []),
    record,
  ]);
  await recordMutationAudit(context, 'gateway.config.imported', { type: 'gateway_config_import', id: String(record.id), label: String(preview.source) }, {
    source: preview.source,
    detected: preview.detected,
    mergeActions: preview.mergePlan.map((action) => `${action.action}:${action.target}`),
    backupHash: backup.hash,
    redaction: 'secrets-redacted',
  });
  return {
    ok: true,
    source: preview.source,
    imported: 1,
    warnings: preview.warnings,
    mergePlan: preview.mergePlan,
    backup,
    audit: {
      action: 'gateway.config.imported',
      status: context ? 'recorded' : 'not-recorded',
    },
    record,
  };
}

async function filterAgentsForContext(context: SessionContext | undefined, agents: AgentRecord[]) {
  if (!context) return [];
  if (context.user.role === 'admin') return agents;
  const visible: AgentRecord[] = [];
  for (const agent of agents) {
    if (!agent.projectId) {
      if (agent.ownerUserId === context.user.id) visible.push(agent);
      continue;
    }
    const project = await getProjectForAccess(agent.projectId);
    if (canAccessProjectResource(context, project as never, 'read')) visible.push(agent);
  }
  return visible;
}

async function assertAgentAccess(context: SessionContext | undefined, id: string, action: ResourceAction) {
  if (!context) throw new Error('Authentication required.');
  const agent = await storage.getById<AgentRecord>('agents', id);
  if (!agent || agent.deletedAt) throw new Error('Agent not found.');
  if (agent.projectId) await assertProjectResourceAccess(context, agent.projectId, action);
  else if (context.user.role !== 'admin' && agent.ownerUserId !== context.user.id) throw new Error('Permission denied: agent owner required.');
  return agent;
}

// ---------------------------------------------------------------------------
// Memory context generation
// ---------------------------------------------------------------------------

async function generateMemoryContext(options: {
  projectId?: string;
  injectionMode?: string;
}, context?: SessionContext): Promise<string> {
  const allMemories = sanitizeObject(
    await storage.getAll<{ id: string; [key: string]: unknown }>('memories'),
  ) as Array<{ id: string; projectId?: string; status?: unknown; importance?: unknown; lastUsedAt?: unknown; type?: unknown; [key: string]: unknown }>;
  let filtered = await filterProjectScoped(context, allMemories);

  if (options.projectId) {
    await assertProjectResourceAccess(context, options.projectId, 'read');
    filtered = filtered.filter(
      (m) => m.projectId === options.projectId,
    );
  }

  // Only active memories
  filtered = filtered.filter((m) => m.status === 'active');

  // Sort by importance desc, then lastUsedAt desc
  filtered.sort((a, b) => {
    const imp = (Number(b.importance) || 0) - (Number(a.importance) || 0);
    if (imp !== 0) return imp;
    const aDate = String(a.lastUsedAt || '');
    const bDate = String(b.lastUsedAt || '');
    return bDate.localeCompare(aDate);
  });

  // Limit based on injection mode
  let limit = 20;
  if (options.injectionMode === 'minimal') limit = 5;
  else if (options.injectionMode === 'balanced') limit = 10;
  else if (options.injectionMode === 'full') limit = 50;

  const selected = filtered.slice(0, limit);

  // Build context string
  const lines: string[] = [];
  lines.push('# AgentFlow Memory Context');
  lines.push('');

  const categories: Record<string, Array<{ id: string; [key: string]: unknown }>> = {};
  for (const m of selected) {
    const type = String(m.type || 'other');
    if (!categories[type]) categories[type] = [];
    categories[type].push(m);
  }

  for (const [type, mems] of Object.entries(categories)) {
    lines.push(`## ${type}`);
    for (const m of mems) {
      lines.push(`- **${m.title}**: ${m.content}`);
      if (m.tags && Array.isArray(m.tags) && (m.tags as unknown[]).length > 0) {
        lines.push(`  Tags: ${(m.tags as string[]).join(', ')}`);
      }
    }
    lines.push('');
  }

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Register all handlers
// ---------------------------------------------------------------------------

export function registerIpcHandlers(): void {
  installIpcOriginGuard();
  // Auth and admin channels are explicit and never expose password hashes.

  ipcMain.handle(IPC_CHANNELS.AUTH_BOOTSTRAP, async () => {
    try {
      await bootstrapAuth();
      return { ok: true };
    } catch (err) {
      return handleError(err);
    }
  });

  ipcMain.handle(IPC_CHANNELS.AUTH_LOGIN, async (_event, request: LoginRequest) => {
    try {
      return await login(request);
    } catch (err) {
      return handleError(err);
    }
  });

  ipcMain.handle(IPC_CHANNELS.AUTH_SESSION, async (_event, sessionId?: string, sessionToken?: string) => {
    try {
      return await sessionState(sessionId, sessionToken);
    } catch (err) {
      return handleError(err);
    }
  });

  ipcMain.handle(IPC_CHANNELS.AUTH_LOGOUT, async (_event, context?: SessionContext) => {
    try {
      if (!context) return false;
      await storage.update('sessions', context.session.id, { revokedAt: new Date().toISOString(), updatedAt: new Date().toISOString() } as never);
      clearActiveRendererSession(context.session.id);
      await recordAudit({
        type: 'auth.logout',
        action: 'auth.logout',
        status: 'success',
        severity: 'info',
        actor: { userId: context.user.id, email: context.user.email, role: context.user.role, sessionId: context.session.id },
        resource: { type: 'session', id: context.session.id },
      });
      return true;
    } catch (err) {
      return handleError(err);
    }
  });

  ipcMain.handle(IPC_CHANNELS.AUTH_CHANGE_PASSWORD, async (_event, request: ChangePasswordRequest, context?: SessionContext) => {
    try {
      if (!context) throw new Error('需要先登录。');
      return await changePassword(context, request.currentPassword, request.newPassword);
    } catch (err) {
      return handleError(err);
    }
  });

  ipcMain.handle(IPC_CHANNELS.USER_LIST, async () => {
    try {
      return await listUsers();
    } catch (err) {
      return handleError(err);
    }
  });

  ipcMain.handle(IPC_CHANNELS.USER_CREATE, async (_event, request: CreateUserRequest, context?: SessionContext) => {
    try {
      if (!context) throw new Error('Authentication required.');
      return await createUser(context, request);
    } catch (err) {
      return handleError(err);
    }
  });

  ipcMain.handle(IPC_CHANNELS.USER_UPDATE, async (_event, request: UpdateUserRequest, context?: SessionContext) => {
    try {
      if (!context) throw new Error('Authentication required.');
      return await updateUser(context, request);
    } catch (err) {
      return handleError(err);
    }
  });

  ipcMain.handle(IPC_CHANNELS.USER_RESET_PASSWORD, async (_event, request: ResetPasswordRequest, context?: SessionContext) => {
    try {
      if (!context) throw new Error('Authentication required.');
      return await resetPassword(context, request);
    } catch (err) {
      return handleError(err);
    }
  });

  ipcMain.handle(IPC_CHANNELS.USER_DIRECTORY, async (_event, context?: SessionContext) => {
    try {
      if (!context) throw new Error('Authentication required.');
      return (await listUsers()).map((user) => ({
        id: user.id,
        email: user.email,
        role: user.role,
        status: user.status,
        profile: user.profile,
      }));
    } catch (err) {
      return handleError(err);
    }
  });

  ipcMain.handle(IPC_CHANNELS.AUDIT_LIST, async (_event, query?: AuditQuery) => {
    try {
      return await listAuditEvents(query ?? {});
    } catch (err) {
      return handleError(err);
    }
  });

  ipcMain.handle(IPC_CHANNELS.AUDIT_EXPORT, async () => {
    try {
      const events = await listAuditEvents({ limit: Number.MAX_SAFE_INTEGER });
      const integrity = await verifyAuditIntegrity();
      const exportedAt = new Date().toISOString();
      const manifest = buildAuditExportManifest(events, integrity, exportedAt);
      return { auditLogs: events, integrity, manifest, exportedAt };
    } catch (err) {
      return handleError(err);
    }
  });

  // ── Storage (generic) ────────────────────────────────────────────────

  ipcMain.handle(IPC_CHANNELS.STORAGE_GET, async (_event, collection: string, id: string) => {
    try {
      assertAllowedCollection(collection);
      return sanitizeForCollection(collection, await storage.getById(collection as never, id));
    } catch (err) {
      return handleError(err);
    }
  });

  ipcMain.handle(IPC_CHANNELS.STORAGE_GET_ALL, async (_event, collection: string) => {
    try {
      assertAllowedCollection(collection);
      return sanitizeForCollection(collection, await storage.getAll(collection as never));
    } catch (err) {
      return handleError(err);
    }
  });

  ipcMain.handle(IPC_CHANNELS.STORAGE_SET, async (_event, collection: string, id: string, data: unknown) => {
    try {
      assertAllowedCollection(collection);
      return await storage.update(
        collection as never,
        id,
        sanitizeStorageWriteForCollection(collection, data) as never,
      );
    } catch (err) {
      return handleError(err);
    }
  });

  ipcMain.handle(IPC_CHANNELS.STORAGE_DELETE, async (_event, collection: string, id: string) => {
    try {
      assertAllowedCollection(collection);
      return await storage.delete(collection as never, id);
    } catch (err) {
      return handleError(err);
    }
  });

  // ── Projects ─────────────────────────────────────────────────────────

  ipcMain.handle(IPC_CHANNELS.PROJECT_LIST, async (_event, context?: SessionContext) => {
    try {
      const projects = await storage.getAll<{ id: string; [key: string]: unknown }>('projects');
      if (!context || context.user.role === 'admin') return projects;
      return projects.filter((project) => canAccessProjectResource(context, project as never, 'read'));
    } catch (err) {
      return handleError(err);
    }
  });

  ipcMain.handle(IPC_CHANNELS.WORKSPACE_SUMMARY, async (_event, context?: SessionContext) => {
    try {
      const summary = await buildWorkspaceSummary(context);
      await recordMutationAudit(context, 'workspace.summary.viewed', { type: 'workspace_summary' }, {
        projects: summary.projects.total,
        modules: summary.buildPlans.moduleCount,
        averageCompletionPercent: summary.buildPlans.averageCompletionPercent,
      });
      return summary;
    } catch (err) {
      return handleError(err);
    }
  });

  ipcMain.handle(IPC_CHANNELS.PROJECT_GET, async (_event, id: string, context?: SessionContext) => {
    try {
      const project = await storage.getById<{ id: string; [key: string]: unknown }>('projects', id);
      if (project && context) assertProjectAccess(context, project as never, 'read');
      return project;
    } catch (err) {
      return handleError(err);
    }
  });

  ipcMain.handle(IPC_CHANNELS.PROJECT_CREATE, async (_event, data: unknown, context?: SessionContext) => {
    try {
      if (!context) throw new Error('Authentication required.');
      const payload = {
        ...(data && typeof data === 'object' ? data : {}),
        ownerUserId: context.user.id,
        acl: aclForOwner(context),
      };
      const created = await storage.create('projects', payload as never);
      await recordMutationAudit(context, 'workflow.create', { type: 'workflow', id: created.id, label: String((created as { name?: unknown }).name ?? '') });
      return created;
    } catch (err) {
      return handleError(err);
    }
  });

  ipcMain.handle(IPC_CHANNELS.PROJECT_UPDATE, async (_event, id: string, data: unknown, context?: SessionContext) => {
    try {
      await assertProjectResourceAccess(context, id, 'write');
      const existing = await storage.getById<{ id: string; ownerUserId?: string; acl?: unknown }>('projects', id);
      const incoming = data && typeof data === 'object' ? (data as Record<string, unknown>) : {};
      const { acl: _acl, ownerUserId: _ownerUserId, ...safeIncoming } = incoming;
      const payload = {
        ...safeIncoming,
        ownerUserId: existing?.ownerUserId,
        acl: existing?.acl,
      };
      const updated = await storage.update('projects', id, payload as never);
      await recordMutationAudit(context, 'workflow.update', { type: 'workflow', id });
      return updated;
    } catch (err) {
      return handleError(err);
    }
  });

  ipcMain.handle(IPC_CHANNELS.PROJECT_ACL_GET, async (_event, id: string, context?: SessionContext) => {
    try {
      return await getProjectAclPayload(id, context);
    } catch (err) {
      return handleError(err);
    }
  });

  ipcMain.handle(IPC_CHANNELS.PROJECT_ACL_UPDATE, async (_event, id: string, acl: unknown, context?: SessionContext) => {
    try {
      if (!context) throw new Error('Authentication required.');
      await assertProjectResourceAccess(context, id, 'admin');
      const project = await storage.getById<Project>('projects', id);
      if (!project) throw new Error('Project not found.');
      const fallback = project.acl ?? aclForOwner(context);
      const nextAcl = sanitizeProjectAcl(acl, fallback);
      const updated = await storage.update('projects', id, {
        acl: nextAcl,
        ownerUserId: nextAcl.ownerUserId,
        updatedAt: new Date().toISOString(),
      } as never);
      await recordAudit({
        type: 'workflow.acl.update',
        action: 'workflow.acl.update',
        status: 'success',
        severity: 'warning',
        actor: actorFor(context),
        resource: { type: 'workflow', id, label: project.name },
        metadata: {
          visibility: nextAcl.visibility,
          memberCount: nextAcl.entries.length,
          roles: nextAcl.entries.map((entry) => ({ userId: entry.userId, role: entry.role })),
          projectId: id,
        },
      });
      return updated;
    } catch (err) {
      return handleError(err);
    }
  });

  ipcMain.handle(IPC_CHANNELS.PROJECT_DELETE, async (_event, id: string, context?: SessionContext) => {
    try {
      await assertProjectResourceAccess(context, id, 'admin');
      const existing = await storage.getById<Project>('projects', id);
      if (!existing) return false;
      const archived = await storage.update<Project>('projects', id, {
        status: 'archived',
        archivedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      await recordMutationAudit(context, 'project.archive', { type: 'project', id, label: existing.name }, {
        previousStatus: existing.status,
      });
      return Boolean(archived);
    } catch (err) {
      return handleError(err);
    }
  });

  // ── Tasks ────────────────────────────────────────────────────────────

  ipcMain.handle(IPC_CHANNELS.TASK_LIST, async (_event, projectId: string, context?: SessionContext) => {
    try {
      await assertProjectResourceAccess(context, projectId, 'read');
      const all = await storage.getAll<{ id: string; [key: string]: unknown }>('tasks');
      return all.filter((t) => t.projectId === projectId);
    } catch (err) {
      return handleError(err);
    }
  });

  ipcMain.handle(IPC_CHANNELS.TASK_CREATE, async (_event, data: unknown, context?: SessionContext) => {
    try {
      const projectId = String((data as { projectId?: unknown })?.projectId ?? '');
      await assertProjectResourceAccess(context, projectId, 'write');
      const created = await storage.create('tasks', data as never);
      await recordMutationAudit(context, 'task.create', { type: 'task', id: created.id }, { projectId });
      return created;
    } catch (err) {
      return handleError(err);
    }
  });

  ipcMain.handle(IPC_CHANNELS.TASK_UPDATE, async (_event, id: string, data: unknown, context?: SessionContext) => {
    try {
      const existing = await assertChildResourceAccess(context, 'tasks', id, 'write');
      const updated = await storage.update('tasks', id, { ...(data as Record<string, unknown>), projectId: existing.projectId } as never);
      await recordMutationAudit(context, 'task.update', { type: 'task', id }, { projectId: existing.projectId });
      return updated;
    } catch (err) {
      return handleError(err);
    }
  });

  ipcMain.handle(IPC_CHANNELS.TASK_DELETE, async (_event, id: string, context?: SessionContext) => {
    try {
      const existing = await assertChildResourceAccess(context, 'tasks', id, 'write');
      const deleted = await storage.delete('tasks', id);
      await recordMutationAudit(context, 'task.delete', { type: 'task', id }, { projectId: existing.projectId });
      return deleted;
    } catch (err) {
      return handleError(err);
    }
  });

  // ── Prompts ──────────────────────────────────────────────────────────

  ipcMain.handle(IPC_CHANNELS.PROMPT_LIST, async (_event, projectId: string, context?: SessionContext) => {
    try {
      await assertProjectResourceAccess(context, projectId, 'read');
      const all = await storage.getAll<{ id: string; [key: string]: unknown }>('prompts');
      return all.filter((p) => p.projectId === projectId);
    } catch (err) {
      return handleError(err);
    }
  });

  ipcMain.handle(IPC_CHANNELS.PROMPT_CREATE, async (_event, data: unknown, context?: SessionContext) => {
    try {
      const projectId = String((data as { projectId?: unknown })?.projectId ?? '');
      if (projectId) await assertProjectResourceAccess(context, projectId, 'write');
      const payload = data && typeof data === 'object' ? data as Partial<SavedPrompt> : {};
      const created = await storage.create<SavedPrompt>('prompts', {
        ...payload,
        versions: [
          ...(Array.isArray(payload.versions) ? payload.versions : []),
          buildPromptVersion(payload, Array.isArray(payload.versions) ? payload.versions : [], context, 'Created prompt'),
        ],
      });
      await recordMutationAudit(context, 'prompt.create', { type: 'prompt', id: created.id }, {
        projectId,
        version: created.versions?.at(-1)?.version,
      });
      return created;
    } catch (err) {
      return handleError(err);
    }
  });

  ipcMain.handle(IPC_CHANNELS.PROMPT_UPDATE, async (_event, id: string, data: unknown, context?: SessionContext) => {
    try {
      const existing = await assertChildResourceAccess(context, 'prompts', id, 'write') as unknown as SavedPrompt;
      const payload = data && typeof data === 'object' ? data as Partial<SavedPrompt> : {};
      const versions = Array.isArray(existing.versions) ? existing.versions : [];
      const shouldVersion =
        typeof payload.content === 'string' && payload.content !== existing.content
        || JSON.stringify(payload.variables ?? existing.variables ?? {}) !== JSON.stringify(existing.variables ?? {});
      const updated = await storage.update<SavedPrompt>('prompts', id, {
        ...payload,
        projectId: existing.projectId,
        versions: shouldVersion
          ? [...versions, buildPromptVersion({ ...existing, ...payload }, versions, context, 'Updated prompt')]
          : versions,
        updatedAt: new Date().toISOString(),
      });
      await recordMutationAudit(context, 'prompt.update', { type: 'prompt', id }, {
        projectId: existing.projectId,
        version: updated?.versions?.at(-1)?.version,
        versionCreated: shouldVersion,
      });
      return updated;
    } catch (err) {
      return handleError(err);
    }
  });

  ipcMain.handle(IPC_CHANNELS.PROMPT_DELETE, async (_event, id: string, context?: SessionContext) => {
    try {
      const existing = await assertChildResourceAccess(context, 'prompts', id, 'write');
      const deleted = await storage.delete('prompts', id);
      await recordMutationAudit(context, 'prompt.delete', { type: 'prompt', id }, { projectId: existing.projectId });
      return deleted;
    } catch (err) {
      return handleError(err);
    }
  });

  // ── Runs ─────────────────────────────────────────────────────────────

  ipcMain.handle(IPC_CHANNELS.RUN_LIST, async (_event, projectId: string, context?: SessionContext) => {
    try {
      await assertProjectResourceAccess(context, projectId, 'read');
      const all = await storage.getAll<{ id: string; [key: string]: unknown }>('runs');
      return all.filter((r) => r.projectId === projectId);
    } catch (err) {
      return handleError(err);
    }
  });

  ipcMain.handle(IPC_CHANNELS.RUN_CREATE, async (_event, data: unknown, context?: SessionContext) => {
    try {
      if (!context) throw new Error('Authentication required.');
      const projectId = String((data as { projectId?: unknown })?.projectId ?? '');
      await assertProjectResourceAccess(context, projectId, 'write');
      const created = await storage.create('runs', { ...(data as Record<string, unknown>), actorUserId: context.user.id } as never);
      await storage.create('runEvents', {
        id: randomUUID(),
        runId: created.id,
        projectId,
        workflowId: projectId,
        type: 'run.created',
        status: 'success',
        actorUserId: context.user.id,
        title: String((created as { title?: unknown }).title ?? 'Run created'),
        detail: String((created as { summary?: unknown }).summary ?? ''),
        createdAt: new Date().toISOString(),
      } as never);
      await recordMutationAudit(context, 'run.create', { type: 'run', id: created.id }, { projectId, runId: created.id });
      return created;
    } catch (err) {
      return handleError(err);
    }
  });

  ipcMain.handle(IPC_CHANNELS.RUN_EVENTS_LIST, async (_event, projectId?: string, context?: SessionContext) => {
    try {
      const all = await storage.getAll<{ id: string; projectId?: string; createdAt: string; [key: string]: unknown }>('runEvents');
      const scoped = projectId ? all.filter((event) => event.projectId === projectId) : all;
      const visible = projectId
        ? (await assertProjectResourceAccess(context, projectId, 'read'), scoped)
        : await filterProjectScoped(context, scoped);
      return visible.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    } catch (err) {
      return handleError(err);
    }
  });

  ipcMain.handle(IPC_CHANNELS.WORKFLOW_TEMPLATE_LIST, async () => {
    try {
      return BEGINNER_WORKFLOW_TEMPLATES;
    } catch (err) {
      return handleError(err);
    }
  });

  ipcMain.handle(IPC_CHANNELS.WORKFLOW_LIST, async (_event, projectId: string, context?: SessionContext) => {
    try {
      await assertProjectResourceAccess(context, projectId, 'read');
      const all = await storage.getAll<Workflow>('workflows');
      return all.filter((workflow) => workflow.projectId === projectId).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    } catch (err) {
      return handleError(err);
    }
  });

  ipcMain.handle(IPC_CHANNELS.WORKFLOW_GET, async (_event, workflowId: string, context?: SessionContext) => {
    try {
      const workflow = await storage.getById<Workflow>('workflows', workflowId);
      if (!workflow) throw new Error('未找到 Workflow。');
      await assertProjectResourceAccess(context, workflow.projectId, 'read');
      return workflow;
    } catch (err) {
      return handleError(err);
    }
  });

  ipcMain.handle(IPC_CHANNELS.WORKFLOW_CREATE_FROM_TEMPLATE, async (_event, payload: unknown, context?: SessionContext) => {
    try {
      if (!context) throw new Error('Authentication required.');
      const data = payload && typeof payload === 'object' ? payload as { projectId?: unknown; templateId?: unknown; name?: unknown } : {};
      const projectId = String(data.projectId ?? '');
      await assertProjectResourceAccess(context, projectId, 'write');
      const template = BEGINNER_WORKFLOW_TEMPLATES.find((item) => item.id === String(data.templateId)) ?? BEGINNER_WORKFLOW_TEMPLATES[0];
      const now = new Date().toISOString();
      const workflow = await storage.create<Workflow>('workflows', {
        id: randomUUID(),
        projectId,
        ownerUserId: context.user.id,
        name: String(data.name ?? template.name),
        description: template.description,
        status: 'draft',
        templateId: template.id,
        version: 1,
        nodes: template.nodes,
        edges: template.edges,
        createdAt: now,
        updatedAt: now,
      });
      await storage.create<WorkflowVersion>('workflowVersions', {
        id: randomUUID(),
        workflowId: workflow.id,
        version: 1,
        message: 'Created from template',
        nodes: workflow.nodes,
        edges: workflow.edges,
        createdByUserId: context.user.id,
        createdAt: now,
      });
      await recordAudit({
        type: 'workflow.create',
        action: 'workflow.create_from_template',
        status: 'success',
        severity: 'info',
        actor: actorFor(context),
        resource: { type: 'workflow', id: workflow.id, label: workflow.name },
        metadata: { projectId, templateId: template.id },
      });
      return workflow;
    } catch (err) {
      return handleError(err);
    }
  });

  ipcMain.handle(IPC_CHANNELS.WORKFLOW_SAVE, async (_event, workflowId: string, updates: unknown, context?: SessionContext) => {
    try {
      if (!context) throw new Error('Authentication required.');
      const workflow = await storage.getById<Workflow>('workflows', workflowId);
      if (!workflow) throw new Error('Workflow not found.');
      await assertProjectResourceAccess(context, workflow.projectId, 'write');
      const patch = updates && typeof updates === 'object' ? updates as Partial<Workflow> & { versionMessage?: string } : {};
      const nextVersion = workflow.version + 1;
      const safePatch: Partial<Workflow> = {
        name: patch.name ?? workflow.name,
        description: patch.description ?? workflow.description,
        status: patch.status ?? workflow.status,
        nodes: Array.isArray(patch.nodes) ? patch.nodes : workflow.nodes,
        edges: Array.isArray(patch.edges) ? patch.edges : workflow.edges,
        version: nextVersion,
        updatedAt: new Date().toISOString(),
      };
      const saved = await storage.update<Workflow>('workflows', workflowId, safePatch);
      await storage.create<WorkflowVersion>('workflowVersions', {
        id: randomUUID(),
        workflowId,
        version: nextVersion,
        message: String(patch.versionMessage ?? 'Saved workflow changes'),
        nodes: safePatch.nodes ?? workflow.nodes,
        edges: safePatch.edges ?? workflow.edges,
        createdByUserId: context.user.id,
        createdAt: new Date().toISOString(),
      });
      await recordMutationAudit(context, 'workflow.save', { type: 'workflow', id: workflowId, label: saved?.name }, { projectId: workflow.projectId, version: nextVersion });
      return saved;
    } catch (err) {
      return handleError(err);
    }
  });

  ipcMain.handle(IPC_CHANNELS.WORKFLOW_RUN, async (_event, payload: unknown, context?: SessionContext) => {
    try {
      if (!context) throw new Error('Authentication required.');
      const data = payload && typeof payload === 'object' ? payload as { workflowId?: unknown; input?: unknown } : {};
      const workflowId = String(data.workflowId ?? '');
      const workflow = await storage.getById<Workflow>('workflows', workflowId);
      if (!workflow) throw new Error('Workflow not found.');
      await assertProjectResourceAccess(context, workflow.projectId, 'write');
      const startedAt = new Date().toISOString();
      const result = runWorkflow(workflow, String(data.input ?? ''));
      const endedAt = new Date().toISOString();
      const run = await storage.create('runs', {
        id: randomUUID(),
        projectId: workflow.projectId,
        actorUserId: context.user.id,
        workflowTemplateId: workflow.templateId,
        versionId: String(workflow.version),
        title: `Workflow: ${workflow.name}`,
        tool: 'LocalAI Nexus Workflow Runtime',
        status: result.status,
        log: result.nodeTrace.map((item) => `${item.nodeTitle} [${item.status}] ${item.outputSummary ?? item.failureReason ?? ''}`).join('\n'),
        summary: result.summary,
        startedAt,
        endedAt,
        durationMs: Math.max(1, new Date(endedAt).getTime() - new Date(startedAt).getTime()),
        error: result.error,
        nodeTrace: result.nodeTrace.map((item) => ({
          id: item.id,
          name: item.nodeTitle,
          status: item.status === 'failure' ? 'failed' : item.status === 'blocked' ? 'blocked' : item.status === 'running' ? 'running' : 'success',
          durationMs: item.durationMs,
          inputSummary: item.inputSummary,
          outputSummary: item.outputSummary,
          failureReason: item.failureReason,
          retryCount: 0,
        })),
        metadata: { workflowId, workflowVersion: workflow.version, output: result.output, nextStep: result.nextStep },
        createdAt: startedAt,
      } as Partial<Run> & { id: string });
      for (const event of result.nodeTrace) {
        await storage.create('runEvents', {
          id: randomUUID(),
          runId: run.id,
          projectId: workflow.projectId,
          workflowId,
          type: 'agent.execution',
          status: event.status === 'failure' ? 'failure' : event.status === 'blocked' ? 'denied' : event.status === 'success' ? 'success' : 'info',
          actorUserId: context.user.id,
          title: `${event.nodeTitle} (${event.nodeType})`,
          detail: event.failureReason ?? event.outputSummary ?? event.nextStep,
          metadata: event,
          createdAt: event.endedAt ?? event.startedAt,
        } as never);
      }
      await recordAudit({
        type: 'run.create',
        action: 'workflow.run',
        status: result.status === 'success' ? 'success' : result.status === 'blocked' ? 'denied' : 'failure',
        severity: result.status === 'success' ? 'info' : 'warning',
        actor: actorFor(context),
        resource: { type: 'workflow', id: workflow.id, label: workflow.name },
        metadata: { projectId: workflow.projectId, runId: run.id, status: result.status, error: result.error, nextStep: result.nextStep },
      });
      const llmNode = workflow.nodes.find((node) => node.type === 'llm');
      const execution = await storage.create('agentExecutions', {
        id: randomUUID(),
        agentId: String((workflow as { agentId?: string }).agentId ?? `workflow-${workflow.id}`),
        runId: run.id,
        workflowId: workflow.id,
        projectId: workflow.projectId,
        status: result.status === 'success' ? 'success' : result.status === 'blocked' ? 'paused' : 'failed',
        startedAt,
        finishedAt: endedAt,
        durationMs: Math.max(1, new Date(endedAt).getTime() - new Date(startedAt).getTime()),
        inputSummary: String(data.input ?? '').slice(0, 180) || `Workflow ${workflow.name}`,
        outputSummary: result.output || result.summary,
        errorSummary: result.error,
        customData: sanitizeObject({
          ownerUserId: context.user.id,
          providerRef: llmNode?.config.providerRef ?? await getSettingValue('activeProviderRef') ?? '',
          model: llmNode?.config.model ?? await getSettingValue('activeModel') ?? '',
          contextSources: ['workflow', 'project', 'shared-memory-preview'],
          toolList: workflow.nodes.filter((node) => node.type === 'tool').map((node) => node.config.toolName || node.title),
          tokenUsage: { estimated: true, total: Math.max(1, result.nodeTrace.length * 12) },
          failureReason: result.error ?? '',
          humanOwner: context.user.email,
        }) as Record<string, unknown>,
        createdAt: startedAt,
      } as never);
      await storage.create('runEvents', {
        id: randomUUID(),
        runId: run.id,
        agentId: String((execution as AgentExecutionRecord).agentId),
        executionId: String((execution as AgentExecutionRecord).id),
        projectId: workflow.projectId,
        workflowId: workflow.id,
        type: 'agent.execution',
        status: result.status === 'success' ? 'success' : result.status === 'blocked' ? 'info' : 'failure',
        actorUserId: context.user.id,
        title: `执行控制已就绪：${workflow.name}`,
        detail: '该运行可通过 LocalAI Nexus 受控执行记录执行暂停、取消或安全重试。',
        metadata: sanitizeObject({ executionId: (execution as AgentExecutionRecord).id, workflowId: workflow.id }),
        createdAt: endedAt,
      } as never).catch(() => undefined);
      return { run, result };
    } catch (err) {
      return handleError(err);
    }
  });

  ipcMain.handle(IPC_CHANNELS.WORKFLOW_RUN_CONTROL, async (_event, runId: string, action: string, context?: SessionContext) => {
    try {
      const run = await storage.getById<Run>('runs', runId);
      if (!run) throw new Error('未找到运行记录。');
      await assertProjectResourceAccess(context, run.projectId, 'write');
      const normalized = ['pause', 'cancel', 'retry', 'resume'].includes(action) ? action : 'pause';
      const status = normalized === 'cancel' ? 'cancelled' : normalized === 'pause' ? 'paused' : normalized === 'resume' ? 'running' : 'queued';
      const actionLabel: Record<string, string> = {
        pause: '暂停',
        cancel: '取消',
        retry: '安全重试',
        resume: '恢复',
      };
      const updated = await storage.update('runs', runId, {
        status,
        summary: `${run.summary} 控制操作：${actionLabel[normalized] ?? normalized}。`,
        metadata: { ...(run.metadata ?? {}), controlAction: normalized, controlledAt: new Date().toISOString(), controlledBy: context?.user.id },
      } as never);
      await storage.create('runEvents', {
        id: randomUUID(),
        runId,
        projectId: run.projectId,
        workflowId: String((run.metadata as { workflowId?: string } | undefined)?.workflowId ?? ''),
        type: 'run.updated',
        status: normalized === 'cancel' ? 'denied' : 'info',
        actorUserId: context?.user.id,
        title: `Workflow 控制：${actionLabel[normalized] ?? normalized}`,
        detail: normalized === 'retry' ? '已请求对上一个失败节点或 dry-run 记录进行安全重试。' : `Workflow 运行已标记为 ${status}。`,
        metadata: { action: normalized, status },
        createdAt: new Date().toISOString(),
      } as never);
      await recordMutationAudit(context, 'workflow.run.control', { type: 'run', id: runId }, { action: normalized, status });
      return updated;
    } catch (err) {
      return handleError(err);
    }
  });

  ipcMain.handle(IPC_CHANNELS.WORKFLOW_VERSION_LIST, async (_event, workflowId: string, context?: SessionContext) => {
    try {
      const workflow = await storage.getById<Workflow>('workflows', workflowId);
      if (!workflow) throw new Error('Workflow not found.');
      await assertProjectResourceAccess(context, workflow.projectId, 'read');
      const versions = await storage.getAll<WorkflowVersion>('workflowVersions');
      return versions.filter((version) => version.workflowId === workflowId).sort((a, b) => b.version - a.version);
    } catch (err) {
      return handleError(err);
    }
  });

  ipcMain.handle(IPC_CHANNELS.MCP_ALLOWLIST_LIST, async () => {
    try {
      return await storage.getAll('mcpAllowlist');
    } catch (err) {
      return handleError(err);
    }
  });

  ipcMain.handle(IPC_CHANNELS.MCP_ALLOWLIST_CHECK, async (_event, request: unknown, context?: SessionContext) => {
    try {
      const entries = await storage.getAll<McpAllowlistEntry>('mcpAllowlist');
      const decision = evaluateMcpGatewayRequest(request as McpGatewayRequest, entries);
      const { serverName, toolName, allowed } = decision;
      await recordAudit({
        type: allowed ? 'mcp.allowed' : 'mcp.denied',
        action: 'mcp.allowlist.check',
        status: allowed ? 'success' : 'denied',
        severity: allowed ? 'info' : 'warning',
        actor: actorFor(context),
        resource: { type: 'mcp_tool', id: `${serverName}:${toolName}`, label: toolName },
        metadata: { serverName, toolName },
      });
      return { allowed, decision };
    } catch (err) {
      return handleError(err);
    }
  });

  ipcMain.handle(IPC_CHANNELS.MCP_GATEWAY_EVALUATE, async (_event, request: McpGatewayRequest, context?: SessionContext) => {
    try {
      if (request.projectId) await assertProjectResourceAccess(context, request.projectId, 'write');
      const entries = await storage.getAll<McpAllowlistEntry>('mcpAllowlist');
      const decision = evaluateMcpGatewayRequest(request, entries);
      await recordAudit({
        type: decision.allowed ? 'mcp.allowed' : 'mcp.denied',
        action: 'mcp.gateway.evaluate',
        status: decision.allowed ? 'success' : 'denied',
        severity: decision.allowed ? 'info' : 'warning',
        actor: actorFor(context),
        resource: { type: 'mcp_tool', id: `${decision.serverName}:${decision.toolName}`, label: decision.toolName },
        metadata: { ...decision, projectId: request.projectId, runId: request.runId },
      });
      await storage.create('runEvents', {
        id: randomUUID(),
        projectId: request.projectId ?? '',
        runId: request.runId ?? '',
        type: decision.allowed ? 'mcp.allowed' : 'mcp.denied',
        status: decision.allowed ? 'success' : 'denied',
        actorUserId: context?.user.id,
        title: `MCP ${decision.serverName}:${decision.toolName}`,
        detail: decision.reason,
        metadata: decision,
        createdAt: decision.checkedAt,
      } as never).catch(() => undefined);
      return decision;
    } catch (err) {
      return handleError(err);
    }
  });

  ipcMain.handle(IPC_CHANNELS.MCP_ALLOWLIST_UPSERT, async (_event, entry: unknown, context?: SessionContext) => {
    try {
      const now = new Date().toISOString();
      const payload = {
        ...(entry as Record<string, unknown>),
        id: String((entry as { id?: unknown })?.id ?? `${(entry as { serverName?: unknown })?.serverName}:${(entry as { toolName?: unknown })?.toolName}`),
        enabled: Boolean((entry as { enabled?: unknown })?.enabled ?? true),
        updatedAt: now,
        createdAt: String((entry as { createdAt?: unknown })?.createdAt ?? now),
      };
      const existing = await storage.getById('mcpAllowlist', String(payload.id));
      const saved = existing
        ? await storage.update('mcpAllowlist', String(payload.id), payload as never)
        : await storage.create('mcpAllowlist', payload as never);
      await recordMutationAudit(context, 'mcp.allowlist.upsert', { type: 'mcp_tool', id: String(payload.id) });
      return saved;
    } catch (err) {
      return handleError(err);
    }
  });

  // ── Git ──────────────────────────────────────────────────────────────

  ipcMain.handle(IPC_CHANNELS.GIT_LOG, async (_event, repoPath?: string) => {
    try {
      const cwd = sanitizeFilePath(repoPath ?? process.cwd());
      return await getGitLog(cwd);
    } catch (err) {
      return handleError(err);
    }
  });

  ipcMain.handle(IPC_CHANNELS.GIT_STATUS, async (_event, repoPath?: string) => {
    try {
      const cwd = sanitizeFilePath(repoPath ?? process.cwd());
      return await getGitStatus(cwd);
    } catch (err) {
      return handleError(err);
    }
  });

  ipcMain.handle(IPC_CHANNELS.GIT_SUMMARY, async (_event, repoPath?: string) => {
    try {
      const cwd = sanitizeFilePath(repoPath ?? process.cwd());
      return await getGitSummary(cwd);
    } catch (err) {
      return handleError(err);
    }
  });

  ipcMain.handle(IPC_CHANNELS.RELEASE_STATUS, async (_event, repoPath?: string) => {
    try {
      return await buildReleaseStatus(repoPath);
    } catch (err) {
      return handleError(err);
    }
  });

  // ── Memory ───────────────────────────────────────────────────────────

  ipcMain.handle(IPC_CHANNELS.MEMORY_LIST, async (_event, filters?: { id: string; [key: string]: unknown }, context?: SessionContext) => {
    try {
      const raw = await storage.getAll<{ id: string; projectId?: string; [key: string]: unknown }>('memories');
      const scoped = await filterProjectScoped(context, raw);
      const all = sanitizeObject(scoped) as Array<{ id: string; [key: string]: unknown }>;
      if (!filters) return all;
      return all.filter((m) => {
        for (const [key, value] of Object.entries(filters)) {
          if (m[key] !== value) return false;
        }
        return true;
      });
    } catch (err) {
      return handleError(err);
    }
  });

  ipcMain.handle(IPC_CHANNELS.MEMORY_GET, async (_event, id: string, context?: SessionContext) => {
    try {
      const memory = await storage.getById<{ id: string; projectId?: string; [key: string]: unknown }>('memories', id);
      if (memory?.projectId) await assertProjectResourceAccess(context, memory.projectId, 'read');
      return sanitizeObject(memory);
    } catch (err) {
      return handleError(err);
    }
  });

  ipcMain.handle(IPC_CHANNELS.MEMORY_CREATE, async (_event, data: unknown, context?: SessionContext) => {
    try {
      const projectId = String((data as { projectId?: unknown })?.projectId ?? '');
      if (projectId) await assertProjectResourceAccess(context, projectId, 'write');
      const created = await storage.create('memories', sanitizeObject(data) as never);
      await recordMutationAudit(context, 'memory.create', { type: 'memory', id: created.id }, { projectId });
      return created;
    } catch (err) {
      return handleError(err);
    }
  });

  ipcMain.handle(IPC_CHANNELS.MEMORY_UPDATE, async (_event, id: string, data: unknown, context?: SessionContext) => {
    try {
      const existing = await assertChildResourceAccess(context, 'memories', id, 'write');
      const updated = await storage.update('memories', id, sanitizeObject({ ...(data as Record<string, unknown>), projectId: existing.projectId }) as never);
      await recordMutationAudit(context, 'memory.update', { type: 'memory', id }, { projectId: existing.projectId });
      return updated;
    } catch (err) {
      return handleError(err);
    }
  });

  ipcMain.handle(IPC_CHANNELS.MEMORY_DELETE, async (_event, id: string, context?: SessionContext) => {
    try {
      const existing = await assertChildResourceAccess(context, 'memories', id, 'write');
      const deleted = await storage.delete('memories', id);
      await recordMutationAudit(context, 'memory.delete', { type: 'memory', id }, { projectId: existing.projectId });
      return deleted;
    } catch (err) {
      return handleError(err);
    }
  });

  ipcMain.handle(IPC_CHANNELS.MEMORY_EXPORT, async (_event, context?: SessionContext) => {
    try {
      const raw = await storage.getAll<{ id: string; projectId?: string; [key: string]: unknown }>('memories');
      const all = sanitizeObject(await filterProjectScoped(context, raw));
      await recordMutationAudit(context, 'memory.export', { type: 'memory' });
      return { memories: all, exportedAt: new Date().toISOString() };
    } catch (err) {
      return handleError(err);
    }
  });

  ipcMain.handle(IPC_CHANNELS.MEMORY_IMPORT, async (_event, data: unknown, context?: SessionContext) => {
    try {
      const payload = sanitizeObject(data) as { memories?: Array<{ id: string; [key: string]: unknown }> };
      if (!payload || !Array.isArray(payload.memories)) {
        return { error: 'Invalid import data: expected { memories: [...] }' };
      }
      const existing = await storage.getAll<{ id: string; [key: string]: unknown }>('memories');
      const existingIds = new Set(existing.map((m) => m.id));
      let imported = 0;
      for (const mem of payload.memories) {
        const projectId = String(mem.projectId ?? '');
        if (projectId) await assertProjectResourceAccess(context, projectId, 'write');
        if (existingIds.has(String(mem.id))) {
          await storage.update('memories', String(mem.id), sanitizeObject(mem) as never);
        } else {
          await storage.create('memories', sanitizeObject(mem) as never);
        }
        imported++;
      }
      await recordMutationAudit(context, 'memory.import', { type: 'memory' }, { imported });
      return { imported };
    } catch (err) {
      return handleError(err);
    }
  });

  ipcMain.handle(
    IPC_CHANNELS.MEMORY_GENERATE_CONTEXT,
    async (
      _event,
      options?: { projectId?: string; injectionMode?: string },
      context?: SessionContext,
    ) => {
      try {
        return await generateMemoryContext(options ?? {}, context);
      } catch (err) {
        return handleError(err);
      }
    },
  );

  // ── Settings ─────────────────────────────────────────────────────────

  ipcMain.handle(IPC_CHANNELS.SETTINGS_GET, async (_event, key: string) => {
    try {
      if (key === 'auth.activeSessionSecret') return null;
      const all = await storage.getAll<{ id: string; [key: string]: unknown }>('settings');
      const entry = all.find((s) => s.id === key);
      return entry ?? null;
    } catch (err) {
      return handleError(err);
    }
  });

  ipcMain.handle(IPC_CHANNELS.SETTINGS_SET, async (_event, key: string, value: unknown) => {
    try {
      return await setSettingValue(key, value);
    } catch (err) {
      return handleError(err);
    }
  });

  ipcMain.handle(IPC_CHANNELS.SETTINGS_GET_ALL, async () => {
    try {
      const all = (await storage.getAll<{ id: string; [key: string]: unknown }>('settings')).filter(
        (setting) => setting.id !== 'auth.activeSessionSecret',
      );
      const result: Record<string, unknown> = {};
      for (const s of all) {
        result[String(s.id)] = s.value;
      }
      return result;
    } catch (err) {
      return handleError(err);
    }
  });

  // ── Providers ────────────────────────────────────────────────────────

  ipcMain.handle(IPC_CHANNELS.PROVIDER_LIST, async () => {
    try {
      return await listProvidersForRenderer();
    } catch (err) {
      return handleError(err);
    }
  });

  ipcMain.handle(IPC_CHANNELS.PROVIDER_PRESETS, async () => {
    try {
      return PROVIDER_PRESETS;
    } catch (err) {
      return handleError(err);
    }
  });

  ipcMain.handle(IPC_CHANNELS.PROVIDER_CREATE, async (_event, data: unknown, context?: SessionContext) => {
    try {
      const provider = await storage.create(
        'providerSettings',
        sanitizeProviderForStorage(data) as never,
      );
      await recordAudit({
        type: 'provider.secret_stored',
        action: 'provider.secret.store',
        status: 'success',
        severity: 'info',
        actor: actorFor(context),
        resource: { type: 'provider', id: provider.id, label: String((provider as ProviderRecord).providerName ?? '') },
      });
      return maskProviderForRenderer(provider as ProviderRecord);
    } catch (err) {
      return handleError(err);
    }
  });

  ipcMain.handle(IPC_CHANNELS.PROVIDER_UPDATE, async (_event, id: string, data: unknown, context?: SessionContext) => {
    try {
      const payload = await mergeProviderUpdate(id, data);
      const provider = await storage.update('providerSettings', id, payload as never);
      if ((data as { apiKey?: unknown })?.apiKey && !isMaskedApiKey((data as { apiKey?: unknown }).apiKey)) {
        await recordAudit({
          type: 'provider.secret_stored',
          action: 'provider.secret.update',
          status: 'success',
          severity: 'info',
          actor: actorFor(context),
          resource: { type: 'provider', id, label: String((provider as ProviderRecord)?.providerName ?? '') },
        });
      }
      return maskProviderForRenderer(provider as ProviderRecord);
    } catch (err) {
      return handleError(err);
    }
  });

  ipcMain.handle(IPC_CHANNELS.PROVIDER_DELETE, async (_event, id: string) => {
    try {
      return await storage.delete('providerSettings', id);
    } catch (err) {
      return handleError(err);
    }
  });

  ipcMain.handle(IPC_CHANNELS.PROVIDER_TEST, async (_event, providerId: string, context?: SessionContext) => {
    try {
      return await testProviderConnectionV2(providerId, context);
    } catch (err) {
      return handleError(err);
    }
  });

  ipcMain.handle(IPC_CHANNELS.PROVIDER_ACTIVE_GET, async () => {
    try {
      return {
        providerRef: await getSettingValue('activeProviderRef') ?? '',
        model: await getSettingValue('activeModel') ?? '',
        agentDefaultProviderRef: await getSettingValue('agentDefaultProviderRef') ?? '',
      };
    } catch (err) {
      return handleError(err);
    }
  });

  ipcMain.handle(IPC_CHANNELS.PROVIDER_ACTIVE_SET, async (_event, config: unknown, context?: SessionContext) => {
    try {
      const payload = config && typeof config === 'object' ? config as { providerRef?: unknown; model?: unknown; scope?: unknown; projectId?: unknown; agentId?: unknown } : {};
      const providerRef = String(payload.providerRef ?? '').trim();
      const model = String(payload.model ?? '').trim();
      if (!providerRef || !model) throw new Error('Provider and model are required.');
      const provider = await storage.getById<ProviderRecord>('providerSettings', providerRef);
      if (!provider) throw new Error('Provider not found.');
      if (!providerHasSecret(provider)) throw new Error('provider_secret_missing');
      const scope = payload.scope === 'project' || payload.scope === 'agent' ? payload.scope : 'workspace';
      if (scope === 'project') {
        const projectId = String(payload.projectId ?? '');
        await assertProjectResourceAccess(context, projectId, 'write');
        await storage.update('projects', projectId, { defaultProviderRef: providerRef, defaultModel: model } as never);
      } else if (scope === 'agent') {
        const agentId = String(payload.agentId ?? '');
        await assertAgentAccess(context, agentId, 'write');
        await storage.update('agents', agentId, { providerRef, model, updatedAt: new Date().toISOString() } as never);
      } else {
        await setSettingValue('activeProviderRef', providerRef);
        await setSettingValue('activeModel', model);
        await setSettingValue('agentDefaultProviderRef', providerRef);
      }
      await recordAudit({
        type: 'provider.active_switch',
        action: 'provider.active.set',
        status: 'success',
        severity: 'info',
        actor: actorFor(context),
        resource: { type: 'provider', id: providerRef, label: String(provider.providerName ?? '') },
        metadata: sanitizeObject({ scope, model, projectId: payload.projectId, agentId: payload.agentId }),
      });
      await storage.create('runEvents', {
        id: randomUUID(),
        type: 'provider.switch',
        status: 'success',
        actorUserId: context?.user.id,
        projectId: scope === 'project' ? String(payload.projectId ?? '') : '',
        agentId: scope === 'agent' ? String(payload.agentId ?? '') : '',
        title: 'Provider / Model switched',
        detail: `${provider.providerName ?? providerRef} -> ${model}`,
        metadata: sanitizeObject({ providerRef, model, scope }),
        createdAt: new Date().toISOString(),
      } as never);
      return { providerRef, model, scope };
    } catch (err) {
      return handleError(err);
    }
  });

  ipcMain.handle(IPC_CHANNELS.GATEWAY_STATUS, async () => {
    try {
      return await getGatewayStatus();
    } catch (err) {
      return handleError(err);
    }
  });

  ipcMain.handle(IPC_CHANNELS.GATEWAY_START, async () => {
    try {
      return await startGateway();
    } catch (err) {
      return handleError(err);
    }
  });

  ipcMain.handle(IPC_CHANNELS.GATEWAY_STOP, async () => {
    try {
      return await stopGateway();
    } catch (err) {
      return handleError(err);
    }
  });

  ipcMain.handle(IPC_CHANNELS.GATEWAY_RESTART, async (_event, context?: SessionContext) => {
    try {
      const status = await restartGateway();
      await recordMutationAudit(context, 'gateway.restarted', { type: 'gateway', label: status.baseUrl }, {
        online: status.online,
        port: status.port,
      });
      return status;
    } catch (err) {
      return handleError(err);
    }
  });

  ipcMain.handle(IPC_CHANNELS.GATEWAY_KEY_LIST, async () => {
    try {
      return await listGatewayApiKeys();
    } catch (err) {
      return handleError(err);
    }
  });

  ipcMain.handle(IPC_CHANNELS.GATEWAY_KEY_CREATE, async (_event, input: NexusGatewayApiKeyCreateRequest, context?: SessionContext) => {
    try {
      const result = await createGatewayApiKey(sanitizeObject(input) as NexusGatewayApiKeyCreateRequest, context?.user.id);
      await recordMutationAudit(context, 'gateway.key.created', { type: 'gateway_key', id: result.key.id, label: result.key.name }, {
        scopes: result.key.scopes,
        endpoints: result.key.endpointWhitelist,
        models: result.key.modelWhitelist,
        maskedKey: result.key.maskedKey,
      });
      return result;
    } catch (err) {
      return handleError(err);
    }
  });

  ipcMain.handle(IPC_CHANNELS.GATEWAY_KEY_DISABLE, async (_event, id: string, context?: SessionContext) => {
    try {
      const key = await updateGatewayApiKeyStatus(id, 'disabled');
      await recordMutationAudit(context, 'gateway.key.disabled', { type: 'gateway_key', id, label: key.name }, { maskedKey: key.maskedKey });
      return key;
    } catch (err) {
      return handleError(err);
    }
  });

  ipcMain.handle(IPC_CHANNELS.GATEWAY_KEY_DELETE, async (_event, id: string, context?: SessionContext) => {
    try {
      const key = await updateGatewayApiKeyStatus(id, 'deleted');
      await recordMutationAudit(context, 'gateway.key.deleted', { type: 'gateway_key', id, label: key.name }, { maskedKey: key.maskedKey });
      return key;
    } catch (err) {
      return handleError(err);
    }
  });

  ipcMain.handle(IPC_CHANNELS.GATEWAY_KEY_RESET, async (_event, id: string, context?: SessionContext) => {
    try {
      const result = await resetGatewayApiKey(id);
      await recordMutationAudit(context, 'gateway.key.reset', { type: 'gateway_key', id, label: result.key.name }, { maskedKey: result.key.maskedKey });
      return result;
    } catch (err) {
      return handleError(err);
    }
  });

  ipcMain.handle(IPC_CHANNELS.GATEWAY_EXPORT_ENV, async (_event, rawKeyOrMaskedKey?: string) => {
    try {
      const status = await getGatewayStatus();
      return buildGatewayEnvExport({
        baseUrl: status.baseUrl,
        rawKey: rawKeyOrMaskedKey?.startsWith('lnx_') ? rawKeyOrMaskedKey : undefined,
        maskedKey: rawKeyOrMaskedKey?.startsWith('lnx_') ? undefined : rawKeyOrMaskedKey,
        model: status.activeModel,
      });
    } catch (err) {
      return handleError(err);
    }
  });

  ipcMain.handle(IPC_CHANNELS.GATEWAY_EXPORT_CODEX, async (_event, rawKeyOrMaskedKey?: string) => {
    try {
      const status = await getGatewayStatus();
      return buildGatewayEnvExport({
        baseUrl: status.baseUrl,
        rawKey: rawKeyOrMaskedKey?.startsWith('lnx_') ? rawKeyOrMaskedKey : undefined,
        maskedKey: rawKeyOrMaskedKey?.startsWith('lnx_') ? undefined : rawKeyOrMaskedKey,
        model: status.activeModel,
      }).codex;
    } catch (err) {
      return handleError(err);
    }
  });

  ipcMain.handle(IPC_CHANNELS.GATEWAY_EXPORT_CLAUDE, async (_event, rawKeyOrMaskedKey?: string) => {
    try {
      const status = await getGatewayStatus();
      return buildGatewayEnvExport({
        baseUrl: status.baseUrl,
        rawKey: rawKeyOrMaskedKey?.startsWith('lnx_') ? rawKeyOrMaskedKey : undefined,
        maskedKey: rawKeyOrMaskedKey?.startsWith('lnx_') ? undefined : rawKeyOrMaskedKey,
        model: status.activeModel,
      }).claudeCode;
    } catch (err) {
      return handleError(err);
    }
  });

  ipcMain.handle(IPC_CHANNELS.GATEWAY_IMPORT_PREVIEW, async (_event, raw: string) => {
    try {
      return previewGatewayConfigImport(String(raw ?? ''));
    } catch (err) {
      return handleError(err);
    }
  });

  ipcMain.handle(IPC_CHANNELS.GATEWAY_IMPORT_APPLY, async (_event, raw: string, context?: SessionContext) => {
    try {
      return await createGatewayConfigImportRecord(String(raw ?? ''), context);
    } catch (err) {
      return handleError(err);
    }
  });

  ipcMain.handle(IPC_CHANNELS.USAGE_SUMMARY, async () => {
    try {
      return await summarizeUsage();
    } catch (err) {
      return handleError(err);
    }
  });

  ipcMain.handle(IPC_CHANNELS.USAGE_LIST, async (_event, filters?: unknown) => {
    try {
      return await listUsageRecords(filters as never);
    } catch (err) {
      return handleError(err);
    }
  });

  ipcMain.handle(IPC_CHANNELS.TOKEN_POLICY_LIST, async () => {
    try {
      return await listTokenPolicies();
    } catch (err) {
      return handleError(err);
    }
  });

  ipcMain.handle(IPC_CHANNELS.TOKEN_POLICY_UPSERT, async (_event, input: Partial<NexusTokenPolicy>, context?: SessionContext) => {
    try {
      const saved = await upsertTokenPolicy(sanitizeObject(input) as Partial<NexusTokenPolicy>);
      await recordMutationAudit(context, 'tokenPolicy.upsert', { type: 'token_policy', id: saved.id }, {
        providerId: saved.providerId,
        model: saved.model,
        dailyQuota: saved.dailyQuota,
        monthlyQuota: saved.monthlyQuota,
        concurrencyLimit: saved.concurrencyLimit,
        cooldownMinutes: saved.cooldownMinutes,
      });
      return saved;
    } catch (err) {
      return handleError(err);
    }
  });

  ipcMain.handle(IPC_CHANNELS.TOKEN_POLICY_EVALUATE, async (_event, providerId: string, model?: string) => {
    try {
      const provider = await storage.getById<ProviderSetting>('providerSettings', providerId);
      if (!provider) throw new Error('Provider not found.');
      return await evaluateTokenPolicy(provider, model || provider.modelName);
    } catch (err) {
      return handleError(err);
    }
  });

  ipcMain.handle(IPC_CHANNELS.HEALTH_SUMMARY, async () => {
    try {
      return await healthSummary();
    } catch (err) {
      return handleError(err);
    }
  });

  ipcMain.handle(IPC_CHANNELS.HEALTH_CHECK_PROVIDER, async (_event, providerId: string, context?: SessionContext) => {
    try {
      const result = await checkProviderHealth(providerId);
      await recordAudit({
        type: 'health.check',
        action: 'health.provider.check',
        status: result.status === 'Healthy' ? 'success' : 'failure',
        severity: result.status === 'Healthy' ? 'info' : 'warning',
        actor: actorFor(context),
        resource: { type: 'provider', id: providerId, label: result.providerName },
        metadata: sanitizeObject({ status: result.status, failureCategory: result.failureCategory }),
      });
      return result;
    } catch (err) {
      return handleError(err);
    }
  });

  ipcMain.handle(IPC_CHANNELS.RUNTIME_PROFILES_GENERATE, async () => {
    try {
      return await generateRuntimeProfiles();
    } catch (err) {
      return handleError(err);
    }
  });

  ipcMain.handle(IPC_CHANNELS.ROUTER_DECISIONS_LIST, async () => {
    try {
      const decisions = await storage.getAll<NexusRouterDecision>('modelRoutes');
      return decisions.sort((a, b) => b.checkedAt.localeCompare(a.checkedAt)).slice(0, 100);
    } catch (err) {
      return handleError(err);
    }
  });

  ipcMain.handle(IPC_CHANNELS.SECURITY_REPORT_GENERATE, async (_event, scope?: string, context?: SessionContext) => {
    try {
      const report = await generateSecurityReport(String(scope || 'workspace'));
      await recordMutationAudit(context, 'security.report.generate', { type: 'security_report', id: report.id }, { scope: report.scope });
      return report;
    } catch (err) {
      return handleError(err);
    }
  });

  ipcMain.handle(IPC_CHANNELS.OBSERVABILITY_REPORT_GENERATE, async (_event, options?: { includeMockEvaluation?: boolean; evaluationOutput?: string }, context?: SessionContext) => {
    try {
      const report = await generateObservabilityReport(options);
      await recordMutationAudit(context, 'observability.report.generate', { type: 'observability_report', id: report.id }, {
        traceCount: report.traces.length,
        slowRequestCount: report.slowRequests.length,
        hasEvaluation: Boolean(report.evaluation),
      });
      return report;
    } catch (err) {
      return handleError(err);
    }
  });

  ipcMain.handle(IPC_CHANNELS.EVAL_MOCK_RUN, async (_event, input?: { name?: string; target?: 'prompt' | 'model'; promptId?: string; providerId?: string; model?: string; output?: string }, context?: SessionContext) => {
    try {
      const evaluation = await runMockEvaluation(sanitizeObject(input ?? {}) as never);
      await recordMutationAudit(context, 'eval.mock.completed', { type: 'evaluation_run', id: evaluation.id, label: evaluation.name }, {
        score: evaluation.score,
        status: evaluation.status,
      });
      return evaluation;
    } catch (err) {
      return handleError(err);
    }
  });

  ipcMain.handle(IPC_CHANNELS.KNOWLEDGE_ASSETS_SUMMARY, async (_event, context?: SessionContext) => {
    try {
      const summary = await summarizeKnowledgeAssets();
      await recordMutationAudit(context, 'knowledge.assets.summary', { type: 'knowledge_assets', id: summary.id }, {
        documentCount: summary.documentCount,
        chunkCount: summary.chunkCount,
        promptCount: summary.promptCount,
        memoryCount: summary.memoryCount,
      });
      return summary;
    } catch (err) {
      return handleError(err);
    }
  });

  ipcMain.handle(IPC_CHANNELS.KNOWLEDGE_DOCUMENT_PREVIEW, async (_event, input: { title?: string; content: string }, context?: SessionContext) => {
    try {
      const preview = await saveKnowledgeDocumentPreview(input);
      await recordMutationAudit(context, 'knowledge.document.previewed', { type: 'knowledge_document', id: preview.id, label: preview.title }, {
        chunkCount: preview.chunkCount,
        redaction: preview.redaction,
      });
      return preview;
    } catch (err) {
      return handleError(err);
    }
  });

  ipcMain.handle(IPC_CHANNELS.KNOWLEDGE_RETRIEVAL_TEST, async (_event, input: { query: string; content?: string; topK?: number }, context?: SessionContext) => {
    try {
      const result = await testKnowledgeRetrieval(input);
      await recordMutationAudit(context, 'knowledge.retrieval.tested', { type: 'knowledge_retrieval', label: result.query }, {
        matchCount: result.matches.length,
        latencyMs: result.latencyMs,
      });
      return result;
    } catch (err) {
      return handleError(err);
    }
  });

  ipcMain.handle(IPC_CHANNELS.OPS_BACKUP_PREVIEW, async (_event, context?: SessionContext) => {
    try {
      const manifest = await previewBackup();
      await recordMutationAudit(context, 'ops.backup.previewed', { type: 'backup_manifest', id: manifest.id }, {
        collectionCount: manifest.collections.length,
        mode: manifest.mode,
      });
      return manifest;
    } catch (err) {
      return handleError(err);
    }
  });

  ipcMain.handle(IPC_CHANNELS.OPS_BACKUP_CREATE, async (_event, context?: SessionContext) => {
    try {
      const manifest = await createBackupManifest();
      await recordMutationAudit(context, 'ops.backup.created', { type: 'backup_manifest', id: manifest.id }, {
        collectionCount: manifest.collections.length,
        checksum: manifest.checksum,
      });
      return manifest;
    } catch (err) {
      return handleError(err);
    }
  });

  ipcMain.handle(IPC_CHANNELS.OPS_RESTORE_PREVIEW, async (_event, raw: string, context?: SessionContext) => {
    try {
      const preview = await previewRestore(String(raw ?? ''));
      await recordMutationAudit(context, 'ops.restore.previewed', { type: 'restore_preview' }, {
        ok: preview.ok,
        changeCount: preview.changes.length,
        warningCount: preview.warnings.length,
        errorCount: preview.errors.length,
      });
      return preview;
    } catch (err) {
      return handleError(err);
    }
  });

  ipcMain.handle(IPC_CHANNELS.OPS_RESTORE_APPLY, async (_event, input: { raw?: string; confirmToken?: string }, context?: SessionContext) => {
    try {
      const result = await applyRestore({
        raw: String(input?.raw ?? ''),
        confirmToken: String(input?.confirmToken ?? ''),
      });
      await recordMutationAudit(context, result.ok ? 'ops.restore.applied' : 'ops.restore.rejected', { type: 'restore_apply', id: result.manifestId }, {
        ok: result.ok,
        checksum: result.checksum,
        inserted: result.collections.reduce((total, item) => total + item.inserted, 0),
        skipped: result.collections.reduce((total, item) => total + item.skipped, 0),
        redaction: result.auditRedaction,
      });
      return result;
    } catch (err) {
      return handleError(err);
    }
  });

  ipcMain.handle(IPC_CHANNELS.CONTEXT_PACK_PREVIEW, async (_event, options?: { projectId?: string }) => {
    try {
      return await previewContextPack(options?.projectId);
    } catch (err) {
      return handleError(err);
    }
  });

  ipcMain.handle(IPC_CHANNELS.CONTEXT_RECOVERY_PACK, async (_event, options?: { projectId?: string }, context?: SessionContext) => {
    try {
      const pack = await buildRecoveryPack(options?.projectId);
      await recordMutationAudit(context, 'contextPack.recoveryPack', { type: 'recovery_pack', id: pack.id }, {
        projectId: pack.projectId,
        memoryCount: pack.memoryIds.length,
        providerTraceCount: pack.providerTraceIds.length,
        workflowRunCount: pack.workflowRunIds.length,
      });
      return pack;
    } catch (err) {
      return handleError(err);
    }
  });

  ipcMain.handle(IPC_CHANNELS.TEMPLATE_BUNDLES_LIST, async () => {
    try {
      return await listTemplateBundles();
    } catch (err) {
      return handleError(err);
    }
  });

  ipcMain.handle(IPC_CHANNELS.TEMPLATE_BUNDLES_UPSERT, async (_event, bundle: Partial<NexusTemplateBundle>, context?: SessionContext) => {
    try {
      const saved = await upsertTemplateBundle(sanitizeObject(bundle) as Partial<NexusTemplateBundle>);
      await recordMutationAudit(context, 'templateBundle.upsert', { type: 'template_bundle', id: saved.id, label: saved.name }, { riskLevel: saved.riskLevel });
      return saved;
    } catch (err) {
      return handleError(err);
    }
  });

  ipcMain.handle(IPC_CHANNELS.TEMPLATE_BUNDLES_TOGGLE, async (_event, id: string, enabled: boolean, context?: SessionContext) => {
    try {
      const saved = await toggleTemplateBundle(id, enabled);
      await recordMutationAudit(context, 'templateBundle.toggle', { type: 'template_bundle', id: saved.id, label: saved.name }, { enabled });
      return saved;
    } catch (err) {
      return handleError(err);
    }
  });

  ipcMain.handle(IPC_CHANNELS.AGENT_LIST, async (_event, filters?: { projectId?: string }, context?: SessionContext) => {
    try {
      const agents = (await storage.getAll<AgentRecord>('agents')).filter((agent) => !agent.deletedAt);
      const scoped = filters?.projectId ? agents.filter((agent) => agent.projectId === filters.projectId) : agents;
      return await filterAgentsForContext(context, scoped);
    } catch (err) {
      return handleError(err);
    }
  });

  ipcMain.handle(IPC_CHANNELS.AGENT_GET, async (_event, id: string, context?: SessionContext) => {
    try {
      return await assertAgentAccess(context, id, 'read');
    } catch (err) {
      return handleError(err);
    }
  });

  ipcMain.handle(IPC_CHANNELS.AGENT_CREATE, async (_event, data: unknown, context?: SessionContext) => {
    try {
      if (!context) throw new Error('Authentication required.');
      const now = new Date().toISOString();
      const payload = data && typeof data === 'object' ? data as Partial<AgentRecord> : {};
      if (payload.projectId) await assertProjectResourceAccess(context, payload.projectId, 'write');
      const created = await storage.create('agents', {
        id: payload.id ?? randomUUID(),
        name: payload.name ?? 'New Agent',
        description: payload.description ?? '',
        type: payload.type ?? 'custom',
        status: payload.status ?? 'enabled',
        ownerUserId: context.user.id,
        projectId: payload.projectId ?? '',
        workflowId: payload.workflowId ?? '',
        providerRef: payload.providerRef ?? await getSettingValue('agentDefaultProviderRef') ?? '',
        model: payload.model ?? await getSettingValue('activeModel') ?? '',
        systemPrompt: payload.systemPrompt ?? '',
        toolsAllowlistRef: payload.toolsAllowlistRef ?? '',
        skillsRefs: Array.isArray(payload.skillsRefs) ? payload.skillsRefs : [],
        createdAt: now,
        updatedAt: now,
        lastHealthStatus: payload.lastHealthStatus ?? 'unknown',
      } as never);
      await recordMutationAudit(context, 'agent.create', { type: 'agent', id: created.id, label: String((created as AgentRecord).name) });
      if ((created as AgentRecord).type === 'demo') {
        await createDemoExecutionForAgent(created as AgentRecord, context);
      }
      return created;
    } catch (err) {
      return handleError(err);
    }
  });

  ipcMain.handle(IPC_CHANNELS.AGENT_UPDATE, async (_event, id: string, data: unknown, context?: SessionContext) => {
    try {
      await assertAgentAccess(context, id, 'write');
      const incoming = data && typeof data === 'object' ? data as Record<string, unknown> : {};
      const { ownerUserId: _owner, deletedAt: _deletedAt, ...safeIncoming } = incoming;
      const updated = await storage.update('agents', id, { ...safeIncoming, updatedAt: new Date().toISOString() } as never);
      await recordMutationAudit(context, 'agent.update', { type: 'agent', id });
      return updated;
    } catch (err) {
      return handleError(err);
    }
  });

  ipcMain.handle(IPC_CHANNELS.AGENT_SOFT_DELETE, async (_event, id: string, context?: SessionContext) => {
    try {
      await assertAgentAccess(context, id, 'write');
      const updated = await storage.update('agents', id, { status: 'archived', deletedAt: new Date().toISOString(), updatedAt: new Date().toISOString() } as never);
      await recordMutationAudit(context, 'agent.softDelete', { type: 'agent', id });
      return updated;
    } catch (err) {
      return handleError(err);
    }
  });

  ipcMain.handle(IPC_CHANNELS.AGENT_ENABLE, async (_event, id: string, context?: SessionContext) => {
    try {
      await assertAgentAccess(context, id, 'write');
      return await storage.update('agents', id, { status: 'enabled', updatedAt: new Date().toISOString() } as never);
    } catch (err) {
      return handleError(err);
    }
  });

  ipcMain.handle(IPC_CHANNELS.AGENT_DISABLE, async (_event, id: string, context?: SessionContext) => {
    try {
      await assertAgentAccess(context, id, 'write');
      return await storage.update('agents', id, { status: 'disabled', updatedAt: new Date().toISOString() } as never);
    } catch (err) {
      return handleError(err);
    }
  });

  ipcMain.handle(IPC_CHANNELS.AGENT_HEALTH, async (_event, id: string, context?: SessionContext) => {
    try {
      const agent = await assertAgentAccess(context, id, 'read');
      return { agentId: id, status: agent.lastHealthStatus, checkedAt: new Date().toISOString() };
    } catch (err) {
      return handleError(err);
    }
  });

  ipcMain.handle(IPC_CHANNELS.AGENT_EXECUTIONS_LIST, async (_event, agentId: string, context?: SessionContext) => {
    try {
      const agent = await assertAgentAccess(context, agentId, 'read');
      const all = await storage.getAll<AgentExecutionRecord>('agentExecutions');
      return all.filter((execution) => execution.agentId === agent.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    } catch (err) {
      return handleError(err);
    }
  });

  ipcMain.handle(IPC_CHANNELS.AGENT_EXECUTION_CONTROL, async (_event, executionId: string, action: string, context?: SessionContext) => {
    try {
      const execution = await storage.getById<AgentExecutionRecord>('agentExecutions', executionId);
      if (!execution) throw new Error('未找到执行记录。');
      await assertAgentAccess(context, execution.agentId, 'write');
      if (execution.projectId) await assertProjectResourceAccess(context, execution.projectId, 'write');
      const normalized = ['pause', 'cancel', 'retry', 'resume'].includes(action) ? action : 'pause';
      const nextStatus: AgentExecutionStatus =
        normalized === 'cancel' ? 'cancelled' :
        normalized === 'pause' ? 'paused' :
        normalized === 'resume' ? 'running' :
        'queued';
      const actionLabel: Record<string, string> = {
        pause: '暂停',
        cancel: '取消',
        retry: '安全重试',
        resume: '恢复',
      };
      const updated = await storage.update('agentExecutions', executionId, {
        status: nextStatus,
        finishedAt: normalized === 'cancel' ? new Date().toISOString() : execution.finishedAt,
        outputSummary: normalized === 'retry'
          ? `${execution.outputSummary || '执行记录'} 已请求对安全确定性节点重试。`
          : execution.outputSummary,
        customData: sanitizeObject({
          ...(execution.customData ?? {}),
          lastControlAction: normalized,
          controlledAt: new Date().toISOString(),
          controlledBy: context?.user.id,
        }) as Record<string, unknown>,
      } as never);
      await storage.create('runEvents', {
        id: randomUUID(),
        runId: execution.runId ?? '',
        agentId: execution.agentId,
        executionId,
        projectId: execution.projectId ?? '',
        workflowId: execution.workflowId ?? '',
        type: 'agent.execution',
        status: normalized === 'cancel' ? 'denied' : 'info',
        actorUserId: context?.user.id,
        title: `Agent 执行控制：${actionLabel[normalized] ?? normalized}`,
        detail: `执行记录已标记为 ${nextStatus}；高风险或外部工具仍需要显式审批。`,
        metadata: { action: normalized, status: nextStatus },
        createdAt: new Date().toISOString(),
      } as never);
      await recordMutationAudit(context, 'agent.execution.control', { type: 'agent_execution', id: executionId }, { action: normalized, status: nextStatus });
      return sanitizeObject(updated);
    } catch (err) {
      return handleError(err);
    }
  });

  ipcMain.handle(IPC_CHANNELS.AGENT_TIMELINE_LIST, async (_event, agentId: string, context?: SessionContext) => {
    try {
      await assertAgentAccess(context, agentId, 'read');
      const all = await storage.getAll<{ id: string; agentId?: string; createdAt: string; [key: string]: unknown }>('runEvents');
      return all.filter((event) => event.agentId === agentId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    } catch (err) {
      return handleError(err);
    }
  });

  ipcMain.handle(IPC_CHANNELS.AGENT_FEEDBACK_CREATE, async (_event, data: unknown, context?: SessionContext) => {
    try {
      if (!context) throw new Error('Authentication required.');
      const now = new Date().toISOString();
      const payload = sanitizeObject(data) as Partial<AgentFeedbackRecord>;
      if (payload.projectId) await assertProjectResourceAccess(context, payload.projectId, 'write');
      if (payload.agentId) await assertAgentAccess(context, payload.agentId, 'read');
      const created = await storage.create('agentFeedback', {
        id: payload.id ?? randomUUID(),
        agentId: payload.agentId ?? '',
        executionId: payload.executionId ?? '',
        runId: payload.runId ?? '',
        projectId: payload.projectId ?? '',
        rating: payload.rating ?? 'neutral',
        title: payload.title ?? 'Agent feedback',
        message: payload.message ?? '',
        status: payload.status ?? 'open',
        createdByUserId: context.user.id,
        createdAt: now,
        updatedAt: now,
      } as never);
      await recordMutationAudit(context, 'agentFeedback.create', { type: 'agent_feedback', id: created.id }, { projectId: payload.projectId });
      await storage.create('runEvents', {
        id: randomUUID(),
        agentId: payload.agentId ?? '',
        executionId: payload.executionId ?? '',
        runId: payload.runId ?? '',
        projectId: payload.projectId ?? '',
        type: 'feedback.created',
        status: 'info',
        actorUserId: context.user.id,
        title: String(payload.title ?? 'Feedback created'),
        detail: String(payload.message ?? ''),
        createdAt: now,
      } as never);
      return created;
    } catch (err) {
      return handleError(err);
    }
  });

  ipcMain.handle(IPC_CHANNELS.AGENT_FEEDBACK_LIST, async (_event, filters?: { projectId?: string; agentId?: string }, context?: SessionContext) => {
    try {
      let all = await storage.getAll<AgentFeedbackRecord>('agentFeedback');
      if (filters?.projectId) {
        await assertProjectResourceAccess(context, filters.projectId, 'read');
        all = all.filter((feedback) => feedback.projectId === filters.projectId);
      } else if (filters?.agentId) {
        await assertAgentAccess(context, filters.agentId, 'read');
        all = all.filter((feedback) => feedback.agentId === filters.agentId);
      } else {
        all = await filterProjectScoped(context, all);
      }
      return sanitizeObject(all.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
    } catch (err) {
      return handleError(err);
    }
  });

  ipcMain.handle(IPC_CHANNELS.AGENT_FEEDBACK_GET, async (_event, id: string, context?: SessionContext) => {
    try {
      const feedback = await storage.getById<AgentFeedbackRecord>('agentFeedback', id);
      if (!feedback) throw new Error('Feedback not found.');
      if (feedback.projectId) await assertProjectResourceAccess(context, feedback.projectId, 'read');
      return sanitizeObject(feedback);
    } catch (err) {
      return handleError(err);
    }
  });

  ipcMain.handle(IPC_CHANNELS.AGENT_FEEDBACK_UPDATE_STATUS, async (_event, id: string, status: string, context?: SessionContext) => {
    try {
      const feedback = await storage.getById<AgentFeedbackRecord>('agentFeedback', id);
      if (!feedback) throw new Error('Feedback not found.');
      if (feedback.projectId) await assertProjectResourceAccess(context, feedback.projectId, 'write');
      const updated = await storage.update('agentFeedback', id, { status, updatedAt: new Date().toISOString() } as never);
      await recordMutationAudit(context, 'agentFeedback.updateStatus', { type: 'agent_feedback', id }, { status });
      return sanitizeObject(updated);
    } catch (err) {
      return handleError(err);
    }
  });

  ipcMain.handle(IPC_CHANNELS.AGENT_FEEDBACK_EXPORT, async (_event, filters?: { projectId?: string }, context?: SessionContext) => {
    try {
      const all = await storage.getAll<AgentFeedbackRecord>('agentFeedback');
      const scoped = filters?.projectId ? all.filter((feedback) => feedback.projectId === filters.projectId) : all;
      if (filters?.projectId) await assertProjectResourceAccess(context, filters.projectId, 'read');
      const visible = filters?.projectId ? scoped : await filterProjectScoped(context, scoped);
      await recordMutationAudit(context, 'agentFeedback.export', { type: 'agent_feedback' }, { count: visible.length });
      return { feedback: sanitizeObject(visible), exportedAt: new Date().toISOString() };
    } catch (err) {
      return handleError(err);
    }
  });

  ipcMain.handle(IPC_CHANNELS.AGENT_FEEDBACK_SYNTHETIC, async (_event, executionId: string, context?: SessionContext) => {
    try {
      const execution = await storage.getById<AgentExecutionRecord>('agentExecutions', executionId);
      if (!execution) throw new Error('Execution not found.');
      if (execution.projectId) await assertProjectResourceAccess(context, execution.projectId, 'write');
      return await storage.create('agentFeedback', {
        id: randomUUID(),
        agentId: execution.agentId,
        executionId: execution.id,
        runId: execution.runId ?? '',
        projectId: execution.projectId ?? '',
        rating: execution.status === 'success' || execution.status === 'demo' ? 'positive' : 'negative',
        title: `Synthetic feedback for ${execution.status}`,
        message: sanitizeObject(execution.errorSummary || execution.outputSummary || 'Synthetic feedback from execution record.'),
        status: 'open',
        createdByUserId: context?.user.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as never);
    } catch (err) {
      return handleError(err);
    }
  });

  // ── Export ───────────────────────────────────────────────────────────

  ipcMain.handle(
    IPC_CHANNELS.EXPORT_MARKDOWN,
    async (_event, content: string, filename: string) => {
      try {
        const win = BrowserWindow.getFocusedWindow();
        if (!win) return { error: 'No focused window for save dialog' };

        const result = await dialog.showSaveDialog(win, {
          title: 'Export Markdown',
          defaultPath: filename.endsWith('.md') ? filename : `${filename}.md`,
          filters: [
            { name: 'Markdown', extensions: ['md'] },
            { name: 'All Files', extensions: ['*'] },
          ],
        });

        if (result.canceled || !result.filePath) return { canceled: true };

        const safePath = validateUserChosenSavePath(result.filePath);
        await fs.writeFile(safePath, sanitizeObject(content), 'utf-8');
        return { success: true, path: safePath };
      } catch (err) {
        return handleError(err);
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.EXPORT_JSON,
    async (_event, data: unknown, filename: string) => {
      try {
        const win = BrowserWindow.getFocusedWindow();
        if (!win) return { error: 'No focused window for save dialog' };

        const result = await dialog.showSaveDialog(win, {
          title: 'Export JSON',
          defaultPath: filename.endsWith('.json') ? filename : `${filename}.json`,
          filters: [
            { name: 'JSON', extensions: ['json'] },
            { name: 'All Files', extensions: ['*'] },
          ],
        });

        if (result.canceled || !result.filePath) return { canceled: true };

        const safePath = validateUserChosenSavePath(result.filePath);
        await fs.writeFile(safePath, JSON.stringify(sanitizeObject(data), null, 2), 'utf-8');
        return { success: true, path: safePath };
      } catch (err) {
        return handleError(err);
      }
    },
  );

  ipcMain.handle(IPC_CHANNELS.CONFIG_EXPORT, async (_event, context?: SessionContext) => {
    try {
      const [providers, projects, gatewayKeys, gatewayConfigImports, agents, templates, mcpAllowlist, skillsRegistry] = await Promise.all([
        storage.getAll<ProviderSetting>('providerSettings'),
        storage.getAll<Project>('projects'),
        storage.getAll<NexusGatewayApiKey>('gatewayApiKeys').catch(() => []),
        getSettingValue<Array<Record<string, unknown>>>('gateway.config.imports').then((items) => items ?? []),
        storage.getAll<{ id: string; [key: string]: unknown }>('agents'),
        storage.getAll<{ id: string; [key: string]: unknown }>('prompts'),
        storage.getAll<{ id: string; [key: string]: unknown }>('mcpAllowlist'),
        storage.getAll<SkillRegistryEntry>('skillsRegistry'),
      ]);
      const visibleProjects = context?.user.role === 'admin'
        ? projects
        : projects.filter((project) => context && canAccessProjectResource(context, project, 'read'));
      const visibleProjectIds = new Set(visibleProjects.map((project) => project.id));
      const visibleAgents = context?.user.role === 'admin'
        ? agents
        : agents.filter((agent) => !agent.projectId || visibleProjectIds.has(String(agent.projectId)));
      const visibleTemplates = context?.user.role === 'admin'
        ? templates
        : templates.filter((template) => !template.projectId || visibleProjectIds.has(String(template.projectId)));
      const bundle = buildConfigBundle({
        providers: context?.user.role === 'admin' ? providers : [],
        projects: visibleProjects,
        gatewayKeys: context?.user.role === 'admin' ? gatewayKeys : [],
        gatewayConfigImports: context?.user.role === 'admin' ? gatewayConfigImports : [],
        agents: visibleAgents,
        templates: visibleTemplates,
        mcpAllowlist: context?.user.role === 'admin' ? mcpAllowlist : [],
        skillsRegistry: context?.user.role === 'admin' ? skillsRegistry : [],
      });
      await recordMutationAudit(context, 'config.export', { type: 'config_bundle' }, { hash: bundle.manifest.hash, counts: bundle.manifest.counts });
      return bundle;
    } catch (err) {
      return handleError(err);
    }
  });

  ipcMain.handle(IPC_CHANNELS.CONFIG_IMPORT_PREVIEW, async (_event, raw: string) => {
    try {
      return previewConfigImport(raw);
    } catch (err) {
      return handleError(err);
    }
  });

  ipcMain.handle(IPC_CHANNELS.CONFIG_IMPORT_APPLY, async (_event, raw: string, context?: SessionContext) => {
    try {
      const preview = previewConfigImport(raw);
      if (!preview.ok || !preview.bundle) return preview;
      if (context?.user.role !== 'admin') {
        const hasPrivilegedEntries = Boolean((preview.bundle.skillsRegistry?.length ?? 0) || (preview.bundle.mcpAllowlist?.length ?? 0));
        if (hasPrivilegedEntries) {
          await recordAudit({
            type: 'permission.denied',
            action: 'config.import.privileged',
            status: 'denied',
            severity: 'warning',
            actor: actorFor(context),
            metadata: { reason: 'mcp_or_skills_import_requires_admin' },
          });
          throw new Error('Only administrators can import MCP allowlists or skills registry entries.');
        }
      }
      let imported = 0;
      for (const skill of preview.bundle.skillsRegistry ?? []) {
        const existing = await storage.getById('skillsRegistry', skill.id);
        if (existing) await storage.update('skillsRegistry', skill.id, skill as never);
        else await storage.create('skillsRegistry', skill as never);
        imported += 1;
      }
      if (preview.bundle.gatewayConfigImports?.length) {
        const existingImports = await getSettingValue<Array<Record<string, unknown>>>('gateway.config.imports') ?? [];
        await setSettingValue('gateway.config.imports', [
          ...existingImports,
          ...preview.bundle.gatewayConfigImports.map((item) => sanitizeObject(item) as Record<string, unknown>),
        ]);
        imported += preview.bundle.gatewayConfigImports.length;
      }
      for (const entry of preview.bundle.mcpAllowlist ?? []) {
        const id = String(entry.id ?? `${entry.serverName}:${entry.toolName}`);
        const safeEntry = { ...entry, id };
        const existing = await storage.getById('mcpAllowlist', id);
        if (existing) await storage.update('mcpAllowlist', id, safeEntry as never);
        else await storage.create('mcpAllowlist', safeEntry as never);
        imported += 1;
      }
      await recordMutationAudit(context, 'config.import', { type: 'config_bundle' }, { imported, warnings: preview.warnings });
      return { ok: true, imported, warnings: preview.warnings };
    } catch (err) {
      return handleError(err);
    }
  });

  // ── Skills ───────────────────────────────────────────────────────────

  ipcMain.handle(IPC_CHANNELS.SKILLS_LIST, async () => {
    try {
      const skillsDir = getSkillsRoot();
      return await readSkillsFromDir(skillsDir);
    } catch (err) {
      return handleError(err);
    }
  });

  ipcMain.handle(IPC_CHANNELS.SKILL_READ, async (_event, skillPath: string) => {
    try {
      const safePath = resolveSkillReadPath(skillPath);
      const exists = await fileExists(safePath);
      if (!exists) return { error: `File not found: ${safePath}` };
      const content = await fs.readFile(safePath, 'utf-8');
      return { path: safePath, content };
    } catch (err) {
      return handleError(err);
    }
  });

  ipcMain.handle(IPC_CHANNELS.SKILLS_REGISTRY_LIST, async () => {
    try {
      const registry = await storage.getAll<SkillRegistryEntry>('skillsRegistry');
      if (registry.length > 0) return registry;
      const now = new Date().toISOString();
      return [
        { id: 'planning-with-files', name: 'Planning with Files', description: '文件化任务规划和进度追踪。', category: 'planning', enabled: true, createdAt: now, updatedAt: now },
        { id: 'test-runner', name: 'Test Runner', description: '测试运行、失败分析和报告更新。', category: 'testing', enabled: true, createdAt: now, updatedAt: now },
        { id: 'safety-reviewer', name: 'Safety Reviewer', description: '命令和代码安全审查。', category: 'security', enabled: true, createdAt: now, updatedAt: now },
      ];
    } catch (err) {
      return handleError(err);
    }
  });

  ipcMain.handle(IPC_CHANNELS.SKILLS_REGISTRY_UPSERT, async (_event, entry: SkillRegistryEntry, context?: SessionContext) => {
    try {
      const now = new Date().toISOString();
      const payload = sanitizeObject({
        ...entry,
        id: String(entry.id || randomUUID()),
        enabled: Boolean(entry.enabled),
        createdAt: entry.createdAt || now,
        updatedAt: now,
      }) as SkillRegistryEntry;
      const existing = await storage.getById('skillsRegistry', payload.id);
      const saved = existing
        ? await storage.update('skillsRegistry', payload.id, payload as never)
        : await storage.create('skillsRegistry', payload as never);
      await recordMutationAudit(context, 'skillsRegistry.upsert', { type: 'skill', id: payload.id });
      return saved;
    } catch (err) {
      return handleError(err);
    }
  });

  ipcMain.handle(IPC_CHANNELS.SKILLS_REGISTRY_TOGGLE, async (_event, id: string, enabled: boolean, context?: SessionContext) => {
    try {
      const updated = await storage.update('skillsRegistry', id, { enabled, updatedAt: new Date().toISOString() } as never);
      await recordMutationAudit(context, 'skillsRegistry.toggle', { type: 'skill', id }, { enabled });
      return updated;
    } catch (err) {
      return handleError(err);
    }
  });

  ipcMain.handle(IPC_CHANNELS.SKILL_CREATE, async (_event, entry: Partial<SkillRegistryEntry>, context?: SessionContext) => {
    try {
      const created = await createPromptSkill(entry);
      await recordAudit({
        type: 'skill.create',
        action: 'skill.create',
        status: 'success',
        severity: 'info',
        actor: actorFor(context),
        resource: { type: 'skill', id: created.id, label: created.name },
        metadata: sanitizeObject({ type: created.type, category: created.category, riskLevel: created.riskLevel }),
      });
      return created;
    } catch (err) {
      return handleError(err);
    }
  });

  ipcMain.handle(IPC_CHANNELS.SKILL_TEST, async (_event, skillId: string, input?: Record<string, unknown>, context?: SessionContext) => {
    try {
      const result = await testPromptSkill(skillId, input);
      await recordAudit({
        type: 'skill.test',
        action: 'skill.test',
        status: result.ok ? 'success' : 'failure',
        severity: result.riskLevel === 'high' || result.riskLevel === 'critical' ? 'warning' : 'info',
        actor: actorFor(context),
        resource: { type: 'skill', id: skillId },
        metadata: sanitizeObject({ tokens: result.tokens, riskLevel: result.riskLevel }),
      });
      return result;
    } catch (err) {
      return handleError(err);
    }
  });

  // ── App ──────────────────────────────────────────────────────────────

  ipcMain.handle(IPC_CHANNELS.APP_INFO, async () => {
    try {
      return {
        name: app.getName(),
        version: app.getVersion(),
        electronVersion: process.versions.electron,
        nodeVersion: process.versions.node,
        chromeVersion: process.versions.chrome,
        platform: process.platform,
        arch: process.arch,
      };
    } catch (err) {
      return handleError(err);
    }
  });

  ipcMain.handle(IPC_CHANNELS.GET_DATA_PATH, async () => {
    try {
      return app.getPath('userData');
    } catch (err) {
      return handleError(err);
    }
  });

  // ── Dialog ───────────────────────────────────────────────────────────

  ipcMain.handle(IPC_CHANNELS.DIALOG_OPEN, async (_event, options: unknown) => {
    try {
      const win = BrowserWindow.getFocusedWindow();
      if (!win) return { error: 'No focused window for open dialog' };

      const opts = (options as { id: string; [key: string]: unknown }) ?? {};
      const result = await dialog.showOpenDialog(win, {
        title: (opts.title as string) ?? 'Open',
        defaultPath: (opts.defaultPath as string) ?? undefined,
        properties: (opts.properties as Array<'openFile' | 'openDirectory' | 'multiSelections'>) ?? ['openFile'],
        filters: (opts.filters as Array<{ name: string; extensions: string[] }>) ?? [],
      });

      return {
        canceled: result.canceled,
        filePaths: result.filePaths,
      };
    } catch (err) {
      return handleError(err);
    }
  });
}
