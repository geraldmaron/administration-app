import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from "react";
import { useNavigate, useRouter } from "@tanstack/react-router";
import { Choice } from "@admin/ui-web";
import { useCampaignState, usePreferences } from "../app/hooks";
import { mapDestination } from "../shell/map-routes";
import { lensRows, readRegion, regionName, regionOfRef, refOf, type MapLens } from "./lenses/contract";
import type { Region, RegionTable } from "./data";
import { MapLabels } from "./labels/MapLabels";
import { rankSalience } from "./label-salience";
import type { LensLevel } from "./levels";
import { MapDataList } from "./MapDataList";
import { MapTooltip, type TooltipHandle } from "./MapTooltip";
import { useMediaQuery } from "./settings";
import { mapSettingsOf } from "../app/display";
import { UsInsets } from "./UsInsets";
import { frameColors, usePalette } from "./use-map-runtime";
import { useLenses, useMarks, useVisibleArea } from "./use-map-layer";
import { MapMarks } from "./MapMarks";
import type { MarkCluster } from "./marks/cluster";
import type { MapMarkLayers, MapPin } from "./directive";
import { useGlControls, useGlRuntime, type GlEvents, type GlRuntime } from "./gl/use-gl-runtime";
import { useGlCameraSync, useGlLensSync, useGlSelectionSync } from "./gl/use-gl-sync";
import "./map.css";
import "./gl/gl-map.css";
import "./map-view.css";

export type MapViewLens = { readonly id: string; readonly label: string };

export type MapViewProps = {
  /** The heading the map is read under, also its accessible name. */
  readonly title: string;
  /** The lens painted, by registry id; the same ids the screen-wide map took. */
  readonly lens: string;
  /** Other lenses the reader may switch to, the current one among them. */
  readonly lenses?: readonly MapViewLens[];
  readonly onLens?: (id: string) => void;
  /** The camera key: "us", "world", "state:CA", "nation:FRA". */
  readonly camera: string;
  readonly selection?: string;
  /** A line under the title: what the colors mean in this screen's words. */
  readonly note?: ReactNode;
  /** The drawn height at desktop; a phone takes a shorter fixed share of it. */
  readonly height?: number;
  /**
   * A region chosen on the map or in its list, as a ref (`state:OH`). Given,
   * the screen keeps the choice (a circuit, a delegation, a draft's home
   * state); absent, the region opens its own screen.
   */
  readonly onChoose?: (ref: string) => void;
  /** The campaign's own pins to draw (incidents, forces, offices), as the screen-wide map took them; none by default. */
  readonly marks?: MapMarkLayers;
  /** Pins the screen supplies itself: a case at its filing court, a force at its base. Each opens its `href`. */
  readonly pins?: readonly MapPin[];
  /** Pins placed at a region's center by its ref (`state:OH`), for subjects that know their place but not its coordinates. */
  readonly regionPins?: readonly RegionPin[];
};

export type RegionPin = Omit<MapPin, "lon" | "lat"> & { readonly region: string };

/** Region pins on the map's own centers, so a pin and the shape it names can never disagree about where a place is. */
function placeRegionPins(table: RegionTable | null, pins: readonly RegionPin[] | undefined): readonly MapPin[] {
  if (!table || !pins) return [];
  return pins.flatMap(({ region, ...pin }) => {
    const found = regionOfRef(table, region);
    return found ? [{ ...pin, lon: found.centroid[0], lat: found.centroid[1] }] : [];
  });
}

const NO_EVENTS: GlEvents = { hover: () => undefined, select: () => undefined, empty: () => undefined };

/** A region chosen goes to its own screen when there is one; the map stays where it is otherwise. */
function useRegionDoor(): (ref: string) => void {
  const router = useRouter();
  const navigate = useNavigate();
  const routes = useMemo(() => new Set(Object.keys(router.routesByPath)), [router]);
  return useCallback(
    (ref: string) => {
      const href = mapDestination(ref, routes);
      if (href) void navigate({ href });
    },
    [routes, navigate],
  );
}

function Legend({ lens }: { readonly lens: MapLens | null }) {
  if (!lens || lens.legend.length === 0) return null;
  return (
    <ul className="map-view__legend" aria-label={`${lens.name}: key`}>
      {lens.legend.map((entry) => (
        <li key={entry.label}>
          <span className="map-view__swatch" style={{ background: entry.color }} aria-hidden="true" />
          {entry.label}
        </li>
      ))}
    </ul>
  );
}

function LensSwitch({ lenses, current, onLens }: { readonly lenses: readonly MapViewLens[]; readonly current: string; readonly onLens: (id: string) => void }) {
  return <Choice legend="Color the map by" layout="segments" className="map-view__lenses" options={lenses.map((lens) => ({ value: lens.id, label: lens.label }))} value={current} onChange={onLens} />;
}

/** A single pin opens its own screen; a cluster of several zooms in until they come apart. */
function usePinChoice(runtime: GlRuntime | null): (cluster: MarkCluster) => void {
  const navigate = useNavigate();
  return useCallback(
    (cluster: MarkCluster) => {
      const single = cluster.members.length === 1 ? cluster.members[0] : undefined;
      if (single?.href) {
        void navigate({ href: single.href });
        return;
      }
      if (!runtime || cluster.members.length === 0) return;
      const lon = cluster.members.reduce((sum, mark) => sum + mark.lon, 0) / cluster.members.length;
      const lat = cluster.members.reduce((sum, mark) => sum + mark.lat, 0) / cluster.members.length;
      runtime.world.map.flyTo({ center: [lon, lat], zoom: runtime.world.map.getZoom() + 2 });
    },
    [runtime, navigate],
  );
}

/** The engine set up for a page: the shared runtime, lens and camera hooks, then the page-only choices (flat, no graticule, no wheel). */
function usePageMap(props: Pick<MapViewProps, "lens" | "camera" | "selection" | "marks" | "pins">, root: RefObject<HTMLDivElement | null>, surface: RefObject<HTMLDivElement | null>, events: RefObject<GlEvents>) {
  const state = useCampaignState();
  const campaign = state.status === "ready" ? state.campaign : null;
  const { preferences } = usePreferences();
  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const deviceContrast = useMediaQuery("(prefers-contrast: more)");
  const settings = mapSettingsOf(preferences, { firstSession: false, reducedMotion });
  const highContrast = deviceContrast || settings.highContrast;
  const palette = usePalette(root, settings.palette, highContrast);
  const { runtime, size, error } = useGlRuntime(surface, palette, events);
  const { mapLens, rendererLens } = useLenses(props.lens, campaign, palette, runtime?.table ?? null);
  const colors = useMemo(() => (palette ? frameColors(palette) : null), [palette]);
  const area = useVisibleArea(size, undefined);
  useGlLensSync(runtime, mapLens);
  useGlSelectionSync(runtime, props.selection);
  // Set in a page, the map is read as a table of places: flat, so the whole world is in view at once rather than half of it behind a globe.
  // The graticule reads as a sphere's lines on the globe and as clutter over the data on a flat map; a phone must zoom out past the screen-wide map's floor to fit the world.
  // The page scrolls under the wheel; the buttons zoom.
  useEffect(() => {
    if (!runtime) return;
    const { map } = runtime.world;
    map.setProjection({ type: "mercator" });
    map.setMinZoom(-2);
    map.scrollZoom.disable();
    if (map.getLayer("graticule")) map.setLayoutProperty("graticule", "visibility", "none");
  }, [runtime]);
  const [zoomLevel, setZoomLevel] = useState(0);
  const { target, reframe } = useGlCameraSync(runtime, props.camera, area, settings, reducedMotion, () => setZoomLevel(runtime?.view.zoomLevel ?? 0));
  useGlControls(runtime, reframe);
  // With no event layers asked for, "none" still keeps a detached state's or
  // government's own places: its capital and cities are geography, not events.
  const marks = useMarks(campaign, props.marks ?? "none", props.lens, zoomLevel, props.selection, props.pins);
  return { runtime, error, mapLens, rendererLens, colors, area, target, settings, highContrast, marks };
}

/**
 * The one map of the game, drawn inside the page: the same engine, lenses and
 * palette as every other map, framed with its key, read as a ranked list on
 * demand, and every region a door to its own screen. One per screen: each
 * mount is its own drawing context, and a phone pays for every one.
 */
export function MapView({ title, lens, lenses, onLens, camera, selection, note, height = 420, onChoose, marks: layers, pins, regionPins }: MapViewProps) {
  const [table, setTable] = useState<RegionTable | null>(null);
  const placed = useMemo(() => [...(pins ?? []), ...placeRegionPins(table, regionPins)], [pins, table, regionPins]);
  const root = useRef<HTMLDivElement | null>(null);
  const surface = useRef<HTMLDivElement | null>(null);
  const tooltip = useRef<TooltipHandle | null>(null);
  const events = useRef<GlEvents>(NO_EVENTS);
  const [listOpen, setListOpen] = useState(false);
  const { runtime, error, mapLens, rendererLens, colors, area, target, settings, highContrast, marks } = usePageMap({ lens, camera, ...(selection ? { selection } : {}), ...(layers ? { marks: layers } : {}), ...(placed.length > 0 ? { pins: placed } : {}) }, root, surface, events);
  useEffect(() => setTable(runtime?.table ?? null), [runtime]);
  const choosePin = usePinChoice(runtime);
  const door = useRegionDoor();
  const open = onChoose ?? door;
  const level: LensLevel = mapLens?.level ?? "nation";
  events.current = {
    hover: (region, x, y) => {
      const value = region && mapLens && runtime ? (readRegion(mapLens, runtime.table, region, level)?.text ?? "") : "";
      tooltip.current?.show(region && mapLens ? { name: regionName(region), value, x, y } : null);
    },
    select: (region) => open(refOf(region)),
    empty: () => undefined,
  };
  const rows = useMemo(() => (mapLens && runtime ? lensRows(mapLens, runtime.table, mapLens.level) : []), [mapLens, runtime]);
  const hintOf = useMemo(() => {
    if (!mapLens) return undefined;
    const ranked = rankSalience(rows);
    return (region: Region) => {
      const reading = mapLens.read(region, mapLens.level);
      if (!reading) return undefined;
      return { ...(reading.figure ? { figure: reading.figure } : {}), salience: reading.salience ?? ranked.get(refOf(region)) ?? 0 };
    };
  }, [mapLens, rows]);
  return (
    <section className="map-view" aria-label={title}>
      <header className="map-view__head">
        <div>
          <h2 className="map-view__title">{title}</h2>
          {note ? <p className="map-view__note">{note}</p> : null}
        </div>
        {lenses && lenses.length > 1 && onLens ? <LensSwitch lenses={lenses} current={lens} onLens={onLens} /> : null}
      </header>
      <div ref={root} className="map-layer map-view__frame" style={{ "--map-view-height": `${height}px` } as CSSProperties} data-lens={mapLens?.id} data-palette={settings.palette} data-contrast={highContrast ? "high" : undefined}>
        <div ref={surface} className="map-layer__canvas gl-map" role="group" aria-label={`${title}. ${mapLens?.name ?? "Loading"}.`} />
        {target?.insets && runtime && area && rendererLens && colors ? <UsInsets table={runtime.table} area={area} lens={rendererLens} colors={colors} density={settings.density} highContrast={highContrast} onChoose={open} /> : null}
        {runtime && marks.length > 0 ? <MapMarks renderer={runtime.view} bus={runtime.bus} marks={marks} onChoose={choosePin} onMore={() => setListOpen(true)} onClusters={() => undefined} /> : null}
        {runtime && area ? <MapLabels renderer={runtime.view} bus={runtime.bus} table={runtime.table} marks={marks} area={area} hintOf={hintOf} /> : null}
        <MapTooltip handle={tooltip} />
        {error ? <p className="map-view__error">The map failed to load: {error}. The list below carries the same figures.</p> : null}
      </div>
      <footer className="map-view__foot">
        <Legend lens={mapLens} />
        <MapDataList open={listOpen} onToggle={() => setListOpen((was) => !was)} lensName={mapLens?.name ?? title} levelName={level === "nation" ? "government" : level} legend={mapLens?.legend ?? []} rows={rows} marks={[]} onPreview={() => undefined} onChoose={open} onChooseMark={() => undefined} />
      </footer>
    </section>
  );
}
