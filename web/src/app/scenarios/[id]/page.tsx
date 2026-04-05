import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
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
import ScenarioEditor from './ScenarioEditor';
import ScenarioOps from './ScenarioOps';
import TagEditor from './TagEditor';
import TokenPreview from './TokenPreview';

async function fetchScenario(id: string): Promise<ScenarioDetail | null> {
  const h = headers();
  const host = h.get('host');
  if (!host) {
    throw new Error('Missing request host header for scenario fetch');
  }

  const protocol = h.get('x-forwarded-proto') ?? 'http';
  const res = await fetch(`${protocol}://${host}/api/scenarios/${id}`, { cache: 'no-store' });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Failed to fetch scenario ${id}: ${res.status}`);
  return res.json() as Promise<ScenarioDetail>;
}

const OPTION_LABELS = ['A', 'B', 'C', 'D'];

function OptionSection({ option, index }: { option: Option; index: number }) {
  return (
    <CommandPanel className="p-5">
      <div className="flex items-center gap-2 mb-3">
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-[10px] border border-[var(--border)] bg-[var(--accent-muted)] text-[10px] font-mono font-bold text-[var(--accent-primary)]">
          {OPTION_LABELS[index] ?? index + 1}
        </span>
        {option.label && (
          <span className="text-xs font-medium text-foreground-subtle">
            {option.label}
          </span>
        )}
      </div>

      <p className="text-sm text-foreground leading-relaxed mb-4">{option.text}</p>

      {option.effects.length > 0 && (
        <div className="mb-4">
          <div className="text-xs font-medium text-foreground-subtle mb-2">
            Effects
          </div>
          <div className="space-y-1">
            {option.effects.map((effect, i) => (
              <MetricEffect key={i} effect={effect} />
            ))}
          </div>
        </div>
      )}

      {option.relationshipEffects && option.relationshipEffects.length > 0 && (
        <div className="mb-4">
          <div className="text-xs font-medium text-foreground-subtle mb-2">
            Relationship Effects
          </div>
          <div className="flex flex-wrap gap-2">
            {option.relationshipEffects.map((re, i) => (
              <span
                key={i}
                className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-mono border rounded-[2px] ${
                  re.delta < 0
                    ? 'bg-background border-[var(--error)]/40 text-[var(--error)]'
                    : 'bg-background border-[var(--success)]/40 text-[var(--success)]'
                }`}
              >
                {re.relationshipId}
                <span className="opacity-70">{re.delta > 0 ? `+${re.delta}` : re.delta}</span>
                {re.probability != null && re.probability < 1 && (
                  <span className="opacity-50">{Math.round(re.probability * 100)}%</span>
                )}
              </span>
            ))}
          </div>
        </div>
      )}

      {option.advisorFeedback && option.advisorFeedback.length > 0 && (
        <div className="mb-4">
          <div className="text-xs font-medium text-foreground-subtle mb-2">
            Advisor Feedback
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
            {option.advisorFeedback.map((af, i) => (
              <div key={i} className="control-surface p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-foreground-subtle">
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
          <div className="text-xs font-medium text-foreground-subtle mb-1">
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
                <span className="text-xs font-medium text-foreground-subtle">
                  {scenario.phase}
                </span>
              )}
            </div>
          </div>
          <ScenarioActions id={scenario.id} isActive={scenario.is_active} isGolden={scenario.isGolden ?? false} bundle={scenario.metadata?.bundle} />
        </div>
      </CommandPanel>

      <ScenarioEditor scenario={scenario} />

      <ScenarioOps scenarioId={scenario.id} />

      <CommandPanel className="mb-4 px-5 py-4">
        <div className="flex flex-wrap gap-x-8 gap-y-3">
          <div>
            <div className="section-kicker-sm mb-0.5">Lifecycle</div>
            <div className={`data-value text-sm leading-none ${scenario.is_active ? 'text-[var(--success)]' : 'text-[var(--foreground-muted)]'}`}>
              {scenario.is_active ? 'Active' : 'Inactive'}
            </div>
            <div className="mt-0.5 text-[11px] text-[var(--foreground-muted)]">
              {scenario.updatedAt ? `Updated ${new Date(scenario.updatedAt).toLocaleString()}` : 'No update timestamp'}
            </div>
          </div>
          <div>
            <div className="section-kicker-sm mb-0.5">Scope</div>
            <div className="data-value text-sm leading-none text-foreground">
              {scenario.metadata?.scopeTier ?? 'Unspecified'}
            </div>
            <div className="mt-0.5 text-[11px] text-[var(--foreground-muted)]">
              {scenario.metadata?.scopeKey ?? 'No scope key'}
            </div>
          </div>
          <div>
            <div className="section-kicker-sm mb-0.5">Source</div>
            <div className="data-value text-sm leading-none text-foreground">
              {scenario.metadata?.sourceKind ?? scenario.metadata?.source ?? 'Unknown'}
            </div>
            <div className="mt-0.5 text-[11px] text-[var(--foreground-muted)]">
              {scenario.metadata?.source ?? 'No source label'}
            </div>
          </div>
          <div>
            <div className="section-kicker-sm mb-0.5">Created</div>
            <div className="data-value text-sm leading-none text-foreground">{new Date(scenario.createdAt).toLocaleString()}</div>
          </div>
        </div>
      </CommandPanel>

      {scenario.generationProvenance && (
        <CommandPanel className="mb-4 px-5 py-4">
          <div className="flex flex-wrap gap-x-8 gap-y-3">
            <div>
              <div className="section-kicker-sm mb-0.5">Job</div>
              <a href={`/jobs/${scenario.generationProvenance.jobId}`} className="text-sm font-mono text-[var(--accent-primary)] hover:underline">
                {scenario.generationProvenance.jobId.slice(0, 12)}
              </a>
            </div>
            <div>
              <div className="section-kicker-sm mb-0.5">Pipeline</div>
              <div className="data-value text-sm text-foreground">
                {scenario.generationProvenance.executionTarget === 'n8n' ? 'AI Server' : 'Cloud Function'}
              </div>
              <div className="mt-0.5 text-[11px] text-[var(--foreground-muted)]">multi-model</div>
            </div>
            <div>
              <div className="section-kicker-sm mb-0.5">Drafter</div>
              <div className="text-sm font-mono text-foreground">{scenario.generationProvenance.modelUsed}</div>
            </div>
            <div>
              <div className="section-kicker-sm mb-0.5">Generated</div>
              <div className="text-sm text-foreground">{new Date(scenario.generationProvenance.generatedAt).toLocaleString()}</div>
            </div>
          </div>
        </CommandPanel>
      )}

      <CommandPanel className="mb-4 p-5">
        <TokenPreview scenarioId={scenario.id} />
      </CommandPanel>

      <CommandPanel className="mb-4 p-5">
        <div className="text-xs font-medium text-foreground-subtle mb-2">
          Description
        </div>
        <p className="text-sm text-foreground leading-relaxed">{scenario.description}</p>
      </CommandPanel>

      {/* Constraints (requires, conditions, relationships, legislature) — always visible */}
      <CommandPanel className="mb-4 p-5">
          {scenario.metadata?.requires && Object.keys(scenario.metadata.requires).length > 0 && (
            <div className="mb-4 pb-4 border-b border-[var(--border)]">
              <div className="section-kicker-sm mb-2">Structural Requirements</div>
              <div className="flex flex-wrap gap-2">
                {Object.entries(scenario.metadata.requires).map(([key, val]) => (
                  <span
                    key={key}
                    className="inline-flex items-center px-2 py-1 text-xs font-mono bg-background border border-[var(--accent-primary)]/30 text-[var(--accent-primary)] rounded-[2px]"
                  >
                    {key.replace(/_/g, ' ')}
                    {typeof val === 'string' ? `: ${val}` : ''}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div>
            <div className="section-kicker-sm mb-2">Conditions</div>
            {scenario.conditions && scenario.conditions.length > 0 ? (
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
            ) : (
              <span className="text-xs font-mono text-[var(--foreground-subtle)]">None — eligible at any metric state</span>
            )}
          </div>

          {scenario.metadata?.tags !== undefined && (
            <TagEditor
              scenarioId={scenario.id}
              initialTags={scenario.metadata.tags ?? []}
              tagResolution={scenario.metadata.tagResolution}
            />
          )}
          {(!scenario.metadata?.tags || scenario.metadata.tags.length === 0) && !scenario.metadata?.tagResolution && (
            <TagEditor
              scenarioId={scenario.id}
              initialTags={[]}
            />
          )}

          {scenario.relationship_conditions && scenario.relationship_conditions.length > 0 && (
            <div className="mt-4 pt-4 border-t border-[var(--border)]">
              <div className="section-kicker-sm mb-2">Relationship Conditions</div>
              <div className="flex flex-wrap gap-2">
                {scenario.relationship_conditions.map((c, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center px-2 py-1 text-xs font-mono bg-background border border-[var(--border-strong)] text-foreground-muted rounded-[2px]"
                  >
                    {c.relationshipId}
                    {c.min !== undefined && ` ≥ ${c.min}`}
                    {c.max !== undefined && ` ≤ ${c.max}`}
                  </span>
                ))}
              </div>
            </div>
          )}

          {scenario.legislature_requirement && (
            <div className="mt-4 pt-4 border-t border-[var(--border)]">
              <div className="section-kicker-sm mb-2">Legislature Requirement</div>
              <p className="text-sm text-foreground-muted font-mono">
                Requires approval ≥ {scenario.legislature_requirement.min_approval}%
                {scenario.legislature_requirement.chamber && (
                  <span> ({scenario.legislature_requirement.chamber} chamber)</span>
                )}
              </p>
            </div>
          )}
        </CommandPanel>

      {/* Options */}
      <div className="mb-4">
        <div className="text-xs font-medium text-foreground-subtle mb-3">
          Options
        </div>
        <div className="space-y-3">
          {scenario.options.map((option, i) => (
            <OptionSection key={option.id} option={option} index={i} />
          ))}
        </div>
      </div>

      <CommandPanel className="mb-4 p-5">
        <div className="mb-3">
          <div className="section-kicker-sm mb-1">Metadata</div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-3 text-sm">
          <div className="border-b border-[var(--border)] pb-2">
            <div className="section-kicker-sm mb-0.5">Bundle</div>
            <div className="text-foreground">{scenario.metadata?.bundle ?? 'Unassigned'}</div>
          </div>
          <div className="border-b border-[var(--border)] pb-2">
            <div className="section-kicker-sm mb-0.5">Severity</div>
            <div className="text-foreground">{scenario.metadata?.severity ?? 'Unset'}</div>
          </div>
          <div className="border-b border-[var(--border)] pb-2">
            <div className="section-kicker-sm mb-0.5">Difficulty</div>
            <div className="text-foreground">{scenario.metadata?.difficulty !== undefined ? `${scenario.metadata.difficulty}/5` : 'Unset'}</div>
          </div>
          <div className="border-b border-[var(--border)] pb-2">
            <div className="section-kicker-sm mb-0.5">Countries</div>
            <div className="text-foreground">
              {scenario.metadata?.applicable_countries
                ? Array.isArray(scenario.metadata.applicable_countries)
                  ? scenario.metadata.applicable_countries.join(', ')
                  : scenario.metadata.applicable_countries
                : 'Global'}
            </div>
          </div>
          {scenario.metadata?.region_tags && scenario.metadata.region_tags.length > 0 && (
            <div className="border-b border-[var(--border)] pb-2">
              <div className="section-kicker-sm mb-0.5">Region Tags</div>
              <div className="text-foreground">{scenario.metadata.region_tags.join(', ')}</div>
            </div>
          )}
          {scenario.metadata?.auditMetadata && (
            <div className="col-span-full border-b border-[var(--border)] pb-2">
              <div className="section-kicker-sm mb-0.5">Audit</div>
              <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm font-mono text-foreground-muted">
                <span>Score: {scenario.metadata.auditMetadata.score}</span>
                <span>Audited: {scenario.metadata.auditMetadata.lastAudited}</span>
              </div>
              {scenario.metadata.auditMetadata.issues.length > 0 && (
                <ul className="mt-1 space-y-0.5">
                  {scenario.metadata.auditMetadata.issues.map((issue, i) => (
                    <li key={i} className="font-mono text-[var(--warning)] text-[10px]">{issue}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </CommandPanel>
    </div>
  );
}
