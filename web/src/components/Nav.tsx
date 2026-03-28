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

const OperationsIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
    <polygon points="9,1 3,9 8,9 7,15 13,7 8,7" />
  </svg>
);

const AnalyticsIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
    <polyline points="1,12 5,7 9,9 15,3" />
    <line x1="1" y1="15" x2="15" y2="15" />
  </svg>
);

const SettingsIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
    <circle cx="8" cy="8" r="2.5" />
    <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.41 1.41M11.54 11.54l1.41 1.41M3.05 12.95l1.41-1.41M11.54 4.46l1.41-1.41" />
  </svg>
);

const OPERATIONS_CHILDREN = [
  { href: '/generate', label: 'Generate' },
  { href: '/jobs', label: 'Queue' },
  { href: '/simulate', label: 'Simulate' },
];

const TOP_ITEMS = [
  { href: '/', label: 'Dashboard', Icon: DashboardIcon, exact: true },
  { href: '/scenarios', label: 'Scenarios', Icon: ScenariosIcon, exact: false },
];

const BOTTOM_ITEMS = [
  { href: '/analytics', label: 'Analytics', Icon: AnalyticsIcon, exact: false },
  { href: '/settings', label: 'Settings', Icon: SettingsIcon, exact: false },
];

const ALL_MOBILE_ITEMS = [
  { href: '/', label: 'Home', exact: true },
  { href: '/scenarios', label: 'Scenarios', exact: false },
  { href: '/generate', label: 'Generate', exact: false },
  { href: '/jobs', label: 'Queue', exact: false },
  { href: '/simulate', label: 'Simulate', exact: false },
  { href: '/analytics', label: 'Analytics', exact: false },
  { href: '/settings', label: 'Settings', exact: false },
];

export default function Nav() {
  const pathname = usePathname();

  const isOpsActive = ['/generate', '/jobs', '/simulate'].some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );

  function isActive(href: string, exact: boolean) {
    return exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <>
      {/* Mobile header */}
      <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[rgba(0,0,0,0.96)] px-4 py-3 lg:hidden">
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="section-kicker text-[var(--accent-secondary)]">Internal Tools</div>
              <div className="mt-0.5 text-base font-semibold tracking-[0.01em] text-foreground">The Administration</div>
            </div>
            <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-[var(--foreground-subtle)]">Ops</div>
          </div>
          <nav className="grid grid-cols-4 gap-1.5 overflow-x-auto pb-1">
            {ALL_MOBILE_ITEMS.map((item) => {
              const active = isActive(item.href, item.exact);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`inline-flex min-h-[36px] items-center justify-center rounded-[var(--radius-tight)] border px-2 py-1.5 text-center text-[10px] font-mono uppercase tracking-[0.14em] ${
                    active
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

      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-[var(--rail-width)] border-r border-[var(--border)] bg-[rgba(0,0,0,0.98)] lg:flex lg:flex-col">
        <div className="border-b border-[var(--border)] px-4 py-5">
          <div className="mb-2 flex items-center gap-2.5">
            <span className="h-2 w-2 rounded-full bg-[var(--accent-secondary)]" />
            <span className="section-kicker">Internal Ops</span>
          </div>
          <div className="text-[20px] font-semibold tracking-[-0.02em] text-foreground">The Administration</div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <div className="space-y-1">
            {TOP_ITEMS.map((item) => {
              const active = isActive(item.href, item.exact);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2.5 rounded-[var(--radius-tight)] border px-3 py-2.5 transition-colors ${
                    active
                      ? 'border-[rgba(25,105,220,0.3)] bg-[rgba(25,105,220,0.08)] text-foreground'
                      : 'border-transparent bg-transparent text-[var(--foreground-muted)] hover:border-[var(--border)] hover:bg-[rgba(255,255,255,0.02)] hover:text-foreground'
                  }`}
                >
                  <span className={active ? 'text-[var(--accent-secondary)]' : 'text-[var(--foreground-subtle)]'}>
                    <item.Icon />
                  </span>
                  <span className="text-sm font-medium">{item.label}</span>
                </Link>
              );
            })}

            {/* Operations group */}
            <div>
              <div
                className={`flex items-center gap-2.5 rounded-[var(--radius-tight)] border px-3 py-2.5 ${
                  isOpsActive
                    ? 'border-[rgba(25,105,220,0.3)] bg-[rgba(25,105,220,0.08)] text-foreground'
                    : 'border-transparent text-[var(--foreground-muted)]'
                }`}
              >
                <span className={isOpsActive ? 'text-[var(--accent-secondary)]' : 'text-[var(--foreground-subtle)]'}>
                  <OperationsIcon />
                </span>
                <span className="text-sm font-medium">Operations</span>
                {isOpsActive && (
                  <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[var(--accent-secondary)]" />
                )}
              </div>
              <div className="mt-0.5 ml-1 space-y-0.5 border-l border-[var(--border)] pl-4">
                {OPERATIONS_CHILDREN.map((child) => {
                  const childActive = pathname === child.href || pathname.startsWith(`${child.href}/`);
                  return (
                    <Link
                      key={child.href}
                      href={child.href}
                      className={`flex items-center rounded-[6px] px-2 py-1.5 text-[11px] font-mono uppercase tracking-[0.16em] transition-colors ${
                        childActive
                          ? 'text-foreground bg-[rgba(25,105,220,0.1)] border border-[rgba(25,105,220,0.25)]'
                          : 'text-[var(--foreground-subtle)] hover:text-[var(--foreground-muted)] border border-transparent'
                      }`}
                    >
                      {child.label}
                    </Link>
                  );
                })}
              </div>
            </div>

            {BOTTOM_ITEMS.map((item) => {
              const active = isActive(item.href, false);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2.5 rounded-[var(--radius-tight)] border px-3 py-2.5 transition-colors ${
                    active
                      ? 'border-[rgba(25,105,220,0.3)] bg-[rgba(25,105,220,0.08)] text-foreground'
                      : 'border-transparent bg-transparent text-[var(--foreground-muted)] hover:border-[var(--border)] hover:bg-[rgba(255,255,255,0.02)] hover:text-foreground'
                  }`}
                >
                  <span className={active ? 'text-[var(--accent-secondary)]' : 'text-[var(--foreground-subtle)]'}>
                    <item.Icon />
                  </span>
                  <span className="text-sm font-medium">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>

        <div className="border-t border-[var(--border)] px-4 py-3">
          <div className="section-kicker mb-1">Current Surface</div>
          <div className="text-[11px] leading-5 text-[var(--foreground-subtle)]">
            Dense data, direct control, minimal chrome.
          </div>
        </div>
      </aside>
    </>
  );
}
