"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const scenario_acceptance_1 = require("../lib/scenario-acceptance");
function makeIssue(rule, severity = 'error', message) {
    return {
        severity,
        rule,
        target: 'scenario_1',
        message: message || rule,
        autoFixable: false,
    };
}
function makeContentQualityResult(overrides = {}) {
    return Object.assign({ pass: true, warn: false, grammar: { score: 4, issues: [] }, tone: { score: 4, issues: [] }, coherence: { score: 4, issues: [] }, readability: { score: 4, issues: [] }, optionConsistency: { score: 4, issues: [] }, advisorQuality: { score: 4, issues: [] }, overallScore: 4, regenerateFields: [] }, overrides);
}
function makeNarrativeReviewResult(overrides = {}) {
    return Object.assign({ pass: true, engagement: { score: 4, reasoning: 'good' }, strategicDepth: { score: 4, reasoning: 'good' }, optionDifferentiation: { score: 4, reasoning: 'good' }, consequenceQuality: { score: 4, reasoning: 'good' }, replayValue: { score: 4, reasoning: 'good' }, overallScore: 4, editorialNotes: [] }, overrides);
}
function makeInput(overrides = {}) {
    return Object.assign({ auditScore: 85, auditPassThreshold: 80, issues: [], contentQualityGate: {
            enabled: true,
            usable: true,
            result: makeContentQualityResult(),
        }, narrativeReviewGate: {
            enabled: true,
            usable: true,
            result: makeNarrativeReviewResult(),
        } }, overrides);
}
describe('decideScenarioAcceptance', () => {
    test('rejects when banned phrase exists despite passing score', () => {
        const decision = (0, scenario_acceptance_1.decideScenarioAcceptance)(makeInput({ issues: [makeIssue('banned-phrase')] }));
        expect(decision.accepted).toBe(false);
        expect(decision.blockingIssues.map((issue) => issue.rule)).toContain('banned-phrase');
    });
    test('rejects when hardcoded government structure issue is emitted', () => {
        const decision = (0, scenario_acceptance_1.decideScenarioAcceptance)(makeInput({ issues: [makeIssue('hardcoded-gov-structure')] }));
        expect(decision.accepted).toBe(false);
        expect(decision.blockingIssues.map((issue) => issue.rule)).toContain('hardcoded-gov-structure');
    });
    test('rejects when hardcoded institution phrase issue is emitted', () => {
        const decision = (0, scenario_acceptance_1.decideScenarioAcceptance)(makeInput({ issues: [makeIssue('hardcoded-institution-phrase')] }));
        expect(decision.accepted).toBe(false);
        expect(decision.blockingIssues.map((issue) => issue.rule)).toContain('hardcoded-institution-phrase');
    });
    test('rejects when outcome uses second person despite passing score', () => {
        const decision = (0, scenario_acceptance_1.decideScenarioAcceptance)(makeInput({ issues: [makeIssue('outcome-second-person')] }));
        expect(decision.accepted).toBe(false);
        expect(decision.blockingIssues.map((issue) => issue.rule)).toContain('outcome-second-person');
    });
    test('rejects when advisor boilerplate is an error', () => {
        const decision = (0, scenario_acceptance_1.decideScenarioAcceptance)(makeInput({ issues: [makeIssue('advisor-boilerplate')] }));
        expect(decision.accepted).toBe(false);
        expect(decision.blockingIssues.map((issue) => issue.rule)).toContain('advisor-boilerplate');
    });
    test('accepts warn-only scenarios below threshold', () => {
        const decision = (0, scenario_acceptance_1.decideScenarioAcceptance)(makeInput({
            auditScore: 76,
            auditPassThreshold: 80,
            issues: [makeIssue('hardcoded-the-before-token', 'warn')],
        }));
        expect(decision.accepted).toBe(true);
        expect(decision.rejectionIssues).toHaveLength(0);
    });
    test('rejects when audit score is below configured threshold and errors remain', () => {
        const decision = (0, scenario_acceptance_1.decideScenarioAcceptance)(makeInput({
            auditScore: 79,
            auditPassThreshold: 80,
            issues: [makeIssue('adjacency-token-mismatch')],
        }));
        expect(decision.accepted).toBe(false);
        expect(decision.rejectionIssues.map((issue) => issue.rule)).toContain('audit-score-below-threshold');
    });
    test('rejects when content quality gate fails', () => {
        const decision = (0, scenario_acceptance_1.decideScenarioAcceptance)(makeInput({
            contentQualityGate: {
                enabled: true,
                usable: true,
                result: makeContentQualityResult({ pass: false, overallScore: 3.2 }),
            },
        }));
        expect(decision.accepted).toBe(false);
        expect(decision.rejectionIssues.map((issue) => issue.rule)).toContain('content-quality-violation');
    });
    test('does not reject when enabled content quality gate result is unavailable', () => {
        const decision = (0, scenario_acceptance_1.decideScenarioAcceptance)(makeInput({
            contentQualityGate: {
                enabled: true,
                usable: false,
                result: null,
                error: 'content quality timeout',
            },
        }));
        expect(decision.accepted).toBe(true);
    });
    test('rejects when narrative differentiation, consequence, or replay is catastrophically low', () => {
        const decision = (0, scenario_acceptance_1.decideScenarioAcceptance)(makeInput({
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
        expect(decision.rejectionIssues.map((issue) => issue.rule)).toContain('narrative-review-violation');
    });
    test('does not reject when enabled narrative review gate result is unavailable', () => {
        const decision = (0, scenario_acceptance_1.decideScenarioAcceptance)(makeInput({
            narrativeReviewGate: {
                enabled: true,
                usable: false,
                result: null,
                error: 'narrative review unavailable',
            },
        }));
        expect(decision.accepted).toBe(true);
    });
    test('rejects when unresolved non-blocking audit errors remain', () => {
        const decision = (0, scenario_acceptance_1.decideScenarioAcceptance)(makeInput({
            issues: [makeIssue('adjacency-token-mismatch')],
        }));
        expect(decision.accepted).toBe(false);
        expect(decision.rejectionIssues.map((issue) => issue.rule)).toContain('unresolved-audit-errors');
    });
    test('accepts when all gates pass', () => {
        const decision = (0, scenario_acceptance_1.decideScenarioAcceptance)(makeInput());
        expect(decision.accepted).toBe(true);
        expect(decision.rejectionIssues).toHaveLength(0);
    });
});
//# sourceMappingURL=scenario-acceptance.test.js.map