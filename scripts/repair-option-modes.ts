/**
 * Repairs existing scenario options to follow the three-mode governance pattern:
 *   Option A — Direct Action (unilateral state instruments)
 *   Option B — Institutional/Coalition (delegation to independent bodies, courts, multilateral)
 *   Option C — Strategic Patience (pilot programs, monitoring, indirect pressure)
 *
 * Usage:
 *   npx tsx scripts/repair-option-modes.ts --dry-run
 *   npx tsx scripts/repair-option-modes.ts --apply
 *   npx tsx scripts/repair-option-modes.ts --apply --bundle=bundle_economy
 *   npx tsx scripts/repair-option-modes.ts --apply --limit=10
 */

import admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';

const DRY_RUN = !process.argv.includes('--apply');
const BUNDLE_FILTER = (() => {
  const f = process.argv.find(a => a.startsWith('--bundle='));
  return f ? f.replace('--bundle=', '') : null;
})();
const LIMIT = (() => {
  const f = process.argv.find(a => a.startsWith('--limit='));
  return f ? parseInt(f.replace('--limit=', ''), 10) : 999;
})();

const BATCH_SIZE = 3;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const MODEL = process.env.REPAIR_MODEL || 'gpt-4.1';

const serviceAccountPath = path.join(__dirname, '..', 'serviceAccountKey.json');

function loadEnv(): void {
  const envPaths = [
    path.join(__dirname, '..', 'functions', '.env.cli'),
    path.join(__dirname, '..', 'functions', '.env.local'),
    path.join(__dirname, '..', 'functions', '.env'),
  ];
  for (const p of envPaths) {
    if (!fs.existsSync(p)) continue;
    const lines = fs.readFileSync(p, 'utf8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq < 1) continue;
      const key = trimmed.slice(0, eq).trim();
      const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
      if (!(key in process.env)) process.env[key] = val;
    }
  }
}

loadEnv();

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'the-administration-3a072',
  });
}
const db = admin.firestore();

async function callOpenAI(systemPrompt: string, userContent: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY || OPENAI_API_KEY;
  const body = JSON.stringify({
    model: MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent },
    ],
    temperature: 0.4,
    max_tokens: 6000,
    response_format: { type: 'json_object' },
  });

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: 'api.openai.com',
        path: '/v1/chat/completions',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'Content-Length': Buffer.byteLength(body),
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            if (parsed.error) {
              reject(new Error(`OpenAI error: ${parsed.error.message}`));
            } else {
              resolve(parsed.choices?.[0]?.message?.content ?? '{}');
            }
          } catch (e) {
            reject(e);
          }
        });
      }
    );
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

const SYSTEM_PROMPT = `You are a scenario editor for a geopolitical simulation game called "The Administration". Your task is to restructure scenario options to follow three distinct governance response modes.

## Three Governance Response Modes

Every scenario must have EXACTLY THREE options following these modes:

**Option A — Direct Action**
The state acts unilaterally through its own instruments: executive order, emergency decree, spending mandate, regulatory imposition, security force deployment, crackdown.
- Label: 1-3 words, action verb (e.g. "Issue Decree", "Impose Controls", "Deploy Forces")
- Text: 2-3 sentences, 40-90 words. State exactly what the leader does and the specific mechanism.
- Effects: 2-4 effects. Include at least 1 metric from the scenario's primary domain.
- When realistic, this option should use authoritarian framing: power consolidation, bypassing institutional checks.
  If so, effects MUST include at least one penalty to metric_liberty, metric_democracy, metric_unrest, or metric_foreign_relations.

**Option B — Institutional/Coalition**
The leader works through or delegates to institutions, independent bodies, coalitions, or multilateral frameworks.
Commission inquiry, convene legislature, refer to courts, negotiate with coalition partners, form interagency task force, delegate to regulatory body, seek multilateral agreement.
- Label: 1-3 words (e.g. "Convene Commission", "Refer to Courts", "Negotiate Coalition")
- Text: 2-3 sentences, 40-90 words. State who is delegated to and what mandate they receive.
- Effects: 2-4 effects. Include at least 1 metric from the scenario's primary domain.

**Option C — Strategic Patience**
The leader defers, pilots, monitors, applies indirect pressure, or takes asymmetric action.
Regional pilot program, phased rollout, conditional triggers ("tripwires"), watchful waiting, targeted surveillance, selective enforcement, proxy pressure, capacity building.
- Label: 1-3 words (e.g. "Pilot Program", "Monitor and Wait", "Phase Response")
- Text: 2-3 sentences, 40-90 words. State the deferral mechanism, monitoring conditions, or indirect lever used.
- Effects: 2-4 effects. Include at least 1 metric from the scenario's primary domain.

## Writing Rules
- Second person for option text ("You direct...", "Your administration...")
- Third person journalistic for outcome fields (outcomeHeadline, outcomeSummary, outcomeContext)
- No option previews or consequence telegraphing in option text
- Effect values: probability=1.0, duration 1-20, values ±0.3 to ±7.0 (use specific decimals, no whole numbers)
- For inverse metrics (metric_corruption, metric_crime, metric_inflation, metric_bureaucracy):
  negative = improvement (less crime/corruption), positive = worsening
- For all other metrics: positive = improvement
- advisorFeedback: 5-9 entries per option, must include role_executive, 2-3 domain-relevant roles, ≥1 opposing view
- Valid roleIds ONLY: role_executive, role_diplomacy, role_defense, role_economy, role_justice, role_health, role_commerce, role_labor, role_interior, role_energy, role_environment, role_transport, role_education
- outcomeContext: ≥350 characters, 4-6 sentences, third-person
- outcomeSummary: ≥200 characters, 2-3 sentences, third-person
- outcomeHeadline: 3-15 words, no "you"/"your"

## Token Rules (for universal/regional scenarios)
NEVER hardcode ministry names. Use tokens:
- Finance Ministry → {finance_role}
- Defense Ministry → {defense_role}
- Trade/Commerce Ministry → {commerce_role}
- Health Ministry → {health_role}
- Foreign Ministry → {foreign_affairs_role}
- Central Bank → {central_bank}
- Parliament → {legislature}
- Supreme Court → {judicial_role}

## Output Format
Return a JSON object with EXACTLY this structure:
{
  "needsUpdate": true/false,
  "reason": "brief explanation of what was changed and why",
  "options": [
    {
      "id": "<preserve existing option id>",
      "label": "...",
      "text": "...",
      "effects": [{ "targetMetricId": "...", "value": number, "duration": number, "probability": 1.0 }],
      "outcomeHeadline": "...",
      "outcomeSummary": "...",
      "outcomeContext": "...",
      "advisorFeedback": [{ "roleId": "role_xxx", "stance": "support|oppose|neutral|concerned", "feedback": "..." }]
    }
  ]
}

If the scenario already has three clearly distinct governance modes (not just hawk/dove intensity gradations), return needsUpdate=false and the original options unchanged.`;

function isAlreadyThreeMode(options: any[]): boolean {
  if (!options || options.length !== 3) return false;

  // Heuristic: check labels and text for mode indicators
  const allText = options.map(o => `${o.label || ''} ${o.text || ''}`).join(' ').toLowerCase();

  const institutionalIndicators = ['commission', 'task force', 'delegate', 'refer', 'convene', 'coalition', 'multilateral', 'parliament', 'legislature', 'judicial', 'court', 'independent', 'negotiate'];
  const patienceIndicators = ['pilot', 'phase', 'monitor', 'wait', 'deferred', 'conditional', 'tripwire', 'gradual', 'watchful', 'indirect', 'selective'];

  const hasInstitutional = institutionalIndicators.some(w => allText.includes(w));
  const hasPatience = patienceIndicators.some(w => allText.includes(w));

  return hasInstitutional && hasPatience;
}

async function repairScenario(id: string, data: any): Promise<{ updated: boolean; reason: string }> {
  const options = data.options || [];

  if (isAlreadyThreeMode(options)) {
    return { updated: false, reason: 'already three-mode' };
  }

  const snapshot = {
    title: data.title,
    description: data.description,
    bundle: data.metadata?.bundle,
    scopeTier: data.metadata?.scopeTier,
    primaryMetrics: options.flatMap((o: any) => (o.effects || []).map((e: any) => e.targetMetricId)),
    options: options.map((o: any) => ({
      id: o.id,
      label: o.label,
      text: o.text,
      effects: o.effects,
      outcomeHeadline: o.outcomeHeadline,
      outcomeSummary: o.outcomeSummary,
      outcomeContext: o.outcomeContext,
      advisorFeedback: (o.advisorFeedback || []).slice(0, 3),
    })),
  };

  const userContent = `Restructure the following scenario's options to follow the three governance modes (Direct Action, Institutional/Coalition, Strategic Patience). Preserve the core scenario theme and metrics domain. Keep the same scenario title and description.

SCENARIO:
${JSON.stringify(snapshot, null, 2)}`;

  const response = await callOpenAI(SYSTEM_PROMPT, userContent);
  let parsed: any;
  try {
    parsed = JSON.parse(response);
  } catch {
    return { updated: false, reason: `parse error: ${response.slice(0, 100)}` };
  }

  if (!parsed.needsUpdate || !parsed.options || parsed.options.length !== 3) {
    return { updated: false, reason: parsed.reason || 'no update needed' };
  }

  // Merge: preserve option IDs from existing options by position
  const updatedOptions = parsed.options.map((newOpt: any, idx: number) => {
    const existing = options[idx] || {};
    return {
      ...existing,
      id: existing.id || newOpt.id,
      label: newOpt.label,
      text: newOpt.text,
      effects: newOpt.effects,
      outcomeHeadline: newOpt.outcomeHeadline,
      outcomeSummary: newOpt.outcomeSummary,
      outcomeContext: newOpt.outcomeContext,
      advisorFeedback: newOpt.advisorFeedback,
      // preserve policyImplications if exists
      ...(existing.policyImplications ? { policyImplications: existing.policyImplications } : {}),
    };
  });

  if (!DRY_RUN) {
    await db.collection('scenarios').doc(id).update({
      options: updatedOptions,
      'metadata.optionModesRepaired': true,
      'metadata.optionModesRepairedAt': admin.firestore.Timestamp.now(),
    });
  }

  return { updated: true, reason: parsed.reason || 'restructured to three modes' };
}

async function main(): Promise<void> {
  console.log(`[repair-option-modes] ${DRY_RUN ? 'DRY RUN' : 'APPLY'} mode`);
  if (BUNDLE_FILTER) console.log(`[repair-option-modes] Bundle filter: ${BUNDLE_FILTER}`);
  console.log(`[repair-option-modes] Model: ${MODEL}\n`);

  let query: admin.firestore.Query = db.collection('scenarios')
    .where('is_active', '==', true);

  if (BUNDLE_FILTER) {
    query = query.where('metadata.bundle', '==', BUNDLE_FILTER);
  }

  const snap = await query.limit(LIMIT).get();
  const scenarios = snap.docs.map(d => ({ id: d.id, data: d.data() }));

  console.log(`[repair-option-modes] Found ${scenarios.length} scenarios to process\n`);

  let updated = 0;
  let skipped = 0;
  let errors = 0;

  for (let i = 0; i < scenarios.length; i += BATCH_SIZE) {
    const batch = scenarios.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(
      batch.map(async ({ id, data }) => {
        try {
          const result = await repairScenario(id, data);
          return { id, ...result, error: null };
        } catch (err) {
          return { id, updated: false, reason: 'error', error: String(err) };
        }
      })
    );

    for (const r of results) {
      const title = scenarios.find(s => s.id === r.id)?.data?.title || r.id;
      if (r.error) {
        console.error(`  ✗ [${r.id}] "${title}" — ERROR: ${r.error}`);
        errors++;
      } else if (r.updated) {
        console.log(`  ✓ [${r.id}] "${title}" — ${DRY_RUN ? 'WOULD UPDATE' : 'UPDATED'}: ${r.reason}`);
        updated++;
      } else {
        console.log(`  · [${r.id}] "${title}" — skipped: ${r.reason}`);
        skipped++;
      }
    }

    const progress = Math.min(i + BATCH_SIZE, scenarios.length);
    console.log(`\n  Progress: ${progress}/${scenarios.length}\n`);

    // Rate limit pause between batches
    if (i + BATCH_SIZE < scenarios.length) {
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  console.log(`\n[repair-option-modes] Complete:`);
  console.log(`  Updated: ${updated}`);
  console.log(`  Skipped: ${skipped}`);
  console.log(`  Errors:  ${errors}`);
  if (DRY_RUN) {
    console.log('\nDry run — pass --apply to write changes.');
  }
}

main().catch(console.error).finally(() => process.exit(0));
