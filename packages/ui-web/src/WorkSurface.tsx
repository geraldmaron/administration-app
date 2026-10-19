import { createContext, useCallback, useContext, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { Icon } from "./Icon";

/** The phone sheet's resting heights. From a tablet up the surface is a side panel and has no detents. */
export type Detent = "peek" | "half" | "full";

/**
 * The work's relationship to the map, independent of its width. All surfaces
 * share a standard width; the player can explicitly expand any desktop file.
 */
export type SurfaceKind = "panel" | "workspace";

/** Internal composition boundary: modal work must not dock into an inert parent surface. */
export const SurfaceFootContext = createContext<HTMLElement | null>(null);

/**
 * The surface's foot, below its scrolling body: where a verb docks so it stays
 * in the thumb's reach and never covers what scrolls above it. Null outside a
 * surface, where a part keeps its verb in place.
 */
export function useSurfaceFoot(): HTMLElement | null {
  return useContext(SurfaceFootContext);
}

export type WorkSurfaceProps = {
  readonly label: string;
  readonly kind?: SurfaceKind;
  /** Wider analytical collections; narrative retains the standard reading measure. */
  readonly measure?: "standard" | "data";
  /** Where the phone sheet opens. A workspace opens at full. */
  readonly initialDetent?: Detent;
  /** The title row; on a phone it is also where the sheet is dragged from. */
  readonly header: ReactNode;
  /** The screen's verb, kept in reach at the bottom of the surface. */
  readonly footer?: ReactNode;
  /** Told when the sheet comes to rest, so the map can frame inside what is left. */
  readonly onSettle?: (detent: Detent) => void;
  readonly children: ReactNode;
};

const ORDER: readonly Detent[] = ["peek", "half", "full"];
const SPOKEN: Readonly<Record<Detent, string>> = { peek: "lowered", half: "half open", full: "fully open" };

function nextDetent(detent: Detent): Detent {
  return ORDER[(ORDER.indexOf(detent) + 1) % ORDER.length]!;
}

/** The detent whose height is nearest where the drag let go. */
function nearestDetent(height: number, sheet: HTMLElement): Detent {
  const style = getComputedStyle(sheet);
  const peek = Number.parseFloat(style.getPropertyValue("--detent-peek")) || 168;
  const half = Number.parseFloat(style.getPropertyValue("--detent-half")) || 334;
  const full = sheet.parentElement?.getBoundingClientRect().height ?? half * 2;
  const candidates: readonly (readonly [Detent, number])[] = [["peek", peek], ["half", half], ["full", full]];
  return [...candidates].sort((a, b) => Math.abs(a[1] - height) - Math.abs(b[1] - height))[0]![0];
}

function useSheetDrag(setDetent: (detent: Detent) => void) {
  const sheet = useRef<HTMLElement | null>(null);
  const start = useRef<{ readonly y: number; readonly height: number } | null>(null);
  const [dragHeight, setDragHeight] = useState<number | null>(null);
  const onPointerDown = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    if (!sheet.current || (event.target as HTMLElement).closest("button:not([data-handle]), a, input, select, textarea")) return;
    start.current = { y: event.clientY, height: sheet.current.getBoundingClientRect().height };
  }, []);
  // The pointer is captured only once it has moved: captured from the press, a
  // tap's click would land on the header rather than the handle button.
  const onPointerMove = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    if (!start.current) return;
    const moved = start.current.y - event.clientY;
    if (Math.abs(moved) <= 4) return;
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.setPointerCapture(event.pointerId);
    setDragHeight(Math.max(64, start.current.height + moved));
  }, []);
  const onPointerUp = useCallback(() => {
    if (start.current && sheet.current && dragHeight !== null) setDetent(nearestDetent(dragHeight, sheet.current));
    start.current = null;
    setDragHeight(null);
  }, [dragHeight, setDetent]);
  return { sheet, dragHeight, handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp } };
}

/**
 * The opaque surface the work happens in, so text never sits on dots. On a
 * phone it is a bottom sheet with three detents, dragged from its handle and
 * header, with its content scrolling inside; from a tablet up it is a panel
 * docked beside the map, or a workspace that takes the room.
 */
export function WorkSurface({ label, kind = "panel", measure = "standard", initialDetent, header, footer, onSettle, children }: WorkSurfaceProps) {
  const [detent, setDetent] = useState<Detent>(initialDetent ?? (kind === "workspace" ? "full" : "half"));
  const [expanded, setExpanded] = useState(false);
  const { sheet, dragHeight, handlers } = useSheetDrag(setDetent);
  const [foot, setFoot] = useState<HTMLElement | null>(null);
  // A change of kind moves the surface's edge as surely as a detent does, so the map is told again.
  useEffect(() => onSettle?.(detent), [detent, onSettle, kind, expanded]);
  const next = nextDetent(detent);
  return (
    <section
      ref={sheet}
      className={`ui-surface ui-surface--${kind}`}
      data-measure={measure}
      data-detent={detent}
      data-expanded={expanded || undefined}
      data-dragging={dragHeight !== null ? "true" : undefined}
      style={dragHeight !== null ? { blockSize: `${dragHeight}px` } : undefined}
      aria-label={label}
    >
      <div className="ui-surface__head" {...handlers}>
        <button
          type="button"
          data-handle
          className="ui-surface__handle"
          aria-label={`${label}: ${SPOKEN[detent]}. ${next === "peek" ? "Lower" : "Raise"} the panel.`}
          onClick={() => setDetent(next)}
        >
          <span className="ui-surface__grip" aria-hidden="true" />
        </button>
        {kind === "panel" ? (
          <div className="ui-surface__views" role="group" aria-label="Show">
            <button type="button" className="ui-surface__view" aria-pressed={detent !== "peek"} onClick={() => setDetent("full")}>
              <Icon name="dossier" size={18} />
              Details
            </button>
            <button type="button" className="ui-surface__view" aria-pressed={detent === "peek"} onClick={() => setDetent("peek")}>
              <Icon name="world" size={18} />
              Map
            </button>
          </div>
        ) : null}
        {header}
        <button type="button" className="ui-surface__expand" aria-label={expanded ? "Restore standard panel" : "Expand panel"} aria-pressed={expanded} title={expanded ? "Restore standard panel" : "Expand panel"} onClick={() => setExpanded((current) => !current)}>
          <Icon name={expanded ? "restorePanel" : "expandPanel"} size={18} />
        </button>
      </div>
      <SurfaceFootContext.Provider value={foot}>
        <div className="ui-surface__body">{children}</div>
      </SurfaceFootContext.Provider>
      <div className="ui-surface__foot" ref={setFoot}>
        {footer}
      </div>
    </section>
  );
}
