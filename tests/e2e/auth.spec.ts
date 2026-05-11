import { expect, test } from 'playwright/test'

test.describe('AgentFlow auth and admin gates', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.removeItem('agentflow.auth.session')
      localStorage.setItem('agentflow.language', 'en')
      localStorage.removeItem('agentflow.theme')
    })
  })

  test('protects routes until login and supports logout', async ({ page }) => {
    await page.addInitScript(() => {
      const admin = {
        id: 'admin-1',
        email: '123@admin.com',
        role: 'admin',
        status: 'active',
        profile: { displayName: 'Local Administrator' },
        mustChangePassword: false,
        failedLoginCount: 0,
        permissions: ['app:read', 'admin:users', 'admin:audit', 'project:read'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      Object.defineProperty(window, 'agentflow', {
        configurable: true,
        value: {
          auth: {
            bootstrap: async () => ({ ok: true }),
            session: async () => ({ authenticated: false }),
            login: async () => ({
              ok: true,
              session: {
                authenticated: true,
                sessionId: 's1',
                user: admin,
                expiresAt: new Date(Date.now() + 86400000).toISOString(),
              },
            }),
            logout: async () => true,
          },
          projects: { list: async () => [] },
          tasks: { list: async () => [] },
          prompts: { list: async () => [] },
          memory: { list: async () => [] },
          settings: {
            getAll: async () => ({ theme: 'system', language: 'en', defaultProjectPath: '', defaultAITool: 'Claude Code', dataPath: '', appVersion: '1.1.1' }),
            get: async () => null,
            set: async () => true,
          },
        },
      })
    })

    await page.goto('/#/projects', { waitUntil: 'networkidle' })
    await expect(page).toHaveURL(/#\/login/)
    await page.getByLabel('Email').fill('123@admin.com')
    await page.getByLabel('Password').fill('123456')
    await page.getByRole('button', { name: 'Sign in' }).click()
    await expect(page).toHaveURL(/#\/projects/)
    await expect.poll(() => page.evaluate(() => localStorage.getItem('agentflow.auth.session') || '')).not.toContain('sessionToken')
    await expect(page.getByText('Local Administrator')).toBeVisible()
    await page.getByRole('button', { name: 'Sign out' }).click()
    await expect(page).toHaveURL(/#\/login/)
  })

  test('normal user cannot access admin routes', async ({ page }) => {
    await page.addInitScript(() => {
      const user = {
        id: 'user-1',
        email: 'user@example.com',
        role: 'user',
        status: 'active',
        profile: { displayName: 'Normal User' },
        mustChangePassword: false,
        failedLoginCount: 0,
        permissions: ['app:read', 'project:read'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      localStorage.setItem('agentflow.auth.session', JSON.stringify({ sessionId: 's2' }))
      Object.defineProperty(window, 'agentflow', {
        configurable: true,
        value: {
          auth: {
            bootstrap: async () => ({ ok: true }),
            session: async () => ({ authenticated: true, user }),
            logout: async () => true,
          },
          settings: {
            getAll: async () => ({ theme: 'system', language: 'en', defaultProjectPath: '', defaultAITool: 'Claude Code', dataPath: '', appVersion: '1.1.1' }),
            get: async () => null,
            set: async () => true,
          },
        },
      })
    })

    await page.goto('/#/admin/users', { waitUntil: 'networkidle' })
    await expect(page.getByText('Access denied')).toBeVisible()
    await expect(page.getByRole('link', { name: /Admin Users/ })).toHaveCount(0)
  })

  test('normal user can sign in to protected core routes', async ({ page }) => {
    await page.addInitScript(() => {
      const user = {
        id: 'user-2',
        email: 'user@example.com',
        role: 'user',
        status: 'active',
        profile: { displayName: 'Normal User' },
        mustChangePassword: false,
        failedLoginCount: 0,
        permissions: ['app:read', 'project:read'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      Object.defineProperty(window, 'agentflow', {
        configurable: true,
        value: {
          auth: {
            bootstrap: async () => ({ ok: true }),
            session: async () => ({ authenticated: false }),
            login: async () => ({
              ok: true,
              session: {
                authenticated: true,
                sessionId: 's3',
                user,
                expiresAt: new Date(Date.now() + 86400000).toISOString(),
              },
            }),
            logout: async () => true,
          },
          projects: { list: async () => [] },
          tasks: { list: async () => [] },
          prompts: { list: async () => [] },
          memory: { list: async () => [] },
          settings: {
            getAll: async () => ({ theme: 'system', language: 'en', defaultProjectPath: '', defaultAITool: 'Claude Code', dataPath: '', appVersion: '1.1.1' }),
            get: async () => null,
            set: async () => true,
          },
        },
      })
    })

    await page.goto('/#/projects', { waitUntil: 'networkidle' })
    await page.getByLabel('Email').fill('user@example.com')
    await page.getByLabel('Password').fill('abcdef')
    await page.getByRole('button', { name: 'Sign in' }).click()
    await expect(page).toHaveURL(/#\/projects/)
    await expect(page.getByText('Normal User')).toBeVisible()
    await expect(page.getByRole('link', { name: /Admin Users/ })).toHaveCount(0)
  })

  test('admin can create a user and view audit events', async ({ page }) => {
    await page.addInitScript(() => {
      const admin = {
        id: 'admin-1',
        email: '123@admin.com',
        role: 'admin',
        status: 'active',
        profile: { displayName: 'Local Administrator' },
        mustChangePassword: false,
        failedLoginCount: 0,
        permissions: ['app:read', 'admin:users', 'admin:audit', 'export:write'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      const users = [admin]
      const auditLogs = [
        {
          id: 'audit-1',
          type: 'auth.login',
          action: 'auth.login',
          status: 'success',
          severity: 'info',
          actor: { email: '123@admin.com', role: 'admin' },
          resource: { type: 'session', id: 's1' },
          createdAt: new Date().toISOString(),
        },
      ]
      localStorage.setItem('agentflow.auth.session', JSON.stringify({ sessionId: 's1' }))
      Object.defineProperty(window, 'agentflow', {
        configurable: true,
        value: {
          auth: {
            bootstrap: async () => ({ ok: true }),
            session: async () => ({ authenticated: true, user: admin }),
            logout: async () => true,
          },
          users: {
            list: async () => users,
            create: async (request: any) => {
              const created = {
                id: 'user-created',
                email: request.email,
                role: request.role,
                status: 'active',
                profile: { displayName: request.displayName || request.email },
                mustChangePassword: true,
                failedLoginCount: 0,
                permissions: ['app:read'],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              }
              users.push(created)
              auditLogs.unshift({ ...auditLogs[0], id: 'audit-2', type: 'user.create', action: 'user.create', resource: { type: 'user', id: created.id } })
              return created
            },
            update: async () => users[0],
            resetPassword: async () => ({ user: users[0], temporaryPassword: 'temp-password-1' }),
          },
          audit: {
            list: async () => auditLogs,
            exportAll: async () => ({ auditLogs, exportedAt: new Date().toISOString() }),
          },
          export: { json: async () => 'audit.json' },
          settings: {
            getAll: async () => ({ theme: 'system', language: 'en', defaultProjectPath: '', defaultAITool: 'Claude Code', dataPath: '', appVersion: '1.1.1' }),
            get: async () => null,
            set: async () => true,
          },
        },
      })
    })

    await page.goto('/#/admin/users', { waitUntil: 'networkidle' })
    await expect(page.locator('main').getByRole('heading', { name: 'Admin Users' })).toBeVisible()
    await page.getByLabel('Email').fill('new@example.com')
    await page.getByLabel('Display name').fill('New User')
    await page.getByLabel('Temp password').fill('abcdef')
    await page.getByRole('button', { name: 'Create' }).click()
    await expect(page.getByText('new@example.com')).toBeVisible()

    await page.getByRole('link', { name: /Audit Logs/ }).click()
    await expect(page.getByTestId('audit-log-panel')).toContainText('user.create')
    await expect(page.getByTestId('audit-log-panel')).toContainText('auth.login')
  })
})
