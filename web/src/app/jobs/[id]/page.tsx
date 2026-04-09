'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import CommandPanel from '@/components/CommandPanel';
import DataStat from '@/components/DataStat';
import BundleBadge from '@/components/BundleBadge';
import AuditScore from '@/components/AuditScore';
import StatusBadge from '@/components/StatusBadge';
import { ALL_BUNDLES, BUNDLE_ACCENT_COLORS } from '@/lib/constants';
import type { JobDetail, JobResult, JobError, JobEvent, JobLiveActivity, NewsContextArticle } from '@/lib/types';

// ─── Types ───────────────────────────────────────────────────────

type SortField = 'title' | 'bundle' | 'auditScore' | 'autoFixed';
type SortDir = 'asc' | 'desc';
type JobHealth = 'healthy' | 'warning' | 'critical' | 'idle';

interface LLMMessage {
  direction: 'out' | 'in';
  model?: string;
  content: string;
  preview?: string;
  timestamp?: string;
  tokensIn?: number;
  tokensOut?: number;
  elapsedMs?: number;
  charCount?: number;
}

interface PipelinePhase {
  name: string;
  label: string;
  status: 'active' | 'done' | 'failed';
  startedAt?: string;
  completedAt?: string;
  durationMs?: number;
  tokensIn?: number;
  tokensOut?: number;
  messages: LLMMessage[];
  issues?: string[];
  score?: number;
}

interface PipelineRun {
  index: number;
  title?: string;
  scenarioId?: string;
  status: 'active' | 'saved' | 'rejected' | 'failed';
  phases: PipelinePhase[];
  auditScore?: number;
  startedAt?: string;
  completedAt?: string;
  totalDurationMs?: number;
  totalTokensIn: number;
  totalTokensOut: number;
}

interface BundlePipeline {
  bundleId: string;
  label: string;
  status: 'pending' | 'active' | 'done';
  runs: PipelineRun[];
  savedCount: number;
  failedCount: number;
  expectedCount: number;
  totalDurationMs?: number;
  avgRunDurationMs?: number;
  estimatedRemainingMs?: number;
}

// ─── Constants ───────────────────────────────────────────────────

const STATUS_STYLES: Record<string, { dot: string; text: string; ring: string }> = {
  pending:   { dot: 'bg-[var(--info)]',             text: 'text-[var(--info)]',             ring: 'border-[var(--info)]/30' },
  running:   { dot: 'bg-[var(--accent-primary)]',   text: 'text-[var(--accent-primary)]',   ring: 'border-[var(--accent-primary)]/30' },
  completed: { dot: 'bg-[var(--success)]',           text: 'text-[var(--success)]',           ring: 'border-[var(--success)]/30' },
  failed:    { dot: 'bg-[var(--error)]',             text: 'text-[var(--error)]',             ring: 'border-[var(--error)]/30' },
  cancelled: { dot: 'bg-[var(--foreground-muted)]', text: 'text-foreground-muted',           ring: 'border-[var(--border-strong)]' },
};

const PHASE_META: Record<string, { label: string; icon: string; tip: string }> = {
  generate:         { label: 'Generate',  icon: '\u26A1',            tip: 'Core generation step' },
  concept:          { label: 'Concept',   icon: '\uD83D\uDCA1',      tip: 'Generate scenario seed ideas' },
  blueprint:        { label: 'Blueprint', icon: '\uD83D\uDCD0',      tip: 'Outline narrative structure' },
  details:          { label: 'Details',   icon: '\u270F\uFE0F',      tip: 'Write full scenario content' },
  skeleton:         { label: 'Skeleton',  icon: '\u270F\uFE0F',      tip: 'Draft scenario skeleton (Phase A)' },
  effects:          { label: 'Effects',   icon: '\u26A1',            tip: 'Generate effects & outcomes (Phase B)' },
  advisor:          { label: 'Advisor',   icon: '\uD83D\uDDE3\uFE0F', tip: 'Generate advisor feedback (Phase C)' },
  audit:            { label: 'Audit',     icon: '\uD83D\uDD0D',      tip: 'Validate against quality rules' },
  repair:           { label: 'Repair',    icon: '\uD83D\uDD27',      tip: 'Fix audit failures via LLM' },
  save:             { label: 'Save',      icon: '\uD83D\uDCBE',      tip: 'Persist to database' },
  dedup:            { label: 'Dedup',     icon: '\uD83D\uDD04',      tip: 'Check for duplicate content' },
  quality_gate:     { label: 'Quality',   icon: '\u2B50',            tip: 'Content quality evaluation' },
  narrative_review: { label: 'Narrative', icon: '\uD83D\uDCD6',      tip: 'Narrative coherence review' },
};

const PHASE_LABELS: Record<string, string> = Object.fromEntries(
  Object.entries(PHASE_META).map(([k, v]) => [k, v.label])
);

type EventLevel = 'info' | 'warning' | 'error' | 'success';

const EVENT_LEVEL_STYLES: Record<EventLevel, { bg: string; text: string; label: string }> = {
  info:    { bg: 'bg-[var(--info)]/15', text: 'text-[var(--info)]', label: 'INFO' },
  warning: { bg: 'bg-[#f59e0b]/15', text: 'text-[#f59e0b]', label: 'WARN' },
  error:   { bg: 'bg-[var(--error)]/15', text: 'text-[var(--error)]', label: 'ERR' },
  success: { bg: 'bg-[var(--success)]/15', text: 'text-[var(--success)]', label: 'OK' },
};

const EVENT_CODE_LABELS: Record<string, string> = {
  job_started: 'Job Started',
  job_completed: 'Job Completed',
  job_cancelled: 'Job Cancelled',
  job_exception: 'Job Exception',
  job_stop_requested: 'Stop Requested',
  job_force_cancelled: 'Force Cancelled',
  bundle_started: 'Bundle Started',
  bundle_complete: 'Bundle Complete',
  bundle_generated: 'Bundle Generated',
  bundle_generation_failed: 'Bundle Failed',
  bundle_zero_output: 'Bundle Zero Output',
  bundle_skipped_ceiling: 'Bundle Skipped (Ceiling)',
  scenario_saved: 'Scenario Saved',
  scenario_staged: 'Scenario Staged',
  scenario_rejected: 'Scenario Rejected',
  generation_attempt_failed: 'Attempt Failed',
  llm_request: 'LLM Request',
  llm_response: 'LLM Response',
  llm_progress: 'LLM Progress',
  audit_pass: 'Audit Passed',
  audit_fail: 'Audit Failed',
  repair_improved: 'Repair Improved',
  repair_no_improvement: 'Repair No Change',
  quality_gate: 'Quality Gate',
  narrative_review: 'Narrative Review',
  phase_concept: 'Phase: Concept',
  phase_blueprint: 'Phase: Blueprint',
  phase_details: 'Phase: Details',
};

type CollapsedEvent = JobEvent & { repeatCount?: number; firstTimestamp?: string; lastTimestamp?: string };

function collapseConsecutiveEvents(events: JobEvent[]): CollapsedEvent[] {
  const result: CollapsedEvent[] = [];
  for (const evt of events) {
    const prev = result[result.length - 1];
    if (prev && prev.code === evt.code && prev.bundle === evt.bundle && prev.level === evt.level) {
      prev.repeatCount = (prev.repeatCount ?? 1) + 1;
      prev.lastTimestamp = prev.lastTimestamp ?? prev.timestamp;
      prev.firstTimestamp = evt.timestamp;
    } else {
      result.push({ ...evt });
    }
  }
  return result;
}

const HEARTBEAT_WARNING_MS = 3 * 60 * 1000;
const HEARTBEAT_CRITICAL_MS = 8 * 60 * 1000;

// ─── Utility Functions ───────────────────────────────────────────

function formatTimestamp(iso: string | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function duration(startIso: string | undefined, endIso: string | undefined): string {
  if (!startIso || !endIso) return '—';
  const ms = new Date(endIso).getTime() - new Date(startIso).getTime();
  if (ms < 0) return '—';
  return formatElapsed(ms);
}

function summarizeProvider(job: Pick<JobDetail, 'executionTarget' | 'modelConfig' | 'mode'>): string {
  if (job.mode === 'full_send') return 'Full Send';
  const drafter = job.modelConfig?.drafterModel;
  if (drafter?.startsWith('ollama:')) return drafter.replace('ollama:', '');
  if (job.executionTarget === 'n8n') return 'n8n';
  if (job.executionTarget === 'local') return 'local';
  return 'cloud';
}

function formatElapsed(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}h ${m % 60}m ${s % 60}s`;
  if (m > 0) return `${m}m ${s % 60}s`;
  return `${s}s`;
}

function computeJobHealth(job: JobDetail): { health: JobHealth; staleMs: number } {
  if (job.status !== 'running' && job.status !== 'pending') {
    return { health: 'idle', staleMs: 0 };
  }
  const referenceIso = job.lastHeartbeatAt ?? job.startedAt ?? job.requestedAt;
  if (!referenceIso) return { health: 'idle', staleMs: 0 };
  const staleMs = Date.now() - new Date(referenceIso).getTime();
  if (staleMs >= HEARTBEAT_CRITICAL_MS) return { health: 'critical', staleMs };
  if (staleMs >= HEARTBEAT_WARNING_MS) return { health: 'warning', staleMs };
  return { health: 'healthy', staleMs };
}

function formatRelativeTime(isoOrUndef: string | undefined): string {
  if (!isoOrUndef) return '';
  const ms = Date.now() - new Date(isoOrUndef).getTime();
  if (ms < 0) return '';
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${s % 60}s ago`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m ago`;
}

function categorizeErrors(errors: JobError[]) {
  const dedupSkips = errors.filter((e) =>
    /duplicate_id|similar_content|similar/i.test(e.error)
  );
  const cooldownSkips = errors.filter(
    (e) => !!e.bundle && /cooldown/i.test(e.error)
  );
  const auditAttempts = errors.filter(
    (e) => /^attempt \d+\/\d+ failed:/i.test(e.error)
  );
  const generationErrors = errors.filter(
    (e) =>
      !/duplicate_id|similar_content|similar/i.test(e.error) &&
      !(!!e.bundle && /cooldown/i.test(e.error)) &&
      !/^attempt \d+\/\d+ failed:/i.test(e.error)
  );
  return { generationErrors, auditAttempts, dedupSkips, cooldownSkips };
}

// ─── Pipeline Building ──────────────────────────────────────────

const TERMINAL_CODES = new Set([
  'scenario_saved', 'scenario_staged', 'scenario_rejected', 'generation_attempt_failed',
]);

const SKIP_CODES = new Set([
  'bundle_started', 'bundle_generated', 'bundle_generation_failed',
  'bundle_zero_output', 'bundle_skipped_ceiling', 'bundle_complete',
  'job_started', 'job_completed', 'job_cancelled', 'job_exception',
  'llm_progress',
]);

function resolvePhase(event: JobEvent): string | undefined {
  if (event.phase) return event.phase;
  if (event.code?.startsWith('phase_')) return event.code.replace('phase_', '');
  if (event.code === 'audit_pass' || event.code === 'audit_fail') return 'audit';
  if (event.code === 'repair_improved' || event.code === 'repair_no_improvement') return 'repair';
  if (event.code === 'quality_gate') return 'quality_gate';
  if (event.code === 'narrative_review') return 'narrative_review';
  if (event.code === 'scenario_saved' || event.code === 'scenario_staged') return 'save';
  return undefined;
}

function buildPipelines(
  events: JobEvent[],
  bundles: string[],
  countPerBundle: number,
  liveActivity?: JobLiveActivity,
  perBundleCount?: Record<string, number>,
  currentBundle?: string,
): BundlePipeline[] {
  const pipelineMap: Record<string, BundlePipeline> = {};
  for (const b of bundles) {
    pipelineMap[b] = {
      bundleId: b,
      label: ALL_BUNDLES.find(ab => ab.id === b)?.label ?? b,
      status: 'pending',
      runs: [],
      savedCount: perBundleCount?.[b] ?? 0,
      failedCount: 0,
      expectedCount: countPerBundle,
    };
  }

  const eventsByBundle: Record<string, JobEvent[]> = {};
  for (const e of (events ?? [])) {
    if (!e.bundle || SKIP_CODES.has(e.code)) continue;
    if (!eventsByBundle[e.bundle]) eventsByBundle[e.bundle] = [];
    eventsByBundle[e.bundle].push(e);
  }

  for (const [bundleId, bundleEvents] of Object.entries(eventsByBundle)) {
    const pipeline = pipelineMap[bundleId];
    if (!pipeline) continue;
    pipeline.status = 'active';

    let currentRun: PipelineRun | null = null;
    let currentPhase: PipelinePhase | null = null;

    for (const event of bundleEvents) {
      if (!currentRun) {
        currentRun = {
          index: pipeline.runs.length + 1,
          phases: [],
          status: 'active',
          startedAt: event.timestamp,
          totalTokensIn: 0,
          totalTokensOut: 0,
        };
      }

      const eventPhase = resolvePhase(event);
      if (eventPhase && (!currentPhase || currentPhase.name !== eventPhase)) {
        if (currentPhase && currentPhase.status === 'active') {
          currentPhase.status = 'done';
          currentPhase.completedAt = event.timestamp;
          if (currentPhase.startedAt && currentPhase.completedAt) {
            currentPhase.durationMs = new Date(currentPhase.completedAt).getTime() - new Date(currentPhase.startedAt).getTime();
          }
        }
        currentPhase = {
          name: eventPhase,
          label: PHASE_LABELS[eventPhase] || eventPhase,
          status: 'active',
          startedAt: event.timestamp,
          messages: [],
        };
        currentRun.phases.push(currentPhase);
      }

      const d = event.data as Record<string, unknown> | undefined;

      if (event.code === 'llm_request') {
        currentPhase?.messages.push({
          direction: 'out',
          model: d?.model as string | undefined,
          content: event.message,
          preview: d?.promptPreview as string | undefined,
          timestamp: event.timestamp,
          charCount: d?.charCount as number | undefined,
        });
      } else if (event.code === 'llm_response') {
        const tokIn = (d?.inputTokens as number) ?? 0;
        const tokOut = (d?.outputTokens as number) ?? 0;
        const elapsed = d?.elapsed as number | undefined;
        currentPhase?.messages.push({
          direction: 'in',
          model: d?.model as string | undefined,
          content: event.message,
          preview: d?.responsePreview as string | undefined,
          timestamp: event.timestamp,
          tokensIn: tokIn,
          tokensOut: tokOut,
          elapsedMs: elapsed,
        });
        if (currentPhase) {
          currentPhase.tokensIn = (currentPhase.tokensIn ?? 0) + tokIn;
          currentPhase.tokensOut = (currentPhase.tokensOut ?? 0) + tokOut;
          if (elapsed) currentPhase.durationMs = elapsed;
        }
        currentRun.totalTokensIn += tokIn;
        currentRun.totalTokensOut += tokOut;
      }

      if (event.code === 'audit_pass' || event.code === 'audit_fail') {
        const score = (d?.score ?? d?.overall) as number | undefined;
        if (score !== undefined) {
          currentRun.auditScore = score;
          if (currentPhase) currentPhase.score = score;
        }
        if (event.code === 'audit_fail' && currentPhase) {
          currentPhase.status = 'failed';
          currentPhase.issues = Array.isArray(d?.issues)
            ? (d!.issues as Array<{ severity?: string; rule?: string; message?: string }>).map(
                (i) => `[${i.severity}] ${i.rule}: ${i.message}`,
              )
            : [event.message];
        }
      }

      if ((event.code === 'quality_gate' || event.code === 'narrative_review') && currentPhase) {
        const score = d?.overall as number | undefined;
        if (score !== undefined) currentPhase.score = score;
      }

      if (TERMINAL_CODES.has(event.code)) {
        if (currentPhase && currentPhase.status === 'active') {
          currentPhase.status = 'done';
          currentPhase.completedAt = event.timestamp;
        }
        currentRun.status =
          event.code === 'scenario_saved' || event.code === 'scenario_staged'
            ? 'saved'
            : event.code === 'scenario_rejected'
              ? 'rejected'
              : 'failed';
        currentRun.scenarioId = event.scenarioId;
        currentRun.completedAt = event.timestamp;
        if (currentRun.startedAt && currentRun.completedAt) {
          currentRun.totalDurationMs =
            new Date(currentRun.completedAt).getTime() - new Date(currentRun.startedAt).getTime();
        }
        const titleMatch = event.message?.match(/["""]([^"""]+)["""]/);
        if (titleMatch) currentRun.title = titleMatch[1];

        pipeline.runs.push(currentRun);
        currentRun = null;
        currentPhase = null;
      }
    }

    if (currentRun) {
      pipeline.runs.push(currentRun);
    }

    pipeline.savedCount = Math.max(
      pipeline.savedCount,
      pipeline.runs.filter((r) => r.status === 'saved').length,
    );
    pipeline.failedCount = pipeline.runs.filter(
      (r) => r.status === 'failed' || r.status === 'rejected',
    ).length;

    if (pipeline.savedCount >= pipeline.expectedCount) {
      pipeline.status = 'done';
    }

    const completedRuns = pipeline.runs.filter((r) => r.totalDurationMs && r.totalDurationMs > 0);
    if (completedRuns.length > 0) {
      const totalMs = completedRuns.reduce((sum, r) => sum + r.totalDurationMs!, 0);
      pipeline.totalDurationMs = totalMs;
      pipeline.avgRunDurationMs = Math.round(totalMs / completedRuns.length);
      const remaining = pipeline.expectedCount - pipeline.savedCount - pipeline.failedCount;
      if (remaining > 0) {
        pipeline.estimatedRemainingMs = remaining * pipeline.avgRunDurationMs;
      }
    }
  }

  for (const pipeline of Object.values(pipelineMap)) {
    if (pipeline.runs.length === 0 && liveActivity?.byBundle?.[pipeline.bundleId]) {
      const live = liveActivity.byBundle[pipeline.bundleId];
      if (live.attempts > 0) pipeline.status = 'active';
    }
    if (pipeline.status === 'pending' && currentBundle === pipeline.bundleId) {
      pipeline.status = 'active';
    }
  }

  return bundles.map((b) => pipelineMap[b]);
}

// ─── Pipeline Components ─────────────────────────────────────────

function ChatBubble({ msg, expanded, onToggle }: { msg: LLMMessage; expanded: boolean; onToggle: () => void }) {
  const isOut = msg.direction === 'out';
  return (
    <div
      className={`group cursor-pointer ${isOut ? 'pl-1' : 'pl-1'}`}
      onClick={onToggle}
    >
      <div className="flex items-center gap-2 text-[10px] font-mono">
        <span className={isOut ? 'text-[var(--accent-primary)]' : 'text-[var(--success)]'}>
          {isOut ? '→' : '←'}
        </span>
        {msg.model && (
          <span className="text-foreground-muted">{msg.model}</span>
        )}
        <span className="flex-1" />
        {msg.charCount && <span className="text-foreground-subtle">{msg.charCount.toLocaleString()} chars</span>}
        {msg.elapsedMs !== undefined && (
          <span className="text-foreground-subtle">{formatElapsed(msg.elapsedMs)}</span>
        )}
        {(msg.tokensIn || msg.tokensOut) && (
          <span className="text-foreground-subtle">
            {msg.tokensIn?.toLocaleString()}↑ {msg.tokensOut?.toLocaleString()}↓
          </span>
        )}
        <span className="text-foreground-subtle opacity-40 text-[9px]">{expanded ? '▲' : '▼'}</span>
      </div>
      {expanded && msg.preview && (
        <pre className={`mt-1 text-[10px] font-mono whitespace-pre-wrap break-words max-h-[300px] overflow-y-auto rounded p-2.5 leading-relaxed border ${
          isOut
            ? 'bg-[var(--accent-primary)]/5 border-[var(--accent-primary)]/20 text-foreground-muted'
            : 'bg-[var(--success)]/5 border-[var(--success)]/20 text-foreground-muted'
        }`}>
          {msg.preview}
        </pre>
      )}
      {!expanded && msg.preview && (
        <p className="text-[10px] font-mono text-foreground-subtle opacity-50 truncate pl-5 leading-snug">
          {msg.preview.slice(0, 120)}…
        </p>
      )}
    </div>
  );
}

function PhaseIndicator({ phase }: { phase: PipelinePhase }) {
  const meta = PHASE_META[phase.name];
  const statusIcon =
    phase.status === 'active' ? (meta?.icon ?? '◐') : phase.status === 'done' ? '✓' : '✗';
  const color =
    phase.status === 'active'
      ? 'text-[var(--accent-primary)]'
      : phase.status === 'done'
        ? 'text-[var(--success)]'
        : 'text-[var(--error)]';
  return (
    <div className="flex items-center gap-1.5 text-[11px] font-mono" title={meta?.tip}>
      <span className={`${color} ${phase.status === 'active' ? 'animate-pulse' : ''}`}>{statusIcon}</span>
      <span className="text-foreground-muted">{meta?.label ?? phase.label}</span>
      {phase.durationMs !== undefined && phase.durationMs > 0 && (
        <span className="text-foreground-subtle">{formatElapsed(phase.durationMs)}</span>
      )}
      {phase.score !== undefined && (
        <span className={`${phase.score >= 70 ? 'text-[var(--success)]' : 'text-[var(--warning)]'}`}>
          {Math.round(phase.score)}
        </span>
      )}
    </div>
  );
}

function PhaseDetail({
  phase,
  expandedMessages,
  onToggleMessage,
  runKey,
}: {
  phase: PipelinePhase;
  expandedMessages: Set<string>;
  onToggleMessage: (key: string) => void;
  runKey: string;
}) {
  const meta = PHASE_META[phase.name];
  const icon =
    phase.status === 'active' ? (meta?.icon ?? '◐') : phase.status === 'done' ? '✓' : '✗';
  const color =
    phase.status === 'active'
      ? 'text-[var(--accent-primary)]'
      : phase.status === 'done'
        ? 'text-[var(--success)]'
        : 'text-[var(--error)]';

  return (
    <div className="py-1.5 space-y-1">
      <div className="flex items-center gap-2 text-[11px] font-mono" title={meta?.tip}>
        <span className={`${color} ${phase.status === 'active' ? 'animate-pulse' : ''}`}>{icon}</span>
        <span className="text-foreground-muted">{meta?.label ?? phase.label}</span>
        <span className="flex-1 border-b border-dotted border-[var(--border)] mx-1" />
        {phase.durationMs !== undefined && phase.durationMs > 0 && (
          <span className="text-foreground-subtle">{formatElapsed(phase.durationMs)}</span>
        )}
        {(phase.tokensIn || phase.tokensOut) && (
          <span className="text-foreground-subtle text-[10px]">
            {(phase.tokensIn ?? 0).toLocaleString()}↑ {(phase.tokensOut ?? 0).toLocaleString()}↓
          </span>
        )}
        {phase.score !== undefined && (
          <span className={`text-[10px] font-bold ${phase.score >= 70 ? 'text-[var(--success)]' : 'text-[var(--warning)]'}`}>
            {Math.round(phase.score)}
          </span>
        )}
      </div>

      {phase.messages.length > 0 && (
        <div className="ml-5 space-y-1.5">
          {phase.messages.map((msg, mi) => {
            const msgKey = `${runKey}-${phase.name}-${mi}`;
            return (
              <ChatBubble
                key={mi}
                msg={msg}
                expanded={expandedMessages.has(msgKey)}
                onToggle={() => onToggleMessage(msgKey)}
              />
            );
          })}
        </div>
      )}

      {phase.issues && phase.issues.length > 0 && (
        <div className="ml-5 space-y-0.5">
          {phase.issues.map((issue, ii) => (
            <div key={ii} className="text-[10px] font-mono text-[var(--error)] leading-snug">
              · {issue}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function RunCard({
  run,
  isLatest,
  expandedMessages,
  onToggleMessage,
  bundleId,
  defaultOpen,
}: {
  run: PipelineRun;
  isLatest: boolean;
  expandedMessages: Set<string>;
  onToggleMessage: (key: string) => void;
  bundleId: string;
  defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const runKey = `${bundleId}-${run.index}`;

  const statusIcon =
    run.status === 'active' ? '◐' : run.status === 'saved' ? '✓' : run.status === 'rejected' ? '✗' : '✗';
  const statusColor =
    run.status === 'active'
      ? 'text-[var(--accent-primary)]'
      : run.status === 'saved'
        ? 'text-[var(--success)]'
        : 'text-[var(--error)]';

  return (
    <div className={`border-l-2 ${
      run.status === 'active'
        ? 'border-[var(--accent-primary)]'
        : run.status === 'saved'
          ? 'border-[var(--success)]/40'
          : 'border-[var(--error)]/40'
    }`}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-[rgba(255,255,255,0.02)] transition-colors"
      >
        <span className={`text-xs font-mono ${statusColor} ${run.status === 'active' ? 'animate-pulse' : ''}`}>
          {statusIcon}
        </span>
        <span className="text-[11px] font-mono text-foreground">
          {run.title ? run.title : `Scenario ${run.index}`}
        </span>
        {run.scenarioId && (
          <Link href={`/scenarios/${run.scenarioId}`} className="text-[9px] font-mono text-foreground-subtle hover:text-[var(--accent-primary)] transition-colors" onClick={(e) => e.stopPropagation()}>
            {run.scenarioId.slice(0, 8)}
          </Link>
        )}
        <span className="flex-1" />

        <div className="hidden sm:flex items-center gap-1 shrink-0 overflow-hidden">
          {run.phases.map((p, pi) => {
            const meta = PHASE_META[p.name];
            const statusIcon = p.status === 'done' ? '✓' : p.status === 'active' ? (meta?.icon ?? '◐') : '✗';
            const cls =
              p.status === 'done' ? 'text-[var(--success)]'
              : p.status === 'active' ? 'text-[var(--accent-primary)] animate-pulse'
              : 'text-[var(--error)]';
            return (
              <span key={pi} className="flex items-center gap-0.5" title={meta?.tip}>
                {pi > 0 && <span className="text-[8px] text-foreground-subtle mx-0.5">→</span>}
                <span className={`text-[10px] ${cls}`}>{statusIcon}</span>
                <span className={`text-[9px] font-mono ${p.status === 'active' ? 'text-foreground' : 'text-foreground-subtle'}`}>
                  {meta?.label ?? p.label}
                </span>
              </span>
            );
          })}
        </div>

        {run.auditScore !== undefined && (
          <span className={`text-[10px] font-mono ${run.auditScore >= 70 ? 'text-[var(--success)]' : 'text-[var(--warning)]'}`}>
            {Math.round(run.auditScore)}
          </span>
        )}
        {run.totalDurationMs !== undefined && (
          <span className="text-[10px] font-mono text-foreground-subtle">{formatElapsed(run.totalDurationMs)}</span>
        )}
        {(run.totalTokensIn > 0 || run.totalTokensOut > 0) && (
          <span className="text-[9px] font-mono text-foreground-subtle">
            {run.totalTokensIn.toLocaleString()}↑{run.totalTokensOut.toLocaleString()}↓
          </span>
        )}
        <span className="text-[9px] font-mono text-foreground-subtle opacity-40">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="px-3 pb-2 max-h-[420px] overflow-y-auto divide-y divide-[var(--border)]/30">
          {run.phases.map((phase, pi) => (
            <PhaseDetail
              key={pi}
              phase={phase}
              expandedMessages={expandedMessages}
              onToggleMessage={onToggleMessage}
              runKey={runKey}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function BundleSection({
  pipeline,
  isCurrentBundle,
  job,
  expandedMessages,
  onToggleMessage,
  defaultOpen,
}: {
  pipeline: BundlePipeline;
  isCurrentBundle: boolean;
  job: JobDetail;
  expandedMessages: Set<string>;
  onToggleMessage: (key: string) => void;
  defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const liveBundle = job.liveActivity?.byBundle?.[pipeline.bundleId];

  const statusColor =
    pipeline.status === 'done'
      ? 'text-[var(--success)]'
      : pipeline.status === 'active'
        ? 'text-[var(--accent-primary)]'
        : 'text-foreground-subtle';

  const progressPct =
    pipeline.expectedCount > 0
      ? Math.round((pipeline.savedCount / pipeline.expectedCount) * 100)
      : 0;

  return (
    <div
      className={`control-surface overflow-hidden transition-colors ${isCurrentBundle ? 'ring-1 ring-[var(--accent-primary)]/40' : ''}`}
      style={{ borderLeftWidth: 3, borderLeftColor: BUNDLE_ACCENT_COLORS[pipeline.bundleId] ?? 'var(--border)' }}
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[rgba(255,255,255,0.02)] transition-colors"
      >
        <span className="text-xs font-mono text-foreground-subtle">{open ? '▼' : '▸'}</span>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {isCurrentBundle && pipeline.status === 'active' && (
            <span className="h-2 w-2 rounded-full bg-[var(--accent-primary)] animate-pulse shrink-0" />
          )}
          <span className="text-sm font-mono font-medium text-foreground truncate">{pipeline.label}</span>
          <span className={`text-xs font-mono ${statusColor}`}>
            {pipeline.savedCount}/{pipeline.expectedCount}
          </span>
          {pipeline.failedCount > 0 && (
            <span className="text-[10px] font-mono text-[var(--error)]">{pipeline.failedCount} fail</span>
          )}
          {pipeline.status === 'done' && (
            <span className="text-[10px] font-mono text-[var(--success)]">✓</span>
          )}
        </div>

        {pipeline.runs.length > 0 && (
          <div className="hidden sm:flex items-center gap-1 shrink-0">
            {pipeline.runs.map((r, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full ${
                  r.status === 'saved' ? 'bg-[var(--success)]'
                  : r.status === 'active' ? 'bg-[var(--accent-primary)] animate-pulse'
                  : 'bg-[var(--error)]'
                }`}
                title={`Run ${r.index}: ${r.status}${r.totalDurationMs ? ` · ${formatElapsed(r.totalDurationMs)}` : ''}`}
              />
            ))}
          </div>
        )}

        <div className="flex items-center gap-3 text-[10px] font-mono text-foreground-subtle shrink-0">
          {pipeline.totalDurationMs !== undefined && (
            <span>{formatElapsed(pipeline.totalDurationMs)}</span>
          )}
          {pipeline.avgRunDurationMs !== undefined && (
            <span className="text-foreground-subtle">avg {formatElapsed(pipeline.avgRunDurationMs)}/run</span>
          )}
          {pipeline.estimatedRemainingMs !== undefined && (
            <span className="text-[var(--accent-primary)]">~{formatElapsed(pipeline.estimatedRemainingMs)} left</span>
          )}
        </div>

        {pipeline.expectedCount > 1 && (
          <div className="w-16 h-1.5 rounded-full bg-[rgba(255,255,255,0.06)] overflow-hidden shrink-0">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                pipeline.status === 'done'
                  ? 'bg-[var(--success)]'
                  : pipeline.status === 'active'
                    ? 'bg-[var(--accent-primary)]'
                    : 'bg-[var(--foreground-subtle)]'
              }`}
              style={{ width: `${progressPct}%` }}
            />
          </div>
        )}
      </button>

      {open && (
        <div className="border-t border-[var(--border)]">
          {/* Live activity summary when no pipeline runs yet */}
          {pipeline.runs.length === 0 && liveBundle && liveBundle.attempts > 0 && (
            <div className="px-4 py-3 text-[10px] font-mono text-foreground-subtle space-y-1">
              <div className="flex gap-4 flex-wrap">
                <span>attempts {liveBundle.attempts}</span>
                <span>concept {liveBundle.concept}</span>
                <span>blueprint {liveBundle.blueprint}</span>
                <span>details {liveBundle.details}</span>
                {liveBundle.successes > 0 && <span className="text-[var(--success)]">success {liveBundle.successes}</span>}
                {liveBundle.avgAuditScore !== undefined && <span>avg score {liveBundle.avgAuditScore}</span>}
              </div>
            </div>
          )}

          {pipeline.runs.length === 0 && !liveBundle && pipeline.status === 'pending' && (
            <div className="px-4 py-3 text-[10px] font-mono text-foreground-subtle">
              Queued — waiting for runner to claim this bundle
            </div>
          )}

          {pipeline.runs.length === 0 && !liveBundle && pipeline.status === 'active' && (
            <div className="px-4 py-3 text-[10px] font-mono text-foreground-subtle space-y-1">
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent-primary)] animate-pulse" />
                <span>Processing — generating scenarios for {pipeline.label}</span>
              </div>
              {job.currentMessage && job.currentBundle === pipeline.bundleId && (
                <div className="text-foreground-muted pl-3.5">{job.currentMessage}</div>
              )}
            </div>
          )}

          {pipeline.runs.length > 0 && (
            <div className="divide-y divide-[var(--border)]/30 max-h-[600px] overflow-y-auto">
              {pipeline.runs.map((run) => (
                <RunCard
                  key={run.index}
                  run={run}
                  isLatest={run.index === pipeline.runs.length}
                  expandedMessages={expandedMessages}
                  onToggleMessage={onToggleMessage}
                  bundleId={pipeline.bundleId}
                  defaultOpen={run.status === 'active'}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Results Sort Header ─────────────────────────────────────────

function SortHeader({ field, label, current, dir, onSort }: {
  field: SortField;
  label: string;
  current: SortField;
  dir: SortDir;
  onSort: (f: SortField) => void;
}) {
  const active = current === field;
  return (
    <button
      onClick={() => onSort(field)}
      className={`flex items-center gap-1 text-xs font-medium transition-colors ${
        active ? 'text-foreground' : 'text-foreground-subtle hover:text-foreground-muted'
      }`}
    >
      {label}
      <span className="opacity-60">{active ? (dir === 'asc' ? '↑' : '↓') : '↕'}</span>
    </button>
  );
}

// ─── Main Page ───────────────────────────────────────────────────

export default function JobDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [job, setJob] = useState<JobDetail | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [sortField, setSortField] = useState<SortField>('bundle');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [resultSearch, setResultSearch] = useState('');
  const [expandedMessages, setExpandedMessages] = useState<Set<string>>(new Set());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [elapsedMs, setElapsedMs] = useState<number | null>(null);
  const [filterBundle, setFilterBundle] = useState<string | null>(null);
  const [filterScoreMin, setFilterScoreMin] = useState<string>('');
  const [filterScoreMax, setFilterScoreMax] = useState<string>('');
  const [filterScope, setFilterScope] = useState<string | null>(null);
  const [filterFixed, setFilterFixed] = useState<boolean | null>(null);
  const [filterProvider, setFilterProvider] = useState<'openai' | 'local' | null>(null);
  const [pipelineTab, setPipelineTab] = useState<'pipeline' | 'events'>('pipeline');
  const [eventLog, setEventLog] = useState<JobEvent[]>([]);
  const [eventLogTotal, setEventLogTotal] = useState(0);
  const [eventLogHasMore, setEventLogHasMore] = useState(false);
  const [eventLogLoading, setEventLogLoading] = useState(false);
  const [eventLevelFilter, setEventLevelFilter] = useState<string>('');
  const [eventBundleFilter, setEventBundleFilter] = useState<string>('');
  const [eventPhaseFilter, setEventPhaseFilter] = useState<string>('');
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());
  const eventPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const eventScrollRef = useRef<HTMLDivElement>(null);
  const [forceCancelling, setForceCancelling] = useState(false);
  const [newsExpanded, setNewsExpanded] = useState(false);
  const [countriesExpanded, setCountriesExpanded] = useState(false);

  useEffect(() => {
    if (!job?.startedAt || (job.status !== 'running' && job.status !== 'pending')) {
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

  const perBundleCount = useMemo(() => {
    const map: Record<string, number> = {};
    for (const b of job?.bundles ?? []) map[b] = 0;
    for (const r of job?.results ?? []) {
      map[r.bundle] = (map[r.bundle] ?? 0) + 1;
    }
    if (Object.values(map).every(v => v === 0) && job?.savedScenarioIds?.length) {
      const bundleSet = new Set(job.bundles ?? []);
      for (const sid of job.savedScenarioIds) {
        const match = sid.match(/^gen_([a-z_]+)_/);
        if (match && bundleSet.has(match[1])) {
          map[match[1]] = (map[match[1]] ?? 0) + 1;
        }
      }
    }
    return map;
  }, [job?.results, job?.bundles, job?.savedScenarioIds]);

  const pipelines = useMemo(() => {
    if (!job) return [];
    const countPerBundle = job.count;
    return buildPipelines(
      job.events ?? [],
      job.bundles,
      countPerBundle,
      job.liveActivity,
      perBundleCount,
      job.currentBundle,
    );
  }, [job?.events, job?.bundles, job?.count, job?.liveActivity, perBundleCount, job?.currentBundle]);

  const fetchJob = useCallback(() => {
    fetch(`/api/jobs/${id}`)
      .then((r) => {
        if (r.status === 404) { setNotFound(true); return null; }
        return r.json() as Promise<JobDetail>;
      })
      .then((data) => {
        if (!data) return;
        setJob(data);
        const active = data.status === 'running' || data.status === 'pending';
        if (!active && intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      })
      .catch(() => undefined);
  }, [id]);

  useEffect(() => {
    fetchJob();
    intervalRef.current = setInterval(fetchJob, 1500);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchJob]);

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  }

  function toggleMessage(key: string) {
    setExpandedMessages((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  async function handleCancel() {
    if (!job || !confirm('Cancel this job?')) return;
    setCancelling(true);
    try {
      await fetch(`/api/jobs/${job.id}`, { method: 'DELETE' });
      setJob((prev) => prev ? { ...prev, status: 'cancelled' } : prev);
    } finally {
      setCancelling(false);
    }
  }

  async function handleStop() {
    if (!job || !confirm('Stop this job? It will be marked cancelled and the generation process will wind down.')) return;
    setStopping(true);
    try {
      const res = await fetch(`/api/jobs/${job.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'stop' }),
      });
      if (res.ok) {
        setJob((prev) => prev ? { ...prev, status: 'cancelled' } : prev);
      }
    } finally {
      setStopping(false);
    }
  }

  async function handleForceCancel() {
    if (!job || !confirm('Force cancel this job? This marks it as failed and is irreversible.')) return;
    setForceCancelling(true);
    try {
      const res = await fetch(`/api/jobs/${job.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'force_cancel' }),
      });
      if (res.ok) {
        setJob((prev) => prev ? { ...prev, status: 'failed', error: 'Force cancelled by operator' } : prev);
      }
    } finally {
      setForceCancelling(false);
    }
  }

  const fetchEventLog = useCallback(async (reset = false) => {
    if (!id) return;
    setEventLogLoading(true);
    try {
      const offset = reset ? 0 : eventLog.length;
      const params = new URLSearchParams({ limit: '150', offset: String(offset) });
      if (eventLevelFilter) params.set('level', eventLevelFilter);
      if (eventBundleFilter) params.set('bundle', eventBundleFilter);
      if (eventPhaseFilter) params.set('phase', eventPhaseFilter);
      const res = await fetch(`/api/jobs/${id}/events?${params}`);
      if (!res.ok) return;
      const data = await res.json();
      setEventLog(reset ? data.events : [...eventLog, ...data.events]);
      setEventLogTotal(data.total);
      setEventLogHasMore(data.hasMore);
    } finally {
      setEventLogLoading(false);
    }
  }, [id, eventLog, eventLevelFilter, eventBundleFilter, eventPhaseFilter]);

  useEffect(() => {
    if (pipelineTab === 'events') {
      fetchEventLog(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pipelineTab, eventLevelFilter, eventBundleFilter, eventPhaseFilter]);

  useEffect(() => {
    const active = job?.status === 'running' || job?.status === 'pending';
    if (pipelineTab === 'events' && active) {
      eventPollRef.current = setInterval(() => fetchEventLog(true), 3000);
    }
    return () => {
      if (eventPollRef.current) {
        clearInterval(eventPollRef.current);
        eventPollRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pipelineTab, job?.status]);

  const activeFilterCount = [filterBundle, filterScoreMin, filterScoreMax, filterScope, filterFixed, filterProvider].filter(
    (v) => v !== null && v !== ''
  ).length;

  function clearAllFilters() {
    setFilterBundle(null);
    setFilterScoreMin('');
    setFilterScoreMax('');
    setFilterScope(null);
    setFilterFixed(null);
    setFilterProvider(null);
  }

  if (notFound) {
    return (
      <div className="mx-auto max-w-[1300px]">
        <Link href="/jobs" className="mb-6 block text-xs font-medium text-foreground-subtle transition-colors hover:text-foreground">
          ← Back to Jobs
        </Link>
        <CommandPanel className="p-8 text-center text-sm text-foreground-muted">
          Job not found.
        </CommandPanel>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="mx-auto max-w-[1300px]">
        <div className="h-4 bg-background-muted rounded w-32 mb-6 animate-pulse" />
        <CommandPanel className="space-y-3 p-6 animate-pulse">
          <div className="h-4 bg-background-muted rounded w-1/4" />
          <div className="h-3 bg-background-muted rounded w-1/2" />
          <div className="h-3 bg-background-muted rounded w-2/3" />
        </CommandPanel>
      </div>
    );
  }

  const total = job.total ?? job.totalCount ?? job.count * job.bundles.length;
  const savedCount = job.completedCount ?? job.results?.length ?? 0;
  const failedCount = job.failedCount ?? 0;
  const generatedDraftCount = Math.max(savedCount, job.liveActivity?.totalGeneratedDrafts ?? 0);
  const remediatedCount = (job.results ?? []).filter((r) => r.autoFixed).length;
  const liveProgress = total > 0 ? Math.min(100, Math.round(((savedCount + failedCount) / total) * 100)) : 0;
  const { health: jobHealth, staleMs } = computeJobHealth(job);
  const isActive = job.status === 'running' || job.status === 'pending';

  const scoreMin = filterScoreMin ? parseFloat(filterScoreMin) : null;
  const scoreMax = filterScoreMax ? parseFloat(filterScoreMax) : null;

  const sortedResults: JobResult[] = [...(job.results ?? [])]
    .filter((r) => {
      if (resultSearch.trim()) {
        const q = resultSearch.toLowerCase();
        if (!r.title.toLowerCase().includes(q) && !r.bundle.toLowerCase().includes(q) && !r.id.toLowerCase().includes(q)) return false;
      }
      if (filterBundle && r.bundle !== filterBundle) return false;
      if (scoreMin !== null && (r.auditScore === undefined || r.auditScore < scoreMin)) return false;
      if (scoreMax !== null && (r.auditScore === undefined || r.auditScore > scoreMax)) return false;
      if (filterScope && (r.scopeTier ?? 'universal') !== filterScope) return false;
      if (filterFixed === true && !r.autoFixed) return false;
      if (filterFixed === false && r.autoFixed) return false;
      if (filterProvider && r.fullSendProvider !== filterProvider) return false;
      return true;
    })
    .sort((a, b) => {
      let cmp = 0;
      if (sortField === 'title') cmp = a.title.localeCompare(b.title);
      else if (sortField === 'bundle') cmp = a.bundle.localeCompare(b.bundle);
      else if (sortField === 'auditScore') cmp = (a.auditScore ?? -1) - (b.auditScore ?? -1);
      else if (sortField === 'autoFixed') cmp = (a.autoFixed ? 1 : 0) - (b.autoFixed ? 1 : 0);
      return sortDir === 'asc' ? cmp : -cmp;
    });

  const globalEta = (() => {
    const done = savedCount + failedCount;
    if (elapsedMs && done > 0 && done < total) {
      return Math.round((total - done) / (done / elapsedMs));
    }
    const pipelineEtas = pipelines.filter((p) => p.estimatedRemainingMs).map((p) => p.estimatedRemainingMs!);
    if (pipelineEtas.length > 0) return Math.max(...pipelineEtas);
    return null;
  })();

  const lowAuditCount = job.auditSummary?.below70Count ?? 0;
  const issueCount = (job.errors?.length ?? 0) + (job.error ? 1 : 0) + (job.failureAnalysis ? 1 : 0);

  const scrollToSection = (id: string, tab?: 'pipeline' | 'events') => {
    if (tab) {
      setPipelineTab(tab);
    }

    window.setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, tab ? 50 : 0);
  };

  return (
    <div className="mx-auto max-w-[1300px]">
      <Link
        href="/jobs"
        className="mb-4 block text-xs font-medium text-foreground-subtle transition-colors hover:text-foreground"
      >
        ← Back to Jobs
      </Link>

      {/* ─── Header ─── */}
      <CommandPanel className="mb-4 px-5 py-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3 flex-wrap">
            <h1
              className="text-xl font-semibold text-foreground data-value font-mono cursor-pointer hover:text-[var(--accent-primary)] transition-colors"
              onClick={() => navigator.clipboard?.writeText(job.id)}
              title="Click to copy full ID"
            >
              {job.id}
            </h1>
            <StatusBadge status={job.status} pulse={isActive} />
            {job.dryRun && (
              <span className="text-[10px] font-bold text-[#f59e0b] px-2 py-0.5 rounded border border-[#f59e0b]/40 bg-[#f59e0b]/10">
                DRY RUN
              </span>
            )}
            {job.mode && (
              <span className="text-xs font-medium text-foreground-subtle px-2 py-0.5 rounded border border-[var(--border)]">
                {job.mode}
              </span>
            )}
            {job.sourceKind && job.sourceKind !== 'evergreen' && (
              <span className="text-[10px] font-mono text-[var(--info)] px-1.5 py-0.5 rounded bg-[var(--info)]/10 border border-[var(--info)]/20">
                {job.sourceKind}
              </span>
            )}
            {job.executionTarget && (
              <span className="text-[10px] font-mono text-foreground-subtle">{job.executionTarget}</span>
            )}
            <span className="text-[10px] font-mono text-foreground-subtle">{summarizeProvider(job)}</span>
          </div>
          <div className="flex items-center gap-2">
            {job.status === 'pending_review' && (
              <Link href={`/jobs/${job.id}/review`} className="btn btn-primary">
                Review Scenarios
              </Link>
            )}
            {job.status === 'pending' && (
              <button onClick={handleCancel} disabled={cancelling} className="btn btn-destructive disabled:opacity-50">
                {cancelling ? 'Cancelling…' : 'Cancel'}
              </button>
            )}
            {job.status === 'running' && (
              <button
                onClick={handleStop}
                disabled={stopping}
                className={`btn btn-destructive disabled:opacity-50 ${jobHealth === 'critical' ? 'ring-2 ring-[var(--error)]/50 animate-pulse' : ''}`}
              >
                {stopping ? 'Stopping…' : 'Stop Job'}
              </button>
            )}
            {job.status === 'running' && jobHealth === 'critical' && (
              <button
                onClick={handleForceCancel}
                disabled={forceCancelling}
                className="btn btn-destructive disabled:opacity-50 ring-2 ring-[var(--error)]"
              >
                {forceCancelling ? 'Force Cancelling…' : 'Force Cancel'}
              </button>
            )}
          </div>
        </div>
        {job.description && (
          <p className="mt-2 text-xs text-foreground-muted">{job.description}</p>
        )}

        {job.runId && (
          <div className="mt-3 rounded-[var(--radius-tight)] border border-[var(--border)] bg-[rgba(255,255,255,0.02)] px-3 py-2 text-[11px] text-foreground-muted">
            <div className="font-medium text-foreground-subtle">
              {job.runKind === 'blitz' ? 'Blitz run' : 'Run'} · child {job.runJobIndex ?? 1}/{job.runTotalJobs ?? 1}
            </div>
            <Link href={`/runs/${job.runId}`} className="mt-1 inline-block text-[11px] font-mono text-[var(--accent-primary)] hover:underline">
              Open run overview →
            </Link>
            {job.siblingJobs && job.siblingJobs.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {job.siblingJobs.map((sibling) => (
                  <Link key={sibling.id} href={`/jobs/${sibling.id}`} className="rounded-full border border-[var(--border)] px-2 py-0.5 text-[10px] font-mono text-foreground-subtle hover:border-[var(--accent-primary)]/35 hover:text-foreground">
                    {sibling.runJobIndex ?? '?'} · {sibling.status}
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-2 border-t border-[var(--border)] pt-4">
          <button type="button" onClick={() => scrollToSection('job-workflow', 'pipeline')} className="rounded-full border border-[var(--border)] bg-[var(--background-muted)] px-2.5 py-1 text-[10px] font-mono text-foreground-subtle transition-colors hover:border-[var(--accent-primary)]/35 hover:text-foreground">
            Pipeline
          </button>
          <button type="button" onClick={() => scrollToSection('job-workflow', 'events')} className="rounded-full border border-[var(--border)] bg-[var(--background-muted)] px-2.5 py-1 text-[10px] font-mono text-foreground-subtle transition-colors hover:border-[var(--accent-primary)]/35 hover:text-foreground">
            Event Log
          </button>
          <button type="button" onClick={() => scrollToSection('job-results')} className="rounded-full border border-[var(--border)] bg-[var(--background-muted)] px-2.5 py-1 text-[10px] font-mono text-foreground-subtle transition-colors hover:border-[var(--accent-primary)]/35 hover:text-foreground">
            Results
          </button>
          <button type="button" onClick={() => scrollToSection('job-details-sidebar')} className="rounded-full border border-[var(--border)] bg-[var(--background-muted)] px-2.5 py-1 text-[10px] font-mono text-foreground-subtle transition-colors hover:border-[var(--accent-primary)]/35 hover:text-foreground">
            Configuration
          </button>
          {issueCount > 0 || failedCount > 0 || lowAuditCount > 0 ? (
            <button type="button" onClick={() => scrollToSection('job-issues')} className="rounded-full border border-[var(--warning)]/35 bg-[var(--warning)]/10 px-2.5 py-1 text-[10px] font-mono text-[var(--warning)] transition-colors hover:bg-[var(--warning)]/15">
              Issues
            </button>
          ) : null}
        </div>
      </CommandPanel>

      {/* ─── Stats + Progress ─── */}
      <div className="mb-4 grid gap-3 grid-cols-3 sm:grid-cols-6">
        <button type="button" onClick={() => scrollToSection('job-workflow', 'pipeline')} className="text-left">
          <DataStat label="Generated" value={generatedDraftCount} accent="blue" size="compact" />
        </button>
        <button type="button" onClick={() => scrollToSection('job-results')} className="text-left">
          <DataStat label="Saved" value={savedCount} accent="success" size="compact" />
        </button>
        <button type="button" onClick={() => scrollToSection('job-issues')} className="text-left">
          <DataStat label="Failed" value={failedCount} accent={failedCount > 0 ? 'warning' : undefined} size="compact" />
        </button>
        <button type="button" onClick={() => scrollToSection('job-workflow', 'pipeline')} className="text-left">
          <DataStat label="Expected" value={total} size="compact" />
        </button>
        <button type="button" onClick={() => scrollToSection('job-results')} className="text-left">
          <DataStat label="Remediated" value={remediatedCount} accent={remediatedCount > 0 ? 'gold' : undefined} size="compact" />
        </button>
        {(() => {
          const scored = (job.results ?? []).filter(r => r.auditScore !== undefined);
          if (scored.length === 0) {
            return (
              <button type="button" onClick={() => scrollToSection('job-audit-quality')} className="text-left">
                <DataStat label="Avg Score" value="—" size="compact" />
              </button>
            );
          }
          const avg = Math.round(scored.reduce((s, r) => s + (r.auditScore ?? 0), 0) / scored.length);
          return (
            <button type="button" onClick={() => scrollToSection('job-audit-quality')} className="text-left">
              <DataStat label="Avg Score" value={avg} accent={avg >= 90 ? 'success' : avg >= 75 ? undefined : 'warning'} size="compact" />
            </button>
          );
        })()}
      </div>

      {(failedCount > 0 || lowAuditCount > 0 || issueCount > 0 || (isActive && jobHealth !== 'healthy' && jobHealth !== 'idle')) && (
        <CommandPanel tone={failedCount > 0 || job.error || jobHealth === 'critical' ? 'danger' : 'muted'} className="mb-4 px-4 py-3">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <div className={`text-xs font-medium ${failedCount > 0 || job.error || jobHealth === 'critical' ? 'text-[var(--error)]' : 'text-[var(--warning)]'}`}>
                This job has notable issues or degraded health.
              </div>
              <p className="mt-1 text-xs leading-6 text-foreground-muted">
                Jump straight to the summarized issues, audit failures, heartbeat state, and supporting evidence instead of reconstructing the story from raw logs alone.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {failedCount > 0 ? <button type="button" onClick={() => scrollToSection('job-issues')} className="rounded-full border border-[var(--error)]/35 bg-[var(--error)]/10 px-2.5 py-1 text-[10px] font-mono text-[var(--error)]">{failedCount} failed</button> : null}
              {lowAuditCount > 0 ? <button type="button" onClick={() => scrollToSection('job-audit-quality')} className="rounded-full border border-[var(--warning)]/35 bg-[var(--warning)]/10 px-2.5 py-1 text-[10px] font-mono text-[var(--warning)]">{lowAuditCount} below 70</button> : null}
              {job.failureAnalysis ? <button type="button" onClick={() => scrollToSection('job-failure-analysis')} className="rounded-full border border-[var(--warning)]/35 bg-[var(--warning)]/10 px-2.5 py-1 text-[10px] font-mono text-[var(--warning)]">failure analysis</button> : null}
              {isActive && jobHealth !== 'healthy' && jobHealth !== 'idle' ? <button type="button" onClick={() => scrollToSection('job-live-status')} className="rounded-full border border-[var(--error)]/35 bg-[var(--error)]/10 px-2.5 py-1 text-[10px] font-mono text-[var(--error)]">heartbeat</button> : null}
            </div>
          </div>
        </CommandPanel>
      )}

      {isActive && (
        <CommandPanel id="job-live-status" className="mb-4 scroll-mt-24 px-5 py-3">
          <div className="flex items-center justify-between text-[10px] font-mono text-foreground-subtle mb-1.5">
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--success)] animate-pulse" />
                LIVE
              </span>
              <span className="text-foreground">{savedCount + failedCount}</span>/{total} processed
              {(job.rateLimitRetries ?? 0) > 0 && (
                <span className="text-[#f59e0b] ml-2">· {job.rateLimitRetries} rate retries</span>
              )}
            </div>
            <div className="flex items-center gap-3">
              {elapsedMs !== null && <span>{formatElapsed(elapsedMs)}</span>}
              {globalEta !== null && <span className="text-[var(--accent-primary)]">~{formatElapsed(globalEta)} remaining</span>}
              <span>{liveProgress}%</span>
            </div>
          </div>
          <div className="app-progress">
            <span style={{ width: `${liveProgress}%` }} />
          </div>

          {job.currentMessage && (
            <div className="mt-2 text-xs font-mono text-foreground-muted">
              {job.currentMessage}
            </div>
          )}

          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {job.bundles.map((b) => {
              const isCurrent = job.currentBundle === b;
              const bundlePipeline = pipelines.find((p) => p.bundleId === b);
              const isDone = bundlePipeline?.status === 'done';
              return (
                <span
                  key={b}
                  className={`text-[10px] font-mono px-2 py-0.5 rounded border transition-colors ${
                    isCurrent
                      ? 'border-[var(--accent-primary)]/60 bg-[var(--accent-primary)]/15 text-[var(--accent-primary)]'
                      : isDone
                        ? 'border-[var(--success)]/30 bg-[var(--success)]/10 text-[var(--success)]'
                        : 'border-[var(--border)] text-foreground-subtle'
                  }`}
                >
                  {isCurrent && <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--accent-primary)] animate-pulse mr-1 align-middle" />}
                  {isDone && <span className="mr-1">✓</span>}
                  {ALL_BUNDLES.find((ab) => ab.id === b)?.label ?? b}
                  {job.currentPhase && isCurrent && (
                    <span className="text-foreground-subtle ml-1">→ {PHASE_META[job.currentPhase]?.label ?? job.currentPhase}</span>
                  )}
                </span>
              );
            })}
          </div>

          <div className="flex items-center gap-3 mt-2 text-[10px] font-mono text-foreground-subtle">
            <span className={
              !isActive ? '' : jobHealth === 'critical' ? 'text-[var(--error)]' : jobHealth === 'warning' ? 'text-[#f59e0b]' : 'text-[var(--success)]'
            }>
              Heartbeat: {job.lastHeartbeatAt ? formatRelativeTime(job.lastHeartbeatAt) : 'none'}
            </span>
          </div>

          {jobHealth === 'warning' && (
            <div className="mt-2 rounded-[var(--radius-tight)] border border-[#f59e0b]/40 bg-[#f59e0b]/8 px-3 py-2 text-[10px] font-mono text-[#f59e0b]">
              Job may be stalling — no heartbeat for {formatElapsed(staleMs)}
            </div>
          )}
          {jobHealth === 'critical' && (
            <div className="mt-2 rounded-[var(--radius-tight)] border border-[var(--error)]/40 bg-[var(--error)]/8 px-3 py-2 text-[10px] font-mono text-[var(--error)] flex items-center justify-between">
              <span>No heartbeat for {formatElapsed(staleMs)} — job appears stuck.</span>
              <button
                onClick={handleForceCancel}
                disabled={forceCancelling}
                className="text-[10px] font-mono font-bold px-2 py-1 rounded border border-[var(--error)]/60 bg-[var(--error)]/20 hover:bg-[var(--error)]/30 transition-colors disabled:opacity-50"
              >
                {forceCancelling ? 'Cancelling…' : 'Force Cancel'}
              </button>
            </div>
          )}
        </CommandPanel>
      )}

      {/* ─── Two Column: Pipeline + Sidebar ─── */}
      <div id="job-workflow" className="grid scroll-mt-24 grid-cols-1 gap-4 xl:grid-cols-3">

        {/* ── Pipeline / Event Log (main content) ── */}
        <div className="xl:col-span-2 space-y-2">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1 bg-[rgba(255,255,255,0.02)] border border-[var(--border)] rounded-lg p-0.5">
              <button
                onClick={() => setPipelineTab('pipeline')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  pipelineTab === 'pipeline' ? 'bg-[var(--accent-muted)] text-foreground' : 'text-foreground-subtle hover:text-foreground'
                }`}
              >
                Pipeline — {pipelines.length} bundle{pipelines.length !== 1 ? 's' : ''}
              </button>
              <button
                onClick={() => setPipelineTab('events')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  pipelineTab === 'events' ? 'bg-[var(--accent-muted)] text-foreground' : 'text-foreground-subtle hover:text-foreground'
                }`}
              >
                Event Log{job.eventCount ? ` (${job.eventCount})` : ''}
              </button>
            </div>
          </div>

          {pipelineTab === 'pipeline' && (
            <>
              {pipelines.map((pipeline) => (
                <BundleSection
                  key={pipeline.bundleId}
                  pipeline={pipeline}
                  isCurrentBundle={job.currentBundle === pipeline.bundleId}
                  job={job}
                  expandedMessages={expandedMessages}
                  onToggleMessage={toggleMessage}
                  defaultOpen={job.currentBundle === pipeline.bundleId || pipeline.status === 'active'}
                />
              ))}
              {pipelines.length === 0 && (
                <CommandPanel className="p-5 text-center text-xs text-foreground-subtle">
                  {isActive ? 'Waiting for pipeline data…' : 'No pipeline data available.'}
                </CommandPanel>
              )}
            </>
          )}

          {pipelineTab === 'events' && (
            <CommandPanel className="p-0">
              <div className="px-4 py-2 border-b border-[var(--border-strong)] flex items-center gap-2 flex-wrap">
                <select
                  value={eventLevelFilter}
                  onChange={(e) => setEventLevelFilter(e.target.value)}
                  className="input-shell text-[10px] py-1 px-2"
                  style={{ width: 'auto' }}
                >
                  <option value="">All levels</option>
                  <option value="info">Info</option>
                  <option value="warning">Warning</option>
                  <option value="error">Error</option>
                  <option value="success">Success</option>
                </select>
                <select
                  value={eventBundleFilter}
                  onChange={(e) => setEventBundleFilter(e.target.value)}
                  className="input-shell text-[10px] py-1 px-2"
                  style={{ width: 'auto' }}
                >
                  <option value="">All bundles</option>
                  {job.bundles.map((b) => (
                    <option key={b} value={b}>{ALL_BUNDLES.find((ab) => ab.id === b)?.label ?? b}</option>
                  ))}
                </select>
                <select
                  value={eventPhaseFilter}
                  onChange={(e) => setEventPhaseFilter(e.target.value)}
                  className="input-shell text-[10px] py-1 px-2"
                  style={{ width: 'auto' }}
                >
                  <option value="">All phases</option>
                  {Object.entries(PHASE_META).map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </select>
                <span className="text-[10px] font-mono text-foreground-subtle ml-auto">
                  {eventLogTotal} total events
                </span>
              </div>
              <div ref={eventScrollRef} className="max-h-[800px] overflow-y-auto divide-y divide-[var(--border)]/30">
                {collapseConsecutiveEvents(eventLog).map((evt) => {
                  const levelStyle = EVENT_LEVEL_STYLES[evt.level as EventLevel] ?? EVENT_LEVEL_STYLES.info;
                  const isExpanded = expandedEvents.has(evt.id);
                  const hasDetails = evt.data && Object.keys(evt.data).length > 0;
                  const isLong = evt.message.length > 120;
                  const expandable = hasDetails || isLong;
                  return (
                    <div key={evt.id} className="group">
                      <div
                        className={`px-4 py-2 flex items-start gap-3 text-[10px] font-mono hover:bg-[rgba(255,255,255,0.03)] ${expandable ? 'cursor-pointer' : ''}`}
                        onClick={expandable ? () => setExpandedEvents((prev) => {
                          const next = new Set(prev);
                          if (next.has(evt.id)) next.delete(evt.id); else next.add(evt.id);
                          return next;
                        }) : undefined}
                      >
                        <span
                          className={`shrink-0 px-1.5 py-0.5 rounded text-[9px] font-bold ${levelStyle.bg} ${levelStyle.text}`}
                        >
                          {levelStyle.label}
                        </span>
                        <span className="text-foreground-subtle shrink-0 w-[130px]" title={evt.timestamp}>
                          {evt.timestamp ? formatTimestamp(evt.timestamp) : '—'}
                        </span>
                        <span className="text-foreground-muted shrink-0 w-[140px] truncate" title={evt.code}>
                          {EVENT_CODE_LABELS[evt.code] ?? evt.code}
                        </span>
                        {evt.repeatCount && evt.repeatCount > 1 && (
                          <span className="shrink-0 px-1.5 py-0.5 rounded text-[9px] font-bold bg-[rgba(255,255,255,0.06)] text-foreground-subtle" title={`${evt.repeatCount} consecutive events from ${evt.firstTimestamp ? formatTimestamp(evt.firstTimestamp) : '?'} to ${evt.lastTimestamp ? formatTimestamp(evt.lastTimestamp) : '?'}`}>
                            ×{evt.repeatCount}
                          </span>
                        )}
                        <span className={`text-foreground flex-1 ${isExpanded ? 'break-words' : 'truncate'}`}>
                          {isExpanded ? evt.message : evt.message.slice(0, 120)}{!isExpanded && isLong ? '…' : ''}
                        </span>
                        <div className="flex items-center gap-1 shrink-0">
                          {evt.bundle && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-[rgba(255,255,255,0.04)] border border-[var(--border)] text-foreground-subtle">
                              {evt.bundle}
                            </span>
                          )}
                          {evt.phase && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-[rgba(255,255,255,0.04)] border border-[var(--border)] text-foreground-subtle">
                              {PHASE_META[evt.phase]?.label ?? evt.phase}
                            </span>
                          )}
                          {expandable && (
                            <span className="text-[9px] text-foreground-muted transition-transform" style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>
                              ▶
                            </span>
                          )}
                        </div>
                      </div>
                      {isExpanded && hasDetails && (
                        <div className="px-4 pb-2 pl-[calc(1rem+2.5rem)]">
                          <pre className="text-[9px] font-mono text-foreground-muted bg-[rgba(0,0,0,0.2)] rounded p-2 overflow-x-auto max-h-[300px] overflow-y-auto whitespace-pre-wrap break-words">
                            {JSON.stringify(evt.data, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  );
                })}
                {eventLog.length === 0 && !eventLogLoading && (
                  <div className="px-4 py-8 text-center text-xs text-foreground-subtle">
                    No events found{eventLevelFilter || eventBundleFilter || eventPhaseFilter ? ' matching filters' : ''}.
                  </div>
                )}
                {eventLogLoading && eventLog.length === 0 && (
                  <div className="px-4 py-4 text-center text-xs text-foreground-subtle animate-pulse">
                    Loading events…
                  </div>
                )}
              </div>
              {eventLogHasMore && !eventLogLoading && (
                <div className="px-4 py-2 border-t border-[var(--border-strong)]">
                  <button
                    onClick={() => fetchEventLog(false)}
                    className="text-xs font-medium text-[var(--accent-primary)] hover:text-foreground transition-colors"
                  >
                    Load more events…
                  </button>
                </div>
              )}
            </CommandPanel>
          )}
        </div>

        {/* ── Sidebar ── */}
        <div id="job-details-sidebar" className="xl:col-span-1 space-y-4 scroll-mt-24">
          {job.failureAnalysis && (
            <CommandPanel id="job-failure-analysis" className="overflow-hidden p-0 scroll-mt-24">
              <div className="border-b border-[var(--border)] px-4 py-2 text-xs font-medium text-[var(--warning)]">
                Failure Analysis
              </div>
              <div className="space-y-2 px-4 py-3">
                <div className="text-xs leading-relaxed text-foreground">{job.failureAnalysis.summary}</div>
                {job.failureAnalysis.evidence.map((entry, i) => (
                  <div key={i} className="rounded-[var(--radius-tight)] border border-[var(--border)] bg-[rgba(255,255,255,0.02)] px-3 py-2 text-[10px] font-mono text-foreground-muted break-words">
                    {entry}
                  </div>
                ))}
              </div>
            </CommandPanel>
          )}

          {job.attemptSummary && job.attemptSummary.length > 0 && (
            <CommandPanel className="overflow-hidden p-0">
              <div className="border-b border-[var(--border-strong)] px-4 py-2 text-xs font-medium text-foreground-subtle">
                Attempts ({job.attemptSummary.length})
              </div>
              <div className="divide-y divide-[var(--border-strong)]">
                {job.attemptSummary.map((attempt, i) => (
                  <div key={i} className="space-y-0.5 px-4 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-[10px] font-mono">
                        <span className={attempt.success ? 'text-[var(--success)]' : 'text-[var(--error)]'}>
                          {attempt.success ? '✓' : '✗'}
                        </span>
                        <span className="text-foreground">{attempt.bundle}</span>
                        <span className="text-foreground-subtle">{attempt.phase}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] font-mono">
                        {attempt.retryCount > 0 ? <span className="text-[var(--warning)]">{attempt.retryCount}×</span> : null}
                        {typeof attempt.auditScore === 'number' ? <span className={attempt.auditScore >= 70 ? 'text-[var(--success)]' : 'text-[var(--warning)]'}>{attempt.auditScore}</span> : null}
                        {attempt.tokenUsage ? <span className="text-foreground-subtle">{attempt.tokenUsage.input}↑{attempt.tokenUsage.output}↓</span> : null}
                      </div>
                    </div>
                    <div className="truncate text-[9px] font-mono text-foreground-subtle">{attempt.modelUsed}</div>
                    {attempt.failureReasons?.map((reason, ri) => (
                      <div key={ri} className="text-[10px] font-mono leading-snug text-[var(--error)]">· {reason}</div>
                    ))}
                  </div>
                ))}
              </div>
            </CommandPanel>
          )}

          {/* Config */}
          <CommandPanel className="divide-y divide-[var(--border-strong)] overflow-hidden p-0">
            <div className="px-4 py-2 text-xs font-medium text-foreground-subtle">
              Details
            </div>
            {[
              { label: 'Priority', value: job.priority },
              { label: 'Mode', value: job.mode },
              { label: 'Distribution', value: job.distributionConfig?.mode ?? '—' },
              { label: 'Requested by', value: job.requestedBy ?? '—' },
              { label: 'Execution', value: job.executionTarget ?? '—' },
              { label: 'Provider', value: summarizeProvider(job) },
              ...(job.modelConfig?.drafterModel ? [{ label: 'Drafter', value: job.modelConfig.drafterModel.replace('ollama:', '') }] : []),
              ...(job.modelConfig?.repairModel && job.modelConfig.repairModel !== job.modelConfig.drafterModel ? [{ label: 'Repair', value: job.modelConfig.repairModel.replace('ollama:', '') }] : []),
              { label: 'Submitted', value: formatTimestamp(job.requestedAt) },
              { label: 'Started', value: formatTimestamp(job.startedAt) },
              { label: 'Completed', value: formatTimestamp(job.completedAt) },
              { label: 'Duration', value: duration(job.startedAt, job.completedAt) },
            ].map(({ label, value }) => (
              <div key={label} className="px-4 py-1.5 flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-foreground-subtle">{label}</span>
                <span className="text-xs font-mono text-foreground-muted text-right">{value}</span>
              </div>
            ))}
            <div className="px-4 py-1.5 flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-foreground-subtle">Heartbeat</span>
              <span className={`text-xs font-mono text-right ${
                !isActive ? 'text-foreground-muted'
                  : jobHealth === 'critical' ? 'text-[var(--error)]'
                  : jobHealth === 'warning' ? 'text-[#f59e0b]'
                  : 'text-[var(--success)]'
              }`}>
                {isActive && job.lastHeartbeatAt ? formatRelativeTime(job.lastHeartbeatAt) : formatTimestamp(job.lastHeartbeatAt)}
              </span>
            </div>
            <div className="px-4 py-2 flex items-start gap-2">
              <span className="text-xs font-medium text-foreground-subtle shrink-0">Bundles</span>
              <div className="flex flex-wrap gap-1 justify-end ml-auto">
                {job.bundles.map((b) => (
                  <BundleBadge key={b} bundle={b} />
                ))}
              </div>
            </div>
          </CommandPanel>

          {/* Job Context */}
          <CommandPanel className="divide-y divide-[var(--border-strong)] overflow-hidden p-0">
            <div className="px-4 py-2 text-xs font-medium text-foreground-subtle">
              Job Context
            </div>
            {job.scopeTier && (
              <div className="px-4 py-1.5 flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-foreground-subtle">Scope</span>
                <span className="text-xs font-mono text-foreground-muted">
                  {job.scopeTier}{job.scopeKey && job.scopeKey !== 'universal' ? ` · ${job.scopeKey}` : ''}
                </span>
              </div>
            )}
            {job.regions && job.regions.length > 0 && (
              <div className="px-4 py-1.5 flex items-start gap-2">
                <span className="text-xs font-medium text-foreground-subtle shrink-0">Regions</span>
                <div className="flex flex-wrap gap-1 justify-end ml-auto">
                  {job.regions.map((r) => (
                    <span key={r} className="text-[9px] font-mono text-foreground-muted px-1.5 py-0.5 rounded bg-background-muted border border-[var(--border)]">
                      {r.replace(/_/g, ' ')}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {job.applicable_countries && job.applicable_countries.length > 0 && (
              <div className="px-4 py-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-foreground-subtle">Countries</span>
                  <button
                    onClick={() => setCountriesExpanded(!countriesExpanded)}
                    className="text-[10px] font-mono text-foreground-muted hover:text-foreground transition-colors"
                  >
                    {job.applicable_countries.length} {countriesExpanded ? '▲' : '▼'}
                  </button>
                </div>
                {countriesExpanded && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {job.applicable_countries.map((c) => (
                      <span key={c} className="text-[9px] font-mono text-foreground-muted px-1.5 py-0.5 rounded bg-background-muted border border-[var(--border)]">
                        {c.toUpperCase()}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
            <div className="px-4 py-1.5 flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-foreground-subtle">Story Mode</span>
              <span className="text-xs font-mono text-foreground-muted">
                {job.distributionConfig?.mode === 'fixed'
                  ? job.distributionConfig?.loopLength === 3
                    ? '3-Part Arc'
                    : job.distributionConfig?.loopLength === 2
                      ? '2-Part Arc'
                      : 'Fixed'
                  : 'Standalone'}
                {job.distributionConfig?.gameLength ? ` · ${job.distributionConfig.gameLength}` : ''}
              </span>
            </div>
            {job.sourceKind && (
              <div className="px-4 py-1.5 flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-foreground-subtle">Source</span>
                <span className="text-xs font-mono text-foreground-muted">{job.sourceKind}</span>
              </div>
            )}
            {job.modelConfig && Object.values(job.modelConfig).some(Boolean) && (
              <div className="px-4 py-2">
                <div className="text-[10px] font-medium text-foreground-subtle mb-1.5">Models</div>
                <div className="space-y-0.5">
                  {([
                    ['Architect', job.modelConfig.architectModel],
                    ['Drafter', job.modelConfig.drafterModel],
                    ['Advisor', job.modelConfig.advisorModel],
                    ['Repair', job.modelConfig.repairModel],
                    ['Quality', job.modelConfig.contentQualityModel],
                    ['Narrative', job.modelConfig.narrativeReviewModel],
                    ['Embedding', job.modelConfig.embeddingModel],
                  ] as [string, string | undefined][])
                    .filter(([, v]) => v)
                    .map(([label, value]) => (
                      <div key={label} className="flex items-center justify-between gap-2 text-[10px] font-mono">
                        <span className="text-foreground-subtle">{label}</span>
                        <span className="text-foreground-muted truncate max-w-[160px]" title={value}>
                          {value!.replace('ollama:', '')}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            )}
            {job.newsContext && job.newsContext.length > 0 && (
              <div className="px-4 py-2">
                <button
                  onClick={() => setNewsExpanded(!newsExpanded)}
                  className="flex items-center justify-between w-full text-[10px] font-medium text-foreground-subtle hover:text-foreground transition-colors"
                >
                  <span>News Context ({job.newsContext.length})</span>
                  <span>{newsExpanded ? '▲' : '▼'}</span>
                </button>
                {newsExpanded && (
                  <div className="mt-1.5 space-y-1.5">
                    {job.newsContext.map((article: NewsContextArticle, i: number) => (
                      <div key={i} className="text-[10px] font-mono">
                        <div className="text-foreground-muted leading-snug">{article.title}</div>
                        <div className="text-foreground-subtle flex items-center gap-2">
                          <span>{article.source}</span>
                          {article.pubDate && <span>{new Date(article.pubDate).toLocaleDateString()}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </CommandPanel>

          {/* Tokens */}
          {job.tokenSummary && job.tokenSummary.callCount > 0 && (
            <CommandPanel className="divide-y divide-[var(--border-strong)] overflow-hidden p-0">
              <div className="px-4 py-2 text-xs font-medium text-foreground-subtle">
                Tokens
              </div>
              {[
                { label: 'Input', value: job.tokenSummary.inputTokens.toLocaleString() },
                { label: 'Output', value: job.tokenSummary.outputTokens.toLocaleString() },
                { label: 'LLM Calls', value: String(job.tokenSummary.callCount) },
                { label: 'Est. Cost', value: `$${job.tokenSummary.costUsd.toFixed(4)}` },
                ...(job.tokenSummary.conceptCount != null && job.tokenSummary.conceptCount > 0
                  ? [
                      { label: 'Loops', value: String(job.tokenSummary.conceptCount) },
                      { label: 'Avg Loop', value: formatElapsed(Math.round(job.tokenSummary.totalDurationMs! / job.tokenSummary.conceptCount!)) },
                    ]
                  : []),
              ].map(({ label, value }) => (
                <div key={label} className="px-4 py-1.5 flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-foreground-subtle">{label}</span>
                  <span className="text-xs font-mono text-foreground-muted">{value}</span>
                </div>
              ))}
            </CommandPanel>
          )}

          {/* Audit Quality */}
          {job.auditSummary && (
            <CommandPanel id="job-audit-quality" className="divide-y divide-[var(--border-strong)] overflow-hidden p-0 scroll-mt-24">
              <div className="px-4 py-2 text-xs font-medium text-foreground-subtle">
                Audit Quality
              </div>
              <div className="px-4 py-3 grid grid-cols-3 gap-2 text-center">
                {([
                  { label: 'Avg', value: job.auditSummary.avgScore },
                  { label: 'Min', value: job.auditSummary.minScore },
                  { label: 'Max', value: job.auditSummary.maxScore },
                  { label: '<70', value: job.auditSummary.below70Count },
                  { label: '>90', value: job.auditSummary.above90Count },
                  { label: 'Fixed', value: remediatedCount },
                ] as const).map(({ label, value }) => (
                  <div key={label}>
                    <div className="text-[9px] font-mono text-foreground-subtle">{label}</div>
                    <div className="text-sm font-mono text-foreground">{value}</div>
                  </div>
                ))}
              </div>
            </CommandPanel>
          )}

        </div>
      </div>

      {/* ─── Full-Width: Errors ─── */}
      {((job.issueSummaries?.length ?? 0) > 0 || (job.errors?.length ?? 0) > 0 || !!job.error || !!job.failureAnalysis) && (() => {
        const { generationErrors, auditAttempts, dedupSkips, cooldownSkips } = categorizeErrors(job.errors ?? []);
        return (
          <div id="job-issues" className="mt-6 space-y-4 scroll-mt-24">
            {(job.issueSummaries?.length ?? 0) > 0 && (
              <div>
                <div className="mb-2 text-xs font-medium text-foreground-subtle">
                  Issue Summary
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  {job.issueSummaries?.map((issue) => (
                    <CommandPanel key={`${issue.category}-${issue.title}`} className="p-4">
                      <div className={`text-xs font-medium ${issue.severity === 'error' ? 'text-[var(--error)]' : issue.severity === 'warning' ? 'text-[#f59e0b]' : 'text-[var(--info)]'}`}>
                        {issue.title} · {issue.count}
                      </div>
                      <p className="mt-1 text-xs leading-6 text-foreground-muted">{issue.summary}</p>
                      {issue.examples.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {issue.examples.map((example, idx) => (
                            <div key={idx} className="text-[10px] font-mono text-foreground-subtle break-words">
                              • {example}
                            </div>
                          ))}
                        </div>
                      )}
                    </CommandPanel>
                  ))}
                </div>
              </div>
            )}
            {generationErrors.length > 0 && (
              <div>
                <div className="mb-2 text-xs font-medium text-[var(--error)]">
                  Generation Errors — {generationErrors.length}
                </div>
                <CommandPanel className="divide-y divide-[var(--border)] overflow-hidden p-0">
                  {generationErrors.map((e, i) => (
                    <div key={i} className="flex items-start gap-3 px-4 py-2.5">
                      <span className="mt-0.5 shrink-0 font-mono text-xs text-[var(--error)]">✗</span>
                      <div>
                        {e.bundle ? <div className="mb-0.5 text-[10px] font-mono text-foreground-subtle">[{e.bundle}]</div> : null}
                        <div className="text-xs font-mono text-[var(--error)]">{e.error}</div>
                      </div>
                    </div>
                  ))}
                </CommandPanel>
              </div>
            )}
            {auditAttempts.length > 0 && (
              <div>
                <div className="mb-2 text-xs font-medium text-[#f59e0b]">
                  Audit Failures — {auditAttempts.length}
                  <span className="ml-1 font-normal text-foreground-subtle">(rejected by quality audit)</span>
                </div>
                <CommandPanel className="divide-y divide-[var(--border)] overflow-hidden p-0">
                  {auditAttempts.map((e, i) => (
                    <div key={i} className="flex items-start gap-3 px-4 py-2">
                      <span className="mt-0.5 shrink-0 font-mono text-xs text-[#f59e0b]">↻</span>
                      <div className="min-w-0">
                        {e.bundle ? <span className="mr-1.5 text-[10px] font-mono text-foreground-subtle">[{e.bundle}]</span> : null}
                        <span className="break-words text-xs font-mono text-foreground-muted">{e.error}</span>
                      </div>
                    </div>
                  ))}
                </CommandPanel>
              </div>
            )}
            {(dedupSkips.length > 0 || cooldownSkips.length > 0) && (
              <div className="flex gap-4 text-[10px] font-mono text-foreground-subtle">
                {dedupSkips.length > 0 ? <span>Dedup skips: {dedupSkips.length}</span> : null}
                {cooldownSkips.length > 0 ? <span>Cooldown skips: {cooldownSkips.length}</span> : null}
              </div>
            )}
            {job.error ? (
              <CommandPanel className="p-4">
                <div className="mb-2 text-xs font-medium text-[var(--error)]">Fatal Error</div>
                <div className="text-xs font-mono text-[var(--error)]">{job.error}</div>
              </CommandPanel>
            ) : null}
          </div>
        );
      })()}

      {/* ─── Full-Width: Results ─── */}
      {(job.results ?? []).length > 0 && (
        <div id="job-results" className="mt-6 scroll-mt-24">
          <div className="flex items-center justify-between gap-3 mb-2">
            <div className="text-xs font-medium text-foreground-subtle">
              Results — {sortedResults.length}{sortedResults.length !== (job.results ?? []).length ? ` of ${(job.results ?? []).length}` : ''} saved
            </div>
            <div className="flex items-center gap-2">
              {activeFilterCount > 0 && (
                <button onClick={clearAllFilters} className="text-[10px] font-mono text-[var(--accent-primary)] hover:text-foreground transition-colors">
                  Clear {activeFilterCount} filter{activeFilterCount > 1 ? 's' : ''}
                </button>
              )}
              <input
                type="text"
                value={resultSearch}
                onChange={(e) => setResultSearch(e.target.value)}
                placeholder="Search results…"
                className="input-shell max-w-[200px] text-xs"
                style={{ width: 'auto' }}
              />
            </div>
          </div>

          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <div className="flex items-center gap-1 flex-wrap">
              {[...new Set((job.results ?? []).map((r) => r.bundle))].map((b) => (
                <button
                  key={b}
                  onClick={() => setFilterBundle(filterBundle === b ? null : b)}
                  className={`transition-all ${filterBundle === b ? 'ring-1 ring-[var(--accent-primary)] rounded-md' : 'opacity-70 hover:opacity-100'}`}
                >
                  <BundleBadge bundle={b} />
                </button>
              ))}
            </div>
            <span className="text-[var(--border)] text-xs">|</span>
            <div className="flex items-center gap-1 text-[10px] font-mono">
              <span className="text-foreground-subtle">Score</span>
              <input
                type="number"
                value={filterScoreMin}
                onChange={(e) => setFilterScoreMin(e.target.value)}
                placeholder="min"
                className="input-shell w-12 text-[10px] py-0.5 px-1.5 text-center"
              />
              <span className="text-foreground-subtle">–</span>
              <input
                type="number"
                value={filterScoreMax}
                onChange={(e) => setFilterScoreMax(e.target.value)}
                placeholder="max"
                className="input-shell w-12 text-[10px] py-0.5 px-1.5 text-center"
              />
            </div>
            <span className="text-[var(--border)] text-xs">|</span>
            <select
              value={filterScope ?? ''}
              onChange={(e) => setFilterScope(e.target.value || null)}
              className="input-shell text-[10px] py-0.5 px-1.5"
              style={{ width: 'auto' }}
            >
              <option value="">All scopes</option>
              <option value="universal">Universal</option>
              <option value="regional">Regional</option>
              <option value="cluster">Cluster</option>
              <option value="exclusive">Exclusive</option>
            </select>
            <span className="text-[var(--border)] text-xs">|</span>
            <div className="flex items-center gap-1">
              {([
                [null, 'All'],
                [true, 'Fixed'],
                [false, 'Not Fixed'],
              ] as [boolean | null, string][]).map(([val, label]) => (
                <button
                  key={label}
                  onClick={() => setFilterFixed(val)}
                  className={`text-[10px] font-mono px-2 py-0.5 rounded border transition-colors ${
                    filterFixed === val
                      ? 'border-[var(--accent-primary)]/60 bg-[var(--accent-primary)]/15 text-foreground'
                      : 'border-[var(--border)] text-foreground-subtle hover:text-foreground'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            {job.mode === 'full_send' && (
              <>
                <span className="text-[var(--border)] text-xs">|</span>
                <div className="flex items-center gap-1">
                  {([
                    [null, 'All'],
                    ['openai', 'OpenAI'],
                    ['local', 'Local'],
                  ] as ['openai' | 'local' | null, string][]).map(([val, label]) => (
                    <button
                      key={label}
                      onClick={() => setFilterProvider(val)}
                      className={`text-[10px] font-mono px-2 py-0.5 rounded border transition-colors ${
                        filterProvider === val
                          ? 'border-[var(--accent-secondary)]/60 bg-[var(--accent-secondary)]/15 text-foreground'
                          : 'border-[var(--border)] text-foreground-subtle hover:text-foreground'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
          <div className="tech-border overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[var(--border-strong)] bg-[rgba(255,255,255,0.04)]">
                  <th className="text-left px-4 py-2.5">
                    <SortHeader field="title" label="Title" current={sortField} dir={sortDir} onSort={handleSort} />
                  </th>
                  <th className="text-left px-4 py-2.5">
                    <SortHeader field="bundle" label="Bundle" current={sortField} dir={sortDir} onSort={handleSort} />
                  </th>
                  <th className="text-left px-4 py-2.5">
                    <SortHeader field="auditScore" label="Audit" current={sortField} dir={sortDir} onSort={handleSort} />
                  </th>
                  <th className="text-left px-4 py-2.5">
                    <SortHeader field="autoFixed" label="Fixed" current={sortField} dir={sortDir} onSort={handleSort} />
                  </th>
                  <th className="text-left px-4 py-2.5 hidden lg:table-cell">
                    <span className="text-xs font-medium text-foreground-subtle">Scope</span>
                  </th>
                  <th className="text-left px-4 py-2.5 hidden lg:table-cell">
                    <span className="text-xs font-medium text-foreground-subtle">Countries</span>
                  </th>
                  {job.mode === 'full_send' && (
                    <th className="text-left px-4 py-2.5 hidden lg:table-cell">
                      <span className="text-xs font-medium text-foreground-subtle">Pipeline</span>
                    </th>
                  )}
                  <th className="text-right px-4 py-2.5 text-xs font-medium text-foreground-subtle">
                    ID
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedResults.map((r, i) => (
                  <tr
                    key={r.id}
                    className={`border-b border-[var(--border)] hover:bg-background-muted transition-colors ${
                      i % 2 === 0 ? 'bg-background' : 'bg-[rgba(255,255,255,0.02)]'
                    }`}
                  >
                    <td className="px-4 py-2.5">
                      <Link href={`/scenarios/${r.id}`} className="text-foreground hover:text-[var(--accent-primary)] transition-colors font-medium">
                        {r.title}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5"><BundleBadge bundle={r.bundle} /></td>
                    <td className="px-4 py-2.5">
                      {r.auditScore !== undefined ? <AuditScore score={r.auditScore} /> : <span className="text-foreground-subtle">—</span>}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs">
                      {r.autoFixed ? <span className="text-[var(--success)]">✓</span> : <span className="text-foreground-subtle">—</span>}
                    </td>
                    <td className="px-4 py-2.5 hidden lg:table-cell">
                      <div className="flex flex-wrap gap-1">
                        {r.scopeTier && r.scopeTier !== 'universal' && (
                          <span className="text-[9px] font-medium text-foreground-subtle px-1.5 py-0.5 rounded bg-background-muted border border-[var(--border)]">
                            {r.scopeTier}
                          </span>
                        )}
                        {r.requires && Object.entries(r.requires).filter(([, v]) => v === true).map(([k]) => (
                          <span key={k} className="text-[9px] font-medium text-[var(--info)] px-1.5 py-0.5 rounded bg-[var(--info)]/10 border border-[var(--info)]/20" title={`Requires: ${k.replace(/_/g, ' ')}`}>
                            {k.replace(/_/g, ' ')}
                          </span>
                        ))}
                        {(!r.scopeTier || r.scopeTier === 'universal') && (!r.requires || !Object.values(r.requires).some(v => v === true)) && (
                          <span className="text-foreground-subtle">—</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 hidden lg:table-cell font-mono text-xs">
                      {r.countryCount === null ? (
                        <span className="text-foreground-muted">All</span>
                      ) : r.countryCount !== undefined ? (
                        <span className="text-foreground">{r.countryCount}</span>
                      ) : (
                        <span className="text-foreground-subtle">—</span>
                      )}
                    </td>
                    {job.mode === 'full_send' && (
                      <td className="px-4 py-2.5 hidden lg:table-cell">
                        {r.fullSendProvider === 'openai' ? (
                          <span className="text-[9px] font-semibold text-[var(--accent-secondary)] px-1.5 py-0.5 rounded border border-[var(--accent-secondary)]/30 bg-[var(--accent-secondary)]/10">
                            OpenAI
                          </span>
                        ) : r.fullSendProvider === 'local' ? (
                          <span className="text-[9px] font-semibold text-[var(--accent-primary)] px-1.5 py-0.5 rounded border border-[var(--accent-primary)]/30 bg-[var(--accent-primary)]/10">
                            Local
                          </span>
                        ) : (
                          <span className="text-foreground-subtle">—</span>
                        )}
                      </td>
                    )}
                    <td className="px-4 py-2.5 text-right font-mono text-foreground-subtle">{r.id.slice(0, 8)}…</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── Live Results (no rich results yet) ─── */}
      {sortedResults.length === 0 && (job.savedScenarioIds?.length ?? 0) > 0 && (
        <CommandPanel className="mt-6 p-5">
          <div className="text-xs font-medium text-foreground-subtle mb-3">
            Live Results — {job.savedScenarioIds!.length} saved
          </div>
          <div className="space-y-1.5">
            {job.savedScenarioIds!.map((sid) => (
              <Link key={sid} href={`/scenarios/${sid}`} className="flex items-center gap-2 text-xs font-mono text-foreground hover:text-[var(--accent-primary)] transition-colors">
                <span className="text-[var(--success)]">✓</span>
                <span>{sid}</span>
              </Link>
            ))}
          </div>
        </CommandPanel>
      )}

      {/* ─── Empty state ─── */}
      {sortedResults.length === 0 && !(job.savedScenarioIds?.length) && !job.errors?.length && !job.error && !isActive && (
        <CommandPanel className="mt-6 p-6 text-center text-sm text-foreground-subtle">
          No results recorded for this job.
        </CommandPanel>
      )}

    </div>
  );
}
