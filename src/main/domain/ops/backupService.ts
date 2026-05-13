import { randomUUID } from 'crypto';
import type { NexusBackupManifest, NexusOpsRepairPreview, NexusRestoreApplyResult, NexusRestorePreview } from '../../../shared/types.js';
import { containsSecret, sanitizeObject } from '../../../shared/secretRedaction.js';
import { simpleHash } from '../../../shared/configPortability.js';
import storage from '../../storage.js';
import type { StorageCollectionName } from '../../storage.js';

const BACKUP_COLLECTIONS = [
  'projects',
  'tasks',
  'prompts',
  'memories',
  'knowledgeDocuments',
  'runs',
  'runEvents',
  'workflows',
  'workflowVersions',
  'agents',
  'agentExecutions',
  'agentFeedback',
  'providerSettings',
  'healthChecks',
  'modelRoutes',
  'runtimeProfiles',
  'gatewayApiKeys',
  'gatewayRequests',
  'tokenPolicies',
  'tokenUsage',
  'diagnosticReports',
  'evaluationRuns',
  'mcpAllowlist',
  'templateBundles',
  'skillsRegistry',
  'settings',
  'auditLogs',
] as const;

type BackupCollection = typeof BACKUP_COLLECTIONS[number];

async function collectionCounts() {
  const rows = await Promise.all(BACKUP_COLLECTIONS.map(async (name) => {
    const records = await storage.getAll(name).catch(() => []);
    return { name, count: records.length, redacted: true };
  }));
  return rows;
}

async function inspectCollection(name: BackupCollection) {
  const records = (await storage.getAll(name).catch(() => [])) as Array<Record<string, unknown>>;
  const ids = new Set<string>();
  let missingId = 0;
  let duplicateId = 0;
  let secretRisk = 0;
  for (const record of records) {
    const id = typeof record.id === 'string' ? record.id.trim() : '';
    if (!id) {
      missingId += 1;
    } else if (ids.has(id)) {
      duplicateId += 1;
    } else {
      ids.add(id);
    }
    if (containsSecret(JSON.stringify(record))) secretRisk += 1;
  }
  return { name, records, missingId, duplicateId, secretRisk };
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

export async function previewOpsRepair(now = new Date()): Promise<NexusOpsRepairPreview> {
  const inspections = await Promise.all(BACKUP_COLLECTIONS.map((collection) => inspectCollection(collection)));
  const checks: NexusOpsRepairPreview['checks'] = [];
  const actions: NexusOpsRepairPreview['actions'] = [];
  const warnings: string[] = [];
  const errors: string[] = [];

  for (const item of inspections) {
    const affectedCollections = [item.name];
    if (item.missingId > 0) {
      checks.push({
        id: `${item.name}-missing-id`,
        name: `${item.name} missing ids`,
        status: 'fail',
        detail: `${item.missingId} records cannot be safely repaired without explicit migration.`,
        affectedCollections,
      });
      errors.push(`${item.name}: ${item.missingId} records are missing id fields.`);
      actions.push({
        id: `${item.name}-assign-ids`,
        label: `Create migration for ${item.name} records without ids`,
        mode: 'manual',
        detail: 'Generate a reviewed migration that assigns stable ids, then create a backup before applying it.',
        requiresBackup: true,
      });
    }
    if (item.duplicateId > 0) {
      checks.push({
        id: `${item.name}-duplicate-id`,
        name: `${item.name} duplicate ids`,
        status: 'warning',
        detail: `${item.duplicateId} duplicate ids detected; merge/apply may skip records.`,
        affectedCollections,
      });
      warnings.push(`${item.name}: ${item.duplicateId} duplicate ids detected.`);
      actions.push({
        id: `${item.name}-dedupe`,
        label: `Review duplicate ids in ${item.name}`,
        mode: 'manual',
        detail: 'Inspect duplicate records and choose canonical records before any restore or migration apply.',
        requiresBackup: true,
      });
    }
    if (item.secretRisk > 0) {
      checks.push({
        id: `${item.name}-secret-risk`,
        name: `${item.name} secret scan`,
        status: 'warning',
        detail: `${item.secretRisk} records contain secret-like strings after redacted inspection.`,
        affectedCollections,
      });
      warnings.push(`${item.name}: ${item.secretRisk} records contain secret-like strings.`);
      actions.push({
        id: `${item.name}-redaction-review`,
        label: `Review redaction for ${item.name}`,
        mode: 'preview-only',
        detail: 'Run a redacted export or targeted review before sharing backup artifacts.',
        requiresBackup: false,
      });
    }
    if (item.records.length === 0) {
      checks.push({
        id: `${item.name}-empty`,
        name: `${item.name} collection exists`,
        status: 'pass',
        detail: 'No records currently stored.',
        affectedCollections,
      });
    }
  }

  const backupCoverage = inspections;
  checks.push({
    id: 'backup-coverage',
    name: 'Backup manifest coverage',
    status: 'pass',
    detail: `${backupCoverage.length} durable collections are included in backup preview coverage.`,
    affectedCollections: backupCoverage.map((item) => item.name),
  });

  checks.push({
    id: 'repair-mode',
    name: 'Repair execution mode',
    status: 'pass',
    detail: 'This endpoint is preview-only and does not write storage, run migrations, or execute shortcut scripts.',
  });

  return sanitizeObject({
    id: randomUUID(),
    generatedAt: now.toISOString(),
    ok: errors.length === 0,
    checks,
    actions,
    warnings,
    errors,
    requiresBackup: true,
    redaction: 'secrets-redacted',
  }) as NexusOpsRepairPreview;
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
    applyToken: errors.length === 0 ? simpleHash(sanitizeObject({ manifest, changes })) : undefined,
  };
}

export async function applyRestore(input: {
  raw: string;
  confirmToken: string;
  now?: Date;
}): Promise<NexusRestoreApplyResult> {
  const preview = await previewRestore(input.raw);
  if (!preview.ok) {
    return {
      ok: false,
      appliedAt: (input.now ?? new Date()).toISOString(),
      before: await previewBackup(input.now ?? new Date()),
      collections: [],
      checksum: simpleHash({ errors: preview.errors, warnings: preview.warnings }),
      mode: 'merge-only',
      summary: { inserted: 0, skipped: 0, touchedCollections: 0 },
      auditRedaction: 'secrets-redacted',
      warnings: [...preview.warnings, ...preview.errors],
    };
  }
  if (!preview.applyToken || input.confirmToken !== preview.applyToken) {
    return {
      ok: false,
      appliedAt: (input.now ?? new Date()).toISOString(),
      manifestId: preview.manifest?.id,
      before: await previewBackup(input.now ?? new Date()),
      collections: [],
      checksum: simpleHash({ token: 'mismatch', manifestId: preview.manifest?.id }),
      mode: 'merge-only',
      summary: { inserted: 0, skipped: 0, touchedCollections: 0 },
      auditRedaction: 'secrets-redacted',
      warnings: ['Restore apply requires the latest preview applyToken.'],
    };
  }

  const before = await createBackupManifest(input.now ?? new Date());
  const bundle = JSON.parse(input.raw) as Record<string, unknown>;
  const collections = [];
  for (const collection of BACKUP_COLLECTIONS) {
    const incoming = Array.isArray(bundle[collection])
      ? sanitizeObject(bundle[collection]) as Array<{ id?: unknown; [key: string]: unknown }>
      : [];
    if (incoming.length === 0) {
      const existingBefore = (await storage.getAll(collection).catch(() => [])).length;
      collections.push({ collection, inserted: 0, skipped: 0, existingBefore });
      continue;
    }
    const records = incoming
      .filter((item): item is { id: string; [key: string]: unknown } => typeof item.id === 'string' && item.id.trim().length > 0)
      .map((item) => ({ ...item, id: item.id }));
    const result = await storage.mergeMany(collection as StorageCollectionName, records as never);
    collections.push({ collection, ...result });
  }
  const appliedAt = (input.now ?? new Date()).toISOString();
  const inserted = collections.reduce((total, item) => total + item.inserted, 0);
  const skipped = collections.reduce((total, item) => total + item.skipped, 0);
  return {
    ok: true,
    appliedAt,
    manifestId: preview.manifest?.id,
    before,
    collections,
    checksum: simpleHash(sanitizeObject({ appliedAt, manifestId: preview.manifest?.id, collections })),
    mode: 'merge-only',
    summary: {
      inserted,
      skipped,
      touchedCollections: collections.filter((item) => item.inserted > 0 || item.skipped > 0).length,
    },
    auditRedaction: 'secrets-redacted',
    warnings: preview.warnings,
  };
}
