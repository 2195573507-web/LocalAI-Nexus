# 03 Local Gateway and API Keys - 本地网关与 API Key 控制面

## 1. Module Name

- English: 03 Local Gateway and API Keys
- Chinese: 本地网关与 API Key 控制面
- Owner scope: 本地 OpenAI-compatible Gateway、API Key、权限范围、额度/速率/并发限制、日志、路由、fallback/retry、配置导入导出和接入命令。

## 2. Final Goal

构建目标：把 Local Gateway 建成 LocalAI Nexus 的核心控制面，让用户可以生成本地 API Key，并安全接入 Codex、Claude Code、本地应用或 OpenAI-compatible 客户端。

最终状态必须做到：用户知道 Base URL、API Key、endpoint、模型白名单、额度、调用日志、成本、风险提示和配置导出命令；Gateway 能以受控方式转发到 Provider 或返回明确诊断。

## 3. Product Positioning

Gateway 模块是 LocalAI Nexus 的运行核心。Provider 提供模型资源，Gateway 负责对外暴露 OpenAI-compatible API、认证本地 key、执行 key policy、记录 usage/audit，并把请求路由到 Provider/Router。

## 4. Current Status Assumptions

- 当前已有 `src/main/domain/gateway/gatewayService.ts` 和 LocalGateway 页面。
- 当前已验证 `/health`、`/v1/models`、`/v1/chat/completions`、`/v1/responses`、`/responses`、`/v1/messages` 的本地 smoke。
- 当前真实 upstream streaming、live provider forwarding、完整 quota enforcement 仍是后续工作。
- 当前 packaging 环境受 `winCodeSign` symlink 权限限制，但不影响 Gateway 源码验证。

## 5. Research Sources and Learning Targets

- LiteLLM: virtual keys、routing、rate limit、fallback、retry、load balancing、spend tracking、request logging。
- sub2api / ccs: API key 分发、quota、upstream auth、billing、request forwarding、配置导入。
- cc-switch: 多 profile、Claude Code settings.json 安全合并、配置切换。
- Open WebUI: API key、RBAC、endpoint restriction。
- OWASP LLM Top 10: key 泄露、过度代理、敏感信息泄露、审计。

## 6. User Value

- 用户可以一键生成本地 API Key 接入各种工具。
- 用户可以限制 key 的模型、endpoint、额度、速率和并发。
- 用户可以查看调用日志、token、成本、失败原因。
- 用户可以安全导入 ccs/sub2api/cc-switch 配置并导出 Codex/Claude Code 接入片段。

## 7. Functional Scope

构建功能：

- 本地 Gateway 启动/停止/重启、端口冲突检测、健康检查。
- Endpoints: `/v1/chat/completions`、`/v1/responses`、`/v1/models`、`/v1/embeddings`。
- 预留 images/audio/batches。
- API Key 生成、删除、禁用、重置、命名。
- API Key 权限范围、endpoint 白名单、模型白名单。
- 额度限制、速率限制、并发限制。
- Token/成本统计、调用日志、请求脱敏日志。
- 路由策略、fallback、retry、sticky session、load balancing。
- 流式转发、错误标准化、本地连通性测试。
- ccs/sub2api/cc-switch 配置导入。
- Claude Code settings.json 安全合并。
- Codex、Claude Code、OpenAI-compatible env 导出。
- PowerShell / Bash / CMD 接入命令复制。
- Key 泄露风险提示和权限最小化建议。
- 管理员面板。

## 8. Non-Functional Requirements

构建要求：

- 不在 renderer 持久化 raw gateway key。
- 请求/响应日志必须默认脱敏。
- Gateway 不能绕过 Provider credential store。
- 速率/额度/并发限制必须在 main/Gateway 层执行，不只在 UI 展示。
- root `/responses` 必须继续给 Base URL mismatch 指引，不返回无解释 404。
- 无 live credentials 时，live forwarding 标记 skipped 或 diagnostic，不假装完成。

## 9. Extension Interfaces

| Interface name | Purpose | Owner module | Input contract | Output contract | Permission requirement | Audit event requirement | Test requirement | Migration impact | Example future feature |
|---|---|---|---|---|---|---|---|---|---|
| GatewayKey | shared type extension point | Gateway | key policy fields | typed key policy | `gateway:key:read` | `gateway.key.changed` | schema test | 高 | project-scoped key |
| GatewayIpcContract | IPC extension point | Gateway | gateway request | response/error | action-specific | `gateway.ipc.called` | IPC test | 中 | key disable |
| GatewayService | main service extension point | Gateway | gateway command | service result | action-specific | gateway audit | unit test | 高 | stream forwarding |
| GatewayRepository | storage extension point | Gateway | key/log/policy record | persisted records | `gateway:write` | `gateway.persisted` | storage test | 高 | quota ledger |
| GatewayRoutePage | renderer page extension point | Gateway | route descriptor | page route | `gateway:read` | `route.changed` | E2E test | 低 | key detail page |
| useGatewayStatus | renderer hook extension point | Gateway | poll options | gateway state | `gateway:read` | none | hook test | 低 | port conflict banner |
| GatewayPermissionMap | permission extension point | Gateway | permission descriptor | permission map | admin writes | `permission.changed` | RBAC test | 高 | endpoint whitelist admin |
| GatewayAuditMap | audit event extension point | Gateway | event schema | event catalog | `audit:read` | self | audit test | 高 | key leak warning |
| GatewayTestFixtures | testing extension point | Gateway | fixture request | mock gateway data | none | none | fixture test | 低 | OpenAI-compatible fixture |
| GatewayImportExportAdapter | import/export extension point | Gateway | external config | validated config | `gateway:import` | `gateway.imported` | roundtrip test | 高 | ccs import |
| GatewayMigrationAdapter | migration extension point | Gateway | old policy schema | new policy schema | `system:migrate` | `migration.applied` | migration test | 高 | quota policy v2 |
| GatewayEndpointAdapter | plugin/provider adapter extension point | Gateway | normalized request | endpoint response | `gateway:invoke` | `gateway.request.completed` | adapter test | 中 | `/v1/embeddings` |

## 10. Data Model / Storage Requirements

- `GatewayApiKey`: id、name、keyHash、maskedKey、status、scopes、endpointWhitelist、modelWhitelist、quota、rateLimit、concurrencyLimit、createdAt、lastUsedAt。
- `GatewayUsageRecord`: keyId、providerId、model、endpoint、tokens、cost、latencyMs、status、errorCode、traceId。
- `GatewayRoutePolicy`: strategy、fallbacks、retry、stickySession、loadBalancing。
- raw key 只在创建时显示一次；之后只保存 hash/masked。

## 11. IPC / API Requirements

- `gateway:status`
- `gateway:start`
- `gateway:stop`
- `gateway:restart`
- `gateway:key:create`
- `gateway:key:disable`
- `gateway:key:delete`
- `gateway:key:reset`
- `gateway:key:list`
- `gateway:policy:update`
- `gateway:logs:list`
- `gateway:usage:summary`
- `gateway:importPreview`
- `gateway:importApply`
- `gateway:exportCodex`
- `gateway:exportClaudeCode`
- `gateway:exportEnv`

HTTP API:

- `GET /health`
- `GET /v1/models`
- `POST /v1/chat/completions`
- `POST /v1/responses`
- `POST /v1/embeddings`
- `POST /responses` diagnostic

## 12. UI / UX Requirements

- Local Gateway 首页显示 Base URL、`/v1` Base URL、端口、状态、测试按钮。
- API Key 列表显示 masked key、scope、quota、last used、risk level。
- Key 创建后只显示一次复制区，并提示保存。
- 提供 Codex / Claude Code / PowerShell / Bash / CMD 接入片段。
- 导入外部配置必须先显示 diff 和风险提示。

## 13. Security Requirements

- Gateway key 使用不可逆 hash 存储。
- Authorization header、Bearer、api_key、password、secret 必须脱敏。
- endpoint/model whitelist 默认最小权限。
- settings.json 合并前必须备份，不得静默覆盖。
- Key 泄露风险提示必须显示影响范围和撤销步骤。

## 14. Permission Requirements

- `gateway:read`
- `gateway:admin`
- `gateway:key:create`
- `gateway:key:disable`
- `gateway:key:delete`
- `gateway:key:reset`
- `gateway:policy:update`
- `gateway:logs:read`
- `gateway:config:import`
- `gateway:config:export`

## 15. Audit Requirements

- `gateway.started`
- `gateway.stopped`
- `gateway.key.created`
- `gateway.key.disabled`
- `gateway.key.deleted`
- `gateway.key.reset`
- `gateway.policy.updated`
- `gateway.request.completed`
- `gateway.request.denied`
- `gateway.config.imported`
- `gateway.config.exported`

## 16. Observability Requirements

- 每次请求产生 traceId。
- 记录 latency、tokens、cost、provider、model、endpoint、keyId、status、error category。
- Dashboard 和 Token Center 可读取 Gateway usage summary。
- 慢请求、限流、quota exceeded、provider fallback 必须可分类。

## 17. Migration Requirements

- 现有 Gateway diagnostic/mock 行为保留直到 live forwarding 验证完成。
- 新增 keyHash 不得破坏旧测试数据。
- settings.json 合并 adapter 必须 dry-run。
- 外部配置导入必须支持回滚。

## 18. Testing Requirements

- Unit: key hash、policy engine、rate/quota/concurrency、error normalizer。
- HTTP smoke: endpoints、auth denied、Base URL mismatch。
- IPC: key CRUD、policy update、权限拒绝。
- Security: raw key 不落日志、不落导出。
- E2E: 创建 key、复制接入命令、查看日志。
- Credentialed live smoke: 仅在用户提供 credentials 时运行。

## 19. Acceptance Criteria

验收标准：

- 用户能创建本地 API Key，并获得清晰 Base URL 与接入命令。
- Key 支持禁用、删除、重置、命名、scope、endpoint/model 白名单。
- Gateway 至少通过 credential-free HTTP smoke。
- 额度、速率、并发策略有单元测试和拒绝记录。
- 调用日志脱敏，usage summary 可被 Token Center/Observability 消费。
- ccs/sub2api/cc-switch/Claude Code/Codex 导入导出有 preview、merge、backup、audit。

## 20. Parallel Task Groups

- Group A: Gateway key policy、auth、repository。
- Group B: HTTP endpoints、forwarding、streaming、error normalization。
- Group C: LocalGateway UI、接入命令、import/export。
- Group D: tests、security checks、docs。

## 21. Implementation Phases

1. API Key schema、hash、policy engine。
2. Gateway auth middleware 和 endpoint whitelist。
3. Usage/cost/logging 接入。
4. Provider router forwarding 和 fallback/retry。
5. Streaming/cancellation。
6. import/export adapter。
7. UI 和测试闭环。

## 22. Deliverables

- Gateway key policy engine。
- Gateway HTTP middleware。
- API Key management UI。
- Import/export adapter。
- Usage/logging/audit integration。
- Unit/HTTP/E2E/security tests。
- Gateway smoke evidence。

## 23. Risks and Mitigations

- 风险：Key 泄露。规避：hash 存储、只显示一次、日志脱敏。
- 风险：把 live forwarding 当作 mock 验证。规避：credential-free 和 credentialed 明确分层。
- 风险：外部配置覆盖。规避：dry-run、diff、backup、apply。
- 风险：policy 只在 UI 生效。规避：Gateway middleware 强制执行。

## 24. Documentation Updates

- README Gateway 使用说明。
- `handoff/TEST_REPORT.md` Gateway smoke 和 live skipped 状态。
- `docs/LOCALAI_NEXUS_ARCHITECTURE.md` Gateway contract。
- `PROJECT_PROGRESS.md` Gateway 完成边界。

## 25. Git Commit and Push Requirements

- commit message 建议：`feat: add gateway api key control plane`
- 每轮只 stage Gateway 相关文件。
- commit 前至少跑 typecheck/test/build/verify 和 Gateway HTTP smoke。
- push 后记录 commit hash、remote ref、剩余 dirty 文件。

## 26. Next-Round Suggestions

Gateway 完成后推进 06 Observability：把 request log、trace、usage、cost、latency、failure category 接入统一评测和反馈闭环。
