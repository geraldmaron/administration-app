'use client';

import { useState } from 'react';

interface SortHeaderProps<F extends string = string> {
  field: F;
  label: string;
  current: F;
  dir: 'asc' | 'desc';
  onSort: (field: F) => void;
  align?: 'left' | 'right';
}

export default function SortHeader<F extends string = string>({
  field,
  label,
  current,
  dir,
  onSort,
  align = 'left',
}: SortHeaderProps<F>) {
  const active = current === field;
  return (
    <button
      onClick={() => onSort(field)}
      className={`flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider transition-colors ${
        active ? 'text-foreground' : 'text-foreground-subtle hover:text-foreground-muted'
      } ${align === 'right' ? 'ml-auto' : ''}`}
    >
      {label}
      <span className="opacity-60">{active ? (dir === 'asc' ? '↑' : '↓') : '↕'}</span>
    </button>
  );
}

export function useSort<F extends string>(defaultField: F, defaultDir: 'asc' | 'desc' = 'asc') {
  const [sortField, setSortField] = useState<F>(defaultField);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>(defaultDir);

  function handleSort(field: F) {
    if (sortField === field) {
      setSortDir((d: 'asc' | 'desc') => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  }

  function compare(a: unknown, b: unknown): number {
    const multiplier = sortDir === 'asc' ? 1 : -1;
    if (a == null && b == null) return 0;
    if (a == null) return 1;
    if (b == null) return -1;
    if (typeof a === 'string' && typeof b === 'string') return a.localeCompare(b) * multiplier;
    if (typeof a === 'number' && typeof b === 'number') return (a - b) * multiplier;
    if (typeof a === 'boolean' && typeof b === 'boolean') return ((a ? 1 : 0) - (b ? 1 : 0)) * multiplier;
    return 0;
  }

  return { sortField, sortDir, handleSort, compare };
}
