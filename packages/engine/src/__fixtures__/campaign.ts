import { Nation, Person, Relationship, defaultFlagDesign, type RoleId } from "@admin/world";
import { CAMPAIGN_OPENING_DATE, addDays } from "../clock.js";
import { openingAppropriation } from "../appropriation.js";
import { foundingTrade } from "../trade.js";
import { foundingInstitutions } from "../institutions.js";
import { foundingCircuitSeats } from "../lower-bench.js";
import { foundingSecurity } from "../security.js";
import { foundingOversight } from "../oversight.js";
import { foundingScenarioFamilies } from "../scenario-families.js";
import { openingCongress } from "../congress.js";
import { openingCities } from "../cities.js";
import { openingSectors } from "../sectors.js";
import { openingStates } from "../states.js";
import { DEFAULT_ADMINISTRATION_PARTY } from "../party.js";
import { openingTermClock } from "../elections.js";
import { openingPressCorps } from "../press.js";
import { makeCampaignSeed } from "../rng.js";
import { relationshipKey, type Campaign } from "../state.js";
import { openingCycles } from "../business-cycle.js";
import { withEconomyRecords } from "../economy-records.js";
import { openingCohorts } from "../demos.js";
import { openingMood, recomputeApproval } from "../opinion.js";
import { BUDGET_ACCOUNT_SPECS, inheritedBudget } from "../budget.js";
import { FUNDED_BUDGET_ADEQUACY } from "../funding.js";
import { inheritedPolicies } from "../policy.js";
import { defaultLeaderDraft } from "../leader.js";
import { DAYS_PER_TURN } from "../turn-clock.js";

export const nationA = Nation.parse({
  id: "USA",
  playable: true,
  identity: { name: "United States", adjective: "American", capital: "Washington, D.C.", government: "charter-1", languages: ["English"], currency: "USD" },
  geo: { region: "region-1", lat: 10, lon: 20, neighbors: ["ALP"], coastline: true, chokepoints: [], disasterExposure: {} },
  stats: {
    demography: {
      population: 5_000_000, urbanization: 0.6, medianAge: 32, growthRate: 0.01, literacy: 0.9,
      birthRate: 0.014, deathRate: 0.008, netMigration: 0.004,
    },
    economy: {
      gdp: 50_000, gdpPerCapita: 10_000, growth: 0.02, inflation: 0.03, unemployment: 0.05,
      costOfLiving: 1, debt: 30_000, reserves: 5_000, sovereignRating: "A",
    },
    trade: { exports: 10_000, imports: 9_000, balance: 1_000, topExports: ["textiles"], topPartners: ["ALP"], tradeDependence: { ALP: 0.3 } },
    energy: { production: 100, consumption: 90, importDependence: 0.2, mix: { "energy-oil": 0.5, "energy-gas": 0, "energy-nuclear": 0, "energy-renewables": 0.5 } },
    military: {
      budget: 1_000, activeHeadcount: 20_000, reserveHeadcount: 10_000, readiness: 0.8, doctrineQuality: 0.5,
      branchStrength: { land: 0.5, air: 0.4, naval: 0.3, cyber: 0.2, space: 0.1 },
      airliftCapacity: 0.3, sealiftCapacity: 0.3, arsenal: { warheads: 0, deliveryTriad: false }, basesAbroad: 0,
    },
    security: { crimeIndex: 0.3, corruptionIndex: 0.3, insurgencyPressure: 0.1, borderControl: 0.6, intelCapability: 0.4, counterIntel: 0.4 },
    politics: { regimeStability: 0.7, legitimacy: 0.7, factionalism: 0.3, pressFreedom: 0.6, protestPressure: 0.2 },
    softPower: { diplomaticReach: 0.4, culturalReach: 0.4, aidGiven: 10,     aidReceived: 0 },
  },
  sectors: [
    { sector: "textiles", mix: 0.6, employment: 400_000, laborPressure: 0.3 },
    { sector: "utilities", mix: 0.4, employment: 200_000, laborPressure: 0.2 },
  ],
  traits: {
    aggression: 0.3, opportunism: 0.4, legalism: 0.6, isolationism: 0.2, riskTolerance: 0.4,
    vengefulness: 0.3, reliability: 0.6, transparency: 0.5,
    agendas: [{ id: "trade-growth", description: "Grow export markets", weight: 0.6 }],
  },
  doctrine: { posture: "balanced", redLines: [], alignmentPull: [] },
  memberships: [],
  partySystem: { contest: "none", parties: [] },
  bands: {
    archetype: "middle-power", powerTier: 3, wealthTier: 3, alignmentBand: "neutral",
    stabilityBand: "stable", militaryTier: 3, 
  },
});

export const nationB = Nation.parse({ ...nationA, id: "ALP", identity: { ...nationA.identity, name: "Alpland" } });

export const person = Person.parse({
  id: "PER-1",
  name: "Jordan Vale",
  nationality: "USA",
  portraitRef: "portrait-1",
  age: 45,
  bio: "A career diplomat who has spent rather more of it abroad than at home.",
  // The background the attributes below are read off. Required on every person,
  // so the fixture carries a real school and a real career rather than leaving
  // a dossier with nothing to explain the readings with.
  education: { school: "SCH-USA-HARVARD", field: "law", postgraduate: true },
  career: [
    { archetype: "diplomatic-corps", years: 14, startAge: 26 },
    { archetype: "civil-service", years: 5, startAge: 40 },
  ],
  ideology: { economicLeftRight: 0, authLibertarian: 0, nationalistGlobalist: 0 },
  competence: 0.7, loyalty: 0.6, ambition: 0.5, integrity: 0.6, charisma: 0.5,
  traits: ["pragmatic"],
  eligibleRoles: ["role-chancellor"],
});

export const relationship = Relationship.parse({
  from: "USA", to: "ALP", trust: 0.2, alignment: 0.1, tension: 0.1, tradeDependence: 0.3,
  militaryThreat: 0.1, treaties: [], grudges: [], history: [],
});

export function buildCampaign(): Campaign {
  const roleId = person.eligibleRoles[0]! as RoleId;
  // Funded the way a sealed campaign is, through the fiscal year the oath falls
  // in, so a fixture's shutdown clock runs on the same calendar as the game's.
  const congress = {
    ...openingCongress(nationA, 1, DEFAULT_ADMINISTRATION_PARTY, DEFAULT_ADMINISTRATION_PARTY),
    appropriation: openingAppropriation(CAMPAIGN_OPENING_DATE, 1),
  };
  // Sealed like a real founding, so a fixture's opening approval agrees with its
  // own public and a test measuring movement measures movement.
  return withEconomyRecords(recomputeApproval({
    seed: makeCampaignSeed("test-seed"),
    founding: {
      nation: nationA.id,
      nationName: nationA.identity.name,
      name: nationA.identity.name,
      title: "President",
      charter: nationA.identity.government,
      cradle: "cradle-1",
      compacts: [],
      cabinet: { [roleId]: person.id },
      flag: defaultFlagDesign,
      leader: { ...defaultLeaderDraft(), name: person.name },
      leadRole: roleId,
      platform: [],
      staff: {},
    },
    pledges: [],
    turn: 1,
    calendar: CAMPAIGN_OPENING_DATE,
    foundingDate: CAMPAIGN_OPENING_DATE,
    issuedActs: {},
    nations: {
      [nationA.id]: { base: nationA, stats: nationA.stats, traits: nationA.traits },
      [nationB.id]: { base: nationB, stats: nationB.stats, traits: nationB.traits },
    },
    cities: openingCities({ congress }),
    states: openingStates(),
    sectors: openingSectors({
      [nationA.id]: { base: nationA },
      [nationB.id]: { base: nationB },
    } as Parameters<typeof openingSectors>[0]),
    relationships: { [relationshipKey(relationship.from, relationship.to)]: relationship },
    people: { [person.id]: { base: person, alive: true, currentRole: roleId } },
    player: {
      metrics: { approval: 0, treasury: 1000, stability: 0.7, militaryReadiness: 0.5, standing: 0.5 },
      metricHistory: [],
      opinion: openingMood(nationA),
      cabinet: { [roleId]: person.id },
      policies: inheritedPolicies(),
      // Zero on the four statecraft accounts, which is what "nothing has been
      // appropriated yet" means for an establishment the fixture is free to
      // build from scratch. The domestic line opens at its own sustainment
      // instead: an unfunded domestic line is a government that has abolished
      // its own departments, and a fixture that started there would be pricing
      // a peace dividend into every unrelated budget assertion.
      budget: {
        ...inheritedBudget(),
        domestic: BUDGET_ACCOUNT_SPECS.domestic.sustainAtFull * FUNDED_BUDGET_ADEQUACY,
      },
      flags: { "founding-complete": true },
      alignments: { economicLeftRight: 0, authLibertarian: 0, nationalistGlobalist: 0 },
    },
    operators: [],
    governments: {},
    conflicts: {},
    conditions: {},
    emergencies: {},
    pursuits: {},
    commitments: {},
    congress,
    bills: {},
    termClock: openingTermClock(1),
    press: openingPressCorps(1),
    treaties: {},
    orders: [],
    judiciary: { cases: [] },
    pendingRules: [],
    lapses: [],
    capRaises: [],
    oversight: foundingOversight(1),
    feed: [],
    ledger: [{ turn: 1, actor: "player", description: "Took the oath of office" }],
    removal: { mechanism: "no-confidence", pressure: 0, pressureHistory: [], beats: [], resolved: false },
    cycles: openingCycles([nationA.id, nationB.id], 1),
    cohorts: openingCohorts(),
    deferrals: {},
    economyHistory: [],
    feedDigest: [],
    stateApprovalHistory: [],
    institutions: { ...foundingInstitutions(),
      ...foundingCircuitSeats(makeCampaignSeed("test-seed"), CAMPAIGN_OPENING_DATE.year) },
    security: foundingSecurity(),
    scenarioFamilies: foundingScenarioFamilies(),
    nominations: {},
    trade: foundingTrade(),
  }));
}

/**
 * Advance turn and calendar together so day-clocked systems (`campaignDay`)
 * and turn-clocked systems stay in step. Bumping `turn` alone leaves a
 * stored `foundingDate` campaign stuck on day zero.
 */
export function withWeeksElapsed(campaign: Campaign, weeks: number): Campaign {
  if (weeks === 0) return campaign;
  return {
    ...campaign,
    turn: campaign.turn + weeks,
    calendar: addDays(campaign.calendar, weeks * DAYS_PER_TURN),
  };
}

/** Jump to an absolute turn ordinal, moving the calendar by the matching weeks. */
export function atCampaignTurn(campaign: Campaign, turn: number): Campaign {
  return withWeeksElapsed(campaign, turn - campaign.turn);
}
