import React from 'react';

interface PageHeaderProps {
  section: string;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export default function PageHeader({ section, title, subtitle, actions }: PageHeaderProps) {
  return (
    <div className="command-panel mb-6 px-5 py-5 md:px-6 md:py-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex items-center gap-2">
          <span className="status-dot" />
          <span className="section-kicker">
            {section}
          </span>
          </div>
          <h1 className="page-title text-foreground">{title}</h1>
          {subtitle && (
            <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--foreground-muted)]">{subtitle}</p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}
