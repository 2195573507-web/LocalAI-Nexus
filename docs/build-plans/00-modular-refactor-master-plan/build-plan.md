# 00 Modular Refactor Master Plan - 模块化重构总计划

## 1. Module Name

- English: 00 Modular Refactor Master Plan
- Chinese: 模块化重构总计划
- Owner scope: 全项目模块边界、目录结构、IPC contract、shared contracts、权限、审计、导航、测试边界和迁移顺序。
- Priority: 最高。后续 01-07 业务模块计划必须以本计划定义的边界为准。

## 2. Final Goal

构建目标：把 LocalAI Nexus 从“功能已经可用但部分入口和契约仍集中在全局文件”的状态，演进为可长期扩展的模块化桌面应用架构。

最终状态必须做到：新增 Gateway、Provider、Workflow、Memory、Security、Observability 等能力时，优先接入模块 registry、shared contract、IPC contract、repository、permission 和 audit event，而不是继续堆到 `src/main/ipc.ts`、`src/main/storage.ts`、`src/renderer/App.tsx` 或页面文件里。

## 3. Product Positioning

本计划不直接新增业务功能，而是为 LocalAI Nexus 的本地 AI 控制面与本地网关管理平台建立工程边界。它服务于主路径：

```text
配置模型资源 -> 生成本地网关 API Key -> 接入 Codex / Claude Code / 本地应用
-> 编排 Agent / Workflow -> 追踪运行过程 -> 做安全审计与评测 -> 形成反馈闭环
```

## 4. Current Status Assumptions

- 当前仓库根目录为 `D:\LocalAI Nexus`。
- Electron + React + TypeScript + Vite + Tailwind 架构已存在。
- JSON storage、Shared Memory Hub、`window.agentflow`、`start-agentflow*.bat` 是兼容契约，未有迁移计划前不得删除。
- 当前 main 侧已有 `src/main/domain/provider`、`gateway`、`router`、`usage`、`health`、`runtime`、`skills`、`memory`、`security`、`ecosystem` 等领域目录。
- 当前 renderer 侧仍以 `src/renderer/routes/` 为主要页面目录，导航配置已在 `src/renderer/navigation/moduleGroups.tsx`。
- 当前 shared 侧已有 `src/shared/types.ts`、`workflowTypes.ts`、`agentCore.ts`、`auditTypes.ts` 等文件，但尚未按模块 contract 完整拆分。

## 5. Research Sources and Learning Targets

- LiteLLM / AI Gateway: 学习 gateway route、provider adapter、virtual key、usage/cost、fallback、rate limit 的模块边界。
- Dify: 学习 workspace、provider、agent、workflow、knowledge 的产品模块边界。
- Flowise / Langflow / n8n: 学习 node registry、workflow runtime、execution history、human-in-the-loop 的拆分方式。
- Open WebUI: 学习 RBAC、resource permission、API key 权限和 admin setting 的组织方式。
- Langfuse / OpenTelemetry / Promptfoo: 学习 trace、metrics、eval、report 的 observability contract。
- OWASP LLM Top 10 / NIST AI RMF: 学习权限最小化、审计、风险控制和安全默认值。

## 6. User Value

- 用户看到的是更稳定、更可持续的 LocalAI Nexus，而不是一次性大改后的不稳定版本。
- 后续新增功能时，页面、IPC、权限、审计、测试位置清晰。
- Codex / Claude Code / 本地应用接入、API Key、Gateway、Workflow、Memory、Security 能按模块演进。
- 每轮只改 1-2 个模块，降低现有功能回归风险。

## 7. Functional Scope

构建功能：

- 定义 `src/main/modules/` 或等价 main 模块边界。
- 定义 `src/renderer/modules/` 或等价 renderer 模块边界。
- 定义 `src/shared/contracts/`、`permissions/`、`audit/`、`errors/`、`constants/` 的拆分策略。
- 定义 `ModuleRegistry`、`IpcContractRegistry`、`PermissionRegistry`、`AuditEventRegistry`、`NavigationRegistry`、`RouteRegistry`、`StorageRepositoryRegistry`。
- 定义 Provider、Import/Export、Migration、TestFixture、Plugin 等 adapter registry。
- 制定旧 API 与兼容层迁移策略。
- 制定按模块拆分 IPC handler、preload bridge、repository、route、hook、test 的顺序。

## 8. Non-Functional Requirements

构建要求：

- 禁止一次性推倒重构。
- 每轮只动 1-2 个模块。
- 每轮必须保持桌面启动、快捷方式、主要路由和 Shared Memory Hub 可用。
- 不改变 JSON storage 策略，除非另有明确迁移批准。
- 不降低 Electron 安全边界：`contextIsolation: true`、`nodeIntegration: false`、native 能力只经 preload/IPC。
- 不暴露 arbitrary command execution。
- 所有路径以项目根目录相对路径书写。

## 9. Extension Interfaces

| Interface name | Purpose | Owner module | Input contract | Output contract | Permission requirement | Audit event requirement | Test requirement | Migration impact | Example future feature |
|---|---|---|---|---|---|---|---|---|---|
| ModuleRegistry | 注册模块元信息、依赖和状态 | shared/core | module descriptor | registered module map | `system:module:read` | `module.registered` | registry unit test | 中 | 启用 Observability 模块 |
| IpcContractRegistry | 按模块声明 IPC channel | shared/ipc | channel descriptor | typed channel map | channel-specific | `ipc.contract.changed` | IPC contract test | 中 | Gateway key policy IPC |
| PermissionRegistry | 统一权限点 | shared/permissions | permission descriptor | permission map | admin-only writes | `permission.changed` | RBAC regression | 高 | 新增 MCP 工具权限 |
| AuditEventRegistry | 统一审计事件 | shared/audit | audit event schema | event catalog | `audit:read` | `audit.event.registered` | audit schema test | 高 | Key rotation audit |
| NavigationRegistry | 统一导航配置 | renderer/navigation | module/nav descriptor | sidebar/route nav | `navigation:read` | `navigation.changed` | E2E nav test | 低 | 添加 Knowledge Base |
| RouteRegistry | 统一 route 配置 | renderer/core | route descriptor | route tree | route permission | `route.changed` | route smoke | 中 | Legacy alias migration |
| StorageRepositoryRegistry | 统一 repository 注册 | main/storage | repository descriptor | repository instance | repository-specific | `repository.changed` | storage compatibility | 高 | SQLite adapter 预留 |
| ProviderAdapterRegistry | 注册模型供应商 adapter | main/provider | adapter descriptor | provider adapter | `provider:manage` | `provider.adapter.changed` | provider test | 中 | Ollama adapter |
| ImportExportAdapterRegistry | 注册导入导出 adapter | shared/io | adapter descriptor | import/export handler | resource-specific | `import_export.used` | roundtrip test | 中 | cc-switch import |
| TestFixtureRegistry | 管理测试夹具 | tests/core | fixture descriptor | fixture data | none | none | fixture test | 低 | Gateway mock fixture |
| MigrationRegistry | 管理迁移脚本 | main/migration | migration descriptor | ordered migration plan | `system:migrate` | `migration.applied` | migration test | 高 | repository path migration |
| PluginRegistry | 插件和扩展入口 | shared/plugins | plugin descriptor | plugin manifest | plugin-specific | `plugin.changed` | plugin validation | 高 | 本地 skill bundle |

## 10. Data Model / Storage Requirements

- 当前 JSON storage 保持主存储策略。
- 计划期内先抽象 repository contract，不迁移底层格式。
- 每个 repository 必须定义 collection name、schema version、read/write API、redaction rule、backup/restore rule。
- 迁移必须通过 `MigrationRegistry` 排序执行，不能在页面或 IPC handler 内临时改数据结构。

## 11. IPC / API Requirements

- 将 IPC 拆分为模块注册函数，例如 `registerGatewayIpc()`、`registerProviderIpc()`、`registerWorkflowIpc()`。
- preload bridge 必须只暴露经过白名单的 typed API。
- IPC contract 必须定义 request、response、error code、permission、audit event。
- 旧 `window.agentflow` 名称保留为兼容层，内部可路由到新模块 API。

## 12. UI / UX Requirements

- 继续使用轻量平面桌面工具风格。
- 导航来源必须配置化，优先使用 `src/renderer/navigation/moduleGroups.tsx` 或后续 `NavigationRegistry`。
- 页面必须具备 loading、empty、error、data 状态。
- 每次重构后至少检查 1024x680 下核心页面不溢出。
- 不引入 Liquid Glass、重 blur 或复杂动效作为默认风格。

## 13. Security Requirements

- 保持 renderer 无 Node 权限。
- API key、provider key、session token 不得在 renderer 明文持久化。
- 所有外部路径必须走 sanitize。
- 导入导出必须做 secret redaction。
- 不允许新增通用 shell/exec IPC。

## 14. Permission Requirements

- 所有业务操作必须声明权限点。
- 权限点命名按 `module:resource:action`，例如 `gateway:key:create`。
- UI 可做显示控制，但最终授权必须在 main/IPC/service 层。
- 权限拒绝必须产生可审计记录。

## 15. Audit Requirements

- 每个模块必须定义 audit event map。
- API Key、provider credential、workflow run、MCP tool、memory export、security setting 的变更必须审计。
- 审计事件必须脱敏，不能写入 raw key。
- 审计事件 schema 需要 unit test 覆盖。

## 16. Observability Requirements

- 模块运行状态进入统一 health/status provider。
- Gateway、Provider、Workflow、Agent、Memory、Security 必须输出 trace id 或 operation id。
- 关键失败路径必须有 error code、category、repair hint。

## 17. Migration Requirements

- 先做目录和 contract 增量迁移，再迁移实现。
- 每轮迁移必须保留旧入口兼容。
- 每轮都要有 rollback note。
- 不迁移活跃用户数据结构，除非已有 migration、backup 和 restore 验证。

## 18. Testing Requirements

- `npm.cmd run typecheck`
- `npm.cmd run test`
- `npm.cmd run build`
- `npm.cmd run verify`
- 与导航或 UI 有关时加 `npm.cmd run test:e2e`
- 与 Electron/shortcut 有关时加 `npm.cmd run test:electron-startup`、`npm.cmd run test:electron-auth-bridge`、`npm.cmd run shortcut`
- 新增 IPC contract、permission、audit、repository 必须补单元测试。

## 19. Acceptance Criteria

验收标准：

- `docs/build-plans/00-modular-refactor-master-plan/build-plan.md` 存在并包含固定 26 个章节。
- 计划明确模块边界、目录结构、IPC、storage、shared contracts、权限、审计、导航、route、错误码和迁移顺序。
- 计划明确每轮只动 1-2 个模块，禁止一次性推倒。
- 计划明确兼容层和旧 API 废弃策略。
- 计划明确测试边界和每轮验证命令。
- 计划明确所有 extension interface 的输入、输出、权限、审计、测试和迁移影响。

## 20. Parallel Task Groups

- Group A: main 模块边界与 IPC contract。
- Group B: renderer 模块边界、导航和 route registry。
- Group C: shared contracts、permissions、audit、errors。
- Group D: storage/repository 和 migration registry。
- Group E: tests、fixtures、verification matrix。

每轮最多并行处理不冲突的 1-2 个模块；同一文件写入范围必须避免冲突。

## 21. Implementation Phases

1. 盘点当前 main、renderer、shared、tests、scripts 引用关系。
2. 建立 shared registry 和 contract 文件，但不迁移行为。
3. 先拆低风险模块，例如 navigation/route/test fixture。
4. 迁移 Provider/Gateway 等核心模块 IPC 注册。
5. 迁移 storage/repository contract。
6. 迁移 permission/audit/error code。
7. 清理旧兼容入口并保留明确 deprecation note。

## 22. Deliverables

- 模块边界图。
- 目标目录结构。
- registry contract 文档。
- 分轮迁移表。
- IPC / permission / audit / repository mapping。
- 测试矩阵。
- 每轮变更日志、commit 和 push 记录。

## 23. Risks and Mitigations

- 风险：一次性重构破坏现有桌面启动。规避：每轮只动 1-2 个模块，并跑启动/构建检查。
- 风险：旧 `window.agentflow` 调用断裂。规避：保留兼容桥接层并加 contract test。
- 风险：权限判断散落。规避：先建立 PermissionRegistry，再迁移业务模块。
- 风险：storage 迁移损坏数据。规避：先 repository 抽象，不改底层 JSON。

## 24. Documentation Updates

- 更新 `docs/build-plans/README.md`。
- 更新 `docs/LOCALAI_NEXUS_ARCHITECTURE.md` 的目标架构段。
- 更新 `handoff/ARCHITECTURE.md` 和 `handoff/NEXT_STEPS.md`。
- 每轮更新 `PROJECT_PROGRESS.md` 和 `handoff/TEST_REPORT.md`。

## 25. Git Commit and Push Requirements

- 每轮只 stage 本轮相关文件。
- 不提交无关 dirty 文件。
- 文档计划提交使用 `docs:`。
- 模块边界代码迁移使用 `refactor:`。
- 测试补充使用 `test:`。
- commit 前运行必要验证；push 后记录 remote 状态。

## 26. Next-Round Suggestions

下一轮优先执行：建立 shared registry skeleton、navigation/route registry 草案、IPC contract 命名规范。不要先迁移 Gateway 实现，先让 01-07 模块都有共同接入规则。
