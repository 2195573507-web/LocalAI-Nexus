# LocalAI Nexus - Navigation Restructure

Date: 2026-05-12
Branch: `refactor-localai-nexus`
Workspace: `D:\LocalAI Nexus`

## Summary

This round consolidates the visible product navigation from 17 product surfaces / 22 sidebar entries into 7 first-level modules. The change is intentionally limited to renderer navigation configuration and documentation: no routes, pages, IPC handlers, storage strategy, authentication, RBAC rules, or main-process domain services were removed or moved.

The sidebar now reads from `src/renderer/navigation/moduleGroups.tsx`. Future visible navigation changes should start in that file instead of adding another hardcoded list inside `Sidebar.tsx`.

## Seven Modules

| Module | Purpose |
|---|---|
| Workspace | Daily entry point for dashboard, project work, and app settings. |
| Models | Provider, model routing, runtime profile, and health visibility. |
| Gateway | Local API gateway, token usage, and diagnostics. API Key management, CCS import, call logs, and gateway test panels are reserved for later implementation. |
| Agents | Agent Studio, Workflow Studio, Skill Hub, and Prompt Lab. |
| Memory | Shared Memory today, with Templates, Knowledge Base, and RAG reserved for later implementation. |
| Security | Security Center, Safety Guard, Admin Users, Audit Logs, RBAC, login, and audit workflows. |
| Operations | Ecosystem, Git/Handoff, Log Analyzer, MCP / Plugin management, version handoff, and runtime diagnostics. |

## Sidebar Entry Mapping

| Previous sidebar entry | Route | New module |
|---|---|---|
| Nexus Home | `/` | Workspace |
| Project Hub | `/projects` | Workspace |
| Settings | `/settings` | Workspace |
| Provider Hub | `/providers` | Models |
| Model Router | `/router` | Models |
| Runtime Switcher | `/runtime` | Models |
| Health Monitor | `/health` | Models |
| Local Gateway | `/gateway` | Gateway |
| Token Center | `/tokens` | Gateway |
| Diagnostics | `/diagnostics` | Gateway |
| Agent Studio | `/agents` | Agents |
| Agent Flows | `/workflows` | Agents |
| Skills | `/skills` | Agents |
| Prompt Lab | `/prompts` | Agents |
| Shared Memory | `/memory` | Memory |
| Security Center | `/security` | Security |
| Safety Guard | `/safety` | Security |
| Admin Users | `/admin/users` | Security |
| Audit Logs | `/admin/audit` | Security |
| Ecosystem | `/ecosystem` | Operations |
| Git Timeline | `/git` | Operations |
| Log Analyzer | `/logs` | Operations |

All 22 previous sidebar entries remain available as second-level links under the 7 first-level modules.

## Legacy And Non-Sidebar Routes

These routes remain registered in `src/renderer/App.tsx` and were not removed:

| Route | Status |
|---|---|
| `/login` | Non-sidebar authentication route. |
| `/projects/:id` | Non-sidebar project detail route. |
| `/prompt-lab` | Legacy alias for Prompt Lab. |
| `/log-analyzer` | Legacy alias for Log Analyzer. |
| `/git-timeline` | Legacy alias for Git Timeline. |
| `/safety-box` | Legacy alias for Safety Guard. |
| `/shared-memory-hub` | Legacy alias for Shared Memory. |

The sidebar links use the canonical routes, while alias paths are tracked in navigation config so active states still map to the correct second-level item.

## Files Changed

- `src/renderer/navigation/moduleGroups.tsx`: new configuration source for 7 module groups and all 22 sidebar entries.
- `src/renderer/components/Sidebar.tsx`: now renders grouped navigation from `moduleGroups`; permissions, active state, collapsed titles, icons, and i18n label keys are preserved.
- `README.md`: records the 7-module navigation model and this round's documentation entry.
- `PROJECT_PROGRESS.md`: records the 2026-05-12 navigation consolidation.
- `handoff/ARCHITECTURE.md`: records the renderer navigation configuration layer.
- `handoff/TEST_REPORT.md`: records validation for this navigation consolidation.
- `handoff/NAVIGATION_RESTRUCTURE.md`: this handoff note.

## Guardrails

- No `docs/build-plans/` directory was created.
- No `build-plan.md` file was created.
- No route, IPC, storage, auth, or RBAC implementation was changed.
- Existing dirty worktree files outside this scope were left unstaged.

## Validation

| Check | Result |
|---|---:|
| `npm.cmd install` | PASS |
| `npm.cmd run typecheck` | PASS |
| `npm.cmd run lint` | PASS, 0 errors / 21 existing warnings |
| `npm.cmd run test` | PASS, 26 files / 189 tests |
| `npm.cmd run build` | PASS |
| `npm.cmd run verify` | PASS, verify 131/131 plus smoke 213/213 |
| `npm.cmd run test:e2e` | PASS, 19/19 |
| `npm.cmd run test:electron-startup` | PASS |
| `npm.cmd run test:electron-auth-bridge` | PASS |
| `npm.cmd run shortcut` | PASS |
| Shortcut COM inspection | PASS |

Shortcut state after this round:

```text
C:\Users\至亲\Desktop\LocalAI Nexus.lnk
TargetPath: D:\LocalAI Nexus\node_modules\electron\dist\electron.exe
Arguments: "D:\LocalAI Nexus\dist-electron\main\index.js"
WorkingDirectory: D:\LocalAI Nexus
IconLocation: D:\LocalAI Nexus\assets\localai-nexus.ico,0
```

## Next Step

The next round should create detailed build plans for the 7 major modules, with Gateway first because API Key management, CCS import, call logs, and local gateway test panels are reserved but not implemented in this navigation-only round.
