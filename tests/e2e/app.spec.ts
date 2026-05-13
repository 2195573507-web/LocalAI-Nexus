import { expect, test } from 'playwright/test'

const now = () => new Date().toISOString()

function installAgentflowMock() {
  const now = () => new Date().toISOString()
  const user = {
    id: 'e2e-user',
    email: 'e2e@example.com',
    role: 'admin',
    status: 'active',
    profile: { displayName: 'E2E User' },
    mustChangePassword: false,
    failedLoginCount: 0,
    permissions: [
      'app:read',
      'project:read',
      'project:write',
      'task:write',
      'prompt:write',
      'run:write',
      'memory:read',
      'memory:write',
      'memory:export',
      'provider:read',
      'provider:write',
      'git:read',
      'skill:read',
      'mcp:write',
      'export:write',
      'settings:read',
      'settings:write',
      'ops:backup',
      'ops:restore',
      'dialog:open',
      'admin:users',
      'admin:audit',
    ],
    createdAt: now(),
    updatedAt: now(),
  }

  const project = {
    id: 'project-e2e',
    name: 'E2E 新手工作室',
    idea: 'Build a beginner friendly local workflow studio.',
    platform: 'Desktop',
    techStack: 'Electron, React, TypeScript',
    uiStyle: 'Flat UI',
    difficulty: 'Medium',
    status: 'active',
    createdAt: now(),
    updatedAt: now(),
  }

  const template = {
    id: 'template-e2e',
    name: '新手示例 Workflow',
    description: '包含 Start、Prompt、LLM、Tool、Condition、Human Approval 和 Output 的基础模板。',
    category: 'starter',
    nodes: [],
    edges: [],
    createdAt: now(),
    updatedAt: now(),
  }

  const workflow = {
    id: 'workflow-e2e',
    projectId: project.id,
    name: template.name,
    description: template.description,
    version: 1,
    status: 'draft',
    nodes: [
      { id: 'start', type: 'start', title: 'Start', config: {}, description: '入口' },
      { id: 'prompt', type: 'prompt', title: 'Prompt', config: { prompt: '整理用户需求' }, description: '生成提示词' },
      { id: 'llm', type: 'llm', title: 'LLM', config: { model: 'demo-local' }, description: '调用模型' },
      { id: 'tool', type: 'tool', title: 'Tool', config: { toolName: 'diagnostics' }, description: '工具调用' },
      { id: 'condition', type: 'condition', title: 'Condition', config: { expression: 'ok' }, description: '条件判断' },
      { id: 'approval', type: 'human_approval', title: 'Human Approval', config: {}, description: '人工审批' },
      { id: 'output', type: 'output', title: 'Output', config: {}, description: '输出结果' },
    ],
    edges: [],
    createdAt: now(),
    updatedAt: now(),
  }

  const run = {
    id: 'run-e2e',
    projectId: project.id,
    title: 'Workflow run',
    tool: 'Workflow',
    status: 'success',
    summary: '示例工作流运行完成。',
    metadata: { workflowId: workflow.id },
    createdAt: now(),
    updatedAt: now(),
  }

  localStorage.setItem('agentflow.auth.session', JSON.stringify({ sessionId: 'e2e-session' }))
  Object.defineProperty(window, 'agentflow', {
    configurable: true,
    value: {
      auth: {
        bootstrap: async () => ({ ok: true }),
        session: async () => ({ authenticated: true, sessionId: 'e2e-session', user }),
        logout: async () => true,
      },
      projects: {
        list: async () => [project],
        get: async (id: string) => (id === project.id || id === 'demo-1' ? { ...project, id, name: id === 'demo-1' ? 'AI 聊天助手' : project.name } : null),
        create: async (payload: Record<string, string>) => ({ ...project, ...payload, id: payload.id || 'project-created-by-e2e', createdAt: now(), updatedAt: now() }),
      },
      tasks: { list: async () => [] },
      prompts: { list: async () => [] },
      memory: { list: async () => [], exportAll: async () => ({ memories: [] }), generateContext: async () => '' },
      runs: {
        list: async () => [run],
        create: async (payload: Record<string, string>) => ({ ...payload, id: 'run-created-by-e2e', createdAt: now(), updatedAt: now() }),
        events: async () => [
          { id: 'event-start', title: 'Start', detail: '收到输入', status: 'success' },
          { id: 'event-output', title: 'Output', detail: '生成输出', status: 'success' },
        ],
      },
      workflows: {
        templates: async () => [template],
        list: async () => [workflow],
        get: async () => workflow,
        versions: async () => [{ id: 'version-e2e', workflowId: workflow.id, version: 1, message: 'Initial template', createdAt: now() }],
        publish: async () => ({
          workflow: { ...workflow, status: 'active', publishedVersion: workflow.version, publishedAt: now() },
          version: { id: 'version-e2e', workflowId: workflow.id, version: workflow.version, status: 'published', message: 'Published from E2E', nodes: workflow.nodes, edges: workflow.edges, createdAt: now(), publishedAt: now() },
          message: 'Workflow published.',
        }),
        rollback: async () => ({
          workflow: { ...workflow, version: workflow.version + 1, lastRollbackVersion: 1, lastRollbackAt: now() },
          version: { id: 'version-rollback-e2e', workflowId: workflow.id, version: workflow.version + 1, status: 'rollback', message: 'Rollback from E2E', nodes: workflow.nodes, edges: workflow.edges, createdAt: now(), restoredAt: now(), restoredFromVersion: 1 },
          restoredFrom: { id: 'version-e2e', workflowId: workflow.id, version: 1, message: 'Initial template', nodes: workflow.nodes, edges: workflow.edges, createdAt: now() },
          message: 'Workflow rolled back.',
        }),
        createFromTemplate: async () => workflow,
        save: async (_id: string, payload: Record<string, unknown>) => ({ ...workflow, ...payload, updatedAt: now() }),
        run: async () => ({
          run,
          events: [],
          result: { summary: '示例工作流运行完成。', nextStep: '查看 Timeline / Trace' },
        }),
      },
      providers: {
        list: async () => [],
        presets: async () => [],
        getActive: async () => ({ providerRef: '', model: '' }),
        create: async (provider: Record<string, string>) => ({ ...provider, id: provider.id || 'provider-e2e', apiKey: 'Saved key ending in 1234' }),
        update: async (_id: string, provider: Record<string, string>) => provider,
        delete: async () => true,
        testConnection: async () => ({ ok: false, status: 'failure', message: 'Missing API Key', checkedAt: now() }),
        setActive: async (config: Record<string, string>) => config,
      },
      gateway: {
        status: async () => ({
          online: true,
          host: '127.0.0.1',
          port: 8317,
          baseUrl: 'http://127.0.0.1:8317',
          providerCount: 1,
          defaultBaseUrlHint: 'http://127.0.0.1:8317',
          v1BaseUrlHint: 'http://127.0.0.1:8317/v1',
          lastTraceId: 'trace-e2e',
          lastRouteReason: 'mock route',
        }),
        start: async () => ({
          online: true,
          host: '127.0.0.1',
          port: 8317,
          baseUrl: 'http://127.0.0.1:8317',
          providerCount: 1,
          defaultBaseUrlHint: 'http://127.0.0.1:8317',
          v1BaseUrlHint: 'http://127.0.0.1:8317/v1',
          lastTraceId: 'trace-e2e',
          lastRouteReason: 'mock route',
        }),
        stop: async () => ({
          online: false,
          host: '127.0.0.1',
          port: 8317,
          baseUrl: 'http://127.0.0.1:8317',
          providerCount: 1,
          defaultBaseUrlHint: 'http://127.0.0.1:8317',
          v1BaseUrlHint: 'http://127.0.0.1:8317/v1',
        }),
      },
      usage: {
        summary: async () => ({
          todayRequests: 1,
          weekRequests: 2,
          monthRequests: 3,
          inputTokens: 10,
          outputTokens: 20,
          totalTokens: 30,
          successRate: 1,
          failureRate: 0,
          averageLatencyMs: 42,
          p95LatencyMs: 60,
          byProvider: [],
          byModel: [],
          recentFailureReason: 'None',
        }),
        list: async () => [
          {
            id: 'usage-e2e',
            endpoint: '/v1/chat/completions',
            model: 'mock-model',
            providerName: 'LocalAI Mock',
            inputTokens: 10,
            outputTokens: 20,
            totalTokens: 30,
            success: true,
            failureCategory: 'none',
            latencyMs: 42,
            requestId: 'trace-e2e',
            createdAt: now(),
          },
        ],
      },
      health: {
        summary: async () => ({ latest: [], byStatus: { Healthy: 1 } }),
        checkProvider: async () => ({
          id: 'health-e2e',
          providerId: 'provider-e2e',
          providerName: 'LocalAI Mock',
          status: 'Healthy',
          checks: [{ name: 'configuration', ok: true, message: 'Mock provider is configured.' }],
          averageLatencyMs: 1,
          errorRate: 0,
          failureCategory: 'none',
          suggestion: 'Ready for mocked routing.',
          checkedAt: now(),
        }),
      },
      runtimeProfiles: {
        generate: async () => [
          {
            id: 'runtime-e2e',
            name: 'Codex profile',
            kind: 'codex',
            baseUrl: 'http://127.0.0.1:8317/v1',
            model: 'mock-model',
            env: { OPENAI_BASE_URL: 'http://127.0.0.1:8317/v1' },
            json: { baseUrl: 'http://127.0.0.1:8317/v1' },
            toml: 'base_url = "http://127.0.0.1:8317/v1"',
            yaml: 'base_url: http://127.0.0.1:8317/v1',
            diagnostics: ['Use /v1 for OpenAI-compatible clients.'],
            command: 'set OPENAI_BASE_URL=http://127.0.0.1:8317/v1',
            redaction: 'no-secrets',
            updatedAt: now(),
          },
        ],
      },
      router: {
        decisions: async () => [
          {
            id: 'route-e2e',
            providerId: 'provider-e2e',
            providerName: 'LocalAI Mock',
            model: 'mock-model',
            intent: 'default',
            reason: 'Mock route selected.',
            fallbackUsed: false,
            quotaState: 'available',
            checkedAt: now(),
          },
        ],
      },
      security: {
        report: async () => ({
          id: 'security-e2e',
          generatedAt: now(),
          scope: 'workspace',
          summary: 'E2E redacted security report.',
          findings: [
            {
              id: 'baseline-ok',
              severity: 'info',
              title: 'Baseline security posture is clean',
              detail: 'No mock risks found.',
              recommendation: 'Keep using redacted exports.',
            },
          ],
          redaction: 'secrets-redacted',
          auditEventCount: 1,
          deniedEventCount: 0,
          providerRiskCount: 0,
          externalUrlPolicy: 'confirm-before-open',
        }),
      },
      observability: {
        report: async () => ({
          id: 'observability-e2e',
          generatedAt: now(),
          usage: {
            todayRequests: 1,
            weekRequests: 2,
            monthRequests: 3,
            inputTokens: 10,
            outputTokens: 20,
            totalTokens: 30,
            successRate: 1,
            failureRate: 0,
            averageLatencyMs: 42,
            p95LatencyMs: 60,
            byProvider: [],
            byModel: [],
            recentFailureReason: 'None',
          },
          traces: [
            {
              traceId: 'trace-e2e',
              source: 'gateway',
              operation: '/v1/responses',
              status: 'success',
              startedAt: now(),
              latencyMs: 42,
              redaction: 'secrets-redacted',
            },
          ],
          slowRequests: [],
          errorCategories: [],
          traceDetails: [
            {
              traceId: 'trace-e2e',
              source: 'gateway',
              operation: '/v1/responses',
              status: 'success',
              startedAt: now(),
              latencyMs: 42,
              durationBucket: 'fast',
              relatedRecordId: 'trace-e2e',
              details: [
                { label: 'source', value: 'gateway' },
                { label: 'operation', value: '/v1/responses' },
              ],
              redaction: 'secrets-redacted',
            },
          ],
          evaluation: {
            id: 'eval-e2e',
            name: 'E2E mock evaluation',
            target: 'prompt',
            score: 0.9,
            status: 'passed',
            findings: ['Mock evaluation passed.'],
            redaction: 'secrets-redacted',
            mode: 'mock',
            createdAt: now(),
          },
          evaluationDataset: {
            id: 'dataset-e2e',
            generatedAt: now(),
            sampleCount: 1,
            passCount: 1,
            warningCount: 0,
            failCount: 0,
            averageScore: 0.9,
            latestRuns: [{ id: 'eval-e2e', name: 'E2E mock evaluation', status: 'passed', score: 0.9, createdAt: now() }],
            mode: 'mock-local',
            redaction: 'secrets-redacted',
          },
          redTeamFindings: [
            {
              id: 'redteam-e2e',
              risk: 'none',
              severity: 'info',
              title: 'No local red-team issue detected',
              detail: 'E2E mock report is clean.',
              recommendation: 'Run credentialed red-team tests only with user-approved keys.',
            },
          ],
          exportSummary: {
            id: 'export-e2e',
            generatedAt: now(),
            traceCount: 1,
            slowRequestCount: 0,
            errorCategoryCount: 0,
            evaluationStatus: 'passed',
            suggestedFilename: 'localai-nexus-observability-e2e.md',
            markdown: '# LocalAI Nexus Observability Report\n\nTrace count: 1',
            redaction: 'secrets-redacted',
          },
          reportRedaction: 'secrets-redacted',
          compatibility: 'legacy-usage-and-run-events',
        }),
        runMockEvaluation: async () => ({
          id: 'eval-e2e',
          name: 'E2E mock evaluation',
          target: 'prompt',
          score: 0.9,
          status: 'passed',
          findings: ['Mock evaluation passed.'],
          redaction: 'secrets-redacted',
          mode: 'mock',
          createdAt: now(),
        }),
        getTrace: async () => ({
          traceId: 'trace-e2e',
          source: 'gateway',
          operation: '/v1/responses',
          status: 'success',
          startedAt: now(),
          latencyMs: 42,
          durationBucket: 'fast',
          relatedRecordId: 'trace-e2e',
          details: [
            { label: 'source', value: 'gateway' },
            { label: 'operation', value: '/v1/responses' },
          ],
          redaction: 'secrets-redacted',
        }),
        listEvaluationDataset: async () => ({
          id: 'dataset-e2e',
          generatedAt: now(),
          summary: {
            id: 'dataset-summary-e2e',
            generatedAt: now(),
            sampleCount: 1,
            passCount: 1,
            warningCount: 0,
            failCount: 0,
            averageScore: 0.9,
            latestRuns: [{ id: 'eval-e2e', name: 'E2E mock evaluation', status: 'passed', score: 0.9, createdAt: now() }],
            mode: 'mock-local',
            redaction: 'secrets-redacted',
          },
          runs: [{
            id: 'eval-e2e',
            name: 'E2E mock evaluation',
            target: 'prompt',
            score: 0.9,
            status: 'passed',
            findings: ['Mock evaluation passed.'],
            redaction: 'secrets-redacted',
            mode: 'mock',
            createdAt: now(),
          }],
          redaction: 'secrets-redacted',
        }),
        deleteEvaluationRun: async () => ({
          ok: true,
          id: 'eval-e2e',
          deleted: true,
          remaining: 0,
          summary: {
            id: 'dataset-summary-e2e',
            generatedAt: now(),
            sampleCount: 0,
            passCount: 0,
            warningCount: 0,
            failCount: 0,
            averageScore: 0,
            latestRuns: [],
            mode: 'mock-local',
            redaction: 'secrets-redacted',
          },
          redaction: 'secrets-redacted',
        }),
      },
      knowledge: {
        assetsSummary: async () => ({
          id: 'knowledge-summary-e2e',
          generatedAt: now(),
          documentCount: 1,
          chunkCount: 2,
          tokenEstimate: 80,
          promptCount: 1,
          memoryCount: 2,
          staleMemoryCount: 0,
          topTags: [{ tag: 'gateway', count: 1 }],
          latestDocuments: [{ id: 'doc-e2e', title: 'E2E knowledge note', chunkCount: 2, createdAt: now() }],
          retrievalReady: true,
          redaction: 'secrets-redacted',
        }),
        previewDocument: async (input: { title?: string; content: string }) => ({
          id: 'doc-preview-e2e',
          title: input.title || 'Preview',
          chunkCount: 1,
          chunks: [{ id: 'chunk-1', text: input.content.replace(/sk-[\w-]+/g, '[REDACTED]'), tokenEstimate: 20 }],
          redaction: 'secrets-redacted',
          createdAt: now(),
        }),
        importLocalFile: async () => ({
          id: 'doc-import-e2e',
          title: 'local-notes.md',
          chunkCount: 1,
          chunks: [{ id: 'chunk-1', text: 'Imported local note.', tokenEstimate: 10 }],
          source: { type: 'local-file', filename: 'local-notes.md', extension: 'md', sizeBytes: 120 },
          redaction: 'secrets-redacted',
          createdAt: now(),
        }),
        testRetrieval: async (input: { query: string }) => ({
          query: input.query,
          topK: 5,
          matches: [{ chunkId: 'doc-e2e:chunk-1', title: 'E2E knowledge note', text: 'Local retrieval redaction note.', score: 0.95 }],
          latencyMs: 2,
          mode: 'mock-local',
          redaction: 'secrets-redacted',
        }),
      },
      ops: {
        backupPreview: async () => ({
          id: 'backup-e2e',
          createdAt: now(),
          mode: 'dry-run',
          schemaVersion: 1,
          collections: [{ name: 'projects', count: 1, redacted: true }],
          checksum: 'fnv1a-backup',
          redaction: 'secrets-redacted',
          restoreRequiresPreview: true,
        }),
        createBackup: async () => ({
          id: 'backup-created-e2e',
          createdAt: now(),
          mode: 'created',
          schemaVersion: 1,
          collections: [{ name: 'projects', count: 1, redacted: true }],
          checksum: 'fnv1a-created',
          redaction: 'secrets-redacted',
          restoreRequiresPreview: true,
          bundle: { collections: ['projects'], bytes: 120, hash: 'fnv1a-created', redaction: 'secrets-redacted' },
        }),
        restorePreview: async () => ({
          ok: true,
          warnings: [],
          errors: [],
          changes: [{ collection: 'projects', incoming: 1, existing: 1, action: 'merge-preview' }],
          applyToken: 'fnv1a-restore',
        }),
        repairPreview: async () => ({
          id: 'repair-preview-e2e',
          generatedAt: now(),
          ok: true,
          checks: [{ id: 'repair-mode', name: 'Repair execution mode', status: 'pass', detail: 'Preview-only.' }],
          actions: [],
          warnings: [],
          errors: [],
          requiresBackup: true,
          redaction: 'secrets-redacted',
        }),
        restoreApply: async () => ({
          ok: true,
          appliedAt: now(),
          manifestId: 'manifest-e2e',
          before: {
            id: 'backup-before-e2e',
            createdAt: now(),
            mode: 'created',
            schemaVersion: 1,
            collections: [],
            checksum: 'fnv1a-before',
            redaction: 'secrets-redacted',
            restoreRequiresPreview: true,
          },
          collections: [{ collection: 'projects', inserted: 1, skipped: 0, existingBefore: 1 }],
          checksum: 'fnv1a-apply',
          mode: 'merge-only',
          summary: { inserted: 1, skipped: 0, touchedCollections: 1 },
          auditRedaction: 'secrets-redacted',
          warnings: [],
        }),
      },
      contextPack: {
        preview: async () => ({
          id: 'context-e2e',
          generatedAt: now(),
          sources: [
            { type: 'memory', label: 'Active Shared Memory', included: true, redacted: true },
            { type: 'docs', label: 'TEST_REPORT', included: true, redacted: true },
          ],
          memoryCount: 0,
          staleMemoryCount: 0,
          prompt: '# LocalAI Nexus Recovery Context\n\nE2E preview.',
        }),
      },
      templateBundles: {
        list: async () => [
          {
            id: 'bundle-e2e',
            name: 'Desktop App Pack',
            description: 'Local-only E2E template pack.',
            type: 'template',
            version: '1.0.0',
            riskLevel: 'low',
            enabled: true,
            localOnly: true,
            assumptions: ['Local only'],
            templates: [],
            createdAt: now(),
            updatedAt: now(),
          },
        ],
        toggle: async (id: string, enabled: boolean) => ({
          id,
          name: 'Desktop App Pack',
          description: 'Local-only E2E template pack.',
          type: 'template',
          version: '1.0.0',
          riskLevel: 'low',
          enabled,
          localOnly: true,
          assumptions: ['Local only'],
          templates: [],
          createdAt: now(),
          updatedAt: now(),
        }),
        upsert: async (bundle: Record<string, unknown>) => ({ ...bundle, id: bundle.id || 'bundle-e2e' }),
      },
      audit: {
        list: async () => [
          {
            id: 'audit-e2e',
            type: 'gateway.request',
            action: 'gateway.request',
            status: 'success',
            severity: 'info',
            actor: {},
            createdAt: now(),
          },
        ],
        exportAll: async () => ({ auditLogs: [], exportedAt: now() }),
      },
      settings: {
        getAll: async () => ({ theme: 'system', defaultProjectPath: '', defaultAITool: 'Claude Code', dataPath: '', appVersion: '1.1.1' }),
        get: async () => null,
        set: async () => true,
        update: async () => true,
      },
      mcp: { allowlist: async () => [] },
      skills: { list: async () => [], registry: async () => [], toggleRegistry: async () => ({}) },
      agents: {
        list: async () => [],
        create: async (agent: Record<string, string>) => ({
          ...agent,
          id: 'agent-e2e',
          name: agent.name || '新手演示 Agent',
          createdAt: now(),
          updatedAt: now(),
        }),
        executions: async () => [{
          id: 'execution-e2e',
          agentId: 'agent-e2e',
          projectId: 'demo-1',
          status: 'demo',
          startedAt: now(),
          finishedAt: now(),
          durationMs: 12,
          inputSummary: '演示输入：整理需求。',
          outputSummary: '本地模拟执行记录已生成。',
          customData: { externalCalls: 0 },
          createdAt: now(),
        }],
        timeline: async () => [],
      },
      agentFeedback: { create: async (feedback: Record<string, string>) => ({ ...feedback, id: 'feedback-e2e' }) },
      config: {
        exportAll: async () => ({ manifest: { hash: 'fnv1a-e2e' }, providers: [] }),
        importPreview: async () => ({ ok: true }),
        importApply: async () => ({ ok: true }),
      },
      export: {
        markdown: async (content: string, filename: string) => {
          const target = window as unknown as { __agentflowExports?: Array<{ content: string; filename: string }> }
          target.__agentflowExports?.push({ content, filename })
          return 'mock-export.md'
        },
        json: async () => 'mock-export.json',
      },
    },
  })
}

test.describe('LocalAI Nexus React web entry', () => {
  test.beforeEach(async ({ page }) => {
    const consoleErrors: string[] = []
    const pageErrors: string[] = []
    const networkFailures: string[] = []

    await page.addInitScript(installAgentflowMock)

    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text())
    })
    page.on('pageerror', (error) => pageErrors.push(error.message))
    page.on('requestfailed', (request) => {
      networkFailures.push(`${request.url()} ${request.failure()?.errorText ?? ''}`)
    })

    await page.goto('/', { waitUntil: 'networkidle' })
    await page.evaluate(() => {
      localStorage.setItem('agentflow.language', 'en')
      localStorage.removeItem('agentflow.theme')
    })
    await page.reload({ waitUntil: 'networkidle' })

    await page.locator('body').evaluate((body, state) => {
      Object.assign(body.dataset, {
        consoleErrors: JSON.stringify(state.consoleErrors),
        pageErrors: JSON.stringify(state.pageErrors),
        networkFailures: JSON.stringify(state.networkFailures),
      })
    }, { consoleErrors, pageErrors, networkFailures })
  })

  test('loads dashboard with beginner navigation and Flat UI shell', async ({ page }) => {
    await expect(page).toHaveTitle(/LocalAI Nexus/)
    await expect(page.locator('main').getByRole('heading', { name: /LocalAI Nexus/ })).toBeVisible()
    await expect(page.getByRole('navigation')).toBeVisible()
    await expect(page.getByRole('navigation')).toContainText(/工作台|Workspace/)
    await expect(page.getByRole('navigation')).toContainText(/模型|Models/)
    await expect(page.getByRole('navigation')).toContainText(/网关|Gateway/)
    await expect(page.locator('main').getByRole('heading', { name: /构建计划落地状态|Build Plan Audit/ })).toBeVisible()
    await expect(page.getByText('00 模块化重构')).toBeVisible()
    await expect(page.getByText('部分落地').first()).toBeVisible()
    await expect(page.getByText(/1 分钟快速开始/).first()).toBeVisible()
    await expect(page.getByRole('button', { name: /打开新手示例项目/ })).toBeVisible()
    await expect(page.getByRole('button', { name: /运行示例 Workflow/ }).first()).toBeVisible()

    for (const label of [/打开示例项目/, /创建第一个 Agent/, /运行第一个 Workflow/, /保存第一个 Prompt/]) {
      await expect(page.getByText(label).first()).toBeVisible()
    }

    const sidebarBackdrop = await page.locator('aside').evaluate((el) => getComputedStyle(el).backdropFilter)
    expect(sidebarBackdrop === '' || sidebarBackdrop === 'none').toBeTruthy()
    await expect(page.locator('.surface-card').first()).toBeVisible()
    const surfaceRule = await page.evaluate(() =>
      Array.from(document.styleSheets).some((sheet) =>
        Array.from(sheet.cssRules ?? []).some((rule) => rule.cssText.includes('.surface-card') && rule.cssText.includes('var(--surface)')),
      ),
    )
    expect(surfaceRule).toBeTruthy()
    const bodyFont = await page.locator('body').evaluate((el) => getComputedStyle(el).fontFamily)
    expect(bodyFont).toMatch(/Segoe UI|Microsoft YaHei|PingFang|Noto Sans|Arial/i)
  })

  test('settings exposes provider presets, MCP skills, and safe config export', async ({ page }) => {
    await page.goto('/#/settings', { waitUntil: 'networkidle' })
    await expect(page.getByRole('heading', { name: /Provider 预设中心|Provider Preset Center/ })).toBeVisible()
    await expect(page.getByRole('heading', { name: /MCP & Skills|MCP & Skills 管理/ })).toBeVisible()
    await expect(page.getByRole('heading', { name: /配置导入 \/ 导出|Config|Import|Export/ })).toBeVisible()
    await expect(page.locator('main')).toContainText(/选择一个 Provider 预设|Choose a provider preset/)
    await expect(page.locator('main')).toContainText(/API Key/)
    await expect(page.locator('main')).toContainText(/测试连接|test the connection/i)
    await page.getByRole('button', { name: /配置真实模型|添加 Provider|Provider/ }).first().click()
    await page.getByLabel(/API Key/).fill('sk-e2e-secret-1234')
    const inputFont = await page.getByLabel(/API Key/).evaluate((el) => getComputedStyle(el).fontFamily)
    expect(inputFont).toMatch(/mono|Consolas|Cascadia|SFMono/i)
  })

  test('skills page exposes Agent management, template gallery, and help guide', async ({ page }) => {
    await page.goto('/#/skills', { waitUntil: 'networkidle' })
    await expect(page.getByRole('heading', { name: /Agent.*Skills/ })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Template Gallery' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Help / Guide' })).toBeVisible()
    await page.getByRole('button', { name: /一键体验 Demo Agent/ }).click()
    await expect(page.getByTestId('skills-action-message')).toContainText(/Demo Agent/)
  })

  test('navigates through core pages including Workflows', async ({ page }) => {
    const routes = [
      ['/#/providers', /providers/],
      ['/#/tokens', /tokens/],
      ['/#/health', /health/],
      ['/#/router', /router/],
      ['/#/gateway', /gateway/],
      ['/#/runtime', /runtime/],
      ['/#/diagnostics', /diagnostics/],
      ['/#/knowledge', /knowledge/],
      ['/#/projects', /projects/],
      ['/#/agents', /agents/],
      ['/#/workflows', /workflows/],
      ['/#/prompts', /prompts|prompt-lab/],
      ['/#/logs', /logs|log-analyzer/],
      ['/#/security', /security/],
      ['/#/safety', /safety|safety-box/],
      ['/#/memory', /memory|shared-memory-hub/],
      ['/#/skills', /skills/],
      ['/#/ecosystem', /ecosystem/],
      ['/#/git', /git|git-timeline/],
      ['/#/settings', /settings/],
    ] as const

    for (const [route, url] of routes) {
      await page.goto(route, { waitUntil: 'networkidle' })
      await expect(page).toHaveURL(url)
      await expect(page.getByRole('main').first()).not.toBeEmpty()
    }
  })

  test('dashboard quick actions use primary routes', async ({ page }) => {
    const quickActions = [
      { name: /打开示例项目/, url: /\/projects\/onboarding-demo-project$/ },
      { name: /创建演示 Agent/, url: /\/agents$/ },
      { name: /运行示例 Workflow/, url: /\/workflows$/ },
      { name: /Provider 中心|Provider Hub/, url: /\/providers$/ },
      { name: /Runtime 配置|Runtime Profile/, url: /\/runtime$/ },
      { name: /Shared Memory/, url: /\/memory$/ },
    ]

    for (const action of quickActions) {
      await page.goto('/', { waitUntil: 'networkidle' })
      await page.getByTestId('dashboard-quick-actions').getByRole('button', { name: action.name }).click()
      await expect(page).toHaveURL(action.url)
      await expect(page.getByRole('main').first()).not.toBeEmpty()
    }
  })

  test('new LocalAI Nexus modules render operational state', async ({ page }) => {
    const expectations = [
      ['/#/providers', /Provider 中心|Provider Hub|添加 Provider|Add Provider/],
      ['/#/tokens', /Token 中心|Token Center|Token 总量|Total tokens/],
      ['/#/health', /健康监控|Health Monitor|Healthy/],
      ['/#/router', /模型路由|Model Router|最近决策|Recent decisions/],
      ['/#/gateway', /本地 Gateway|Local Gateway|支持的端点|Supported endpoints/],
      ['/#/runtime', /Runtime 切换器|Runtime Switcher|Codex profile/],
      ['/#/diagnostics', /诊断中心|Diagnostics|恢复 Prompt 预览|Recovery prompt preview|Restore Apply/],
      ['/#/knowledge', /知识库|Knowledge Base|检索测试|retrieval/i],
      ['/#/agents', /Agent 工作台|Agent Studio|执行时间线|Execution timeline/],
      ['/#/security', /安全中心|Security Center|风险发现|Findings/],
      ['/#/ecosystem', /本地生态|Local Ecosystem|Desktop App Pack/],
    ] as const

    for (const [route, pattern] of expectations) {
      await page.goto(route, { waitUntil: 'networkidle' })
      await expect(page.locator('main')).toContainText(pattern)
    }
  })

  test('persists language and theme preferences', async ({ page, browser }) => {
    await page.evaluate(() => {
      localStorage.setItem('agentflow.language', 'zh')
      localStorage.removeItem('agentflow.theme')
    })
    await page.reload({ waitUntil: 'networkidle' })

    await page.getByRole('button', { name: /English/ }).click()
    await expect.poll(() => page.evaluate(() => localStorage.getItem('agentflow.language'))).toBe('en')
    await expect.poll(() => page.evaluate(() => document.documentElement.lang)).toBe('en')
    await expect(page.locator('header button[title="Switch to Chinese"]')).toBeVisible()
    await expect(page.getByRole('link', { name: /Dashboard/ })).toBeVisible()

    await page.locator('header button[title*="Theme"], header button[title*="主题"]').last().click()
    await expect.poll(() => page.evaluate(() => localStorage.getItem('agentflow.theme'))).toBe('light')
    await page.goto('/#/settings', { waitUntil: 'networkidle' })
    await expect.poll(() => page.evaluate(() => ({
      stored: localStorage.getItem('agentflow.theme'),
      resolved: document.documentElement.dataset.theme,
      preference: document.documentElement.dataset.themePreference,
      dark: document.documentElement.classList.contains('dark'),
    }))).toEqual({
      stored: 'light',
      resolved: 'light',
      preference: 'light',
      dark: false,
    })

    await page.locator('header button[title*="Theme"], header button[title*="主题"]').last().click()
    await expect.poll(() => page.evaluate(() => localStorage.getItem('agentflow.theme'))).toBe('dark')
    await page.goto('/#/settings', { waitUntil: 'networkidle' })
    await expect.poll(() => page.evaluate(() => ({
      stored: localStorage.getItem('agentflow.theme'),
      resolved: document.documentElement.dataset.theme,
      preference: document.documentElement.dataset.themePreference,
      dark: document.documentElement.classList.contains('dark'),
    }))).toEqual({
      stored: 'dark',
      resolved: 'dark',
      preference: 'dark',
      dark: true,
    })

    await page.goto('/#/settings', { waitUntil: 'networkidle' })
    await page.reload({ waitUntil: 'networkidle' })
    await expect(page).toHaveURL(/#\/settings/)
    await expect.poll(() => page.evaluate(() => localStorage.getItem('agentflow.language'))).toBe('en')
    await expect.poll(() => page.evaluate(() => document.documentElement.lang)).toBe('en')
    await expect.poll(() => page.evaluate(() => localStorage.getItem('agentflow.theme'))).toBe('dark')
    await expect.poll(() => page.evaluate(() => document.documentElement.dataset.theme)).toBe('dark')
    await expect.poll(() => page.evaluate(() => document.documentElement.classList.contains('dark'))).toBe(true)

    const storageState = await page.context().storageState()
    const restartContext = await browser.newContext({ storageState })
    await restartContext.addInitScript(installAgentflowMock)
    const restartPage = await restartContext.newPage()
    await restartPage.goto('/#/settings', { waitUntil: 'networkidle' })
    await expect.poll(() => restartPage.evaluate(() => localStorage.getItem('agentflow.language'))).toBe('en')
    await expect.poll(() => restartPage.evaluate(() => localStorage.getItem('agentflow.theme'))).toBe('dark')
    await expect.poll(() => restartPage.evaluate(() => document.documentElement.lang)).toBe('en')
    await expect.poll(() => restartPage.evaluate(() => document.documentElement.dataset.theme)).toBe('dark')
    await expect.poll(() => restartPage.evaluate(() => document.documentElement.classList.contains('dark'))).toBe(true)
    await restartContext.close()
  })

  test('opens Prompt Lab and shows workflow template next actions', async ({ page }) => {
    await page.goto('/#/prompts', { waitUntil: 'networkidle' })
    await expect(page.locator('main')).toContainText(/Prompt Lab/)
    for (const step of ['选择模板', '确认输入', '配置 Provider/API Key', '运行', '保存结果和日志']) {
      await expect(page.locator('main').getByText(step, { exact: true })).toBeVisible()
    }

    await page.getByRole('button', { name: /Workflow Templates|工作流模板/ }).click()
    await page.getByPlaceholder(/搜索模板|Search templates/i).fill('git')
    await expect(page.locator('main').getByText(/Git/).first()).toBeVisible()
    await expect(page.getByText(/人工复核|需要人工确认/).first()).toBeVisible()

    await page.getByRole('button', { name: /Prompt 模板/ }).click()
    await page.getByRole('button', { name: /Generate|生成 Prompt|生成/ }).first().click()
    await expect(page.getByText(/下一步建议/)).toBeVisible()
    await expect(page.getByRole('button', { name: /复制.*Agent|Copy.*Agent/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /保存模板结果/ })).toBeVisible()
  })

  test('runs a workflow template and shows Timeline / Trace', async ({ page }) => {
    await page.goto('/#/workflows', { waitUntil: 'networkidle' })
    await expect(page.getByRole('heading', { name: /从模板创建、编辑并运行 Workflow/ })).toBeVisible()
    await expect(page.getByRole('main').first()).toContainText(/内置模板可本地 dry-run|创建示例 Workflow/)

    await page.getByRole('button', { name: /创建示例 Workflow|Create from template|从模板创建/ }).click()
    await expect(page.getByText(/已创建 Workflow|可以直接运行/)).toBeVisible()
    await expect(page.getByText('Start').first()).toBeVisible()
    await expect(page.getByText('Output').first()).toBeVisible()

    await page.getByRole('button', { name: /运行第一个 Workflow|Run Workflow|运行 Workflow/ }).click()
    await expect(page.getByText(/示例工作流运行完成/).first()).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Timeline / Trace' })).toBeVisible()
    await expect(page.getByText(/Start|Output/).first()).toBeVisible()
  })

  test('creates the first Agent and shows a local demo execution', async ({ page }) => {
    await page.goto('/#/agents', { waitUntil: 'networkidle' })
    await expect(page.getByRole('main').first().getByRole('heading', { name: /Agent 工作台|Agent Studio/ })).toBeVisible()
    await page.getByRole('button', { name: /创建第一个 Agent/ }).first().click()
    await expect(page.locator('main')).toContainText(/新手演示 Agent/)
    await expect(page.locator('main')).toContainText(/本地模拟执行记录/)
    await expect(page.locator('main')).toContainText(/执行时间线|Execution timeline/)
  })

  test('memory empty state explains examples and first action', async ({ page }) => {
    await page.goto('/#/memory', { waitUntil: 'networkidle' })
    await expect(page.getByRole('heading', { name: /共享记忆中心/ })).toBeVisible()
    await expect(page.locator('main')).toContainText(/项目决策、修复记录和偏好/)
    await expect(page.locator('main')).toContainText(/暂无共享记忆/)
    await expect(page.locator('main')).toContainText(/项目目标、技术栈选择、已修复的问题、模型偏好/)
    await expect(page.getByRole('button', { name: /创建第一条记忆|Create first memory/ })).toBeVisible()
  })

  test('knowledge and diagnostics expose local build-plan capabilities', async ({ page }) => {
    await page.goto('/#/knowledge', { waitUntil: 'networkidle' })
    await expect(page.locator('main').getByRole('heading', { name: /知识库|Knowledge Base/ })).toBeVisible()
    await expect(page.locator('main')).toContainText(/Document Indexing|document/i)
    await page.getByRole('button', { name: /Save Indexed Document|预览并保存/ }).click()
    await expect(page.locator('main')).toContainText(/Saved .*chunks|已保存/)
    await page.getByRole('button', { name: /Import Local File/ }).click()
    await expect(page.locator('main')).toContainText(/Imported local-notes\.md/)
    await page.getByRole('button', { name: /Test Retrieval|测试检索/ }).click()
    await expect(page.locator('main')).toContainText(/Retrieval finished|检索完成|Local retrieval/)

    await page.goto('/#/diagnostics', { waitUntil: 'networkidle' })
    await expect(page.locator('main').getByRole('heading', { name: /诊断中心|Diagnostics/ })).toBeVisible()
    await expect(page.locator('main')).toContainText(/Trace 详情/)
    await expect(page.locator('main')).toContainText(/本地评测数据集/)
    await expect(page.locator('main')).toContainText(/本地 Red-Team 提示/)
    await expect(page.locator('main')).toContainText(/Restore Apply/)
    await page.getByRole('button', { name: /Repair Preview/ }).click()
    await expect(page.locator('main')).toContainText(/Repair Preview: OK/)
    await page.evaluate(() => {
      Object.assign(window, { __agentflowExports: [] })
    })
    await page.getByRole('button', { name: /导出观测报告/ }).click()
    const exported = await page.evaluate(() => (window as unknown as { __agentflowExports: Array<{ content: string; filename: string }> }).__agentflowExports.at(-1))
    expect(exported).toBeTruthy()
    if (!exported) throw new Error('Observability export was not captured')
    expect(exported.filename).toMatch(/observability.*\.md$/)
    expect(exported.content).toContain('LocalAI Nexus Observability Report')
  })

  test('opens new projects on detail with plan as the next step', async ({ page }) => {
    await page.evaluate(() => {
      const projects: Array<Record<string, string>> = []
      Object.defineProperty(window, 'agentflow', {
        configurable: true,
        value: {
          ...(window as unknown as { agentflow: Record<string, unknown> }).agentflow,
          projects: {
            list: async () => projects,
            get: async (id: string) => projects.find((project) => project.id === id) ?? null,
            create: async (project: Record<string, string>) => {
              const created = {
                ...project,
                id: project.id || 'project-created-by-e2e',
                createdAt: project.createdAt || new Date().toISOString(),
                updatedAt: project.updatedAt || new Date().toISOString(),
              }
              projects.unshift(created)
              return created
            },
          },
          tasks: { list: async () => [] },
          memory: { list: async () => [] },
          runs: { list: async () => [], create: async (run: Record<string, string>) => ({ ...run, id: 'run-created-by-e2e' }) },
        },
      })
    })

    await page.goto('/#/projects', { waitUntil: 'networkidle' })
    await page.getByRole('main').first().getByRole('button', { name: /New project|新建项目|创建第一个项目/ }).first().click()
    await page.getByLabel(/Project name|项目名称/).fill('E2E New Project')
    await page.getByLabel(/Goal|Project goal|项目描述|目标/).fill('E2E project description')
    await page.getByLabel(/Tech stack|技术栈/).fill('React, Electron, TypeScript')
    await page.getByRole('button', { name: /Create project|创建项目/ }).click()

    await expect(page).toHaveURL(/#\/projects\/.+\?next=plan/)
    await expect(page.getByRole('heading', { name: 'E2E New Project' })).toBeVisible()
    const nextStep = page.getByTestId('plan-next-step')
    await expect(nextStep.getByRole('heading', { name: /下一步：生成项目规划/ })).toBeVisible()
    await nextStep.getByRole('button', { name: /生成规划/ }).click()
    await expect(nextStep).toBeHidden()
    await expect(page.getByRole('button', { name: /Export Markdown|导出 Markdown/ })).toBeVisible()
    await expect(page.getByRole('button', { name: /创建记忆/ })).toBeVisible()
  })

  test('keeps users in the create modal when project creation returns an IPC error', async ({ page }) => {
    await page.evaluate(() => {
      Object.defineProperty(window, 'agentflow', {
        configurable: true,
        value: {
          ...(window as unknown as { agentflow: Record<string, unknown> }).agentflow,
          projects: {
            list: async () => [],
            create: async () => ({ error: 'E2E create failed' }),
          },
        },
      })
    })

    await page.goto('/#/projects', { waitUntil: 'networkidle' })
    await page.getByRole('main').first().getByRole('button', { name: /New project|新建项目|创建第一个项目/ }).first().click()
    await page.getByLabel(/Project name|项目名称/).fill('E2E Create Failed Project')
    await page.getByLabel(/Goal|Project goal|项目描述|目标/).fill('E2E create failed description')
    await page.getByRole('button', { name: /Create project|创建项目/ }).click()

    await expect(page).toHaveURL(/#\/projects$/)
    await expect(page.getByText('E2E create failed', { exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: /Create project|创建项目/ })).toBeVisible()
  })

  test('records a safe Agent run on project detail', async ({ page }) => {
    await page.evaluate(() => {
      Object.assign(window, { __e2eClipboardText: '', __agentflowExports: [] })
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: {
          writeText(value: string) {
            Object.assign(window, { __e2eClipboardText: value })
            return Promise.resolve()
          },
          readText() {
            return Promise.resolve((window as unknown as { __e2eClipboardText: string }).__e2eClipboardText)
          },
        },
      })
    })

    await page.goto('/#/projects/demo-1', { waitUntil: 'networkidle' })
    await expect(page).toHaveURL(/#\/projects\/demo-1/)
    const panel = page.getByTestId('agent-run-panel')
    await expect(panel.getByRole('heading', { name: /Agent 执行记录/ })).toBeVisible()
    await expect(panel.getByText(/不会执行任何命令/)).toBeVisible()

    await panel.getByLabel('执行标题').fill('E2E Agent 运行记录')
    await panel.getByLabel('工具').selectOption('Codex')
    await panel.getByLabel(/状态/).selectOption('success')
    await panel.getByLabel(/结果/).fill('E2E saved a local run record.')
    await panel.getByLabel('关键日志').fill('node setup -> npm.cmd run test:e2e passed. token=sk-test-secret-1234567890')
    await panel.getByRole('button', { name: /保存执行记录/ }).click()

    await expect(panel.getByText(/执行记录已保存|执行记录/).first()).toBeVisible()
    const savedRun = panel.getByRole('article').filter({ hasText: 'E2E Agent 运行记录' })
    await expect(savedRun.getByRole('heading', { name: 'E2E Agent 运行记录' })).toBeVisible()
    await expect(savedRun.getByText(/done|success|完成/).first()).toBeVisible()
    await savedRun.getByRole('button', { name: /复制日志|copy log/i }).first().click()
    await expect(savedRun.getByRole('button', { name: /已复制|复制日志|copy log/i }).first()).toBeVisible()

    await savedRun.getByRole('button', { name: /导出日志/ }).click()
    const exported = await page.evaluate(() => (window as unknown as { __agentflowExports: Array<{ content: string; filename: string }> }).__agentflowExports[0])
    expect(exported.filename).toMatch(/\.md$/)
    expect(exported.content).toContain('E2E Agent')
    expect(exported.content).toContain('npm.cmd run test:e2e passed')
    expect(exported.content).not.toContain('sk-test-secret-1234567890')
  })

  test('has no serious browser errors on first run', async ({ page }) => {
    const collected = await page.locator('body').evaluate((body) => ({
      consoleErrors: JSON.parse(body.dataset.consoleErrors ?? '[]'),
      pageErrors: JSON.parse(body.dataset.pageErrors ?? '[]'),
      networkFailures: JSON.parse(body.dataset.networkFailures ?? '[]'),
    }))

    expect(collected.consoleErrors).toEqual([])
    expect(collected.pageErrors).toEqual([])
    expect(collected.networkFailures).toEqual([])
  })
})
