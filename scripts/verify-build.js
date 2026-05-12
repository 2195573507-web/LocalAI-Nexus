import { existsSync, readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

let pass = 0
let fail = 0

function check(name, path) {
  const fullPath = resolve(root, path)
  if (existsSync(fullPath)) {
    console.log(`  PASS  ${name}`)
    pass++
    return true
  } else {
    console.log(`  FAIL  ${name} (missing: ${path})`)
    fail++
    return false
  }
}

function checkDir(name, path) {
  try {
    const fullPath = resolve(root, path)
    if (existsSync(fullPath)) {
      console.log(`  PASS  ${name}`)
      pass++
      return true
    }
  } catch {}
  console.log(`  FAIL  ${name} (missing dir: ${path})`)
  fail++
  return false
}

console.log('\nLocalAI Nexus - Build Verification\n')
console.log('=' .repeat(50))

console.log('\n[Core Files]')
check('package.json', 'package.json')
check('.gitignore', '.gitignore')
check('index.html', 'index.html')
check('vite.config.ts', 'vite.config.ts')
check('tsconfig.json', 'tsconfig.json')
check('tsconfig.node.json', 'tsconfig.node.json')
check('tailwind.config.ts', 'tailwind.config.ts')
check('postcss.config.js', 'postcss.config.js')

console.log('\n[Source - Main Process]')
check('main/index.ts', 'src/main/index.ts')
check('main/preload.ts', 'src/main/preload.ts')
check('main/ipc.ts', 'src/main/ipc.ts')
check('main/storage.ts', 'src/main/storage.ts')
check('main/git.ts', 'src/main/git.ts')
check('main/filesystem.ts', 'src/main/filesystem.ts')
check('main/shortcut.ts', 'src/main/shortcut.ts')
check('main/security.ts', 'src/main/security.ts')

console.log('\n[Source - LocalAI Nexus Domain Services]')
const domainServices = [
  'provider/providerForwardService',
  'gateway/gatewayService',
  'router/modelRouter',
  'usage/usageService',
  'usage/tokenPolicyService',
  'health/healthService',
  'runtime/runtimeProfileService',
  'skills/skillService',
  'security/securityReportService',
  'memory/contextPackService',
  'ecosystem/bundleRegistryService',
  'gateway/gatewayKeyService',
  'knowledge/knowledgeService',
  'observability/observabilityService',
  'ops/backupService',
]
for (const service of domainServices) {
  check(`domain/${service}`, `src/main/domain/${service}.ts`)
}

console.log('\n[Source - Renderer Core]')
check('renderer/main.tsx', 'src/renderer/main.tsx')
check('renderer/App.tsx', 'src/renderer/App.tsx')
check('renderer/styles.css', 'src/renderer/styles.css')

console.log('\n[Source - Renderer Pages]')
const pages = [
  'Dashboard', 'ProviderHub', 'TokenCenter', 'HealthMonitor', 'ModelRouter',
  'LocalGateway', 'RuntimeSwitcher', 'Diagnostics', 'AgentStudio',
  'SecurityCenter', 'Ecosystem', 'Projects', 'ProjectDetail', 'PromptLab',
  'LogAnalyzer', 'GitTimeline', 'SafetyBox', 'SharedMemoryHub', 'Skills',
  'Settings', 'Workflows'
]
for (const page of pages) {
  check(`page/${page}`, `src/renderer/routes/${page}.tsx`)
}

console.log('\n[Source - Renderer Components]')
const components = [
  'Layout', 'Sidebar', 'Topbar', 'SurfaceCard', 'Button', 'Input', 'Textarea',
  'Badge', 'Modal', 'EmptyState', 'StatCard', 'TaskBoard', 'PromptPreview',
  'RiskMeter', 'Charts'
]
for (const comp of components) {
  check(`component/${comp}`, `src/renderer/components/${comp}.tsx`)
}

console.log('\n[Source - Lib Files]')
const libs = [
  'types', 'api', 'utils', 'planner', 'templates', 'logAnalyzer',
  'safetyRules', 'memoryStore', 'memoryRetriever', 'memoryInjection',
  'secretRedaction', 'exporters'
]
for (const lib of libs) {
  check(`lib/${lib}`, `src/renderer/lib/${lib}.ts`)
}

console.log('\n[Source - Shared]')
check('shared/types', 'src/shared/types.ts')
check('shared/providerPresets', 'src/shared/providerPresets.ts')
check('shared/moduleRegistry', 'src/shared/moduleRegistry.ts')

console.log('\n[Skills]')
const skills = [
  'product-planner', 'ui-polisher', 'test-runner',
  'git-release-manager', 'safety-reviewer', 'memory-curator'
]
for (const skill of skills) {
  check(`skill/${skill}`, `.agents/skills/${skill}/SKILL.md`)
}

console.log('\n[Scripts]')
check('create-icon', 'scripts/create-icon.js')
check('create-shortcut', 'scripts/create-shortcut.ps1')
check('verify-build', 'scripts/verify-build.js')
check('smoke-test', 'scripts/smoke-test.js')
check('long-run-stability-test', 'scripts/long-run-stability-test.js')
check('electron-startup-smoke', 'scripts/electron-startup-smoke.js')
check('electron-auth-bridge-smoke', 'scripts/electron-auth-bridge-smoke.js')
check('gateway-http-smoke', 'scripts/gateway-http-smoke.js')

console.log('\n[Assets]')
check('icon.svg', 'assets/icon.svg')

console.log('\n[Tests]')
const tests = [
  'planner.test', 'templates.test', 'logAnalyzer.test', 'safetyRules.test',
  'exporters.test', 'memoryStore.test', 'memoryRetriever.test',
  'memoryInjection.test', 'secretRedaction.test', 'utils.test'
]
for (const test of tests) {
  check(`test/${test}`, `tests/unit/${test}.ts`)
}
check('e2e/app.spec', 'tests/e2e/app.spec.ts')
check('e2e/playwright.config', 'playwright.config.ts')
check('test/localaiNexusServices.test', 'tests/unit/localaiNexusServices.test.ts')
check('test/moduleRegistry.test', 'tests/unit/moduleRegistry.test.ts')
check('test/gatewayKeyService.test', 'tests/unit/gatewayKeyService.test.ts')
check('test/knowledgeService.test', 'tests/unit/knowledgeService.test.ts')
check('test/observabilityService.test', 'tests/unit/observabilityService.test.ts')
check('test/opsBackupService.test', 'tests/unit/opsBackupService.test.ts')

console.log('\n[Handoff Files]')
const handoffFiles = [
  'CODEX_HANDOFF', 'PROJECT_MEMORY', 'ARCHITECTURE', 'FILE_MAP',
  'TASK_STATUS', 'TEST_REPORT', 'NEXT_STEPS', 'CODEX_OPTIMIZE_PROMPT',
  'CURRENT_CONTEXT_FOR_ANY_MODEL'
]
for (const hf of handoffFiles) {
  check(`handoff/${hf}`, `handoff/${hf}.md`)
}

console.log('\n[Iteration Docs]')
check('docs/LOCALAI_NEXUS_ITERATION_PLAN', 'docs/LOCALAI_NEXUS_ITERATION_PLAN.md')
check('docs/LOCALAI_NEXUS_NEXT_ITERATION_PLAN', 'docs/LOCALAI_NEXUS_NEXT_ITERATION_PLAN.md')

console.log('\n[Package Scripts]')
try {
  const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf-8'))
  const requiredScripts = ['dev', 'build', 'dist', 'test', 'test:e2e', 'test:static-browser', 'test:gateway-http', 'typecheck', 'lint', 'format', 'icon', 'shortcut', 'verify', 'release']
  for (const script of requiredScripts) {
    if (pkg.scripts && pkg.scripts[script]) {
      console.log(`  PASS  script/${script}`)
      pass++
    } else {
      console.log(`  FAIL  script/${script} (missing in package.json)`)
      fail++
    }
  }
} catch (e) {
  console.log(`  FAIL  Cannot read package.json: ${e.message}`)
  fail++
}

console.log('\n' + '='.repeat(50))
console.log(`\nResults: ${pass} passed, ${fail} failed, ${pass + fail} total\n`)

if (fail > 0) {
  console.log('Some checks failed. Review the missing files above.')
  process.exit(1)
} else {
  console.log('All checks passed!')
  process.exit(0)
}
