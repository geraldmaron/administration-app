import type { CommodityId, ConditionKind, InstitutionKind } from "@admin/engine";
import type { ActFamily, ActGoal } from "@admin/player-core";
import type { IconName } from "@admin/ui-web";
import type { ForceAssetId, SectorId } from "@admin/world";
import type { LensId } from "../map/lenses/registry";

// One place that says which glyph a domain id wears. Each table is a Record
// over the real id union, so a new id in the engine or the dataset is a type
// error here until someone decides what it looks like, and screens read the
// glyph from the table instead of keeping a private copy.

/** The glyph a force asset wears: its silhouette by kind, not one drawing per id, because 46 ids are about a dozen things. */
export const FORCE_ASSET_GLYPH: Readonly<Record<ForceAssetId, IconName>> = {
  "army.division": "unitGroundFormation",
  "army.airborne-division": "unitGroundFormation",
  "army.armored-brigade": "unitArmoredVehicle",
  "army.brigade-combat-team": "unitGroundFormation",
  "army.mechanized-brigade": "unitArmoredVehicle",
  "army.air-assault-brigade": "unitHelicopter",
  "army.combat-aviation-brigade": "unitHelicopter",
  "army.group-army": "unitGroundFormation",
  "army.combined-arms-army": "unitGroundFormation",
  "army.maneuver-battalion": "unitGroundFormation",
  "army.air-defense-battalion": "unitMissile",
  "army.air-defense-battery": "unitMissile",
  "navy.carrier-strike-group": "unitAircraftCarrier",
  "navy.surface-action-group": "unitSurfaceCombatant",
  "navy.amphibious-ready-group": "unitSurfaceCombatant",
  "navy.fleet": "unitSurfaceCombatant",
  "navy.aircraft-carrier": "unitAircraftCarrier",
  "navy.attack-submarine": "unitSubmarine",
  "navy.ballistic-missile-submarine": "unitSubmarine",
  "navy.surface-combatant": "unitSurfaceCombatant",
  "navy.frigate": "unitSurfaceCombatant",
  "navy.amphibious-ship": "unitSurfaceCombatant",
  "navy.mine-countermeasures-vessel": "unitSurfaceCombatant",
  "air.fighter-squadron": "unitFighterJet",
  "air.bomber-squadron": "unitBomber",
  "air.refueling-squadron": "unitTransportAircraft",
  "air.fighter-brigade": "unitFighterJet",
  "air.fighter-regiment": "unitFighterJet",
  "air.fighter": "unitFighterJet",
  "air.strategic-bomber": "unitBomber",
  "air.tanker": "unitTransportAircraft",
  "air.strategic-airlifter": "unitTransportAircraft",
  "air.transport": "unitTransportAircraft",
  "marines.expeditionary-force": "unitGroundFormation",
  "marines.littoral-regiment": "unitGroundFormation",
  "marines.brigade": "unitGroundFormation",
  "marines.infantry-regiment": "unitGroundFormation",
  "marines.infantry-battalion": "unitGroundFormation",
  "marines.expeditionary-unit": "unitGroundFormation",
  "space.delta": "unitSatellite",
  "space.missile-warning-constellation": "unitSatellite",
  "space.navigation-satellite": "unitSatellite",
  "cyber.mission-force-team": "sectorTelecomCyber",
  "cyber.national-mission-team": "sectorTelecomCyber",
  "cyber.network-defense-team": "sectorTelecomCyber",
  "cyber.combat-mission-team": "sectorTelecomCyber",
};

/** Each emergency and standing condition, named for itself: a winter storm is not a flood and an emergency is not unrest. */
export const CONDITION_GLYPH: Readonly<Record<ConditionKind, IconName>> = {
  earthquake: "eventEarthquake",
  flood: "eventFlood",
  drought: "eventDrought",
  cyclone: "eventCyclone",
  wildfire: "eventWildfire",
  pandemic: "eventPandemic",
  tornado: "eventTornado",
  "winter-storm": "eventWinterStorm",
  "heat-wave": "eventHeatWave",
  unrest: "eventUnrest",
  recession: "economyRecession",
  "inflation-shock": "economyInflation",
  "unemployment-shock": "economyUnemployment",
  "fiscal-crisis": "eventFiscalCrisis",
  "energy-shortage": "eventEnergyShortage",
  "housing-crunch": "eventHousingCrunch",
  cyberattack: "sectorTelecomCyber",
  "work-stoppage": "departmentLabor",
  "bank-failure": "sectorFinance",
  "mass-casualty-attack": "departmentHomelandSecurity",
  "wrongful-detention": "departmentNationalSecurity",
};

/** What the unnamed kinds of trouble wear: a scenario tagged "disaster" and a Record entry for an emergency, neither of which is an earthquake or unrest. */
export const GENERIC_EVENT_GLYPH = { disaster: "eventEmergency", emergency: "eventEmergency" } as const satisfies Readonly<Record<string, IconName>>;

/**
 * The commodities the engine prices. Where the set has no mark of its own the
 * nearest one stands in, so potash and nitrogen share the fertilizer leaf and
 * wheat and corn share the grain sheaf; crude has its own barrel, apart from
 * the pump that means refined fuel.
 */
export const COMMODITY_GLYPH: Readonly<Record<CommodityId, IconName>> = {
  crude: "commodityCrudeOil",
  "natural-gas": "sectorEnergyGas",
  lng: "sectorEnergyGas",
  wheat: "sectorAgriculture",
  corn: "sectorAgriculture",
  soybeans: "commoditySpecialtyCrops",
  potash: "commodityFertilizer",
  nitrogen: "commodityFertilizer",
  copper: "sectorMining",
  lithium: "commodityBatteries",
  "rare-earths": "commodityCriticalMinerals",
};

export const SECTOR_GLYPH: Readonly<Record<SectorId, IconName>> = {
  auto: "sectorAuto",
  aerospace: "sectorAerospace",
  semiconductors: "sectorSemiconductors",
  "steel-heavy": "sectorSteelHeavy",
  "defense-industrial": "sectorDefenseIndustrial",
  "ports-shipping": "sectorPortsShipping",
  "telecom-cyber": "sectorTelecomCyber",
  finance: "sectorFinance",
  "housing-construction": "sectorHousingConstruction",
  "public-infrastructure": "sectorPublicInfrastructure",
  "energy-oil": "sectorEnergyOil",
  "energy-gas": "sectorEnergyGas",
  "energy-nuclear": "sectorEnergyNuclear",
  "energy-renewables": "sectorEnergyRenewables",
  agriculture: "sectorAgriculture",
  textiles: "sectorTextiles",
  mining: "sectorMining",
  chemicals: "sectorChemicals",
  "food-processing": "sectorFoodProcessing",
  "tourism-hospitality": "sectorTourismHospitality",
  healthcare: "sectorHealthcare",
  pharma: "sectorPharma",
  utilities: "sectorUtilities",
};

/** A body's kind when no emblem of its own is drawn for it; the departments with their own emblem are bound by id where the office is shown. */
export const INSTITUTION_KIND_GLYPH: Readonly<Record<InstitutionKind, IconName>> = {
  presidency: "westWing",
  legislature: "subjectChamber",
  judiciary: "court",
  "state-government": "flag",
  department: "building",
  "executive-office": "westWing",
  "independent-agency": "gavel",
  regulator: "gavel",
  intelligence: "intel",
  military: "shield",
  "operating-component": "building",
  field: "mapPin",
};

export const ACT_FAMILY_GLYPH: Readonly<Record<ActFamily, IconName>> = {
  meet: "summit",
  sign: "sign",
  assist: "instrumentAssistance",
  tariff: "subjectTrade",
  diplomatic: "instrumentDiplomatic",
  justice: "departmentJustice",
  economic: "instrumentEconomic",
  covert: "instrumentCovert",
  military: "instrumentMilitary",
  congress: "subjectCapitol",
};

export const ACT_GOAL_GLYPH: Readonly<Record<ActGoal, IconName>> = {
  ties: "summit",
  trade: "instrumentEconomic",
  pressure: "escalate",
  covert: "instrumentCovert",
  force: "unitGroundFormation",
};

export const MAP_LENS_GLYPH: Readonly<Record<LensId, IconName>> = {
  neutral: "world",
  approval: "favorable",
  delta: "graph",
  lean: "layerLean",
  call: "election",
  relations: "layerTrust",
  forces: "unitGroundFormation",
  house: "subjectChamber",
  "house-hex": "layerBlocs",
  senate: "subjectCapitol",
  "press-reach": "press",
  population: "subjectPerson",
  jobs: "economyUnemployment",
  prices: "economyInflation",
  output: "economyGrowth",
  "federal-dependence": "departmentTreasury",
  conditions: "eventEmergency",
  "state-population": "flag",
  "trade-share": "subjectTrade",
  "world-trend": "graph",
  "world-alignment": "layerBlocs",
};

/** The shared vocabulary of a document's life, so an order, a permit and a rule do not each invent their own marks. */
export type DocumentState = "pending" | "issued" | "expired" | "challenged" | "blocked";

export const DOCUMENT_STATE_GLYPH: Readonly<Record<DocumentState, IconName>> = {
  pending: "pending",
  issued: "statusIssued",
  expired: "statusExpired",
  challenged: "statusChallenged",
  blocked: "statusBlocked",
};

/** Every table by name, for the gallery that shows each id beside its glyph. */
export const GLYPH_TABLES: Readonly<Record<string, Readonly<Record<string, IconName>>>> = {
  "Force assets": FORCE_ASSET_GLYPH,
  Conditions: CONDITION_GLYPH,
  Commodities: COMMODITY_GLYPH,
  Sectors: SECTOR_GLYPH,
  "Institution kinds": INSTITUTION_KIND_GLYPH,
  "Act families": ACT_FAMILY_GLYPH,
  "Act goals": ACT_GOAL_GLYPH,
  "Map lenses": MAP_LENS_GLYPH,
  "Document states": DOCUMENT_STATE_GLYPH,
};

/**
 * A table's glyph for an id that arrives as plain text. An id the table lacks
 * gets the stated fallback and, in development, a warning naming the table, so
 * a new id shows up as a gap to fill and not as a wrong picture.
 */
export function glyphFor(table: Readonly<Record<string, IconName>>, id: string, fallback: IconName): IconName {
  const glyph = Object.hasOwn(table, id) ? table[id] : undefined;
  if (glyph) return glyph;
  if (import.meta.env.DEV) console.warn(`No glyph is mapped for "${id}"; showing "${fallback}".`);
  return fallback;
}
