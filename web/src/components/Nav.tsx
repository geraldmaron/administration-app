'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const DashboardIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
    <rect x="1" y="1" width="6" height="6" />
    <rect x="9" y="1" width="6" height="6" />
    <rect x="1" y="9" width="6" height="6" />
    <rect x="9" y="9" width="6" height="6" />
  </svg>
);

const ScenariosIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
    <line x1="3" y1="4" x2="13" y2="4" />
    <line x1="3" y1="8" x2="13" y2="8" />
    <line x1="3" y1="12" x2="9" y2="12" />
  </svg>
);

const GenerateIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
    <circle cx="8" cy="8" r="6" />
    <line x1="8" y1="5" x2="8" y2="11" />
    <line x1="5" y1="8" x2="11" y2="8" />
  </svg>
);

const JobsIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
    <circle cx="8" cy="8" r="5" />
    <polyline points="8,5 8,8 10,10" />
  </svg>
);

const SettingsIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
    <circle cx="8" cy="8" r="2.5" />
    <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.41 1.41M11.54 11.54l1.41 1.41M3.05 12.95l1.41-1.41M11.54 4.46l1.41-1.41" />
  </svg>
);

const NAV_ITEMS = [
  { href: '/', label: 'Dashboard', Icon: DashboardIcon },
  { href: '/scenarios', label: 'Scenarios', Icon: ScenariosIcon },
  { href: '/generate', label: 'Generate', Icon: GenerateIcon },
  { href: '/jobs', label: 'Jobs', Icon: JobsIcon },
  { href: '/settings', label: 'Settings', Icon: SettingsIcon },
];

export default function Nav() {
  const pathname = usePathname();

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[rgba(0,0,0,0.92)] px-4 py-4 backdrop-blur lg:hidden">
        <div className="space-y-3">
          <div>
            <div className="section-kicker text-[var(--accent-secondary)]">Command Surface</div>
            <div className="mt-1 text-base font-semibold tracking-[0.01em] text-foreground">The Administration</div>
          </div>
          <nav className="grid grid-cols-3 gap-2 overflow-x-auto pb-1">
            {NAV_ITEMS.map((item) => {
              const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`inline-flex min-h-[44px] items-center justify-center rounded-[var(--radius-tight)] border px-3 py-2 text-center text-[10px] font-mono uppercase tracking-[0.16em] ${
                    isActive
                      ? 'border-[var(--accent-primary)] bg-[rgba(25,105,220,0.12)] text-foreground'
                      : 'border-[var(--border)] bg-[rgba(255,255,255,0.02)] text-[var(--foreground-muted)]'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      <aside className="fixed inset-y-0 left-0 hidden w-[var(--rail-width)] border-r border-[var(--border)] bg-[rgba(0,0,0,0.94)] lg:flex lg:flex-col">
        <div className="border-b border-[var(--border)] px-6 py-7">
          <div className="mb-3 flex items-center gap-3">
            <span className="h-2 w-2 rounded-full bg-[var(--accent-secondary)]" />
            <span className="section-kicker">Admin Protocol</span>
          </div>
          <div className="text-[26px] font-semibold tracking-[-0.02em] text-foreground">The Administration</div>
          <p className="mt-3 text-sm leading-6 text-[var(--foreground-muted)]">
            Scenario operations, generation control, and editorial review.
          </p>
        </div>

        <nav className="flex-1 px-4 py-6">
          <div className="space-y-2.5">
            {NAV_ITEMS.map((item) => {
              const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`surface-rule flex items-center gap-3 rounded-[var(--radius)] border px-4 py-3.5 transition-colors ${
                    isActive
                      ? 'border-[rgba(25,105,220,0.34)] bg-[rgba(25,105,220,0.12)] text-foreground'
                      : 'border-transparent bg-transparent text-[var(--foreground-muted)] hover:border-[var(--border)] hover:bg-[rgba(255,255,255,0.03)] hover:text-foreground'
                  }`}
                >
                  <span className={isActive ? 'text-[var(--accent-secondary)]' : 'text-[var(--foreground-subtle)]'}>
                    <item.Icon />
                  </span>
                  <div>
                    <div className="text-sm font-medium">{item.label}</div>
                    <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-[var(--foreground-subtle)]">
                      {item.href === '/' ? 'Overview' : item.href.slice(1)}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </nav>

        <div className="border-t border-[var(--border)] px-6 py-5">
          <div className="section-kicker">Current Protocol</div>
          <div className="mt-3 rounded-[var(--radius-tight)] border border-[var(--border)] bg-[rgba(255,255,255,0.02)] px-4 py-3 text-xs leading-5 text-[var(--foreground-muted)]">
            Statesman theme active. Black field, blue command accents, gold highlight actions.
          </div>
        </div>
      </aside>
    </>
  );
}
