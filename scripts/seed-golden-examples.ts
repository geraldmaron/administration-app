/**
 * Seed few-shot golden examples into training_scenarios from the strongest
 * existing scenarios in Firestore, with explicit bundle coverage metadata.
 *
 * Usage:
 *   npx tsx scripts/seed-golden-examples.ts
 *   npx tsx scripts/seed-golden-examples.ts --dry-run
 *   npx tsx scripts/seed-golden-examples.ts --per-bundle 2 --min-score 88
 */
// @ts-nocheck
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import * as path from 'path';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const serviceAccount = require(path.join(__dirname, '..', 'serviceAccountKey.json'));
const admin = require('firebase-admin');

const { initializeAuditConfig, auditScenario, scoreScenario } = require(path.join(
  __dirname,
  '..',
  'functions',
  'src',
  'lib',
  'audit-rules.ts'
));
const { ALL_BUNDLE_IDS } = require(path.join(
  __dirname,
  '..',
  'functions',
  'src',
  'data',
  'schemas',
  'bundleIds.ts'
));

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'the-administration-3a072',
  });
}

const db = admin.firestore();

function getArgValue(flag: string): string | undefined {
  const args = process.argv.slice(2);
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : undefined;
}

const DRY_RUN = process.argv.includes('--dry-run');
const PER_BUNDLE = Math.max(1, Number.parseInt(getArgValue('--per-bundle') ?? '6', 10) || 6);
const MIN_SCORE = Number.parseInt(getArgValue('--min-score') ?? '88', 10) || 88;

type RankedScenario = {
  id: string;
  bundle: string;
  score: number;
  issueCount: number;
  chainId: string;
  phase: string | null;
  actIndex: number | null;
  difficulty: number | null;
  severity: string | null;
  scopeTier: string | null;
  scopeKey: string | null;
  countryScope: 'country-specific' | 'universal';
  data: FirebaseFirestore.DocumentData;
};

function getScenarioBundle(data: FirebaseFirestore.DocumentData): string | null {
  return data?.metadata?.bundle ?? data?.bundle ?? null;
}

function buildTrainingPayload(candidate: RankedScenario, rank: number): FirebaseFirestore.DocumentData {
  return {
    ...candidate.data,
    bundle: candidate.bundle,
    scopeTier: candidate.scopeTier,
    scopeKey: candidate.scopeKey,
    isGolden: true,
    goldenBundle: candidate.bundle,
    goldenRank: rank,
    auditScore: candidate.score,
    auditIssueCount: candidate.issueCount,
    seededAt: admin.firestore.FieldValue.serverTimestamp(),
  };
}

function buildChainId(id: string, data: FirebaseFirestore.DocumentData): string {
  return data?.chainId ?? data?.metadata?.chainId ?? id.replace(/_act\d+$/i, '');
}

function getPhase(data: FirebaseFirestore.DocumentData): string | null {
  return typeof data?.phase === 'string' ? data.phase : null;
}

function getActIndex(data: FirebaseFirestore.DocumentData): number | null {
  return Number.isFinite(data?.actIndex) ? Number(data.actIndex) : null;
}

function getDifficulty(data: FirebaseFirestore.DocumentData): number | null {
  return Number.isFinite(data?.metadata?.difficulty) ? Number(data.metadata.difficulty) : null;
}

function getSeverity(data: FirebaseFirestore.DocumentData): string | null {
  return typeof data?.metadata?.severity === 'string' ? data.metadata.severity : null;
}

function getCountryScope(data: FirebaseFirestore.DocumentData): 'country-specific' | 'universal' {
  return Array.isArray(data?.metadata?.applicable_countries) && data.metadata.applicable_countries.length > 0
    ? 'country-specific'
    : 'universal';
}

function getScopeTier(data: FirebaseFirestore.DocumentData): string | null {
  return typeof data?.metadata?.scopeTier === 'string' ? data.metadata.scopeTier : null;
}

function getScopeKey(data: FirebaseFirestore.DocumentData): string | null {
  return typeof data?.metadata?.scopeKey === 'string' ? data.metadata.scopeKey : null;
}

function compareCandidates(left: RankedScenario, right: RankedScenario): number {
  const leftIsRoot = left.phase === 'root' || left.actIndex === 1;
  const rightIsRoot = right.phase === 'root' || right.actIndex === 1;
  if (leftIsRoot !== rightIsRoot) return leftIsRoot ? -1 : 1;
  if (right.score !== left.score) return right.score - left.score;
  if (left.issueCount !== right.issueCount) return left.issueCount - right.issueCount;
  return left.id.localeCompare(right.id);
}

function selectBalancedCandidates(candidates: RankedScenario[], perBundle: number, minScore: number): RankedScenario[] {
  if (candidates.length === 0) return [];

  const sorted = [...candidates].sort(compareCandidates);
  const qualified = sorted.filter((candidate) => candidate.score >= minScore);
  const qualityPool = qualified.length > 0 ? qualified : sorted;

  const bestByChain = new Map<string, RankedScenario>();
  for (const candidate of qualityPool) {
    if (!bestByChain.has(candidate.chainId)) {
      bestByChain.set(candidate.chainId, candidate);
    }
  }

  const deduped = [...bestByChain.values()].sort(compareCandidates);
  const selected: RankedScenario[] = [];
  const usedIds = new Set<string>();
  const usedLanes = new Set<string>();

  const addCandidate = (candidate: RankedScenario): boolean => {
    if (usedIds.has(candidate.id) || selected.length >= perBundle) return false;
    usedIds.add(candidate.id);
    selected.push(candidate);
    return true;
  };

  for (const candidate of deduped) {
    const lane = [
      candidate.severity ?? 'unknown',
      candidate.difficulty ?? 'unknown',
      candidate.scopeTier ?? 'unknown',
      candidate.countryScope,
    ].join('|');

    if (usedLanes.has(lane)) continue;
    if (addCandidate(candidate)) {
      usedLanes.add(lane);
    }
  }

  for (const candidate of deduped) {
    if (!addCandidate(candidate)) continue;
  }

  return selected;
}

async function main(): Promise<void> {
  await initializeAuditConfig(db);

  const scenarioSnap = await db.collection('scenarios').get();
  console.log(`[seed-golden-examples] Loaded ${scenarioSnap.size} scenarios`);

  const rankedByBundle = new Map<string, RankedScenario[]>();

  for (const bundle of ALL_BUNDLE_IDS) {
    rankedByBundle.set(bundle, []);
  }

  for (const doc of scenarioSnap.docs) {
    const data = doc.data();
    const bundle = getScenarioBundle(data);
    if (!bundle || !rankedByBundle.has(bundle)) continue;

    const issues = auditScenario(data, bundle, data?.metadata?.source === 'news');
    const score = Number(scoreScenario(issues));
    rankedByBundle.get(bundle)!.push({
      id: doc.id,
      bundle,
      score,
      issueCount: issues.length,
      chainId: buildChainId(doc.id, data),
      phase: getPhase(data),
      actIndex: getActIndex(data),
      difficulty: getDifficulty(data),
      severity: getSeverity(data),
      scopeTier: getScopeTier(data),
      scopeKey: getScopeKey(data),
      countryScope: getCountryScope(data),
      data,
    });
  }

  const writes: Array<{ id: string; bundle: string; score: number; fallback: boolean; rank: number }> = [];
  const coverageGaps: string[] = [];
  const batch = db.batch();

  for (const bundle of ALL_BUNDLE_IDS) {
    const candidates = rankedByBundle.get(bundle) ?? [];
    const selected = selectBalancedCandidates(candidates, PER_BUNDLE, MIN_SCORE);

    if (selected.length === 0) {
      coverageGaps.push(`${bundle} (0 available scenarios)`);
      continue;
    }

    if (selected.length < PER_BUNDLE) {
      coverageGaps.push(`${bundle} (${selected.length}/${PER_BUNDLE})`);
    }

    selected.forEach((candidate, index) => {
      const rank = index + 1;
      const fallback = candidate.score < MIN_SCORE;
      const payload = buildTrainingPayload(candidate, rank);
      const ref = db.collection('training_scenarios').doc(candidate.id);

      writes.push({
        id: candidate.id,
        bundle,
        score: candidate.score,
        fallback,
        rank,
      });

      if (!DRY_RUN) {
        batch.set(ref, payload, { merge: true });
      }
    });
  }

  if (writes.length === 0) {
    console.log('[seed-golden-examples] No candidates selected. Nothing to write.');
    return;
  }

  for (const write of writes) {
    const mode = write.fallback ? 'fallback' : 'qualified';
    console.log(
      `[seed-golden-examples] ${DRY_RUN ? 'Would write' : 'Write'} training_scenarios/${write.id} ` +
      `(bundle=${write.bundle}, rank=${write.rank}, score=${write.score}, mode=${mode})`
    );
  }

  if (!DRY_RUN) {
    await batch.commit();
  }

  console.log(
    `${DRY_RUN ? '[seed-golden-examples] Dry run selected' : '[seed-golden-examples] Seeded'} ` +
    `${writes.length} golden examples across ${new Set(writes.map((write) => write.bundle)).size} bundles`
  );

  if (coverageGaps.length > 0) {
    console.warn(`[seed-golden-examples] Bundles without full coverage: ${coverageGaps.join(', ')}`);
  }
}

main().catch((error) => {
  console.error('[seed-golden-examples] Fatal error:', error?.message ?? error);
  process.exit(1);
});