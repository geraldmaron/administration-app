import { BUNDLE_ACCENT_COLORS, BUNDLE_BADGE_CLASSES } from '@/lib/constants';

interface BundleBadgeProps {
  bundle: string;
}

export default function BundleBadge({ bundle }: BundleBadgeProps) {
  const classes = BUNDLE_BADGE_CLASSES[bundle] ?? { bg: 'bg-slate-400/15', text: 'text-slate-400' };
  const dotColor = BUNDLE_ACCENT_COLORS[bundle] ?? '#94a3b8';
  const label = bundle.replace(/_/g, ' ');
  return (
    <span className={`inline-flex items-center gap-1.5 text-[11px] font-mono tracking-[0.08em] ${classes.text}`}>
      <span className="h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: dotColor }} />
      {label.charAt(0).toUpperCase() + label.slice(1)}
    </span>
  );
}
