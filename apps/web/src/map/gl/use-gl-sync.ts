import { useEffect, useMemo, useRef } from "react";
import type { Rect } from "../camera";
import { resolveCameraKey, WORLD } from "../camera-keys";
import { selectedRegions } from "../detach";
import type { MapLens } from "../lenses/contract";
import type { MapSettings } from "../settings";
import { framingArea, type CameraTarget } from "../target";
import { fitCamera } from "./geojson";
import { worldFitZoom } from "./gl-view";
import { paintLayer } from "./lens-paint";
import { ensureDistricts, isLive } from "./runtime";
import { DISTRICTS_SOURCE, FILL_LAYERS, fillOpacity, showLevel, STATES_SOURCE, WORLD_SOURCE } from "./style";
import type { GlRuntime } from "./use-gl-runtime";

const SOURCES = { world: WORLD_SOURCE, states: STATES_SOURCE, districts: DISTRICTS_SOURCE } as const;

/** Paint the lens by feature state on the layer its level reads, and show that layer's fills. */
export function useGlLensSync(runtime: GlRuntime | null, lens: MapLens | null): void {
  useEffect(() => {
    if (!runtime || !lens) return;
    let canceled = false;
    const { world, table, view } = runtime;
    // A map torn down under a remount has no style left to restyle.
    if (!isLive(world.map)) return;
    const paint = (layer: keyof typeof SOURCES) => {
      if (!isLive(world.map)) return;
      for (const region of paintLayer(table, layer, lens)) world.map.setFeatureState({ source: SOURCES[layer], id: region.id }, { fill: region.fill });
    };
    paint("world");
    paint("states");
    showLevel(world.map, lens.level);
    view.setLevel(lens.level);
    // What the map holds now, as opposed to what the directive asked for: the browser checks wait on it.
    world.map.getContainer().dataset["paintedLens"] = lens.id;
    if (lens.level === "district") {
      ensureDistricts(world).then(
        () => !canceled && paint("districts"),
        (cause: unknown) => console.warn("The districts did not load", cause),
      );
    }
    return () => {
      canceled = true;
    };
  }, [runtime, lens]);
}

/** Lift the selection: its fill full and its edge glowing, everything else faded behind it. */
export function useGlSelectionSync(runtime: GlRuntime | null, selection: string | undefined): ReadonlySet<number> {
  const regions = useMemo(() => (runtime ? selectedRegions(runtime.table, selection) : []), [runtime, selection]);
  useEffect(() => {
    if (!runtime) return;
    const { map } = runtime.world;
    for (const region of regions) map.setFeatureState({ source: SOURCES[region.layer], id: region.index }, { selected: true });
    for (const layer of FILL_LAYERS) map.setPaintProperty(layer, "fill-opacity", fillOpacity(regions.length > 0));
    runtime.view.setSelection(new Set(regions.map((region) => region.index)));
    return () => {
      if (isLive(map)) for (const region of regions) map.setFeatureState({ source: SOURCES[region.layer], id: region.index }, { selected: false });
    };
  }, [runtime, regions]);
  return useMemo(() => new Set(regions.map((region) => region.index)), [regions]);
}

/** The base padding every framing keeps from the visible area's edge. */
const FRAME_PADDING = 32;
/** The closest any framing comes: a pin a few blocks wide, not a single building. */
const MAX_FRAME_ZOOM = 15;
/** How long each camera setting takes to arrive. A cut is a jump. */
const DURATION: Readonly<Record<MapSettings["camera"], number>> = { fly: 1400, quick: 450, cut: 0 };

function frame(runtime: GlRuntime, target: CameraTarget, area: Rect, motion: MapSettings["camera"], reducedMotion: boolean, onLanded: (target: CameraTarget) => void): void {
  const { map } = runtime.world;
  const container = map.getContainer();
  const framed = framingArea(target, area);
  // A full phone sheet leaves only a sliver; fixed margins can consume that entire frame.
  const margin = Math.min(FRAME_PADDING, Math.max(0, Math.min(framed.x1 - framed.x0, framed.y1 - framed.y0)) * 0.06);
  // MapLibre rejects a negative inset, and the visible area can reach past the container while the shell settles (a panel opening, the world view's wider frame).
  const inset = (value: number): number => (Number.isFinite(value) ? Math.max(0, value) : 0);
  const padding = { top: inset(framed.y0 + margin), left: inset(framed.x0 + margin), right: inset(container.clientWidth - framed.x1 + margin), bottom: inset(container.clientHeight - framed.y1 + margin) };
  const box = { width: framed.x1 - framed.x0 - 2 * margin, height: framed.y1 - framed.y0 - 2 * margin };
  // A bounds fit of the whole world on a globe frames a sphere a fraction of the screen tall; the world view fills the visible area instead.
  // Flat, the world is 512·2^zoom pixels wide, so filling the width shows every government and crops only the poles.
  const flat = map.getProjection()?.type === "mercator";
  const floor = flat ? Math.log2(Math.max(1, box.width) / 512) : worldFitZoom(box);
  const fitted = fitCamera(target.bounds, box.width, box.height);
  const center = target.focus ?? fitted.center;
  const camera = { center: [center[0], center[1]] as [number, number], zoom: Math.min(MAX_FRAME_ZOOM, Math.max(fitted.zoom, floor)), padding };
  runtime.view.setTarget(target);
  // A flight cut short by the next framing ends too; only the framing still current has landed.
  map.once("moveend", () => runtime.view.target === target && onLanded(target));
  const duration = reducedMotion ? 0 : DURATION[motion];
  if (duration === 0) map.jumpTo(camera);
  else map.flyTo({ ...camera, duration, essential: false });
}

/**
 * Frame the camera key inside the visible area under the motion rules. An
 * unknown key (and `keep`) holds the current framing; with nothing framed
 * yet it shows the world. Returns the target and a re-frame for the controls.
 */
export function useGlCameraSync(runtime: GlRuntime | null, cameraKey: string, area: Rect | null, settings: MapSettings, reducedMotion: boolean, onLanded: (target: CameraTarget) => void): { target: CameraTarget | null; reframe: () => void } {
  const target = useMemo(() => (runtime ? resolveCameraKey(cameraKey, runtime.table) : null), [runtime, cameraKey]);
  const latest = useRef({ settings, reducedMotion, onLanded });
  latest.current = { settings, reducedMotion, onLanded };
  const reframe = useRef<() => void>(() => undefined);
  useEffect(() => {
    if (!runtime || !area) return;
    const next = target ?? (runtime.view.target ? null : WORLD);
    const go = (chosen: CameraTarget, motion: MapSettings["camera"]) => frame(runtime, chosen, area, motion, latest.current.reducedMotion, (landed) => latest.current.onLanded(landed));
    reframe.current = () => {
      const current = runtime.view.target;
      if (current) go(current, "quick");
    };
    if (next) go(next, runtime.view.target === next ? "cut" : latest.current.settings.camera);
  }, [runtime, target, area]);
  return { target, reframe: () => reframe.current() };
}
