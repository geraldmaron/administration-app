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
        govTypesByCountryId: {},
        countriesById: {},
        canonicalRoleIds: [...CANONICAL_ROLE_IDS],
        articleFormTokenNames: new Set<string>(),
        sentenceStartArticleFormTokenNames: new Set<string>(),
        validSettingTargets: VALID_SETTING_TARGETS as unknown as readonly string[],
    };
}

function makeScenario(): BundleScenario {
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

describe('auditScenario invalid second-person framing', () => {
    beforeEach(() => {
        setAuditConfigForTests(makeAuditConfig());
    });

    afterEach(() => {
        setAuditConfigForTests(null);
    });

    test('fires error on "As you of {the_player_country}" in description', () => {
        const scenario = makeScenario();
        scenario.description = 'As you of {the_player_country}, you face a critical infrastructure bottleneck stalling economic growth. Congested transport networks and outdated energy grids are causing delays across major industry sectors, leading to rising production costs. Your cabinet has convened to discuss strategies for alleviating these issues while balancing fiscal responsibility.';
        const issues = auditScenario(scenario, 'bundle_economy');
        expect(issues.some((i) => i.rule === 'invalid-second-person-framing' && i.message.includes('description'))).toBe(true);
    });

    test('fires error on "As we of {the_player_country}" in description', () => {
        const scenario = makeScenario();
        scenario.description = 'As we of {the_player_country}, we face a severe infrastructure deficit that threatens to widen the unemployment gap. Outdated rail and highway systems have become a drag on industrial output and export competitiveness. Emergency investment is needed before the next fiscal quarter closes.';
        const issues = auditScenario(scenario, 'bundle_economy');
        expect(issues.some((i) => i.rule === 'invalid-second-person-framing' && i.message.includes('description'))).toBe(true);
    });

    test('does not fire for well-formed framing with {leader_title}', () => {
        const scenario = makeScenario();
        scenario.description = 'As {leader_title} of {the_player_country}, you face a critical infrastructure bottleneck stalling economic growth. Congested transport networks and outdated energy grids are causing delays across major industry sectors, leading to rising production costs. Your cabinet has convened to discuss strategies for alleviating these issues while balancing fiscal responsibility.';
        const issues = auditScenario(scenario, 'bundle_economy');
        expect(issues.some((i) => i.rule === 'invalid-second-person-framing')).toBe(false);
    });

    test('does not fire when "you" is used correctly in body text', () => {
        const scenario = makeScenario();
        // Standard second-person body — no framing clause
        scenario.description = 'You face a critical infrastructure bottleneck stalling economic growth across {the_player_country}. Congested transport networks and outdated energy grids are causing delays in major industry sectors, leading to rising production costs and declining competitiveness. Your cabinet has convened to discuss strategies for alleviating these issues while balancing fiscal responsibility.';
        const issues = auditScenario(scenario, 'bundle_economy');
        expect(issues.some((i) => i.rule === 'invalid-second-person-framing')).toBe(false);
    });
});

describe('auditScenario newsroom language validation', () => {
    beforeEach(() => {
        setAuditConfigForTests(makeAuditConfig());
    });

    afterEach(() => {
        setAuditConfigForTests(null);
    });

    test('does not fire lowercase-start on token-led title with lowercase verb', () => {
        const scenario = makeScenario();
        scenario.title = '{finance_role} warns of credit downgrade';
        const issues = auditScenario(scenario, 'bundle_economy');
        expect(issues.some((i) => i.rule === 'lowercase-start' && i.message.includes('title'))).toBe(false);
    });

    test('does not fire lowercase-start on token-led option text', () => {
        const scenario = makeScenario();
        scenario.options[0].text = '{the_legislature} passes emergency spending bill to stabilize markets and restore investor confidence. The measure redirects funds from discretionary programs, angering social advocates who warn of service cuts across low-income communities.';
        const issues = auditScenario(scenario, 'bundle_economy');
        expect(issues.some((i) => i.rule === 'lowercase-start' && i.message.includes('option_a') && i.message.includes('lowercase'))).toBe(false);
    });

    test('does not warn on sentence-start bare token for article-unsafe institution tokens', () => {
        const scenario = makeScenario();
        scenario.description = '{legislature} opens an emergency inquiry after new procurement records surface. Ministers now have to decide whether to cooperate fully or limit the scope of testimony.';
        const issues = auditScenario(scenario, 'bundle_economy');
        expect(issues.some((i) => i.rule === 'sentence-start-bare-token')).toBe(false);
    });

    test('no longer warns on sentence-start bare token (article forms eliminated)', () => {
        const scenario = makeScenario();
        scenario.description = '{finance_role} announces emergency liquidity support before markets open. Exporters welcome the intervention, but critics warn that the balance sheet risk could widen.';
        const issues = auditScenario(scenario, 'bundle_economy');
        expect(issues.some((i) => i.rule === 'sentence-start-bare-token')).toBe(false);
    });

    test('still fires lowercase-start on non-token lowercase text', () => {
        const scenario = makeScenario();
        scenario.title = 'warns of credit downgrade';
        const issues = auditScenario(scenario, 'bundle_economy');
        expect(issues.some((i) => i.rule === 'lowercase-start')).toBe(true);
    });

    test('does not fire invalid-token on {the_regional_bloc}', () => {
        const scenario = makeScenario();
        scenario.description = 'As {leader_title} of {the_player_country}, you face pressure from {the_regional_bloc} to adopt new trade standards that could reshape domestic industry while strengthening multilateral cooperation.';
        const issues = auditScenario(scenario, 'bundle_economy');
        expect(issues.some((i) => i.rule === 'invalid-token' && i.message.includes('regional_bloc'))).toBe(false);
    });

    test('fires token-grammar-issue when leading token is followed by uppercase narrative word', () => {
        const scenario = makeScenario();
        scenario.options[0].outcomeSummary = '{the_player_country} Signed emergency customs protocol after overnight talks stabilized shipping lanes and reduced immediate market panic.';
        const issues = auditScenario(scenario, 'bundle_economy');
        expect(issues.some((i) => i.rule === 'token-grammar-issue')).toBe(true);
    });
});

describe('auditScenario newsroom language validation', () => {
    beforeEach(() => {
        setAuditConfigForTests(makeAuditConfig());
    });

    afterEach(() => {
        setAuditConfigForTests(null);
    });

    test('rejects jargon such as bloc and gambit in player-facing text', () => {
        const issues = auditScenario(makeScenario(), 'bundle_economy');

        expect(issues.some((issue) => issue.rule === 'newsroom-jargon' && issue.message.includes('title'))).toBe(true);
        expect(issues.some((issue) => issue.rule === 'newsroom-jargon' && issue.message.includes('description'))).toBe(true);
        expect(issues.some((issue) => issue.rule === 'newsroom-jargon' && issue.message.includes('advisorFeedback'))).toBe(true);
    });
});

describe('deterministicFix sentence condensing', () => {
    beforeEach(() => {
        setAuditConfigForTests(makeAuditConfig());
    });

    afterEach(() => {
        setAuditConfigForTests(null);
    });

    test('condenses a 5-sentence description down to 3 sentences', () => {
        const scenario = makeScenario();
        scenario.description = 'A major crisis threatens economic stability. The central bank has issued warnings. Markets are falling rapidly. Investors have pulled out billions. Your cabinet must respond immediately.';
        const result = deterministicFix(scenario);
        expect(result.fixed).toBe(true);
        expect(result.fixes.some(f => f.includes('condensed description'))).toBe(true);
        const sentenceCount = (scenario.description.match(/[.!?]+/g) || []).length;
        expect(sentenceCount).toBeLessThanOrEqual(3);
    });

    test('condenses a 4-sentence option text down to 3 sentences', () => {
        const scenario = makeScenario();
        scenario.options[0].text = 'You deploy emergency fiscal measures to stabilize the currency. The package includes temporary capital controls. Export subsidies will cushion the blow for domestic producers. Critics warn this approach may deter foreign investment in the medium term.';
        const result = deterministicFix(scenario);
        expect(result.fixed).toBe(true);
        expect(result.fixes.some(f => f.includes('condensed option text'))).toBe(true);
        const sentenceCount = (scenario.options[0].text.match(/[.!?]+/g) || []).length;
        expect(sentenceCount).toBeLessThanOrEqual(3);
    });

    test('does not condense a 3-sentence description', () => {
        const scenario = makeScenario();
        const original = scenario.description;
        const result = deterministicFix(scenario);
        expect(result.fixes.some(f => f.includes('condensed description'))).toBe(false);
        expect(scenario.description).toBe(original);
    });

    test('no longer rewrites sentence-start bare tokens to article forms (article forms eliminated)', () => {
        const scenario = makeScenario();
        scenario.description = '{player_country} faces a sudden bond selloff after overnight rumors shake investor confidence.';
        scenario.options[0].text = 'The {finance_role} opens emergency hearings on the fiscal package while ministers prepare new testimony. The review delays implementation, but it may calm accusations of executive overreach.';

        deterministicFix(scenario);

        expect(scenario.description).toContain('{player_country} faces a sudden bond selloff');
        expect(scenario.options[0].text).toContain('{finance_role}');
    });
});

describe('unsupported scale-token artifact repair', () => {
    beforeEach(() => {
        setAuditConfigForTests(makeAuditConfig());
    });

    afterEach(() => {
        setAuditConfigForTests(null);
    });

    test('audits plain text left behind by unsupported scale tokens', () => {
        const scenario = makeScenario();
        scenario.description = 'You face pressure as geography type constraints and climate risk concerns strain port access. Cabinet officials say economic scale volatility could spill into food prices within weeks.';

        const issues = auditScenario(scenario, 'bundle_economy');

        expect(issues.some((issue) => issue.rule === 'unsupported-scale-token-artifact')).toBe(true);
    });

    test('deterministicFix repairs scale-token artifacts across scenario text', () => {
        const scenario = makeScenario();
        scenario.title = 'Geography Type Pressure Builds';
        scenario.description = 'You face pressure as geography type constraints and climate risk concerns strain port access.';
        scenario.options[0].text = 'You ask agencies to shield major industry employers while economic scale pressure spreads.';
        scenario.options[0].outcomeSummary = 'Officials said population scale pressures complicated the response.';
        scenario.options[0].advisorFeedback[0].feedback = 'The gdp description problem needs a narrower procurement response.';

        const result = deterministicFix(scenario);

        expect(result.fixed).toBe(true);
        expect(result.fixes.some((fix) => fix.includes('unsupported scale-token artifact'))).toBe(true);
        expect(scenario.title).toBe("The country's geography Pressure Builds");
        expect(scenario.description).toContain("the country's geography constraints");
        expect(scenario.description).toContain('climate-exposed areas concerns');
        expect(scenario.options[0].text).toContain('major export-sector employers');
        expect(scenario.options[0].text).toContain('the national economy pressure');
        expect(scenario.options[0].outcomeSummary).toContain('the population pressures');
        expect(scenario.options[0].advisorFeedback[0].feedback).toContain('The national economy problem');
    });
});

describe('hardcoded role-title repair', () => {
    beforeEach(() => {
        setAuditConfigForTests(makeAuditConfig());
    });

    afterEach(() => {
        setAuditConfigForTests(null);
    });

    test('audits and repairs hardcoded culture minister phrasing', () => {
        const scenario = makeScenario();
        scenario.description = 'The culture minister has introduced a new national curriculum that narrows minority histories. Regional leaders warn the change could alienate communities before the school year begins.';
        scenario.options[0].text = 'You direct the culture minister to implement the curriculum immediately. Education groups warn the rushed rollout may deepen resentment in minority communities.';

        const issues = auditScenario(scenario, 'bundle_economy');
        expect(issues.some((issue) => issue.rule === 'hardcoded-institution-phrase' && issue.message.includes('Culture Minister'))).toBe(true);

        const result = deterministicFix(scenario);

        expect(result.fixed).toBe(true);
        expect(scenario.description).toContain('The {education_role} has introduced');
        expect(scenario.options[0].text).toContain('the {education_role} to implement');
    });

    test('audits legacy top-level outcome context hardcoded role phrases', () => {
        const scenario = {
            ...makeScenario(),
            outcomeContext: 'The administration pursued a swift crackdown led by the justice ministry after investigators exposed secret funding.',
        };

        const issues = auditScenario(scenario, 'bundle_economy');

        expect(issues.some((issue) => issue.rule === 'hardcoded-institution-phrase' && issue.message.includes('outcomeContext'))).toBe(true);
    });
});

describe('token-context prose quality', () => {
    beforeEach(() => {
        setAuditConfigForTests(makeAuditConfig());
    });

    afterEach(() => {
        setAuditConfigForTests(null);
    });

    test('flags "you the {token}" in description', () => {
        const scenario = makeScenario();
        scenario.description = 'You the {health_role} warned that a shortage would develop within months.';
        const issues = auditScenario(scenario, 'bundle_economy');
        expect(issues.some((issue) => issue.rule === 'token-context-you-the')).toBe(true);
    });

    test('flags "Your the {token}" double determiner', () => {
        const scenario = makeScenario();
        scenario.description = 'Your the {finance_role} reported that deficits had widened significantly.';
        const issues = auditScenario(scenario, 'bundle_economy');
        expect(issues.some((issue) => issue.rule === 'token-context-double-determiner')).toBe(true);
    });

    test('flags consecutive articles before a token', () => {
        const scenario = makeScenario();
        scenario.description = 'Officials appointed a the {defense_role} to oversee the response.';
        const issues = auditScenario(scenario, 'bundle_economy');
        expect(issues.some((issue) => issue.rule === 'token-context-double-article')).toBe(true);
    });

    test('flags article before an article-form token', () => {
        const scenario = makeScenario();
        scenario.description = 'a {the_finance_role} briefed parliament on the shortfall.';
        const issues = auditScenario(scenario, 'bundle_economy');
        expect(issues.some((issue) => issue.rule === 'token-context-article-before-article-form')).toBe(true);
    });

    test('flags "You {role_token}" without verb', () => {
        const scenario = makeScenario();
        scenario.options[0].text = 'You {health_role} must respond before the shortage worsens.';
        const issues = auditScenario(scenario, 'bundle_economy');
        expect(issues.some((issue) => issue.rule === 'token-context-you-bare-role')).toBe(true);
    });

    test('flags "Your {the_health_role}" — possessive with article-form token', () => {
        const scenario = makeScenario();
        scenario.description = 'Your {the_health_role} warned that the shortage would worsen within months.';
        const issues = auditScenario(scenario, 'bundle_economy');
        expect(issues.some((issue) => issue.rule === 'token-context-possessive-article-form')).toBe(true);
    });

    test('flags "your {the_finance_role}" — lowercase possessive with article-form token', () => {
        const scenario = makeScenario();
        scenario.options[0].text = 'You order your {the_finance_role} to mandate continued production through emergency regulations.';
        const issues = auditScenario(scenario, 'bundle_economy');
        expect(issues.some((issue) => issue.rule === 'token-context-possessive-article-form')).toBe(true);
    });

    test('repairs "Your {the_health_role}" to "Your {health_role}"', () => {
        const scenario = makeScenario();
        scenario.description = 'Your {the_health_role} warned that the shortage would worsen.';
        deterministicFix(scenario);
        expect(scenario.description).toBe('Your {health_role} warned that the shortage would worsen.');
    });

    test('does not flag valid token usage', () => {
        const scenario = makeScenario();
        scenario.description = '{the_finance_role} briefed parliament. Your {health_role} warned of shortages. You directed {the_defense_role} to respond.';
        const issues = auditScenario(scenario, 'bundle_economy');
        const tokenContextIssues = issues.filter((issue) =>
            issue.rule.startsWith('token-context-')
        );
        expect(tokenContextIssues).toHaveLength(0);
    });

    test('does not flag "You, the {token}," with commas (valid appositive)', () => {
        const scenario = makeScenario();
        scenario.description = 'You, the {health_role}, must act before the shortage worsens.';
        const issues = auditScenario(scenario, 'bundle_economy');
        const tokenContextIssues = issues.filter((issue) =>
            issue.rule.startsWith('token-context-')
        );
        expect(tokenContextIssues).toHaveLength(0);
    });
});
