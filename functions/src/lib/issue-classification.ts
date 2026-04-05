import type { Issue } from './audit-rules';

export type RepairActionType =
    | 'text-expansion'
    | 'token-fix'
    | 'advisor-regen'
    | 'title-fix'
    | 'label-fix'
    | 'voice-fix'
    | 'tone-fix'
    | 'option-differentiation-fix';

export interface RepairAction {
    type: RepairActionType;
    targetFields: string[];
    issues: Issue[];
}

const RULE_TO_ACTION: Record<string, RepairActionType> = {
    'description-length': 'text-expansion',
    'description-word-count': 'text-expansion',
    'option-text-length': 'text-expansion',
    'option-text-word-count': 'text-expansion',
    'short-summary': 'text-expansion',
    'short-article': 'text-expansion',

    'hardcoded-the-before-token': 'token-fix',
    'sentence-start-bare-token': 'token-fix',
    'adjacency-token-mismatch': 'token-fix',
    'token-grammar-issue': 'token-fix',
    'hard-coded-currency': 'token-fix',
    'gdp-as-amount': 'token-fix',

    'advisor-boilerplate': 'advisor-regen',
    'invalid-role-id': 'advisor-regen',

    'title-too-short': 'title-fix',
    'formulaic-title': 'title-fix',
    'duplicate-word-in-title': 'title-fix',

    'label-has-token': 'label-fix',
    'label-complexity': 'label-fix',
    'label-quality': 'label-fix',

    'outcome-second-person': 'voice-fix',
    'third-person-framing': 'voice-fix',
    'high-passive-voice': 'voice-fix',
    'complex-sentence': 'voice-fix',
    'lowercase-start': 'voice-fix',

    'banned-phrase': 'tone-fix',
    'hardcoded-institution-phrase': 'tone-fix',
    'hardcoded-gov-structure': 'tone-fix',
    'informal-tone': 'tone-fix',
    'jargon-use': 'tone-fix',

    'option-metric-overlap': 'option-differentiation-fix',
    'option-domain-missing-primary': 'option-differentiation-fix',
    'option-domain-duplicate-primary': 'option-differentiation-fix',
};

export function classifyRepairActions(issues: Issue[]): RepairAction[] {
    const grouped = new Map<RepairActionType, Issue[]>();

    for (const issue of issues) {
        const actionType = RULE_TO_ACTION[issue.rule];
        if (!actionType) continue;
        const existing = grouped.get(actionType) ?? [];
        existing.push(issue);
        grouped.set(actionType, existing);
    }

    const actions: RepairAction[] = [];
    for (const [type, groupIssues] of grouped) {
        const targetFields = [...new Set(groupIssues.map(i => i.target))];
        actions.push({ type, targetFields, issues: groupIssues });
    }

    // If there are error-severity issues with no repair action, skip text-expansion.
    // Those unresolvable errors constrain the score ceiling, and an expansion LLM call
    // risks introducing additional issues (and wasting a model call) without ever
    // being able to clear the blocking error.
    const hasUnresolvableErrors = issues.some(
        i => i.severity === 'error' && !RULE_TO_ACTION[i.rule]
    );
    if (hasUnresolvableErrors) {
        return actions.filter(a => a.type !== 'text-expansion');
    }

    return actions;
}

export const HEURISTIC_FIXABLE_RULE_IDS = new Set([
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
    'option-metric-overlap',
    'option-domain-missing-primary',
    'option-domain-duplicate-primary',
]);

export type RemediationBucket = 'clean' | 'auto-fix' | 'heuristic-fix' | 'manual-review';

export interface IssueRemediationClassification {
    bucket: RemediationBucket;
    reason: string;
    totalIssues: number;
    autoFixableCount: number;
    heuristicFixableCount: number;
    blockingCount: number;
}

export function classifyIssueRemediation(issues: readonly Issue[]): IssueRemediationClassification {
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
    const heuristicFixableCount = issues.filter((issue) => issue.autoFixable || HEURISTIC_FIXABLE_RULE_IDS.has(issue.rule)).length;
    const blockingCount = issues.filter((issue) => issue.severity === 'error' && !issue.autoFixable && !HEURISTIC_FIXABLE_RULE_IDS.has(issue.rule)).length;

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

    if (issues.every((issue) => issue.autoFixable || HEURISTIC_FIXABLE_RULE_IDS.has(issue.rule))) {
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
