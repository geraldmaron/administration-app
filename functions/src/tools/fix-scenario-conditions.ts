/**
 * Audits all scenarios in Firestore and adds missing metric conditions
 * based on scenario title/description content analysis.
 *
 * Scenarios describing crisis states (economic collapse, crime wave, etc.)
 * must have appropriate metric conditions so they only appear when the
 * game state makes them plausible.
 *
 * Run from functions/:
 *   pnpm tsx src/tools/fix-scenario-conditions.ts --mode=dry-run
 *   pnpm tsx src/tools/fix-scenario-conditions.ts --mode=apply
 */

import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

const BATCH_SIZE = 500;

if (!admin.apps.length) {
  const projectId = process.env.FIREBASE_PROJECT_ID || 'the-administration-3a072';
  const saKeyPath =
    process.env.GOOGLE_APPLICATION_CREDENTIALS ||
    path.join(__dirname, '../../../../serviceAccountKey.json');

  const appOptions: admin.AppOptions = { projectId };

  if (fs.existsSync(saKeyPath)) {
    const sa = JSON.parse(fs.readFileSync(saKeyPath, 'utf8'));
    appOptions.credential = admin.credential.cert(sa);
  }

  admin.initializeApp(appOptions);
}

const db = admin.firestore();

interface ScenarioCondition {
  metricId: string;
  min?: number;
  max?: number;
}

interface ConditionRule {
  patterns: RegExp[];
  condition: ScenarioCondition;
  conflictsWith?: string[];
}

const CRISIS_RULES: ConditionRule[] = [
  {
    patterns: [
      /\b(economic\s+(crisis|collapse|recession|downturn|meltdown|catastrophe|emergency|turmoil|freefall))\b/i,
      /\b(recession|depression|fiscal\s+crisis|budget\s+crisis|financial\s+(crisis|collapse|meltdown))\b/i,
      /\b(economic\s+contraction|GDP\s+(decline|crash|plummet))\b/i,
      /\b(market\s+(crash|collapse|meltdown))\b/i,
      /\b(debt\s+crisis|sovereign\s+debt|default\s+on\s+debt)\b/i,
      /\b(austerity|bailout\s+(package|plan|request))\b/i,
    ],
    condition: { metricId: 'metric_economy', max: 38 },
    conflictsWith: ['metric_economy'],
  },
  {
    patterns: [
      /\b(economic\s+(boom|surge|miracle|expansion|prosperity))\b/i,
      /\b(growth\s+surge|surplus|revenue\s+surplus|budget\s+surplus)\b/i,
      /\b(overheating\s+economy|asset\s+bubble)\b/i,
    ],
    condition: { metricId: 'metric_economy', min: 62 },
    conflictsWith: ['metric_economy'],
  },
  {
    patterns: [
      /\b(unemployment\s+(crisis|surge|spike|wave|epidemic))\b/i,
      /\b(mass\s+(layoffs|unemployment|job\s+losses))\b/i,
      /\b(workers?\s+out\s+of\s+jobs|jobless(ness)?)\b/i,
      /\b(widespread\s+unemployment|soaring\s+unemployment)\b/i,
    ],
    condition: { metricId: 'metric_employment', max: 42 },
    conflictsWith: ['metric_employment'],
  },
  {
    patterns: [
      /\b(labor\s+shortage|worker\s+shortage|full\s+employment\s+overheat)\b/i,
      /\b(not\s+enough\s+workers|hiring\s+crisis|talent\s+shortage)\b/i,
    ],
    condition: { metricId: 'metric_employment', min: 70 },
    conflictsWith: ['metric_employment'],
  },
  {
    patterns: [
      /\b(inflation\s+(crisis|surge|spiral|emergency|skyrocket))\b/i,
      /\b(hyperinflation|price\s+(surge|spike|spiral|crisis))\b/i,
      /\b(cost[- ]of[- ]living\s+(crisis|emergency|crunch))\b/i,
      /\b(runaway\s+(inflation|prices))\b/i,
      /\b(soaring\s+(inflation|prices|costs))\b/i,
    ],
    condition: { metricId: 'metric_inflation', min: 58 },
    conflictsWith: ['metric_inflation'],
  },
  {
    patterns: [
      /\b(crime\s+(wave|surge|crisis|epidemic|spree|explosion))\b/i,
      /\b(widespread\s+(lawlessness|crime|violence|looting))\b/i,
      /\b(soaring\s+crime|rampant\s+crime|criminal\s+epidemic)\b/i,
      /\b(gang\s+(warfare|violence|crisis))\b/i,
    ],
    condition: { metricId: 'metric_crime', min: 60 },
    conflictsWith: ['metric_crime'],
  },
  {
    patterns: [
      /\b(civil\s+unrest|riots?|large[- ]scale\s+protests?|mass\s+protests?)\b/i,
      /\b(widespread\s+(unrest|rioting|protests?|disorder))\b/i,
      /\b(social\s+(upheaval|explosion|unrest))\b/i,
      /\b(public\s+order\s+(crisis|collapse|breakdown))\b/i,
      /\b(martial\s+law|state\s+of\s+emergency.*unrest)\b/i,
    ],
    condition: { metricId: 'metric_public_order', max: 40 },
    conflictsWith: ['metric_public_order'],
  },
  {
    patterns: [
      /\b(corruption\s+(scandal|crisis|epidemic|crackdown|probe|investigation))\b/i,
      /\b(systemic\s+(bribery|corruption|graft))\b/i,
      /\b(embezzlement\s+(scandal|exposed|scheme|ring))\b/i,
      /\b(bribery\s+(scandal|ring|scheme|network))\b/i,
      /\b(kleptocrac|endemic\s+corruption)\b/i,
    ],
    condition: { metricId: 'metric_corruption', min: 55 },
    conflictsWith: ['metric_corruption'],
  },
];

type Mode = 'dry-run' | 'apply';

function parseArgs(): { mode: Mode } {
  const argv = process.argv.slice(2);
  const modeFlag = argv.find((a) => a.startsWith('--mode='));
  const mode = (modeFlag?.split('=')[1] as Mode) ?? 'dry-run';
  return { mode };
}

function analyzeText(title: string, description: string): ScenarioCondition[] {
  const combined = `${title} ${description}`;
  const matched: ScenarioCondition[] = [];
  const seenMetrics = new Set<string>();

  for (const rule of CRISIS_RULES) {
    if (rule.conflictsWith?.some((m) => seenMetrics.has(m))) continue;

    const isMatch = rule.patterns.some((p) => p.test(combined));
    if (isMatch) {
      matched.push(rule.condition);
      if (rule.conflictsWith) {
        rule.conflictsWith.forEach((m) => seenMetrics.add(m));
      }
    }
  }

  return matched.slice(0, 2);
}

function conditionsAlreadyCover(
  existing: ScenarioCondition[] | undefined,
  needed: ScenarioCondition[]
): boolean {
  if (!existing || existing.length === 0) return false;

  return needed.every((need) => {
    return existing.some((ex) => {
      if (ex.metricId !== need.metricId) return false;
      if (need.max !== undefined) {
        return ex.max !== undefined && ex.max <= need.max + 10;
      }
      if (need.min !== undefined) {
        return ex.min !== undefined && ex.min >= need.min - 10;
      }
      return false;
    });
  });
}

interface FixRecord {
  id: string;
  title: string;
  bundle: string;
  existingConditions: ScenarioCondition[];
  addedConditions: ScenarioCondition[];
  action: 'added' | 'already-covered' | 'no-crisis-detected';
}

async function run() {
  const { mode } = parseArgs();
  console.log(`[FixConditions] Mode: ${mode}`);
  console.log(`[FixConditions] Loading all scenarios from Firestore...`);

  const snapshot = await db.collection('scenarios').get();
  console.log(`[FixConditions] Found ${snapshot.size} scenarios`);

  const records: FixRecord[] = [];
  const writeBatch: { id: string; conditions: ScenarioCondition[] }[] = [];

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const id = doc.id;
    const title = data.title || '';
    const description = data.description || '';
    const bundle = data.metadata?.bundle || 'unknown';
    const existingConditions: ScenarioCondition[] = data.conditions || [];

    const neededConditions = analyzeText(title, description);

    if (neededConditions.length === 0) {
      records.push({
        id,
        title,
        bundle,
        existingConditions,
        addedConditions: [],
        action: 'no-crisis-detected',
      });
      continue;
    }

    if (conditionsAlreadyCover(existingConditions, neededConditions)) {
      records.push({
        id,
        title,
        bundle,
        existingConditions,
        addedConditions: [],
        action: 'already-covered',
      });
      continue;
    }

    const mergedConditions = mergeConditions(existingConditions, neededConditions);
    const addedConditions = mergedConditions.filter(
      (mc) => !existingConditions.some((ec) => ec.metricId === mc.metricId)
    );

    records.push({
      id,
      title,
      bundle,
      existingConditions,
      addedConditions,
      action: 'added',
    });

    writeBatch.push({ id, conditions: mergedConditions });
  }

  const added = records.filter((r) => r.action === 'added');
  const covered = records.filter((r) => r.action === 'already-covered');
  const noCrisis = records.filter((r) => r.action === 'no-crisis-detected');

  console.log(`\n[FixConditions] Results:`);
  console.log(`  Total scenarios:     ${records.length}`);
  console.log(`  No crisis detected:  ${noCrisis.length}`);
  console.log(`  Already covered:     ${covered.length}`);
  console.log(`  Need conditions:     ${added.length}`);

  if (added.length > 0) {
    console.log(`\n[FixConditions] Scenarios that need conditions:`);
    for (const rec of added) {
      console.log(`  ${rec.id}`);
      console.log(`    Title: "${rec.title}"`);
      console.log(`    Bundle: ${rec.bundle}`);
      if (rec.existingConditions.length > 0) {
        console.log(`    Existing: ${JSON.stringify(rec.existingConditions)}`);
      }
      console.log(`    Adding:   ${JSON.stringify(rec.addedConditions)}`);
    }
  }

  if (covered.length > 0) {
    console.log(`\n[FixConditions] Already covered (no changes needed):`);
    for (const rec of covered) {
      console.log(`  ${rec.id} — "${rec.title}" — ${JSON.stringify(rec.existingConditions)}`);
    }
  }

  if (mode === 'apply' && writeBatch.length > 0) {
    console.log(`\n[FixConditions] Applying ${writeBatch.length} updates...`);

    for (let i = 0; i < writeBatch.length; i += BATCH_SIZE) {
      const chunk = writeBatch.slice(i, i + BATCH_SIZE);
      const batch = db.batch();

      for (const update of chunk) {
        const ref = db.collection('scenarios').doc(update.id);
        batch.update(ref, {
          conditions: update.conditions,
          updated_at: admin.firestore.FieldValue.serverTimestamp(),
        });
      }

      await batch.commit();
      console.log(`  Committed batch ${Math.floor(i / BATCH_SIZE) + 1} (${chunk.length} docs)`);
    }

    console.log(`[FixConditions] Done — ${writeBatch.length} scenarios updated.`);
  } else if (mode === 'dry-run' && writeBatch.length > 0) {
    console.log(`\n[FixConditions] Dry-run complete — ${writeBatch.length} scenarios would be updated.`);
    console.log(`[FixConditions] Re-run with --mode=apply to commit changes.`);
  } else {
    console.log(`\n[FixConditions] No updates needed.`);
  }
}

function mergeConditions(
  existing: ScenarioCondition[],
  needed: ScenarioCondition[]
): ScenarioCondition[] {
  const merged = [...existing];

  for (const need of needed) {
    const existingIdx = merged.findIndex((e) => e.metricId === need.metricId);
    if (existingIdx >= 0) {
      const ex = merged[existingIdx];
      if (need.max !== undefined && (ex.max === undefined || ex.max > need.max)) {
        merged[existingIdx] = { ...ex, max: need.max };
      }
      if (need.min !== undefined && (ex.min === undefined || ex.min < need.min)) {
        merged[existingIdx] = { ...ex, min: need.min };
      }
    } else {
      merged.push(need);
    }
  }

  return merged;
}

run()
  .then(() => {
    console.log('[FixConditions] Completed.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('[FixConditions] Failed:', err);
    process.exit(1);
  });
