import { useEffect, useState } from "react";
import type { Topology } from "topojson-specification";
import type { LensLevel, RegionRef } from "@admin/player-core";
import { CAMERA_BOUNDS, type MapCamera, type MapRegions } from "@admin/ui/map";
import { collectionOf, topologyFeatures, usInsets, withInsets, type GeoLayer, type Inset, type RegionFeature } from "./geometry";

// Loading the map's geometry: each level's TopoJSON is its own chunk, fetched
// the first time a map draws that level and kept for every map after it.

const LOADERS: Readonly<Record<GeoLayer, () => Promise<unknown>>> = {
  world: () => import("../../assets/map/world-hi.json"),
  states: () => import("../../assets/map/states-hi.json"),
  districts: () => import("../../assets/map/districts-hi.json"),
};

const cache = new Map<GeoLayer, Promise<readonly RegionFeature[]>>();

/** A JSON chunk arrives as the module or as its default export, by bundler. */
function topologyOf(loaded: unknown): Topology {
  const value = (loaded as { default?: unknown }).default ?? loaded;
  if (!value || typeof value !== "object" || (value as { type?: unknown }).type !== "Topology") throw new Error("The map data is not a topology");
  return value as Topology;
}

export function loadLayer(layer: GeoLayer): Promise<readonly RegionFeature[]> {
  const cached = cache.get(layer);
  if (cached) return cached;
  const pending = LOADERS[layer]().then((loaded) => topologyFeatures(topologyOf(loaded), layer));
  cache.set(layer, pending);
  // A failed load is evicted so the next map retries; the caller still sees the failure.
  pending.catch(() => cache.delete(layer));
  return pending;
}

/** The lens level's region layer: a nation lens draws governments, the others draw the United States by its states or districts. */
const LAYER_OF: Readonly<Record<LensLevel, GeoLayer>> = { nation: "world", state: "states", district: "districts" };

/** Alaska and Hawaii beside the contiguous states on the US frame. */
const US_INSETS: readonly Inset[] = usInsets(CAMERA_BOUNDS.us);

/** What a map draws at one level and camera: governments for context, and the United States at the lens's own level. */
function composeRegions(level: LensLevel, camera: MapCamera, layers: Readonly<Partial<Record<GeoLayer, readonly RegionFeature[]>>>): MapRegions {
  const world = layers.world ?? [];
  if (level === "nation") return collectionOf(world);
  // The states replace the United States' own shape, so its real Alaska never shows beside the moved one.
  const context = world.filter((region) => region.properties.key !== "nation:USA");
  const us = layers[LAYER_OF[level]] ?? [];
  return collectionOf([...context, ...(camera === "us" ? withInsets(us, US_INSETS) : us)]);
}

export type RegionsState = { readonly status: "loading" } | { readonly status: "ready"; readonly regions: MapRegions } | { readonly status: "failed"; readonly error: string };

/** The geometry a map draws for a lens level and camera, loading the layers it needs. */
export function useRegions(level: LensLevel, camera: MapCamera = level === "nation" ? "world" : "us"): RegionsState {
  const [state, setState] = useState<RegionsState>({ status: "loading" });
  const cameraKey = typeof camera === "string" ? camera : camera.join(",");
  useEffect(() => {
    let live = true;
    const needed: readonly GeoLayer[] = level === "nation" ? ["world"] : ["world", LAYER_OF[level]];
    Promise.all(needed.map((layer) => loadLayer(layer).then((features) => [layer, features] as const)))
      .then((loaded) => {
        if (live) setState({ status: "ready", regions: composeRegions(level, camera, Object.fromEntries(loaded)) });
      })
      .catch((error: unknown) => {
        if (live) setState({ status: "failed", error: error instanceof Error ? error.message : String(error) });
      });
    return () => {
      live = false;
    };
    // The camera is keyed by its value, so a fresh tuple with the same box does not reload.
  }, [level, cameraKey]);
  return state;
}

/** Every government, state and district the baked index lists, for a lens's ranked rows, including places too small to draw. */
let indexLoad: Promise<readonly RegionRef[]> | null = null;

type RawIndex = Readonly<Record<GeoLayer, Readonly<Record<string, { readonly name?: string }>>>>;

function regionIndexOf(raw: RawIndex): readonly RegionRef[] {
  return (["world", "states", "districts"] as const).flatMap((layer) => Object.entries(raw[layer]).map(([id, entry]): RegionRef => ({ layer, id, ...(entry.name ? { name: entry.name } : {}) })));
}

export function loadRegionIndex(): Promise<readonly RegionRef[]> {
  indexLoad ??= import("../../assets/map/regions.json").then((loaded) => regionIndexOf(((loaded as { default?: unknown }).default ?? loaded) as RawIndex));
  indexLoad.catch(() => {
    indexLoad = null;
  });
  return indexLoad;
}
