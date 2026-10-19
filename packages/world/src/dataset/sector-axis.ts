import type { SectorId } from "../schemas/sector.js";
import type { StateEconomyAxis } from "../schemas/state.js";

// The one place the closed 23 SectorIds fold into the six StateEconomyAxis
// values. An act names a sector; a state is an axis mix; this table is the
// vocabulary crossing between them. `Record<SectorId, StateEconomyAxis>` is
// exhaustive by type, so a 24th sector fails the build until someone says
// which axis it belongs to.
export const SECTOR_AXIS: Readonly<Record<SectorId, StateEconomyAxis>> = {
  auto: "industrial",
  "steel-heavy": "industrial",
  chemicals: "industrial",
  textiles: "industrial",
  "food-processing": "industrial",
  mining: "industrial",
  "housing-construction": "industrial",
  "public-infrastructure": "industrial",
  aerospace: "defense",
  "defense-industrial": "defense",
  semiconductors: "tech",
  "telecom-cyber": "tech",
  pharma: "tech",
  "energy-oil": "energy",
  "energy-gas": "energy",
  "energy-nuclear": "energy",
  "energy-renewables": "energy",
  utilities: "energy",
  agriculture: "agricultural",
  finance: "services",
  "ports-shipping": "services",
  "tourism-hospitality": "services",
  healthcare: "services",
};
