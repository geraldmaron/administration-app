import { ALL_TOKENS, CANONICAL_ROLE_IDS } from '../lib/token-registry';
import { VALID_SETTING_TARGETS } from '../types';
import { auditScenario, deterministicFix, setAuditConfigForTests } from '../lib/audit-rules';
import type { AuditConfig, BundleScenario } from '../lib/audit-rules';

function makeAuditConfig(): AuditConfig {
    return {
        validMetricIds: new Set(['economy']),
        validRoleIds: new Set(CANONICAL_ROLE_IDS),
        inverseMetrics: new Set(),
        metricMagnitudeCaps: { economy: 4 },
        defaultCap: 4,
        metricToRoles: { economy: ['role_executive'] },
        categoryDomainMetrics: { bundle_economy: ['economy'] },
        metricMappings: {},
        bannedPhrases: [],
        bannedPhraseRegexes: [],
        bannedCountryPhrases: new Set(),
        validTokens: new Set(ALL_TOKENS),
        logicParameters: {
            duration: { min: 1, max: 20 },
            probability: { required: 1 },
        },
        canonicalRoleIds: [...CANONICAL_ROLE_IDS],
        articleFormTokenNames: new Set<string>(),
        validSettingTargets: VALID_SETTING_TARGETS as unknown as readonly string[],
        govTypesByCountryId: {
            us: 'Presidential',
            jp: 'Parliamentary',
            gb: 'Parliamentary',
            ca: 'Parliamentary',
        },
        countriesById: {
            us: {
                geopolitical: {
                    allies: [{ countryId: 'gb', type: 'strategic_partner', strength: 0.9 }],
                    adversaries: [],
                    neighbors: [{ countryId: 'ca', type: 'neutral', strength: 0.7 }],
                },
            },
            jp: {
                geopolitical: {
                    allies: [],
                    adversaries: [],
                    neighbors: [],
                },
            },
            gb: {
                geopolitical: {
                    allies: [{ countryId: 'us', type: 'formal_ally', strength: 0.9 }],
                    adversaries: [{ countryId: 'ru', type: 'rival', strength: 0.7 }],
                    neighbors: [{ countryId: 'fr', type: 'rival', strength: 0.8 }],
                },
            },
            ca: {
                geopolitical: {
                    allies: [{ countryId: 'gb', type: 'formal_ally', strength: 0.8 }],
                    adversaries: [],
                    neighbors: [{ countryId: 'us', type: 'neutral', strength: 0.8 }],
                },
            },
        },
    };
}

function makeScenario(overrides: Partial<BundleScenario> = {}): BundleScenario {
    return {
        id: 'relationship_scope_scenario',
        title: 'Trade partner disputes port access',
        description: 'A dispute with {the_trade_partner} is forcing your administration to review customs policy, shipping inspections, and retaliation risks before a larger commercial breach affects domestic employers and consumer confidence.',
        options: [
            {
                id: 'option_a',
                text: 'You offer a temporary customs waiver and direct inspectors to prioritize cargo flowing from {the_trade_partner}. The concession calms shipping markets, but unions warn that domestic producers will demand compensation within days.',
                effects: [{ targetMetricId: 'economy', value: 1, duration: 3, probability: 1 }],
                outcomeHeadline: 'Ports reopen after emergency waiver',
                outcomeSummary: 'Cargo movement resumes after your government grants a temporary waiver, easing pressure on retailers and freight operators while opposition lawmakers question whether the concession signals weakness. Business groups praise the immediate relief, but manufacturers warn that the move may invite more demands in the next round of talks.',
                outcomeContext: 'Shipping terminals clear their backlog over several days, helping importers restock shelves and stabilize prices. The calmer atmosphere buys negotiators time, yet domestic industries intensify lobbying for their own protection package before the temporary arrangement expires and the dispute returns.',
                advisorFeedback: [
                    {
                        roleId: 'role_executive',
                        stance: 'support',
                        feedback: 'The temporary waiver reduces immediate pressure on your administration and preserves room for a broader settlement before public anxiety spreads through the business community.',
                    },
                ],
            },
            {
                id: 'option_b',
                text: 'You impose mirror inspections on goods from {the_trade_partner} and ask ports to tighten compliance immediately. The retaliation satisfies domestic producers, yet retailers prepare for delays and sharper price increases if the standoff drags on.',
                effects: [{ targetMetricId: 'economy', value: -1, duration: 3, probability: 1 }],
                outcomeHeadline: 'Retaliatory checks slow the docks',
                outcomeSummary: 'Inspectors begin enforcing retaliatory checks across major terminals, reassuring producers that your administration will answer commercial pressure with visible countermeasures. Retailers and logistics firms, however, warn that the added scrutiny may worsen shortages and raise prices before any diplomatic gains materialize.',
                outcomeContext: 'Port operators lengthen delivery schedules and freight costs rise as inspections intensify. The harder line demonstrates resolve, but the operational strain quickly reaches wholesalers, consumer groups, and regional officials who fear the dispute could expand into a broader economic confrontation.',
                advisorFeedback: [
                    {
                        roleId: 'role_executive',
                        stance: 'oppose',
                        feedback: 'The mirror inspections prove resolve, but they also raise the odds that a manageable trade dispute hardens into a costlier political fight for your government.',
                    },
                ],
            },
            {
                id: 'option_c',
                text: 'You suspend new fees, invite mediators, and propose a monitored review of the dispute with {the_trade_partner}. The slower approach lowers immediate tension, though critics argue that it postpones a clearer decision about national leverage.',
                effects: [{ targetMetricId: 'economy', value: 0.5, duration: 2, probability: 1 }],
                outcomeHeadline: 'Mediators enter the trade standoff',
                outcomeSummary: 'Independent mediators begin a structured review after your administration pauses new fees and signals willingness to negotiate. Markets stabilize modestly, but critics say the compromise could blur accountability if the other side uses the process to stall for time instead of fixing the dispute.',
                outcomeContext: 'The mediated review cools the immediate confrontation and reduces the likelihood of abrupt shortages. Even so, political opponents frame the pause as hesitation, forcing your cabinet to defend the slower path while officials work to convert the calmer tone into a durable settlement.',
                advisorFeedback: [
                    {
                        roleId: 'role_executive',
                        stance: 'neutral',
                        feedback: 'Mediation buys time and lowers immediate risk, but your team will need a clear deadline or the process may look like drift instead of strategy.',
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
            actorPattern: 'mixed',
        },
        phase: 'root',
        ...overrides,
    };
}

describe('auditScenario relationship scope validation', () => {
    beforeEach(() => {
        setAuditConfigForTests(makeAuditConfig());
    });

    afterEach(() => {
        setAuditConfigForTests(null);
    });

    test('rejects universal scenarios that rely on relationship tokens', () => {
        const issues = auditScenario(makeScenario(), 'bundle_economy');

        expect(issues.some((issue) => issue.rule === 'universal-relationship-token')).toBe(true);
    });

    test('scrubs fragile political tokens from universal-scope prose', () => {
        const scenario = makeScenario({
            description: '{governing_party} leaders pressure {legislature} to approve cuts while {opposition_party} lawmakers threaten hearings.',
            options: [
                {
                    id: 'option_a',
                    text: 'You ask {legislature} to fast-track the bill with {governing_party} backing.',
                    effects: [{ targetMetricId: 'economy', value: 1, duration: 3, probability: 1 }],
                    outcomeHeadline: 'Lawmakers advance the bill',
                    outcomeSummary: '{opposition_party} figures denounce the shortcut.',
                    outcomeContext: '{state_media} amplifies the argument across the country.',
                    advisorFeedback: [{ roleId: 'role_executive', stance: 'support', feedback: '{governing_party} discipline may hold for one vote.' }],
                },
                ...makeScenario().options.slice(1),
            ],
        });

        const result = deterministicFix(scenario);

        expect(result.fixed).toBe(true);
        expect(scenario.description).toContain('the governing coalition');
        expect(scenario.description).toContain('lawmakers');
        expect(scenario.description).toContain('the opposition');
        expect(scenario.description).not.toContain('{governing_party}');
        expect(scenario.description).not.toContain('{legislature}');
        expect(scenario.options[0].outcomeContext).toContain('state broadcasters');
        expect(scenario.options[0].advisorFeedback?.[0]?.feedback).toContain('the governing coalition');
    });

    test('rejects targeted scenarios whose countries cannot resolve required relationship tokens', () => {
        const scenario = makeScenario();
        scenario.metadata = {
            ...scenario.metadata,
            scopeTier: 'exclusive',
            scopeKey: 'country:us+jp',
            applicable_countries: ['us', 'jp'],
        };

        const issues = auditScenario(scenario, 'bundle_economy');

        const mismatch = issues.find((issue) => issue.rule === 'country-relationship-token-mismatch');
        expect(mismatch).toBeDefined();
        expect(mismatch?.message).toContain('jp');
    });

    test('allows targeted scenarios when every listed country can resolve the relationship token', () => {
        const scenario = makeScenario();
        scenario.metadata = {
            ...scenario.metadata,
            scopeTier: 'exclusive',
            scopeKey: 'country:us',
            applicable_countries: ['us'],
        };

        const issues = auditScenario(scenario, 'bundle_economy');

        expect(issues.some((issue) => issue.rule === 'country-relationship-token-mismatch')).toBe(false);
        expect(issues.some((issue) => issue.rule === 'universal-relationship-token')).toBe(false);
    });
});
