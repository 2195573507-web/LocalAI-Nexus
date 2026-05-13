export type WorkflowNodeType =
  | 'start'
  | 'prompt'
  | 'llm'
  | 'tool'
  | 'condition'
  | 'human_approval'
  | 'output';

export type WorkflowStatus = 'draft' | 'active' | 'archived';
export type WorkflowRunStatus = 'queued' | 'running' | 'success' | 'failed' | 'blocked';
export type WorkflowRunEventStatus = 'info' | 'running' | 'success' | 'failure' | 'blocked';

export interface WorkflowNode {
  id: string;
  type: WorkflowNodeType;
  title: string;
  description?: string;
  config: {
    prompt?: string;
    model?: string;
    providerRef?: string;
    toolName?: string;
    conditionExpression?: string;
    approvalQuestion?: string;
    outputKey?: string;
    sampleOutput?: string;
  };
  position: { x: number; y: number };
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  condition?: 'true' | 'false' | 'approved' | 'rejected';
}

export interface Workflow {
  id: string;
  projectId: string;
  ownerUserId?: string;
  name: string;
  description: string;
  status: WorkflowStatus;
  templateId?: string;
  version: number;
  publishedVersion?: number;
  publishedAt?: string;
  publishedByUserId?: string;
  lastRollbackVersion?: number;
  lastRollbackAt?: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowVersion {
  id: string;
  workflowId: string;
  version: number;
  message: string;
  status?: 'draft' | 'published' | 'rollback';
  publishedAt?: string;
  publishedByUserId?: string;
  restoredFromVersion?: number;
  restoredAt?: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  createdByUserId?: string;
  createdAt: string;
}

export interface WorkflowPublishResult {
  workflow: Workflow;
  version: WorkflowVersion;
  message: string;
}

export interface WorkflowRollbackResult {
  workflow: Workflow;
  version: WorkflowVersion;
  restoredFrom: WorkflowVersion;
  message: string;
}

export interface AgentWorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: 'beginner' | 'provider' | 'approval' | 'tooling' | 'diagnostic';
  beginnerRecommended: boolean;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

export interface WorkflowRunInput {
  workflowId: string;
  projectId?: string;
  input?: string;
}

export interface WorkflowRunResult {
  status: WorkflowRunStatus;
  summary: string;
  output: string;
  error?: string;
  nextStep?: string;
  nodeTrace: WorkflowNodeTrace[];
}

export interface WorkflowNodeTrace {
  id: string;
  nodeId: string;
  nodeTitle: string;
  nodeType: WorkflowNodeType;
  status: WorkflowRunEventStatus;
  startedAt: string;
  endedAt?: string;
  durationMs?: number;
  inputSummary?: string;
  outputSummary?: string;
  failureReason?: string;
  nextStep?: string;
}

export interface DiagnosticReport {
  id: string;
  generatedAt: string;
  appVersion: string;
  gitBranch: string;
  gitCommit: string;
  startupCommand: string;
  dataPath: string;
  nodeVersion: string;
  npmVersion?: string;
  buildStatus: 'pass' | 'fail' | 'unknown';
  testStatus: 'pass' | 'fail' | 'unknown';
  commonFixes: string[];
}
