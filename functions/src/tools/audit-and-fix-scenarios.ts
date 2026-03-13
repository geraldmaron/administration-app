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
import { generateScenarios } from '../scenario-engine';
import { ALL_BUNDLE_IDS } from '../data/schemas/bundleIds';

// Tokens that have {the_*} article forms — used for sentence-initial article detection.
// These are the bare tokens to detect and their article-form equivalents.
const ARTICLE_FORM_TOKENS: Record<string, string> = {
  // Relationship tokens
  adversary: 'the_adversary',
  border_rival: 'the_border_rival',
  regional_rival: 'the_regional_rival',
  ally: 'the_ally',
  trade_partner: 'the_trade_partner',
  neutral: 'the_neutral',
  rival: 'the_rival',
  partner: 'the_partner',
  neighbor: 'the_neighbor',
  player_country: 'the_player_country',
  nation: 'the_nation',
  // Role tokens
  leader_title: 'the_leader_title',
  vice_leader: 'the_vice_leader',
  finance_role: 'the_finance_role',
  defense_role: 'the_defense_role',
  interior_role: 'the_interior_role',
  foreign_affairs_role: 'the_foreign_affairs_role',
  justice_role: 'the_justice_role',
  health_role: 'the_health_role',
  education_role: 'the_education_role',
  commerce_role: 'the_commerce_role',
  labor_role: 'the_labor_role',
  energy_role: 'the_energy_role',
  environment_role: 'the_environment_role',
  transport_role: 'the_transport_role',
  agriculture_role: 'the_agriculture_role',
  // Institutional tokens
  intelligence_agency: 'the_intelligence_agency',
  domestic_intelligence: 'the_domestic_intelligence',
  security_council: 'the_security_council',
  central_bank: 'the_central_bank',
  legislature: 'the_legislature',
  upper_house: 'the_upper_house',
  lower_house: 'the_lower_house',
  judicial_role: 'the_judicial_role',
  ruling_party: 'the_ruling_party',
  prosecutor_role: 'the_prosecutor_role',
  state_media: 'the_state_media',
  press_secretary: 'the_press_secretary',
  military_branch: 'the_military_branch',
  military_general: 'the_military_general',
  cabinet_secretary: 'the_cabinet_secretary',
  senior_official: 'the_senior_official',
  capital_mayor: 'the_capital_mayor',
  regional_governor: 'the_regional_governor',
};

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

/**
 * Detect and fix article-form token issues.
 * When a bare token (e.g. {finance_role}) appears at a sentence-initial position,
 * replace it with the definite-article form (e.g. {the_finance_role}).
 *
 * Positions that require the article form:
 *   - Start of the text field
 *   - After a sentence-ending punctuation followed by whitespace
 *   - After a conjunction that kicks off a new clause ("and ", "but ", "while ")
 */
function applyArticleFormFixes(text: string | undefined): { result: string | undefined; changed: boolean } {
  if (!text) return { result: text, changed: false };

  // Build one big regex that matches bare tokens in subject positions.
  // We look for these positions:
  //   (^|[.!?]\s+|[,]\s+(?:and|but|while|after|as|when|where)\s+) followed by {token}
  // But to keep it simple and safe, we detect:
  //   - token at very start
  //   - token after ". " or "! " or "? "
  let result = text;
  let changed = false;

  for (const [bare, article] of Object.entries(ARTICLE_FORM_TOKENS)) {
    const escapedBare = bare.replace(/_/g, '_'); // already safe
    // Sentence-initial: start or after sentence-ending punct + whitespace
    const sentenceInitialRegex = new RegExp(
      `(^|(?<=[.!?]\\s{1,3}))\\{${escapedBare}\\}(?=\\s|'s\\b|"s\\b)`,
      'gim'
    );
    const replaced = result.replace(sentenceInitialRegex, (match, prefix) => {
      return `${prefix ?? ''}{${article}}`;
    });
    if (replaced !== result) {
      result = replaced;
      changed = true;
    }
  }

  return { result, changed };
}

/** Clean double spaces, orphaned punctuation artifacts */
function applyWhitespaceFixes(text: string | undefined): { result: string | undefined; changed: boolean } {
  if (!text) return { result: text, changed: false };
  let result = text;
  // Double/triple spaces → single space
  const before = result;
  result = result.replace(/  +/g, ' ');
  // Orphaned punctuation: ". ." ".. " (except ellipsis "...")
  result = result.replace(/\.\s+\./g, '.');
  result = result.replace(/([^.])\.\.([^.])/g, '$1.$2');
  // Comma followed by another comma
  result = result.replace(/,,+/g, ',');
  // Trailing whitespace before punctuation
  result = result.replace(/\s+([,.!?;:])/g, '$1');
  return { result, changed: result !== before };
}

/**
 * Replace all `the {token}` occurrences (anywhere in text) with `{the_token}` equivalents.
 * This runs BEFORE sentence-initial article-form fixes to catch mid-sentence patterns too.
 */
function applyHardcodedTheFixes(text: string | undefined): { result: string | undefined; changed: boolean } {
  if (!text) return { result: text, changed: false };
  let result = text;
  let changed = false;

  for (const [bare, article] of Object.entries(ARTICLE_FORM_TOKENS)) {
    const regex = new RegExp(`\\bthe \\{${bare}\\}`, 'gi');
    const replaced = result.replace(regex, `{${article}}`);
    if (replaced !== result) {
      result = replaced;
      changed = true;
    }
  }

  return { result, changed };
}

function applyDeterministicTextFixes(scenario: BundleScenario): { updated: BundleScenario; changed: boolean } {
  let changed = false;

  const fix = (text: string | undefined): string | undefined => {
    if (!text) return text;
    let updated = text;

    // Fix pathological trillions like "$25400000 trillion" into a proportional phrase.
    const trillionPattern = /\$\d{5,}\s+trillion/gi;
    if (trillionPattern.test(updated)) {
      updated = updated.replace(trillionPattern, 'a massive share of the national budget');
      changed = true;
    }

    // Replace generic "the ruling party" with tokenized form so runtime can adapt.
    const rulingPartyPattern = /\bthe ruling party\b/gi;
    if (rulingPartyPattern.test(updated)) {
      updated = updated.replace(rulingPartyPattern, '{ruling_party}');
      changed = true;
    }

    // Fix "the {token}" mid-sentence patterns (global replacement, all positions).
    const { result: hardcodedFixed, changed: hardcodedChanged } = applyHardcodedTheFixes(updated);
    if (hardcodedChanged && hardcodedFixed) {
      updated = hardcodedFixed;
      changed = true;
    }

    // Fix article-form tokens in sentence-initial positions.
    const { result: articleFixed, changed: articleChanged } = applyArticleFormFixes(updated);
    if (articleChanged && articleFixed) {
      updated = articleFixed;
      changed = true;
    }

    // Fix double spaces and orphaned punctuation.
    const { result: wsFixed, changed: wsChanged } = applyWhitespaceFixes(updated);
    if (wsChanged && wsFixed) {
      updated = wsFixed;
      changed = true;
    }

    return updated;
  };

  const clone: BundleScenario = JSON.parse(JSON.stringify(scenario));
  clone.title = fix(clone.title) || clone.title;
  clone.description = fix(clone.description) || clone.description;
  clone.options = clone.options.map((opt) => {
    const next = { ...opt };
    next.text = fix(next.text) || next.text;
    next.outcomeHeadline = fix(next.outcomeHeadline) || next.outcomeHeadline;
    next.outcomeSummary = fix(next.outcomeSummary) || next.outcomeSummary;
    next.outcomeContext = fix(next.outcomeContext) || next.outcomeContext;
    // Also fix advisor feedback text
    if (Array.isArray(next.advisorFeedback)) {
      next.advisorFeedback = (next.advisorFeedback as any[]).map((fb: any) => ({
        ...fb,
        feedback: fix(fb.feedback) || fb.feedback,
      }));
    }
    return next;
  });
  return { updated: clone, changed };
}

async function regenerateScenario(original: BundleScenario): Promise<BundleScenario | null> {
  const bundle = (original.metadata?.bundle as any) || 'general';
  try {
    const result = await generateScenarios({
      mode: 'manual',
      bundle,
      count: 1,
      applicable_countries:
        Array.isArray(original.metadata?.applicable_countries) &&
        original.metadata?.applicable_countries.length > 0
          ? (original.metadata?.applicable_countries as string[])
          : undefined,
      distributionConfig: { mode: 'fixed', loopLength: 1 },
    } as any);
    if (!result || result.length === 0) {
      console.warn(`[AuditFix] Regeneration produced no scenarios for ${original.id}`);
      return null;
    }
    const replacement = result[0];
    replacement.id = original.id;
    const originalApplicableCountries =
      Array.isArray(original.metadata?.applicable_countries) &&
      original.metadata?.applicable_countries.length > 0
        ? (original.metadata?.applicable_countries as string[])
        : undefined;
    replacement.metadata = {
      ...replacement.metadata,
      bundle,
      severity: original.metadata?.severity ?? replacement.metadata?.severity,
      difficulty: original.metadata?.difficulty ?? replacement.metadata?.difficulty,
      ...(originalApplicableCountries ? { applicable_countries: originalApplicableCountries } : {}),
    };
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
        const ac = scenario.metadata?.applicable_countries;
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
            { ...updatedScenario, updated_at: admin.firestore.FieldValue.serverTimestamp() },
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

