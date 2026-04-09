'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const ITEMS = [
  { href: '/generate', label: 'Generate' },
  { href: '/jobs', label: 'Queue' },
  { href: '/runs', label: 'Runs' },
  { href: '/simulate', label: 'Simulate' },
  { href: '/tokens', label: 'Tokens' },
  { href: '/geopolitics', label: 'Geopolitics' },
];

export default function OperationsNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap gap-2">
      {ITEMS.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`inline-flex min-h-[26px] items-center border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.06em] transition-all ${
              active
                ? 'border-[var(--accent-primary)] bg-[var(--accent-muted)] text-[var(--accent-primary)] shadow-[inset_2px_0_0_var(--accent-primary)]'
                : 'border-[var(--border)] text-[var(--foreground-muted)] hover:border-[var(--border-strong)] hover:text-foreground'
            }`}
            style={{ borderRadius: 'var(--radius-tight)' }}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
