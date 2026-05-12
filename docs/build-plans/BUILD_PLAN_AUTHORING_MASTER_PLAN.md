# LocalAI Nexus 构建计划编写总计划

## 1. Final Goal

最终目标是为 LocalAI Nexus 建立一套完整、可执行、可验收、可持续迭代的模块级构建计划体系。

LocalAI Nexus 的最终产品定位是：

一个本地 AI 控制面与本地网关管理平台，用于统一管理模型供应商、本地 OpenAI-compatible 网关、API Key、ccs/sub2api/cc-switch 配置导入导出、Codex / Claude Code / 本地应用接入、Agent、Workflow、MCP、知识库、Prompt、Memory、观测、评测、权限、安全审计和系统运维。

后续所有构建计划必须服务于这个最终主路径：

```text
配置模型资源
-> 生成本地网关 API Key
-> 接入 Codex / Claude Code / 本地应用
-> 编排 Agent / Workflow
-> 追踪运行过程
-> 做安全审计与评测
-> 形成反馈闭环
```

## 2. Required Strategy: Modular Refactor First

本项目后续必须重构，但禁止一次性全项目推倒重构。

必须采用：

* 先模块边界重构
* 再模块内部功能重构
* 每轮只动 1 到 2 个模块
* 每轮反复测试
* 每轮更新文档
* 每轮 commit
* 每轮 push

后续第一份详细计划必须是：

```text
docs/build-plans/00-modular-refactor-master-plan/build-plan.md
```

该计划负责定义全项目模块边界、目录结构、IPC 拆分、shared contracts、权限定义、审计事件、导航配置、测试边界和迁移顺序。

只有先完成 00 模块化重构总计划，后续 7 个功能模块的构建计划才不会互相冲突。

## 3. Research Sources and Learning Targets

后续模块构建计划必须明确学习来源，不允许闭门造车。

### 3.1 LiteLLM / AI Gateway

学习来源：

* https://docs.litellm.ai/docs/
* https://docs.litellm.ai/docs/providers/openai_compatible
* https://github.com/BerriAI/litellm

必须学习：

* OpenAI-compatible 统一入口
* 多供应商模型路由
* virtual API keys
* per-project budget
* spend tracking
* rate limiting
* retry
* fallback
* load balancing
* request logging
* gateway admin UI
* 统一模型调用格式

用于本项目：

* 03 本地网关与 API Key 控制面
* 02 AI 资源与模型供应商
* 06 观测 / 评测 / 反馈闭环

### 3.2 Sub2API / ccs / cc-switch

学习来源：

* https://github.com/Wei-Shaw/sub2api
* https://github.com/farion1231/cc-switch
* https://github.com/farion1231/cc-switch/blob/main/docs/user-manual/en/1-getting-started/1.5-settings.md

必须学习：

* API Key 分发
* API quota 管理
* upstream authentication
* billing / cost tracking
* load balancing
* request forwarding
* 多配置管理
* Claude Code 配置同步
* 配置导入导出
* settings.json 合并而不是覆盖
* 多 provider profile 切换

用于本项目：

* 03 本地网关与 API Key 控制面
* 07 身份权限 / 安全审计 / 系统运维
* 02 AI 资源与模型供应商

### 3.3 Dify

学习来源：

* https://docs.dify.ai/en/use-dify/workspace/model-providers
* https://docs.dify.ai/en/use-dify/build/agent
* https://docs.dify.ai/en/use-dify/nodes/agent
* https://docs.dify.ai/en/use-dify/knowledge/integrate-knowledge-within-application
* https://github.com/langgenius/dify

必须学习：

* workspace-level model providers
* Agent
* Workflow
* Knowledge Base
* RAG pipeline
* model management
* app prototype to production
* observability integration
* tool usage

用于本项目：

* 02 AI 资源与模型供应商
* 04 Agent / Workflow / MCP 编排
* 05 知识库 / Prompt / Memory 资产
* 06 观测 / 评测 / 反馈闭环

### 3.4 Flowise / Langflow / n8n

学习来源：

* https://flowiseai.com/
* https://github.com/flowiseai/flowise
* https://docs.n8n.io/workflows/executions/
* https://docs.n8n.io/hosting/

必须学习：

* visual builder
* modular nodes
* Agentflow
* Chatflow
* workflow executions
* manual execution
* production execution
* self-hosted workflow automation
* credential management
* execution history
* human-in-the-loop
* tracing
* evaluations
* API / CLI / SDK 接入

用于本项目：

* 04 Agent / Workflow / MCP 编排
* 06 观测 / 评测 / 反馈闭环
* 01 工作区与项目中枢

### 3.5 Open WebUI

学习来源：

* https://docs.openwebui.com/features/authentication-access/rbac/
* https://docs.openwebui.com/features/authentication-access/rbac/permissions/
* https://docs.openwebui.com/features/authentication-access/api-keys/
* https://docs.openwebui.com/reference/api-endpoints/

必须学习：

* RBAC
* group permissions
* feature permissions
* resource permissions
* API keys
* endpoint restrictions
* permission inheritance
* admin settings
* user management

用于本项目：

* 07 身份权限 / 安全审计 / 系统运维
* 03 本地网关与 API Key 控制面
* 02 AI 资源与模型供应商

### 3.6 Langfuse / OpenTelemetry / Promptfoo / Phoenix

学习来源：

* https://langfuse.com/
* https://langfuse.com/docs
* https://langfuse.com/docs/observability/overview
* https://opentelemetry.io/
* https://www.promptfoo.dev/docs/intro/
* https://www.promptfoo.dev/docs/red-team/
* https://www.promptfoo.dev/docs/integrations/ci-cd/

必须学习：

* traces
* metrics
* logs
* prompt management
* datasets
* evaluations
* LLM-as-judge
* cost tracking
* latency tracking
* red teaming
* vulnerability scanning
* CI/CD eval
* model comparison
* regression testing

用于本项目：

* 06 观测 / 评测 / 反馈闭环
* 04 Agent / Workflow / MCP 编排
* 03 本地网关与 API Key 控制面

### 3.7 OWASP LLM Top 10 / NIST AI RMF

学习来源：

* https://owasp.org/www-project-top-10-for-large-language-model-applications/
* https://owasp.org/www-project-top-10-for-large-language-model-applications/assets/PDF/OWASP-Top-10-for-LLMs-v2025.pdf
* https://www.nist.gov/itl/ai-risk-management-framework

必须学习：

* prompt injection
* sensitive information disclosure
* insecure plugin design
* excessive agency
* supply chain risk
* model behavior governance
* auditability
* least privilege
* risk controls
* human oversight

用于本项目：

* 07 身份权限 / 安全审计 / 系统运维
* 04 Agent / Workflow / MCP 编排
* 03 本地网关与 API Key 控制面
* 06 观测 / 评测 / 反馈闭环

## 4. Required Plan Units

后续必须写 8 个独立计划单元。

### 00. Modular Refactor Master Plan

中文名称：模块化重构总计划。

这是最高优先级计划。

必须覆盖：

* 全项目模块边界
* main modules 目录规划
* renderer modules 目录规划
* shared contracts 目录规划
* IPC contract 拆分
* storage/repository 拆分
* permissions map 统一
* audit event map 统一
* navigation config 统一
* route config 统一
* error code 统一
* migration strategy
* compatibility layer
* old API deprecation strategy
* test boundary
* 每轮只动 1 到 2 个模块
* 不一次性推倒
* 不破坏当前功能
* 每轮 commit/push
* 桌面快捷方式保持可用

必须预留扩展接口：

* ModuleRegistry
* IpcContractRegistry
* PermissionRegistry
* AuditEventRegistry
* NavigationRegistry
* RouteRegistry
* StorageRepositoryRegistry
* ProviderAdapterRegistry
* ImportExportAdapterRegistry
* TestFixtureRegistry
* MigrationRegistry
* PluginRegistry

### 01. Workspace and Project Center

中文名称：工作区与项目中枢。

必须覆盖：

* Dashboard
* 项目列表
* 项目详情
* 最近运行
* 快速入口
* 状态卡片
* 待处理事项
* 新手配置向导
* 7 大模块导航
* 项目模板
* 项目归档
* 项目导入导出
* 项目级权限
* 项目级统计
* 系统健康概览
* 用户操作主路径
* 模块状态概览
* 首次启动引导
* 空状态引导
* 失败状态引导

必须预留扩展接口：

* DashboardWidgetRegistry
* ProjectTemplateRegistry
* QuickActionRegistry
* OnboardingStepRegistry
* WorkspaceImportExportAdapter
* ProjectSummaryProvider
* ModuleHealthCardProvider

### 02. AI Resources and Model Providers

中文名称：AI 资源与模型供应商。

必须覆盖：

* 供应商管理
* 模型列表
* 模型能力标签
* API Base
* API Key 加密保存
* 密钥脱敏展示
* 连接测试
* 健康检查
* 默认模型
* 备用模型
* 模型别名
* 成本字段
* Token 价格
* 上下文长度
* 是否支持流式输出
* 是否支持 tool calling
* 是否支持视觉输入
* 是否支持 embedding
* 本地模型 / Ollama 预留
* 供应商导入导出
* 密钥轮换
* 供应商可用性监控
* provider profile
* model capability matrix
* provider adapter
* provider test request
* provider error mapping

必须预留扩展接口：

* ModelProviderAdapter
* ModelCapabilityRegistry
* ProviderCredentialStore
* ProviderHealthCheckAdapter
* ProviderImportExportAdapter
* ModelPricingRegistry
* ModelAliasResolver
* ProviderErrorNormalizer
* LocalModelAdapter
* ProviderMigrationAdapter

### 03. Local Gateway and API Keys

中文名称：本地网关与 API Key 控制面。

这是核心模块，必须优先写得最完整。

必须覆盖：

* 本地 OpenAI-compatible 网关
* /v1/chat/completions
* /v1/responses
* /v1/models
* /v1/embeddings
* 后续 images/audio/batches 预留
* API Key 生成
* API Key 删除
* API Key 禁用
* API Key 重置
* API Key 命名
* API Key 权限范围
* API Key endpoint 白名单
* 模型白名单
* endpoint 白名单
* 额度限制
* 速率限制
* 并发限制
* Token 统计
* 成本统计
* 调用日志
* 路由策略
* fallback 策略
* retry 策略
* 多供应商转发
* sticky session
* load balancing
* 流式转发
* 错误标准化
* 请求重试
* 本地连通性测试
* ccs 配置一键导入
* sub2api 风格配置导入
* cc-switch 配置导入
* Claude Code settings.json 安全合并
* 一键导出 Claude Code 配置
* 一键导出 Codex 配置
* 一键导出 OpenAI-compatible 环境变量
* 复制 PowerShell / Bash / CMD 接入命令
* API Key 使用报告
* Key 泄露风险提示
* Key 权限最小化建议
* 网关启动 / 停止 / 重启
* 网关端口冲突检测
* 网关健康检查
* 请求脱敏日志
* 管理员面板

必须预留扩展接口：

* GatewayRouteRegistry
* GatewayEndpointAdapter
* ApiKeyPolicyEngine
* RateLimitProvider
* QuotaProvider
* GatewayRouter
* GatewayFallbackStrategy
* GatewayRetryStrategy
* GatewayRequestLogger
* GatewayMetricsCollector
* GatewayAuthProvider
* GatewayImportAdapter
* GatewayExportAdapter
* CcsConfigAdapter
* Sub2ApiConfigAdapter
* CcSwitchConfigAdapter
* CodexConfigExportAdapter
* ClaudeCodeConfigExportAdapter
* GatewayMiddlewareRegistry
* GatewayGuardrailAdapter
* GatewayErrorNormalizer
* GatewayMigrationAdapter

### 04. Agent Workflow and MCP

中文名称：Agent / Workflow / MCP 编排。

必须覆盖：

* Agent 注册
* Agent 模板
* Agent 角色定义
* Agent capability
* 工具绑定
* Workflow 画布
* 节点库
* LLM 节点
* Prompt 节点
* HTTP 节点
* 工具节点
* 条件分支
* 并行分支
* 循环
* 人工确认
* 暂停 / 恢复
* 失败重试
* 运行队列
* 版本快照
* 草稿 / 发布
* 回滚
* 运行历史
* MCP Server 注册
* MCP 工具发现
* MCP 工具白名单
* MCP 工具调用沙箱
* MCP 权限检查
* Workflow 导入导出
* Agent 模拟使用反馈
* node schema
* workflow schema
* run state machine
* approval policy
* tool execution policy
* workflow debug mode

必须预留扩展接口：

* AgentRegistry
* AgentTemplateRegistry
* WorkflowNodeRegistry
* WorkflowRuntimeAdapter
* WorkflowStateMachine
* ToolBindingRegistry
* HumanApprovalProvider
* McpServerRegistry
* McpToolRegistry
* McpSandboxPolicy
* WorkflowImportExportAdapter
* AgentFeedbackCollector
* WorkflowVersionStore
* WorkflowMigrationAdapter
* NodeTestHarness
* ToolPermissionAdapter

### 05. Knowledge Prompt and Memory

中文名称：知识库 / Prompt / Memory 资产。

必须覆盖：

* 知识库
* 文件上传
* 文档解析
* 分块策略
* 索引
* 检索测试
* RAG 配置
* 数据源管理
* Prompt 模板
* Prompt 变量
* Prompt 版本
* Prompt 对比
* Prompt 测试
* Memory 条目
* 项目记忆
* 长期记忆
* 资产标签
* 资产引用关系
* 敏感内容脱敏
* 资产导入导出
* 废弃版本归档
* 知识库质量评估
* embedding provider binding
* retriever adapter
* rerank 预留
* prompt dataset 预留
* memory scope
* memory lifecycle

必须预留扩展接口：

* DocumentParserAdapter
* ChunkingStrategyRegistry
* EmbeddingProviderAdapter
* VectorStoreAdapter
* RetrieverAdapter
* RerankerAdapter
* PromptTemplateRegistry
* PromptVersionStore
* PromptTestHarness
* MemoryStore
* MemoryScopePolicy
* AssetImportExportAdapter
* SensitiveDataRedactor
* KnowledgeQualityEvaluator
* KnowledgeMigrationAdapter

### 06. Observability Evaluation and Feedback

中文名称：观测 / 评测 / 反馈闭环。

必须覆盖：

* Trace 时间线
* 请求日志
* Workflow run timeline
* Agent 执行过程
* 工具调用记录
* 模型调用记录
* Token 统计
* 成本统计
* 延迟统计
* 错误分类
* 慢请求分析
* 模型对比
* Prompt 评测集
* 回归测试集
* 自动评分
* LLM-as-judge 预留
* 红队测试
* Prompt injection 测试
* 人工反馈
* 用户反馈收集
* Agent 模拟真人使用
* 自动生成问题清单
* 质量报告
* 导出报告
* 周报 / 月报
* trace sampling
* metrics aggregation
* log redaction
* eval CI 预留
* dashboard widgets

必须预留扩展接口：

* TraceCollector
* MetricsCollector
* LogCollector
* EvaluationDatasetRegistry
* EvaluatorRegistry
* LlmJudgeAdapter
* RedTeamScenarioRegistry
* FeedbackCollector
* ReportExporter
* ObservabilityDashboardWidgetRegistry
* CostCalculator
* LatencyAnalyzer
* ErrorClassifier
* QualityScoreProvider
* EvalCiAdapter
* ObservabilityMigrationAdapter

### 07. Identity Security Audit and Ops

中文名称：身份权限 / 安全审计 / 系统运维。

必须覆盖：

* 登录
* 管理员账号
* 用户管理
* 角色
* 用户组
* 资源级 ACL
* API Key 权限
* 会话管理
* 首登改密
* 密码重置
* 审计日志
* hash chain
* 防篡改报告
* 敏感信息扫描
* 日志脱敏
* 密钥加密
* 备份恢复
* 设置中心
* 语言切换
* 主题切换
* 桌面快捷方式同步
* 启动检查
* 迁移脚本
* 诊断报告
* 崩溃恢复
* 数据修复工具
* security defaults
* least privilege
* secret rotation
* permission denied audit
* admin operation audit
* local-only safety guard
* update check 预留

必须预留扩展接口：

* AuthProvider
* SessionStore
* UserRepository
* RoleRegistry
* PermissionRegistry
* ResourceAclProvider
* AuditEventRegistry
* AuditLogWriter
* AuditIntegrityChecker
* SecretStore
* SecretRotationProvider
* BackupProvider
* RestoreProvider
* SettingsProvider
* ShortcutSyncProvider
* StartupCheckRegistry
* DiagnosticCollector
* MigrationRunner
* SecurityScanner
* OpsReportExporter

## 5. Required Content for Every Future build-plan.md

后续每个模块的 `build-plan.md` 必须包含以下固定章节：

1. Module Name
2. Final Goal
3. Product Positioning
4. Current Status Assumptions
5. Research Sources and Learning Targets
6. User Value
7. Functional Scope
8. Non-Functional Requirements
9. Extension Interfaces
10. Data Model / Storage Requirements
11. IPC / API Requirements
12. UI / UX Requirements
13. Security Requirements
14. Permission Requirements
15. Audit Requirements
16. Observability Requirements
17. Migration Requirements
18. Testing Requirements
19. Acceptance Criteria
20. Parallel Task Groups
21. Implementation Phases
22. Deliverables
23. Risks and Mitigations
24. Documentation Updates
25. Git Commit and Push Requirements
26. Next-Round Suggestions

每个模块都必须写成能直接转给 Codex 执行的计划，而不是概念说明。

## 6. Required Extension Interface Standard

每个模块的计划必须明确“未来新增功能怎么接进来”。

至少要写：

### Extension Interfaces

* Interface name
* Purpose
* Owner module
* Input contract
* Output contract
* Permission requirement
* Audit event requirement
* Test requirement
* Migration impact
* Example future feature

每个模块必须至少定义：

1. shared type extension point
2. IPC contract extension point
3. main service extension point
4. storage/repository extension point
5. renderer page extension point
6. renderer hook extension point
7. permission extension point
8. audit event extension point
9. testing extension point
10. import/export extension point
11. migration extension point
12. plugin/provider adapter extension point

后续新增功能必须优先接入这些扩展点。

禁止：

* 直接把新 IPC 加进全局 index
* 直接把新类型散落在页面文件中
* 直接把权限判断写死在 UI 组件里
* 直接把敏感密钥明文放 renderer
* 直接覆盖用户已有外部配置文件
* 直接把所有导入导出逻辑写死在单个函数里

## 7. Global Acceptance Criteria

后续 8 个计划单元全部完成后，必须满足：

1. `docs/build-plans/` 目录存在。
2. `00-modular-refactor-master-plan/build-plan.md` 存在。
3. 7 个业务模块各自有独立子目录。
4. 7 个业务模块各自有独立 `build-plan.md`。
5. 每个 `build-plan.md` 都包含固定 26 个章节。
6. 每个模块都有明确 Final Goal。
7. 每个模块都有学习来源。
8. 每个模块都有完整功能清单。
9. 每个模块都有扩展接口。
10. 每个模块都有验收标准。
11. 每个模块都有测试要求。
12. 每个模块都有并行任务分组。
13. 每个模块都有风险与规避方案。
14. 每个模块都有交付物。
15. 每个模块都说明是否涉及 API Key、权限、安全、审计、数据迁移。
16. 每个模块都能独立执行，不依赖口头说明。
17. 计划之间不能互相矛盾。
18. 模块边界清晰。
19. 网关功能不能混入知识库模块。
20. 权限审计不能遗漏在业务模块之外。
21. README 必须能作为构建计划总入口。
22. PROJECT_PROGRESS.md 必须记录构建计划体系创建状态。
23. 所有文档必须中文为主，必要英文术语保留。
24. 所有路径必须相对项目根目录。
25. 不得在项目外创建文件。
26. 不得改业务代码。
27. 不得提交无关 dirty 文件。
28. 必须完成 git commit。
29. 必须 push 到 GitHub。
30. push 后工作区状态必须可解释。

## 8. Testing Requirements

本轮至少执行：

```powershell
git rev-parse --show-toplevel
git status -sb
Test-Path docs/build-plans
Test-Path docs/build-plans/README.md
Test-Path docs/build-plans/BUILD_PLAN_AUTHORING_MASTER_PLAN.md
Test-Path docs/build-plans/00-modular-refactor-master-plan/README.md
Get-ChildItem docs/build-plans -Recurse
Select-String -Path docs/build-plans/**/*.md -Pattern "Final Goal"
Select-String -Path docs/build-plans/**/*.md -Pattern "Acceptance Criteria"
Select-String -Path docs/build-plans/**/*.md -Pattern "Testing Requirements"
Select-String -Path docs/build-plans/**/*.md -Pattern "Extension Interfaces"
Select-String -Path docs/build-plans/**/*.md -Pattern "Research Sources"
Select-String -Path docs/build-plans/**/*.md -Pattern "Git Commit and Push Requirements"
Select-String -Path docs/build-plans/**/*.md -Pattern "Local Gateway and API Keys"
Select-String -Path docs/build-plans/**/*.md -Pattern "Modular Refactor"
```

如果运行环境不是 PowerShell，则使用等价 Bash / CMD 命令。

如果项目已有以下命令，必须运行可用项：

```bat
npm.cmd run lint
npm.cmd run test
npm.cmd run typecheck
npm.cmd run build
```

如果本轮仅修改文档，且部分命令因为现有项目问题失败，必须记录失败原因，区分“本轮文档改动引入的问题”和“项目既有问题”。

## 9. Git Commit and Push Requirements

必须执行：

```powershell
git status -sb
git add docs/build-plans/README.md docs/build-plans/BUILD_PLAN_AUTHORING_MASTER_PLAN.md docs/build-plans/00-modular-refactor-master-plan/README.md PROJECT_PROGRESS.md
git diff --cached --stat
git diff --cached -- docs/build-plans/README.md docs/build-plans/BUILD_PLAN_AUTHORING_MASTER_PLAN.md docs/build-plans/00-modular-refactor-master-plan/README.md PROJECT_PROGRESS.md
git commit -m "docs: add build plan authoring master plan"
git push
git status -sb
```

如果 `PROJECT_PROGRESS.md` 未更新，则不得把它纳入本轮 commit。

如果 `PROJECT_PROGRESS.md` 被更新，也必须纳入本轮 commit，但不能纳入无关文件。

## 10. Current Round Deliverables

本轮只交付：

1. `docs/build-plans/README.md`
2. `docs/build-plans/BUILD_PLAN_AUTHORING_MASTER_PLAN.md`
3. `docs/build-plans/00-modular-refactor-master-plan/README.md`
4. 可选：`PROJECT_PROGRESS.md` 的一小段记录
5. 一次 Git commit
6. 一次 Git push
7. 一份终端总结，说明：
   * 实际 Git 根目录
   * 当前分支
   * remote 地址
   * `using-superpower` / `using-superpowers` 可用性
   * 是否检测到 merge/rebase/cherry-pick 状态
   * 创建了哪些文件
   * 运行了哪些验证
   * 哪些验证通过
   * 哪些验证失败以及原因
   * commit hash
   * push 结果
   * 是否有未提交文件，若有说明是否为本轮无关文件

## 11. Out of Scope

本轮禁止：

1. 不写 7 个模块的详细 `build-plan.md`。
2. 不写 00 模块化重构的详细 `build-plan.md`，只创建 README 占位说明。
3. 不改业务代码。
4. 不改 UI。
5. 不改路由。
6. 不改 `package.json`。
7. 不改 lockfile。
8. 不安装新依赖，除非是 Codex 工具或已有文档检查必须工具。
9. 不创建数据库迁移。
10. 不创建测试代码。
11. 不修改桌面快捷方式。
12. 不处理合并冲突，除非冲突直接阻塞 Git 状态检查；如遇冲突，必须停止并报告。
13. 不提交无关 dirty 文件。

## 12. Final Summary Format

完成后输出简洁总结，必须包含：

```text
Git root:
Branch:
Remote:
Merge/rebase state:
Skill availability:
Files created/updated:
Validation commands:
Commit:
Push:
Remaining dirty files:
Next recommended command:
```

不要输出长篇解释。
