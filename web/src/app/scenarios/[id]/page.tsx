import { notFound } from 'next/navigation';
import Link from 'next/link';
import BundleBadge from '@/components/BundleBadge';
import SeverityBadge from '@/components/SeverityBadge';
import AuditScore from '@/components/AuditScore';
import StanceBadge from '@/components/StanceBadge';
import MetricEffect from '@/components/MetricEffect';
import CommandPanel from '@/components/CommandPanel';
import type { ScenarioDetail, Option } from '@/lib/types';
import { METRIC_DISPLAY } from '@/lib/constants';
import ScenarioActions from './ScenarioActions';

async function fetchScenario(id: string): Promise<ScenarioDetail | null> {
  try {
    const res = await fetch(`http://localhost:3001/api/scenarios/${id}`, { cache: 'no-store' });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error('Failed to fetch');
    return res.json() as Promise<ScenarioDetail>;
  } catch {
    return null;
  }
}

const OPTION_LABELS = ['A', 'B', 'C', 'D'];

function OptionSection({ option, index }: { option: Option; index: number }) {
  return (
    <CommandPanel className="p-5">
      <div className="flex items-center gap-2 mb-3">
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-[10px] border border-[var(--border)] bg-[rgba(25,105,220,0.14)] text-[10px] font-mono font-bold text-[var(--accent-primary)]">
          {OPTION_LABELS[index] ?? index + 1}
        </span>
        {option.label && (
          <span className="text-[10px] font-mono uppercase tracking-wider text-foreground-subtle">
            {option.label}
          </span>
        )}
      </div>

      <p className="text-sm text-foreground leading-relaxed mb-4">{option.text}</p>

      {option.effects.length > 0 && (
        <div className="mb-4">
          <div className="text-[10px] font-mono uppercase tracking-wider text-foreground-subtle mb-2">
            Effects
          </div>
          <div className="space-y-1">
            {option.effects.map((effect, i) => (
              <MetricEffect key={i} effect={effect} />
            ))}
          </div>
        </div>
      )}

      {option.advisorFeedback && option.advisorFeedback.length > 0 && (
        <div className="mb-4">
          <div className="text-[10px] font-mono uppercase tracking-wider text-foreground-subtle mb-2">
            Advisor Feedback
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
            {option.advisorFeedback.map((af, i) => (
              <div key={i} className="control-surface p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-foreground-subtle">
                    {af.roleId.replace(/_/g, ' ')}
                  </span>
                  <StanceBadge stance={af.stance} />
                </div>
                <p className="text-xs text-foreground-muted leading-relaxed line-clamp-3">
                  {af.feedback}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {(option.outcomeHeadline || option.outcomeSummary) && (
        <div className="control-surface p-4">
          <div className="text-[10px] font-mono uppercase tracking-wider text-foreground-subtle mb-1">
            Outcome
          </div>
          {option.outcomeHeadline && (
            <div className="text-sm font-semibold text-foreground mb-1">{option.outcomeHeadline}</div>
          )}
          {option.outcomeSummary && (
            <p className="text-xs text-foreground-muted leading-relaxed">{option.outcomeSummary}</p>
          )}
          {option.outcomeContext && (
            <p className="text-xs text-foreground-subtle mt-2 leading-relaxed italic">
              {option.outcomeContext}
            </p>
          )}
        </div>
      )}
    </CommandPanel>
  );
}

export default async function ScenarioDetailPage({ params }: { params: { id: string } }) {
  const scenario = await fetchScenario(params.id);

  if (!scenario) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-[1200px]">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs font-mono text-foreground-subtle mb-4">
        <Link href="/scenarios" className="hover:text-foreground transition-colors">
          Scenarios
        </Link>
        {scenario.metadata?.bundle && (
          <>
            <span>/</span>
            <Link
              href={`/scenarios?bundle=${scenario.metadata.bundle}`}
              className="hover:text-foreground transition-colors"
            >
              {scenario.metadata.bundle}
            </Link>
          </>
        )}
        <span>/</span>
        <span className="text-foreground-muted">{scenario.id}</span>
      </div>

      {/* Header */}
      <CommandPanel className="mb-4 p-5 md:p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex-1 min-w-0">
            <div className="section-kicker mb-2">Scenario Record</div>
            <h1 className="text-2xl font-semibold text-foreground mb-3">{scenario.title}</h1>
            <div className="flex items-center gap-2 flex-wrap">
              {scenario.metadata?.bundle && <BundleBadge bundle={scenario.metadata.bundle} />}
              <SeverityBadge severity={scenario.metadata?.severity ?? null} />
              {scenario.metadata?.auditMetadata?.score !== undefined && (
                <AuditScore score={scenario.metadata.auditMetadata.score} />
              )}
              {scenario.phase && (
                <span className="text-[10px] font-mono uppercase tracking-wider text-foreground-subtle">
                  {scenario.phase}
                </span>
              )}
            </div>
          </div>
          <ScenarioActions id={scenario.id} isActive={scenario.is_active} />
        </div>
      </CommandPanel>

      {/* Description */}
      <CommandPanel className="mb-4 p-5">
        <div className="text-[10px] font-mono uppercase tracking-wider text-foreground-subtle mb-2">
          Description
        </div>
        <p className="text-sm text-foreground leading-relaxed">{scenario.description}</p>
      </CommandPanel>

      {/* Conditions */}
      {scenario.conditions && scenario.conditions.length > 0 && (
        <CommandPanel className="mb-4 p-5">
          <div className="text-[10px] font-mono uppercase tracking-wider text-foreground-subtle mb-2">
            Conditions
          </div>
          <div className="flex flex-wrap gap-2">
            {scenario.conditions.map((c, i) => (
              <span
                key={i}
                className="inline-flex items-center px-2 py-1 text-xs font-mono bg-background border border-[var(--border-strong)] text-foreground-muted rounded-[2px]"
              >
                {METRIC_DISPLAY[c.metricId] ?? c.metricId}
                {c.min !== undefined && ` ≥ ${c.min}`}
                {c.max !== undefined && ` ≤ ${c.max}`}
              </span>
            ))}
          </div>
        </CommandPanel>
      )}

      {/* Legislature requirement */}
      {scenario.legislature_requirement && (
        <CommandPanel className="mb-4 p-5">
          <div className="text-[10px] font-mono uppercase tracking-wider text-foreground-subtle mb-2">
            Legislature Requirement
          </div>
          <p className="text-sm text-foreground-muted font-mono">
            Requires approval ≥ {scenario.legislature_requirement.min_approval}%
            {scenario.legislature_requirement.chamber && (
              <span> ({scenario.legislature_requirement.chamber} chamber)</span>
            )}
          </p>
        </CommandPanel>
      )}

      {/* Options */}
      <div className="mb-4">
        <div className="text-[10px] font-mono uppercase tracking-wider text-foreground-subtle mb-3">
          Options
        </div>
        <div className="space-y-3">
          {scenario.options.map((option, i) => (
            <OptionSection key={option.id} option={option} index={i} />
          ))}
        </div>
      </div>

      {/* Metadata */}
      <details className="tech-border">
        <summary className="px-4 py-3 cursor-pointer text-[10px] font-mono uppercase tracking-wider text-foreground-subtle hover:text-foreground transition-colors">
          Metadata
        </summary>
        <div className="p-4 border-t border-[var(--border)] grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
          {scenario.metadata?.tags && scenario.metadata.tags.length > 0 && (
            <div>
              <div className="text-[10px] font-mono uppercase tracking-wider text-foreground-subtle mb-1">Tags</div>
              <div className="flex flex-wrap gap-1">
                {scenario.metadata.tags.map((t) => (
                  <span key={t} className="px-1.5 py-0.5 bg-background text-foreground-muted font-mono text-[10px] border border-[var(--border)]">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}
          {scenario.metadata?.difficulty !== undefined && (
            <div>
              <div className="text-[10px] font-mono uppercase tracking-wider text-foreground-subtle mb-1">Difficulty</div>
              <span className="font-mono text-foreground-muted">{scenario.metadata.difficulty}/5</span>
            </div>
          )}
          {scenario.metadata?.source && (
            <div>
              <div className="text-[10px] font-mono uppercase tracking-wider text-foreground-subtle mb-1">Source</div>
              <span className="font-mono text-foreground-muted">{scenario.metadata.source}</span>
            </div>
          )}
          {scenario.metadata?.applicable_countries && (
            <div>
              <div className="text-[10px] font-mono uppercase tracking-wider text-foreground-subtle mb-1">Countries</div>
              <span className="font-mono text-foreground-muted">
                {Array.isArray(scenario.metadata.applicable_countries)
                  ? scenario.metadata.applicable_countries.join(', ')
                  : scenario.metadata.applicable_countries}
              </span>
            </div>
          )}
          {scenario.metadata?.isNeighborEvent && (
            <div>
              <div className="text-[10px] font-mono uppercase tracking-wider text-foreground-subtle mb-1">Neighbor Event</div>
              <span className="font-mono text-[var(--warning)]">Yes</span>
            </div>
          )}
          {scenario.metadata?.auditMetadata && (
            <div className="col-span-full">
              <div className="text-[10px] font-mono uppercase tracking-wider text-foreground-subtle mb-1">Audit</div>
              <div className="space-y-0.5">
                <div className="font-mono text-foreground-muted">Score: {scenario.metadata.auditMetadata.score}</div>
                <div className="font-mono text-foreground-muted">Audited: {scenario.metadata.auditMetadata.lastAudited}</div>
                {scenario.metadata.auditMetadata.issues.length > 0 && (
                  <div>
                    <div className="text-[10px] font-mono uppercase tracking-wider text-foreground-subtle mt-2 mb-1">Issues</div>
                    <ul className="space-y-0.5">
                      {scenario.metadata.auditMetadata.issues.map((issue, i) => (
                        <li key={i} className="font-mono text-[var(--warning)] text-[10px]">• {issue}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </details>
    </div>
  );
}
