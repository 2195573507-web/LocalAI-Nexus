import { randomUUID } from 'crypto';
import type { NexusBackupManifest, NexusRestorePreview } from '../../../shared/types.js';
import { sanitizeObject } from '../../../shared/secretRedaction.js';
import { simpleHash } from '../../../shared/configPortability.js';
import storage from '../../storage.js';

const BACKUP_COLLECTIONS = [
  'projects',
  'tasks',
  'prompts',
  'memories',
  'runs',
  'providerSettings',
  'gatewayApiKeys',
  'tokenPolicies',
  'settings',
  'auditLogs',
] as const;

async function collectionCounts() {
  const rows = await Promise.all(BACKUP_COLLECTIONS.map(async (name) => {
    const records = await storage.getAll(name).catch(() => []);
    return { name, count: records.length, redacted: true };
  }));
  return rows;
}

async function buildRedactedBundle(manifest: NexusBackupManifest): Promise<Record<string, unknown>> {
  const bundle: Record<string, unknown> = { manifest };
  for (const collection of BACKUP_COLLECTIONS) {
    const records = await storage.getAll(collection).catch(() => []);
    bundle[collection] = sanitizeObject(records);
  }
  return bundle;
}

export async function previewBackup(now = new Date()): Promise<NexusBackupManifest> {
  const collections = await collectionCounts();
  return {
    id: randomUUID(),
    createdAt: now.toISOString(),
    mode: 'dry-run',
    schemaVersion: 1,
    collections,
    checksum: simpleHash({ collections, createdAt: now.toISOString(), redaction: 'secrets-redacted' }),
    redaction: 'secrets-redacted',
    restoreRequiresPreview: true,
  };
}

export async function createBackupManifest(now = new Date()): Promise<NexusBackupManifest> {
  const preview = await previewBackup(now);
  const seedManifest = { ...preview, mode: 'created' as const };
  const seedBundle = await buildRedactedBundle(seedManifest);
  const bundleHash = simpleHash(seedBundle);
  const bundleBytes = Buffer.byteLength(JSON.stringify(seedBundle), 'utf8');
  const manifest: NexusBackupManifest = {
    ...seedManifest,
    checksum: bundleHash,
    bundle: {
      collections: BACKUP_COLLECTIONS.map((collection) => collection),
      bytes: bundleBytes,
      hash: bundleHash,
      redaction: 'secrets-redacted',
    },
  };
  await storage.create<NexusBackupManifest>('backupManifests', sanitizeObject(manifest) as NexusBackupManifest).catch(() => undefined);
  return manifest;
}

export async function previewRestore(raw: string): Promise<NexusRestorePreview> {
  const warnings: string[] = [];
  const errors: string[] = [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, warnings, errors: ['Restore preview requires valid JSON.'], changes: [] };
  }
  const bundle = parsed && typeof parsed === 'object' ? parsed as Record<string, unknown> : {};
  const manifest = bundle.manifest && typeof bundle.manifest === 'object'
    ? bundle.manifest as NexusBackupManifest
    : undefined;
  if (!manifest) warnings.push('No backup manifest was found; only collection counts can be previewed.');
  if (manifest && manifest.schemaVersion !== 1) errors.push('Unsupported backup schemaVersion.');
  if (manifest && manifest.redaction !== 'secrets-redacted') errors.push('Backup manifest must declare secrets-redacted.');
  if (manifest && manifest.restoreRequiresPreview !== true) errors.push('Restore requires an explicit preview marker.');
  const changes = await Promise.all(BACKUP_COLLECTIONS.map(async (collection) => {
    const incoming = Array.isArray(bundle[collection]) ? (bundle[collection] as unknown[]).length : 0;
    const existing = (await storage.getAll(collection).catch(() => [])).length;
    return {
      collection,
      incoming,
      existing,
      action: incoming > 0 ? 'merge-preview' as const : 'skip' as const,
    };
  }));
  return {
    ok: errors.length === 0,
    warnings,
    errors,
    manifest,
    changes,
  };
}
