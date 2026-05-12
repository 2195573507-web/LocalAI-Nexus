# LocalAI Nexus Build Plans

本目录用于存放 LocalAI Nexus 后续所有模块构建计划。

本项目后续不再把所有模块的构建计划混放到通用 `iteration-plans` 目录中，而是统一放入 `docs/build-plans/`。

## Current Round Tooling Notes

- 本轮已按要求尝试 `using-superpower` 和 `using-superpowers` 两种技能名称。
- `using-superpower`：不可用，未找到对应技能文件。
- `using-superpowers`：可用，已读取并按结构化流程继续。
- GitHub 插件/目录未在当前仓库暴露；`gh` CLI 未安装。后续 GitHub 交付默认使用普通 `git commit` 和 `git push`。
- 本轮实际 Git 根目录必须以 `git rev-parse --show-toplevel` 输出为准。

## Final Goal

LocalAI Nexus 的最终目标是成为一个本地 AI 控制面与本地网关管理平台，用于统一管理：

* 模型供应商
* 本地 OpenAI-compatible 网关
* API Key
* ccs / sub2api / cc-switch 配置导入导出
* Codex / Claude Code / 本地应用接入
* Agent
* Workflow
* MCP
* 知识库
* Prompt
* Memory
* 观测
* 评测
* 权限
* 安全审计
* 系统运维

产品主路径必须是：

```text
配置模型资源
-> 生成本地网关 API Key
-> 接入 Codex / Claude Code / 本地应用
-> 编排 Agent / Workflow
-> 追踪运行过程
-> 做安全审计与评测
-> 形成反馈闭环
```

## Required Planning Structure

后续必须采用以下目录结构：

```text
docs/build-plans/
README.md
BUILD_PLAN_AUTHORING_MASTER_PLAN.md

00-modular-refactor-master-plan/
build-plan.md

01-workspace-and-project-center/
build-plan.md

02-ai-resources-and-model-providers/
build-plan.md

03-local-gateway-and-api-keys/
build-plan.md

04-agent-workflow-and-mcp/
build-plan.md

05-knowledge-prompt-and-memory/
build-plan.md

06-observability-evaluation-and-feedback/
build-plan.md

07-identity-security-audit-and-ops/
build-plan.md
```

## Refactor Strategy

后续构建必须先写并执行 `00-modular-refactor-master-plan/build-plan.md`。

原因：

当前项目模块越来越多，如果继续直接添加功能，容易导致页面、IPC、storage、权限、导航、类型定义和测试散落在全局文件里。

后续必须采用：

* 先模块边界重构
* 再模块内部功能重构
* 每轮只动 1 到 2 个模块
* 每轮测试
* 每轮更新文档
* 每轮 commit
* 每轮 push

禁止采用：

* 一次性全局推倒
* 一次性改完 7 个模块
* 一次性混合 UI、数据层、网关、权限、Workflow、知识库

## Module List

后续必须为以下 8 个计划单元分别写构建计划：

0. 模块化重构总计划
1. 工作区与项目中枢
2. AI 资源与模型供应商
3. 本地网关与 API Key 控制面
4. Agent / Workflow / MCP 编排
5. 知识库 / Prompt / Memory 资产
6. 观测 / 评测 / 反馈闭环
7. 身份权限 / 安全审计 / 系统运维

对应英文计划名称必须保持一致：

* 00 Modular Refactor Master Plan
* 01 Workspace and Project Center
* 02 AI Resources and Model Providers
* 03 Local Gateway and API Keys
* 04 Agent Workflow and MCP
* 05 Knowledge Prompt and Memory
* 06 Observability Evaluation and Feedback
* 07 Identity Security Audit and Ops

## Extension Rule

每个模块计划都必须预留后续扩展接口，至少包括：

* shared type extension point
* IPC contract extension point
* main service extension point
* storage/repository extension point
* renderer page extension point
* renderer hook extension point
* permission extension point
* audit event extension point
* testing extension point
* import/export extension point
* migration extension point
* plugin/provider adapter extension point

后续任何新增功能，都必须优先接入对应模块的扩展点，不允许继续把新功能直接堆到全局文件中。

## Acceptance Criteria

* `docs/build-plans/` 是后续构建计划总入口。
* `BUILD_PLAN_AUTHORING_MASTER_PLAN.md` 明确最终产品定位、模块划分、学习来源、固定章节、验收标准和 Git 交付规则。
* `00-modular-refactor-master-plan/README.md` 明确模块化重构优先级和边界规则。
* 后续 00 模块化重构计划和 7 个一级功能模块计划必须各自拥有独立 `build-plan.md`。
* 每个模块必须功能尽可能完整，并明确学习来源、Extension Interfaces、Testing Requirements、Acceptance Criteria、Deliverables、Risks and Mitigations、Git Commit and Push Requirements。
