import type { ReactNode } from "react";
import type { FeatureCollection, MultiPolygon, Polygon } from "geojson";

/**
 * The layers a region belongs to. `inset` is the frame drawn round a place
 * moved beside the rest (Alaska, Hawaii); `mask` is that place's real shape,
 * drawn as sea so the terrain does not show a ghost of it where it was.
 */
export type MapLayer = "world" | "states" | "districts" | "inset" | "mask";

/** What each region feature carries: the ref it is chosen by (`state:CA`) and the layer it draws in. */
export interface MapRegionProperties {
  readonly key: string;
  readonly layer: MapLayer;
}

/** The geometry a map draws, one feature per region, each keyed by its ref. */
export type MapRegions = FeatureCollection<Polygon | MultiPolygon, MapRegionProperties>;

/** West, south, east, north, in degrees. */
export type MapBounds = readonly [number, number, number, number];

/** The whole world, the United States with Alaska and Hawaii set beside it, or a box. */
export type MapCamera = "world" | "us" | MapBounds;

/** A mixed value in proportion: a split delegation's seats, each color with its share. */
export interface MapMix {
  readonly colors: readonly string[];
  readonly weights: readonly number[];
}

/** One region as the map and its list both read it. */
export interface MapRow {
  readonly regionKey: string;
  readonly label: string;
  readonly value: string;
  readonly fill: string;
  readonly mix?: MapMix;
  /** The value in a few characters, for the list's figure column. */
  readonly figure?: string;
}

/** A drawn region the list carries no row for, with its color and what it reads. */
export interface MapPaint {
  readonly regionKey: string;
  readonly fill: string;
  readonly label: string;
  readonly value: string;
}

export interface MapLegendEntry {
  readonly label: string;
  readonly color: string;
}

export interface MapLegend {
  /** What the colors read: the lens's name. */
  readonly title: string;
  readonly entries: readonly MapLegendEntry[];
}

/** A raster drawn over the land across the whole Web Mercator world: an image asset as a static require gives it on either platform, or a URL. */
export type MapRelief = number | string | { readonly uri: string };

/** A mark on a region that needs the President: an open matter, or a declaration in force. */
export interface MapPin {
  readonly regionKey: string;
  readonly lon: number;
  readonly lat: number;
  readonly kind: "needs" | "declared";
}

export interface MapViewProps {
  /** The heading the map is read under, also its accessible name. */
  readonly title: string;
  /** A line under the title: what the colors mean in this screen's words. */
  readonly note?: string;
  /** The geometry, or null while it loads. */
  readonly regions: MapRegions | null;
  /** The ranked rows: the list view, the keyboard order and each listed region's color. */
  readonly rows: readonly MapRow[];
  /** Colors for drawn regions the rows do not list. */
  readonly paint?: readonly MapPaint[];
  readonly legend: MapLegend;
  readonly camera: MapCamera;
  /** The chosen region's ref, outlined on the map and marked in the list. */
  readonly selected?: string;
  /** A region chosen on the map, by keyboard or in the list; `additive` when the press adds to a set (shift or a modifier key). */
  readonly onSelect: (regionKey: string, additive?: boolean) => void;
  /** Further chosen regions, outlined like the selection, for a screen that acts on several at once. */
  readonly chosen?: readonly string[];
  /** What one row is, for the list's heading: "state", "government", "district". */
  readonly rowNoun?: string;
  /** The drawn height at desktop; a phone takes a shorter share. */
  readonly height?: number;
  readonly relief?: MapRelief;
  /** Controls in the head: a lens switch. */
  readonly aside?: ReactNode;
  /** Why the geometry could not load; the list still carries the figures. */
  readonly error?: string;
  /** Marks drawn over regions that need attention; the web drawing shows them, a phone leaves them to the list. */
  readonly pins?: readonly MapPin[];
  readonly testID?: string;
}

/** What the drawing surface needs: the map props without the frame's chrome, plus where keyboard focus sits. */
export interface MapCanvasProps {
  readonly title: string;
  readonly regions: MapRegions | null;
  readonly fills: ReadonlyMap<string, string>;
  readonly camera: MapCamera;
  readonly selected?: string;
  /** The region the keyboard is on, outlined like a hover. */
  readonly focused?: string;
  readonly onSelect: (regionKey: string, additive?: boolean) => void;
  readonly chosen?: readonly string[];
  readonly onHover: (regionKey: string | null) => void;
  readonly relief?: MapRelief;
  /** Bumped to send the camera back to its frame. */
  readonly reframe: number;
  /** Bumped up or down to zoom one step. */
  readonly zoom: { readonly step: number; readonly by: number };
  readonly pins?: readonly MapPin[];
  /** The drawing could not start or lost its context (no WebGL); the frame says so and the list carries on. */
  readonly onFail?: (reason: string) => void;
}
