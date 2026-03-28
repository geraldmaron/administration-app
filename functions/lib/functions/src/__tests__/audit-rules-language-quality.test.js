"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const token_registry_1 = require("../lib/token-registry");
const audit_rules_1 = require("../lib/audit-rules");
function makeAuditConfig() {
    return {
        validMetricIds: new Set(['economy']),
        validRoleIds: new Set(token_registry_1.CANONICAL_ROLE_IDS),
        inverseMetrics: new Set(),
        metricMagnitudeCaps: { economy: 4 },
        defaultCap: 4,
        metricToRoles: { economy: ['role_executive'] },
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
function makeScenario() {
    return {
        id: 'language_quality_scenario',
        title: 'Regional Bloc Gambit Escalates',
        description: 'A regional bloc has warned your cabinet that new tariff retaliation will begin within days unless customs checks are eased. You need a response that stabilizes trade flows before exporters lose contracts and domestic prices rise.',
        options: [
            {
                id: 'option_a',
                text: 'You open emergency talks with the bloc and suspend the latest inspection order while negotiators meet. The pause buys time for port operators, but domestic producers warn that the concession may weaken your leverage.',
                effects: [{ targetMetricId: 'economy', value: 1, duration: 3, probability: 1 }],
                outcomeHeadline: 'Bloc backs temporary pause',
                outcomeSummary: 'Trade officials from the bloc welcomed the pause and reopened talks after your cabinet suspended the latest inspection order. Exporters gained immediate relief, but domestic producers accused the government of giving away bargaining power before a settlement was secured.',
                outcomeContext: 'Port traffic improved after customs checks eased and negotiators returned to the table, helping wholesalers clear delayed shipments. Opposition lawmakers argued that the bloc had forced a retreat, while business groups said the pause was necessary to avoid a sharper price surge across household goods.',
                advisorFeedback: [
                    {
                        roleId: 'role_executive',
                        stance: 'support',
                        feedback: 'The bloc will read the pause as a practical opening, but you still need a deadline and fallback plan before talks drift.',
                    },
                ],
            },
            {
                id: 'option_b',
                text: 'You keep inspections in place and announce a contingency package for affected exporters while talks continue. The harder line reassures domestic producers, though it raises the risk of further retaliation.',
                effects: [{ targetMetricId: 'economy', value: -1, duration: 3, probability: 1 }],
                outcomeHeadline: 'Exporters brace for delays',
                outcomeSummary: 'Ministers kept the inspection regime in place and prepared emergency support for affected exporters as the dispute continued. Domestic producers welcomed the firmer stance, but shipping groups warned that further retaliation could disrupt delivery schedules within days.',
                outcomeContext: 'The tougher policy preserved leverage at the negotiating table but prolonged congestion across key terminals. Retailers and freight operators warned that any new round of retaliation would hit consumer prices quickly, forcing ministers to weigh political resolve against visible market strain.',
                advisorFeedback: [
                    {
                        roleId: 'role_executive',
                        stance: 'neutral',
                        feedback: 'The firm response protects your bargaining position, but you need a clear plan to contain price pressure if delays spread.',
                    },
                ],
            },
            {
                id: 'option_c',
                text: 'You ask mediators to draft a limited customs accord and delay any further retaliation for one week. The approach lowers immediate pressure, but critics say it postpones a cleaner decision.',
                effects: [{ targetMetricId: 'economy', value: 0.5, duration: 2, probability: 1 }],
                outcomeHeadline: 'Mediators seek customs truce',
                outcomeSummary: 'Independent mediators began drafting a limited customs accord after your cabinet delayed further retaliation for one week. Markets steadied modestly, although critics said the extension only delayed the deeper political argument over trade strategy.',
                outcomeContext: 'The mediated pause gave importers and exporters a short window to clear inventories while diplomats explored a narrower compromise. Business groups welcomed the breathing room, but opposition lawmakers said the government still lacked a durable answer if talks broke down again.',
                advisorFeedback: [
                    {
                        roleId: 'role_executive',
                        stance: 'neutral',
                        feedback: 'The pause lowers immediate pressure, but you need a clear endpoint or the process will start to look indecisive.',
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
describe('auditScenario newsroom language validation', () => {
    beforeEach(() => {
        (0, audit_rules_1.setAuditConfigForTests)(makeAuditConfig());
    });
    afterEach(() => {
        (0, audit_rules_1.setAuditConfigForTests)(null);
    });
    test('rejects jargon such as bloc and gambit in player-facing text', () => {
        const issues = (0, audit_rules_1.auditScenario)(makeScenario(), 'bundle_economy');
        expect(issues.some((issue) => issue.rule === 'newsroom-jargon' && issue.message.includes('title'))).toBe(true);
        expect(issues.some((issue) => issue.rule === 'newsroom-jargon' && issue.message.includes('description'))).toBe(true);
        expect(issues.some((issue) => issue.rule === 'newsroom-jargon' && issue.message.includes('advisorFeedback'))).toBe(true);
    });
});
//# sourceMappingURL=audit-rules-language-quality.test.js.map