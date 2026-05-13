import { afterEach, describe, expect, it, vi } from 'vitest'
import { api } from '../../src/renderer/lib/api'
import type { NexusKnowledgeAssetSummary, NexusKnowledgeDocumentPreview, NexusOpsRepairPreview, NexusRestoreApplyResult, NexusWorkspaceSummary, ReleaseStatus, Run } from '../../src/shared/types'
import type { AgentRecord } from '../../src/shared/types'
import type { ResourceAcl } from '../../src/shared/authTypes'

const originalWindow = globalThis.window

function setAgentflowBridge(agentflow: unknown) {
  Object.defineProperty(globalThis, 'window', {
    value: { agentflow },
    configurable: true,
    writable: true,
  })
}

describe('api.runs', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    Object.defineProperty(globalThis, 'window', {
      value: originalWindow,
      configurable: true,
      writable: true,
    })
  })

  it('creates and lists agent run records through the namespaced preload API', async () => {
    const createdRun: Run = {
      id: 'run-1',
      projectId: 'project-1',
      title: 'Codex regression pass',
      tool: 'Codex',
      status: 'done',
      log: 'npm.cmd run test -- tests/unit/apiRuns.test.ts',
      summary: 'Agent run record persisted for later review.',
      durationMs: 1240,
      retryCount: 0,
      nodeTrace: [
        {
          id: 'node-1',
          name: 'Run focused test',
          status: 'success',
          durationMs: 1240,
          inputSummary: 'Focused Vitest command',
          outputSummary: '3 tests passed',
          retryCount: 0,
        },
      ],
      createdAt: '2026-05-09T10:00:00.000Z',
    }
    const create = vi.fn(async () => createdRun)
    const list = vi.fn(async () => [createdRun])
    setAgentflowBridge({ runs: { create, list } })

    const payload: Omit<Run, 'id'> = {
      projectId: createdRun.projectId,
      title: createdRun.title,
      tool: createdRun.tool,
      status: createdRun.status,
      log: createdRun.log,
      summary: createdRun.summary,
      durationMs: createdRun.durationMs,
      retryCount: createdRun.retryCount,
      nodeTrace: createdRun.nodeTrace,
      createdAt: createdRun.createdAt,
    }

    await expect(api.runs.create(payload)).resolves.toEqual(createdRun)
    await expect(api.runs.list('project-1')).resolves.toEqual([createdRun])

    expect(create).toHaveBeenCalledTimes(1)
    expect(create).toHaveBeenCalledWith(payload)
    expect(list).toHaveBeenCalledTimes(1)
    expect(list).toHaveBeenCalledWith('project-1')
  })

  it('falls back to the legacy run API shape when namespaced runs are unavailable', async () => {
    const createdRun: Run = {
      id: 'run-legacy',
      projectId: 'project-legacy',
      title: 'Legacy bridge run',
      tool: 'Claude Code',
      status: 'blocked',
      log: 'manual validation pending',
      summary: 'Legacy bridge still supports run records.',
      durationMs: 300,
      retryCount: 1,
      nodeTrace: [
        {
          id: 'node-legacy',
          name: 'Manual validation',
          status: 'blocked',
          durationMs: 300,
          failureReason: 'Waiting for local environment',
          retryCount: 1,
        },
      ],
      createdAt: '2026-05-09T10:05:00.000Z',
    }
    const createRun = vi.fn(async () => createdRun)
    const listRuns = vi.fn(async () => [createdRun])
    setAgentflowBridge({ createRun, listRuns })

    const payload: Omit<Run, 'id'> = {
      projectId: createdRun.projectId,
      title: createdRun.title,
      tool: createdRun.tool,
      status: createdRun.status,
      log: createdRun.log,
      summary: createdRun.summary,
      durationMs: createdRun.durationMs,
      retryCount: createdRun.retryCount,
      nodeTrace: createdRun.nodeTrace,
      createdAt: createdRun.createdAt,
    }

    await expect(api.runs.create(payload)).resolves.toEqual(createdRun)
    await expect(api.runs.list('project-legacy')).resolves.toEqual([createdRun])

    expect(createRun).toHaveBeenCalledWith(payload)
    expect(listRuns).toHaveBeenCalledWith('project-legacy')
  })

  it('returns safe fallbacks when Electron preload is not available', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    Object.defineProperty(globalThis, 'window', {
      value: {},
      configurable: true,
      writable: true,
    })

    await expect(api.runs.list('project-1')).resolves.toEqual([])
    await expect(
      api.runs.create({
        projectId: 'project-1',
        title: 'Unavailable bridge',
        tool: 'Codex',
        status: 'done',
        log: '',
        summary: '',
        durationMs: 0,
        retryCount: 0,
        nodeTrace: [],
        createdAt: '2026-05-09T10:10:00.000Z',
      }),
    ).resolves.toMatchObject({ id: '', projectId: 'project-1' })

    expect(warn).toHaveBeenCalledWith(expect.stringContaining('window.agentflow is not available'))
  })
})

describe('api.release', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    Object.defineProperty(globalThis, 'window', {
      value: originalWindow,
      configurable: true,
      writable: true,
    })
  })

  it('reads release status through the namespaced preload API', async () => {
    const status: ReleaseStatus = {
      version: '1.1.1',
      branch: 'codex-flat-ui-agent-optimization',
      gitStatus: 'Clean working tree.',
      recentCommits: [],
      updateSummary: ['Added workflow templates'],
      testResults: [
        { command: 'npm.cmd run test', status: 'PASS', details: 'all tests passed' },
      ],
      progressSummary: ['Continue mojibake quality gate'],
      checkedAt: '2026-05-09T10:20:00.000Z',
    }
    const releaseStatus = vi.fn(async () => status)
    setAgentflowBridge({ release: { status: releaseStatus } })

    await expect(api.release.status('D:\\AgentFlowStudio')).resolves.toEqual(status)
    expect(releaseStatus).toHaveBeenCalledWith('D:\\AgentFlowStudio')
  })

  it('returns a safe release fallback without preload', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    Object.defineProperty(globalThis, 'window', {
      value: {},
      configurable: true,
      writable: true,
    })

    await expect(api.release.status()).resolves.toMatchObject({
      version: 'unknown',
      branch: 'unknown',
      recentCommits: [],
      testResults: [],
    })
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('window.agentflow is not available'))
  })
})

describe('api.projects ACL helpers', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    Object.defineProperty(globalThis, 'window', {
      value: originalWindow,
      configurable: true,
      writable: true,
    })
  })

  it('uses the dedicated project ACL preload methods', async () => {
    const acl: ResourceAcl = {
      ownerUserId: 'owner',
      visibility: 'shared',
      entries: [
        { userId: 'owner', role: 'owner', grantedAt: '2026-05-10T00:00:00.000Z' },
        { userId: 'viewer', role: 'viewer', grantedAt: '2026-05-10T00:00:00.000Z' },
      ],
    }
    const getAcl = vi.fn(async () => ({ projectId: 'project-1', acl, ownerUserId: 'owner' }))
    const updateAcl = vi.fn(async () => ({ id: 'project-1', acl }))
    setAgentflowBridge({ projects: { getAcl, updateAcl } })

    await expect(api.projects.getAcl('project-1')).resolves.toEqual({ projectId: 'project-1', acl, ownerUserId: 'owner' })
    await expect(api.projects.updateAcl('project-1', acl)).resolves.toEqual({ id: 'project-1', acl })
    expect(getAcl).toHaveBeenCalledWith('project-1')
    expect(updateAcl).toHaveBeenCalledWith('project-1', acl)
  })

  it('bridges workspace summary through the project namespace', async () => {
    const summary: NexusWorkspaceSummary = {
      generatedAt: '2026-05-13T00:00:00.000Z',
      projects: { total: 2, active: 1, archived: 1 },
      tasks: { total: 3, open: 1, done: 1, blocked: 1 },
      prompts: { total: 4, starred: 2 },
      memory: { total: 5, active: 3, pending: 1 },
      providers: { total: 2, enabled: 1 },
      gateway: { keyCount: 2, activeKeyCount: 1, recentRequestCount: 6 },
      buildPlans: { moduleCount: 8, averageCompletionPercent: 73, incompleteModuleCount: 8 },
    }
    const summaryBridge = vi.fn(async () => summary)
    setAgentflowBridge({ projects: { summary: summaryBridge } })

    await expect(api.projects.summary()).resolves.toEqual(summary)
    expect(summaryBridge).toHaveBeenCalledTimes(1)
  })
})

describe('api provider, agent, feedback, and config bridges', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    Object.defineProperty(globalThis, 'window', {
      value: originalWindow,
      configurable: true,
      writable: true,
    })
  })

  it('bridges provider preset, test, and quick switch calls', async () => {
    const presets = vi.fn(async () => [{ providerId: 'openai-compatible', displayName: 'OpenAI-compatible' }])
    const testConnection = vi.fn(async () => ({ ok: true, status: 'success', message: 'ok', checkedAt: 'now' }))
    const setActive = vi.fn(async (config) => config)
    setAgentflowBridge({ providers: { presets, testConnection, setActive } })

    await expect(api.providers.presets()).resolves.toHaveLength(1)
    await expect(api.providers.testConnection('p1')).resolves.toMatchObject({ ok: true })
    await expect(api.providers.setActive({ providerRef: 'p1', model: 'm1', scope: 'workspace' })).resolves.toMatchObject({ providerRef: 'p1' })
  })

  it('bridges agents and feedback without exposing secrets', async () => {
    const agent: AgentRecord = { id: 'a1', name: 'Demo', description: '', type: 'demo', status: 'enabled', skillsRefs: [], createdAt: '', updatedAt: '', lastHealthStatus: 'healthy' }
    const list = vi.fn(async () => [agent])
    const create = vi.fn(async () => agent)
    const createFeedback = vi.fn(async () => ({ id: 'f1', title: 'ok', message: '[REDACTED]' }))
    setAgentflowBridge({ agents: { list, create }, agentFeedback: { create: createFeedback } })

    await expect(api.agents.list()).resolves.toEqual([agent])
    await expect(api.agents.create(agent)).resolves.toEqual(agent)
    await expect(api.agentFeedback.create({ message: 'token=sk-secret' })).resolves.toMatchObject({ id: 'f1' })
  })

  it('bridges config import/export helpers', async () => {
    const exportAll = vi.fn(async () => ({ manifest: { hash: 'fnv1a-test' }, providers: [] }))
    const importPreview = vi.fn(async () => ({ ok: true }))
    setAgentflowBridge({ config: { exportAll, importPreview } })

    await expect(api.config.exportAll()).resolves.toMatchObject({ manifest: { hash: 'fnv1a-test' } })
    await expect(api.config.importPreview('{}')).resolves.toMatchObject({ ok: true })
  })

  it('bridges gateway restart as a first-class control action', async () => {
    const restart = vi.fn(async () => ({
      online: true,
      host: '127.0.0.1',
      port: 8317,
      baseUrl: 'http://127.0.0.1:8317',
      providerCount: 1,
      defaultBaseUrlHint: 'http://127.0.0.1:8317',
      v1BaseUrlHint: 'http://127.0.0.1:8317/v1',
    }))
    setAgentflowBridge({ gateway: { restart } })

    await expect(api.gateway.restart()).resolves.toMatchObject({ online: true, port: 8317 })
    expect(restart).toHaveBeenCalledTimes(1)
  })
})

describe('api knowledge and ops bridges', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    Object.defineProperty(globalThis, 'window', {
      value: originalWindow,
      configurable: true,
      writable: true,
    })
  })

  it('bridges knowledge asset summary through preload', async () => {
    const summary: NexusKnowledgeAssetSummary = {
      id: 'knowledge-summary',
      generatedAt: '2026-05-13T00:00:00.000Z',
      documentCount: 1,
      chunkCount: 2,
      tokenEstimate: 30,
      promptCount: 3,
      memoryCount: 4,
      staleMemoryCount: 1,
      topTags: [{ tag: 'gateway', count: 2 }],
      latestDocuments: [{ id: 'doc-1', title: 'Doc', chunkCount: 2, createdAt: '2026-05-13T00:00:00.000Z' }],
      retrievalReady: true,
      redaction: 'secrets-redacted',
    }
    const assetsSummary = vi.fn(async () => summary)
    setAgentflowBridge({ knowledge: { assetsSummary } })

    await expect(api.knowledge.assetsSummary()).resolves.toEqual(summary)
    expect(assetsSummary).toHaveBeenCalledTimes(1)
  })

  it('bridges main-process knowledge local file import without a path argument', async () => {
    const imported: NexusKnowledgeDocumentPreview = {
      id: 'doc-imported',
      title: 'notes.md',
      chunkCount: 1,
      chunks: [{ id: 'chunk-1', text: 'Imported text', tokenEstimate: 4 }],
      source: { type: 'local-file', filename: 'notes.md', extension: 'md', sizeBytes: 32 },
      redaction: 'secrets-redacted',
      createdAt: '2026-05-13T00:00:00.000Z',
    }
    const importLocalFile = vi.fn(async () => imported)
    setAgentflowBridge({ knowledge: { importLocalFile } })

    await expect(api.knowledge.importLocalFile()).resolves.toEqual(imported)
    expect(importLocalFile).toHaveBeenCalledTimes(1)
    expect(importLocalFile).toHaveBeenCalledWith()
  })

  it('bridges ops repair preview without applying repairs', async () => {
    const preview: NexusOpsRepairPreview = {
      id: 'repair-preview',
      generatedAt: '2026-05-13T00:00:00.000Z',
      ok: true,
      checks: [{ id: 'repair-mode', name: 'Repair execution mode', status: 'pass', detail: 'Preview-only.' }],
      actions: [],
      warnings: [],
      errors: [],
      requiresBackup: true,
      redaction: 'secrets-redacted',
    }
    const repairPreview = vi.fn(async () => preview)
    setAgentflowBridge({ ops: { repairPreview } })

    await expect(api.ops.repairPreview()).resolves.toEqual(preview)
    expect(repairPreview).toHaveBeenCalledTimes(1)
  })

  it('bridges restore apply with explicit preview token', async () => {
    const applyResult: NexusRestoreApplyResult = {
      ok: true,
      appliedAt: '2026-05-13T00:00:00.000Z',
      manifestId: 'manifest-1',
      before: {
        id: 'backup-before',
        createdAt: '2026-05-13T00:00:00.000Z',
        mode: 'created',
        schemaVersion: 1,
        collections: [],
        checksum: 'fnv1a-before',
        redaction: 'secrets-redacted',
        restoreRequiresPreview: true,
      },
      collections: [{ collection: 'projects', inserted: 1, skipped: 0, existingBefore: 0 }],
      checksum: 'fnv1a-apply',
      auditRedaction: 'secrets-redacted',
      warnings: [],
    }
    const restoreApply = vi.fn(async () => applyResult)
    setAgentflowBridge({ ops: { restoreApply } })

    await expect(api.ops.restoreApply({ raw: '{"projects":[]}', confirmToken: 'fnv1a-token' })).resolves.toEqual(applyResult)
    expect(restoreApply).toHaveBeenCalledWith({ raw: '{"projects":[]}', confirmToken: 'fnv1a-token' })
  })
})
