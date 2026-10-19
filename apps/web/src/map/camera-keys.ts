import { federalSite, federalSitePoint, maritimeZone, stateById } from "@admin/world";
import { regionKey, type RegionTable } from "./data";
import type { GeoBounds } from "./projection";
import type { CameraTarget } from "./target";

// The camera keys a screen may put in its directive, and the one resolver that
// turns each into bounds. The key is the route's framing, so the same key
// always frames the same place; pan and zoom are offsets the map forgets on
// the next key.

export const WORLD: CameraTarget = { label: "World", bounds: [-180, -58, 180, 84], focus: [0, 0] };

/** The contiguous states, the Nation home view; Alaska and Hawaii sit in insets beside it. */
export const UNITED_STATES: CameraTarget = { label: "United States", bounds: [-125, 24.4, -66.9, 49.4], insets: true };

/** Alaska's mainland and the near Aleutians; the far Aleutians cross the antimeridian and would frame half the Pacific. */
export const ALASKA: CameraTarget = { label: "Alaska", bounds: [-170, 51.5, -129.9, 71.4] };

/** The eight main islands; the Northwestern Hawaiian Islands stretch the state's bounds across 23° of ocean. */
export const HAWAII: CameraTarget = { label: "Hawaii", bounds: [-160.6, 18.8, -154.7, 22.4] };

/** The Washington home view: the District and the near suburbs, where every federal headquarters sits. */
export const DC_METRO: CameraTarget = { label: "Washington metro", bounds: [-77.45, 38.7, -76.85, 39.08] };

/** Separates the members of a set, in a camera key and in a selection. */
export const SET_SEPARATOR = "|";

/** The narrowest a district is framed: an urban seat a few blocks wide still shows its neighbors. */
const MIN_DISTRICT_SPAN = 0.6;
/** A point is framed with this much land around it. */
const POINT_SPAN = 4;

/** Pad bounds out to at least `span` degrees on each axis, about their center. */
export function atLeast(bounds: GeoBounds, span: number): GeoBounds {
  const [w, s, e, n] = bounds;
  const width = e >= w ? e - w : e + 360 - w;
  const padX = Math.max(0, (span - width) / 2);
  const padY = Math.max(0, (span - (n - s)) / 2);
  return [wrap(w - padX), Math.max(-89, s - padY), wrap(e + padX), Math.min(89, n + padY)];
}

function wrap(lon: number): number {
  if (lon > 180) return lon - 360;
  if (lon < -180) return lon + 360;
  return lon;
}

/**
 * The smallest bounds holding every member. Longitudes are tried as given and
 * shifted onto 0..360, so a set across the Pacific (Japan and the United
 * States' west coast) does not frame the whole Atlantic instead.
 */
export function unionBounds(members: readonly GeoBounds[]): GeoBounds | null {
  if (members.length === 0) return null;
  const south = Math.min(...members.map((b) => b[1]));
  const north = Math.max(...members.map((b) => b[3]));
  const spans = (shift: boolean): readonly [number, number] => {
    const lon = (x: number): number => (shift && x < 0 ? x + 360 : x);
    const wests = members.map((b) => lon(b[0]));
    // A member that straddles the prime meridian (Britain: -8 to 2) keeps its east edge east of its west edge once the west is shifted.
    const easts = members.map((b) => (b[2] < b[0] && !shift ? 180 : shift && lon(b[2]) < lon(b[0]) ? lon(b[2]) + 360 : lon(b[2])));
    return [Math.min(...wests), Math.max(...easts)];
  };
  const plain = spans(false);
  const shifted = spans(true);
  const [w, e] = shifted[1] - shifted[0] < plain[1] - plain[0] ? shifted : plain;
  return [wrap(w), south, wrap(e), north];
}

function ringBounds(ring: readonly (readonly [number, number])[]): GeoBounds {
  return unionBounds(ring.map(([lon, lat]) => [lon, lat, lon, lat] as const)) ?? WORLD.bounds;
}

export function stateTarget(table: RegionTable, id: string): CameraTarget | null {
  if (id === "AK") return ALASKA;
  if (id === "HI") return HAWAII;
  const region = table.byKey.get(regionKey("states", id));
  if (!region) return null;
  return { label: stateById.get(id)?.name ?? id, bounds: region.id === "DC" ? DC_METRO.bounds : region.bounds };
}

export function districtTarget(table: RegionTable, id: string): CameraTarget | null {
  const region = table.byKey.get(regionKey("districts", id));
  return region ? { label: `District ${id}`, bounds: atLeast(region.bounds, MIN_DISTRICT_SPAN) } : null;
}

export function nationTarget(table: RegionTable, id: string): CameraTarget | null {
  if (id === "USA") return UNITED_STATES;
  const region = table.byKey.get(regionKey("world", id));
  if (!region) return null;
  return { label: region.name ?? id, bounds: region.pointOnly ? atLeast(region.bounds, POINT_SPAN * 1.5) : region.bounds };
}

/** The metro view's span, degrees of longitude and latitude, which an office outside the District is framed at too. */
const METRO_SPAN = [DC_METRO.bounds[2] - DC_METRO.bounds[0], DC_METRO.bounds[3] - DC_METRO.bounds[1]] as const;

function inside(bounds: GeoBounds, lon: number, lat: number): boolean {
  return lon >= bounds[0] && lon <= bounds[2] && lat >= bounds[1] && lat <= bounds[3];
}

/**
 * An office at its sourced headquarters. One inside the Washington metro
 * (the Pentagon, the Treasury) is framed in the metro, so it is seen among
 * its neighbors; one outside it (disease control in Atlanta) is framed at the
 * metro's scale around its own point. An institution with no recorded site,
 * or an id the table does not list, frames the metro.
 */
export function officeTarget(id: string): CameraTarget {
  const point = federalSitePoint(id);
  if (!point) return DC_METRO;
  const label = federalSite(id)?.site || DC_METRO.label;
  if (inside(DC_METRO.bounds, point.lon, point.lat)) return { label, bounds: DC_METRO.bounds, focus: [point.lon, point.lat] };
  const [halfX, halfY] = [METRO_SPAN[0] / 2, METRO_SPAN[1] / 2];
  return { label, bounds: [point.lon - halfX, point.lat - halfY, point.lon + halfX, point.lat + halfY], focus: [point.lon, point.lat] };
}

/** A zone is a government's territory under its own id, or a sea. */
export function zoneTarget(table: RegionTable, id: string): CameraTarget | null {
  const sea = maritimeZone(id);
  if (sea) return { label: sea.name, bounds: ringBounds(sea.ring) };
  return nationTarget(table, id);
}

/** A pin is framed among the few blocks around it, the scale at which neighboring headquarters come apart. */
const PIN_SPAN = 0.03;

function pointTarget(spec: string, span = POINT_SPAN): CameraTarget | null {
  const [lon, lat] = spec.split(",").map(Number);
  if (lon === undefined || lat === undefined || !Number.isFinite(lon) || !Number.isFinite(lat)) return null;
  return { label: "Place", bounds: atLeast([lon, lat, lon, lat], span), focus: [lon, lat] };
}

function setTarget(table: RegionTable, spec: string): CameraTarget | null {
  const members = spec.split(SET_SEPARATOR).map((ref) => resolveCameraKey(ref.trim(), table));
  const found = members.filter((member): member is CameraTarget => member !== null);
  const bounds = unionBounds(found.map((member) => member.bounds));
  return bounds ? { label: found.map((member) => member.label).join(", "), bounds } : null;
}

/**
 * A camera key to its target, or null where the key names nothing the map
 * knows, so the map keeps its framing instead of guessing. `keep` is the
 * explicit form, for screens with no honest geography (courts).
 *
 * Keys: `world`, `us`, `dc`, `state:<id>`, `district:<id>`, `nation:<id>`,
 * `zone:<nation id or SEA-…>`, `office:<institution id>` (its sourced headquarters),
 * `point:<lon>,<lat>`, `pin:<lon>,<lat>` (a few blocks around it), `set:<key>|<key>…` and `keep`.
 */
export function resolveCameraKey(key: string, table: RegionTable): CameraTarget | null {
  const colon = key.indexOf(":");
  const kind = colon < 0 ? key : key.slice(0, colon);
  const id = colon < 0 ? "" : key.slice(colon + 1);
  switch (kind) {
    case "world":
      return WORLD;
    case "us":
      return UNITED_STATES;
    case "dc":
      return DC_METRO;
    case "office":
      return officeTarget(id);
    case "state":
      return stateTarget(table, id);
    case "district":
      return districtTarget(table, id);
    case "nation":
      return nationTarget(table, id);
    case "zone":
      return zoneTarget(table, id);
    case "point":
      return pointTarget(id);
    case "pin":
      return pointTarget(id, PIN_SPAN);
    case "set":
      return setTarget(table, id);
    default:
      return null;
  }
}
