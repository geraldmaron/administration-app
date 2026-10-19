import { geoGraticule10 } from "d3-geo";
import type { FeatureCollection } from "geojson";
import type { ExpressionSpecification, LayerSpecification, Map as GlMapInstance, StyleSpecification } from "maplibre-gl";
import type { LensLevel } from "../levels";
import type { MapPalette } from "../lenses/palette";

// The GL map's base style: a sea, the world's governments, the states over
// them, their seams, and the selection's lift. Colors come from the palette
// the map layer's stylesheet resolved, so a palette swap is the same
// stylesheet change it always was. A lens never edits this style; it sets
// each region's `fill` feature state, and the selection sets `selected`.

export const WORLD_SOURCE = "world";
export const STATES_SOURCE = "states";
export const DISTRICTS_SOURCE = "districts";
export const PROVINCES_SOURCE = "provinces";
export const RELIEF_SOURCE = "relief";

/** The deepest zoom the baked relief tiles go to (scripts/bake-map-relief-tiles.mjs); MapLibre overzooms past it. */
const RELIEF_MAX_ZOOM = 4;

export const FILL_LAYERS = ["world-fill", "states-fill", "districts-fill"] as const;

const empty = (): FeatureCollection => ({ type: "FeatureCollection", features: [] });

/** The land is a little see-through, so the sea's dark shows at its edges and the terrain over it reads as ground, not paint. */
export const LAND_OPACITY = 0.82;

/** How faded the land is that a selection is not about. */
export const OTHERS_OPACITY = 0.45;

function fillColor(palette: MapPalette): ExpressionSpecification {
  return ["coalesce", ["feature-state", "fill"], palette.land];
}

/** Full strength for the selected and for everything when nothing is selected; the rest fade so the selection reads first. */
export function fillOpacity(anySelected: boolean): ExpressionSpecification {
  return ["case", ["boolean", ["feature-state", "selected"], false], 0.95, ["boolean", ["feature-state", "hover"], false], 0.9, anySelected ? OTHERS_OPACITY : LAND_OPACITY];
}

const selectedOnly = (on: number): ExpressionSpecification => ["case", ["boolean", ["feature-state", "selected"], false], on, 0];

type RegionSource = typeof WORLD_SOURCE | typeof STATES_SOURCE | typeof DISTRICTS_SOURCE;

function fillLayer(source: RegionSource, palette: MapPalette): LayerSpecification {
  return { id: `${source}-fill`, type: "fill", source, paint: { "fill-color": fillColor(palette), "fill-opacity": fillOpacity(false) } };
}

/** A region layer's seams: hairlines at world zoom, firmer closer in. */
function lineLayer(source: RegionSource, palette: MapPalette, widths: readonly [number, number, number, number]): LayerSpecification {
  const [z0, w0, z1, w1] = widths;
  return { id: `${source}-line`, type: "line", source, paint: { "line-color": palette.border, "line-width": ["interpolate", ["linear"], ["zoom"], z0, w0, z1, w1] } };
}

/** The selection's lift: a soft glow under a crisp edge, drawn only on the selected. */
function selectionLayers(source: RegionSource, palette: MapPalette): readonly LayerSpecification[] {
  return [
    { id: `${source}-selection-glow`, type: "line", source, paint: { "line-color": palette.selection, "line-width": 8, "line-blur": 6, "line-opacity": selectedOnly(0.55) } },
    { id: `${source}-selection-line`, type: "line", source, paint: { "line-color": palette.selection, "line-width": 2, "line-opacity": selectedOnly(1) } },
  ];
}

function sources(reliefTiles: string): StyleSpecification["sources"] {
  return {
    [WORLD_SOURCE]: { type: "geojson", data: empty() },
    [STATES_SOURCE]: { type: "geojson", data: empty() },
    [DISTRICTS_SOURCE]: { type: "geojson", data: empty() },
    [PROVINCES_SOURCE]: { type: "geojson", data: empty() },
    graticule: { type: "geojson", data: { type: "Feature", properties: {}, geometry: geoGraticule10() } },
    [RELIEF_SOURCE]: { type: "raster", tiles: [reliefTiles], tileSize: 256, minzoom: 0, maxzoom: RELIEF_MAX_ZOOM },
  };
}

/**
 * The base style. `reliefTiles` is the absolute URL template of the baked
 * terrain tiles, which MapLibre needs absolute; the shell resolves it against
 * the page's origin, so the web build and Electron's own scheme both serve it.
 */
export function baseStyle(palette: MapPalette, reliefTiles: string): StyleSpecification {
  return {
    version: 8,
    projection: { type: "globe" },
    sources: sources(reliefTiles),
    layers: [
      { id: "sea", type: "background", paint: { "background-color": palette.ground } },
      { id: "graticule", type: "line", source: "graticule", paint: { "line-color": palette.graticule, "line-width": 0.6, "line-opacity": 0.7 } },
      fillLayer(WORLD_SOURCE, palette),
      { id: "world-coast-glow", type: "line", source: WORLD_SOURCE, paint: { "line-color": palette.coast, "line-width": 3, "line-blur": 4, "line-opacity": 0.25 } },
      lineLayer(WORLD_SOURCE, palette, [1, 0.4, 6, 1.2]),
      // The states and districts are drawn over the United States' own polygon, so their lens reads without the nation's fill bleeding through the seams.
      fillLayer(STATES_SOURCE, palette),
      fillLayer(DISTRICTS_SOURCE, palette),
      // The terrain shades the land over every lens color: shadows dark, lit slopes light, flat ground and the sea untouched.
      { id: "relief", type: "raster", source: RELIEF_SOURCE, paint: { "raster-opacity": ["interpolate", ["linear"], ["zoom"], 1, 0.7, 6, 0.9], "raster-fade-duration": 0, "raster-resampling": "linear" } },
      lineLayer(DISTRICTS_SOURCE, palette, [3, 0.2, 8, 0.8]),
      lineLayer(STATES_SOURCE, palette, [2, 0.3, 7, 1.5]),
      { id: "provinces-line", type: "line", source: PROVINCES_SOURCE, paint: { "line-color": palette.line, "line-width": 0.8, "line-opacity": 0.45, "line-dasharray": [3, 2] } },
      ...selectionLayers(WORLD_SOURCE, palette),
      ...selectionLayers(STATES_SOURCE, palette),
      ...selectionLayers(DISTRICTS_SOURCE, palette),
    ],
  };
}

const LEVEL_LAYERS: Readonly<Record<LensLevel, Readonly<Record<string, boolean>>>> = {
  nation: { "states-fill": false, "districts-fill": false, "districts-line": false },
  state: { "states-fill": true, "districts-fill": false, "districts-line": false },
  district: { "states-fill": false, "districts-fill": true, "districts-line": true },
};

/** Show the fills a lens's level paints: a nation lens reads the United States as one government, a district lens its seats. */
export function showLevel(map: GlMapInstance, level: LensLevel): void {
  for (const [layer, visible] of Object.entries(LEVEL_LAYERS[level])) map.setLayoutProperty(layer, "visibility", visible ? "visible" : "none");
}

/** Every paint property the palette sets, so a palette switch (contrast, color vision) recolors in place without reloading a source. */
export function applyPalette(map: GlMapInstance, palette: MapPalette): void {
  map.setPaintProperty("sea", "background-color", palette.ground);
  map.setPaintProperty("graticule", "line-color", palette.graticule);
  map.setPaintProperty("world-coast-glow", "line-color", palette.coast);
  map.setPaintProperty("provinces-line", "line-color", palette.line);
  for (const source of [WORLD_SOURCE, STATES_SOURCE, DISTRICTS_SOURCE] as const) {
    map.setPaintProperty(`${source}-fill`, "fill-color", fillColor(palette));
    map.setPaintProperty(`${source}-line`, "line-color", palette.border);
    map.setPaintProperty(`${source}-selection-glow`, "line-color", palette.selection);
    map.setPaintProperty(`${source}-selection-line`, "line-color", palette.selection);
  }
}
