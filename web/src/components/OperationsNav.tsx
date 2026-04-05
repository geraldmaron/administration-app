'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const ITEMS = [
  { href: '/generate', label: 'Generate' },
  { href: '/jobs', label: 'Queue' },
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
            className={`inline-flex min-h-[32px] items-center rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              active
                ? 'border-[var(--accent-primary)] bg-[var(--accent-muted)] text-foreground'
                : 'border-[var(--border)] text-[var(--foreground-muted)] hover:border-[var(--border-strong)] hover:text-foreground'
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
