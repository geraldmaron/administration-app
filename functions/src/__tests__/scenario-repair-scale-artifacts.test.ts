import { applyDeterministicTextFixes, type RepairableScenario } from '../shared/scenario-repair';

function makeRepairableScenario(): RepairableScenario {
  return {
    id: 'repair_scale_artifacts',
    title: 'Geography Type Shock Spreads',
    description: 'You face geography type bottlenecks as climate risk warnings spread.',
    outcomeContext: 'The administration pursued a swift crackdown led by the justice ministry after investigators exposed secret funding.',
    options: [
      {
        text: 'You shield major industry employers while economic scale concerns grow.',
        outcomeHeadline: 'Population Scale Pressure Rises',
        outcomeSummary: 'Officials said gdp description constraints narrowed the cabinet response.',
        outcomeContext: 'Ports reopened after geography type disruption eased.',
        advisorFeedback: [
          {
            feedback: 'The major industry request needs a narrower implementation plan.',
          },
        ],
      },
    ],
  };
}

describe('applyDeterministicTextFixes unsupported scale-token artifacts', () => {
  test('repairs artifacts used by the web audit repair route and batch fixer', () => {
    const result = applyDeterministicTextFixes(makeRepairableScenario());

    expect(result.changed).toBe(true);
    expect(result.updated.title).toBe("The country's geography Shock Spreads");
    expect(result.updated.description).toContain("the country's geography bottlenecks");
    expect(result.updated.outcomeContext).toContain("the {justice_role}'s office");
    expect(result.updated.description).toContain('climate-exposed areas warnings');
    expect(result.updated.options[0].text).toContain('major export-sector employers');
    expect(result.updated.options[0].text).toContain('the national economy concerns');
    expect(result.updated.options[0].outcomeHeadline).toBe('The population Pressure Rises');
    expect(result.updated.options[0].outcomeSummary).toContain('the national economy constraints');
    expect(result.updated.options[0].outcomeContext).toContain("the country's geography disruption");
    expect(result.updated.options[0].advisorFeedback?.[0].feedback).toContain('major export-sector request');
  });
});
