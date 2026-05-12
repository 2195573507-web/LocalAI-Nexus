import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import * as nodeCrypto from 'node:crypto';
import type { NexusGatewayApiKey } from '../../src/shared/types';

const collections = new Map<string, Array<Record<string, unknown>>>();

let createGatewayApiKey: typeof import('../../src/main/domain/gateway/gatewayKeyService').createGatewayApiKey;
let evaluateGatewayAccess: typeof import('../../src/main/domain/gateway/gatewayKeyService').evaluateGatewayAccess;
let listGatewayApiKeys: typeof import('../../src/main/domain/gateway/gatewayKeyService').listGatewayApiKeys;
let resetGatewayApiKey: typeof import('../../src/main/domain/gateway/gatewayKeyService').resetGatewayApiKey;
let updateGatewayApiKeyStatus: typeof import('../../src/main/domain/gateway/gatewayKeyService').updateGatewayApiKeyStatus;

vi.stubGlobal('require', (id: string) => {
  if (id === 'crypto') return nodeCrypto;
  throw new Error(`Unexpected CommonJS require in gateway key service test: ${id}`);
});

vi.mock('../../src/main/storage', () => ({
  default: {
    async getAll<T>(collection: string): Promise<T[]> {
      return ((collections.get(collection) ?? []) as T[]).map((item) => ({ ...item }));
    },
    async getById<T extends { id: string }>(collection: string, id: string): Promise<T | null> {
      const item = (collections.get(collection) ?? []).find((entry) => entry.id === id);
      return item ? ({ ...item } as T) : null;
    },
    async create<T extends { id: string }>(collection: string, item: T): Promise<T> {
      const items = collections.get(collection) ?? [];
      items.push({ ...item });
      collections.set(collection, items);
      return { ...item };
    },
    async update<T extends { id: string }>(collection: string, id: string, updates: Partial<T>): Promise<T | null> {
      const items = collections.get(collection) ?? [];
      const index = items.findIndex((entry) => entry.id === id);
      if (index < 0) return null;
      items[index] = { ...items[index], ...updates, id };
      collections.set(collection, items);
      return { ...items[index] } as T;
    },
    async delete(collection: string, id: string): Promise<boolean> {
      const items = collections.get(collection) ?? [];
      collections.set(collection, items.filter((entry) => entry.id !== id));
      return true;
    },
  },
}));

describe('gateway key service', () => {
  beforeAll(async () => {
    ({
      createGatewayApiKey,
      evaluateGatewayAccess,
      listGatewayApiKeys,
      resetGatewayApiKey,
      updateGatewayApiKeyStatus,
    } = await import('../../src/main/domain/gateway/gatewayKeyService'));
  });

  beforeEach(() => {
    collections.clear();
  });

  it('stores only hashed gateway secrets and returns copy-once raw keys', async () => {
    const result = await createGatewayApiKey({ name: 'Codex local key' }, 'user-1', new Date('2026-05-12T00:00:00.000Z'));
    expect(result.rawKey).toMatch(/^lnx_20260512_/);
    expect(result.key.maskedKey).toContain('...');
    expect(result.key.keyHash).toMatch(/^[a-f0-9]{64}$/);
    expect(JSON.stringify(await listGatewayApiKeys())).not.toContain(result.rawKey);
  });

  it('allows diagnostic open mode until a key exists, then enforces bearer keys and whitelist', async () => {
    await expect(evaluateGatewayAccess({ endpoint: '/v1/chat/completions', model: 'any' })).resolves.toMatchObject({
      allowed: true,
      diagnosticOpenMode: true,
    });

    const created = await createGatewayApiKey({
      name: 'Scoped',
      endpointWhitelist: ['/v1/responses', '/v1/embeddings'],
      modelWhitelist: ['gpt-local'],
    });

    await expect(evaluateGatewayAccess({ endpoint: '/v1/responses', model: 'gpt-local' })).resolves.toMatchObject({
      allowed: false,
      statusCode: 401,
    });
    await expect(evaluateGatewayAccess({
      authorization: `Bearer ${created.rawKey}`,
      endpoint: '/v1/chat/completions',
      model: 'gpt-local',
    })).resolves.toMatchObject({ allowed: false, statusCode: 403 });
    await expect(evaluateGatewayAccess({
      xApiKey: created.rawKey,
      endpoint: '/v1/responses',
      model: 'gpt-local',
    })).resolves.toMatchObject({ allowed: true, keyId: created.key.id });
    await expect(evaluateGatewayAccess({
      authorization: `Bearer ${created.rawKey}`,
      endpoint: '/v1/embeddings',
      model: 'gpt-local',
    })).resolves.toMatchObject({ allowed: true, keyId: created.key.id });
  });

  it('supports disable, soft delete, and reset without exposing old raw keys', async () => {
    const created = await createGatewayApiKey({ name: 'Mutable' });
    const disabled = await updateGatewayApiKeyStatus(created.key.id, 'disabled');
    expect(disabled.status).toBe('disabled');
    await expect(evaluateGatewayAccess({
      xApiKey: created.rawKey,
      endpoint: '/v1/chat/completions',
    })).resolves.toMatchObject({ allowed: false });

    const reset = await resetGatewayApiKey(created.key.id, new Date('2026-05-13T00:00:00.000Z'));
    expect(reset.rawKey).not.toBe(created.rawKey);
    await expect(evaluateGatewayAccess({
      xApiKey: reset.rawKey,
      endpoint: '/v1/chat/completions',
    })).resolves.toMatchObject({ allowed: true });

    await updateGatewayApiKeyStatus(created.key.id, 'deleted');
    expect((await listGatewayApiKeys()).map((key: NexusGatewayApiKey) => key.id)).not.toContain(created.key.id);
  });

  it('enforces key-level request quotas and per-minute rate limits before provider routing', async () => {
    const quotaKey = await createGatewayApiKey({
      name: 'Quota key',
      dailyQuota: 1,
      monthlyQuota: 2,
      rateLimitPerMinute: 1,
      concurrencyLimit: 0,
    }, 'user-1', new Date('2026-05-12T00:00:00.000Z'));

    collections.set('gatewayRequests', [
      {
        id: 'existing-today',
        gatewayKeyId: quotaKey.key.id,
        endpoint: '/v1/chat/completions',
        status: 'success',
        createdAt: '2026-05-12T00:00:30.000Z',
      },
    ]);

    await expect(evaluateGatewayAccess({
      xApiKey: quotaKey.rawKey,
      endpoint: '/v1/chat/completions',
      now: new Date('2026-05-12T01:00:00.000Z'),
    })).resolves.toMatchObject({
      allowed: false,
      statusCode: 429,
      failureCategory: '429',
      reason: expect.stringContaining('daily request quota'),
    });

    const rateKey = await createGatewayApiKey({
      name: 'Rate key',
      dailyQuota: 0,
      monthlyQuota: 0,
      rateLimitPerMinute: 1,
      concurrencyLimit: 0,
    }, 'user-1', new Date('2026-05-12T00:00:00.000Z'));
    collections.set('gatewayRequests', [
      {
        id: 'recent',
        gatewayKeyId: rateKey.key.id,
        endpoint: '/v1/responses',
        status: 'success',
        createdAt: '2026-05-12T00:00:30.000Z',
      },
    ]);

    await expect(evaluateGatewayAccess({
      authorization: `Bearer ${rateKey.rawKey}`,
      endpoint: '/v1/responses',
      now: new Date('2026-05-12T00:01:00.000Z'),
    })).resolves.toMatchObject({
      allowed: false,
      statusCode: 429,
      retryAfterSeconds: 60,
      reason: expect.stringContaining('rate limit'),
    });
  });

  it('enforces key-level monthly quota and active concurrency limits', async () => {
    const monthlyKey = await createGatewayApiKey({
      name: 'Monthly key',
      dailyQuota: 0,
      monthlyQuota: 1,
      rateLimitPerMinute: 0,
      concurrencyLimit: 0,
    }, 'user-1', new Date('2026-05-01T00:00:00.000Z'));
    collections.set('gatewayRequests', [
      {
        id: 'existing-month',
        gatewayKeyId: monthlyKey.key.id,
        endpoint: '/v1/messages',
        status: 'success',
        createdAt: '2026-05-02T00:00:00.000Z',
      },
    ]);

    await expect(evaluateGatewayAccess({
      xApiKey: monthlyKey.rawKey,
      endpoint: '/v1/messages',
      now: new Date('2026-05-12T00:00:00.000Z'),
    })).resolves.toMatchObject({
      allowed: false,
      statusCode: 429,
      reason: expect.stringContaining('monthly request quota'),
    });

    const concurrencyKey = await createGatewayApiKey({
      name: 'Concurrency key',
      dailyQuota: 0,
      monthlyQuota: 0,
      rateLimitPerMinute: 0,
      concurrencyLimit: 1,
    }, 'user-1', new Date('2026-05-12T00:00:00.000Z'));
    collections.set('gatewayRequests', []);
    collections.set('activeGatewayRequests', [
      { id: 'active-1', gatewayKeyId: concurrencyKey.key.id, startedAt: '2026-05-12T00:00:00.000Z' },
    ]);

    await expect(evaluateGatewayAccess({
      xApiKey: concurrencyKey.rawKey,
      endpoint: '/v1/embeddings',
      now: new Date('2026-05-12T00:00:01.000Z'),
    })).resolves.toMatchObject({
      allowed: false,
      statusCode: 429,
      retryAfterSeconds: 5,
      reason: expect.stringContaining('concurrency limit'),
    });
  });
});
