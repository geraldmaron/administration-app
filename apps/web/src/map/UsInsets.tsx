import { useEffect, useRef, useState } from "react";
import type { Rect } from "./camera";
import { ALASKA, HAWAII } from "./camera-keys";
import type { RegionTable } from "./data";
import type { FrameColors } from "./frame-draw";
import { insetLayout } from "./insets";
import type { Lens } from "./paint";
import type { Density } from "./pitch";
import { MapRenderer } from "./renderer";
import type { CameraTarget } from "./target";

interface InsetProps {
  readonly table: RegionTable;
  readonly target: CameraTarget;
  readonly rect: Rect;
  readonly lens: Lens;
  readonly colors: FrameColors;
  readonly density: Density;
  readonly highContrast: boolean;
  readonly onChoose: () => void;
}

/** One inset: a small fixed view of the real place, drawn by its own renderer, that flies there when chosen. */
function Inset({ table, target, rect, lens, colors, density, highContrast, onChoose }: InsetProps) {
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const [renderer, setRenderer] = useState<MapRenderer | null>(null);
  const width = rect.x1 - rect.x0;
  const height = rect.y1 - rect.y0;
  useEffect(() => {
    const element = canvas.current;
    if (!element) return;
    const made = new MapRenderer(element, { table, colors, lens, density, highContrast, interactive: false, prefetch: false, sliced: true });
    setRenderer(made);
    return () => made.destroy();
    // Made once per table: lens and style changes are pushed into it below rather than rebuilding it.
  }, [table]);
  useEffect(() => {
    if (!renderer) return;
    renderer.resize(width, height, window.devicePixelRatio || 1);
    if (!renderer.target) void renderer.jumpTo(target);
  }, [renderer, width, height, target]);
  useEffect(() => {
    renderer?.setLens(lens, 0);
  }, [renderer, lens]);
  useEffect(() => {
    renderer?.setStyle(colors, highContrast);
  }, [renderer, colors, highContrast]);
  return (
    <button type="button" className="map-inset" style={{ left: rect.x0, top: rect.y0, width, height }} onClick={onChoose} aria-label={`${target.label}: go to the real place`}>
      <canvas ref={canvas} className="map-inset__canvas" aria-hidden="true" />
      <span className="map-inset__label" aria-hidden="true">
        {target.label}
      </span>
    </button>
  );
}

export interface UsInsetsProps {
  readonly table: RegionTable;
  readonly area: Rect;
  readonly lens: Lens;
  readonly colors: FrameColors;
  readonly density: Density;
  readonly highContrast: boolean;
  readonly onChoose: (ref: "state:AK" | "state:HI") => void;
}

/** Alaska and Hawaii beside the contiguous states on the US home view. */
export function UsInsets({ area, onChoose, ...shared }: UsInsetsProps) {
  const layout = insetLayout(area);
  return (
    <div className="map-insets">
      <Inset {...shared} target={ALASKA} rect={layout.alaska} onChoose={() => onChoose("state:AK")} />
      <Inset {...shared} target={HAWAII} rect={layout.hawaii} onChoose={() => onChoose("state:HI")} />
    </div>
  );
}
