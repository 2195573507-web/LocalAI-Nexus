import { app } from 'electron';
import * as path from 'path';
import * as fs from 'fs/promises';
import { randomUUID } from 'crypto';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type CollectionName =
  | 'projects'
  | 'tasks'
  | 'prompts'
  | 'memories'
  | 'runs'
  | 'riskChecks'
  | 'providerSettings'
  | 'gatewayApiKeys'
  | 'tokenUsage'
  | 'tokenPolicies'
  | 'activeGatewayRequests'
  | 'healthChecks'
  | 'runtimeProfiles'
  | 'modelRoutes'
  | 'templateBundles'
  | 'skills'
  | 'skillRuns'
  | 'gatewayRequests'
  | 'settings'
  | 'users'
  | 'sessions'
  | 'auditLogs'
  | 'runEvents'
  | 'workflows'
  | 'workflowVersions'
  | 'diagnosticReports'
  | 'mcpAllowlist'
  | 'agents'
  | 'agentExecutions'
  | 'agentFeedback'
  | 'skillsRegistry'
  | 'evaluationRuns'
  | 'knowledgeDocuments'
  | 'backupManifests';

export type StorageCollectionName = CollectionName;

type Identifiable = { id: string };
type DataRecord = Identifiable;

// ---------------------------------------------------------------------------
// Write queue (one promise chain per collection – serialised writes)
// ---------------------------------------------------------------------------

const writeQueues = new Map<CollectionName, Promise<void>>();

// ---------------------------------------------------------------------------
// Storage
// ---------------------------------------------------------------------------

class Storage {
  private dataDir: string = '';

  /** Must be called once after the app is ready so userData is available. */
  async init(): Promise<void> {
    this.dataDir = path.join(app.getPath('userData'), 'agentflow-data');
    await fs.mkdir(this.dataDir, { recursive: true });
  }

  private filePath(collection: CollectionName): string {
    return path.join(this.dataDir, `${collection}.json`);
  }

  // -- low-level read / write -----------------------------------------------

  private async readCollection<T>(collection: CollectionName): Promise<T[]> {
    const fp = this.filePath(collection);
    try {
      const raw = await fs.readFile(fp, 'utf-8');
      return JSON.parse(raw) as T[];
    } catch (err: unknown) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        await fs.writeFile(fp, '[]', 'utf-8');
        return [];
      }
      throw err;
    }
  }

  private async writeCollection<T>(collection: CollectionName, data: T[]): Promise<void> {
    const fp = this.filePath(collection);
    await fs.writeFile(fp, JSON.stringify(data, null, 2), 'utf-8');
  }

  /**
   * Enqueue a write so no two writes to the same collection happen
   * concurrently, preventing corruption.
   */
  private enqueueWrite<T>(collection: CollectionName, data: T[]): Promise<void> {
    const prev = writeQueues.get(collection) ?? Promise.resolve();
    const next = prev.then(() => this.writeCollection(collection, data));
    writeQueues.set(collection, next.catch(() => { /* swallow – caller handles */ }));
    return next;
  }

  // -- public CRUD ----------------------------------------------------------

  async getAll<T extends DataRecord>(collection: CollectionName): Promise<T[]> {
    return this.readCollection<T>(collection);
  }

  async getById<T extends DataRecord>(collection: CollectionName, id: string): Promise<T | null> {
    const items = await this.readCollection<T>(collection);
    return items.find((item) => item.id === id) ?? null;
  }

  async create<T extends DataRecord>(
    collection: CollectionName,
    item: Partial<T> & { id?: string },
  ): Promise<T> {
    const items = await this.readCollection<T>(collection);
    const newItem = {
      ...item,
      id: item.id ?? randomUUID(),
    } as T;
    items.push(newItem);
    await this.enqueueWrite(collection, items);
    return newItem;
  }

  async update<T extends DataRecord>(
    collection: CollectionName,
    id: string,
    updates: Partial<T>,
  ): Promise<T | null> {
    const items = await this.readCollection<T>(collection);
    const idx = items.findIndex((item) => item.id === id);
    if (idx === -1) return null;
    items[idx] = { ...items[idx], ...updates, id } as T;
    await this.enqueueWrite(collection, items);
    return items[idx];
  }

  async delete(collection: CollectionName, id: string): Promise<boolean> {
    const items = await this.readCollection<DataRecord>(collection);
    const idx = items.findIndex((item) => item.id === id);
    if (idx === -1) return false;
    items.splice(idx, 1);
    await this.enqueueWrite(collection, items);
    return true;
  }

  async mergeMany<T extends DataRecord>(
    collection: CollectionName,
    incoming: T[],
  ): Promise<{ inserted: number; skipped: number; existingBefore: number }> {
    const items = await this.readCollection<T>(collection);
    const seen = new Set(items.map((item) => item.id));
    const merged = [...items];
    let inserted = 0;
    let skipped = 0;
    for (const item of incoming) {
      if (!item?.id || seen.has(item.id)) {
        skipped += 1;
        continue;
      }
      merged.push(item);
      seen.add(item.id);
      inserted += 1;
    }
    if (inserted > 0) await this.enqueueWrite(collection, merged);
    return { inserted, skipped, existingBefore: items.length };
  }
}

// Singleton
const storage = new Storage();
export default storage;
