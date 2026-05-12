# 01 Workspace and Project Center - 工作区与项目中枢

## 1. Module Name

- English: 01 Workspace and Project Center
- Chinese: 工作区与项目中枢
- Owner scope: Dashboard、项目列表、项目详情、快速入口、新手配置、模块状态、项目模板、导入导出和项目级统计。

## 2. Final Goal

构建目标：把 Workspace 打造成 LocalAI Nexus 的日常入口，让新手打开后能在一分钟内知道“配置模型、创建 API Key、接入工具、运行 Agent/Workflow、查看结果”的下一步。

最终状态必须让用户无需阅读长文档，就能从 Dashboard 或 Project Hub 进入 7 大模块，并看到项目、运行、健康、待处理事项和配置缺口。

## 3. Product Positioning

Workspace 是 LocalAI Nexus 的控制台首页和项目组织中心，不负责实现 Gateway、Provider、Workflow、Memory 等深层能力，但负责把这些模块的状态、入口、模板和下一步动作聚合给用户。

## 4. Current Status Assumptions

- 当前已有 `src/renderer/routes/Dashboard.tsx`、`Projects.tsx`、`ProjectDetail.tsx`、`Settings.tsx`。
- 当前导航已按 Workspace、Models、Gateway、Agents、Memory、Security、Operations 分组。
- 当前已有一分种上手路径和部分中文新手引导。
- 项目数据仍使用 JSON storage。
- 项目级权限、项目导入导出、项目模板注册、模块健康卡片仍需要模块化计划后逐步增强。

## 5. Research Sources and Learning Targets

- Dify workspace: 学习 workspace-level provider、应用和知识库入口如何聚合。
- n8n workflows/executions: 学习运行历史、待处理任务和项目级入口。
- Flowise / Langflow: 学习 Chatflow/Agentflow 模板、快速创建和运行入口。
- Open WebUI admin/settings: 学习面向普通用户的配置和权限入口。

## 6. User Value

- 新手可以快速完成第一条可运行路径。
- 进阶用户可以用项目视角管理 Provider、Gateway Key、Agent、Workflow、Prompt、Memory 和评测结果。
- 用户能在首页看到系统健康、配置缺口、最近运行和下一步建议。

## 7. Functional Scope

构建功能：

- Dashboard 模块状态总览。
- 项目列表、项目详情、项目归档。
- 最近运行和运行结果入口。
- 快速入口：Provider、Gateway Key、Runtime、Agent、Workflow、Prompt、Memory、Security。
- 待处理事项：缺少 provider、未生成 gateway key、未验证 runtime、未跑 workflow、存在安全风险。
- 新手配置向导和首次启动引导。
- 项目模板、模板创建项目。
- 项目导入导出。
- 项目级统计：token、成本、运行次数、失败率、最近错误。
- 系统健康概览和模块状态卡片。

## 8. Non-Functional Requirements

构建要求：

- 页面必须保持紧凑、平面、桌面工具风格。
- 不能把 Provider/Gateway/Workflow 的业务逻辑写进 Dashboard。
- Dashboard 只消费各模块 summary provider。
- 所有数据页必须具备 loading、empty、error、data 状态。
- 最小 1024x680 下不得出现主要操作不可达。
- 项目导入导出不得覆盖用户现有数据，必须先预览、校验、确认。

## 9. Extension Interfaces

| Interface name | Purpose | Owner module | Input contract | Output contract | Permission requirement | Audit event requirement | Test requirement | Migration impact | Example future feature |
|---|---|---|---|---|---|---|---|---|---|
| WorkspaceProject | shared type extension point | Workspace | project fields | typed project | `workspace:project:read` | `workspace.project.changed` | schema test | 中 | 项目级预算 |
| WorkspaceIpcContract | IPC extension point | Workspace | IPC request | IPC response | action-specific | `workspace.ipc.called` | IPC test | 中 | 项目归档 |
| WorkspaceService | main service extension point | Workspace | command/query | service result | action-specific | service event | unit test | 中 | 项目模板创建 |
| ProjectRepository | storage extension point | Workspace | project record | persisted project | `workspace:project:write` | `workspace.project.persisted` | storage test | 中 | 项目导入 |
| WorkspaceRouteRegistry | renderer page extension point | Workspace | route descriptor | route config | route permission | `workspace.route.changed` | E2E nav test | 低 | 项目统计页 |
| useWorkspaceSummary | renderer hook extension point | Workspace | filters | summary state | read permission | none | hook test | 低 | 健康卡片 |
| WorkspacePermissionMap | permission extension point | Workspace | permission descriptor | permission map | admin writes | `permission.changed` | RBAC test | 中 | 项目级 ACL |
| WorkspaceAuditMap | audit event extension point | Workspace | event schema | audit catalog | `audit:read` | self | audit test | 中 | 项目导出 |
| WorkspaceTestFixtures | testing extension point | Workspace | fixture request | seeded data | none | none | fixture test | 低 | 新手项目 |
| WorkspaceImportExportAdapter | import/export extension point | Workspace | JSON bundle | validated bundle | `workspace:import` | `workspace.imported` | roundtrip test | 高 | 项目迁移包 |
| WorkspaceMigrationAdapter | migration extension point | Workspace | old project schema | new project schema | `system:migrate` | `migration.applied` | migration test | 高 | 项目 schema v2 |
| DashboardWidgetRegistry | plugin/provider adapter extension point | Workspace | widget descriptor | dashboard widget | widget permission | `dashboard.widget.used` | widget test | 低 | Gateway Key 风险卡 |

## 10. Data Model / Storage Requirements

- `Project` 需要包含 id、name、description、status、templateId、createdAt、updatedAt、archivedAt、owner、tags、linkedProviderIds、linkedGatewayKeyIds、linkedWorkflowIds。
- `ProjectRunSummary` 只保存摘要，不复制完整 Workflow trace。
- `OnboardingState` 记录每个 step 的状态、完成时间和跳过原因。
- `WorkspaceImportBundle` 必须包含 schemaVersion 和 redaction report。

## 11. IPC / API Requirements

- `workspace:projects:list`
- `workspace:projects:create`
- `workspace:projects:update`
- `workspace:projects:archive`
- `workspace:projects:importPreview`
- `workspace:projects:importApply`
- `workspace:projects:export`
- `workspace:summary:get`
- `workspace:onboarding:update`

每个 IPC 必须声明权限、错误码和审计事件。

## 12. UI / UX Requirements

- Dashboard 第一屏显示模块状态、下一步建议、最近运行、快速入口。
- Project Hub 支持筛选、归档、模板创建和空状态引导。
- Project Detail 聚合项目相关 Provider、Gateway、Workflow、Prompt、Memory 和运行记录。
- 操作按钮使用现有 Button，卡片使用 SurfaceCard，图标使用 lucide-react。
- 中文为主，保留 Provider、Gateway、Agent、Workflow、Prompt、Memory 等术语。

## 13. Security Requirements

- Dashboard 不显示 raw API key。
- 项目导出必须脱敏 provider key、gateway key、session token。
- 导入 bundle 必须扫描 secret，仅允许用户确认后写入安全存储。
- 项目级权限不能只靠 UI 隐藏，main 层必须校验。

## 14. Permission Requirements

- `workspace:project:read`
- `workspace:project:create`
- `workspace:project:update`
- `workspace:project:archive`
- `workspace:project:import`
- `workspace:project:export`
- `workspace:onboarding:update`
- `workspace:summary:read`

## 15. Audit Requirements

- `workspace.project.created`
- `workspace.project.updated`
- `workspace.project.archived`
- `workspace.project.import.previewed`
- `workspace.project.import.applied`
- `workspace.project.exported`
- `workspace.onboarding.step.completed`

审计日志必须包含 actor、projectId、operationId、result、redactionStatus。

## 16. Observability Requirements

- Workspace summary 需要记录数据加载失败、模块 summary provider 超时、导入导出失败。
- Dashboard 卡片需要显示 provider/gateway/workflow/security 的健康摘要。
- 项目统计需要显示 token、成本、错误率、最近运行时间。

## 17. Migration Requirements

- 保留当前 project JSON 数据结构读取兼容。
- 新字段必须有默认值。
- 项目导入导出 bundle 必须支持 schemaVersion。
- 迁移必须先 dry-run，输出影响记录数和备份路径。

## 18. Testing Requirements

- Unit: project repository、onboarding step、summary provider 聚合。
- IPC: 权限拒绝、导入预览、导出脱敏。
- E2E: 首次启动路径、空项目状态、创建模板项目、项目详情入口。
- Smoke: Dashboard 标记、导航入口和 1024x680 基本可用性。

## 19. Acceptance Criteria

验收标准：

- 新手从 Dashboard 能看到明确的一分钟路径。
- Project Hub 支持项目创建、空状态引导、归档和详情入口。
- Project Detail 能聚合至少 Provider、Gateway、Agent/Workflow、Prompt/Memory 的关联状态。
- 导入导出有预览、脱敏和审计记录。
- 所有 Workspace IPC 都有权限校验、错误码和测试。
- `npm.cmd run typecheck`、`npm.cmd run test`、`npm.cmd run build`、`npm.cmd run verify` 通过。

## 20. Parallel Task Groups

- Group A: Workspace shared types、repository、IPC。
- Group B: Dashboard/Projects/ProjectDetail UI。
- Group C: onboarding、template、quick actions。
- Group D: tests、smoke、handoff docs。

## 21. Implementation Phases

1. 建立 Workspace shared contract 和 repository。
2. 把 Dashboard summary 从硬编码改为 summary provider。
3. 补项目模板、归档、项目级统计。
4. 加项目导入导出预览和脱敏。
5. 补 E2E 和 smoke。
6. 更新文档并 commit/push。

## 22. Deliverables

- Workspace build implementation patch。
- Workspace IPC contract。
- Project repository 和 migration note。
- Dashboard/Projects/ProjectDetail UI 更新。
- Unit/E2E/smoke 测试。
- `handoff/TEST_REPORT.md` 和 `PROJECT_PROGRESS.md` 更新。

## 23. Risks and Mitigations

- 风险：Dashboard 变成业务逻辑垃圾场。规避：只消费 summary provider。
- 风险：项目导入覆盖用户数据。规避：preview + conflict report + explicit apply。
- 风险：新手路径过度营销化。规避：保持工具型入口和具体动作。
- 风险：项目级权限遗漏。规避：main 层强制 RBAC。

## 24. Documentation Updates

- 更新 `docs/build-plans/README.md` 状态。
- 更新 `PROJECT_PROGRESS.md` 的 Workspace 进度。
- 更新 `handoff/ARCHITECTURE.md` 的 Workspace contract。
- 更新 `handoff/TEST_REPORT.md` 的验证结果。

## 25. Git Commit and Push Requirements

- commit message 建议：`feat: improve workspace project center`
- 只 stage Workspace 相关源码、测试和文档。
- commit 前跑 typecheck/test/build/verify。
- push 后确认 `git status -sb`，记录剩余 dirty 文件是否无关。

## 26. Next-Round Suggestions

完成 Workspace 后，优先推进 02 Provider 与 03 Gateway，因为 Dashboard 的下一步建议需要真实 provider health、gateway key、runtime profile 和调用统计支撑。
