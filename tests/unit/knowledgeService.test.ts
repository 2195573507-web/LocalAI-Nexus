import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import * as nodeCrypto from 'node:crypto';

const collections = new Map<string, Array<Record<string, unknown>>>();

let previewKnowledgeDocument: typeof import('../../src/main/domain/knowledge/knowledgeService').previewKnowledgeDocument;
let saveKnowledgeDocumentPreview: typeof import('../../src/main/domain/knowledge/knowledgeService').saveKnowledgeDocumentPreview;
let testKnowledgeRetrieval: typeof import('../../src/main/domain/knowledge/knowledgeService').testKnowledgeRetrieval;

vi.stubGlobal('require', (id: string) => {
  if (id === 'crypto') return nodeCrypto;
  throw new Error(`Unexpected CommonJS require in knowledge service test: ${id}`);
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

describe('knowledge service', () => {
  beforeAll(async () => {
    ({ previewKnowledgeDocument, saveKnowledgeDocumentPreview, testKnowledgeRetrieval } = await import('../../src/main/domain/knowledge/knowledgeService'));
  });

  beforeEach(() => {
    collections.clear();
  });

  it('previews local documents with chunks and secret redaction', () => {
    const preview = previewKnowledgeDocument({
      title: 'Provider notes',
      content: 'Use retrieval for project context.\n\napi_key=sk-secret-123456 should never leak.',
    }, new Date('2026-05-12T00:00:00.000Z'));
    expect(preview.title).toBe('Provider notes');
    expect(preview.chunkCount).toBeGreaterThan(0);
    expect(JSON.stringify(preview)).not.toContain('sk-secret');
    expect(preview.redaction).toBe('secrets-redacted');
  });

  it('stores preview documents and returns scored mock retrieval matches', async () => {
    await saveKnowledgeDocumentPreview({
      title: 'Workflow guide',
      content: 'Workflow trace output shows every node input and output. Gateway trace IDs link requests to usage records.',
    });

    const result = await testKnowledgeRetrieval({ query: 'workflow trace gateway', topK: 2 });
    expect(result.mode).toBe('mock-local');
    expect(result.matches.length).toBeGreaterThan(0);
    expect(result.matches[0].title).toBe('Workflow guide');
    expect(result.matches[0].score).toBeGreaterThan(0);
  });
});
