import React from 'react';

interface PageHeaderProps {
  section: string;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export default function PageHeader({ section, title, subtitle, actions }: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-4 mb-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="status-dot" />
          <span className="text-[10px] font-mono uppercase tracking-widest text-foreground-subtle">
            {section}
          </span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">{title}</h1>
        {subtitle && (
          <p className="text-sm text-foreground-muted mt-1">{subtitle}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2 mt-1">{actions}</div>}
    </div>
  );
}
