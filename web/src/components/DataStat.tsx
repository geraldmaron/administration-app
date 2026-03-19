import type { ReactNode } from 'react';

interface DataStatProps {
  label: string;
  value: ReactNode;
  detail?: ReactNode;
  accent?: 'blue' | 'gold' | 'success' | 'warning' | 'error';
}

const accentClass: Record<NonNullable<DataStatProps['accent']>, string> = {
  blue: 'text-[var(--accent-primary)]',
  gold: 'text-[var(--accent-secondary)]',
  success: 'text-[var(--success)]',
  warning: 'text-[var(--warning)]',
  error: 'text-[var(--error)]',
};

export default function DataStat({ label, value, detail, accent }: DataStatProps) {
  return (
    <div className="control-surface px-4 py-4">
      <div className="section-kicker mb-3">{label}</div>
      <div className={`data-value text-[22px] leading-none ${accent ? accentClass[accent] : 'text-foreground'}`}>{value}</div>
      {detail ? <div className="mt-2 text-xs leading-5 text-[var(--foreground-muted)]">{detail}</div> : null}
    </div>
  );
}