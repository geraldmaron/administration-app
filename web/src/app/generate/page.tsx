'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import BundleBadge from '@/components/BundleBadge';
import CommandPanel from '@/components/CommandPanel';
import DataStat from '@/components/DataStat';
import OperationsNav from '@/components/OperationsNav';
import ScreenHeader from '@/components/ScreenHeader';
import StatusBadge from '@/components/StatusBadge';
import { buildManualGenerationRequests, buildNewsGenerationRequests, countExpectedScenarios } from '@/lib/generation-request';
import { ALL_BUNDLES, ALL_REGIONS, BUNDLE_ACCENT_COLORS } from '@/lib/constants';
import { buildOllamaModelConfig } from '@/lib/generation-models';
import { SCOPE_TIER_RATIOS } from '@/lib/blitz-planner';
import type { DeficitCell, TierAllocation } from '@/lib/blitz-planner';
import type { ArticleClassification, CountrySummary, JobDetail, NewsArticle, ScenarioExclusivityReason, GenerationJobRequest } from '@/lib/types';

type GenerationMode = 'manual' | 'news' | 'blitz';
type TargetMode = 'all' | 'regions' | 'country';
type StoryMode = 'standalone' | 'two-part' | 'three-part';
type Priority = 'low' | 'normal' | 'high';
type ExecutionTarget = 'cloud_function' | 'n8n';

const EXCLUSIVITY_REASON_OPTIONS: Array<{ value: ScenarioExclusivityReason; label: string; description: string }> = [
  { value: 'constitution', label: 'Constitution', description: 'Use for constitutional rules, succession, or mandate structures.' },
  { value: 'historical', label: 'Historical', description: 'Use for history-bound events or settlements that do not generalize.' },
  { value: 'bilateral_dispute', label: 'Bilateral Dispute', description: 'Use for disputes that only exist between specific countries.' },
  { value: 'unique_institution', label: 'Institution', description: 'Use for country-specific institutional structures.' },
  { value: 'unique_military_doctrine', label: 'Military Doctrine', description: 'Use for country-specific force posture or doctrine.' },
];

interface BundleStat { id: string; total: number; active: number; }
interface StatsResponse { bundles: BundleStat[]; }

const STORY_MODE_DIST: Record<StoryMode, { mode: 'auto' | 'fixed'; loopLength?: 1 | 2 | 3 }> = {
  standalone:    { mode: 'auto' },
  'two-part':    { mode: 'fixed', loopLength: 2 },
  'three-part':  { mode: 'fixed', loopLength: 3 },
};

const STORY_MODE_LABELS: Record<StoryMode, string> = {
  standalone:   'Standalone',
  'two-part':   '2-Part Arc',
  'three-part': '3-Part Arc',
};

const STORY_MODE_DESCRIPTIONS: Record<StoryMode, string> = {
  standalone:   'Each scenario is a self-contained event — one decision, immediate consequences.',
  'two-part':   'Paired scenarios — a crisis onset followed by its escalation or resolution.',
  'three-part': 'Full narrative chain — onset, escalation, and conclusion. Richest content; takes longer to generate.',
};

const PRIORITY_DESCRIPTIONS: Record<Priority, string> = {
  low:    'Yields to normal and high jobs already in queue.',
  normal: 'Standard queue position.',
  high:   'Processed ahead of normal and low priority jobs.',
};

function formatRuntime(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return m === 0 ? `${s}s` : `${m}m ${s % 60}s`;
}

function formatScopeLabel(scopeKey?: string): string {
  if (!scopeKey || scopeKey === 'universal') return 'Universal';
  if (scopeKey.startsWith('region:')) {
    return scopeKey.slice(7).replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }
  if (scopeKey.startsWith('country:')) return scopeKey.slice(8).toUpperCase();
  if (scopeKey.startsWith('cluster:')) {
    return scopeKey.slice(8).replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }
  return scopeKey;
}

function formatPubDate(pubDate: string): string {
  if (!pubDate) return '';
  try {
    const d = new Date(pubDate);
    const diff = Date.now() - d.getTime();
    const h = Math.floor(diff / 3600000);
    if (h < 1) return 'just now';
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  } catch { return ''; }
}

function SegmentedControl<T extends string>({
  options, value, onChange,
}: {
  options: ReadonlyArray<{ value: T; label: string }>;
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="inline-flex rounded-[12px] border border-[var(--border)] bg-[rgba(255,255,255,0.02)] p-1">
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button key={opt.value} type="button" onClick={() => onChange(opt.value)}
            className={`min-h-[40px] rounded-[10px] px-4 py-2 text-xs font-medium transition-colors ${
              active ? 'bg-[var(--accent-muted)] text-foreground' : 'text-[var(--foreground-muted)] hover:bg-[rgba(255,255,255,0.04)] hover:text-foreground'
            }`}>
            {opt.label}
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
      fetch(`/api/jobs/${jobId}`).then((r) => r.json()).then((data: JobDetail) => {
        setJob(data);
        const active = data.status === 'running' || data.status === 'pending' || data.status === 'pending_review';
        if (!active && intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
      }).catch(() => undefined);
    }
    poll();
    intervalRef.current = setInterval(poll, 2500);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [jobId]);

  useEffect(() => {
    if (!job?.startedAt || (job.status !== 'running' && job.status !== 'pending' && job.status !== 'pending_review')) {
      setElapsedMs(null); return;
    }
    const startedAt = job.startedAt;
    function tick() { setElapsedMs(Date.now() - new Date(startedAt).getTime()); }
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [job?.startedAt, job?.status]);

  if (!job) return (
    <CommandPanel className="p-5">
      <div className="section-kicker mb-3">Active Job</div>
      <div className="text-sm text-[var(--foreground-muted)]">Loading job state…</div>
    </CommandPanel>
  );

  const total = job.total ?? job.count * job.bundles.length;
  const completed = job.completedCount ?? 0;
  const failed = job.failedCount ?? 0;
  const progress = total > 0 ? Math.min(100, Math.round(((completed + failed) / total) * 100)) : 0;

  return (
    <CommandPanel className="p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <div className="section-kicker mb-2">Active Job</div>
          <div className="text-lg font-semibold text-foreground">Job {job.id.slice(0, 8)}</div>
        </div>
        <StatusBadge status={job.status} pulse={job.status === 'running' || job.status === 'pending'} />
      </div>
      <div className="mb-3 grid grid-cols-2 gap-2">
        <DataStat size="compact" label="Processed" value={`${completed}/${total}`} accent="blue" />
        <DataStat size="compact" label="Failed" value={failed} accent={failed > 0 ? 'warning' : undefined} />
      </div>
      <div className="mb-3 flex items-center justify-between text-xs font-medium text-[var(--foreground-subtle)]">
        <span>Progress</span><span>{progress}%</span>
      </div>
      <div className="app-progress mb-4"><span style={{ width: `${progress}%` }} /></div>
      <div className="mb-4 flex flex-wrap gap-2">
        {job.bundles.map((b) => <BundleBadge key={b} bundle={b} />)}
      </div>
      <div className="flex items-center justify-between text-xs text-[var(--foreground-muted)]">
        <span>{job.priority} priority</span>
        <span>{elapsedMs !== null ? formatRuntime(elapsedMs) : 'queued'}</span>
      </div>
      <div className="mt-4 flex flex-wrap gap-3 border-t border-[var(--border)] pt-4">
        <Link href={`/jobs/${job.id}`} className="btn btn-tactical">Open Job Details</Link>
        {job.status === 'pending_review' && (
          <Link href={`/jobs/${job.id}/review`} className="btn btn-command">Review Scenarios</Link>
        )}
      </div>
    </CommandPanel>
  );
}

export default function GeneratePage() {
  // — shared state
  const [generationMode, setGenerationMode] = useState<GenerationMode>('manual');
  const [storyMode, setStoryMode] = useState<StoryMode>('standalone');
  const [priority, setPriority] = useState<Priority>('normal');
  const [description, setDescription] = useState('');
  const [stageForReview, setStageForReview] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [bundleCounts, setBundleCounts] = useState<Record<string, { total: number; active: number }>>({});
  const [newsContextEnabled, setNewsContextEnabled] = useState(false);

  // — manual mode state
  const [selectedBundles, setSelectedBundles] = useState<Set<string>>(new Set(['economy']));
  const [count, setCount] = useState(1);
  const [targetMode, setTargetMode] = useState<TargetMode>('all');
  const [selectedRegions, setSelectedRegions] = useState<Set<string>>(new Set());
  const [selectedCountry, setSelectedCountry] = useState('');
  const [exclusivityReason, setExclusivityReason] = useState<ScenarioExclusivityReason>('unique_institution');
  const [countries, setCountries] = useState<CountrySummary[]>([]);

  // — news mode state
  const [newsLoadCount, setNewsLoadCount] = useState(20);
  const [newsArticles, setNewsArticles] = useState<NewsArticle[]>([]);
  const [newsLoading, setNewsLoading] = useState(false);
  const [newsError, setNewsError] = useState<string | null>(null);
  const [selectedArticleIds, setSelectedArticleIds] = useState<Set<number>>(new Set());
  const [classifying, setClassifying] = useState(false);
  const [classifyError, setClassifyError] = useState<string | null>(null);
  const [classifications, setClassifications] = useState<ArticleClassification[]>([]);
  const [bundleOverrides, setBundleOverrides] = useState<Record<number, string>>({});
  const [newsCount, setNewsCount] = useState(1);
  const [sortColumn, setSortColumn] = useState<'name' | 'total' | 'active'>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [executionTarget, setExecutionTarget] = useState<ExecutionTarget>('n8n');
  const [modelSource, setModelSource] = useState<'local' | 'cloud'>('local');
  const [ollamaModels, setOllamaModels] = useState<string[]>([]);
  const [ollamaConnected, setOllamaConnected] = useState(false);

  // — blitz mode state
  const [blitzLoading, setBlitzLoading] = useState(false);
  const [blitzDeficits, setBlitzDeficits] = useState<DeficitCell[]>([]);
  const [blitzAllocation, setBlitzAllocation] = useState<TierAllocation | null>(null);
  const [blitzPlannedJobs, setBlitzPlannedJobs] = useState<GenerationJobRequest[]>([]);
  const [blitzSummary, setBlitzSummary] = useState<{ totalRequested: number; totalDeficit: number; jobsToCreate: number; scenariosToGenerate: number; availableSlots: number } | null>(null);
  const [blitzJobIds, setBlitzJobIds] = useState<string[]>([]);
  const [blitzGuidance, setBlitzGuidance] = useState('');
  const [blitzCountRaw, setBlitzCountRaw] = useState('24');
  const blitzTotalScenarios = Math.min(200, Math.max(0, parseInt(blitzCountRaw, 10) || 0));
  const blitzCountValid = blitzTotalScenarios >= 1;

  useEffect(() => {
    fetch('/api/countries').then((r) => r.json())
      .then((d: { countries: CountrySummary[] }) => setCountries(d.countries))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    fetch('/api/stats').then((r) => r.json())
      .then((d: StatsResponse) => {
        const next: Record<string, { total: number; active: number }> = {};
        for (const b of d.bundles ?? []) next[b.id] = { total: b.total ?? 0, active: b.active ?? 0 };
        setBundleCounts(next);
      }).catch(() => undefined);
  }, []);

  useEffect(() => {
    fetch('/api/settings/ollama').then((r) => r.json())
      .then((d: { connected: boolean; models: string[] }) => {
        setOllamaConnected(d.connected);
        setOllamaModels(d.models);
      })
      .catch(() => undefined);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchBlitzPreview(totalOverride?: number) {
    const totalScenarios = totalOverride ?? blitzTotalScenarios;
    setBlitzLoading(true);
    try {
      const res = await fetch(`/api/blitz?totalScenarios=${totalScenarios}`);
      const data = await res.json();
      if (!res.ok) { setSubmitError(data.error ?? 'Failed to load blitz preview'); return; }
      setBlitzDeficits(data.deficits ?? []);
      setBlitzAllocation(data.allocation ?? null);
      setBlitzPlannedJobs(data.plannedJobs ?? []);
      setBlitzSummary(data.summary ?? null);
    } catch {
      setSubmitError('Network error loading blitz preview.');
    } finally {
      setBlitzLoading(false);
    }
  }

  useEffect(() => {
    if (generationMode === 'blitz' && !blitzAllocation && !blitzLoading) {
      fetchBlitzPreview();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [generationMode]);

  async function handleBlitzExecute() {
    setSubmitting(true);
    setSubmitError(null);
    setBlitzJobIds([]);
    try {
      const res = await fetch('/api/blitz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ totalScenarios: blitzTotalScenarios, executionTarget: activeExecutionTarget, ...(blitzGuidance.trim() ? { description: blitzGuidance.trim() } : {}), ...(activeModelConfig ? { modelConfig: activeModelConfig } : {}) }),
      });
      const data = await res.json();
      if (!res.ok) { setSubmitError(data.error ?? 'Failed to execute blitz'); return; }
      setBlitzJobIds(data.jobIds ?? []);
      if (data.jobIds?.length > 0) setJobId(data.jobIds[0]);
    } catch (err) {
      console.error('[generate] blitz execute error:', err);
      setSubmitError('Network error executing blitz.');
    } finally {
      setSubmitting(false);
    }
  }

  function toggleBundle(id: string) {
    setSelectedBundles((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }
  function toggleRegion(id: string) {
    setSelectedRegions((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }
  function toggleArticle(idx: number) {
    setSelectedArticleIds((prev) => { const n = new Set(prev); n.has(idx) ? n.delete(idx) : n.add(idx); return n; });
  }

  function handleSortColumn(col: 'name' | 'total' | 'active') {
    if (sortColumn === col) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumn(col);
      setSortDirection('asc');
    }
  }

  const sortedBundles = useMemo(() => {
    return [...ALL_BUNDLES].sort((a, b) => {
      let cmp: number;
      if (sortColumn === 'name') {
        cmp = a.label.localeCompare(b.label);
      } else if (sortColumn === 'total') {
        cmp = (bundleCounts[a.id]?.total ?? 0) - (bundleCounts[b.id]?.total ?? 0);
      } else {
        cmp = (bundleCounts[a.id]?.active ?? 0) - (bundleCounts[b.id]?.active ?? 0);
      }
      return sortDirection === 'asc' ? cmp : -cmp;
    });
  }, [sortColumn, sortDirection, bundleCounts]);

  const newsCountByBundle = useMemo(() => {
    const result: Record<string, number> = {};
    for (const c of classifications) {
      const b = bundleOverrides[c.articleIndex] ?? c.bundle;
      if (b) result[b] = (result[b] ?? 0) + 1;
    }
    return result;
  }, [classifications, bundleOverrides]);

  // After classification, filter article list to only show articles classified to a selected bundle.
  // Before classification, show all articles (null = no filter).
  const visibleArticleIndices = useMemo<Set<number> | null>(() => {
    if (classifications.length === 0 || selectedBundles.size === 0) return null;
    const visible = new Set<number>();
    for (const c of classifications) {
      const b = bundleOverrides[c.articleIndex] ?? c.bundle;
      if (selectedBundles.has(b)) visible.add(c.articleIndex);
    }
    return visible;
  }, [classifications, selectedBundles, bundleOverrides]);

  const ollamaModelConfig = useMemo(() => {
    if (ollamaModels.length === 0) return undefined;
    return buildOllamaModelConfig(ollamaModels);
  }, [ollamaModels]);

  const activeModelConfig = modelSource === 'local' && ollamaConnected ? ollamaModelConfig : undefined;
  const activeExecutionTarget: ExecutionTarget = modelSource === 'local' ? 'n8n' : executionTarget;

  const sharedRequestFields = useMemo(() => ({
    priority,
    executionTarget: activeExecutionTarget,
    ...(activeModelConfig ? { modelConfig: activeModelConfig } : {}),
    ...(description ? { description } : {}),
    ...(stageForReview ? { dryRun: true } : {}),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [priority, description, stageForReview, activeExecutionTarget, activeModelConfig]);

  const manualRequestsPlanned = useMemo(() => {
    const newsEnrichment = newsContextEnabled && selectedArticleIds.size > 0
      ? Array.from(selectedArticleIds).map(i => newsArticles[i]).filter(Boolean)
      : [];

    return buildManualGenerationRequests({
      bundles: Array.from(selectedBundles),
      count,
      distributionConfig: STORY_MODE_DIST[storyMode],
      targetMode,
      selectedRegions: Array.from(selectedRegions),
      selectedCountry,
      exclusivityReason,
      priority,
    }).map((req) => newsEnrichment.length > 0
      ? { ...req, mode: 'news' as const, newsContext: newsEnrichment }
      : req
    );
  }, [selectedBundles, count, storyMode, targetMode, selectedRegions, selectedCountry, exclusivityReason, priority, newsContextEnabled, selectedArticleIds, newsArticles]);

  const newsRequestsPlanned = useMemo(() => buildNewsGenerationRequests({
    count: newsCount,
    distributionConfig: STORY_MODE_DIST[storyMode],
    selectedArticleIds: Array.from(selectedArticleIds),
    articles: newsArticles,
    classifications,
    bundleOverrides,
    priority,
  }), [newsCount, storyMode, selectedArticleIds, newsArticles, classifications, bundleOverrides, priority]);

  // — News mode helpers
  async function fetchNews() {
    setNewsLoading(true);
    setNewsError(null);
    setNewsArticles([]);
    setSelectedArticleIds(new Set());
    setClassifications([]);
    setBundleOverrides({});
    try {
      const res = await fetch(`/api/news?limit=${newsLoadCount}`);
      const data = await res.json();
      if (!res.ok) { setNewsError(data.error ?? 'Failed to fetch news.'); return; }
      setNewsArticles(data.articles ?? []);
    } catch {
      setNewsError('Network error fetching headlines.');
    } finally {
      setNewsLoading(false);
    }
  }

  async function classifySelected() {
    if (selectedArticleIds.size === 0) return;
    setClassifying(true);
    setClassifyError(null);
    const selected = Array.from(selectedArticleIds).map((i) => newsArticles[i]);
    try {
      const res = await fetch('/api/news/classify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          articles: selected,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setClassifyError(data.error ?? 'Classification failed.'); return; }
      // Re-index to original article positions
      const artIndices = Array.from(selectedArticleIds).sort((a, b) => a - b);
      const remapped = (data.classifications ?? []).map((c: ArticleClassification) => ({
        ...c,
        articleIndex: artIndices[c.articleIndex] ?? c.articleIndex,
      }));
      setClassifications(remapped);
      setBundleOverrides({});
    } catch {
      setClassifyError('Network error during classification.');
    } finally {
      setClassifying(false);
    }
  }

  function effectiveBundle(articleIdx: number): string {
    return bundleOverrides[articleIdx] ?? classifications.find((c) => c.articleIndex === articleIdx)?.bundle ?? '';
  }

  // — Submit
  async function submitGeneration() {
    if (submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    setJobId(null);

    if (generationMode === 'manual') {
      if (selectedBundles.size === 0) { setSubmitError('Select at least one bundle.'); setSubmitting(false); return; }
      if (count < 1 || count > 50) { setSubmitError('Count must be between 1 and 50.'); setSubmitting(false); return; }
      if (targetMode === 'regions' && selectedRegions.size === 0) { setSubmitError('Select at least one region.'); setSubmitting(false); return; }
      if (targetMode === 'country' && !selectedCountry) { setSubmitError('Select a country.'); setSubmitting(false); return; }

      try {
        const newsEnrichment = newsContextEnabled && selectedArticleIds.size > 0
          ? Array.from(selectedArticleIds).map(i => newsArticles[i]).filter(Boolean)
          : [];

        const requests = buildManualGenerationRequests({
          bundles: Array.from(selectedBundles),
          count,
          distributionConfig: STORY_MODE_DIST[storyMode],
          targetMode,
          selectedRegions: Array.from(selectedRegions),
          selectedCountry,
          exclusivityReason,
          ...sharedRequestFields,
        }).map((req) => newsEnrichment.length > 0
          ? { ...req, mode: 'news' as const, newsContext: newsEnrichment }
          : req
        );
        if (requests.length === 0) { setSubmitError('No valid generation requests were created.'); return; }

        let firstJobId: string | null = null;
        for (const requestBody of requests) {
          console.log('[generate] Submitting job:', JSON.stringify(requestBody).slice(0, 200));
          const res = await fetch('/api/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(requestBody) });
          const data = await res.json() as { jobId?: string; error?: string };
          console.log('[generate] Response:', res.status, JSON.stringify(data));
          if (!res.ok) { setSubmitError(data.error ?? 'Failed to create job.'); return; }
          if (!firstJobId && data.jobId) firstJobId = data.jobId;
        }
        setJobId(firstJobId);
      } catch (err) {
        console.error('[generate] submitGeneration error:', err);
        const message = err instanceof Error ? err.message : 'Network error while creating the job.';
        setSubmitError(message);
      } finally {
        setSubmitting(false);
      }
      return;
    }

    // — News mode submit
    if (selectedArticleIds.size === 0) { setSubmitError('Select at least one article.'); setSubmitting(false); return; }
    if (classifications.length === 0) { setSubmitError('Classify the selected articles first.'); setSubmitting(false); return; }
    if (newsCount < 1 || newsCount > 10) { setSubmitError('Scenarios per bundle must be between 1 and 10.'); setSubmitting(false); return; }

    if (newsRequestsPlanned.length === 0) { setSubmitError('No classified articles to submit.'); setSubmitting(false); return; }

    try {
      let firstJobId: string | null = null;
      for (const requestBody of buildNewsGenerationRequests({
        count: newsCount,
        distributionConfig: STORY_MODE_DIST[storyMode],
        selectedArticleIds: Array.from(selectedArticleIds),
        articles: newsArticles,
        classifications,
        bundleOverrides,
        ...sharedRequestFields,
      })) {
        const res = await fetch('/api/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(requestBody) });
        const data = await res.json() as { jobId?: string; error?: string };
        if (!res.ok) { setSubmitError(data.error ?? 'Failed to create a news generation job.'); return; }
        if (!firstJobId && data.jobId) firstJobId = data.jobId;
      }
      setJobId(firstJobId);
    } catch (err) {
      console.error('[generate] submitGeneration error:', err);
      const message = err instanceof Error ? err.message : 'Network error while creating jobs.';
      setSubmitError(message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    await submitGeneration();
  }

  // — Derived values
  const expectedManualCount = countExpectedScenarios(manualRequestsPlanned);
  const selectedBundleData = ALL_BUNDLES.filter((b) => selectedBundles.has(b.id));
  const targetSummary =
    targetMode === 'all' ? 'Global'
    : targetMode === 'regions' ? `${selectedRegions.size} region${selectedRegions.size === 1 ? '' : 's'}`
    : countries.find((c) => c.id === selectedCountry)?.name ?? '—';
  const scopeReady =
    targetMode === 'all' ||
    (targetMode === 'regions' && selectedRegions.size > 0) ||
    (targetMode === 'country' && Boolean(selectedCountry));

  const newsClassifiedBundles = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of classifications) {
      if (!selectedArticleIds.has(c.articleIndex)) continue;
      const b = effectiveBundle(c.articleIndex);
      if (b) map.set(b, (map.get(b) ?? 0) + 1);
    }
    return map;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classifications, selectedArticleIds, bundleOverrides]);

  const newsJobsExpected = newsRequestsPlanned.length;
  const newsScenariosExpected = countExpectedScenarios(newsRequestsPlanned);

  // — Shared panels
  const aiModelsPanel = (
    <CommandPanel className="p-5 md:p-6">
      <div className="mb-5">
        <div className="section-kicker mb-2">Provider Routing</div>
        <h2 className="text-xl font-semibold text-foreground">Model Source</h2>
      </div>

      <div className="flex items-center gap-3 mb-5">
        {([
          { value: 'cloud' as const, label: 'Cloud (OpenAI)' },
          { value: 'local' as const, label: 'Corsair (Local)' },
        ]).map(({ value, label }) => (
          <button key={value} type="button"
            onClick={() => setModelSource(value)}
            disabled={value === 'local' && !ollamaConnected}
            className={`rounded-full border px-4 py-2 text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
              modelSource === value
                ? 'border-[var(--accent-secondary)] bg-[rgba(212,170,44,0.12)] text-foreground'
                : 'border-[var(--border)] text-[var(--foreground-muted)] hover:border-[var(--border-strong)] hover:text-foreground'
            }`}>
            {label}
          </button>
        ))}
      </div>

      {modelSource === 'local' ? (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className={`h-2 w-2 rounded-full ${ollamaConnected ? 'bg-[var(--success)]' : 'bg-[var(--error)]'}`} />
            <span className="text-xs text-[var(--foreground-muted)]">
              {ollamaConnected ? `${ollamaModels.length} models · routes via n8n` : 'Corsair not reachable'}
            </span>
          </div>
          {ollamaModelConfig && (
            <div className="rounded-[var(--radius-tight)] border border-[var(--border)] px-4 py-3 space-y-1.5">
              {([
                ['Architect', ollamaModelConfig.architectModel],
                ['Drafter', ollamaModelConfig.drafterModel],
                ['Advisor', ollamaModelConfig.advisorModel],
                ['Repair', ollamaModelConfig.repairModel],
                ['Quality', ollamaModelConfig.contentQualityModel],
                ['Review', ollamaModelConfig.narrativeReviewModel],
              ] as const).map(([label, model]) => (
                <div key={label} className="flex items-center justify-between text-xs">
                  <span className="text-[var(--foreground-muted)]">{label}</span>
                  <span className="font-mono text-foreground">{model?.replace('ollama:', '')}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div>
          <p className="mb-4 text-xs text-[var(--foreground-muted)]">
            Routes to OpenAI via Cloud Functions or n8n.
          </p>
          <div className="flex items-center gap-3">
            {(['n8n', 'cloud_function'] as const).map((target) => (
              <button key={target} type="button"
                onClick={() => setExecutionTarget(target)}
                className={`rounded-full border px-4 py-2 text-xs font-medium transition-colors ${
                  executionTarget === target
                    ? 'border-[var(--accent-secondary)] bg-[rgba(212,170,44,0.12)] text-foreground'
                    : 'border-[var(--border)] text-[var(--foreground-muted)] hover:border-[var(--border-strong)] hover:text-foreground'
                }`}>
                {target === 'n8n' ? 'n8n' : 'Direct'}
              </button>
            ))}
          </div>
        </div>
      )}
    </CommandPanel>
  );

  return (
    <div className="mx-auto max-w-[1600px]">
      <ScreenHeader
        section="Content Operations"
        title="Scenario Generation"
        subtitle="Generate scenarios manually or from live news headlines."
        eyebrow="Create"
        nav={<OperationsNav />}
        actions={
          <>
            <Link href="/jobs" className="btn btn-ghost">Job Queue</Link>
            <Link href="/scenarios" className="btn btn-tactical">Library</Link>
          </>
        }
      />

      {/* Mode toggle */}
      <div className="mb-6">
        <SegmentedControl
          value={generationMode}
          onChange={(v) => { setGenerationMode(v); setSubmitError(null); setJobId(null); }}
          options={[
            { value: 'manual', label: 'Manual' },
            { value: 'news', label: 'From News' },
            { value: 'blitz', label: 'Blitz' },
          ]}
        />
        <p className="mt-2 text-xs text-[var(--foreground-muted)]">
          {generationMode === 'manual'
            ? 'Choose bundles and settings — the AI creates scenarios from scratch.'
            : generationMode === 'news'
            ? 'Pull live headlines, select articles, and let the AI generate scenarios grounded in real events.'
            : 'Set a total scenario count, then let blitz analyse inventory gaps and distribute that budget across the weakest coverage.'}
        </p>
      </div>


      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_380px] items-start">
        {/* LEFT COLUMN: Mode-Specific Forms */}
        <div className="space-y-6 min-w-0">
          {generationMode === 'blitz' && (
            <div className="space-y-6">
              <CommandPanel className="p-5 md:p-6">
                <div className="mb-5 flex items-start justify-between gap-4">
                  <div>
                    <div className="section-kicker mb-2">Step 1 — Target</div>
                    <h2 className="text-xl font-semibold text-foreground">Define Objective</h2>
                  </div>
                  <div className="flex items-center gap-3">
                    <button type="button"
                      onClick={() => fetchBlitzPreview(blitzTotalScenarios)}
                      disabled={blitzLoading || !blitzCountValid}
                      className="filter-pill active">
                      {blitzLoading ? 'Analysing...' : blitzAllocation ? 'Re-analyse' : 'Analyse Gaps'}
                    </button>
                  </div>
                </div>
                
                <div className="space-y-5">
                  <div>
                    <label className="section-kicker mb-2 block">Target Scenario Count</label>
                    <div className="flex flex-wrap items-center gap-3">
                      <input
                        type="number" min={1} max={200} value={blitzCountRaw} placeholder="24"
                        onChange={(e) => setBlitzCountRaw(e.target.value)}
                        className="input-shell w-24 text-center font-mono text-base"
                      />
                      {blitzCountValid ? (
                        <span className="text-sm text-[var(--foreground-muted)]">
                          Will attempt to generate up to <strong>{blitzTotalScenarios}</strong> scenarios based on inventory gaps.
                        </span>
                      ) : (
                        <span className="text-sm text-[var(--error)]">Must be between 1 and 200.</span>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="section-kicker mb-2 block">
                      Thematic Guidance <span className="normal-case font-normal tracking-normal text-[var(--foreground-subtle)]">(Optional)</span>
                    </label>
                    <textarea
                      value={blitzGuidance} onChange={(e) => setBlitzGuidance(e.target.value)}
                      placeholder="e.g. Focus on economic instability. Avoid military conflict. Emphasise diplomatic options."
                      rows={2} className="input-shell resize-y text-sm"
                    />
                  </div>
                </div>
              </CommandPanel>

              {blitzAllocation && (
                <CommandPanel className="p-5 md:p-6">
                  <div className="mb-5">
                    <div className="section-kicker mb-2">Step 2 — Insights</div>
                    <h2 className="text-xl font-semibold text-foreground">Current Inventory Gaps</h2>
                  </div>
                  <div className="space-y-4">
                    {([
                      { tier: 'universal' as const, label: 'Global Events', desc: 'Can happen anywhere' },
                      { tier: 'regional' as const, label: 'Regional Focus', desc: 'Geographic specific' },
                      { tier: 'cluster' as const, label: 'Cluster Focus', desc: 'Alliance or group specific' },
                      { tier: 'exclusive' as const, label: 'Country Specific', desc: 'Local events' },
                    ]).map(({ tier, label, desc }) => {
                      const tierDeficits = blitzDeficits.filter((d) => d.scopeTier === tier);
                      const totalGap = tierDeficits.reduce((s, d) => s + d.deficit, 0);
                      const allocated = blitzAllocation[tier];
                      const ratio = Math.round(SCOPE_TIER_RATIOS[tier] * 100);
                      const fillPct = totalGap > 0 ? Math.min(100, Math.round((allocated / totalGap) * 100)) : 100;
                      const isCovered = totalGap === 0;
                      
                      return (
                        <div key={tier} className="flex flex-col gap-2">
                          <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-foreground">{label}</span>
                              <span className="text-[10px] font-mono text-[var(--foreground-subtle)] bg-[rgba(255,255,255,0.05)] px-1.5 py-0.5 rounded">{ratio}% allocation</span>
                            </div>
                            <div className="text-right text-xs">
                              {isCovered ? (
                                <span className="text-[var(--success)]">Healthy</span>
                              ) : (
                                <span>
                                  <span className="text-[var(--warning)]">{totalGap} missing</span>
                                  <span className="text-[var(--foreground-muted)] mx-2">→</span>
                                  <span className="text-foreground">Filling {allocated}</span>
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="h-1.5 rounded-full bg-[var(--background-muted)] overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-500 ease-out" style={{
                              width: `${fillPct}%`,
                              background: isCovered ? 'var(--success)' : fillPct >= 50 ? 'var(--warning)' : 'var(--error)',
                            }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CommandPanel>
              )}

              {blitzAllocation && blitzPlannedJobs.length > 0 && (
                <CommandPanel className="p-5 md:p-6 border-t-[3px] border-t-[var(--accent-primary)]">
                  <div className="mb-5 flex items-start justify-between gap-4">
                    <div>
                      <div className="section-kicker mb-2">Step 3 — Action Plan</div>
                      <h2 className="text-xl font-semibold text-foreground">
                        Ready to Generate
                      </h2>
                      <p className="mt-1 text-sm text-[var(--foreground-muted)]">
                        Creating {blitzPlannedJobs.length} jobs to generate {blitzSummary?.scenariosToGenerate ?? 0} scenarios.
                      </p>
                    </div>
                  </div>
                  
                  <div className="mb-6 space-y-4 max-h-[300px] overflow-y-auto pr-2 subtle-scroll">
                    {(['universal', 'regional', 'cluster', 'exclusive'] as const).map((tier) => {
                      const jobs = blitzPlannedJobs.filter((j) => j.scopeTier === tier);
                      if (jobs.length === 0) return null;
                      
                      return (
                        <div key={tier} className="space-y-2">
                          <div className="text-[11px] font-semibold text-[var(--foreground-subtle)]">
                            {tier}
                          </div>
                          <div className="grid gap-2">
                            {jobs.map((job, i) => (
                              <div key={i} className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[rgba(255,255,255,0.01)] px-3 py-2.5">
                                <div className="flex items-center gap-3 min-w-0">
                                  {tier !== 'universal' && (
                                    <span className="text-xs font-medium text-foreground truncate max-w-[120px]">{formatScopeLabel(job.scopeKey)}</span>
                                  )}
                                  <div className="flex flex-wrap gap-1.5">
                                    {job.bundles.map((b) => <BundleBadge key={b} bundle={b} />)}
                                  </div>
                                </div>
                                <div className="text-xs text-[var(--foreground-muted)] shrink-0 ml-3">
                                  <span className="font-mono text-[10px]">&times;</span>{job.bundles.length * job.count}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  
                  <div className="flex flex-col gap-3">
                    <button type="button" onClick={handleBlitzExecute}
                      disabled={submitting || blitzPlannedJobs.length === 0}
                      className="btn btn-command w-full py-3.5 text-sm font-bold tracking-widest shadow-md">
                      {submitting ? 'Initiating Blitz...' : `Launch Blitz Sequence`}
                    </button>
                    {blitzJobIds.length > 0 && (
                      <Link href={`/jobs/${blitzJobIds[0]}`} className="btn btn-tactical w-full justify-center py-2">
                        View Active Blitz Job
                      </Link>
                    )}
                  </div>
                </CommandPanel>
              )}

              {blitzAllocation && blitzPlannedJobs.length === 0 && blitzDeficits.length === 0 && (
                <CommandPanel className="p-5 md:p-6 border border-[var(--success)] bg-[rgba(15,223,156,0.05)]">
                  <div className="flex items-center gap-3">
                    <span className="text-[var(--success)]">✓</span>
                    <span className="text-sm font-medium text-[var(--success)]">Content inventory is fully balanced. No gaps detected for this budget.</span>
                  </div>
                </CommandPanel>
              )}

              {blitzJobIds.length > 0 && (
                <div className="space-y-4">
                  <div className="section-kicker">Active Tasks</div>
                  {blitzJobIds.map((id) => <JobMonitor key={id} jobId={id} />)}
                </div>
              )}
            </div>
          )}

          {generationMode === 'manual' && (
            <form onSubmit={handleSubmit} className="space-y-6">
              <CommandPanel className="p-5 md:p-6">
                <div className="mb-5 flex items-start justify-between gap-4">
                  <div>
                    <div className="section-kicker mb-2">Bundles</div>
                    <h2 className="text-xl font-semibold text-foreground">Content Lanes</h2>
                  </div>
                  <div className="flex items-center gap-3">
                    <button type="button"
                      onClick={() => setNewsContextEnabled(!newsContextEnabled)}
                      className={`btn ${newsContextEnabled ? 'btn-tactical' : 'btn-ghost px-2.5 py-1 text-[10px]'}`}>
                      {newsContextEnabled ? 'News On' : 'News'}
                    </button>
                    <button type="button"
                      onClick={() => {
                        if (selectedBundles.size === ALL_BUNDLES.length) {
                          setSelectedBundles(new Set());
                        } else {
                          setSelectedBundles(new Set(ALL_BUNDLES.map(b => b.id)));
                        }
                      }}
                      className="btn btn-ghost px-2.5 py-1 text-[10px]">
                      {selectedBundles.size === ALL_BUNDLES.length ? 'Clear All' : 'Select All'}
                    </button>
                    <span className="text-xs text-[var(--foreground-muted)]">
                      {selectedBundles.size > 0 ? `${selectedBundles.size} selected` : 'Pick one or more'}
                    </span>
                    
                  </div>
                </div>
                {/* Sortable bundle table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[var(--border)]">
                        <th className="w-5 pb-2.5 pl-1" />
                        <th className="pb-2.5 pr-4 text-left">
                          <button type="button" onClick={() => handleSortColumn('name')}
                            className="flex items-center gap-1 text-xs font-medium text-[var(--foreground-subtle)] hover:text-foreground transition-colors">
                            Bundle <span>{sortColumn === 'name' ? (sortDirection === 'asc' ? '↑' : '↓') : <span className="opacity-30">↕</span>}</span>
                          </button>
                        </th>
                        <th className="pb-2.5 pr-6 text-right">
                          <button type="button" onClick={() => handleSortColumn('total')}
                            className="flex w-full items-center justify-end gap-1 text-xs font-medium text-[var(--foreground-subtle)] hover:text-foreground transition-colors">
                            Total <span>{sortColumn === 'total' ? (sortDirection === 'asc' ? '↑' : '↓') : <span className="opacity-30">↕</span>}</span>
                          </button>
                        </th>
                        <th className="pb-2.5 pr-2 text-right">
                          <button type="button" onClick={() => handleSortColumn('active')}
                            className="flex w-full items-center justify-end gap-1 text-xs font-medium text-[var(--foreground-subtle)] hover:text-foreground transition-colors">
                            Active <span>{sortColumn === 'active' ? (sortDirection === 'asc' ? '↑' : '↓') : <span className="opacity-30">↕</span>}</span>
                          </button>
                        </th>
                        {Object.keys(newsCountByBundle).length > 0 && (
                          <th className="pb-2.5 pr-1 text-right">
                            <span className="text-xs font-medium text-[var(--foreground-subtle)]">News</span>
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {sortedBundles.map((bundle) => {
                        const isActive = selectedBundles.has(bundle.id);
                        const counts = bundleCounts[bundle.id];
                        const nCount = newsCountByBundle[bundle.id] ?? 0;
                        return (
                          <tr key={bundle.id}
                            onClick={() => toggleBundle(bundle.id)}
                            style={{ boxShadow: isActive ? `inset 3px 0 0 ${BUNDLE_ACCENT_COLORS[bundle.id]}` : undefined }}
                            className={`cursor-pointer border-b border-[var(--border)] last:border-b-0 transition-colors hover:bg-[rgba(255,255,255,0.025)] ${isActive ? 'bg-[var(--accent-muted)]' : ''}`}>
                            <td className="w-5 py-3.5 pl-1">
                              <span className={`block h-2 w-2 rounded-full ${isActive ? 'bg-[var(--accent-secondary)]' : 'border border-[var(--border-strong)]'}`} />
                            </td>
                            <td className="py-3.5 pr-4">
                              <div className="font-semibold text-foreground leading-5">{bundle.label}</div>
                              <div className="mt-0.5 text-[11px] leading-4 text-[var(--foreground-muted)]">{bundle.description}</div>
                            </td>
                            <td className="py-3.5 pr-6 text-right font-mono text-[13px] tabular-nums text-[var(--foreground-muted)]">
                              {counts ? counts.total : '—'}
                            </td>
                            <td className="py-3.5 pr-2 text-right font-mono text-[13px] tabular-nums text-[var(--foreground-muted)]">
                              {counts ? counts.active : '—'}
                            </td>
                            {Object.keys(newsCountByBundle).length > 0 && (
                              <td className="py-3.5 pr-1 text-right">
                                {nCount > 0
                                  ? <span className="inline-flex items-center justify-center rounded-full bg-[var(--accent-muted)] px-2 py-0.5 text-[11px] font-mono text-[var(--accent-primary)]">{nCount}</span>
                                  : <span className="text-[11px] text-[var(--foreground-subtle)]">—</span>}
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CommandPanel>

              

              <div className="grid gap-6 lg:grid-cols-2">
                <CommandPanel className="p-5 md:p-6">
                  <div className="mb-5">
                    <div className="section-kicker mb-2">Volume</div>
                    <h2 className="text-xl font-semibold text-foreground">Output Size</h2>
                  </div>
                  <label className="section-kicker mb-1 block">Scenarios Per Bundle</label>
                  <input type="number" min={1} max={50} value={count}
                    onChange={(e) => setCount(Number(e.target.value))} className="input-shell" />
                  {selectedBundles.size > 1 && (
                    <p className="mt-2 text-xs text-[var(--foreground-muted)]">
                      {selectedBundles.size} bundles × {count} = {expectedManualCount} total
                    </p>
                  )}
                </CommandPanel>

                <CommandPanel className="p-5 md:p-6">
                  <div className="mb-5">
                    <div className="section-kicker mb-2">Targeting</div>
                    <h2 className="text-xl font-semibold text-foreground">Geographic Scope</h2>
                  </div>
                  <div className="mb-4">
                    <SegmentedControl value={targetMode} onChange={setTargetMode}
                      options={[{ value: 'all', label: 'Global' }, { value: 'regions', label: 'Regions' }, { value: 'country', label: 'Country' }]} />
                  </div>
                  {targetMode === 'all' && <p className="text-xs text-[var(--foreground-muted)]">Scenarios draw from the global country pool, weighted by region diversity.</p>}
                  {targetMode === 'regions' && (
                    <div className="grid grid-cols-2 gap-2">
                      {ALL_REGIONS.map((region) => {
                        const active = selectedRegions.has(region.id);
                        return (
                          <button key={region.id} type="button" onClick={() => toggleRegion(region.id)}
                            className={`rounded-[var(--radius-tight)] border px-4 py-3 text-left text-sm transition-colors ${
                              active ? 'border-[var(--accent-secondary)] bg-[rgba(212,170,44,0.1)] text-foreground' : 'border-[var(--border)] text-[var(--foreground-muted)] hover:border-[var(--border-strong)] hover:text-foreground'
                            }`}>
                            {region.label}
                          </button>
                        );
                      })}
                    </div>
                  )}
                  {targetMode === 'country' && (
                    <div className="space-y-4">
                      <div>
                        <label className="section-kicker mb-2 block">Country</label>
                        <select value={selectedCountry} onChange={(e) => setSelectedCountry(e.target.value)} className="input-shell">
                          <option value="">Select a country</option>
                          {countries.map((c) => <option key={c.id} value={c.id}>{c.name} · {c.region}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="section-kicker mb-2 block">Exclusivity Reason</label>
                        <select value={exclusivityReason} onChange={(e) => setExclusivityReason(e.target.value as ScenarioExclusivityReason)} className="input-shell">
                          {EXCLUSIVITY_REASON_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                          ))}
                        </select>
                        <p className="mt-2 text-xs text-[var(--foreground-muted)]">
                          {EXCLUSIVITY_REASON_OPTIONS.find((option) => option.value === exclusivityReason)?.description}
                        </p>
                      </div>
                    </div>
                  )}
                </CommandPanel>
              </div>

              {newsContextEnabled && (
                <CommandPanel className="p-5 md:p-6 border border-[var(--accent-secondary)]">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <div className="section-kicker mb-1 text-[var(--accent-secondary)]">News Context</div>
                      <h2 className="text-sm font-semibold text-foreground">Active Articles</h2>
                    </div>
                    <div className="text-xs text-[var(--foreground-muted)]">
                      {selectedArticleIds.size} article{selectedArticleIds.size !== 1 ? 's' : ''} selected
                    </div>
                  </div>
                  {selectedArticleIds.size === 0 ? (
                    <div className="text-xs text-[var(--foreground-muted)]">No articles selected. Switch to 'From News' mode to select articles first.</div>
                  ) : (
                    <div className="space-y-2 max-h-[160px] overflow-y-auto pr-2 subtle-scroll">
                      {Array.from(selectedArticleIds).map((idx) => {
                        const article = newsArticles[idx];
                        if (!article) return null;
                        return (
                          <div key={idx} className="text-xs border-l-2 border-[var(--border-strong)] pl-3 py-1">
                            <div className="font-medium text-foreground leading-5">{article.title}</div>
                            <div className="text-[var(--foreground-muted)] mt-0.5">{article.source}</div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CommandPanel>
              )}

              {submitError && <CommandPanel tone="danger" className="p-4 text-sm text-[var(--error)]">{submitError}</CommandPanel>}
              
            </form>
          )}

          {generationMode === 'news' && (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Bundle filter — selecting bundles filters article list post-classification */}
              <CommandPanel className="p-5 md:p-6">
                <div className="mb-5 flex items-start justify-between gap-4">
                  <div>
                    <div className="section-kicker mb-2">Bundles</div>
                    <h2 className="text-xl font-semibold text-foreground">Filter by Content Lane</h2>
                  </div>
                  <span className="text-xs text-[var(--foreground-muted)]">
                    {selectedBundles.size > 0 ? `${selectedBundles.size} selected` : 'All bundles'}
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[var(--border)]">
                        <th className="w-5 pb-2.5 pl-1" />
                        <th className="pb-2.5 pr-4 text-left">
                          <button type="button" onClick={() => handleSortColumn('name')}
                            className="flex items-center gap-1 text-xs font-medium text-[var(--foreground-subtle)] hover:text-foreground transition-colors">
                            Bundle <span>{sortColumn === 'name' ? (sortDirection === 'asc' ? '↑' : '↓') : <span className="opacity-30">↕</span>}</span>
                          </button>
                        </th>
                        <th className="pb-2.5 pr-6 text-right">
                          <button type="button" onClick={() => handleSortColumn('total')}
                            className="flex w-full items-center justify-end gap-1 text-xs font-medium text-[var(--foreground-subtle)] hover:text-foreground transition-colors">
                            Total <span>{sortColumn === 'total' ? (sortDirection === 'asc' ? '↑' : '↓') : <span className="opacity-30">↕</span>}</span>
                          </button>
                        </th>
                        {Object.keys(newsCountByBundle).length > 0 && (
                          <th className="pb-2.5 pr-1 text-right">
                            <span className="text-xs font-medium text-[var(--foreground-subtle)]">Articles</span>
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {sortedBundles.map((bundle) => {
                        const isActive = selectedBundles.has(bundle.id);
                        const counts = bundleCounts[bundle.id];
                        const nCount = newsCountByBundle[bundle.id] ?? 0;
                        return (
                          <tr key={bundle.id}
                            onClick={() => toggleBundle(bundle.id)}
                            style={{ boxShadow: isActive ? `inset 3px 0 0 ${BUNDLE_ACCENT_COLORS[bundle.id]}` : undefined }}
                            className={`cursor-pointer border-b border-[var(--border)] last:border-b-0 transition-colors hover:bg-[rgba(255,255,255,0.025)] ${isActive ? 'bg-[var(--accent-muted)]' : ''}`}>
                            <td className="w-5 py-3 pl-1">
                              <span className={`block h-2 w-2 rounded-full ${isActive ? 'bg-[var(--accent-secondary)]' : 'border border-[var(--border-strong)]'}`} />
                            </td>
                            <td className="py-3 pr-4">
                              <div className="font-semibold text-foreground leading-5">{bundle.label}</div>
                            </td>
                            <td className="py-3 pr-6 text-right font-mono text-[13px] tabular-nums text-[var(--foreground-muted)]">
                              {counts ? counts.total : '—'}
                            </td>
                            {Object.keys(newsCountByBundle).length > 0 && (
                              <td className="py-3 pr-1 text-right">
                                {nCount > 0
                                  ? <span className="inline-flex items-center justify-center rounded-full bg-[var(--accent-muted)] px-2 py-0.5 text-[11px] font-mono text-[var(--accent-primary)]">{nCount}</span>
                                  : <span className="text-[11px] text-[var(--foreground-subtle)]">—</span>}
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {classifications.length > 0 && selectedBundles.size > 0 && (
                  <p className="mt-3 text-xs text-[var(--foreground-muted)]">
                    Showing articles classified to {selectedBundles.size} selected bundle{selectedBundles.size === 1 ? '' : 's'}. Deselect all to see all articles.
                  </p>
                )}
              </CommandPanel>

              {/* Step 1 — Fetch Headlines */}
              <CommandPanel className="p-5 md:p-6">
                <div className="mb-5">
                  <div className="section-kicker mb-2">Step 1 — Source</div>
                  <h2 className="text-xl font-semibold text-foreground">Fetch Headlines</h2>
                </div>
                <div className="flex flex-wrap items-center gap-4">
                  <div>
                    <label className="section-kicker mb-1 block">Number of headlines</label>
                    <select value={newsLoadCount} onChange={(e) => setNewsLoadCount(Number(e.target.value))} className="input-shell w-auto">
                      {[10, 20, 30, 50].map((n) => <option key={n} value={n}>{n} headlines</option>)}
                    </select>
                  </div>
                  <button type="button" onClick={fetchNews} disabled={newsLoading}
                    className="btn btn-tactical self-end">
                    {newsLoading ? 'Fetching…' : newsArticles.length > 0 ? 'Refresh Headlines' : 'Load Headlines'}
                  </button>
                </div>
                <p className="mt-3 text-xs text-[var(--foreground-muted)]">
                  Pulls from BBC World, Al Jazeera, NPR World, Deutsche Welle, and Reuters — sorted by recency.
                </p>
                {newsError && <div className="mt-3 text-xs text-[var(--error)]">{newsError}</div>}
              </CommandPanel>

              {/* Step 2 — Select Articles */}
              {newsArticles.length > 0 && (
                <CommandPanel className="p-5 md:p-6">
                  <div className="mb-5 flex items-start justify-between gap-4">
                    <div>
                      <div className="section-kicker mb-2">Step 2 — Selection</div>
                      <h2 className="text-xl font-semibold text-foreground">Choose Articles</h2>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-[var(--foreground-muted)]">{selectedArticleIds.size} selected</span>
                      <button type="button" className="btn btn-ghost"
                        onClick={() => setSelectedArticleIds(selectedArticleIds.size === newsArticles.length ? new Set() : new Set(newsArticles.map((_, i) => i)))}>
                        {selectedArticleIds.size === newsArticles.length ? 'Deselect all' : 'Select all'}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
                    {newsArticles.map((article, idx) => {
                      if (visibleArticleIndices !== null && !visibleArticleIndices.has(idx)) return null;
                      const selected = selectedArticleIds.has(idx);
                      const classification = classifications.find((c) => c.articleIndex === idx);
                      const bundle = effectiveBundle(idx);
                      return (
                        <button key={idx} type="button" onClick={() => toggleArticle(idx)}
                          className={`w-full rounded-[var(--radius-tight)] border p-4 text-left transition-colors ${
                            selected ? 'border-[var(--accent-primary)] bg-[var(--accent-muted)]' : 'border-[var(--border)] bg-[rgba(255,255,255,0.02)] hover:border-[var(--border-strong)] hover:bg-[rgba(255,255,255,0.03)]'
                          }`}>
                          <div className="flex items-start gap-3">
                            <span className={`mt-0.5 h-4 w-4 shrink-0 rounded border ${selected ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]' : 'border-[var(--border)]'} flex items-center justify-center`}>
                              {selected && <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 10 8"><path d="M1 4l3 3 5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2 mb-1">
                                <span className="text-[11px] font-mono text-[var(--foreground-subtle)]">{article.source}</span>
                                {article.pubDate && <span className="text-[10px] text-[var(--foreground-subtle)]">{formatPubDate(article.pubDate)}</span>}
                                {classification && bundle && (
                                  <span className="rounded px-1.5 py-0.5 text-[11px] font-medium"
                                    style={{ background: `${BUNDLE_ACCENT_COLORS[bundle]}22`, color: BUNDLE_ACCENT_COLORS[bundle] }}>
                                    {bundle}
                                  </span>
                                )}
                              </div>
                              <div className="text-sm font-medium text-foreground leading-5">{article.title}</div>
                              {article.snippet && (
                                <div className="mt-1 text-xs leading-5 text-[var(--foreground-muted)] line-clamp-2">{article.snippet}</div>
                              )}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </CommandPanel>
              )}

              {/* Step 3 — Classify */}
              {selectedArticleIds.size > 0 && (
                <CommandPanel className="p-5 md:p-6">
                  <div className="mb-5">
                    <div className="section-kicker mb-2">Step 3 — AI Analysis</div>
                    <h2 className="text-xl font-semibold text-foreground">Recommend Bundles</h2>
                  </div>
                  <p className="mb-4 text-sm text-[var(--foreground-muted)]">
                    The AI reads each selected article and recommends the most fitting game bundle and geographic scope. You can override any recommendation before submitting.
                  </p>
                  <button type="button" onClick={classifySelected} disabled={classifying}
                    className="btn btn-tactical">
                    {classifying ? 'Analysing…' : classifications.length > 0 ? 'Re-analyse Selection' : `Analyse ${selectedArticleIds.size} Article${selectedArticleIds.size === 1 ? '' : 's'}`}
                  </button>
                  {classifyError && <div className="mt-3 text-xs text-[var(--error)]">{classifyError}</div>}
                </CommandPanel>
              )}

              {/* Step 4 — Review Recommendations */}
              {classifications.length > 0 && (
                <CommandPanel className="p-5 md:p-6">
                  <div className="mb-5">
                    <div className="section-kicker mb-2">Step 4 — Review</div>
                    <h2 className="text-xl font-semibold text-foreground">Bundle Recommendations</h2>
                  </div>
                  <div className="space-y-3">
                    {classifications
                      .filter((c) => selectedArticleIds.has(c.articleIndex))
                      .map((c) => {
                        const article = newsArticles[c.articleIndex];
                        const bundle = effectiveBundle(c.articleIndex);
                        return (
                          <div key={c.articleIndex} className="rounded-[var(--radius-tight)] border border-[var(--border)] p-4">
                            <div className="mb-2 text-sm font-medium text-foreground leading-5 line-clamp-2">{article?.title}</div>
                            <div className="flex flex-wrap items-center gap-3">
                              <div className="flex items-center gap-2">
                                <label className="section-kicker">Bundle</label>
                                <select
                                  value={bundle}
                                  onChange={(e) => setBundleOverrides((prev) => ({ ...prev, [c.articleIndex]: e.target.value }))}
                                  className="input-shell py-1 text-xs"
                                  style={{ borderColor: BUNDLE_ACCENT_COLORS[bundle] ?? undefined }}>
                                  {ALL_BUNDLES.map((b) => <option key={b.id} value={b.id}>{b.label}</option>)}
                                </select>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-[var(--foreground-muted)]">
                                <span className="font-mono">{c.scope}</span>
                                {c.region && <span>· {c.region}</span>}
                                <span className="ml-2 tabular-nums" title="Relevance score">
                                  <span className={c.relevance_score >= 8 ? 'text-[var(--success)]' : c.relevance_score >= 6 ? 'text-[var(--warning)]' : 'text-[var(--foreground-subtle)]'}>
                                    {c.relevance_score}/10
                                  </span>
                                </span>
                              </div>
                            </div>
                            {c.rationale && (
                              <p className="mt-2 text-xs leading-5 text-[var(--foreground-subtle)] italic">{c.rationale}</p>
                            )}
                          </div>
                        );
                      })}
                  </div>

                  {newsClassifiedBundles.size > 0 && (
                    <div className="mt-4 rounded-[var(--radius-tight)] border border-[var(--border)] bg-[rgba(255,255,255,0.02)] px-4 py-3">
                      <div className="section-kicker mb-2">Job Plan</div>
                      <div className="space-y-1 text-xs text-[var(--foreground-muted)]">
                        {Array.from(newsClassifiedBundles.entries()).map(([bundle, count]) => (
                          <div key={bundle} className="flex items-center justify-between gap-3">
                            <span className="flex items-center gap-2">
                              <span className="h-2 w-2 rounded-full" style={{ background: BUNDLE_ACCENT_COLORS[bundle] }} />
                              {bundle}
                            </span>
                            <span>{count} article{count === 1 ? '' : 's'} → {newsCount} scenario{newsCount === 1 ? '' : 's'}</span>
                          </div>
                        ))}
                        <div className="mt-2 pt-2 border-t border-[var(--border)] font-medium text-foreground">
                          {newsClassifiedBundles.size} job{newsClassifiedBundles.size === 1 ? '' : 's'} · {newsScenariosExpected} scenario{newsScenariosExpected === 1 ? '' : 's'} total
                        </div>
                      </div>
                    </div>
                  )}
                </CommandPanel>
              )}

              {/* Step 5 — Volume + Format + Priority */}
              {classifications.length > 0 && (
                <div className="grid gap-6 lg:grid-cols-3">
                  <CommandPanel className="p-5 md:p-6">
                    <div className="mb-4">
                      <div className="section-kicker mb-2">Volume</div>
                      <h2 className="text-lg font-semibold text-foreground">Per Bundle</h2>
                    </div>
                    <label className="section-kicker mb-1 block">Scenarios per bundle</label>
                    <input type="number" min={1} max={10} value={newsCount}
                      onChange={(e) => setNewsCount(Number(e.target.value))} className="input-shell" />
                    <p className="mt-2 text-xs text-[var(--foreground-muted)]">1–10 per bundle. Each job is seeded by that bundle's articles.</p>
                  </CommandPanel>

                  <CommandPanel className="p-5 md:p-6">
                    <div className="mb-4">
                      <div className="section-kicker mb-2">Story Format</div>
                      <h2 className="text-lg font-semibold text-foreground">Structure</h2>
                    </div>
                    <div className="space-y-2">
                      {(['standalone', 'two-part', 'three-part'] as StoryMode[]).map((mode) => (
                        <button key={mode} type="button" onClick={() => setStoryMode(mode)}
                          className={`w-full rounded-[var(--radius-tight)] border px-3 py-2 text-left text-xs transition-colors ${
                            storyMode === mode ? 'border-[var(--accent-primary)] bg-[var(--accent-muted)] text-foreground' : 'border-[var(--border)] text-[var(--foreground-muted)] hover:text-foreground'
                          }`}>
                          <span className="font-medium">{STORY_MODE_LABELS[mode]}</span>
                        </button>
                      ))}
                    </div>
                  </CommandPanel>

                  <CommandPanel className="p-5 md:p-6">
                    <div className="mb-4">
                      <div className="section-kicker mb-2">Priority</div>
                      <h2 className="text-lg font-semibold text-foreground">Queue</h2>
                    </div>
                    <SegmentedControl value={priority} onChange={setPriority}
                      options={[{ value: 'low', label: 'Low' }, { value: 'normal', label: 'Norm' }, { value: 'high', label: 'High' }]} />
                    <p className="mt-2 text-xs text-[var(--foreground-muted)]">{PRIORITY_DESCRIPTIONS[priority]}</p>
                  </CommandPanel>
                </div>
              )}

              {/* Step 6 — AI Models */}
              {classifications.length > 0 && aiModelsPanel}

              {submitError && <CommandPanel tone="danger" className="p-4 text-sm text-[var(--error)]">{submitError}</CommandPanel>}

              
            </form>
          )}
          
          {generationMode !== 'blitz' && (
            <CommandPanel className="p-5 md:p-6">
              <div className="mb-4">
                <div className="section-kicker mb-2">Instruction Overlay</div>
                <h2 className="text-xl font-semibold text-foreground">Prompt Guidance</h2>
              </div>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional: editorial focus, current event framing, excluded topics, or pacing instructions."
                rows={3} className="input-shell resize-y" />
            </CommandPanel>
          )}
        </div>

        {/* RIGHT COLUMN: Persistent Summary/CTA Rail */}
        <div className="space-y-6 sticky top-6">
          
          {generationMode === 'manual' && (
            <CommandPanel className="p-5 md:p-6">
                <div className="mb-5">
                  <div className="section-kicker mb-2">Summary</div>
                  <h2 className="text-xl font-semibold text-foreground">Current Configuration</h2>
                </div>
                <div className="mb-5 flex flex-wrap gap-2">
                  {selectedBundleData.length > 0
                    ? selectedBundleData.map((b) => <BundleBadge key={b.id} bundle={b.id} />)
                    : <span className="text-sm text-[var(--foreground-muted)]">No bundles selected.</span>}
                </div>
                <div className="space-y-3 text-sm text-[var(--foreground-muted)]">
                  {[
                    ['Scenarios', `${expectedManualCount} total`],
                    ['Scope', targetSummary],
                    ['Format', STORY_MODE_LABELS[storyMode]],
                    ['Priority', priority],
                    ['Provider', modelSource === 'local' ? 'Corsair (Local)' : 'Cloud (OpenAI)'],
                    ['Review gate', stageForReview ? 'Staged' : 'Auto-save'],
                  ].map(([label, val], i, arr) => (
                    <div key={label} className={`flex items-center justify-between gap-3 ${i < arr.length - 1 ? 'border-b border-[var(--border)] pb-3' : ''}`}>
                      <span>{label}</span>
                      <span className="data-value text-foreground capitalize">{val}</span>
                    </div>
                  ))}
                </div>
                {description && (
                  <div className="mt-5 rounded-[var(--radius-tight)] border border-[var(--border)] bg-[rgba(255,255,255,0.02)] px-4 py-3 text-xs leading-6 text-[var(--foreground-muted)]">
                    {description}
                  </div>
                )}
              </CommandPanel>
          )}

          {generationMode === 'news' && (
            <CommandPanel className="p-5 md:p-6">
                <div className="mb-5">
                  <div className="section-kicker mb-2">Summary</div>
                  <h2 className="text-xl font-semibold text-foreground">News Generation Plan</h2>
                </div>
                <div className="space-y-3 text-sm text-[var(--foreground-muted)]">
                  <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] pb-3">
                    <span>Articles loaded</span>
                    <span className="data-value text-foreground">{newsArticles.length || '—'}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] pb-3">
                    <span>Selected</span>
                    <span className="data-value text-foreground">{selectedArticleIds.size || '—'}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] pb-3">
                    <span>Bundles</span>
                    <span className="data-value text-foreground">
                      {newsClassifiedBundles.size > 0
                        ? Array.from(newsClassifiedBundles.keys()).join(', ')
                        : '—'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] pb-3">
                    <span>Format</span>
                    <span className="data-value text-foreground">{STORY_MODE_LABELS[storyMode]}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] pb-3">
                    <span>Provider</span>
                    <span className="data-value text-foreground">{modelSource === 'local' ? 'Corsair (Local)' : 'Cloud (OpenAI)'}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span>Total scenarios</span>
                    <span className="data-value text-foreground">{newsScenariosExpected || '—'}</span>
                  </div>
                </div>
              </CommandPanel>
          )}

          {aiModelsPanel}

          {generationMode !== 'blitz' && (
            <CommandPanel className="p-5 md:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="section-kicker mb-2">Output Behavior</div>
                  <h2 className="text-sm font-semibold text-foreground mb-1">Review Before Saving</h2>
                  <div className="text-xs text-[var(--foreground-muted)]">
                    Hold scenarios in a staging queue for review.
                  </div>
                </div>
                <button type="button" onClick={() => setStageForReview((v) => !v)}
                  className={`mt-1 shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                    stageForReview ? 'border-[var(--accent-secondary)] bg-[rgba(212,170,44,0.12)] text-foreground' : 'border-[var(--border)] text-[var(--foreground-muted)] hover:border-[var(--border-strong)] hover:text-foreground'
                  }`}>
                  {stageForReview ? 'On' : 'Off'}
                </button>
              </div>
            </CommandPanel>
          )}

          {generationMode === 'manual' && (
            <CommandPanel className="p-5 md:p-6">
                <div className="mb-4">
                  <div className="section-kicker mb-2">Readiness</div>
                  <h2 className="text-xl font-semibold text-foreground">Launch Gate</h2>
                </div>
                <div className="space-y-3 text-sm text-[var(--foreground-muted)]">
                  {[
                    ['Bundles', selectedBundles.size > 0 ? `${selectedBundles.size} selected` : 'none', selectedBundles.size > 0],
                    ['Scope', scopeReady ? 'ready' : 'incomplete', scopeReady],
                    ['Provider', modelSource === 'local' ? 'Corsair (Local)' : 'Cloud (OpenAI)', true],
                    ['Models', modelSource === 'local' ? (ollamaConnected ? `${ollamaModels.length} loaded` : 'not connected') : 'cloud defaults', modelSource === 'local' ? ollamaConnected : true],
                  ].map(([label, val, ok]) => (
                    <div key={label as string} className="flex items-center justify-between gap-3 rounded-[var(--radius-tight)] border border-[var(--border)] px-4 py-3">
                      <span>{label}</span>
                      <span className={`data-value ${ok ? 'text-[var(--success)]' : 'text-[var(--warning)]'}`}>{val}</span>
                    </div>
                  ))}
                </div>
              </CommandPanel>
          )}

          {generationMode === 'news' && (
            <CommandPanel className="p-5 md:p-6">
                <div className="mb-4">
                  <div className="section-kicker mb-2">Readiness</div>
                  <h2 className="text-xl font-semibold text-foreground">Launch Gate</h2>
                </div>
                <div className="space-y-3 text-sm text-[var(--foreground-muted)]">
                  {[
                    ['Headlines', newsArticles.length > 0 ? `${newsArticles.length} loaded` : 'not loaded', newsArticles.length > 0],
                    ['Selection', selectedArticleIds.size > 0 ? `${selectedArticleIds.size} articles` : 'none', selectedArticleIds.size > 0],
                    ['Analysis', classifications.length > 0 ? `${classifications.length} classified` : 'not run', classifications.length > 0],
                    ['Provider', modelSource === 'local' ? 'Corsair (Local)' : 'Cloud (OpenAI)', true],
                  ].map(([label, val, ok]) => (
                    <div key={label as string} className="flex items-center justify-between gap-3 rounded-[var(--radius-tight)] border border-[var(--border)] px-4 py-3">
                      <span>{label}</span>
                      <span className={`data-value ${ok ? 'text-[var(--success)]' : 'text-[var(--warning)]'}`}>{val}</span>
                    </div>
                  ))}
                </div>
              </CommandPanel>
          )}

          {generationMode !== 'blitz' && (
            <CommandPanel className="p-5 md:p-6 border-t-[3px] border-t-[var(--accent-primary)]">
              <div className="flex flex-col gap-3">
                {submitError && <div className="text-xs text-[var(--error)] p-3 rounded-[var(--radius-tight)] border border-[var(--error)] bg-[rgba(239,68,68,0.1)]">{submitError}</div>}
                
                {generationMode === 'manual' && (
                  <button type="button" onClick={() => void submitGeneration()} disabled={submitting} className="btn btn-command w-full justify-center py-2.5 text-sm">
                    {submitting ? 'Submitting…' : stageForReview ? 'Staged Generation' : 'Launch Job'}
                  </button>
                )}

                {generationMode === 'news' && (
                  <button type="button" onClick={() => void submitGeneration()} disabled={submitting || classifications.length === 0} className="btn btn-command w-full justify-center py-2.5 text-sm">
                    {submitting ? 'Submitting…' : `Launch ${newsClassifiedBundles.size} Job${newsClassifiedBundles.size === 1 ? '' : 's'}`}
                  </button>
                )}
              </div>
            </CommandPanel>
          )}

          {generationMode !== 'blitz' && jobId && <JobMonitor jobId={jobId} />}
          
        </div>
      </div>
    </div>
  );
}
