import type { BudgetAccount, CommodityId, ConditionKind } from "@admin/engine";
import type { CohortAxisId } from "@admin/world";
import type { IconName } from "@admin/ui";

// Which glyph a domain id wears on the Nation screens. Each table is a Record
// over the real id union, so a new id in the engine or the dataset is a type
// error here until someone decides what it looks like.

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
};

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

export const AXIS_ICON: Readonly<Record<CohortAxisId, IconName>> = {
  age: "schedule",
  class: "budget",
  schooling: "departmentEducation",
  place: "mapPin",
  work: "departmentLabor",
  race: "layerBlocs",
  sex: "subjectPerson",
  nativity: "world",
  disability: "departmentHealthHumanServices",
  veteran: "departmentVeteransAffairs",
};

/** The glyph an account wears: the instrument it funds, or the government itself. */
export const ACCOUNT_GLYPH: Readonly<Record<BudgetAccount, IconName>> = {
  diplomatic: "instrumentDiplomatic",
  economic: "instrumentEconomic",
  covert: "instrumentCovert",
  military: "instrumentMilitary",
  domestic: "domesticLedger",
};
