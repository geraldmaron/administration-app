import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type RefObject } from "react";
import type { MapInsets } from "./camera";
import { SET_SEPARATOR } from "./camera-keys";
import { useMapData } from "./data-context";
import { useCurrentMapDirective } from "./directive";
import { HexHouse } from "./HexHouse";
import { lensRows, readRegion, regionName, refOf, type MapLens } from "./lenses/contract";
import type { LensLevel } from "./levels";
import { MapDataList } from "./MapDataList";
import { MapArcs } from "./MapArcs";
import { MapCardLayer } from "./MapCards";
import { DeltaCallouts } from "./DeltaCallouts";
import { MapMarks } from "./MapMarks";
import { MapLabels } from "./labels/MapLabels";
import { MapTooltip, type TooltipHandle } from "./MapTooltip";
import type { MarkCluster } from "./marks/cluster";
import type { MarkPoint } from "./marks/sources";
import { useMediaQuery, withDefaults, type MapSettings } from "./settings";
import type { CameraTarget } from "./target";
import { UsInsets } from "./UsInsets";
import { frameColors, usePalette } from "./use-map-runtime";
import { NOT_LANDED, useLenses, useLocalOverride, useMarks, useVisibleArea, type Landed } from "./use-map-layer";
import { useGlControls, useGlRuntime, useTurning, type GlEvents, type GlRuntime } from "./gl/use-gl-runtime";
import { useGlCameraSync, useGlLensSync, useGlSelectionSync } from "./gl/use-gl-sync";
import "./map.css";
import "./gl/gl-map.css";

export interface MapLayerProps {
  /** What the shell's chrome covers (rail, panel, sheet at its settled detent, tab bar); the camera frames inside the rest. */
  readonly insets?: MapInsets;
  readonly settings?: Partial<MapSettings>;
  /**
   * A region chosen on the map or in the list, as a ref (`state:CA`). The
   * shell returns true when it routed the choice; absent, or false, the map
   * frames and detaches it itself.
   */
  readonly onSelect?: (ref: string) => boolean;
  /** A single pin chosen; a cluster of several frames itself instead. */
  readonly onActivateMark?: (mark: MarkPoint) => void;
  /** A click on open sea, after the map has dropped a choice it framed itself: the shell goes back when a detail layer is open. */
  readonly onEmpty?: () => void;
  /** Diagnostics only: the dev harness and the frame-time measurement read the map's runtime. */
  readonly onRuntime?: (runtime: GlRuntime | null) => void;
}

/** Below this width the map is a strip over a sheet: cards line up in a rail rather than point. */
const RAIL_BELOW_PX = 768;
const LEVEL_NAME = { nation: "government", state: "state", district: "district" } as const;
const NO_EVENTS: GlEvents = { hover: () => undefined, select: () => undefined, empty: () => undefined };

/**
 * The framing for a cluster of marks. Offices cluster a few blocks apart, so
 * they are framed as pins, close enough to come apart; anything else keeps the
 * country-scale point framing.
 */
function pointsKey(members: readonly MarkPoint[]): string {
  const kind = members.every((m) => m.kind === "office") ? "pin" : "point";
  return `set:${members.map((m) => `${kind}:${m.lon},${m.lat}`).join(SET_SEPARATOR)}`;
}

/** Settings, palette, the GL map, lens and the directive pushed into the map. */
function useMapCore(props: MapLayerProps, root: RefObject<HTMLDivElement | null>, surface: RefObject<HTMLDivElement | null>, events: RefObject<GlEvents>, onLanded: (target: CameraTarget) => void) {
  const directive = useCurrentMapDirective();
  const { campaign, baseline } = useMapData();
  const settings = withDefaults(props.settings);
  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const highContrast = useMediaQuery("(prefers-contrast: more)") || settings.highContrast;
  const palette = usePalette(root, settings.palette, highContrast);
  const colors = useMemo(() => (palette ? frameColors(palette) : null), [palette]);
  const { runtime, size, error } = useGlRuntime(surface, palette, events);
  const [local, setLocal] = useLocalOverride(`${directive.camera}#${directive.selection ?? ""}`);
  const { mapLens, rendererLens } = useLenses(directive.lens, campaign, palette, runtime?.table ?? null, baseline);
  const area = useVisibleArea(size, props.insets);
  useGlLensSync(runtime, mapLens);
  const selected = useGlSelectionSync(runtime, local?.selection ?? directive.selection);
  const { target, reframe } = useGlCameraSync(runtime, local?.camera ?? directive.camera, area, settings, reducedMotion, onLanded);
  useGlControls(runtime, reframe);
  useTurning(runtime, directive.turning === true && !reducedMotion);
  const { onRuntime } = props;
  useEffect(() => onRuntime?.(runtime), [runtime, onRuntime]);
  return { directive, campaign, baseline, settings, highContrast, palette, colors, runtime, size, error, setLocal, mapLens, rendererLens, area, selected, target };
}

type Core = ReturnType<typeof useMapCore>;

/** Choosing regions and pins, the map's events, and the keyboard cursor's preview. */
function useMapInteractions(props: MapLayerProps, core: Core, effective: LensLevel, tooltip: RefObject<TooltipHandle | null>) {
  const { onSelect, onActivateMark, onEmpty } = props;
  const { setLocal, mapLens, runtime } = core;
  const choose = useCallback(
    (ref: string) => {
      if (!onSelect?.(ref)) setLocal({ camera: ref, selection: ref });
    },
    [onSelect, setLocal],
  );
  const chooseMark = useCallback(
    (cluster: MarkCluster) => {
      const single = cluster.members.length === 1 ? cluster.members[0] : undefined;
      if (single && onActivateMark) onActivateMark(single);
      else setLocal({ camera: pointsKey(cluster.members) });
    },
    [onActivateMark, setLocal],
  );
  const show = useCallback(
    (lens: MapLens | null, region: Parameters<GlEvents["hover"]>[0], x: number, y: number) => {
      const value = region && lens && runtime ? (readRegion(lens, runtime.table, region, effective)?.text ?? "") : "";
      tooltip.current?.show(region && lens ? { name: regionName(region), value, x, y } : null);
    },
    [tooltip, effective, runtime],
  );
  const events: GlEvents = {
    hover: (region, x, y) => show(mapLens, region, x, y),
    select: (region) => choose(refOf(region)),
    empty: () => {
      setLocal(null);
      onEmpty?.();
    },
  };
  const preview = useCallback(
    (ref: string | null) => {
      const region = ref && runtime ? runtime.table.regions.find((r) => refOf(r) === ref) : undefined;
      const point = region ? runtime?.view.project(region.centroid[0], region.centroid[1]) : null;
      show(mapLens, region && point ? region : null, point?.[0] ?? 0, point?.[1] ?? 0);
    },
    [runtime, mapLens, show],
  );
  return { choose, chooseMark, events, preview };
}

/** The map's own controls sit inside the uncovered map, clear of a docked panel or a sheet. */
function controlInsets(insets: MapInsets | undefined): CSSProperties {
  return { "--gl-inset-right": `${insets?.right ?? 0}px`, "--gl-inset-bottom": `${insets?.bottom ?? 0}px` } as CSSProperties;
}

function describe(landed: Landed, lens: MapLens | null, selected: ReadonlySet<number>, runtime: GlRuntime | null): string {
  const names = runtime ? [...selected].flatMap((i) => (runtime.table.regions[i] ? [regionName(runtime.table.regions[i])] : [])) : [];
  return `Map of ${landed.label}. ${lens?.name ?? "Loading"}.${names.length > 0 ? ` Selected: ${names.join(", ")}.` : ""}`;
}

function dataAttributes(core: Core) {
  return {
    "data-palette": core.settings.palette,
    "data-contrast": core.highContrast ? "high" : undefined,
    "data-paused": core.directive.paused ? "true" : undefined,
    "data-camera": core.target ? core.directive.camera : undefined,
    "data-lens": core.mapLens?.id,
  };
}

/**
 * The map behind every screen. The shell mounts it once, full-bleed behind
 * the work surface, inside a MapDirectiveProvider and a MapDataProvider;
 * screens steer it through useMapDirective.
 */
export function MapLayer(props: MapLayerProps) {
  const root = useRef<HTMLDivElement | null>(null);
  const surface = useRef<HTMLDivElement | null>(null);
  const tooltip = useRef<TooltipHandle | null>(null);
  const events = useRef<GlEvents>(NO_EVENTS);
  const [landed, setLanded] = useState<Landed>(NOT_LANDED);
  const runtimeRef = useRef<GlRuntime | null>(null);
  const onLanded = useCallback((target: CameraTarget) => {
    const view = runtimeRef.current?.view;
    setLanded({ label: target.label, effective: view?.current.plan.effective ?? "nation", insets: target.insets === true, zoomLevel: view?.zoomLevel ?? 0 });
  }, []);
  const [listOpen, setListOpen] = useState(false);
  const toggleList = useCallback(() => setListOpen((open) => !open), []);
  const openList = useCallback(() => setListOpen(true), []);
  const [clusters, setClusters] = useState<readonly MarkCluster[]>([]);
  const core = useMapCore(props, root, surface, events, onLanded);
  runtimeRef.current = core.runtime;
  const hex = core.mapLens?.cartogram === "hex";
  const effective: LensLevel = hex ? "district" : landed.effective;
  const actions = useMapInteractions(props, core, effective, tooltip);
  events.current = actions.events;
  const marks = useMarks(core.campaign, core.directive.marks, core.directive.lens, landed.zoomLevel, core.directive.selection, core.directive.pins);
  const data = useMemo(() => {
    if (!core.mapLens || !core.runtime) return { rows: [], level: effective };
    const rows = lensRows(core.mapLens, core.runtime.table, effective);
    // The phone sheet can cover the map before its camera has settled. The
    // accessible list must still expose the lens's data at its native level.
    return rows.length > 0 || effective === core.mapLens.level
      ? { rows, level: effective }
      : { rows: lensRows(core.mapLens, core.runtime.table, core.mapLens.level), level: core.mapLens.level };
  }, [core.mapLens, core.runtime, effective]);
  const description = describe(landed, core.mapLens, core.selected, core.runtime);
  return (
    <div ref={root} className="map-layer" {...dataAttributes(core)}>
      <MapDataList open={listOpen} onToggle={toggleList} lensName={core.mapLens?.name ?? "The map"} levelName={LEVEL_NAME[data.level]} legend={core.mapLens?.legend ?? []} rows={data.rows} marks={clusters} onPreview={actions.preview} onChoose={actions.choose} onChooseMark={actions.chooseMark} />
      <div ref={surface} className={hex ? "map-layer__canvas gl-map map-layer__canvas--dim" : "map-layer__canvas gl-map"} style={controlInsets(props.insets)} role="group" aria-label={description} />
      <div className="map-layer__atmosphere" aria-hidden="true" />
      <MapOverlays core={core} hex={hex} landed={landed} marks={marks} actions={actions} onMore={openList} onClusters={setClusters} />
      <MapTooltip handle={tooltip} />
      <p className="map-layer__status" aria-live="polite">
        {core.error ? `The map failed to load: ${core.error}` : description}
      </p>
    </div>
  );
}

interface OverlayProps {
  readonly core: Core;
  readonly hex: boolean;
  readonly landed: Landed;
  readonly marks: readonly MarkPoint[];
  readonly actions: ReturnType<typeof useMapInteractions>;
  readonly onMore: () => void;
  readonly onClusters: (clusters: readonly MarkCluster[]) => void;
}

/** What sits over the map: the House hexes, the Alaska and Hawaii insets, and the pins. */
function MapOverlays({ core, hex, landed, marks, actions, onMore, onClusters }: OverlayProps) {
  const { runtime, mapLens, rendererLens, palette, colors, size, area, directive, settings, highContrast } = core;
  if (!runtime || !area) return null;
  const showInsets = landed.insets && core.target?.insets === true && !hex && !directive.paused;
  return (
    <>
      {hex && mapLens && palette && size ? (
        <HexHouse table={runtime.table} lens={mapLens} palette={palette} viewport={size} area={area} selected={core.selected} highContrast={highContrast} onHover={(r, x, y) => actions.events.hover(r, x, y)} onSelect={(r) => actions.choose(refOf(r))} />
      ) : null}
      {showInsets && rendererLens && colors ? <UsInsets table={runtime.table} area={area} lens={rendererLens} colors={colors} density={settings.density} highContrast={highContrast} onChoose={actions.choose} /> : null}
      {!directive.paused && directive.arcs?.length ? <MapArcs renderer={runtime.view} bus={runtime.bus} table={runtime.table} arcs={directive.arcs} /> : null}
      {mapLens?.id === "delta" && !directive.paused ? <DeltaCallouts baseline={core.baseline} campaign={core.campaign} table={runtime.table} /> : null}
      {size ? <MapCardLayer renderer={runtime.view} bus={runtime.bus} table={runtime.table} area={area} viewport={size} rail={size.width < RAIL_BELOW_PX} paused={directive.paused === true} /> : null}
      {!directive.paused && !hex ? <MapLabels renderer={runtime.view} bus={runtime.bus} table={runtime.table} marks={marks} area={area} /> : null}
      {!directive.paused ? <MapMarks renderer={runtime.view} bus={runtime.bus} marks={marks} onChoose={actions.chooseMark} onMore={onMore} onClusters={onClusters} focus={directive.camera} /> : null}
    </>
  );
}

