import { feature } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";
import type { Feature, MultiPolygon, Polygon, Position } from "geojson";
import type { MapBounds, MapLayer, MapRegionProperties, MapRegions } from "@admin/ui/map";

// The map's geometry, from the baked TopoJSON to the GeoJSON both drawings
// take: one feature per region keyed by its ref, shapes that cross the
// antimeridian cut so no edge runs the long way round, and Alaska and Hawaii
// moved into the Pacific beside the contiguous states on the US frame.

export type GeoLayer = Exclude<MapLayer, "inset" | "mask">;
export type RegionFeature = Feature<Polygon | MultiPolygon, MapRegionProperties>;

const REF_KIND: Readonly<Record<GeoLayer, string>> = { world: "nation", states: "state", districts: "district" };

export function regionRef(layer: GeoLayer, id: string): string {
  return `${REF_KIND[layer]}:${id}`;
}

type LonLat = readonly [number, number];
type Ring = readonly LonLat[];

/** A ring with each point moved by whole turns to within 180° of the one before, so no edge runs the long way round. */
function unwrapRing(ring: readonly Position[]): Ring {
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
  return ring.flatMap((current, i): LonLat[] => {
    const previous = ring[(i + ring.length - 1) % ring.length]!;
    const t = (meridian - previous[0]) / (current[0] - previous[0]);
    const crossing: LonLat = [meridian, previous[1] + t * (current[1] - previous[1])];
    if (inside(current[0])) return inside(previous[0]) ? [current] : [crossing, current];
    return inside(previous[0]) ? [crossing] : [];
  });
}

function closed(ring: Ring): Ring | null {
  if (ring.length < 3) return null;
  const first = ring[0]!;
  const last = ring[ring.length - 1]!;
  return first[0] === last[0] && first[1] === last[1] ? ring : [...ring, first];
}

/** The three worlds a continuous ring can reach once unwrapped, each with the shift that brings it home. */
const WORLDS: readonly (readonly [number, number, number])[] = [
  [-540, -180, 360],
  [-180, 180, 0],
  [180, 540, -360],
];

function piecesOf(polygon: readonly Ring[]): Position[][][] {
  return WORLDS.flatMap(([west, east, shift]) => {
    const rings = polygon.map((ring) => closed(clipRing(clipRing(ring, west, (lon) => lon >= west), east, (lon) => lon <= east)));
    const [outer, ...holes] = rings;
    if (!outer || outer.length < 4) return [];
    const move = (ring: Ring): Position[] => ring.map(([lon, lat]) => [lon + shift, lat]);
    return [[move(outer), ...holes.flatMap((hole) => (hole && hole.length >= 4 ? [move(hole)] : []))]];
  });
}

const crossesSeam = (polygons: readonly (readonly Position[][])[]): boolean =>
  polygons.some((polygon) => polygon.some((ring) => ring.some((point, i) => i > 0 && Math.abs((point[0] ?? 0) - (ring[i - 1]?.[0] ?? 0)) > 180)));

/** A shape that crosses the antimeridian (Chukotka, Fiji), cut into pieces that each sit inside -180..180. */
export function splitAtAntimeridian(geometry: Polygon | MultiPolygon): Polygon | MultiPolygon {
  const polygons = geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
  if (!crossesSeam(polygons)) return geometry;
  const pieces = polygons.flatMap((polygon) => {
    const [outer, ...holes] = polygon.map(unwrapRing);
    if (!outer) return [];
    const near = (ring: Ring): Ring => {
      const wraps = Math.round(((outer[0]?.[0] ?? 0) - (ring[0]?.[0] ?? 0)) / 360);
      return ring.map(([lon, lat]) => [lon + wraps * 360, lat] as LonLat);
    };
    return piecesOf([outer, ...holes.map(near)]);
  });
  return { type: "MultiPolygon", coordinates: pieces };
}

/** One level's topology as region features; a geometry with no polygon is left out rather than drawn unpickable. */
export function topologyFeatures(topology: Topology, layer: GeoLayer): readonly RegionFeature[] {
  const collection = topology.objects["regions"] as GeometryCollection | undefined;
  if (!collection) throw new Error(`The ${layer} map data has no "regions" object`);
  return collection.geometries.flatMap((object): RegionFeature[] => {
    const decoded = feature(topology, object);
    const geometry = "geometry" in decoded ? decoded.geometry : null;
    if (!geometry || (geometry.type !== "Polygon" && geometry.type !== "MultiPolygon")) return [];
    return [{ type: "Feature", properties: { key: regionRef(layer, String(object.id)), layer }, geometry: splitAtAntimeridian(geometry) }];
  });
}

const toMercator = (lat: number): number => (Math.log(Math.tan(Math.PI / 4 + (Math.max(-85, Math.min(85, lat)) * Math.PI) / 360)) * 180) / Math.PI;
const fromMercator = (y: number): number => (Math.atan(Math.sinh((y * Math.PI) / 180)) * 180) / Math.PI;

/** A place moved beside the contiguous states: its own box, the scale it is drawn at, and where its box's south-west corner lands. */
export interface Inset {
  readonly id: "AK" | "HI";
  /** West, south, east, north of the real place, west unwrapped past -180 where it crosses the seam. */
  readonly source: MapBounds;
  readonly scale: number;
  readonly anchor: readonly [number, number];
}

/** A point moved by an inset, scaled in Web Mercator so the place keeps the shape the map draws it in. */
function insetPoint(inset: Inset, [lon, lat]: Position): Position {
  const [west, south] = inset.source;
  const x = ((lon ?? 0) > 0 ? (lon ?? 0) - 360 : (lon ?? 0)) - west;
  const y = toMercator(lat ?? 0) - toMercator(south);
  return [inset.anchor[0] + x * inset.scale, fromMercator(toMercator(inset.anchor[1]) + y * inset.scale)];
}

/** Whether a polygon belongs in an inset: its first point sits inside the inset's source box. */
function inSource(polygon: readonly Position[][], inset: Inset): boolean {
  const [west, south, east, north] = inset.source;
  const [lon = 0, lat = 0] = polygon[0]?.[0] ?? [];
  const x = lon > 0 ? lon - 360 : lon;
  return x >= west && x <= east && lat >= south && lat <= north;
}

function moveGeometry(geometry: Polygon | MultiPolygon, inset: Inset): MultiPolygon {
  const polygons = geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
  const ring = (points: Position[]): Position[] => points.map((point) => insetPoint(inset, point));
  return { type: "MultiPolygon", coordinates: polygons.filter((polygon) => inSource(polygon, inset)).map((polygon) => polygon.map(ring)) };
}

/** The box an inset draws in, padded, as a frame feature. */
export function insetFrame(inset: Inset): RegionFeature {
  const [west, south, east, north] = inset.source;
  const [x0, y0] = insetPoint(inset, [west, south]) as [number, number];
  const [x1, y1] = insetPoint(inset, [east, north]) as [number, number];
  const pad = 0.8;
  const ring: Position[] = [[x0 - pad, y0 - pad], [x1 + pad, y0 - pad], [x1 + pad, y1 + pad], [x0 - pad, y1 + pad], [x0 - pad, y0 - pad]];
  return { type: "Feature", properties: { key: `inset:${inset.id}`, layer: "inset" }, geometry: { type: "Polygon", coordinates: [ring] } };
}

/**
 * Alaska at under a third of its size and Hawaii a little larger, each set in
 * the Pacific at a US frame's south-west corner, clear of California, Baja
 * California and Mexico's Pacific islands.
 */
export function usInsets(frame: MapBounds): readonly Inset[] {
  const [west, south] = frame;
  return [
    { id: "AK", source: [-188, 51, -129.9, 71.5], scale: 0.28, anchor: [west + 1, south + 6.5] },
    // The main islands only: the Northwestern Hawaiian Islands would stretch the inset across the frame.
    { id: "HI", source: [-160.3, 18.9, -154.8, 22.3], scale: 1.25, anchor: [west + 14, south + 1.2] },
  ];
}

/** The state an inset moves, by a region's ref: the state itself and its districts. */
function insetOf(key: string, insets: readonly Inset[]): Inset | undefined {
  const state = key.startsWith("state:") ? key.slice(6) : key.startsWith("district:") ? key.slice(9).split("-")[0] : undefined;
  return insets.find((inset) => inset.id === state);
}

/** The regions with Alaska and Hawaii moved beside the contiguous states, each inside its frame, and their real shapes masked as sea. */
export function withInsets(features: readonly RegionFeature[], insets: readonly Inset[]): readonly RegionFeature[] {
  const moved = features.map((region) => {
    const inset = insetOf(region.properties.key, insets);
    return inset ? { ...region, geometry: moveGeometry(region.geometry, inset) } : region;
  });
  const masks = features.flatMap((region): RegionFeature[] => (insetOf(region.properties.key, insets) ? [{ ...region, properties: { key: `mask:${region.properties.key}`, layer: "mask" } }] : []));
  return [...moved, ...insets.map(insetFrame), ...masks];
}

export function collectionOf(features: readonly RegionFeature[]): MapRegions {
  return { type: "FeatureCollection", features: [...features] };
}
