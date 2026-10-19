import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type RefObject } from "react";
import { capMarks, clusterMarks, clusterName, rovingStep, type MarkCluster, type PlacedMark } from "./marks/cluster";
import type { MarkPoint } from "./marks/sources";
import type { MapView } from "./view";
import type { ViewBus } from "./gl/gl-view";

export interface MapMarksProps {
  readonly renderer: MapView;
  readonly bus: ViewBus;
  readonly marks: readonly MarkPoint[];
  readonly onChoose: (cluster: MarkCluster) => void;
  readonly onMore: () => void;
  /** Every cluster in view, shown or held back, for the list's twin of each mark. */
  readonly onClusters: (clusters: readonly MarkCluster[]) => void;
  /** The directive's camera key; the mark with that id is the one the screen is about, and is ringed. */
  readonly focus?: string;
}

const STAFFING_ORDER = ["confirmed", "acting", "vacant"] as const;

/**
 * What a pin's look says about its members: the worst-held chair among them,
 * whether anything waits on the President from any of them, and whether the
 * screen is about one of them.
 */
function markState(cluster: MarkCluster, focus: string | undefined): Record<string, string | undefined> {
  const worst = cluster.members.reduce<number>((at, mark) => Math.max(at, mark.staffing ? STAFFING_ORDER.indexOf(mark.staffing) : -1), -1);
  return {
    "data-staffing": worst >= 0 ? STAFFING_ORDER[worst] : undefined,
    "data-alert": cluster.members.some((mark) => mark.alert) ? "true" : undefined,
    "data-focus": focus !== undefined && cluster.members.some((mark) => mark.id === focus) ? "true" : undefined,
  };
}

interface Layout {
  readonly shown: readonly MarkCluster[];
  readonly hidden: number;
  readonly signature: string;
}

const EMPTY: Layout = { shown: [], hidden: 0, signature: "" };
/** Places, unlike events, are named on the map: a capitol or a metro is read by its name, not found by its pulse. */
const PLACE_KINDS: ReadonlySet<string> = new Set(["capitol", "metro"]);
const MORE = "__more";

function placeAll(renderer: MapView, marks: readonly MarkPoint[]): readonly PlacedMark[] {
  const { width, height } = renderer.viewportSize;
  return marks.flatMap((mark) => {
    const point = renderer.project(mark.lon, mark.lat);
    if (!point || point[0] < 0 || point[1] < 0 || point[0] > width || point[1] > height) return [];
    return [{ mark, x: point[0], y: point[1] }];
  });
}

function signatureOf(clusters: readonly MarkCluster[]): string {
  return clusters.map((c) => `${c.key}:${c.members.length}`).join("|");
}

/**
 * Re-cluster on every camera event, but re-render only when the clusters
 * change: a pan moves the existing buttons by their style alone.
 */
function useMarkLayout(props: MapMarksProps, group: RefObject<HTMLDivElement | null>, buttons: RefObject<Map<string, HTMLButtonElement>>): Layout {
  const { renderer, bus, marks } = props;
  const [layout, setLayout] = useState<Layout>(EMPTY);
  const onClusters = useRef(props.onClusters);
  onClusters.current = props.onClusters;
  const place = useRef<() => void>(() => undefined);
  // A re-render for new clusters can land frames after the camera has moved on; every commit re-places the pins from the camera as it is now.
  useLayoutEffect(() => place.current());
  useEffect(() => {
    let last = "";
    const update = (): void => {
      if (group.current) group.current.dataset["moving"] = renderer.moving ? "true" : "false";
      const clusters = clusterMarks(placeAll(renderer, marks));
      const { shown, hidden } = capMarks(clusters);
      const signature = signatureOf(clusters);
      if (signature !== last) {
        last = signature;
        setLayout({ shown, hidden: hidden.length, signature });
        onClusters.current(clusters);
      }
      for (const cluster of shown) {
        const button = buttons.current.get(cluster.key);
        if (button) button.style.transform = `translate(${cluster.x}px, ${cluster.y}px)`;
      }
    };
    place.current = update;
    update();
    return bus.subscribe(update);
  }, [renderer, bus, marks, group, buttons]);
  return layout;
}

/**
 * The marks layer: real buttons over the canvas, projected from lon/lat,
 * clustered by screen distance and capped near 25 with an "N more" button.
 * One tab stop: arrow keys rove the group, "N more" included.
 */
export function MapMarks(props: MapMarksProps) {
  const group = useRef<HTMLDivElement | null>(null);
  const buttons = useRef(new Map<string, HTMLButtonElement>());
  const layout = useMarkLayout(props, group, buttons);
  const [cursor, setCursor] = useState(0);
  const keys = [...layout.shown.map((c) => c.key), ...(layout.hidden > 0 ? [MORE] : [])];
  const active = Math.min(cursor, Math.max(0, keys.length - 1));
  const register = (key: string) => (element: HTMLButtonElement | null) => {
    if (element) buttons.current.set(key, element);
    else buttons.current.delete(key);
  };
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    const next = rovingStep(active, event.key, keys.length);
    if (next === null) return;
    event.preventDefault();
    setCursor(next);
    buttons.current.get(keys[next] ?? "")?.focus();
  };
  if (keys.length === 0) return <div ref={group} className="map-marks" hidden />;
  return (
    <div ref={group} className="map-marks" role="group" aria-label="Map pins" onKeyDown={onKeyDown}>
      {layout.shown.map((cluster, index) => (
        <button
          key={cluster.key}
          ref={register(cluster.key)}
          type="button"
          className={`map-mark map-mark--${cluster.kind}`}
          {...markState(cluster, props.focus)}
          tabIndex={index === active ? 0 : -1}
          aria-label={clusterName(cluster)}
          onFocus={() => setCursor(index)}
          onClick={() => props.onChoose(cluster)}
        >
          {cluster.members.length > 1 ? <span className="map-mark__count" aria-hidden="true">{cluster.members.length}</span> : null}
          {cluster.members.length === 1 && PLACE_KINDS.has(cluster.kind) ? (
            <span className="map-mark__label" aria-hidden="true">
              {cluster.kind === "capitol" ? cluster.members[0]!.where : cluster.members[0]!.label.replace(/ metro$/, "")}
            </span>
          ) : null}
        </button>
      ))}
      {layout.hidden > 0 ? (
        <button type="button" ref={register(MORE)} className="map-marks__more" tabIndex={active === keys.length - 1 ? 0 : -1} onFocus={() => setCursor(keys.length - 1)} onClick={props.onMore}>
          {layout.hidden} more
        </button>
      ) : null}
    </div>
  );
}
