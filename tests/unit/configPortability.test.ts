import { describe, expect, it } from 'vitest'
import { buildConfigBundle, previewConfigImport, previewGatewayConfigImport } from '../../src/shared/configPortability'

describe('config import/export portability', () => {
  it('omits provider secrets and adds a hash checkpoint', () => {
    const bundle = buildConfigBundle({
      providers: [
        {
          id: 'p1',
          providerName: 'OpenAI',
          baseUrl: 'https://api.openai.com/v1',
          apiKey: 'sk-secret-123456',
          modelName: 'gpt-4.1',
          enabled: true,
          memoryEnabled: true,
          memoryInjectionMode: 'balanced',
          maxMemoryItems: 10,
          maxMemoryChars: 8000,
        },
      ],
      projects: [],
      gatewayKeys: [],
      gatewayConfigImports: [],
      agents: [],
      templates: [],
      mcpAllowlist: [],
      skillsRegistry: [],
      now: new Date('2026-05-10T00:00:00.000Z'),
    })
    expect(JSON.stringify(bundle)).not.toContain('sk-secret')
    expect(bundle.providers[0]).not.toHaveProperty('apiKey')
    expect(bundle.manifest.counts.gatewayKeys).toBe(0)
    expect(bundle.manifest.hash).toMatch(/^fnv1a-/)
    expect(bundle.manifest.redaction).toBe('secrets-omitted')
  })

  it('rejects script-like import payloads and oversize data', () => {
    const dangerous = JSON.stringify({
      manifest: { version: 1, hash: 'bad' },
      skillsRegistry: [{ id: 'x', name: 'x', description: 'x', category: 'x', enabled: true, script: 'powershell', createdAt: '', updatedAt: '' }],
    })
    expect(previewConfigImport(dangerous).ok).toBe(false)
    expect(previewConfigImport('x'.repeat(600_000)).ok).toBe(false)
  })

  it('previews Gateway external config imports with redaction, merge, backup, and audit metadata', () => {
    const preview = previewGatewayConfigImport(JSON.stringify({
      source: 'cc-switch',
      profiles: [
        {
          name: 'codex-local',
          base_url: 'http://127.0.0.1:8317/v1',
          apiKey: 'sk-secret-local-key',
          model: 'gpt-local',
        },
      ],
      claudeCode: {
        ANTHROPIC_BASE_URL: 'http://127.0.0.1:8317/v1',
        ANTHROPIC_AUTH_TOKEN: 'sk-secret-claude',
      },
    }))

    expect(preview.ok).toBe(true)
    expect(preview.source).toBe('cc-switch')
    expect(preview.redaction).toBe('secrets-redacted')
    expect(preview.detected.baseUrls).toContain('http://127.0.0.1:8317/v1')
    expect(preview.detected.keyRefCount).toBeGreaterThan(0)
    expect(preview.mergePlan.map((item) => item.action)).toEqual(expect.arrayContaining(['preview', 'merge', 'backup', 'skip']))
    expect(preview.backup.required).toBe(true)
    expect(preview.audit.action).toBe('gateway.config.imported')
    expect(JSON.stringify(preview)).not.toContain('sk-secret')
  })

  it('accepts OpenAI environment snippets for Gateway import preview', () => {
    const preview = previewGatewayConfigImport([
      'export OPENAI_BASE_URL="http://127.0.0.1:8317/v1"',
      'export OPENAI_API_KEY="lnx_20260512_secret"',
      'export OPENAI_MODEL="localai-nexus-diagnostic"',
    ].join('\n'))

    expect(preview.ok).toBe(true)
    expect(preview.source).toBe('openai-env')
    expect(preview.detected.models).toContain('localai-nexus-diagnostic')
    expect(JSON.stringify(preview)).not.toContain('lnx_20260512_secret')
  })
})
