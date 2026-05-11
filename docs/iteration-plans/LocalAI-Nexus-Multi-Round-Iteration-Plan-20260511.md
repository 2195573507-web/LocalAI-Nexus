# LocalAI Nexus Multi-Round Iteration Plan

Date: 2026-05-11
Workspace: `D:\LocalAI Nexus`
Branch: `refactor-localai-nexus`
Plan name: LocalAI Nexus Long-Term Iteration Plan Archive
Plan status: Plan archive only. This round did not implement code, UI, localization, tests, dependencies, configuration, business logic, or shortcut fixes.

## User-Readable Summary

LocalAI Nexus is a local-first Electron desktop app for AI project orchestration, local gateway routing, provider/runtime management, Agent/Workflow operations, Shared Memory recovery, safety review, and handoff generation. The project already has a broad product shell, many domain services, and a verified desktop shortcut, but it still needs a long-running iteration path that separates real product maturity from partially proven surfaces.

This archived plan defines seven future implementation rounds. Each round is intended to be executed later with its own code changes, tests, screenshots or evidence, documentation updates, commit, and push. The current round is limited to auditing, learning from comparable products, writing this plan, indexing it from active docs, and recording read-only verification.

## Tool And Repository Status

| Area | Status |
|---|---|
| Git root | `D:/LocalAI Nexus` from `git rev-parse --show-toplevel` |
| Origin | `https://github.com/2195573507-web/LocalAI-Nexus.git` |
| Branch | `refactor-localai-nexus` |
| `using-superpowers` skill | Available |
| `using-superpower` skill | Missing; continued with `using-superpowers` and equivalent structured workflow |
| Browser Use plugin | Available in plugin cache |
| Git | Available, `git version 2.54.0.windows.1` |
| GitHub CLI | Missing (`gh` not found) |
| Node / npm | Node `v24.14.1`, npm `11.11.0` through `npm.cmd` |
| Package checks this round | Package scripts inspected only; no install/build/test/lint commands run |
| Shortcut check | `C:\Users\至亲\Desktop\LocalAI Nexus.lnk` points to the current Electron entry in this workspace |

## Current Project State

- The app is an Electron 33, React 18, TypeScript, Vite, Tailwind desktop tool with JSON file storage and a secure preload/IPC boundary.
- The active product identity is LocalAI Nexus, while compatibility names such as `window.agentflow` and `start-agentflow*.bat` still exist for bridge, storage, and launcher continuity.
- Current active documentation says the desktop Electron app is primary and the static app is a recovery fallback.
- Existing status docs record verified checks for typecheck, lint, unit tests, smoke, verify, build, E2E, static browser, launch-static, Electron startup, auth bridge, long-run, shortcut, COM inspection, and Gateway HTTP smoke.
- Packaging remains environment-limited: `npm.cmd run dist` produced `release/win-unpacked/LocalAI Nexus.exe`, but the final electron-builder/app-builder package step timed out locally.
- The project has many active product surfaces: Dashboard, Provider Hub, Token Center, Health Monitor, Model Router, Local Gateway, Runtime Switcher, Diagnostics, Skill Hub, Agent Studio, Workflow Studio, Shared Memory, Security Center, Ecosystem, Git/Handoff, Admin, and Settings.
- `src/main/ipc.ts`, `src/renderer/routes/ProjectDetail.tsx`, `src/renderer/routes/SharedMemoryHub.tsx`, `src/renderer/routes/PromptLab.tsx`, and several route files are large enough to deserve careful future decomposition, but this plan does not perform that work.
- Existing dirty state before this plan included documentation changes plus non-document changes in `scripts/create-shortcut.ps1` and `start-agentflow.bat`; future commits must avoid accidentally staging non-document files when the round is docs-only.

## Main Problems And Risks

| Area | Problem | Risk |
|---|---|---|
| Product truth | Some docs still mix old workspace names, old AgentFlow phrasing, and new LocalAI Nexus identity. | New agents may follow stale paths or overstate maturity. |
| New-user journey | The app has many modules, but the first practical path can still feel unclear without guided entry, examples, and empty-state actions. | Users may not understand how to go from launch to provider setup, gateway use, and workflow execution. |
| UI and localization | Recent work added i18n and Chinese surfaces, but source text still contains English strings in workflow/runtime errors, seeded/demo data, route copy, tests, and documentation. | User-visible English can leak into the main UI and create inconsistent terminology. |
| Agent/Workflow maturity | Execution records exist, but advanced controls such as pause, cancel, retry-safe-node, resume, approval gates, import/export validation, and failure recovery remain next-stage work. | The product can look complete while operational control is still shallow. |
| Security and reliability | Credentials, IPC, ACL, audit, MCP, import/export, and memory redaction need repeated review as features expand. | Renderer convenience checks could be mistaken for the real permission boundary. |
| Test discipline | There is a strong script set, but future contributors may run broad commands without recording environment limits or shortcut state. | Regressions may be hidden behind stale reports or untracked local state. |
| Desktop release | Shortcut and unpacked app are verified, but installer packaging is not fully closed. | Users may have a working dev desktop path but not a release-quality install path. |

## Reference Learning

These references are used for product and UX patterns only. Do not copy code, brand assets, or proprietary designs.

| Reference | What To Learn | LocalAI Nexus Translation |
|---|---|---|
| Flowise | Visual flows, agent/chatflow separation, templates, integrations, marketplace-style discovery. | Use workflow templates, clear node states, and visible integration health without hiding local security boundaries. |
| Dify | First-run onboarding, app/workflow split, dataset/knowledge workflows, evaluation and operations surfaces. | Give new users a guided path from provider to workflow to knowledge/memory-backed execution. |
| Langflow | Component-based flow authoring, inspectable nodes, reusable components, playground-like iteration. | Make Agent/Workflow nodes inspectable with input/output previews, validation, and failure reasons. |
| Open WebUI | Local-first model/provider surfaces, tools/functions, admin settings, model selection, user-facing simplicity. | Keep provider/runtime setup straightforward and local while preserving advanced controls for power users. |
| n8n | Workflow execution history, retry/error handling, credentials model, templates, production workflow discipline. | Add durable execution records, retry policies, and credential/audit separation. |
| Botpress | Conversational agent builder, knowledge bases, nodes, guarded actions, publish-oriented workflow. | Add approval gates, tool risk labeling, and user-readable agent behavior summaries. |
| Coze Studio | Agent/workflow composition, plugin-like capabilities, knowledge and publishing surfaces. | Treat skills, MCP tools, memory packs, and workflows as explicit capabilities with provenance and permission. |
| FastGPT | Knowledge-base centric AI applications and workflow orchestration. | Improve Shared Memory and recovery packs as controlled knowledge sources for local AI work. |
| OpenAI Agent Builder / AgentKit | Agent workflow design, evaluation, tracing, guardrails, and deploy discipline. | Add trace, eval, guardrail, and rollout thinking to every future agent/workflow feature. |

## Optimizations Worth Landing

- Add a single first-run path: provider setup, gateway health, workflow creation, memory/context selection, run, review, export.
- Reduce stale docs and historical files in active root while preserving archived evidence.
- Make Chinese the default app-facing language for the main UI, with explicit English acronym policy for Agent, Workflow, MCP, API, and Token.
- Split large route and IPC surfaces by domain only when tests and compatibility checks protect behavior.
- Strengthen Agent/Workflow operations around traceability, controls, error recovery, and human approval.
- Expand security enforcement in main-process services, not just renderer guards.
- Keep verification evidence current and separate code changes, local checks, runtime confirmation, shortcut state, and packaging status.

## Not Suitable To Copy Now

- Cloud-hosted multi-tenant collaboration from Dify, Botpress, or Coze; LocalAI Nexus is local-first and should not upload memory or secrets.
- Large hosted plugin marketplaces before local bundle validation, permission review, and MCP boundaries mature.
- Heavy visual canvas rebuilds before current workflow behavior, node traces, and failure recovery are trustworthy.
- Full database migration from JSON storage; the current project explicitly keeps JSON storage unless discussed.
- Decorative marketing-style landing pages; the app should remain a compact desktop tool.
- Complex animation or Liquid Glass styling; the current design direction is flat, restrained, and system-font based.

## Chinese Localization Audit And Route

Default policy: Chinese-first UI for the app's main user-facing surfaces. Keep English acronyms only where they are product terms or ecosystem standards, and use them consistently: Agent, Workflow, MCP, API, Token, JSON, CLI, E2E.

Audit scope for Iteration 3:

- Interface copy: Dashboard, navigation, topbar, route headers, charts, labels, badges, status text.
- Buttons and commands: create, delete, save, cancel, retry, run, export, import, approve, reject, copy, refresh.
- Menus and sidebars: route names, grouped navigation, breadcrumbs, tooltips, icon-only aria labels.
- Modals and drawers: confirmation text, destructive warnings, empty actions, validation prompts.
- Empty/loading/error states: Loading, Error, no data, failed request, disabled state, retry guidance.
- Forms: placeholders, helper text, validation errors, provider/runtime/skill/workflow settings.
- Login/Admin surfaces: admin user management, audit events, roles, ACL, session and password prompts.
- Agent/Workflow pages: node names, run state, trace labels, failure reasons, next steps, approval gates.
- Test/demo data: seeded project/task/workflow/memory copy that can appear in the UI.
- Documentation: README quick-start and user-visible entry guidance.

Known likely sources of English residue:

- `src/core/workflowRuntime.ts` user-facing validation and next-step messages.
- Large route files and seeded/demo data under `src/main/index.ts` and `src/renderer/routes/*`.
- Test fixture strings that may represent visible UI behavior.
- Older handoff/archive docs, which should be classified as historical rather than live UI copy.

## Current Done / Not Done / Deferred

| Status | Items |
|---|---|
| Completed before this plan | LocalAI Nexus identity, broad route shell, flat UI direction, provider/router/gateway/runtime/security/memory surfaces, shortcut COM verification, broad local verification matrix. |
| Completed this round | Project audit, reference learning, plan archive creation, docs index updates, read-only script/shortcut/Git checks. |
| Not completed this round | No code implementation, no UI refactor, no localization fixes, no test execution, no shortcut mutation, no dependency or config changes. |
| Deferred | Live provider smoke, streaming/cancellation, token enforcement, workflow controls, memory graph, packaging timeout, installer verification. |

## Round 1 - Project Structure Cleanup And File Archiving

### Goal

Clean redundant files, process files, duplicate docs, old reports, and stale handoff material while preserving active runtime assets, source, tests, current docs, and evidence needed by scripts or IPC.

### Optimization Source

Project scans show active docs, archive folders, handoff files, build outputs, logs, static fallback assets, compatibility launchers, and generated artifacts can be confused. Prior cleanup notes also show active handoff files may be runtime dependencies.

### Reference Learning Objects

Flowise docs organization, Dify documentation IA, n8n docs and template organization, GitHub Desktop's simple user-facing structure, mature open-source `docs/`, `src/`, `tests/`, `scripts/`, `release/`, and `handoff/` separation.

### Specific Tasks

- Inventory root files, `docs/`, `handoff/`, `archive/`, `.codex-parallel/`, `logs/`, `dist/`, `release/`, `static-app/`, and launchers.
- Identify active files referenced by `scripts/verify-build.js`, `scripts/smoke-test.js`, `src/main/ipc.ts`, README, and handoff docs before moving anything.
- Move purely historical docs/reports into dated archive folders with an archive index.
- Keep active docs concise: README, PROJECT_PROGRESS, TEST_REPORT, NEXT_STEPS, architecture, structure audit, worklog, and current iteration plans.
- Add a directory-purpose table to README or docs if it is missing or stale.
- Record every move, keep/delete decision, and compatibility exception.

### Parallel Task Groups

| Group | Work |
|---|---|
| A - File dependency scan | Search scripts, IPC, docs, launchers, and tests for active references before any move. |
| B - Archive classification | Classify historical, generated, active, and compatibility files into a proposed move table. |
| C - Documentation update | Update README/PROJECT_PROGRESS/handoff with the final directory map and moved-file index. |

### Acceptance Requirements

- Project root is easier to scan and does not contain obvious stale process files.
- Active scripts and IPC references still resolve.
- No necessary source, tests, launchers, active handoff files, or Shared Memory surfaces are deleted.
- README and docs explain major directory purposes.
- Historical material is archived non-destructively unless the user explicitly approves deletion.

### Testing Requirements

- Run `git status -sb`, reference search, and docs link/path checks.
- Run `npm.cmd run verify`, `npm.cmd run test`, and `npm.cmd run build` after actual cleanup changes.
- Record shortcut COM state after cleanup but only repair it if that future round explicitly allows shortcut mutation.

### Deliverables

- Updated archive index and structure audit.
- README/PROJECT_PROGRESS directory map.
- Handoff note with moved paths and preserved active paths.
- Commit with a `docs:` or `chore:` message depending on whether code-adjacent files move.

### Risk And Next-Round Suggestion

Risk: moving an active handoff or launcher dependency can break smoke/verify scripts. Next round should focus on first-run flow only after cleanup leaves active docs and runtime paths unambiguous.

## Round 2 - New User Flow Optimization

### Goal

Make a new user understand what to do after opening LocalAI Nexus: set provider, verify gateway, choose context, create/run a workflow, review output, and export handoff.

### Optimization Source

The app has many modules and successful route coverage, but the first useful path is distributed across multiple pages. Empty states and examples should make the product feel usable without reading handoff docs.

### Reference Learning Objects

Dify's app creation path, Flowise templates, Open WebUI model/provider settings, n8n templates and workflow start points, Langflow playground-style iteration.

### Specific Tasks

- Define the first-run checklist shown on Dashboard: add provider, test provider, start/check gateway, create workflow, run example, save memory, export handoff.
- Add example project/workflow templates that use safe mock data and clear labels.
- Improve empty states on Provider Hub, Workflow Studio, Shared Memory, Runtime Switcher, Security Center, and Git/Handoff.
- Add one-click paths from Dashboard to the relevant next action.
- Ensure startup has no unnecessary popups or console windows.
- Document the first-use path in README and handoff.

### Parallel Task Groups

| Group | Work |
|---|---|
| A - Product flow | Specify Dashboard checklist, route transitions, empty states, and template entry points. |
| B - Data and examples | Design safe demo content, template metadata, and no-secret defaults. |
| C - Verification | Add E2E paths for first-run actions and empty/data states. |

### Acceptance Requirements

- A new user can see the next action on launch without reading docs.
- Dashboard links reach provider setup, gateway health, workflow creation, and memory review quickly.
- Empty states include useful Chinese copy and a clear primary action.
- Example content is safe, local, and does not include real secrets.
- No extra startup popups or terminal windows appear in the desktop path.

### Testing Requirements

- Run `npm.cmd run typecheck`, `npm.cmd run test`, `npm.cmd run test:e2e`, and `npm.cmd run test:electron-startup`.
- Add or update E2E tests for first-run checklist visibility and route transitions.
- Capture screenshots or notes for Dashboard, Provider Hub empty state, Workflow empty state, and Shared Memory empty state.

### Deliverables

- First-run UX implementation.
- Example/template seed update if needed.
- Updated README, PROJECT_PROGRESS, TEST_REPORT, and NEXT_STEPS.
- Commit with a `feat:` or `style:` message depending on implementation scope.

### Risk And Next-Round Suggestion

Risk: adding onboarding without reducing visual complexity can make the UI feel busier. Next round should consolidate UI patterns and finish Chinese localization.

## Round 3 - UI And Interaction Refactor Plus Chinese Localization

### Goal

Improve the UI into a compact, clear desktop tool and complete Chinese-first localization across the user-visible app. Avoid Liquid Glass, heavy blur, decorative gradients, or marketing-style layouts.

### Optimization Source

The project already has `SurfaceCard`, CSS variables, flat design-system docs, and partial i18n. English strings remain likely in runtime messages, seeded data, route copy, test-visible text, and docs.

### Reference Learning Objects

Flowise visual workflow pages, Dify clean app/workflow layout, Langflow node/component inspector, Open WebUI settings simplicity, n8n execution history and node statuses, VS Code workbench conventions.

### Specific Tasks

- Audit all user-visible strings in routes, shared UI components, runtime messages, seeded data, and tests.
- Route all supported visible copy through i18n or a documented Chinese-first copy layer.
- Standardize route titles, buttons, menus, modals, empty states, forms, validation, errors, and status labels.
- Keep Agent, Workflow, MCP, API, Token, JSON, CLI, and E2E as consistent terms when appropriate.
- Polish core layout: sidebar grouping, topbar status, data density, table/card rhythm, focus states, and responsive `1024x680` behavior.
- Keep icons from `lucide-react` and use tooltips/aria labels for icon-only buttons.
- Add screenshot/manual review evidence for main pages.

### Parallel Task Groups

| Group | Work |
|---|---|
| A - Localization audit | Scan code and UI for English residue, classify user-visible vs internal/test-only text, and update i18n keys. |
| B - UI primitives | Align SurfaceCard, Button, Input, Modal, EmptyState, charts, sidebar, and topbar behavior. |
| C - Page review | Verify Dashboard, Settings, Login/Admin, Provider, Workflow, Agent, Memory, Security, Runtime, and Gateway pages in light/dark modes. |

### Acceptance Requirements

- App main UI defaults to complete Chinese-first copy.
- Obvious English residues such as Dashboard, Settings, Workflow, Create, Delete, Save, Cancel, Loading, and Error do not appear unlocalized in main UI.
- Professional acronyms are retained only when consistent with the glossary.
- Buttons, menus, prompts, modals, empty states, validation, and errors share one Chinese style.
- If language switching remains supported, i18n keys must cover both Chinese and English where exposed.
- Screenshots or E2E/manual notes record the primary page localization result.
- UI remains flat, restrained, readable, and usable at `1024x680`.

### Testing Requirements

- Run `npm.cmd run typecheck`, `npm.cmd run lint`, `npm.cmd run test`, `npm.cmd run test:e2e`, `npm.cmd run test:static-browser`, and `npm.cmd run scan:mojibake`.
- Add or update tests for i18n helpers, language persistence, and representative page copy.
- Check light and dark modes manually or with browser screenshots.

### Deliverables

- Localization audit table with fixed/deferred items.
- UI polish implementation and screenshots.
- Updated UI design-system notes if patterns change.
- Updated PROJECT_PROGRESS and TEST_REPORT.
- Commit with `style:` or `feat:` depending on scope.

### Risk And Next-Round Suggestion

Risk: broad string replacement can damage tests, hidden compatibility copy, or API labels. Next round should use the cleaned UI to expose deeper Agent/Workflow controls.

## Round 4 - Agent And Workflow Core Capability Enhancement

### Goal

Make Agent and Workflow operation clearer, safer, and more useful: creation, execution, node state, failure cause, recovery path, history, and human approval should be visible and actionable.

### Optimization Source

Execution-record surfaces exist, but advanced controls and operational recovery are still in progress. Current workflow runtime messages also indicate incomplete graph and provider/model errors that should become structured UI states.

### Reference Learning Objects

Flowise agentflows/chatflows, Langflow node tracing and component configuration, n8n execution history and retry behavior, Dify workflow operations, Botpress guarded actions, OpenAI AgentKit tracing/evals/guardrails.

### Specific Tasks

- Define a workflow run model with status, active node, input/output summaries, error type, trace ID, owner, provider/model, token estimate, and next action.
- Add pause/cancel/retry-safe-node/resume behavior where it can be implemented safely.
- Add node-level validation before run: missing start/output nodes, broken edges, missing provider/model, risky tool calls.
- Add approval gates for sensitive tool/MCP actions.
- Improve run history and compare failed/successful runs.
- Add import/export validation for workflow definitions.
- Record audit events for create, update, run, cancel, retry, approve, fail, and export.

### Parallel Task Groups

| Group | Work |
|---|---|
| A - Runtime model | Define structured run state, validation, trace, and recovery semantics. |
| B - UI operations | Add visible controls, run history, node state, failure detail, and next-action guidance. |
| C - Security/audit | Add approval gates, permission checks, and audit coverage for risky transitions. |

### Acceptance Requirements

- Users can create a workflow, understand its required setup, run it, see progress, and understand failures.
- Failure states include user-readable Chinese reasons and concrete next steps.
- Risky actions require explicit user approval and are audited.
- Retry/resume only appears where safe and explainable.
- Workflow import/export rejects invalid or unsafe data with clear errors.

### Testing Requirements

- Run `npm.cmd run typecheck`, `npm.cmd run test`, `npm.cmd run test:e2e`, and `npm.cmd run verify`.
- Add unit tests for runtime validation, retry eligibility, and import/export validation.
- Add E2E coverage for create/run/fail/retry or fail-guidance flows.

### Deliverables

- Agent/Workflow runtime and UI enhancements.
- Updated shared types and IPC docs if interfaces change.
- TEST_REPORT evidence and NEXT_STEPS update.
- Commit with `feat:`.

### Risk And Next-Round Suggestion

Risk: workflow controls can accidentally imply arbitrary tool execution. Next round should harden permission, audit, token, storage, and IPC boundaries before adding more automation power.

## Round 5 - Security, Permissions, Audit, And Data Reliability

### Goal

Strengthen login, admin, RBAC, ACL, audit, token handling, Local Storage behavior, IPC validation, file path safety, provider credentials, MCP boundaries, import/export redaction, and JSON storage reliability.

### Optimization Source

AGENTS rules make IPC and main-process boundaries non-negotiable. Existing surfaces include RBAC/ACL/audit/security reports, but future feature growth increases the risk of renderer-only enforcement or secret leakage.

### Reference Learning Objects

n8n credential separation and workflow execution records, Open WebUI admin/tool permission patterns, Dify app/workflow operational controls, OpenAI guardrails/tracing, Obsidian-style local data ownership.

### Specific Tasks

- Review every IPC handler for input validation, path sanitization, permission checks, redacted output, and audit behavior.
- Ensure sensitive provider fields never appear raw in renderer, logs, memory, exports, or screenshots.
- Strengthen admin flows: session expiry, password-change state, role/ACL update paths, and audit events.
- Add resource-level ACL tests for projects, workflows, memories, providers, and exports.
- Review MCP/tool gateway permissions and explicit approval behavior.
- Add JSON storage backup/restore or corruption recovery strategy.
- Improve security report severity, trace IDs, and remediation actions.

### Parallel Task Groups

| Group | Work |
|---|---|
| A - Boundary audit | Inspect IPC/preload/main services, path handling, renderer calls, and secret redaction. |
| B - Auth/ACL/audit | Strengthen session, role, ACL, audit event, and admin UI behavior. |
| C - Data reliability | Add storage integrity, backup/restore, import/export validation, and corruption handling. |

### Acceptance Requirements

- Sensitive data is never exposed raw in renderer-visible paths or memory exports.
- Permission checks happen in main-process/domain service paths, not only in UI.
- Audit records provide actor, action, resource, outcome, timestamp, and trace ID where relevant.
- Import/export rejects or redacts secrets safely.
- Storage failure paths have user-readable errors and recovery guidance.

### Testing Requirements

- Run `npm.cmd run typecheck`, `npm.cmd run test`, `npm.cmd run test:e2e`, and `npm.cmd run verify`.
- Add unit tests for redaction, ACL denial, audit event creation, path sanitization, storage recovery, and MCP approval.
- Add E2E/admin checks for permission-denied and audit visibility.

### Deliverables

- Security audit notes and fixes.
- Updated security docs and TEST_REPORT.
- Optional migration/recovery notes if storage shape changes additively.
- Commit with `fix:`, `feat:`, or `refactor:` based on actual change.

### Risk And Next-Round Suggestion

Risk: security work can break existing flows if done without coverage. Next round should turn the broader verification matrix into a repeatable quality gate.

## Round 6 - Test System And Quality Gates

### Goal

Make quality checks repeatable, documented, and trustworthy across unit tests, typecheck, lint, build, E2E, startup, gateway, shortcut, static fallback, long-run stability, and packaging.

### Optimization Source

The project has many scripts and prior PASS records, but future agents need clear rules for when to run each check, how to record failures, and how to separate environment limits from product failures.

### Reference Learning Objects

n8n workflow reliability discipline, OpenAI eval/trace workflows, Dify operations/evaluation mindset, mature Electron app CI/release practices.

### Specific Tasks

- Define a verification matrix by change type: docs-only, UI, IPC/security, workflow runtime, gateway/provider, launcher/packaging.
- Make TEST_REPORT updates structured and hard to overstate.
- Add missing tests for gateway streaming/cancellation once implemented, token policy enforcement, workflow controls, localization, and security denial paths.
- Add docs link checks or lightweight plan/report completeness checks.
- Add long-run and startup expectations to release readiness docs.
- Record known environment limits and retry rules.

### Parallel Task Groups

| Group | Work |
|---|---|
| A - Verification matrix | Define commands, when to run them, expected outputs, and report format. |
| B - Coverage gaps | Add targeted unit/E2E/smoke tests for highest-risk behavior. |
| C - CI/release evidence | Improve TEST_REPORT, NEXT_STEPS, and release checklist discipline. |

### Acceptance Requirements

- Each future change type has a clear minimum verification gate.
- TEST_REPORT distinguishes passed, failed, skipped, and environment-limited checks.
- Known failures are documented with owner, cause, and next action.
- E2E covers core routes, first-run path, localization, security denial, and workflow run paths.
- Long-run/startup/shortcut evidence is required before release claims.

### Testing Requirements

- Run the relevant matrix after the implementation round, typically `npm.cmd run typecheck`, `npm.cmd run lint`, `npm.cmd run test`, `npm.cmd run build`, `npm.cmd run verify`, `npm.cmd run test:e2e`, `npm.cmd run test:electron-startup`, and `npm.cmd run test:electron-auth-bridge`.
- Run `npm.cmd run test:long-run` for release/stability rounds.
- Avoid `npm.cmd run format` unless the round explicitly allows broad rewrites.

### Deliverables

- Verification matrix docs.
- Updated tests for defined gaps.
- Updated TEST_REPORT and release readiness notes.
- Commit with `test:` or `docs:`.

### Risk And Next-Round Suggestion

Risk: adding broad tests without stable fixtures can make development noisy. Next round should use the matrix to close desktop release and packaging readiness.

## Round 7 - Desktop Experience And Release Readiness

### Goal

Make desktop launch, shortcut, icon, packaging, version notes, installer/unpacked app, fallback launchers, README, and release evidence consistent and ready for users.

### Optimization Source

Current COM readback shows the desktop shortcut points to the current Electron entry in `D:\LocalAI Nexus`, but packaging remains environment-limited and compatibility launchers still use older AgentFlow names.

### Reference Learning Objects

GitHub Desktop release clarity, Open WebUI local deployment docs, n8n operational release docs, mature Electron release practices.

### Specific Tasks

- Verify desktop shortcut target, arguments, working directory, icon, old shortcut removal, and no console popup.
- Keep `scripts/create-shortcut.ps1` and launcher naming behavior clear, safe, and project-specific.
- Resolve packaging timeout or document exact local environment blocker with reproducible command evidence.
- Verify `release/win-unpacked/LocalAI Nexus.exe` and installer artifact if produced.
- Update README quick start, release checklist, version notes, and support/troubleshooting.
- Confirm static fallback remains available but not primary.
- Ensure Chinese/English README entry points are consistent with the app's language policy.

### Parallel Task Groups

| Group | Work |
|---|---|
| A - Desktop launcher | Check shortcut, icon, arguments, launcher scripts, startup smoke, and old shortcut cleanup. |
| B - Packaging | Run dist/release path, inspect artifacts, document environment limits, and validate installed/unpacked app. |
| C - User docs | Update README, release notes, troubleshooting, and handoff closeout. |

### Acceptance Requirements

- Desktop entry points point to the current project and latest usable app entry.
- Shortcut starts the app without unexpected console windows.
- Icon is correct and readable.
- Release/unpacked app starts and exposes the auth bridge.
- Packaging status is either fully passed or honestly environment-limited with exact evidence.
- README and handoff provide clear launch, verify, and troubleshooting steps.

### Testing Requirements

- Run `npm.cmd run typecheck`, `npm.cmd run test`, `npm.cmd run build`, `npm.cmd run verify`, `npm.cmd run test:electron-startup`, `npm.cmd run test:electron-auth-bridge`, `npm.cmd run shortcut`, and COM shortcut inspection.
- Run `npm.cmd run dist` with an appropriate timeout when release packaging is in scope.
- Run `npm.cmd run test:long-run` before release-ready claims.

### Deliverables

- Verified desktop shortcut and release artifacts.
- Updated README, PROJECT_PROGRESS, TEST_REPORT, NEXT_STEPS, and release notes.
- Commit and push with clear release or docs message.

### Risk And Next-Round Suggestion

Risk: packaging may fail because of local app-builder/electron-builder environment limits rather than app code. Next planning cycle should decide whether to add CI packaging or document a supported release machine.

## Cross-Round Risk List And Rollback Strategy

| Risk | Mitigation | Rollback |
|---|---|---|
| Staging unrelated dirty files | Check `git status -sb` before and after staging; stage explicit allowed paths. | `git restore --staged <path>` for unrelated files only. |
| Breaking IPC/security boundary | Keep renderer -> preload -> IPC -> domain service; test denial paths. | Revert the specific commit or feature flag the route. |
| Overstating incomplete behavior | Use Completed/In progress/Planned/Environment-limited labels. | Patch docs immediately and add TEST_REPORT correction. |
| Localization damages technical terms | Maintain glossary and acronym policy. | Revert affected i18n keys or restore specific terms. |
| Cleanup moves active files | Search references before moving; update scripts/docs together. | Move archived files back and document the dependency. |
| Packaging timeout repeats | Separate build success from packaging success; collect exact timeout evidence. | Keep unpacked app/static fallback as documented recovery path. |
| Secret leakage | Redact at input, storage, renderer output, logs, memory, and export. | Rotate affected keys, purge leaked artifacts, and add regression tests. |

## Git And Documentation Requirements For Every Future Round

- Start with `git rev-parse --show-toplevel`, `git status -sb`, and remote check.
- Preserve unrelated user changes and never reset or checkout them away.
- Update README/PROJECT_PROGRESS/handoff when behavior, verification, or launch paths change.
- Update TEST_REPORT with commands, results, skipped checks, and environment limits.
- Run the verification gate appropriate to the change type.
- Inspect desktop shortcut after meaningful app updates; only repair it in rounds that allow shortcut mutation.
- Commit with the project convention: `feat:`, `fix:`, `docs:`, `style:`, `refactor:`, `test:`, `chore:`, or `build:`.
- Push and record whether push succeeded separately from local verification.

## Current Round Read-Only Verification Record

Commands/checks performed or required for this plan-only round:

- `git rev-parse --show-toplevel`: confirmed `D:/LocalAI Nexus`.
- `git status -sb`: branch `refactor-localai-nexus`, dirty docs plus existing non-doc changes.
- `git remote -v`: origin is `https://github.com/2195573507-web/LocalAI-Nexus.git`.
- Package scripts inspected from `package.json`; no package command was executed.
- Skill/plugin/tool checks: `using-superpowers` available, `using-superpower` missing, Browser Use plugin present, Git/Node/npm present, `gh` missing.
- Shortcut COM readback: `LocalAI Nexus.lnk` points to `D:\LocalAI Nexus\node_modules\electron\dist\electron.exe` with `"D:\LocalAI Nexus\dist-electron\main\index.js`; target and working directory exist.
- `git diff --check`, `git diff --stat`, plan completeness checks, and docs-only staging are required after this file and index updates are written.

## Final Statement

This Markdown file is a long-term plan archive. It intentionally does not execute any planned feature work. Future agents should treat it as a roadmap and must still inspect the current repository state before implementing any round.
