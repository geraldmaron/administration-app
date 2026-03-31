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
import BlitzInventoryGrid from '@/components/BlitzInventoryGrid';
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
            className={`min-h-[40px] rounded-[10px] px-4 py-2 text-[11px] font-mono uppercase tracking-[0.18em] transition-colors ${
              active ? 'bg-[rgba(25,105,220,0.14)] text-foreground' : 'text-[var(--foreground-muted)] hover:bg-background-muted hover:text-foreground'
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
      <div className="mb-3 flex items-center justify-between text-[11px] font-mono uppercase tracking-[0.14em] text-[var(--foreground-subtle)]">
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
  const [newsContextEnabled, setNewsContextEnabled] = useState(false);
  const [sortColumn, setSortColumn] = useState<'name' | 'total' | 'active'>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [executionTarget, setExecutionTarget] = useState<ExecutionTarget>('n8n');
  const [ollamaModels, setOllamaModels] = useState<string[]>([]);
  const [ollamaConnected, setOllamaConnected] = useState(false);

  // — blitz mode state
  const [blitzLoading, setBlitzLoading] = useState(false);
  const [blitzDeficits, setBlitzDeficits] = useState<DeficitCell[]>([]);
  const [blitzAllocation, setBlitzAllocation] = useState<TierAllocation | null>(null);
  const [blitzPlannedJobs, setBlitzPlannedJobs] = useState<GenerationJobRequest[]>([]);
  const [blitzSummary, setBlitzSummary] = useState<{ totalRequested: number; totalDeficit: number; jobsToCreate: number; scenariosToGenerate: number; availableSlots: number } | null>(null);
  const [blitzJobIds, setBlitzJobIds] = useState<string[]>([]);
  const [blitzTotalScenarios, setBlitzTotalScenarios] = useState(24);

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
        body: JSON.stringify({ totalScenarios: blitzTotalScenarios, executionTarget }),
      });
      const data = await res.json();
      if (!res.ok) { setSubmitError(data.error ?? 'Failed to execute blitz'); return; }
      setBlitzJobIds(data.jobIds ?? []);
      if (data.jobIds?.length > 0) setJobId(data.jobIds[0]);
    } catch {
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
    if (executionTarget !== 'n8n' || ollamaModels.length === 0) return undefined;
    return buildOllamaModelConfig(ollamaModels);
  }, [executionTarget, ollamaModels]);

  const sharedRequestFields = useMemo(() => ({
    priority,
    executionTarget,
    ...(ollamaModelConfig ? { modelConfig: ollamaModelConfig } : {}),
    ...(description ? { description } : {}),
    ...(stageForReview ? { dryRun: true } : {}),
  }), [priority, description, stageForReview, executionTarget, ollamaModelConfig]);

  const manualRequestsPlanned = useMemo(() => buildManualGenerationRequests({
    bundles: Array.from(selectedBundles),
    count,
    distributionConfig: STORY_MODE_DIST[storyMode],
    targetMode,
    selectedRegions: Array.from(selectedRegions),
    selectedCountry,
    exclusivityReason,
    priority,
  }), [selectedBundles, count, storyMode, targetMode, selectedRegions, selectedCountry, exclusivityReason, priority]);

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
  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

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
          const res = await fetch('/api/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(requestBody) });
          const data = await res.json() as { jobId?: string; error?: string };
          if (!res.ok) { setSubmitError(data.error ?? 'Failed to create job.'); return; }
          if (!firstJobId && data.jobId) firstJobId = data.jobId;
        }
        setJobId(firstJobId);
      } catch {
        setSubmitError('Network error while creating the job.');
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
    } catch {
      setSubmitError('Network error while creating jobs.');
    } finally {
      setSubmitting(false);
    }
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
        <h2 className="text-xl font-semibold text-foreground">Execution Path</h2>
      </div>
      <div className="flex items-center gap-3">
        {(['n8n', 'cloud_function'] as const).map((target) => (
          <button key={target} type="button"
            onClick={() => setExecutionTarget(target)}
            className={`rounded-full border px-4 py-2 text-[11px] font-mono uppercase tracking-[0.14em] transition-colors ${
              executionTarget === target
                ? 'border-[var(--accent-secondary)] bg-[rgba(212,170,44,0.12)] text-foreground'
                : 'border-[var(--border)] text-[var(--foreground-muted)] hover:border-[var(--border-strong)] hover:text-foreground'
            }`}>
            {target === 'n8n' ? 'AI Server' : 'OpenAI'}
          </button>
        ))}
      </div>

      {executionTarget === 'n8n' ? (
        <div className="mt-4">
          <div className="flex items-center gap-2 mb-3">
            <span className={`h-2 w-2 rounded-full ${ollamaConnected ? 'bg-[var(--success)]' : 'bg-[var(--error)]'}`} />
            <span className="text-xs text-[var(--foreground-muted)]">
              {ollamaConnected ? `${ollamaModels.length} models on server` : 'Server not reachable'}
            </span>
          </div>
          {ollamaModelConfig && (
            <div className="rounded-[var(--radius-tight)] border border-[var(--border)] px-4 py-3 space-y-1.5">
              {([
                ['Architect', ollamaModelConfig.architectModel],
                ['Drafter', ollamaModelConfig.drafterModel],
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
        <p className="mt-3 text-xs text-[var(--foreground-muted)]">
          Routes to OpenAI gpt-4o-mini via Cloud Functions.
        </p>
      )}
    </CommandPanel>
  );

  const runSettingsPanel = (
    <div className="grid gap-6 lg:grid-cols-2">
      <CommandPanel className="p-5 md:p-6">
        <div className="mb-4">
          <div className="section-kicker mb-2">Instruction Overlay</div>
          <h2 className="text-xl font-semibold text-foreground">Prompt Guidance</h2>
        </div>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional: editorial focus, current event framing, excluded topics, or pacing instructions."
          rows={5} className="input-shell resize-y" />
      </CommandPanel>

      <CommandPanel className="p-5 md:p-6">
        <div className="mb-4">
          <div className="section-kicker mb-2">Output Behavior</div>
          <h2 className="text-xl font-semibold text-foreground">Review Before Saving</h2>
        </div>
        <div className="flex items-start justify-between gap-4 rounded-[var(--radius-tight)] border border-[var(--border)] px-4 py-3">
          <div>
            <div className="text-sm font-medium text-foreground">Stage for review</div>
            <div className="mt-0.5 text-xs text-[var(--foreground-muted)]">
              Hold generated scenarios in a staging queue. Approve or reject each before they enter the library.
            </div>
          </div>
          <button type="button" onClick={() => setStageForReview((v) => !v)}
            className={`mt-0.5 shrink-0 rounded-full border px-3 py-2 text-[10px] font-mono uppercase tracking-[0.18em] ${
              stageForReview ? 'border-[var(--accent-secondary)] bg-[rgba(212,170,44,0.12)] text-foreground' : 'border-[var(--border)] text-[var(--foreground-muted)]'
            }`}>
            {stageForReview ? 'On' : 'Off'}
          </button>
        </div>
      </CommandPanel>
    </div>
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

      {generationMode === 'blitz' ? (
        /* ─── BLITZ MODE ─── */
        <div className="space-y-6">
          <CommandPanel className="p-5 md:p-6">
            <div className="mb-5">
              <div className="section-kicker mb-2">Request</div>
              <h2 className="text-xl font-semibold text-foreground">Total Scenarios to Create</h2>
            </div>
            <p className="mb-4 text-xs text-[var(--foreground-muted)]">
              Enter the total number of scenarios you want this blitz run to create. The planner analyses current inventory gaps, then distributes that total across bundles and scope tiers using the canonical ratio: 40% universal, 25% regional, 25% cluster, 10% exclusive.
            </p>
            <div className="flex items-center gap-4">
              <input
                type="number"
                min={1}
                max={200}
                value={blitzTotalScenarios}
                onChange={(e) => setBlitzTotalScenarios(Math.max(1, Math.min(200, Number(e.target.value) || 1)))}
                className="input-shell w-24 text-center"
              />
              <button
                type="button"
                onClick={() => fetchBlitzPreview(blitzTotalScenarios)}
                disabled={blitzLoading}
                className="btn btn-tactical"
              >
                {blitzLoading ? 'Analysing…' : 'Analyse Distribution'}
              </button>
            </div>
          </CommandPanel>

          {blitzAllocation && (
            <>
              <BlitzInventoryGrid deficits={blitzDeficits} allocation={blitzAllocation} />

              {blitzSummary && (
                <div className="grid grid-cols-4 gap-3">
                  <DataStat size="compact" label="Requested" value={blitzSummary.totalRequested} accent="blue" />
                  <DataStat size="compact" label="Inventory Gap" value={blitzSummary.totalDeficit} accent={blitzSummary.totalDeficit > 0 ? 'warning' : 'success'} />
                  <DataStat size="compact" label="Jobs Planned" value={blitzSummary.jobsToCreate} accent="blue" />
                  <DataStat size="compact" label="Planned Output" value={blitzSummary.scenariosToGenerate} accent="gold" />
                </div>
              )}

              {blitzPlannedJobs.length > 0 && (
                <CommandPanel className="p-5 md:p-6">
                  <div className="mb-4">
                    <div className="section-kicker mb-2">Planned Jobs</div>
                    <h2 className="text-xl font-semibold text-foreground">Generated Distribution</h2>
                  </div>
                  <div className="space-y-2">
                    {blitzPlannedJobs.map((job, i) => (
                      <div key={i} className="flex items-center justify-between rounded-[var(--radius-tight)] border border-[var(--border)] px-4 py-2.5 text-sm">
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] font-mono uppercase tracking-[0.15em] text-[var(--foreground-subtle)]">{job.scopeTier}</span>
                          <span className="text-[var(--foreground-muted)]">{job.scopeKey}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {job.bundles.map((b) => <BundleBadge key={b} bundle={b} />)}
                          <span className="text-xs text-[var(--foreground-subtle)]">&times;{job.count}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CommandPanel>
              )}

              {blitzPlannedJobs.length === 0 && blitzDeficits.length === 0 && (
                <CommandPanel className="p-5 md:p-6">
                  <div className="text-sm text-[var(--success)]">Inventory gaps are already covered well enough that blitz has nothing useful to schedule.</div>
                </CommandPanel>
              )}

              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={handleBlitzExecute}
                  disabled={submitting || blitzPlannedJobs.length === 0}
                  className="btn btn-command"
                >
                  {submitting ? 'Submitting…' : `Execute Blitz (${blitzSummary?.scenariosToGenerate ?? 0} scenarios)`}
                </button>
              </div>

              {submitError && <div className="text-xs text-[var(--error)]">{submitError}</div>}

              {blitzJobIds.length > 0 && (
                <div className="space-y-4">
                  <div className="section-kicker">Active Blitz Jobs</div>
                  {blitzJobIds.map((id) => <JobMonitor key={id} jobId={id} />)}
                </div>
              )}
            </>
          )}
        </div>
      ) : generationMode === 'manual' ? (
        <>
          <div className="mb-4 flex flex-wrap gap-3">
            <DataStat size="compact" label="Bundles" value={selectedBundles.size} accent="blue" />
            <DataStat size="compact" label="Scenarios" value={expectedManualCount || 0} accent="gold" />
            <DataStat size="compact" label="Scope" value={targetSummary} />
            <DataStat size="compact" label="Format" value={STORY_MODE_LABELS[storyMode]} />
            <DataStat size="compact" label="Provider" value="Cloud" />
          </div>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_420px]">
            <form onSubmit={handleSubmit} className="space-y-6">

              <CommandPanel className="p-5 md:p-6">
                <div className="mb-5 flex items-start justify-between gap-4">
                  <div>
                    <div className="section-kicker mb-2">Bundles</div>
                    <h2 className="text-xl font-semibold text-foreground">Content Lanes</h2>
                  </div>
                  <div className="flex items-center gap-3">
                    <button type="button"
                      onClick={() => {
                        if (selectedBundles.size === ALL_BUNDLES.length) {
                          setSelectedBundles(new Set());
                        } else {
                          setSelectedBundles(new Set(ALL_BUNDLES.map(b => b.id)));
                        }
                      }}
                      className="text-[10px] font-mono uppercase tracking-[0.14em] rounded px-2.5 py-1.5 border border-[var(--border)] text-[var(--foreground-muted)] hover:border-[var(--border-strong)] hover:text-foreground transition-colors">
                      {selectedBundles.size === ALL_BUNDLES.length ? 'Clear All' : 'Select All'}
                    </button>
                    <span className="text-xs text-[var(--foreground-muted)]">
                      {selectedBundles.size > 0 ? `${selectedBundles.size} selected` : 'Pick one or more'}
                    </span>
                    <button type="button"
                      onClick={() => setNewsContextEnabled((v) => !v)}
                      className={`text-[10px] font-mono uppercase tracking-[0.14em] rounded px-2.5 py-1.5 border transition-colors ${
                        newsContextEnabled
                          ? 'border-[var(--accent-primary)] bg-[rgba(25,105,220,0.12)] text-[var(--accent-primary)]'
                          : 'border-[var(--border)] text-[var(--foreground-muted)] hover:border-[var(--border-strong)] hover:text-foreground'
                      }`}>
                      {newsContextEnabled ? 'News On' : 'News'}
                    </button>
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
                            className="flex items-center gap-1 text-[10px] font-mono uppercase tracking-[0.14em] text-[var(--foreground-subtle)] hover:text-foreground transition-colors">
                            Bundle <span>{sortColumn === 'name' ? (sortDirection === 'asc' ? '↑' : '↓') : <span className="opacity-30">↕</span>}</span>
                          </button>
                        </th>
                        <th className="pb-2.5 pr-6 text-right">
                          <button type="button" onClick={() => handleSortColumn('total')}
                            className="flex w-full items-center justify-end gap-1 text-[10px] font-mono uppercase tracking-[0.14em] text-[var(--foreground-subtle)] hover:text-foreground transition-colors">
                            Total <span>{sortColumn === 'total' ? (sortDirection === 'asc' ? '↑' : '↓') : <span className="opacity-30">↕</span>}</span>
                          </button>
                        </th>
                        <th className="pb-2.5 pr-2 text-right">
                          <button type="button" onClick={() => handleSortColumn('active')}
                            className="flex w-full items-center justify-end gap-1 text-[10px] font-mono uppercase tracking-[0.14em] text-[var(--foreground-subtle)] hover:text-foreground transition-colors">
                            Active <span>{sortColumn === 'active' ? (sortDirection === 'asc' ? '↑' : '↓') : <span className="opacity-30">↕</span>}</span>
                          </button>
                        </th>
                        {Object.keys(newsCountByBundle).length > 0 && (
                          <th className="pb-2.5 pr-1 text-right">
                            <span className="text-[10px] font-mono uppercase tracking-[0.14em] text-[var(--foreground-subtle)]">News</span>
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
                            className={`cursor-pointer border-b border-[var(--border)] last:border-b-0 transition-colors hover:bg-[rgba(255,255,255,0.025)] ${isActive ? 'bg-[rgba(25,105,220,0.06)]' : ''}`}>
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
                                  ? <span className="inline-flex items-center justify-center rounded-full bg-[rgba(25,105,220,0.18)] px-2 py-0.5 text-[11px] font-mono text-[var(--accent-primary)]">{nCount}</span>
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

              {/* Inline news context — shown when the News toggle is on */}
              {newsContextEnabled && (
                <CommandPanel className="p-5 md:p-6">
                  <div className="mb-5 flex items-start justify-between gap-4">
                    <div>
                      <div className="section-kicker mb-2">News Context</div>
                      <h2 className="text-xl font-semibold text-foreground">Ground in Headlines</h2>
                    </div>
                    {newsArticles.length > 0 && (
                      <span className="text-xs text-[var(--foreground-muted)]">{selectedArticleIds.size} of {newsArticles.length} selected</span>
                    )}
                  </div>
                  <div className="mb-4 flex flex-wrap items-center gap-4">
                    <div>
                      <label className="section-kicker mb-1 block">Headlines to load</label>
                      <select value={newsLoadCount} onChange={(e) => setNewsLoadCount(Number(e.target.value))} className="input-shell w-auto">
                        {[10, 20, 30, 50].map((n) => <option key={n} value={n}>{n}</option>)}
                      </select>
                    </div>
                    <button type="button" onClick={fetchNews} disabled={newsLoading} className="btn btn-tactical self-end">
                      {newsLoading ? 'Fetching…' : newsArticles.length > 0 ? 'Refresh' : 'Load Headlines'}
                    </button>
                    {newsArticles.length > 0 && selectedArticleIds.size > 0 && (
                      <button type="button" onClick={classifySelected} disabled={classifying} className="btn btn-ghost self-end">
                        {classifying ? 'Analysing…' : classifications.length > 0 ? 'Re-classify' : `Classify ${selectedArticleIds.size} selected`}
                      </button>
                    )}
                  </div>
                  <p className="mb-4 text-xs text-[var(--foreground-muted)]">
                    Selected articles provide thematic context to the architect — bundles and scope come from your selections above.
                    {visibleArticleIndices !== null && selectedBundles.size > 0 && ` Filtered to ${selectedBundles.size} selected bundle${selectedBundles.size === 1 ? '' : 's'}.`}
                  </p>
                  {newsError && <div className="mb-3 text-xs text-[var(--error)]">{newsError}</div>}
                  {classifyError && <div className="mb-3 text-xs text-[var(--error)]">{classifyError}</div>}
                  {newsArticles.length > 0 && (
                    <>
                      <div className="mb-2 flex items-center justify-between">
                        <span className="section-kicker">{selectedArticleIds.size} selected</span>
                        <button type="button"
                          className="text-[10px] font-mono uppercase tracking-[0.14em] text-[var(--foreground-muted)] hover:text-foreground"
                          onClick={() => setSelectedArticleIds(selectedArticleIds.size === newsArticles.length ? new Set() : new Set(newsArticles.map((_, i) => i)))}>
                          {selectedArticleIds.size === newsArticles.length ? 'Deselect all' : 'Select all'}
                        </button>
                      </div>
                      <div className="max-h-[360px] space-y-1.5 overflow-y-auto pr-1">
                        {newsArticles.map((article, idx) => {
                          if (visibleArticleIndices !== null && !visibleArticleIndices.has(idx)) return null;
                          const selected = selectedArticleIds.has(idx);
                          const artBundle = effectiveBundle(idx);
                          const classification = classifications.find((c) => c.articleIndex === idx);
                          return (
                            <button key={idx} type="button" onClick={() => toggleArticle(idx)}
                              className={`w-full rounded-[var(--radius-tight)] border p-3 text-left transition-colors ${
                                selected ? 'border-[var(--accent-primary)] bg-[rgba(25,105,220,0.08)]' : 'border-[var(--border)] bg-[rgba(255,255,255,0.02)] hover:border-[var(--border-strong)]'
                              }`}>
                              <div className="flex items-start gap-3">
                                <span className={`mt-0.5 h-4 w-4 shrink-0 rounded border ${selected ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]' : 'border-[var(--border)]'} flex items-center justify-center`}>
                                  {selected && <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 10 8"><path d="M1 4l3 3 5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                                </span>
                                <div className="min-w-0 flex-1">
                                  <div className="mb-1 flex flex-wrap items-center gap-2">
                                    <span className="text-[10px] font-mono uppercase tracking-[0.14em] text-[var(--foreground-subtle)]">{article.source}</span>
                                    {article.pubDate && <span className="text-[10px] text-[var(--foreground-subtle)]">{formatPubDate(article.pubDate)}</span>}
                                    {classification && artBundle && (
                                      <span className="rounded px-1.5 py-0.5 text-[10px] font-mono uppercase tracking-[0.1em]"
                                        style={{ background: `${BUNDLE_ACCENT_COLORS[artBundle]}22`, color: BUNDLE_ACCENT_COLORS[artBundle] }}>
                                        {artBundle}
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-sm font-medium leading-5 text-foreground">{article.title}</div>
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </>
                  )}
                </CommandPanel>
              )}

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

              <div className="grid gap-6 lg:grid-cols-2">
                <CommandPanel className="p-5 md:p-6">
                  <div className="mb-5">
                    <div className="section-kicker mb-2">Story Format</div>
                    <h2 className="text-xl font-semibold text-foreground">Scenario Structure</h2>
                  </div>
                  <div className="space-y-3">
                    {(['standalone', 'two-part', 'three-part'] as StoryMode[]).map((mode) => (
                      <button key={mode} type="button" onClick={() => setStoryMode(mode)}
                        className={`w-full rounded-[var(--radius-tight)] border p-4 text-left transition-colors ${
                          storyMode === mode ? 'border-[var(--accent-primary)] bg-[rgba(25,105,220,0.12)]' : 'border-[var(--border)] bg-[rgba(255,255,255,0.02)] hover:border-[var(--border-strong)] hover:bg-[rgba(255,255,255,0.03)]'
                        }`}>
                        <div className="mb-1 flex items-center justify-between gap-3">
                          <span className="text-sm font-semibold text-foreground">{STORY_MODE_LABELS[mode]}</span>
                          {mode === 'standalone' && <span className="text-[10px] font-mono uppercase tracking-[0.14em] text-[var(--foreground-subtle)]">Default</span>}
                        </div>
                        <p className="text-xs leading-5 text-[var(--foreground-muted)]">{STORY_MODE_DESCRIPTIONS[mode]}</p>
                      </button>
                    ))}
                  </div>
                </CommandPanel>

                <CommandPanel className="p-5 md:p-6">
                  <div className="mb-5">
                    <div className="section-kicker mb-2">Queue Priority</div>
                    <h2 className="text-xl font-semibold text-foreground">Processing Order</h2>
                  </div>
                  <SegmentedControl value={priority} onChange={setPriority}
                    options={[{ value: 'low', label: 'Low' }, { value: 'normal', label: 'Normal' }, { value: 'high', label: 'High' }]} />
                  <p className="mt-3 text-xs text-[var(--foreground-muted)]">{PRIORITY_DESCRIPTIONS[priority]}</p>
                </CommandPanel>
              </div>

              {aiModelsPanel}
              {runSettingsPanel}

              {submitError && <CommandPanel tone="danger" className="p-4 text-sm text-[var(--error)]">{submitError}</CommandPanel>}
              <div className="flex flex-wrap items-center gap-3">
                <button type="submit" className="btn btn-command" disabled={submitting}>
                  {submitting ? 'Submitting…' : stageForReview ? 'Launch with Review Queue' : 'Launch Generation Job'}
                </button>
                <Link href="/jobs" className="btn btn-ghost">Job Queue</Link>
              </div>
            </form>

            <div className="space-y-6 xl:sticky xl:top-6 xl:self-start">
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
                    ['Provider', 'Cloud'],
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

              {jobId && <JobMonitor jobId={jobId} />}

              <CommandPanel className="p-5 md:p-6">
                <div className="mb-4">
                  <div className="section-kicker mb-2">Readiness</div>
                  <h2 className="text-xl font-semibold text-foreground">Launch Gate</h2>
                </div>
                <div className="space-y-3 text-sm text-[var(--foreground-muted)]">
                  {[
                    ['Bundles', selectedBundles.size > 0 ? `${selectedBundles.size} selected` : 'none', selectedBundles.size > 0],
                    ['Scope', scopeReady ? 'ready' : 'incomplete', scopeReady],
                    ['Provider', 'cloud', true],
                    ['Models', 'cloud defaults', true],
                  ].map(([label, val, ok]) => (
                    <div key={label as string} className="flex items-center justify-between gap-3 rounded-[var(--radius-tight)] border border-[var(--border)] px-4 py-3">
                      <span>{label}</span>
                      <span className={`data-value ${ok ? 'text-[var(--success)]' : 'text-[var(--warning)]'}`}>{val}</span>
                    </div>
                  ))}
                </div>
              </CommandPanel>
            </div>
          </div>
        </>
      ) : (
        /* ─── NEWS MODE ─── */
        <>
          <div className="mb-4 flex flex-wrap gap-3">
            <DataStat size="compact" label="Articles Available" value={newsArticles.length || '—'} accent="blue" />
            <DataStat size="compact" label="Selected" value={selectedArticleIds.size || '—'} accent="gold" />
            <DataStat size="compact" label="Bundles Identified" value={newsClassifiedBundles.size || '—'} />
            <DataStat size="compact" label="Scenarios to Generate" value={newsScenariosExpected || '—'} />
            <DataStat size="compact" label="Provider" value="Cloud" />
          </div>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_420px]">
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
                            className="flex items-center gap-1 text-[10px] font-mono uppercase tracking-[0.14em] text-[var(--foreground-subtle)] hover:text-foreground transition-colors">
                            Bundle <span>{sortColumn === 'name' ? (sortDirection === 'asc' ? '↑' : '↓') : <span className="opacity-30">↕</span>}</span>
                          </button>
                        </th>
                        <th className="pb-2.5 pr-6 text-right">
                          <button type="button" onClick={() => handleSortColumn('total')}
                            className="flex w-full items-center justify-end gap-1 text-[10px] font-mono uppercase tracking-[0.14em] text-[var(--foreground-subtle)] hover:text-foreground transition-colors">
                            Total <span>{sortColumn === 'total' ? (sortDirection === 'asc' ? '↑' : '↓') : <span className="opacity-30">↕</span>}</span>
                          </button>
                        </th>
                        {Object.keys(newsCountByBundle).length > 0 && (
                          <th className="pb-2.5 pr-1 text-right">
                            <span className="text-[10px] font-mono uppercase tracking-[0.14em] text-[var(--foreground-subtle)]">Articles</span>
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
                            className={`cursor-pointer border-b border-[var(--border)] last:border-b-0 transition-colors hover:bg-[rgba(255,255,255,0.025)] ${isActive ? 'bg-[rgba(25,105,220,0.06)]' : ''}`}>
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
                                  ? <span className="inline-flex items-center justify-center rounded-full bg-[rgba(25,105,220,0.18)] px-2 py-0.5 text-[11px] font-mono text-[var(--accent-primary)]">{nCount}</span>
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
                            selected ? 'border-[var(--accent-primary)] bg-[rgba(25,105,220,0.08)]' : 'border-[var(--border)] bg-[rgba(255,255,255,0.02)] hover:border-[var(--border-strong)] hover:bg-[rgba(255,255,255,0.03)]'
                          }`}>
                          <div className="flex items-start gap-3">
                            <span className={`mt-0.5 h-4 w-4 shrink-0 rounded border ${selected ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]' : 'border-[var(--border)]'} flex items-center justify-center`}>
                              {selected && <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 10 8"><path d="M1 4l3 3 5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2 mb-1">
                                <span className="text-[10px] font-mono uppercase tracking-[0.14em] text-[var(--foreground-subtle)]">{article.source}</span>
                                {article.pubDate && <span className="text-[10px] text-[var(--foreground-subtle)]">{formatPubDate(article.pubDate)}</span>}
                                {classification && bundle && (
                                  <span className="rounded px-1.5 py-0.5 text-[10px] font-mono uppercase tracking-[0.1em]"
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
                            storyMode === mode ? 'border-[var(--accent-primary)] bg-[rgba(25,105,220,0.12)] text-foreground' : 'border-[var(--border)] text-[var(--foreground-muted)] hover:text-foreground'
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

              {/* Step 7 — Run settings */}
              {classifications.length > 0 && runSettingsPanel}

              {submitError && <CommandPanel tone="danger" className="p-4 text-sm text-[var(--error)]">{submitError}</CommandPanel>}

              {classifications.length > 0 && (
                <div className="flex flex-wrap items-center gap-3">
                  <button type="submit" className="btn btn-command" disabled={submitting}>
                    {submitting
                      ? 'Submitting…'
                      : stageForReview
                        ? `Launch ${newsClassifiedBundles.size} Job${newsClassifiedBundles.size === 1 ? '' : 's'} with Review Queue`
                        : `Launch ${newsClassifiedBundles.size} Job${newsClassifiedBundles.size === 1 ? '' : 's'}`}
                  </button>
                  <Link href="/jobs" className="btn btn-ghost">Job Queue</Link>
                </div>
              )}
            </form>

            {/* Sidebar */}
            <div className="space-y-6 xl:sticky xl:top-6 xl:self-start">
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
                    <span className="data-value text-foreground">Cloud</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span>Total scenarios</span>
                    <span className="data-value text-foreground">{newsScenariosExpected || '—'}</span>
                  </div>
                </div>
              </CommandPanel>

              {jobId && <JobMonitor jobId={jobId} />}

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
                    ['Provider', 'cloud', true],
                  ].map(([label, val, ok]) => (
                    <div key={label as string} className="flex items-center justify-between gap-3 rounded-[var(--radius-tight)] border border-[var(--border)] px-4 py-3">
                      <span>{label}</span>
                      <span className={`data-value ${ok ? 'text-[var(--success)]' : 'text-[var(--warning)]'}`}>{val}</span>
                    </div>
                  ))}
                </div>
              </CommandPanel>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
