# 07 Identity Security Audit and Ops - 身份权限 / 安全审计 / 系统运维

## 1. Module Name

- English: 07 Identity Security Audit and Ops
- Chinese: 身份权限 / 安全审计 / 系统运维
- Owner scope: 登录、用户、角色、ACL、API Key 权限、会话、审计、防篡改、密钥、备份恢复、设置、快捷方式、启动检查、诊断和迁移。

## 2. Final Goal

构建目标：为 LocalAI Nexus 建立本地优先、最小权限、可审计、可恢复的安全和运维底座。

最终状态必须做到：所有高风险操作都有权限、审计、脱敏和恢复路径；管理员能检查用户、角色、ACL、API Key 风险、设置、备份、启动状态和诊断报告。

## 3. Product Positioning

Security/Ops 是保护层和运维层。它不替业务模块实现核心功能，但为 Provider、Gateway、Workflow、Memory、Observability 提供 Auth、Session、Permission、ACL、Audit、Secret、Backup、Diagnostics 和 Settings 能力。

## 4. Current Status Assumptions

- 当前已有 `src/main/session.ts`、`rbac.ts`、`audit.ts`、`secureStore.ts`、`security.ts`。
- 当前已有 Login、AdminUsers、AdminAudit、SecurityCenter、SafetyBox、Settings。
- 当前 Electron 安全边界必须保持。
- 当前 final installer packaging 受本机 `winCodeSign` symlink 权限限制。

## 5. Research Sources and Learning Targets

- Open WebUI RBAC/API keys: 学习角色、组、功能权限、资源权限和 admin settings。
- OWASP LLM Top 10: 学习 prompt injection、sensitive disclosure、insecure plugin、excessive agency、supply chain。
- NIST AI RMF: 学习治理、风险、human oversight。
- sub2api/cc-switch: 学习 API key 权限、配置安全合并、运维配置。

## 6. User Value

- 用户能信任 LocalAI Nexus 不会泄露 key 或静默执行危险操作。
- 管理员能看到谁做了什么、是否被拒绝、为什么有风险。
- 数据出问题时能备份恢复和生成诊断报告。
- 桌面启动、快捷方式、迁移、设置具备可恢复路径。

## 7. Functional Scope

构建功能：

- 登录、管理员账号、用户管理、角色、用户组。
- 资源级 ACL、API Key 权限、会话管理。
- 首登改密、密码重置。
- 审计日志、hash chain、防篡改报告。
- 敏感信息扫描、日志脱敏、密钥加密、secret rotation。
- 备份恢复。
- 设置中心、语言切换、主题切换。
- 桌面快捷方式同步、启动检查。
- 迁移脚本、诊断报告、崩溃恢复、数据修复工具。
- security defaults、least privilege、permission denied audit、admin operation audit。
- local-only safety guard、update check 预留。

## 8. Non-Functional Requirements

构建要求：

- `contextIsolation: true`、`nodeIntegration: false` 必须保持。
- 不暴露 arbitrary command execution。
- 权限必须在 main/service 层强制执行。
- 审计日志必须脱敏并支持完整性校验。
- 备份恢复必须有 dry-run 和用户确认。
- 设置变更不能破坏启动路径。
- 快捷方式脚本只创建项目相关快捷方式。

## 9. Extension Interfaces

| Interface name | Purpose | Owner module | Input contract | Output contract | Permission requirement | Audit event requirement | Test requirement | Migration impact | Example future feature |
|---|---|---|---|---|---|---|---|---|---|
| SecurityPrincipal | shared type extension point | Security | user/session fields | typed principal | `security:user:read` | `security.principal.changed` | schema test | 高 | service account |
| SecurityIpcContract | IPC extension point | Security | auth/security request | response/error | action-specific | `security.ipc.called` | IPC test | 高 | password reset |
| AuthProvider | main service extension point | Security | credentials/session | auth result | auth-specific | `auth.event` | auth test | 高 | SSO placeholder |
| UserRepository | storage extension point | Security | user/role/acl | persisted records | `security:user:write` | `security.persisted` | storage test | 高 | group roles |
| SecurityRouteRegistry | renderer page extension point | Security | route descriptor | route config | route permission | `route.changed` | E2E test | 低 | Backup page |
| useSecurityReport | renderer hook extension point | Security | report query | report state | `security:read` | none | hook test | 低 | risk score card |
| ResourceAclProvider | permission extension point | Security | resource/action | allow/deny | ACL-specific | `permission.checked` | RBAC test | 高 | project ACL |
| AuditLogWriter | audit event extension point | Security | audit event | persisted event | `audit:write` | self | integrity test | 高 | hash chain |
| SecurityTestFixtures | testing extension point | Security | fixture request | users/roles/audit | none | none | fixture test | 中 | permission matrix |
| BackupProvider | import/export extension point | Security | backup request | backup artifact | `ops:backup` | `backup.created` | restore test | 高 | encrypted backup |
| MigrationRunner | migration extension point | Security | migration plan | migration result | `system:migrate` | `migration.applied` | migration test | 高 | ACL schema v2 |
| SecurityScanner | plugin/provider adapter extension point | Security | scan target | scan result | `security:scan` | `security.scan.completed` | scanner test | 中 | prompt injection scanner |

## 10. Data Model / Storage Requirements

- `User`: id、name、passwordHash、mustChangePassword、roles、groups、status。
- `Role`: id、name、permissions。
- `ResourceAcl`: resourceType、resourceId、principalId、permissions。
- `Session`: id、userId、createdAt、expiresAt、revokedAt。
- `AuditEvent`: id、hashPrev、hash、actor、action、resource、result、redactionStatus、timestamp。
- `BackupManifest`: id、createdAt、collections、redactionStatus、checksum。

## 11. IPC / API Requirements

- `auth:login/logout/session`
- `auth:password:change/reset`
- `admin:users:list/create/update/disable`
- `admin:roles:list/update`
- `acl:get/update`
- `audit:list/export/integrityCheck`
- `security:scan`
- `security:report`
- `secret:rotate`
- `backup:create/previewRestore/applyRestore`
- `settings:get/update`
- `shortcut:sync`
- `startup:check`
- `diagnostics:collect`
- `migration:runPreview/runApply`

## 12. UI / UX Requirements

- Login 清晰显示本地账户和首登改密。
- Admin Users 支持用户、角色、禁用、权限查看。
- Audit Logs 支持筛选、导出、防篡改状态。
- Security Center 显示风险、secret scan、API Key 风险、权限拒绝。
- Settings 保持语言/主题/启动配置，不静默覆盖。
- Diagnostics 提供可复制报告和修复建议。

## 13. Security Requirements

- 密码 hash，不明文保存。
- SecretStore/safeStorage 处理敏感值。
- Audit hash chain 防篡改。
- Backup 默认脱敏敏感字段，恢复前 dry-run。
- 外部 URL 打开前验证协议和目标。
- dialog/open path options 必须 sanitize。
- local-only safety guard 默认开启。

## 14. Permission Requirements

- `security:read`
- `security:scan`
- `security:admin`
- `admin:user:read/write`
- `admin:role:read/write`
- `acl:read/write`
- `audit:read/export/integrity`
- `ops:backup`
- `ops:restore`
- `ops:diagnostics`
- `settings:read/write`

## 15. Audit Requirements

- `auth.login.succeeded`
- `auth.login.failed`
- `auth.password.changed`
- `admin.user.created`
- `admin.user.disabled`
- `role.updated`
- `acl.updated`
- `permission.denied`
- `audit.exported`
- `audit.integrity.checked`
- `backup.created`
- `restore.applied`
- `settings.updated`
- `shortcut.synced`
- `diagnostics.generated`

## 16. Observability Requirements

- 安全事件进入 Observability summary。
- 权限拒绝按模块、资源、用户统计。
- 启动检查记录耗时和失败分类。
- 备份/恢复记录 checksum、集合数量、失败原因。
- Secret scan 输出风险数量和位置摘要，不输出 secret 本文。

## 17. Migration Requirements

- 现有 admin/session/audit 数据必须兼容。
- 新 ACL 字段默认最小权限。
- 审计 hash chain 迁移需要从边界点开始，不改写历史事件。
- 备份恢复必须记录 schemaVersion。
- migration apply 前必须生成 preview 和备份。

## 18. Testing Requirements

- Unit: password hash、session、RBAC、ACL、audit hash、redaction。
- IPC: auth、admin、settings、backup、diagnostics 权限。
- Security: 禁止 raw secret 导出、禁止 arbitrary exec。
- E2E: login、admin users、audit logs、settings language/theme。
- Ops: shortcut sync/startup smoke where relevant。

## 19. Acceptance Criteria

验收标准：

- 登录、用户、角色、权限和 session 正常工作。
- 权限拒绝发生在 main/service 层并有审计。
- 审计日志脱敏，并支持完整性检查。
- Secret scan、backup/restore preview、diagnostic report 可用。
- Settings 不破坏语言/主题/启动状态。
- Electron security invariants 未降低。
- typecheck/test/build/verify 和相关 E2E 通过。

## 20. Parallel Task Groups

- Group A: Auth/session/user/role/ACL。
- Group B: audit hash chain、security scan、secret rotation。
- Group C: backup/restore、diagnostics、shortcut/startup。
- Group D: Security/Admin/Settings UI 和 tests。

## 21. Implementation Phases

1. 固化 Security shared contract 和 PermissionRegistry。
2. 强化 Auth/session/RBAC/ACL。
3. 强化 AuditLogWriter/hash chain。
4. 加 security scan、backup/restore、diagnostics。
5. 加 Settings/Shortcut/Startup 运维检查。
6. 补 tests/docs。

## 22. Deliverables

- Security contract。
- Auth/Session/User/Role/ACL services。
- Audit integrity checker。
- Security scanner。
- Backup/restore provider。
- Diagnostics collector。
- UI 和测试更新。

## 23. Risks and Mitigations

- 风险：权限只在 UI 控制。规避：main/service 层统一强制。
- 风险：审计记录含 secret。规避：AuditLogWriter 强制 redaction。
- 风险：恢复操作破坏数据。规避：preview、backup、checksum、explicit apply。
- 风险：安全功能阻塞普通流程。规避：清晰错误和修复建议。

## 24. Documentation Updates

- README Security/Ops 说明。
- `handoff/ARCHITECTURE.md` 安全边界。
- `handoff/TEST_REPORT.md` auth/RBAC/audit/backup 验证。
- `PROJECT_PROGRESS.md`。

## 25. Git Commit and Push Requirements

- commit message 建议：`feat: harden identity security ops`
- 只 stage Security/Ops 相关文件。
- commit 前跑 typecheck/test/build/verify，安全/UI 变更加 E2E 和 startup/shortcut smoke。
- push 后记录 remote 状态。

## 26. Next-Round Suggestions

完成 07 后回到 00 进行下一轮模块边界重构复盘，检查 Provider、Gateway、Workflow、Memory、Observability、Security 是否都已接入统一 permission、audit、repository 和 migration registry。
