import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { MapCardsProvider } from "./MapCards";

/** Which pins the map draws: running incidents, force clusters, both, the government's offices, or none. */
export type MapMarkLayers = "incidents" | "forces" | "both" | "offices" | "none";

/** A pin a screen supplies itself, such as an agency under inquiry at its headquarters. */
export interface MapPin {
  /** Stable across renders; the directive is compared by these ids. */
  readonly id: string;
  readonly label: string;
  readonly where: string;
  readonly lon: number;
  readonly lat: number;
  readonly weight: number;
  /** What the pin marks; a headquarters unless the screen says its own forces. */
  readonly kind?: "office" | "force";
  /** The screen the pin opens when chosen, where it has one. */
  readonly href?: string;
}

/**
 * A line the map draws between two governments' centroids: a country's trade
 * partners, an alliance, a rivalry. Arcs are context for a detached country;
 * every one has its twin in the panel's lists.
 */
export interface MapArc {
  /** A government's id; the arc starts at its centroid. */
  readonly from: string;
  readonly to: string;
  readonly kind: "trade" | "ally" | "rival";
  /** 0..1, drawn as one of three stroke weights. */
  readonly weight: number;
}

/**
 * What a screen asks of the map: where the camera frames, which lens colors
 * the dots, and what is selected. Screens declare it; only the map reads it,
 * so the shell never needs to know how the map draws.
 */
export interface MapDirective {
  /**
   * A stable key for the framing: `world`, `us`, `dc`, `state:CA`,
   * `district:NY-12`, `nation:FRA`, `zone:SEA-red-sea`, `office:INST-TREASURY`,
   * `point:<lon>,<lat>`, `set:<key>|<key>…`, or `keep` for no move.
   */
  readonly camera: string;
  /** The lens id, e.g. "approval", "lean", "relations"; absent or unknown means the neutral lens. */
  readonly lens?: string;
  /** The selected subject, which detaches from the rest, e.g. "state:CA"; a set joins refs with `|`. */
  readonly selection?: string;
  /** Workspace screens pause the map behind an opaque panel. */
  readonly paused?: boolean;
  /** Which pins to draw. Absent: force clusters under the forces lens, incidents otherwise. */
  readonly marks?: MapMarkLayers;
  /** The title screen's slowly turning world. Ignored under reduced motion. */
  readonly turning?: boolean;
  /** The screen's own pins, drawn beside the layers `marks` chooses. */
  readonly pins?: readonly MapPin[];
  /** Lines between governments, drawn over the dots and under the pins. */
  readonly arcs?: readonly MapArc[];
}

const DEFAULT_DIRECTIVE: MapDirective = { camera: "world" };

interface DirectiveStore {
  readonly directive: MapDirective;
  readonly setDirective: (next: MapDirective) => void;
}

const DirectiveContext = createContext<DirectiveStore>({
  directive: DEFAULT_DIRECTIVE,
  setDirective: () => undefined,
});

export function MapDirectiveProvider({ children }: { readonly children: ReactNode }) {
  const [directive, setDirective] = useState<MapDirective>(DEFAULT_DIRECTIVE);
  return (
    <DirectiveContext.Provider value={{ directive, setDirective }}>
      <MapCardsProvider>{children}</MapCardsProvider>
    </DirectiveContext.Provider>
  );
}

/** The map's side: read the current directive. */
export function useCurrentMapDirective(): MapDirective {
  return useContext(DirectiveContext).directive;
}

/** A screen's side: declare what the map should show while this screen is mounted. */
export function useMapDirective(directive: MapDirective): void {
  const { setDirective } = useContext(DirectiveContext);
  const { camera, lens, selection, paused, marks, turning, pins, arcs } = directive;
  // Pins are compared by their ids, so a screen that rebuilds the same pins on
  // a render does not send the map a new directive.
  const pinKey = pins?.map((pin) => pin.id).join("|");
  const latest = useRef(pins);
  latest.current = pins;
  const arcKey = arcs?.map((arc) => `${arc.from}>${arc.to}:${arc.kind}:${arc.weight}`).join("|");
  const latestArcs = useRef(arcs);
  latestArcs.current = arcs;
  useEffect(() => {
    setDirective({ camera, lens, selection, paused, marks, turning, ...(latest.current ? { pins: latest.current } : {}), ...(latestArcs.current ? { arcs: latestArcs.current } : {}) });
  }, [setDirective, camera, lens, selection, paused, marks, turning, pinKey, arcKey]);
}
