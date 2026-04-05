/**
 * Prompt Performance Tracking System
 * 
 * Tracks generation attempts, audit scores, failure patterns, and success rates
 * to enable data-driven prompt optimization and quality monitoring.
 * 
 * Firestore Collections:
 * - generation_metrics/{timestamp} - Individual generation attempt data
 * - failure_analysis/{timestamp} - Failed scenario details for analysis
 * - performance_summary/daily - Aggregated daily statistics
 */

import { Timestamp } from 'firebase-admin/firestore';
import { BundleScenario } from './audit-rules';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GenerationAttempt {
  attemptId: string;
  timestamp: Timestamp;
  bundle: string;
  severity: string;
  desiredActs: number;
  promptVersion: string;
  modelUsed: string; // Model name (e.g., 'gpt-4o-mini', 'gpt-4o', 'o3-mini')
  phase: 'concept' | 'blueprint' | 'details';
  success: boolean;
  auditScore?: number;
  failureReasons?: string[];
  retryCount: number;
  tokenUsage?: {
    input: number;
    output: number;
  };
  // Per-phase funnel tracking
  phase_concept_seeds_count?: number;
  phase_concept_novelty_rejected?: number;
  phase_standard_path_count?: number;
  phase_premium_path_count?: number;
  phase_editorial_review_count?: number;
  phase_dedup_rejected_count?: number;
  cost_per_accepted_scenario?: number;
}

export interface FailureAnalysis {
  failureId: string;
  timestamp: Timestamp;
  bundle: string;
  severity: string;
  promptVersion: string;
  failureCategory: FailureCategory;
  auditScore: number;
  auditIssues: Array<{
    type: 'error' | 'warning';
    code: string;
    message: string;
    impact: number;
  }>;
  rootCause?: {
    primaryRule?: string;
    primarySeverity?: 'error' | 'warn';
    topRules: string[];
    errorCount: number;
    warningCount: number;
    remediationBucket?: string;
  };
  rawScenario?: Partial<BundleScenario>;
  attemptNumber: number;
}

export type FailureCategory =
  | 'token-violation'
  | 'adjacency-token-violation'
  | 'banned-phrase-violation'
  | 'hardcoded-gov-structure'
  | 'readability-violation'
  | 'tonal-violation'
  | 'option-preview-violation'
  | 'sentence-length-violation'
  | 'effect-count-violation'
  | 'shallow-content'
  | 'inverse-metric-confusion'
  | 'missing-advisor-feedback'
  | 'advisor-boilerplate'
  | 'invalid-metric'
  | 'structural-error'
  | 'exceeds-magnitude-cap'
  | 'content-quality-violation'
  | 'outcome-voice-violation'
  | 'framing-violation'
  | 'gdp-as-amount-violation'
  | 'token-article-form-violation'
  | 'option-differentiation-violation'
  | 'editorial-review-required'
  | 'parsing-error'
  | 'other';

export interface PerformanceSummary {
  date: string; // YYYY-MM-DD
  totalAttempts: number;
  successfulAttempts: number;
  successRate: number;
  avgAuditScore: number;
  failuresByCategory: Record<FailureCategory, number>;
  byBundle: Record<string, {
    attempts: number;
    successes: number;
    avgScore: number;
  }>;
  bySeverity: Record<string, {
    attempts: number;
    successes: number;
    avgScore: number;
  }>;
  promptVersions: Record<string, {
    attempts: number;
    successes: number;
    avgScore: number;
  }>;
}

// ---------------------------------------------------------------------------
// Firestore Helper (Lazy Init)
// ---------------------------------------------------------------------------

let firestoreInstance: FirebaseFirestore.Firestore | null = null;

function getFirestore(): FirebaseFirestore.Firestore {
  if (!firestoreInstance) {
    const admin = require('firebase-admin');
    if (!admin.apps.length) {
      admin.initializeApp();
    }
    firestoreInstance = admin.firestore();
  }
  return firestoreInstance!;
}

// ---------------------------------------------------------------------------
// Logging Functions
// ---------------------------------------------------------------------------

/**
 * Log a generation attempt (success or failure)
 */
export async function logGenerationAttempt(attempt: GenerationAttempt): Promise<void> {
  try {
    const db = getFirestore();
    await db.collection('generation_metrics').doc(attempt.attemptId).set({
      ...attempt,
      timestamp: attempt.timestamp || Timestamp.now(),
    });
  } catch (error) {
    console.error('Failed to log generation attempt:', error);
    // Don't throw - logging failures shouldn't block generation
  }
}

/**
 * Log a failure for detailed analysis
 */
export async function logFailure(failure: FailureAnalysis): Promise<void> {
  try {
    const db = getFirestore();
    await db.collection('failure_analysis').doc(failure.failureId).set({
      ...failure,
      timestamp: failure.timestamp || Timestamp.now(),
    });
  } catch (error) {
    console.error('Failed to log failure analysis:', error);
  }
}

/**
 * Categorize failure based on audit issues
 */
export function categorizeFailure(auditIssues: Array<any>): FailureCategory {
  const errorCodes = auditIssues
    .filter(issue => issue.severity === 'error' || issue.type === 'error')
    .map(i => i.rule || i.code)
    .filter(c => !!c);
  const warningCodes = auditIssues
    .filter(issue => issue.severity === 'warn' || issue.severity === 'warning' || issue.type === 'warning')
    .map(i => i.rule || i.code)
    .filter(c => !!c);

  // Check errors first (highest priority)
  if (errorCodes.some(code => code === 'adjacency-token-mismatch')) {
    return 'adjacency-token-violation';
  }
  if (errorCodes.some(code => code.includes('token') || code === 'invalid-country-name')) {
    return 'token-violation';
  }
  if (errorCodes.some(code => code === 'banned-phrase')) {
    return 'banned-phrase-violation';
  }
  if (errorCodes.some(code =>
    code === 'complex-sentence' ||
    code === 'high-clause-density' ||
    code === 'high-passive-voice' ||
    code === 'label-complexity'
  )) {
    return 'readability-violation';
  }
  if (errorCodes.some(code => code === 'option-preview-in-description')) {
    return 'option-preview-violation';
  }
  if (errorCodes.some(code => code === 'invalid-metric' || code === 'unknown-metric')) {
    return 'invalid-metric';
  }
  if (errorCodes.some(code => code === 'missing-advisor-feedback' || code === 'incomplete-advisor-feedback' || code === 'missing-role-feedback')) {
    return 'missing-advisor-feedback';
  }
  if (errorCodes.some(code => code === 'advisor-boilerplate')) {
    return 'advisor-boilerplate';
  }
  if (errorCodes.some(code => code === 'outcome-second-person')) {
    return 'outcome-voice-violation';
  }
  if (errorCodes.some(code => code === 'manual-editorial-review-required' || code === 'editorial-review-violation')) {
    return 'editorial-review-required';
  }
  if (errorCodes.some(code => code === 'third-person-framing')) {
    return 'framing-violation';
  }
  if (errorCodes.some(code => code.includes('option') || code.includes('structural'))) {
    return 'structural-error';
  }
  if (errorCodes.includes('description-length') || errorCodes.includes('option-text-length')) {
    return 'sentence-length-violation';
  }
  if (errorCodes.includes('effect-count')) {
    return 'effect-count-violation';
  }

  // Check warnings
  if (warningCodes.some(code => code === 'jargon-use' || code === 'complex-sentence' || code === 'high-clause-density' || code === 'high-passive-voice' || code === 'label-complexity')) {
    return 'readability-violation';
  }
  if (warningCodes.some(code => code === 'hardcoded-gov-structure' || code === 'hardcoded-institution-phrase')) {
    return 'hardcoded-gov-structure';
  }
  if (warningCodes.some(code => code === 'option-metric-overlap' || code === 'option-domain-missing-primary' || code === 'option-domain-duplicate-primary')) {
    return 'option-differentiation-violation';
  }
  if (warningCodes.some(code => code === 'informal-tone')) {
    return 'tonal-violation';
  }
  if (warningCodes.includes('shallow-description') || warningCodes.includes('shallow-outcome')) {
    return 'shallow-content';
  }
  if (warningCodes.includes('inverse-metric-warning')) {
    return 'inverse-metric-confusion';
  }
  if (warningCodes.includes('exceeds-magnitude-cap')) {
    return 'exceeds-magnitude-cap';
  }

  if (errorCodes.includes('gdp-as-amount') || warningCodes.includes('gdp-as-amount')) {
    return 'gdp-as-amount-violation';
  }
  if (warningCodes.some(code => code === 'hardcoded-the-before-token' || code === 'label-has-token' || code === 'sentence-start-bare-token')) {
    return 'token-article-form-violation';
  }

  return 'other';
}

/**
 * Update daily performance summary
 */
export async function updateDailySummary(date: string, attempt: GenerationAttempt): Promise<void> {
  try {
    const db = getFirestore();
    const summaryRef = db.collection('performance_summary').doc(date);

    await db.runTransaction(async (transaction) => {
      const doc = await transaction.get(summaryRef);

      if (!doc.exists) {
        // Initialize new summary
        const newSummary: PerformanceSummary = {
          date,
          totalAttempts: 1,
          successfulAttempts: attempt.success ? 1 : 0,
          successRate: attempt.success ? 1.0 : 0.0,
          avgAuditScore: attempt.auditScore || 0,
          failuresByCategory: {} as Record<FailureCategory, number>,
          byBundle: {
            [attempt.bundle]: {
              attempts: 1,
              successes: attempt.success ? 1 : 0,
              avgScore: attempt.auditScore || 0,
            }
          },
          bySeverity: {
            [attempt.severity]: {
              attempts: 1,
              successes: attempt.success ? 1 : 0,
              avgScore: attempt.auditScore || 0,
            }
          },
          promptVersions: {
            [attempt.promptVersion]: {
              attempts: 1,
              successes: attempt.success ? 1 : 0,
              avgScore: attempt.auditScore || 0,
            }
          },
        };

        if (!attempt.success && attempt.failureReasons?.length) {
          const category = categorizeFailure(
            attempt.failureReasons.map(r => ({ code: r, type: 'error' }))
          );
          newSummary.failuresByCategory[category] = 1;
        }

        transaction.set(summaryRef, newSummary);
      } else {
        // Update existing summary
        const summary = doc.data() as PerformanceSummary;
        const newTotal = summary.totalAttempts + 1;
        const newSuccesses = summary.successfulAttempts + (attempt.success ? 1 : 0);

        // Update global stats
        const updates: any = {
          totalAttempts: newTotal,
          successfulAttempts: newSuccesses,
          successRate: newSuccesses / newTotal,
        };

        // Update average audit score
        if (typeof attempt.auditScore === 'number' && !isNaN(attempt.auditScore)) {
          const currentTotalScore = (summary.avgAuditScore || 0) * summary.totalAttempts;
          updates.avgAuditScore = (currentTotalScore + attempt.auditScore) / newTotal;
        }

        // Update bundle stats
        const bundleKey = `byBundle.${attempt.bundle}`;
        const bundleData = summary.byBundle[attempt.bundle] || { attempts: 0, successes: 0, avgScore: 0 };
        const bundleAttempts = bundleData.attempts + 1;
        const bundleSuccesses = bundleData.successes + (attempt.success ? 1 : 0);
        const bundleScoreTotal = (bundleData.avgScore || 0) * bundleData.attempts + (attempt.auditScore || 0);

        updates[`${bundleKey}.attempts`] = bundleAttempts;
        updates[`${bundleKey}.successes`] = bundleSuccesses;
        updates[`${bundleKey}.avgScore`] = bundleAttempts > 0 ? bundleScoreTotal / bundleAttempts : 0;

        // Update severity stats
        const severityKey = `bySeverity.${attempt.severity}`;
        const severityData = summary.bySeverity[attempt.severity] || { attempts: 0, successes: 0, avgScore: 0 };
        const severityAttempts = severityData.attempts + 1;
        const severitySuccesses = severityData.successes + (attempt.success ? 1 : 0);
        const severityScoreTotal = (severityData.avgScore || 0) * severityData.attempts + (attempt.auditScore || 0);

        updates[`${severityKey}.attempts`] = severityAttempts;
        updates[`${severityKey}.successes`] = severitySuccesses;
        updates[`${severityKey}.avgScore`] = severityAttempts > 0 ? severityScoreTotal / severityAttempts : 0;

        // Update prompt version stats
        const versionKey = `promptVersions.${attempt.promptVersion || 'unknown'}`;
        const versionData = summary.promptVersions[attempt.promptVersion || 'unknown'] || { attempts: 0, successes: 0, avgScore: 0 };
        const versionAttempts = versionData.attempts + 1;
        const versionSuccesses = versionData.successes + (attempt.success ? 1 : 0);
        const versionScoreTotal = (versionData.avgScore || 0) * versionData.attempts + (attempt.auditScore || 0);

        updates[`${versionKey}.attempts`] = versionAttempts;
        updates[`${versionKey}.successes`] = versionSuccesses;
        updates[`${versionKey}.avgScore`] = versionAttempts > 0 ? versionScoreTotal / versionAttempts : 0;

        // Update failure categories
        if (!attempt.success && attempt.failureReasons?.length) {
          const category = categorizeFailure(
            attempt.failureReasons.map(r => ({ rule: r, type: 'error' }))
          );
          if (category) {
            const categoryKey = `failuresByCategory.${category}`;
            const currentCount = summary.failuresByCategory[category] || 0;
            updates[categoryKey] = currentCount + 1;
          }
        }

        // Remove any NaN or undefined values from updates
        Object.keys(updates).forEach(key => {
          if (updates[key] === undefined || (typeof updates[key] === 'number' && isNaN(updates[key]))) {
            delete updates[key];
          }
        });

        transaction.update(summaryRef, updates);
      }
    });
  } catch (error) {
    console.error('Failed to update daily summary:', error);
  }
}

/**
 * Get performance summary for a date range
 */
export async function getPerformanceSummary(
  startDate: string,
  endDate: string
): Promise<PerformanceSummary[]> {
  const db = getFirestore();
  const snapshot = await db.collection('performance_summary')
    .where('date', '>=', startDate)
    .where('date', '<=', endDate)
    .orderBy('date', 'desc')
    .get();

  return snapshot.docs.map(doc => doc.data() as PerformanceSummary);
}

/**
 * Get recent failures for analysis
 */
export async function getRecentFailures(
  limit: number = 50,
  category?: FailureCategory
): Promise<FailureAnalysis[]> {
  const db = getFirestore();
  let query = db.collection('failure_analysis')
    .orderBy('timestamp', 'desc')
    .limit(limit);

  if (category) {
    query = query.where('failureCategory', '==', category) as any;
  }

  const snapshot = await query.get();
  return snapshot.docs.map(doc => doc.data() as FailureAnalysis);
}

/**
 * Generate unique attempt ID
 */
export function generateAttemptId(bundle: string, phase: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${bundle}_${phase}_${timestamp}_${random}`;
}

/**
 * Get success rate for a prompt version
 */
export async function getPromptVersionSuccessRate(
  promptVersion: string,
  daysBack: number = 7
): Promise<{ successRate: number; totalAttempts: number; avgScore: number }> {
  const endDate = new Date().toISOString().split('T')[0];
  const startDate = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const summaries = await getPerformanceSummary(startDate, endDate);

  let totalAttempts = 0;
  let totalSuccesses = 0;
  let totalScoreSum = 0;

  for (const summary of summaries) {
    const versionData = summary.promptVersions[promptVersion];
    if (versionData) {
      totalAttempts += versionData.attempts;
      totalSuccesses += versionData.successes;
      totalScoreSum += versionData.avgScore * versionData.attempts;
    }
  }

  return {
    successRate: totalAttempts > 0 ? totalSuccesses / totalAttempts : 0,
    totalAttempts,
    avgScore: totalAttempts > 0 ? totalScoreSum / totalAttempts : 0,
  };
}
