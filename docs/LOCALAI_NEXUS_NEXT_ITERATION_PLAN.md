# LocalAI Nexus Next Iteration Plan

Date: 2026-05-11
Workspace: `D:\LocalAI Nexus`
Branch target: `refactor-localai-nexus`

## 1. Purpose

This plan starts the next product stage after the Iteration 0-12 closeout. The current milestone turns LocalAI Nexus into a verified local-first AI gateway and AgentOps console with first-class routes, secure IPC surfaces, mock-provider forwarding, runtime profiles, router traces, security/context reports, and a local template ecosystem.

The next stage focuses on replacing the remaining diagnostic or mock-only paths with production-grade, user-confirmed behavior while preserving the same constraints: Electron security, JSON storage, local-first data, Shared Memory Hub, and `window.agentflow` compatibility.

## 2. Current Baseline

- Product identity: LocalAI Nexus.
- Primary repo: `D:\LocalAI Nexus`.
- Security model: renderer -> preload -> IPC -> domain service.
- Storage strategy: local JSON files with additive collections only.
- Verified product surfaces now include Provider Hub, Token Center, Health Monitor, Model Router, Local Gateway, Runtime Switcher, Diagnostics, Knowledge Base, Agent Studio, Workflow Studio, Shared Memory, Security Center, Local Ecosystem, Settings, and Git/Handoff.
- Gateway has CI-safe mock forwarding, Gateway restart wiring, and an OpenAI-compatible non-streaming path in code. Real upstream use still depends on user-supplied provider credentials.
- Knowledge Base has a local document preview/save path, persistent chunk index metadata, asset graph summary, quality state, and local retrieval testing. File upload/parsing, embedding provider binding, and vector RAG rebuild remain next-stage work.
- Ops has backup/restore preview and merge-only restore apply wiring. Destructive/full restore, migration runner, and crash/data repair remain next-stage work.
- Static fallback remains a recovery path, not the primary product target.

## 3. Next Stage Milestones

### Milestone A - Live Provider Confidence

Goal: make real provider forwarding trustworthy without storing or exposing raw keys in renderer state.

Scope:
- Add opt-in provider test fixtures that can run against user-provided OpenAI-compatible credentials.
- Add request/response redaction previews before enabling verbose diagnostics.
- Expand provider edit/update UI, provider disable confirmation, and masked credential rotation.
- Add endpoint-specific diagnostics for chat, responses, models, auth, timeout, and base URL mismatch.

Acceptance:
- Provider create, edit, disable, delete, rotate key, test, and set-active paths are covered by unit or E2E tests.
- Renderer never receives raw provider keys after save.
- Live-provider smoke is documented as skipped unless credentials are explicitly provided.

### Milestone B - Streaming And Cancellation

Goal: make streaming behavior useful for gateway clients and visible in LocalAI Nexus traces.

Scope:
- Support real upstream stream pass-through for compatible providers.
- Preserve mock streaming for CI.
- Add abort/cancel and timeout behavior with trace IDs.
- Add streaming usage metadata and final event accounting.

Acceptance:
- Mock streaming emits incremental chunks and final metadata in tests.
- Real streaming smoke is documented when credentials are available.
- Cancelled streams record audit and usage without leaking prompt content.

### Milestone C - Token Policy Enforcement

Goal: move Token Center from reporting into active routing governance.

Scope:
- Add editable daily/monthly quota, cooldown, concurrency, and per-model policy records.
- Enforce policies inside Model Router.
- Surface policy impact on Provider Hub, Token Center, Model Router, and Dashboard.

Acceptance:
- Quota exhaustion and cooldown affect router decisions.
- Token policy changes are audited.
- E2E covers a disabled/cooldown provider and a fallback route.

### Milestone D - Agent/Workflow Execution Controls

Goal: make Agent Studio and Workflow Studio safe operational surfaces.

Scope:
- Add pause, cancel, retry-safe-node, and resume controls where execution is deterministic or mocked.
- Add provider/model/context source attribution to every run.
- Add human owner and approval gates for risky tool/MCP actions.
- Add workflow export/import with version snapshots and secret-reference stripping.

Acceptance:
- Execution records show owner, provider/model, context sources, tool list, token usage, result, and failure reason.
- Dangerous tool/MCP paths require explicit permission and create audit events.
- Workflow import rejects privileged or secret-bearing bundles for ordinary users.

### Milestone E - Memory Graph And Recovery Packs

Goal: make Shared Memory Hub the reliable local recovery vault.

Scope:
- Add relationship graph/list view with related-memory drilldown.
- Add stale-memory review workflow.
- Add context-pack builder with selectable memories, docs, git diff, workflow run, provider trace, and test report sources.
- Add recovery prompt export with strict redaction.

Acceptance:
- Context-pack preview exactly lists included sources.
- Exported recovery packs contain no representative secrets.
- Search/filter by type, tag, status, project, date, and risk is covered.

### Milestone F - Packaging And Release Hardening

Goal: make LocalAI Nexus dependable as a daily Windows desktop tool.

Scope:
- Keep `npm.cmd run dist` reproducible.
- Verify shortcut, installer artifact, startup smoke, auth bridge, static fallback, long-run stability, and accessibility pass.
- Add installer launch notes and rollback path.

Acceptance:
- Packaging success or exact environment blocker is recorded in `handoff/TEST_REPORT.md`.
- Shortcut COM inspection matches the built Electron target.
- Long-run and static fallback checks pass before release.

## 4. Verification Matrix

Default gate after code changes:

```bat
npm.cmd run typecheck
npm.cmd run test
npm.cmd run build
npm.cmd run verify
```

UI and navigation gate:

```bat
npm.cmd run lint
npm.cmd run test:e2e
npm.cmd run test:static-browser
```

Desktop and packaging gate:

```bat
npm.cmd run test:electron-startup
npm.cmd run test:electron-auth-bridge
npm.cmd run test:launch-static
npm.cmd run test:long-run
npm.cmd run shortcut
npm.cmd run dist
```

Gateway smoke after app launch:

```bat
powershell -NoProfile -Command "Invoke-RestMethod http://127.0.0.1:8317/health"
powershell -NoProfile -Command "Invoke-RestMethod http://127.0.0.1:8317/v1/models"
```

## 5. Documentation Requirements

Every next-stage milestone must update:

- `PROJECT_PROGRESS.md`
- `handoff/TEST_REPORT.md`
- `handoff/NEXT_STEPS.md`
- `CHANGELOG.md`
- Any architecture docs affected by changed IPC, gateway, provider, runtime, memory, security, or workflow behavior

## 6. Exit Criteria

The next stage is complete only when:

- User-visible behavior matches the documented status.
- All changed routes have loading, empty, error, and data states.
- All new IPC handlers have permission checks and sanitized outputs.
- Mock and non-credentialed tests pass in CI-safe mode.
- Credential-dependent live tests are either run with user-provided credentials or explicitly marked skipped.
- Packaging either succeeds or has an exact environment-limited failure record.
- Changes are committed and pushed from `refactor-localai-nexus`.
