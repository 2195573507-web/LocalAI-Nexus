# LocalAI Nexus Findings

## 2026-05-12 Module Build-Plan Findings

- `docs/build-plans/BUILD_PLAN_AUTHORING_MASTER_PLAN.md` is the authoritative total build-plan file for this task. It requires 8 independent plan units: 00 modular refactor plus 01-07 business modules.
- The required module plan files are `docs/build-plans/00-modular-refactor-master-plan/build-plan.md`, `01-workspace-and-project-center/build-plan.md`, `02-ai-resources-and-model-providers/build-plan.md`, `03-local-gateway-and-api-keys/build-plan.md`, `04-agent-workflow-and-mcp/build-plan.md`, `05-knowledge-prompt-and-memory/build-plan.md`, `06-observability-evaluation-and-feedback/build-plan.md`, and `07-identity-security-audit-and-ops/build-plan.md`.
- Each module plan must stay executable for Codex rather than becoming a conceptual note. The fixed 26-section structure is the shared acceptance surface.
- The current worktree already contains unrelated source and test edits from prior work; this documentation pass should stage only build-plan docs and directly related progress records if committing.

## 2026-05-11 First-Run Onboarding Findings

- Real Git root is `D:/LocalAI Nexus`; the current working directory is the root and origin is the expected `https://github.com/2195573507-web/LocalAI-Nexus.git`.
- `using-superpowers` is available and readable; the singular `using-superpower` name is not installed at the expected skill path.
- No GitHub plugin resources were found in `.agents/plugins`, `.codex-plugin`, MCP resources, or MCP templates. `gh` is also unavailable, so this run should use plain Git commands for commit and push.
- Baseline tool check passed for Node/npm/Git. `rg.exe` is blocked with Access denied, so repository searches must use PowerShell `Select-String` or Node scripts.
- Baseline `npm.cmd run typecheck` passed before onboarding edits.
- First-use pages already contain some Chinese-first onboarding work, but Projects/Prompt/Memory/data demo content still contains older English or Liquid Glass examples and several pages depend on seeded data rather than clear empty-state next actions.
- High-value beginner gap: Dashboard has quick actions, but the app still needs an explicit one-minute path that creates/opens a sample project, sample Agent, sample Workflow, sample Prompt, and shows a completed run result without requiring API keys.

## Context Findings

- The requested file exists at `docs/iteration-plans/LocalAI-Nexus-Multi-Round-Iteration-Plan-20260511.md`, not in the repository root.
- The file explicitly states it was a plan archive only and did not implement code. This session treats it as the execution scope because the user asked to complete all iteration plans.
- Current branch is `refactor-localai-nexus`, ahead of origin by one commit.
- Existing unstaged changes were present before this session in `scripts/create-shortcut.ps1` and `start-agentflow.bat`; preserve them unless they are required for this goal.
- Active handoff states Electron is primary, static fallback is recovery-only, JSON storage remains active, and Shared Memory Hub must stay.

## Verification Baseline From Docs

- Prior recorded checks passed: typecheck, lint, unit tests, smoke, verify, build, E2E, static browser, launch-static, Electron startup, auth bridge, long-run, shortcut, COM inspection, and Gateway HTTP smoke.
- Current packaging blocker is environment-limited but more specific than the old timeout note: `npm.cmd run dist` builds and produces `release/win-unpacked/LocalAI Nexus.exe`, then electron-builder fails extracting `winCodeSign-2.6.0.7z` because `7za.exe` cannot create symlinks for `darwin/10.12/lib/libcrypto.dylib` and `libssl.dylib` under the current Windows account.

## Memory-Derived Context

- Newest UI direction is compact flat desktop-tool UI with `SurfaceCard`, system fonts, restrained motion, and no Liquid Glass/heavy blur.
- For this repo, active docs/handoff files are deliverables and may be script or process dependencies; do reference checks before moving them.

## Localization Findings

- Dashboard contained user-visible English in the first-run checklist, status cards, quick actions, and empty states; these are now Chinese-first while preserving Provider/Gateway/Workflow terminology.
- New LocalAI Nexus module routes contained English headings and empty states; the highest-visibility modules now use Chinese-first copy.
- E2E tests had English-only assertions for first-run and module headings; these now accept the Chinese-first copy.
- Workflow runtime returned English validation and recovery guidance; it now returns Chinese-first actionable messages while keeping Workflow/Provider/API Key terminology.
- Login contained mojibake in user-facing Chinese text; it has been replaced with clean UTF-8 Chinese copy.

## Verification Findings

- Auth/admin E2E tests were still coupled to English labels after the UI became Chinese-first; using Chinese/English compatible semantic locators fixed the tests without changing product behavior.
- `npm.cmd run test:long-run` defaults to 30 minutes; shorter tool timeouts leave a static-server child process behind and should be cleaned before rerun.
- Current Gateway smoke is credential-free and exercises the diagnostic/mock path. It proves the local HTTP surface and routing diagnostics, not live provider forwarding.
- Live provider forwarding, real upstream streaming, real external MCP/tool approval, and final installer launch remain intentionally unclaimed without credentials, explicit permission, or a release machine with the required packaging privileges.

## Completion Audit Follow-Up Findings

- UI/renderer follow-up work: repair any residual low-visibility mojibake, align chart colors and status badges to design tokens, add explicit error states instead of silent empty data, and check 1024x680 overflow on dense pages.
- Security/main follow-up work: add a stricter external URL validator before `shell.openExternal`, make JSON storage read-modify-write atomic under the queue, sanitize `dialog:open` options, and expand path/IPC permission tests.
- Tests/docs follow-up work: add verification-matrix consistency checks, introduce a fast long-run test entry, normalize machine test artifacts versus handoff docs, and add packaging preflight/status consistency checks.

## 2026-05-12 Quick Closeout Findings

- The actionable local unfinished task was not another broad feature pass; it was closing the first-run onboarding loop and syncing stale plan/test expectations to the existing implementation.
- Manual demo Agent creation needed a persisted `agentExecutions` record. Keeping the record in renderer state made pause/cancel/retry/resume controls point at an execution id that the main process could not find.
- Project-local `npm.cmd run test:e2e` is the correct Playwright entrypoint because it installs/uses `.codex-parallel/ms-playwright`; direct `npx` routes can fail through PowerShell policy or the wrong browser cache.
- Current local verification is green, but live provider forwarding, real streaming, external MCP/tool approval, and final installer packaging remain unproven without credentials or packaging privileges.

## 2026-05-12 Module Implementation Findings

- The only material local acceptance gap after the broad module work was Gateway external config portability: the app had generic config export/import and Gateway env/Codex/Claude export, but no Gateway-specific ccs/sub2api/cc-switch preview/merge/backup/audit path.
- The safe closure is a local import ledger rather than silent external writes. Gateway config import now normalizes and redacts ccs/sub2api/cc-switch/claude-code/codex/openai-env inputs, stores a merge record, creates a redacted backup checkpoint, and records audit metadata.
- Secret redaction needed to treat LocalAI Nexus `lnx_...` Gateway keys and prefixed environment names such as `OPENAI_API_KEY` as sensitive; otherwise previews could leak external key-like values.
- Static smoke checks are useful only when they read variables declared before use; one failed smoke run was caused by referencing `apiWrapper` before initialization, not by product behavior.
