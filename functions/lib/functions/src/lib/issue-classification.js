"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HEURISTIC_FIXABLE_RULE_IDS = void 0;
exports.classifyIssueRemediation = classifyIssueRemediation;
exports.HEURISTIC_FIXABLE_RULE_IDS = new Set([
    'hardcoded-gov-structure',
    'advisor-boilerplate',
    'hardcoded-the-before-token',
    'sentence-start-bare-token',
    'informal-tone',
    'double-space',
    'orphaned-punctuation',
    'description-length',
    'description-word-count',
    'option-text-length',
    'option-text-word-count',
    'label-quality',
    'jargon-use',
    'complex-sentence',
    'high-clause-density',
    'high-passive-voice',
    'label-complexity',
    'outcome-second-person',
    'third-person-framing',
    'lowercase-start',
    'short-summary',
    'invalid-role-id',
    'adjacency-token-mismatch',
    'banned-phrase',
    'hardcoded-institution-phrase',
    'hard-coded-currency',
    'short-article',
    'gdp-as-amount',
    'label-has-token',
    'title-too-short',
    'repeated-word',
    'dangling-ending',
    'headline-fragment',
    'missing-direct-object',
]);
function classifyIssueRemediation(issues) {
    if (issues.length === 0) {
        return {
            bucket: 'clean',
            reason: 'No remaining audit issues.',
            totalIssues: 0,
            autoFixableCount: 0,
            heuristicFixableCount: 0,
            blockingCount: 0,
        };
    }
    const autoFixableCount = issues.filter((issue) => issue.autoFixable).length;
    const heuristicFixableCount = issues.filter((issue) => issue.autoFixable || exports.HEURISTIC_FIXABLE_RULE_IDS.has(issue.rule)).length;
    const blockingCount = issues.filter((issue) => issue.severity === 'error' && !issue.autoFixable && !exports.HEURISTIC_FIXABLE_RULE_IDS.has(issue.rule)).length;
    if (issues.every((issue) => issue.autoFixable)) {
        return {
            bucket: 'auto-fix',
            reason: 'All remaining issues are deterministic mechanical fixes.',
            totalIssues: issues.length,
            autoFixableCount,
            heuristicFixableCount,
            blockingCount,
        };
    }
    if (issues.every((issue) => issue.autoFixable || exports.HEURISTIC_FIXABLE_RULE_IDS.has(issue.rule))) {
        return {
            bucket: 'heuristic-fix',
            reason: 'Remaining issues are editorial and fit the heuristic repair path.',
            totalIssues: issues.length,
            autoFixableCount,
            heuristicFixableCount,
            blockingCount,
        };
    }
    return {
        bucket: 'manual-review',
        reason: 'At least one remaining issue is outside deterministic and heuristic repair buckets.',
        totalIssues: issues.length,
        autoFixableCount,
        heuristicFixableCount,
        blockingCount,
    };
}
//# sourceMappingURL=issue-classification.js.map