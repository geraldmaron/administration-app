import { BUNDLE_BADGE_CLASSES } from '@/lib/constants';

interface BundleBadgeProps {
  bundle: string;
}

export default function BundleBadge({ bundle }: BundleBadgeProps) {
  const classes = BUNDLE_BADGE_CLASSES[bundle] ?? { bg: 'bg-slate-400/15', text: 'text-slate-400' };
  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono uppercase tracking-wider rounded-[2px] ${classes.bg} ${classes.text}`}
    >
      {bundle.replace('_', ' ')}
    </span>
  );
}
