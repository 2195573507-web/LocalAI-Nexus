import { app, BrowserWindow, shell } from 'electron';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { registerIpcHandlers } from './ipc.js';
import storage from './storage.js';
import type { AgentExecutionRecord, AgentRecord, Project, Run, SavedPrompt, Task, Memory } from '../shared/types.js';
import type { Workflow, WorkflowVersion } from '../shared/workflowTypes.js';
import { isHttpUrl, normalizeDevServerUrl } from './security.js';
import { bootstrapAuth } from './session.js';
import { startGateway } from './domain/gateway/gatewayService.js';
import { createDemoAgent, createDemoExecution } from '../shared/agentCore.js';
import { BEGINNER_WORKFLOW_TEMPLATES } from '../templates/workflowTemplates.js';
import { runWorkflow } from '../core/workflowRuntime.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const isDev =
  !app.isPackaged &&
  process.env.AGENTFLOW_LOAD_DIST !== '1' &&
  Boolean(process.env.VITE_DEV_SERVER_URL);
const devServerUrl = normalizeDevServerUrl(process.env.VITE_DEV_SERVER_URL ?? 'http://localhost:5173');
const startupSmoke = process.env.AGENTFLOW_STARTUP_SMOKE === '1';
const gatewayHttpSmoke = process.env.AGENTFLOW_GATEWAY_HTTP_SMOKE === '1';
const mainDir = path.dirname(fileURLToPath(import.meta.url));

if (process.env.AGENTFLOW_USER_DATA_DIR) {
  app.setPath('userData', path.resolve(process.env.AGENTFLOW_USER_DATA_DIR));
}

// ---------------------------------------------------------------------------
// Demo data seeding
// ---------------------------------------------------------------------------

async function seedDemoDataIfNeeded(): Promise<void> {
  const existingProjects = await storage.getAll('projects');
  if (existingProjects.some((project) => project.id === 'onboarding-demo-project')) return;

  const now = new Date().toISOString();
  const earlier = (days: number) => new Date(Date.now() - 86400000 * days).toISOString();

  // ── Demo projects ──────────────────────────────────────────────────

  const project1: Project = {
    id: 'onboarding-demo-project',
    name: '1 分钟上手示例：需求到运行结果',
    idea: '把“做一个项目管理小工具”的想法交给本地演示 Agent，生成计划、运行 Workflow，并留下可查看的结果记录。',
    platform: 'Desktop',
    techStack: 'LocalAI Nexus, Demo Agent, Beginner Workflow',
    uiStyle: '紧凑、清晰、适合桌面工作的 flat tool UI',
    difficulty: 'Medium',
    status: 'active',
    createdAt: now,
    updatedAt: now,
  };

  const project2: Project = {
    id: 'onboarding-provider-practice',
    name: 'Provider 切换台练习',
    idea: '学习如何添加 OpenAI 兼容或本地 Ollama Provider，检查健康状态，并把默认模型交给 Workflow 使用。',
    platform: 'Desktop',
    techStack: 'Provider Preset, Local Gateway, Health Monitor',
    uiStyle: '配置型控制台',
    difficulty: 'Easy',
    status: 'planning',
    createdAt: earlier(3),
    updatedAt: earlier(3),
  };

  await storage.create('projects', project1);
  await storage.create('projects', project2);

  // ── Demo tasks (4 per project) ──────────────────────────────────────

  const tasks: Task[] = [
    {
      id: 'onboarding-task-open-project',
      projectId: project1.id,
      role: '新手引导',
      title: '打开示例项目',
      description: '先从示例项目理解 LocalAI Nexus：项目负责目标，Agent 负责角色，Workflow 负责可重复运行。',
      input: '第一次打开软件',
      output: '看到示例项目、示例 Agent、示例 Workflow 和一次运行结果',
      acceptance: '用户能在首页或项目页找到下一步入口',
      priority: 'high',
      status: 'done',
      createdAt: earlier(2),
      updatedAt: earlier(1),
    },
    {
      id: 'onboarding-task-run-workflow',
      projectId: project1.id,
      role: 'Demo Agent',
      title: '运行第一个 Workflow',
      description: '使用“新手 Prompt 到输出”模板，本地模拟一次从输入到输出的完整流程。',
      input: '请把这个需求整理成一个可执行计划',
      output: 'Run、RunEvent、AgentExecution 记录',
      acceptance: 'Workflow 页面显示成功摘要和节点 Trace',
      priority: 'high',
      status: 'done',
      createdAt: earlier(1),
      updatedAt: now,
    },
    {
      id: 'onboarding-task-save-prompt',
      projectId: project1.id,
      role: 'Prompt',
      title: '保存第一个 Prompt',
      description: '从 Prompt Lab 生成一个可复制给 Codex 或 Claude Code 的交接 Prompt。',
      input: '项目目标和约束',
      output: '已保存 Prompt',
      acceptance: 'Prompt Lab 中能看到示例 Prompt，并能复制或保存新 Prompt',
      priority: 'medium',
      status: 'todo',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'onboarding-task-save-memory',
      projectId: project1.id,
      role: 'Memory',
      title: '保存恢复上下文',
      description: '把关键决定写入 Shared Memory，方便下一个模型接手时不用重新解释。',
      input: '示例运行结果',
      output: '一条项目上下文记忆',
      acceptance: 'Shared Memory 页面能看到可理解的示例记忆',
      priority: 'medium',
      status: 'todo',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'onboarding-task-add-provider',
      projectId: project2.id,
      role: 'Provider',
      title: '添加一个本地或云端 Provider',
      description: '可以选择 Ollama 本地模型，也可以添加 OpenAI 兼容 Base URL。',
      input: 'Provider Preset',
      output: 'Provider 配置和健康检查记录',
      acceptance: 'API Key 不写入 Prompt 或 Memory',
      priority: 'high',
      status: 'todo',
      createdAt: earlier(3),
      updatedAt: earlier(2),
    },
    {
      id: 'onboarding-task-start-gateway',
      projectId: project2.id,
      role: 'Gateway',
      title: '启动本地 Gateway',
      description: '让外部工具使用 http://127.0.0.1:8317/v1 访问本地路由。',
      input: 'Provider 配置',
      output: 'Gateway 状态和路由决策',
      acceptance: 'Gateway 页面显示 Base URL 和支持端点',
      priority: 'medium',
      status: 'todo',
      createdAt: now,
      updatedAt: now,
    },
  ];

  for (const task of tasks) {
    await storage.create('tasks', task);
  }

  // ── Demo memories ──────────────────────────────────────────────────

  const memories: Memory[] = [
    {
      id: 'onboarding-mem-project-goal',
      type: 'project_context',
      title: '示例项目目标',
      content: '这个示例展示 LocalAI Nexus 的基本路径：创建项目，创建 Agent，运行 Workflow，查看结果，再把关键上下文写入 Shared Memory。',
      tags: ['onboarding', 'demo', 'workflow'],
      projectId: project1.id,
      providerScope: '',
      modelScope: '',
      importance: 5,
      status: 'active',
      createdAt: earlier(7),
      updatedAt: earlier(7),
      lastUsedAt: now,
    },
    {
      id: 'onboarding-mem-no-key-first',
      type: 'decision',
      title: '首次运行不需要 API Key',
      content: '新用户可以先用本地 Demo Agent 和示例 Workflow 跑通一次结果，再去 Settings 或 Provider 中心配置真实模型。',
      tags: ['first-run', 'demo-agent', 'provider'],
      projectId: '',
      providerScope: '',
      modelScope: '',
      importance: 5,
      status: 'active',
      createdAt: earlier(5),
      updatedAt: earlier(5),
      lastUsedAt: earlier(1),
    },
    {
      id: 'onboarding-mem-trace-help',
      type: 'issue_fix',
      title: '如果 Workflow 失败，先看 Trace',
      content: 'Workflow 页面会显示每个节点的状态、失败原因和下一步建议。先修节点配置，再检查 Provider/API Key。',
      tags: ['workflow', 'trace', 'help'],
      projectId: project1.id,
      providerScope: '',
      modelScope: '',
      importance: 4,
      status: 'active',
      createdAt: earlier(3),
      updatedAt: earlier(3),
      lastUsedAt: earlier(2),
    },
    {
      id: 'onboarding-mem-handoff-prompt',
      type: 'prompt_pattern',
      title: '第一个交接 Prompt 模式',
      content: '把目标、现状、约束、必须验证的命令和完成标准写清楚，再交给 Codex、Claude Code 或 Cursor 执行。',
      tags: ['prompt', 'handoff', 'agent'],
      projectId: project1.id,
      providerScope: 'codex',
      modelScope: '',
      importance: 4,
      status: 'active',
      createdAt: earlier(4),
      updatedAt: earlier(4),
      lastUsedAt: now,
    },
    {
      id: 'onboarding-mem-product-overview',
      type: 'project_context',
      title: 'LocalAI Nexus project overview',
      content: 'LocalAI Nexus is a local AI gateway, runtime switcher, AgentOps hub, and project orchestration desktop app. It manages providers, gateway diagnostics, projects, tasks, prompts, skills, workflows, shared memory, audit logs, and local JSON data.',
      tags: ['localai-nexus', 'overview', 'architecture', 'electron'],
      projectId: '',
      providerScope: '',
      modelScope: '',
      importance: 5,
      status: 'active',
      createdAt: new Date(Date.now() - 86400000 * 10).toISOString(),
      updatedAt: new Date(Date.now() - 86400000 * 10).toISOString(),
      lastUsedAt: now,
    },
  ];

  for (const memory of memories) {
    await storage.create('memories', memory);
  }

  const prompts: SavedPrompt[] = [
    {
      id: 'onboarding-demo-prompt',
      projectId: project1.id,
      name: '新手交接 Prompt',
      templateId: 'beginner-handoff',
      variables: {},
      content: '目标：把一个想法整理成可执行计划。请先确认项目目标，再列出 3 个任务、验证方式和下一步建议。所有输出都用中文，避免调用外部工具。',
      starred: true,
      favorite: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'provider-check-prompt',
      projectId: project2.id,
      name: 'Provider 检查 Prompt',
      templateId: 'provider-check',
      variables: {},
      content: '请检查 Provider 配置：Base URL、模型名、API Key 是否已保存、健康检查结果和失败修复建议。不要输出任何密钥。',
      starred: false,
      createdAt: earlier(1),
      updatedAt: earlier(1),
    },
  ];

  for (const prompt of prompts) {
    await storage.create('prompts', prompt);
  }

  const template = BEGINNER_WORKFLOW_TEMPLATES[0];
  const workflow: Workflow = {
    id: 'onboarding-demo-workflow',
    projectId: project1.id,
    name: '新手示例 Workflow',
    description: '无需真实 API Key 的本地模拟流程：输入 -> Prompt -> LLM dry-run -> Output。',
    status: 'active',
    templateId: template.id,
    version: 1,
    nodes: template.nodes,
    edges: template.edges,
    createdAt: now,
    updatedAt: now,
  };
  await storage.create('workflows', workflow);
  await storage.create<WorkflowVersion>('workflowVersions', {
    id: 'onboarding-demo-workflow-v1',
    workflowId: workflow.id,
    version: 1,
    message: '内置新手示例版本',
    nodes: workflow.nodes,
    edges: workflow.edges,
    createdAt: now,
  });

  const workflowResult = runWorkflow(workflow, '请把“做一个项目管理小工具”整理成三步执行计划。');
  const run: Run = {
    id: 'onboarding-demo-run',
    projectId: project1.id,
    workflowTemplateId: workflow.templateId,
    versionId: '1',
    title: `Workflow: ${workflow.name}`,
    tool: 'LocalAI Nexus Workflow Runtime',
    status: workflowResult.status,
    log: workflowResult.nodeTrace.map((item) => `${item.nodeTitle} [${item.status}] ${item.outputSummary ?? item.failureReason ?? ''}`).join('\n'),
    summary: workflowResult.summary,
    startedAt: earlier(0),
    endedAt: now,
    durationMs: 32,
    retryCount: 0,
    nodeTrace: workflowResult.nodeTrace.map((item) => ({
      id: item.id,
      name: item.nodeTitle,
      status: item.status === 'failure' ? 'failed' : item.status === 'blocked' ? 'blocked' : 'success',
      durationMs: item.durationMs,
      inputSummary: item.inputSummary,
      outputSummary: item.outputSummary,
      failureReason: item.failureReason,
      retryCount: 0,
    })),
    metadata: { workflowId: workflow.id, demo: true },
    createdAt: now,
  };
  await storage.create('runs', run);
  for (const event of workflowResult.nodeTrace) {
    await storage.create('runEvents', {
      id: `onboarding-${event.nodeId}-${event.id}`,
      runId: run.id,
      projectId: project1.id,
      workflowId: workflow.id,
      type: 'agent.execution',
      status: event.status === 'failure' ? 'failure' : event.status === 'blocked' ? 'denied' : 'success',
      title: `${event.nodeTitle} (${event.nodeType})`,
      detail: event.failureReason ?? event.outputSummary ?? event.nextStep,
      metadata: event,
      createdAt: event.endedAt ?? now,
    });
  }

  const demoAgent: AgentRecord = {
    ...createDemoAgent(new Date(), 'onboarding-demo-agent'),
    projectId: project1.id,
    workflowId: workflow.id,
    lastRunAt: now,
  };
  await storage.create('agents', demoAgent);
  const demoExecution: AgentExecutionRecord = {
    ...createDemoExecution(demoAgent.id, new Date()),
    id: 'onboarding-demo-agent-execution',
    runId: run.id,
    workflowId: workflow.id,
    projectId: project1.id,
    outputSummary: workflowResult.summary,
  };
  await storage.create('agentExecutions', demoExecution);

  // ── Demo settings ──────────────────────────────────────────────────

  const defaultSettings: Array<{ id: string; value: unknown }> = [
    { id: 'theme', value: 'system' },
    { id: 'language', value: 'zh' },
    { id: 'defaultProjectPath', value: app.getPath('documents') },
    { id: 'defaultAITool', value: 'Claude Code' },
    { id: 'dataPath', value: path.join(app.getPath('userData'), 'agentflow-data') },
    { id: 'version', value: app.getVersion() },
  ];

  for (const setting of defaultSettings) {
    await storage.create('settings', setting);
  }
}

// ---------------------------------------------------------------------------
// Window creation
// ---------------------------------------------------------------------------

function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 680,
    show: !(startupSmoke || gatewayHttpSmoke),
    frame: true,
    titleBarStyle: 'default',
    title: 'LocalAI Nexus',
    icon: path.join(mainDir, '..', '..', 'assets', 'localai-nexus.ico'),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(mainDir, 'preload.js'),
    },
  });

  let smokeReported = false;
  const reportSmokeResult = (ok: boolean, details: string): void => {
    if (!startupSmoke || smokeReported) return;
    smokeReported = true;
    const prefix = ok ? 'AGENTFLOW_ELECTRON_READY' : 'AGENTFLOW_ELECTRON_STARTUP_FAIL';
    console.log(`${prefix} ${details} userData=${app.getPath('userData')}`);
    setTimeout(() => {
      if (ok) app.quit();
      else app.exit(1);
    }, 250);
  };

  if (startupSmoke) {
    win.webContents.once('did-finish-load', async () => {
      if (process.env.AGENTFLOW_REQUIRE_AUTH_BRIDGE === '1') {
        const hasAuthBridge = await win.webContents.executeJavaScript(
          "Boolean(window.agentflow && window.agentflow.auth && typeof window.agentflow.auth.login === 'function')",
          true,
        );
        if (!hasAuthBridge) {
          reportSmokeResult(false, `url=${win.webContents.getURL()} authBridge=false`);
          return;
        }
      }
      reportSmokeResult(true, `url=${win.webContents.getURL()} authBridge=true`);
    });
    win.webContents.once('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
      reportSmokeResult(false, `code=${errorCode} description="${errorDescription}" url=${validatedURL}`);
    });
    win.webContents.once('render-process-gone', (_event, details) => {
      reportSmokeResult(false, `render-process-gone=${details.reason}`);
    });
  }

  // Open external links in the system browser
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (!isHttpUrl(url)) {
      console.warn(`Blocked external URL with unsupported protocol: ${url}`);
      return { action: 'deny' };
    }
    shell.openExternal(url);
    return { action: 'deny' };
  });

  if (isDev) {
    win.loadURL(devServerUrl);
    if (!startupSmoke && !gatewayHttpSmoke && process.env.AGENTFLOW_SKIP_DEVTOOLS !== '1') {
      win.webContents.openDevTools({ mode: 'detach' });
    }
  } else {
    win.loadFile(path.join(mainDir, '..', '..', 'dist', 'index.html'));
  }

  return win;
}

// ---------------------------------------------------------------------------
// App lifecycle
// ---------------------------------------------------------------------------

app.setName('LocalAI Nexus');

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled promise rejection in main process:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught exception in main process:', error);
});

app.whenReady().then(async () => {
  // Initialise storage (creates data directory)
  await storage.init();

  // Register all IPC handlers before creating the window
  registerIpcHandlers();

  // Ensure local auth has a hashed default admin before the renderer loads.
  await bootstrapAuth();

  try {
    await startGateway();
  } catch (err) {
    console.error('Failed to start LocalAI Nexus gateway:', err);
  }

  // Seed demo data on first launch
  try {
    await seedDemoDataIfNeeded();
  } catch (err) {
    console.error('Failed to seed demo data:', err);
  }

  createWindow();

  app.on('activate', () => {
    // macOS: re-create window when dock icon is clicked and no windows open
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
}).catch((err) => {
  console.error('Failed to start LocalAI Nexus:', err);
  app.quit();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
