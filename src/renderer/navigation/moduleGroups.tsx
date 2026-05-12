import type React from 'react';
import {
  Bot,
  Brain,
  Coins,
  FileSearch,
  FolderKanban,
  GitBranch,
  KeyRound,
  LayoutDashboard,
  PackageCheck,
  Puzzle,
  Route,
  ScrollText,
  Server,
  Settings,
  Shield,
  Stethoscope,
  TerminalSquare,
  Users,
  Wand2,
  Workflow,
} from 'lucide-react';
import type { Permission } from '../lib/permissions';

export interface NavigationItem {
  to: string;
  icon: React.FC<{ className?: string }>;
  label: string;
  labelKey: string;
  aliases?: string[];
  permission?: Permission;
}

export interface NavigationModuleGroup {
  id:
    | 'workspace'
    | 'models'
    | 'gateway'
    | 'agents-workflow'
    | 'memory-assets'
    | 'security-admin'
    | 'operations-ecosystem';
  label: string;
  items: NavigationItem[];
}

export const moduleGroups: NavigationModuleGroup[] = [
  {
    id: 'workspace',
    label: 'Workspace',
    items: [
      { to: '/', icon: LayoutDashboard, label: 'Nexus Home', labelKey: 'nav.dashboard' },
      { to: '/projects', icon: FolderKanban, label: 'Project Hub', labelKey: 'nav.projects' },
      { to: '/settings', icon: Settings, label: 'Settings', labelKey: 'nav.settings' },
    ],
  },
  {
    id: 'models',
    label: 'Models',
    items: [
      { to: '/providers', icon: KeyRound, label: 'Provider Hub', labelKey: 'nav.providers' },
      { to: '/router', icon: Route, label: 'Model Router', labelKey: 'nav.router' },
      { to: '/runtime', icon: TerminalSquare, label: 'Runtime Switcher', labelKey: 'nav.runtime' },
      { to: '/health', icon: Stethoscope, label: 'Health Monitor', labelKey: 'nav.health' },
    ],
  },
  {
    id: 'gateway',
    label: 'Gateway',
    items: [
      { to: '/gateway', icon: Server, label: 'Local Gateway', labelKey: 'nav.gateway' },
      { to: '/tokens', icon: Coins, label: 'Token Center', labelKey: 'nav.tokens' },
      { to: '/diagnostics', icon: FileSearch, label: 'Diagnostics', labelKey: 'nav.diagnostics' },
    ],
  },
  {
    id: 'agents-workflow',
    label: 'Agents',
    items: [
      { to: '/agents', icon: Bot, label: 'Agent Studio', labelKey: 'nav.agents' },
      { to: '/workflows', icon: Workflow, label: 'Agent Flows', labelKey: 'nav.workflows' },
      { to: '/skills', icon: Puzzle, label: 'Skills', labelKey: 'nav.skills' },
      {
        to: '/prompts',
        icon: Wand2,
        label: 'Prompt Lab',
        labelKey: 'nav.promptLab',
        aliases: ['/prompt-lab'],
      },
    ],
  },
  {
    id: 'memory-assets',
    label: 'Memory',
    items: [
      {
        to: '/memory',
        icon: Brain,
        label: 'Shared Memory',
        labelKey: 'nav.sharedMemory',
        aliases: ['/shared-memory-hub'],
      },
    ],
  },
  {
    id: 'security-admin',
    label: 'Security',
    items: [
      { to: '/security', icon: Shield, label: 'Security Center', labelKey: 'nav.security' },
      {
        to: '/safety',
        icon: Shield,
        label: 'Safety Guard',
        labelKey: 'nav.safetyBox',
        aliases: ['/safety-box'],
      },
      {
        to: '/admin/users',
        icon: Users,
        label: 'Admin Users',
        labelKey: 'nav.adminUsers',
        permission: 'admin:users',
      },
      {
        to: '/admin/audit',
        icon: ScrollText,
        label: 'Audit Logs',
        labelKey: 'nav.adminAudit',
        permission: 'admin:audit',
      },
    ],
  },
  {
    id: 'operations-ecosystem',
    label: 'Operations',
    items: [
      { to: '/ecosystem', icon: PackageCheck, label: 'Ecosystem', labelKey: 'nav.ecosystem' },
      {
        to: '/git',
        icon: GitBranch,
        label: 'Git Timeline',
        labelKey: 'nav.gitTimeline',
        aliases: ['/git-timeline'],
      },
      {
        to: '/logs',
        icon: FileSearch,
        label: 'Log Analyzer',
        labelKey: 'nav.logAnalyzer',
        aliases: ['/log-analyzer'],
      },
    ],
  },
];

export const navItems: NavigationItem[] = moduleGroups.flatMap((group) => group.items);
