'use client';

import { useState } from 'react';
import Link from 'next/link';
import { BUNDLE_BADGE_CLASSES } from '@/lib/constants';

interface BundleStat {
  id: string;
  label: string;
  total: number;
  active: number;
}

export default function BundleStatsPanel({ bundles }: { bundles: BundleStat[] }) {
  const [view, setView] = useState<'list' | 'grid'>('list');

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="text-[10px] font-mono uppercase tracking-widest text-foreground-subtle">
          Scenarios by Bundle
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setView('list')}
            className={`px-2 py-1 text-[10px] font-mono uppercase tracking-wider rounded-[2px] transition-colors ${
              view === 'list'
                ? 'bg-[var(--accent-muted)] text-[var(--accent-primary)]'
                : 'text-foreground-subtle hover:text-foreground'
            }`}
          >
            List
          </button>
          <button
            onClick={() => setView('grid')}
            className={`px-2 py-1 text-[10px] font-mono uppercase tracking-wider rounded-[2px] transition-colors ${
              view === 'grid'
                ? 'bg-[var(--accent-muted)] text-[var(--accent-primary)]'
                : 'text-foreground-subtle hover:text-foreground'
            }`}
          >
            Grid
          </button>
        </div>
      </div>

      {view === 'list' ? (
        <div className="tech-border bg-background-elevated divide-y divide-[var(--border-strong)]">
          {bundles.map((bundle) => {
            const badgeClasses = BUNDLE_BADGE_CLASSES[bundle.id] ?? { bg: 'bg-slate-400/15', text: 'text-slate-400' };
            const bundleRate = bundle.total > 0 ? Math.round((bundle.active / bundle.total) * 100) : 0;
            return (
              <Link
                key={bundle.id}
                href={`/scenarios?bundle=${bundle.id}`}
                className="flex items-center gap-4 px-4 py-3 hover:bg-background-muted transition-colors group"
              >
                <div className={`w-28 flex-shrink-0 text-[11px] font-mono uppercase tracking-wider ${badgeClasses.text}`}>
                  {bundle.label}
                </div>
                <div className="flex-1 flex items-center gap-3 min-w-0">
                  <div className="flex-1 h-0.5 bg-background-muted overflow-hidden">
                    <div
                      className={`h-full transition-all ${badgeClasses.bg.replace('/15', '/60')}`}
                      style={{ width: `${bundleRate}%` }}
                    />
                  </div>
                  <div className="text-[10px] font-mono text-foreground-subtle w-8 text-right flex-shrink-0">
                    {bundleRate}%
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 text-right">
                  <span className="text-[var(--success)] font-mono text-sm font-semibold w-8 text-right">
                    {bundle.active}
                  </span>
                  <span className="text-foreground-subtle text-[10px] font-mono">/</span>
                  <span className="text-foreground font-mono text-sm font-semibold w-8 text-right">
                    {bundle.total}
                  </span>
                </div>
                <span className="text-foreground-subtle group-hover:text-foreground transition-colors text-xs">→</span>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
          {bundles.map((bundle) => {
            const badgeClasses = BUNDLE_BADGE_CLASSES[bundle.id] ?? { bg: 'bg-slate-400/15', text: 'text-slate-400' };
            const bundleRate = bundle.total > 0 ? Math.round((bundle.active / bundle.total) * 100) : 0;
            return (
              <Link
                key={bundle.id}
                href={`/scenarios?bundle=${bundle.id}`}
                className="tech-border bg-background-elevated p-4 block hover:bg-background-muted transition-colors group"
              >
                <div className={`text-[10px] font-mono uppercase tracking-wider mb-2 ${badgeClasses.text}`}>
                  {bundle.label}
                </div>
                <div className="text-2xl font-mono font-bold text-foreground mb-1">
                  {bundle.total}
                </div>
                <div className="text-xs text-foreground-muted mb-2">
                  <span className="text-[var(--success)] font-mono">{bundle.active}</span> active
                </div>
                <div className="h-0.5 bg-background-muted overflow-hidden">
                  <div
                    className={`h-full ${badgeClasses.bg.replace('/15', '/60')}`}
                    style={{ width: `${bundleRate}%` }}
                  />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
