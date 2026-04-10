import Link from 'next/link';
import { notFound } from 'next/navigation';
import AuditScore from '@/components/AuditScore';
import BundleBadge from '@/components/BundleBadge';
import CommandPanel from '@/components/CommandPanel';
import SeverityBadge from '@/components/SeverityBadge';
import { METRIC_DISPLAY } from '@/lib/constants';
import { db } from '@/lib/firebase-admin';
import {
  type CountryDoc,
  normalizeCountryDoc,
  type SimScenarioDoc,
  buildSimulationTokenContext,
  resolveSimulationScenario,
} from '@/lib/simulate';
import type { ScenarioDetail } from '@/lib/types';
import ScenarioActions from './ScenarioActions';
import ScenarioEditor from './ScenarioEditor';
import ScenarioOps from './ScenarioOps';
import TagEditor from './TagEditor';
import TokenPreview from './TokenPreview';

function serializeTimestamp(ts: unknown): string | undefined {
  if (!ts) return undefined;
  if (typeof (ts as { toDate?: () => Date }).toDate === 'function') return (ts as { toDate: () => Date }).toDate().toISOString();
  if (ts instanceof Date) return ts.toISOString();
  if (typeof ts === 'number') return new Date(ts).toISOString();
  if (typeof ts === 'string') return ts;
  return undefined;
}

function toScenarioDetail(id: string, data: FirebaseFirestore.DocumentData): ScenarioDetail {
  return {
    id,
    title: data.title ?? '',
    description: data.description ?? '',
    is_active: data.is_active ?? false,
    createdAt: serializeTimestamp(data.created_at),
    updatedAt: serializeTimestamp(data.updated_at),
    phase: data.phase,
    actIndex: data.actIndex,
    options: (data.options ?? []).map((opt: FirebaseFirestore.DocumentData) => ({
      id: opt.id ?? '',
      text: opt.text ?? '',
      label: opt.label,
      effects: opt.effects ?? [],
      relationshipEffects: opt.relationshipEffects,
      advisorFeedback: opt.advisorFeedback ?? [],
      outcomeHeadline: opt.outcomeHeadline,
      outcomeSummary: opt.outcomeSummary,
      outcomeContext: opt.outcomeContext,
    })),
    metadata: data.metadata
      ? {
          ...data.metadata,
          auditMetadata: data.metadata.auditMetadata
            ? {
                ...data.metadata.auditMetadata,
                lastAudited: serializeTimestamp(data.metadata.auditMetadata.lastAudited) ?? data.metadata.auditMetadata.lastAudited,
              }
            : undefined,
        }
      : undefined,
    conditions: data.conditions,
    relationship_conditions: data.relationship_conditions,
    chain_id: data.chain_id,
    token_map: data.token_map,
    legislature_requirement: data.legislature_requirement,
    generationProvenance: data.metadata?.generationProvenance,
  };
}

async function fetchScenario(id: string): Promise<ScenarioDetail | null> {
  const [doc, trainingDoc] = await Promise.all([
    db.collection('scenarios').doc(id).get(),
    db.collection('training_scenarios').doc(id).get(),
  ]);
  if (!doc.exists) return null;
  const detail = toScenarioDetail(doc.id, doc.data()!);
  return { ...detail, isGolden: trainingDoc.exists && trainingDoc.data()?.isGolden === true };
}

async function fetchResolvedDescription(
  scenarioId: string,
  countryId: string,
): Promise<{ title: string; description: string } | null> {
  try {
    const [scenarioDoc, countryDoc, countriesSnap] = await Promise.all([
      db.collection('scenarios').doc(scenarioId).get(),
      db.collection('countries').doc(countryId).get(),
      db.collection('countries').get(),
    ]);
    if (!scenarioDoc.exists) return null;
    if (!countryDoc.exists) {
      const data = scenarioDoc.data()!;
      return { title: data.title ?? '', description: data.description ?? '' };
    }
    const scenario = { id: scenarioDoc.id, ...scenarioDoc.data() } as SimScenarioDoc;
    const country = normalizeCountryDoc({ id: countryDoc.id, ...countryDoc.data() } as CountryDoc);
    const countriesById = Object.fromEntries(
      countriesSnap.docs.map((doc) => [doc.id, normalizeCountryDoc({ id: doc.id, ...doc.data() } as CountryDoc)])
    );
    const context = buildSimulationTokenContext(country, countriesById);
    if (scenario.token_map) {
      for (const [k, v] of Object.entries(scenario.token_map)) {
        if (!context[k]) context[k] = v;
      }
    }
    const resolved = resolveSimulationScenario(scenario, country, {}, context);
    return { title: resolved.title, description: resolved.description };
  } catch {
    return null;
  }
}

function formatDateTime(value?: string): string {
  return value ? new Date(value).toLocaleString() : '—';
}

function formatCount(count: number, singular: string): string {
  return count === 1 ? `1 ${singular}` : `${count} ${singular}s`;
}



function InfoRow({
  label,
  value,
  valueClassName = 'text-foreground',
}: {
  label: string;
  value: React.ReactNode;
  valueClassName?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3 text-xs">
      <span className="label-micro shrink-0">{label}</span>
      <span className={`text-right ${valueClassName}`}>{value}</span>
    </div>
  );
}

function SectionHeader({
  kicker,
  title,
  detail,
}: {
  kicker: string;
  title: string;
  detail?: string;
}) {
  return (
    <div className="mb-3 flex items-start justify-between gap-3">
      <div>
        <div className="section-kicker-sm mb-1.5">{kicker}</div>
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
      </div>
      {detail ? <div className="text-[11px] font-mono text-foreground-subtle">{detail}</div> : null}
    </div>
  );
}

function JumpLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      className="inline-flex items-center rounded-full border border-[var(--border)] bg-[var(--background-muted)] px-2.5 py-1 text-[10px] font-mono text-foreground-subtle transition-colors hover:border-[var(--accent-primary)]/35 hover:text-foreground"
    >
      {label}
    </a>
  );
}

function SummaryCard({
  label,
  value,
  detail,
  href,
  tone,
}: {
  label: string;
  value: React.ReactNode;
  detail: React.ReactNode;
  href?: string;
  tone?: 'default' | 'warn' | 'ok';
}) {
  const toneClass =
    tone === 'warn'
      ? 'border-[var(--warning)]/25 bg-[var(--warning)]/5'
      : tone === 'ok'
      ? 'border-[var(--success)]/20 bg-[var(--success)]/4'
      : '';

  const content = (
    <div className={`control-surface p-3 transition-all hover:-translate-y-px hover:border-[var(--border-strong)] ${toneClass}`}>
      <div className="label-micro">{label}</div>
      <div className="mt-1.5 text-lg font-semibold tabular-nums text-foreground">{value}</div>
      <div className="mt-0.5 text-[11px] text-foreground-muted">{detail}</div>
    </div>
  );

  return href ? <a href={href}>{content}</a> : content;
}



export default async function ScenarioDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { countryId?: string };
}) {
  const [scenario, resolved] = await Promise.all([
    fetchScenario(params.id),
    searchParams.countryId
      ? fetchResolvedDescription(params.id, searchParams.countryId)
      : Promise.resolve(null),
  ]);

  if (!scenario) {
    notFound();
  }

  const displayTitle = resolved?.title ?? scenario.title;
  const displayDescription = resolved?.description ?? scenario.description;

  const applicableCountries = scenario.metadata?.applicable_countries
    ? Array.isArray(scenario.metadata.applicable_countries)
      ? scenario.metadata.applicable_countries.join(', ')
      : scenario.metadata.applicable_countries
    : null;

  const auditScore = scenario.metadata?.auditMetadata?.score;
  const auditIssueCount = scenario.metadata?.auditMetadata?.issues.length ?? 0;
  const metricConditionCount = scenario.conditions?.length ?? 0;
  const relationshipConditionCount = scenario.relationship_conditions?.length ?? 0;
  const totalEligibilityGates = metricConditionCount + relationshipConditionCount + (scenario.legislature_requirement ? 1 : 0);
  const tagCount = scenario.metadata?.tags?.length ?? 0;

  return (
    <div className="mx-auto max-w-[1280px] space-y-4 pb-8">
      <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-foreground-subtle">
        <Link href="/scenarios" className="transition-colors hover:text-foreground">
          Scenarios
        </Link>
        {scenario.metadata?.bundle ? (
          <>
            <span>/</span>
            <Link
              href={`/scenarios?bundle=${scenario.metadata.bundle}`}
              className="transition-colors hover:text-foreground"
            >
              {scenario.metadata.bundle}
            </Link>
          </>
        ) : null}
        <span>/</span>
        <span className="truncate text-foreground-muted">{scenario.id}</span>
      </div>

      <CommandPanel className="p-5 md:p-6" leftAccent>
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="section-kicker">Scenario Record</span>
              <span className="rounded-full border border-[var(--border)] px-2 py-1 text-[10px] font-mono text-foreground-subtle">
                {scenario.id}
              </span>
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-[2rem]">
              {displayTitle}
            </h1>
            {displayDescription ? (
              <p className="mt-2 max-w-4xl text-sm leading-7 text-foreground-muted">
                {displayDescription}
              </p>
            ) : null}
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {scenario.metadata?.bundle ? <BundleBadge bundle={scenario.metadata.bundle} /> : null}
              <SeverityBadge severity={scenario.metadata?.severity ?? null} />
              {auditScore !== undefined ? <AuditScore score={auditScore} /> : null}
              <span className={`rounded-full border px-2.5 py-1 text-[10px] font-mono ${scenario.is_active ? 'border-[var(--success)]/35 bg-[var(--success)]/10 text-[var(--success)]' : 'border-[var(--border)] bg-[var(--background-muted)] text-foreground-subtle'}`}>
                {scenario.is_active ? 'Active' : 'Inactive'}
              </span>
              {scenario.isGolden ? (
                <span className="rounded-full border border-[var(--accent-secondary)]/35 bg-[var(--accent-secondary)]/10 px-2.5 py-1 text-[10px] font-mono text-[var(--accent-secondary)]">
                  Golden Example
                </span>
              ) : null}
              {scenario.gaiaReviewedAt ? (
                <span title={`Reviewed by Gaia on ${new Date(scenario.gaiaReviewedAt).toLocaleDateString()}`} className="rounded-full border border-[var(--foreground-subtle)]/35 bg-[var(--surface-fill)] px-2.5 py-1 text-[10px] font-mono text-[var(--foreground-muted)]">
                  Gaia
                </span>
              ) : null}
            </div>
          </div>

          <div className="shrink-0">
            <ScenarioActions
              id={scenario.id}
              isActive={scenario.is_active}
              isGolden={scenario.isGolden ?? false}
              bundle={scenario.metadata?.bundle}
            />
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2 border-t border-[var(--border)] pt-4">
          <JumpLink href="#decision-paths" label="Decision Paths" />
          <JumpLink href="#eligibility" label="Eligibility" />
          <JumpLink href="#audit-findings" label="Audit" />
          <JumpLink href="#provenance" label="Provenance" />
          <JumpLink href="#editor" label="Edit" />
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard label="Decision Paths" value={scenario.options.length} detail={formatCount(scenario.options.length, 'option')} href="#decision-paths" />
          <SummaryCard
            label="Eligibility Gates"
            value={totalEligibilityGates}
            detail={`${metricConditionCount} metric · ${relationshipConditionCount} relationship`}
            href="#eligibility"
          />
          <SummaryCard
            label="Audit State"
            value={auditScore ?? '—'}
            detail={auditIssueCount > 0 ? `${auditIssueCount} flagged issue${auditIssueCount !== 1 ? 's' : ''}` : 'No open audit flags'}
            href="#audit-findings"
            tone={auditIssueCount > 0 ? 'warn' : auditScore !== undefined ? 'ok' : 'default'}
          />
          <SummaryCard
            label="Taxonomy"
            value={tagCount}
            detail={scenario.metadata?.tagResolution?.status ?? 'unresolved'}
            href="#scenario-tags"
          />
        </div>
      </CommandPanel>

      {auditIssueCount > 0 ? (
        <CommandPanel tone="danger" className="px-4 py-3">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-xs font-medium text-[var(--error)]">Audit warnings need follow-through</div>
              <p className="mt-1 text-xs leading-6 text-foreground-muted">
                This scenario has {auditIssueCount} stored audit issue{auditIssueCount !== 1 ? 's' : ''}. Jump directly to the flagged findings or run maintenance operations.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <JumpLink href="#audit-findings" label="View audit issues" />
              <JumpLink href="#ops" label="Open operations" />
            </div>
          </div>
        </CommandPanel>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0 space-y-4">
          <div id="decision-paths" className="scroll-mt-24">
            <TokenPreview
              scenarioId={scenario.id}
              options={scenario.options}
            />
          </div>

          <CommandPanel
            id="audit-findings"
            tone={auditIssueCount > 0 ? 'danger' : undefined}
            className="scroll-mt-24 p-4"
          >
            <SectionHeader
              kicker="Quality"
              title="Audit Findings"
              detail={scenario.metadata?.auditMetadata ? `Score ${scenario.metadata.auditMetadata.score}` : undefined}
            />
            {scenario.metadata?.auditMetadata ? (
              <div className="space-y-3">
                <div className="flex items-center gap-4 text-xs">
                  <div>
                    <span className="text-foreground-subtle">Last audited</span>
                    <span className="ml-2 font-mono text-foreground-muted">{scenario.metadata.auditMetadata.lastAudited}</span>
                  </div>
                  {scenario.metadata.auditMetadata.autoFixed ? (
                    <span className="rounded-full border border-[var(--success)]/30 bg-[var(--success)]/8 px-2 py-0.5 text-[10px] font-mono text-[var(--success)]">auto-fixed</span>
                  ) : null}
                </div>
                {auditIssueCount > 0 ? (
                  <div className="space-y-1.5">
                    {scenario.metadata.auditMetadata.issues.map((issue, index) => (
                      <div key={index} className="border-l-2 border-l-[var(--warning)] pl-3 py-1">
                        <div className="font-mono text-[11px] leading-5 text-[var(--warning)]">{issue}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-[11px] font-mono text-[var(--success)]">No open audit flags</div>
                )}
              </div>
            ) : (
              <div className="text-[11px] font-mono text-foreground-subtle">No audit data recorded</div>
            )}
          </CommandPanel>

          <div id="ops" className="scroll-mt-24">
            <ScenarioOps scenarioId={scenario.id} />
          </div>

          <div id="editor" className="scroll-mt-24">
            <ScenarioEditor scenario={scenario} />
          </div>
        </div>

        <div className="space-y-3">
          <CommandPanel className="p-4">
            <SectionHeader kicker="Overview" title="Context" />
            <div className="space-y-2.5">
              <InfoRow
                label="Status"
                value={scenario.is_active ? 'Active' : 'Inactive'}
                valueClassName={scenario.is_active ? 'font-medium text-[var(--success)]' : 'text-foreground-muted'}
              />
              {scenario.isGolden ? (
                <InfoRow label="Golden" value="Yes" valueClassName="font-medium text-[var(--accent-secondary)]" />
              ) : null}
              {scenario.phase ? <InfoRow label="Phase" value={<span className="font-mono">{scenario.phase}</span>} /> : null}
              <InfoRow label="Scope" value={<span className="font-mono">{scenario.metadata?.scopeTier ?? 'universal'}</span>} />
              <InfoRow label="Source" value={<span className="font-mono">{scenario.metadata?.sourceKind ?? 'evergreen'}</span>} />
              {scenario.metadata?.difficulty !== undefined ? (
                <InfoRow label="Difficulty" value={<span className="font-mono">{scenario.metadata.difficulty}/5</span>} />
              ) : null}
              {applicableCountries ? (
                <InfoRow label="Countries" value={<span className="font-mono break-words">{applicableCountries}</span>} />
              ) : null}
              {scenario.metadata?.region_tags?.length ? (
                <InfoRow label="Regions" value={scenario.metadata.region_tags.join(', ')} />
              ) : null}
            </div>
          </CommandPanel>

          <CommandPanel id="eligibility" className="scroll-mt-24 p-4">
            <SectionHeader
              kicker="Eligibility"
              title="Activation Rules"
              detail={totalEligibilityGates ? `${totalEligibilityGates} gate${totalEligibilityGates !== 1 ? 's' : ''}` : 'Open'}
            />
            <div className="space-y-3">
              <div>
                <div className="mb-1.5 text-[10px] font-medium uppercase tracking-[0.16em] text-foreground-subtle">Requirements</div>
                {scenario.metadata?.requires && Object.keys(scenario.metadata.requires).length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(scenario.metadata.requires).map(([key, value]) => (
                      <span
                        key={key}
                        className="inline-flex items-center rounded-full border border-[var(--accent-primary)]/30 bg-[var(--accent-primary)]/8 px-2.5 py-1 text-[10px] font-mono text-[var(--accent-primary)]"
                      >
                        {key.replace(/_/g, ' ')}
                        {typeof value === 'string' ? `: ${value}` : ''}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="text-[11px] font-mono text-foreground-subtle">None</div>
                )}
              </div>

              <div>
                <div className="mb-1.5 text-[10px] font-medium uppercase tracking-[0.16em] text-foreground-subtle">Metric Conditions</div>
                {metricConditionCount > 0 ? (
                  <div className="space-y-1">
                    {scenario.conditions?.map((condition, index) => (
                      <div key={index} className="flex items-center justify-between py-1 text-[10px] font-mono border-b border-[var(--border)] last:border-0">
                        <span className="text-foreground-muted">{METRIC_DISPLAY[condition.metricId] ?? condition.metricId}</span>
                        <span className="text-foreground-subtle">
                          {condition.min !== undefined ? `≥ ${condition.min}` : ''}
                          {condition.min !== undefined && condition.max !== undefined ? ' ' : ''}
                          {condition.max !== undefined ? `≤ ${condition.max}` : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-[11px] font-mono text-foreground-subtle">Any state</div>
                )}
              </div>

              {relationshipConditionCount > 0 ? (
                <div>
                  <div className="mb-1.5 text-[10px] font-medium uppercase tracking-[0.16em] text-foreground-subtle">Relationships</div>
                  <div className="flex flex-wrap gap-1.5">
                    {scenario.relationship_conditions?.map((condition, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center rounded-full border border-[var(--border-strong)] px-2.5 py-1 text-[10px] font-mono text-foreground-muted"
                      >
                        {condition.relationshipId}
                        {condition.min !== undefined ? ` ≥ ${condition.min}` : ''}
                        {condition.max !== undefined ? ` ≤ ${condition.max}` : ''}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}

              {scenario.legislature_requirement ? (
                <div>
                  <div className="mb-1.5 text-[10px] font-medium uppercase tracking-[0.16em] text-foreground-subtle">Legislature</div>
                  <div className="text-[11px] font-mono text-foreground-muted">
                    approval ≥ {scenario.legislature_requirement.min_approval}%
                    {scenario.legislature_requirement.chamber ? ` (${scenario.legislature_requirement.chamber})` : ''}
                  </div>
                </div>
              ) : null}
            </div>
          </CommandPanel>

          <CommandPanel id="scenario-tags" className="scroll-mt-24 p-4">
            <SectionHeader kicker="Taxonomy" title="Tags" detail={`${tagCount}/6`} />
            {scenario.metadata?.tags !== undefined ? (
              <TagEditor
                scenarioId={scenario.id}
                initialTags={scenario.metadata.tags ?? []}
                tagResolution={scenario.metadata.tagResolution}
              />
            ) : (
              <TagEditor scenarioId={scenario.id} initialTags={[]} />
            )}
          </CommandPanel>

          <CommandPanel id="provenance" className="scroll-mt-24 p-4">
            <SectionHeader kicker="Traceability" title="Provenance" />
            <div className="space-y-2.5">
              <InfoRow label="Created" value={formatDateTime(scenario.createdAt)} />
              {scenario.updatedAt ? <InfoRow label="Updated" value={formatDateTime(scenario.updatedAt)} /> : null}
              {scenario.generationProvenance ? (
                <>
                  <InfoRow
                    label="Job"
                    value={
                      <a
                        href={`/jobs/${scenario.generationProvenance.jobId}`}
                        className="font-mono text-[var(--accent-primary)] hover:underline"
                      >
                        {scenario.generationProvenance.jobId}
                      </a>
                    }
                  />
                  <InfoRow
                    label="Pipeline"
                    value={scenario.generationProvenance.executionTarget === 'n8n' ? 'AI Server' : 'Cloud Function'}
                  />
                  <InfoRow
                    label="Drafter"
                    value={<span className="break-words font-mono text-[10px]">{scenario.generationProvenance.modelUsed}</span>}
                  />
                </>
              ) : null}
            </div>
          </CommandPanel>
        </div>
      </div>
    </div>
  );
}
