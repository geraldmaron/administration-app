import { districtPlaceName, worldNations, worldStates } from "@admin/world";
import type { Region } from "../data";

/**
 * The short forms a reader already knows a government by. A name with no
 * entry here has no short form: it is written whole where it fits and left to
 * the tooltip where it does not, rather than abbreviated into a code nobody
 * reads (DEU, BIH).
 */
const NATION_SHORT: Readonly<Record<string, string>> = {
  USA: "U.S.",
  GBR: "UK",
  ARE: "UAE",
  COD: "DR Congo",
  COG: "Congo",
  CAF: "CAR",
  BIH: "Bosnia",
  PRK: "N. Korea",
  KOR: "S. Korea",
  SSD: "S. Sudan",
  MKD: "N. Macedonia",
  CZE: "Czechia",
  DOM: "Dominican Rep.",
  GNQ: "Eq. Guinea",
  PNG: "PNG",
  TTO: "Trinidad",
  VCT: "St. Vincent",
  KNA: "St. Kitts",
  LCA: "St. Lucia",
  ATG: "Antigua",
  STP: "São Tomé",
  MHL: "Marshall Is.",
  SLB: "Solomon Is.",
  FSM: "Micronesia",
  PSE: "Palestine",
  CPV: "Cabo Verde",
  LAO: "Laos",
  SAU: "Saudi Arabia",
  NZL: "N. Zealand",
};

const NATION_NAMES: ReadonlyMap<string, string> = new Map(worldNations.map((nation) => [nation.id as string, nation.identity.name]));
const STATE_NAMES: ReadonlyMap<string, string> = new Map(worldStates.map((state) => [state.id as string, state.name]));

/** "PA-07" is written "PA-7", an at-large seat "AK-AL", and D.C.'s delegate seat "DC". */
export function districtCode(id: string): string {
  const [state, seat] = id.split("-");
  if (seat === "DL") return state ?? id;
  if (seat === "AL" || seat === undefined) return id;
  return `${state}-${Number(seat)}`;
}

/** Every form a region's name comes in, longest first, for the label layer to choose from by the room its shape gives. */
export function labelTexts(region: Region): readonly string[] {
  if (region.layer === "states") {
    const name = STATE_NAMES.get(region.id) ?? region.name ?? region.id;
    return region.id === "DC" ? ["D.C."] : [name, region.id];
  }
  if (region.layer === "districts") {
    const code = districtCode(region.id);
    const place = districtPlaceName(region.id);
    return place ? [`${code} · ${place}`, code] : [code];
  }
  const name = NATION_NAMES.get(region.id) ?? region.name;
  if (name === undefined) return [];
  const short = NATION_SHORT[region.id];
  return short && short.length < name.length ? [name, short] : [name];
}
