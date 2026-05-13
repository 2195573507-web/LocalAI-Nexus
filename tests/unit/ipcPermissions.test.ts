import { describe, expect, it } from 'vitest';
import ipcSource from '../../src/main/ipc.ts?raw';

function expectPermission(channel: string, permission: string) {
  expect(ipcSource).toContain(`[IPC_CHANNELS.${channel}]: '${permission}'`);
}

describe('IPC permission contract', () => {
  it('keeps global trace and evaluation dataset channels admin-audit only', () => {
    expectPermission('OBSERVABILITY_REPORT_GENERATE', 'admin:audit');
    expectPermission('OBSERVABILITY_TRACE_GET', 'admin:audit');
    expectPermission('EVAL_MOCK_RUN', 'admin:audit');
    expectPermission('EVAL_DATASET_LIST', 'admin:audit');
    expectPermission('EVAL_DATASET_DELETE', 'admin:audit');
  });

  it('keeps knowledge file import in main-process memory-write scope', () => {
    expectPermission('KNOWLEDGE_DOCUMENT_IMPORT_LOCAL_FILE', 'memory:write');
    expect(ipcSource).toContain('dialog.showOpenDialog(win');
    expect(ipcSource).toContain('saveKnowledgeDocumentPreview({');
  });

  it('keeps ops repair preview under ops restore scope without apply execution', () => {
    expectPermission('OPS_REPAIR_PREVIEW', 'ops:restore');
    expect(ipcSource).toContain('ipcMain.handle(IPC_CHANNELS.OPS_REPAIR_PREVIEW');
    expect(ipcSource).toContain('const preview = await previewOpsRepair()');
    expect(ipcSource).toContain('return preview;');
    expect(ipcSource).toContain("recordMutationAudit(context, 'ops.repair.previewed'");
  });
});
