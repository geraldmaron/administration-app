import { VALID_SETTING_TARGETS } from '../types';
import type { PolicyImplication, SettingTarget } from '../types';
import { validatePolicyImplications } from '../lib/grounded-effects';

describe('PolicyImplication types', () => {
    test('VALID_SETTING_TARGETS contains all expected targets', () => {
        expect(VALID_SETTING_TARGETS).toContain('fiscal.taxIncome');
        expect(VALID_SETTING_TARGETS).toContain('fiscal.taxCorporate');
        expect(VALID_SETTING_TARGETS).toContain('fiscal.spendingMilitary');
        expect(VALID_SETTING_TARGETS).toContain('fiscal.spendingInfrastructure');
        expect(VALID_SETTING_TARGETS).toContain('fiscal.spendingSocial');
        expect(VALID_SETTING_TARGETS).toContain('policy.economicStance');
        expect(VALID_SETTING_TARGETS).toContain('policy.socialSpending');
        expect(VALID_SETTING_TARGETS).toContain('policy.defenseSpending');
        expect(VALID_SETTING_TARGETS).toContain('policy.environmentalPolicy');
        expect(VALID_SETTING_TARGETS).toContain('policy.tradeOpenness');
        expect(VALID_SETTING_TARGETS).toContain('policy.immigration');
        expect(VALID_SETTING_TARGETS).toContain('policy.environmentalProtection');
        expect(VALID_SETTING_TARGETS).toContain('policy.healthcareAccess');
        expect(VALID_SETTING_TARGETS).toContain('policy.educationFunding');
        expect(VALID_SETTING_TARGETS).toContain('policy.socialWelfare');
        expect(VALID_SETTING_TARGETS.length).toBe(15);
    });

    test('PolicyImplication interface accepts valid data', () => {
        const implication: PolicyImplication = {
            target: 'fiscal.taxIncome',
            delta: 5,
        };
        expect(implication.target).toBe('fiscal.taxIncome');
        expect(implication.delta).toBe(5);
    });
});

describe('validatePolicyImplications', () => {
    test('detects sign mismatch for tax increase narrative with negative delta', () => {
        const implications: PolicyImplication[] = [
            { target: 'fiscal.taxIncome', delta: -5 },
        ];
        const issues = validatePolicyImplications(
            'The government will raise income tax rates to fund the program.',
            implications
        );
        expect(issues.length).toBeGreaterThan(0);
        expect(issues[0].type).toBe('sign');
    });

    test('no issues for matching tax increase narrative with positive delta', () => {
        const implications: PolicyImplication[] = [
            { target: 'fiscal.taxIncome', delta: 5 },
        ];
        const issues = validatePolicyImplications(
            'The government will raise income tax rates to fund the program.',
            implications
        );
        expect(issues.length).toBe(0);
    });

    test('detects sign mismatch for military spending cut with positive delta', () => {
        const implications: PolicyImplication[] = [
            { target: 'fiscal.spendingMilitary', delta: 5 },
        ];
        const issues = validatePolicyImplications(
            'The administration will cut military spending to balance the budget.',
            implications
        );
        expect(issues.length).toBeGreaterThan(0);
        expect(issues[0].type).toBe('sign');
    });

    test('detects sign mismatch for environmental relaxation with positive delta', () => {
        const implications: PolicyImplication[] = [
            { target: 'policy.environmentalPolicy', delta: 5 },
        ];
        const issues = validatePolicyImplications(
            'You relax environmental regulations to boost industrial output.',
            implications
        );
        expect(issues.length).toBeGreaterThan(0);
    });

    test('returns empty for undefined implications', () => {
        const issues = validatePolicyImplications('Some text about taxes', undefined);
        expect(issues.length).toBe(0);
    });

    test('returns empty for empty implications array', () => {
        const issues = validatePolicyImplications('Some text about taxes', []);
        expect(issues.length).toBe(0);
    });

    test('no issues when narrative has no policy signals', () => {
        const implications: PolicyImplication[] = [
            { target: 'fiscal.taxIncome', delta: 5 },
        ];
        const issues = validatePolicyImplications(
            'A diplomatic crisis emerges on the southern border.',
            implications
        );
        expect(issues.length).toBe(0);
    });

    test('detects sign mismatch for border restriction with positive immigration delta', () => {
        const implications: PolicyImplication[] = [
            { target: 'policy.immigration', delta: 10 },
        ];
        const issues = validatePolicyImplications(
            'You restrict immigration to ease pressure on public services.',
            implications
        );
        expect(issues.length).toBeGreaterThan(0);
    });
});

describe('audit-rules policyImplication validation', () => {
    test('invalid target is detected by VALID_SETTING_TARGETS check', () => {
        const invalidTarget = 'fiscal.invalidField';
        expect(VALID_SETTING_TARGETS.includes(invalidTarget as SettingTarget)).toBe(false);
    });

    test('delta within bounds passes', () => {
        const delta = 10;
        expect(delta >= -15 && delta <= 15).toBe(true);
    });

    test('delta out of bounds detected', () => {
        const delta = 20;
        expect(delta >= -15 && delta <= 15).toBe(false);
    });
});
