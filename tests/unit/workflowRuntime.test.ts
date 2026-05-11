import { describe, expect, it } from 'vitest';
import { runWorkflow, validateWorkflow } from '../../src/core/workflowRuntime';
import { BEGINNER_WORKFLOW_TEMPLATES } from '../../src/templates/workflowTemplates';
import type { Workflow } from '../../src/shared/workflowTypes';

function workflowFromTemplate(index = 0): Workflow {
  const template = BEGINNER_WORKFLOW_TEMPLATES[index];
  return {
    id: 'wf-1',
    projectId: 'project-1',
    name: template.name,
    description: template.description,
    status: 'draft',
    templateId: template.id,
    version: 1,
    nodes: template.nodes,
    edges: template.edges,
    createdAt: '2026-05-10T00:00:00.000Z',
    updatedAt: '2026-05-10T00:00:00.000Z',
  };
}

describe('workflow runtime', () => {
  it('validates required start and output nodes', () => {
    const workflow = workflowFromTemplate();
    expect(validateWorkflow(workflow)).toEqual([]);
    expect(validateWorkflow({ ...workflow, nodes: workflow.nodes.filter((node) => node.type !== 'output') })).toContain(
      'Workflow 必须包含 Output 节点。',
    );
  });

  it('runs the beginner workflow and returns node trace', () => {
    const result = runWorkflow(workflowFromTemplate(), 'hello');
    expect(result.status).toBe('success');
    expect(result.nodeTrace.map((item) => item.nodeType)).toEqual(['start', 'prompt', 'llm', 'output']);
    expect(result.summary).toContain('已完成');
  });

  it('returns actionable provider guidance for unconfigured LLM nodes', () => {
    const workflow = workflowFromTemplate();
    workflow.nodes = workflow.nodes.map((node) =>
      node.type === 'llm' ? { ...node, config: {} } : node,
    );
    const result = runWorkflow(workflow, 'hello');
    expect(result.status).toBe('failed');
    expect(result.error).toContain('Provider 或模型');
    expect(result.nextStep).toContain('Provider/API Key');
  });
});
