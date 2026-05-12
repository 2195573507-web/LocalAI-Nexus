# 05 Knowledge Prompt and Memory - 知识库 / Prompt / Memory 资产

## 1. Module Name

- English: 05 Knowledge Prompt and Memory
- Chinese: 知识库 / Prompt / Memory 资产
- Owner scope: 知识库、文件解析、RAG、Prompt 模板/版本/测试、Memory 条目、资产引用、脱敏、导入导出和质量评估。

## 2. Final Goal

构建目标：把 LocalAI Nexus 的知识、Prompt 和 Memory 变成可管理、可引用、可测试、可恢复的本地资产层，为 Agent、Workflow、Gateway 和评测闭环提供可靠上下文。

最终状态必须做到：用户能维护项目知识、Prompt 模板和长期记忆，能测试检索与 Prompt 输出，并能安全导入导出和恢复上下文包。

## 3. Product Positioning

本模块是资产层，不直接执行 Workflow，不直接转发模型请求，不直接管理 provider key。它向 Agent/Workflow/PromptLab/Shared Memory 提供受控资产引用、检索、版本和脱敏能力。

## 4. Current Status Assumptions

- 当前已有 Prompt Lab、Shared Memory Hub、memory domain 和 secret redaction 相关能力。
- 当前知识库/RAG 仍偏计划或预留，尚未完整实现上传、解析、分块、索引、检索测试。
- Shared Memory Hub 必须保留，且本地-only。
- Memory 导入导出必须继续红线保护 secrets。

## 5. Research Sources and Learning Targets

- Dify Knowledge Base: 学习知识库、RAG pipeline、文档集成和应用引用。
- Langfuse Prompt Management: 学习 prompt version、dataset、test/eval。
- Promptfoo: 学习 prompt 测试、回归集和 red team。
- OWASP LLM Top 10: 学习敏感信息泄露、prompt injection、数据治理。

## 6. User Value

- 用户能把项目资料转成可检索知识，而不是每次手工贴上下文。
- 用户能复用和版本化 Prompt。
- 用户能管理跨模型上下文恢复需要的 Memory。
- 用户能知道哪些资产包含敏感信息或已经过期。

## 7. Functional Scope

构建功能：

- 知识库 CRUD。
- 文件上传、文档解析、分块策略、索引、检索测试。
- RAG 配置、数据源管理、embedding provider binding。
- Prompt 模板、变量、版本、对比、测试。
- Memory 条目、项目记忆、长期记忆、scope 和 lifecycle。
- 资产标签、引用关系、废弃版本归档。
- 敏感内容脱敏。
- 资产导入导出。
- 知识库质量评估。
- Retriever adapter、rerank 预留、prompt dataset 预留。

## 8. Non-Functional Requirements

构建要求：

- Memory 和知识资产必须 local-only。
- Secret redaction 必须在保存、导入、导出、上下文包生成时执行。
- 文档解析失败必须可恢复，不阻塞整个知识库。
- 初期可使用 JSON/index metadata，不强制引入数据库。
- embedding provider 必须通过 Provider 模块绑定，不直接保存 raw key。
- Prompt 版本不可被静默覆盖。

## 9. Extension Interfaces

| Interface name | Purpose | Owner module | Input contract | Output contract | Permission requirement | Audit event requirement | Test requirement | Migration impact | Example future feature |
|---|---|---|---|---|---|---|---|---|---|
| KnowledgeAsset | shared type extension point | Knowledge | asset fields | typed asset | `knowledge:read` | `knowledge.asset.changed` | schema test | 高 | web page source |
| KnowledgeIpcContract | IPC extension point | Knowledge | request | response/error | action-specific | `knowledge.ipc.called` | IPC test | 中 | retrieval test |
| KnowledgeService | main service extension point | Knowledge | command/query | result | action-specific | asset audit | unit test | 高 | RAG index rebuild |
| KnowledgeRepository | storage extension point | Knowledge | asset/prompt/memory | persisted records | `knowledge:write` | `knowledge.persisted` | storage test | 高 | vector index metadata |
| KnowledgeRouteRegistry | renderer page extension point | Knowledge | route descriptor | route config | route permission | `route.changed` | E2E test | 低 | Knowledge Base page |
| useAssetSearch | renderer hook extension point | Knowledge | query/filter | search state | `knowledge:read` | none | hook test | 低 | stale memory review |
| MemoryScopePolicy | permission extension point | Knowledge | memory scope | allow/deny | scope-specific | `memory.scope.checked` | policy test | 高 | team memory |
| KnowledgeAuditMap | audit event extension point | Knowledge | event schema | audit catalog | `audit:read` | self | audit test | 高 | prompt exported |
| PromptTestHarness | testing extension point | Knowledge | prompt fixture | test result | none | none | prompt test | 中 | prompt regression |
| AssetImportExportAdapter | import/export extension point | Knowledge | asset bundle | validated bundle | `knowledge:import` | `knowledge.imported` | roundtrip test | 高 | memory context pack |
| KnowledgeMigrationAdapter | migration extension point | Knowledge | old schema | new schema | `system:migrate` | `migration.applied` | migration test | 高 | prompt version schema |
| DocumentParserAdapter | plugin/provider adapter extension point | Knowledge | file/blob | parsed chunks | `knowledge:parse` | `document.parsed` | parser test | 中 | PDF parser |

## 10. Data Model / Storage Requirements

- `KnowledgeBase`: id、name、description、sourceIds、embeddingProviderId、chunkingStrategy、status。
- `DocumentAsset`: id、knowledgeBaseId、sourceType、path/ref、hash、parseStatus、chunks、redactionStatus。
- `PromptTemplate`: id、name、variables、versions、tags、testDatasetIds。
- `MemoryEntry`: id、scope、content、source、status、sensitivity、lastReviewedAt。
- `AssetReference`: fromAsset、toAsset、referenceType。

## 11. IPC / API Requirements

- `knowledge:base:list/create/update/delete`
- `knowledge:document:importPreview/importApply`
- `knowledge:document:parse`
- `knowledge:retrieval:test`
- `prompt:list/create/updateVersion/test/compare/archive`
- `memory:list/create/confirm/archive/export/importPreview/importApply`
- `asset:references:list`
- `asset:quality:evaluate`

## 12. UI / UX Requirements

- Knowledge Base 页面显示数据源、解析状态、检索测试和质量提示。
- Prompt Lab 显示版本、变量、测试集和对比结果。
- Shared Memory Hub 显示 scope、来源、过期/待确认状态、敏感标记。
- 导出 context pack 时清楚显示包含哪些资产和脱敏结果。
- 空状态给出“上传文档/创建 Prompt/确认 Memory”的具体动作。

## 13. Security Requirements

- 导入文件和 memory 时扫描 secrets。
- Secret-only 条目跳过或要求用户确认后只保存脱敏版本。
- Context pack 默认脱敏，不能包含 raw key。
- 文档路径必须 sanitize，不能任意读系统敏感路径。
- Prompt injection 风险内容需要标记。

## 14. Permission Requirements

- `knowledge:read/create/update/delete`
- `knowledge:document:import/parse`
- `knowledge:retrieval:test`
- `prompt:read/create/update/test/archive/export`
- `memory:read/create/confirm/archive/export/import`
- `asset:quality:read`

## 15. Audit Requirements

- `knowledge.base.created`
- `knowledge.document.imported`
- `knowledge.document.parsed`
- `knowledge.retrieval.tested`
- `prompt.created`
- `prompt.version.created`
- `prompt.tested`
- `memory.created`
- `memory.confirmed`
- `memory.archived`
- `asset.exported`

## 16. Observability Requirements

- 记录 parse duration、chunk count、retrieval latency、topK 命中、prompt test result。
- Memory 记录 stale、sensitivity、source provenance。
- 知识库质量评估输出 coverage、duplicate、stale、secret risk。

## 17. Migration Requirements

- 现有 Shared Memory 数据必须向后兼容。
- Prompt 版本化新增字段必须有默认版本。
- 知识库索引可以重建，不把索引当唯一数据源。
- 导入旧 memory bundle 必须先预览。

## 18. Testing Requirements

- Unit: redactor、chunking strategy、prompt variable resolver、memory lifecycle。
- IPC: import preview、export redaction、retrieval test。
- Security: secret scan、path sanitize。
- E2E: 创建 Prompt、确认 Memory、导出 context pack。
- Future integration: embedding provider mock。

## 19. Acceptance Criteria

验收标准：

- Prompt 支持变量、版本、测试和对比。
- Memory 支持 pending -> active/archived 生命周期和 scope。
- 知识库支持至少 mock/local 文档解析、分块和检索测试路径。
- 导入导出有脱敏报告和审计。
- Secret 不会出现在导出文件、日志或 renderer 持久化状态。
- typecheck/test/build/verify 通过。

## 20. Parallel Task Groups

- Group A: Knowledge/Prompt/Memory shared schema 和 repository。
- Group B: redaction、parser、chunking、retrieval test。
- Group C: Prompt Lab、Shared Memory、Knowledge UI。
- Group D: tests、docs、migration。

## 21. Implementation Phases

1. 统一资产 schema 和 reference model。
2. Prompt 版本化和测试 harness。
3. Memory scope/lifecycle 和 context pack。
4. 知识库 parser/chunk/retrieval mock。
5. 导入导出与质量评估。
6. 测试和文档。

## 22. Deliverables

- Asset schema。
- Prompt version store。
- Memory store/scope policy。
- Document parser/chunking adapter。
- Import/export redaction。
- UI 和测试更新。

## 23. Risks and Mitigations

- 风险：secret 写入 memory/export。规避：redaction 多入口强制执行。
- 风险：RAG 范围过大。规避：先 mock/local parser 和 metadata，再接 vector。
- 风险：Prompt 版本被覆盖。规避：append-only version store。
- 风险：路径读取越界。规避：sanitize + allowlist。

## 24. Documentation Updates

- README Memory/Prompt/Knowledge 状态。
- `handoff/ARCHITECTURE.md` 资产层说明。
- `handoff/TEST_REPORT.md` redaction 和 import/export 证据。
- `PROJECT_PROGRESS.md`。

## 25. Git Commit and Push Requirements

- commit message 建议：`feat: add knowledge prompt memory assets`
- 只 stage Knowledge/Prompt/Memory 相关文件。
- commit 前跑 typecheck/test/build/verify，UI 变更加 E2E。
- push 后记录 remote 状态。

## 26. Next-Round Suggestions

完成资产层后，推进 06 Observability，把 Prompt 测试集、Memory 使用反馈、RAG 命中质量和 Agent/Workflow 运行结果纳入评测闭环。
