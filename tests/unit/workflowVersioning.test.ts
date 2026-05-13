import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import * as nodeCrypto from 'node:crypto';
import type { Workflow, WorkflowVersion } from '../../src/shared/workflowTypes';

const collections = new Map<string, Array<Record<string, unknown>>>();
const auditEvents: Array<Record<string, unknown>> = [];

let publishWorkflowVersion: typeof import('../../src/main/domain/workflow/workflowVersionService').publishWorkflowVersion;
let rollbackWorkflowVersion: typeof import('../../src/main/domain/workflow/workflowVersionService').rollbackWorkflowVersion;

vi.stubGlobal('require', (id: string) => {
  if (id === 'crypto') return nodeCrypto;
  throw new Error(`Unexpected CommonJS require in workflow versioning test: ${id}`);
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
  },
}));

vi.mock('../../src/main/audit', () => ({
  recordAudit: async (event: Record<string, unknown>) => {
    auditEvents.push(event);
  },
}));

function seedWorkflow() {
  const workflow: Workflow = {
    id: 'workflow-1',
    projectId: 'project-1',
    ownerUserId: 'user-1',
    name: 'Release plan workflow',
    description: 'Build and release safely',
    status: 'draft',
    version: 2,
    nodes: [
      { id: 'start', type: 'start', title: 'Start', config: {}, position: { x: 0, y: 0 } },
      { id: 'llm-v2', type: 'llm', title: 'Draft v2', config: { model: 'gpt-local' }, position: { x: 100, y: 0 } },
      { id: 'out', type: 'output', title: 'Output', config: {}, position: { x: 200, y: 0 } },
    ],
    edges: [{ id: 'edge-v2', source: 'start', target: 'llm-v2' }],
    createdAt: '2026-05-12T00:00:00.000Z',
    updatedAt: '2026-05-12T01:00:00.000Z',
  };
  const versions: WorkflowVersion[] = [
    {
      id: 'version-1',
      workflowId: workflow.id,
      version: 1,
      message: 'Initial version',
      status: 'draft',
      nodes: [
        { id: 'start', type: 'start', title: 'Start', config: {}, position: { x: 0, y: 0 } },
        { id: 'llm-v1', type: 'llm', title: 'Draft v1', config: { model: 'gpt-local' }, position: { x: 100, y: 0 } },
        { id: 'out', type: 'output', title: 'Output', config: {}, position: { x: 200, y: 0 } },
      ],
      edges: [{ id: 'edge-v1', source: 'start', target: 'llm-v1' }],
      createdByUserId: 'user-1',
      createdAt: '2026-05-12T00:00:00.000Z',
    },
    {
      id: 'version-2',
      workflowId: workflow.id,
      version: 2,
      message: 'Saved v2',
      status: 'draft',
      nodes: workflow.nodes,
      edges: workflow.edges,
      createdByUserId: 'user-1',
      createdAt: '2026-05-12T01:00:00.000Z',
    },
  ];
  collections.set('workflows', [workflow as unknown as Record<string, unknown>]);
  collections.set('workflowVersions', versions as unknown as Array<Record<string, unknown>>);
}

describe('workflow versioning service', () => {
  beforeAll(async () => {
    ({ publishWorkflowVersion, rollbackWorkflowVersion } = await import('../../src/main/domain/workflow/workflowVersionService'));
  });

  beforeEach(() => {
    collections.clear();
    auditEvents.length = 0;
    seedWorkflow();
  });

  it('publishes the current workflow version with version metadata and audit evidence', async () => {
    const result = await publishWorkflowVersion({
      workflowId: 'workflow-1',
      userId: 'user-1',
      actor: { userId: 'user-1' },
      message: 'Publish for release',
    });

    expect(result.workflow).toMatchObject({
      id: 'workflow-1',
      status: 'active',
      publishedVersion: 2,
      publishedByUserId: 'user-1',
    });
    expect(result.version).toMatchObject({
      id: 'version-2',
      status: 'published',
      message: 'Publish for release',
      publishedByUserId: 'user-1',
    });
    expect(auditEvents).toEqual(expect.arrayContaining([
      expect.objectContaining({ action: 'workflow.publish', status: 'success' }),
    ]));
  });

  it('rolls back a historical version into a new draft version', async () => {
    const result = await rollbackWorkflowVersion({
      workflowId: 'workflow-1',
      versionId: 'version-1',
      userId: 'user-1',
      actor: { userId: 'user-1' },
    });

    expect(result.workflow).toMatchObject({
      id: 'workflow-1',
      status: 'draft',
      version: 3,
      lastRollbackVersion: 1,
    });
    expect(result.workflow.nodes.map((node) => node.id)).toContain('llm-v1');
    expect(result.workflow.edges).toEqual([{ id: 'edge-v1', source: 'start', target: 'llm-v1' }]);
    expect(result.version).toMatchObject({
      workflowId: 'workflow-1',
      version: 3,
      status: 'rollback',
      restoredFromVersion: 1,
    });
    expect(auditEvents).toEqual(expect.arrayContaining([
      expect.objectContaining({ action: 'workflow.rollback', status: 'success' }),
    ]));
  });
});
