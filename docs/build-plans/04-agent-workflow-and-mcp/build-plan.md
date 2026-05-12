# 04 Agent Workflow and MCP - Agent / Workflow / MCP 编排

## 1. Module Name

- English: 04 Agent Workflow and MCP
- Chinese: Agent / Workflow / MCP 编排
- Owner scope: Agent 注册、Workflow 画布、节点库、运行状态机、工具绑定、MCP server/tool、人工审批、运行历史、版本和调试。

## 2. Final Goal

构建目标：让 LocalAI Nexus 能安全编排 Agent、Workflow 和 MCP 工具调用，形成从模板创建、调试运行、人工确认、失败恢复到审计追踪的完整闭环。

最终状态必须做到：用户能创建 Agent/Workflow，绑定 Provider/Gateway/Prompt/Memory/MCP 工具，运行并看到 trace、状态、失败原因和可控恢复动作。

## 3. Product Positioning

Agent/Workflow/MCP 是编排层，负责把模型资源、Prompt、Memory、工具和人工审批组织成可执行流程。它不直接保存 provider key，不绕过 Gateway policy，不执行未经授权的本机命令。

## 4. Current Status Assumptions

- 当前已有 `AgentStudio.tsx`、`Workflows.tsx`、`Skills.tsx`、`PromptLab.tsx`。
- 当前已有 Agent/Workflow 执行记录、节点 trace、暂停/取消/重试/恢复记录。
- 当前真实外部 MCP/tool approval 仍需要后续 hardening。
- 当前不允许暴露 arbitrary command execution。

## 5. Research Sources and Learning Targets

- Dify Agent / Workflow / nodes: 学习 agent、workflow、knowledge/tool integration。
- Flowise / Langflow: 学习 visual builder、node schema、Agentflow/Chatflow。
- n8n executions: 学习 workflow execution、manual/production run、history、retry。
- OWASP LLM Top 10: 学习 excessive agency、insecure plugin design、human oversight。
- Langfuse/OpenTelemetry: 学习 trace 和 run timeline。

## 6. User Value

- 用户能把模型、Prompt、Memory 和工具串成可复用流程。
- 运行失败时能看到节点级原因和恢复建议。
- 高风险工具调用需要人工确认，降低误操作风险。
- Agent/Workflow 运行结果可被 Observability 和 Memory 反馈闭环使用。

## 7. Functional Scope

构建功能：

- Agent 注册、模板、角色定义、capability。
- 工具绑定和 tool execution policy。
- Workflow 画布、节点库、node schema、workflow schema。
- LLM、Prompt、HTTP、工具、条件、并行、循环、人工确认节点。
- 暂停/恢复、失败重试、运行队列。
- 草稿/发布、版本快照、回滚。
- 运行历史、debug mode、run state machine。
- MCP Server 注册、工具发现、工具白名单、沙箱策略、权限检查。
- Workflow 导入导出。
- Agent 模拟使用反馈。

## 8. Non-Functional Requirements

构建要求：

- 不允许 Workflow 节点直接执行任意 shell。
- 高风险工具/MCP 调用必须经过 policy 和人工确认。
- Workflow runtime 必须可恢复、可审计、可中断。
- 节点 schema 必须可版本化。
- UI 画布不能阻塞现有列表/详情功能；先实现可执行 schema，再逐步增强视觉画布。
- 每个 run 必须有 traceId。

## 9. Extension Interfaces

| Interface name | Purpose | Owner module | Input contract | Output contract | Permission requirement | Audit event requirement | Test requirement | Migration impact | Example future feature |
|---|---|---|---|---|---|---|---|---|---|
| AgentDefinition | shared type extension point | Agents | agent schema | typed agent | `agent:read` | `agent.changed` | schema test | 中 | reviewer agent |
| WorkflowIpcContract | IPC extension point | Agents | workflow request | response/error | action-specific | `workflow.ipc.called` | IPC test | 中 | publish workflow |
| WorkflowRuntimeService | main service extension point | Agents | run command | run result | `workflow:run` | `workflow.run.changed` | runtime test | 高 | queue runner |
| WorkflowRepository | storage extension point | Agents | agent/workflow/run | persisted records | `workflow:write` | `workflow.persisted` | storage test | 高 | version store |
| WorkflowRouteRegistry | renderer page extension point | Agents | route descriptor | route config | route permission | `route.changed` | E2E test | 低 | run detail page |
| useWorkflowRun | renderer hook extension point | Agents | run id | run state | `workflow:read` | none | hook test | 低 | live timeline |
| ToolPermissionAdapter | permission extension point | Agents | tool request | allow/deny | tool-specific | `tool.permission.checked` | policy test | 高 | file write approval |
| WorkflowAuditMap | audit event extension point | Agents | event schema | audit catalog | `audit:read` | self | audit test | 高 | risky tool denied |
| NodeTestHarness | testing extension point | Agents | node fixture | node result | none | none | node tests | 中 | LLM node mock |
| WorkflowImportExportAdapter | import/export extension point | Agents | workflow bundle | validated workflow | `workflow:import` | `workflow.imported` | roundtrip test | 高 | n8n-style import |
| WorkflowMigrationAdapter | migration extension point | Agents | old workflow schema | new schema | `system:migrate` | `migration.applied` | migration test | 高 | node schema v2 |
| McpToolRegistry | plugin/provider adapter extension point | Agents | MCP tool descriptor | tool adapter | `mcp:tool:use` | `mcp.tool.called` | sandbox test | 高 | filesystem MCP |

## 10. Data Model / Storage Requirements

- `Agent`: id、name、role、capabilities、providerProfileId、promptId、memoryScope、toolBindings、status。
- `Workflow`: id、name、version、draft/published、nodes、edges、permissions、createdAt、updatedAt。
- `WorkflowRun`: id、workflowId、status、traceId、nodeStates、startedAt、endedAt、errorSummary。
- `McpServer`: id、name、command/configRef、toolWhitelist、riskLevel、status。
- `ApprovalRequest`: id、runId、toolId、risk、status、approvedBy、expiresAt。

## 11. IPC / API Requirements

- `agent:list/create/update/delete`
- `agent:templates:list`
- `workflow:list/create/update/delete`
- `workflow:publish/rollback`
- `workflow:run/start/pause/resume/cancel/retryNode`
- `workflow:runs:list/detail`
- `mcp:servers:list/register/update/delete`
- `mcp:tools:discover`
- `mcp:tool:approve/deny`
- `workflow:importPreview/importApply/export`

## 12. UI / UX Requirements

- Agent Studio 支持模板、角色、能力、工具绑定和模拟反馈。
- Workflow Studio 支持列表、节点配置、运行历史、trace timeline。
- 风险工具调用必须弹出清晰审批信息：工具、输入摘要、影响范围、权限、过期时间。
- 失败状态必须显示下一步建议，而不是只显示错误堆栈。
- 初期可用结构化节点编辑器，画布增强逐步推进。

## 13. Security Requirements

- MCP 工具必须白名单。
- 工具输入输出必须脱敏记录。
- 高风险 tool action 默认 deny，除非 policy + user approval。
- Workflow 不得绕过 Gateway key/provider policy。
- 外部 URL/HTTP 节点必须限制危险协议和本地敏感地址访问。

## 14. Permission Requirements

- `agent:read/create/update/delete`
- `workflow:read/create/update/delete/publish/run/control`
- `mcp:server:read/register/update/delete`
- `mcp:tool:discover/use/approve`
- `tool:risky:approve`

## 15. Audit Requirements

- `agent.created`
- `agent.updated`
- `workflow.created`
- `workflow.published`
- `workflow.run.started`
- `workflow.run.paused`
- `workflow.run.cancelled`
- `workflow.node.failed`
- `mcp.server.registered`
- `mcp.tool.approved`
- `mcp.tool.denied`

## 16. Observability Requirements

- 每个 Agent/Workflow run 产生 traceId。
- 节点状态包含 started、running、waitingApproval、succeeded、failed、skipped、cancelled。
- 输出 token、latency、cost、tool calls、approval wait time。
- 运行失败分类进入 Diagnostics/Observability。

## 17. Migration Requirements

- 现有 workflowTypes 保持兼容。
- 新节点 schema 需要 version。
- 旧 run record 需要能在新 timeline 只读展示。
- MCP server 配置不得自动执行迁移命令，必须用户确认。

## 18. Testing Requirements

- Unit: state machine、node schema、tool permission、approval policy。
- IPC: run controls、权限拒绝、审批 approve/deny。
- E2E: 创建 demo Agent、运行 demo Workflow、查看失败指导。
- Security: 禁止 arbitrary command execution、危险工具默认拒绝。
- Integration: Gateway/Provider mock LLM node。

## 19. Acceptance Criteria

验收标准：

- 用户能创建 Agent 和 Workflow 并运行 mock/diagnostic 流程。
- run timeline 显示节点状态、traceId、失败原因和恢复操作。
- pause/cancel/retry/resume 由 main-process 控制并有审计记录。
- MCP 工具发现、白名单和审批策略有可测试 contract。
- 高风险工具调用默认不会无确认执行。
- typecheck/test/build/verify/E2E 通过。

## 20. Parallel Task Groups

- Group A: Agent/Workflow shared schema 和 repository。
- Group B: runtime state machine、run controls、approval policy。
- Group C: Agent/Workflow UI 和 run timeline。
- Group D: MCP registry、sandbox policy、tests。

## 21. Implementation Phases

1. 固化 Agent/Workflow/MCP shared contract。
2. 建立 state machine 和 repository。
3. 接入 run controls 和 audit。
4. 接入 MCP registry 和 tool whitelist。
5. 增强 UI timeline 和审批面板。
6. 补测试和文档。

## 22. Deliverables

- Agent/Workflow/MCP contract。
- Workflow runtime state machine。
- Run controls IPC。
- MCP tool policy。
- UI run timeline。
- Tests 和验证报告。

## 23. Risks and Mitigations

- 风险：工具调用过度代理。规避：policy + approval + audit。
- 风险：画布开发拖慢核心运行。规避：先 schema/runtime，再画布增强。
- 风险：MCP server 配置执行不安全。规避：注册和调用分离、默认 deny。
- 风险：run state 不可恢复。规避：状态机和 run record 持久化。

## 24. Documentation Updates

- 更新 `handoff/ARCHITECTURE.md` Agent/Workflow/MCP 边界。
- 更新 README Agent/Workflow 使用说明。
- 更新 `handoff/TEST_REPORT.md` run control 和 security 证据。
- 更新 `PROJECT_PROGRESS.md`。

## 25. Git Commit and Push Requirements

- commit message 建议：`feat: harden agent workflow controls`
- 每轮最多 stage Agent/Workflow/MCP 相关文件。
- commit 前跑 typecheck/test/build/verify，UI 变更加 E2E。
- push 后记录 remote 验证。

## 26. Next-Round Suggestions

完成基础 run control 后，进入 05 Knowledge/Prompt/Memory，把 Prompt 和 Memory 作为 Workflow 节点的受控输入，而不是在节点里散落读取逻辑。
