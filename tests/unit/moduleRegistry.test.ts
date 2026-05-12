import { describe, expect, it } from 'vitest';
import { IPC_CHANNELS } from '../../src/shared/types';
import { getModuleContract, LOCALAI_MODULE_REGISTRY } from '../../src/shared/moduleRegistry';

describe('LocalAI module registry', () => {
  it('declares all build-plan modules with routable contracts', () => {
    expect(LOCALAI_MODULE_REGISTRY).toHaveLength(8);
    expect(new Set(LOCALAI_MODULE_REGISTRY.map((module) => module.id)).size).toBe(8);

    for (const contract of LOCALAI_MODULE_REGISTRY) {
      expect(contract.name).toBeTruthy();
      expect(contract.routes.length).toBeGreaterThan(0);
      expect(contract.ipcChannels.length).toBeGreaterThan(0);
      expect(contract.permissions.length).toBeGreaterThan(0);
      expect(contract.auditEvents.length).toBeGreaterThan(0);
      expect(contract.testFiles.length).toBeGreaterThan(0);
      expect(contract.status).toBe('implemented');
    }
  });

  it('maps key build-plan acceptance channels to module contracts', () => {
    expect(getModuleContract('03-gateway').ipcChannels).toEqual(
      expect.arrayContaining([
        IPC_CHANNELS.GATEWAY_KEY_CREATE,
        IPC_CHANNELS.GATEWAY_KEY_RESET,
        IPC_CHANNELS.GATEWAY_KEY_DELETE,
      ]),
    );
    expect(getModuleContract('05-knowledge-memory').ipcChannels).toEqual(
      expect.arrayContaining([
        IPC_CHANNELS.KNOWLEDGE_DOCUMENT_PREVIEW,
        IPC_CHANNELS.KNOWLEDGE_RETRIEVAL_TEST,
      ]),
    );
    expect(getModuleContract('06-observability').ipcChannels).toContain(IPC_CHANNELS.OBSERVABILITY_REPORT_GENERATE);
    expect(getModuleContract('07-security-ops').ipcChannels).toEqual(
      expect.arrayContaining([IPC_CHANNELS.OPS_BACKUP_PREVIEW, IPC_CHANNELS.OPS_RESTORE_PREVIEW]),
    );
  });
});
