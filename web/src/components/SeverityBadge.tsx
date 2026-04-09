interface SeverityBadgeProps {
  severity: string | null;
}

const SEVERITY_CLASSES: Record<string, string> = {
  low: 'text-[var(--info)]',
  medium: 'text-[var(--warning)]',
  high: 'text-[var(--error)]',
  critical: 'text-[var(--error)] font-bold',
};

const DOT_CLASSES: Record<string, string> = {
  low: 'bg-[var(--info)]',
  medium: 'bg-[var(--warning)]',
  high: 'bg-[var(--error)]',
  critical: 'bg-[var(--error)]',
};

export default function SeverityBadge({ severity }: SeverityBadgeProps) {
  if (!severity) return <span className="text-xs text-[var(--foreground-subtle)]">—</span>;
  const cls = SEVERITY_CLASSES[severity] ?? 'text-[var(--foreground-subtle)]';
  const dot = DOT_CLASSES[severity] ?? 'bg-[var(--foreground-subtle)]';
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${cls}`}>
      <span className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${dot}`} />
      {severity}
    </span>
  );
}
