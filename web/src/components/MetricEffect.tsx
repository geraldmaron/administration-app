import { METRIC_DISPLAY, INVERSE_METRICS } from '@/lib/constants';

interface MetricEffectProps {
  effect: {
    targetMetricId: string;
    value: number;
    duration: number;
    probability: number;
    type?: string;
    scope?: string;
  };
}

export default function MetricEffect({ effect }: MetricEffectProps) {
  const { targetMetricId, value, duration, probability } = effect;
  const label = METRIC_DISPLAY[targetMetricId] ?? targetMetricId.replace('metric_', '');
  const isInverse = INVERSE_METRICS.has(targetMetricId);
  const isPositive = isInverse ? value < 0 : value > 0;
  const valueClass = isPositive ? 'text-[var(--success)]' : value === 0 ? 'text-foreground-muted' : 'text-[var(--error)]';
  const sign = value > 0 ? '+' : '';

  return (
    <div className="flex items-center gap-2 text-xs font-mono">
      <span className="text-foreground-muted w-36 truncate">{label}</span>
      <span className={`font-bold ${valueClass}`}>
        {sign}{value}
      </span>
      <span className="text-foreground-subtle">
        {duration}t
      </span>
      {probability < 1 && (
        <span className="text-foreground-subtle">
          ({Math.round(probability * 100)}%)
        </span>
      )}
    </div>
  );
}
