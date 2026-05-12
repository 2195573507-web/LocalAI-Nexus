# 00 Modular Refactor Master Plan

本目录用于存放 LocalAI Nexus 的模块化重构总计划。

该计划优先级高于 7 个业务模块计划。后续必须先完成该计划，再逐步执行各模块内部构建计划。

## Why This Plan Exists

LocalAI Nexus 后续功能会明显增多，包括本地网关、API Key、ccs 导入、模型供应商、Agent、Workflow、MCP、知识库、Prompt、Memory、观测、评测、权限、安全审计和系统运维。

如果不先做模块边界重构，后续功能会继续堆积在：

```text
src/main/index.ts
src/main/storage.ts
src/renderer/api.ts
src/renderer/components/Sidebar.tsx
src/renderer/pages/
```

这会导致：

* IPC 难维护
* 类型难复用
* 权限难统一
* 测试难覆盖
* 页面越来越乱
* 网关、Workflow、知识库、安全审计边界混乱
* 后续新增功能成本越来越高

## Required Refactor Direction

后续模块化重构总计划必须至少覆盖：

```text
src/main/modules/
gateway/
modelProviders/
auth/
audit/
workflow/
knowledge/
observability/
workspace/
ops/

src/renderer/modules/
gateway/
modelProviders/
workspace/
workflow/
knowledge/
observability/
security/
settings/

src/shared/
types/
contracts/
permissions/
audit/
errors/
constants/
```

## Required Boundary Rules

后续代码重构必须遵守：

1. main 侧模块负责业务逻辑、存储、IPC handler 注册。
2. renderer 侧模块负责页面、hooks、局部组件。
3. shared 只放类型、contract、常量、权限定义、错误码。
4. 权限点必须集中管理。
5. 审计事件必须集中定义。
6. API Key、provider key、session token 等敏感信息必须避免 renderer 明文持久化。
7. 导航必须配置化，不能在 Sidebar 中硬编码大量入口。
8. IPC 必须按模块注册，不能继续把所有 handler 堆在主入口。
9. storage/repository 必须按模块拆分。
10. 测试必须按模块补充。
11. 每轮重构必须保持现有功能可用。
12. 每轮重构必须单独 commit 和 push。

## Required Plan Scope

后续 `docs/build-plans/00-modular-refactor-master-plan/build-plan.md` 必须明确：

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

## Extension Interfaces

00 模块化重构总计划至少必须预留：

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

每个接口必须说明 owner module、input contract、output contract、permission requirement、audit event requirement、test requirement、migration impact 和 example future feature。

## Acceptance Criteria

* 00 模块化重构总计划优先于 7 个业务模块计划。
* 计划明确禁止一次性全局推倒。
* 计划明确先做模块边界重构，再做模块内部功能重构。
* 计划明确每轮只动 1 到 2 个模块。
* 计划明确每轮测试、更新文档、commit、push。
* 计划明确 Extension Interfaces，避免新增功能继续堆入全局文件。

## Testing Requirements

后续执行 00 模块化重构计划时，必须至少覆盖：

* TypeScript typecheck
* unit tests
* E2E tests for preserved routes
* build verification
* IPC contract regression checks
* storage compatibility checks
* permission and audit regression checks
* desktop shortcut/startup smoke where relevant

## Git Commit and Push Requirements

后续每一轮 00 模块化重构执行必须：

* 只 stage 本轮相关文件。
* 不提交无关 dirty 文件。
* 使用清晰的 `refactor:` / `test:` / `docs:` commit message。
* commit 前运行必要验证。
* push 后再次运行 `git status -sb`。
* 在交付总结中说明 commit hash、push 结果和剩余 dirty 文件。
