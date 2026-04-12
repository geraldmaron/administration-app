'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import CommandPanel from '@/components/CommandPanel';
import DataStat from '@/components/DataStat';
import BundleBadge from '@/components/BundleBadge';
import AuditScore from '@/components/AuditScore';
import StatusBadge from '@/components/StatusBadge';
import { ALL_BUNDLES } from '@/lib/constants';
import type { JobDetail, JobResult, JobError, JobEvent, JobLiveActivity } from '@/lib/types';

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

const PHASE_LABELS: Record<string, string> = {
  generate: 'Generate',
  concept: 'Concept',
  blueprint: 'Blueprint',
  details: 'Details',
  advisor: 'Advisor',
  audit: 'Audit',
  repair: 'Repair',
  save: 'Save',
  dedup: 'Dedup',
  quality_gate: 'Quality',
  narrative_review: 'Narrative',
};

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
  const icon =
    phase.status === 'active' ? '◐' : phase.status === 'done' ? '●' : '✗';
  const color =
    phase.status === 'active'
      ? 'text-[var(--accent-primary)]'
      : phase.status === 'done'
        ? 'text-[var(--success)]'
        : 'text-[var(--error)]';
  return (
    <div className="flex items-center gap-1.5 text-[10px] font-mono">
      <span className={`${color} ${phase.status === 'active' ? 'animate-pulse' : ''}`}>{icon}</span>
      <span className="text-foreground-muted">{phase.label}</span>
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
  const icon =
    phase.status === 'active' ? '◐' : phase.status === 'done' ? '●' : '✗';
  const color =
    phase.status === 'active'
      ? 'text-[var(--accent-primary)]'
      : phase.status === 'done'
        ? 'text-[var(--success)]'
        : 'text-[var(--error)]';

  return (
    <div className="py-2 space-y-1.5">
      <div className="flex items-center gap-2 text-[11px] font-mono">
        <span className={`${color} ${phase.status === 'active' ? 'animate-pulse' : ''}`}>{icon}</span>
        <span className="text-foreground font-medium">{phase.label}</span>
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
          <span className={`text-[10px] ${phase.score >= 70 ? 'text-[var(--success)]' : 'text-[var(--warning)]'}`}>
            score {Math.round(phase.score)}
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
          <span className="text-[9px] font-mono text-foreground-subtle">{run.scenarioId.slice(0, 8)}</span>
        )}
        <span className="flex-1" />

        {/* Compact phase stepper */}
        <div className="hidden sm:flex items-center gap-0.5">
          {run.phases.map((p, pi) => (
            <span
              key={pi}
              className={`inline-block h-1.5 rounded-full ${
                p.status === 'done' ? 'bg-[var(--success)]' : p.status === 'active' ? 'bg-[var(--accent-primary)] animate-pulse' : 'bg-[var(--error)]'
              }`}
              style={{ width: `${Math.max(12, Math.min(40, (p.durationMs ?? 1000) / 200))}px` }}
              title={`${p.label} ${p.durationMs ? formatElapsed(p.durationMs) : ''}`}
            />
          ))}
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
        <div className="px-3 pb-2 divide-y divide-[var(--border)]/30">
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
    <div className={`control-surface overflow-hidden transition-colors ${isCurrentBundle ? 'ring-1 ring-[var(--accent-primary)]/40' : ''}`}>
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
              Waiting to start…
            </div>
          )}

          {pipeline.runs.length === 0 && !liveBundle && pipeline.status === 'active' && (
            <div className="px-4 py-3 text-[10px] font-mono text-foreground-subtle">
              Processing…
            </div>
          )}

          {pipeline.runs.length > 0 && (
            <div className="divide-y divide-[var(--border)]/30">
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
      className={`flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider transition-colors ${
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

  if (notFound) {
    return (
      <div className="mx-auto max-w-[1300px]">
        <Link href="/jobs" className="mb-6 block text-[10px] font-mono uppercase tracking-wider text-foreground-subtle transition-colors hover:text-foreground">
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

  const sortedResults: JobResult[] = [...(job.results ?? [])]
    .filter((r) => {
      if (!resultSearch.trim()) return true;
      const q = resultSearch.toLowerCase();
      return r.title.toLowerCase().includes(q) || r.bundle.toLowerCase().includes(q) || r.id.toLowerCase().includes(q);
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

  return (
    <div className="mx-auto max-w-[1300px]">
      <Link
        href="/jobs"
        className="mb-4 block text-[10px] font-mono uppercase tracking-wider text-foreground-subtle transition-colors hover:text-foreground"
      >
        ← Back to Jobs
      </Link>

      {/* ─── Header ─── */}
      <CommandPanel className="mb-4 px-5 py-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-semibold text-foreground data-value font-mono">
              {job.id.slice(0, 12)}…
            </h1>
            <StatusBadge status={job.status} pulse={isActive} />
            {job.mode && (
              <span className="text-[10px] font-mono uppercase tracking-wider text-foreground-subtle px-2 py-0.5 rounded border border-[var(--border)]">
                {job.mode}
              </span>
            )}
            {job.executionTarget && (
              <span className="text-[10px] font-mono text-foreground-subtle">{job.executionTarget}</span>
            )}
            {job.modelConfig?.drafterModel && (
              <span className="text-[10px] font-mono text-foreground-subtle">{job.modelConfig.drafterModel.replace('ollama:', '')}</span>
            )}
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
              <button onClick={handleStop} disabled={stopping} className="btn btn-destructive disabled:opacity-50">
                {stopping ? 'Stopping…' : 'Stop'}
              </button>
            )}
          </div>
        </div>
        {job.description && (
          <p className="mt-2 text-xs text-foreground-muted">{job.description}</p>
        )}
      </CommandPanel>

      {/* ─── Stats + Progress ─── */}
      <div className="mb-4 grid gap-3 grid-cols-3 sm:grid-cols-6">
        <DataStat label="Generated" value={generatedDraftCount} accent="blue" size="compact" />
        <DataStat label="Saved" value={savedCount} accent="success" size="compact" />
        <DataStat label="Failed" value={failedCount} accent={failedCount > 0 ? 'warning' : undefined} size="compact" />
        <DataStat label="Expected" value={total} size="compact" />
        <DataStat label="Remediated" value={remediatedCount} accent={remediatedCount > 0 ? 'gold' : undefined} size="compact" />
        {(() => {
          const scored = (job.results ?? []).filter(r => r.auditScore !== undefined);
          if (scored.length === 0) return <DataStat label="Avg Score" value="—" size="compact" />;
          const avg = Math.round(scored.reduce((s, r) => s + (r.auditScore ?? 0), 0) / scored.length);
          return <DataStat label="Avg Score" value={avg} accent={avg >= 90 ? 'success' : avg >= 75 ? undefined : 'warning'} size="compact" />;
        })()}
      </div>

      {isActive && (
        <CommandPanel className="mb-4 px-5 py-3">
          <div className="flex items-center justify-between text-[10px] font-mono text-foreground-subtle mb-1.5">
            <div>
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
          <div className="flex items-center gap-3 mt-1.5 text-[10px] font-mono text-foreground-subtle">
            <span className={
              !isActive ? '' : jobHealth === 'critical' ? 'text-[var(--error)]' : jobHealth === 'warning' ? 'text-[#f59e0b]' : 'text-[var(--success)]'
            }>
              Heartbeat: {job.lastHeartbeatAt ? formatRelativeTime(job.lastHeartbeatAt) : 'none'}
            </span>
            {job.currentBundle && (
              <>
                <span>·</span>
                <span>{job.currentBundle}{job.currentPhase ? ` → ${job.currentPhase}` : ''}</span>
              </>
            )}
          </div>
          {jobHealth === 'critical' && (
            <div className="mt-2 rounded-[var(--radius-tight)] border border-[var(--error)]/40 bg-[var(--error)]/8 px-3 py-2 text-[10px] font-mono text-[var(--error)]">
              No heartbeat for {formatElapsed(staleMs)} — job appears stuck.
            </div>
          )}
        </CommandPanel>
      )}

      {/* ─── Two Column: Pipeline + Sidebar ─── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">

        {/* ── Pipeline (main content) ── */}
        <div className="xl:col-span-2 space-y-2">
          <div className="text-[10px] font-mono uppercase tracking-widest text-foreground-subtle mb-1">
            Pipeline — {pipelines.length} bundle{pipelines.length !== 1 ? 's' : ''}
          </div>
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
        </div>

        {/* ── Sidebar ── */}
        <div className="xl:col-span-1 space-y-4">
          {/* Config */}
          <CommandPanel className="divide-y divide-[var(--border-strong)] overflow-hidden p-0">
            <div className="px-4 py-2 text-[10px] font-mono uppercase tracking-widest text-foreground-subtle">
              Details
            </div>
            {[
              { label: 'Priority', value: job.priority },
              { label: 'Mode', value: job.mode },
              { label: 'Distribution', value: job.distributionConfig?.mode ?? '—' },
              { label: 'Requested by', value: job.requestedBy ?? '—' },
              { label: 'Execution', value: job.executionTarget ?? '—' },
              ...(job.modelConfig?.drafterModel ? [{ label: 'Drafter', value: job.modelConfig.drafterModel.replace('ollama:', '') }] : []),
              ...(job.modelConfig?.repairModel && job.modelConfig.repairModel !== job.modelConfig.drafterModel ? [{ label: 'Repair', value: job.modelConfig.repairModel.replace('ollama:', '') }] : []),
              { label: 'Submitted', value: formatTimestamp(job.requestedAt) },
              { label: 'Started', value: formatTimestamp(job.startedAt) },
              { label: 'Completed', value: formatTimestamp(job.completedAt) },
              { label: 'Duration', value: duration(job.startedAt, job.completedAt) },
            ].map(({ label, value }) => (
              <div key={label} className="px-4 py-1.5 flex items-center justify-between gap-2">
                <span className="text-[10px] font-mono uppercase tracking-wider text-foreground-subtle">{label}</span>
                <span className="text-xs font-mono text-foreground-muted text-right">{value}</span>
              </div>
            ))}
            <div className="px-4 py-1.5 flex items-center justify-between gap-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-foreground-subtle">Heartbeat</span>
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
              <span className="text-[10px] font-mono uppercase tracking-wider text-foreground-subtle shrink-0">Bundles</span>
              <div className="flex flex-wrap gap-1 justify-end ml-auto">
                {job.bundles.map((b) => (
                  <BundleBadge key={b} bundle={b} />
                ))}
              </div>
            </div>
          </CommandPanel>

          {/* Tokens */}
          {job.tokenSummary && job.tokenSummary.callCount > 0 && (
            <CommandPanel className="divide-y divide-[var(--border-strong)] overflow-hidden p-0">
              <div className="px-4 py-2 text-[10px] font-mono uppercase tracking-widest text-foreground-subtle">
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
                  <span className="text-[10px] font-mono uppercase tracking-wider text-foreground-subtle">{label}</span>
                  <span className="text-xs font-mono text-foreground-muted">{value}</span>
                </div>
              ))}
            </CommandPanel>
          )}

          {/* Audit Quality */}
          {job.auditSummary && (
            <CommandPanel className="divide-y divide-[var(--border-strong)] overflow-hidden p-0">
              <div className="px-4 py-2 text-[10px] font-mono uppercase tracking-widest text-foreground-subtle">
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

          {/* Failure Analysis */}
          {job.failureAnalysis && (
            <CommandPanel className="p-0 overflow-hidden">
              <div className="px-4 py-2 text-[10px] font-mono uppercase tracking-widest text-[var(--warning)] border-b border-[var(--border)]">
                Failure Analysis
              </div>
              <div className="px-4 py-3 space-y-2">
                <div className="text-xs text-foreground leading-relaxed">{job.failureAnalysis.summary}</div>
                {job.failureAnalysis.evidence.map((entry, i) => (
                  <div key={i} className="rounded-[var(--radius-tight)] border border-[var(--border)] bg-[rgba(255,255,255,0.02)] px-3 py-2 text-[10px] font-mono text-foreground-muted break-words">
                    {entry}
                  </div>
                ))}
              </div>
            </CommandPanel>
          )}

          {/* Generation Attempts (Ollama / failed jobs) */}
          {job.attemptSummary && job.attemptSummary.length > 0 && (
            <CommandPanel className="overflow-hidden p-0">
              <div className="px-4 py-2 text-[10px] font-mono uppercase tracking-widest text-foreground-subtle border-b border-[var(--border-strong)]">
                Attempts ({job.attemptSummary.length})
              </div>
              <div className="divide-y divide-[var(--border-strong)]">
                {job.attemptSummary.map((attempt, i) => (
                  <div key={i} className="px-4 py-2 space-y-0.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-[10px] font-mono">
                        <span className={attempt.success ? 'text-[var(--success)]' : 'text-[var(--error)]'}>
                          {attempt.success ? '✓' : '✗'}
                        </span>
                        <span className="text-foreground">{attempt.bundle}</span>
                        <span className="text-foreground-subtle">{attempt.phase}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] font-mono">
                        {attempt.retryCount > 0 && (
                          <span className="text-[var(--warning)]">{attempt.retryCount}×</span>
                        )}
                        {typeof attempt.auditScore === 'number' && (
                          <span className={attempt.auditScore >= 70 ? 'text-[var(--success)]' : 'text-[var(--warning)]'}>
                            {attempt.auditScore}
                          </span>
                        )}
                        {attempt.tokenUsage && (
                          <span className="text-foreground-subtle">{attempt.tokenUsage.input}↑{attempt.tokenUsage.output}↓</span>
                        )}
                      </div>
                    </div>
                    <div className="text-[9px] font-mono text-foreground-subtle truncate">{attempt.modelUsed}</div>
                    {attempt.failureReasons?.map((reason, ri) => (
                      <div key={ri} className="text-[10px] font-mono text-[var(--error)] leading-snug">· {reason}</div>
                    ))}
                  </div>
                ))}
              </div>
            </CommandPanel>
          )}
        </div>
      </div>

      {/* ─── Full-Width: Results ─── */}
      {sortedResults.length > 0 && (
        <div className="mt-6">
          <div className="flex items-center justify-between gap-3 mb-2">
            <div className="text-[10px] font-mono uppercase tracking-widest text-foreground-subtle">
              Results — {sortedResults.length} saved
            </div>
            <input
              type="text"
              value={resultSearch}
              onChange={(e) => setResultSearch(e.target.value)}
              placeholder="Filter results…"
              className="input-shell max-w-[200px] text-xs"
              style={{ width: 'auto' }}
            />
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
                  <th className="text-right px-4 py-2.5 text-[10px] font-mono uppercase tracking-wider text-foreground-subtle">
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
                    <td className="px-4 py-2.5 text-right font-mono text-foreground-subtle">{r.id.slice(0, 8)}…</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── Full-Width: Errors ─── */}
      {job.errors && job.errors.length > 0 && (() => {
        const { generationErrors, auditAttempts, dedupSkips, cooldownSkips } = categorizeErrors(job.errors);
        return (
          <div className="mt-6 space-y-4">
            {generationErrors.length > 0 && (
              <div>
                <div className="text-[10px] font-mono uppercase tracking-widest text-[var(--error)] mb-2">
                  Generation Errors — {generationErrors.length}
                </div>
                <CommandPanel className="divide-y divide-[var(--border)] overflow-hidden p-0">
                  {generationErrors.map((e, i) => (
                    <div key={i} className="px-4 py-2.5 flex items-start gap-3">
                      <span className="text-[var(--error)] font-mono text-xs mt-0.5 shrink-0">✗</span>
                      <div>
                        {e.bundle && <div className="text-[10px] font-mono text-foreground-subtle mb-0.5">[{e.bundle}]</div>}
                        <div className="text-xs font-mono text-[var(--error)]">{e.error}</div>
                      </div>
                    </div>
                  ))}
                </CommandPanel>
              </div>
            )}
            {auditAttempts.length > 0 && (
              <div>
                <div className="text-[10px] font-mono uppercase tracking-widest text-[#f59e0b] mb-2">
                  Audit Failures — {auditAttempts.length}
                  <span className="normal-case font-normal text-foreground-subtle ml-1">(rejected by quality audit)</span>
                </div>
                <CommandPanel className="divide-y divide-[var(--border)] overflow-hidden p-0">
                  {auditAttempts.map((e, i) => (
                    <div key={i} className="px-4 py-2 flex items-start gap-3">
                      <span className="text-[#f59e0b] font-mono text-xs mt-0.5 shrink-0">↻</span>
                      <div className="min-w-0">
                        {e.bundle && <span className="text-[10px] font-mono text-foreground-subtle mr-1.5">[{e.bundle}]</span>}
                        <span className="text-xs font-mono text-foreground-muted break-words">{e.error}</span>
                      </div>
                    </div>
                  ))}
                </CommandPanel>
              </div>
            )}
            {(dedupSkips.length > 0 || cooldownSkips.length > 0) && (
              <div className="flex gap-4 text-[10px] font-mono text-foreground-subtle">
                {dedupSkips.length > 0 && <span>Dedup skips: {dedupSkips.length}</span>}
                {cooldownSkips.length > 0 && <span>Cooldown skips: {cooldownSkips.length}</span>}
              </div>
            )}
          </div>
        );
      })()}

      {/* ─── Live Results (no rich results yet) ─── */}
      {sortedResults.length === 0 && (job.savedScenarioIds?.length ?? 0) > 0 && (
        <CommandPanel className="mt-6 p-5">
          <div className="text-[10px] font-mono uppercase tracking-widest text-foreground-subtle mb-3">
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

      {job.error && (
        <CommandPanel className="mt-6 p-4">
          <div className="text-[10px] font-mono uppercase tracking-widest text-[var(--error)] mb-2">Fatal Error</div>
          <div className="text-xs font-mono text-[var(--error)]">{job.error}</div>
        </CommandPanel>
      )}
    </div>
  );
}
