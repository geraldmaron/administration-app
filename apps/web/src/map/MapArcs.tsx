import { useEffect, useRef } from "react";
import { regionKey, type RegionTable } from "./data";
import type { MapArc } from "./directive";
import type { MapView } from "./view";
import type { ViewBus } from "./gl/gl-view";

export interface MapArcsProps {
  readonly renderer: MapView;
  readonly bus: ViewBus;
  readonly table: RegionTable;
  readonly arcs: readonly MapArc[];
}

/** How far a curve bows off the straight line, as a share of its length, and the most it bows in pixels: a tie across an ocean should not sweep the whole screen. */
const BOW = 0.18;
const MAX_BOW_PX = 120;

/** Three stroke weights, so a heavier tie reads before it is measured. */
function weightClass(weight: number): "1" | "2" | "3" {
  return weight >= 0.1 ? "3" : weight >= 0.03 ? "2" : "1";
}

export function arcPath(from: readonly [number, number], to: readonly [number, number]): string {
  const [x0, y0] = from;
  const [x1, y1] = to;
  const mx = (x0 + x1) / 2;
  const my = (y0 + y1) / 2;
  const dx = x1 - x0;
  const dy = y1 - y0;
  // Always bows upward on screen, so two arcs between the same pair do not overlap their labels.
  const sign = dx >= 0 ? -1 : 1;
  const length = Math.hypot(dx, dy) || 1;
  const bow = Math.min(BOW * length, MAX_BOW_PX);
  const cx = mx - sign * (dy / length) * bow;
  const cy = my + sign * (dx / length) * bow;
  return `M ${x0.toFixed(1)} ${y0.toFixed(1)} Q ${cx.toFixed(1)} ${cy.toFixed(1)} ${x1.toFixed(1)} ${y1.toFixed(1)}`;
}

/**
 * Lines between governments, projected from their centroids and drawn over the
 * dots. They follow the camera, in flight too, like the pins;
 * their meaning is always in the panel beside them, so they are decoration to
 * a screen reader.
 */
export function MapArcs({ renderer, bus, table, arcs }: MapArcsProps) {
  const svg = useRef<SVGSVGElement | null>(null);
  const paths = useRef(new Map<string, SVGPathElement>());
  useEffect(() => {
    const centroid = (id: string) => table.byKey.get(regionKey("world", id))?.centroid;
    const update = (): void => {
      if (svg.current) svg.current.dataset["moving"] = renderer.moving ? "true" : "false";
      for (const arc of arcs) {
        const path = paths.current.get(`${arc.from}>${arc.to}:${arc.kind}`);
        const a = centroid(arc.from);
        const b = centroid(arc.to);
        const start = a ? renderer.project(a[0], a[1]) : null;
        const end = b ? renderer.project(b[0], b[1]) : null;
        if (!path) continue;
        if (start && end) {
          path.setAttribute("d", arcPath(start, end));
          path.removeAttribute("hidden");
        } else path.setAttribute("hidden", "");
      }
    };
    update();
    return bus.subscribe(update);
  }, [renderer, bus, table, arcs]);
  return (
    <svg ref={svg} className="map-arcs" aria-hidden="true" focusable="false">
      {arcs.map((arc) => (
        <path
          key={`${arc.from}>${arc.to}:${arc.kind}`}
          ref={(element) => {
            const key = `${arc.from}>${arc.to}:${arc.kind}`;
            if (element) paths.current.set(key, element);
            else paths.current.delete(key);
          }}
          className={`map-arc map-arc--${arc.kind}`}
          data-weight={weightClass(arc.weight)}
          fill="none"
        />
      ))}
    </svg>
  );
}
