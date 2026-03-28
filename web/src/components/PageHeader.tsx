import React from 'react';

interface PageHeaderProps {
  section: string;
  title: string;
  subtitle?: string;
  showSubtitle?: boolean;
  actions?: React.ReactNode;
  filterBar?: React.ReactNode;
}

export default function PageHeader({ section, title, subtitle, showSubtitle = false, actions, filterBar }: PageHeaderProps) {
  return (
    <div className="command-panel mb-4 px-4 py-3 md:px-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex items-center gap-2">
            <span className="status-dot" />
            <span className="section-kicker">{section}</span>
          </div>
          <h1 className="page-title text-foreground">{title}</h1>
          {showSubtitle && subtitle && (
            <p className="mt-1.5 max-w-3xl text-[13px] leading-5 text-[var(--foreground-muted)]">{subtitle}</p>
          )}
        </div>
        {actions && <div className="flex flex-shrink-0 items-center gap-2">{actions}</div>}
      </div>
      {filterBar && (
        <div className="mt-3 border-t border-[var(--border)] pt-3">
          {filterBar}
        </div>
      )}
    </div>
  );
}
