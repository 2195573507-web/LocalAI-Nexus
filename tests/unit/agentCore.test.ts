import { describe, expect, it } from 'vitest'
import { AGENT_TEMPLATES, createDemoAgent, preflightAgentRun } from '../../src/shared/agentCore'

describe('agent core helpers', () => {
  it('creates a demo agent that never requires external tools', () => {
    const agent = createDemoAgent(new Date('2026-05-10T00:00:00.000Z'))
    expect(agent.type).toBe('demo')
    expect(agent.providerRef).toBe('demo-provider')
    expect(agent.systemPrompt).toContain('不调用外部工具')
  })

  it('maps preflight failures to actionable Chinese messages', () => {
    const result = preflightAgentRun({
      agent: { name: 'A', status: 'enabled', providerRef: 'p1', model: 'm1' },
      provider: { apiKey: '', needsApiKey: true },
      canRun: true,
      inputSummary: 'run',
    })
    expect(result.ok).toBe(false)
    expect(result.code).toBe('provider_secret_missing')
    expect(result.action).toContain('API Key')
  })

  it('keeps the requested template gallery entries', () => {
    expect(AGENT_TEMPLATES.map((template) => template.name)).toEqual([
      '问答助手',
      '文件总结',
      '工作流测试',
      'MCP 工具调用演示',
      '代码审查反馈',
      '空白 Agent 模板',
    ])
  })
})
