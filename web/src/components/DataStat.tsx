import type { ReactNode } from 'react';

interface DataStatProps {
  label: string;
  value: ReactNode;
  detail?: ReactNode;
  accent?: 'blue' | 'gold' | 'success' | 'warning' | 'error';
  size?: 'default' | 'compact' | 'inline';
}

const accentClass: Record<NonNullable<DataStatProps['accent']>, string> = {
  blue: 'text-[var(--accent-primary)]',
  gold: 'text-[var(--accent-secondary)]',
  success: 'text-[var(--success)]',
  warning: 'text-[var(--warning)]',
  error: 'text-[var(--error)]',
};

export default function DataStat({ label, value, detail, accent, size = 'default' }: DataStatProps) {
  if (size === 'inline') {
    return (
      <div>
        <div className="section-kicker-sm mb-0.5">{label}</div>
        <div className={`data-value text-sm leading-none ${accent ? accentClass[accent] : 'text-foreground'}`}>{value}</div>
        {detail ? <div className="mt-0.5 text-[11px] text-[var(--foreground-muted)]">{detail}</div> : null}
      </div>
    );
  }

  if (size === 'compact') {
    return (
      <div className="control-surface px-3 py-2">
        <div className="mb-1 text-[11px] font-medium text-[var(--foreground-subtle)]">{label}</div>
        <div className={`data-value text-[15px] leading-none ${accent ? accentClass[accent] : 'text-foreground'}`}>{value}</div>
      </div>
    );
  }

  return (
    <div className="control-surface px-4 py-3.5">
      <div className="section-kicker mb-2">{label}</div>
      <div className={`data-value text-[20px] leading-none ${accent ? accentClass[accent] : 'text-foreground'}`}>{value}</div>
      {detail ? <div className="mt-1.5 text-xs leading-5 text-[var(--foreground-muted)]">{detail}</div> : null}
    </div>
  );
}
