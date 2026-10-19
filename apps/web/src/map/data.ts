import { feature } from "topojson-client";
import type { GeometryCollection, GeometryObject, Topology } from "topojson-specification";
import type { MultiPolygon, Polygon } from "geojson";
import regionsUrl from "./data/regions.json?url";
import worldLoUrl from "./data/world-lo.json?url";
import worldHiUrl from "./data/world-hi.json?url";
import statesLoUrl from "./data/states-lo.json?url";
import statesHiUrl from "./data/states-hi.json?url";
import districtsLoUrl from "./data/districts-lo.json?url";
import districtsHiUrl from "./data/districts-hi.json?url";
import type { GeoBounds } from "./projection";

export type LayerName = "world" | "states" | "districts";
export type Lod = "lo" | "hi";

/** One region the map can draw and pick: a government, a state or a district. */
export interface Region {
  readonly index: number;
  readonly layer: LayerName;
  readonly id: string;
  readonly name?: string;
  readonly centroid: readonly [number, number];
  /** Where its name is written: the interior point farthest from every edge, which a crescent's centroid is not. */
  readonly label: readonly [number, number];
  /** Land area in square kilometers: the larger region's name is placed first when two compete. */
  readonly area: number;
  readonly bounds: GeoBounds;
  /** No geometry at any level: drawn only as its centroid dot. */
  readonly pointOnly: boolean;
}

export interface RegionTable {
  readonly regions: readonly Region[];
  readonly byKey: ReadonlyMap<string, Region>;
}

/**
 * One region's shape at one level of detail. The geometry is decoded from the
 * topology on first use, inside the time-sliced projection job, so a lazy
 * level arriving mid-flight costs a JSON parse and nothing more.
 */
export interface Shape {
  readonly region: number;
  readonly geometry: () => Polygon | MultiPolygon | null;
}

const LOD_URLS: Readonly<Record<LayerName, Record<Lod, string>>> = {
  world: { lo: worldLoUrl, hi: worldHiUrl },
  states: { lo: statesLoUrl, hi: statesHiUrl },
  districts: { lo: districtsLoUrl, hi: districtsHiUrl },
};

/** The levels fetched before the first frame: the rest load when a view needs them. */
export const UP_FRONT: readonly (readonly [LayerName, Lod])[] = [
  ["world", "lo"],
  ["states", "lo"],
];

interface RawRegion {
  readonly c: readonly [number, number];
  readonly l?: readonly [number, number];
  readonly a?: number;
  readonly b: readonly [number, number, number, number];
  readonly name?: string;
  readonly point?: boolean;
}

export type RawIndex = Readonly<Record<LayerName, Readonly<Record<string, RawRegion>>>>;

export const regionKey = (layer: LayerName, id: string): string => `${layer}:${id}`;

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Map data ${url} failed to load: ${response.status}`);
  return (await response.json()) as T;
}

export async function loadRegionTable(): Promise<RegionTable> {
  return tableFromIndex(await fetchJson<RawIndex>(regionsUrl));
}

/** The region table from the baked index: every government, state and district in one indexed list. */
export function tableFromIndex(raw: RawIndex): RegionTable {
  const layers: readonly LayerName[] = ["world", "states", "districts"];
  const regions = layers.flatMap((layer) => Object.entries(raw[layer]).map(([id, entry]) => ({ layer, id, entry })));
  const table = regions.map(({ layer, id, entry }, index): Region => ({
    index,
    layer,
    id,
    ...(entry.name === undefined ? {} : { name: entry.name }),
    centroid: entry.c,
    label: entry.l ?? entry.c,
    area: entry.a ?? 0,
    bounds: entry.b,
    pointOnly: entry.point === true,
  }));
  return { regions: table, byKey: new Map(table.map((r) => [regionKey(r.layer, r.id), r])) };
}

const layerCache = new WeakMap<RegionTable, readonly LayerName[]>();

/** Each region's layer by index, which sets how heavy its border is drawn; the table never changes after load. */
export function regionLayers(table: RegionTable): readonly LayerName[] {
  let layers = layerCache.get(table);
  if (!layers) {
    layers = table.regions.map((region) => region.layer);
    layerCache.set(table, layers);
  }
  return layers;
}

const shapeCache = new Map<string, Promise<readonly Shape[]>>();

const topologyCache = new Map<string, Promise<Topology>>();

/** One level's raw topology, fetched once and kept: the GL map tiles it itself, so it wants the whole file rather than per-region shapes. */
export function loadTopology(layer: LayerName, lod: Lod): Promise<Topology> {
  const key = `${layer}-${lod}`;
  const cached = topologyCache.get(key);
  if (cached) return cached;
  const pending = fetchJson<Topology>(LOD_URLS[layer][lod]);
  topologyCache.set(key, pending);
  pending.catch(() => topologyCache.delete(key));
  return pending;
}

/** The shapes of one level of detail, fetched once and kept. */
export function loadShapes(table: RegionTable, layer: LayerName, lod: Lod): Promise<readonly Shape[]> {
  const key = `${layer}-${lod}`;
  const cached = shapeCache.get(key);
  if (cached) return cached;
  const pending = fetchJson<Topology>(LOD_URLS[layer][lod]).then((topology) => toShapes(table, layer, topology));
  shapeCache.set(key, pending);
  // Evict a failed load so the next view retries; callers still see the rejection.
  pending.catch(() => shapeCache.delete(key));
  return pending;
}

function lazyGeometry(topology: Topology, object: GeometryObject): () => Polygon | MultiPolygon | null {
  let decoded: { readonly value: Polygon | MultiPolygon | null } | null = null;
  return () => {
    if (decoded === null) {
      const decodedFeature = feature(topology, object);
      const geometry = "geometry" in decodedFeature ? decodedFeature.geometry : null;
      decoded = { value: geometry && (geometry.type === "Polygon" || geometry.type === "MultiPolygon") ? geometry : null };
    }
    return decoded.value;
  };
}

function toShapes(table: RegionTable, layer: LayerName, topology: Topology): readonly Shape[] {
  const collection = topology.objects["regions"] as GeometryCollection;
  return collection.geometries.flatMap((object) => {
    const region = table.byKey.get(regionKey(layer, String(object.id)));
    return region ? [{ region: region.index, geometry: lazyGeometry(topology, object) }] : [];
  });
}

const LAZY_LEVELS: readonly (readonly [LayerName, Lod])[] = [
  ["world", "hi"],
  ["states", "hi"],
  ["districts", "lo"],
  ["districts", "hi"],
];

/**
 * Fetch the lazy levels one at a time while the main thread is idle, so a
 * flight never waits on a download or parses a level while it moves.
 */
export async function prefetchLazyLevels(table: RegionTable, idle: () => Promise<void>): Promise<void> {
  for (const [layer, lod] of LAZY_LEVELS) {
    await idle();
    await loadShapes(table, layer, lod);
  }
}
