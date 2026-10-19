import { useEffect, useLayoutEffect, useMemo, useRef, useState, type RefObject } from "react";
import type { MapGeoJSONFeature, MapMouseEvent } from "maplibre-gl";
import type { Viewport } from "../camera";
import type { Region, RegionTable } from "../data";
import type { MapPalette } from "../lenses/palette";
import { FrameLog } from "../stats";
import { MAP_FIRST_PAINT_MARK } from "../view";
import { GlView, ViewBus } from "./gl-view";
import { createGlWorld, isLive, reframeControl, removeMap, type GlWorld } from "./runtime";
import { applyPalette, FILL_LAYERS } from "./style";

declare global {
  interface Window {
    __glRuntime?: GlRuntime;
  }
}

/** Map events, read through a ref so the map keeps one set of listeners for its whole life. */
export interface GlEvents {
  readonly hover: (region: Region | null, x: number, y: number) => void;
  readonly select: (region: Region) => void;
  readonly empty: () => void;
}

export interface GlRuntime {
  readonly world: GlWorld;
  readonly table: RegionTable;
  readonly view: GlView;
  readonly bus: ViewBus;
  /** Frame intervals while the camera moves, for the harness and the frame-time measurement. */
  readonly frames: FrameLog;
}

function useElementSize(element: RefObject<HTMLElement | null>): Viewport | null {
  const [size, setSize] = useState<Viewport | null>(null);
  useLayoutEffect(() => {
    const node = element.current;
    if (!node) return;
    const measure = (): void => {
      const box = node.getBoundingClientRect();
      setSize((current) => (current && current.width === box.width && current.height === box.height ? current : { width: box.width, height: box.height }));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [element]);
  return size;
}

function logFrames(world: GlWorld, frames: FrameLog): void {
  let last = performance.now();
  world.map.on("render", () => {
    const now = performance.now();
    if (world.map.isMoving()) frames.push({ interval: now - last, work: 0, phase: world.map.isZooming() ? "zoom" : "pan" });
    last = now;
  });
  world.map.once("idle", () => {
    if (performance.getEntriesByName(MAP_FIRST_PAINT_MARK).length === 0) performance.mark(MAP_FIRST_PAINT_MARK);
  });
}

/**
 * Make the GL map once the palette is readable, and keep it as long as the
 * layer. Lens, selection and camera are pushed into it by the layer's effects;
 * a palette switch recolors it in place.
 */
export function useGlRuntime(container: RefObject<HTMLDivElement | null>, palette: MapPalette | null, events: RefObject<GlEvents>): { runtime: GlRuntime | null; size: Viewport | null; error: string | null } {
  const [runtime, setRuntime] = useState<GlRuntime | null>(null);
  const [error, setError] = useState<string | null>(null);
  const size = useElementSize(container);
  const frames = useMemo(() => new FrameLog(2000), []);
  const paletteRef = useRef(palette);
  paletteRef.current = palette;
  const ready = palette !== null;
  useEffect(() => {
    const element = container.current;
    const colors = paletteRef.current;
    if (!element || !colors) return;
    let made: GlWorld | null = null;
    let disposed = false;
    createGlWorld(element, colors).then(
      (world) => {
        if (disposed) return removeMap(world.map);
        made = world;
        logFrames(world, frames);
        const bus = new ViewBus();
        setRuntime({ world, table: world.table, view: new GlView(world.map, world.table, bus), bus, frames });
      },
      (cause: unknown) => !disposed && setError(cause instanceof Error ? cause.message : String(cause)),
    );
    return () => {
      disposed = true;
      setRuntime(null);
      if (made) removeMap(made.map);
    };
  }, [container, ready, frames]);
  useEffect(() => {
    if (runtime && palette) applyPalette(runtime.world.map, palette);
  }, [runtime, palette]);
  usePicking(runtime, events);
  useEffect(() => {
    // A dev server's console and the browser checks read the live map here; a production build drops it.
    if (!import.meta.env.DEV || !runtime) return;
    window.__glRuntime = runtime;
    return () => {
      delete window.__glRuntime;
    };
  }, [runtime]);
  return { runtime, size, error };
}

function visibleFills(runtime: GlRuntime): string[] {
  return FILL_LAYERS.filter((layer) => runtime.world.map.getLayoutProperty(layer, "visibility") !== "none");
}

/** Hover lifts a region's fill and names it in the tooltip; a click chooses it, or, on open sea, chooses nothing. */
function usePicking(runtime: GlRuntime | null, events: RefObject<GlEvents>): void {
  useEffect(() => {
    if (!runtime) return;
    const { map } = runtime.world;
    let hovered: MapGeoJSONFeature | null = null;
    const regionOf = (feature: MapGeoJSONFeature | null): Region | null => (typeof feature?.id === "number" ? (runtime.table.regions[feature.id] ?? null) : null);
    const top = (event: MapMouseEvent) => map.queryRenderedFeatures(event.point, { layers: visibleFills(runtime) })[0] ?? null;
    const setHover = (next: MapGeoJSONFeature | null) => {
      if (hovered?.id !== undefined) map.setFeatureState({ source: hovered.source, id: hovered.id }, { hover: false });
      hovered = next;
      if (next?.id !== undefined) map.setFeatureState({ source: next.source, id: next.id }, { hover: true });
    };
    const onMove = (event: MapMouseEvent) => {
      const feature = map.isMoving() ? null : top(event);
      setHover(feature);
      events.current?.hover(regionOf(feature), event.point.x, event.point.y);
    };
    const onClick = (event: MapMouseEvent) => {
      const region = regionOf(top(event));
      if (region) events.current?.select(region);
      else events.current?.empty();
    };
    const onLeave = () => {
      setHover(null);
      events.current?.hover(null, 0, 0);
    };
    map.on("mousemove", onMove);
    map.on("click", onClick);
    map.getCanvas().addEventListener("mouseleave", onLeave);
    return () => {
      if (!isLive(map)) return;
      map.off("mousemove", onMove);
      map.off("click", onClick);
      map.getCanvas().removeEventListener("mouseleave", onLeave);
    };
  }, [runtime, events]);
}

/** Plus, minus, back to the route's framing, and the globe toggle; `0` re-frames from the keyboard. */
export function useGlControls(runtime: GlRuntime | null, reframe: () => void): void {
  const latest = useRef(reframe);
  latest.current = reframe;
  useEffect(() => {
    if (!runtime) return;
    const { map, library } = runtime.world;
    const controls = [new library.NavigationControl({ showCompass: false, visualizePitch: false }), reframeControl(() => latest.current()), new library.GlobeControl()];
    for (const control of controls) map.addControl(control, "bottom-right");
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "0") latest.current();
    };
    map.getContainer().addEventListener("keydown", onKey);
    return () => {
      map.getContainer().removeEventListener("keydown", onKey);
      if (isLive(map)) for (const control of controls) map.removeControl(control);
    };
  }, [runtime]);
}

/** The title screen's slow turn, degrees of longitude a second; it yields to the player's own hand and resumes when they let go. */
const TURN_DEG_PER_SEC = 3;

export function useTurning(runtime: GlRuntime | null, turning: boolean): void {
  useEffect(() => {
    if (!runtime || !turning) return;
    const { map } = runtime.world;
    let frame = 0;
    let last = performance.now();
    const step = (now: number) => {
      const seconds = Math.min(0.1, (now - last) / 1000);
      last = now;
      if (!map.isMoving()) {
        const center = map.getCenter();
        map.setCenter([center.lng + TURN_DEG_PER_SEC * seconds, center.lat]);
      }
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [runtime, turning]);
}
