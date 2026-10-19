import { geoGraticule10, geoPath, type GeoContext, type GeoProjection } from "d3-geo";
import type { Affine, Rect, Viewport } from "./camera";
import type { LayerName, RegionTable, Shape } from "./data";
import { decodeBuffer, idFill } from "./id-color";
import { sampleLattice, type Centroids, type Dots, type IdGrid } from "./lattice";
import type { LevelPlan } from "./levels";
import { octaveFor, pitchCeiling, targetPitch, type Density, type Octave } from "./pitch";
import { isVisibleFrom, makeProjection, type ProjectionState } from "./projection";

/** A projection applied to the shapes of a view: plane-space paths, built once per camera target. */
export interface ProjectedScene {
  readonly state: ProjectionState;
  readonly plan: LevelPlan;
  readonly projection: GeoProjection;
  readonly paths: readonly { readonly region: number; readonly path: Path2D }[];
  /** Every ten degrees of latitude and longitude, scored into the sea. */
  readonly graticule: Path2D;
  /** Every drawn region in one path: the clip the terrain is lit inside. */
  readonly land: Path2D;
  /**
   * The United States' own outline, under the states or districts that replace
   * it: the Census borders and Natural Earth's neighbors are different surveys,
   * so without it a sliver of sea shows along Canada and Mexico.
   */
  readonly underlay: Path2D | null;
  readonly centroids: Centroids;
  readonly regionCount: number;
  /** The plane-space zoom at which the whole world fits the viewport: the zoom-level origin. */
  readonly worldK: number;
}

export type ShapesByLayer = ReadonlyMap<LayerName, readonly Shape[]>;

const USA = "USA";

/** d3 draws into anything with the canvas path methods; Path2D has them all but `beginPath`. */
export function pathContext(path: Path2D): GeoContext {
  return {
    beginPath: () => undefined,
    moveTo: (x, y) => path.moveTo(x, y),
    lineTo: (x, y) => path.lineTo(x, y),
    arc: (x, y, radius, start, end) => path.arc(x, y, radius, start, end),
    closePath: () => path.closePath(),
  };
}

function included(table: RegionTable, plan: LevelPlan): Uint8Array {
  const layers = new Set(plan.layers.map((l) => l.layer));
  const mask = new Uint8Array(table.regions.length);
  for (const region of table.regions) {
    const replaced = plan.replacesUsa && region.layer === "world" && region.id === USA;
    mask[region.index] = layers.has(region.layer) && !replaced ? 1 : 0;
  }
  return mask;
}

function projectCentroids(table: RegionTable, mask: Uint8Array, state: ProjectionState, projection: GeoProjection): Centroids {
  const x = new Float64Array(table.regions.length).fill(Number.NaN);
  const y = new Float64Array(table.regions.length).fill(Number.NaN);
  for (const region of table.regions) {
    if (mask[region.index] !== 1 || !isVisibleFrom(state, region.bounds)) continue;
    const point = projection([region.centroid[0], region.centroid[1]]);
    if (!point) continue;
    x[region.index] = point[0];
    y[region.index] = point[1];
  }
  return { x, y };
}

/**
 * Projects every shape of a view into plane-space Path2D objects. A generator
 * so the caller can spread the vertex work over frames (a flight builds its
 * destination this way while the source bitmap is already moving).
 */
export function* projectScene(table: RegionTable, state: ProjectionState, plan: LevelPlan, shapes: ShapesByLayer, viewport: Viewport): Generator<void, ProjectedScene> {
  const projection = makeProjection(state);
  const mask = included(table, plan);
  const paths: { region: number; path: Path2D }[] = [];
  const land = new Path2D();
  let underlay: Path2D | null = null;
  for (const { layer } of plan.layers) {
    for (const shape of shapes.get(layer) ?? []) {
      const region = table.regions[shape.region];
      if (region && plan.replacesUsa && region.layer === "world" && region.id === USA) {
        const geometry = shape.geometry();
        if (geometry) {
          underlay = new Path2D();
          geoPath(projection, pathContext(underlay))(geometry);
          land.addPath(underlay);
        }
        continue;
      }
      if (!region || mask[shape.region] !== 1 || !isVisibleFrom(state, region.bounds)) continue;
      const geometry = shape.geometry();
      if (!geometry) continue;
      const path = new Path2D();
      geoPath(projection, pathContext(path))(geometry);
      paths.push({ region: shape.region, path });
      land.addPath(path);
      yield;
    }
  }
  const graticule = new Path2D();
  geoPath(projection, pathContext(graticule))(geoGraticule10());
  const sphere = geoPath(projection).bounds({ type: "Sphere" });
  const worldK = Math.min(viewport.width / (sphere[1][0] - sphere[0][0]), viewport.height / (sphere[1][1] - sphere[0][1]));
  return { state, plan, projection, paths, graticule, land, underlay, centroids: projectCentroids(table, mask, state, projection), regionCount: table.regions.length, worldK };
}

/** Run a scene generator to completion. */
export function finish<T>(job: Generator<void, T>): T {
  for (;;) {
    const step = job.next();
    if (step.done) return step.value;
  }
}

/** The lattice for one camera: the id buffer, the dots and the plane area they cover. */
export interface Sampled {
  readonly octave: Octave;
  readonly grid: IdGrid;
  readonly dots: Dots;
  readonly covered: Rect;
}

/** Extra plane area sampled on each side, as a share of the viewport, so short pans need no resample. */
const MARGIN = 0.25;

export type BufferCanvas = OffscreenCanvas | HTMLCanvasElement;

export function zoomLevel(scene: ProjectedScene, camera: Affine): number {
  return Math.log2(camera.k / scene.worldK);
}

export function octaveOf(scene: ProjectedScene, camera: Affine, viewport: Viewport, density: Density, dpr: number): Octave {
  const pitch = targetPitch(zoomLevel(scene, camera), Math.min(viewport.width, viewport.height), density);
  return octaveFor(camera.k, pitch, dpr, pitchCeiling(density));
}

function bufferWindow(camera: Affine, viewport: Viewport, cell: number): { i0: number; j0: number; width: number; height: number } {
  const mx = viewport.width * MARGIN;
  const my = viewport.height * MARGIN;
  const i0 = Math.floor((-mx - camera.x) / camera.k / cell);
  const j0 = Math.floor((-my - camera.y) / camera.k / cell);
  const i1 = Math.ceil((viewport.width + mx - camera.x) / camera.k / cell);
  const j1 = Math.ceil((viewport.height + my - camera.y) / camera.k / cell);
  return { i0, j0, width: Math.max(1, i1 - i0 + 1), height: Math.max(1, j1 - j0 + 1) };
}

function renderIds(canvas: BufferCanvas, scene: ProjectedScene, win: { i0: number; j0: number; width: number; height: number }, cell: number): Int32Array {
  if (canvas.width !== win.width || canvas.height !== win.height) {
    canvas.width = win.width;
    canvas.height = win.height;
  }
  const ctx = canvas.getContext("2d", { willReadFrequently: true }) as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null;
  if (!ctx) throw new Error("The id buffer has no 2D context");
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, win.width, win.height);
  ctx.setTransform(1 / cell, 0, 0, 1 / cell, -win.i0 + 0.5, -win.j0 + 0.5);
  for (const { region, path } of scene.paths) {
    ctx.fillStyle = idFill(region);
    ctx.fill(path);
  }
  return decodeBuffer(ctx.getImageData(0, 0, win.width, win.height).data, scene.regionCount);
}

/** Render the id buffer for a camera and turn it into dots, in two steps a caller can put in separate frames. */
export function* sampleSteps(canvas: BufferCanvas, scene: ProjectedScene, camera: Affine, viewport: Viewport, density: Density, dpr: number): Generator<void, Sampled> {
  const octave = octaveOf(scene, camera, viewport, density, dpr);
  const win = bufferWindow(camera, viewport, octave.cell);
  const ids = renderIds(canvas, scene, win, octave.cell);
  yield;
  const grid: IdGrid = { ids, ...win, cell: octave.cell };
  const covered: Rect = {
    x0: (win.i0 - 0.5) * octave.cell,
    y0: (win.j0 - 0.5) * octave.cell,
    x1: (win.i0 + win.width - 0.5) * octave.cell,
    y1: (win.j0 + win.height - 0.5) * octave.cell,
  };
  return { octave, grid, dots: sampleLattice(grid, scene.regionCount, scene.centroids), covered };
}

export function sampleScene(canvas: BufferCanvas, scene: ProjectedScene, camera: Affine, viewport: Viewport, density: Density, dpr: number): Sampled {
  return finish(sampleSteps(canvas, scene, camera, viewport, density, dpr));
}

/** Whether a camera still sits inside what was sampled at the same octave. */
export function stillCovered(sampled: Sampled, scene: ProjectedScene, camera: Affine, viewport: Viewport, density: Density, dpr: number): boolean {
  if (octaveOf(scene, camera, viewport, density, dpr).n !== sampled.octave.n) return false;
  const x0 = -camera.x / camera.k;
  const y0 = -camera.y / camera.k;
  const x1 = (viewport.width - camera.x) / camera.k;
  const y1 = (viewport.height - camera.y) / camera.k;
  const c = sampled.covered;
  return x0 >= c.x0 && y0 >= c.y0 && x1 <= c.x1 && y1 <= c.y1;
}
