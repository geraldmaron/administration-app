import { chrome, dark, mapBoard } from "@admin/design";
import type { ExpressionSpecification, FilterSpecification, LayerSpecification } from "@maplibre/maplibre-gl-style-spec";
import type { MapBounds, MapCamera, MapLayer, MapPaint, MapPin, MapRow } from "./types";

// One style for both drawings: the web hands these layers to MapLibre GL, the
// phone renders each as a MapLibre Native layer. The style is self-contained:
// a sea, our own regions and their seams, and an optional relief raster
// shipped with the app. Nothing is fetched from a tile host.

export const REGION_SOURCE = "regions";
export const PIN_SOURCE = "pins";
export const RELIEF_SOURCE = "relief";

/** The board's own colors: the sea, quiet land, seams and the selection's light. */
export const MAP_COLORS = {
  sea: chrome.navy,
  land: mapBoard.land,
  seam: mapBoard.border,
  line: mapBoard.line,
  coast: mapBoard.coast,
  selection: dark.anchor.white,
  focus: dark.line.focus,
  gold: dark.anchor.gold,
  alert: dark.status.warning.ink,
} as const;

/** The world without Antarctica's empty south, and the United States with Alaska and Hawaii set in the Pacific beside it. */
export const CAMERA_BOUNDS: Readonly<Record<"world" | "us", MapBounds>> = {
  world: [-170, -56, 190, 78],
  us: [-138, 12, -65, 50],
};

export function boundsOf(camera: MapCamera): MapBounds {
  return typeof camera === "string" ? CAMERA_BOUNDS[camera] : camera;
}

const mercatorY = (lat: number): number => (Math.log(Math.tan(Math.PI / 4 + (Math.max(-85, Math.min(85, lat)) * Math.PI) / 360)) * 180) / Math.PI;

/** How much wider than tall a camera's box draws, so a frame can hug the geography it shows. */
export function boundsAspect(camera: MapCamera): number {
  const [w, s, e, n] = boundsOf(camera);
  return Math.max(0.5, (e >= w ? e - w : e + 360 - w) / Math.max(1, mercatorY(n) - mercatorY(s)));
}

/** The corners a whole-world Web Mercator raster is pinned to: top left, top right, bottom right, bottom left. */
export const MERCATOR_CORNERS: [[number, number], [number, number], [number, number], [number, number]] = [
  [-180, 85.051129],
  [180, 85.051129],
  [180, -85.051129],
  [-180, -85.051129],
];

/** Each region's fill by ref: the rows' colors, then the paint for regions the rows leave out. */
export function fillsOf(rows: readonly MapRow[], paint: readonly MapPaint[] = []): ReadonlyMap<string, string> {
  return new Map([...paint.map((p) => [p.regionKey, p.fill] as const), ...rows.map((row) => [row.regionKey, row.fill] as const)]);
}

/** A fill color as one expression over the region's ref, so a lens change restyles the map without re-sending its geometry. */
export function fillExpression(fills: ReadonlyMap<string, string>): ExpressionSpecification | string {
  if (fills.size === 0) return MAP_COLORS.land;
  const pairs = [...fills].flatMap(([key, color]) => [key, color]);
  return ["match", ["get", "key"], ...pairs, MAP_COLORS.land] as unknown as ExpressionSpecification;
}

const onLayer = (layer: MapLayer): FilterSpecification => ["==", ["get", "layer"], layer];
const onKey = (key: string | undefined): FilterSpecification => ["==", ["get", "key"], key ?? ""];
/** Every chosen region at once, so a set of several lights the same way one does. */
const onKeys = (keys: readonly string[]): FilterSpecification => ["in", ["get", "key"], ["literal", [...keys]]] as unknown as FilterSpecification;
const chosenKeys = (selected: string | undefined, chosen: readonly string[] | undefined): readonly string[] => [...(selected ? [selected] : []), ...(chosen ?? [])];

type RegionLayer = Exclude<MapLayer, "inset" | "mask">;

/** Seams widen as the camera closes in: hairlines at the world, firm lines on a state. */
const SEAM_WIDTH: Readonly<Record<RegionLayer, ExpressionSpecification>> = {
  world: ["interpolate", ["linear"], ["zoom"], 0, 0.35, 5, 1.1],
  states: ["interpolate", ["linear"], ["zoom"], 1, 0.6, 6, 1.6],
  districts: ["interpolate", ["linear"], ["zoom"], 2, 0.25, 8, 0.9],
};

function fillLayer(layer: RegionLayer, fill: ExpressionSpecification | string): LayerSpecification {
  return { id: `${layer}-fill`, type: "fill", source: REGION_SOURCE, filter: onLayer(layer), paint: { "fill-color": fill, "fill-opacity": 0.94, "fill-antialias": true } };
}

function seamLayer(layer: RegionLayer): LayerSpecification {
  return { id: `${layer}-seam`, type: "line", source: REGION_SOURCE, filter: onLayer(layer), paint: { "line-color": MAP_COLORS.seam, "line-width": SEAM_WIDTH[layer], "line-opacity": 0.9 } };
}

/** A soft light round the selection and a crisp edge on it, the keyboard's place in the focus color. */
function highlightLayers(selected: readonly string[], focused: string | undefined): LayerSpecification[] {
  return [
    { id: "focus-line", type: "line", source: REGION_SOURCE, filter: onKey(focused), paint: { "line-color": MAP_COLORS.focus, "line-width": 2, "line-dasharray": [2, 1] } },
    { id: "selection-glow", type: "line", source: REGION_SOURCE, filter: onKeys(selected), paint: { "line-color": MAP_COLORS.selection, "line-width": 7, "line-blur": 5, "line-opacity": 0.45 } },
    { id: "selection-line", type: "line", source: REGION_SOURCE, filter: onKeys(selected), paint: { "line-color": MAP_COLORS.selection, "line-width": 2 } },
  ];
}

export interface StyleInput {
  readonly fills: ReadonlyMap<string, string>;
  readonly selected?: string;
  readonly chosen?: readonly string[];
  readonly focused?: string;
  readonly relief: boolean;
}

/** Every layer over the sea, bottom to top. */
export function mapLayers({ fills, selected, chosen, focused, relief }: StyleInput): LayerSpecification[] {
  const fill = fillExpression(fills);
  return [
    { id: "coast-glow", type: "line", source: REGION_SOURCE, filter: onLayer("world"), paint: { "line-color": MAP_COLORS.coast, "line-width": 4, "line-blur": 5, "line-opacity": 0.22 } },
    fillLayer("world", fill),
    fillLayer("states", fill),
    fillLayer("districts", fill),
    // The terrain shades every lens color under the seams, so the borders stay crisp over it.
    ...(relief ? [{ id: "relief", type: "raster", source: RELIEF_SOURCE, paint: { "raster-opacity": 0.55, "raster-fade-duration": 0 } } satisfies LayerSpecification] : []),
    { id: "mask", type: "fill", source: REGION_SOURCE, filter: onLayer("mask"), paint: { "fill-color": MAP_COLORS.sea } },
    seamLayer("world"),
    seamLayer("states"),
    seamLayer("districts"),
    { id: "inset-frame", type: "line", source: REGION_SOURCE, filter: onLayer("inset"), paint: { "line-color": MAP_COLORS.line, "line-width": 1, "line-opacity": 0.55, "line-dasharray": [4, 3] } },
    ...highlightLayers(chosenKeys(selected, chosen), focused),
  ];
}

/** The layers a lens change, a selection or the keyboard restyle in place, with the property each sets. */
export function dynamicPaint(input: StyleInput): readonly { readonly layer: string; readonly fill?: ExpressionSpecification | string; readonly filter?: FilterSpecification }[] {
  const fill = fillExpression(input.fills);
  return [
    { layer: "world-fill", fill },
    { layer: "states-fill", fill },
    { layer: "districts-fill", fill },
    { layer: "focus-line", filter: onKey(input.focused) },
    { layer: "selection-glow", filter: onKeys(chosenKeys(input.selected, input.chosen)) },
    { layer: "selection-line", filter: onKeys(chosenKeys(input.selected, input.chosen)) },
  ];
}

/** Which region a press lands on when layers overlap: the finest one. */
const PRIORITY: Readonly<Record<MapLayer, number>> = { districts: 3, states: 2, world: 1, inset: 0, mask: 0 };

export function pickRegion(features: readonly { readonly properties?: unknown }[]): string | null {
  const regions = features.flatMap((feature) => {
    const props = feature.properties as Partial<{ key: unknown; layer: unknown }> | null | undefined;
    return props && typeof props.key === "string" && typeof props.layer === "string" && (PRIORITY[props.layer as MapLayer] ?? 0) > 0 ? [{ key: props.key, rank: PRIORITY[props.layer as MapLayer] ?? 0 }] : [];
  });
  return regions.reduce<{ key: string; rank: number } | null>((best, next) => (!best || next.rank > best.rank ? next : best), null)?.key ?? null;
}

/** The pins as point features, each carrying its kind so one layer colors them all. */
export function pinCollection(pins: readonly MapPin[]): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: pins.map((pin) => ({ type: "Feature", properties: { key: pin.regionKey, kind: pin.kind }, geometry: { type: "Point", coordinates: [pin.lon, pin.lat] } })),
  };
}

const onKind = (kind: MapPin["kind"]): FilterSpecification => ["==", ["get", "kind"], kind];

/**
 * A pin is told by shape as well as color, over a halo of the sea's navy so it
 * reads on any lens color: a solid amber dot where a state waits on the
 * President, a hollow gold ring where a declaration is in force. They sit
 * over the seams and under the selection's light.
 */
export function pinLayers(): LayerSpecification[] {
  return [
    { id: "pin-ring", type: "circle", source: PIN_SOURCE, paint: { "circle-radius": ["interpolate", ["linear"], ["zoom"], 1, 7, 6, 12], "circle-color": MAP_COLORS.sea, "circle-opacity": 0.9 } },
    { id: "pin-dot", type: "circle", source: PIN_SOURCE, filter: onKind("needs"), paint: { "circle-radius": ["interpolate", ["linear"], ["zoom"], 1, 4, 6, 7], "circle-color": MAP_COLORS.alert, "circle-stroke-color": MAP_COLORS.selection, "circle-stroke-width": 1 } },
    { id: "pin-declared", type: "circle", source: PIN_SOURCE, filter: onKind("declared"), paint: { "circle-radius": ["interpolate", ["linear"], ["zoom"], 1, 4.5, 6, 8], "circle-color": MAP_COLORS.sea, "circle-stroke-color": MAP_COLORS.gold, "circle-stroke-width": ["interpolate", ["linear"], ["zoom"], 1, 2.5, 6, 3.5] } },
  ];
}
