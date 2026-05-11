# LocalAI Nexus

LocalAI Nexus is the in-place evolution of AgentFlowStudio: a local AI gateway, runtime switcher, token/health console, skill manager, Agent/Workflow operations hub, Shared Memory recovery surface, and security audit center.

The current workspace is rooted at `D:\LocalAI Nexus`, preserving Git history, JSON storage, desktop launchers, Shared Memory Hub data, and compatibility contracts such as `window.agentflow`.

## Current Status

| Area | Status | Notes |
|---|---:|---|
| Product identity and shell | Completed | Package/window/UI/static fallback/icon/shortcut use LocalAI Nexus. |
| Dashboard and navigation | Completed | Primary pages are visible and covered by smoke/E2E checks. |
| Provider Hub | Completed | Provider presets, masked credentials, CRUD/test surfaces, active provider/model switching, and audit-oriented flows exist. Live credential smoke requires user keys. |
| Token Center | Completed | Usage, trends, failure categories, quota/cooldown/concurrency surfaces, and router impact views exist. Deeper enforcement continues next. |
| Health Monitor | Completed | Local diagnostics, repair hints, failure categories, trends, and router impact surfaces exist. Live remote probes require credentials/network. |
| Model Router | Completed | Health/tags/quota/cooldown/fallback decisions and trace IDs are present. |
| Local Gateway | Completed | Required local endpoints, mock/non-streaming path, route diagnostics, usage/audit recording, and HTTP smoke passed. Real upstream streaming still requires credentialed provider validation. |
| Runtime Switcher | Completed | `.env`, JSON, TOML, YAML, and CLI snippets with root vs `/v1` diagnostics are available. No external config is silently written. |
| Skill Hub / Ecosystem | Completed | Prompt skill and local bundle registry surfaces with validation/risk metadata are present. |
| Agent / Workflow | Completed | First-class execution-record surfaces, node traces, Chinese failure guidance, and pause/cancel/retry/resume control records exist. Real external-tool approval remains opt-in future hardening. |
| Shared Memory | Completed | Filters, provenance/stale/context-pack preview/recovery surfaces and redaction-oriented flows exist. |
| Security Center | Completed | RBAC/ACL visibility, audit/report surface, secret/risk prompts, and redaction surfaces exist. |
| Packaging | Environment-limited | `npm.cmd run dist` builds the app and produced `release/win-unpacked/LocalAI Nexus.exe`, but final packaging is blocked by electron-builder `winCodeSign` symlink extraction privileges on this machine. |

## Quick Start

```bat
cd /d "D:\LocalAI Nexus"
npm.cmd install
npm.cmd run build
"D:\LocalAI Nexus\start-agentflow.bat"
```

Current desktop shortcut:

```text
C:\Users\至亲\Desktop\LocalAI Nexus.lnk
Target: D:\LocalAI Nexus\node_modules\electron\dist\electron.exe
Arguments: "D:\LocalAI Nexus\dist-electron\main\index.js"
Icon: D:\LocalAI Nexus\assets\localai-nexus.ico,0
```

The static app remains a recovery fallback, not the primary product target.

## Gateway

Default root:

```text
http://127.0.0.1:8317
```

OpenAI-compatible `/v1` base:

```text
http://127.0.0.1:8317/v1
```

Verified local endpoints:

```text
GET  /health
GET  /v1/models
POST /v1/chat/completions
POST /v1/responses
POST /responses
POST /v1/messages
```

`/responses` returns Base URL guidance instead of an unexplained 404. Live credentialed provider forwarding is skipped unless the user supplies provider credentials.

## Architecture

```text
React Renderer
  -> secure preload bridge
  -> Electron IPC guards
  -> main-process domain services
  -> Local Gateway / Router / Usage / Health / Runtime / Skills / Memory / Security / Ecosystem
  -> JSON storage + Electron safeStorage + audit log
```

Security invariants:

- `contextIsolation: true`
- `nodeIntegration: false`
- Native work only through preload and IPC
- No arbitrary command execution exposed through IPC
- Provider credentials stay main-process controlled and renderer-masked
- Memory, logs, imports, exports, and recovery context are redacted
- JSON storage remains the active storage strategy

## Development Commands

```bat
npm.cmd run dev
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run test
npm.cmd run test:e2e
npm.cmd run build
npm.cmd run verify
npm.cmd run test:static-browser
npm.cmd run test:electron-startup
npm.cmd run test:electron-auth-bridge
npm.cmd run test:long-run
npm.cmd run shortcut
npm.cmd run dist
```

Use `npm.cmd`, not plain `npm`, from PowerShell.

## Latest Verification

See `handoff/TEST_REPORT.md` for the complete table. Latest closeout summary:

- `npm.cmd run typecheck`: PASS
- `npm.cmd run lint`: PASS
- `npm.cmd run test`: PASS
- `npm.cmd run smoke`: PASS
- `npm.cmd run verify`: PASS
- `npm.cmd run build`: PASS
- `npm.cmd run test:e2e`: PASS
- `npm.cmd run test:static-browser`: PASS
- `npm.cmd run test:launch-static`: PASS
- `npm.cmd run test:electron-startup`: PASS
- `npm.cmd run test:electron-auth-bridge`: PASS
- `npm.cmd run test:long-run`: PASS
- `npm.cmd run shortcut`: PASS
- Shortcut COM inspection: PASS
- Gateway HTTP smoke: PASS
- `npm.cmd run dist`: ENV-LIMITED `winCodeSign` symlink privilege after successful build and unpacked app generation

## Documentation

- Current progress: `PROJECT_PROGRESS.md`
- Test report: `handoff/TEST_REPORT.md`
- Next steps: `handoff/NEXT_STEPS.md`
- Cleanup review: `docs/cleanup/cleanup-review.md`
- Cleanup report: `docs/cleanup/cleanup-report.md`
- Completed iteration plan: `docs/LOCALAI_NEXUS_ITERATION_PLAN.md`
- Next-stage plan: `docs/LOCALAI_NEXUS_NEXT_ITERATION_PLAN.md`
- Long-term multi-round iteration archive: `docs/iteration-plans/LocalAI-Nexus-Multi-Round-Iteration-Plan-20260511.md`
- Verification matrix: `docs/LOCALAI_NEXUS_VERIFICATION_MATRIX.md`
- Architecture: `docs/LOCALAI_NEXUS_ARCHITECTURE.md`
- Structure audit: `docs/PROJECT_STRUCTURE_AUDIT.md`
- Worklog: `docs/PROJECT_WORKLOG.md`

## Next Stage

Continue from `docs/LOCALAI_NEXUS_NEXT_ITERATION_PLAN.md`:

1. Live provider confidence with user-supplied credentials.
2. Real streaming and cancellation.
3. Live proof of Token policy enforcement against credentialed providers.
4. External-tool approval gates beyond current controlled Agent/Workflow run records.
5. Memory graph and recovery packs.
6. Packaging/release hardening after the local electron-builder `winCodeSign` symlink privilege blocker is resolved.

## License

MIT
