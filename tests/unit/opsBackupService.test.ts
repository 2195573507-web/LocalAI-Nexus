import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import * as nodeCrypto from 'node:crypto';

const collections = new Map<string, Array<Record<string, unknown>>>();

let previewBackup: typeof import('../../src/main/domain/ops/backupService').previewBackup;
let createBackupManifest: typeof import('../../src/main/domain/ops/backupService').createBackupManifest;
let previewRestore: typeof import('../../src/main/domain/ops/backupService').previewRestore;
let applyRestore: typeof import('../../src/main/domain/ops/backupService').applyRestore;

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
    async mergeMany<T extends { id: string }>(collection: string, incoming: T[]): Promise<{ inserted: number; skipped: number; existingBefore: number }> {
      const items = collections.get(collection) ?? [];
      const seen = new Set(items.map((item) => item.id));
      let inserted = 0;
      let skipped = 0;
      for (const item of incoming) {
        if (seen.has(item.id)) {
          skipped += 1;
          continue;
        }
        items.push({ ...item });
        seen.add(item.id);
        inserted += 1;
      }
      collections.set(collection, items);
      return { inserted, skipped, existingBefore: items.length - inserted };
    },
  },
}));

describe('ops backup service', () => {
  beforeAll(async () => {
    ({ applyRestore, previewBackup, createBackupManifest, previewRestore } = await import('../../src/main/domain/ops/backupService'));
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
    expect(preview.collections.map((collection) => collection.name)).toEqual(expect.arrayContaining([
      'knowledgeDocuments',
      'evaluationRuns',
      'runEvents',
      'agentExecutions',
      'gatewayRequests',
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
    expect(preview.applyToken).toMatch(/^fnv1a-/);
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

  it('applies a restore only after preview token confirmation and merges new records', async () => {
    collections.set('projects', [{ id: 'existing' }]);
    const raw = JSON.stringify({
      manifest: {
        id: 'restore-manifest',
        createdAt: '2026-05-12T00:00:00.000Z',
        mode: 'created',
        schemaVersion: 1,
        collections: [],
        checksum: 'hash',
        redaction: 'secrets-redacted',
        restoreRequiresPreview: true,
      },
      projects: [{ id: 'existing' }, { id: 'incoming', name: 'Restored Project' }],
    });
    const preview = await previewRestore(raw);
    expect(preview.ok).toBe(true);

    await expect(applyRestore({ raw, confirmToken: 'wrong-token', now: new Date('2026-05-13T00:00:00.000Z') })).resolves.toMatchObject({
      ok: false,
      mode: 'merge-only',
      summary: { inserted: 0, skipped: 0, touchedCollections: 0 },
      warnings: ['Restore apply requires the latest preview applyToken.'],
    });

    const result = await applyRestore({ raw, confirmToken: preview.applyToken ?? '', now: new Date('2026-05-13T00:00:00.000Z') });
    expect(result).toMatchObject({
      ok: true,
      manifestId: 'restore-manifest',
      mode: 'merge-only',
      summary: { inserted: 1, skipped: 1, touchedCollections: 1 },
      auditRedaction: 'secrets-redacted',
    });
    expect(result.collections.find((item) => item.collection === 'projects')).toMatchObject({
      inserted: 1,
      skipped: 1,
      existingBefore: 1,
    });
    expect(collections.get('projects')?.map((item) => item.id)).toEqual(['existing', 'incoming']);
    expect(collections.get('backupManifests')).toHaveLength(1);
  });
});
