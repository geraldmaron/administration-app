'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ALL_BUNDLES, ALL_REGIONS, BUNDLE_ACCENT_COLORS } from '@/lib/constants';
import type { CountrySummary, JobDetail, JobError } from '@/lib/types';
import BundleBadge from '@/components/BundleBadge';
import PageHeader from '@/components/PageHeader';

type TargetMode = 'all' | 'regions' | 'country';
type DistMode = 'auto' | 'fixed';
type Priority = 'low' | 'normal' | 'high';

function categorizeErrors(errors: JobError[]) {
  const dedupSkips = errors.filter((e) =>
    /duplicate_id|similar_content|similar/i.test(e.error)
  );
  const cooldownSkips = errors.filter(
    (e) => !!e.bundle && /cooldown/i.test(e.error)
  );
  const generationErrors = errors.filter(
    (e) =>
      !/duplicate_id|similar_content|similar/i.test(e.error) &&
      !(!!e.bundle && /cooldown/i.test(e.error))
  );
  return { generationErrors, dedupSkips, cooldownSkips };
}

function deriveDisplayStatus(job: JobDetail): string {
  if (job.status === 'running') return 'running';
  if (job.status === 'pending') return 'pending';
  if (job.status === 'failed') return 'failed';
  if (job.status === 'cancelled') return 'cancelled';

  const completed = job.completedCount ?? 0;
  const failed = job.failedCount ?? 0;

  if (failed === 0) return 'completed';

  const errors = job.errors ?? [];
  const { generationErrors } = categorizeErrors(errors);
  if (generationErrors.length === 0 && completed > 0) return 'remediated';

  const failureRate = failed / (completed + failed);
  if (completed > 0 && failureRate <= 0.5) return 'partial';
  return 'partial_failure';
}

const DS_STYLES: Record<string, { dot: string; text: string }> = {
  pending:         { dot: 'bg-[var(--info)]',                text: 'text-[var(--info)]' },
  running:         { dot: 'bg-[var(--accent-primary)]',      text: 'text-[var(--accent-primary)]' },
  completed:       { dot: 'bg-[var(--success)]',             text: 'text-[var(--success)]' },
  remediated:      { dot: 'bg-[var(--success)]',             text: 'text-[var(--success)]' },
  partial:         { dot: 'bg-[#f59e0b]',                    text: 'text-[#f59e0b]' },
  partial_failure: { dot: 'bg-[#f97316]',                    text: 'text-[#f97316]' },
  failed:          { dot: 'bg-[var(--error)]',               text: 'text-[var(--error)]' },
  cancelled:       { dot: 'bg-[var(--foreground-muted)]',    text: 'text-[var(--foreground-muted)]' },
};

const DS_LABELS: Record<string, string> = {
  running: 'RUNNING', pending: 'PENDING', completed: 'COMPLETED',
  remediated: 'REMEDIATED', partial: 'PARTIAL', partial_failure: 'PARTIAL FAILURE',
  failed: 'FAILED', cancelled: 'CANCELLED',
};

function JobProgressCard({ jobId }: { jobId: string }) {
  const [job, setJob] = useState<JobDetail | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const statusRef = useRef<string>('pending');

  const [elapsedMs, setElapsedMs] = useState<number | null>(null);

  useEffect(() => {
    const active = job?.status === 'running' || job?.status === 'pending';
    if (!job?.startedAt || !active) {
      setElapsedMs(null);
      return;
    }
    function tick() {
      setElapsedMs(Date.now() - new Date(job!.startedAt!).getTime());
    }
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [job?.startedAt, job?.status]);

  useEffect(() => {
    function poll() {
      fetch(`/api/jobs/${jobId}`)
        .then((r) => r.json())
        .then((data: JobDetail) => {
          setJob(data);
          const isActive = data.status === 'running' || data.status === 'pending';

          if (statusRef.current !== data.status && isActive && intervalRef.current) {
            clearInterval(intervalRef.current);
            const ms = data.status === 'running' ? 2000 : 3000;
            intervalRef.current = setInterval(poll, ms);
          }
          statusRef.current = data.status;

          if (!isActive && intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
        })
        .catch(() => undefined);
    }

    poll();
    intervalRef.current = setInterval(poll, 3000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [jobId]);

  if (!job) {
    return (
      <div className="animate-pulse space-y-2">
        <div className="h-3 bg-[var(--background-muted)] rounded w-1/4" />
        <div className="h-2 bg-[var(--background-muted)] rounded w-1/2" />
      </div>
    );
  }

  const ds = deriveDisplayStatus(job);
  const dsStyle = DS_STYLES[ds] ?? DS_STYLES.pending;
  const dsLabel = DS_LABELS[ds] ?? ds.toUpperCase();
  const total = job.total ?? job.count * job.bundles.length;
  const progress = job.progress ?? 0;
  const isActive = job.status === 'running' || job.status === 'pending';
  const isDone = !isActive;
  const isError = ds === 'failed' || ds === 'partial_failure';
  const autoFixedCount = (job.results ?? []).filter((r) => r.autoFixed).length;
  const recentErrors = (job.errors ?? []).slice(-10);
  const { generationErrors, dedupSkips } = categorizeErrors(recentErrors);

  return (
    <div className={isError ? 'text-[var(--error)]' : ''}>
      <div className="flex items-center gap-2 mb-3">
        <span className={`w-2 h-2 rounded-full shrink-0 ${dsStyle.dot} ${isActive ? 'animate-pulse' : ''}`} />
        <span className={`text-[10px] font-mono uppercase tracking-wider ${dsStyle.text}`}>{dsLabel}</span>
        <span className="text-[10px] font-mono text-[var(--foreground-subtle)] ml-auto">{job.id.slice(0, 12)}…</span>
      </div>

      {isActive && (
        <div className="mb-4">
          <div className="flex justify-between text-[10px] font-mono text-[var(--foreground-subtle)] mb-1">
            <span>
              {job.completedCount ?? 0} / {total} scenarios
              {(job.failedCount ?? 0) > 0 && (
                <span className="text-[#f97316] ml-2">· {job.failedCount} failed</span>
              )}
            </span>
            <span className="flex gap-2">
              {elapsedMs !== null && job.startedAt && (
                <span>{Math.floor(elapsedMs / 60000)}m {Math.floor((elapsedMs % 60000) / 1000)}s</span>
              )}
              <span>{Math.round(progress)}%</span>
            </span>
          </div>
          <div className="h-1.5 bg-[var(--background-muted)] overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-tertiary)] transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          {job.bundles.length > 1 && (() => {
            const perBundle: Record<string, number> = {};
            for (const b of job.bundles) perBundle[b] = 0;
            for (const r of job.results ?? []) perBundle[r.bundle] = (perBundle[r.bundle] ?? 0) + 1;
            return (
              <div className="mt-2 grid gap-1" style={{ gridTemplateColumns: `repeat(${Math.min(job.bundles.length, 3)}, minmax(0, 1fr))` }}>
                {job.bundles.map((bundleId) => {
                  const saved = perBundle[bundleId] ?? 0;
                  const label = ALL_BUNDLES.find((b) => b.id === bundleId)?.label ?? bundleId;
                  const done = saved >= job.count;
                  return (
                    <div key={bundleId} className="border border-[var(--border)] p-1.5">
                      <div className="text-[9px] font-mono text-foreground-subtle truncate">{label}</div>
                      <div className={`text-[10px] font-mono ${done ? 'text-[var(--success)]' : 'text-foreground-muted'}`}>
                        {saved}<span className="text-foreground-subtle">/{job.count}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      )}

      {isActive && recentErrors.length > 0 && (
        <div className="mb-4">
          <div className="text-[10px] font-mono uppercase tracking-wider text-[var(--foreground-subtle)] mb-1">Recent activity</div>
          <div className="max-h-[80px] overflow-y-auto space-y-0.5 border border-[var(--border)] bg-[var(--background)] p-2">
            {recentErrors.map((e, i) => {
              const isDedup = /duplicate_id|similar_content|similar/i.test(e.error);
              return (
                <div key={i} className={`text-[10px] font-mono ${isDedup ? 'text-[var(--foreground-subtle)]' : 'text-[var(--error)]'}`}>
                  {e.bundle && <span className="text-[var(--foreground-subtle)] mr-1">[{e.bundle}]</span>}
                  {e.error}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {isDone && (
        <div className="mb-4 text-xs font-mono space-y-1">
          <div>
            <span className="text-[var(--success)]">{job.completedCount ?? job.results?.length ?? 0} saved</span>
            {(job.failedCount ?? 0) > 0 && (
              <span className="text-[#f97316] ml-2">· {job.failedCount} failed</span>
            )}
            {job.auditSummary && (
              <span className="text-[var(--foreground-muted)] ml-2">· avg {job.auditSummary.avgScore}</span>
            )}
          </div>
          {autoFixedCount > 0 && (
            <div className="text-[var(--success)] text-[10px]">({autoFixedCount} remediated by LLM repair)</div>
          )}
        </div>
      )}

      {isDone && job.results && job.results.length > 0 && (
        <div className="mb-4">
          <div className="text-[10px] font-mono uppercase tracking-wider text-[var(--foreground-subtle)] mb-2">
            Results ({job.results.length})
          </div>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {job.results.map((r) => (
              <div key={r.id} className="flex items-center gap-2 text-xs font-mono hover:bg-[var(--background-muted)] px-2 py-1 -mx-2 transition-colors">
                <span className="text-[var(--foreground-subtle)] shrink-0">{r.id.slice(0, 8)}…</span>
                <span className="text-[var(--foreground)] flex-1 truncate">{r.title}</span>
                <BundleBadge bundle={r.bundle} />
                {r.auditScore !== undefined && (
                  <span className="text-[var(--foreground-subtle)] shrink-0">{r.auditScore}</span>
                )}
                {r.autoFixed && <span className="text-[var(--success)] text-[10px] shrink-0">✓</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {isDone && generationErrors.length > 0 && (
        <div className="mb-4">
          <div className="text-[10px] font-mono uppercase tracking-wider text-[var(--error)] mb-1">
            Errors ({generationErrors.length})
          </div>
          <div className="space-y-0.5">
            {generationErrors.map((e, i) => (
              <div key={i} className="text-[10px] font-mono text-[var(--error)]">
                {e.bundle && <span className="text-[var(--foreground-subtle)] mr-1">[{e.bundle}]</span>}
                {e.error}
              </div>
            ))}
          </div>
        </div>
      )}

      {isDone && dedupSkips.length > 0 && (
        <div className="mb-3">
          <div className="text-[10px] font-mono text-[var(--foreground-subtle)]">
            {dedupSkips.length} dedup/cooldown skips (expected)
          </div>
        </div>
      )}

      {job.error && <div className="text-xs font-mono text-[var(--error)] mb-3">{job.error}</div>}

      <div className="pt-3 border-t border-[var(--border)]">
        <Link
          href={`/jobs/${job.id}`}
          className="text-[10px] font-mono uppercase tracking-wider text-[var(--foreground-subtle)] hover:text-[var(--foreground)] transition-colors"
        >
          View full job →
        </Link>
      </div>
    </div>
  );
}

function SegmentedControl<T extends string | number>({
  options,
  value,
  onChange,
  labelMap,
}: {
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
  labelMap?: Partial<Record<string, string>>;
}) {
  return (
    <div className="flex border border-[var(--border-strong)] w-fit">
      {options.map((opt) => (
        <button
          key={String(opt)}
          type="button"
          onClick={() => onChange(opt)}
          className={`px-3 py-1.5 text-[10px] font-mono uppercase tracking-wide transition-colors border-r border-[var(--border-strong)] last:border-r-0 ${
            value === opt
              ? 'bg-[var(--accent-primary)] text-[var(--background)]'
              : 'bg-transparent text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[var(--background-muted)]'
          }`}
        >
          {labelMap?.[String(opt)] ?? String(opt)}
        </button>
      ))}
    </div>
  );
}

export default function GeneratePage() {
  const [selectedBundles, setSelectedBundles] = useState<Set<string>>(new Set());
  const [count, setCount] = useState(5);
  const [targetMode, setTargetMode] = useState<TargetMode>('all');
  const [selectedRegions, setSelectedRegions] = useState<Set<string>>(new Set());
  const [selectedCountry, setSelectedCountry] = useState('');
  const [distMode, setDistMode] = useState<DistMode>('auto');
  const [loopLength, setLoopLength] = useState<1 | 2 | 3>(1);
  const [priority, setPriority] = useState<Priority>('normal');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [countries, setCountries] = useState<CountrySummary[]>([]);
  const [useLMStudio, setUseLMStudio] = useState(false);
  const [lmModels, setLmModels] = useState<string[]>([]);
  const [lmConnected, setLmConnected] = useState(false);
  const [lmLoading, setLmLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState('');
  const [emulatorMode, setEmulatorMode] = useState(false);
  const [emulatorStatus, setEmulatorStatus] = useState<'unknown' | 'stopped' | 'starting' | 'ready' | 'error'>('unknown');
  const [emulatorStartError, setEmulatorStartError] = useState<string | null>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetch('/api/countries')
      .then((r) => r.json())
      .then((d: { countries: CountrySummary[] }) => setCountries(d.countries))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    fetch('/api/settings/lmstudio')
      .then((r) => r.json())
      .then((data: { connected: boolean; models: string[]; baseUrl: string; emulatorMode?: boolean }) => {
        setEmulatorMode(data.emulatorMode ?? false);
        setLmConnected(data.connected);
        setLmModels(data.models);
        if (data.models.length > 0) {
          setSelectedModel(data.models[0]);
        }
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!emulatorMode) setUseLMStudio(false);
  }, [emulatorMode]);

  useEffect(() => {
    fetch('/api/emulator')
      .then((r) => r.json())
      .then((d: { status: string; error?: string }) => {
        setEmulatorStatus(d.status as 'stopped' | 'starting' | 'ready' | 'error');
        if (d.error) setEmulatorStartError(d.error);
      })
      .catch(() => undefined);
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

  function toggleBundle(id: string) {
    setSelectedBundles((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleRegion(id: string) {
    setSelectedRegions((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function refreshLmStudio() {
    setLmLoading(true);
    fetch('/api/settings/lmstudio')
      .then((r) => r.json())
      .then((data: { connected: boolean; models: string[]; baseUrl: string }) => {
        setLmConnected(data.connected);
        setLmModels(data.models);
        if (data.models.length > 0) setSelectedModel(data.models[0]);
      })
      .catch(() => undefined)
      .finally(() => setLmLoading(false));
  }

  function pollEmulatorStatus() {
    let attempts = 0;
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    pollIntervalRef.current = setInterval(() => {
      attempts++;
      if (attempts > 60) {
        clearInterval(pollIntervalRef.current!);
        pollIntervalRef.current = null;
        setEmulatorStatus('error');
        setEmulatorStartError('Emulator did not start within 2 minutes');
        return;
      }
      fetch('/api/emulator')
        .then((r) => r.json())
        .then((d: { status: string; error?: string }) => {
          if (d.status === 'ready') {
            clearInterval(pollIntervalRef.current!);
            pollIntervalRef.current = null;
            setEmulatorStatus('ready');
            refreshLmStudio();
          } else if (d.status === 'error') {
            clearInterval(pollIntervalRef.current!);
            pollIntervalRef.current = null;
            setEmulatorStatus('error');
            setEmulatorStartError(d.error ?? 'Emulator failed to start');
          }
        })
        .catch(() => undefined);
    }, 2000);
  }

  async function startEmulator() {
    setEmulatorStatus('starting');
    setEmulatorStartError(null);
    try {
      const res = await fetch('/api/emulator', { method: 'POST' });
      const data = await res.json() as { status: string };
      if (data.status === 'ready') {
        setEmulatorStatus('ready');
        refreshLmStudio();
        return;
      }
      pollEmulatorStatus();
    } catch {
      setEmulatorStatus('error');
      setEmulatorStartError('Failed to start emulator');
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (selectedBundles.size === 0) {
      setSubmitError('Select at least one bundle');
      return;
    }
    if (count < 1 || count > 50) {
      setSubmitError('Count must be between 1 and 50');
      return;
    }
    if (useLMStudio && emulatorStatus !== 'ready') {
      setSubmitError('Firebase emulator is not ready — wait for it to start');
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    const body: Record<string, unknown> = {
      bundles: Array.from(selectedBundles),
      count,
      priority,
      distributionConfig: distMode === 'fixed' ? { mode: 'fixed', loopLength } : { mode: 'auto' },
      ...(description ? { description } : {}),
      ...(useLMStudio && selectedModel ? {
        modelConfig: {
          architectModel: `lmstudio:${selectedModel}`,
          drafterModel: `lmstudio:${selectedModel}`,
          repairModel: `lmstudio:${selectedModel}`,
          contentQualityModel: `lmstudio:${selectedModel}`,
          narrativeReviewModel: `lmstudio:${selectedModel}`,
        },
      } : {}),
    };

    if (targetMode === 'regions' && selectedRegions.size > 0) {
      body.regions = Array.from(selectedRegions);
    } else if (targetMode === 'country' && selectedCountry) {
      body.region = selectedCountry;
    }

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as { jobId?: string; error?: string };
      if (!res.ok) {
        setSubmitError(data.error ?? 'Failed to create job');
        return;
      }
      setJobId(data.jobId!);
    } catch {
      setSubmitError('Network error');
    } finally {
      setSubmitting(false);
    }
  }

  const expectedCount = selectedBundles.size * count;

  return (
    <div className="p-6 max-w-[1200px]">
      <PageHeader section="Generation" title="Generate Scenarios" />

      <form onSubmit={handleSubmit}>
        <div className="grid xl:grid-cols-[1fr_340px] gap-6 items-start">

          {/* LEFT — Configuration */}
          <div className="space-y-4">

            {/* Bundles */}
            <div className="tech-border bg-[var(--background-elevated)] p-5">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-mono uppercase tracking-widest text-[var(--foreground-subtle)]">
                  Bundles <span className="text-[var(--error)]">*</span>
                </span>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedBundles(new Set(ALL_BUNDLES.map((b) => b.id)))}
                    className="text-[10px] font-mono uppercase tracking-wider text-[var(--foreground-subtle)] hover:text-[var(--foreground)] transition-colors"
                  >
                    Select All
                  </button>
                  <span className="text-[var(--foreground-subtle)]">·</span>
                  <button
                    type="button"
                    onClick={() => setSelectedBundles(new Set())}
                    className="text-[10px] font-mono uppercase tracking-wider text-[var(--foreground-subtle)] hover:text-[var(--foreground)] transition-colors"
                  >
                    Clear
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {ALL_BUNDLES.map((bundle) => {
                  const selected = selectedBundles.has(bundle.id);
                  const color = BUNDLE_ACCENT_COLORS[bundle.id];
                  return (
                    <button
                      key={bundle.id}
                      type="button"
                      onClick={() => toggleBundle(bundle.id)}
                      className={`flex items-start gap-2 p-3 text-left transition-all rounded-[2px] ${
                        selected
                          ? 'border border-[var(--border-strong)]'
                          : 'border border-[var(--border)] hover:border-[var(--border-strong)] hover:bg-[var(--background-muted)]'
                      }`}
                      style={
                        selected
                          ? { borderLeft: `3px solid ${color}`, background: `${color}14` }
                          : undefined
                      }
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-mono font-medium text-[var(--foreground)]">{bundle.label}</span>
                          {bundle.id === 'dick_mode' && (
                            <span className="text-[9px] font-mono uppercase text-[var(--error)] border border-[var(--error)]/30 px-0.5">
                              Dark
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-[var(--foreground-subtle)] leading-tight mt-0.5">
                          {bundle.description}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Count */}
            <div className="tech-border bg-[var(--background-elevated)] p-5">
              <div className="text-[10px] font-mono uppercase tracking-widest text-[var(--foreground-subtle)] mb-4">
                Count per Bundle
              </div>
              <div className="flex items-center gap-6">
                <input
                  type="range"
                  min={1}
                  max={50}
                  value={count}
                  onChange={(e) => setCount(parseInt(e.target.value, 10))}
                  className="flex-1 accent-[var(--accent-primary)]"
                />
                <div className="text-right">
                  <span className="text-4xl font-mono font-bold text-[var(--foreground)]">{count}</span>
                  <div className="text-[10px] font-mono text-[var(--foreground-subtle)]">per bundle</div>
                </div>
              </div>
              {selectedBundles.size > 0 && (
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-xl font-mono font-bold text-[var(--accent-primary)]">{expectedCount}</span>
                  <span className="text-xs font-mono text-[var(--foreground-muted)]">
                    scenarios expected · {selectedBundles.size} bundles × {count}
                  </span>
                </div>
              )}
            </div>

            {/* Targeting */}
            <div className="tech-border bg-[var(--background-elevated)] p-5">
              <div className="text-[10px] font-mono uppercase tracking-widest text-[var(--foreground-subtle)] mb-4">
                Targeting
              </div>
              <div className="flex gap-0 border border-[var(--border-strong)] w-fit mb-4">
                {(['all', 'regions', 'country'] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setTargetMode(mode)}
                    className={`px-4 py-1.5 text-xs font-mono uppercase tracking-wide transition-colors border-r border-[var(--border-strong)] last:border-r-0 ${
                      targetMode === mode
                        ? 'bg-[var(--accent-primary)] text-[var(--background)]'
                        : 'bg-transparent text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[var(--background-muted)]'
                    }`}
                  >
                    {mode === 'all' ? 'All Regions' : mode}
                  </button>
                ))}
              </div>

              {targetMode === 'regions' && (
                <div className="grid grid-cols-3 gap-1.5">
                  {ALL_REGIONS.map((r) => {
                    const checked = selectedRegions.has(r.id);
                    return (
                      <label
                        key={r.id}
                        className={`flex items-center gap-1.5 px-2 py-1 cursor-pointer border rounded-[2px] text-xs transition-colors ${
                          checked
                            ? 'border-[var(--accent-primary)]/40 bg-[var(--accent-muted)] text-[var(--foreground)]'
                            : 'border-[var(--border)] text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[var(--background-muted)]'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleRegion(r.id)}
                          className="accent-[var(--accent-primary)]"
                        />
                        {r.label}
                      </label>
                    );
                  })}
                </div>
              )}

              {targetMode === 'country' && (
                <select
                  value={selectedCountry}
                  onChange={(e) => setSelectedCountry(e.target.value)}
                  className="w-full bg-[var(--background)] border border-[var(--border-strong)] text-[var(--foreground)] text-sm font-mono px-2 py-1.5 rounded-[2px] focus:outline-none focus:border-[var(--accent-primary)]"
                >
                  <option value="">— Select country —</option>
                  {countries.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.region})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Distribution */}
            <div className="tech-border bg-[var(--background-elevated)] p-5">
              <div className="text-[10px] font-mono uppercase tracking-widest text-[var(--foreground-subtle)] mb-4">
                Distribution Mode
              </div>
              <div className="flex gap-0 border border-[var(--border-strong)] w-fit mb-4">
                {(['auto', 'fixed'] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setDistMode(mode)}
                    className={`px-4 py-1.5 text-xs font-mono uppercase tracking-wide transition-colors border-r border-[var(--border-strong)] last:border-r-0 ${
                      distMode === mode
                        ? 'bg-[var(--accent-primary)] text-[var(--background)]'
                        : 'bg-transparent text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[var(--background-muted)]'
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>

              {distMode === 'fixed' && (
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono text-[var(--foreground-muted)]">Loop length:</span>
                  <div className="flex gap-0 border border-[var(--border-strong)] w-fit">
                    {([1, 2, 3] as const).map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setLoopLength(v)}
                        className={`px-4 py-1.5 text-xs font-mono uppercase tracking-wide transition-colors border-r border-[var(--border-strong)] last:border-r-0 ${
                          loopLength === v
                            ? 'bg-[var(--accent-primary)] text-[var(--background)]'
                            : 'bg-transparent text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[var(--background-muted)]'
                        }`}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Priority */}
            <div className="tech-border bg-[var(--background-elevated)] p-5">
              <div className="text-[10px] font-mono uppercase tracking-widest text-[var(--foreground-subtle)] mb-4">
                Priority
              </div>
              <div className="flex gap-0 border border-[var(--border-strong)] w-fit">
                {(['low', 'normal', 'high'] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriority(p)}
                    className={`px-4 py-1.5 text-xs font-mono uppercase tracking-wide transition-colors border-r border-[var(--border-strong)] last:border-r-0 ${
                      priority === p
                        ? 'bg-[var(--accent-primary)] text-[var(--background)]'
                        : 'bg-transparent text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[var(--background-muted)]'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div className="tech-border bg-[var(--background-elevated)] p-5">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-[10px] font-mono uppercase tracking-widest text-[var(--foreground-subtle)]">
                  Model Provider
                </span>
              </div>
              <SegmentedControl
                options={['openai', 'lmstudio'] as const}
                value={useLMStudio ? 'lmstudio' : 'openai'}
                onChange={(v) => {
                  const selecting = v === 'lmstudio';
                  setUseLMStudio(selecting);
                  if (selecting) startEmulator();
                }}
                labelMap={{ openai: 'OpenAI', lmstudio: 'LM Studio' }}
              />
              {useLMStudio && (
                <div className="mt-4">
                  {emulatorStatus === 'starting' ? (
                    <div className="text-[10px] font-mono text-[var(--foreground-subtle)]">Starting Firebase emulator…</div>
                  ) : emulatorStatus === 'error' ? (
                    <div className="text-[10px] font-mono text-[var(--error)]">
                      {emulatorStartError ?? 'Emulator failed to start'}
                    </div>
                  ) : lmLoading ? (
                    <div className="text-[10px] font-mono text-[var(--foreground-subtle)]">Checking connection…</div>
                  ) : !lmConnected ? (
                    <div className="text-[10px] font-mono text-[var(--warning)]">
                      LM Studio not reachable at localhost:1234
                    </div>
                  ) : lmModels.length === 0 ? (
                    <div className="text-[10px] font-mono text-[var(--foreground-subtle)]">
                      Connected — no models loaded
                    </div>
                  ) : (
                    <div>
                      <div className="text-[10px] font-mono text-[var(--foreground-subtle)] mb-1">Model</div>
                      <select
                        value={selectedModel}
                        onChange={(e) => setSelectedModel(e.target.value)}
                        className="w-full bg-[var(--background)] border border-[var(--border-strong)] text-[var(--foreground)] text-sm font-mono px-2 py-1.5 rounded-[2px] focus:outline-none focus:border-[var(--accent-primary)]"
                      >
                        {lmModels.map((m) => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                      <div className="text-[10px] font-mono text-[var(--foreground-subtle)] mt-2">
                        Local inference is sequential — expect 5–30 min per bundle
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Description */}
            <div className="tech-border bg-[var(--background-elevated)] p-5">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-[10px] font-mono uppercase tracking-widest text-[var(--foreground-subtle)]">
                  Description
                </span>
                <span className="text-[10px] font-mono text-[var(--foreground-subtle)]">(optional)</span>
              </div>
              <input
                type="text"
                maxLength={200}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of this generation run..."
                className="w-full bg-[var(--background)] border border-[var(--border-strong)] text-[var(--foreground)] text-sm font-mono px-2 py-1.5 rounded-[2px] focus:outline-none focus:border-[var(--accent-primary)] placeholder-[var(--foreground-subtle)]"
              />
              <div className="text-[10px] font-mono text-[var(--foreground-subtle)] mt-1 text-right">
                {description.length}/200
              </div>
            </div>
          </div>

          {/* RIGHT — Sticky mission brief */}
          <div className="self-start sticky top-6">
            <div className="tech-border bg-[var(--background-elevated)] p-5">
              <div className="text-[10px] font-mono uppercase tracking-widest text-[var(--foreground-subtle)] mb-4">
                Mission Brief
              </div>

              {selectedBundles.size === 0 ? (
                <div className="text-xs font-mono text-[var(--foreground-subtle)] py-2">
                  — select bundles to configure —
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <div className="text-[10px] font-mono uppercase tracking-wider text-[var(--foreground-subtle)] mb-1">
                      Scenarios
                    </div>
                    <div className="text-3xl font-mono font-bold text-[var(--accent-primary)] tabular-nums">
                      {expectedCount}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                    <div>
                      <div className="text-[10px] text-[var(--foreground-subtle)] uppercase tracking-wider mb-0.5">
                        Bundles
                      </div>
                      <div className="text-[var(--foreground)]">{selectedBundles.size}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-[var(--foreground-subtle)] uppercase tracking-wider mb-0.5">
                        Priority
                      </div>
                      <div className={priority === 'high' ? 'text-[var(--warning)]' : priority === 'low' ? 'text-[var(--foreground-muted)]' : 'text-[var(--foreground)]'}>
                        {priority.toUpperCase()}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-[var(--foreground-subtle)] uppercase tracking-wider mb-0.5">
                        Target
                      </div>
                      <div className="text-[var(--foreground)]">
                        {targetMode === 'all' ? 'All Regions' : targetMode}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-[var(--foreground-subtle)] uppercase tracking-wider mb-0.5">
                        Distribution
                      </div>
                      <div className="text-[var(--foreground)]">
                        {distMode === 'fixed' ? `Fixed ×${loopLength}` : 'Auto'}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-[var(--foreground-subtle)] uppercase tracking-wider mb-0.5">
                        Model
                      </div>
                      <div className="text-[var(--foreground)]">
                        {useLMStudio && selectedModel
                          ? `LM Studio (${selectedModel})`
                          : 'OpenAI (default)'}
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-[var(--border)] flex flex-wrap gap-1">
                    {Array.from(selectedBundles).map((id) => (
                      <BundleBadge key={id} bundle={id} />
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-6 pt-4 border-t border-[var(--border)]">
                {submitError && (
                  <div className="text-xs text-[var(--error)] font-mono mb-3">{submitError}</div>
                )}

                <button
                  type="submit"
                  disabled={submitting || selectedBundles.size === 0 || (useLMStudio && emulatorStatus === 'starting')}
                  className="btn btn-command w-full py-3 text-sm tracking-widest disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {submitting
                    ? '— CREATING JOB —'
                    : selectedBundles.size === 0
                    ? 'SELECT BUNDLES TO DEPLOY'
                    : `DEPLOY — ${expectedCount} SCENARIOS`}
                </button>
              </div>
            </div>

            {jobId && (
              <div className="mt-6">
                <div className="tech-border bg-[var(--background-elevated)] p-5">
                  <JobProgressCard jobId={jobId} />
                </div>
              </div>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
