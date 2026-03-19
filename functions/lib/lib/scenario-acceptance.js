"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BLOCKING_AUDIT_RULE_IDS = exports.STRUCTURAL_BLOCKING_AUDIT_RULE_IDS = exports.SCENARIO_ACCEPTANCE_POLICY_VERSION = void 0;
exports.decideScenarioAcceptance = decideScenarioAcceptance;
exports.SCENARIO_ACCEPTANCE_POLICY_VERSION = '2026-03-17-success-optimization-v1';
exports.STRUCTURAL_BLOCKING_AUDIT_RULE_IDS = new Set([
    'missing-id',
    'missing-title',
    'missing-desc',
    'option-count',
    'no-effects',
    'missing-metric-id',
    'invalid-metric-id',
    'non-finite-value',
    'empty-text',
    'invalid-duration',
    'invalid-severity',
    'invalid-urgency',
    'invalid-phase',
    'invalid-countries',
    'missing-scope-tier',
    'invalid-scope-tier',
    'missing-scope-key',
    'invalid-scope-key',
    'missing-source-kind',
    'invalid-source-kind',
    'regional-missing-tags',
    'missing-cluster-id',
    'missing-exclusivity-reason',
    'exclusive-missing-countries',
]);
exports.BLOCKING_AUDIT_RULE_IDS = new Set([
    ...exports.STRUCTURAL_BLOCKING_AUDIT_RULE_IDS,
    'banned-phrase',
    'hard-coded-currency',
    'gdp-as-amount',
    'invalid-token',
    'token-casing-error',
    'no-tokens',
    'outcome-second-person',
    'option-preview-in-description',
    'advisor-boilerplate',
    'hardcoded-gov-structure',
    'hardcoded-institution-phrase',
]);
function makeDecisionIssue(rule, message, target) {
    return {
        severity: 'error',
        rule,
        target,
        message,
        autoFixable: false,
    };
}
function decideScenarioAcceptance(input) {
    var _a;
    const blockingIssues = input.issues.filter((issue) => issue.severity === 'error' && exports.BLOCKING_AUDIT_RULE_IDS.has(issue.rule));
    const rejectionIssues = [];
    const target = ((_a = input.issues[0]) === null || _a === void 0 ? void 0 : _a.target) || 'scenario';
    const unresolvedErrorIssues = input.issues.filter((issue) => issue.severity === 'error' && !exports.BLOCKING_AUDIT_RULE_IDS.has(issue.rule));
    const warningsOnly = input.issues.length > 0 && input.issues.every((issue) => issue.severity !== 'error');
    if (unresolvedErrorIssues.length > 0) {
        rejectionIssues.push(makeDecisionIssue('unresolved-audit-errors', `Scenario still has ${unresolvedErrorIssues.length} unresolved audit error(s) after repair.`, target));
    }
    if (input.auditScore < input.auditPassThreshold && !warningsOnly) {
        rejectionIssues.push(makeDecisionIssue('audit-score-below-threshold', `Audit score ${input.auditScore} is below configured threshold ${input.auditPassThreshold}.`, target));
    }
    if (input.contentQualityGate.enabled && input.contentQualityGate.usable && input.contentQualityGate.result) {
        if (input.contentQualityGate.result.pass !== true || input.contentQualityGate.result.overallScore < 3.0) {
            rejectionIssues.push(makeDecisionIssue('content-quality-violation', `Content quality gate failed: pass=${input.contentQualityGate.result.pass}, overall=${input.contentQualityGate.result.overallScore.toFixed(2)}.`, target));
        }
    }
    if (input.narrativeReviewGate.enabled && input.narrativeReviewGate.usable && input.narrativeReviewGate.result) {
        const narrative = input.narrativeReviewGate.result;
        if (narrative.overallScore < 2.5 ||
            narrative.optionDifferentiation.score < 2 ||
            narrative.consequenceQuality.score < 2 ||
            narrative.replayValue.score < 2) {
            rejectionIssues.push(makeDecisionIssue('narrative-review-violation', `Narrative review failed: overall=${narrative.overallScore.toFixed(2)}, differentiation=${narrative.optionDifferentiation.score}, consequence=${narrative.consequenceQuality.score}, replay=${narrative.replayValue.score}.`, target));
        }
    }
    const rejectionReasons = [
        ...blockingIssues.map((issue) => issue.message),
        ...rejectionIssues.map((issue) => issue.message),
    ];
    return {
        accepted: blockingIssues.length === 0 && rejectionIssues.length === 0,
        policyVersion: exports.SCENARIO_ACCEPTANCE_POLICY_VERSION,
        blockingIssues,
        rejectionIssues,
        rejectionReasons,
    };
}
//# sourceMappingURL=scenario-acceptance.js.map