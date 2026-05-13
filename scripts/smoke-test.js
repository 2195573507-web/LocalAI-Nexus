import { existsSync, readFileSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

let pass = 0
let fail = 0

function readText(path) {
  return readFileSync(resolve(root, path), 'utf8')
}

function check(name, condition, detail = '') {
  if (condition) {
    console.log(`  PASS  ${name}`)
    pass++
  } else {
    console.log(`  FAIL  ${name}${detail ? ` (${detail})` : ''}`)
    fail++
  }
}

function fileExists(path) {
  return existsSync(resolve(root, path))
}

console.log('\nLocalAI Nexus - Smoke Test\n')
console.log('='.repeat(50))

console.log('\n[Package Scripts]')
const pkg = JSON.parse(readText('package.json'))
const requiredScripts = ['typecheck', 'test', 'build', 'verify', 'smoke', 'test:e2e', 'test:static-browser', 'test:gateway-http']
for (const script of requiredScripts) {
  check(`script/${script}`, Boolean(pkg.scripts?.[script]))
}
check('script/test uses vite config', pkg.scripts?.test === 'vitest run --config vite.config.ts')
check('script/verify runs smoke', pkg.scripts?.verify?.includes('npm run smoke'))
check('script/scan:mojibake exists', Boolean(pkg.scripts?.['scan:mojibake']))

console.log('\n[Test Surface]')
const unitTests = [
  'planner',
  'templates',
  'theme',
  'logAnalyzer',
  'safetyRules',
  'exporters',
  'memoryStore',
  'memoryRetriever',
  'memoryInjection',
  'secretRedaction',
  'utils',
]
for (const testName of unitTests) {
  check(`unit/${testName}`, fileExists(`tests/unit/${testName}.test.ts`))
}
check('e2e/app.spec', fileExists('tests/e2e/app.spec.ts'))
check('e2e/playwright.config', fileExists('playwright.config.ts'))

const viteConfig = readText('vite.config.ts')
check('vitest includes unit tests', viteConfig.includes("include: ['tests/unit/**/*.test.ts']"))
check('vitest uses node environment', viteConfig.includes("environment: 'node'"))

console.log('\n[Core Application Files]')
const coreFiles = [
  'package.json',
  'src/main/index.ts',
  'src/main/preload.ts',
  'src/renderer/main.tsx',
  'src/renderer/App.tsx',
  'src/renderer/routes/Dashboard.tsx',
  'src/renderer/routes/ProviderHub.tsx',
  'src/renderer/routes/TokenCenter.tsx',
  'src/renderer/routes/HealthMonitor.tsx',
  'src/renderer/routes/ModelRouter.tsx',
  'src/renderer/routes/LocalGateway.tsx',
  'src/renderer/routes/RuntimeSwitcher.tsx',
  'src/renderer/routes/Diagnostics.tsx',
  'src/renderer/routes/AgentStudio.tsx',
  'src/renderer/routes/SecurityCenter.tsx',
  'src/renderer/routes/Ecosystem.tsx',
  'src/renderer/routes/Projects.tsx',
  'src/renderer/routes/ProjectDetail.tsx',
  'src/renderer/routes/PromptLab.tsx',
  'src/renderer/routes/LogAnalyzer.tsx',
  'src/renderer/routes/SafetyBox.tsx',
  'src/renderer/routes/SharedMemoryHub.tsx',
  'src/renderer/routes/Settings.tsx',
  'src/renderer/routes/Login.tsx',
  'src/renderer/routes/AdminUsers.tsx',
  'src/renderer/routes/AdminAudit.tsx',
  'src/renderer/components/ErrorBoundary.tsx',
  'src/renderer/lib/i18n.ts',
  'src/renderer/lib/theme.ts',
  'src/renderer/lib/auth.tsx',
  'src/renderer/lib/session.ts',
  'src/renderer/lib/permissions.ts',
  'src/renderer/lib/memoryInjection.ts',
  'src/renderer/lib/secretRedaction.ts',
]
for (const file of coreFiles) {
  check(file, fileExists(file))
}

console.log('\n[Launch Assets]')
check('assets/icon.ico', fileExists('assets/icon.ico'))
check('assets/icon.ico non-empty', fileExists('assets/icon.ico') && readFileSync(resolve(root, 'assets/icon.ico')).length > 128)
check('start-agentflow.bat', fileExists('start-agentflow.bat'))
check('start-agentflow-web.bat', fileExists('start-agentflow-web.bat'))
check('start-agentflow-static.bat', fileExists('start-agentflow-static.bat'))
check('scripts/create-shortcut.ps1', fileExists('scripts/create-shortcut.ps1'))
check('scripts/static-server.js', fileExists('scripts/static-server.js'))
check('scripts/launch-static-test.js', fileExists('scripts/launch-static-test.js'))
check('scripts/free-port.js', fileExists('scripts/free-port.js'))
check('static-app/index.html', fileExists('static-app/index.html'))
check('static-app/app.js', fileExists('static-app/app.js'))
check('static-app/styles.css', fileExists('static-app/styles.css'))
check('static-app/assets/icon.svg', fileExists('static-app/assets/icon.svg'))
const staticIndex = readText('static-app/index.html')
const staticApp = readText('static-app/app.js')
const staticText = `${staticIndex}\n${staticApp}`
const staticLauncher = readText('start-agentflow-static.bat')
const staticServer = readText('scripts/static-server.js')
const staticLaunchTest = readText('scripts/launch-static-test.js')
const freePort = readText('scripts/free-port.js')
const e2eRunner = readText('scripts/run-playwright-e2e.js')
const electronStartupSmoke = readText('scripts/electron-startup-smoke.js')
const playwrightConfig = readText('playwright.config.ts')
check('static launcher uses per-run launcher log', staticLauncher.includes('launcher-static-%LAUNCH_ID%.log'))
check('static launcher uses per-run server log', staticLauncher.includes('static-server-%LAUNCH_ID%.log'))
check('static launcher does not redirect server output to launcher log', !staticLauncher.includes('static-server.js" >> "%LAUNCHER_LOG%"'))
check('static launcher passes explicit root and port', staticLauncher.includes('"scripts\\static-server.js" "static-app" 4173'))
check('static server accepts bounded custom log path', staticServer.includes('AGENTFLOW_STATIC_LOG_PATH') && staticServer.includes('resolveProjectOwnedPath'))
check('static server requires launch token by default', staticServer.includes('agentflow_static_token') && staticServer.includes('AGENTFLOW_STATIC_LAUNCH_URL'))
check('static server blocks non-loopback host by default', staticServer.includes('AGENTFLOW_ALLOW_REMOTE') && staticServer.includes('Refusing non-loopback HOST'))
check('static server denies private static files', staticServer.includes('deniedExtensions') && staticServer.includes('.env.local'))
check('static server rejects roots outside project', staticServer.includes('isPathInsideBase(projectDir, resolved)') && staticServer.includes('拒绝项目目录外的静态根'))
check('static server validates real static root', staticServer.includes('fs.realpathSync(resolved)') && staticServer.includes('realpath 越界'))
check('static server emits stable URL marker', staticServer.includes('AGENTFLOW_STATIC_URL='))
check('static launch test uses isolated log path', staticLaunchTest.includes('static-server-test-') && staticLaunchTest.includes('AGENTFLOW_STATIC_LOG_PATH'))
check('static launch test parses stable URL marker', staticLaunchTest.includes('AGENTFLOW_STATIC_LAUNCH_URL='))
check('static launch test parses launch URL marker', staticLaunchTest.includes('AGENTFLOW_STATIC_LAUNCH_URL='))
check('free port reservation uses lock directories', freePort.includes('reserveFreePort') && freePort.includes('port-locks'))
check('e2e runner passes dynamic port', e2eRunner.includes('AGENTFLOW_E2E_PORT') && e2eRunner.includes('reserveFreePort(5173, 5199)'))
check('playwright avoids default external server reuse', playwrightConfig.includes("AGENTFLOW_E2E_REUSE_SERVER === '1'") && !playwrightConfig.includes('reuseExistingServer: true'))
check('playwright uses strict dynamic Vite port', playwrightConfig.includes('--strictPort') && playwrightConfig.includes('AGENTFLOW_E2E_BASE_URL'))
check('electron smoke uses separate port range', electronStartupSmoke.includes('reserveFreePort(5200, 5229)') && electronStartupSmoke.includes('AGENTFLOW_ELECTRON_SMOKE_PORT'))
check('gateway HTTP smoke covers embeddings', fileExists('scripts/gateway-http-smoke.js') && readText('scripts/gateway-http-smoke.js').includes('/v1/embeddings') && readText('scripts/gateway-http-smoke.js').includes('AGENTFLOW_GATEWAY_HTTP_SMOKE'))
for (const keyword of ['仪表盘', '项目管理', '项目详情', '提示词实验室', '日志分析', '安全检查', '共享记忆中心', '技能管理', 'Git 时间线', '设置', '界面偏好', '浅色', '深色', '跟随系统']) {
  check(`static-app localized/${keyword}`, staticText.includes(keyword))
}
for (const keyword of ['Dashboard', 'Projects', 'Project Detail', 'Prompt Lab', 'Log Analyzer', 'Safety Guard', 'Shared Memory', 'Skills', 'Git Timeline', 'Settings', 'Interface Preferences', 'Light', 'Dark', 'System']) {
  check(`static-app english/${keyword}`, staticText.includes(keyword))
}
check('static translations object exists', staticApp.includes('const translations'))
check('static translations zh exists', staticApp.includes('zh:'))
check('static translations en exists', staticApp.includes('en:'))
check('static t(key) exists', staticApp.includes('function t('))
check('static agentflow.language key exists', staticApp.includes('agentflow.language'))
check('static agentflow.theme key exists', staticApp.includes('agentflow.theme'))
const staticCss = readText('static-app/styles.css')
check('static data-theme exists', staticApp.includes('dataset.theme') || staticCss.includes('data-theme'))
check('static [data-theme="dark"] exists', staticCss.includes('[data-theme="dark"]'))
check('static [data-theme="light"] exists', staticCss.includes('[data-theme="light"]'))
check('static prefers-color-scheme exists', staticCss.includes('prefers-color-scheme'))
check('static shared memory injection marker exists', staticApp.includes('[Shared Memory Context]') && staticApp.includes('[/Shared Memory Context]'))
check('static inject shared memory label exists', staticApp.includes('Inject Shared Memory') && staticApp.includes('注入共享记忆'))
check('static secret redaction rules exist', ['sk-', 'Bearer', 'api[_-]?key', 'password', 'secret', 'access[_-]?token', 'refresh[_-]?token', 'authorization', 'token'].every((part) => staticApp.includes(part)))
check('static route error fallback exists', staticApp.includes('Static render error') && staticApp.includes('当前页面加载失败') && staticApp.includes('This page failed to load'))
check('static workflow lifecycle rail exists', ['Idea', 'Plan', 'Tasks', 'Prompt', 'Safety', 'Logs', 'Memory', 'Handoff'].every((keyword) => staticApp.includes(keyword)))
check('static next step CTA exists', staticApp.includes('下一步') && staticApp.includes('继续到'))
check('static flat surface token set exists', ['--panel', '--panel-muted', '--panel-hover', '--line', '--focus-ring'].every((keyword) => staticCss.includes(keyword)) && !staticCss.includes('--gla' + 'ss-') && !staticCss.includes('backdrop-filter'))

console.log('\n[Handoff]')
check('handoff/CODEX_HANDOFF.md', fileExists('handoff/CODEX_HANDOFF.md'))
check('handoff/TEST_REPORT.md', fileExists('handoff/TEST_REPORT.md'))
check('handoff/CURRENT_STATUS.md', fileExists('handoff/CURRENT_STATUS.md'))
check('handoff/TASK_BREAKDOWN.md', fileExists('handoff/TASK_BREAKDOWN.md'))
check('docs/excellent-project-learning.md', fileExists('docs/excellent-project-learning.md'))

console.log('\n[Electron Security]')
const main = readText('src/main/index.ts')
const preload = readText('src/main/preload.ts')
const security = readText('src/main/security.ts')
const mainIpc = readText('src/main/ipc.ts')
const sharedTypes = readText('src/shared/types.ts')
const rendererApi = readText('src/renderer/lib/api.ts')
const gatewayService = readText('src/main/domain/gateway/gatewayService.ts')
const providerForwardService = readText('src/main/domain/provider/providerForwardService.ts')
const routerService = readText('src/main/domain/router/modelRouter.ts')
const runtimeProfileService = readText('src/main/domain/runtime/runtimeProfileService.ts')
const configPortability = readText('src/shared/configPortability.ts')
const securityReportService = readText('src/main/domain/security/securityReportService.ts')
const contextPackService = readText('src/main/domain/memory/contextPackService.ts')
const tokenPolicyService = readText('src/main/domain/usage/tokenPolicyService.ts')
const bundleRegistryService = readText('src/main/domain/ecosystem/bundleRegistryService.ts')
const gatewayKeyService = readText('src/main/domain/gateway/gatewayKeyService.ts')
const usageService = readText('src/main/domain/usage/usageService.ts')
const backupService = readText('src/main/domain/ops/backupService.ts')
const knowledgeService = readText('src/main/domain/knowledge/knowledgeService.ts')
const moduleRegistry = readText('src/shared/moduleRegistry.ts')
check('contextIsolation enabled', main.includes('contextIsolation: true'))
check('nodeIntegration disabled', main.includes('nodeIntegration: false'))
check('preload uses contextBridge', preload.includes('contextBridge.exposeInMainWorld'))
check('preload uses ipcRenderer.invoke', preload.includes('ipcRenderer.invoke'))
check('no exec exposure in preload', !/child_process|exec\(|spawn\(/.test(preload))
check('demo seed avoids dangerous permission bypass', !main.includes('--dangerously-skip-permissions'))
check('external URLs are protocol checked', main.includes('isHttpUrl(url)') && main.includes('unsupported protocol'))
check('release status IPC is exposed through preload', preload.includes('RELEASE_STATUS') && preload.includes('release:'))
check('dev server URL is localhost-only', main.includes('normalizeDevServerUrl') && security.includes('isTrustedDevServerUrl'))
check('IPC handlers validate sender origin', mainIpc.includes('assertTrustedIpcSender') && mainIpc.includes('Blocked IPC call from untrusted origin'))
check('auth modules exist', ['src/main/auth.ts', 'src/main/session.ts', 'src/main/rbac.ts', 'src/main/audit.ts', 'src/shared/authTypes.ts', 'src/shared/auditTypes.ts'].every(fileExists))
check('auth IPC channels exposed through preload', preload.includes('AUTH_LOGIN') && preload.includes('USER_CREATE') && preload.includes('AUDIT_LIST'))
check('preload does not read auth token from localStorage', !preload.includes('agentflow.auth.session'))
check('renderer does not persist raw session token', !readText('src/renderer/lib/session.ts').includes('sessionToken: session.sessionToken'))
check('RBAC guard enforces channel permissions', mainIpc.includes('CHANNEL_PERMISSIONS') && mainIpc.includes('Permission denied') && mainIpc.includes('admin:users'))
check('must-change-password is enforced by IPC guard', mainIpc.includes('must_change_password') && mainIpc.includes('PASSWORD_CHANGE_ALLOWED'))
check('resource ACL helpers are present', mainIpc.includes('assertProjectResourceAccess') && readText('src/main/rbac.ts').includes('canAccessProjectResource'))
check('workflow ACL has dedicated IPC channels', mainIpc.includes('PROJECT_ACL_UPDATE') && preload.includes('updateAcl') && readText('src/renderer/routes/ProjectDetail.tsx').includes('Workflow access'))
check('MCP allowlist IPC exists', mainIpc.includes('MCP_ALLOWLIST_CHECK') && mainIpc.includes('mcp.allowlist.check'))
check('MCP runtime gateway enforces sandbox decision', fileExists('src/main/mcpGateway.ts') && mainIpc.includes('MCP_GATEWAY_EVALUATE') && readText('src/main/mcpGateway.ts').includes("commandExecution: 'denied'"))
check('default admin is hashed and must change password', readText('src/shared/authCore.ts').includes('123@admin.com') && readText('src/shared/authCore.ts').includes('mustChangePassword: true') && readText('src/shared/authCore.ts').includes('pbkdf2Sync'))
check('audit logging records permission denials', mainIpc.includes('permission.denied') && mainIpc.includes('recordAudit'))
check('audit hash chain exists', readText('src/main/audit.ts').includes('previousHash') && readText('src/shared/auditCore.ts').includes('computeAuditHash'))
check('audit export manifest checkpoint exists', readText('src/shared/auditCore.ts').includes('buildAuditExportManifest') && mainIpc.includes('manifest'))
check('durable secure store wrapper exists', fileExists('src/main/secureStore.ts') && readText('src/main/session.ts').includes('auth.activeSessionSecret') && mainIpc.includes('protectSecret(submittedApiKey'))
check('LocalAI Nexus IPC channels declared', [
  'GATEWAY_STATUS',
  'GATEWAY_START',
  'GATEWAY_STOP',
  'USAGE_SUMMARY',
  'TOKEN_POLICY_LIST',
  'TOKEN_POLICY_UPSERT',
  'TOKEN_POLICY_EVALUATE',
  'HEALTH_CHECK_PROVIDER',
  'RUNTIME_PROFILES_GENERATE',
  'ROUTER_DECISIONS_LIST',
  'SECURITY_REPORT_GENERATE',
  'CONTEXT_PACK_PREVIEW',
  'CONTEXT_RECOVERY_PACK',
  'TEMPLATE_BUNDLES_LIST',
  'TEMPLATE_BUNDLES_UPSERT',
  'TEMPLATE_BUNDLES_TOGGLE',
].every((keyword) => sharedTypes.includes(keyword)))
check('LocalAI Nexus IPC permissions declared', [
  'ROUTER_DECISIONS_LIST',
  'SECURITY_REPORT_GENERATE',
  'GATEWAY_KEY_CREATE',
  'GATEWAY_KEY_RESET',
  'OBSERVABILITY_REPORT_GENERATE',
  'KNOWLEDGE_ASSETS_SUMMARY',
  'KNOWLEDGE_DOCUMENT_PREVIEW',
  'OPS_BACKUP_PREVIEW',
  'OPS_RESTORE_APPLY',
  'CONTEXT_PACK_PREVIEW',
  'TEMPLATE_BUNDLES_LIST',
  'TEMPLATE_BUNDLES_UPSERT',
  'TEMPLATE_BUNDLES_TOGGLE',
].every((keyword) => mainIpc.includes(`IPC_CHANNELS.${keyword}`)))
check('Gateway and Ops use explicit permissions', mainIpc.includes("'gateway:write'") && mainIpc.includes("'gateway:read'") && mainIpc.includes("'ops:backup'") && mainIpc.includes("'ops:restore'"))
check('LocalAI Nexus preload bridge exposes domains', ['providers', 'gateway', 'usage', 'health', 'runtimeProfiles', 'router', 'security', 'observability', 'knowledge', 'ops', 'contextPack', 'templateBundles'].every((keyword) => preload.includes(`${keyword}:`)))
check('gateway forwards through provider service', gatewayService.includes('forwardProviderRequest') && gatewayService.includes('routeModel') && gatewayService.includes('recordUsage'))
check('gateway endpoint surface is complete', ['/health', '/v1/models', '/v1/chat/completions', '/v1/responses', '/responses', '/v1/messages', '/v1/embeddings'].every((endpoint) => gatewayService.includes(endpoint)))
check('gateway key control plane exists', ['gateway:key:create', 'gateway:key:reset', 'gateway:key:disable', 'gateway:key:delete', 'evaluateGatewayAccess'].every((keyword) => `${sharedTypes}\n${mainIpc}\n${gatewayService}`.includes(keyword)))
check('gateway key policy is enforced in main service', ['evaluateGatewayKeyPolicy', 'daily request quota', 'monthly request quota', 'rate limit', 'concurrency limit'].every((keyword) => gatewayKeyService.includes(keyword)) && gatewayService.includes('gateway_api_key_denied'))
check('gateway key requests are attributed in usage and logs', ['gatewayKeyId', 'gatewayMaskedKey'].every((keyword) => sharedTypes.includes(keyword) && usageService.includes(keyword) && gatewayService.includes(keyword)))
check('gateway active request lifecycle includes key id', tokenPolicyService.includes('gatewayKeyId') && gatewayService.includes('clearGatewayRequestActive(requestId)'))
check('gateway external config import preview merge backup audit exists', ['GATEWAY_IMPORT_PREVIEW', 'GATEWAY_IMPORT_APPLY', 'previewGatewayConfigImport', 'gateway.config.imported', 'backup', 'mergePlan'].every((keyword) => `${sharedTypes}\n${mainIpc}\n${preload}\n${rendererApi}\n${configPortability}`.includes(keyword)))
check('gateway external config adapters mention required sources', ['ccs', 'sub2api', 'cc-switch', 'claude-code', 'codex', 'openai-env'].every((keyword) => configPortability.includes(keyword) && readText('src/renderer/routes/LocalGateway.tsx').includes(keyword)))
check('gateway stream event path exists', gatewayService.includes('text/event-stream') && providerForwardService.includes('streamEvents') && providerForwardService.includes('content_delta'))
check('gateway parses upstream SSE and cancellation metadata', providerForwardService.includes('parseSseStream') && providerForwardService.includes('streamProtocol') && gatewayService.includes('req.once') && gatewayService.includes('cancelled'))
check('mock provider keeps CI-safe forwarding path', providerForwardService.includes('localai-mock') && providerForwardService.includes('mock://') && providerForwardService.includes('LocalAI Nexus mock provider'))
check('router records cooldown quota decisions', routerService.includes('quotaState') && routerService.includes('cooldown') && routerService.includes('quota_exhausted') && routerService.includes('modelRoutes'))
check('token policy service enforces quota cooldown concurrency', tokenPolicyService.includes('evaluateTokenPolicy') && tokenPolicyService.includes('concurrency_limited') && routerService.includes('evaluateTokenPolicy'))
check('runtime profiles include portable formats', ['env', 'json', 'toml', 'yaml', 'command', 'redaction'].every((keyword) => runtimeProfileService.includes(keyword)))
check('security report service is redacted', securityReportService.includes('secrets-redacted') && securityReportService.includes('providerRiskCount') && securityReportService.includes('externalUrlPolicy'))
check('context pack preview includes redacted sources', contextPackService.includes('sanitizeObject') && contextPackService.includes('staleMemoryCount') && contextPackService.includes('provider_trace'))
check('context recovery pack includes graph and trace ids', contextPackService.includes('buildRecoveryPack') && contextPackService.includes('relatedMemoryPairs') && contextPackService.includes('providerTraceIds') && contextPackService.includes('workflowRunIds'))
check('local template bundle registry is local-only', bundleRegistryService.includes('localOnly === false') && bundleRegistryService.includes('BUILTIN_TEMPLATE_BUNDLES') && bundleRegistryService.includes('toggleTemplateBundle'))
check('knowledge assets summary, preview, and retrieval IPC exist', ['KNOWLEDGE_ASSETS_SUMMARY', 'KNOWLEDGE_DOCUMENT_PREVIEW', 'KNOWLEDGE_RETRIEVAL_TEST', 'knowledgeDocuments'].every((keyword) => `${sharedTypes}\n${mainIpc}\n${knowledgeService}\n${moduleRegistry}`.includes(keyword)))
check('knowledge local index persists graph and quality metadata', ['persistent-index', 'assetGraph', 'qualityState', 'IndexedKnowledgeChunk', 'tokenEstimate', 'tags', 'keywords'].every((keyword) => knowledgeService.includes(keyword)))
check('observability report, trace detail, and mock eval IPC exist', ['OBSERVABILITY_REPORT_GENERATE', 'EVAL_MOCK_RUN', 'exportSummary', 'observability.report.generate'].every((keyword) => `${sharedTypes}\n${mainIpc}\n${readText('src/main/domain/observability/observabilityService.ts')}`.includes(keyword)))
check('ops backup, restore preview, and restore apply IPC exist', ['OPS_BACKUP_PREVIEW', 'OPS_BACKUP_CREATE', 'OPS_RESTORE_PREVIEW', 'OPS_RESTORE_APPLY', 'backupManifests'].every((keyword) => `${sharedTypes}\n${mainIpc}\n${moduleRegistry}`.includes(keyword)))
check('ops backup bundle is redacted, schema versioned, and explicit-apply guarded', ['schemaVersion', 'buildRedactedBundle', 'restoreRequiresPreview', 'applyToken', 'mergeMany', 'secrets-redacted'].every((keyword) => `${sharedTypes}\n${backupService}\n${readText('src/main/storage.ts')}`.includes(keyword)))
check('prompt append-only versions are preserved', sharedTypes.includes('PromptVersion') && mainIpc.includes('buildPromptVersion') && mainIpc.includes('versionCreated'))

console.log('\n[Shared Memory Safety]')
const secretRedaction = readText('src/renderer/lib/secretRedaction.ts')
const memoryInjection = readText('src/renderer/lib/memoryInjection.ts')
const sharedRedaction = readText('src/shared/secretRedaction.ts')
check('secret redaction module exists', secretRedaction.includes('redactSecrets'))
check('secret detection module exists', secretRedaction.includes('containsSecret'))
check('recursive redaction module exists', sharedRedaction.includes('sanitizeValue') && sharedRedaction.includes('WeakMap'))
check('secret redaction covers authorization/token', sharedRedaction.includes('authorization') && sharedRedaction.includes('token'))
check('generic storage IPC uses collection allowlist', mainIpc.includes('ALLOWED_STORAGE_COLLECTIONS') && mainIpc.includes('assertAllowedCollection(collection)'))
const allowedStorageBlock = mainIpc.slice(
  mainIpc.indexOf('const ALLOWED_STORAGE_COLLECTIONS'),
  mainIpc.indexOf('function assertAllowedCollection'),
)
check('generic storage IPC excludes providerSettings', !allowedStorageBlock.includes('providerSettings'))
check('provider list masks api keys', mainIpc.includes('maskProviderForRenderer') && mainIpc.includes('Saved key ending in'))
check('generated shared JS artifacts are removed', !fileExists('src/shared/types.js') && !fileExists('src/shared/types.js.map'))
check('export IPC sanitizes data', mainIpc.includes('JSON.stringify(sanitizeObject(data), null, 2)') && mainIpc.includes('sanitizeObject(content)'))
check('skill read is limited to SKILL.md under skills root', mainIpc.includes('resolveSkillReadPath') && mainIpc.includes('Only SKILL.md files can be read'))
check('skill read uses realpath guard', mainIpc.includes('sanitizeRealFilePath') && security.includes('fs.realpathSync'))
check('memory read paths sanitize legacy secrets', mainIpc.includes('return sanitizeObject(memory)') && mainIpc.includes('const all = sanitizeObject(scoped)'))
check('export paths use user chosen save validator', mainIpc.includes('validateUserChosenSavePath(result.filePath)'))
check('release status only reads project files', mainIpc.includes('readProjectText') && mainIpc.includes('CHANGELOG.md') && mainIpc.includes('handoff/TEST_REPORT.md'))
check('memory context marker exists', memoryInjection.includes('[Shared Memory Context]'))
check('memory context canonical sections exist', ['项目背景', '已做决策', '当前进度', '已知问题', '用户偏好', 'API Provider 注意事项'].every((keyword) => memoryInjection.includes(keyword)))
const appTsx = readText('src/renderer/App.tsx')
check('route ErrorBoundary wrapper exists', appTsx.includes('ErrorBoundary') && appTsx.includes('routeElement'))
check('LocalAI Nexus primary routes exist', ['/providers', '/tokens', '/health', '/router', '/gateway', '/runtime', '/diagnostics', '/agents', '/security', '/ecosystem', '/knowledge'].every((route) => appTsx.includes(`path="${route}"`)))

console.log('\n[Flat Surface UI]')
const rendererStyles = readText('src/renderer/styles.css')
const surfaceCard = readText('src/renderer/components/SurfaceCard.tsx')
const dashboard = readText('src/renderer/routes/Dashboard.tsx')
const sidebar = readText('src/renderer/components/Sidebar.tsx')
const navigationGroups = readText('src/renderer/navigation/moduleGroups.tsx')
const tailwindConfig = readText('tailwind.config.ts')
check('renderer flat surface token set exists', ['--surface', '--surface-muted', '--surface-hover', '--border', '--focus-ring'].every((keyword) => rendererStyles.includes(keyword)) && !rendererStyles.includes('--gla' + 'ss-') && !rendererStyles.includes('backdrop-filter'))
check('renderer SurfaceCard uses shared surface primitive', surfaceCard.includes('surface-card') && surfaceCard.includes('focus-ring'))
check('Tailwind accent palette supports used shades', ['400', '500', '600', '700'].every((shade) => tailwindConfig.includes(`${shade}:`)))
check('Dashboard Nexus first-run path exists', ['Provider', 'Gateway', 'Workflow', 'Prompt', 'Guard', 'Memory'].every((keyword) => dashboard.includes(keyword)))
check('Dashboard one-minute onboarding exists', dashboard.includes('ONE_MINUTE_STEPS') && dashboard.includes('/projects/onboarding-demo-project') && dashboard.includes('/workflows'))
check('Dashboard quick actions target beginner modules', ['/projects/onboarding-demo-project', '/agents', '/workflows', '/providers', '/runtime', '/memory'].every((route) => dashboard.includes(route)))
check('Sidebar includes Nexus IA modules', ['Provider Hub', 'Token Center', 'Health Monitor', 'Model Router', 'Local Gateway', 'Runtime Switcher', 'Diagnostics', 'Agent Studio', 'Security Center', 'Ecosystem', 'Knowledge Base'].every((label) => `${sidebar}\n${navigationGroups}`.includes(label)))
check('renderer API wraps Nexus domains', ['gateway:', 'usage:', 'health:', 'runtimeProfiles:', 'router:', 'security:', 'contextPack:', 'templateBundles:'].every((keyword) => rendererApi.includes(keyword)))

const promptLab = readText('src/renderer/routes/PromptLab.tsx')
const templates = readText('src/renderer/lib/templates.ts')
const gitTimeline = readText('src/renderer/routes/GitTimeline.tsx')
const safetyBox = readText('src/renderer/routes/SafetyBox.tsx')
const theme = readText('src/renderer/lib/theme.ts')
check('PromptLab workflow template mode exists', promptLab.includes('templateMode') && promptLab.includes('filterWorkflowTemplates'))
check('PromptLab beginner path exists', promptLab.includes('新手路径') || promptLab.includes('创建工作流'))
check('workflow template helpers exist', templates.includes('getWorkflowTemplateById') && templates.includes('getWorkflowTemplateTags'))
check('SafetyBox shows isolation warning', safetyBox.includes('isolationSuggested') && safetyBox.includes('建议在隔离环境中执行'))
check('theme helper writes data-theme metadata', theme.includes('dataset.theme') && theme.includes('dataset.themePreference') && theme.includes('matchMedia'))
check('GitTimeline release panel exists', gitTimeline.includes('release-status-panel') && gitTimeline.includes('GitHub 版本记录'))

console.log('\n' + '='.repeat(50))
console.log(`\nResults: ${pass} passed, ${fail} failed, ${pass + fail} total\n`)

if (fail > 0) {
  process.exit(1)
}

console.log('Smoke test passed.')
