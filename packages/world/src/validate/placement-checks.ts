import type { LonLat, MaritimeZone } from "../schemas/zone.js";
import { MARITIME_ZONE_PREFIX, ZoneId } from "../schemas/zone.js";
import type { WorldDataset } from "../schemas/dataset.js";
import { BASING_COUNTRY_TOTAL, US_BASING, type UsBasingRow } from "../dataset/us-basing.js";
import { MARITIME_ZONES } from "../dataset/maritime-zones.js";
import { greatCircleKm } from "../dataset/trade.js";
import { distanceToRingsKm, ringSelfCrossings, ringSignedArea, ringsBounds, ringsContain, ringsOverlap, type Ring } from "../geo/polygon.js";
import { nationOutline, onLand } from "../maps/outlines.js";
import { seedRosterOf } from "./force-checks.js";
import type { ValidationError } from "./validation-error.js";

// Where forces stand has to agree with the map they are drawn on. An
// installation's point falls inside its host's outline, or just off it; a sea
// is a simple ring that shares edges with its neighbors without overlapping
// them, has open water in it, and is framed by governments on the roster.

/**
 * How far off the host's baked outline a sourced point may sit. The outlines
 * are Natural Earth at 1:50m, kept to a tenth of a plate unit (about four
 * kilometers at the equator), so a naval station on a harbor or a base on a
 * small island falls a few kilometers into the drawn sea: Bahrain's whole
 * outline is six points, and the furthest sourced point off its outline,
 * Changi, sits under six kilometers out. Ten kilometers admits that and still
 * refuses a point in a neighboring country or a transposed coordinate.
 */
export const COASTAL_TOLERANCE_KM = 10;

/**
 * Kosovo and the Marshall Islands have no baked outline, so a point there is
 * held to the government's recorded position instead. Kwajalein sits about
 * 490 kilometers from Majuro inside one atoll chain, which sets the radius;
 * it is a weaker check than containment, and the test pins which hosts take it.
 */
export const OUTLINE_LESS_RADIUS_KM = 600;

// The arithmetic stays in kilometers, the unit the outlines are measured in;
// a message a person reads is in miles.
const MILES_PER_KM = 0.621371;
const miles = (km: number): number => Math.round(km * MILES_PER_KM);

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export type PlacementTables = {
  readonly basing: readonly UsBasingRow[];
  readonly zones: readonly MaritimeZone[];
};

const SEEDED: PlacementTables = { basing: US_BASING, zones: MARITIME_ZONES };

function anchorShapeErrors(row: UsBasingRow, path: string): ValidationError[] {
  const hasPoint = row.lat !== undefined && row.lon !== undefined;
  if (row.anchor === "zone-level") {
    return hasPoint ? [{ kind: "shape", path, message: `"${row.base}" is zone-level but carries a point; a zone-level row is never drawn at a site.` }] : [];
  }
  if (row.base === BASING_COUNTRY_TOTAL) return [{ kind: "shape", path, message: `A country total for ${row.country} is anchored; a total is a band, not a place.` }];
  if (!hasPoint) return [{ kind: "shape", path, message: `"${row.base}" is sourced but has no point.` }];
  if (!/^https:\/\//.test(row.anchorSource) || !ISO_DATE.test(row.anchorOpened)) {
    return [{ kind: "shape", path, message: `"${row.base}" has a point with no opened source; a point nobody can check is not seeded.` }];
  }
  return [];
}

function anchorPlacementErrors(dataset: WorldDataset, row: UsBasingRow, path: string): ValidationError[] {
  if (row.anchor !== "sourced" || row.lat === undefined || row.lon === undefined) return [];
  const point: LonLat = [row.lon, row.lat];
  const outline = nationOutline(row.country);
  if (outline) {
    if (ringsContain(outline, point)) return [];
    const off = distanceToRingsKm(outline, point);
    if (off <= COASTAL_TOLERANCE_KM) return [];
    return [{ kind: "plausibility", path, message: `"${row.base}" is ${miles(off)} miles outside ${row.country}'s outline, past the coastal tolerance of ${miles(COASTAL_TOLERANCE_KM)} miles.` }];
  }
  const host = dataset.nations.find((nation) => (nation.id as string) === row.country);
  if (!host) return [];
  const away = greatCircleKm({ lat: row.lat, lon: row.lon }, host.geo);
  if (away <= OUTLINE_LESS_RADIUS_KM) return [];
  return [{ kind: "plausibility", path, message: `"${row.base}" is ${miles(away)} miles from ${row.country}, which the map draws no outline for; the limit is ${miles(OUTLINE_LESS_RADIUS_KM)} miles.` }];
}

/** Installations whose host the map bakes no outline for: the hosts held to a radius rather than containment. */
export function outlineLessHosts(rows: readonly UsBasingRow[] = US_BASING): readonly string[] {
  return [...new Set(rows.filter((row) => row.anchor === "sourced" && !nationOutline(row.country)).map((row) => row.country))].sort();
}

function basingAnchorErrors(dataset: WorldDataset, rows: readonly UsBasingRow[]): ValidationError[] {
  const own = new Set(dataset.nations.map((nation) => nation.id as string));
  return rows.flatMap((row, index) => {
    const path = `seed.usBasing[${index}].anchor`;
    const shape = anchorShapeErrors(row, path);
    if (shape.length > 0 || !own.has(row.country)) return shape;
    return anchorPlacementErrors(dataset, row, path);
  });
}

function hasOpenWater(ring: Ring): boolean {
  const bounds = ringsBounds([ring]);
  const steps = 12;
  for (let i = 1; i < steps; i++) {
    for (let j = 1; j < steps; j++) {
      const point: LonLat = [bounds.west + ((bounds.east - bounds.west) * i) / steps, bounds.south + ((bounds.north - bounds.south) * j) / steps];
      if (ringsContain([ring], point) && !onLand(point)) return true;
    }
  }
  return false;
}

function zoneShapeErrors(zone: MaritimeZone, path: string): ValidationError[] {
  const errors: ValidationError[] = [];
  if (!ZoneId.safeParse(zone.id).success || !(zone.id as string).startsWith(MARITIME_ZONE_PREFIX)) {
    errors.push({ kind: "shape", path, message: `"${zone.id}" is not a maritime zone id (${MARITIME_ZONE_PREFIX}<slug>).` });
  }
  if (new Set(zone.ring.map(([lon, lat]) => `${lon},${lat}`)).size !== zone.ring.length) {
    errors.push({ kind: "shape", path, message: `${zone.name} repeats a vertex; a ring is listed once, unclosed.` });
  }
  if (Math.abs(ringSignedArea(zone.ring)) < 1e-6) errors.push({ kind: "shape", path, message: `${zone.name} encloses no area.` });
  const crossings = ringSelfCrossings(zone.ring);
  if (crossings.length > 0) errors.push({ kind: "shape", path, message: `${zone.name}'s outline crosses itself at edges ${crossings.map((pair) => pair.join("/")).join(", ")}.` });
  return errors;
}

function zoneErrors(dataset: WorldDataset, zones: readonly MaritimeZone[]): ValidationError[] {
  const known = seedRosterOf(dataset);
  const seen = new Set<string>();
  return zones.flatMap((zone, index) => {
    const path = `seed.maritimeZones[${index}]`;
    const errors = zoneShapeErrors(zone, path);
    if (seen.has(zone.id)) errors.push({ kind: "shape", path, message: `"${zone.id}" is listed twice.` });
    seen.add(zone.id);
    const missing = zone.littoral.filter((nation) => !known.has(nation as string));
    if (missing.length > 0) errors.push({ kind: "dangling-reference", path, message: `${zone.name} is framed by ${missing.join(", ")}, not on the roster.` });
    zones.slice(index + 1).forEach((other) => {
      if (ringsOverlap(zone.ring, other.ring)) errors.push({ kind: "plausibility", path, message: `${zone.name} overlaps ${other.name}; neighboring seas share an edge.` });
    });
    if (errors.length === 0 && !hasOpenWater(zone.ring)) errors.push({ kind: "plausibility", path, message: `${zone.name} has no open water: every point sampled in it is on land.` });
    return errors;
  });
}

/**
 * The placement rules: every installation anchor is well formed, and a sourced
 * point falls inside its host's outline or within the coastal tolerance; every
 * maritime zone is a simple ring with open water, framed by governments on
 * the roster, and overlaps no other zone.
 */
export function checkForcePlacement(dataset: WorldDataset, tables: PlacementTables = SEEDED): ValidationError[] {
  return [...basingAnchorErrors(dataset, tables.basing), ...zoneErrors(dataset, tables.zones)];
}
