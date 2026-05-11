import React from 'react';
import { Languages, Monitor, Moon, Network, Sun } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { classNames } from '../lib/utils';
import type { ThemeMode } from '../lib/types';
import type { Language } from '../lib/i18n';
import { t } from '../lib/i18n';
import { navItems } from './Sidebar';
import { useAuth } from '../lib/auth';
import Button from './Button';

export interface TopbarProps {
  /** Optional title override. If not provided, derived from current route. */
  title?: string;
  /** Optional actions rendered on the right side. */
  actions?: React.ReactNode;
  /** Current theme mode. */
  theme?: ThemeMode;
  /** Called when the theme is toggled. */
  onThemeChange?: (theme: ThemeMode) => void;
  language?: Language;
  onLanguageChange?: (language: Language) => void;
  /** Additional className. */
  className?: string;
}

const Topbar: React.FC<TopbarProps> = ({
  title: titleOverride,
  actions,
  theme = 'system',
  onThemeChange,
  language = 'zh',
  onLanguageChange,
  className,
}) => {
  const location = useLocation();
  const { user, logout } = useAuth();
  const themeLabels: Record<ThemeMode, string> = {
    system: t('theme.system', language),
    light: t('theme.light', language),
    dark: t('theme.dark', language),
  };

  const routeTitle = (() => {
    const path = location.pathname;
    if (path === '/') return t('nav.dashboard', language);
    const item = navItems.find((nav) => nav.to !== '/' && path.startsWith(nav.to));
    return item ? t(item.labelKey, language) : path.slice(1);
  })();

  const displayTitle = titleOverride || routeTitle;

  const handleThemeToggle = () => {
    if (!onThemeChange) return;
    const cycle: ThemeMode[] = ['system', 'light', 'dark'];
    const currentIndex = cycle.indexOf(theme);
    onThemeChange(cycle[(currentIndex + 1) % cycle.length]);
  };

  const ThemeIcon = theme === 'dark' ? Moon : theme === 'light' ? Sun : Monitor;
  const nextLanguage: Language = language === 'zh' ? 'en' : 'zh';

  return (
    <header
      className={classNames(
        'flex items-center justify-between h-14 px-5',
        'surface-chrome border-b',
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        <Network className="hidden h-4 w-4 shrink-0 text-[var(--accent)] sm:block" />
        <h1 className="truncate text-base font-semibold tracking-tight text-[var(--text-primary)]">
          {displayTitle}
        </h1>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {actions}

        {user && (
          <div className="hidden items-center gap-2 rounded-tool border border-[var(--border)] bg-[var(--surface-muted)] px-2.5 py-1.5 text-xs text-[var(--text-secondary)] sm:flex">
            <span className="max-w-[140px] truncate font-semibold">{user.profile.displayName || user.email}</span>
            <span className="rounded-tool bg-[var(--accent-muted)] px-1.5 py-0.5 text-[var(--accent)]">{user.role}</span>
          </div>
        )}

        {onLanguageChange && (
          <button
            type="button"
            onClick={() => onLanguageChange(nextLanguage)}
            className={classNames(
              'inline-flex items-center gap-1.5 rounded-tool px-2.5 py-2 text-xs font-semibold transition-colors duration-150',
              'text-[var(--text-secondary)]',
              'hover:bg-[var(--surface-muted)]',
              'hover:text-[var(--text-primary)]',
              'focus-ring',
            )}
            title={language === 'zh' ? t('topbar.switchToEnglish', language) : t('topbar.switchToChinese', language)}
          >
            <Languages className="h-4 w-4" />
            <span>{t('topbar.language', language)}</span>
          </button>
        )}

        {onThemeChange && (
          <button
            type="button"
            onClick={handleThemeToggle}
            className={classNames(
              'rounded-tool p-2 transition-colors duration-150',
              'text-[var(--text-muted)]',
              'hover:bg-[var(--surface-muted)]',
              'hover:text-[var(--text-primary)]',
              'focus-ring',
            )}
            title={t('topbar.themeTitle', language, { theme: themeLabels[theme] })}
          >
            <ThemeIcon className="h-4 w-4" />
          </button>
        )}

        {user && (
          <Button variant="ghost" size="sm" onClick={() => void logout()}>
            {t('topbar.signOut', language)}
          </Button>
        )}
      </div>
    </header>
  );
};

export default Topbar;
