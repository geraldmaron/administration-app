'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface ScenarioActionsProps {
  id: string;
  isActive: boolean;
}

export default function ScenarioActions({ id, isActive }: ScenarioActionsProps) {
  const router = useRouter();
  const [active, setActive] = useState(isActive);
  const [loading, setLoading] = useState(false);

  async function toggleActive() {
    setLoading(true);
    try {
      await fetch(`/api/scenarios/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !active }),
      });
      setActive((v) => !v);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!confirm('Delete this scenario? This cannot be undone.')) return;
    await fetch(`/api/scenarios/${id}`, { method: 'DELETE' });
    router.push('/scenarios');
  }

  return (
    <div className="flex items-center gap-2 shrink-0">
      <button
        onClick={toggleActive}
        disabled={loading}
        className={`btn ${
          active
            ? 'border-[var(--success)]/30 text-[var(--success)] hover:bg-[var(--success)]/10'
            : 'border-[var(--border-strong)] text-foreground-muted hover:text-foreground hover:bg-background-muted'
        }`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-[var(--success)]' : 'bg-[var(--foreground-subtle)]'}`} />
        {active ? 'Active' : 'Inactive'}
      </button>
      <button
        onClick={handleDelete}
        className="btn btn-destructive"
      >
        Delete
      </button>
    </div>
  );
}
