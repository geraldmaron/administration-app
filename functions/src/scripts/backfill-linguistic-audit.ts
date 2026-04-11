/**
 * Backfill Linguistic Audit
 *
 * Reads all scenarios from Firestore, runs the three linguistic validators
 * (validateDeterminer, detectDoubleArticle, validateSentenceStructure) across
 * every text field, and emits a JSON report to stdout.
 *
 * Dry-run by default. Pass --apply to write repaired documents back to Firestore
 * (only critical findings that have an unambiguous suggestedFix are patched).
 *
 * Usage:
 *   npx tsx functions/src/scripts/backfill-linguistic-audit.ts
 *   npx tsx functions/src/scripts/backfill-linguistic-audit.ts --apply
 */

import * as path from 'path';
import * as fs from 'fs';
import {
  validateDeterminer,
  detectDoubleArticle,
  validateSentenceStructure,
  type LinguisticFinding,
} from '../shared/linguistic-validator';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const APPLY = process.argv.includes('--apply');

const TEXT_FIELDS_SCENARIO: ReadonlyArray<string> = ['title', 'description'];

const TEXT_FIELDS_OPTION: ReadonlyArray<string> = [
  'text',
  'outcomeHeadline',
  'outcomeSummary',
  'outcomeContext',
];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AuditFinding extends LinguisticFinding {
  scenarioId: string;
  countryIds: string[];
  optionId?: string;
}

interface AuditReport {
  generatedAt: string;
  mode: 'dry-run' | 'apply';
  scenariosScanned: number;
  findingsTotal: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  patchedCount: number;
  findings: AuditFinding[];
}

// ---------------------------------------------------------------------------
// Bootstrap helpers (mirrors pattern from migrate-token-renames.ts)
// ---------------------------------------------------------------------------

function loadEnvFromFile(): void {
  const envPaths = ['.env.cli', '.env.local', '.env'].map(
    (f) => path.join(__dirname, '..', '..', f),
  );
  for (const envPath of envPaths) {
    if (!fs.existsSync(envPath)) continue;
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
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

loadEnvFromFile();

const serviceAccountPath = path.join(__dirname, '..', '..', '..', 'serviceAccountKey.json');

async function initializeFirebase(): Promise<typeof import('firebase-admin')> {
  const admin = await import('firebase-admin');
  if (!admin.apps.length) {
    if (fs.existsSync(serviceAccountPath)) {
      const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: 'the-administration-3a072',
      });
    } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      admin.initializeApp({ projectId: 'the-administration-3a072' });
    } else {
      process.stderr.write('[backfill-linguistic-audit] No Firebase credentials found.\n');
      process.exit(1);
    }
  }
  return admin;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function extractCountryNames(doc: FirebaseFirestore.DocumentData): string[] {
  const names: string[] = [];

  const applicableCountryIds: string[] =
    doc.applicability?.applicableCountryIds ?? [];
  if (applicableCountryIds.length > 0) {
    return applicableCountryIds; // resolved later when we have the catalog
  }

  if (doc.metadata?.scopeKey && doc.metadata.scopeKey !== 'universal') {
    names.push(doc.metadata.scopeKey);
  }

  return names;
}

function runValidatorsOnText(
  text: string,
  field: string,
  countryNames: string[],
): LinguisticFinding[] {
  const findings: LinguisticFinding[] = [];
  findings.push(...detectDoubleArticle(text, field));
  findings.push(...validateSentenceStructure(text, field));
  for (const name of countryNames) {
    findings.push(...validateDeterminer(text, name, field));
  }
  return findings;
}

function auditScenario(
  scenarioId: string,
  doc: FirebaseFirestore.DocumentData,
  countryNamesByScopeKey: Record<string, string>,
): AuditFinding[] {
  const findings: AuditFinding[] = [];

  const rawCountryKeys = extractCountryNames(doc);
  const countryNames: string[] = rawCountryKeys
    .map((k) => countryNamesByScopeKey[k] ?? k)
    .filter(Boolean);

  const countryIds = rawCountryKeys;

  function push(f: LinguisticFinding, optionId?: string): void {
    findings.push({ ...f, scenarioId, countryIds, ...(optionId ? { optionId } : {}) });
  }

  for (const field of TEXT_FIELDS_SCENARIO) {
    const value = doc[field];
    if (typeof value !== 'string' || !value.trim()) continue;
    for (const f of runValidatorsOnText(value, field, countryNames)) push(f);
  }

  const options: unknown[] = Array.isArray(doc.options) ? doc.options : [];
  for (const opt of options) {
    if (!opt || typeof opt !== 'object') continue;
    const o = opt as Record<string, unknown>;
    const optionId = typeof o.id === 'string' ? o.id : undefined;

    for (const field of TEXT_FIELDS_OPTION) {
      const value = o[field];
      if (typeof value !== 'string' || !value.trim()) continue;
      for (const f of runValidatorsOnText(value, field, countryNames)) push(f, optionId);
    }

    const advisorFeedback: unknown[] = Array.isArray(o.advisorFeedback)
      ? o.advisorFeedback
      : [];
    for (const fb of advisorFeedback) {
      if (!fb || typeof fb !== 'object') continue;
      const fbRec = fb as Record<string, unknown>;
      if (typeof fbRec.feedback === 'string' && fbRec.feedback.trim()) {
        for (const f of runValidatorsOnText(fbRec.feedback, `option.advisorFeedback`, countryNames)) {
          push(f, optionId);
        }
      }
    }
  }

  return findings;
}

// ---------------------------------------------------------------------------
// Repair helpers
// ---------------------------------------------------------------------------

function applyTextRepair(original: string, finding: LinguisticFinding): string {
  if (!finding.suggestedFix) return original;
  if (finding.issue.includes('Double article')) {
    const doubled = finding.issue.match(/"([^"]+)"/)?.[1];
    if (!doubled) return original;
    return original.replace(doubled, finding.suggestedFix);
  }
  return original;
}

async function patchScenario(
  docRef: FirebaseFirestore.DocumentReference,
  doc: FirebaseFirestore.DocumentData,
  findings: AuditFinding[],
): Promise<boolean> {
  const actionable = findings.filter(
    (f) => f.suggestedFix && (f.severity === 'critical' || f.severity === 'high'),
  );
  if (actionable.length === 0) return false;

  const patch: Record<string, unknown> = {};
  let changed = false;

  const topLevel = actionable.filter((f) => !f.optionId);
  for (const finding of topLevel) {
    const current = doc[finding.field];
    if (typeof current !== 'string') continue;
    const repaired = applyTextRepair(current, finding);
    if (repaired !== current) {
      patch[finding.field] = repaired;
      changed = true;
    }
  }

  const byOption = actionable.filter((f) => f.optionId);
  if (byOption.length > 0) {
    const options: unknown[] = Array.isArray(doc.options) ? [...doc.options] : [];
    let optionsChanged = false;
    for (const finding of byOption) {
      const idx = options.findIndex(
        (o) => o && typeof o === 'object' && (o as Record<string, unknown>).id === finding.optionId,
      );
      if (idx === -1) continue;
      const opt = { ...(options[idx] as Record<string, unknown>) };
      const current = opt[finding.field];
      if (typeof current !== 'string') continue;
      const repaired = applyTextRepair(current, finding);
      if (repaired !== current) {
        opt[finding.field] = repaired;
        options[idx] = opt;
        optionsChanged = true;
        changed = true;
      }
    }
    if (optionsChanged) patch['options'] = options;
  }

  if (!changed) return false;
  await docRef.update(patch);
  return true;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const admin = await initializeFirebase();
  const db = admin.firestore();

  process.stderr.write(
    `[backfill-linguistic-audit] ${APPLY ? 'APPLY' : 'DRY RUN'} mode — scanning scenarios collection\n`,
  );

  const [scenariosSnap, countriesSnap] = await Promise.all([
    db.collection('scenarios').get(),
    db.collection('countries').get(),
  ]);

  const countryNamesByScopeKey: Record<string, string> = {};
  for (const doc of countriesSnap.docs) {
    const data = doc.data();
    if (typeof data.name === 'string') {
      countryNamesByScopeKey[doc.id] = data.name;
    }
  }

  const allFindings: AuditFinding[] = [];
  let patchedCount = 0;

  for (const doc of scenariosSnap.docs) {
    const data = doc.data();
    const findings = auditScenario(doc.id, data, countryNamesByScopeKey);
    allFindings.push(...findings);

    if (APPLY && findings.length > 0) {
      const patched = await patchScenario(doc.ref, data, findings);
      if (patched) patchedCount++;
    }
  }

  const report: AuditReport = {
    generatedAt: new Date().toISOString(),
    mode: APPLY ? 'apply' : 'dry-run',
    scenariosScanned: scenariosSnap.size,
    findingsTotal: allFindings.length,
    criticalCount: allFindings.filter((f) => f.severity === 'critical').length,
    highCount: allFindings.filter((f) => f.severity === 'high').length,
    mediumCount: allFindings.filter((f) => f.severity === 'medium').length,
    patchedCount,
    findings: allFindings,
  };

  process.stdout.write(JSON.stringify(report, null, 2));
  process.stdout.write('\n');

  process.stderr.write(
    `\n[backfill-linguistic-audit] Done — ${report.scenariosScanned} scenarios, ` +
    `${report.findingsTotal} findings ` +
    `(${report.criticalCount} critical / ${report.highCount} high / ${report.mediumCount} medium)` +
    (APPLY ? `, ${patchedCount} patched` : '') +
    '\n',
  );
}

if (require.main === module) {
  main().catch((err) => {
    process.stderr.write(`[backfill-linguistic-audit] Fatal: ${String(err)}\n`);
    process.exit(1);
  });
}
