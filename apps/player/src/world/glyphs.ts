import type { IconName } from "@admin/ui";
import { forceAssetFor, type ForceAssetId, type ForceCountNoun, type SectorId } from "@admin/world";
import type { TradeSectorRow } from "@admin/player-core";

// The glyph a force asset and a traded good wears, ported from the legacy
// player's glyph tables: each a Record over the real id union, so a new id in
// the dataset is a type error here until someone decides what it looks like.

/** The silhouette by kind, not one drawing per id, because 46 ids are about a dozen things. */
const FORCE_ASSET_GLYPH: Readonly<Record<ForceAssetId, IconName>> = {
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

const SECTOR_GLYPH: Readonly<Record<SectorId, IconName>> = {
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

// Four trade sectors are one commodity each, and the commodity has its own mark;
// every other sector wears the mark of the dataset sector it rolls into.
const COMMODITY_SECTORS: Readonly<Record<string, IconName>> = {
  "energy-crude": "commodityCrudeOil",
  "energy-gas-lng": "sectorEnergyGas",
  fertilizer: "commodityFertilizer",
  "critical-minerals": "commodityCriticalMinerals",
};

export function tradeGlyph(row: Pick<TradeSectorRow, "sector" | "rollup">): IconName {
  return COMMODITY_SECTORS[row.sector] ?? SECTOR_GLYPH[row.rollup];
}

export function assetGlyph(unitType: ForceAssetId): IconName {
  return FORCE_ASSET_GLYPH[unitType];
}

const SINGULAR: Readonly<Record<ForceCountNoun, string>> = {
  formations: "formation",
  hulls: "hull",
  airframes: "airframe",
  satellites: "satellite",
  teams: "team",
  batteries: "battery",
};

/** What a count of this asset is counted in: hulls for ships, airframes for aircraft, formations for brigades and squadrons. */
export function unitNoun(unitType: ForceAssetId, count: number): string {
  const plural = forceAssetFor(unitType).counts;
  return count === 1 ? SINGULAR[plural] : plural;
}

/** A count as a reader says it, number first, unit after: "1,550 airframes". */
export function figureWords(unitType: ForceAssetId, count: number): string {
  return `${count.toLocaleString("en-US")} ${unitNoun(unitType, count)}`;
}
