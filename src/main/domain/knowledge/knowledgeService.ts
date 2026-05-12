import { randomUUID } from 'crypto';
import type {
  NexusKnowledgeDocumentPreview,
  NexusKnowledgeRetrievalResult,
} from '../../../shared/types.js';
import { containsSecret, redactSecrets } from '../../../shared/secretRedaction.js';
import storage from '../../storage.js';

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
  const chunks = chunkText(safeContent).map((text, index) => ({
    id: `chunk-${index + 1}`,
    text,
    tokenEstimate: Math.ceil(text.length / 4),
  }));
  return {
    id: randomUUID(),
    title: String(input.title || 'Local document preview').trim().slice(0, 120),
    chunkCount: chunks.length,
    chunks,
    redaction: containsSecret(input.content) ? 'secrets-redacted' : 'secrets-redacted',
    createdAt: now.toISOString(),
  };
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
      document.chunks.map((chunk) => ({
        chunkId: `${document.id}:${chunk.id}`,
        title: document.title,
        text: chunk.text,
        score: scoreChunk(input.query, chunk.text),
      })),
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
