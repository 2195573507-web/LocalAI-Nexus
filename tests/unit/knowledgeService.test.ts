import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import * as nodeCrypto from 'node:crypto';

const collections = new Map<string, Array<Record<string, unknown>>>();

let previewKnowledgeDocument: typeof import('../../src/main/domain/knowledge/knowledgeService').previewKnowledgeDocument;
let saveKnowledgeDocumentPreview: typeof import('../../src/main/domain/knowledge/knowledgeService').saveKnowledgeDocumentPreview;
let summarizeKnowledgeAssets: typeof import('../../src/main/domain/knowledge/knowledgeService').summarizeKnowledgeAssets;
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
    ({ previewKnowledgeDocument, saveKnowledgeDocumentPreview, summarizeKnowledgeAssets, testKnowledgeRetrieval } = await import('../../src/main/domain/knowledge/knowledgeService'));
  });

  beforeEach(() => {
    collections.clear();
  });

  it('previews local documents with chunks and secret redaction', () => {
    const preview = previewKnowledgeDocument({
      title: 'Provider notes',
      content: 'Use retrieval for project context.\n\napi_key=sk-secret-123456 should never leak.',
    }, new Date('2026-05-12T00:00:00.000Z'));
    const indexedPreview = preview as typeof preview & {
      index: {
        strategy: 'keyword-local';
        chunkIds: string[];
        tags: string[];
        tokenEstimate: number;
        totalTokens: number;
        qualityScore: number;
      };
      assetGraph: { summary: { chunkNodes: number; edgeCount: number } };
      quality: { state: string; signals: string[] };
    };
    expect(preview.title).toBe('Provider notes');
    expect(preview.chunkCount).toBeGreaterThan(0);
    expect(indexedPreview.index.strategy).toBe('keyword-local');
    expect(indexedPreview.index.chunkIds.length).toBe(preview.chunkCount);
    expect(indexedPreview.index.totalTokens).toBeGreaterThan(0);
    expect(indexedPreview.index.tokenEstimate).toBe(indexedPreview.index.totalTokens);
    expect(indexedPreview.index.qualityScore).toBeGreaterThan(0);
    expect(indexedPreview.index.tags).toContain('retrieval');
    expect(indexedPreview.assetGraph.summary.chunkNodes).toBe(preview.chunkCount);
    expect(indexedPreview.assetGraph.summary.edgeCount).toBeGreaterThanOrEqual(preview.chunkCount);
    expect(indexedPreview.quality.signals).toContain('persistent-index');
    expect(JSON.stringify(preview)).not.toContain('sk-secret');
    expect(preview.redaction).toBe('secrets-redacted');
  });

  it('stores preview documents and returns scored mock retrieval matches', async () => {
    await saveKnowledgeDocumentPreview({
      title: 'Workflow guide',
      content: 'Workflow trace output shows every node input and output. Gateway trace IDs link requests to usage records.',
    });

    const result = await testKnowledgeRetrieval({ query: 'workflow trace gateway', topK: 2 });
    const match = result.matches[0] as typeof result.matches[number] & {
      tokenEstimate: number;
      tags: string[];
      keywords: string[];
      qualityState: string;
      qualityScore: number;
    };
    expect(result.mode).toBe('mock-local');
    expect(result.matches.length).toBeGreaterThan(0);
    expect(match.title).toBe('Workflow guide');
    expect(match.score).toBeGreaterThan(0);
    expect(match.tokenEstimate).toBeGreaterThan(0);
    expect(match.tags).toEqual(expect.arrayContaining(['gateway', 'quality']));
    expect(match.keywords.length).toBeGreaterThan(0);
    expect(match.qualityState).toMatch(/ready|needs-review/);
    expect(match.qualityScore).toBeGreaterThan(0);
  });

  it('summarizes knowledge documents, prompts, memories, and tags without leaking secrets', async () => {
    await saveKnowledgeDocumentPreview({
      title: 'Provider recovery',
      content: 'Gateway recovery notes mention API Key sk-secret-1234567890 and trace handoff.',
    });
    collections.set('prompts', [{ id: 'prompt-1', content: 'Use project context.', createdAt: '2026-05-12T00:00:00.000Z' }]);
    collections.set('memories', [
      { id: 'memory-1', title: 'Decision', content: 'Local only', tags: ['gateway', 'trace'], status: 'active', createdAt: '2026-05-12T00:00:00.000Z', updatedAt: '2026-05-12T00:00:00.000Z' },
      { id: 'memory-2', title: 'Archived', content: 'Old note', tags: ['gateway'], status: 'archived', createdAt: '2026-05-12T00:00:00.000Z', updatedAt: '2026-05-12T00:00:00.000Z' },
    ]);

    const summary = await summarizeKnowledgeAssets(new Date('2026-05-13T00:00:00.000Z'));
    const indexedSummary = summary as typeof summary & {
      indexStatus: {
        persisted: boolean;
        indexedDocumentCount: number;
        indexedChunkCount: number;
        qualityReadyCount: number;
        qualityNeedsReviewCount: number;
      };
      assetGraph: {
        documentNodes: number;
        chunkNodes: number;
        promptNodes: number;
        memoryNodes: number;
        tagNodes: number;
        edgeCount: number;
        topRelations: Array<{ label: string; count: number }>;
      };
      qualityState: { state: string; score: number; signals: string[] };
    };
    expect(summary).toMatchObject({
      documentCount: 1,
      promptCount: 1,
      memoryCount: 2,
      staleMemoryCount: 1,
      retrievalReady: true,
      redaction: 'secrets-redacted',
    });
    expect(indexedSummary.indexStatus).toMatchObject({
      persisted: true,
      indexedDocumentCount: 1,
      qualityNeedsReviewCount: 0,
    });
    expect(indexedSummary.indexStatus.indexedChunkCount).toBeGreaterThan(0);
    expect(indexedSummary.indexStatus.qualityReadyCount + indexedSummary.indexStatus.qualityNeedsReviewCount).toBe(1);
    expect(indexedSummary.indexedChunkCount).toBeGreaterThan(0);
    expect(indexedSummary.averageQualityScore).toBeGreaterThan(0);
    expect(indexedSummary.assetGraph).toMatchObject({
      documentNodes: 1,
      promptNodes: 1,
      memoryNodes: 2,
    });
    expect(indexedSummary.assetGraph.topRelations.map((relation) => relation.label)).toContain('document->chunk');
    expect(indexedSummary.qualityState.signals).toEqual(expect.arrayContaining(['persistent-index', 'retrieval-ready']));
    expect(summary.topTags[0]).toEqual({ tag: 'gateway', count: 2 });
    expect(JSON.stringify(summary)).not.toContain('sk-secret');
  });
});
