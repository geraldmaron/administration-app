'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import BundleBadge from '@/components/BundleBadge';
import CommandPanel from '@/components/CommandPanel';
import DataStat from '@/components/DataStat';
import OperationsNav from '@/components/OperationsNav';
import ScreenHeader from '@/components/ScreenHeader';
import StatusBadge from '@/components/StatusBadge';
import { ALL_BUNDLES, ALL_REGIONS, BUNDLE_ACCENT_COLORS } from '@/lib/constants';
import type { CountrySummary, JobDetail } from '@/lib/types';

type TargetMode = 'all' | 'regions' | 'country';
type DistMode = 'auto' | 'fixed';
type Priority = 'low' | 'normal' | 'high';

interface BundleStat {
  id: string;
  total: number;
  active: number;
}

interface StatsResponse {
  bundles: BundleStat[];
}

function formatRuntime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  if (minutes === 0) return `${seconds}s`;
  return `${minutes}m ${seconds % 60}s`;
}

function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: ReadonlyArray<{ value: T; label: string }>;
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="inline-flex rounded-[12px] border border-[var(--border)] bg-[rgba(255,255,255,0.02)] p-1">
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`min-h-[40px] rounded-[10px] px-4 py-2 text-[11px] font-mono uppercase tracking-[0.18em] transition-colors ${
              active
                ? 'bg-[rgba(25,105,220,0.14)] text-foreground'
                : 'text-[var(--foreground-muted)] hover:bg-background-muted hover:text-foreground'
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function JobMonitor({ jobId }: { jobId: string }) {
  const [job, setJob] = useState<JobDetail | null>(null);
  const [elapsedMs, setElapsedMs] = useState<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    function poll() {
      fetch(`/api/jobs/${jobId}`)
        .then((response) => response.json())
        .then((data: JobDetail) => {
          setJob(data);
          const active = data.status === 'running' || data.status === 'pending' || data.status === 'pending_review';
          if (!active && intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
        })
        .catch(() => undefined);
    }

    poll();
    intervalRef.current = setInterval(poll, 2500);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [jobId]);

  useEffect(() => {
    if (!job?.startedAt || (job.status !== 'running' && job.status !== 'pending' && job.status !== 'pending_review')) {
      setElapsedMs(null);
      return;
    }

    const startedAt = job.startedAt;

    function tick() {
      setElapsedMs(Date.now() - new Date(startedAt).getTime());
    }

    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [job?.startedAt, job?.status]);

  if (!job) {
    return (
      <CommandPanel className="p-5">
        <div className="section-kicker mb-3">Active Submission</div>
        <div className="text-sm text-[var(--foreground-muted)]">Loading current job state…</div>
      </CommandPanel>
    );
  }

  const total = job.total ?? job.count * job.bundles.length;
  const completed = job.completedCount ?? 0;
  const failed = job.failedCount ?? 0;
  const progress = total > 0 ? Math.min(100, Math.round(((completed + failed) / total) * 100)) : 0;

  return (
    <CommandPanel className="p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <div className="section-kicker mb-2">Active Submission</div>
          <div className="text-lg font-semibold text-foreground">Job {job.id.slice(0, 8)}</div>
        </div>
        <StatusBadge status={job.status} pulse={job.status === 'running' || job.status === 'pending'} />
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3">
        <DataStat label="Processed" value={`${completed}/${total}`} accent="blue" />
        <DataStat label="Failed" value={failed} accent={failed > 0 ? 'warning' : undefined} />
      </div>

      <div className="mb-3 flex items-center justify-between text-[11px] font-mono uppercase tracking-[0.14em] text-[var(--foreground-subtle)]">
        <span>Progress</span>
        <span>{progress}%</span>
      </div>
      <div className="app-progress mb-4">
        <span style={{ width: `${progress}%` }} />
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {job.bundles.map((bundle) => (
          <BundleBadge key={bundle} bundle={bundle} />
        ))}
      </div>

      <div className="flex items-center justify-between text-xs text-[var(--foreground-muted)]">
        <span>{job.priority} priority</span>
        <span>{elapsedMs !== null ? formatRuntime(elapsedMs) : 'queued'}</span>
      </div>

      <div className="mt-4 flex flex-wrap gap-3 border-t border-[var(--border)] pt-4">
        <Link href={`/jobs/${job.id}`} className="btn btn-tactical">
          Open Job Dossier
        </Link>
        {job.status === 'pending_review' ? (
          <Link href={`/jobs/${job.id}/review`} className="btn btn-command">
            Review Scenarios
          </Link>
        ) : null}
      </div>
    </CommandPanel>
  );
}

export default function GeneratePage() {
  const [selectedBundles, setSelectedBundles] = useState<Set<string>>(new Set(['economy']));
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
  const [bundleCounts, setBundleCounts] = useState<Record<string, { total: number; active: number }>>({});
  const [dryRun, setDryRun] = useState(false);
  const [useLMStudio, setUseLMStudio] = useState(false);
  const [lmModels, setLmModels] = useState<string[]>([]);
  const [lmConnected, setLmConnected] = useState(false);
  const [lmLoading, setLmLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState('');
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetch('/api/countries')
      .then((response) => response.json())
      .then((data: { countries: CountrySummary[] }) => setCountries(data.countries))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    fetch('/api/stats')
      .then((response) => response.json())
      .then((data: StatsResponse) => {
        const next: Record<string, { total: number; active: number }> = {};
        for (const bundle of data.bundles ?? []) {
          next[bundle.id] = { total: bundle.total ?? 0, active: bundle.active ?? 0 };
        }
        setBundleCounts(next);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    fetch('/api/settings/lmstudio')
      .then((response) => response.json())
      .then((data: { connected: boolean; models: string[] }) => {
        setLmConnected(data.connected);
        setLmModels(data.models);
        if (data.models.length > 0) setSelectedModel(data.models[0]);
      })
      .catch(() => undefined);

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

  function refreshLmStudio() {
    setLmLoading(true);
    fetch('/api/settings/lmstudio')
      .then((response) => response.json())
      .then((data: { connected: boolean; models: string[] }) => {
        setLmConnected(data.connected);
        setLmModels(data.models);
        if (data.models.length > 0) setSelectedModel(data.models[0]);
      })
      .catch(() => undefined)
      .finally(() => setLmLoading(false));
  }

  function toggleBundle(id: string) {
    setSelectedBundles((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleRegion(id: string) {
    setSelectedRegions((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (selectedBundles.size === 0) {
      setSubmitError('Select at least one bundle.');
      return;
    }

    if (count < 1 || count > 50) {
      setSubmitError('Count must be between 1 and 50.');
      return;
    }

    if (targetMode === 'regions' && selectedRegions.size === 0) {
      setSubmitError('Pick at least one region or switch target mode.');
      return;
    }

    if (targetMode === 'country' && !selectedCountry) {
      setSubmitError('Pick a country or switch target mode.');
      return;
    }

    if (useLMStudio && !lmConnected) {
      setSubmitError('LM Studio is not reachable. Start LM Studio locally and refresh models before submitting.');
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
      ...(dryRun ? { dryRun: true } : {}),
      ...(useLMStudio && selectedModel
        ? {
            modelConfig: {
              architectModel: `lmstudio:${selectedModel}`,
              drafterModel: `lmstudio:${selectedModel}`,
              repairModel: `lmstudio:${selectedModel}`,
              contentQualityModel: `lmstudio:${selectedModel}`,
              narrativeReviewModel: `lmstudio:${selectedModel}`,
            },
          }
        : {}),
    };

    if (targetMode === 'regions') {
      body.regions = Array.from(selectedRegions);
    } else if (targetMode === 'country') {
      body.region = selectedCountry;
    }

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = (await response.json()) as { jobId?: string; error?: string };
      if (!response.ok) {
        setSubmitError(data.error ?? 'Failed to create job.');
        return;
      }

      setJobId(data.jobId ?? null);
    } catch {
      setSubmitError('Network error while creating the job.');
    } finally {
      setSubmitting(false);
    }
  }

  const expectedCount = selectedBundles.size * count;
  const selectedBundleData = ALL_BUNDLES.filter((bundle) => selectedBundles.has(bundle.id));
  const targetSummary =
    targetMode === 'all'
      ? 'Global pool'
      : targetMode === 'regions'
        ? `${selectedRegions.size || 0} region${selectedRegions.size === 1 ? '' : 's'} tagged`
        : selectedCountry || 'Single country target';

  const selectedCountrySummary = useMemo(
    () => countries.find((country) => country.id === selectedCountry),
    [countries, selectedCountry]
  );

  return (
    <div className="mx-auto max-w-[1600px]">
      <ScreenHeader
        section="Content Operations"
        title="Scenario Generation"
        subtitle="Compose a generation job as a single mission plan: choose bundle coverage, target scope, distribution profile, and provider routing, then monitor the job in the same command surface."
        eyebrow="Create"
        nav={<OperationsNav />}
        actions={
          <>
            <Link href="/jobs" className="btn btn-ghost">
              Review Queue
            </Link>
            <Link href="/scenarios" className="btn btn-tactical">
              Open Library
            </Link>
          </>
        }
      />

      <div className="mb-6 grid gap-4 lg:grid-cols-4">
        <DataStat label="Bundle Targets" value={selectedBundles.size} detail="Selected content domains" accent="blue" />
        <DataStat label="Scenario Output" value={expectedCount || 0} detail={`${count} per bundle`} accent="gold" />
        <DataStat label="Target Scope" value={targetSummary} detail={targetMode === 'country' && selectedCountrySummary ? selectedCountrySummary.name : 'Route definition'} />
        <DataStat label="Provider Path" value={useLMStudio ? 'LM Studio' : 'Default stack'} detail={useLMStudio ? `${selectedModel || 'model pending'} · ${lmConnected ? 'connected' : 'unreachable'}` : 'standard generation route'} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_420px]">
        <form onSubmit={handleSubmit} className="space-y-6">
          <CommandPanel className="p-5 md:p-6">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <div className="section-kicker mb-2">Bundle Selection</div>
                <h2 className="text-xl font-semibold text-foreground">Mission Coverage</h2>
              </div>
              <div className="text-xs text-[var(--foreground-muted)]">Pick one or more content lanes.</div>
            </div>

            <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
              {ALL_BUNDLES.map((bundle) => {
                const active = selectedBundles.has(bundle.id);
                const counts = bundleCounts[bundle.id];
                return (
                  <button
                    key={bundle.id}
                    type="button"
                    onClick={() => toggleBundle(bundle.id)}
                    className={`rounded-[var(--radius-tight)] border p-4 text-left transition-colors ${
                      active
                        ? 'border-[var(--accent-primary)] bg-[rgba(25,105,220,0.12)]'
                        : 'border-[var(--border)] bg-[rgba(255,255,255,0.02)] hover:border-[var(--border-strong)] hover:bg-[rgba(255,255,255,0.03)]'
                    }`}
                    style={{ boxShadow: active ? `inset 3px 0 0 ${BUNDLE_ACCENT_COLORS[bundle.id]}` : undefined }}
                  >
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-foreground">{bundle.label}</div>
                        <div className="mt-1 text-[11px] font-mono uppercase tracking-[0.14em] text-[var(--foreground-subtle)]">
                          {counts ? `${counts.total} total · ${counts.active} active` : 'count loading'}
                        </div>
                      </div>
                      <span
                        className={`h-2.5 w-2.5 rounded-full ${active ? 'bg-[var(--accent-secondary)]' : 'bg-[var(--foreground-subtle)]'}`}
                      />
                    </div>
                    <p className="text-sm leading-6 text-[var(--foreground-muted)]">{bundle.description}</p>
                  </button>
                );
              })}
            </div>
          </CommandPanel>

          <CommandPanel className="p-5 md:p-6">
            <div className="mb-5">
              <div className="section-kicker mb-2">Targeting</div>
              <h2 className="text-xl font-semibold text-foreground">Scope Control</h2>
            </div>

            <div className="mb-5">
              <SegmentedControl
                value={targetMode}
                onChange={setTargetMode}
                options={[
                  { value: 'all', label: 'All' },
                  { value: 'regions', label: 'Regions' },
                  { value: 'country', label: 'Country' },
                ]}
              />
            </div>

            {targetMode === 'regions' ? (
              <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                {ALL_REGIONS.map((region) => {
                  const active = selectedRegions.has(region.id);
                  return (
                    <button
                      key={region.id}
                      type="button"
                      onClick={() => toggleRegion(region.id)}
                      className={`rounded-[var(--radius-tight)] border px-4 py-3 text-left text-sm transition-colors ${
                        active
                          ? 'border-[var(--accent-secondary)] bg-[rgba(212,170,44,0.1)] text-foreground'
                          : 'border-[var(--border)] text-[var(--foreground-muted)] hover:border-[var(--border-strong)] hover:text-foreground'
                      }`}
                    >
                      {region.label}
                    </button>
                  );
                })}
              </div>
            ) : null}

            {targetMode === 'country' ? (
              <div>
                <label className="section-kicker mb-2 block">Country Target</label>
                <select
                  value={selectedCountry}
                  onChange={(event) => setSelectedCountry(event.target.value)}
                  className="input-shell"
                >
                  <option value="">Select a country</option>
                  {countries.map((country) => (
                    <option key={country.id} value={country.id}>
                      {country.name} · {country.region}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
          </CommandPanel>

          <div className="grid gap-6 lg:grid-cols-2">
            <CommandPanel className="p-5 md:p-6">
              <div className="mb-5">
                <div className="section-kicker mb-2">Distribution</div>
                <h2 className="text-xl font-semibold text-foreground">Pacing Profile</h2>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="section-kicker mb-2 block">Scenarios Per Bundle</label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={count}
                    onChange={(event) => setCount(Number(event.target.value))}
                    className="input-shell"
                  />
                </div>

                <div>
                  <label className="section-kicker mb-2 block">Distribution Mode</label>
                  <SegmentedControl
                    value={distMode}
                    onChange={setDistMode}
                    options={[
                      { value: 'auto', label: 'Auto' },
                      { value: 'fixed', label: 'Fixed' },
                    ]}
                  />
                </div>

                {distMode === 'fixed' ? (
                  <div>
                    <label className="section-kicker mb-2 block">Loop Length</label>
                    <SegmentedControl
                      value={String(loopLength) as '1' | '2' | '3'}
                      onChange={(value) => setLoopLength(Number(value) as 1 | 2 | 3)}
                      options={[
                        { value: '1', label: '1' },
                        { value: '2', label: '2' },
                        { value: '3', label: '3' },
                      ]}
                    />
                  </div>
                ) : null}

                <div>
                  <label className="section-kicker mb-2 block">Priority</label>
                  <SegmentedControl
                    value={priority}
                    onChange={setPriority}
                    options={[
                      { value: 'low', label: 'Low' },
                      { value: 'normal', label: 'Normal' },
                      { value: 'high', label: 'High' },
                    ]}
                  />
                </div>
              </div>
            </CommandPanel>

            <CommandPanel className="p-5 md:p-6">
              <div className="mb-5">
                <div className="section-kicker mb-2">Provider Routing</div>
                <h2 className="text-xl font-semibold text-foreground">Execution Path</h2>
              </div>

              <div className="space-y-5">
                <div className="flex items-center justify-between gap-4 rounded-[var(--radius-tight)] border border-[var(--border)] px-4 py-3">
                  <div>
                    <div className="text-sm font-medium text-foreground">LM Studio local model</div>
                    <div className="text-xs text-[var(--foreground-muted)]">
                      Route generation through a local LM Studio model. Requires the Firebase emulator running locally — generation in deployed Cloud Functions cannot reach localhost.
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setUseLMStudio((value) => !value)}
                    className={`rounded-full border px-3 py-2 text-[10px] font-mono uppercase tracking-[0.18em] ${
                      useLMStudio
                        ? 'border-[var(--accent-secondary)] bg-[rgba(212,170,44,0.12)] text-foreground'
                        : 'border-[var(--border)] text-[var(--foreground-muted)]'
                    }`}
                  >
                    {useLMStudio ? 'Enabled' : 'Disabled'}
                  </button>
                </div>

                <div className="rounded-[var(--radius-tight)] border border-[var(--border)] px-4 py-3">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <span className="section-kicker">LM Studio Status</span>
                    <StatusBadge status={lmConnected ? 'completed' : 'pending'} />
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <button type="button" onClick={refreshLmStudio} className="btn btn-ghost" disabled={lmLoading}>
                      {lmLoading ? 'Refreshing…' : 'Refresh Models'}
                    </button>
                    <span className="text-xs text-[var(--foreground-muted)]">
                      {lmConnected ? `${lmModels.length} model${lmModels.length === 1 ? '' : 's'} available` : 'Not reachable at localhost:1234'}
                    </span>
                  </div>
                </div>

                {useLMStudio ? (
                  <div>
                    <label className="section-kicker mb-2 block">Local Model</label>
                    <select
                      value={selectedModel}
                      onChange={(event) => setSelectedModel(event.target.value)}
                      className="input-shell"
                    >
                      <option value="">Select a model</option>
                      {lmModels.map((model) => (
                        <option key={model} value={model}>
                          {model}
                        </option>
                      ))}
                    </select>
                    {lmModels.length === 0 ? (
                      <div className="mt-2 text-xs text-[var(--warning)]">
                        No models found. Start LM Studio, load a model, then click Refresh Models.
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </CommandPanel>
          </div>

          <CommandPanel className="p-5 md:p-6">
            <div className="mb-4">
              <div className="section-kicker mb-2">Mission Note</div>
              <h2 className="text-xl font-semibold text-foreground">Instruction Overlay</h2>
            </div>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Optional guidance for this run: editorial focus, current event framing, excluded topics, or pacing instructions."
              rows={5}
              className="input-shell resize-y"
            />
          </CommandPanel>

          <CommandPanel className="p-5 md:p-6">
            <div className="mb-4">
              <div className="section-kicker mb-2">Output Mode</div>
              <h2 className="text-xl font-semibold text-foreground">Dry Run</h2>
            </div>
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-sm font-medium text-foreground">Hold for review before saving</div>
                <div className="text-xs text-[var(--foreground-muted)]">
                  Generate scenarios but stage them in a review queue. Accept or reject each one before they enter the library.
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDryRun((v) => !v)}
                className={`rounded-full border px-3 py-2 text-[10px] font-mono uppercase tracking-[0.18em] ${
                  dryRun
                    ? 'border-[var(--accent-secondary)] bg-[rgba(212,170,44,0.12)] text-foreground'
                    : 'border-[var(--border)] text-[var(--foreground-muted)]'
                }`}
              >
                {dryRun ? 'On' : 'Off'}
              </button>
            </div>
          </CommandPanel>

          {submitError ? (
            <CommandPanel tone="danger" className="p-4 text-sm text-[var(--error)]">
              {submitError}
            </CommandPanel>
          ) : null}

          <div className="flex flex-wrap items-center gap-3">
            <button type="submit" className="btn btn-command" disabled={submitting}>
              {submitting ? 'Submitting Mission…' : dryRun ? 'Launch Dry Run' : 'Launch Generation Job'}
            </button>
            <Link href="/jobs" className="btn btn-ghost">
              Open Job Queue
            </Link>
          </div>
        </form>

        <div className="space-y-6 xl:sticky xl:top-6 xl:self-start">
          <CommandPanel className="p-5 md:p-6">
            <div className="mb-5">
              <div className="section-kicker mb-2">Mission Brief</div>
              <h2 className="text-xl font-semibold text-foreground">Current Submission</h2>
            </div>

            <div className="mb-5 flex flex-wrap gap-2">
              {selectedBundleData.length > 0 ? (
                selectedBundleData.map((bundle) => <BundleBadge key={bundle.id} bundle={bundle.id} />)
              ) : (
                <span className="text-sm text-[var(--foreground-muted)]">No bundles selected.</span>
              )}
            </div>

            <div className="space-y-4 text-sm text-[var(--foreground-muted)]">
              <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] pb-3">
                <span>Targeting</span>
                <span className="data-value text-foreground">{targetSummary}</span>
              </div>
              <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] pb-3">
                <span>Distribution</span>
                <span className="data-value text-foreground">{distMode === 'fixed' ? `Fixed loop ${loopLength}` : 'Auto'}</span>
              </div>
              <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] pb-3">
                <span>Priority</span>
                <span className="data-value text-foreground">{priority}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span>Provider</span>
                <span className="data-value text-foreground">{useLMStudio ? selectedModel || 'LM Studio' : 'Default'}</span>
              </div>
            </div>

            {description ? (
              <div className="mt-5 rounded-[var(--radius-tight)] border border-[var(--border)] bg-[rgba(255,255,255,0.02)] px-4 py-3 text-sm leading-6 text-[var(--foreground-muted)]">
                {description}
              </div>
            ) : null}
          </CommandPanel>

          {jobId ? <JobMonitor jobId={jobId} /> : null}

          <CommandPanel className="p-5 md:p-6">
            <div className="mb-4">
              <div className="section-kicker mb-2">Readiness</div>
              <h2 className="text-xl font-semibold text-foreground">Launch Gate</h2>
            </div>
            <div className="space-y-3 text-sm text-[var(--foreground-muted)]">
              <div className="flex items-center justify-between gap-3 rounded-[var(--radius-tight)] border border-[var(--border)] px-4 py-3">
                <span>Bundle selection</span>
                <span className={`data-value ${selectedBundles.size > 0 ? 'text-[var(--success)]' : 'text-[var(--warning)]'}`}>
                  {selectedBundles.size > 0 ? 'ready' : 'missing'}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-[var(--radius-tight)] border border-[var(--border)] px-4 py-3">
                <span>Target scope</span>
                <span className={`data-value ${(targetMode === 'all' || (targetMode === 'regions' && selectedRegions.size > 0) || (targetMode === 'country' && selectedCountry)) ? 'text-[var(--success)]' : 'text-[var(--warning)]'}`}>
                  {(targetMode === 'all' || (targetMode === 'regions' && selectedRegions.size > 0) || (targetMode === 'country' && selectedCountry)) ? 'ready' : 'incomplete'}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-[var(--radius-tight)] border border-[var(--border)] px-4 py-3">
                <span>Local routing</span>
                <span className={`data-value ${!useLMStudio || lmConnected ? 'text-[var(--success)]' : 'text-[var(--warning)]'}`}>
                  {!useLMStudio ? 'default' : lmConnected ? 'ready' : 'unreachable'}
                </span>
              </div>
            </div>
          </CommandPanel>
        </div>
      </div>
    </div>
  );
}