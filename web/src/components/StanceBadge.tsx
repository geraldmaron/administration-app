interface StanceBadgeProps {
  stance: 'support' | 'oppose' | 'neutral' | 'concerned';
}

const STANCE_CONFIG = {
  support: { dot: 'bg-[var(--success)]', text: 'text-[var(--success)]', label: 'Support' },
  oppose: { dot: 'bg-[var(--error)]', text: 'text-[var(--error)]', label: 'Oppose' },
  neutral: { dot: 'bg-[var(--foreground-muted)]', text: 'text-[var(--foreground-muted)]', label: 'Neutral' },
  concerned: { dot: 'bg-[var(--warning)]', text: 'text-[var(--warning)]', label: 'Concerned' },
};

export default function StanceBadge({ stance }: StanceBadgeProps) {
  const config = STANCE_CONFIG[stance] ?? STANCE_CONFIG.neutral;
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${config.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${config.dot}`} />
      {config.label}
    </span>
  );
}
