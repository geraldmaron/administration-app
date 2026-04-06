import { decideScenarioAcceptance } from '../lib/scenario-acceptance';
import type { Issue } from '../lib/audit-rules';
import type { ContentQualityResult } from '../lib/content-quality';
import type { NarrativeReviewResult } from '../lib/narrative-review';
import type { RenderedOutputQaResult } from '../lib/rendered-output-qa';

function makeIssue(rule: string, severity: 'error' | 'warn' = 'error', message?: string): Issue {
    return {
        severity,
        rule,
        target: 'scenario_1',
        message: message || rule,
        autoFixable: false,
    };
}

function makeContentQualityResult(overrides: Partial<ContentQualityResult> = {}): ContentQualityResult {
    return {
        pass: true,
        warn: false,
        grammar: { score: 4 as const, issues: [] },
        tone: { score: 4 as const, issues: [] },
        coherence: { score: 4 as const, issues: [] },
        readability: { score: 4 as const, issues: [] },
        optionConsistency: { score: 4 as const, issues: [] },
        advisorQuality: { score: 4 as const, issues: [] },
        specificity: { score: 4 as const, issues: [] },
        overallScore: 4,
        regenerateFields: [],
        ...overrides,
    };
}

function makeNarrativeReviewResult(overrides: Partial<NarrativeReviewResult> = {}): NarrativeReviewResult {
    return {
        pass: true,
        engagement: { score: 4 as const, reasoning: 'good' },
        strategicDepth: { score: 4 as const, reasoning: 'good' },
        optionDifferentiation: { score: 4 as const, reasoning: 'good' },
        consequenceQuality: { score: 4 as const, reasoning: 'good' },
        replayValue: { score: 4 as const, reasoning: 'good' },
        overallScore: 4,
        editorialNotes: [],
        ...overrides,
    };
}

function makeInput(overrides: Partial<Parameters<typeof decideScenarioAcceptance>[0]> = {}) {
    return {
        auditScore: 85,
        auditPassThreshold: 80,
        issues: [],
        contentQualityGate: {
            enabled: true,
            usable: true,
            result: makeContentQualityResult(),
        },
        narrativeReviewGate: {
            enabled: true,
            usable: true,
            result: makeNarrativeReviewResult(),
        },
        renderedOutputGate: {
            enabled: true,
            usable: true,
            result: {
                pass: true,
                sampleCount: 1,
                issues: [],
                samples: [],
            } satisfies RenderedOutputQaResult,
        },
        ...overrides,
    };
}

describe('decideScenarioAcceptance', () => {
    test('rejects when banned phrase exists despite passing score', () => {
        const decision = decideScenarioAcceptance(makeInput({ issues: [makeIssue('banned-phrase')] }));
        expect(decision.accepted).toBe(false);
        expect(decision.blockingIssues.map((issue) => issue.rule)).toContain('banned-phrase');
    });

    test('rejects when hardcoded government structure issue is emitted', () => {
        const decision = decideScenarioAcceptance(makeInput({ issues: [makeIssue('hardcoded-gov-structure')] }));
        expect(decision.accepted).toBe(false);
        expect(decision.blockingIssues.map((issue) => issue.rule)).toContain('hardcoded-gov-structure');
    });

    test('rejects when hardcoded institution phrase issue is emitted', () => {
        const decision = decideScenarioAcceptance(makeInput({ issues: [makeIssue('hardcoded-institution-phrase')] }));
        expect(decision.accepted).toBe(false);
        expect(decision.blockingIssues.map((issue) => issue.rule)).toContain('hardcoded-institution-phrase');
    });

    test('rejects when outcome uses second person despite passing score', () => {
        const decision = decideScenarioAcceptance(makeInput({ issues: [makeIssue('outcome-second-person')] }));
        expect(decision.accepted).toBe(false);
        expect(decision.blockingIssues.map((issue) => issue.rule)).toContain('outcome-second-person');
    });

    test('rejects when advisor boilerplate is an error', () => {
        const decision = decideScenarioAcceptance(makeInput({ issues: [makeIssue('advisor-boilerplate')] }));
        expect(decision.accepted).toBe(false);
        expect(decision.blockingIssues.map((issue) => issue.rule)).toContain('advisor-boilerplate');
    });

    test('rejects warn-only scenarios below threshold', () => {
        const decision = decideScenarioAcceptance(makeInput({
            auditScore: 76,
            auditPassThreshold: 80,
            issues: [makeIssue('hardcoded-the-before-token', 'warn')],
        }));
        expect(decision.accepted).toBe(false);
        expect(decision.rejectionIssues.map((issue) => issue.rule)).toContain('audit-score-below-threshold');
    });

    test('rejects when audit score is below configured threshold and errors remain', () => {
        const decision = decideScenarioAcceptance(makeInput({
            auditScore: 79,
            auditPassThreshold: 80,
            issues: [makeIssue('adjacency-token-mismatch')],
        }));
        expect(decision.accepted).toBe(false);
        expect(decision.rejectionIssues.map((issue) => issue.rule)).toContain('audit-score-below-threshold');
    });

    test('rejects when content quality gate fails', () => {
        const decision = decideScenarioAcceptance(makeInput({
            contentQualityGate: {
                enabled: true,
                usable: true,
                result: makeContentQualityResult({ pass: false, overallScore: 3.2 }),
            },
        }));
        expect(decision.accepted).toBe(false);
        expect(decision.rejectionIssues.map((issue) => issue.rule)).toContain('editorial-review-violation');
        expect(decision.rejectionIssues.map((issue) => issue.rule)).toContain('content-quality-violation');
        expect(decision.editorialReview.pass).toBe(false);
    });

    test('rejects when enabled content quality gate result is unavailable', () => {
        const decision = decideScenarioAcceptance(makeInput({
            contentQualityGate: {
                enabled: true,
                usable: false,
                result: null,
                error: 'content quality timeout',
            },
        }));
        expect(decision.accepted).toBe(false);
        expect(decision.rejectionIssues.map((issue) => issue.rule)).toContain('content-quality-unavailable');
    });

    test('rejects when narrative differentiation, consequence, or replay is catastrophically low', () => {
        const decision = decideScenarioAcceptance(makeInput({
            narrativeReviewGate: {
                enabled: true,
                usable: true,
                result: makeNarrativeReviewResult({
                    optionDifferentiation: { score: 1, reasoning: 'weak' },
                    consequenceQuality: { score: 2, reasoning: 'ok' },
                    replayValue: { score: 2, reasoning: 'ok' },
                    overallScore: 2.4,
                }),
            },
        }));
        expect(decision.accepted).toBe(false);
        expect(decision.rejectionIssues.map((issue) => issue.rule)).toContain('editorial-review-violation');
        expect(decision.editorialReview.pass).toBe(false);
    });

    test('rejects when enabled narrative review gate result is unavailable', () => {
        const decision = decideScenarioAcceptance(makeInput({
            narrativeReviewGate: {
                enabled: true,
                usable: false,
                result: null,
                error: 'narrative review unavailable',
            },
        }));
        expect(decision.accepted).toBe(false);
        expect(decision.rejectionIssues.map((issue) => issue.rule)).toContain('narrative-review-unavailable');
    });

    test('rejects when rendered output QA fails', () => {
        const decision = decideScenarioAcceptance(makeInput({
            renderedOutputGate: {
                enabled: true,
                usable: true,
                result: {
                    pass: false,
                    sampleCount: 2,
                    issues: [makeIssue('rendered-output-unresolved-token')],
                    samples: [],
                },
            },
        }));
        expect(decision.accepted).toBe(false);
        expect(decision.rejectionIssues.map((issue) => issue.rule)).toContain('rendered-output-unresolved-token');
        expect(decision.rejectionIssues.map((issue) => issue.rule)).toContain('rendered-output-violation');
    });

    test('rejects when unresolved non-blocking audit errors remain', () => {
        const decision = decideScenarioAcceptance(makeInput({
            issues: [makeIssue('adjacency-token-mismatch')],
        }));
        expect(decision.accepted).toBe(false);
        expect(decision.rejectionIssues.map((issue) => issue.rule)).toContain('unresolved-audit-errors');
    });

    test('accepts when all gates pass', () => {
        const decision = decideScenarioAcceptance(makeInput());
        expect(decision.accepted).toBe(true);
        expect(decision.rejectionIssues).toHaveLength(0);
        expect(decision.editorialReview.pass).toBe(true);
        expect(decision.editorialReview.usable).toBe(true);
    });

    test('rejects when editorial gates are enabled but both results are unavailable', () => {
        const decision = decideScenarioAcceptance(makeInput({
            contentQualityGate: {
                enabled: true,
                usable: false,
                result: null,
                error: 'content quality timeout',
            },
            narrativeReviewGate: {
                enabled: true,
                usable: false,
                result: null,
                error: 'narrative review timeout',
            },
        }));

        expect(decision.accepted).toBe(false);
        expect(decision.editorialReview.usable).toBe(false);
        expect(decision.rejectionIssues.map((issue) => issue.rule)).toContain('content-quality-unavailable');
        expect(decision.rejectionIssues.map((issue) => issue.rule)).toContain('narrative-review-unavailable');
    });
});
