import { randomUUID } from 'node:crypto';
import type { Workflow, WorkflowPublishResult, WorkflowRollbackResult, WorkflowVersion } from '../../../shared/workflowTypes.js';
import { sanitizeObject } from '../../../shared/secretRedaction.js';
import storage from '../../storage.js';
import { recordAudit } from '../../audit.js';

export async function publishWorkflowVersion(input: {
  workflowId: string;
  userId?: string;
  actor?: Record<string, unknown>;
  message?: string;
}): Promise<WorkflowPublishResult> {
  const workflow = await storage.getById<Workflow>('workflows', input.workflowId);
  if (!workflow) throw new Error('Workflow not found.');
  const now = new Date().toISOString();
  const versions = await storage.getAll<WorkflowVersion>('workflowVersions');
  const existing = versions.find((version) => version.workflowId === workflow.id && version.version === workflow.version);
  const version = existing
    ? await storage.update<WorkflowVersion>('workflowVersions', existing.id, {
      status: 'published',
      publishedAt: now,
      publishedByUserId: input.userId,
      message: input.message || existing.message || `Published v${workflow.version}`,
    })
    : await storage.create<WorkflowVersion>('workflowVersions', {
      id: randomUUID(),
      workflowId: workflow.id,
      version: workflow.version,
      status: 'published',
      publishedAt: now,
      publishedByUserId: input.userId,
      message: input.message || `Published v${workflow.version}`,
      nodes: workflow.nodes,
      edges: workflow.edges,
      createdByUserId: input.userId,
      createdAt: now,
    });
  if (!version) throw new Error('Workflow version could not be published.');
  const saved = await storage.update<Workflow>('workflows', workflow.id, {
    status: 'active',
    publishedVersion: workflow.version,
    publishedAt: now,
    publishedByUserId: input.userId,
    updatedAt: now,
  });
  if (!saved) throw new Error('Workflow could not be updated.');
  await recordAudit({
    type: 'admin.operation',
    action: 'workflow.publish',
    status: 'success',
    severity: 'info',
    actor: input.actor ?? {},
    resource: { type: 'workflow', id: workflow.id, label: workflow.name },
    metadata: sanitizeObject({ projectId: workflow.projectId, version: workflow.version, versionId: version.id }),
  }).catch(() => undefined);
  return {
    workflow: sanitizeObject(saved) as Workflow,
    version: sanitizeObject(version) as WorkflowVersion,
    message: `Workflow ${saved.name} published at v${saved.publishedVersion}.`,
  };
}

export async function rollbackWorkflowVersion(input: {
  workflowId: string;
  versionId: string;
  userId?: string;
  actor?: Record<string, unknown>;
  message?: string;
}): Promise<WorkflowRollbackResult> {
  const workflow = await storage.getById<Workflow>('workflows', input.workflowId);
  if (!workflow) throw new Error('Workflow not found.');
  const versions = await storage.getAll<WorkflowVersion>('workflowVersions');
  const restoredFrom = versions.find((version) => version.workflowId === workflow.id && version.id === input.versionId);
  if (!restoredFrom) throw new Error('Workflow version not found.');
  const now = new Date().toISOString();
  const nextVersion = workflow.version + 1;
  const saved = await storage.update<Workflow>('workflows', workflow.id, {
    nodes: restoredFrom.nodes,
    edges: restoredFrom.edges,
    version: nextVersion,
    status: 'draft',
    lastRollbackVersion: restoredFrom.version,
    lastRollbackAt: now,
    updatedAt: now,
  });
  if (!saved) throw new Error('Workflow could not be rolled back.');
  const version = await storage.create<WorkflowVersion>('workflowVersions', {
    id: randomUUID(),
    workflowId: workflow.id,
    version: nextVersion,
    status: 'rollback',
    restoredFromVersion: restoredFrom.version,
    restoredAt: now,
    message: input.message || `Rollback to v${restoredFrom.version}`,
    nodes: restoredFrom.nodes,
    edges: restoredFrom.edges,
    createdByUserId: input.userId,
    createdAt: now,
  });
  await recordAudit({
    type: 'admin.operation',
    action: 'workflow.rollback',
    status: 'success',
    severity: 'warning',
    actor: input.actor ?? {},
    resource: { type: 'workflow', id: workflow.id, label: workflow.name },
    metadata: sanitizeObject({
      projectId: workflow.projectId,
      restoredFromVersion: restoredFrom.version,
      newVersion: nextVersion,
      versionId: version.id,
    }),
  }).catch(() => undefined);
  return {
    workflow: sanitizeObject(saved) as Workflow,
    version: sanitizeObject(version) as WorkflowVersion,
    restoredFrom: sanitizeObject(restoredFrom) as WorkflowVersion,
    message: `Workflow ${saved.name} rolled back to v${restoredFrom.version} as draft v${nextVersion}.`,
  };
}
