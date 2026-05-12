# LocalAI Nexus - Architecture Handoff

## Overview

LocalAI Nexus is an Electron + React + TypeScript desktop app. It remains local-first and uses JSON storage. The renderer has no Node access; all native behavior flows through the secure preload bridge and IPC handlers into main-process domain services.

```text
React Renderer
  -> window.agentflow preload bridge
  -> IPC guards and RBAC/session checks
  -> main-process domain services
  -> JSON storage / safeStorage / audit / usage logs
```

## Security Invariants

- `contextIsolation: true`
- `nodeIntegration: false`
- No arbitrary command execution exposed through IPC
- Provider credentials are main-process controlled and renderer-masked
- Exports, memories, logs, context packs, and reports are redacted
- Shared Memory Hub remains local-only
- Static fallback is recovery-only, not the primary product target

## Main Domains

| Domain | Representative Files | Purpose |
|---|---|---|
| Auth/RBAC/Audit | `src/main/session.ts`, `src/main/rbac.ts`, `src/main/audit.ts` | Local login, permissions, audit events, hash-chain behavior. |
| Provider | `src/main/domain/provider/*` | Provider presets, masked credentials, tests, active provider/model. |
| Gateway | `src/main/domain/gateway/gatewayService.ts` | Local HTTP gateway and OpenAI/Anthropic-compatible endpoint behavior. |
| Router | `src/main/domain/router/modelRouter.ts` | Provider/model selection, trace IDs, health/quota/cooldown/fallback reasons. |
| Usage/Token | `src/main/domain/usage/usageService.ts` | Request/token/latency/failure aggregation. |
| Health | `src/main/domain/health/healthService.ts` | Local provider diagnostics, categories, repair hints, router impact. |
| Runtime | `src/main/domain/runtime/runtimeProfileService.ts` | `.env`, JSON, TOML, YAML, and CLI profile generation. |
| Skills | `src/main/domain/skills/skillService.ts` | Prompt skill tests, risk metadata, usage attribution. |
| Memory | `src/main/domain/memory/*` | Context-pack preview and recovery-oriented surfaces. |
| Security | `src/main/domain/security/*` | Security report, risk signals, redaction-oriented output. |
| Ecosystem | `src/main/domain/ecosystem/*` | Local bundle registry and validation behavior. |

## Renderer Routes

Active first-class surfaces:

The renderer keeps route registration in `src/renderer/App.tsx`. Sidebar information architecture is configured separately in `src/renderer/navigation/moduleGroups.tsx`, then rendered by `src/renderer/components/Sidebar.tsx`.

| First-level module | Sidebar entries |
|---|---|
| Workspace | Dashboard, Project Hub, Settings |
| Models | Provider Hub, Model Router, Runtime Switcher, Health Monitor |
| Gateway | Local Gateway, Token Center, Diagnostics |
| Agents | Agent Studio, Workflow Studio, Skill Hub, Prompt Lab |
| Memory | Shared Memory |
| Security | Security Center, Safety Guard, Admin Users, Audit Logs |
| Operations | Ecosystem, Git/Handoff, Log Analyzer |

The previous 22 visible sidebar entries remain available as second-level links. Legacy/non-sidebar route compatibility remains in `App.tsx`: `/login`, `/projects/:id`, `/prompt-lab`, `/log-analyzer`, `/git-timeline`, `/safety-box`, and `/shared-memory-hub`.

This navigation consolidation did not change IPC, storage, auth, RBAC, or main-process domain service boundaries.

## Gateway Endpoints

Default root:

```text
http://127.0.0.1:8317
```

Verified endpoint surface:

```text
GET  /health
GET  /v1/models
POST /v1/chat/completions
POST /v1/responses
POST /responses
POST /v1/messages
```

`/responses` intentionally returns Base URL guidance when the client has a root vs `/v1` mismatch.

## Compatibility

Keep these until a migration plan exists:

- `window.agentflow`
- `agentflow-data`
- `start-agentflow*.bat`
- `assets/icon.*` compatibility aliases

## Current Architecture Limits

- Real credentialed upstream calls need user-supplied provider credentials.
- Real upstream streaming pass-through and cancellation are next-stage work.
- Installer packaging is blocked by a local electron-builder/app-builder timeout after `release/win-unpacked/LocalAI Nexus.exe` is generated.
