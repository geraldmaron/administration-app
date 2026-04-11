/**
 * Gaia — Self-improving quality agent for scenario generation.
 *
 * Runs weekly at 03:00 UTC Monday (or on-demand via HTTP callable).
 * Pipeline:
 *   1. Sample 5 existing + generate 5 new scenarios
 *   2. Run audit + repair on each
 *   3. Resolve tokens against 5 relevant countries per scenario
 *   4. Evaluate context/verbiage quality via LLM
 *   5. Aggregate findings → produce per-stage prompt recommendations
 *   6. Persist run + recommendations to `gaia_runs/{runId}`
 *   7. Stamp each processed scenario with `gaiaReviewedAt` + `gaiaRunId`
 */

import * as admin from 'firebase-admin';
import * as logger from 'firebase-functions/logger';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { Timestamp } from 'firebase-admin/firestore';
import { randomUUID } from 'crypto';
import { readFileSync } from 'fs';
import { join } from 'path';
import { auditScenario, deterministicFix, scoreScenario, initializeAuditConfig, type BundleScenario } from './lib/audit-rules';
import { agenticRepair } from './lib/agentic-repair';
import { loadCompiledTokenRegistry } from './lib/token-registry';
import { callModelProvider, type ModelConfig } from './lib/model-providers';
import { getDefaultGaiaModel } from './lib/generation-models';
import { createGenerationJob } from './background-jobs';
import type { GenerationModelConfig } from './shared/generation-contract';
import type { CompiledTokenRegistry } from './shared/token-registry-contract';
import { derivePlayerPartyTokens, type RawCountryRecord } from './lib/country-token-derivation';
import { getPromptTemplate } from './lib/prompt-templates';

// ---------------------------------------------------------------------------
// Shared types — exported for use in web API routes and tests
// ---------------------------------------------------------------------------

export type PipelineStage = 'architect' | 'drafter' | 'tokenResolve' | 'audit' | 'repair';

export interface StageResult {
  passed: boolean;
  issueCount: number;
  issues: string[];
}

export interface TokenStageResult {
  passed: boolean;
  unresolvedCount: number;
  fallbackCount: number;
}

export interface AuditStageResult {
  score: number;
  issueCount: number;
  issueTypes: string[];
}

export interface RepairStageResult {
  attempted: boolean;
  repairCount: number;
  failedRepairs: string[];
}

export interface PipelineStageMetric {
  scenarioId: string;
  jobId: string;
  bundle: string;
  createdAt: Timestamp;
  stages: {
    architect: StageResult;
    drafter: StageResult;
    tokenResolve: TokenStageResult;
    audit: AuditStageResult;
    repair: RepairStageResult;
  };
  overallPassed: boolean;
}

export interface EvidenceMetrics {
  stageAccuracy: number;
  sampleSize: number;
  topIssues: string[];
}

export interface RecommendationItem {
  id: string;
  pipelineStage: 'architect' | 'drafter' | 'repair';
  targetSection: string;
  reason: string;
  currentExcerpt: string;
  suggestedChange: string;
  evidenceMetrics: EvidenceMetrics;
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy?: string;
  reviewedAt?: Timestamp;
  reviewNote?: string;
  promptPatchApplied?: boolean;
}

export interface GaiaRunPromptRecommendations {
  architect: RecommendationItem[];
  drafter: RecommendationItem[];
  repair: RecommendationItem[];
  summary: string;
}

export interface ScenarioResult {
  id: string;
  type: 'sampled' | 'generated';
  title: string;
  descriptionSnippet: string;
  auditScore: number;
  issueCount: number;
  issueTypes: string[];
  unresolvedTokens: number;
  verbiageFlagged: boolean;
  repaired: boolean;
}

export interface LogEntry {
  ts: number;
  msg: string;
  level: 'info' | 'warn' | 'error';
}

export interface GaiaProgress {
  phase: string;
  phaseLabel: string;
  step: number;
  totalSteps: number;
  detail: string;
  scenariosAudited: number;
  scenariosTotal: number;
  issuesFound: number;
  topIssuesSoFar: string[];
  unresolvedTokensSoFar: number;
  verbiageFindingsSoFar: string[];
  scenarioResults: ScenarioResult[];
  log: LogEntry[];
  updatedAt: Timestamp;
}

export interface GaiaRun {
  runId: string;
  triggeredAt: Timestamp;
  triggeredBy: 'schedule' | 'manual';
  triggeredByUid?: string;
  sampledScenarioIds: string[];
  generatedScenarioIds: string[];
  auditSummary: {
    totalIssues: number;
    byType: Record<string, number>;
  };
  tokenResolutionSummary: {
    unresolvedCount: number;
    fallbackCount: number;
    countriesTested: number;
  };
  verbiageFindings: string[];
  promptRecommendations: GaiaRunPromptRecommendations;
  scenarioResults: ScenarioResult[];
  promotedExemplarCount?: number;
  status: 'queued' | 'running' | 'complete' | 'failed' | 'cancelled';
  progress?: GaiaProgress;
  error?: string;
  modelConfig?: GenerationModelConfig;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const GAIA_SAMPLE_COUNT = 5;
const GAIA_GENERATE_COUNT = 5;
const GAIA_COUNTRIES_PER_SCENARIO = 5;
const GAIA_JOB_POLL_INTERVAL_MS = 10_000;
const GAIA_JOB_MAX_WAIT_MS = 5 * 60 * 1000;
const EVAL_MODEL_CONFIG: ModelConfig = { maxTokens: 1024, temperature: 0.2 };
const RECO_MODEL_CONFIG: ModelConfig = { maxTokens: 4096, temperature: 0.3 };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function readPromptFile(name: string): string {
  try {
    return readFileSync(join(__dirname, 'prompts', name), 'utf-8');
  } catch {
    console.warn(`[gaia] Prompt file not found: ${name} — ensure Firestore template is populated`);
    return '';
  }
}

async function sampleActiveScenarios(
  db: admin.firestore.Firestore,
  count: number,
): Promise<BundleScenario[]> {
  const snap = await db.collection('scenarios')
    .where('is_active', '==', true)
    .orderBy('created_at', 'desc')
    .limit(200)
    .get();

  const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() } as BundleScenario));
  const complete = docs.filter((s) => {
    const opts: Array<{ text?: string }> = ((s as unknown) as Record<string, unknown>).options as Array<{ text?: string }> ?? [];
    return opts.every((o) => {
      const t = o.text ?? '';
      return t.length >= 40 && /[.!?'"]$/.test(t.trimEnd());
    });
  });
  const pool = complete.length >= count ? complete : docs;
  const shuffled = pool.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

async function sampleCountries(
  db: admin.firestore.Firestore,
  hint: string[],
  count: number,
): Promise<{ id: string; tokens?: Record<string, string>; facts?: Record<string, unknown> }[]> {
  const result: { id: string; tokens?: Record<string, string>; facts?: Record<string, unknown> }[] = [];

  // Always prefer hint countries (applicable_countries) first
  if (hint.length > 0) {
    const hintDocs = await Promise.all(
      hint.slice(0, count).map((id) => db.collection('countries').doc(id).get()),
    );
    result.push(...hintDocs.filter((d) => d.exists).map((d) => ({ id: d.id, ...d.data() })));
  }

  if (result.length < count) {
    // Fill remaining slots with random countries not already included
    const snap = await db.collection('countries').limit(100).get();
    const hintSet = new Set(hint);
    const pool = snap.docs
      .filter((d) => !hintSet.has(d.id))
      .map((d) => ({ id: d.id, ...d.data() }));
    const shuffled = pool.sort(() => Math.random() - 0.5);
    result.push(...shuffled.slice(0, count - result.length));
  }

  // Load parties subcollection and merge derived party tokens so opposition_party resolves correctly
  await Promise.all(
    result.map(async (country) => {
      const partiesSnap = await db.collection('countries').doc(country.id).collection('parties').get();
      if (!partiesSnap.empty) {
        const parties = partiesSnap.docs.map((p) => p.data()) as RawCountryRecord['parties'];
        const partyTokens = derivePlayerPartyTokens({ parties } as RawCountryRecord, undefined);
        country.tokens = { ...(country.tokens ?? {}), ...Object.fromEntries(
          Object.entries(partyTokens).filter(([, v]) => v != null).map(([k, v]) => [k, v as string]),
        )};
      }
    }),
  );

  return result.slice(0, count);
}

async function pollJobCompletion(
  db: admin.firestore.Firestore,
  jobId: string,
): Promise<string[]> {
  const deadline = Date.now() + GAIA_JOB_MAX_WAIT_MS;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, GAIA_JOB_POLL_INTERVAL_MS));
    const snap = await db.collection('generation_jobs').doc(jobId).get();
    const data = snap.data();
    if (!data) break;
    if (data.status === 'completed' || data.status === 'failed') {
      return (data.results ?? []).map((r: { id: string }) => r.id);
    }
  }
  return [];
}

function resolveTokensInText(
  text: string,
  tokens: Record<string, string>,
): { resolved: string; unresolved: string[]; fallbacks: string[] } {
  const unresolved: string[] = [];
  const fallbacks: string[] = [];
  const PLACEHOLDER = /\{\{?([a-zA-Z_]+)\}?\}/g;
  const resolved = text.replace(PLACEHOLDER, (_, key: string) => {
    if (tokens[key]) return tokens[key];
    unresolved.push(key);
    return `{{${key}}}`;
  });
  return { resolved, unresolved, fallbacks };
}

interface TokenResolutionSummary {
  unresolvedCount: number;
  fallbackCount: number;
  findings: string[];
}

function resolveScenarioTokens(
  scenario: BundleScenario,
  countries: { id: string; tokens?: Record<string, string> }[],
  registryTokenSet: Set<string>,
): TokenResolutionSummary {
  let totalUnresolved = 0;
  const totalFallback = 0;
  const findings: string[] = [];

  const fieldsToCheck = [
    scenario.title,
    scenario.description,
    ...(scenario.options ?? []).map((o) => o.text),
  ].filter(Boolean) as string[];

  for (const country of countries) {
    const countryTokens = country.tokens ?? {};

    for (const field of fieldsToCheck) {
      const { unresolved } = resolveTokensInText(field, countryTokens);
      for (const key of unresolved) {
        if (!registryTokenSet.has(key)) {
          // Token is not in the registry at all — genuine hallucination
          totalUnresolved++;
          findings.push(
            `Scenario ${scenario.id} | hallucinated token {${key}} (not in registry)`,
          );
        }
        // If the token IS in the registry but missing from this country, it is a
        // country-data gap — not a scenario defect. Skip silently.
      }
    }
  }

  return { unresolvedCount: totalUnresolved, fallbackCount: totalFallback, findings };
}

async function evaluateVerbiage(
  scenario: BundleScenario,
  validTokens: readonly string[],
  modelConfig?: GenerationModelConfig,
): Promise<string[]> {
  const validTokenList = validTokens.map((t) => `{${t}}`).join(', ');
  const optionSample = (scenario.options ?? [])
    .slice(0, 3)
    .map((o, i) => `Option ${i + 1}: ${o.text ?? ''}`)
    .join('\n');

  const prompt = `You are a quality evaluator for a geopolitical simulation game.

VALID TOKENS — intentional render-time placeholders that MUST NOT be flagged:
${validTokenList}

Evaluate the scenario below. Flag ONLY:
- {placeholder} patterns that are NOT in the valid token list above (genuine hallucinations)
- Awkward, unnatural, or repetitive phrasing
- Hardcoded real country or leader names (should use tokens or generic references)
- Unnatural second-person shifts
- Generation artifacts (e.g. incomplete sentences, template bleed-through)

Scenario title: ${scenario.title}
Description: ${scenario.description ?? ''}
${optionSample ? `\n${optionSample}` : ''}

Return a JSON array of short issue strings. If no issues, return [].`;

  const schema = {
    type: 'object',
    properties: { issues: { type: 'array', items: { type: 'string' } } },
    required: ['issues'],
  };
  try {
    const modelOverride = modelConfig?.repairModel ?? getDefaultGaiaModel();
    const resp = await callModelProvider<{ issues: string[] }>(
      EVAL_MODEL_CONFIG,
      prompt,
      schema,
      modelOverride,
    );
    return resp.data?.issues ?? [];
  } catch {
    return [];
  }
}

async function aggregateStageMetrics(
  db: admin.firestore.Firestore,
  weeksBack = 8,
): Promise<Record<PipelineStage, { passRate: number; sampleSize: number; topIssues: string[]; ruleFrequencies: Array<{ ruleId: string; frequency: number }> }>> {
  const since = Timestamp.fromDate(new Date(Date.now() - weeksBack * 7 * 24 * 3600 * 1000));
  const snap = await db.collection('pipeline_stage_metrics')
    .where('createdAt', '>=', since)
    .limit(500)
    .get();

  const stages: PipelineStage[] = ['architect', 'drafter', 'tokenResolve', 'audit', 'repair'];
  const counts: Record<string, { passed: number; total: number; issueFreq: Record<string, number> }> = {};

  for (const stage of stages) {
    counts[stage] = { passed: 0, total: 0, issueFreq: {} };
  }

  for (const doc of snap.docs) {
    const data = doc.data() as PipelineStageMetric;
    for (const stage of stages) {
      const stageData = data.stages[stage];
      if (!stageData) continue;
      counts[stage].total++;
      if ('passed' in stageData && stageData.passed) counts[stage].passed++;
      const issueList = 'issues' in stageData ? stageData.issues : [];
      for (const issue of issueList) {
        counts[stage].issueFreq[issue] = (counts[stage].issueFreq[issue] ?? 0) + 1;
      }
    }
  }

  const result = {} as Record<PipelineStage, { passRate: number; sampleSize: number; topIssues: string[]; ruleFrequencies: Array<{ ruleId: string; frequency: number }> }>;
  for (const stage of stages) {
    const { passed, total, issueFreq } = counts[stage];
    const sortedFreqs = Object.entries(issueFreq).sort((a, b) => b[1] - a[1]);
    const topIssues = sortedFreqs.slice(0, 3).map(([k]) => k);
    const ruleFrequencies = sortedFreqs.map(([ruleId, frequency]) => ({ ruleId, frequency }));
    result[stage] = { passRate: total > 0 ? passed / total : 1, sampleSize: total, topIssues, ruleFrequencies };
  }
  return result;
}

async function generatePromptRecommendations(
  verbiageFindings: string[],
  tokenFindings: string[],
  stageMetrics: Record<PipelineStage, { passRate: number; sampleSize: number; topIssues: string[]; ruleFrequencies: Array<{ ruleId: string; frequency: number }> }>,
  modelConfig?: GenerationModelConfig,
): Promise<GaiaRunPromptRecommendations> {
  const [architectTemplate, drafterTemplate] = await Promise.all([
    getPromptTemplate('architect_drafter'),
    getPromptTemplate('drafter_details'),
  ]);
  const architectPrompt = architectTemplate?.sections.constraints ?? readPromptFile('architect.prompt.md');
  const drafterPrompt = drafterTemplate?.sections.constraints ?? readPromptFile('drafter.prompt.md');

  const metricSummary = Object.entries(stageMetrics)
    .map(([stage, m]) => {
      const freqDetail = m.ruleFrequencies.slice(0, 8)
        .map(({ ruleId, frequency }) => `${ruleId}(×${frequency})`)
        .join(', ');
      return `${stage}: ${(m.passRate * 100).toFixed(0)}% pass rate (n=${m.sampleSize})\n  Rule failures: ${freqDetail || 'none'}`;
    })
    .join('\n');

  const findingsSummary = [
    ...verbiageFindings.slice(0, 20),
    ...tokenFindings.slice(0, 20),
  ].join('\n');

  const systemPrompt = `You are a prompt engineer for a geopolitical simulation game.
You have observed quality issues across recent generated scenarios.
Your task: recommend targeted improvements to the generation prompts.

Stage accuracy (last 8 weeks):
${metricSummary}

Observed findings:
${findingsSummary || 'None'}

For each recommendation, output JSON with this shape:
{
  "pipelineStage": "architect" | "drafter" | "repair",
  "targetSection": "section name or rule category",
  "reason": "why this change is needed — cite specific findings or metric",
  "currentExcerpt": "the most relevant existing text from the current prompt (up to 200 chars)",
  "suggestedChange": "the recommended replacement or addition"
}

Return a JSON object: { "recommendations": [...], "summary": "one sentence overview" }
Focus on high-impact, evidence-backed changes only. Max 6 recommendations.`;

  const contextSnippet = `ARCHITECT PROMPT (excerpt):\n${architectPrompt.slice(0, 1500)}\n\nDRAFTER PROMPT (excerpt):\n${drafterPrompt.slice(0, 1500)}`;

  const recoSchema = {
    type: 'object',
    properties: {
      recommendations: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            pipelineStage: { type: 'string', enum: ['architect', 'drafter', 'repair'] },
            targetSection: { type: 'string' },
            reason: { type: 'string' },
            currentExcerpt: { type: 'string' },
            suggestedChange: { type: 'string' },
          },
          required: ['pipelineStage', 'targetSection', 'reason', 'currentExcerpt', 'suggestedChange'],
        },
      },
      summary: { type: 'string' },
    },
    required: ['recommendations', 'summary'],
  };

  type RecoRaw = {
    recommendations: Array<{
      pipelineStage: 'architect' | 'drafter' | 'repair';
      targetSection: string;
      reason: string;
      currentExcerpt: string;
      suggestedChange: string;
    }>;
    summary: string;
  };

  try {
    const modelOverride = modelConfig?.repairModel ?? getDefaultGaiaModel();
    const resp = await callModelProvider<RecoRaw>(
      RECO_MODEL_CONFIG,
      `${systemPrompt}\n\n${contextSnippet}`,
      recoSchema,
      modelOverride,
    );

    const parsed = resp.data;

    const architect: RecommendationItem[] = [];
    const drafter: RecommendationItem[] = [];
    const repair: RecommendationItem[] = [];

    for (const rec of parsed?.recommendations ?? []) {
      const stage = rec.pipelineStage;
      const stageMetric = stageMetrics[stage === 'repair' ? 'repair' : stage] ?? { passRate: 1, sampleSize: 0, topIssues: [], ruleFrequencies: [] };
      const item: RecommendationItem = {
        id: randomUUID(),
        pipelineStage: stage,
        targetSection: rec.targetSection ?? '',
        reason: rec.reason ?? '',
        currentExcerpt: rec.currentExcerpt ?? '',
        suggestedChange: rec.suggestedChange ?? '',
        evidenceMetrics: {
          stageAccuracy: stageMetric.passRate,
          sampleSize: stageMetric.sampleSize,
          topIssues: stageMetric.topIssues,
        },
        status: 'pending',
      };
      if (stage === 'architect') architect.push(item);
      else if (stage === 'drafter') drafter.push(item);
      else repair.push(item);
    }

    return { architect, drafter, repair, summary: parsed?.summary ?? '' };
  } catch (err) {
    logger.error('[Gaia] Failed to generate prompt recommendations:', err);
    return { architect: [], drafter: [], repair: [], summary: 'Recommendation generation failed.' };
  }
}

// ---------------------------------------------------------------------------
// Core pipeline
// ---------------------------------------------------------------------------

async function runGaia(
  db: admin.firestore.Firestore,
  triggeredBy: 'schedule' | 'manual',
  triggeredByUid?: string,
  modelConfig?: GenerationModelConfig,
  existingRunId?: string,
): Promise<string> {
  const runId = existingRunId ?? randomUUID();
  const runRef = db.collection('gaia_runs').doc(runId);

  const runRecord: GaiaRun = {
    runId,
    triggeredAt: Timestamp.now(),
    triggeredBy,
    ...(triggeredByUid !== undefined ? { triggeredByUid } : {}),
    sampledScenarioIds: [],
    generatedScenarioIds: [],
    auditSummary: { totalIssues: 0, byType: {} },
    tokenResolutionSummary: { unresolvedCount: 0, fallbackCount: 0, countriesTested: 0 },
    verbiageFindings: [],
    promptRecommendations: { architect: [], drafter: [], repair: [], summary: '' },
    scenarioResults: [],
    status: 'running',
    ...(modelConfig !== undefined ? { modelConfig } : {}),
  };
  await runRef.set(runRecord);

  const TOTAL_STEPS = 7;
  const topIssues = (byType: Record<string, number>) =>
    Object.entries(byType).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k]) => k);

  const runLog: LogEntry[] = [];
  function addLog(level: LogEntry['level'], msg: string) {
    runLog.push({ ts: Date.now(), msg, level });
    if (runLog.length > 20) runLog.splice(0, runLog.length - 20);
  }

  const scenarioResults: ScenarioResult[] = [];

  async function pushProgress(step: number, phase: string, phaseLabel: string, detail: string, extra: Partial<GaiaProgress> = {}) {
    const p: GaiaProgress = {
      phase,
      phaseLabel,
      step,
      totalSteps: TOTAL_STEPS,
      detail,
      scenariosAudited: 0,
      scenariosTotal: 0,
      issuesFound: 0,
      topIssuesSoFar: [],
      unresolvedTokensSoFar: 0,
      verbiageFindingsSoFar: [],
      scenarioResults: [...scenarioResults],
      log: [...runLog],
      updatedAt: Timestamp.now(),
      ...extra,
    };
    await runRef.update({ progress: p }).catch(() => undefined);
  }

  async function checkCancelled() {
    const snap = await runRef.get();
    if (snap.data()?.status === 'cancelled') {
      throw new Error('GAIA_CANCELLED');
    }
  }

  try {
    // Initialize audit config (required before any auditScenario call)
    await initializeAuditConfig(db);

    // 1. Sample existing scenarios
    addLog('info', `Fetching ${GAIA_SAMPLE_COUNT} active scenarios from the database…`);
    await pushProgress(1, 'sampling', 'Sampling scenarios', `Fetching ${GAIA_SAMPLE_COUNT} active scenarios from the database…`);
    logger.info(`[Gaia:${runId}] Sampling ${GAIA_SAMPLE_COUNT} existing scenarios`);
    const sampledScenarios = await sampleActiveScenarios(db, GAIA_SAMPLE_COUNT);
    runRecord.sampledScenarioIds = sampledScenarios.map((s) => s.id);
    addLog('info', `Sampled ${sampledScenarios.length} scenarios: ${sampledScenarios.map((s) => s.title.slice(0, 30)).join(', ')}`);
    await pushProgress(1, 'sampling', 'Sampling scenarios', `Sampled ${sampledScenarios.length} scenarios: ${sampledScenarios.map((s) => s.title.slice(0, 30)).join(', ')}`);

    await checkCancelled();
    // 2. Generate new scenarios
    addLog('info', `Requesting ${GAIA_GENERATE_COUNT} fresh scenarios from the generation pipeline…`);
    await pushProgress(2, 'generating', 'Generating new scenarios', `Requesting ${GAIA_GENERATE_COUNT} fresh scenarios from the generation pipeline…`);
    logger.info(`[Gaia:${runId}] Generating ${GAIA_GENERATE_COUNT} new scenarios`);
    let generatedScenarioIds: string[] = [];
    try {
      const uniqueBundles = [...new Set(sampledScenarios.map((s) => s.metadata?.bundle).filter(Boolean))] as string[];
      const bundleForJob = uniqueBundles.length > 0 ? [uniqueBundles[0]] : ['economics'];
      const { jobId } = await createGenerationJob(db, {
        bundles: bundleForJob as Parameters<typeof createGenerationJob>[1]['bundles'],
        count: GAIA_GENERATE_COUNT,
        mode: 'manual',
        executionTarget: 'cloud_function',
        requestedBy: `gaia:${runId}`,
        modelConfig,
      });
      addLog('info', `Generation job queued (${jobId.slice(0, 8)}…). Waiting for completion…`);
      await pushProgress(2, 'generating', 'Generating new scenarios', `Generation job queued (${jobId.slice(0, 8)}…). Waiting for completion — this may take a few minutes.`);
      generatedScenarioIds = await pollJobCompletion(db, jobId);
      addLog('info', `Generation complete — ${generatedScenarioIds.length} scenarios produced.`);
      await pushProgress(2, 'generating', 'Generating new scenarios', `Generation complete — ${generatedScenarioIds.length} scenarios produced.`);
    } catch (err) {
      addLog('warn', `Generation skipped or partial: ${String(err).slice(0, 80)}`);
      logger.warn(`[Gaia:${runId}] Generation phase skipped or partial:`, err);
      await pushProgress(2, 'generating', 'Generating new scenarios', `Generation skipped or partial: ${String(err).slice(0, 120)}`);
    }
    runRecord.generatedScenarioIds = generatedScenarioIds;

    // Load generated scenarios from Firestore
    const generatedScenarios: BundleScenario[] = [];
    for (const id of generatedScenarioIds) {
      const snap = await db.collection('scenarios').doc(id).get();
      if (snap.exists) generatedScenarios.push({ id: snap.id, ...snap.data() } as BundleScenario);
    }

    const allScenarios = [...sampledScenarios, ...generatedScenarios];

    // 3. Load token registry
    const registry = await loadCompiledTokenRegistry();
    const registryTokenSet = new Set(registry.allTokens);

    await checkCancelled();
    // 4. Audit + repair loop
    const auditByType: Record<string, number> = {};
    let totalIssues = 0;
    const repairedScenarios: BundleScenario[] = [];

    for (let i = 0; i < allScenarios.length; i++) {
      const scenario = allScenarios[i];
      const isGenerated = generatedScenarioIds.includes(scenario.id);
      addLog('info', `Auditing scenario ${i + 1}/${allScenarios.length}: "${scenario.title.slice(0, 50)}"`);
      await pushProgress(3, 'auditing', 'Auditing & repairing', `Scenario ${i + 1}/${allScenarios.length}: "${scenario.title.slice(0, 50)}"`, {
        scenariosAudited: i,
        scenariosTotal: allScenarios.length,
        issuesFound: totalIssues,
        topIssuesSoFar: topIssues(auditByType),
      });

      let current = scenario;
      const bundle = current.metadata?.bundle ?? 'economics';
      const issues = auditScenario(current, bundle);
      totalIssues += issues.length;
      for (const issue of issues) {
        auditByType[issue.rule] = (auditByType[issue.rule] ?? 0) + 1;
      }

      deterministicFix(current);

      let repaired = false;
      const auditScore = scoreScenario(issues);
      if (issues.length > 0 && auditScore < 90) {
        try {
          const repairResult = await agenticRepair(
            current,
            issues,
            bundle,
            false,
            75,
            modelConfig,
            registry as CompiledTokenRegistry,
          );
          current = repairResult.scenario;
          repaired = true;
          addLog('info', `Repaired: "${scenario.title.slice(0, 40)}" (${issues.length} issues)`);
        } catch (err) {
          addLog('warn', `Repair failed for "${scenario.title.slice(0, 40)}": ${String(err).slice(0, 60)}`);
          logger.warn(`[Gaia:${runId}] Repair failed for ${scenario.id}:`, err);
        }
      }

      repairedScenarios.push(current);

      scenarioResults.push({
        id: scenario.id,
        type: isGenerated ? 'generated' : 'sampled',
        title: scenario.title ?? '',
        descriptionSnippet: (scenario.description ?? '').slice(0, 180),
        auditScore,
        issueCount: issues.length,
        issueTypes: issues.map((iss) => iss.rule),
        unresolvedTokens: 0,
        verbiageFlagged: false,
        repaired,
      });

      await db.collection('scenarios').doc(scenario.id).update({
        gaiaReviewedAt: Timestamp.now(),
        gaiaRunId: runId,
      }).catch(() => undefined);
    }

    runRecord.auditSummary = { totalIssues, byType: auditByType };
    addLog('info', `Audit complete — ${totalIssues} issues across ${Object.keys(auditByType).length} rule types`);
    await pushProgress(3, 'auditing', 'Auditing & repairing', `Audited ${allScenarios.length} scenarios — ${totalIssues} issues across ${Object.keys(auditByType).length} rule types. Top: ${topIssues(auditByType).slice(0, 3).join(', ') || 'none'}.`, {
      scenariosAudited: allScenarios.length,
      scenariosTotal: allScenarios.length,
      issuesFound: totalIssues,
      topIssuesSoFar: topIssues(auditByType),
    });

    await checkCancelled();
    // 5. Token resolution across countries
    logger.info(`[Gaia:${runId}] Resolving tokens for ${repairedScenarios.length} scenarios`);
    let totalUnresolved = 0;
    let totalFallback = 0;
    const tokenFindings: string[] = [];
    let countriesTested = 0;

    for (let i = 0; i < repairedScenarios.length; i++) {
      const scenario = repairedScenarios[i];
      addLog('info', `Resolving tokens: "${scenario.title.slice(0, 45)}" across ${GAIA_COUNTRIES_PER_SCENARIO} countries`);
      await pushProgress(4, 'token_resolve', 'Resolving tokens', `Scenario ${i + 1}/${repairedScenarios.length}: "${scenario.title.slice(0, 50)}" — testing across ${GAIA_COUNTRIES_PER_SCENARIO} countries`, {
        scenariosAudited: allScenarios.length,
        scenariosTotal: allScenarios.length,
        issuesFound: totalIssues,
        topIssuesSoFar: topIssues(auditByType),
        unresolvedTokensSoFar: totalUnresolved,
      });

      const hintCountries = Array.isArray(scenario.applicability?.applicableCountryIds)
        ? scenario.applicability!.applicableCountryIds as string[]
        : [];
      const countries = await sampleCountries(db, hintCountries, GAIA_COUNTRIES_PER_SCENARIO);
      countriesTested = Math.max(countriesTested, countries.length);

      const summary = resolveScenarioTokens(scenario, countries, registryTokenSet);
      totalUnresolved += summary.unresolvedCount;
      totalFallback += summary.fallbackCount;
      tokenFindings.push(...summary.findings);

      const sr = scenarioResults.find((r) => r.id === scenario.id);
      if (sr) sr.unresolvedTokens = summary.unresolvedCount;
      if (summary.unresolvedCount > 0) {
        addLog('warn', `"${scenario.title.slice(0, 40)}" — ${summary.unresolvedCount} unresolved tokens`);
      }
    }

    runRecord.tokenResolutionSummary = {
      unresolvedCount: totalUnresolved,
      fallbackCount: totalFallback,
      countriesTested,
    };
    await pushProgress(4, 'token_resolve', 'Resolving tokens', `Token resolution complete — ${totalUnresolved} unresolved, ${totalFallback} fallbacks across ${countriesTested} countries.`, {
      scenariosAudited: allScenarios.length,
      scenariosTotal: allScenarios.length,
      issuesFound: totalIssues,
      topIssuesSoFar: topIssues(auditByType),
      unresolvedTokensSoFar: totalUnresolved,
    });

    await checkCancelled();
    // 6. Verbiage evaluation
    logger.info(`[Gaia:${runId}] Evaluating verbiage quality`);
    const verbiageFindings: string[] = [];
    const evalOrder = [
      ...repairedScenarios.filter((s) => generatedScenarioIds.includes(s.id)),
      ...repairedScenarios.filter((s) => !generatedScenarioIds.includes(s.id)),
    ].slice(0, 6);
    const evalCount = evalOrder.length;
    for (let i = 0; i < evalCount; i++) {
      const scenario = evalOrder[i];
      addLog('info', `Evaluating verbiage: "${scenario.title.slice(0, 45)}"`);
      await pushProgress(5, 'verbiage', 'Evaluating verbiage quality', `Evaluating scenario ${i + 1}/${evalCount}: "${scenario.title.slice(0, 50)}"`, {
        scenariosAudited: allScenarios.length,
        scenariosTotal: allScenarios.length,
        issuesFound: totalIssues,
        topIssuesSoFar: topIssues(auditByType),
        unresolvedTokensSoFar: totalUnresolved,
        verbiageFindingsSoFar: verbiageFindings.slice(-5),
      });
      const findings = await evaluateVerbiage(scenario, registry.allTokens, modelConfig);
      verbiageFindings.push(...findings.map((f) => `[${scenario.id}] ${f}`));

      const sr = scenarioResults.find((r) => r.id === scenario.id);
      if (sr && findings.length > 0) {
        sr.verbiageFlagged = true;
        addLog('warn', `"${scenario.title.slice(0, 40)}" — ${findings.length} verbiage issue${findings.length > 1 ? 's' : ''}`);
      }
    }
    runRecord.verbiageFindings = verbiageFindings;
    await pushProgress(5, 'verbiage', 'Evaluating verbiage quality', `Verbiage evaluation complete — ${verbiageFindings.length} findings across ${evalCount} scenarios.`, {
      scenariosAudited: allScenarios.length,
      scenariosTotal: allScenarios.length,
      issuesFound: totalIssues,
      topIssuesSoFar: topIssues(auditByType),
      unresolvedTokensSoFar: totalUnresolved,
      verbiageFindingsSoFar: verbiageFindings.slice(-5),
    });

    await checkCancelled();
    // 7. Stage metrics aggregation + prompt recommendations
    addLog('info', 'Loading 8-week pipeline accuracy data…');
    await pushProgress(6, 'metrics', 'Aggregating stage metrics', 'Loading 8-week pipeline accuracy data across architect, drafter, token, audit, and repair stages…', {
      scenariosAudited: allScenarios.length,
      scenariosTotal: allScenarios.length,
      issuesFound: totalIssues,
      topIssuesSoFar: topIssues(auditByType),
      unresolvedTokensSoFar: totalUnresolved,
      verbiageFindingsSoFar: verbiageFindings.slice(-5),
    });
    logger.info(`[Gaia:${runId}] Generating prompt recommendations`);
    const stageMetrics = await aggregateStageMetrics(db);
    addLog('info', `Synthesising ${verbiageFindings.length} verbiage + ${tokenFindings.length} token findings into prompt improvements…`);
    await pushProgress(7, 'recommending', 'Generating prompt recommendations', `Synthesising ${verbiageFindings.length} verbiage findings + ${tokenFindings.length} token findings into targeted prompt improvements…`, {
      scenariosAudited: allScenarios.length,
      scenariosTotal: allScenarios.length,
      issuesFound: totalIssues,
      topIssuesSoFar: topIssues(auditByType),
      unresolvedTokensSoFar: totalUnresolved,
      verbiageFindingsSoFar: verbiageFindings.slice(-5),
    });
    const promptRecommendations = await generatePromptRecommendations(
      verbiageFindings,
      tokenFindings,
      stageMetrics,
      modelConfig,
    );
    runRecord.promptRecommendations = promptRecommendations;
    runRecord.status = 'complete';

    runRecord.scenarioResults = [...scenarioResults];

    // Promote clean scenarios to training_scenarios as golden exemplars.
    // Qualifying criteria: score ≥ 95, no audit issues, no unresolved tokens, not repaired, not verbiage-flagged.
    const qualifyingIds = new Set(
      scenarioResults
        .filter((r) => r.auditScore >= 95 && r.issueCount === 0 && r.unresolvedTokens === 0 && !r.repaired && !r.verbiageFlagged)
        .map((r) => r.id),
    );
    let promotedExemplarCount = 0;
    if (qualifyingIds.size > 0) {
      const qualifying = repairedScenarios.filter((s) => qualifyingIds.has(s.id));
      const promotedAt = Timestamp.now();
      await Promise.all(qualifying.map(async (scenario) => {
        await db.collection('training_scenarios').doc(scenario.id).set({
          ...scenario,
          isGolden: true,
          auditScore: scenarioResults.find((r) => r.id === scenario.id)?.auditScore ?? 100,
          promotedAt,
          gaiaRunId: runId,
        }, { merge: true }).catch(() => undefined);
        promotedExemplarCount++;
      }));
      addLog('info', `Promoted ${promotedExemplarCount} exemplar${promotedExemplarCount !== 1 ? 's' : ''} to training_scenarios`);
    }
    runRecord.promotedExemplarCount = promotedExemplarCount;

    await runRef.update({
      sampledScenarioIds: runRecord.sampledScenarioIds,
      generatedScenarioIds: runRecord.generatedScenarioIds,
      auditSummary: runRecord.auditSummary,
      tokenResolutionSummary: runRecord.tokenResolutionSummary,
      tokenFindings,
      verbiageFindings: runRecord.verbiageFindings,
      promptRecommendations: runRecord.promptRecommendations,
      scenarioResults: runRecord.scenarioResults,
      promotedExemplarCount: runRecord.promotedExemplarCount ?? 0,
      status: 'complete',
      progress: null,
    });

    logger.info(`[Gaia:${runId}] Complete — ${promptRecommendations.architect.length + promptRecommendations.drafter.length + promptRecommendations.repair.length} recommendations`);
    return runId;
  } catch (err) {
    const isCancelled = err instanceof Error && err.message === 'GAIA_CANCELLED';
    if (isCancelled) {
      logger.info(`[Gaia:${runId}] Cancelled by user`);
      await runRef.update({ status: 'cancelled', progress: null }).catch(() => undefined);
    } else {
      logger.error(`[Gaia:${runId}] Failed:`, err);
      await runRef.update({ status: 'failed', error: String(err), progress: null });
      throw err;
    }
  }
  return runId;
}

// ---------------------------------------------------------------------------
// Scheduled function — Monday 03:00 UTC
// ---------------------------------------------------------------------------

export const gaiaScheduled = onSchedule(
  {
    schedule: '0 3 * * 1',
    timeZone: 'UTC',
    timeoutSeconds: 540,
    memory: '1GiB',
    secrets: ['OPENROUTER_API_KEY', 'OPENROUTER_MANAGEMENT_KEY'],
  },
  async () => {
    const db = admin.firestore();
    try {
      const runId = await runGaia(db, 'schedule');
      logger.info(`[Gaia] Scheduled run completed: ${runId}`);
    } catch (err) {
      logger.error('[Gaia] Scheduled run failed:', err);
    }
  },
);

// ---------------------------------------------------------------------------
// Firestore trigger — fires when web API enqueues a run via POST /api/gaia
// ---------------------------------------------------------------------------

export const gaiaOnEnqueue = onDocumentCreated(
  {
    document: 'gaia_queue/{docId}',
    timeoutSeconds: 540,
    memory: '1GiB',
    secrets: ['OPENROUTER_API_KEY', 'OPENROUTER_MANAGEMENT_KEY'],
  },
  async (event) => {
    const db = admin.firestore();
    const data = event.data?.data() ?? {};
    const triggeredBy = (data.triggeredBy as 'manual' | 'schedule') ?? 'manual';
    const triggeredByUid = (data.triggeredByUid as string | undefined) ?? undefined;
    const modelConfig = (data.modelConfig as GenerationModelConfig | undefined) ?? undefined;
    const preAssignedRunId = (data.runId as string | undefined) ?? undefined;

    try {
      const runId = await runGaia(db, triggeredBy, triggeredByUid, modelConfig, preAssignedRunId);
      logger.info(`[Gaia] Enqueued run completed: ${runId}`);
      // Clean up the queue doc
      await event.data?.ref.delete().catch(() => undefined);
    } catch (err) {
      logger.error('[Gaia] Enqueued run failed:', err);
    }
  },
);
