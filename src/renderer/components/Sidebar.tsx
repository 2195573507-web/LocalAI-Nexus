import React, { useState, useCallback } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  FolderKanban,
  Wand2,
  FileSearch,
  GitBranch,
  Shield,
  Brain,
  Puzzle,
  Settings,
  Workflow,
  Users,
  ScrollText,
  Network,
  KeyRound,
  Coins,
  Stethoscope,
  Route,
  Server,
  TerminalSquare,
  Bot,
  PackageCheck,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { classNames } from '../lib/utils';
import type { Language } from '../lib/i18n';
import { t } from '../lib/i18n';
import { useAuth } from '../lib/auth';
import { hasPermission } from '../lib/permissions';

export interface NavItem {
  to: string;
  icon: React.FC<{ className?: string }>;
  label: string;
  labelKey: string;
}

const navItems: NavItem[] = [
  { to: '/', icon: LayoutDashboard, label: 'Nexus Home', labelKey: 'nav.dashboard' },
  { to: '/providers', icon: KeyRound, label: 'Provider Hub', labelKey: 'nav.providers' },
  { to: '/tokens', icon: Coins, label: 'Token Center', labelKey: 'nav.tokens' },
  { to: '/health', icon: Stethoscope, label: 'Health Monitor', labelKey: 'nav.health' },
  { to: '/router', icon: Route, label: 'Model Router', labelKey: 'nav.router' },
  { to: '/gateway', icon: Server, label: 'Local Gateway', labelKey: 'nav.gateway' },
  { to: '/runtime', icon: TerminalSquare, label: 'Runtime Switcher', labelKey: 'nav.runtime' },
  { to: '/diagnostics', icon: FileSearch, label: 'Diagnostics', labelKey: 'nav.diagnostics' },
  { to: '/projects', icon: FolderKanban, label: 'Project Hub', labelKey: 'nav.projects' },
  { to: '/agents', icon: Bot, label: 'Agent Studio', labelKey: 'nav.agents' },
  { to: '/workflows', icon: Workflow, label: 'Agent Flows', labelKey: 'nav.workflows' },
  { to: '/prompts', icon: Wand2, label: 'Prompt Lab', labelKey: 'nav.promptLab' },
  { to: '/logs', icon: FileSearch, label: 'Log Analyzer', labelKey: 'nav.logAnalyzer' },
  { to: '/git', icon: GitBranch, label: 'Git Timeline', labelKey: 'nav.gitTimeline' },
  { to: '/security', icon: Shield, label: 'Security Center', labelKey: 'nav.security' },
  { to: '/safety', icon: Shield, label: 'Safety Guard', labelKey: 'nav.safetyBox' },
  { to: '/memory', icon: Brain, label: 'Shared Memory', labelKey: 'nav.sharedMemory' },
  { to: '/skills', icon: Puzzle, label: 'Skills', labelKey: 'nav.skills' },
  { to: '/ecosystem', icon: PackageCheck, label: 'Ecosystem', labelKey: 'nav.ecosystem' },
  { to: '/admin/users', icon: Users, label: 'Admin Users', labelKey: 'nav.adminUsers' },
  { to: '/admin/audit', icon: ScrollText, label: 'Audit Logs', labelKey: 'nav.adminAudit' },
  { to: '/settings', icon: Settings, label: 'Settings', labelKey: 'nav.settings' },
];

export interface SidebarProps {
  /** Whether the sidebar is collapsed (icons-only mode). */
  collapsed: boolean;
  /** Called to toggle collapsed state. */
  onToggleCollapse: () => void;
  language?: Language;
}

const Sidebar: React.FC<SidebarProps> = ({ collapsed, onToggleCollapse, language = 'zh' }) => {
  const location = useLocation();
  const { user } = useAuth();
  const visibleNavItems = navItems.filter((item) => {
    if (item.to.startsWith('/admin/users')) return hasPermission(user, 'admin:users');
    if (item.to.startsWith('/admin/audit')) return hasPermission(user, 'admin:audit');
    return true;
  });

  return (
    <aside
      className={classNames(
        'relative flex flex-col h-full',
        'surface-chrome border-r',
        'transition-[width] duration-150 ease-out',
        collapsed ? 'w-[64px]' : 'w-[240px]',
        'shrink-0',
      )}
    >
      {/* App logo / brand */}
      <div
        className={classNames(
          'flex items-center h-14 px-3 border-b border-[var(--border)]',
          collapsed ? 'justify-center' : 'justify-between',
        )}
      >
        {!collapsed && (
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-tool bg-[var(--accent-muted)] flex items-center justify-center">
              <Network className="w-4 h-4 text-[var(--accent)]" />
            </div>
            <span className="text-sm font-bold text-[var(--text-primary)] tracking-tight">
              LocalAI Nexus
            </span>
          </div>
        )}
        {collapsed && (
          <div className="w-7 h-7 rounded-tool bg-[var(--accent-muted)] flex items-center justify-center">
            <Network className="w-4 h-4 text-[var(--accent)]" />
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-1">
        {visibleNavItems.map((item) => {
          const Icon = item.icon;
          const label = t(item.labelKey, language);
          const isActive =
            item.to === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(item.to);

          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={classNames(
                'flex items-center gap-3 rounded-tool transition-colors duration-150 ease-out',
                'text-[13px] font-medium',
                collapsed ? 'justify-center px-0 py-2.5' : 'px-2.5 py-2',
                // Active state
                isActive
                  ? 'bg-[var(--accent-muted)] text-[var(--accent)]'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]',
                'focus-ring',
              )}
              title={collapsed ? label : undefined}
            >
              <Icon
                className={classNames(
                  'w-[18px] h-[18px] shrink-0',
                )}
              />
              {!collapsed && <span className="truncate">{label}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* Collapse toggle */}
      <div className="p-2 border-t border-[var(--border)]">
        <button
          onClick={onToggleCollapse}
          className={classNames(
            'w-full flex items-center gap-3 rounded-tool transition-colors duration-150',
            'text-[var(--text-muted)] hover:text-[var(--text-primary)]',
            'hover:bg-[var(--surface-muted)]',
            'focus-ring',
            collapsed ? 'justify-center py-2.5' : 'px-2.5 py-2',
          )}
          title={collapsed ? t('nav.expand', language) : t('nav.collapse', language)}
        >
          {collapsed ? (
            <PanelLeftOpen className="w-4 h-4" />
          ) : (
            <>
              <PanelLeftClose className="w-4 h-4 shrink-0" />
              <span className="text-sm font-medium truncate">{t('nav.collapse', language)}</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;

// Re-export navItems for use elsewhere
export { navItems };
