import { MILITARY_BRANCHES, Nation, NationBands, NationStats, NationTraits } from "../schemas/nation.js";
import { Person } from "../schemas/person.js";
import { Party } from "../schemas/org-cradle-charter.js";
import { CityObjectSchema } from "../schemas/city.js";
import { StateObjectSchema } from "../schemas/state.js";
import { DistrictObjectSchema } from "../schemas/district.js";
import { SectorMixEntryObject } from "../schemas/sector.js";
import { InstallationAnchor, MaritimeZone } from "../schemas/zone.js";
import { FederalSite, StateCapitol } from "../schemas/site.js";
import type { QuantityKind } from "../metrics/definitions.js";
import { schemaLeaves, type SchemaNode } from "./schema-walk.js";
import { BAND_CONSUMERS, PARTY_CONSUMERS, PERSON_CONSUMERS, TRAIT_CONSUMERS } from "./stat-consumers-people.js";
import {
  CITY_CONSUMERS,
  DISTRICT_CONSUMERS,
  FEDERAL_SITE_CONSUMERS,
  GEO_CONSUMERS,
  INSTALLATION_ANCHOR_CONSUMERS,
  MARITIME_ZONE_CONSUMERS,
  SECTOR_CONSUMERS,
  STATE_CAPITOL_CONSUMERS,
  STATE_CONSUMERS,
} from "./stat-consumers-places.js";

export {
  BAND_CONSUMERS,
  CITY_CONSUMERS,
  DISTRICT_CONSUMERS,
  FEDERAL_SITE_CONSUMERS,
  GEO_CONSUMERS,
  INSTALLATION_ANCHOR_CONSUMERS,
  MARITIME_ZONE_CONSUMERS,
  PARTY_CONSUMERS,
  PERSON_CONSUMERS,
  SECTOR_CONSUMERS,
  STATE_CAPITOL_CONSUMERS,
  STATE_CONSUMERS,
  TRAIT_CONSUMERS,
};

// Every authored field has to be read by something. A field nobody consumes is
// research effort spent on a number that cannot change any outcome, and it is
// worse than useless: it reads as depth the simulation does not actually have.
//
// This registry is the record of who reads what. The paired test walks the
// schema and fails if a field is missing from it, so adding a field forces an
// answer to "and what reads this?" at the time it is added rather than never.
//
// The cover is every authored surface a rule can read — not `NationStats`
// alone. A field outside the cover is a field that can go dead without any
// test noticing, so narrowing this registry's reach is how dead fields return.
//
// A reader is named as a site, not described. Prose claims rotted here: two
// fields were credited for years to rate laws (`deathBaseline`,
// `birthBaseline`) that were never written, and the test only checked that a
// claim was longer than three characters. The paired test now resolves every
// site to a value declared at the top level of a real file, and
// `scripts/report-metric-registry.mjs` lists what the type checker sees
// reading and writing each field, so a claim the code does not bear out shows
// up as a diff in its report.

/**
 * A reader: `repo-relative-path#top-level-declaration`, the key
 * `scripts/rule-seam-census.json` uses, so moving code inside a file never
 * invalidates it. The declaration must be a value (a function, a constant, a
 * class); a type reads nothing.
 */
export type ReaderSite = `${string}#${string}`;

/**
 * Who may change a figure once a campaign is running. `founding-only`: set by
 * the dataset or at founding, and nothing in a campaign writes it.
 * `derived-only`: recomputed from other state by its own derivation, and
 * written by nothing else. `phase-written`:
 * moved only by the turn phase that owns it. `effect-written`: moved by effect
 * packets, from acts, events and phases alike.
 */
export type WritePolicy = "founding-only" | "derived-only" | "phase-written" | "effect-written";

type ConsumerFacts = { readonly path: string; readonly kind?: QuantityKind; readonly writePolicy?: WritePolicy };

// A field is either read by a live rule, or explicitly owed one. "Owed" is a
// debt that is written down, not an exemption — the test pins the exact set,
// so the list cannot quietly grow.
export type StatConsumer =
  | (ConsumerFacts & { readonly readBy: readonly ReaderSite[]; readonly purpose: string })
  | (ConsumerFacts & { readonly owedBy: string });

// Generated from the branch list rather than written out six times, for the
// same reason the unit registry is: eighteen hand-copied lines are eighteen
// chances for one service to claim a reader the other five do not have.
function orderOfBattleConsumers(): StatConsumer[] {
  return MILITARY_BRANCHES.flatMap((branch): StatConsumer[] => [
    {
      path: `military.orderOfBattle.${branch}.headcount`,
      kind: "count",
      writePolicy: "founding-only",
      readBy: [
        "packages/world/src/validate/dataset-validator.ts#checkOrderOfBattle", "packages/world/src/validate/force-checks.ts#checkForceAssets",
        "packages/engine/src/forces.ts#personnelIn",
      ],
      purpose: "the validator's order-of-battle sum and the forces' personnel in each service",
    },
    {
      path: `military.orderOfBattle.${branch}.capabilities`,
      writePolicy: "founding-only",
      readBy: ["packages/engine/src/capacity.ts#branchCapabilities"],
      purpose: "what a deployment names when it takes something away",
    },
    {
      path: `military.orderOfBattle.${branch}.units`,
      // A hull lost in a war leaves the register a unit lighter; every other
      // service's bench is still the one the founding wrote.
      writePolicy: "effect-written",
      readBy: [
        "packages/engine/src/capacity.ts#branchUnits", "packages/engine/src/capacity.ts#availableUnits",
        "packages/engine/src/commitments.ts#orderOfBattleShare",
      ],
      purpose: "the finite bench a second crisis finds thinner",
    },
  ]);
}

// Every NationStats leaf carries its quantity kind (numeric leaves) and who may
// write it in a campaign; the paired test holds both.
export const STAT_CONSUMERS: readonly StatConsumer[] = [
  { path: "demography.population", kind: "count", writePolicy: "effect-written",
    readBy: [
      "packages/world/src/dataset/bands.ts#powerScore", "packages/world/src/validate/dataset-validator.ts#checkCitiesFitTheNation",
      "packages/world/src/validate/dataset-validator.ts#checkGdpPerCapitaUnit", "packages/world/src/validate/dataset-validator.ts#checkStateMass",
      "packages/engine/src/vitals.ts#vitalsPhase",
    ],
    purpose: "bands.powerScore, the validator's unit and mass checks, and the vitals phase that moves it every week",
  },
  { path: "demography.urbanization", kind: "rate", writePolicy: "founding-only",
    readBy: ["packages/world/src/dataset/bands.ts#archetype"],
    purpose: "bands.archetype (trading-hub test)",
  },
  { path: "demography.medianAge", kind: "level", writePolicy: "founding-only",
    owedBy: "a rule that ages a country. The death- and birth-rate laws it was credited to (`deathBaseline`, `birthBaseline`) were never written, and the vital rates are authored constants",
  },
  { path: "demography.growthRate", kind: "rate", writePolicy: "founding-only",
    readBy: ["packages/engine/src/demos.ts#applyAgeDrift", "packages/engine/src/demos.ts#nationalCohortShares"],
    purpose: "engine.demos nationalCohortShares age drift; derived at assembly from birthRate - deathRate + netMigration",
  },
  { path: "demography.literacy", kind: "rate", writePolicy: "founding-only",
    owedBy: "a rule that reads schooling. The birth-rate law it was credited to (`birthBaseline`) was never written",
  },
  { path: "demography.birthRate", kind: "rate", writePolicy: "founding-only",
    readBy: [
      "packages/engine/src/vitals.ts#vitalsPhase", "packages/engine/src/vitals.ts#populationIdentity", "packages/engine/src/demos.ts#applyAgeDrift",
      "packages/world/src/dataset/vital-rates.ts#applyVitalRates", "packages/world/src/validate/vitals-checks.ts#checkVitalRates",
    ],
    purpose: "the vitals phase's population identity, the cohort age drift's inflow, and assembly's growth-rate derivation",
  },
  { path: "demography.deathRate", kind: "rate", writePolicy: "founding-only",
    readBy: [
      "packages/engine/src/vitals.ts#vitalsPhase", "packages/engine/src/vitals.ts#populationIdentity",
      "packages/world/src/dataset/vital-rates.ts#applyVitalRates", "packages/world/src/validate/vitals-checks.ts#checkVitalRates",
    ],
    purpose: "the vitals phase's population identity and assembly's growth-rate derivation",
  },
  { path: "demography.netMigration", kind: "rate", writePolicy: "founding-only",
    readBy: [
      "packages/engine/src/vitals.ts#populationIdentity", "packages/world/src/validate/vitals-checks.ts#checkVitalRates",
      "packages/engine/src/vitals.ts#vitalsPhase", "packages/world/src/dataset/vital-rates.ts#applyVitalRates",
    ],
    purpose: "the vitals phase's population identity, held to the growth identity by the validator",
  },
  { path: "economy.gdp", kind: "flow", writePolicy: "phase-written",
    readBy: [
      "packages/world/src/dataset/bands.ts#powerScore", "packages/world/src/dataset/bands.ts#archetype",
      "packages/world/src/validate/dataset-validator.ts#checkGdpPerCapitaUnit",
      "packages/world/src/validate/dataset-validator.ts#checkMilitaryBudgetUnit", "packages/world/src/validate/dataset-validator.ts#checkStateMass",
    ],
    purpose: "bands.powerScore, bands.archetype, validator.unit-consistency",
  },
  { path: "economy.gdpPerCapita", kind: "level", writePolicy: "phase-written",
    readBy: ["packages/world/src/dataset/bands.ts#wealthTier", "packages/world/src/validate/dataset-validator.ts#checkGdpPerCapitaUnit"],
    purpose: "bands.wealthTier, validator.unit-consistency",
  },
  { path: "economy.growth", kind: "rate", writePolicy: "effect-written",
    readBy: [
      "packages/world/src/dataset/bands.ts#archetype", "packages/engine/src/conditions.ts#conditionEffects",
      "packages/engine/src/macro.ts#nextEconomy", "packages/engine/src/opinion-causes.ts#economyTerms",
    ],
    purpose: "bands.archetype (rising-power test), condition effects, the macro rate law and the public's economy terms",
  },
  { path: "economy.inflation", kind: "rate", writePolicy: "effect-written",
    readBy: ["packages/world/src/dataset/bands.ts#stabilityScore", "packages/engine/src/governance.ts#purseFit"],
    purpose: "bands.stabilityScore, governance.purseFit",
  },
  { path: "economy.unemployment", kind: "rate", writePolicy: "effect-written",
    readBy: ["packages/world/src/dataset/bands.ts#stabilityScore", "packages/engine/src/governance.ts#needFit"],
    purpose: "bands.stabilityScore, governance.needFit",
  },
  { path: "economy.costOfLiving", kind: "index", writePolicy: "phase-written",
    readBy: [
      "packages/engine/src/macro.ts#nextEconomy", "packages/engine/src/macro-baseline.ts#crimeBaseline",
      "packages/world/src/dataset/fiscal-identities.ts#debtToGdp", "packages/player-core/src/world/state-vitals.ts#stateVitals",
    ],
    purpose: "the macro rate law (an index compounds off its own value), the crime baseline, the debt-to-GDP identity and the state vitals reading. Still owed: a housing-crunch onset, a coalition cost-of-living term and a deflator in the revenue and outlay lines",
  },
  { path: "economy.debt", kind: "stock", writePolicy: "effect-written",
    readBy: [
      "packages/engine/src/fiscal.ts#selectFiscalStatement", "packages/world/src/dataset/fiscal-identities.ts#debtToGdp",
      "packages/world/src/dataset/bands.ts#wealthTier", "packages/engine/src/debt-limit.ts#selectDebtLimit",
      "packages/engine/src/national-books.ts#openingBooks", "packages/engine/src/governance.ts#purseFit",
    ],
    purpose: "fiscal.selectFiscalStatement, fiscal-identities.debtToGdp (derived), condition-onset fiscal-crisis pressure, bands.wealthTier via the derived ratio, debt-limit.selectDebtLimit (what counts against the limit), national-books.openingBooks (the stock the books open on), coalitions business cost-of-borrowing term, governance.purseFit",
  },
  { path: "economy.reserves", kind: "stock", writePolicy: "effect-written",
    readBy: ["packages/world/src/dataset/bands.ts#wealthTier"],
    purpose: "bands.wealthTier",
  },
  { path: "economy.sovereignRating", kind: "ordinal", writePolicy: "phase-written",
    readBy: [
      "packages/engine/src/sovereign.ts#tierRate", "packages/engine/src/fiscal.ts#selectOutlay", "packages/engine/src/sovereign.ts#selectSovereign",
      "packages/engine/src/national-books.ts#openingBooks", "packages/world/src/dataset/bands.ts#wealthTier",
    ],
    purpose: "sovereign.tierRate (the debt-service rate fiscal.selectOutlay charges), sovereign.selectSovereign, national-books.openingBooks (the books' opening score), condition-onset fiscal-crisis fragility, bands.wealthTier",
  },
  { path: "trade.exports", kind: "flow", writePolicy: "effect-written",
    readBy: ["packages/world/src/dataset/bands.ts#archetype", "packages/engine/src/propensity.ts#surplusShare"],
    purpose: "bands.archetype (trade intensity), propensity.surplusShare",
  },
  { path: "trade.imports", kind: "flow", writePolicy: "founding-only",
    readBy: ["packages/world/src/dataset/bands.ts#archetype"],
    purpose: "bands.archetype (trade intensity)",
  },
  { path: "trade.balance", kind: "flow", writePolicy: "effect-written",
    readBy: [
      "packages/engine/src/propensity.ts#coercionPropensity", "packages/engine/src/propensity.ts#surplusShare",
      "packages/engine/src/instruments-economic.ts#economicRungs",
    ],
    purpose: "coercion propensity (a surplus is leverage to withhold) and the economic rungs",
  },
  { path: "trade.topExports", writePolicy: "founding-only",
    readBy: ["packages/engine/src/instruments-economic.ts#embargoedShare", "packages/engine/src/instruments-economic.ts#embargoSectorEffects"],
    purpose: "the embargo rung's partner export sectors. Still owed: a sanctions-targeting rule of its own",
  },
  { path: "trade.topPartners", writePolicy: "founding-only",
    owedBy: "a display of a country's named partners, or a sanctions-targeting rule. No engine rule reads membership in this list, by design: ties, trade links and observer exposure read the lane's size in tradeDependence",
  },
  { path: "trade.tradeDependence", writePolicy: "founding-only",
    readBy: [
      "packages/world/src/dataset/bands.ts#archetype", "packages/world/src/validate/dataset-validator.ts#validateDataset",
      "packages/engine/src/propensity.ts#leverageOver", "packages/engine/src/propensity.ts#exposureTo",
      "packages/engine/src/relationship-graph.ts#tradeTie", "packages/engine/src/relationship-graph.ts#tradesWith",
      "packages/engine/src/relationship-graph.ts#deriveRelationship", "packages/engine/src/resolution-ripples.ts#observerTies",
    ],
    purpose: "bands.archetype (client-state, isolationist), validator.dangling-reference, propensity.leverageOver/exposureTo, engine.relationship-graph (a trade tie sized by the lane, a trade link where the reader's own books carry one, the founding edge's dependence), engine.resolution-ripples (an observer's exposure to the target)",
  },
  { path: "energy.production", kind: "flow", writePolicy: "founding-only",
    readBy: ["packages/world/src/dataset/bands.ts#archetype"],
    purpose: "bands.archetype (resource-exporter test)",
  },
  { path: "energy.consumption", kind: "flow", writePolicy: "founding-only",
    readBy: ["packages/world/src/dataset/bands.ts#archetype"],
    purpose: "bands.archetype (resource-exporter test)",
  },
  { path: "energy.importDependence", kind: "rate", writePolicy: "effect-written",
    readBy: ["packages/engine/src/governance.ts#needFit", "packages/engine/src/propensity.ts#coercionPropensity"],
    purpose: "governance.needFit, propensity.coercionPropensity",
  },
  { path: "energy.mix.energy-oil", kind: "rate", writePolicy: "founding-only",
    readBy: ["packages/world/src/dataset/sectors.ts#fillSectorMix", "packages/engine/src/commodity-pressure.ts#energyGrowth"],
    purpose: "the sector mix's energy slice (coal-as-fuel maps here) and the pump-price pass-through on the economy",
  },
  { path: "energy.mix.energy-gas", kind: "rate", writePolicy: "founding-only",
    readBy: ["packages/world/src/dataset/sectors.ts#fillSectorMix", "packages/engine/src/commodity-pressure.ts#energyGrowth"],
    purpose: "the sector mix's energy slice and the home-energy pass-through on the economy",
  },
  { path: "energy.mix.energy-nuclear", kind: "rate", writePolicy: "founding-only",
    readBy: ["packages/world/src/dataset/sectors.ts#fillSectorMix"],
    purpose: "the sector mix's energy slice",
  },
  { path: "energy.mix.energy-renewables", kind: "rate", writePolicy: "founding-only",
    readBy: ["packages/world/src/dataset/sectors.ts#fillSectorMix", "packages/engine/src/clean-power-purchasing.ts#renewableSupplyMwh"],
    purpose: "the sector mix's energy slice and the clean-power purchase's supply",
  },
  { path: "military.budget", kind: "flow", writePolicy: "founding-only",
    readBy: [
      "packages/world/src/dataset/bands.ts#militaryScore", "packages/engine/src/force-costs.ts#spendPerServiceMember",
      "packages/engine/src/force-costs.ts#militaryCostIndex",
    ],
    purpose: "bands.militaryScore, engine.force-costs militaryCostIndex (spending per service member)",
  },
  { path: "military.activeHeadcount", kind: "count", writePolicy: "founding-only",
    readBy: [
      "packages/world/src/dataset/bands.ts#militaryScore", "packages/engine/src/forces.ts#personnelIn",
      "packages/engine/src/force-costs.ts#spendPerServiceMember", "packages/engine/src/force-costs.ts#militaryCostIndex",
      "packages/engine/src/war-forces.ts#principalPersonnel",
    ],
    purpose: "bands.militaryScore, engine.forces personnel split, engine.force-costs militaryCostIndex, engine.war-forces personnel in theater",
  },
  { path: "military.reserveHeadcount", kind: "count", writePolicy: "founding-only",
    readBy: ["packages/world/src/dataset/bands.ts#militaryScore"],
    purpose: "bands.militaryScore",
  },
  { path: "military.readiness", kind: "modeled-score", writePolicy: "effect-written",
    readBy: ["packages/world/src/dataset/bands.ts#militaryScore", "packages/engine/src/forces.ts#readinessIn", "packages/engine/src/warfighting.ts#combatQuality"],
    purpose: "bands.militaryScore, engine.forces domain readiness, engine.warfighting combatQuality",
  },
  { path: "military.doctrineQuality", kind: "modeled-score", writePolicy: "effect-written",
    readBy: [
      "packages/world/src/dataset/bands.ts#militaryScore", "packages/engine/src/forces.ts#forceDomain", "packages/engine/src/contest.ts#reachLayer",
    "packages/engine/src/warfighting.ts#combatQuality"],
    purpose: "bands.militaryScore, engine.forces domain strength, engine.contest home ground, engine.warfighting combatQuality",
  },
  { path: "military.branchStrength.land", kind: "modeled-score", writePolicy: "phase-written",
    readBy: [
      "packages/world/src/dataset/bands.ts#militaryScore", "packages/engine/src/forces.ts#forceDomain",
      "packages/engine/src/forces.ts#inferredShares", "packages/engine/src/warfighting.ts#combatQuality"],
    purpose: "bands.militaryScore, engine.forces domain weight, engine.warfighting combatQuality",
  },
  { path: "military.branchStrength.air", kind: "modeled-score", writePolicy: "phase-written",
    readBy: [
      "packages/world/src/dataset/bands.ts#militaryScore", "packages/engine/src/forces.ts#forceDomain",
      "packages/engine/src/forces.ts#inferredShares", "packages/engine/src/warfighting.ts#combatQuality"],
    purpose: "bands.militaryScore, engine.forces domain weight, engine.warfighting combatQuality",
  },
  { path: "military.branchStrength.naval", kind: "modeled-score", writePolicy: "phase-written",
    readBy: [
      "packages/world/src/dataset/bands.ts#militaryScore", "packages/engine/src/forces.ts#forceDomain",
      "packages/engine/src/forces.ts#inferredShares", "packages/engine/src/warfighting.ts#combatQuality"],
    purpose: "bands.militaryScore, engine.forces domain weight, engine.warfighting combatQuality",
  },
  { path: "military.branchStrength.cyber", kind: "modeled-score", writePolicy: "phase-written",
    readBy: [
      "packages/world/src/dataset/bands.ts#militaryScore", "packages/engine/src/forces.ts#forceDomain",
      "packages/engine/src/forces.ts#inferredShares", "packages/engine/src/warfighting.ts#combatQuality"],
    purpose: "bands.militaryScore, engine.forces domain weight, engine.warfighting combatQuality",
  },
  { path: "military.branchStrength.space", kind: "modeled-score", writePolicy: "founding-only",
    readBy: [
      "packages/world/src/dataset/bands.ts#militaryScore", "packages/engine/src/forces.ts#forceDomain",
      "packages/engine/src/forces.ts#inferredShares", "packages/engine/src/warfighting.ts#combatQuality"],
    purpose: "bands.militaryScore, engine.forces domain weight, engine.warfighting combatQuality",
  },
  { path: "military.airliftCapacity", kind: "modeled-score", writePolicy: "effect-written",
    readBy: ["packages/world/src/dataset/bands.ts#militaryScore", "packages/engine/src/geography.ts#forceProjectionCost", "packages/engine/src/war-forces.ts#principalPersonnel"],
    purpose: "bands.militaryScore, engine.forceProjectionCost, engine.war-forces lift-carried principal",
  },
  { path: "military.sealiftCapacity", kind: "modeled-score", writePolicy: "effect-written",
    readBy: ["packages/world/src/dataset/bands.ts#militaryScore", "packages/engine/src/geography.ts#forceProjectionCost", "packages/engine/src/war-forces.ts#principalPersonnel"],
    purpose: "bands.militaryScore, engine.forceProjectionCost, engine.war-forces lift-carried principal",
  },
  { path: "military.arsenal.warheads", kind: "count", writePolicy: "founding-only",
    readBy: [
      "packages/world/src/dataset/bands.ts#militaryScore", "packages/engine/src/forces.ts#declaredWarheads",
      "packages/engine/src/forces.ts#nuclearReading",
    ],
    purpose: "bands.militaryScore, engine.forces nuclearReading",
  },
  { path: "military.arsenal.deliveryTriad", writePolicy: "founding-only",
    readBy: ["packages/world/src/dataset/bands.ts#militaryScore", "packages/engine/src/forces.ts#nuclearReading"],
    purpose: "bands.militaryScore, engine.forces nuclearReading",
  },
  { path: "military.arsenal.declared", writePolicy: "founding-only",
    readBy: ["packages/engine/src/forces.ts#declaredWarheads"],
    purpose: "engine.forces declaredWarheads (the nuclear reading's fog: no count for an undeclared arsenal)",
  },
  { path: "military.basesAbroad", kind: "count", writePolicy: "founding-only",
    readBy: ["packages/world/src/dataset/bands.ts#militaryScore", "packages/engine/src/contest.ts#reachLayer"],
    purpose: "bands.militaryScore, engine.contest reach layer",
  },
  { path: "security.crimeIndex", kind: "modeled-score", writePolicy: "effect-written",
    readBy: [
      "packages/world/src/dataset/bands.ts#stabilityScore", "packages/engine/src/macro.ts#nextSecurity",
      "packages/engine/src/macro-baseline.ts#crimeBaseline", "packages/engine/src/operators.ts#OPERATOR_PROFILES",
      "packages/engine/src/opinion.ts#openingMood",
    ],
    purpose: "bands.stabilityScore.writ, macro.nextSecurity (the one rate law, reverting toward macro-baseline.crimeBaseline), operators.OPERATOR_PROFILES, vital-edges crime edge, opinion.openingMood at founding",
  },
  { path: "security.corruptionIndex", kind: "modeled-score", writePolicy: "effect-written",
    readBy: [
      "packages/world/src/dataset/bands.ts#stabilityScore", "packages/engine/src/governance.ts#governmentQuality",
      "packages/engine/src/propensity.ts#covertOpening", "packages/engine/src/macro-baseline.ts#crimeBaseline",
    ],
    purpose: "bands.stabilityScore, governance.governmentQuality, macro.crimeBaseline, propensity.covertOpening (what an operation here would have to work with)",
  },
  { path: "security.insurgencyPressure", kind: "modeled-score", writePolicy: "effect-written",
    readBy: ["packages/world/src/dataset/bands.ts#stabilityScore", "packages/world/src/dataset/bands.ts#archetype"],
    purpose: "bands.stabilityScore, bands.archetype (post-conflict)",
  },
  { path: "security.borderControl", kind: "modeled-score", writePolicy: "effect-written",
    readBy: [
      "packages/world/src/dataset/bands.ts#stabilityScore", "packages/engine/src/contest.ts#assistanceLayers",
      "packages/engine/src/contest.ts#covertLayers", "packages/engine/src/contest.ts#reachLayer", "packages/engine/src/propensity.ts#covertOpening",
      "packages/engine/src/macro-baseline.ts#crimeBaseline",
    ],
    purpose: "bands.stabilityScore, engine.contest home ground and covert access, macro.crimeBaseline, propensity.covertOpening (a border that does not hold is a way in)",
  },
  { path: "security.intelCapability", kind: "modeled-score", writePolicy: "effect-written",
    readBy: [
      "packages/engine/src/npc-turn.ts#feedVisibility", "packages/engine/src/contest.ts#covertLayers",
      "packages/engine/src/propensity.ts#covertOpening", "packages/engine/src/state-selectors.ts#hasIntelOnNation",
      "packages/engine/src/state-selectors.ts#hasIntelOnRelationship",
    ],
    purpose: "state.hasIntelOnNation, state.hasIntelOnRelationship, npc-turn.feedVisibility, engine.contest covert collection, propensity.covertOpening (an opening nobody can reach is not an opening)",
  },
  { path: "security.counterIntel", kind: "modeled-score", writePolicy: "effect-written",
    readBy: [
      "packages/world/src/dataset/bands.ts#stabilityScore", "packages/engine/src/npc-turn.ts#feedVisibility",
      "packages/engine/src/contest.ts#covertLayers", "packages/engine/src/state-selectors.ts#hasIntelOnNation",
      "packages/engine/src/state-selectors.ts#hasIntelOnRelationship",
    ],
    purpose: "bands.stabilityScore, state.hasIntelOnNation, state.hasIntelOnRelationship, npc-turn.feedVisibility, engine.contest covert collection",
  },
  { path: "politics.regimeStability", kind: "modeled-score", writePolicy: "effect-written",
    readBy: [
      "packages/world/src/dataset/bands.ts#stabilityScore", "packages/engine/src/macro.ts#nextPolitics",
      "packages/engine/src/governance.ts#regimeSurvivalDrive", "packages/engine/src/npc-agent.ts#survival",
      "packages/engine/src/foreign-politics.ts#incumbentStanding", "packages/engine/src/foreign-politics.ts#coupTerms",
    ],
    purpose: "bands.stabilityScore, macro.nextPolitics (its one rate law, reverting toward the authored value), governance.regimeSurvivalDrive → npc-agent.survival (whether a government losing its hold reaches outward), foreign-politics.incumbentStanding/coupTerms (who comes through a selection; the coup hazard)",
  },
  { path: "politics.legitimacy", kind: "modeled-score", writePolicy: "effect-written",
    readBy: [
      "packages/world/src/dataset/bands.ts#stabilityScore", "packages/engine/src/governance.ts#governmentQuality",
      "packages/engine/src/macro.ts#nextPolitics", "packages/engine/src/governance.ts#audienceCost", "packages/engine/src/pursuits.ts#pursuitPhase",
      "packages/engine/src/foreign-politics.ts#incumbentStanding", "packages/engine/src/foreign-politics.ts#confidenceRate",
    ],
    purpose: "bands.stabilityScore, governance.governmentQuality, macro.nextPolitics (its one rate law), governance.audienceCost → pursuits.pursuitPhase (what climbing down costs this government at home), foreign-politics.incumbentStanding/confidenceRate",
  },
  { path: "politics.factionalism", kind: "modeled-score", writePolicy: "founding-only",
    readBy: [
      "packages/world/src/dataset/bands.ts#stabilityScore", "packages/engine/src/governance.ts#regimeSurvivalDrive",
      "packages/engine/src/npc-agent.ts#survival", "packages/engine/src/propensity.ts#covertOpening",
      "packages/engine/src/foreign-politics.ts#confidenceRate",
    ],
    purpose: "bands.stabilityScore, governance.regimeSurvivalDrive → npc-agent.survival (outward or inward), propensity.covertOpening (a ruling class at each other's throats is what an operation is run through), foreign-politics.confidenceRate (a split chamber brings a government down)",
  },
  { path: "politics.pressFreedom", kind: "modeled-score", writePolicy: "effect-written",
    readBy: [
      "packages/engine/src/governance.ts#governmentCharacter", "packages/engine/src/press-foreign.ts#isStatePress",
      "packages/engine/src/press-foreign.ts#coverageScore",
    ],
    purpose: "governance.governmentCharacter (how open a state reads, which decides what it legislates), press-foreign.isStatePress/coverageScore (state media echo; a free press weighs the President's politics by its freedom)",
  },
  { path: "politics.protestPressure", kind: "modeled-score", writePolicy: "effect-written",
    readBy: ["packages/world/src/dataset/bands.ts#stabilityScore", "packages/engine/src/macro.ts#nextPolitics"],
    purpose: "bands.stabilityScore, macro.nextPolitics (its one rate law)",
  },
  { path: "softPower.diplomaticReach", kind: "modeled-score", writePolicy: "effect-written",
    readBy: [
      "packages/world/src/dataset/bands.ts#powerScore", "packages/world/src/dataset/bands.ts#archetype",
      "packages/engine/src/governance.ts#governmentCharacter",
    ],
    purpose: "bands.powerScore, bands.archetype (isolationist), governance.governmentCharacter",
  },
  { path: "softPower.culturalReach", kind: "modeled-score", writePolicy: "phase-written",
    readBy: ["packages/world/src/dataset/bands.ts#powerScore", "packages/engine/src/contest.ts#diplomaticLayers"],
    purpose: "bands.powerScore, engine.contest diplomatic coalition",
  },
  { path: "softPower.aidGiven", kind: "flow", writePolicy: "effect-written",
    readBy: ["packages/world/src/dataset/bands.ts#powerScore"],
    purpose: "bands.powerScore",
  },
  { path: "softPower.aidReceived", kind: "flow", writePolicy: "effect-written",
    readBy: ["packages/engine/src/instruments-economic.ts#aidFlow"],
    purpose: "instruments.assistance ladder — what a country has been given, and by whom",
  },
  ...orderOfBattleConsumers(),
];

/**
 * Every authored surface a rule can read, with the schema its paths are walked
 * from. The paired test iterates this, so covering a new surface is one entry
 * here rather than a new test.
 */
export const CONSUMER_REGISTRIES: readonly {
  readonly name: string;
  readonly schema: SchemaNode;
  readonly entries: readonly StatConsumer[];
}[] = [
  { name: "NationStats", schema: NationStats, entries: STAT_CONSUMERS },
  { name: "Nation.geo", schema: geoSchema(), entries: GEO_CONSUMERS },
  { name: "NationTraits", schema: NationTraits, entries: TRAIT_CONSUMERS },
  { name: "Person", schema: Person, entries: PERSON_CONSUMERS },
  { name: "NationBands", schema: bandsSchema(), entries: BAND_CONSUMERS },
  { name: "City", schema: CityObjectSchema, entries: CITY_CONSUMERS },
  { name: "State", schema: StateObjectSchema, entries: STATE_CONSUMERS },
  { name: "District", schema: DistrictObjectSchema, entries: DISTRICT_CONSUMERS },
  { name: "SectorMixEntry", schema: SectorMixEntryObject, entries: SECTOR_CONSUMERS },
  { name: "Party", schema: Party, entries: PARTY_CONSUMERS },
  { name: "MaritimeZone", schema: MaritimeZone, entries: MARITIME_ZONE_CONSUMERS },
  { name: "InstallationAnchor", schema: InstallationAnchor, entries: INSTALLATION_ANCHOR_CONSUMERS },
  { name: "FederalSite", schema: FederalSite, entries: FEDERAL_SITE_CONSUMERS },
  { name: "StateCapitol", schema: StateCapitol, entries: STATE_CAPITOL_CONSUMERS },
];


// Read off `Nation` rather than re-declared, so the geo registry is walked
// against the shape the dataset actually validates against.
function geoSchema(): SchemaNode {
  const shape = (Nation as unknown as { _def: { shape: Record<string, SchemaNode> } })._def.shape;
  return shape.geo!;
}

export const consumerByPath: ReadonlyMap<string, StatConsumer> = new Map(
  [
    ...STAT_CONSUMERS,
    ...GEO_CONSUMERS,
    ...TRAIT_CONSUMERS,
    ...PERSON_CONSUMERS,
    ...BAND_CONSUMERS,
    ...CITY_CONSUMERS,
    ...STATE_CONSUMERS,
    ...SECTOR_CONSUMERS,
    ...PARTY_CONSUMERS,
  ].map((c) => [c.path, c]),
);

// Read off the schema the dataset validates against, same as `geoSchema`.
function bandsSchema(): SchemaNode {
  return NationBands as unknown as SchemaNode;
}

// Walks the zod schema rather than a hand-kept list, so a field added to
// NationStats shows up here whether or not anyone remembered this file.
//
// An optional *object* is unwrapped rather than treated as a leaf. Left alone,
// the walk stopped at the wrapper and every field inside it was accounted for
// by one entry covering the lot — which is how a whole sub-record of derived
// military numbers could have gone unread behind a single tick in this file.
export function statLeafPaths(schema: SchemaNode = NationStats, prefix = ""): string[] {
  return schemaLeaves(schema, prefix).map((leaf) => leaf.path);
}
