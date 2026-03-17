"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.logGenerationAttempt = logGenerationAttempt;
exports.logFailure = logFailure;
exports.categorizeFailure = categorizeFailure;
exports.updateDailySummary = updateDailySummary;
exports.getPerformanceSummary = getPerformanceSummary;
exports.getRecentFailures = getRecentFailures;
exports.generateAttemptId = generateAttemptId;
exports.getPromptVersionSuccessRate = getPromptVersionSuccessRate;
const firestore_1 = require("firebase-admin/firestore");
// ---------------------------------------------------------------------------
// Firestore Helper (Lazy Init)
// ---------------------------------------------------------------------------
let firestoreInstance = null;
function getFirestore() {
    if (!firestoreInstance) {
        const admin = require('firebase-admin');
        if (!admin.apps.length) {
            admin.initializeApp();
        }
        firestoreInstance = admin.firestore();
    }
    return firestoreInstance;
}
// ---------------------------------------------------------------------------
// Logging Functions
// ---------------------------------------------------------------------------
/**
 * Log a generation attempt (success or failure)
 */
async function logGenerationAttempt(attempt) {
    try {
        const db = getFirestore();
        await db.collection('generation_metrics').doc(attempt.attemptId).set(Object.assign(Object.assign({}, attempt), { timestamp: attempt.timestamp || firestore_1.Timestamp.now() }));
    }
    catch (error) {
        console.error('Failed to log generation attempt:', error);
        // Don't throw - logging failures shouldn't block generation
    }
}
/**
 * Log a failure for detailed analysis
 */
async function logFailure(failure) {
    try {
        const db = getFirestore();
        await db.collection('failure_analysis').doc(failure.failureId).set(Object.assign(Object.assign({}, failure), { timestamp: failure.timestamp || firestore_1.Timestamp.now() }));
    }
    catch (error) {
        console.error('Failed to log failure analysis:', error);
    }
}
/**
 * Categorize failure based on audit issues
 */
function categorizeFailure(auditIssues) {
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
    if (errorCodes.some(code => code === 'complex-sentence' ||
        code === 'high-clause-density' ||
        code === 'high-passive-voice' ||
        code === 'label-complexity')) {
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
async function updateDailySummary(date, attempt) {
    try {
        const db = getFirestore();
        const summaryRef = db.collection('performance_summary').doc(date);
        await db.runTransaction(async (transaction) => {
            var _a, _b;
            const doc = await transaction.get(summaryRef);
            if (!doc.exists) {
                // Initialize new summary
                const newSummary = {
                    date,
                    totalAttempts: 1,
                    successfulAttempts: attempt.success ? 1 : 0,
                    successRate: attempt.success ? 1.0 : 0.0,
                    avgAuditScore: attempt.auditScore || 0,
                    failuresByCategory: {},
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
                if (!attempt.success && ((_a = attempt.failureReasons) === null || _a === void 0 ? void 0 : _a.length)) {
                    const category = categorizeFailure(attempt.failureReasons.map(r => ({ code: r, type: 'error' })));
                    newSummary.failuresByCategory[category] = 1;
                }
                transaction.set(summaryRef, newSummary);
            }
            else {
                // Update existing summary
                const summary = doc.data();
                const newTotal = summary.totalAttempts + 1;
                const newSuccesses = summary.successfulAttempts + (attempt.success ? 1 : 0);
                // Update global stats
                const updates = {
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
                if (!attempt.success && ((_b = attempt.failureReasons) === null || _b === void 0 ? void 0 : _b.length)) {
                    const category = categorizeFailure(attempt.failureReasons.map(r => ({ rule: r, type: 'error' })));
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
    }
    catch (error) {
        console.error('Failed to update daily summary:', error);
    }
}
/**
 * Get performance summary for a date range
 */
async function getPerformanceSummary(startDate, endDate) {
    const db = getFirestore();
    const snapshot = await db.collection('performance_summary')
        .where('date', '>=', startDate)
        .where('date', '<=', endDate)
        .orderBy('date', 'desc')
        .get();
    return snapshot.docs.map(doc => doc.data());
}
/**
 * Get recent failures for analysis
 */
async function getRecentFailures(limit = 50, category) {
    const db = getFirestore();
    let query = db.collection('failure_analysis')
        .orderBy('timestamp', 'desc')
        .limit(limit);
    if (category) {
        query = query.where('failureCategory', '==', category);
    }
    const snapshot = await query.get();
    return snapshot.docs.map(doc => doc.data());
}
/**
 * Generate unique attempt ID
 */
function generateAttemptId(bundle, phase) {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `${bundle}_${phase}_${timestamp}_${random}`;
}
/**
 * Get success rate for a prompt version
 */
async function getPromptVersionSuccessRate(promptVersion, daysBack = 7) {
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
//# sourceMappingURL=prompt-performance.js.map