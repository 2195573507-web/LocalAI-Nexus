# 02 AI Resources and Model Providers - AI 资源与模型供应商

## 1. Module Name

- English: 02 AI Resources and Model Providers
- Chinese: AI 资源与模型供应商
- Owner scope: Provider 管理、模型能力、密钥安全、连接测试、健康检查、profile、pricing、alias、adapter 和 provider import/export。

## 2. Final Goal

构建目标：让 LocalAI Nexus 能可靠管理多供应商模型资源，并为 Gateway、Agent、Workflow、Prompt、Evaluation 提供统一、可测试、可审计的模型能力来源。

该模块最终必须做到：用户能安全保存 provider key、测试连接、选择默认/备用模型、查看能力矩阵、配置成本字段，并把 provider profile 安全交给 Gateway 和 Runtime 使用。

## 3. Product Positioning

Provider 模块是模型资源层，不直接负责 API Key 分发、Gateway 转发、Workflow 执行或评测报告，但为这些模块提供 provider adapter、model capability、pricing、health 和 credential access。

## 4. Current Status Assumptions

- 当前已有 `src/main/domain/provider/`、`ProviderHub.tsx`、`providerPresets.ts`。
- 当前 provider key 已要求 main-process 控制和 renderer 脱敏展示。
- 当前 live provider 测试需要用户显式提供 credentials。
- 当前 Gateway 已有 mock/non-streaming 路径，真实 provider forwarding 仍是后续证明项。

## 5. Research Sources and Learning Targets

- LiteLLM: 学习 provider adapter、OpenAI-compatible config、model routing、retry/fallback、spend tracking。
- Dify model providers: 学习 workspace-level provider、model capability、provider setup UX。
- Open WebUI API keys/RBAC: 学习 provider/API key 权限和 endpoint restriction。
- cc-switch: 学习多 provider profile 切换、Claude Code settings 合并、配置导入导出。

## 6. User Value

- 用户可以统一管理 OpenAI-compatible、Anthropic-compatible、本地 Ollama 等模型资源。
- 用户能确认 provider 是否可用，避免 Gateway/Workflow 运行时才失败。
- 用户能看到模型能力、上下文长度、价格、流式/tool/vision/embedding 支持情况。
- 用户能安全切换 provider profile，不泄露 raw key。

## 7. Functional Scope

构建功能：

- 供应商 CRUD。
- Provider preset。
- API Base 与 API Key 加密保存。
- 密钥脱敏展示和密钥轮换。
- 模型列表和 capability matrix。
- 默认模型、备用模型、模型别名。
- 成本字段、token 价格、上下文长度。
- 支持流式输出、tool calling、vision、embedding 标记。
- 连接测试、健康检查、可用性监控。
- Provider profile 管理。
- Provider import/export。
- Provider error mapping。
- Local model / Ollama 预留。

## 8. Non-Functional Requirements

构建要求：

- raw API key 不得进入 renderer 持久化状态。
- Provider test 必须支持 credential-free mock 和 opt-in live 两种模式。
- Provider adapter 必须标准化错误，不把供应商原始敏感报文直接显示。
- 导入配置必须 merge，不得覆盖用户现有 provider。
- 所有 provider 变更必须审计。
- 不把 Gateway key policy 写入 Provider 模块。

## 9. Extension Interfaces

| Interface name | Purpose | Owner module | Input contract | Output contract | Permission requirement | Audit event requirement | Test requirement | Migration impact | Example future feature |
|---|---|---|---|---|---|---|---|---|---|
| ProviderSettings | shared type extension point | Provider | provider fields | typed provider | `provider:read` | `provider.changed` | schema test | 中 | Azure OpenAI |
| ProviderIpcContract | IPC extension point | Provider | provider request | response/error | action-specific | `provider.ipc.called` | IPC test | 中 | rotate key |
| ProviderService | main service extension point | Provider | command/query | service result | action-specific | provider audit | unit test | 中 | live model sync |
| ProviderRepository | storage extension point | Provider | provider record | persisted provider | `provider:write` | `provider.persisted` | storage test | 中 | profile versioning |
| ProviderHubRoute | renderer page extension point | Provider | route descriptor | page route | `provider:read` | `route.changed` | E2E test | 低 | pricing tab |
| useProviderHealth | renderer hook extension point | Provider | provider id | health state | `provider:read` | none | hook test | 低 | auto refresh health |
| ProviderPermissionMap | permission extension point | Provider | permission descriptor | permission map | admin writes | `permission.changed` | RBAC test | 中 | provider admin role |
| ProviderAuditMap | audit event extension point | Provider | event schema | event catalog | `audit:read` | self | audit test | 中 | secret rotation audit |
| ProviderTestFixtures | testing extension point | Provider | fixture request | provider fixtures | none | none | fixture test | 低 | mock provider matrix |
| ProviderImportExportAdapter | import/export extension point | Provider | config bundle | merge plan | `provider:import` | `provider.imported` | roundtrip test | 高 | cc-switch provider import |
| ProviderMigrationAdapter | migration extension point | Provider | old schema | new schema | `system:migrate` | `migration.applied` | migration test | 中 | capability schema v2 |
| ModelProviderAdapter | plugin/provider adapter extension point | Provider | normalized request | provider response | `provider:use` | `provider.adapter.used` | adapter contract | 中 | Ollama adapter |

## 10. Data Model / Storage Requirements

- `ProviderSettings`: id、name、type、apiBase、maskedApiKey、credentialRef、defaultModel、fallbackModels、profileId、status、createdAt、updatedAt。
- `ModelCapability`: modelId、providerId、contextLength、supportsStreaming、supportsToolCalling、supportsVision、supportsEmbedding、inputPrice、outputPrice。
- `ProviderHealth`: status、lastCheckedAt、latencyMs、errorCode、repairHint。
- raw key 只通过 `ProviderCredentialStore` 或 `SecretStore` 引用。

## 11. IPC / API Requirements

- `provider:list`
- `provider:create`
- `provider:update`
- `provider:delete`
- `provider:rotateKey`
- `provider:testConnection`
- `provider:syncModels`
- `provider:setActive`
- `provider:health:get`
- `provider:importPreview`
- `provider:importApply`
- `provider:export`

## 12. UI / UX Requirements

- Provider Hub 显示 provider card、状态、默认模型、masked key、最后测试结果。
- 模型能力矩阵支持筛选和对比。
- Key 输入必须有可见安全说明，但不展示 raw key。
- 连接测试区分 mock/local diagnostic 与 live credentialed test。
- 空状态引导用户添加第一个 OpenAI-compatible provider。

## 13. Security Requirements

- API key 使用安全存储或 main-process controlled sensitive field。
- 导出 provider 时默认只导出 masked key 和 credential requirement，不导出 raw key。
- live test 日志必须脱敏 Authorization、Bearer、api_key、password、secret。
- provider import 必须扫描 secrets 并显示风险。

## 14. Permission Requirements

- `provider:read`
- `provider:create`
- `provider:update`
- `provider:delete`
- `provider:rotate_key`
- `provider:test`
- `provider:import`
- `provider:export`
- `provider:set_active`

## 15. Audit Requirements

- `provider.created`
- `provider.updated`
- `provider.deleted`
- `provider.key.rotated`
- `provider.connection.tested`
- `provider.models.synced`
- `provider.profile.imported`
- `provider.profile.exported`

## 16. Observability Requirements

- 记录 provider health、latency、failure category、last success。
- 供 Gateway/Router 消费 provider availability。
- Provider test 需要 trace id，并可在 Diagnostics 中查看摘要。

## 17. Migration Requirements

- 现有 provider 数据字段必须向后兼容。
- 旧 preset 名称保留 alias。
- capability matrix 新字段必须有 fallback default。
- credentialRef 迁移必须 dry-run 并保留原 key 位置直到验证通过。

## 18. Testing Requirements

- Unit: provider schema、capability matrix、error normalizer、pricing calculator。
- IPC: CRUD、权限拒绝、key rotation、test connection。
- Security: raw key 不进入 renderer-visible state。
- E2E: 添加 provider、masked key、连接测试、模型选择。
- Build gates: typecheck/test/build/verify。

## 19. Acceptance Criteria

验收标准：

- 用户能添加、编辑、删除、测试 provider。
- Provider key 只脱敏显示，导出不包含 raw key。
- 模型能力矩阵至少覆盖 streaming、tool calling、vision、embedding、context length、pricing。
- Gateway/Router 能读取 active provider/profile 和 health。
- Provider import/export 有 preview、merge、audit 和测试。
- credential-free 测试通过；live 测试在无 credentials 时明确 skipped，不假装通过。

## 20. Parallel Task Groups

- Group A: Provider shared types、repository、credential store。
- Group B: Provider adapter、health check、error normalizer。
- Group C: Provider Hub UI、capability matrix、profile UX。
- Group D: tests、docs、handoff。

## 21. Implementation Phases

1. 固化 provider contract 和 credentialRef。
2. 完成 provider repository 和 adapter registry。
3. 增强 capability matrix 与 pricing。
4. 增强 import/export merge。
5. 增加 health/availability 给 Router/Gateway 使用。
6. 补齐测试和文档。

## 22. Deliverables

- Provider contract。
- Provider repository / credential store。
- ModelProviderAdapter。
- Provider Hub UI 更新。
- Provider import/export adapter。
- Unit/IPC/E2E/security tests。
- 文档和验证报告。

## 23. Risks and Mitigations

- 风险：API key 泄露。规避：main 控制、脱敏、导出红线测试。
- 风险：供应商错误格式不统一。规避：ProviderErrorNormalizer。
- 风险：live test 被误报为已验证。规避：无 credentials 时标记 skipped。
- 风险：导入覆盖配置。规避：preview + merge strategy。

## 24. Documentation Updates

- 更新 README Provider 状态。
- 更新 `handoff/ARCHITECTURE.md` Provider domain。
- 更新 `handoff/TEST_REPORT.md` live/skipped 边界。
- 更新 `PROJECT_PROGRESS.md` Provider 完成度。

## 25. Git Commit and Push Requirements

- commit message 建议：`feat: harden provider resources`
- 只 stage Provider 相关源码、测试、文档。
- commit 前跑 typecheck/test/build/verify，UI 变更加 test:e2e。
- push 后记录 commit hash 和 remote 状态。

## 26. Next-Round Suggestions

Provider 完成后进入 03 Gateway：把 provider adapter、health、capability、pricing 接入 API Key policy、routing、usage 和 request forwarding。
