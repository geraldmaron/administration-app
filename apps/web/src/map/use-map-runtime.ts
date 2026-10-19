import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";
import type { Viewport } from "./camera";
import { loadRegionTable, loadShapes, UP_FRONT, type Region, type RegionTable } from "./data";
import type { FrameColors } from "./frame-draw";
import { readPalette, type MapPalette } from "./lenses/palette";
import { MapRenderer } from "./renderer";
import { ViewBus } from "./gl/gl-view";
import type { CameraTarget } from "./target";
import type { Density } from "./pitch";

/** Renderer events, read through a ref so the renderer keeps one set of callbacks for its whole life. */
export interface RuntimeEvents {
  readonly hover: (region: Region | null, x: number, y: number) => void;
  readonly select: (region: Region) => void;
  readonly empty: () => void;
  readonly landed: (target: CameraTarget) => void;
}

export { ViewBus };

export interface MapRuntime {
  readonly renderer: MapRenderer;
  readonly table: RegionTable;
  readonly bus: ViewBus;
}

export function frameColors(palette: MapPalette): FrameColors {
  return { ground: palette.ground, neutral: palette.neutral, land: palette.land, border: palette.border, line: palette.line, seaGlow: palette.seaGlow, coast: palette.coast, graticule: palette.graticule, selection: palette.selection, shadow: palette.shadow };
}

/** The root-element attributes the token sheet swaps the map's ramps on. */
const TOKEN_SWITCHES = ["data-theme", "data-vision", "data-contrast"];

/**
 * The palette the layer's stylesheet resolves, re-read when the palette or
 * contrast setting changes, and again when the root element's token switches
 * change: the shell writes those after the map has rendered, and protan to
 * tritan is the same map variant over different tokens.
 */
export function usePalette(root: RefObject<HTMLElement | null>, variant: string, highContrast: boolean): MapPalette | null {
  const [palette, setPalette] = useState<MapPalette | null>(null);
  useLayoutEffect(() => {
    if (root.current) setPalette(readPalette(root.current));
  }, [root, variant, highContrast]);
  useEffect(() => {
    if (typeof MutationObserver === "undefined") return;
    const observer = new MutationObserver(() => root.current && setPalette(readPalette(root.current)));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: TOKEN_SWITCHES });
    return () => observer.disconnect();
  }, [root]);
  return palette;
}

/** The canvas's size in CSS pixels, kept current. */
function useCanvasSize(canvas: RefObject<HTMLCanvasElement | null>): Viewport | null {
  const [size, setSize] = useState<Viewport | null>(null);
  useLayoutEffect(() => {
    const element = canvas.current;
    if (!element) return;
    const measure = (): void => {
      const box = element.getBoundingClientRect();
      setSize((current) => (current && current.width === box.width && current.height === box.height ? current : { width: box.width, height: box.height }));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [canvas]);
  return size;
}

interface RuntimeOptions {
  readonly palette: MapPalette | null;
  readonly density: Density;
  readonly highContrast: boolean;
  readonly events: RefObject<RuntimeEvents>;
}

/**
 * Load the region table and the up-front levels, then make the renderer once
 * the palette is readable. The renderer lives as long as the layer; lens,
 * selection and camera are pushed into it by the layer's effects.
 */
export function useMapRuntime(canvas: RefObject<HTMLCanvasElement | null>, options: RuntimeOptions): { runtime: MapRuntime | null; size: Viewport | null; error: string | null } {
  const [runtime, setRuntime] = useState<MapRuntime | null>(null);
  const [error, setError] = useState<string | null>(null);
  const size = useCanvasSize(canvas);
  const { palette, events } = options;
  const initial = useRef({ density: options.density, highContrast: options.highContrast });
  const ready = palette !== null;
  const paletteRef = useRef(palette);
  paletteRef.current = palette;
  useEffect(() => {
    const element = canvas.current;
    const colors = paletteRef.current;
    if (!element || !colors) return;
    let disposed = false;
    let made: MapRenderer | null = null;
    const bus = new ViewBus();
    void (async () => {
      const table = await loadRegionTable();
      await Promise.all(UP_FRONT.map(([layer, lod]) => loadShapes(table, layer, lod)));
      if (disposed) return;
      made = new MapRenderer(element, {
        table,
        colors: frameColors(colors),
        lens: { id: "neutral", name: "The map", level: "nation", fill: () => ({ kind: "none" }) },
        density: initial.current.density,
        highContrast: initial.current.highContrast,
        onHover: (region, x, y) => events.current?.hover(region, x, y),
        onSelect: (region) => events.current?.select(region),
        onEmpty: () => events.current?.empty(),
        onLanded: (target) => events.current?.landed(target),
        onView: () => bus.emit(),
      });
      setRuntime({ renderer: made, table, bus });
    })().catch((cause: unknown) => setError(cause instanceof Error ? cause.message : String(cause)));
    return () => {
      disposed = true;
      made?.destroy();
      setRuntime(null);
    };
  }, [canvas, events, ready]);
  useLayoutEffect(() => {
    if (runtime && size) runtime.renderer.resize(size.width, size.height, window.devicePixelRatio || 1);
  }, [runtime, size]);
  return { runtime, size, error };
}
