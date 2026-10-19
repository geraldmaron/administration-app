import { applyAffine, type Affine, type Viewport } from "./camera";
import { liftedCamera, type DetachFrame } from "./detach";
import type { Sampled, ProjectedScene } from "./scene";
import type { LayerName } from "./data";
import { hatchPattern } from "./hatch";
import { drawBuckets, type Hatch, type Painted } from "./paint";
import type { ReliefImage } from "./relief-layer";
import type { Octave } from "./pitch";
import { SWELL_TILE, swellPattern } from "./sea";

/** Colors the frame draws with beyond the lens: the ground, the selection and its shadow. */
export interface FrameColors {
  readonly ground: string;
  readonly neutral: string;
  readonly land: string;
  readonly border: string;
  /** The light line over the seam, weighted by level so a country edge outranks a state edge and a state edge a district. */
  readonly line: string;
  readonly seaGlow: string;
  readonly coast: string;
  readonly graticule: string;
  readonly selection: string;
  readonly shadow: string;
}

/** What one rest frame needs. */
export interface FrameInput {
  readonly scene: ProjectedScene;
  readonly camera: Affine;
  readonly sampled: Sampled;
  readonly painted: Painted;
  readonly octave: Octave;
  readonly selected: ReadonlySet<number>;
  /** A district detached inside its detached state; empty without a second level. */
  readonly focused: ReadonlySet<number>;
  readonly detach: DetachFrame;
  readonly radiusScale: number;
  /** Each region's layer, by region index: it sets how heavy the region's border line is. */
  readonly layers: readonly LayerName[];
  /** The selected government's provinces, in plane units: drawn on its lifted face. */
  readonly inner?: Path2D;
  /** The view's terrain, if it has been rendered, and how far it has faded in (0..1). */
  readonly relief?: { readonly image: ReliefImage; readonly alpha: number };
}

const TINT_ALPHA = 0.16;
const SELECTION_GLOW_PX = 14;
const OUTLINE_PX = 1.5;
const FOCUS_OUTLINE_PX = 2.5;
const SHADOW_BLUR_PX = 14;
/** The shadow falls below the lifted target by the lift's own distance. */
const SHADOW_DROP_PX = 6;

/** The seam between regions, in screen pixels at any zoom: a dark cut, so regions read as tiles. */
const BORDER_PX = 1.4;
/**
 * The light line drawn down the middle of each seam, by level: a country's
 * edge outranks a state's, and a state's a district's, so the hierarchy reads
 * without a legend. Width in screen pixels, then alpha.
 */
const LINE_WEIGHT: Readonly<Record<LayerName, readonly [number, number]>> = {
  world: [1, 0.5],
  states: [0.8, 0.42],
  districts: [0.55, 0.3],
};
/** How far the selection's edge wall drops below its face, in screen pixels at full lift. */
const WALL_PX = 5;
/** How strongly a lens color sits over the quiet land: nearly full, so the ramp reads at its own strength. */
const FILL_ALPHA = 1;
/** The glow along every coast: a wide soft band and a tight bright one, in screen pixels, drawn under the land so only the sea side shows. */
/** The shelf: a broad pale band where the sea shoals toward land, as on a chart. */
const COAST_SHELF_PX = 28;
const COAST_SHELF_ALPHA = 0.05;
const COAST_WIDE_PX = 9;
const COAST_TIGHT_PX = 2.5;
const COAST_WIDE_ALPHA = 0.12;
const COAST_TIGHT_ALPHA = 0.32;
const GRATICULE_PX = 0.6;
const GRATICULE_ALPHA = 0.55;

/** The sea: the abyss, light pooled toward the middle of the view, and the graticule scored into it. */
function drawSea(ctx: CanvasRenderingContext2D, scene: ProjectedScene, camera: Affine, viewport: Viewport, dpr: number, colors: FrameColors): void {
  const { width, height } = viewport;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = colors.ground;
  ctx.fillRect(0, 0, width, height);
  const glow = ctx.createRadialGradient(width * 0.55, height * 0.45, 0, width * 0.55, height * 0.45, Math.max(width, height) * 0.75);
  glow.addColorStop(0, colors.seaGlow);
  glow.addColorStop(1, colors.ground);
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);
  drawSwell(ctx, camera, viewport, dpr);
  ctx.setTransform(dpr * camera.k, 0, 0, dpr * camera.k, dpr * camera.x, dpr * camera.y);
  ctx.globalAlpha = GRATICULE_ALPHA;
  ctx.strokeStyle = colors.graticule;
  ctx.lineWidth = GRATICULE_PX / camera.k;
  ctx.stroke(scene.graticule);
  ctx.globalAlpha = 1;
}

/** How strongly the swell lies over the abyss: felt rather than seen, so the land stays the subject. */
const SWELL_ALPHA = 0.45;
/** The swell's scale on screen grows a little with zoom, so a close view reads as nearer water without the texture ballooning. */
const SWELL_ZOOM_GAIN = 0.25;

/** The sea's swell, anchored to the plane so it travels with a pan instead of sliding under the land. */
function drawSwell(ctx: CanvasRenderingContext2D, camera: Affine, viewport: Viewport, dpr: number): void {
  const pattern = swellPattern(ctx);
  if (!pattern) return;
  const scale = Math.max(1, camera.k) ** SWELL_ZOOM_GAIN;
  const size = SWELL_TILE * scale;
  const ox = ((camera.x % size) + size) % size;
  const oy = ((camera.y % size) + size) % size;
  ctx.setTransform(dpr * scale, 0, 0, dpr * scale, dpr * (ox - size), dpr * (oy - size));
  ctx.globalAlpha = SWELL_ALPHA;
  ctx.fillStyle = pattern;
  ctx.fillRect(0, 0, viewport.width / scale + 2 * SWELL_TILE, viewport.height / scale + 2 * SWELL_TILE);
  ctx.globalAlpha = 1;
}

/** Light along every coast, drawn before the land covers its inner half. */
function drawCoastGlow(ctx: CanvasRenderingContext2D, paths: readonly Path2D[], camera: Affine, colors: FrameColors, alpha: number): void {
  ctx.strokeStyle = colors.coast;
  ctx.lineJoin = "round";
  for (const [width, strength] of [
    [COAST_SHELF_PX, COAST_SHELF_ALPHA],
    [COAST_WIDE_PX, COAST_WIDE_ALPHA],
    [COAST_TIGHT_PX, COAST_TIGHT_ALPHA],
  ] as const) {
    ctx.globalAlpha = strength * alpha;
    ctx.lineWidth = width / camera.k;
    for (const path of paths) ctx.stroke(path);
  }
  ctx.globalAlpha = 1;
}

/** Fill each drawn region with its ground color, grouped by color so a frame is a few dozen fills, hatch the mixes, then draw the borders. */
function drawGround(ctx: CanvasRenderingContext2D, scene: ProjectedScene, painted: Painted, layers: readonly LayerName[], camera: Affine, dpr: number, colors: FrameColors, skip: ReadonlySet<number>, alpha: number): void {
  const fills = painted.fills;
  if (fills.size === 0) return;
  const byColor = new Map<string, Path2D[]>();
  const drawn: { region: number; path: Path2D }[] = [];
  for (const entry of scene.paths) {
    if (skip.has(entry.region)) continue;
    drawn.push(entry);
    const color = fills.get(entry.region) ?? colors.land;
    const list = byColor.get(color);
    if (list) list.push(entry.path);
    else byColor.set(color, [entry.path]);
  }
  ctx.setTransform(dpr * camera.k, 0, 0, dpr * camera.k, dpr * camera.x, dpr * camera.y);
  drawCoastGlow(ctx, scene.underlay ? [scene.underlay, ...drawn.map((entry) => entry.path)] : drawn.map((entry) => entry.path), camera, colors, alpha);
  ctx.globalAlpha = alpha;
  ctx.fillStyle = colors.land;
  if (scene.underlay) ctx.fill(scene.underlay);
  for (const paths of byColor.values()) for (const path of paths) ctx.fill(path);
  ctx.globalAlpha = alpha * FILL_ALPHA;
  for (const [color, paths] of byColor) {
    if (color === colors.land) continue;
    ctx.fillStyle = color;
    for (const path of paths) ctx.fill(path);
  }
  drawHatches(ctx, drawn, painted.hatches, camera.k, dpr);
  ctx.globalAlpha = alpha;
  drawBorders(ctx, drawn, layers, camera.k, colors, alpha);
  ctx.globalAlpha = 1;
}

/** Bands over each mixed region's majority fill. The context is already in plane units. */
function drawHatches(ctx: CanvasRenderingContext2D, drawn: readonly { region: number; path: Path2D }[], hatches: ReadonlyMap<number, Hatch>, k: number, dpr: number): void {
  if (hatches.size === 0) return;
  for (const { region, path } of drawn) {
    const hatch = hatches.get(region);
    if (!hatch) continue;
    const pattern = hatchPattern(ctx, hatch, k, dpr);
    if (!pattern) continue;
    ctx.fillStyle = pattern;
    ctx.fill(path);
  }
}

/** The dark seam under every edge, then the light line weighted by level: finest first, so a heavier edge is drawn over a lighter one it shares. */
function drawBorders(ctx: CanvasRenderingContext2D, drawn: readonly { region: number; path: Path2D }[], layers: readonly LayerName[], k: number, colors: FrameColors, alpha: number): void {
  ctx.lineJoin = "round";
  ctx.strokeStyle = colors.border;
  ctx.lineWidth = BORDER_PX / k;
  for (const { path } of drawn) ctx.stroke(path);
  ctx.strokeStyle = colors.line;
  for (const layer of ["districts", "states", "world"] as const) {
    const [width, strength] = LINE_WEIGHT[layer];
    ctx.globalAlpha = alpha * strength;
    ctx.lineWidth = width / k;
    for (const { region, path } of drawn) if ((layers[region] ?? "world") === layer) ctx.stroke(path);
  }
  ctx.globalAlpha = alpha;
}

/**
 * Zoom levels over which the terrain fades out: past them the plate is
 * stretched beyond its resolution and draws as a blur, not as ground.
 */
const RELIEF_SHARP_ZOOM = 4.5;
const RELIEF_GONE_ZOOM = 6.5;

/** How much of the terrain a view at this camera draws: all of it until the plate runs out of detail. */
function reliefDepth(scene: ProjectedScene, camera: Affine): number {
  const zoom = Math.log2(camera.k / scene.worldK);
  return Math.min(1, Math.max(0, (RELIEF_GONE_ZOOM - zoom) / (RELIEF_GONE_ZOOM - RELIEF_SHARP_ZOOM)));
}

/** How strongly the terrain lights the fills at full fade: overlay keeps the lens hue and lets the ridges and valleys read through it. */
const RELIEF_ALPHA = 0.75;

/** The terrain, soft-lit over the land fills inside `clip` only: moved from the camera it was rendered for to the camera now. */
function drawRelief(ctx: CanvasRenderingContext2D, clip: Path2D, camera: Affine, dpr: number, relief: { readonly image: ReliefImage; readonly alpha: number }, alpha: number, depth: number): void {
  const { image } = relief;
  if (depth <= 0) return;
  const s = camera.k / image.camera.k;
  const tx = camera.x - image.camera.x * s;
  const ty = camera.y - image.camera.y * s;
  ctx.save();
  ctx.setTransform(dpr * camera.k, 0, 0, dpr * camera.k, dpr * camera.x, dpr * camera.y);
  ctx.clip(clip);
  ctx.setTransform((dpr * s) / image.scale, 0, 0, (dpr * s) / image.scale, dpr * tx, dpr * ty);
  ctx.globalCompositeOperation = "overlay";
  ctx.globalAlpha = RELIEF_ALPHA * relief.alpha * alpha * depth;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(image.canvas, 0, 0);
  ctx.restore();
}

/** The selection's screen centroid: the mean of its regions' projected centroids. */
export function selectionCentroid(scene: ProjectedScene, camera: Affine, selected: ReadonlySet<number>): readonly [number, number] | null {
  let sx = 0;
  let sy = 0;
  let n = 0;
  for (const r of selected) {
    const x = scene.centroids.x[r] ?? Number.NaN;
    const y = scene.centroids.y[r] ?? Number.NaN;
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    sx += x;
    sy += y;
    n++;
  }
  return n === 0 ? null : applyAffine(camera, sx / n, sy / n);
}

function unionOf(paths: readonly Path2D[]): Path2D {
  const union = new Path2D();
  for (const path of paths) union.addPath(path);
  return union;
}

function selectedPaths(scene: ProjectedScene, selected: ReadonlySet<number>): readonly Path2D[] {
  return scene.paths.filter((entry) => selected.has(entry.region)).map((entry) => entry.path);
}

/** The second level's heavier outline, so the chosen district reads apart from its state's other lines. */
function drawFocus(ctx: CanvasRenderingContext2D, paths: readonly Path2D[], lifted: Affine, dpr: number, colors: FrameColors, progress: number): void {
  ctx.setTransform(dpr * lifted.k, 0, 0, dpr * lifted.k, dpr * lifted.x, dpr * lifted.y);
  ctx.globalAlpha = TINT_ALPHA * 1.5 * progress;
  ctx.fillStyle = colors.selection;
  for (const path of paths) ctx.fill(path);
  ctx.globalAlpha = progress;
  ctx.strokeStyle = colors.selection;
  ctx.lineWidth = FOCUS_OUTLINE_PX / lifted.k;
  ctx.lineJoin = "round";
  for (const path of paths) ctx.stroke(path);
  ctx.globalAlpha = 1;
}

/** The shadow the lifted piece casts on the table, drawn first so the wall and the face stand on it. */
function drawShadow(ctx: CanvasRenderingContext2D, paths: readonly Path2D[], lifted: Affine, dpr: number, colors: FrameColors, progress: number): void {
  ctx.setTransform(dpr * lifted.k, 0, 0, dpr * lifted.k, dpr * lifted.x, dpr * lifted.y);
  ctx.save();
  ctx.shadowColor = colors.shadow;
  ctx.shadowBlur = SHADOW_BLUR_PX * dpr * progress;
  ctx.shadowOffsetY = SHADOW_DROP_PX * dpr * progress;
  ctx.globalAlpha = progress;
  ctx.fillStyle = colors.border;
  for (const path of paths) ctx.fill(path);
  ctx.restore();
  ctx.globalAlpha = 1;
}

/**
 * The piece's edge: its outline stacked a pixel at a time from the table up to
 * the face, in the seam's dark, so the selection reads as a block lifted off
 * the board rather than a texture painted on it.
 */
function drawWall(ctx: CanvasRenderingContext2D, paths: readonly Path2D[], lifted: Affine, dpr: number, colors: FrameColors, progress: number): void {
  const depth = Math.round(WALL_PX * progress);
  ctx.fillStyle = colors.border;
  ctx.globalAlpha = 0.92;
  for (let drop = depth; drop >= 1; drop--) {
    ctx.setTransform(dpr * lifted.k, 0, 0, dpr * lifted.k, dpr * lifted.x, dpr * (lifted.y + drop));
    for (const path of paths) ctx.fill(path);
  }
  ctx.globalAlpha = 1;
}

/** The face: each selected region in its full lens color and its hatch, with the lines between its parts (a state's districts). */
function drawFace(ctx: CanvasRenderingContext2D, scene: ProjectedScene, painted: Painted, layers: readonly LayerName[], selected: ReadonlySet<number>, lifted: Affine, dpr: number, colors: FrameColors, inner?: Path2D): void {
  ctx.setTransform(dpr * lifted.k, 0, 0, dpr * lifted.k, dpr * lifted.x, dpr * lifted.y);
  const face = scene.paths.filter((entry) => selected.has(entry.region));
  ctx.fillStyle = colors.land;
  for (const { path } of face) ctx.fill(path);
  for (const { region, path } of face) {
    ctx.fillStyle = painted.fills.get(region) ?? colors.land;
    ctx.fill(path);
  }
  drawHatches(ctx, face, painted.hatches, lifted.k, dpr);
  ctx.globalAlpha = TINT_ALPHA;
  ctx.fillStyle = colors.selection;
  for (const { path } of face) ctx.fill(path);
  ctx.globalAlpha = 1;
  if (face.length > 1) drawBorders(ctx, face, layers, lifted.k, colors, 1);
  if (inner) drawInner(ctx, face, inner, lifted.k, colors);
}

/** A government's provinces on its face: a seam and a light line at a state's weight, clipped to the face so no line runs out to sea. */
function drawInner(ctx: CanvasRenderingContext2D, face: readonly { region: number; path: Path2D }[], inner: Path2D, k: number, colors: FrameColors): void {
  ctx.save();
  ctx.clip(unionOf(face.map((entry) => entry.path)));
  ctx.lineJoin = "round";
  ctx.strokeStyle = colors.border;
  ctx.lineWidth = BORDER_PX / k;
  ctx.globalAlpha = 0.7;
  ctx.stroke(inner);
  const [width, strength] = LINE_WEIGHT.states;
  ctx.strokeStyle = colors.line;
  ctx.lineWidth = width / k;
  ctx.globalAlpha = strength;
  ctx.stroke(inner);
  ctx.restore();
}

/** The lifted piece's crisp outline, glowing, so it reads as lit from the table, not cut out of it. */
function drawOutline(ctx: CanvasRenderingContext2D, paths: readonly Path2D[], lifted: Affine, dpr: number, colors: FrameColors, progress: number): void {
  ctx.setTransform(dpr * lifted.k, 0, 0, dpr * lifted.k, dpr * lifted.x, dpr * lifted.y);
  ctx.globalAlpha = progress;
  ctx.strokeStyle = colors.selection;
  ctx.lineWidth = OUTLINE_PX / lifted.k;
  ctx.lineJoin = "round";
  ctx.save();
  ctx.shadowColor = colors.selection;
  ctx.shadowBlur = SELECTION_GLOW_PX * dpr * progress;
  for (const path of paths) ctx.stroke(path);
  ctx.restore();
  ctx.globalAlpha = 1;
}

/** The selection lifted off the board: shadow, edge wall, face, outline, then a second level's heavier outline. */
function drawLifted(ctx: CanvasRenderingContext2D, input: FrameInput, lifted: Affine, dpr: number, colors: FrameColors): void {
  const { scene, painted, selected, detach } = input;
  const paths = selectedPaths(scene, selected);
  const progress = detach.progress;
  if (progress > 0) {
    drawShadow(ctx, paths, lifted, dpr, colors, progress);
    drawWall(ctx, paths, lifted, dpr, colors, progress);
  }
  drawFace(ctx, scene, painted, input.layers, selected, lifted, dpr, colors, input.inner);
  // The face covers the ground's terrain, so the piece the player is looking at is lit again with the lift's own transform.
  if (input.relief) drawRelief(ctx, unionOf(paths), lifted, dpr, input.relief, 1, reliefDepth(scene, input.camera));
  if (progress > 0) drawOutline(ctx, paths, lifted, dpr, colors, progress);
  if (input.focused.size > 0 && progress > 0) drawFocus(ctx, selectedPaths(scene, input.focused), lifted, dpr, colors, progress);
}

/** The title globe's dots: every region dotted, the selection's dots lifted over the rest. */
function drawDotted(ctx: CanvasRenderingContext2D, input: FrameInput, viewport: Viewport, dpr: number, colors: FrameColors, restAlpha: number): void {
  const { scene, camera, sampled, painted, octave, selected, detach } = input;
  const dotOctave = { ...octave, n: sampled.octave.n };
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  drawBuckets(ctx, sampled.dots, painted.buckets, camera, viewport, dotOctave, { radiusScale: input.radiusScale, alpha: restAlpha });
  if (selected.size === 0 || painted.lifted.length === 0) return;
  const centroid = selectionCentroid(scene, camera, selected);
  const lifted = centroid ? liftedCamera(camera, centroid, detach) : camera;
  if (detach.progress > 0) drawOutline(ctx, selectedPaths(scene, selected), lifted, dpr, colors, detach.progress);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  drawBuckets(ctx, sampled.dots, painted.lifted, lifted, viewport, dotOctave, { radiusScale: input.radiusScale, alpha: 1 });
}

/** Draw one rest frame: the sea, the filled ground with its terrain, and the selection lifted over the faded rest. */
export function drawFrame(ctx: CanvasRenderingContext2D, input: FrameInput, viewport: Viewport, dpr: number, colors: FrameColors): void {
  const { scene, camera, painted, selected, detach } = input;
  drawSea(ctx, scene, camera, viewport, dpr, colors);
  const restAlpha = selected.size > 0 ? detach.othersAlpha : 1;
  if (painted.fills.size === 0) {
    drawDotted(ctx, input, viewport, dpr, colors, restAlpha);
    return;
  }
  drawGround(ctx, scene, painted, input.layers, camera, dpr, colors, selected, restAlpha);
  if (input.relief) drawRelief(ctx, scene.land, camera, dpr, input.relief, restAlpha, reliefDepth(scene, camera));
  if (selected.size === 0) return;
  const centroid = selectionCentroid(scene, camera, selected);
  drawLifted(ctx, input, centroid ? liftedCamera(camera, centroid, detach) : camera, dpr, colors);
}

/** Lay a fading snapshot of the previous frame over the new one: the recolor crossfade. */
export function drawCrossfade(ctx: CanvasRenderingContext2D, snapshot: HTMLCanvasElement, alpha: number): void {
  if (alpha <= 0) return;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = alpha;
  ctx.drawImage(snapshot, 0, 0);
  ctx.globalAlpha = 1;
}
