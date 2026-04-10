/**
 * Batch audit and auto-fix tool for existing scenarios in Firestore.
 *
 * Applies deterministic text fixes (currency, GDP-as-amount, ruling-party tokenization,
 * article-form tokens, double-space, orphaned punctuation) then regenerates scenarios
 * that can't be fixed algorithmically.
 *
 * Run from web/functions/:
 *   pnpm tsx src/tools/audit-and-fix-scenarios.ts --mode=dry-run
 *   pnpm tsx src/tools/audit-and-fix-scenarios.ts --mode=apply --bundles=bundle_infrastructure,bundle_corruption --countries=us
 */

import * as admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { v4 as uuidv4 } from 'uuid';
import { auditScenario, scoreScenario, type BundleScenario } from '../lib/audit-rules';
import { initializeAuditConfig } from '../lib/audit-rules';
import { applyDeterministicTextFixes } from '../shared/scenario-repair';
import { generateScenarios } from '../scenario-engine';
import { ALL_BUNDLE_IDS } from '../data/schemas/bundleIds';


type Mode = 'dry-run' | 'apply';

interface RunOptions {
  mode: Mode;
  bundleIds?: string[];
  countryIds?: string[];
}

interface ScenarioFixRecord {
  id: string;
  bundle?: string;
  issuesBefore: string[];
  issuesAfter: string[];
  scoreBefore: number;
  scoreAfter: number;
  action: 'tokenResolved' | 'fixedInPlace' | 'regenerated' | 'skipped';
}

interface AuditRunSummary {
  runId: string;
  mode: Mode;
  startedAt: string;
  completedAt: string;
  bundleFilter: string[] | 'all';
  countryFilter: string[] | 'all';
  totals: {
    scanned: number;
    tokenResolved: number;
    fixedInPlace: number;
    regenerated: number;
    skipped: number;
  };
  scenarios: ScenarioFixRecord[];
}

function parseArgs(): RunOptions {
  const argv = process.argv.slice(2);
  const getFlag = (name: string): string | undefined => {
    const prefix = `--${name}=`;
    const direct = argv.find((arg) => arg.startsWith(prefix));
    if (direct) return direct.slice(prefix.length);
    const idx = argv.indexOf(`--${name}`);
    if (idx !== -1 && argv[idx + 1]) return argv[idx + 1];
    return undefined;
  };

  const mode = (getFlag('mode') as Mode | undefined) ?? 'dry-run';
  const bundles = getFlag('bundles');
  const countries = getFlag('countries');

  return {
    mode,
    bundleIds: bundles ? bundles.split(',').map((b) => b.trim()).filter(Boolean) : undefined,
    countryIds: countries ? countries.split(',').map((c) => c.trim().toLowerCase()).filter(Boolean) : undefined,
  };
}

function classifyIssues(issues: ReturnType<typeof auditScenario>): {
  hasCurrencyIssue: boolean;
  hasGdpAsAmount: boolean;
  hasRulingPartyApplicability: boolean;
  hasArticleFormIssue: boolean;
  hasDoubleSpace: boolean;
  hasOrphanedPunctuation: boolean;
  hasErrors: boolean;
} {
  let hasCurrencyIssue = false;
  let hasGdpAsAmount = false;
  let hasRulingPartyApplicability = false;
  let hasArticleFormIssue = false;
  let hasDoubleSpace = false;
  let hasOrphanedPunctuation = false;
  let hasErrors = false;
  for (const issue of issues) {
    if (issue.rule === 'hard-coded-currency') hasCurrencyIssue = true;
    if (issue.rule === 'gdp-as-amount') hasGdpAsAmount = true;
    if (issue.rule === 'ruling-party-applicability') hasRulingPartyApplicability = true;
    if (issue.rule === 'article-form-missing') hasArticleFormIssue = true;
    if (issue.rule === 'hardcoded-the-before-token') hasArticleFormIssue = true;
    if (issue.rule === 'double-space') hasDoubleSpace = true;
    if (issue.rule === 'orphaned-punctuation') hasOrphanedPunctuation = true;
    if (issue.severity === 'error') hasErrors = true;
  }
  return { hasCurrencyIssue, hasGdpAsAmount, hasRulingPartyApplicability, hasArticleFormIssue, hasDoubleSpace, hasOrphanedPunctuation, hasErrors };
}


async function regenerateScenario(original: BundleScenario): Promise<BundleScenario | null> {
  const bundle = (original.metadata?.bundle as any) || 'general';
  try {
    const result = await generateScenarios({
      mode: 'manual',
      bundle,
      count: 1,
      applicable_countries:
        Array.isArray(original.applicability?.applicableCountryIds) &&
        original.applicability!.applicableCountryIds!.length > 0
          ? (original.applicability!.applicableCountryIds as string[])
          : undefined,
      distributionConfig: { mode: 'fixed', loopLength: 1 },
    } as any);
    if (!result || result.scenarios.length === 0) {
      console.warn(`[AuditFix] Regeneration produced no scenarios for ${original.id}`);
      return null;
    }
    const replacement = result.scenarios[0];
    replacement.id = original.id;
    const originalApplicableCountries =
      Array.isArray(original.applicability?.applicableCountryIds) &&
      original.applicability!.applicableCountryIds!.length > 0
        ? (original.applicability!.applicableCountryIds as string[])
        : undefined;
    replacement.metadata = {
      ...replacement.metadata,
      bundle,
      severity: original.metadata?.severity ?? replacement.metadata?.severity,
      difficulty: original.metadata?.difficulty ?? replacement.metadata?.difficulty,
    };
    if (originalApplicableCountries) {
      replacement.applicability = {
        requires: replacement.applicability?.requires ?? {},
        metricGates: replacement.applicability?.metricGates ?? [],
        ...replacement.applicability,
        applicableCountryIds: originalApplicableCountries,
      };
    }
    return replacement;
  } catch (err: any) {
    console.error(`[AuditFix] Regeneration failed for ${original.id}:`, err.message);
    return null;
  }
}

async function run() {
  const opts = parseArgs();
  console.log('[AuditFix] Options:', opts);

  if (!admin.apps.length) {
    admin.initializeApp();
  }
  const db = admin.firestore();
  await initializeAuditConfig(db);

  const runId = uuidv4();
  const startedAt = new Date().toISOString();

  const summary: AuditRunSummary = {
    runId,
    mode: opts.mode,
    startedAt,
    completedAt: '',
    bundleFilter: opts.bundleIds && opts.bundleIds.length > 0 ? opts.bundleIds : 'all',
    countryFilter: opts.countryIds && opts.countryIds.length > 0 ? opts.countryIds : 'all',
    totals: { scanned: 0, tokenResolved: 0, fixedInPlace: 0, regenerated: 0, skipped: 0 },
    scenarios: [],
  };

  const bundles = opts.bundleIds && opts.bundleIds.length > 0 ? opts.bundleIds : ALL_BUNDLE_IDS;

  for (const bundle of bundles) {
    console.log(`[AuditFix] Scanning bundle: ${bundle}`);
    const snap = await db.collection('scenarios').where('metadata.bundle', '==', bundle).get();
    for (const doc of snap.docs) {
      const data = doc.data() as any;
      const scenario = data as BundleScenario;

      if (opts.countryIds && opts.countryIds.length > 0) {
        const ac = scenario.applicability?.applicableCountryIds;
        if (Array.isArray(ac)) {
          const matches = ac.some((c) => opts.countryIds!.includes(c.toLowerCase()));
          if (!matches) {
            continue;
          }
        }
      }

      summary.totals.scanned += 1;
      const issues = auditScenario(scenario, bundle, false);
      const scoreBefore = scoreScenario(issues);

      const flags = classifyIssues(issues);
      const issuesBefore = issues.map((i) => `${i.severity}:${i.rule}`);

      let action: ScenarioFixRecord['action'] = 'tokenResolved';
      let updatedScenario: BundleScenario | null = null;

      if (
        !flags.hasCurrencyIssue &&
        !flags.hasGdpAsAmount &&
        !flags.hasRulingPartyApplicability &&
        !flags.hasArticleFormIssue &&
        !flags.hasDoubleSpace &&
        !flags.hasOrphanedPunctuation &&
        !flags.hasErrors
      ) {
        action = 'tokenResolved';
      } else {
        // Try deterministic text fixes first.
        const { updated, changed } = applyDeterministicTextFixes(scenario);
        if (changed) {
          const postIssues = auditScenario(updated, bundle, false);
          const postScore = scoreScenario(postIssues);
          const hasPostErrors = postIssues.some((i) => i.severity === 'error');
          // Always save deterministic fixes as long as they introduce no new errors.
          // Mechanical token replacement/spacing fixes are correctness improvements
          // regardless of whether overall quality score reaches 70.
          if (!hasPostErrors) {
            action = postScore >= 70 ? 'fixedInPlace' : 'tokenResolved';
            updatedScenario = updated;
          }
        }

        // If deterministic fixes failed, fall back to regeneration.
        if (!updatedScenario) {
          const regenerated = await regenerateScenario(scenario);
          if (regenerated) {
            const postIssues = auditScenario(regenerated, bundle, false);
            const postScore = scoreScenario(postIssues);
            const hasPostErrors = postIssues.some((i) => i.severity === 'error');
            if (!hasPostErrors && postScore >= 70) {
              action = 'regenerated';
              updatedScenario = regenerated;
            } else {
              action = 'skipped';
            }
          } else {
            action = 'skipped';
          }
        }
      }

      let issuesAfter: string[] = issuesBefore;
      let scoreAfter = scoreBefore;

      if (updatedScenario) {
        const postIssues = auditScenario(updatedScenario, bundle, false);
        issuesAfter = postIssues.map((i) => `${i.severity}:${i.rule}`);
        scoreAfter = scoreScenario(postIssues);

        if (opts.mode === 'apply') {
          // Use direct Firestore update (not saveScenario, which blocks overwrites of existing docs).
          const db = getFirestore();
          await db.collection('scenarios').doc(updatedScenario.id).set(
            {
              ...updatedScenario,
              metadata: {
                ...updatedScenario.metadata,
                auditMetadata: {
                  lastAudited: new Date().toISOString(),
                  score: scoreAfter,
                  issues: postIssues.map((i) => i.rule),
                  autoFixed: true,
                },
              },
              updated_at: admin.firestore.FieldValue.serverTimestamp(),
            },
            { merge: true }
          );
          console.log(`[AuditFix] ${action} applied for scenario ${scenario.id}`);
        } else {
          console.log(`[AuditFix] ${action} (dry-run) for scenario ${scenario.id}`);
        }
      }

      if (action === 'tokenResolved') summary.totals.tokenResolved += 1;
      if (action === 'fixedInPlace') summary.totals.fixedInPlace += 1;
      if (action === 'regenerated') summary.totals.regenerated += 1;
      if (action === 'skipped') summary.totals.skipped += 1;

      summary.scenarios.push({
        id: scenario.id,
        bundle,
        issuesBefore,
        issuesAfter,
        scoreBefore,
        scoreAfter,
        action,
      });
    }
  }

  summary.completedAt = new Date().toISOString();

  await admin.firestore().collection('admin_audit_runs').doc(summary.runId).set(summary);
  console.log('[AuditFix] Summary written to admin_audit_runs/', summary.runId);
  console.log('[AuditFix] Totals:', summary.totals);
}

run()
  .then(() => {
    console.log('[AuditFix] Completed.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('[AuditFix] Failed:', err);
    process.exit(1);
  });

