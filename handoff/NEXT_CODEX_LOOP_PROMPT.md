# Next Codex Loop Prompt

Continue LocalAI Nexus in `D:\LocalAI Nexus` on branch `refactor-localai-nexus`.

Read first:

- `AGENTS.md`
- `PROJECT_PROGRESS.md`
- `handoff/TEST_REPORT.md`
- `handoff/NEXT_STEPS.md`
- `docs/LOCALAI_NEXUS_NEXT_ITERATION_PLAN.md`
- `docs/LOCALAI_NEXUS_ARCHITECTURE.md`

## Current Verified Deliverable

The built Electron LocalAI Nexus desktop app is the primary deliverable. Static fallback remains a recovery path.

Desktop shortcut:

```text
C:\Users\至亲\Desktop\LocalAI Nexus.lnk
TargetPath: D:\LocalAI Nexus\node_modules\electron\dist\electron.exe
Arguments: "D:\LocalAI Nexus\dist-electron\main\index.js"
WorkingDirectory: D:\LocalAI Nexus
IconLocation: D:\LocalAI Nexus\assets\localai-nexus.ico,0
```

## Verified In Latest Loop

```bat
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run test
npm.cmd run smoke
npm.cmd run verify
npm.cmd run build
npm.cmd run test:e2e
npm.cmd run test:static-browser
npm.cmd run test:launch-static
npm.cmd run test:electron-startup
npm.cmd run test:electron-auth-bridge
npm.cmd run test:long-run
npm.cmd run shortcut
```

Shortcut COM inspection and Gateway HTTP smoke also passed.

## Known Environment Limit

`npm.cmd run dist` rebuilt the app and produced `release/win-unpacked/LocalAI Nexus.exe`, but electron-builder/app-builder did not finish before the 15-minute verification timeout.

## Recommended Next Work

1. Continue from `docs/LOCALAI_NEXUS_NEXT_ITERATION_PLAN.md`.
2. Add live provider smoke only when user supplies explicit credentials.
3. Add real upstream streaming/cancellation after non-streaming behavior stays green.
4. Re-run packaging with a longer timeout or corrected electron-builder/app-builder environment.

Do not rebuild from scratch. Do not remove Shared Memory Hub. Preserve JSON storage, Electron security boundaries, and `window.agentflow`. Use `npm.cmd`, not plain `npm`, from PowerShell.
