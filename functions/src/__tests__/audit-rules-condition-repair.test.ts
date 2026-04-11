import { deterministicFix, setAuditConfigForTests, type AuditConfig, type BundleScenario } from '../lib/audit-rules';

const TEST_CONFIG: AuditConfig = {
  validMetricIds: new Set([
    'metric_military',
    'metric_budget',
    'metric_inflation',
    'metric_democracy',
  ]),
  validRoleIds: new Set(['role_defense']),
  inverseMetrics: new Set(['metric_inflation']),
  metricMagnitudeCaps: {},
  defaultCap: 5,
  metricToRoles: { metric_military: ['role_defense'] },
  categoryDomainMetrics: {},
  metricMappings: {},
  bannedPhrases: [],
  bannedPhraseRegexes: [],
  bannedCountryPhrases: new Set(),
  validTokens: new Set(),
  logicParameters: {
    duration: { min: 1, max: 12 },
    probability: { required: 1 },
  },
  canonicalRoleIds: ['role_defense'],
  articleFormTokenNames: new Set(),
  sentenceStartArticleFormTokenNames: new Set(),
  validSettingTargets: [],
};

describe('deterministicFix condition repair', () => {
  beforeEach(() => {
    setAuditConfigForTests(TEST_CONFIG);
  });

  afterEach(() => {
    setAuditConfigForTests(null);
  });

  test('reconstructs scoring-aligned metric gates when narrative implies missing conditions', () => {
    const scenario: BundleScenario = {
      id: 'military_readiness_gap',
      title: 'Generals Demand Emergency Funding',
      description:
        'The armed forces have been operating at reduced military readiness for months due to defense budget cuts, leaving critical defense infrastructure vulnerable.',
      options: [
        {
          id: 'option_a',
          text: 'Approve an emergency readiness package.',
          effects: [{ targetMetricId: 'metric_military', value: 4, duration: 2, probability: 1 }],
          advisorFeedback: [],
        },
      ],
      metadata: {
        bundle: 'military',
        tags: ['military_underfunded'],
      },
    };

    const result = deterministicFix(scenario);

    expect(result.fixed).toBe(true);
    expect(scenario.applicability?.metricGates).toEqual(
      expect.arrayContaining([{ metricId: 'metric_military', max: 45 }])
    );
    expect(result.fixes).toEqual(
      expect.arrayContaining(['reconstructed applicability.metricGates from narrative, tags, and requires flags'])
    );
  });

  test('injects applicability.requires for article-form institution tokens', () => {
    const scenario: BundleScenario = {
      id: 'legislature_vote',
      title: 'Budget Vote Stalls',
      description: '{the_legislature} delays the emergency package while {the_opposition_party} argues the plan protects allies of the administration.',
      options: [
        {
          id: 'option_a',
          text: 'You reopen talks with committee leaders.',
          effects: [{ targetMetricId: 'metric_budget', value: -2, duration: 2, probability: 1 }],
          advisorFeedback: [],
        },
      ],
      metadata: {
        bundle: 'social',
        tags: ['governance'],
      },
    };

    const result = deterministicFix(scenario);

    expect(result.fixed).toBe(true);
    expect(scenario.applicability?.requires).toMatchObject({
      has_opposition_party: true,
      democratic_regime: true,
    });
  });

  test('canonicalizes invalid legislature advisor role ids', () => {
    const scenario: BundleScenario = {
      id: 'advisor_role_cleanup',
      title: 'Parliamentary Holdouts Demand Concessions',
      description: 'Cabinet leaders need a stable vote coalition.',
      options: [
        {
          id: 'option_a',
          text: 'You offer a narrower package to wavering lawmakers.',
          effects: [{ targetMetricId: 'metric_budget', value: -1, duration: 2, probability: 1 }],
          advisorFeedback: [
            {
              roleId: 'role_legislature',
              stance: 'support',
              feedback: 'The parliamentary arithmetic improves if you trim the package.',
            },
          ],
        },
      ],
      metadata: {
        bundle: 'social',
      },
    };

    const result = deterministicFix(scenario);

    expect(result.fixed).toBe(true);
    expect(scenario.options[0].advisorFeedback?.[0]?.roleId).toBe('role_executive');
    expect(result.fixes).toEqual(
      expect.arrayContaining(['option_a: canonicalized roleId role_legislature → role_executive'])
    );
  });

  test('maps hallucinated housing policy implication target to supported social spending target', () => {
    const scenario: BundleScenario = {
      id: 'housing_support',
      title: 'Rent Protests Pressure Cabinet',
      description: 'Housing advocates warn that eviction filings are rising across major cities.',
      options: [
        {
          id: 'institutional_review',
          text: 'You fund emergency housing support while agencies review eviction rules.',
          effects: [{ targetMetricId: 'metric_budget', value: -2, duration: 2, probability: 1 }],
          policyImplications: [{ target: 'policy.housing' as any, delta: 6 }],
          advisorFeedback: [],
        },
      ],
      metadata: {
        bundle: 'social',
      },
    };

    const result = deterministicFix(scenario);

    expect(result.fixed).toBe(true);
    expect(scenario.options[0].policyImplications?.[0]?.target).toBe('fiscal.spendingSocial');
    expect(result.fixes).toEqual(
      expect.arrayContaining(['institutional_review: mapped policyImplication target policy.housing->fiscal.spendingSocial'])
    );
  });
});
