import { describe, expect, it } from 'vitest'
import { FONT_MONO, FONT_SANS_CN } from '../../src/shared/typography'

describe('system typography tokens', () => {
  it('defines a professional system Chinese stack and monospace fallback stack', () => {
    expect(FONT_SANS_CN).toContain('Kai' + 'Ti')
    expect(FONT_SANS_CN).toContain('Segoe UI')
    expect(FONT_SANS_CN).toContain('Microsoft YaHei')
    expect(FONT_SANS_CN).toContain('PingFang SC')
    expect(FONT_MONO).toContain('Cascadia Code')
    expect(FONT_MONO).toContain('Consolas')
  })
})
