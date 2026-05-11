import { afterEach, describe, expect, it, vi } from 'vitest'
import { applyTheme, getTheme, resolveTheme, setStoredTheme } from '../../src/renderer/lib/theme'

function installDomLikeGlobals(prefersDark = false) {
  const classSet = new Set<string>()
  const storage = new Map<string, string>()
  const documentElement = {
    dataset: {} as Record<string, string>,
    classList: {
      add: (value: string) => classSet.add(value),
      remove: (value: string) => classSet.delete(value),
      toggle: (value: string, force?: boolean) => {
        if (force) classSet.add(value)
        else classSet.delete(value)
      },
      contains: (value: string) => classSet.has(value),
    },
  }

  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: {
      localStorage: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => storage.set(key, value),
      },
      matchMedia: vi.fn(() => ({
        matches: prefersDark,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    },
  })
  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: { documentElement },
  })

  return { classSet, storage, documentElement }
}

describe('theme helpers', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    Reflect.deleteProperty(globalThis, 'window')
    Reflect.deleteProperty(globalThis, 'document')
  })

  it('falls back to system for invalid stored values', () => {
    const { storage } = installDomLikeGlobals()
    storage.set('agentflow.theme', 'neon')
    expect(getTheme()).toBe('system')
  })

  it('reads explicit stored theme preferences', () => {
    const { storage } = installDomLikeGlobals()

    storage.set('agentflow.theme', 'light')
    expect(getTheme()).toBe('light')

    storage.set('agentflow.theme', 'dark')
    expect(getTheme()).toBe('dark')
  })

  it('resolves explicit and system themes', () => {
    installDomLikeGlobals(true)
    expect(resolveTheme('light')).toBe('light')
    expect(resolveTheme('dark')).toBe('dark')
    expect(resolveTheme('system')).toBe('dark')
  })

  it('applies dark and light theme attributes', () => {
    const { documentElement } = installDomLikeGlobals()

    applyTheme('dark')
    expect(documentElement.classList.contains('dark')).toBe(true)
    expect(documentElement.dataset.theme).toBe('dark')
    expect(documentElement.dataset.themePreference).toBe('dark')

    applyTheme('light')
    expect(documentElement.classList.contains('dark')).toBe(false)
    expect(documentElement.dataset.theme).toBe('light')
    expect(documentElement.dataset.themePreference).toBe('light')
  })

  it('applies system theme while preserving the user preference marker', () => {
    const { documentElement } = installDomLikeGlobals(true)

    applyTheme('system')

    expect(documentElement.classList.contains('dark')).toBe(true)
    expect(documentElement.dataset.theme).toBe('dark')
    expect(documentElement.dataset.themePreference).toBe('system')
  })

  it('stores preference before applying theme', () => {
    const { storage, documentElement } = installDomLikeGlobals()

    setStoredTheme('dark')

    expect(storage.get('agentflow.theme')).toBe('dark')
    expect(documentElement.dataset.theme).toBe('dark')
  })
})
