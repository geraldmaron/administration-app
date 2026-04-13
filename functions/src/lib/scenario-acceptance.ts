import type { Issue } from './audit-rules';
import type { ContentQualityResult } from './content-quality';
import { combineEditorialReview, type EditorialReviewResult } from './editorial-review';
import type { NarrativeReviewResult } from './narrative-review';
import type { RenderedOutputQaResult } from './rendered-output-qa';

export const SCENARIO_ACCEPTANCE_POLICY_VERSION = '2026-03-17-success-optimization-v1';

export const STRUCTURAL_BLOCKING_AUDIT_RULE_IDS = new Set([
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
    'invalid-country-id',
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

export const BLOCKING_AUDIT_RULE_IDS = new Set([
    ...STRUCTURAL_BLOCKING_AUDIT_RULE_IDS,
    'banned-phrase',
    'hard-coded-currency',
    'gdp-as-amount',
    'invalid-token',
    'token-casing-error',
    'outcome-second-person',
    'option-preview-in-description',
    'hardcoded-gov-structure',
    'hardcoded-institution-phrase',
    'advisor-boilerplate',
    'token-context-you-the',
    'token-context-double-determiner',
    'token-context-double-article',
    'token-context-article-before-article-form',
    'token-context-you-bare-role',
]);

export interface EvaluatorDecisionInput<TResult> {
    enabled: boolean;
    usable: boolean;
    result?: TResult | null;
    error?: string;
}

export interface ScenarioAcceptanceInput {
    auditScore: number;
    auditPassThreshold: number;
    issues: readonly Issue[];
    contentQualityGate: EvaluatorDecisionInput<ContentQualityResult>;
    narrativeReviewGate: EvaluatorDecisionInput<NarrativeReviewResult>;
    renderedOutputGate?: EvaluatorDecisionInput<RenderedOutputQaResult>;
}

export interface ScenarioAcceptanceDecision {
    accepted: boolean;
    policyVersion: string;
    blockingIssues: Issue[];
    rejectionIssues: Issue[];
    rejectionReasons: string[];
    editorialReview: EditorialReviewResult;
}

function makeDecisionIssue(rule: string, message: string, target: string): Issue {
    return {
        severity: 'error',
        rule,
        target,
        message,
        autoFixable: false,
    };
}

export function decideScenarioAcceptance(input: ScenarioAcceptanceInput): ScenarioAcceptanceDecision {
    const blockingIssues = input.issues.filter(
        (issue) => issue.severity === 'error' && BLOCKING_AUDIT_RULE_IDS.has(issue.rule)
    );
    const rejectionIssues: Issue[] = [];
    const target = input.issues[0]?.target || 'scenario';
    const editorialReview = combineEditorialReview(input.contentQualityGate, input.narrativeReviewGate);
    const unresolvedErrorIssues = input.issues.filter(
        (issue) => issue.severity === 'error' && !BLOCKING_AUDIT_RULE_IDS.has(issue.rule)
    );
    if (unresolvedErrorIssues.length > 0) {
        rejectionIssues.push(
            makeDecisionIssue(
                'unresolved-audit-errors',
                `Scenario still has ${unresolvedErrorIssues.length} unresolved audit error(s) after repair.`,
                target
            )
        );
    }

    if (input.auditScore < input.auditPassThreshold) {
        rejectionIssues.push(
            makeDecisionIssue(
                'audit-score-below-threshold',
                `Audit score ${input.auditScore} is below configured threshold ${input.auditPassThreshold}.`,
                target
            )
        );
    }

    if (
        editorialReview.usable &&
        (input.contentQualityGate.enabled || input.narrativeReviewGate.enabled) &&
        editorialReview.pass !== true
    ) {
        const detail = editorialReview.reasons.length > 0
            ? editorialReview.reasons.join('; ')
            : `overall=${editorialReview.overallScore.toFixed(2)}`;

        rejectionIssues.push(
            makeDecisionIssue(
                'editorial-review-violation',
                `Editorial review failed: ${detail}.`,
                target
            )
        );
    }

    if (input.contentQualityGate.enabled && input.contentQualityGate.usable && input.contentQualityGate.result) {
        if (input.contentQualityGate.result.pass !== true || input.contentQualityGate.result.overallScore < 3.0) {
            rejectionIssues.push(
                makeDecisionIssue(
                    'content-quality-violation',
                    `Content quality gate failed: pass=${input.contentQualityGate.result.pass}, overall=${input.contentQualityGate.result.overallScore.toFixed(2)}.`,
                    target
                )
            );
        }
    }

    if (input.contentQualityGate.enabled && !input.contentQualityGate.usable) {
        rejectionIssues.push(
            makeDecisionIssue(
                'content-quality-unavailable',
                `Content quality gate was enabled but produced no usable result${input.contentQualityGate.error ? `: ${input.contentQualityGate.error}` : '.'}`,
                target
            )
        );
    }

    if (input.narrativeReviewGate.enabled && !input.narrativeReviewGate.usable) {
        rejectionIssues.push(
            makeDecisionIssue(
                'narrative-review-unavailable',
                `Narrative review gate was enabled but produced no usable result${input.narrativeReviewGate.error ? `: ${input.narrativeReviewGate.error}` : '.'}`,
                target
            )
        );
    }

    if (input.renderedOutputGate?.enabled && input.renderedOutputGate.usable && input.renderedOutputGate.result) {
        if (input.renderedOutputGate.result.pass !== true) {
            rejectionIssues.push(...input.renderedOutputGate.result.issues);
            rejectionIssues.push(
                makeDecisionIssue(
                    'rendered-output-violation',
                    `Rendered output QA failed with ${input.renderedOutputGate.result.issues.length} issue(s).`,
                    target
                )
            );
        }
    }

    const rejectionReasons = [
        ...blockingIssues.map((issue) => issue.message),
        ...rejectionIssues.map((issue) => issue.message),
    ];

    return {
        accepted: blockingIssues.length === 0 && rejectionIssues.length === 0,
        policyVersion: SCENARIO_ACCEPTANCE_POLICY_VERSION,
        blockingIssues,
        rejectionIssues,
        rejectionReasons,
        editorialReview,
    };
}
