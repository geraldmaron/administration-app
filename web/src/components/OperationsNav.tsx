'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const ITEMS = [
  { href: '/generate', label: 'Generate' },
  { href: '/jobs', label: 'Jobs' },
  { href: '/scenarios', label: 'Library' },
  { href: '/simulate', label: 'Simulate' },
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
            className={`inline-flex min-h-[40px] items-center rounded-[10px] border px-4 py-2 text-[11px] font-mono uppercase tracking-[0.18em] transition-colors ${
              active
                ? 'border-[var(--accent-primary)] bg-[rgba(25,105,220,0.16)] text-foreground'
                : 'border-[var(--border)] bg-[rgba(255,255,255,0.02)] text-[var(--foreground-muted)] hover:border-[var(--border-strong)] hover:text-foreground'
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}