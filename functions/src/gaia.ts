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
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { Timestamp } from 'firebase-admin/firestore';
import { randomUUID } from 'crypto';
import { readFileSync } from 'fs';
import { join } from 'path';
import { auditScenario, deterministicFix, scoreScenario, type BundleScenario } from './lib/audit-rules';
import { agenticRepair } from './lib/agentic-repair';
import { loadCompiledTokenRegistry } from './lib/token-registry';
import { callModelProvider, type ModelConfig } from './lib/model-providers';
import { createGenerationJob } from './background-jobs';
import type { GenerationModelConfig } from './shared/generation-contract';
import type { CompiledTokenRegistry } from './shared/token-registry-contract';

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
}

export interface GaiaRunPromptRecommendations {
  architect: RecommendationItem[];
  drafter: RecommendationItem[];
  repair: RecommendationItem[];
  summary: string;
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
  status: 'running' | 'complete' | 'failed';
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
  const shuffled = docs.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

async function sampleCountries(
  db: admin.firestore.Firestore,
  hint: string[],
  count: number,
): Promise<{ id: string; tokens?: Record<string, string>; facts?: Record<string, unknown> }[]> {
  if (hint.length >= count) {
    const docs = await Promise.all(
      hint.slice(0, count).map((id) => db.collection('countries').doc(id).get()),
    );
    return docs
      .filter((d) => d.exists)
      .map((d) => ({ id: d.id, ...d.data() }));
  }

  const snap = await db.collection('countries').limit(100).get();
  const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  return all.sort(() => Math.random() - 0.5).slice(0, count);
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

async function resolveScenarioTokens(
  scenario: BundleScenario,
  countries: { id: string; tokens?: Record<string, string> }[],
): Promise<TokenResolutionSummary> {
  let totalUnresolved = 0;
  let totalFallback = 0;
  const findings: string[] = [];

  for (const country of countries) {
    const tokens = country.tokens ?? {};
    const fieldsToCheck = [
      scenario.title,
      scenario.description,
      ...(scenario.options ?? []).map((o) => o.text),
    ].filter(Boolean);

    for (const field of fieldsToCheck) {
      const { unresolved } = resolveTokensInText(field as string, tokens);
      if (unresolved.length > 0) {
        totalUnresolved += unresolved.length;
        findings.push(
          `Scenario ${scenario.id} | Country ${country.id}: unresolved tokens ${unresolved.join(', ')}`,
        );
      }
    }
  }

  return { unresolvedCount: totalUnresolved, fallbackCount: totalFallback, findings };
}

async function evaluateVerbiage(
  scenario: BundleScenario,
  modelConfig?: GenerationModelConfig,
): Promise<string[]> {
  const prompt = `You are a quality evaluator for a geopolitical simulation game.

Scenario title: ${scenario.title}
Scenario description: ${scenario.description?.slice(0, 600) ?? ''}

Briefly list any issues you find (token artifacts like {{token}}, awkward phrasing, generation patterns, hardcoded country names, unnatural second-person shifts). Return a JSON array of short strings. If no issues, return [].`;

  try {
    const resp = await callModelProvider(
      prompt,
      '',
      EVAL_MODEL_CONFIG,
      undefined,
      modelConfig,
    );
    const text = resp.content?.trim() ?? '[]';
    const start = text.indexOf('[');
    const end = text.lastIndexOf(']');
    if (start === -1 || end === -1) return [];
    return JSON.parse(text.slice(start, end + 1)) as string[];
  } catch {
    return [];
  }
}

async function aggregateStageMetrics(
  db: admin.firestore.Firestore,
  weeksBack = 8,
): Promise<Record<PipelineStage, { passRate: number; sampleSize: number; topIssues: string[] }>> {
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
      if (stageData.passed) counts[stage].passed++;
      const issueList = 'issues' in stageData ? stageData.issues : [];
      for (const issue of issueList) {
        counts[stage].issueFreq[issue] = (counts[stage].issueFreq[issue] ?? 0) + 1;
      }
    }
  }

  const result = {} as Record<PipelineStage, { passRate: number; sampleSize: number; topIssues: string[] }>;
  for (const stage of stages) {
    const { passed, total, issueFreq } = counts[stage];
    const topIssues = Object.entries(issueFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([k]) => k);
    result[stage] = { passRate: total > 0 ? passed / total : 1, sampleSize: total, topIssues };
  }
  return result;
}

async function generatePromptRecommendations(
  verbiageFindings: string[],
  tokenFindings: string[],
  stageMetrics: Record<PipelineStage, { passRate: number; sampleSize: number; topIssues: string[] }>,
  modelConfig?: GenerationModelConfig,
): Promise<GaiaRunPromptRecommendations> {
  const architectPrompt = readPromptFile('architect.prompt.md');
  const drafterPrompt = readPromptFile('drafter.prompt.md');

  const metricSummary = Object.entries(stageMetrics)
    .map(([stage, m]) => `${stage}: ${(m.passRate * 100).toFixed(0)}% pass rate (n=${m.sampleSize}), top issues: ${m.topIssues.join(', ') || 'none'}`)
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

  try {
    const resp = await callModelProvider(
      systemPrompt,
      contextSnippet,
      RECO_MODEL_CONFIG,
      undefined,
      modelConfig,
    );

    const text = resp.content?.trim() ?? '{}';
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start === -1 || end === -1) throw new Error('No JSON in response');

    const parsed = JSON.parse(text.slice(start, end + 1)) as {
      recommendations: Array<{
        pipelineStage: 'architect' | 'drafter' | 'repair';
        targetSection: string;
        reason: string;
        currentExcerpt: string;
        suggestedChange: string;
      }>;
      summary: string;
    };

    const architect: RecommendationItem[] = [];
    const drafter: RecommendationItem[] = [];
    const repair: RecommendationItem[] = [];

    for (const rec of parsed.recommendations ?? []) {
      const stage = rec.pipelineStage;
      const stageMetric = stageMetrics[stage === 'repair' ? 'repair' : stage] ?? { passRate: 1, sampleSize: 0, topIssues: [] };
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

    return { architect, drafter, repair, summary: parsed.summary ?? '' };
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
): Promise<string> {
  const runId = randomUUID();
  const runRef = db.collection('gaia_runs').doc(runId);

  const runRecord: GaiaRun = {
    runId,
    triggeredAt: Timestamp.now(),
    triggeredBy,
    triggeredByUid,
    sampledScenarioIds: [],
    generatedScenarioIds: [],
    auditSummary: { totalIssues: 0, byType: {} },
    tokenResolutionSummary: { unresolvedCount: 0, fallbackCount: 0, countriesTested: 0 },
    verbiageFindings: [],
    promptRecommendations: { architect: [], drafter: [], repair: [], summary: '' },
    status: 'running',
    modelConfig,
  };
  await runRef.set(runRecord);

  try {
    // 1. Sample existing scenarios
    logger.info(`[Gaia:${runId}] Sampling ${GAIA_SAMPLE_COUNT} existing scenarios`);
    const sampledScenarios = await sampleActiveScenarios(db, GAIA_SAMPLE_COUNT);
    runRecord.sampledScenarioIds = sampledScenarios.map((s) => s.id);

    // 2. Generate new scenarios
    logger.info(`[Gaia:${runId}] Generating ${GAIA_GENERATE_COUNT} new scenarios`);
    let generatedScenarioIds: string[] = [];
    try {
      const uniqueBundles = [...new Set(sampledScenarios.map((s) => s.bundle).filter(Boolean))] as string[];
      const bundleForJob = uniqueBundles.length > 0 ? [uniqueBundles[0]] : ['economics'];
      const { jobId } = await createGenerationJob(db, {
        bundles: bundleForJob as Parameters<typeof createGenerationJob>[1]['bundles'],
        count: GAIA_GENERATE_COUNT,
        mode: 'manual',
        executionTarget: 'cloud_function',
        requestedBy: `gaia:${runId}`,
        modelConfig,
      });
      generatedScenarioIds = await pollJobCompletion(db, jobId);
    } catch (err) {
      logger.warn(`[Gaia:${runId}] Generation phase skipped or partial:`, err);
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

    // 4. Audit + repair loop
    logger.info(`[Gaia:${runId}] Auditing + repairing ${allScenarios.length} scenarios`);
    const auditByType: Record<string, number> = {};
    let totalIssues = 0;

    const repairedScenarios: BundleScenario[] = [];
    for (const scenario of allScenarios) {
      let current = scenario;
      const issues = auditScenario(current);
      totalIssues += issues.length;
      for (const issue of issues) {
        auditByType[issue.code] = (auditByType[issue.code] ?? 0) + 1;
      }

      // Deterministic fixes first
      current = deterministicFix(current);

      // Agentic repair for scenarios with issues
      if (issues.length > 0 && scoreScenario(issues) < 90) {
        try {
          const repairResult = await agenticRepair(
            current,
            issues,
            current.bundle ?? 'economics',
            false,
            75,
            modelConfig,
            registry as CompiledTokenRegistry,
          );
          current = repairResult.scenario;
        } catch (err) {
          logger.warn(`[Gaia:${runId}] Repair failed for ${scenario.id}:`, err);
        }
      }

      repairedScenarios.push(current);

      // Stamp scenario with gaiaReviewedAt
      await db.collection('scenarios').doc(scenario.id).update({
        gaiaReviewedAt: Timestamp.now(),
        gaiaRunId: runId,
      }).catch(() => undefined);
    }

    runRecord.auditSummary = { totalIssues, byType: auditByType };

    // 5. Token resolution across countries
    logger.info(`[Gaia:${runId}] Resolving tokens for ${repairedScenarios.length} scenarios`);
    let totalUnresolved = 0;
    let totalFallback = 0;
    const tokenFindings: string[] = [];
    let countriesTested = 0;

    for (const scenario of repairedScenarios) {
      const hintCountries = Array.isArray(scenario.metadata?.applicable_countries)
        ? scenario.metadata!.applicable_countries as string[]
        : [];
      const countries = await sampleCountries(db, hintCountries, GAIA_COUNTRIES_PER_SCENARIO);
      countriesTested = Math.max(countriesTested, countries.length);

      const summary = await resolveScenarioTokens(scenario, countries);
      totalUnresolved += summary.unresolvedCount;
      totalFallback += summary.fallbackCount;
      tokenFindings.push(...summary.findings);
    }

    runRecord.tokenResolutionSummary = {
      unresolvedCount: totalUnresolved,
      fallbackCount: totalFallback,
      countriesTested,
    };

    // 6. Verbiage evaluation
    logger.info(`[Gaia:${runId}] Evaluating verbiage quality`);
    const verbiageFindings: string[] = [];
    for (const scenario of repairedScenarios.slice(0, 6)) {
      const findings = await evaluateVerbiage(scenario, modelConfig);
      verbiageFindings.push(...findings.map((f) => `[${scenario.id}] ${f}`));
    }
    runRecord.verbiageFindings = verbiageFindings;

    // 7. Stage metrics aggregation + prompt recommendations
    logger.info(`[Gaia:${runId}] Generating prompt recommendations`);
    const stageMetrics = await aggregateStageMetrics(db);
    const promptRecommendations = await generatePromptRecommendations(
      verbiageFindings,
      tokenFindings,
      stageMetrics,
      modelConfig,
    );
    runRecord.promptRecommendations = promptRecommendations;
    runRecord.status = 'complete';

    await runRef.update({
      sampledScenarioIds: runRecord.sampledScenarioIds,
      generatedScenarioIds: runRecord.generatedScenarioIds,
      auditSummary: runRecord.auditSummary,
      tokenResolutionSummary: runRecord.tokenResolutionSummary,
      verbiageFindings: runRecord.verbiageFindings,
      promptRecommendations: runRecord.promptRecommendations,
      status: 'complete',
    });

    logger.info(`[Gaia:${runId}] Complete — ${promptRecommendations.architect.length + promptRecommendations.drafter.length + promptRecommendations.repair.length} recommendations`);
    return runId;
  } catch (err) {
    logger.error(`[Gaia:${runId}] Failed:`, err);
    await runRef.update({ status: 'failed', error: String(err) });
    throw err;
  }
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
    secrets: ['OPENAI_API_KEY'],
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
// HTTP callable — manual trigger from admin UI
// ---------------------------------------------------------------------------

export const triggerGaia = onCall(
  {
    timeoutSeconds: 540,
    memory: '1GiB',
    secrets: ['OPENAI_API_KEY'],
  },
  async (request) => {
    if (!request.auth?.uid) {
      throw new HttpsError('unauthenticated', 'Authentication required');
    }

    const db = admin.firestore();
    const modelConfig = (request.data?.modelConfig as GenerationModelConfig | undefined) ?? undefined;

    const runId = await runGaia(db, 'manual', request.auth.uid, modelConfig);
    return { runId };
  },
);
