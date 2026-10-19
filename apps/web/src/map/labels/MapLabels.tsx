import { useEffect, useRef } from "react";
import type { Rect } from "../camera";
import type { RegionTable } from "../data";
import type { MarkPoint } from "../marks/sources";
import type { HintOf } from "./candidates";
import type { MapView } from "../view";
import type { ViewBus } from "../gl/gl-view";
import { labelCandidates, pinBoxes } from "./candidates";
import { placeLabels, textWidth, type PlacedLabel } from "./place-labels";

export interface MapLabelsProps {
  readonly renderer: MapView;
  readonly bus: ViewBus;
  readonly table: RegionTable;
  /** The pins in view, whose boxes no name may cover. */
  readonly marks: readonly MarkPoint[];
  /** The map the shell leaves uncovered, in viewport pixels. */
  readonly area: Rect;
  /** Each region's figure and salience under the lens: the figure is written beside the name where it fits, the salience ranks it for room. */
  readonly hintOf?: HintOf;
}

/** Under a tablet's width every name competes with the pins, the cards and the sheet, so the map writes far fewer. */
const PHONE_BELOW_PX = 768;
const PHONE_MAX = 16;
const DESKTOP_MAX = 48;

function syncLabel(element: HTMLSpanElement, label: PlacedLabel): void {
  if (element.textContent !== label.text) element.textContent = label.text;
  element.dataset["tier"] = label.tier;
  element.dataset["dim"] = label.dim ? "true" : "false";
  element.dataset["callout"] = label.leader ? "true" : "false";
  element.style.transform = `translate(${label.x.toFixed(1)}px, ${label.y.toFixed(1)}px) translate(-50%, -50%)`;
}

function leaderPath(placed: readonly PlacedLabel[]): string {
  return placed
    .flatMap((label) => (label.leader ? [`M${label.leader.x.toFixed(1)} ${label.leader.y.toFixed(1)}L${(label.x - textWidth(label.text, label.tier) / 2 - 2).toFixed(1)} ${label.y.toFixed(1)}`] : []))
    .join("");
}

/**
 * Locale names over the map: each written at its interior anchor in the
 * longest form its shape has room for, shortened or moved onto a leader line
 * where it does not, and left out where it would touch another name or a pin.
 * Decorative to assistive technology: every name is in the panel, the list and
 * the tooltip, so the map does not read them a second time.
 */
export function MapLabels({ renderer, bus, table, marks, area, hintOf }: MapLabelsProps) {
  const layer = useRef<HTMLDivElement | null>(null);
  const leaders = useRef<SVGPathElement | null>(null);
  const pool = useRef(new Map<string, HTMLSpanElement>());
  useEffect(() => {
    const update = (): void => {
      const root = layer.current;
      if (!root) return;
      root.dataset["moving"] = renderer.moving ? "true" : "false";
      if (renderer.moving) return;
      const { width } = renderer.viewportSize;
      const placed = placeLabels(labelCandidates(renderer, table, hintOf), { viewport: area, max: width < PHONE_BELOW_PX ? PHONE_MAX : DESKTOP_MAX, reserved: pinBoxes(renderer, marks) });
      const live = new Set<string>();
      for (const label of placed) {
        live.add(label.key);
        let element = pool.current.get(label.key);
        if (!element) {
          element = document.createElement("span");
          element.className = "map-label";
          root.appendChild(element);
          pool.current.set(label.key, element);
        }
        syncLabel(element, label);
      }
      for (const [key, element] of pool.current) {
        if (live.has(key)) continue;
        element.remove();
        pool.current.delete(key);
      }
      leaders.current?.setAttribute("d", leaderPath(placed));
    };
    update();
    return bus.subscribe(update);
  }, [renderer, bus, table, marks, area, hintOf]);
  return (
    <div ref={layer} className="map-labels" aria-hidden="true">
      <svg className="map-labels__leaders">
        <path ref={leaders} />
      </svg>
    </div>
  );
}
