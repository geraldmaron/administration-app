interface StatusBadgeProps {
  status: string;
  pulse?: boolean;
}

const STATUS_MAP: Record<string, { label: string; dot: string; text: string }> = {
  pending: { label: 'Pending', dot: 'bg-[var(--info)]', text: 'text-[var(--info)]' },
  running: { label: 'Running', dot: 'bg-[var(--accent-primary)]', text: 'text-[var(--accent-primary)]' },
  completed: { label: 'Completed', dot: 'bg-[var(--success)]', text: 'text-[var(--success)]' },
  remediated: { label: 'Remediated', dot: 'bg-[var(--success)]', text: 'text-[var(--success)]' },
  partial: { label: 'Partial', dot: 'bg-[var(--warning)]', text: 'text-[var(--warning)]' },
  partial_failure: { label: 'Partial Failure', dot: 'bg-[var(--warning)]', text: 'text-[var(--warning)]' },
  failed: { label: 'Failed', dot: 'bg-[var(--error)]', text: 'text-[var(--error)]' },
  cancelled: { label: 'Cancelled', dot: 'bg-[var(--foreground-subtle)]', text: 'text-[var(--foreground-subtle)]' },
};

export default function StatusBadge({ status, pulse = false }: StatusBadgeProps) {
  const config = STATUS_MAP[status] ?? {
    label: status,
    dot: 'bg-[var(--foreground-subtle)]',
    text: 'text-[var(--foreground-subtle)]',
  };

  return (
    <span className={`inline-flex items-center gap-1.5 text-[11px] font-mono tracking-[0.06em] ${config.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${config.dot} ${pulse ? 'animate-pulse' : ''}`} />
      {config.label}
    </span>
  );
}