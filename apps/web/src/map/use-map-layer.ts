import { useEffect, useMemo, useRef, useState } from "react";
import type { Campaign } from "@admin/engine";
import { visibleArea, type MapInsets, type Rect, type Viewport } from "./camera";
import { resolveCameraKey, WORLD } from "./camera-keys";
import type { RegionTable } from "./data";
import { detachedNation, detachedState, selectedRegions } from "./detach";
import type { MapMarkLayers, MapPin } from "./directive";
import type { LensLevel } from "./levels";
import { useLazyModule } from "./lazy-module";
import { neutralLens, toRendererLens, type MapLens } from "./lenses/contract";
import type { MapPalette } from "./lenses/palette";
import type { MarkPoint } from "./marks/sources";
import { detachDuration, recolorDuration } from "./motion";
import type { Lens } from "./paint";
import type { MapSettings } from "./settings";
import type { CameraTarget } from "./target";
import type { MapRuntime } from "./use-map-runtime";

/** What the layer knows about where the camera landed. */
export interface Landed {
  readonly label: string;
  readonly effective: LensLevel;
  readonly insets: boolean;
  readonly zoomLevel: number;
}

export const NOT_LANDED: Landed = { label: "The map", effective: "nation", insets: false, zoomLevel: 0 };

const loadRegistry = () => import("./lenses/registry");
const loadMarkSources = () => import("./marks/sources");

/**
 * The lens a directive names, as the list reads it and as the renderer draws
 * it. The neutral lens is drawn at once; any other loads its builders (and the
 * engine they read) the first time one is asked for, and shows neutral until
 * then.
 */
export function useLenses(lensId: string | undefined, campaign: Campaign | null, palette: MapPalette | null, table: RegionTable | null, baseline: Campaign | null = null): { mapLens: MapLens | null; rendererLens: Lens | null } {
  const registry = useLazyModule(loadRegistry, lensId !== undefined && lensId !== "neutral");
  const mapLens = useMemo(() => (palette ? (registry?.resolveLens(lensId, campaign, palette, baseline) ?? neutralLens()) : null), [registry, lensId, campaign, palette, baseline]);
  const rendererLens = useMemo(() => (mapLens && table && palette ? toRendererLens(mapLens, table, palette) : null), [mapLens, table, palette]);
  return { mapLens, rendererLens };
}

/** Push the lens into the renderer: 200ms for a swap, 400ms when the level changes, instant under reduced motion. */
export function useLensSync(runtime: MapRuntime | null, lens: Lens | null, reducedMotion: boolean): void {
  const previous = useRef<Lens | null>(null);
  useEffect(() => {
    if (!runtime || !lens) return;
    const before = previous.current;
    previous.current = lens;
    runtime.renderer.setLens(lens, before ? recolorDuration(before.level !== lens.level, reducedMotion) : 0);
  }, [runtime, lens, reducedMotion]);
}

export function useSelectionSync(runtime: MapRuntime | null, selection: string | undefined, reducedMotion: boolean): ReadonlySet<number> {
  const regions = useMemo(() => (runtime ? selectedRegions(runtime.table, selection) : []), [runtime, selection]);
  useEffect(() => {
    runtime?.renderer.setSelection(regions, detachDuration(reducedMotion));
  }, [runtime, regions, reducedMotion]);
  return useMemo(() => new Set(regions.map((region) => region.index)), [regions]);
}

/** The visible area, stable by value so a re-render with the same insets does not reframe. */
export function useVisibleArea(size: Viewport | null, insets: MapInsets | undefined): Rect | null {
  const { top = 0, right = 0, bottom = 0, left = 0 } = insets ?? {};
  return useMemo(() => (size ? visibleArea(size, { top, right, bottom, left }) : null), [size, top, right, bottom, left]);
}

/**
 * Frame the camera key inside the visible area under the motion rules. An
 * unknown key (and `keep`) holds the current framing; with nothing framed
 * yet it shows the world.
 */
export function useCameraSync(runtime: MapRuntime | null, cameraKey: string, area: Rect | null, settings: MapSettings, reducedMotion: boolean): CameraTarget | null {
  const target = useMemo(() => (runtime ? resolveCameraKey(cameraKey, runtime.table) : null), [runtime, cameraKey]);
  const motion = useRef({ camera: settings.camera, reducedMotion });
  motion.current = { camera: settings.camera, reducedMotion };
  useEffect(() => {
    if (!runtime || !area) return;
    const { renderer } = runtime;
    renderer.setArea(area);
    const next = target ?? (renderer.target ? null : WORLD);
    if (next) void renderer.show(next, motion.current.camera, motion.current.reducedMotion);
  }, [runtime, target, area]);
  return target;
}

/**
 * The pins a directive asks for, from the campaign: incidents through placeOf,
 * forces through player-core's clusters at this zoom, and the screen's own
 * office pins. The campaign's sources load with the first campaign; there are
 * no campaign pins before one.
 */
export function useMarks(campaign: Campaign | null, layers: MapMarkLayers | undefined, lensId: string | undefined, zoomLevel: number, selection?: string, pins?: readonly MapPin[]): readonly MarkPoint[] {
  const sources = useLazyModule(loadMarkSources, campaign !== null);
  const chosen = layers ?? (lensId === "forces" ? "forces" : "incidents");
  const forceZoom = sources?.forceZoomFor(zoomLevel);
  const detached = detachedState(selection);
  const incidents = useMemo(() => (sources && campaign && (chosen === "incidents" || chosen === "both") ? sources.incidentMarks(campaign) : []), [sources, campaign, chosen]);
  const forces = useMemo(() => (sources && campaign && forceZoom !== undefined && (chosen === "forces" || chosen === "both") ? sources.forceMarks(campaign, forceZoom) : []), [sources, campaign, chosen, forceZoom]);
  const nation = detachedNation(selection);
  const places = useMemo(() => {
    // Places are geography, not events: a detached state or government keeps its capital and cities whatever event layers the screen turns off.
    if (!sources) return [];
    if (detached) return sources.placeMarks(detached);
    return nation ? sources.nationPlaceMarks(nation) : [];
  }, [sources, detached, nation]);
  const offices = useMemo(() => (sources && campaign && chosen === "offices" ? sources.officeMarks(campaign) : []), [sources, campaign, chosen]);
  const named = useMemo(() => (pins ?? []).map((pin): MarkPoint => ({ ...pin, kind: pin.kind ?? "office", members: [pin.id] })), [pins]);
  return useMemo(() => [...incidents, ...forces, ...places, ...offices, ...named], [incidents, forces, places, offices, named]);
}

/**
 * A choice made on the map with no shell to route it (the dev harness, a
 * cold title screen): the map frames and detaches it itself until the next
 * directive replaces it, the same as a pan.
 */
export function useLocalOverride(directiveKey: string): readonly [{ readonly camera?: string; readonly selection?: string } | null, (next: { readonly camera?: string; readonly selection?: string } | null) => void] {
  const [local, setLocal] = useState<{ readonly key: string; readonly value: { readonly camera?: string; readonly selection?: string } } | null>(null);
  const value = local && local.key === directiveKey ? local.value : null;
  return [value, (next) => setLocal(next ? { key: directiveKey, value: next } : null)] as const;
}
