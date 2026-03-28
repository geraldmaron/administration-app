import type { ReactNode } from 'react';

interface ScreenHeaderProps {
  section: string;
  title: string;
  subtitle?: string;
  eyebrow?: string;
  actions?: ReactNode;
  nav?: ReactNode;
}

export default function ScreenHeader({
  section,
  title,
  subtitle,
  eyebrow,
  actions,
  nav,
}: ScreenHeaderProps) {
  return (
    <header className="mb-4">
      <div className="command-panel px-4 py-3 md:px-5">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0 flex-1">
            <div className="mb-1.5 flex items-center gap-3">
              <span className="h-2 w-2 rounded-full bg-[var(--accent-secondary)]" />
              <span className="section-kicker">{section}</span>
              {eyebrow ? <span className="section-kicker text-[var(--accent-primary)]">{eyebrow}</span> : null}
            </div>
            <h1 className="screen-title text-foreground">{title}</h1>
            {subtitle ? (
              <p className="mt-1.5 text-[13px] leading-5 text-[var(--foreground-muted)]">
                {subtitle}
              </p>
            ) : null}
          </div>
          {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
        </div>
        {nav ? <div className="mt-3 border-t border-[var(--border)] pt-3">{nav}</div> : null}
      </div>
    </header>
  );
}
