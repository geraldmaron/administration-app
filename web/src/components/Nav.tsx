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
    <aside className="fixed left-0 top-0 h-screen w-[200px] border-r border-[var(--border-strong)] bg-background flex flex-col z-50">
      <div className="px-4 py-5 border-b border-[var(--border-strong)]">
        <div className="flex items-center gap-2">
          <span className="status-dot" />
          <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-foreground">
            The Administration
          </span>
        </div>
        <div className="text-[9px] font-mono uppercase tracking-widest text-foreground-subtle mt-1 pl-4">
          Admin Protocol
        </div>
      </div>
      <nav className="flex flex-col gap-1 p-3 flex-1">
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 px-3 py-2 text-sm transition-colors rounded-[2px] ${
                isActive
                  ? 'text-foreground bg-background-muted border-l-2 border-accent pl-[10px]'
                  : 'text-foreground-muted hover:text-foreground hover:bg-background-muted border-l-2 border-transparent pl-[10px]'
              }`}
            >
              <span className={isActive ? 'text-accent' : ''}>
                <item.Icon />
              </span>
              <span className="text-xs font-mono tracking-wide">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
