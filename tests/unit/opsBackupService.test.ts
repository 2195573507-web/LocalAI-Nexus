import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import * as nodeCrypto from 'node:crypto';

const collections = new Map<string, Array<Record<string, unknown>>>();

let previewBackup: typeof import('../../src/main/domain/ops/backupService').previewBackup;
let createBackupManifest: typeof import('../../src/main/domain/ops/backupService').createBackupManifest;
let previewRestore: typeof import('../../src/main/domain/ops/backupService').previewRestore;

vi.stubGlobal('require', (id: string) => {
  if (id === 'crypto') return nodeCrypto;
  throw new Error(`Unexpected CommonJS require in ops backup service test: ${id}`);
});

vi.mock('../../src/main/storage', () => ({
  default: {
    async getAll<T>(collection: string): Promise<T[]> {
      return ((collections.get(collection) ?? []) as T[]).map((item) => ({ ...item }));
    },
    async create<T extends { id: string }>(collection: string, item: T): Promise<T> {
      const items = collections.get(collection) ?? [];
      items.push({ ...item });
      collections.set(collection, items);
      return { ...item };
    },
  },
}));

describe('ops backup service', () => {
  beforeAll(async () => {
    ({ previewBackup, createBackupManifest, previewRestore } = await import('../../src/main/domain/ops/backupService'));
  });

  beforeEach(() => {
    collections.clear();
  });

  it('previews redacted backup collection counts and creates a manifest record', async () => {
    collections.set('projects', [{ id: 'p1', name: 'Project' }]);
    collections.set('gatewayApiKeys', [{ id: 'k1', keyHash: 'hash', maskedKey: 'lnx...1234' }]);

    const preview = await previewBackup(new Date('2026-05-12T00:00:00.000Z'));
    expect(preview.mode).toBe('dry-run');
    expect(preview.redaction).toBe('secrets-redacted');
    expect(preview.collections).toEqual(expect.arrayContaining([
      { name: 'projects', count: 1, redacted: true },
      { name: 'gatewayApiKeys', count: 1, redacted: true },
    ]));

    const created = await createBackupManifest(new Date('2026-05-12T00:00:00.000Z'));
    expect(created.mode).toBe('created');
    expect(collections.get('backupManifests')).toHaveLength(1);
  });

  it('previews restore JSON without mutating collections', async () => {
    collections.set('projects', [{ id: 'existing' }]);
    const preview = await previewRestore(JSON.stringify({
      manifest: {
        id: 'm1',
        createdAt: '2026-05-12T00:00:00.000Z',
        mode: 'created',
        schemaVersion: 1,
        collections: [],
        checksum: 'hash',
        redaction: 'secrets-redacted',
        restoreRequiresPreview: true,
      },
      projects: [{ id: 'incoming' }],
    }));
    expect(preview.ok).toBe(true);
    expect(preview.changes.find((change) => change.collection === 'projects')).toMatchObject({
      incoming: 1,
      existing: 1,
      action: 'merge-preview',
    });
    expect(collections.get('projects')).toHaveLength(1);

    await expect(previewRestore('{bad json')).resolves.toMatchObject({ ok: false });
  });

  it('creates a redacted bundle manifest and rejects unsafe restore metadata', async () => {
    collections.set('providerSettings', [{ id: 'provider-1', apiKey: 'sk-secret-token', providerName: 'Secret Provider' }]);
    const created = await createBackupManifest(new Date('2026-05-12T00:00:00.000Z'));

    expect(created.schemaVersion).toBe(1);
    expect(created.bundle).toMatchObject({
      redaction: 'secrets-redacted',
      hash: created.checksum,
    });
    expect(created.bundle?.bytes).toBeGreaterThan(0);
    expect(JSON.stringify(collections.get('backupManifests'))).not.toContain('sk-secret-token');

    await expect(previewRestore(JSON.stringify({
      manifest: {
        id: 'bad',
        createdAt: '2026-05-12T00:00:00.000Z',
        mode: 'created',
        schemaVersion: 99,
        collections: [],
        checksum: 'hash',
        redaction: 'none',
        restoreRequiresPreview: false,
      },
    }))).resolves.toMatchObject({
      ok: false,
      errors: expect.arrayContaining([
        'Unsupported backup schemaVersion.',
        'Backup manifest must declare secrets-redacted.',
        'Restore requires an explicit preview marker.',
      ]),
    });
  });
});
