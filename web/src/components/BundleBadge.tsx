import { BUNDLE_BADGE_CLASSES } from '@/lib/constants';

interface BundleBadgeProps {
  bundle: string;
}

export default function BundleBadge({ bundle }: BundleBadgeProps) {
  const classes = BUNDLE_BADGE_CLASSES[bundle] ?? { bg: 'bg-slate-400/15', text: 'text-slate-400' };
  return (
    <span
      className={`inline-flex min-h-[24px] items-center border border-[var(--border)] px-2.5 py-1 text-[10px] font-mono uppercase tracking-[0.18em] rounded-[10px] ${classes.bg} ${classes.text}`}
    >
      {bundle.replace('_', ' ')}
    </span>
  );
}
