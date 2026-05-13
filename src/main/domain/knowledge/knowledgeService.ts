import { randomUUID } from 'crypto';
import type {
  Memory,
  NexusKnowledgeAssetSummary,
  NexusKnowledgeDocumentPreview,
  NexusKnowledgeRetrievalResult,
  SavedPrompt,
} from '../../../shared/types.js';
import { containsSecret, redactSecrets } from '../../../shared/secretRedaction.js';
import storage from '../../storage.js';

type KnowledgeQualityState = 'empty' | 'needs-review' | 'ready';

interface IndexedKnowledgeChunk {
  id: string;
  text: string;
  tokenEstimate: number;
  charStart: number;
  charEnd: number;
  keywords: string[];
  tags: string[];
  quality: {
    state: KnowledgeQualityState;
    score: number;
    signals: string[];
  };
}

interface KnowledgeDocumentIndex {
  schemaVersion: 1;
  id: string;
  strategy: 'keyword-local';
  indexId: string;
  source: 'local-document';
  persisted: true;
  builtAt: string;
  chunkIds: string[];
  tokenEstimate: number;
  totalTokens: number;
  qualityScore: number;
  keywords: string[];
  tags: string[];
  qualityState: KnowledgeQualityState;
  createdAt: string;
}

interface KnowledgeAssetGraph {
  nodes: Array<{ id: string; type: 'document' | 'chunk' | 'tag' | 'quality'; label: string }>;
  edges: Array<{ from: string; to: string; relation: 'contains' | 'tagged' | 'rated' }>;
  summary: {
    documentNodes: number;
    chunkNodes: number;
    tagNodes: number;
    qualityNodes: number;
    edgeCount: number;
  };
}

interface IndexedKnowledgeDocument extends Omit<NexusKnowledgeDocumentPreview, 'chunks' | 'index'> {
  chunks: IndexedKnowledgeChunk[];
  schemaVersion: 1;
  index: KnowledgeDocumentIndex;
  assetGraph: KnowledgeAssetGraph;
  quality: {
    state: KnowledgeQualityState;
    score: number;
    signals: string[];
  };
}

type IndexedKnowledgeAssetSummary = NexusKnowledgeAssetSummary;

const STOP_WORDS = new Set([
  'about',
  'after',
  'and',
  'are',
  'before',
  'for',
  'from',
  'local',
  'notes',
  'that',
  'the',
  'this',
  'use',
  'with',
  'you',
]);

function chunkText(text: string, maxChars = 700): string[] {
  const normalized = text.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  if (!normalized) return [];
  const paragraphs = normalized.split(/\n\s*\n/);
  const chunks: string[] = [];
  let current = '';
  for (const paragraph of paragraphs) {
    if (`${current}\n\n${paragraph}`.trim().length > maxChars && current) {
      chunks.push(current.trim());
      current = paragraph;
    } else {
      current = `${current}\n\n${paragraph}`.trim();
    }
  }
  if (current) chunks.push(current.trim());
  return chunks.flatMap((chunk) => {
    if (chunk.length <= maxChars) return [chunk];
    const parts: string[] = [];
    for (let index = 0; index < chunk.length; index += maxChars) {
      parts.push(chunk.slice(index, index + maxChars));
    }
    return parts;
  });
}

function extractKeywords(text: string, limit = 8): string[] {
  const counts = new Map<string, number>();
  for (const match of text.toLowerCase().matchAll(/[a-z][a-z0-9-]{2,}|[\u4e00-\u9fa5]{2,}/g)) {
    const term = match[0].trim();
    if (!term || STOP_WORDS.has(term) || containsSecret(term)) continue;
    counts.set(term, (counts.get(term) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([term]) => term);
}

function deriveTags(title: string, text: string): string[] {
  const joined = `${title}\n${text}`.toLowerCase();
  const tags = new Set<string>();
  const tagRules: Array<[string, RegExp]> = [
    ['gateway', /\bgateway\b|\bapi\b|\bendpoint\b/],
    ['prompt', /\bprompt\b|\btemplate\b|\binstruction\b/],
    ['memory', /\bmemory\b|\bcontext\b|\bhandoff\b/],
    ['retrieval', /\bretrieval\b|\brag\b|\bchunk\b|\bindex\b/],
    ['security', /\bsecret\b|\bredact\b|\bkey\b|\btoken\b/],
    ['quality', /\bquality\b|\bscore\b|\beval\b|\btrace\b/],
  ];
  for (const [tag, pattern] of tagRules) {
    if (pattern.test(joined)) tags.add(tag);
  }
  for (const keyword of extractKeywords(joined, 4)) {
    tags.add(keyword);
  }
  return [...tags].slice(0, 8);
}

function evaluateChunkQuality(chunk: string): IndexedKnowledgeChunk['quality'] {
  const signals: string[] = [];
  let score = 0.35;
  if (chunk.length >= 80) {
    score += 0.25;
    signals.push('substantive-text');
  }
  if (extractKeywords(chunk, 4).length >= 3) {
    score += 0.2;
    signals.push('keyword-rich');
  }
  if (/[.!?。！？]\s*$/.test(chunk)) {
    score += 0.1;
    signals.push('complete-sentence');
  }
  if (!containsSecret(chunk)) {
    score += 0.1;
    signals.push('redaction-safe');
  }
  const normalized = Number(Math.min(1, score).toFixed(2));
  return {
    state: normalized >= 0.72 ? 'ready' : normalized > 0 ? 'needs-review' : 'empty',
    score: normalized,
    signals,
  };
}

function evaluateDocumentQuality(chunks: IndexedKnowledgeChunk[]): IndexedKnowledgeDocument['quality'] {
  if (chunks.length === 0) {
    return { state: 'empty', score: 0, signals: ['no-indexable-content'] };
  }
  const score = Number((chunks.reduce((total, chunk) => total + chunk.quality.score, 0) / chunks.length).toFixed(2));
  const signals = new Set<string>(['persistent-index']);
  if (chunks.length > 1) signals.add('multi-chunk');
  if (chunks.some((chunk) => chunk.tags.length > 0)) signals.add('tagged');
  if (chunks.every((chunk) => chunk.quality.signals.includes('redaction-safe'))) signals.add('redaction-safe');
  return {
    state: score >= 0.72 ? 'ready' : 'needs-review',
    score,
    signals: [...signals],
  };
}

function buildAssetGraph(document: {
  id: string;
  title: string;
  chunks: IndexedKnowledgeChunk[];
  tags: string[];
  qualityState: KnowledgeQualityState;
}): KnowledgeAssetGraph {
  const nodes: KnowledgeAssetGraph['nodes'] = [{ id: document.id, type: 'document', label: document.title }];
  const edges: KnowledgeAssetGraph['edges'] = [];
  for (const chunk of document.chunks) {
    nodes.push({ id: `${document.id}:${chunk.id}`, type: 'chunk', label: chunk.id });
    edges.push({ from: document.id, to: `${document.id}:${chunk.id}`, relation: 'contains' });
  }
  for (const tag of document.tags) {
    const tagId = `tag:${tag}`;
    nodes.push({ id: tagId, type: 'tag', label: tag });
    edges.push({ from: document.id, to: tagId, relation: 'tagged' });
  }
  const qualityId = `quality:${document.qualityState}`;
  nodes.push({ id: qualityId, type: 'quality', label: document.qualityState });
  edges.push({ from: document.id, to: qualityId, relation: 'rated' });
  return {
    nodes,
    edges,
    summary: {
      documentNodes: 1,
      chunkNodes: document.chunks.length,
      tagNodes: document.tags.length,
      qualityNodes: 1,
      edgeCount: edges.length,
    },
  };
}

function scoreChunk(query: string, text: string): number {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return 0;
  const lower = text.toLowerCase();
  const hits = terms.filter((term) => lower.includes(term)).length;
  return Number((hits / terms.length).toFixed(3));
}

export function previewKnowledgeDocument(input: {
  title?: string;
  content: string;
}, now = new Date()): NexusKnowledgeDocumentPreview {
  const safeContent = redactSecrets(String(input.content ?? ''));
  const title = String(input.title || 'Local document preview').trim().slice(0, 120);
  let cursor = 0;
  const chunks: IndexedKnowledgeChunk[] = chunkText(safeContent).map((text, index) => {
    const charStart = safeContent.indexOf(text, cursor);
    const safeStart = charStart >= 0 ? charStart : cursor;
    cursor = safeStart + text.length;
    const keywords = extractKeywords(text, 8);
    const tags = deriveTags(title, text);
    return {
      id: `chunk-${index + 1}`,
      text,
      tokenEstimate: Math.ceil(text.length / 4),
      charStart: safeStart,
      charEnd: safeStart + text.length,
      keywords,
      tags,
      quality: evaluateChunkQuality(text),
    };
  });
  const documentQuality = evaluateDocumentQuality(chunks);
  const documentTags = [...new Set(chunks.flatMap((chunk) => chunk.tags))].slice(0, 12);
  const documentKeywords = [...new Set(chunks.flatMap((chunk) => chunk.keywords))].slice(0, 16);
  const documentId = randomUUID();
  const preview: IndexedKnowledgeDocument = {
    id: documentId,
    title,
    chunkCount: chunks.length,
    chunks,
    redaction: containsSecret(input.content) ? 'secrets-redacted' : 'secrets-redacted',
    createdAt: now.toISOString(),
    schemaVersion: 1,
    index: {
      schemaVersion: 1,
      id: randomUUID(),
      strategy: 'keyword-local',
      indexId: randomUUID(),
      source: 'local-document',
      persisted: true,
      builtAt: now.toISOString(),
      chunkIds: chunks.map((chunk) => chunk.id),
      tokenEstimate: chunks.reduce((total, chunk) => total + chunk.tokenEstimate, 0),
      totalTokens: chunks.reduce((total, chunk) => total + chunk.tokenEstimate, 0),
      qualityScore: documentQuality.score,
      keywords: documentKeywords,
      tags: documentTags,
      qualityState: documentQuality.state,
      createdAt: now.toISOString(),
    },
    assetGraph: buildAssetGraph({
      id: documentId,
      title,
      chunks,
      tags: documentTags,
      qualityState: documentQuality.state,
    }),
    quality: documentQuality,
  };
  return preview;
}

export async function saveKnowledgeDocumentPreview(input: {
  title?: string;
  content: string;
}): Promise<NexusKnowledgeDocumentPreview> {
  const preview = previewKnowledgeDocument(input);
  await storage.create<NexusKnowledgeDocumentPreview>('knowledgeDocuments', preview).catch(() => undefined);
  return preview;
}

export async function testKnowledgeRetrieval(input: {
  query: string;
  content?: string;
  topK?: number;
}): Promise<NexusKnowledgeRetrievalResult> {
  const started = Date.now();
  const topK = Math.min(Math.max(Number(input.topK) || 3, 1), 10);
  let documents = await storage.getAll<NexusKnowledgeDocumentPreview>('knowledgeDocuments').catch(() => []);
  if (input.content) {
    documents = [previewKnowledgeDocument({ title: 'Ad hoc retrieval input', content: input.content })];
  }
  const matches = documents
    .flatMap((document) =>
      document.chunks.map((chunk) => {
        const indexedChunk = chunk as IndexedKnowledgeChunk;
        const indexedDocument = document as unknown as IndexedKnowledgeDocument;
        return {
          chunkId: `${document.id}:${chunk.id}`,
          title: document.title,
          text: chunk.text,
          score: scoreChunk(input.query, chunk.text),
          tokenEstimate: chunk.tokenEstimate,
          chunkTokenEstimate: chunk.tokenEstimate,
          tags: indexedChunk.tags ?? indexedDocument.index?.tags ?? [],
          keywords: indexedChunk.keywords ?? chunk.keywords ?? [],
          qualityState: indexedChunk.quality?.state ?? indexedDocument.quality?.state ?? 'needs-review',
          qualityScore: indexedChunk.quality?.score ?? chunk.qualityScore ?? indexedDocument.index?.qualityScore ?? 0,
        };
      }),
    )
    .filter((match) => match.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
  return {
    query: String(input.query ?? ''),
    topK,
    matches,
    latencyMs: Math.max(1, Date.now() - started),
    mode: 'mock-local',
    redaction: 'secrets-redacted',
  };
}

export async function summarizeKnowledgeAssets(now = new Date()): Promise<NexusKnowledgeAssetSummary> {
  const [documents, prompts, memories] = await Promise.all([
    storage.getAll<NexusKnowledgeDocumentPreview>('knowledgeDocuments').catch(() => []),
    storage.getAll<SavedPrompt>('prompts').catch(() => []),
    storage.getAll<Memory>('memories').catch(() => []),
  ]);
  const tagCounts = new Map<string, number>();
  for (const memory of memories) {
    for (const tag of memory.tags ?? []) {
      const normalized = String(tag).trim();
      if (!normalized) continue;
      tagCounts.set(normalized, (tagCounts.get(normalized) ?? 0) + 1);
    }
  }
  const chunkCount = documents.reduce((total, document) => total + document.chunkCount, 0);
  const tokenEstimate = documents.reduce(
    (total, document) => total + document.chunks.reduce((sum, chunk) => sum + chunk.tokenEstimate, 0),
    0,
  );
  const indexedDocuments = documents.map((document) => document as unknown as IndexedKnowledgeDocument);
  const indexedDocumentCount = indexedDocuments.filter((document) => document.index?.persisted).length;
  const qualityReadyCount = indexedDocuments.filter((document) => document.quality?.state === 'ready').length;
  const qualityNeedsReviewCount = indexedDocuments.filter((document) => document.quality?.state === 'needs-review').length;
  const graphEdgeCount = indexedDocuments.reduce((total, document) => total + (document.assetGraph?.summary.edgeCount ?? document.chunkCount), 0);
  const qualityScore =
    indexedDocuments.length === 0
      ? 0
      : Number(
          (
            indexedDocuments.reduce((total, document) => total + (document.quality?.score ?? 0), 0) /
            indexedDocuments.length
          ).toFixed(2),
        );
  const summary: IndexedKnowledgeAssetSummary = {
    id: randomUUID(),
    generatedAt: now.toISOString(),
    documentCount: documents.length,
    chunkCount,
    tokenEstimate,
    promptCount: prompts.length,
    memoryCount: memories.length,
    staleMemoryCount: memories.filter((memory) => memory.status !== 'active').length,
    topTags: [...tagCounts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 8)
      .map(([tag, count]) => ({ tag, count })),
    latestDocuments: [...documents]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 5)
      .map((document) => ({
        id: document.id,
        title: document.title,
        chunkCount: document.chunkCount,
        createdAt: document.createdAt,
      })),
    retrievalReady: chunkCount > 0,
    redaction: 'secrets-redacted',
    indexedChunkCount: indexedDocuments.reduce((total, document) => total + (document.index?.chunkIds.length ?? document.chunkCount), 0),
    averageQualityScore: qualityScore,
    indexStatus: {
      persisted: indexedDocumentCount === documents.length && documents.length > 0,
      indexedDocumentCount,
      indexedChunkCount: indexedDocuments.reduce((total, document) => total + (document.index?.chunkIds.length ?? document.chunkCount), 0),
      qualityReadyCount,
      qualityNeedsReviewCount,
    },
    assetGraph: {
      documentNodes: documents.length,
      chunkNodes: chunkCount,
      promptNodes: prompts.length,
      memoryNodes: memories.length,
      tagNodes: tagCounts.size,
      edgeCount: graphEdgeCount + prompts.length + memories.length + tagCounts.size,
      topRelations: [
        { label: 'document->chunk', count: chunkCount },
        { label: 'memory->tag', count: [...tagCounts.values()].reduce((total, count) => total + count, 0) },
        { label: 'prompt->asset', count: prompts.length },
      ].filter((relation) => relation.count > 0),
    },
    qualityState: {
      state: documents.length === 0 ? 'empty' : qualityReadyCount === documents.length ? 'ready' : 'needs-review',
      score: qualityScore,
      signals: [
        indexedDocumentCount > 0 ? 'persistent-index' : 'no-persistent-index',
        chunkCount > 0 ? 'retrieval-ready' : 'no-chunks',
        tagCounts.size > 0 ? 'memory-tags-linked' : 'no-memory-tags',
        prompts.length > 0 ? 'prompts-linked' : 'no-prompts',
      ],
    },
  };
  return summary;
}
