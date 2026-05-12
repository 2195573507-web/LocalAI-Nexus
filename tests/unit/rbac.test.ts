import { describe, expect, it } from 'vitest'
import { canRole, getPermissionsForRole, isValidRole } from '../../src/main/rbac'

describe('rbac', () => {
  it('validates roles', () => {
    expect(isValidRole('admin')).toBe(true)
    expect(isValidRole('user')).toBe(true)
    expect(isValidRole('owner')).toBe(false)
  })

  it('allows admin-only management permissions for admins', () => {
    expect(canRole('admin', 'admin:users')).toBe(true)
    expect(canRole('admin', 'admin:audit')).toBe(true)
    expect(canRole('user', 'admin:users')).toBe(false)
    expect(canRole('user', 'admin:audit')).toBe(false)
  })

  it('denies provider write for normal users', () => {
    expect(canRole('user', 'provider:read')).toBe(true)
    expect(canRole('user', 'provider:write')).toBe(false)
    expect(getPermissionsForRole('admin')).toContain('provider:write')
  })

  it('keeps MCP allowlist administration admin-only', () => {
    expect(canRole('admin', 'mcp:write')).toBe(true)
    expect(canRole('user', 'mcp:write')).toBe(false)
  })

  it('uses explicit gateway and ops permissions without weakening role boundaries', () => {
    expect(canRole('user', 'gateway:read')).toBe(true)
    expect(canRole('user', 'gateway:write')).toBe(false)
    expect(canRole('admin', 'gateway:write')).toBe(true)
    expect(canRole('user', 'ops:backup')).toBe(false)
    expect(canRole('admin', 'ops:backup')).toBe(true)
    expect(canRole('admin', 'ops:restore')).toBe(true)
  })
})
