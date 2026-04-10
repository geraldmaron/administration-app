'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const DashboardIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
    <rect x="1" y="1" width="6" height="6" />
    <rect x="9" y="1" width="6" height="6" />
    <rect x="1" y="9" width="6" height="6" />
    <rect x="9" y="9" width="6" height="6" />
  </svg>
);

const ScenariosIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
    <line x1="3" y1="4" x2="13" y2="4" />
    <line x1="3" y1="8" x2="13" y2="8" />
    <line x1="3" y1="12" x2="9" y2="12" />
  </svg>
);

const AnalyticsIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
    <polyline points="1,12 5,7 9,9 15,3" />
    <line x1="1" y1="15" x2="15" y2="15" />
  </svg>
);

const SettingsIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
    <circle cx="8" cy="8" r="2.5" />
    <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.41 1.41M11.54 11.54l1.41 1.41M3.05 12.95l1.41-1.41M11.54 4.46l1.41-1.41" />
  </svg>
);

interface NavItemDef {
  href: string;
  label: string;
  Icon?: () => React.JSX.Element;
  exact?: boolean;
}

const COMMAND_ITEMS: NavItemDef[] = [
  { href: '/', label: 'Dashboard', Icon: DashboardIcon, exact: true },
  { href: '/scenarios', label: 'Scenarios', Icon: ScenariosIcon },
];

const OPERATIONS_ITEMS: NavItemDef[] = [
  { href: '/generate', label: 'Generate' },
  { href: '/jobs', label: 'Queue' },
  { href: '/simulate', label: 'Simulate' },
  { href: '/tokens', label: 'Tokens' },
  { href: '/geopolitics', label: 'Geopolitics' },
];

const INTEL_ITEMS: NavItemDef[] = [
  { href: '/analytics', label: 'Analytics', Icon: AnalyticsIcon },
  { href: '/gaia', label: 'Gaia' },
  { href: '/settings', label: 'Settings', Icon: SettingsIcon },
];

const ALL_MOBILE_ITEMS: NavItemDef[] = [
  { href: '/', label: 'Home', exact: true },
  { href: '/scenarios', label: 'Scenarios' },
  { href: '/generate', label: 'Generate' },
  { href: '/jobs', label: 'Queue' },
  { href: '/simulate', label: 'Simulate' },
  { href: '/tokens', label: 'Tokens' },
  { href: '/geopolitics', label: 'Geopolitics' },
  { href: '/analytics', label: 'Analytics' },
  { href: '/gaia', label: 'Gaia' },
  { href: '/settings', label: 'Settings' },
];

function SectionLabel({ children }: { children: string }) {
  return (
    <div className="mb-1 mt-5 px-3 first:mt-0">
      <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-[var(--foreground-subtle)]">
        {children}
      </span>
    </div>
  );
}

export default function Nav() {
  const pathname = usePathname();

  function isActive(href: string, exact?: boolean) {
    return exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
  }

  function navLinkClasses(active: boolean) {
    return [
      'flex items-center gap-2.5 py-[6px] text-[13px] font-medium transition-all rounded-[var(--radius-tight)]',
      active
        ? 'bg-[var(--surface-fill)] text-foreground border-l-2 border-l-[var(--accent-primary)] pl-[10px] pr-3'
        : 'text-[var(--foreground-subtle)] hover:bg-[var(--surface-fill)] hover:text-[var(--foreground-muted)] px-3',
    ].join(' ');
  }

  return (
    <>
      {/* Mobile header */}
      <header className="sticky top-[2px] z-50 border-b border-[var(--border)] bg-[var(--background)] px-4 py-3 lg:hidden">
        <div className="space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-5 w-5 items-center justify-center rounded-[var(--radius-tight)] border border-[var(--accent-primary)] bg-[var(--accent-muted)]">
              <span className="text-[8px] font-bold text-[var(--accent-primary)]">A</span>
            </div>
            <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-foreground">
              The Administration
            </span>
          </div>
          <nav className="grid grid-cols-4 gap-1 overflow-x-auto pb-1">
            {ALL_MOBILE_ITEMS.map((item) => {
              const active = isActive(item.href, item.exact);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={[
                    'inline-flex min-h-[28px] items-center justify-center rounded-[var(--radius-tight)] border px-2 py-1 text-center text-[9px] font-bold uppercase tracking-[0.06em] transition-colors',
                    active
                      ? 'border-[var(--accent-primary)] bg-[var(--accent-muted)] text-[var(--accent-primary)]'
                      : 'border-[var(--border)] text-[var(--foreground-subtle)] hover:border-[var(--border-strong)] hover:text-[var(--foreground-muted)]',
                  ].join(' ')}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Desktop command rail */}
      <aside className="fixed inset-y-0 left-0 top-[2px] hidden w-[var(--rail-width)] border-r border-[var(--border)] bg-[var(--background)] lg:flex lg:flex-col">
        {/* Wordmark */}
        <div className="border-b border-[var(--border)] px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-[var(--radius-tight)] border border-[var(--accent-primary)] bg-[var(--accent-muted)]">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M3 3l4 4-4 4" stroke="var(--accent-primary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M8 9h3" stroke="var(--accent-primary)" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
            <div className="leading-none">
              <div className="text-[9px] font-bold uppercase tracking-[0.16em] text-[var(--foreground-subtle)]">The</div>
              <div className="mt-0.5 text-[13px] font-bold uppercase tracking-[0.06em] text-foreground">Administration</div>
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-2 py-2">
          <SectionLabel>Command</SectionLabel>
          <div className="space-y-px">
            {COMMAND_ITEMS.map((item) => {
              const active = isActive(item.href, item.exact);
              return (
                <Link key={item.href} href={item.href} className={navLinkClasses(active)}>
                  {item.Icon && (
                    <span className={active ? 'text-[var(--accent-primary)]' : 'text-[var(--foreground-subtle)]'}>
                      <item.Icon />
                    </span>
                  )}
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>

          <SectionLabel>Operations</SectionLabel>
          <div className="space-y-px">
            {OPERATIONS_ITEMS.map((item) => {
              const active = isActive(item.href, item.exact);
              return (
                <Link key={item.href} href={item.href} className={navLinkClasses(active)}>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>

          <SectionLabel>Intelligence</SectionLabel>
          <div className="space-y-px">
            {INTEL_ITEMS.map((item) => {
              const active = isActive(item.href, item.exact);
              return (
                <Link key={item.href} href={item.href} className={navLinkClasses(active)}>
                  {item.Icon && (
                    <span className={active ? 'text-[var(--accent-primary)]' : 'text-[var(--foreground-subtle)]'}>
                      <item.Icon />
                    </span>
                  )}
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>

        {/* System status footer */}
        <div className="border-t border-[var(--border)] px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--success)] shadow-[0_0_4px_var(--success)]" />
              <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-[var(--foreground-subtle)]">
                System Online
              </span>
            </div>
            <span className="font-mono text-[9px] text-[var(--foreground-subtle)]">v2.0</span>
          </div>
        </div>
      </aside>
    </>
  );
}
