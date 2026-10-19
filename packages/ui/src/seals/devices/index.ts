import type { DeviceDrawing } from "../types";
import { CAPITOL_DOME, COLUMN, GAVEL, HOUSE, KEY, LAMP, OPEN_BOOK, QUILL, SCALES, TEMPLE, TORCH } from "./civic";
import { EAGLE_DISPLAYED, EAGLE_SHIELD } from "./eagle";
import { BATTLEMENT, CHAIN_LINKS, MONOGRAM, SHIELD_STARS_STRIPES, SOUTHERN_CROSS, STAR, STAR_CLUSTER, WINGED_STAR } from "./emblem";
import { ANCHOR, COMPASS_ROSE, GLOBE, LIGHTHOUSE, MAP_GRID, SHIP } from "./maritime";
import { BISON, LEAF, MOUNTAIN, OLIVE_BRANCH, SEABIRD, WAVE, WHEAT, WREATH } from "./nature";
import { ANVIL, ATOM, BAR_CHART, DROP, FLASK, GEAR, HELIX, LIGHTNING, MICROPHONE, ROCKET, ROD_OF_ASCLEPIUS, SATELLITE, TOWER, WHEEL } from "./science";

export { laurel } from "./nature";

/** Every device a seal spec may name, keyed by its id. */
export const DEVICES: Readonly<Record<string, DeviceDrawing>> = {
  "eagle-displayed": EAGLE_DISPLAYED,
  "eagle-shield": EAGLE_SHIELD,
  scales: SCALES,
  gavel: GAVEL,
  temple: TEMPLE,
  column: COLUMN,
  "capitol-dome": CAPITOL_DOME,
  house: HOUSE,
  "open-book": OPEN_BOOK,
  quill: QUILL,
  lamp: LAMP,
  torch: TORCH,
  key: KEY,
  star: STAR,
  "star-cluster": STAR_CLUSTER,
  "southern-cross": SOUTHERN_CROSS,
  "shield-stars-stripes": SHIELD_STARS_STRIPES,
  "winged-star": WINGED_STAR,
  "chain-links": CHAIN_LINKS,
  battlement: BATTLEMENT,
  bison: BISON,
  mountain: MOUNTAIN,
  wheat: WHEAT,
  "olive-branch": OLIVE_BRANCH,
  leaf: LEAF,
  wreath: WREATH,
  wave: WAVE,
  seabird: SEABIRD,
  anchor: ANCHOR,
  ship: SHIP,
  lighthouse: LIGHTHOUSE,
  "compass-rose": COMPASS_ROSE,
  globe: GLOBE,
  "map-grid": MAP_GRID,
  atom: ATOM,
  helix: HELIX,
  flask: FLASK,
  "rod-of-asclepius": ROD_OF_ASCLEPIUS,
  gear: GEAR,
  anvil: ANVIL,
  wheel: WHEEL,
  lightning: LIGHTNING,
  satellite: SATELLITE,
  rocket: ROCKET,
  tower: TOWER,
  microphone: MICROPHONE,
  drop: DROP,
  "bar-chart": BAR_CHART,
  monogram: MONOGRAM,
};
