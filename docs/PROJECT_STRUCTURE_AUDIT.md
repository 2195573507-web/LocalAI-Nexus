# LocalAI Nexus Project Structure Audit

## 1. Current Directory Overview

```text
D:\LocalAI Nexus
|-- .agents/          local AI agent skill definitions
|-- .git/             Git history, must keep
|-- archive/          archived process files and old reports
|-- assets/           LocalAI Nexus icons and compatibility icon aliases
|-- data/             demo/seed data
|-- docs/             active LocalAI Nexus architecture, plan, audit, worklog
|-- handoff/          active test report and next steps
|-- scripts/          build, test, icon, shortcut, launcher, smoke helpers
|-- src/
|   |-- core/         pure workflow runtime
|   |-- main/         Electron main, IPC, storage, auth, domain services
|   |-- renderer/     React UI
|   |-- shared/       cross-process types and shared helpers
|   `-- templates/    workflow templates
|-- static-app/       static fallback UI
|-- tests/            unit and E2E tests
|-- package.json      npm scripts and electron-builder config
|-- package-lock.json dependency lockfile
|-- README.md         bilingual LocalAI Nexus README
|-- PROJECT_PROGRESS.md active project progress
`-- start-agentflow*.bat compatibility launchers
```

Generated/regenerable directories:

- `node_modules/`
- `dist/`
- `dist-electron/`
- `release/`
- `logs/`
- `.codex-parallel/*user-data*`
- `.codex-parallel/logs/`
- `.codex-parallel/results/`

## 2. File Class Purposes

| Class | Purpose | Treatment |
|---|---|---|
| Root package/config | npm, Vite, TS, Tailwind, Electron builder | Keep |
| `src/main` | Electron lifecycle, IPC, storage, auth, audit, LocalAI Nexus domain services | Keep/refactor |
| `src/main/domain` | Gateway, usage, health, router, runtime, skill services | Added/keep |
| `src/renderer` | React UI, routes, components, LocalAI Nexus Dashboard | Keep/refactor |
| `src/shared` | shared types, auth/audit/provider contracts | Keep/split gradually |
| `tests` | Vitest and Playwright regression coverage | Keep/expand |
| `scripts` | build, smoke, icon, shortcut, fallback tooling | Keep/update |
| `static-app` | recovery fallback | Keep, not default primary shortcut |
| `assets` | icon resources | Keep LocalAI Nexus assets; keep aliases |
| `docs` | current architecture/audit/plan/worklog | Keep |
| `handoff` | active handoff/test state | Keep |
| `archive` | historical process record | Keep |

## 3. Must Keep Files

| Path | Referenced By | Risk | Reason |
|---|---|---:|---|
| `.git/` | Git | Critical | Preserve history. |
| `package.json` | npm/Electron builder | Critical | Scripts, deps, product metadata. |
| `package-lock.json` | npm | High | Reproducible install. |
| `src/main/index.ts` | Electron main | Critical | App lifecycle, window, Gateway startup. |
| `src/main/preload.ts` | BrowserWindow preload | Critical | Secure renderer bridge. |
| `src/main/ipc.ts` | Main process | Critical | IPC handlers and RBAC/security gates. |
| `src/main/storage.ts` | Services/IPC | Critical | JSON storage. |
| `src/main/session.ts`, `rbac.ts`, `audit.ts`, `secureStore.ts` | Security | Critical | Auth, RBAC, audit, safeStorage. |
| `src/main/domain/*` | IPC/Dashboard/tests | High | LocalAI Nexus service layer. |
| `src/renderer/App.tsx`, `routes/*`, `components/*` | React UI | High | Active UI. |
| `src/shared/*` | main/renderer/tests | High | Cross-process contracts. |
| `tests/*` | npm test/E2E | High | Regression coverage. |
| `scripts/*` | package scripts | High | Build/smoke/icon/shortcut. |
| `assets/localai-nexus.*` | Electron/package/shortcut/static | High | New icon chain. |
| `static-app/*` | fallback/smoke | Medium | Recovery path. |
| `README.md`, `PROJECT_PROGRESS.md`, `docs/*`, `handoff/TEST_REPORT.md`, `handoff/NEXT_STEPS.md` | Handoff | Medium | Required records. |

## 4. Files Migrated Or Added

| Path | Purpose | Status |
|---|---|---|
| `src/main/domain/gateway/gatewayService.ts` | Local Gateway diagnostic endpoints | Added |
| `src/main/domain/usage/usageService.ts` | Token usage records and summaries | Added |
| `src/main/domain/health/healthService.ts` | Provider health diagnostics | Added |
| `src/main/domain/router/modelRouter.ts` | Provider/model route selection | Added |
| `src/main/domain/runtime/runtimeProfileService.ts` | Codex/Claude/CLI/custom profiles | Added |
| `src/main/domain/skills/skillService.ts` | Prompt Skill create/test | Added |
| `tests/unit/localaiNexusServices.test.ts` | service regression tests | Added |
| `assets/localai-nexus.*` | canonical icon assets | Added |
| `static-app/assets/localai-nexus.svg` | static fallback icon | Added |
| `archive/2026-05/docs-history/LOCALAI_NEXUS_REFACTOR_PLAN.md` | completed refactor plan and module breakdown | Archived |
| `docs/LOCALAI_NEXUS_ARCHITECTURE.md` | architecture and flows | Added |
| `docs/PROJECT_WORKLOG.md` | process log | Added/rewritten |
| `docs/PROJECT_STRUCTURE_AUDIT.md` | structure audit | Added/rewritten |
| `handoff/NEXT_STEPS.md` | next-round handoff | Added |

## 5. Archived Files

| Source | Archive Area | Reason | Risk |
|---|---|---|---:|
| `BUILD_JOURNEY.md` | `archive/2026-05/root-progress/` | historical build note | Low |
| `CURRENT_OPTIMIZATION_PROGRESS.md` | `archive/2026-05/root-progress/` | historical progress note | Low |
| `task_plan.md`, `progress.md`, `findings.md` | `archive/2026-05/root-progress/localai-nexus-iteration-0-12/` | completed Iteration 0-12 planning files | Low |
| `reports/*` | `archive/2026-05/reports/` | old reports | Low |
| `handoff/current-progress.md`, `handoff/final-summary.md`, `handoff/validation-report.md` | `archive/2026-05/handoff-history/` | old handoff snapshots | Low |
| old `.codex-parallel` tracked tasks/logs/results | `archive/2026-05/parallel-agents/` | old generated process records | Low |
| old rebuild/refactor docs | `archive/2026-05/docs-history/` | completed historical docs removed from active docs surface | Low |
| old rebuild/simulation handoff docs | `archive/2026-05/handoff-history/` | completed historical handoff material | Low |
| `handoff/archived-agents/` | `archive/2026-05/parallel-agents/handoff-archived-agents/` | historical parallel-agent prompts and logs | Low |

## 6. Deleted From Active Root

Deleted after archival or because they were generated process records:

- `BUILD_JOURNEY.md`
- `CURRENT_OPTIMIZATION_PROGRESS.md`
- `task_plan.md`
- `progress.md`
- `findings.md`
- `reports/human-agent-simulation.md`
- `reports/validation-report.md`
- `handoff/current-progress.md`
- `handoff/final-summary.md`
- `handoff/validation-report.md`
- old tracked `.codex-parallel` task/log/result files

## 7. Deletion Risk And Result

| Class | Risk | Result |
|---|---:|---|
| Git/package/source/security files | Critical | Kept |
| Active renderer/main/shared/tests/scripts | High | Kept/refactored |
| Static fallback and launchers | Medium | Kept as recovery/compatibility |
| Historical process docs | Low | Archived and removed from active root |
| Generated userData/logs/results | Low | Ignored/regenerable |

## 8. Reference Check

| Area | Current Result |
|---|---|
| `package.json` | `name: localai-nexus`, `productName: LocalAI Nexus`, icon `assets/localai-nexus.ico` |
| Electron main | `app.setName('LocalAI Nexus')`, window title/icon updated |
| Preload | `window.agentflow` retained intentionally as compatibility API |
| Renderer | Primary visible surfaces use LocalAI Nexus |
| Static fallback | title/favicon use LocalAI Nexus |
| Shortcut script | creates `LocalAI Nexus.lnk` with `assets/localai-nexus.ico` |
| Tests | updated for LocalAI Nexus where visible UI changed |

## 9. Old Icon Result

- New canonical `.ico`: `assets/localai-nexus.ico`
- Electron BrowserWindow icon: updated
- electron-builder icon: updated
- Desktop shortcut icon: updated
- Static fallback icon: updated
- Old `assets/icon.*`: retained as compatibility aliases

## 10. Old Shortcut Result

- Old `C:\Users\至亲\Desktop\AgentFlow Studio.lnk`: removed
- New `C:\Users\至亲\Desktop\LocalAI Nexus.lnk`: created and inspected
- New shortcut target points directly to Electron:

```text
D:\LocalAI Nexus\node_modules\electron\dist\electron.exe
```

Arguments:

```text
"D:\LocalAI Nexus\dist-electron\main\index.js"
```

## 11. Startup Popup Check

- Primary shortcut avoids `.bat` console window.
- Electron startup smoke passed.
- Auth bridge smoke passed.
- Main window title is LocalAI Nexus.
- No automatic external webpage/folder opening in primary Electron path.
- Static fallback opens a browser only when manually using fallback scripts.

## 12. Clean Target Structure

Target structure remains:

```text
src/main/domain/auth
src/main/domain/access
src/main/domain/ai-resources
src/main/domain/gateway
src/main/domain/router
src/main/domain/health
src/main/domain/usage
src/main/domain/skills
src/main/domain/workflow
src/main/domain/agents
src/main/domain/audit
src/main/domain/storage
src/main/ipc

src/shared/types
src/shared/schemas
src/shared/protocols
src/shared/constants

src/renderer/features/dashboard
src/renderer/features/ai-resources
src/renderer/features/runtime
src/renderer/features/token-center
src/renderer/features/health
src/renderer/features/skills
src/renderer/features/agents
src/renderer/features/workflows
src/renderer/features/security
src/renderer/features/admin
src/renderer/components
src/renderer/layouts
```

Current status: main-process domain split has begun; renderer feature-folder migration remains incremental to avoid breaking tested routes.

## 13. 2026-05-11 Iteration Closeout Additions

New active files from the Iteration 0-12 closeout include:

| Path | Purpose | Treatment |
|---|---|---|
| `docs/LOCALAI_NEXUS_ITERATION_PLAN.md` | Completed Iteration 0-12 roadmap and acceptance matrix | Keep |
| `docs/LOCALAI_NEXUS_NEXT_ITERATION_PLAN.md` | Next-stage roadmap after the closeout | Keep |
| `src/main/domain/provider/*` | Provider Hub service behavior | Keep |
| `src/main/domain/security/*` | Security report/risk service behavior | Keep |
| `src/main/domain/memory/*` | Context-pack preview and recovery behavior | Keep |
| `src/main/domain/ecosystem/*` | Local bundle registry and validation behavior | Keep |
| `src/renderer/routes/ProviderHub.tsx` | Provider Hub page | Keep |
| `src/renderer/routes/TokenCenter.tsx` | Token Center page | Keep |
| `src/renderer/routes/HealthMonitor.tsx` | Health Monitor page | Keep |
| `src/renderer/routes/ModelRouter.tsx` | Model Router page | Keep |
| `src/renderer/routes/LocalGateway.tsx` | Local Gateway page | Keep |
| `src/renderer/routes/RuntimeSwitcher.tsx` | Runtime Switcher page | Keep |
| `src/renderer/routes/Diagnostics.tsx` | Diagnostics page | Keep |
| `src/renderer/routes/AgentStudio.tsx` | Agent Studio page | Keep |
| `src/renderer/routes/SecurityCenter.tsx` | Security Center page | Keep |
| `src/renderer/routes/Ecosystem.tsx` | Local Ecosystem page | Keep |

Verification status:

- All standard build, unit, smoke, verify, E2E, static, startup, auth bridge, long-run, shortcut, and gateway smoke gates passed.
- `release/` remains generated/regenerable. Installer packaging is blocked after `release/win-unpacked/LocalAI Nexus.exe` is generated because electron-builder `winCodeSign` cache extraction cannot create symlinks under the current Windows account.

## 14. 2026-05-11 Cleanup Pass

The cleanup pass scanned package scripts, Electron/Vite config, launcher scripts, source references, tests, and handoff dependencies before moving or deleting files.

Deleted regenerable ignored artifacts:

- `logs/`
- `dist/`
- `dist-electron/`
- `release/`
- stale `.codex-parallel` cache/userData/report folders that tests recreate

Moved historical material:

- `docs/COMPETITOR_MAINLINE_REBUILD_STUDY.md` -> `archive/2026-05/docs-history/`
- `docs/REBUILD_ARCHITECTURE_PLAN.md` -> `archive/2026-05/docs-history/`
- `docs/SECURITY_REBUILD_REVIEW.md` -> `archive/2026-05/docs-history/`
- `docs/SECURITY_SANDBOX_CLEANUP.md` -> `archive/2026-05/docs-history/`
- `docs/LOCALAI_NEXUS_REFACTOR_PLAN.md` -> `archive/2026-05/docs-history/`
- old rebuild/simulation handoff docs -> `archive/2026-05/handoff-history/`
- `handoff/archived-agents/` -> `archive/2026-05/parallel-agents/handoff-archived-agents/`
- root `task_plan.md`, `progress.md`, and `findings.md` -> `archive/2026-05/root-progress/localai-nexus-iteration-0-12/`

Deferred cleanup candidates are recorded in `docs/cleanup/cleanup-review.md`.
