# LocalAI Nexus Build Plan Completion Audit

Date: 2026-05-13
Branch: `refactor-localai-nexus`
Scope: `docs/build-plans/` implementation audit against current source, UI, route, IPC, storage, tests, docs, and local verification.

## Conclusion

Not all build-plan tasks are complete.

This repository is not docs-only: the app has real Electron/React routes, main-process domain services, IPC/preload bridges, JSON storage collections, Gateway/API key controls, provider management, Agent/Workflow records, Shared Memory, audit/RBAC, and tests. However, every build-plan module is still only partially complete against its own final goal. The strongest local completion is `03 Local Gateway and API Keys`; the weakest is the global `00 Modular Refactor Master Plan`, because IPC, repository, route, audit, permission, and migration contracts are still concentrated in global files instead of fully registered per module.

The reason the app could look unchanged to a user is that prior plan work created detailed build plans and several backend/local capabilities, but the Dashboard did not explicitly expose build-plan implementation status and the sidebar module groups were still visually close to the old product surface. This round adds visible Dashboard status cards and localized sidebar module group labels so users can see the 8 build-plan modules and their honest completion state immediately after opening the app.

## Tool And Root Evidence

| Check | Result |
|---|---|
| Git root | `D:/LocalAI Nexus` from `git rev-parse --show-toplevel` |
| Branch | `refactor-localai-nexus` |
| Remote | `https://github.com/2195573507-web/LocalAI-Nexus.git` |
| Node | `v24.14.1` |
| npm | Plain `npm -v` is blocked by PowerShell execution policy; `npm.cmd -v` is `11.11.0` |
| GitHub tooling | Git is available; `gh` is not on PATH; no repo-local GitHub plugin directory was exposed |
| Browser tooling | Browser Use plugin is listed in the Codex session and its skill file is readable; project E2E/Playwright remains the primary automated UI proof |
| Skill check | `using-superpower` was not installed; `using-superpowers` was installed and read |
| Desktop shortcut | `C:\Users\至亲\Desktop\LocalAI Nexus.lnk` targets the current repo Electron binary and `dist-electron/main/index.js` entry |

## Completion Matrix

| 模块 | 计划目标 | 已落地文件 | UI是否可见 | 路由是否接入 | IPC/API是否实现 | 数据层是否实现 | 测试是否覆盖 | 完成度百分比 | 证据 | 问题 | 下一步 |
|---|---|---|---|---|---|---|---|---:|---|---|---|
| 00 Modular Refactor Master Plan | 建立长期可扩展的模块化架构，避免继续把 IPC、storage、route、permission、audit 堆在全局文件。 | `src/shared/moduleRegistry.ts`, `src/renderer/navigation/moduleGroups.tsx`, `src/renderer/components/Sidebar.tsx`, `tests/unit/moduleRegistry.test.ts` | 是。Dashboard 现在展示构建计划落地状态，Sidebar 按一级模块分组。 | 部分。导航配置集中，但 route registry 仍未完全模块化。 | 部分。IPC 权限表和 handlers 仍主要在 `src/main/ipc.ts`。 | 部分。JSON storage 集中在 `src/main/storage.ts`，缺少 per-module repository registry。 | 部分。模块 registry 有单测，完整迁移/contract 测试不足。 | 45 | 共享 registry 已列出 8 个模块、routes、IPC、permissions、audit、storage、tests；E2E 检查 Dashboard 状态可见。 | 模块边界未真正拆完，迁移 registry、route registry、repository registry、IPC contract registry 未完成。 | 先拆 `registerGatewayIpc()` / `registerProviderIpc()` 骨架和 repository registry，不改底层 JSON 策略。 |
| 01 Workspace and Project Center | 让用户从 Dashboard/Project Hub 进入 7 大模块，并管理项目、运行、健康和配置缺口。 | `src/renderer/routes/Dashboard.tsx`, `src/renderer/routes/Projects.tsx`, `src/renderer/routes/ProjectDetail.tsx`, `src/main/ipc.ts`, `src/main/storage.ts` | 是。Dashboard、Project Hub、项目详情可见；本轮新增构建状态卡片。 | 是。`/`, `/projects`, `/projects/:id`, `/settings`。 | 部分。`project:*` 和 config import/export 存在，但没有专用 `workspace:*` namespace。 | 部分。`projects`, `tasks`, `runs` 存在；workspace summary/onboarding state 尚不完整。 | 部分。E2E 覆盖新手路径和导航，缺少完整项目导入/导出 apply 测试。 | 78 | Dashboard quick start、Project CRUD shell、搜索/筛选/归档 UI、项目详情聚合已存在。 | 项目导入/导出、workspace summary provider、模板导入审计还不完整。 | 补 workspace summary IPC、项目导入预览/apply、项目模板 roundtrip 测试。 |
| 02 AI Resources and Model Providers | 安全管理多 Provider、模型能力、默认模型、路由策略和健康检查。 | `src/renderer/routes/ProviderHub.tsx`, `ModelRouter.tsx`, `RuntimeSwitcher.tsx`, `HealthMonitor.tsx`, `src/main/domain/provider/providerForwardService.ts`, `src/main/domain/health/healthService.ts`, `src/main/domain/router/modelRouter.ts` | 是。Provider Hub、Model Router、Runtime Switcher、Health Monitor 可见。 | 是。`/providers`, `/router`, `/runtime`, `/health`。 | 部分。Provider CRUD/test/active switch 存在；live model sync 和完整 capability matrix 未完成。 | 部分。`providerSettings`, `healthChecks`, `modelRoutes` 存在；key rotation/profile import apply 未完整。 | 部分。Provider/local service 测试存在，live credentialed smoke 需要用户 key。 | 72 | Provider preset、masked credential、connection diagnostic、active provider switch、router/health surfaces 已存在。 | 无凭据下不能证明真实 provider forwarding；模型同步、能力矩阵、key rotation 还缺。 | 增加 Provider import/apply UI、capability matrix、credentialed smoke 分层报告。 |
| 03 Local Gateway and API Keys | 生成本地 API Key，提供 OpenAI-compatible Gateway、策略控制、日志、usage、配置导入导出。 | `src/renderer/routes/LocalGateway.tsx`, `TokenCenter.tsx`, `src/main/domain/gateway/gatewayService.ts`, `gatewayKeyService.ts`, `src/shared/configPortability.ts`, `scripts/gateway-http-smoke.js` | 是。Local Gateway、Token Center、配置导入入口和 API Key 管理入口可见。 | 是。`/gateway`, `/tokens`。 | 大部分实现。`gateway:*`, key CRUD/reset/delete, restart, import preview/apply, export env/Codex/Claude, HTTP endpoints 已有；images/audio/batches 未完成。 | 大部分实现。`gatewayApiKeys`, `gatewayRequests`, `tokenUsage`, `tokenPolicies`；raw key 只 copy-once。 | 覆盖较强。`gatewayKeyService`, config portability, smoke, Gateway HTTP smoke。 | 90 | `/health`, `/v1/models`, `/v1/chat/completions`, `/v1/responses`, `/responses`, `/v1/messages`, `/v1/embeddings` 本地 smoke；key quota/rate/concurrency 单测；Gateway restart IPC/API 已接线。 | 真实 upstream streaming、credentialed forwarding、images/audio/batches 仍需凭据和更多适配。 | 强化 stream forwarding/cancellation、credentialed live smoke 和更多 endpoint adapters。 |
| 04 Agent Workflow and MCP | 创建 Agent/Workflow，绑定 Provider/Gateway/Prompt/Memory/MCP，运行并查看 trace、状态和恢复动作。 | `src/renderer/routes/AgentStudio.tsx`, `Workflows.tsx`, `Skills.tsx`, `PromptLab.tsx`, `src/main/mcpGateway.ts`, `src/core/workflowRuntime.ts`, `src/shared/agentCore.ts` | 是。Agent Studio、Workflow Studio、Skills、Prompt Lab 可见。 | 是。`/agents`, `/workflows`, `/skills`, `/prompts`。 | 部分。Agent/workflow CRUD/run controls/MCP allowlist evaluate 存在；外部工具发现和审批 modal 未完成。 | 部分。`agents`, `agentExecutions`, `workflows`, `workflowVersions`, `runEvents`, `mcpAllowlist` 存在。 | 部分。agentCore/workflowRuntime/mcpGateway 单测和 E2E demo path 覆盖。 | 70 | demo Agent 执行已持久化，Workflow template/run/control records 和 MCP allowlist evaluation 已有。 | 视觉画布、publish/rollback、外部 MCP tool discovery、高风险工具审批、Workflow import/export 未完成。 | 先补 tool approval contract 和 workflow publish/version rollback，再推进画布。 |
| 05 Knowledge Prompt and Memory | 把知识、Prompt、Memory 变成本地资产层，支持检索测试、导入导出和恢复上下文包。 | `src/renderer/routes/KnowledgeBase.tsx`, `SharedMemoryHub.tsx`, `PromptLab.tsx`, `src/main/domain/knowledge/knowledgeService.ts`, `src/main/domain/memory/contextPackService.ts`, `src/shared/promptVersioning.ts` | 是。Knowledge Base、Prompt Lab 和 Shared Memory 均可见。 | 是。`/knowledge`, `/memory`, `/prompts` 已接入。 | 部分。memory/prompt/knowledge assets summary、preview、retrieval IPC 存在；embedding provider binding 和完整 RAG rebuild 未完成。 | 部分。`memories`, `prompts`, `knowledgeDocuments` 存在；文档保存会持久化 chunk index、keywords、tags、tokenEstimate、asset graph、quality state。 | 部分。knowledgeService、memoryInjection、promptVersioning、smoke、E2E 均覆盖本地索引/检索边界。 | 76 | Prompt CRUD/versioning、Memory lifecycle/filter/context pack、Knowledge Base route、persistent local index、asset graph、quality state、redaction 已有。 | 文件上传、解析器、多文件批量导入、embedding provider binding、向量索引和完整 RAG rebuild 仍未完成。 | 增加文件上传/解析流水线、embedding provider binding、RAG rebuild/quality regression tests。 |
| 06 Observability Evaluation and Feedback | 查看 trace timeline、成本/延迟趋势、失败分类、评测、红队风险和反馈闭环。 | `src/renderer/routes/Diagnostics.tsx`, `LogAnalyzer.tsx`, `TokenCenter.tsx`, `src/main/domain/observability/observabilityService.ts`, `src/main/domain/usage/usageService.ts` | 是。Diagnostics、Log Analyzer、Token Center 可见；Diagnostics 展示 trace details、local eval dataset、red-team findings 和 report export。 | 是。`/diagnostics`, `/logs`, `/tokens`。 | 部分。observability report、trace detail、mock eval、usage summary/list、runEvents list 存在；eval dataset CRUD/red-team suite 未完成。 | 部分。`tokenUsage`, `gatewayRequests`, `runEvents`, `evaluationRuns`, `agentFeedback` 存在。 | 部分。observabilityService/local service/log analyzer 单测和 E2E export path 存在。 | 70 | usage summaries、diagnostics、log analyzer、mock evaluation dataset summary、redacted report/export、local red-team hints 已有。 | 独立 trace detail route、evaluation dataset CRUD、credentialed red-team suite、closed-loop feedback automation 未完成。 | 先补 trace detail drilldown 和 eval dataset CRUD，再接 Prompt/Memory/Gateway 反馈闭环。 |
| 07 Identity Security Audit and Ops | 所有高风险操作有权限、审计、脱敏和恢复路径；管理员可检查用户、角色、ACL、API Key 风险、备份和诊断。 | `src/renderer/routes/Login.tsx`, `AdminUsers.tsx`, `AdminAudit.tsx`, `SecurityCenter.tsx`, `Settings.tsx`, `src/main/auth.ts`, `rbac.ts`, `audit.ts`, `domain/ops/backupService.ts`, `secureStore.ts` | 是。登录、管理员、审计、安全中心、设置、Diagnostics restore apply 摘要可见。 | 是。`/security`, `/admin/users`, `/admin/audit`, `/settings`, `/diagnostics`。 | 部分。auth/user/audit/security/ops backup/restore preview/merge-only restore apply IPC 存在；migration runner 未完成。 | 部分。`users`, `sessions`, `auditLogs`, `settings` 存在；backup manifest、restore preview 和 merge-only restore apply summary 已接线。 | 部分。auth/audit/rbac/resourceAcl/secretRedaction/opsBackup 单测、smoke 和 auth E2E 存在。 | 80 | main-process permission guard、permission denied audit、audit hash/export、backup/restore preview、merge-only restore apply、theme/language persistence 已有。 | destructive/full restore、secret rotation、migration runner、crash/data repair、full diagnostics export workflow 仍未完成。 | 扩展 restore apply 的 checksum/explicit apply 负例、migration runner、crash/data repair。 |

## Visible Change Verification

| Check | Current result |
|---|---|
| Sidebar module grouping | Visible and config-driven via `src/renderer/navigation/moduleGroups.tsx`; this round localizes group labels to Chinese/English. |
| Dashboard module overview | This round adds `构建计划落地状态` with average completion, unfinished count, and 8 build-plan module cards. |
| Old entries reachable | Existing routes and aliases remain in `moduleGroups.tsx`: `/prompt-lab`, `/log-analyzer`, `/git-timeline`, `/safety-box`, `/shared-memory-hub`. |
| Language switch | i18n provider persists language; this round adds module group translations. |
| Theme | Theme provider keeps light/dark/system; Settings should not force override. |
| Font preference | Renderer font stack now prioritizes `KaiTi`, `STKaiti`, and `KaiTi_GB2312` before system fonts. |
| Gateway UI skeleton | Local Gateway already exposes API Key controls and this round verifies/import status in the build-plan registry; ccs/sub2api/cc-switch import preview/apply is present locally. |
| Shortcut | COM readback verified the desktop shortcut points to current repo Electron entry, not the old AgentFlowStudio path. |

## 2026-05-13 Follow-Up Source Status

This section supersedes the older completion percentages for modules 04, 05, 06, and 07 in the matrix above. The overall build-plan status is still **Partial**: these are local/source-verifiable capability gains, not full final-goal completion.

| Module | Latest local/source-verifiable capability | Completion | Still incomplete |
|---|---|---:|---|
| 04 Agent Workflow and MCP | Workflow publish/rollback versioning now has shared types, main-process service, IPC/preload/API wiring, Workflow Studio controls, unit tests, E2E mocks, and smoke coverage. | 76 | Visual workflow canvas, external MCP tool discovery, risky tool approval modal, Workflow import/export. |
| 05 Knowledge Prompt and Memory | Knowledge local file import now runs through a main-process dialog/read path, saves filename/extension/size source metadata, avoids renderer path arguments, and is covered by unit/API/E2E/smoke checks. | 80 | Embedding provider binding, persistent vector index, full RAG quality evaluation, multi-file parser adapters. |
| 06 Observability Evaluation and Feedback | Observability report, trace lookup, mock evaluation runs, local evaluation dataset list/delete, admin-audit permissions, redaction, UI, unit/API/E2E/smoke checks are implemented. | 78 | Credentialed red-team suite and closed-loop feedback automation. |
| 07 Identity Security Audit and Ops | Ops repair preview now returns preview-only checks/actions/warnings/errors, requires backup before future apply, records audit, and does not write storage, run migrations, execute scripts, or apply repair. | 84 | Repair apply, migration runner, secret rotation, destructive/full restore, full diagnostics export workflow. |

## Current Incomplete Modules By Priority

1. `00 Modular Refactor Master Plan` at 45%: module boundaries are documented and partially registered, but implementation remains centralized.
2. `02 AI Resources and Model Providers` at 72%: local Provider surfaces are real, but live sync/capability/key rotation need credentials and implementation.
3. `04 Agent Workflow and MCP` at 76%: publish/rollback/version history are real locally, but visual canvas, Workflow import/export, and external MCP approval are incomplete.
4. `06 Observability Evaluation and Feedback` at 78%: trace lookup and local dataset list/delete are real, but credentialed red-team and feedback automation remain.
5. `01 Workspace and Project Center` at 78%: project surfaces are real, but workspace import/apply and summary IPC need work.
6. `05 Knowledge Prompt and Memory` at 80%: local file import and local index metadata are real, but embedding/vector RAG and parser adapters remain.
7. `07 Identity Security Audit and Ops` at 84%: auth/RBAC/audit, restore preview/apply, and repair preview are real, but repair apply/migration tooling remains.
8. `03 Local Gateway and API Keys` at 90%: strongest local module; credentialed upstream streaming and additional endpoint adapters remain.

## Latest Verification Snapshot

| Check | Result |
|---|---:|
| `npm.cmd run typecheck` | PASS |
| `npm.cmd run test` | PASS, 34 files / 230 tests |
| `npm.cmd run smoke` | PASS, 239/239 |
| `npm.cmd run lint` | PASS, 0 errors / 21 existing warnings |
| `npm.cmd run scan:mojibake` | PASS, 182 files checked / 3 legacy docs allowlisted |
| `npm.cmd run build` | PASS |
| `npm.cmd run verify` | PASS, 143/143 plus smoke 239/239 |
| `npm.cmd run test:e2e` | PASS, 20/20 |
| `git diff --check` | PASS, CRLF normalization warnings only |

## Verification Policy

This audit treats a feature as implemented only when there is code-level evidence in at least one of these areas:

- A visible renderer route or component.
- A shared type, IPC channel, preload bridge, or renderer API wrapper.
- A main-process service, IPC handler, storage collection, or Gateway HTTP handler.
- A unit, smoke, E2E, or script-level test.
- Current docs that accurately state the implemented boundary.

Plan text alone does not count as implementation.
