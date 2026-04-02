import { classifyRepairActions } from '../lib/issue-classification';
import type { Issue } from '../lib/audit-rules';

function makeIssue(rule: string, severity: Issue['severity'] = 'warn'): Issue {
    return { rule, severity, target: 'scenario_test', message: `test: ${rule}`, autoFixable: false };
}

describe('classifyRepairActions', () => {
    test('returns text-expansion action for description-length when no unresolvable errors', () => {
        const issues: Issue[] = [makeIssue('description-length', 'warn')];
        const actions = classifyRepairActions(issues);
        expect(actions.some(a => a.type === 'text-expansion')).toBe(true);
    });

    test('suppresses text-expansion when an error-severity issue has no repair action', () => {
        const issues: Issue[] = [
            makeIssue('description-length', 'warn'),
            makeIssue('option-text-length', 'warn'),
            makeIssue('invalid-token', 'error'),
        ];
        const actions = classifyRepairActions(issues);
        expect(actions.some(a => a.type === 'text-expansion')).toBe(false);
    });

    test('still returns other repair actions (non-text-expansion) when unresolvable error is present', () => {
        const issues: Issue[] = [
            makeIssue('advisor-boilerplate', 'warn'),
            makeIssue('invalid-token', 'error'),
        ];
        const actions = classifyRepairActions(issues);
        expect(actions.some(a => a.type === 'advisor-regen')).toBe(true);
        expect(actions.some(a => a.type === 'text-expansion')).toBe(false);
    });

    test('does not suppress text-expansion for warn-severity unresolvable issues', () => {
        const issues: Issue[] = [
            makeIssue('description-length', 'warn'),
            makeIssue('newsroom-jargon', 'warn'), // no repair action, but only warn
        ];
        const actions = classifyRepairActions(issues);
        expect(actions.some(a => a.type === 'text-expansion')).toBe(true);
    });

    test('returns empty array when all issues have no repair action', () => {
        const issues: Issue[] = [makeIssue('invalid-token', 'error')];
        const actions = classifyRepairActions(issues);
        expect(actions).toHaveLength(0);
    });
});
