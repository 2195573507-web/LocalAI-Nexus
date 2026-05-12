# 06 Observability Evaluation and Feedback - 观测 / 评测 / 反馈闭环

## 1. Module Name

- English: 06 Observability Evaluation and Feedback
- Chinese: 观测 / 评测 / 反馈闭环
- Owner scope: Trace、日志、metrics、token/cost/latency、错误分类、模型/Prompt 评测、红队测试、反馈收集和报告导出。

## 2. Final Goal

构建目标：让 LocalAI Nexus 能看清每次模型调用、Gateway 请求、Agent/Workflow 运行和 Prompt/Memory 使用效果，并把这些证据转化为可执行的质量反馈。

最终状态必须做到：用户能查看 trace timeline、成本和延迟趋势、失败分类、评测结果、红队风险、质量报告，并把反馈回流到 Provider、Gateway、Agent、Workflow、Prompt 和 Memory。

## 3. Product Positioning

Observability 是反馈层，不负责直接执行 Gateway 或 Workflow。它消费 Gateway/Provider/Workflow/Memory 的事件、trace 和 usage，生成分析、评测和报告。

## 4. Current Status Assumptions

- 当前已有 Token Center、Diagnostics、Health Monitor、Log Analyzer、usage service。
- 当前 Gateway smoke 和 usage/audit recording 已有基础证据。
- 当前 prompt evaluation、LLM-as-judge、red team、eval CI 主要还是后续能力。
- 当前无外部云观测依赖，必须 local-first。

## 5. Research Sources and Learning Targets

- Langfuse: traces、sessions、prompt management、scores、datasets。
- OpenTelemetry: trace、metrics、logs 的统一语义。
- Promptfoo: prompt eval、red team、CI regression。
- Phoenix: LLM observability 和 evaluation。
- LiteLLM: spend tracking、request logging、latency/cost metrics。

## 6. User Value

- 用户能知道钱花在哪、慢在哪、失败在哪。
- 用户能比较不同模型和 Prompt 的效果。
- 用户能把运行失败变成下一步修复建议。
- 用户能导出周报/月报/质量报告。

## 7. Functional Scope

构建功能：

- Trace 时间线。
- 请求日志、Workflow run timeline、Agent 执行过程。
- 工具调用记录、模型调用记录。
- Token、成本、延迟统计。
- 错误分类、慢请求分析。
- 模型对比、Prompt 评测集、回归测试集。
- 自动评分、LLM-as-judge 预留。
- 红队测试、Prompt injection 测试。
- 人工反馈、用户反馈收集。
- Agent 模拟真人使用。
- 自动生成问题清单。
- 质量报告、导出报告、周报/月报。
- trace sampling、metrics aggregation、log redaction、eval CI 预留、dashboard widgets。

## 8. Non-Functional Requirements

构建要求：

- 默认 local-only，不上传 trace/log。
- 日志和报告必须脱敏。
- Observability 不能阻塞 Gateway/Workflow 主路径。
- Metrics aggregation 必须能处理旧记录缺字段。
- 评测必须区分 mock、local、credentialed live。
- 成本统计必须标明 pricing 来源和估算状态。

## 9. Extension Interfaces

| Interface name | Purpose | Owner module | Input contract | Output contract | Permission requirement | Audit event requirement | Test requirement | Migration impact | Example future feature |
|---|---|---|---|---|---|---|---|---|---|
| TraceRecord | shared type extension point | Observability | trace fields | typed trace | `observability:read` | `trace.recorded` | schema test | 高 | span links |
| ObservabilityIpcContract | IPC extension point | Observability | query request | response/error | action-specific | `observability.ipc.called` | IPC test | 中 | report export |
| TraceCollector | main service extension point | Observability | event/span | trace result | module-specific | `trace.collected` | collector test | 高 | Gateway span |
| ObservabilityRepository | storage extension point | Observability | trace/metric/eval | persisted records | `observability:write` | `observability.persisted` | storage test | 高 | metric rollups |
| ObservabilityRouteRegistry | renderer page extension point | Observability | route descriptor | route config | route permission | `route.changed` | E2E test | 低 | Eval Dashboard |
| useTraceTimeline | renderer hook extension point | Observability | trace id/filter | timeline state | `observability:read` | none | hook test | 低 | workflow trace view |
| ObservabilityPermissionMap | permission extension point | Observability | permission descriptor | permission map | admin writes | `permission.changed` | RBAC test | 中 | report export role |
| ObservabilityAuditMap | audit event extension point | Observability | event schema | audit catalog | `audit:read` | self | audit test | 中 | report exported |
| EvaluationDatasetRegistry | testing extension point | Observability | dataset descriptor | dataset | `eval:read` | `eval.dataset.changed` | eval test | 中 | prompt regression set |
| ReportExporter | import/export extension point | Observability | report query | file/report | `observability:export` | `report.exported` | export test | 中 | monthly PDF/MD |
| ObservabilityMigrationAdapter | migration extension point | Observability | old metric schema | new schema | `system:migrate` | `migration.applied` | migration test | 高 | trace schema v2 |
| EvaluatorRegistry | plugin/provider adapter extension point | Observability | evaluator descriptor | score result | `eval:run` | `eval.completed` | evaluator test | 中 | LLM-as-judge |

## 10. Data Model / Storage Requirements

- `Trace`: traceId、sourceModule、operation、spans、status、startedAt、endedAt、redactionStatus。
- `MetricPoint`: metricName、dimensions、value、unit、timestamp。
- `LogRecord`: level、category、message、redactedFields、traceId。
- `EvaluationDataset`: id、name、items、targetModule、version。
- `EvaluationRun`: datasetId、model/provider/prompt、scores、errors、cost、latency。
- `FeedbackItem`: source、rating、comment、linkedTraceId、status。

## 11. IPC / API Requirements

- `observability:trace:list/detail`
- `observability:metrics:summary`
- `observability:logs:list`
- `observability:errors:classify`
- `eval:datasets:list/create/update/delete`
- `eval:run:start`
- `eval:run:detail`
- `feedback:create/list/update`
- `report:generate`
- `report:export`

## 12. UI / UX Requirements

- Observability Dashboard 显示成本、token、延迟、错误、慢请求。
- Trace timeline 支持按 Gateway/Workflow/Agent/Provider 过滤。
- Evaluation 页面支持模型/Prompt 对比和回归结果。
- 红队测试必须清楚标明风险和建议，不制造恐慌。
- 报告导出前显示脱敏摘要。

## 13. Security Requirements

- trace/log 默认脱敏。
- 导出报告不得包含 raw key、Bearer、password、secret、refresh token。
- LLM-as-judge 预留默认关闭，需要明确 provider 和成本提示。
- 红队 payload 必须隔离，不写入普通 Prompt 模板。

## 14. Permission Requirements

- `observability:read`
- `observability:export`
- `eval:read`
- `eval:create`
- `eval:run`
- `feedback:read`
- `feedback:create`
- `report:generate`
- `report:export`

## 15. Audit Requirements

- `trace.viewed`
- `report.generated`
- `report.exported`
- `eval.dataset.created`
- `eval.run.started`
- `eval.run.completed`
- `redteam.run.started`
- `feedback.created`

## 16. Observability Requirements

本模块自身也必须观测：

- collector dropped events。
- aggregation duration。
- report generation duration。
- eval run duration、cost、failure。
- redaction coverage。

## 17. Migration Requirements

- 旧 usage/log 记录需要 adapter 转为 Trace/Metric 摘要。
- 缺少 traceId 的旧记录生成 synthetic traceId。
- metric rollup 可重建，不作为唯一事实来源。
- eval dataset schema 必须版本化。

## 18. Testing Requirements

- Unit: redaction、cost calculator、latency analyzer、error classifier。
- Collector: Gateway/Workflow/Provider event -> trace。
- Evaluation: mock evaluator、dataset regression。
- Export: report redaction。
- E2E: 打开 dashboard、查看 trace、导出报告。

## 19. Acceptance Criteria

验收标准：

- Gateway/Workflow/Agent/Provider 的关键事件能形成 trace 或 metric。
- 用户能查看 token、cost、latency、error category 和慢请求。
- 至少支持 Prompt/model mock evaluation。
- 报告导出脱敏并有审计。
- 旧 usage/log 数据不丢失，能以兼容方式展示。
- typecheck/test/build/verify 通过。

## 20. Parallel Task Groups

- Group A: trace/metric/log schema 和 collectors。
- Group B: cost/latency/error analyzers。
- Group C: evaluation dataset/evaluator/report。
- Group D: dashboard UI、tests、docs。

## 21. Implementation Phases

1. 建立 Trace/Metric/Log shared schema。
2. 接入 Gateway/Workflow/Provider collectors。
3. 完成 aggregation 和 dashboard。
4. 加 evaluation dataset 和 mock evaluator。
5. 加 report exporter 和 redaction。
6. 补 tests/docs。

## 22. Deliverables

- Trace collector。
- Metrics aggregator。
- Error classifier。
- Evaluation dataset/evaluator。
- Observability Dashboard。
- Report exporter。
- Tests 和验证报告。

## 23. Risks and Mitigations

- 风险：日志泄露敏感数据。规避：collector 层强制 redaction。
- 风险：观测影响主路径性能。规避：异步记录和采样。
- 风险：成本估算不准。规避：标明 pricing source 和 estimated。
- 风险：评测依赖 live credentials。规避：mock evaluator 默认可跑。

## 24. Documentation Updates

- README Observability/Evaluation 状态。
- `handoff/TEST_REPORT.md` 新增 trace/eval/report 证据。
- `docs/LOCALAI_NEXUS_VERIFICATION_MATRIX.md` 加 eval/report gates。
- `PROJECT_PROGRESS.md`。

## 25. Git Commit and Push Requirements

- commit message 建议：`feat: add observability feedback loop`
- 只 stage Observability/Evaluation 相关文件。
- commit 前跑 typecheck/test/build/verify，UI 加 E2E。
- push 后记录 remote 状态。

## 26. Next-Round Suggestions

Observability 完成后推进 07 Security/Ops，将 report、audit、permission denied、secret scan、backup/restore 和 diagnostic report 串成系统运维闭环。
