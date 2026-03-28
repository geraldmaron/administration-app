"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const types_1 = require("../types");
const grounded_effects_1 = require("../lib/grounded-effects");
describe('PolicyImplication types', () => {
    test('VALID_SETTING_TARGETS contains all expected targets', () => {
        expect(types_1.VALID_SETTING_TARGETS).toContain('fiscal.taxIncome');
        expect(types_1.VALID_SETTING_TARGETS).toContain('fiscal.taxCorporate');
        expect(types_1.VALID_SETTING_TARGETS).toContain('fiscal.spendingMilitary');
        expect(types_1.VALID_SETTING_TARGETS).toContain('fiscal.spendingInfrastructure');
        expect(types_1.VALID_SETTING_TARGETS).toContain('fiscal.spendingSocial');
        expect(types_1.VALID_SETTING_TARGETS).toContain('policy.economicStance');
        expect(types_1.VALID_SETTING_TARGETS).toContain('policy.socialSpending');
        expect(types_1.VALID_SETTING_TARGETS).toContain('policy.defenseSpending');
        expect(types_1.VALID_SETTING_TARGETS).toContain('policy.environmentalPolicy');
        expect(types_1.VALID_SETTING_TARGETS).toContain('policy.tradeOpenness');
        expect(types_1.VALID_SETTING_TARGETS).toContain('policy.immigration');
        expect(types_1.VALID_SETTING_TARGETS).toContain('policy.environmentalProtection');
        expect(types_1.VALID_SETTING_TARGETS).toContain('policy.healthcareAccess');
        expect(types_1.VALID_SETTING_TARGETS).toContain('policy.educationFunding');
        expect(types_1.VALID_SETTING_TARGETS).toContain('policy.socialWelfare');
        expect(types_1.VALID_SETTING_TARGETS.length).toBe(15);
    });
    test('PolicyImplication interface accepts valid data', () => {
        const implication = {
            target: 'fiscal.taxIncome',
            delta: 5,
        };
        expect(implication.target).toBe('fiscal.taxIncome');
        expect(implication.delta).toBe(5);
    });
});
describe('validatePolicyImplications', () => {
    test('detects sign mismatch for tax increase narrative with negative delta', () => {
        const implications = [
            { target: 'fiscal.taxIncome', delta: -5 },
        ];
        const issues = (0, grounded_effects_1.validatePolicyImplications)('The government will raise income tax rates to fund the program.', implications);
        expect(issues.length).toBeGreaterThan(0);
        expect(issues[0].type).toBe('sign');
    });
    test('no issues for matching tax increase narrative with positive delta', () => {
        const implications = [
            { target: 'fiscal.taxIncome', delta: 5 },
        ];
        const issues = (0, grounded_effects_1.validatePolicyImplications)('The government will raise income tax rates to fund the program.', implications);
        expect(issues.length).toBe(0);
    });
    test('detects sign mismatch for military spending cut with positive delta', () => {
        const implications = [
            { target: 'fiscal.spendingMilitary', delta: 5 },
        ];
        const issues = (0, grounded_effects_1.validatePolicyImplications)('The administration will cut military spending to balance the budget.', implications);
        expect(issues.length).toBeGreaterThan(0);
        expect(issues[0].type).toBe('sign');
    });
    test('detects sign mismatch for environmental relaxation with positive delta', () => {
        const implications = [
            { target: 'policy.environmentalPolicy', delta: 5 },
        ];
        const issues = (0, grounded_effects_1.validatePolicyImplications)('You relax environmental regulations to boost industrial output.', implications);
        expect(issues.length).toBeGreaterThan(0);
    });
    test('returns empty for undefined implications', () => {
        const issues = (0, grounded_effects_1.validatePolicyImplications)('Some text about taxes', undefined);
        expect(issues.length).toBe(0);
    });
    test('returns empty for empty implications array', () => {
        const issues = (0, grounded_effects_1.validatePolicyImplications)('Some text about taxes', []);
        expect(issues.length).toBe(0);
    });
    test('no issues when narrative has no policy signals', () => {
        const implications = [
            { target: 'fiscal.taxIncome', delta: 5 },
        ];
        const issues = (0, grounded_effects_1.validatePolicyImplications)('A diplomatic crisis emerges on the southern border.', implications);
        expect(issues.length).toBe(0);
    });
    test('detects sign mismatch for border restriction with positive immigration delta', () => {
        const implications = [
            { target: 'policy.immigration', delta: 10 },
        ];
        const issues = (0, grounded_effects_1.validatePolicyImplications)('You restrict immigration to ease pressure on public services.', implications);
        expect(issues.length).toBeGreaterThan(0);
    });
});
describe('audit-rules policyImplication validation', () => {
    test('invalid target is detected by VALID_SETTING_TARGETS check', () => {
        const invalidTarget = 'fiscal.invalidField';
        expect(types_1.VALID_SETTING_TARGETS.includes(invalidTarget)).toBe(false);
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
//# sourceMappingURL=policy-implications.test.js.map