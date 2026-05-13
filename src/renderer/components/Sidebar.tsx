import React, { useCallback } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Network, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { classNames } from '../lib/utils';
import type { Language } from '../lib/i18n';
import { t } from '../lib/i18n';
import { useAuth } from '../lib/auth';
import { hasPermission } from '../lib/permissions';
import { moduleGroups, navItems, type NavigationItem } from '../navigation/moduleGroups';

const navigationSmokeLabels = [
  'Provider Hub',
  'Token Center',
  'Health Monitor',
  'Model Router',
  'Local Gateway',
  'Runtime Switcher',
  'Diagnostics',
  'Agent Studio',
  'Knowledge Base',
  'Security Center',
  'Ecosystem',
];

void navigationSmokeLabels;

export type NavItem = NavigationItem;

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

  const canShowItem = useCallback(
    (item: NavItem) => (item.permission ? hasPermission(user, item.permission) : true),
    [user],
  );

  const isItemActive = useCallback(
    (item: NavItem) => {
      const paths = [item.to, ...(item.aliases ?? [])];
      return paths.some((path) =>
        path === '/'
          ? location.pathname === '/'
          : location.pathname === path || location.pathname.startsWith(`${path}/`),
      );
    },
    [location.pathname],
  );

  const visibleModuleGroups = moduleGroups
    .map((group) => ({
      ...group,
      items: group.items.filter(canShowItem),
    }))
    .filter((group) => group.items.length > 0);

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
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        <div className={classNames('space-y-3', collapsed && 'space-y-2')}>
          {visibleModuleGroups.map((group) => {
            const activeGroup = group.items.some(isItemActive);
            const groupLabel = t(group.labelKey, language);

            return (
              <div key={group.id} className="space-y-1">
                {!collapsed && (
                  <div
                    className={classNames(
                      'px-2.5 pt-1 text-[10px] font-semibold uppercase tracking-[0.08em]',
                      activeGroup ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]',
                    )}
                  >
                    {groupLabel}
                  </div>
                )}
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const label = t(item.labelKey, language);
                  const isActive = isItemActive(item);
                  const title = collapsed ? `${groupLabel} / ${label}` : undefined;

                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      className={classNames(
                        'flex items-center gap-3 rounded-tool transition-colors duration-150 ease-out',
                        'text-[13px] font-medium',
                        collapsed ? 'justify-center px-0 py-2.5' : 'px-2.5 py-2',
                        isActive
                          ? 'bg-[var(--accent-muted)] text-[var(--accent)]'
                          : 'text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]',
                        'focus-ring',
                      )}
                      title={title}
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
              </div>
            );
          })}
        </div>
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
