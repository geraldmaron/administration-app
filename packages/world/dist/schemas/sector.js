import { z } from "zod";
// Closed industrial categories a President names. ISIC-section / GICS-broad,
// not NAICS, not HS, not a plant census. Writers cannot invent ids.
//
// Manufacturing is split only where the office actually names the plant
// (auto, aerospace, semiconductors, steel, textiles). Energy is split by
// fuel the way a briefing does. Coal as a *commodity* is `mining`; coal
// burned as thermal fuel in `energy.mix` maps to `energy-oil` (fossil
// thermal — there is no energy-coal). Retail-wholesale is omitted: it
// would be a dump, not a decision.
export const SECTOR_IDS = [
    "auto",
    "aerospace",
    "semiconductors",
    "steel-heavy",
    "defense-industrial",
    "ports-shipping",
    "telecom-cyber",
    "finance",
    "housing-construction",
    "public-infrastructure",
    "energy-oil",
    "energy-gas",
    "energy-nuclear",
    "energy-renewables",
    "agriculture",
    "textiles",
    "mining",
    "chemicals",
    "food-processing",
    "tourism-hospitality",
    "healthcare",
    "pharma",
    "utilities",
];
export const SectorId = z.enum(SECTOR_IDS);
/** Fuels a nation's `energy.mix` may name. Coal-as-fuel is `energy-oil`. */
export const ENERGY_MIX_SECTORS = ["energy-oil", "energy-gas", "energy-nuclear", "energy-renewables"];
/** Closed mix; omitted fuels read as 0. Unknown keys (energy-coal) fail. */
export const EnergyMix = z
    .object({
    "energy-oil": z.number().min(0).max(1).default(0),
    "energy-gas": z.number().min(0).max(1).default(0),
    "energy-nuclear": z.number().min(0).max(1).default(0),
    "energy-renewables": z.number().min(0).max(1).default(0),
})
    .strict();
export const SectorMixEntryObject = z.object({
    sector: SectorId,
    mix: z.number().min(0).max(1),
    employment: z.number().int().nonnegative(),
    laborPressure: z.number().min(0).max(1),
});
export const SectorMixEntry = SectorMixEntryObject;
