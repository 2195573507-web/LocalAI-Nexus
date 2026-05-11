# Codex Continuation Prompt - LocalAI Nexus

Use this prompt when continuing LocalAI Nexus after the Iteration 0-12 closeout.

## Read First

1. `AGENTS.md`
2. `PROJECT_PROGRESS.md`
3. `handoff/TEST_REPORT.md`
4. `handoff/NEXT_STEPS.md`
5. `docs/LOCALAI_NEXUS_NEXT_ITERATION_PLAN.md`
6. `docs/LOCALAI_NEXUS_ARCHITECTURE.md`
7. `package.json`

## Non-Negotiable Rules

- Work in `D:\LocalAI Nexus`.
- Do not rebuild from scratch.
- Preserve Git history.
- Preserve JSON storage unless the user explicitly approves a migration.
- Do not remove Shared Memory Hub.
- Keep Electron security invariants: `contextIsolation: true`, `nodeIntegration: false`, native work only through preload/IPC.
- Do not expose arbitrary command execution.
- Do not store or reveal raw provider API keys in renderer-visible state.
- Use `npm.cmd`, not plain `npm`, from PowerShell.

## Current Baseline

- Branch: `refactor-localai-nexus`.
- Built Electron LocalAI Nexus app is the primary deliverable.
- Static fallback is recovery-only.
- Typecheck, test, verify, build, E2E, static, startup, auth bridge, long-run, shortcut, and Gateway smoke have passed.
- `npm.cmd run dist` is blocked by a local electron-builder/app-builder packaging timeout after app build and `release/win-unpacked/LocalAI Nexus.exe` generation, not by app build failure.

## Next Stage

Follow `docs/LOCALAI_NEXUS_NEXT_ITERATION_PLAN.md`:

1. Live Provider Confidence
2. Streaming And Cancellation
3. Token Policy Enforcement
4. Agent/Workflow Execution Controls
5. Memory Graph And Recovery Packs
6. Packaging And Release Hardening

## Verification Discipline

Default after code changes:

```bat
npm.cmd run typecheck
npm.cmd run test
npm.cmd run build
npm.cmd run verify
```

UI/navigation changes:

```bat
npm.cmd run lint
npm.cmd run test:e2e
npm.cmd run test:static-browser
```

Desktop/package changes:

```bat
npm.cmd run test:electron-startup
npm.cmd run test:electron-auth-bridge
npm.cmd run test:launch-static
npm.cmd run test:long-run
npm.cmd run shortcut
npm.cmd run dist
```

Credential-dependent tests must be marked skipped unless the user supplies explicit credentials.
