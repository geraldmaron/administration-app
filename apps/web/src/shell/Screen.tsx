import { useRouterState } from "@tanstack/react-router";
import { useCallback, useEffect, useLayoutEffect, useRef, type ReactNode, type RefObject } from "react";
import { IconBadge, WorkSurface, type Detent, type IconBadgeTone, type IconName, type SurfaceKind } from "@admin/ui-web";
import { useMapDirective, type MapArc, type MapMarkLayers, type MapPin } from "../map/directive";
import { useSheetSettled } from "./chrome-insets";
import { restoreArrival } from "./return-context";
import { WaitingHere } from "./WaitingHere";

/**
 * A screen's class, from DESIGN.md. It decides whether the map is shown:
 * - spatial: geography is the content; the map fills the canvas beside an inspector.
 * - workspace: no map; the work takes the whole canvas.
 */
export type ScreenClass = "spatial" | "workspace";

export type ScreenProps = {
  readonly title: string;
  /** The small line over the title: the mode, or what kind of screen this is. */
  readonly eyebrow?: string;
  readonly lede?: ReactNode;
  readonly screenClass: ScreenClass;
  /** The map's framing key, as the map contract names it: "world", "us", "dc". */
  readonly camera: string;
  readonly measure?: "standard" | "data";
  readonly selection?: string;
  readonly lens?: string;
  /** The title screen's slowly turning world. */
  readonly turning?: boolean;
  /** Which of the campaign's pins the map draws; absent, the map's default for the lens. */
  readonly marks?: MapMarkLayers;
  /** Pins the screen supplies itself: an agency under inquiry at its headquarters. */
  readonly pins?: readonly MapPin[];
  /** Lines the map draws between governments: the ties of a detached country. */
  readonly arcs?: readonly MapArc[];
  /** Where the phone sheet opens; the class decides when this is absent. */
  readonly detent?: Detent;
  readonly footer?: ReactNode;
  /** Drawn above the title on the screens that open the game: the mark. */
  readonly emblem?: ReactNode;
  /** The screen's mark beside its title. Left off where a flag or a face already says who this is. */
  readonly icon?: IconName;
  /** Gold for an institution, red for force and urgent risk. */
  readonly iconTone?: IconBadgeTone;
  readonly compactAttention?: boolean;
  readonly children: ReactNode;
};

let firstScreen = true;

/** Moves focus to the title when the player arrives from another screen, so a screen reader hears where they are. */
function useArrivalFocus(): RefObject<HTMLHeadingElement | null> {
  const heading = useRef<HTMLHeadingElement | null>(null);
  useLayoutEffect(() => {
    if (firstScreen) firstScreen = false;
    else if (!restoreArrival()) heading.current?.focus({ preventScroll: true });
  }, []);
  return heading;
}

/** One screen: its map directive, its title, and its work in the surface over the map. */
export function Screen({ title, eyebrow, lede, screenClass, measure = "standard", camera, selection, lens, turning, marks, pins, arcs, detent, footer, emblem, icon, iconTone = "blue", compactAttention, children }: ScreenProps) {
  const workspace = screenClass === "workspace";
  useMapDirective({ camera, ...(lens ? { lens } : {}), ...(selection ? { selection } : {}), ...(workspace ? { paused: true } : {}), ...(turning ? { turning } : {}), ...(marks ? { marks } : {}), ...(pins ? { pins } : {}), ...(arcs ? { arcs } : {}) });
  useEffect(() => {
    // The title screen is named for the game; suffixing it would read the name twice.
    document.title = title === "Office of the President" ? title : `${title} · Office of the President`;
  }, [title]);
  useEffect(() => {
    document.documentElement.setAttribute("data-screen", screenClass);
  }, [screenClass]);
  const heading = useArrivalFocus();
  // Pending navigation still renders the departing surface. Wait for the
  // resolved address before consuming the destination's return context.
  const address = useRouterState({ select: (router) => {
    const resolved = router.resolvedLocation ?? router.location;
    return resolved.pathname + JSON.stringify(resolved.search);
  } });
  useLayoutEffect(() => { restoreArrival(); }, [address]);
  const settled = useSheetSettled();
  const settle = useCallback(
    (resting: Detent) => {
      document.documentElement.setAttribute("data-sheet", resting);
      settled();
    },
    [settled],
  );
  const kind: SurfaceKind = workspace ? "workspace" : "panel";
  return (
    <WorkSurface
      label={title}
      kind={kind}
      measure={measure}
      initialDetent={detent ?? "full"}
      onSettle={settle}
      header={
        <header className="screen-head" data-hero={emblem ? "true" : undefined}>
          {emblem ? <div className="screen-head__emblem">{emblem}</div> : null}
          {eyebrow ? <p className="screen-head__eyebrow">{eyebrow}</p> : null}
          <div className="screen-head__title-row">
            {icon ? <IconBadge name={icon} tone={iconTone} size={48} className="screen-head__badge" /> : null}
            <h1 className="screen-head__title" ref={heading} tabIndex={-1}>
              {title}
            </h1>
          </div>
          {lede ? <p className="screen-head__lede">{lede}</p> : null}
        </header>
      }
      {...(footer ? { footer } : {})}
    >
      <WaitingHere compact={compactAttention} />
      {children}
    </WorkSurface>
  );
}
