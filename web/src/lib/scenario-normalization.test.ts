import { describe, expect, test } from 'vitest';
import { getScenarioConditions, toScenarioDetail, toScenarioSummary } from '@/lib/scenario-normalization';

describe('scenario normalization', () => {
  test('falls back to applicability.metricGates when legacy conditions are absent', () => {
    const raw = {
      title: 'Emergency Budget Talks',
      description: 'Fiscal pressure is mounting.',
      applicability: {
        requires: { has_central_bank: true },
        applicableCountryIds: ['country_a', 'country_b'],
        metricGates: [
          { metricId: 'metric_budget', max: 35 },
          { metricId: 'metric_inflation', min: 58 },
        ],
      },
      metadata: {
        bundle: 'economy',
        tags: ['budget_crisis'],
      },
      relationship_conditions: [{ relationshipId: 'ally', min: 20 }],
    };

    expect(getScenarioConditions(raw)).toEqual([
      { metricId: 'metric_budget', max: 35 },
      { metricId: 'metric_inflation', min: 58 },
    ]);

    const summary = toScenarioSummary('scenario_1', raw);
    expect(summary.conditionCount).toBe(2);
    expect(summary.relationshipConditionCount).toBe(1);
    expect(summary.countryCount).toBe(2);
    expect(summary.conditionSummary).toContain('budget <= 35');

    const detail = toScenarioDetail('scenario_1', raw);
    expect(detail.conditions).toEqual([
      { metricId: 'metric_budget', max: 35 },
      { metricId: 'metric_inflation', min: 58 },
    ]);
    expect(detail.metadata?.requires).toEqual({ has_central_bank: true });
    expect(detail.metadata?.applicable_countries).toEqual(['country_a', 'country_b']);
  });
});
