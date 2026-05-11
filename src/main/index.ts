import { app, BrowserWindow, shell } from 'electron';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { registerIpcHandlers } from './ipc.js';
import storage from './storage.js';
import type { Project, Task, Memory } from '../shared/types.js';
import { isHttpUrl, normalizeDevServerUrl } from './security.js';
import { bootstrapAuth } from './session.js';
import { startGateway } from './domain/gateway/gatewayService.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const isDev =
  !app.isPackaged &&
  process.env.AGENTFLOW_LOAD_DIST !== '1' &&
  Boolean(process.env.VITE_DEV_SERVER_URL);
const devServerUrl = normalizeDevServerUrl(process.env.VITE_DEV_SERVER_URL ?? 'http://localhost:5173');
const startupSmoke = process.env.AGENTFLOW_STARTUP_SMOKE === '1';
const mainDir = path.dirname(fileURLToPath(import.meta.url));

if (process.env.AGENTFLOW_USER_DATA_DIR) {
  app.setPath('userData', path.resolve(process.env.AGENTFLOW_USER_DATA_DIR));
}

// ---------------------------------------------------------------------------
// Demo data seeding
// ---------------------------------------------------------------------------

async function seedDemoDataIfNeeded(): Promise<void> {
  const existingProjects = await storage.getAll('projects');
  if (existingProjects.length > 0) return; // Already seeded

  const now = new Date().toISOString();

  // ── Demo projects ──────────────────────────────────────────────────

  const project1: Project = {
    id: 'demo-proj-1',
    name: 'AI Chat Desktop App',
    idea: 'A cross-platform desktop chat application powered by local LLMs, featuring conversation history, prompt templates, and plugin support.',
    platform: 'Desktop',
    techStack: 'Electron, React, TypeScript, TailwindCSS, Ollama',
    uiStyle: 'Clean desktop-tool UI with compact panels, clear status badges, and a restrained dark mode.',
    difficulty: 'Medium',
    status: 'active',
    createdAt: now,
    updatedAt: now,
  };

  const project2: Project = {
    id: 'demo-proj-2',
    name: 'Personal Blog Engine',
    idea: 'A static-site blog engine with markdown editing, live preview, tag-based navigation, and RSS feed generation.',
    platform: 'Web',
    techStack: 'Next.js, MDX, TailwindCSS, Vercel',
    uiStyle: 'Minimalist typography-first design with soft shadows and generous whitespace.',
    difficulty: 'Easy',
    status: 'planning',
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
  };

  await storage.create('projects', project1);
  await storage.create('projects', project2);

  // ── Demo tasks (4 per project) ──────────────────────────────────────

  const tasks: Task[] = [
    {
      id: 'demo-task-1',
      projectId: project1.id,
      role: 'Architect',
      title: 'Design UI component tree',
      description: 'Create a full component hierarchy for the chat application covering sidebar, chat area, message list, input bar, and settings panel.',
      input: 'Project requirements from PRD',
      output: 'Complete component tree diagram with prop interfaces',
      acceptance: 'All UI sections are covered, each component has defined props and state',
      priority: 'high',
      status: 'done',
      createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      updatedAt: new Date(Date.now() - 86400000).toISOString(),
    },
    {
      id: 'demo-task-2',
      projectId: project1.id,
      role: 'Frontend Dev',
      title: 'Implement chat message component',
      description: 'Build the main chat message bubble component with support for markdown rendering, code syntax highlighting, and user/assistant roles.',
      input: 'Component tree design from architect, UI style guide',
      output: 'ChatBubble.tsx, ChatMessageList.tsx with full functionality',
      acceptance: 'Messages render with correct styles, markdown is parsed, code blocks have syntax highlight',
      priority: 'high',
      status: 'doing',
      createdAt: new Date(Date.now() - 86400000).toISOString(),
      updatedAt: now,
    },
    {
      id: 'demo-task-3',
      projectId: project1.id,
      role: 'Backend Dev',
      title: 'Set up IPC for LLM inference',
      description: 'Create IPC channels for communicating with local LLM providers (Ollama, LM Studio). Handle streaming responses and error states.',
      input: 'IPC architecture document, provider API specs',
      output: 'ipc-llm.ts with invoke/handle pattern for inference',
      acceptance: 'Can send prompts and receive streaming responses, errors handled gracefully',
      priority: 'critical',
      status: 'todo',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'demo-task-4',
      projectId: project1.id,
      role: 'Tester',
      title: 'Write E2E tests for chat flow',
      description: 'Create Playwright end-to-end tests covering the complete chat flow: send message, receive response, save conversation, load history.',
      input: 'Test plan document, user flow diagrams',
      output: 'chat-flow.spec.ts with 10+ test cases',
      acceptance: 'All critical user flows are tested, tests pass in CI',
      priority: 'medium',
      status: 'blocked',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'demo-task-5',
      projectId: project2.id,
      role: 'Architect',
      title: 'Design content schema',
      description: 'Define the MDX frontmatter schema for blog posts, including title, date, tags, excerpt, cover image, and custom components.',
      input: 'Blog feature requirements',
      output: 'TypeScript type definitions and MDX frontmatter specification',
      acceptance: 'All required metadata fields are defined, optional fields documented',
      priority: 'high',
      status: 'done',
      createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
      updatedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    },
    {
      id: 'demo-task-6',
      projectId: project2.id,
      role: 'Frontend Dev',
      title: 'Build blog post layout',
      description: 'Create the responsive blog post layout with reading progress bar, table of contents sidebar, and estimated reading time.',
      input: 'Content schema, design mockups',
      output: 'PostLayout.tsx, TableOfContents.tsx, ReadingProgress.tsx',
      acceptance: 'Layout matches mockups, responsive across devices, TOC links work',
      priority: 'high',
      status: 'doing',
      createdAt: new Date(Date.now() - 86400000).toISOString(),
      updatedAt: now,
    },
    {
      id: 'demo-task-7',
      projectId: project2.id,
      role: 'Backend Dev',
      title: 'Implement RSS feed generation',
      description: 'Generate RSS 2.0 and Atom feeds at build time from all published posts. Include full content and proper metadata.',
      input: 'RSS specification documents, content schema',
      output: 'rss-feed.ts utility and build-time generation script',
      acceptance: 'Feeds validate against W3C Feed Validator, all published posts included',
      priority: 'medium',
      status: 'todo',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'demo-task-8',
      projectId: project2.id,
      role: 'DevOps',
      title: 'Set up Vercel deployment',
      description: 'Configure Vercel project with environment variables, custom domain, and automatic preview deployments for PRs.',
      input: 'Vercel configuration guide, domain credentials',
      output: 'vercel.json, deployment documentation',
      acceptance: 'Main branch auto-deploys to production, PRs get preview URLs',
      priority: 'low',
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
      id: 'demo-mem-1',
      type: 'user_preference',
      title: 'Preferred AI workflow is auditable local-first delivery',
      content: 'The developer prefers agent-driven work that starts with a short plan, uses the smallest safe commands needed, records tests and risks, and keeps all project context local.',
      tags: ['ai-tool', 'preference', 'safety'],
      projectId: '',
      providerScope: 'claude',
      modelScope: '',
      importance: 9,
      status: 'active',
      createdAt: new Date(Date.now() - 86400000 * 7).toISOString(),
      updatedAt: new Date(Date.now() - 86400000 * 7).toISOString(),
      lastUsedAt: now,
    },
    {
      id: 'demo-mem-2',
      type: 'decision',
      title: 'Use TailwindCSS for all styling',
      content: 'Decided to use TailwindCSS with custom design tokens for all project styling. No CSS-in-JS libraries. Configuration in tailwind.config.ts with custom theme extensions for brand colors and fonts.',
      tags: ['tailwind', 'styling', 'architecture'],
      projectId: '',
      providerScope: '',
      modelScope: '',
      importance: 8,
      status: 'active',
      createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
      updatedAt: new Date(Date.now() - 86400000 * 5).toISOString(),
      lastUsedAt: new Date(Date.now() - 86400000).toISOString(),
    },
    {
      id: 'demo-mem-3',
      type: 'issue_fix',
      title: 'Electron CSP: allow inline styles for Tailwind',
      content: 'TailwindCSS requires inline styles in dev mode. Added Content-Security-Policy header that allows "style-src \'self\' \'unsafe-inline\'" in the Electron renderer. Also needed to allow ws:// for HMR in Vite dev server.',
      tags: ['electron', 'csp', 'tailwind', 'security'],
      projectId: project1.id,
      providerScope: '',
      modelScope: '',
      importance: 7,
      status: 'active',
      createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
      updatedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
      lastUsedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    },
    {
      id: 'demo-mem-4',
      type: 'prompt_pattern',
      title: 'Component creation prompt template',
      content: 'When asking the AI to create a new React component, use: "Create a React functional component named [Name] in TypeScript. It should accept props: [list props]. Use TailwindCSS for styling. Include JSDoc comments. Export as default. Handle loading, empty, error, and edge case states."',
      tags: ['prompt', 'react', 'component', 'template'],
      projectId: '',
      providerScope: 'claude',
      modelScope: '',
      importance: 6,
      status: 'active',
      createdAt: new Date(Date.now() - 86400000 * 4).toISOString(),
      updatedAt: new Date(Date.now() - 86400000 * 4).toISOString(),
      lastUsedAt: now,
    },
    {
      id: 'demo-mem-5',
      type: 'project_context',
      title: 'LocalAI Nexus project overview',
      content: 'LocalAI Nexus is a local AI gateway, runtime switcher, AgentOps hub, and project orchestration desktop app. It manages providers, gateway diagnostics, projects, tasks, prompts, skills, workflows, shared memory, audit logs, and local JSON data.',
      tags: ['localai-nexus', 'overview', 'architecture', 'electron'],
      projectId: '',
      providerScope: '',
      modelScope: '',
      importance: 10,
      status: 'active',
      createdAt: new Date(Date.now() - 86400000 * 10).toISOString(),
      updatedAt: new Date(Date.now() - 86400000 * 10).toISOString(),
      lastUsedAt: now,
    },
  ];

  for (const memory of memories) {
    await storage.create('memories', memory);
  }

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
    show: !startupSmoke,
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
    if (!startupSmoke && process.env.AGENTFLOW_SKIP_DEVTOOLS !== '1') {
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
