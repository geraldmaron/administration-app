import type { Position } from "geojson";
import type { MapBounds, MapPin, MapRegions } from "@admin/ui/map";

// Where a mark sits on a region, and the box a camera frames one region by.
// Both read the geometry the map draws, so a pin lands on Alaska where the US
// frame has moved it.

type Ring = readonly Position[];

/** A ring's signed area and centroid in plain degrees; at a state's size the distortion does not move a pin off the land. */
function ringCentroid(ring: Ring): { readonly area: number; readonly x: number; readonly y: number } {
  let area = 0;
  let x = 0;
  let y = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    const [x0 = 0, y0 = 0] = ring[i] ?? [];
    const [x1 = 0, y1 = 0] = ring[i + 1] ?? [];
    const cross = x0 * y1 - x1 * y0;
    area += cross;
    x += (x0 + x1) * cross;
    y += (y0 + y1) * cross;
  }
  return area === 0 ? { area: 0, x: ring[0]?.[0] ?? 0, y: ring[0]?.[1] ?? 0 } : { area: area / 2, x: x / (3 * area), y: y / (3 * area) };
}

function outerRings(regions: MapRegions, key: string): readonly Ring[] {
  const feature = regions.features.find((candidate) => candidate.properties.key === key);
  if (!feature) return [];
  const polygons = feature.geometry.type === "Polygon" ? [feature.geometry.coordinates] : feature.geometry.coordinates;
  return polygons.flatMap((polygon) => (polygon[0] ? [polygon[0]] : []));
}

/** The point a pin sits on: the centroid of the region's largest piece, so Michigan's mark is on the mitten and Hawaii's on the Big Island. */
export function regionAnchor(regions: MapRegions, key: string): readonly [number, number] | null {
  const pieces = outerRings(regions, key).map(ringCentroid);
  const largest = pieces.reduce<(typeof pieces)[number] | null>((best, piece) => (!best || Math.abs(piece.area) > Math.abs(best.area) ? piece : best), null);
  return largest ? [largest.x, largest.y] : null;
}

/** One pin per region that needs the President, a declaration outranking an open matter. */
export function pinsFor(regions: MapRegions | null, marks: ReadonlyMap<string, MapPin["kind"]>): readonly MapPin[] {
  if (!regions) return [];
  return [...marks].flatMap(([regionKey, kind]) => {
    const at = regionAnchor(regions, regionKey);
    return at ? [{ regionKey, lon: at[0], lat: at[1], kind }] : [];
  });
}

/** A piece smaller than this share of its region is left out of the frame, though the map still draws it. */
const FRAMED_SHARE = 0.01;

/**
 * The box a camera frames one region in, padded on every side, around the
 * pieces that make up most of it. The far Aleutians and the small islands
 * northwest of Hawaii would otherwise stretch the box across the Pacific.
 */
export function regionBounds(regions: MapRegions, key: string, pad = 0.12): MapBounds | null {
  const rings = outerRings(regions, key);
  const areas = rings.map((ring) => Math.abs(ringCentroid(ring).area));
  const total = areas.reduce((sum, area) => sum + area, 0);
  const points = rings.filter((_, i) => (areas[i] ?? 0) >= total * FRAMED_SHARE).flat();
  if (points.length === 0) return null;
  const lons = points.map((point) => point[0] ?? 0);
  const lats = points.map((point) => point[1] ?? 0);
  const [w, e, s, n] = [Math.min(...lons), Math.max(...lons), Math.min(...lats), Math.max(...lats)];
  const dx = Math.max(0.5, (e - w) * pad);
  const dy = Math.max(0.5, (n - s) * pad);
  return [Math.max(-180, w - dx), s - dy, e + dx, n + dy];
}
