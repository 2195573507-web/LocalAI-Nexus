import { describe, expect, it } from 'vitest';

function appendPromptVersion(prompt: {
  content: string;
  variables?: Record<string, string>;
  versions?: Array<{ id: string; version: number; content: string; variables?: Record<string, string>; message?: string; createdAt: string }>;
}, message: string) {
  const versions = Array.isArray(prompt.versions) ? prompt.versions : [];
  const nextVersion = versions.reduce((max, version) => Math.max(max, Number(version.version) || 0), 0) + 1;
  return {
    ...prompt,
    versions: [
      ...versions,
      {
        id: `prompt-version-${nextVersion}`,
        version: nextVersion,
        content: prompt.content,
        variables: prompt.variables,
        message,
        createdAt: new Date('2026-05-12T00:00:00.000Z').toISOString(),
      },
    ],
  };
}

describe('prompt version contract', () => {
  it('keeps prompt versions append-only for compare and rollback evidence', () => {
    const created = appendPromptVersion({
      content: 'Initial handoff prompt',
      variables: { project_name: 'LocalAI Nexus' },
    }, 'Created prompt');
    const updated = appendPromptVersion({
      ...created,
      content: 'Updated handoff prompt',
    }, 'Updated prompt');

    expect(updated.versions).toHaveLength(2);
    expect(updated.versions.map((version) => version.version)).toEqual([1, 2]);
    expect(updated.versions[0].content).toBe('Initial handoff prompt');
    expect(updated.versions[1].content).toBe('Updated handoff prompt');
  });
});
