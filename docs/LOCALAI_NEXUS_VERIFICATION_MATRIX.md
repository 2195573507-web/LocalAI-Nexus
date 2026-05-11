# LocalAI Nexus Verification Matrix

Date: 2026-05-11
Workspace: `D:\LocalAI Nexus`

This matrix defines the minimum verification gate by change type. Record results in `handoff/TEST_REPORT.md` as `PASS`, `FAIL`, `SKIPPED`, or `ENV-LIMITED`; do not label a feature complete when a credential, network, or packaging dependency was not actually proven.

## Change-Type Gates

| Change type | Required checks |
|---|---|
| Docs only | `git diff --check`; link/path spot check; update `PROJECT_PROGRESS.md` or handoff if status changes. |
| UI copy/layout | `npm.cmd run typecheck`; `npm.cmd run lint`; `npm.cmd run test`; `npm.cmd run test:e2e`; `npm.cmd run test:static-browser`; `npm.cmd run scan:mojibake`. |
| Chinese localization | UI copy/layout gate plus explicit scan for mojibake and a representative E2E assertion for Chinese-first copy. |
| Renderer API/preload usage | `npm.cmd run typecheck`; `npm.cmd run test`; `npm.cmd run verify`; E2E route that exercises the bridge. |
| IPC/security/auth/ACL | `npm.cmd run typecheck`; `npm.cmd run test`; `npm.cmd run verify`; targeted unit tests for denial/redaction/audit; E2E admin or denied-path check when UI-facing. |
| Provider/Gateway/Router/Token | `npm.cmd run typecheck`; `npm.cmd run test`; `npm.cmd run verify`; Gateway smoke; live provider smoke only with user-supplied credentials. |
| Agent/Workflow runtime | `npm.cmd run typecheck`; `npm.cmd run test`; `npm.cmd run test:e2e`; targeted runtime/control tests; record whether controls are simulated/local records or real external-tool actions. |
| Desktop launcher/shortcut | `npm.cmd run build`; `npm.cmd run test:electron-startup`; `npm.cmd run test:electron-auth-bridge`; `npm.cmd run shortcut`; COM shortcut inspection. |
| Static fallback | `npm.cmd run test:launch-static`; `npm.cmd run test:static-browser`; confirm static fallback remains recovery-only unless explicitly promoted. |
| Release packaging | Full local gate plus `npm.cmd run test:long-run`; `npm.cmd run dist` with sufficient timeout; verify `release/win-unpacked/LocalAI Nexus.exe` and installer artifact if produced. |

## Report Rules

| Result | Meaning |
|---|---|
| `PASS` | Command or manual check ran in this workspace and met the expected result. |
| `FAIL` | Command or check ran and found a product or test issue. Include the cause and next action. |
| `SKIPPED` | Check was not applicable to the change type, or was intentionally deferred with a clear reason. |
| `ENV-LIMITED` | Product/build prerequisites passed, but local credentials, network, packaging tooling, or machine limits prevented the final side effect. |

## Release Readiness Minimum

Before claiming release-ready desktop status, record fresh results for:

- `npm.cmd run typecheck`
- `npm.cmd run lint`
- `npm.cmd run test`
- `npm.cmd run build`
- `npm.cmd run verify`
- `npm.cmd run test:e2e`
- `npm.cmd run test:static-browser`
- `npm.cmd run test:electron-startup`
- `npm.cmd run test:electron-auth-bridge`
- `npm.cmd run test:long-run`
- `npm.cmd run shortcut`
- COM shortcut inspection
- Gateway HTTP smoke
- `npm.cmd run dist` or an explicit `ENV-LIMITED` packaging record

Live provider or MCP/tool-action claims require user-supplied credentials and explicit permission for the live action.
