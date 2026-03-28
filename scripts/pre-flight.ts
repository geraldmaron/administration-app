/**
 * Pre-flight validation script.
 * Checks Firestore connectivity, generation_config, bundle config,
 * prompt hash sync, and golden example counts before a generation run.
 *
 * Usage: npx tsx scripts/pre-flight.ts
 * Exit 0 = all checks passed. Exit 1 = one or more failures.
 */
// @ts-nocheck
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serviceAccount = require(path.join(__dirname, '..', 'serviceAccountKey.json'));
const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'the-administration-3a072',
  });
}

const db = admin.firestore();

const PROMPTS_DIR = path.join(__dirname, '..', 'functions', 'src', 'prompts');
const PROMPT_MAP = [
  { name: 'architect_drafter', file: 'architect.prompt.md' },
  { name: 'drafter_details', file: 'drafter.prompt.md' },
  { name: 'reflection', file: 'reflection.prompt.md' },
];

function sha256(text: string): string {
  return crypto.createHash('sha256').update(text).digest('hex').slice(0, 12);
}

type CheckResult = { label: string; pass: boolean; detail?: string };

async function checkFirestoreConnectivity(): Promise<CheckResult> {
  try {
    await db.collection('world_state').doc('generation_config').get();
    return { label: 'Firestore connectivity', pass: true };
  } catch (err: any) {
    return { label: 'Firestore connectivity', pass: false, detail: err.message };
  }
}

async function checkGenerationConfig(): Promise<CheckResult[]> {
  const snap = await db.collection('world_state').doc('generation_config').get();
  if (!snap.exists) {
    return [{ label: 'generation_config exists', pass: false, detail: 'Document not found — ensure generation_config is provisioned in Firestore' }];
  }
  const cfg = snap.data() ?? {};
  const results: CheckResult[] = [
    { label: 'generation_config exists', pass: true },
    {
      label: 'audit_pass_threshold configured',
      pass: typeof cfg.audit_pass_threshold === 'number' && Number.isFinite(cfg.audit_pass_threshold),
      detail: typeof cfg.audit_pass_threshold === 'number' ? `Current: ${cfg.audit_pass_threshold}` : 'Not set',
    },
    {
      label: 'llm_repair_enabled = true',
      pass: cfg.llm_repair_enabled === true,
      detail: cfg.llm_repair_enabled === true ? undefined : `Current value: ${cfg.llm_repair_enabled}`,
    },
    {
      label: 'max_llm_repair_attempts >= 2',
      pass: typeof cfg.max_llm_repair_attempts === 'number' && cfg.max_llm_repair_attempts >= 2,
      detail: typeof cfg.max_llm_repair_attempts === 'number' ? `Current: ${cfg.max_llm_repair_attempts}` : 'Not set',
    },
    {
      label: 'content_quality_gate_enabled = true',
      pass: cfg.content_quality_gate_enabled === true,
      detail: cfg.content_quality_gate_enabled === true ? undefined : `Current value: ${cfg.content_quality_gate_enabled}`,
    },
    {
      label: 'narrative_review_enabled = true',
      pass: cfg.narrative_review_enabled === true,
      detail: cfg.narrative_review_enabled === true ? undefined : `Current value: ${cfg.narrative_review_enabled}`,
    },
  ];
  return results;
}

async function checkCountryCatalog(): Promise<CheckResult[]> {
  const countriesSnap = await db.collection('countries').get();
  const countries = countriesSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

  if (countries.length === 0) {
    return [
      {
        label: 'countries collection available',
        pass: false,
        detail: 'countries collection is empty.',
      },
    ];
  }

  const missingGeopolitical = countries.filter((country) => !country.geopolitical).map((country) => country.id);
  const missingGameplay = countries.filter((country) => !country.gameplay).map((country) => country.id);

  return [
    {
      label: 'countries collection available',
      pass: true,
      detail: `${countries.length} country entries`,
    },
    {
      label: 'countries.geopolitical populated',
      pass: missingGeopolitical.length === 0,
      detail: missingGeopolitical.length === 0 ? undefined : `Missing on ${missingGeopolitical.length} countries: ${missingGeopolitical.slice(0, 10).join(', ')}${missingGeopolitical.length > 10 ? ', ...' : ''}`,
    },
    {
      label: 'countries.gameplay populated',
      pass: missingGameplay.length === 0,
      detail: missingGameplay.length === 0 ? undefined : `Missing on ${missingGameplay.length} countries: ${missingGameplay.slice(0, 10).join(', ')}${missingGameplay.length > 10 ? ', ...' : ''}`,
    },
  ];
}

async function checkBundleConfig(): Promise<CheckResult[]> {
  const snap = await db.collection('world_state').doc('bundles').get();
  if (!snap.exists) {
    return [{ label: 'world_state/bundles exists', pass: false, detail: 'Document not found — run seed scripts' }];
  }
  const data = snap.data() ?? {};
  const standardIds: string[] = Array.isArray(data.standard_bundle_ids) ? data.standard_bundle_ids : [];
  const allIds: string[] = Array.isArray(data.all_bundle_ids) ? data.all_bundle_ids : [];
  return [
    { label: 'world_state/bundles exists', pass: true },
    {
      label: 'standard_bundle_ids populated',
      pass: standardIds.length > 0,
      detail: standardIds.length > 0 ? `${standardIds.length} bundles: ${standardIds.join(', ')}` : 'Empty array',
    },
    {
      label: 'all_bundle_ids populated',
      pass: allIds.length > 0,
      detail: allIds.length > 0 ? `${allIds.length} bundles` : 'Empty array',
    },
  ];
}

async function checkPromptSync(): Promise<CheckResult[]> {
  const results: CheckResult[] = [];

  for (const { name, file } of PROMPT_MAP) {
    const filePath = path.join(PROMPTS_DIR, file);
    if (!fs.existsSync(filePath)) {
      results.push({ label: `${name}: local file exists`, pass: false, detail: `${filePath} not found` });
      continue;
    }
    const localContent = fs.readFileSync(filePath, 'utf8');
    const localHash = sha256(localContent);

    const snap = await db.collection('prompt_templates')
      .where('name', '==', name)
      .where('active', '==', true)
      .limit(1)
      .get();

    if (snap.empty) {
      results.push({
        label: `${name}: active Firestore template exists`,
        pass: false,
        detail: 'No active template in Firestore — ensure prompt templates are provisioned',
      });
      continue;
    }

    const firestoreContent: string = snap.docs[0].data()?.sections?.constraints ?? '';
    const firestoreHash = sha256(firestoreContent);

    const inSync = localHash === firestoreHash;
    results.push({
      label: `${name}: local ↔ Firestore in sync`,
      pass: inSync,
      detail: inSync
        ? `hash ${localHash}`
        : `local ${localHash} ≠ firestore ${firestoreHash} — prompt templates are out of sync`,
    });
  }

  return results;
}

async function checkGoldenExamples(): Promise<CheckResult[]> {
  const snap = await db.collection('training_scenarios').limit(1).get();
  const count = snap.size;
  return [
    {
      label: 'training_scenarios has golden examples',
      pass: count > 0,
      detail: count > 0
        ? `${count} doc(s) sampled (full count not fetched)`
        : 'Empty — generation will be cold-start (no few-shot). Provision golden examples in training_scenarios.',
    },
  ];
}

async function main() {
  console.log('🛫  Pre-flight check\n');

  const allChecks: CheckResult[] = [];

  const connectivity = await checkFirestoreConnectivity();
  allChecks.push(connectivity);
  if (!connectivity.pass) {
    console.log(`  ❌  ${connectivity.label}: ${connectivity.detail}`);
    console.log('\n[ABORT] Cannot reach Firestore — check credentials and network.');
    process.exit(1);
  }

  const [configChecks, bundleChecks, promptChecks, goldenChecks, countryChecks] = await Promise.all([
    checkGenerationConfig(),
    checkBundleConfig(),
    checkPromptSync(),
    checkGoldenExamples(),
    checkCountryCatalog(),
  ]);

  for (const check of [...configChecks, ...bundleChecks, ...promptChecks, ...goldenChecks, ...countryChecks]) {
    allChecks.push(check);
  }

  for (const check of allChecks) {
    const icon = check.pass ? '  ✅' : '  ❌';
    const detail = check.detail ? `  (${check.detail})` : '';
    console.log(`${icon}  ${check.label}${detail}`);
  }

  const failures = allChecks.filter((c) => !c.pass);
  console.log(`\n${failures.length === 0 ? '✅  All checks passed — ready to generate.' : `❌  ${failures.length} check(s) failed — fix before generating.`}`);
  process.exit(failures.length > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
