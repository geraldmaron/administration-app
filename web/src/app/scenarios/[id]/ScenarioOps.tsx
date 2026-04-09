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
    <CommandPanel tone="muted" className="p-4 md:p-5">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="mb-1.5 flex items-center gap-2">
              <span className="status-dot" />
              <span className="section-kicker">Maintenance</span>
            </div>
            <h2 className="text-sm font-semibold text-foreground">Scenario operations</h2>
            <p className="mt-1 max-w-2xl text-[12px] leading-5 text-foreground-muted">
              Run audit and repair utilities when this record needs verification or cleanup outside the normal reading flow.
            </p>
          </div>

          {(auditResult || repairResult) && !error && (
            <div className="flex flex-wrap gap-2 text-[10px] font-mono text-foreground-subtle">
              {auditResult && (
                <span className="rounded-[2px] border border-[var(--border)] px-2 py-0.5">
                  audit {auditResult.score}
                  {auditResult.issues.length > 0 && ` · ${auditResult.issues.length} issue${auditResult.issues.length !== 1 ? 's' : ''}`}
                </span>
              )}
              {repairResult && (
                <span className="rounded-[2px] border border-[var(--border)] px-2 py-0.5">
                  {repairResult.applied > 0 ? `${repairResult.applied} repair${repairResult.applied !== 1 ? 's' : ''} applied` : 'no repairs needed'}
                </span>
              )}
            </div>
          )}
        </div>

        {error && (
          <div className="rounded-[10px] border border-[var(--error)]/25 bg-[var(--error)]/6 px-3 py-2 text-xs text-[var(--error)]">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          <div className="control-surface p-4">
            <div className="section-kicker-sm mb-1">Audit</div>
            <p className="mb-3 text-[11px] leading-5 text-foreground-subtle">
              Re-run scenario validation and refresh the stored audit result for this record.
            </p>
            <button
              onClick={runAudit}
              disabled={auditLoading || repairLoading}
              className="btn border-[var(--accent-primary)]/30 text-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/10"
            >
              {auditLoading ? 'Auditing…' : 'Force Audit'}
            </button>
          </div>

          <div className="control-surface p-4">
            <div className="section-kicker-sm mb-1">Repair</div>
            <p className="mb-3 text-[11px] leading-5 text-foreground-subtle">
              Analyze the scenario for repairable issues and apply generated patches when changes are available.
            </p>
            <button
              onClick={runRepair}
              disabled={auditLoading || repairLoading}
              className="btn border-[var(--accent-secondary)]/30 text-[var(--accent-secondary)] hover:bg-[var(--accent-secondary)]/10"
            >
              {repairLoading ? 'Repairing…' : 'Force Repair'}
            </button>
          </div>
        </div>
      </div>

      {auditResult && auditResult.issues.length > 0 && (
        <div className="mt-4 border-t border-[var(--border)] pt-4">
          <div className="section-kicker-sm mb-2">Audit Issues</div>
          <div className="space-y-2">
            {auditResult.issues.map((issue, i) => (
              <div key={`${issue.rule}-${i}`} className="control-surface px-3 py-2 text-[10px] font-mono">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={issue.severity === 'error' ? 'text-[var(--error)]' : 'text-[var(--warning)]'}>
                    {issue.severity.toUpperCase()}
                  </span>
                  <span className="text-foreground-subtle">{issue.rule}</span>
                </div>
                <div className="mt-1 text-foreground-muted">{issue.message}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </CommandPanel>
  );
}
