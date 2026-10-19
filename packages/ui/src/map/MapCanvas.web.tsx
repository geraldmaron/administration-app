import { useEffect, useRef, useState, type RefObject } from "react";
import { View } from "@tamagui/core";
import type { Map as GlMap, MapMouseEvent, StyleSpecification } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { boundsOf, dynamicPaint, MAP_COLORS, MERCATOR_CORNERS, mapLayers, pickRegion, PIN_SOURCE, pinCollection, pinLayers, REGION_SOURCE, RELIEF_SOURCE, type StyleInput } from "./style";
import type { MapCamera, MapCanvasProps, MapPin, MapRegions, MapRelief } from "./types";
import { mapWorkerUrl } from "./worker";

// The web drawing: MapLibre GL on a canvas inside the frame. The style is
// built once; a lens, a selection or the keyboard restyles layers in place.
// MapLibre itself is fetched the first time a map draws, as its own chunk, so
// a screen without a map never downloads it.

type MapLibre = typeof import("maplibre-gl");

let library: Promise<MapLibre> | null = null;

function loadMapLibre(): Promise<MapLibre> {
  library ??= import("maplibre-gl").then((loaded) => {
    loaded.setWorkerUrl(mapWorkerUrl());
    return loaded;
  });
  // A failed fetch is forgotten so the next map retries; this map still reports it.
  library.catch(() => {
    library = null;
  });
  return library;
}

const EMPTY: MapRegions = { type: "FeatureCollection", features: [] };
const FILL_LAYERS = ["world-fill", "states-fill", "districts-fill"];
const PADDING = 16;

/** A static require on the web is the asset's URL, bare or with its size; a number is a native asset id the web cannot draw. */
function reliefUrl(relief: MapRelief): string {
  if (typeof relief === "string") return relief;
  if (typeof relief === "object") return relief.uri;
  throw new Error("A relief asset on the web must resolve to a URL");
}

function baseStyle(regions: MapRegions | null, input: StyleInput, relief: MapRelief | undefined, pins: readonly MapPin[]): StyleSpecification {
  const layers = mapLayers(input);
  // Pins sit over the seams and under the selection's light, so a chosen state's outline stays on top.
  const under = layers.findIndex((layer) => layer.id === "focus-line");
  return {
    version: 8,
    sources: {
      [REGION_SOURCE]: { type: "geojson", data: (regions ?? EMPTY) as GeoJSON.FeatureCollection },
      [PIN_SOURCE]: { type: "geojson", data: pinCollection(pins) },
      ...(relief === undefined ? {} : { [RELIEF_SOURCE]: { type: "image" as const, url: reliefUrl(relief), coordinates: MERCATOR_CORNERS } }),
    },
    layers: [{ id: "sea", type: "background", paint: { "background-color": MAP_COLORS.sea } }, ...layers.slice(0, under), ...pinLayers(), ...layers.slice(under)] as StyleSpecification["layers"],
  };
}

/** A reader who asked for less motion gets every camera move as a cut. */
const reducedMotion = (): boolean => globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;

/**
 * A frame on one place draws the world's copy past the date line, so Alaska
 * sits in the middle with Russia beside it; without the copy the map is held
 * at the edge of the world and Alaska is pushed against the left of a frame of
 * empty sea. The whole world draws once, never repeated beside itself.
 */
const wrapsWorld = (camera: MapCamera): boolean => camera !== "world";

function frame(map: GlMap, camera: MapCamera, animate: boolean): void {
  map.setRenderWorldCopies(wrapsWorld(camera));
  const [w, s, e, n] = boundsOf(camera);
  const moving = animate && !reducedMotion();
  map.fitBounds([[w, s], [e, n]], { padding: PADDING, animate: moving, duration: moving ? 600 : 0 });
}

/** Whether this browser can give MapLibre a WebGL context at all; without one the constructor throws. */
function canDraw(): boolean {
  try {
    const probe = document.createElement("canvas");
    const context = probe.getContext("webgl2") ?? probe.getContext("webgl");
    // The probe hands its context back at once, so it never counts against the browser's limit.
    context?.getExtension("WEBGL_lose_context")?.loseContext();
    return context !== null;
  } catch {
    return false;
  }
}

const NO_WEBGL = "This browser can't draw the map.";
const NOT_LOADED = "The map didn't load.";

/** Maps this canvas took down itself; their lost context is the teardown, not a failure. */
const retired = new WeakSet<GlMap>();

/** The map, made once per frame element; events reach the latest handlers through refs. */
function useGlMap(host: RefObject<HTMLElement | null>, latest: RefObject<MapCanvasProps>): GlMap | null {
  const [map, setMap] = useState<GlMap | null>(null);
  useEffect(() => {
    const element = host.current;
    if (!element) return;
    if (!canDraw()) {
      latest.current.onFail?.(NO_WEBGL);
      return;
    }
    let live = true;
    let made: GlMap | null = null;
    loadMapLibre()
      .then((maplibre) => {
        if (!live) return;
        made = makeMap(maplibre, element, latest.current, latest);
        made?.once("load", () => {
          if (live) setMap(made);
        });
      })
      .catch((error: unknown) => latest.current.onFail?.(error instanceof Error ? `${NOT_LOADED} ${error.message}` : NOT_LOADED));
    return () => {
      live = false;
      setMap(null);
      if (!made) return;
      retired.add(made);
      made.remove();
    };
    // The map is made once for its element; every later prop is pushed into it by the hooks below.
  }, [host]);
  return map;
}

/** The map itself, or null when MapLibre refuses to start; the failure goes to the frame rather than blanking the page. */
function makeMap(maplibre: MapLibre, element: HTMLElement, props: MapCanvasProps, latest: RefObject<MapCanvasProps>): GlMap | null {
  const input: StyleInput = { fills: props.fills, relief: props.relief !== undefined, ...(props.selected ? { selected: props.selected } : {}), ...(props.chosen ? { chosen: props.chosen } : {}) };
  const [w, s, e, n] = boundsOf(props.camera);
  try {
    const made = new maplibre.Map({
      container: element,
      style: baseStyle(props.regions, input, props.relief, props.pins ?? []),
      bounds: [[w, s], [e, n]],
      fitBoundsOptions: { padding: PADDING },
      minZoom: -2,
      maxZoom: 9,
      renderWorldCopies: wrapsWorld(props.camera),
      attributionControl: false,
      dragRotate: false,
      pitchWithRotate: false,
      touchPitch: false,
      keyboard: false,
      // The page scrolls under the wheel; the buttons, a double click and a pinch zoom.
      scrollZoom: false,
      fadeDuration: reducedMotion() ? 0 : 300,
    });
    made.touchZoomRotate.disableRotation();
    wireEvents(made, latest);
    made.getCanvas().addEventListener("webglcontextlost", () => retired.has(made) || latest.current.onFail?.(NO_WEBGL), { once: true });
    return made;
  } catch (error: unknown) {
    latest.current.onFail?.(error instanceof Error ? `${NO_WEBGL} ${error.message}` : NO_WEBGL);
    return null;
  }
}

function wireEvents(map: GlMap, latest: RefObject<MapCanvasProps>): void {
  const pick = (event: MapMouseEvent): string | null => pickRegion(map.queryRenderedFeatures(event.point, { layers: FILL_LAYERS }));
  map.on("mousemove", (event) => {
    const key = pick(event);
    map.getCanvas().style.cursor = key ? "pointer" : "";
    latest.current.onHover(key);
  });
  map.on("mouseout", () => latest.current.onHover(null));
  map.on("click", (event) => {
    const key = pick(event);
    const press = event.originalEvent as MouseEvent | undefined;
    if (key) latest.current.onSelect(key, Boolean(press && (press.shiftKey || press.metaKey || press.ctrlKey)));
  });
}

function useRegionsSync(map: GlMap | null, regions: MapRegions | null): void {
  useEffect(() => {
    const source = map?.getSource(REGION_SOURCE) as { setData?: (data: GeoJSON.FeatureCollection) => void } | undefined;
    source?.setData?.((regions ?? EMPTY) as GeoJSON.FeatureCollection);
  }, [map, regions]);
}

function usePaintSync(map: GlMap | null, input: StyleInput): void {
  const { fills, selected, chosen, focused, relief } = input;
  const chosenKey = (chosen ?? []).join("|");
  useEffect(() => {
    if (!map) return;
    for (const entry of dynamicPaint({ fills, relief, ...(selected ? { selected } : {}), ...(chosen ? { chosen } : {}), ...(focused ? { focused } : {}) })) {
      if (!map.getLayer(entry.layer)) continue;
      if (entry.fill !== undefined) map.setPaintProperty(entry.layer, "fill-color", entry.fill);
      if (entry.filter !== undefined) map.setFilter(entry.layer, entry.filter);
    }
    // The chosen set is keyed by its members, so a fresh array of the same regions does not restyle.
  }, [map, fills, selected, chosenKey, focused, relief]);
}

function usePinSync(map: GlMap | null, pins: readonly MapPin[] | undefined): void {
  useEffect(() => {
    const source = map?.getSource(PIN_SOURCE) as { setData?: (data: GeoJSON.FeatureCollection) => void } | undefined;
    source?.setData?.(pinCollection(pins ?? []));
  }, [map, pins]);
}

function useCameraSync(map: GlMap | null, camera: MapCamera, reframe: number, zoom: MapCanvasProps["zoom"]): void {
  const key = typeof camera === "string" ? camera : camera.join(",");
  const first = useRef(true);
  useEffect(() => {
    if (!map) return;
    frame(map, camera, !first.current);
    first.current = false;
    // The camera is keyed by its value, so a fresh tuple with the same box does not refly.
  }, [map, key, reframe]);
  useEffect(() => {
    if (map && zoom.step > 0) map.easeTo({ zoom: map.getZoom() + zoom.by, duration: reducedMotion() ? 0 : 300 });
  }, [map, zoom.step, zoom.by]);
}

export function MapCanvas(props: MapCanvasProps) {
  const host = useRef<HTMLElement | null>(null);
  const latest = useRef(props);
  latest.current = props;
  const map = useGlMap(host, latest);
  useRegionsSync(map, props.regions);
  usePaintSync(map, { fills: props.fills, relief: props.relief !== undefined, ...(props.selected ? { selected: props.selected } : {}), ...(props.chosen ? { chosen: props.chosen } : {}), ...(props.focused ? { focused: props.focused } : {}) });
  usePinSync(map, props.pins);
  useCameraSync(map, props.camera, props.reframe, props.zoom);
  // MapLibre makes its container `position: relative`, so the container fills a positioned box rather than being one.
  return (
    <View position="absolute" top={0} left={0} right={0} bottom={0} aria-hidden>
      <View ref={host as never} width="100%" height="100%" />
    </View>
  );
}
