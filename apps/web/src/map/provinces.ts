import { geoPath } from "d3-geo";
import type { MultiLineString } from "geojson";
import type { RegionTable } from "./data";
import type { GeoBounds } from "./projection";
import { pathContext, type ProjectedScene } from "./scene";

// A government's first-level divisions (provinces, regions, oblasts), baked
// from Natural Earth by scripts/bake-map-provinces.mjs. The game keeps no data
// per province, so they are drawn as geography on the selected government only:
// its inner lines and its divisions' names, never a region the map picks or a
// lens colors. The United States has its own states and districts instead.

const URLS = import.meta.glob<string>("./data/provinces/*.json", { query: "?url", import: "default" });

/** Degrees per stored unit in the baked lines. */
const GRID = 1e-3;

export interface Province {
  readonly name: string;
  /** Where its name is written. */
  readonly label: readonly [number, number];
  /** Square kilometers: the larger division is named first. */
  readonly area: number;
  readonly bounds: GeoBounds;
}

export interface ProvinceSet {
  readonly government: string;
  readonly lines: MultiLineString;
  readonly provinces: readonly Province[];
}

export interface Baked {
  readonly lines: readonly (readonly number[])[];
  readonly names: readonly { readonly n: string; readonly l: readonly [number, number]; readonly a: number; readonly b: GeoBounds }[];
}

function decodeLine(encoded: readonly number[]): [number, number][] {
  const points: [number, number][] = [];
  let x = 0;
  let y = 0;
  for (let i = 0; i + 1 < encoded.length; i += 2) {
    x += encoded[i]!;
    y += encoded[i + 1]!;
    points.push([x * GRID, y * GRID]);
  }
  return points;
}

/** A baked file as lines in degrees and named provinces. */
export function decodeProvinces(government: string, baked: Baked): ProvinceSet {
  return {
    government,
    lines: { type: "MultiLineString", coordinates: baked.lines.map(decodeLine) },
    provinces: baked.names.map((entry) => ({ name: entry.n, label: entry.l, area: entry.a, bounds: entry.b })),
  };
}

const cache = new Map<string, Promise<ProvinceSet | null>>();

/** A government's divisions, fetched once; null for one with none worth drawing (a single-division state, the United States). */
export function loadProvinces(government: string): Promise<ProvinceSet | null> {
  const cached = cache.get(government);
  if (cached) return cached;
  const url = URLS[`./data/provinces/${government}.json`];
  const pending = url
    ? url()
        .then((href) => fetch(href))
        .then(async (response) => {
          if (!response.ok) throw new Error(`Provinces for ${government} failed to load: ${response.status}`);
          return decodeProvinces(government, (await response.json()) as Baked);
        })
    : Promise.resolve(null);
  cache.set(government, pending);
  // Evict a failed load so the next selection retries; callers still see the rejection.
  pending.catch(() => cache.delete(government));
  return pending;
}

/** The one government a selection lifts, when it is exactly one and not the United States. */
export function selectedGovernment(table: RegionTable, selected: ReadonlySet<number>): string | null {
  if (selected.size !== 1) return null;
  const [index] = selected;
  const region = table.regions[index!];
  return region && region.layer === "world" && region.id !== "USA" && !region.pointOnly ? region.id : null;
}

/**
 * The selected government's divisions for the renderer: loaded when it is
 * first asked for, projected once per scene, and ready to draw on the lifted
 * face. `ready` asks for a frame when a load lands.
 */
export class ProvinceLayer {
  private set: ProvinceSet | null = null;
  private wanted: string | null = null;
  private projected = new WeakMap<ProjectedScene, Path2D>();

  constructor(private readonly ready: () => void) {}

  /** The divisions on screen now, for the label layer; empty without a single foreign selection. */
  get current(): ProvinceSet | null {
    return this.set && this.set.government === this.wanted ? this.set : null;
  }

  /** The inner lines for this scene and selection, or undefined while there are none (yet). */
  linesFor(scene: ProjectedScene, table: RegionTable, selected: ReadonlySet<number>): Path2D | undefined {
    const government = selectedGovernment(table, selected);
    if (government !== this.wanted) this.want(government);
    const set = this.current;
    if (!set) return undefined;
    let path = this.projected.get(scene);
    if (!path) {
      path = new Path2D();
      geoPath(scene.projection, pathContext(path))(set.lines);
      this.projected.set(scene, path);
    }
    return path;
  }

  private want(government: string | null): void {
    this.wanted = government;
    if (!government) return;
    loadProvinces(government)
      .then((set) => {
        if (this.wanted !== government) return;
        this.set = set;
        this.projected = new WeakMap();
        this.ready();
      })
      .catch((cause: unknown) => {
        // The divisions are geography beside the game's own data: without them the map still says everything.
        console.warn(`Provinces for ${government} could not be loaded`, cause);
      });
  }
}
