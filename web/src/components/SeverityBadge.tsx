interface SeverityBadgeProps {
  severity: string | null;
}

const SEVERITY_CLASSES: Record<string, string> = {
  low: 'bg-[var(--info)]/15 text-[var(--info)]',
  medium: 'bg-[var(--warning)]/15 text-[var(--warning)]',
  high: 'bg-[var(--error)]/15 text-[var(--error)]',
  critical: 'bg-[var(--error)]/20 text-[var(--error)] font-bold',
};

export default function SeverityBadge({ severity }: SeverityBadgeProps) {
  if (!severity) return <span className="text-foreground-subtle text-xs">—</span>;
  const cls = SEVERITY_CLASSES[severity] ?? 'bg-slate-400/15 text-slate-400';
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono uppercase tracking-wider rounded-[2px] ${cls}`}>
      {severity}
    </span>
  );
}
