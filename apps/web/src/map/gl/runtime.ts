import type { Map as GlMapInstance, IControl } from "maplibre-gl";
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import { loadRegionTable, loadTopology, type RegionTable } from "../data";
import type { MapPalette } from "../lenses/palette";
import { layerCollection } from "./geojson";
import { baseStyle, DISTRICTS_SOURCE, STATES_SOURCE, WORLD_SOURCE } from "./style";

export type MapLibre = typeof import("maplibre-gl");

let library: Promise<MapLibre> | null = null;

/**
 * MapLibre, imported the first time a map is drawn so the shell's first paint
 * does not wait on it. Its worker is pointed at a same-origin file the build
 * emits: the default resolves beside the library's own module, which the dev
 * server's dependency bundling moves, and a blob worker would need the page's
 * script policy loosened.
 */
export function loadMapLibre(): Promise<MapLibre> {
  if (!library) {
    library = import("maplibre-gl").then((module) => {
      module.setWorkerUrl(workerUrl);
      return module;
    });
    library.catch(() => {
      library = null;
    });
  }
  return library;
}

export interface GlWorld {
  readonly map: GlMapInstance;
  readonly table: RegionTable;
  readonly library: MapLibre;
}

/** Create the map in a container, with the base style, and fill its sources from the baked topologies. */
export async function createGlWorld(container: HTMLElement, palette: MapPalette): Promise<GlWorld> {
  const [maplibre, table, world, states] = await Promise.all([loadMapLibre(), loadRegionTable(), loadTopology("world", "hi"), loadTopology("states", "hi")]);
  const map = new maplibre.Map({
    container,
    style: baseStyle(palette, `${window.location.origin}/map/relief/{z}/{x}/{y}.png`),
    center: [-40, 30],
    zoom: 1.2,
    minZoom: 0.6,
    maxZoom: 12,
    attributionControl: false,
    renderWorldCopies: false,
    dragRotate: false,
    pitchWithRotate: false,
    touchPitch: false,
  });
  map.touchZoomRotate.disableRotation();
  await new Promise<void>((resolve, reject) => {
    map.once("load", () => resolve());
    map.once("error", (event) => reject(event.error instanceof Error ? event.error : new Error("The map failed to start")));
  });
  map.getSource<import("maplibre-gl").GeoJSONSource>(WORLD_SOURCE)?.setData(layerCollection(table, "world", world));
  map.getSource<import("maplibre-gl").GeoJSONSource>(STATES_SOURCE)?.setData(layerCollection(table, "states", states));
  return { map, table, library: maplibre };
}

const removed = new WeakSet<GlMapInstance>();

/**
 * Remove a map and remember it is gone. A layer's cleanups can run a commit
 * after the map's own (the runtime going null re-renders first), and MapLibre
 * throws on a control or feature state touched after removal.
 */
export function removeMap(map: GlMapInstance): void {
  if (removed.has(map)) return;
  removed.add(map);
  map.remove();
}

export function isLive(map: GlMapInstance): boolean {
  return !removed.has(map);
}

const districtsLoaded = new WeakSet<GlMapInstance>();

/** The districts, fetched and handed to the map the first time a district lens asks for them. */
export async function ensureDistricts(world: GlWorld): Promise<void> {
  if (districtsLoaded.has(world.map)) return;
  districtsLoaded.add(world.map);
  try {
    const topology = await loadTopology("districts", "hi");
    if (!isLive(world.map)) return;
    world.map.getSource<import("maplibre-gl").GeoJSONSource>(DISTRICTS_SOURCE)?.setData(layerCollection(world.table, "districts", topology));
  } catch (cause) {
    districtsLoaded.delete(world.map);
    throw cause;
  }
}

/** A map control of one button: the route's framing, restored. */
export function reframeControl(onReframe: () => void): IControl {
  let container: HTMLDivElement | null = null;
  return {
    onAdd() {
      container = document.createElement("div");
      container.className = "maplibregl-ctrl maplibregl-ctrl-group";
      const button = document.createElement("button");
      button.type = "button";
      button.className = "gl-map__reframe";
      button.title = "Back to this screen's view (0)";
      button.setAttribute("aria-label", "Back to this screen's view");
      button.textContent = "⌖";
      button.addEventListener("click", onReframe);
      container.append(button);
      return container;
    },
    onRemove() {
      container?.remove();
      container = null;
    },
  };
}
