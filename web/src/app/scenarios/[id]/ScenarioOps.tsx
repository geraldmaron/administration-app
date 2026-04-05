'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import CommandPanel from '@/components/CommandPanel';

interface AuditIssue {
  severity: 'error' | 'warn';
  rule: string;
  message: string;
}

interface AuditResult {
  score: number;
  issues: AuditIssue[];
  issueCount: number;
}

interface RepairResult {
  applied: number;
  skipped: number;
}

interface RepairAnalysisResult {
  id: string;
  hasChanges: boolean;
  auditIssues?: string[];
  changes: { path: string; after: string }[];
}

interface ScenarioOpsProps {
  scenarioId: string;
}

export default function ScenarioOps({ scenarioId }: ScenarioOpsProps) {
  const router = useRouter();
  const [auditLoading, setAuditLoading] = useState(false);
  const [repairLoading, setRepairLoading] = useState(false);
  const [auditResult, setAuditResult] = useState<AuditResult | null>(null);
  const [repairResult, setRepairResult] = useState<RepairResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function runAudit() {
    setAuditLoading(true);
    setError(null);
    setAuditResult(null);
    try {
      const res = await fetch(`/api/scenarios/${scenarioId}/audit`, { method: 'POST' });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? 'Audit failed');
        return;
      }
      const data = await res.json() as AuditResult;
      setAuditResult(data);
      router.refresh();
    } catch {
      setError('Audit request failed');
    } finally {
      setAuditLoading(false);
    }
  }

  async function runRepair() {
    setRepairLoading(true);
    setError(null);
    setRepairResult(null);
    try {
      const analyzeRes = await fetch('/api/scenarios/repair', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'analyze', ids: [scenarioId] }),
      });
      if (!analyzeRes.ok) {
        const body = await analyzeRes.json().catch(() => ({}));
        setError(body.error ?? 'Repair analysis failed');
        return;
      }
      const { results } = await analyzeRes.json() as { results: RepairAnalysisResult[] };
      const analysis = results[0];
      if (!analysis) {
        setError('Repair analysis returned no result');
        return;
      }
      if (analysis.auditIssues?.includes('Scenario not found')) {
        setError('Scenario not found. Refresh the page and try again.');
        router.refresh();
        return;
      }
      if (!analysis?.hasChanges) {
        setRepairResult({ applied: 0, skipped: 0 });
        return;
      }

      const patches = analysis.changes.map(c => ({ path: c.path, value: c.after }));
      const applyRes = await fetch('/api/scenarios/repair', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'apply', approved: [{ id: scenarioId, patches }] }),
      });
      if (!applyRes.ok) {
        const body = await applyRes.json().catch(() => ({}));
        setError(body.error ?? 'Repair apply failed');
        return;
      }
      const data = await applyRes.json() as RepairResult;
      setRepairResult(data);
      router.refresh();
    } catch {
      setError('Repair request failed');
    } finally {
      setRepairLoading(false);
    }
  }

  return (
    <CommandPanel className="mb-4 px-5 py-4">
      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={runAudit}
          disabled={auditLoading || repairLoading}
          className="btn border-[var(--accent-primary)]/30 text-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/10"
        >
          {auditLoading ? 'Auditing…' : 'Force Audit'}
        </button>
        <button
          onClick={runRepair}
          disabled={auditLoading || repairLoading}
          className="btn border-[var(--accent-secondary)]/30 text-[var(--accent-secondary)] hover:bg-[var(--accent-secondary)]/10"
        >
          {repairLoading ? 'Repairing…' : 'Force Repair'}
        </button>

        {error && (
          <span className="text-xs text-[var(--error)]">{error}</span>
        )}

        {auditResult && !error && (
          <span className="text-xs font-mono text-foreground-muted">
            Audit complete · score {auditResult.score}
            {auditResult.issues.length > 0 && ` · ${auditResult.issues.length} issue${auditResult.issues.length !== 1 ? 's' : ''}`}
          </span>
        )}

        {repairResult && !error && (
          <span className="text-xs font-mono text-foreground-muted">
            {repairResult.applied > 0
              ? `Repaired · ${repairResult.applied} applied`
              : 'No repairs needed'}
          </span>
        )}
      </div>

      {auditResult && auditResult.issues.length > 0 && (
        <div className="mt-3 space-y-1">
          {auditResult.issues.map((issue, i) => (
            <div key={i} className="text-[10px] font-mono">
              <span className={issue.severity === 'error' ? 'text-[var(--error)]' : 'text-[var(--warning)]'}>
                {issue.severity.toUpperCase()}
              </span>{' '}
              <span className="text-foreground-muted">{issue.message}</span>
            </div>
          ))}
        </div>
      )}
    </CommandPanel>
  );
}
