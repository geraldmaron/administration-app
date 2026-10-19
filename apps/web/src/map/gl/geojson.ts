import { feature } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";
import type { Feature, FeatureCollection, MultiPolygon, Polygon } from "geojson";
import { regionKey, type LayerName, type RegionTable } from "../data";
import type { GeoBounds } from "../projection";

/** What a region's feature carries: its ref parts, so a click or a hover names the region without a table lookup. */
export interface RegionProperties {
  readonly key: string;
  readonly id: string;
}

export type RegionFeature = Feature<Polygon | MultiPolygon, RegionProperties>;

/**
 * One layer's topology as the features a GeoJSON source tiles. Each feature's
 * id is the region's table index, so a lens paints it with feature state
 * keyed by the same number the rest of the map uses, and nothing is
 * re-uploaded when the lens changes. A region the table does not list, or one
 * with no polygon, is left out rather than drawn unpickable.
 */
export function layerCollection(table: RegionTable, layer: LayerName, topology: Topology): FeatureCollection<Polygon | MultiPolygon, RegionProperties> {
  const collection = topology.objects["regions"] as GeometryCollection | undefined;
  if (!collection) throw new Error(`The ${layer} topology has no "regions" object`);
  const features = collection.geometries.flatMap((object): RegionFeature[] => {
    const id = String(object.id);
    const region = table.byKey.get(regionKey(layer, id));
    if (!region) return [];
    const decoded = feature(topology, object);
    const geometry = "geometry" in decoded ? decoded.geometry : null;
    if (!geometry || (geometry.type !== "Polygon" && geometry.type !== "MultiPolygon")) return [];
    return [{ type: "Feature", id: region.index, properties: { key: regionKey(layer, id), id }, geometry: splitAtAntimeridian(geometry) }];
  });
  return { type: "FeatureCollection", features };
}

type LonLat = readonly [number, number];
type Ring = readonly LonLat[];

/** A ring with each point moved by whole turns to within 180° of the one before, so no edge runs the long way round. */
function unwrapRing(ring: readonly (readonly number[])[]): Ring {
  return ring.reduce<LonLat[]>((out, point) => {
    const previous = out[out.length - 1];
    let lon = point[0] ?? 0;
    if (previous) {
      while (lon - previous[0] > 180) lon -= 360;
      while (previous[0] - lon > 180) lon += 360;
    }
    return [...out, [lon, point[1] ?? 0]];
  }, []);
}

/** Sutherland–Hodgman against one meridian: keep the side `inside` says, adding the crossing point on each edge that changes side. */
function clipRing(ring: Ring, meridian: number, inside: (lon: number) => boolean): Ring {
  const out: LonLat[] = [];
  ring.forEach((current, i) => {
    const previous = ring[(i + ring.length - 1) % ring.length]!;
    const crossing = (): LonLat => {
      const t = (meridian - previous[0]) / (current[0] - previous[0]);
      return [meridian, previous[1] + t * (current[1] - previous[1])];
    };
    if (inside(current[0])) {
      if (!inside(previous[0])) out.push(crossing());
      out.push(current);
    } else if (inside(previous[0])) out.push(crossing());
  });
  return out;
}

function closed(ring: Ring): Ring | null {
  if (ring.length < 3) return null;
  const [first] = ring;
  const last = ring[ring.length - 1]!;
  return first![0] === last[0] && first![1] === last[1] ? ring : [...ring, first!];
}

/** The three worlds a continuous ring can reach once unwrapped, each with the shift that brings it home. */
const WORLDS: readonly (readonly [number, number, number])[] = [
  [-540, -180, 360],
  [-180, 180, 0],
  [180, 540, -360],
];

function piecesOf(polygon: readonly Ring[]): number[][][][] {
  return WORLDS.flatMap(([west, east, shift]) => {
    const rings = polygon.map((ring) => closed(clipRing(clipRing(ring, west, (lon) => lon >= west), east, (lon) => lon <= east)));
    const [outer, ...holes] = rings;
    if (!outer || outer.length < 4) return [];
    const move = (ring: Ring): number[][] => ring.map(([lon, lat]) => [lon + shift, lat]);
    return [[move(outer), ...holes.flatMap((hole) => (hole && hole.length >= 4 ? [move(hole)] : []))]];
  });
}

/**
 * A shape that crosses the antimeridian (Russia's Chukotka, Fiji), cut into
 * pieces that each sit inside -180..180. The baked topology joins them across
 * the seam, and an edge from 179° to -179° is drawn the long way round the
 * globe: the fill then covers a whole band of latitude, which reads as a pale
 * ring around the pole once the land is a little see-through.
 */
export function splitAtAntimeridian(geometry: Polygon | MultiPolygon): Polygon | MultiPolygon {
  const polygons = geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
  const crosses = polygons.some((polygon) => polygon.some((ring) => ring.some((point, i) => i > 0 && Math.abs((point[0] ?? 0) - (ring[i - 1]?.[0] ?? 0)) > 180)));
  if (!crosses) return geometry;
  const pieces = polygons.flatMap((polygon) => {
    const [outer, ...holes] = polygon.map(unwrapRing);
    if (!outer) return [];
    // A hole unwrapped on its own may land a turn away from its outer ring; bring it to the same turn.
    const near = (ring: Ring): Ring => {
      const rotations = Math.round(((outer[0]?.[0] ?? 0) - (ring[0]?.[0] ?? 0)) / 360);
      return ring.map(([lon, lat]) => [lon + rotations * 360, lat] as LonLat);
    };
    return piecesOf([outer, ...holes.map(near)]);
  });
  return { type: "MultiPolygon", coordinates: pieces };
}

/**
 * Bounds as MapLibre fits them: west, south, east, north, with a box that
 * crosses the antimeridian (Russia, Fiji, a set across the Pacific) carried
 * past 180 so the fit takes the short way round instead of the whole world.
 */
export function fitBoundsOf(bounds: GeoBounds): readonly [readonly [number, number], readonly [number, number]] {
  const [w, s, e, n] = bounds;
  return [
    [w, s],
    [e >= w ? e : e + 360, n],
  ];
}

/** Web Mercator's y for a latitude, 0 at the north edge and 1 at the south. */
function mercatorY(lat: number): number {
  const clamped = Math.max(-85, Math.min(85, lat));
  const phi = (clamped * Math.PI) / 180;
  return (1 - Math.log(Math.tan(Math.PI / 4 + phi / 2)) / Math.PI) / 2;
}

function latitudeOf(y: number): number {
  return (Math.atan(Math.sinh(Math.PI * (1 - 2 * y))) * 180) / Math.PI;
}

/**
 * The center and zoom that fit bounds in a box `width` by `height` pixels:
 * MapLibre's world is 512·2^zoom pixels around. Computed here rather than by
 * the map's own fit, which declines on the globe when a docked panel's padding
 * is wider than the globe is at the current zoom.
 */
export function fitCamera(bounds: GeoBounds, width: number, height: number): { readonly center: readonly [number, number]; readonly zoom: number } {
  const [[w, s], [e, n]] = fitBoundsOf(bounds);
  const top = mercatorY(n);
  const bottom = mercatorY(s);
  const spanX = Math.max(1e-6, (e - w) / 360);
  const spanY = Math.max(1e-6, bottom - top);
  const zoom = Math.log2(Math.min(Math.max(1, width) / (spanX * 512), Math.max(1, height) / (spanY * 512)));
  const lon = (w + e) / 2;
  return { center: [lon > 180 ? lon - 360 : lon, latitudeOf((top + bottom) / 2)], zoom };
}
