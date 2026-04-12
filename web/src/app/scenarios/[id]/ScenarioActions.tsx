'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { markConfirmedAction } from '../actions';

interface ScenarioActionsProps {
  id: string;
  isActive: boolean;
  isGolden: boolean;
  isConfirmed: boolean;
  bundle?: string;
}

export default function ScenarioActions({ id, isActive, isGolden: initialGolden, isConfirmed: initialConfirmed, bundle }: ScenarioActionsProps) {
  const router = useRouter();
  const [active, setActive] = useState(isActive);
  const [golden, setGolden] = useState(initialGolden);
  const [confirmed, setConfirmed] = useState(initialConfirmed);
  const [loading, setLoading] = useState(false);
  const [goldenLoading, setGoldenLoading] = useState(false);
  const [confirmedLoading, setConfirmedLoading] = useState(false);

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

  async function toggleGolden() {
    setGoldenLoading(true);
    try {
      if (golden) {
        await fetch(`/api/scenarios/${id}/golden`, { method: 'DELETE' });
        setGolden(false);
      } else {
        const res = await fetch(`/api/scenarios/${id}/golden`, { method: 'POST' });
        if (res.ok) setGolden(true);
      }
    } finally {
      setGoldenLoading(false);
    }
  }

  async function toggleConfirmed() {
    setConfirmedLoading(true);
    try {
      await markConfirmedAction([id], !confirmed);
      setConfirmed((v) => !v);
    } finally {
      setConfirmedLoading(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-2 shrink-0">
      <button
        onClick={() => router.push(bundle ? `/scenarios?bundle=${bundle}` : '/scenarios')}
        className="btn btn-ghost"
      >
        Back To Library
      </button>
      <button
        onClick={toggleGolden}
        disabled={goldenLoading}
        className={`btn ${
          golden
            ? 'border-[var(--accent-secondary)]/40 text-[var(--accent-secondary)] hover:bg-[var(--accent-secondary)]/10'
            : 'border-[var(--border)] text-[var(--foreground-muted)] hover:text-foreground hover:bg-[var(--background-muted)]'
        }`}
        title={golden ? 'Remove from golden examples' : 'Promote to golden example for few-shot prompting'}
      >
        <span className={`text-[11px] ${golden ? 'text-[var(--accent-secondary)]' : 'text-[var(--foreground-subtle)]'}`}>★</span>
        {goldenLoading ? 'Updating…' : golden ? 'Golden' : 'Mark Golden'}
      </button>
      <button
        onClick={toggleActive}
        disabled={loading}
        className={`btn ${
          active
            ? 'border-[var(--success)]/30 text-[var(--success)] hover:bg-[var(--success)]/10'
            : 'border-[var(--border)] text-foreground-muted hover:text-foreground hover:bg-background-muted'
        }`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-[var(--success)]' : 'bg-[var(--foreground-subtle)]'}`} />
        {loading ? 'Updating…' : active ? 'Active' : 'Inactive'}
      </button>
      <button
        onClick={toggleConfirmed}
        disabled={confirmedLoading}
        className={`btn ${
          confirmed
            ? 'border-[var(--success)]/30 text-[var(--success)] hover:bg-[var(--success)]/10'
            : 'border-[var(--border)] text-foreground-muted hover:text-foreground hover:bg-background-muted'
        }`}
        title={confirmed ? 'Remove confirmed-clean status — scenario will appear in future repair audits' : 'Mark as confirmed clean — skips in future repair audits'}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${confirmed ? 'bg-[var(--success)]' : 'bg-[var(--foreground-subtle)]'}`} />
        {confirmedLoading ? 'Updating…' : confirmed ? 'Confirmed' : 'Confirm'}
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
