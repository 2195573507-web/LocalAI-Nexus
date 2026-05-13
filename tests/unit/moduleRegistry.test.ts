import { describe, expect, it } from 'vitest';
import { IPC_CHANNELS } from '../../src/shared/types';
import {
  getAllRegisteredStorageCollections,
  getIpcContract,
  getModuleContract,
  getModuleStorageCollections,
  getRouteContract,
  LEGACY_ROUTE_CONTRACTS,
  LOCALAI_IPC_CONTRACTS,
  LOCALAI_MODULE_REGISTRY,
  LOCALAI_ROUTE_CONTRACTS,
  LOCALAI_STORAGE_CONTRACTS,
  REQUIRED_BUILD_PLAN_CHANNELS,
} from '../../src/shared/moduleRegistry';

describe('LocalAI module registry', () => {
  it('declares all build-plan modules with routable contracts', () => {
    expect(LOCALAI_MODULE_REGISTRY).toHaveLength(8);
    expect(new Set(LOCALAI_MODULE_REGISTRY.map((module) => module.id)).size).toBe(8);

    for (const contract of LOCALAI_MODULE_REGISTRY) {
      expect(contract.name).toBeTruthy();
      expect(contract.buildPlanPath).toMatch(/^docs\/build-plans\//);
      expect(contract.summary.length).toBeGreaterThan(20);
      expect(contract.routes.length).toBeGreaterThan(0);
      expect(contract.ipcChannels.length).toBeGreaterThan(0);
      expect(contract.permissions.length).toBeGreaterThan(0);
      expect(contract.auditEvents.length).toBeGreaterThan(0);
      expect(contract.testFiles.length).toBeGreaterThan(0);
      expect(contract.completionPercent).toBeGreaterThanOrEqual(0);
      expect(contract.completionPercent).toBeLessThanOrEqual(100);
      expect(contract.completedCapabilities.length).toBeGreaterThan(0);
      expect(contract.incompleteCapabilities.length).toBeGreaterThan(0);
    }
    expect(LOCALAI_MODULE_REGISTRY.some((module) => module.status === 'partial')).toBe(true);
  });

  it('maps key build-plan acceptance channels to module contracts', () => {
    expect(getModuleContract('03-gateway').ipcChannels).toEqual(
      expect.arrayContaining([
        IPC_CHANNELS.GATEWAY_KEY_CREATE,
        IPC_CHANNELS.GATEWAY_RESTART,
        IPC_CHANNELS.GATEWAY_KEY_RESET,
        IPC_CHANNELS.GATEWAY_KEY_DELETE,
      ]),
    );
    expect(getModuleContract('05-knowledge-memory').ipcChannels).toEqual(
      expect.arrayContaining([
        IPC_CHANNELS.KNOWLEDGE_DOCUMENT_PREVIEW,
        IPC_CHANNELS.KNOWLEDGE_DOCUMENT_IMPORT_LOCAL_FILE,
        IPC_CHANNELS.KNOWLEDGE_ASSETS_SUMMARY,
        IPC_CHANNELS.KNOWLEDGE_RETRIEVAL_TEST,
      ]),
    );
    expect(getModuleContract('06-observability').ipcChannels).toEqual(
      expect.arrayContaining([
        IPC_CHANNELS.OBSERVABILITY_REPORT_GENERATE,
        IPC_CHANNELS.OBSERVABILITY_TRACE_GET,
        IPC_CHANNELS.EVAL_DATASET_LIST,
        IPC_CHANNELS.EVAL_DATASET_DELETE,
      ]),
    );
    expect(getModuleContract('07-security-ops').ipcChannels).toEqual(
      expect.arrayContaining([
        IPC_CHANNELS.OPS_BACKUP_PREVIEW,
        IPC_CHANNELS.OPS_REPAIR_PREVIEW,
        IPC_CHANNELS.OPS_RESTORE_PREVIEW,
        IPC_CHANNELS.OPS_RESTORE_APPLY,
      ]),
    );
  });

  it('declares gateway restart without relying on renderer-side HTTP shims', () => {
    const gateway = getModuleContract('03-gateway');
    expect(gateway.ipcChannels).toContain(IPC_CHANNELS.GATEWAY_RESTART);
    expect(gateway.completedCapabilities).toEqual(expect.arrayContaining(['Gateway start/stop/restart/status']));
    expect(gateway.incompleteCapabilities).not.toContain('Gateway restart IPC');
  });

  it('keeps unfinished build-plan modules honest in the visible status source', () => {
    expect(getModuleContract('00-modular-refactor')).toMatchObject({
      status: 'partial',
      completionPercent: 55,
    });
    expect(getModuleContract('01-workspace')).toMatchObject({
      completionPercent: 82,
    });
    expect(getModuleContract('03-gateway')).toMatchObject({
      completionPercent: 90,
    });
    expect(getModuleContract('05-knowledge-memory')).toMatchObject({
      completionPercent: 80,
    });
    expect(getModuleContract('06-observability')).toMatchObject({
      completionPercent: 78,
    });
    expect(getModuleContract('07-security-ops')).toMatchObject({
      completionPercent: 84,
    });
    expect(getModuleContract('02-providers').permissions).toEqual(
      expect.arrayContaining(['provider:read', 'provider:write']),
    );
    expect(getModuleContract('03-gateway').permissions).toEqual(
      expect.arrayContaining(['gateway:read', 'gateway:write']),
    );
    expect(getModuleContract('06-observability').status).toBe('partial');
  });

  it('publishes route, IPC, and storage contracts for the modular refactor plan', () => {
    expect(LOCALAI_ROUTE_CONTRACTS.length).toBeGreaterThan(20);
    expect(LOCALAI_IPC_CONTRACTS.length).toBeGreaterThan(40);
    expect(LOCALAI_STORAGE_CONTRACTS.length).toBeGreaterThan(25);
    expect(LEGACY_ROUTE_CONTRACTS.map((route) => route.path)).toEqual(
      expect.arrayContaining(['/prompt-lab', '/log-analyzer', '/git-timeline', '/safety-box', '/shared-memory-hub']),
    );
    expect(getRouteContract('/gateway')).toMatchObject({ moduleId: '03-gateway' });
    expect(getRouteContract('/shared-memory-hub')).toMatchObject({ moduleId: '05-knowledge-memory', legacyAlias: true });
    expect(getIpcContract(IPC_CHANNELS.WORKSPACE_SUMMARY)).toMatchObject({ moduleId: '01-workspace' });
    expect(getIpcContract(IPC_CHANNELS.GATEWAY_RESTART)).toMatchObject({ moduleId: '03-gateway' });
    expect(getRouteContract('/knowledge')).toMatchObject({ moduleId: '05-knowledge-memory' });
    expect(getIpcContract(IPC_CHANNELS.KNOWLEDGE_ASSETS_SUMMARY)).toMatchObject({ moduleId: '05-knowledge-memory' });
    expect(getIpcContract(IPC_CHANNELS.KNOWLEDGE_DOCUMENT_IMPORT_LOCAL_FILE)).toMatchObject({ moduleId: '05-knowledge-memory' });
    expect(getIpcContract(IPC_CHANNELS.OPS_REPAIR_PREVIEW)).toMatchObject({ moduleId: '07-security-ops' });
    expect(getIpcContract(IPC_CHANNELS.OPS_RESTORE_APPLY)).toMatchObject({ moduleId: '07-security-ops' });
    expect(getModuleStorageCollections('03-gateway')).toEqual(
      expect.arrayContaining(['gatewayApiKeys', 'gatewayRequests', 'tokenUsage', 'tokenPolicies']),
    );
    expect(getAllRegisteredStorageCollections()).toEqual(expect.arrayContaining(['settings', 'auditLogs', 'knowledgeDocuments']));
    expect(new Set(LOCALAI_STORAGE_CONTRACTS.map((contract) => contract.collection)).size).toBe(LOCALAI_STORAGE_CONTRACTS.length);
    for (const channel of REQUIRED_BUILD_PLAN_CHANNELS) {
      expect(getIpcContract(channel)).toBeTruthy();
    }
  });
});
