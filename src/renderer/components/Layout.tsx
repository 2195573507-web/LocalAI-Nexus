import React, { useState } from 'react';
import { classNames } from '../lib/utils';
import { useI18n } from '../lib/i18n';
import { useThemePreference } from '../lib/theme';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

export interface LayoutProps {
  /** Main content to render in the content area. */
  children: React.ReactNode;
  /** Optional actions rendered in the topbar. */
  topbarActions?: React.ReactNode;
  /** Optional page title override. */
  pageTitle?: string;
}

const Layout: React.FC<LayoutProps> = ({
  children,
  topbarActions,
  pageTitle,
}) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { theme, setTheme } = useThemePreference();
  const { language, setLanguage } = useI18n();

  return (
    <div
      className={classNames(
        'flex h-screen w-screen overflow-hidden',
        'bg-[var(--bg-primary)] text-[var(--text-primary)]',
      )}
    >
      {/* Sidebar */}
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)}
        language={language}
      />

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <Topbar
          title={pageTitle}
          actions={topbarActions}
          theme={theme}
          onThemeChange={setTheme}
          language={language}
          onLanguageChange={setLanguage}
        />

        {/* Scrollable content */}
        <main
          className={classNames(
            'flex-1 overflow-y-auto overflow-x-hidden',
            'p-4 lg:p-5',
          )}
        >
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
