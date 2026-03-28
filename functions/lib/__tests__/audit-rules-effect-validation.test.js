"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const token_registry_1 = require("../lib/token-registry");
const audit_rules_1 = require("../lib/audit-rules");
function makeAuditConfig() {
    return {
        validMetricIds: new Set(['economy', 'approval']),
        validRoleIds: new Set(token_registry_1.CANONICAL_ROLE_IDS),
        inverseMetrics: new Set(),
        metricMagnitudeCaps: { economy: 4.2, approval: 3.5 },
        defaultCap: 4.2,
        metricToRoles: {
            economy: ['role_executive'],
            approval: ['role_executive'],
        },
        categoryDomainMetrics: { bundle_economy: ['economy'] },
        metricMappings: {},
        bannedPhrases: [],
        validTokens: new Set(token_registry_1.ALL_TOKENS),
        logicParameters: {
            duration: { min: 1, max: 20 },
            probability: { required: 1 },
        },
        govTypesByCountryId: {},
        countriesById: {},
    };
}
function makeScenario(effectValue) {
    return {
        id: 'effect_validation_scenario',
        title: 'Emergency tax review rattles exporters',
        description: 'Cabinet officials are reviewing a fast-moving tax dispute with major exporters after a revenue shortfall forced emergency talks with lenders. The administration needs a response that stabilizes trade and calms markets before layoffs begin to spread.',
        options: [
            {
                id: 'option_a',
                text: 'You issue a temporary stabilization package for key exporters and order a fast fiscal review to contain the market panic. The move reassures investors in the short term, but it commits the administration to defend the package if revenues keep weakening.',
                effects: [{ targetMetricId: 'economy', value: effectValue, duration: 3, probability: 1 }],
                outcomeHeadline: 'Markets react to emergency export package',
                outcomeSummary: 'Financial markets steady after the administration rolls out a temporary package for major exporters, reducing immediate panic while economists debate whether the relief can be sustained without a wider fiscal correction over the next quarter.',
                outcomeContext: 'Officials race to explain the package as a short-term stabilizer rather than a permanent subsidy, giving trade-sensitive industries a chance to keep orders moving while lawmakers demand evidence that the emergency support will not turn into a larger structural burden.',
                advisorFeedback: [
                    {
                        roleId: 'role_executive',
                        stance: 'support',
                        feedback: 'The package buys time and steadies expectations, but the administration will need a credible fiscal path quickly if the relief is going to preserve confidence.',
                    },
                ],
            },
            {
                id: 'option_b',
                text: 'You reject emergency spending and tell ministries to absorb the shock through internal cuts while trade officials search for a narrower compromise. The harder line preserves budget discipline, though it leaves exporters exposed to a sharper confidence hit in the near term.',
                effects: [{ targetMetricId: 'economy', value: -1.2, duration: 2, probability: 1 }],
                outcomeHeadline: 'Treasury rejects broad bailout demands',
                outcomeSummary: 'Budget hawks welcome the refusal to fund a larger bailout, but exporters warn that the administration may be underestimating how quickly a confidence shock can spread through supply contracts, employment plans, and regional investment expectations.',
                outcomeContext: 'The decision protects fiscal flexibility in the short run, yet industry groups intensify pressure on ministers as orders slow and local officials warn that the dispute could begin damaging hiring and production well before a longer compromise is negotiated.',
                advisorFeedback: [
                    {
                        roleId: 'role_executive',
                        stance: 'oppose',
                        feedback: 'Holding the line protects the budget today, but the administration may pay for that discipline if the commercial shock starts feeding through to jobs and confidence.',
                    },
                ],
            },
            {
                id: 'option_c',
                text: 'You open a structured mediation process with industry leaders and ask the central bank to signal limited liquidity support if conditions worsen. The compromise cools immediate tensions, but critics say it delays a clearer economic decision.',
                effects: [{ targetMetricId: 'approval', value: 1.1, duration: 2, probability: 1 }],
                outcomeHeadline: 'Mediation plan slows the immediate panic',
                outcomeSummary: 'A structured mediation process lowers the immediate temperature around the dispute and gives investors a more orderly timeline, even as critics argue that the administration is still postponing the harder choices needed to restore long-term certainty.',
                outcomeContext: 'Officials use the breathing room to gather industry demands and prepare contingency options, while business groups wait to see whether the calmer tone can translate into a settlement strong enough to stabilize contracts, shipping schedules, and workforce plans.',
                advisorFeedback: [
                    {
                        roleId: 'role_executive',
                        stance: 'neutral',
                        feedback: 'The mediation route reduces immediate turbulence, but the administration will need a clear endpoint or the process will start to look like drift rather than control.',
                    },
                ],
            },
        ],
        metadata: {
            bundle: 'bundle_economy',
            severity: 'medium',
            urgency: 'medium',
            difficulty: 3,
            scopeTier: 'universal',
            scopeKey: 'universal',
            sourceKind: 'evergreen',
        },
        phase: 'root',
    };
}
describe('auditScenario effect cap validation', () => {
    beforeEach(() => {
        (0, audit_rules_1.setAuditConfigForTests)(makeAuditConfig());
    });
    afterEach(() => {
        (0, audit_rules_1.setAuditConfigForTests)(null);
    });
    test('flags effect values that exceed configured caps as repairable errors', () => {
        const issues = (0, audit_rules_1.auditScenario)(makeScenario(9.5), 'bundle_economy');
        expect(issues.some((issue) => issue.rule === 'effect-cap-exceeded' && issue.severity === 'error')).toBe(true);
    });
    test('deterministicFix clamps effect values back to the configured cap', () => {
        var _a, _b;
        const scenario = makeScenario(9.5);
        const beforeIssues = (0, audit_rules_1.auditScenario)(scenario, 'bundle_economy');
        expect(beforeIssues.some((issue) => issue.rule === 'effect-cap-exceeded')).toBe(true);
        const fixed = (0, audit_rules_1.deterministicFix)(scenario);
        expect(fixed.fixed).toBe(true);
        expect((_b = (_a = scenario.options[0]) === null || _a === void 0 ? void 0 : _a.effects[0]) === null || _b === void 0 ? void 0 : _b.value).toBe(4.2);
        const afterIssues = (0, audit_rules_1.auditScenario)(scenario, 'bundle_economy');
        expect(afterIssues.some((issue) => issue.rule === 'effect-cap-exceeded')).toBe(false);
    });
    test('does not flag effect values that are already within the configured cap', () => {
        const issues = (0, audit_rules_1.auditScenario)(makeScenario(3.8), 'bundle_economy');
        expect(issues.some((issue) => issue.rule === 'effect-cap-exceeded')).toBe(false);
    });
});
//# sourceMappingURL=audit-rules-effect-validation.test.js.map