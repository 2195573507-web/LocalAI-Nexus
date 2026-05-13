import React from 'react';
import { Database, FilePlus2, GitBranch, Search, ShieldCheck } from 'lucide-react';
import { Badge, Button, Input, SurfaceCard, Textarea } from '../components';
import { api } from '../lib/api';
import type {
  NexusKnowledgeAssetSummary,
  NexusKnowledgeDocumentPreview,
  NexusKnowledgeRetrievalResult,
} from '../lib/types';

const SAMPLE_DOCUMENT = [
  'LocalAI Nexus knowledge assets stay local.',
  '',
  'The Knowledge layer builds a persistent index, links chunks to tags, and records quality state without calling an external provider.',
  '',
  'Use retrieval for prompt handoff, memory context, gateway traces, and redaction-safe project notes. API keys such as sk-demo-secret-123456 are redacted before storage.',
].join('\n');

type QualityState = 'empty' | 'needs-review' | 'ready';

type IndexedChunk = NexusKnowledgeDocumentPreview['chunks'][number] & {
  keywords?: string[];
  tags?: string[];
  quality?: { state: QualityState; score: number; signals: string[] };
};

type IndexedPreview = NexusKnowledgeDocumentPreview & {
  index?: {
    id: string;
    strategy: 'keyword-local';
    persisted: boolean;
    builtAt?: string;
    createdAt: string;
    tokenEstimate: number;
    totalTokens?: number;
    qualityScore: number;
    tags?: string[];
    keywords?: string[];
    qualityState?: QualityState;
  };
  assetGraph?: {
    summary: {
      chunkNodes: number;
      tagNodes: number;
      qualityNodes: number;
      edgeCount: number;
    };
  };
  quality?: { state: QualityState; score: number; signals: string[] };
};

type IndexedSummary = NexusKnowledgeAssetSummary & {
  indexStatus?: {
    persisted: boolean;
    indexedDocumentCount: number;
    indexedChunkCount: number;
    qualityReadyCount: number;
    qualityNeedsReviewCount: number;
  };
  assetGraph?: {
    documentNodes: number;
    chunkNodes: number;
    promptNodes: number;
    memoryNodes: number;
    tagNodes: number;
    edgeCount: number;
    topRelations: Array<{ label: string; count: number }>;
  };
  qualityState?: { state: QualityState; score: number; signals: string[] };
};

type RetrievalMatch = NexusKnowledgeRetrievalResult['matches'][number] & {
  tokenEstimate?: number;
  chunkTokenEstimate?: number;
  tags?: string[];
  keywords?: string[];
  qualityState?: QualityState;
  qualityScore?: number;
};

function hasError(value: unknown): value is { error: string } {
  return Boolean(value && typeof value === 'object' && 'error' in value);
}

function qualityVariant(state?: QualityState): 'success' | 'warning' | 'default' {
  if (state === 'ready') return 'success';
  if (state === 'needs-review') return 'warning';
  return 'default';
}

function formatScore(score?: number): string {
  if (typeof score !== 'number') return '0%';
  return `${Math.round(score * 100)}%`;
}

export default function KnowledgeBase() {
  const [summary, setSummary] = React.useState<IndexedSummary | null>(null);
  const [preview, setPreview] = React.useState<IndexedPreview | null>(null);
  const [retrieval, setRetrieval] = React.useState<NexusKnowledgeRetrievalResult | null>(null);
  const [title, setTitle] = React.useState('LocalAI Nexus handoff notes');
  const [content, setContent] = React.useState(SAMPLE_DOCUMENT);
  const [query, setQuery] = React.useState('persistent index memory gateway quality');
  const [message, setMessage] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  const loadSummary = React.useCallback(async () => {
    const result = await api.knowledge.assetsSummary();
    if (hasError(result)) {
      setMessage(result.error);
      return;
    }
    setSummary(result as IndexedSummary);
  }, []);

  React.useEffect(() => {
    void loadSummary();
  }, [loadSummary]);

  const previewDocument = async () => {
    setLoading(true);
    setMessage('');
    const result = await api.knowledge.previewDocument({ title, content });
    setLoading(false);
    if (hasError(result)) {
      setMessage(result.error);
      return;
    }
    const indexed = result as unknown as IndexedPreview;
    setPreview(indexed);
    setMessage(`Saved ${result.chunkCount} chunks with a persistent local index.`);
    await loadSummary();
  };

  const testRetrieval = async () => {
    setLoading(true);
    setMessage('');
    const result = await api.knowledge.testRetrieval({ query, topK: 5 });
    setLoading(false);
    if (hasError(result)) {
      setMessage(result.error);
      return;
    }
    setRetrieval(result);
    setMessage(`Retrieval finished: ${result.matches.length} matches in ${result.latencyMs}ms.`);
  };

  const matches = (retrieval?.matches ?? []) as RetrievalMatch[];

  return (
    <div className="mx-auto max-w-7xl space-y-5 p-6">
      <section className="surface-card p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">Knowledge Base</h1>
            <p className="mt-2 max-w-3xl text-sm text-[var(--text-secondary)]">
              Build local document chunks, persistent index metadata, asset graph evidence, and quality state for
              Knowledge / Prompt / Memory reuse without calling an external provider.
            </p>
          </div>
          <Button variant="secondary" onClick={loadSummary} icon={<Database className="h-4 w-4" />}>
            Refresh Assets
          </Button>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-4">
        <SurfaceCard className="p-5">
          <div className="text-sm font-semibold text-[var(--text-secondary)]">Documents</div>
          <div className="mt-2 text-2xl font-bold">{summary?.documentCount ?? 0}</div>
          <p className="mt-1 text-xs text-[var(--text-muted)]">{summary?.chunkCount ?? 0} chunks indexed</p>
        </SurfaceCard>
        <SurfaceCard className="p-5">
          <div className="text-sm font-semibold text-[var(--text-secondary)]">Persistent Index</div>
          <div className="mt-2 text-2xl font-bold">{summary?.indexStatus?.indexedChunkCount ?? 0}</div>
          <Badge variant={summary?.indexStatus?.persisted ? 'success' : 'warning'} dot>
            {summary?.indexStatus?.persisted ? 'persisted' : 'needs document'}
          </Badge>
        </SurfaceCard>
        <SurfaceCard className="p-5">
          <div className="text-sm font-semibold text-[var(--text-secondary)]">Asset Graph</div>
          <div className="mt-2 text-2xl font-bold">{summary?.assetGraph?.edgeCount ?? 0}</div>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            {(summary?.assetGraph?.promptNodes ?? 0) + (summary?.assetGraph?.memoryNodes ?? 0)} prompt/memory nodes
          </p>
        </SurfaceCard>
        <SurfaceCard className="p-5">
          <div className="text-sm font-semibold text-[var(--text-secondary)]">Quality State</div>
          <div className="mt-2 text-2xl font-bold">{formatScore(summary?.qualityState?.score)}</div>
          <Badge variant={qualityVariant(summary?.qualityState?.state)} dot>
            {summary?.qualityState?.state ?? 'empty'}
          </Badge>
        </SurfaceCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <SurfaceCard className="space-y-4 p-5">
          <div>
            <h2 className="text-base font-semibold">Document Indexing</h2>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Save a redacted local document and persist chunk, token, tag, keyword, graph, and quality metadata.
            </p>
          </div>
          <Input label="Title" value={title} onChange={(event) => setTitle(event.target.value)} />
          <Textarea
            label="Content"
            value={content}
            onChange={(event) => setContent(event.target.value)}
            className="min-h-[190px]"
            showCharCount
            maxChars={6000}
          />
          <div className="flex flex-wrap gap-2">
            <Button loading={loading} onClick={previewDocument} icon={<FilePlus2 className="h-4 w-4" />}>
              Save Indexed Document
            </Button>
            <Button variant="secondary" loading={loading} onClick={testRetrieval} icon={<Search className="h-4 w-4" />}>
              Test Retrieval
            </Button>
          </div>
          {message && <div className="rounded-tool border border-[var(--border)] bg-[var(--surface-muted)] p-3 text-sm">{message}</div>}
        </SurfaceCard>

        <SurfaceCard className="space-y-4 p-5">
          <div className="flex items-center gap-2">
            <GitBranch className="h-4 w-4 text-[var(--text-secondary)]" />
            <h2 className="text-base font-semibold">Index And Graph Evidence</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-tool border border-[var(--border)] bg-[var(--surface-muted)] p-3">
              <div className="text-xs font-semibold uppercase text-[var(--text-muted)]">Last document index</div>
              <div className="mt-2 text-sm font-semibold">{preview?.index?.persisted ? 'Persisted locally' : 'No saved index yet'}</div>
              <p className="mt-1 text-xs text-[var(--text-muted)]">
                {preview?.index ? `${preview.index.totalTokens ?? preview.index.tokenEstimate} token estimate, ${preview.index.keywords?.length ?? 0} keywords` : 'Save a document to build index metadata.'}
              </p>
            </div>
            <div className="rounded-tool border border-[var(--border)] bg-[var(--surface-muted)] p-3">
              <div className="text-xs font-semibold uppercase text-[var(--text-muted)]">Asset graph summary</div>
              <div className="mt-2 text-sm font-semibold">{summary?.assetGraph?.edgeCount ?? 0} graph edges</div>
              <p className="mt-1 text-xs text-[var(--text-muted)]">
                {summary?.assetGraph
                  ? `${summary.assetGraph.documentNodes} docs, ${summary.assetGraph.chunkNodes} chunks, ${summary.assetGraph.tagNodes} tags`
                  : 'No graph data yet.'}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {(preview?.index?.tags ?? summary?.topTags.map((item) => item.tag) ?? []).slice(0, 8).map((tag) => (
              <Badge key={tag} variant="info">
                {tag}
              </Badge>
            ))}
            {summary?.qualityState?.signals.map((signal) => (
              <Badge key={signal} variant="default">
                {signal}
              </Badge>
            ))}
          </div>
          {(summary?.assetGraph?.topRelations ?? []).map((relation) => (
            <div key={relation.label} className="flex items-center justify-between rounded-tool border border-[var(--border)] px-3 py-2 text-sm">
              <span>{relation.label}</span>
              <span className="font-semibold">{relation.count}</span>
            </div>
          ))}
        </SurfaceCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <SurfaceCard className="space-y-4 p-5">
          <div>
            <h2 className="text-base font-semibold">Retrieval Test</h2>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Results include chunk id, token estimate, tags, keywords, and quality hints from the local index.
            </p>
          </div>
          <Input label="Query" value={query} onChange={(event) => setQuery(event.target.value)} />
          <Button variant="secondary" loading={loading} onClick={testRetrieval} icon={<Search className="h-4 w-4" />}>
            Run Local Retrieval
          </Button>
        </SurfaceCard>

        <SurfaceCard className="space-y-3 p-5">
          {matches.map((match) => (
            <div key={match.chunkId} className="rounded-tool border border-[var(--border)] bg-[var(--surface-muted)] p-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold">{match.title}</span>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="info">{Math.round(match.score * 100)}% match</Badge>
                  <Badge variant={qualityVariant(match.qualityState)}>{match.qualityState ?? 'quality'}</Badge>
                </div>
              </div>
              <p className="mt-2 line-clamp-3 text-xs text-[var(--text-secondary)]">{match.text}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge variant="default">{match.chunkTokenEstimate ?? match.tokenEstimate ?? 0} tokens</Badge>
                {(match.tags ?? []).slice(0, 5).map((tag) => (
                  <Badge key={`${match.chunkId}-${tag}`} variant="info">
                    {tag}
                  </Badge>
                ))}
                {(match.keywords ?? []).slice(0, 4).map((keyword) => (
                  <Badge key={`${match.chunkId}-${keyword}`} variant="default">
                    {keyword}
                  </Badge>
                ))}
                <Badge variant={qualityVariant(match.qualityState)}>quality {formatScore(match.qualityScore)}</Badge>
              </div>
            </div>
          ))}
          {matches.length === 0 && (
            <div className="rounded-tool border border-dashed border-[var(--border)] p-4 text-sm text-[var(--text-muted)]">
              Save a document and run retrieval to see indexed chunk evidence here.
            </div>
          )}
        </SurfaceCard>
      </div>

      <SurfaceCard className="p-5">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <ShieldCheck className="h-4 w-4" />
          Recent Documents
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {(summary?.latestDocuments ?? []).map((document) => (
            <div key={document.id} className="rounded-tool border border-[var(--border)] bg-[var(--surface-muted)] p-3 text-sm">
              <div className="font-semibold">{document.title}</div>
              <p className="mt-1 text-xs text-[var(--text-muted)]">
                {document.chunkCount} chunks | {new Date(document.createdAt).toLocaleString()}
              </p>
            </div>
          ))}
          {(summary?.latestDocuments.length ?? 0) === 0 && (
            <div className="rounded-tool border border-dashed border-[var(--border)] p-4 text-sm text-[var(--text-muted)]">
              No knowledge documents yet. Save one document to create local asset evidence.
            </div>
          )}
        </div>
      </SurfaceCard>
    </div>
  );
}
