import { ScenarioDef } from "../scenario.js";

/**
 * Acceptance fixture for the gazetteer plant/tax-holiday bind. Not shipped in
 * the core pack: it exists so the audit, the cast, and engine apply() can
 * prove a named metro moves employment, lean, holiday, treasury, and
 * unemployment through one CityEffect per reply.
 */
export const plantHolidayScenario: ScenarioDef = ScenarioDef.parse({
  id: "plant-holiday-pittsburgh",
  premise: {"kind": "universal", "reason": "Four firms asking for a ten-year tax holiday in exchange for jobs in one city is an investment-incentive request any government gets in any year; the prose names no unemployment or cycle state."},
  class: "economy",
  severity: "serious",
  dilemmaShape: "allocation",
  subject: "Four plants waiting on {{city}}",
  cast: { pick: "none" },
  conditions: [],
  weight: 1,
  once: true,
  locus: {
    site: "interior",
    ground: "home",
    city: "CITY-USA-pittsburgh",
    state: "PA",
    sector: "steel-heavy",
    descriptor: "the mill yards along the river through {{city}}",
  },
  particulars: [
    { label: "Jobs", value: "4,000" },
    { label: "Holiday", value: "10 years" },
    { label: "Cost now", value: "$60 million" },
    { label: "Firms waiting", value: "4" },
  ],
  opening: [
    {
      speaker: { kind: "cabinet", roleHint: "interior" },
      text: "Four companies will put four thousand jobs into {{city}} if you give them a ten-year tax holiday, and the sixty million dollars they want now is the price of them building here rather than somewhere else.",
    },
    {
      speaker: { kind: "narrator" },
      text: "The Secretary of the Interior has the letters on the table. Each firm says the same thing: the holiday or they go, and {{city}} keeps the empty yards it already has.",
    },
  ],
  replies: [
    {
      id: "approve-ten",
      tone: "firm",
      text: "Give them the ten-year holiday and the sixty million now, and tell {{city}} the plants are coming.",
      sets: ["approved-the-ten-year-holiday"],
      commitment: {
        kind: "position",
        cost: { treasury: -60, standing: 0.04 },
        gazetteer: { cityEmployment: 4000, taxHolidayYears: 10, adminLean: 0.05 },
        remembered:
          "The ten-year holiday was signed and the sixty million went out the same week, and the four plants were promised to {{city}}.",
        rejoinder: {
          speaker: { kind: "narrator" },
          text: "The first firm has already asked for the exemption in writing, and the other three are waiting to see whether the paper holds before they move a single crane.",
        },
      },
    },
    {
      id: "approve-five",
      tone: "principled",
      text: "Give them five years and a smaller check, and make them prove the jobs before the rest of the money moves.",
      sets: ["approved-the-five-year-holiday"],
      commitment: {
        kind: "position",
        cost: { treasury: -35 },
        gazetteer: { cityEmployment: 2800, taxHolidayYears: 5, adminLean: 0.02 },
        remembered:
          "A five-year holiday was offered with a smaller check, and the firms were told to prove the jobs before the rest was paid.",
        rejoinder: {
          speaker: { kind: "cabinet", roleHint: "interior" },
          text: "Two of the four have written to say five years is not enough, and the people who still live by those yards have asked to be heard before you close the file.",
        },
      },
    },
    {
      id: "wage-subsidy",
      tone: "conciliatory",
      text: "Skip the holiday and pay a wage subsidy instead, so the jobs arrive without taking ten years off the tax books.",
      sets: ["paid-the-wage-subsidy"],
      commitment: {
        kind: "position",
        cost: { treasury: -48, standing: 0.03 },
        gazetteer: { cityEmployment: 1200, taxHolidayYears: 0, adminLean: 0.04 },
        remembered:
          "The holiday was refused and a wage subsidy was put in its place, so the jobs would come without a decade off the tax books.",
        rejoinder: {
          speaker: { kind: "cabinet", roleHint: "interior" },
          text: "The union hall called before dusk to say they will take the subsidy, and the firms have not yet said whether they will stay for it.",
        },
      },
    },
  ],
});
