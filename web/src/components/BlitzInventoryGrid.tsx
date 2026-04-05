import type { DeficitCell, TierAllocation } from '@/lib/blitz-planner';
import { ALL_BUNDLES } from '@/lib/constants';

interface InventoryRow {
  bundle: string;
  universal: { current: number; target: number };
  regional: { current: number; target: number };
  exclusive: { current: number; target: number; countries: number };
}

interface BlitzInventoryGridProps {
  deficits: DeficitCell[];
  allocation: TierAllocation;
}

function cellColor(current: number, target: number): string {
  if (target === 0) return '';
  const ratio = current / target;
  if (ratio >= 1) return 'text-[var(--success)]';
  if (ratio >= 0.5) return 'text-[var(--warning)]';
  return 'text-[var(--error)]';
}

function cellBg(current: number, target: number): string {
  if (target === 0) return '';
  const ratio = current / target;
  if (ratio >= 1) return 'bg-[var(--success)]/8';
  if (ratio >= 0.5) return 'bg-[var(--warning)]/8';
  return 'bg-[var(--error)]/8';
}

export default function BlitzInventoryGrid({ deficits, allocation }: BlitzInventoryGridProps) {
  const deficitsByBundle = new Map<string, DeficitCell[]>();
  for (const d of deficits) {
    const arr = deficitsByBundle.get(d.bundle) ?? [];
    arr.push(d);
    deficitsByBundle.set(d.bundle, arr);
  }

  const rows: InventoryRow[] = ALL_BUNDLES.map((b) => {
    const bundleDeficits = deficitsByBundle.get(b.id) ?? [];

    const uDef = bundleDeficits.find((d) => d.scopeTier === 'universal');
    const universal = uDef
      ? { current: uDef.current, target: uDef.target }
      : { current: allocation.universal, target: allocation.universal };

    const regionalDeficits = bundleDeficits.filter((d) => d.scopeTier === 'regional');
    const rCurrent = regionalDeficits.reduce((s, d) => s + d.current, 0);
    const rTarget = regionalDeficits.length > 0
      ? regionalDeficits.reduce((s, d) => s + d.target, 0)
      : allocation.regional;
    const regional = { current: rCurrent, target: rTarget };

    const exclusiveDeficits = bundleDeficits.filter((d) => d.scopeTier === 'exclusive');
    const eCurrent = exclusiveDeficits.reduce((s, d) => s + d.current, 0);
    const eTarget = exclusiveDeficits.reduce((s, d) => s + d.target, 0);
    const exclusive = { current: eCurrent, target: eTarget, countries: exclusiveDeficits.length };

    return { bundle: b.id, universal, regional, exclusive };
  });

  const gapU = rows.reduce((s, r) => s + Math.max(0, r.universal.target - r.universal.current), 0);
  const gapR = rows.reduce((s, r) => s + Math.max(0, r.regional.target - r.regional.current), 0);
  const gapE = rows.reduce((s, r) => s + Math.max(0, r.exclusive.target - r.exclusive.current), 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="control-surface px-3 py-2">
          <div className="text-[11px] font-medium text-[var(--foreground-subtle)] mb-1">Universal Gap</div>
          <div className={`data-value text-[15px] leading-none ${gapU > 0 ? 'text-[var(--warning)]' : 'text-[var(--success)]'}`}>{gapU}</div>
          <div className="text-[9px] text-[var(--foreground-subtle)] mt-0.5">40% ratio</div>
        </div>
        <div className="control-surface px-3 py-2">
          <div className="text-[11px] font-medium text-[var(--foreground-subtle)] mb-1">Regional Gap</div>
          <div className={`data-value text-[15px] leading-none ${gapR > 0 ? 'text-[var(--warning)]' : 'text-[var(--success)]'}`}>{gapR}</div>
          <div className="text-[9px] text-[var(--foreground-subtle)] mt-0.5">25% ratio</div>
        </div>
        <div className="control-surface px-3 py-2">
          <div className="text-[11px] font-medium text-[var(--foreground-subtle)] mb-1">Exclusive Gap</div>
          <div className={`data-value text-[15px] leading-none ${gapE > 0 ? 'text-[var(--warning)]' : 'text-[var(--success)]'}`}>{gapE}</div>
          <div className="text-[9px] text-[var(--foreground-subtle)] mt-0.5">10% ratio</div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-[var(--border)]">
              <th className="text-left py-2 px-2 text-[var(--foreground-subtle)] font-medium">Bundle</th>
              <th className="text-center py-2 px-2 text-[var(--foreground-subtle)] font-medium">Universal</th>
              <th className="text-center py-2 px-2 text-[var(--foreground-subtle)] font-medium">Regional</th>
              <th className="text-center py-2 px-2 text-[var(--foreground-subtle)] font-medium">Exclusive</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.bundle} className="border-b border-[var(--border)]">
                <td className="py-1.5 px-2 text-[var(--foreground-muted)] capitalize">{row.bundle}</td>
                <td className={`py-1.5 px-2 text-center ${cellBg(row.universal.current, row.universal.target)} ${cellColor(row.universal.current, row.universal.target)}`}>
                  {row.universal.current}/{row.universal.target}
                </td>
                <td className={`py-1.5 px-2 text-center ${cellBg(row.regional.current, row.regional.target)} ${cellColor(row.regional.current, row.regional.target)}`}>
                  {row.regional.current}/{row.regional.target}
                </td>
                <td className={`py-1.5 px-2 text-center ${cellBg(row.exclusive.current, row.exclusive.target)} ${cellColor(row.exclusive.current, row.exclusive.target)}`}>
                  {row.exclusive.current}/{row.exclusive.target}
                  {row.exclusive.countries > 0 && (
                    <span className="text-[var(--foreground-subtle)] ml-1">({row.exclusive.countries}c)</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
