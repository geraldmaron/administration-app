import { createContext, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import type { Rect, Viewport } from "./camera";
import { resolveCameraKey } from "./camera-keys";
import { placeCards, type CardRequest } from "./cards/placement";
import { regionKey, type LayerName, type RegionTable } from "./data";
import { boundsCenter } from "./projection";
import type { MapView } from "./view";
import type { ViewBus } from "./gl/gl-view";

/** Where a card points: a camera key (`state:CA`, `nation:JPN`, `point:<lon>,<lat>`, `office:…`) or a lon/lat. */
export type CardAnchor = string | readonly [number, number];

interface Entry {
  readonly anchor: CardAnchor;
  readonly priority: number;
  readonly element: HTMLElement;
}

/** The cards screens have put on the map. Screens own the content; the map owns where it sits. */
class CardRegistry {
  readonly entries = new Map<string, Entry>();
  private readonly listeners = new Set<() => void>();
  set(key: string, entry: Entry): void {
    this.entries.set(key, entry);
    this.emit();
  }
  delete(key: string): void {
    if (this.entries.delete(key)) this.emit();
  }
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  private emit(): void {
    for (const listener of this.listeners) listener();
  }
}

interface CardsStore {
  readonly registry: CardRegistry;
  readonly host: HTMLElement | null;
  readonly setHost: (host: HTMLElement | null) => void;
}

const CardsContext = createContext<CardsStore | null>(null);

export function MapCardsProvider({ children }: { readonly children: ReactNode }) {
  const registry = useMemo(() => new CardRegistry(), []);
  const [host, setHost] = useState<HTMLElement | null>(null);
  const store = useMemo(() => ({ registry, host, setHost }), [registry, host]);
  return <CardsContext.Provider value={store}>{children}</CardsContext.Provider>;
}

export interface MapCardProps {
  /** Stable for the card's life; two cards never share one. */
  readonly id: string;
  readonly anchor: CardAnchor;
  /** Lower places first and survives a crowded map. */
  readonly priority?: number;
  /** What the card is about, for assistive technology. */
  readonly label: string;
  readonly tone?: "neutral" | "urgent" | "gold";
  /** The card is one door: its link carries `ui-card-door__link` and a press anywhere on the card follows it. */
  readonly door?: boolean;
  readonly children: ReactNode;
}

/**
 * A surface laid on the map at a place: the work beside where it happens.
 * It is opaque, so text never sits on the map, and every card repeats
 * something the panel also holds, so a card the map has no room for loses
 * nothing.
 */
export function MapCard({ id, anchor, priority = 0, label, tone = "neutral", door = false, children }: MapCardProps) {
  const store = useContext(CardsContext);
  const element = useRef<HTMLElement | null>(null);
  const anchorKey = typeof anchor === "string" ? anchor : anchor.join(",");
  useLayoutEffect(() => {
    if (!store?.host || !element.current) return;
    store.registry.set(id, { anchor, priority, element: element.current });
    return () => store.registry.delete(id);
    // The anchor is compared by its key, so a rebuilt tuple does not re-register.
  }, [store, id, anchorKey, priority]);
  if (!store?.host) return null;
  return createPortal(
    <section ref={element} className={door ? "map-card ui-card-door" : "map-card"} data-tone={tone} data-placed="false" aria-label={label}>
      {children}
    </section>,
    store.host,
  );
}

const LAYER_OF: Readonly<Record<string, LayerName>> = { state: "states", district: "districts", nation: "world" };

/** A card's anchor as lon/lat: a region's centroid where the key names one, else the camera key's focus. */
export function anchorLonLat(anchor: CardAnchor, table: RegionTable): readonly [number, number] | null {
  if (typeof anchor !== "string") return anchor;
  const colon = anchor.indexOf(":");
  const layer = LAYER_OF[anchor.slice(0, colon)];
  const region = layer ? table.byKey.get(regionKey(layer, anchor.slice(colon + 1))) : undefined;
  if (region) return region.centroid;
  const target = resolveCameraKey(anchor, table);
  return target ? (target.focus ?? boundsCenter(target.bounds)) : null;
}

export interface MapCardLayerProps {
  readonly renderer: MapView;
  readonly bus: ViewBus;
  readonly table: RegionTable;
  readonly area: Rect;
  readonly viewport: Viewport;
  /** A phone: cards line up in a rail along the bottom of the visible map instead of pointing at their places. */
  readonly rail: boolean;
  readonly paused: boolean;
}

function requestsFor(registry: CardRegistry, renderer: MapView, table: RegionTable): CardRequest[] {
  return [...registry.entries].flatMap(([key, entry]) => {
    const lonLat = anchorLonLat(entry.anchor, table);
    const point = lonLat ? renderer.project(lonLat[0], lonLat[1]) : null;
    if (!point) return [{ key, ax: Number.NaN, ay: Number.NaN, width: 0, height: 0, priority: entry.priority }];
    return [{ key, ax: point[0], ay: point[1], width: entry.element.offsetWidth, height: entry.element.offsetHeight, priority: entry.priority }];
  });
}

function leaderPath(ax: number, ay: number, joint: readonly [number, number]): string {
  return `M ${ax.toFixed(1)} ${ay.toFixed(1)} L ${joint[0].toFixed(1)} ${joint[1].toFixed(1)}`;
}

/** Re-place every card on each camera frame and each card change, writing positions straight to the DOM. */
function useCardPositions(props: MapCardLayerProps, store: CardsStore | null, leaders: React.RefObject<SVGSVGElement | null>): void {
  const { renderer, bus, table, area, rail } = props;
  useEffect(() => {
    if (!store) return;
    const { registry } = store;
    const update = (): void => {
      const svg = leaders.current;
      if (rail) {
        for (const entry of registry.entries.values()) {
          entry.element.style.transform = "";
          entry.element.dataset["placed"] = "true";
        }
        svg?.replaceChildren();
        return;
      }
      const requests = requestsFor(registry, renderer, table);
      const placements = placeCards(requests, area);
      const paths: SVGElement[] = [];
      placements.forEach((placement, i) => {
        const entry = registry.entries.get(placement.key);
        const request = requests[i];
        if (!entry || !request) return;
        entry.element.dataset["placed"] = placement.at ? "true" : "false";
        if (!placement.at || !placement.joint) return;
        entry.element.style.transform = `translate(${Math.round(placement.at[0])}px, ${Math.round(placement.at[1])}px)`;
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("d", leaderPath(request.ax, request.ay, placement.joint));
        path.setAttribute("class", "map-card__leader");
        const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        dot.setAttribute("cx", request.ax.toFixed(1));
        dot.setAttribute("cy", request.ay.toFixed(1));
        dot.setAttribute("r", "3");
        dot.setAttribute("class", "map-card__anchor");
        paths.push(path, dot);
      });
      svg?.replaceChildren(...paths);
    };
    update();
    const offBus = bus.subscribe(update);
    const offCards = registry.subscribe(update);
    return () => {
      offBus();
      offCards();
    };
  }, [store, renderer, bus, table, area, rail, leaders]);
}

/** The map's side: the element cards are portaled into, and the leader lines from each card to its place. */
export function MapCardLayer(props: MapCardLayerProps) {
  const store = useContext(CardsContext);
  const leaders = useRef<SVGSVGElement | null>(null);
  const setHost = store?.setHost;
  useCardPositions(props, store, leaders);
  const railStyle = props.rail ? { insetBlockEnd: `${Math.max(0, props.viewport.height - props.area.y1) + 8}px` } : undefined;
  return (
    <>
      <svg ref={leaders} className="map-cards__leaders" aria-hidden="true" focusable="false" data-hidden={props.paused || props.rail ? "true" : undefined} />
      <div ref={setHost ?? undefined} className="map-cards" data-rail={props.rail ? "true" : undefined} data-hidden={props.paused ? "true" : undefined} style={railStyle} />
    </>
  );
}
