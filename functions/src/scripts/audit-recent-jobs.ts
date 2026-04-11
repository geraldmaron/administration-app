/**
 * Recent Jobs Linguistic Audit
 *
 * Queries the last N generation jobs from Firestore, loads all scenarios
 * produced by each job, runs the three linguistic validators over every
 * text field, and emits a JSON report to stdout.
 *
 * Usage:
 *   npx tsx functions/src/scripts/audit-recent-jobs.ts
 *   npx tsx functions/src/scripts/audit-recent-jobs.ts --limit 10
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

const DEFAULT_JOB_LIMIT = 5;

function parseLimit(): number {
  const idx = process.argv.indexOf('--limit');
  if (idx !== -1 && process.argv[idx + 1]) {
    const n = parseInt(process.argv[idx + 1], 10);
    if (!Number.isNaN(n) && n > 0) return n;
  }
  return DEFAULT_JOB_LIMIT;
}

const JOB_LIMIT = parseLimit();

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

interface JobSummary {
  jobId: string;
  status: string;
  createdAt: string;
  bundles: string[];
  count: number;
  scenarioIds: string[];
  findingsTotal: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  findings: ScenarioFinding[];
}

interface ScenarioFinding extends LinguisticFinding {
  scenarioId: string;
  optionId?: string;
}

interface JobsAuditReport {
  generatedAt: string;
  jobsScanned: number;
  scenariosScanned: number;
  findingsTotal: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  topFailureModes: FailureMode[];
  jobs: JobSummary[];
}

interface FailureMode {
  pattern: string;
  count: number;
}

// ---------------------------------------------------------------------------
// Bootstrap
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
      process.stderr.write('[audit-recent-jobs] No Firebase credentials found.\n');
      process.exit(1);
    }
  }
  return admin;
}

// ---------------------------------------------------------------------------
// Validators
// ---------------------------------------------------------------------------

function runAllValidators(
  text: string,
  field: string,
  countryNames: string[],
): LinguisticFinding[] {
  const findings: LinguisticFinding[] = [
    ...detectDoubleArticle(text, field),
    ...validateSentenceStructure(text, field),
  ];
  for (const name of countryNames) {
    findings.push(...validateDeterminer(text, name, field));
  }
  return findings;
}

function auditScenarioDoc(
  scenarioId: string,
  doc: FirebaseFirestore.DocumentData,
  countryNamesByScopeKey: Record<string, string>,
): ScenarioFinding[] {
  const findings: ScenarioFinding[] = [];

  const applicableCountryIds: string[] =
    doc.applicability?.applicableCountryIds ?? [];
  const scopeKey: string = doc.metadata?.scopeKey ?? '';
  const countryKeys = applicableCountryIds.length > 0 ? applicableCountryIds : (scopeKey && scopeKey !== 'universal' ? [scopeKey] : []);
  const countryNames = countryKeys.map((k) => countryNamesByScopeKey[k] ?? k).filter(Boolean);

  function push(f: LinguisticFinding, optionId?: string): void {
    findings.push({ ...f, scenarioId, ...(optionId ? { optionId } : {}) });
  }

  for (const field of TEXT_FIELDS_SCENARIO) {
    const value = doc[field];
    if (typeof value !== 'string' || !value.trim()) continue;
    for (const f of runAllValidators(value, field, countryNames)) push(f);
  }

  const options: unknown[] = Array.isArray(doc.options) ? doc.options : [];
  for (const opt of options) {
    if (!opt || typeof opt !== 'object') continue;
    const o = opt as Record<string, unknown>;
    const optionId = typeof o.id === 'string' ? o.id : undefined;
    for (const field of TEXT_FIELDS_OPTION) {
      const value = o[field];
      if (typeof value !== 'string' || !value.trim()) continue;
      for (const f of runAllValidators(value, field, countryNames)) push(f, optionId);
    }
    const advisorFeedback = Array.isArray(o.advisorFeedback) ? o.advisorFeedback : [];
    for (const fb of advisorFeedback) {
      if (!fb || typeof fb !== 'object') continue;
      const fbRec = fb as Record<string, unknown>;
      if (typeof fbRec.feedback === 'string' && fbRec.feedback.trim()) {
        for (const f of runAllValidators(fbRec.feedback, 'advisor.feedback', countryNames)) push(f, optionId);
      }
    }
  }

  return findings;
}

// ---------------------------------------------------------------------------
// Failure mode aggregation
// ---------------------------------------------------------------------------

function classifyFailureMode(issue: string): string {
  if (issue.includes('Double article')) return 'double-article';
  if (issue.includes('lowercase')) return 'lowercase-sentence-start';
  if (issue.includes('dangling')) return 'dangling-word-at-sentence-end';
  if (issue.includes('Orphan')) return 'orphan-token-placeholder';
  if (issue.includes('requires "the"') && issue.includes('mid-sentence')) return 'missing-the-mid-sentence';
  if (issue.includes('requires "the"') && issue.includes('sentence-initial')) return 'missing-the-sentence-initial';
  if (issue.includes('does not conventionally use')) return 'spurious-the';
  return 'other';
}

function aggregateFailureModes(findings: ScenarioFinding[]): FailureMode[] {
  const counts = new Map<string, number>();
  for (const f of findings) {
    const mode = classifyFailureMode(f.issue);
    counts.set(mode, (counts.get(mode) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([pattern, count]) => ({ pattern, count }));
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const admin = await initializeFirebase();
  const db = admin.firestore();

  process.stderr.write(
    `[audit-recent-jobs] Querying last ${JOB_LIMIT} generation jobs…\n`,
  );

  const [jobsSnap, countriesSnap] = await Promise.all([
    db.collection('generation_jobs')
      .orderBy('requestedAt', 'desc')
      .limit(JOB_LIMIT)
      .get(),
    db.collection('countries').get(),
  ]);

  const countryNamesByScopeKey: Record<string, string> = {};
  for (const doc of countriesSnap.docs) {
    const data = doc.data();
    if (typeof data.name === 'string') {
      countryNamesByScopeKey[doc.id] = data.name;
    }
  }

  const jobSummaries: JobSummary[] = [];
  let totalScenariosScanned = 0;
  const allFindings: ScenarioFinding[] = [];

  for (const jobDoc of jobsSnap.docs) {
    const jobData = jobDoc.data();
    const jobId = jobDoc.id;
    const scenarioIds: string[] = [
      ...(Array.isArray(jobData.savedScenarioIds) ? jobData.savedScenarioIds : []),
      ...(Array.isArray(jobData.createdScenarioIds) ? jobData.createdScenarioIds : []),
    ].filter((v, i, arr) => arr.indexOf(v) === i);

    process.stderr.write(
      `  job ${jobId.slice(0, 12)}… — ${scenarioIds.length} scenario(s) linked\n`,
    );

    const jobFindings: ScenarioFinding[] = [];

    if (scenarioIds.length > 0) {
      const CHUNK = 10;
      for (let i = 0; i < scenarioIds.length; i += CHUNK) {
        const chunk = scenarioIds.slice(i, i + CHUNK);
        const scenarioSnap = await db.collection('scenarios')
          .where(admin.firestore.FieldPath.documentId(), 'in', chunk)
          .get();

        for (const doc of scenarioSnap.docs) {
          const findings = auditScenarioDoc(doc.id, doc.data(), countryNamesByScopeKey);
          jobFindings.push(...findings);
          allFindings.push(...findings);
          totalScenariosScanned++;
        }
      }
    }

    const requestedAt = jobData.requestedAt?.toDate?.()?.toISOString?.()
      ?? (typeof jobData.requestedAt === 'string' ? jobData.requestedAt : '');

    jobSummaries.push({
      jobId,
      status: jobData.status ?? 'unknown',
      createdAt: requestedAt,
      bundles: Array.isArray(jobData.bundles) ? jobData.bundles : [],
      count: typeof jobData.count === 'number' ? jobData.count : 0,
      scenarioIds,
      findingsTotal: jobFindings.length,
      criticalCount: jobFindings.filter((f) => f.severity === 'critical').length,
      highCount: jobFindings.filter((f) => f.severity === 'high').length,
      mediumCount: jobFindings.filter((f) => f.severity === 'medium').length,
      findings: jobFindings,
    });
  }

  const report: JobsAuditReport = {
    generatedAt: new Date().toISOString(),
    jobsScanned: jobsSnap.size,
    scenariosScanned: totalScenariosScanned,
    findingsTotal: allFindings.length,
    criticalCount: allFindings.filter((f) => f.severity === 'critical').length,
    highCount: allFindings.filter((f) => f.severity === 'high').length,
    mediumCount: allFindings.filter((f) => f.severity === 'medium').length,
    topFailureModes: aggregateFailureModes(allFindings),
    jobs: jobSummaries,
  };

  process.stdout.write(JSON.stringify(report, null, 2));
  process.stdout.write('\n');

  process.stderr.write(
    `\n[audit-recent-jobs] Done — ${report.jobsScanned} jobs, ${report.scenariosScanned} scenarios, ` +
    `${report.findingsTotal} findings ` +
    `(${report.criticalCount} critical / ${report.highCount} high / ${report.mediumCount} medium)\n`,
  );

  if (report.topFailureModes.length > 0) {
    process.stderr.write('\nTop failure modes:\n');
    for (const mode of report.topFailureModes) {
      process.stderr.write(`  ${mode.pattern}: ${mode.count}\n`);
    }
  }
}

if (require.main === module) {
  main().catch((err) => {
    process.stderr.write(`[audit-recent-jobs] Fatal: ${String(err)}\n`);
    process.exit(1);
  });
}
