import { afterEach, describe, expect, it } from 'vitest'
import { getLanguage, setLanguage, t } from '../../src/renderer/lib/i18n'

function installDomLikeGlobals() {
  const storage = new Map<string, string>()
  const documentElement = { lang: '' }

  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: {
      localStorage: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => storage.set(key, value),
      },
    },
  })
  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: { documentElement },
  })

  return { storage, documentElement }
}

describe('i18n helpers', () => {
  afterEach(() => {
    Reflect.deleteProperty(globalThis, 'window')
    Reflect.deleteProperty(globalThis, 'document')
  })

  it('falls back to Chinese for invalid stored language', () => {
    const { storage } = installDomLikeGlobals()
    storage.set('agentflow.language', 'de')

    expect(getLanguage()).toBe('zh')
  })

  it('stores language and updates html lang', () => {
    const { storage, documentElement } = installDomLikeGlobals()

    setLanguage('en')
    expect(storage.get('agentflow.language')).toBe('en')
    expect(documentElement.lang).toBe('en')
    expect(t('nav.dashboard')).toBe('Dashboard')

    setLanguage('zh')
    expect(storage.get('agentflow.language')).toBe('zh')
    expect(documentElement.lang).toBe('zh-CN')
  })
})
