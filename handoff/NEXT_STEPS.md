# LocalAI Nexus Next Steps

## Current Truth

LocalAI Nexus is the active product identity on branch `refactor-localai-nexus`. The Iteration 0-12 closeout is implemented and locally verified except for environment-limited final packaging.

The app now has a verified desktop shell, icon, shortcut, dashboard, first-class Provider/Token/Health/Router/Gateway/Runtime/Diagnostics/Agent/Security/Ecosystem pages, CI-safe gateway/provider paths, runtime exports, context/security reports, Shared Memory context-pack surfaces, and local bundle registry behavior.

The next-stage plan is `docs/LOCALAI_NEXUS_NEXT_ITERATION_PLAN.md`. The archived long-term multi-round plan is `docs/iteration-plans/LocalAI-Nexus-Multi-Round-Iteration-Plan-20260511.md`; it is plan-only and does not represent implemented feature work.

## Next-Round Priorities

1. **Live Provider Confidence**
   - Run opt-in live smoke against user-supplied OpenAI-compatible credentials.
   - Keep renderer key handling masked and main-process controlled.
   - Record skipped live-provider tests when credentials are not supplied.

2. **Streaming And Cancellation**
   - Add real upstream stream pass-through for compatible providers.
   - Preserve mock streaming for CI.
   - Add abort/cancel/timeout trace accounting.

3. **Token Policy Enforcement**
   - Make quota, cooldown, concurrency, and per-model policy records actively affect router decisions.
   - Show enforcement effects on Provider Hub, Token Center, Model Router, and Dashboard.

4. **Agent/Workflow Execution Controls**
   - Add pause, cancel, retry-safe-node, and resume behavior where safe.
   - Require human ownership and explicit permission for risky tool/MCP actions.

5. **Memory Graph And Recovery Packs**
   - Add graph/list relationship views and stale-memory review.
   - Build source-explicit context packs and recovery prompts with strict redaction.

6. **Packaging And Release Hardening**
   - Re-run `npm.cmd run dist` with a longer timeout or corrected electron-builder/app-builder environment.
   - Verify installer artifact, shortcut, startup, auth bridge, static fallback, long-run, and accessibility before release.

## Remaining Risks

- Real credentialed provider behavior is not proven without user-supplied keys.
- Real upstream streaming pass-through is still next-stage work.
- `npm.cmd run dist` currently builds and produces `release/win-unpacked/LocalAI Nexus.exe`, but the final electron-builder/app-builder package step exceeded the local verification timeout.
- Compatibility names remain for bridge/storage/launcher stability: `window.agentflow`, `agentflow-data`, `start-agentflow*.bat`.
- Historical handoff/archive files still mention AgentFlow Studio; active top-level docs explain the evolution.

## Useful Continue Commands

```bat
cd /d "D:\LocalAI Nexus"
git checkout refactor-localai-nexus
npm.cmd run typecheck
npm.cmd run test
npm.cmd run build
npm.cmd run verify
```

Gateway smoke after launching the desktop app:

```bat
powershell -NoProfile -Command "Invoke-RestMethod http://127.0.0.1:8317/health"
powershell -NoProfile -Command "Invoke-RestMethod http://127.0.0.1:8317/v1/models"
```

## Handoff Reading Order

1. `README.md`
2. `PROJECT_PROGRESS.md`
3. `handoff/TEST_REPORT.md`
4. `handoff/NEXT_STEPS.md`
5. `docs/LOCALAI_NEXUS_NEXT_ITERATION_PLAN.md`
6. `docs/iteration-plans/LocalAI-Nexus-Multi-Round-Iteration-Plan-20260511.md`
7. `docs/PROJECT_WORKLOG.md`
8. `docs/PROJECT_STRUCTURE_AUDIT.md`
9. `docs/LOCALAI_NEXUS_ITERATION_PLAN.md`
10. `docs/LOCALAI_NEXUS_ARCHITECTURE.md`

## Completion Discipline

Mark work as:

- `Completed`: implemented and verified.
- `In progress`: partial implementation exists or live credentials are required.
- `Planned`: design exists but code/tests do not prove it yet.
- `Environment-limited`: implementation/build gates passed, but local machine/network/tooling blocked the requested final side effect.
