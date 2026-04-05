interface SeverityBadgeProps {
  severity: string | null;
}

const SEVERITY_CLASSES: Record<string, string> = {
  low: 'text-[var(--info)]',
  medium: 'text-[var(--warning)]',
  high: 'text-[var(--error)]',
  critical: 'text-[var(--error)] font-bold',
};

export default function SeverityBadge({ severity }: SeverityBadgeProps) {
  if (!severity) return <span className="text-foreground-subtle text-xs">—</span>;
  const cls = SEVERITY_CLASSES[severity] ?? 'text-slate-400';
  return (
    <span className={`text-xs font-medium ${cls}`}>
      {severity}
    </span>
  );
}
