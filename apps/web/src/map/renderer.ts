import { geoDistance } from "d3-geo";
import { applyAffine, invertAffine, type Affine, type Rect, type Viewport } from "./camera";
import { loadShapes, prefetchLazyLevels, regionLayers, type LayerName, type Region, type RegionTable, type Shape } from "./data";
import { AT_REST, detachFrame, finerLevel, focusedRegions, liftedRegions, selectionLevel, type DetachFrame } from "./detach";
import { flightFrame, flightPoint, planFlight, type FlightFrame, type FlightPlan } from "./flight";
import { drawCrossfade, drawFrame, type FrameColors } from "./frame-draw";
import { NO_REGION } from "./id-color";
import { planLevels, type LensLevel, type LevelPlan } from "./levels";
import { chooseMotion, isLongMove, type CameraMotion } from "./motion";
import { paint, type Lens, type Painted } from "./paint";
import { pickRegion } from "./picking";
import { ProvinceLayer } from "./provinces";
import { recenteredView } from "./recenter";
import { ReliefLayer } from "./relief-layer";
import type { Density } from "./pitch";
import { boundsExtent, makeProjection, PLANE_SCALE } from "./projection";
import { bindInput } from "./renderer-input";
import { finish, octaveOf, projectScene, sampleSteps, sampleScene, stillCovered, zoomLevel, type ProjectedScene, type Sampled, type ShapesByLayer } from "./scene";
import { FrameLog, type FramePhase } from "./stats";
import { MAP_FIRST_PAINT_MARK } from "./view";
import { crossesSeam, frameTarget, fullArea, projectionFor, screenRectOf, type CameraTarget } from "./target";

/** Main-thread budget per frame for background work (projection, sampling), ms. */
const JOB_BUDGET_MS = 6;
/** The title screen's turn, degrees of longitude a second, and how often the projection is rebuilt under it. */
const TURN_DEG_PER_SEC = 1.5;
const TURN_REBUILD_MS = 4000;
const TURN_CROSSFADE_MS = 600;
/** How long the camera must be still before a tilted view is re-centered, and the crossfade that swaps it. */
const RECENTER_IDLE_MS = 350;
const RECENTER_CROSSFADE_MS = 250;
/** How long a re-center waits for its terrain before swapping without it. */
const RECENTER_RELIEF_WAIT_MS = 900;
/** A move to a target split by the current view's seam crossfades instead of flying. */
const SEAM_CROSSFADE_MS = 450;
/** Natural Earth's x per radian of longitude at the equator, the rate the turning pan matches. */
const NATURAL_EARTH_EQUATOR = 0.8707;


export type MapColors = FrameColors;

export interface RendererOptions {
  readonly table: RegionTable;
  readonly colors: MapColors;
  readonly lens: Lens;
  readonly density: Density;
  readonly highContrast?: boolean;
  /** An inset draws one fixed view: no pan, no zoom, no hover. */
  readonly interactive?: boolean;
  /** Build every view in frame-budget slices, never in one task: the insets, which appear while the main map is busy. */
  readonly sliced?: boolean;
  /** Fetch the lazy levels once the first frame is up. One renderer per page does it. */
  readonly prefetch?: boolean;
  readonly onHover?: (region: Region | null, x: number, y: number) => void;
  readonly onSelect?: (region: Region) => void;
  /** A click on open sea: the shell closes a detail layer with it. */
  readonly onEmpty?: () => void;
  readonly onLanded?: (target: CameraTarget) => void;
  /** After any frame that moved the camera or changed what is drawn: marks re-project here. */
  readonly onView?: () => void;
}

interface Live {
  readonly target: CameraTarget;
  readonly scene: ProjectedScene;
  readonly camera: Affine;
  readonly sampled: Sampled;
  readonly painted: Painted;
  readonly rest: boolean;
  /** The paint version its dots were colored under; a landing recolors only when it is stale. */
  readonly paintVersion: number;
}

interface Flight {
  readonly plan: FlightPlan;
  readonly start: number;
  readonly source: HTMLCanvasElement;
  readonly target: CameraTarget;
  readonly job: Generator<void, Live>;
  dest: Live | null;
  bitmap: HTMLCanvasElement | null;
}

interface Tween {
  readonly start: number;
  readonly duration: number;
}

type Job = Generator<void, Live>;

function makeCanvas(width: number, height: number): HTMLCanvasElement {
  return Object.assign(document.createElement("canvas"), { width, height });
}

function context(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("The map canvas has no 2D context");
  return ctx;
}

/** Advance a job until the frame budget is spent; the finished value, or null. */
function advance<T>(job: Generator<void, T>, deadline: number): T | null {
  while (performance.now() < deadline) {
    const step = job.next();
    if (step.done) return step.value;
  }
  return null;
}

/** A lon/lat through one built view at rest: its projection, then its camera. */
function projectOn(live: Live, lon: number, lat: number): readonly [number, number] | null {
  const { scene, camera } = live;
  if (scene.state.blend > 0.3 && geoDistance([scene.state.lon, scene.state.lat], [lon, lat]) > Math.PI / 2) return null;
  const point = scene.projection([lon, lat]);
  return point ? applyAffine(camera, point[0], point[1]) : null;
}

function tweenProgress(tween: Tween | null, now: number): number {
  if (!tween) return 1;
  return tween.duration <= 0 ? 1 : Math.min(1, (now - tween.start) / tween.duration);
}

/**
 * The dotted map: a runtime-projected canvas. At rest it draws dots from a
 * plane-anchored lattice sampled through an id buffer; in flight it moves two
 * cached bitmaps and never re-projects; on landing it re-projects at the
 * rest level of detail in the background and swaps.
 */
export class MapRenderer {
  readonly log = new FrameLog();
  private readonly ctx: CanvasRenderingContext2D;
  private readonly idCanvas = document.createElement("canvas");
  private viewport: Viewport = { width: 1, height: 1 };
  private area: Rect | null = null;
  private dpr = 1;
  private lens: Lens;
  private density: Density;
  private highContrast: boolean;
  private colors: MapColors;
  private selected: ReadonlySet<number> = new Set();
  private focused: ReadonlySet<number> = new Set();
  private selectionNeeds: LensLevel = "nation";
  private detach: { from: number; to: number; tween: Tween } | null = null;
  private crossfade: { snapshot: HTMLCanvasElement; tween: Tween } | null = null;
  private live: Live | null = null;
  private flight: Flight | null = null;
  /** The flight frame last drawn, so marks project through exactly the transform on screen. */
  private flightView: FlightFrame | null = null;
  private upgrade: Job | null = null;
  private paused = false;
  private turning: { last: number; sinceRebuild: number; job: Job | "loading" | null; shiftAtStart: number; shift: number } | null = null;
  /** Bumped by every camera move; a move that finds it changed after loading its shapes was overtaken and stops. */
  private moveSeq = 0;
  /** Bumped by anything that changes how dots are colored: lens, selection, palette. */
  private paintVersion = 0;
  private lastPaintVersion = 0;
  private frameRequest = 0;
  private lastFrame = 0;
  private phase: FramePhase = "idle";
  private dirty = false;
  private dragging = false;
  private firstPaint: number | null = null;
  private readonly cleanup: (() => void)[] = [];
  private readonly relief = new ReliefLayer();
  /** The selected government's provinces: inner lines on its lifted face, and names for the label layer. */
  readonly provinces = new ProvinceLayer(() => this.markDirty("settle"));
  private recenterTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly options: RendererOptions,
  ) {
    this.ctx = context(canvas);
    this.lens = options.lens;
    this.density = options.density;
    this.highContrast = options.highContrast ?? false;
    this.colors = options.colors;
    if (options.interactive !== false) this.cleanup.push(bindInput(canvas, this.inputTarget()));
  }

  get firstPaintMs(): number | null {
    return this.firstPaint;
  }

  get current(): { target: CameraTarget; plan: LevelPlan; rest: boolean; zoom: number; dots: number; pitch: number; drawnPitch: number; fade: number } | null {
    if (!this.live) return null;
    const { scene, camera, sampled } = this.live;
    const octave = octaveOf(scene, camera, this.viewport, this.density, this.dpr);
    return { target: this.live.target, plan: scene.plan, rest: this.live.rest, zoom: camera.k / scene.worldK, dots: sampled.dots.count, pitch: octave.pitchA, drawnPitch: octave.pitch, fade: octave.fadeB };
  }

  /** The camera target framed now, or null before the first frame. */
  get target(): CameraTarget | null {
    return this.flight?.target ?? this.live?.target ?? null;
  }

  /** Whether the dots are moving as bitmaps: marks ride along but take no clicks until the camera lands. */
  get moving(): boolean {
    return this.flight !== null;
  }

  /** The selected regions by index, which the label layer names first and lifts with the piece. */
  get selection(): ReadonlySet<number> {
    return this.selected;
  }

  get viewportSize(): Viewport {
    return this.viewport;
  }

  /** Zoom levels above the world-fit zoom: 0 is the whole world in view. */
  get zoomLevel(): number {
    return this.live ? zoomLevel(this.live.scene, this.live.camera) : 0;
  }

  resize(width: number, height: number, dpr: number): void {
    this.viewport = { width, height };
    this.dpr = dpr;
    this.canvas.width = Math.round(width * dpr);
    this.canvas.height = Math.round(height * dpr);
    // A resize mid-flight lands where the flight was going, not back where it took off.
    const target = this.flight?.target ?? this.live?.target;
    if (target) void this.jumpTo(target);
  }

  /** The part of the canvas the shell leaves uncovered; framing happens inside it. */
  setArea(area: Rect | null): void {
    this.area = area;
  }

  destroy(): void {
    this.cancelRecenter();
    this.relief.destroy();
    cancelAnimationFrame(this.frameRequest);
    this.frameRequest = 0;
    for (const undo of this.cleanup) undo();
  }

  /** Frame a target under the motion rules: Cut and reduced motion jump, short moves are quick, Fly flies a long one. */
  async show(target: CameraTarget, setting: CameraMotion, reducedMotion: boolean): Promise<void> {
    if (!this.live || setting === "cut" || reducedMotion || this.paused) return this.jumpTo(target);
    const projection = makeProjection(projectionFor(target));
    const destCamera = frameTarget(projection, target, this.viewport, this.visibleArea());
    const to = screenRectOf(projection, destCamera, target.bounds);
    const long = !to || isLongMove(this.currentScreenRect(target), to, this.visibleArea());
    const motion = chooseMotion(setting, reducedMotion, long);
    if (motion.kind === "cut") return this.jumpTo(target);
    return this.flyTo(target, motion.maxDuration);
  }

  /** Frame a target with no flight: the cold start and the Cut camera setting. */
  async jumpTo(target: CameraTarget): Promise<void> {
    this.cancelRecenter();
    const seq = ++this.moveSeq;
    const plan = this.levelsFor(target, false);
    const shapes = await this.shapesFor(plan);
    if (seq !== this.moveSeq) return;
    this.flight = null;
    this.flightView = null;
    this.upgrade = null;
    this.resetTurn();
    if (this.options.sliced && !this.paused) {
      this.upgrade = this.buildLive(target, plan, shapes, true);
      this.markDirty("settle");
      return;
    }
    this.live = finish(this.buildLive(target, plan, shapes, true));
    this.markDirty("settle");
    this.options.onLanded?.(target);
    this.scheduleRecenter();
  }

  async flyTo(target: CameraTarget, maxDuration?: number): Promise<void> {
    this.cancelRecenter();
    if (!this.live) return this.jumpTo(target);
    if (crossesSeam(target.bounds, this.live.scene.state.lon)) {
      // Drawn here, the target sits on both edges of the map at once: there is no honest path to fly, so the view crossfades.
      this.startCrossfade(SEAM_CROSSFADE_MS);
      return this.jumpTo(target);
    }
    const seq = ++this.moveSeq;
    const motion = this.levelsFor(target, true);
    const shapes = await this.shapesFor(motion);
    if (seq !== this.moveSeq || !this.live) return;
    void this.shapesFor(this.levelsFor(target, false));
    const projection = makeProjection(projectionFor(target));
    const destCamera = frameTarget(projection, target, this.viewport, this.visibleArea());
    const job = this.buildLive(target, motion, shapes, false, destCamera);
    // The destination's terrain is asked for at take-off, so it is there when the flight lands.
    this.relief.ensure(projectionFor(target), destCamera, this.viewport);
    const from = this.currentScreenRect(target);
    const to = screenRectOf(projection, destCamera, target.bounds);
    const plan = planFlight(from ?? this.centerRect(), to ?? this.centerRect(), this.viewport, maxDuration);
    this.flight = { plan, start: performance.now(), source: this.snapshot(), target, job, dest: null, bitmap: null };
    this.upgrade = null;
    this.resetTurn();
    this.markDirty("flight");
  }

  /** Swap the lens, crossfading from the old colors over `recolorMs` (0 is instant). */
  setLens(lens: Lens, recolorMs: number): void {
    const levelChanged = lens.level !== this.lens.level;
    this.lens = lens;
    this.paintVersion++;
    this.startCrossfade(recolorMs);
    if (!this.live) return;
    if (levelChanged && this.replan()) return;
    this.repaint();
  }

  /** Detach a set of regions over `durationMs`; an empty set reattaches. */
  setSelection(regions: readonly Region[], durationMs: number): void {
    const next = new Set(liftedRegions(this.options.table, regions).map((region) => region.index));
    const focus = new Set(focusedRegions(regions).map((region) => region.index));
    const sameFocus = focus.size === this.focused.size && [...focus].every((r) => this.focused.has(r));
    if (next.size === this.selected.size && [...next].every((r) => this.selected.has(r))) {
      // The same state with another district (or none) detached inside it: the lift stays, only the second level changes.
      if (sameFocus) return;
      this.focused = focus;
      this.paintVersion++;
      this.repaint();
      return;
    }
    this.focused = focus;
    const now = performance.now();
    if (next.size === 0) {
      this.detach = { from: this.detachProgress(now), to: 0, tween: { start: now, duration: durationMs } };
      if (durationMs <= 0) this.clearSelection();
      else this.markDirty("settle");
      return;
    }
    this.selected = next;
    this.paintVersion++;
    this.selectionNeeds = selectionLevel(regions);
    this.detach = { from: 0, to: 1, tween: { start: now, duration: durationMs } };
    if (!this.replan()) this.repaint();
  }

  setDensity(density: Density): void {
    this.density = density;
    if (this.live) this.resample(this.live.camera);
  }

  /** High contrast and palette changes: new colors, thicker dots, a lighter detach fade. */
  setStyle(colors: MapColors, highContrast: boolean): void {
    if (colors === this.colors && highContrast === this.highContrast) return;
    this.colors = colors;
    this.paintVersion++;
    this.highContrast = highContrast;
    this.repaint();
  }

  /**
   * A workspace screen pauses the map: no motion, no animated recolor, no
   * input. The still frame stays honest: a framing, selection or color change
   * while paused lands at once as one new still frame (a founding that names
   * a home state lights it), and a flight under way when the pause arrives
   * lands where it was going.
   */
  setPaused(paused: boolean): void {
    this.paused = paused;
    if (paused) this.drawStill();
    else this.markDirty("idle");
  }

  /** The title screen's slow turn. */
  setTurning(on: boolean): void {
    if (on === (this.turning !== null)) return;
    this.turning = on ? { last: 0, sinceRebuild: 0, job: null, shiftAtStart: 0, shift: 0 } : null;
    // The turning globe is dotted all over; every other view fills its ground.
    this.paintVersion++;
    if (this.live) this.repaint();
    else if (on) this.markDirty("idle");
  }

  /** A lon/lat on screen as drawn now (mid-flight included), or null when it is off the drawn hemisphere or the map is not up. */
  project(lon: number, lat: number): readonly [number, number] | null {
    if (!this.live) return null;
    const flight = this.flight;
    if (!flight || !this.flightView) return projectOn(this.live, lon, lat);
    const dest = flight.bitmap && flight.dest ? projectOn(flight.dest, lon, lat) : null;
    return flightPoint(this.flightView, projectOn(this.live, lon, lat), dest, flight.bitmap !== null);
  }

  /** The region under a screen point, or null over sea or mid-flight. */
  regionAt(sx: number, sy: number): Region | null {
    if (!this.live || this.flight || !Number.isFinite(sx)) return null;
    const { camera, sampled } = this.live;
    const [x, y] = invertAffine(camera, sx, sy);
    const index = pickRegion(sampled.grid, sampled.dots, x, y, camera.k);
    return index === NO_REGION ? null : (this.options.table.regions[index] ?? null);
  }

  /** A region's centroid on screen, for a tooltip or a keyboard cursor. */
  regionPoint(region: Region): readonly [number, number] | null {
    return this.project(region.centroid[0], region.centroid[1]);
  }

  /**
   * Rebuild the view when the lens or selection needs another level drawn.
   * Mid-flight nothing is rebuilt: the landing's rest build reads the new level.
   */
  private replan(): boolean {
    if (this.flight) return true;
    if (!this.live || this.planLevel(this.live.target) === this.live.scene.plan.effective) return false;
    void this.jumpTo(this.live.target);
    return true;
  }

  private visibleArea(): Rect {
    return this.area ?? fullArea(this.viewport);
  }

  private planLevel(target: CameraTarget): LensLevel {
    return planLevels(finerLevel(this.lens.level, this.selectionNeeds), boundsExtent(target.bounds), false).effective;
  }

  private levelsFor(target: CameraTarget, motion: boolean): LevelPlan {
    return planLevels(finerLevel(this.lens.level, this.selectionNeeds), boundsExtent(target.bounds), motion);
  }

  private async shapesFor(plan: LevelPlan): Promise<ShapesByLayer> {
    const loaded = await Promise.all(plan.layers.map(async ({ layer, lod }) => [layer, await loadShapes(this.options.table, layer, lod)] as const));
    return new Map<LayerName, readonly Shape[]>(loaded);
  }

  private paintFor(sampled: Sampled, scene: ProjectedScene): Painted {
    const plan = scene.plan;
    this.lastPaintVersion = this.paintVersion;
    const drawn = scene.paths.map((entry) => entry.region);
    return paint(sampled.dots, this.options.table.regions, this.lens, plan.effective, this.colors.neutral, {
      selected: this.selected,
      focused: this.focused,
      filled: this.turning === null,
      drawn,
      land: this.colors.land,
    });
  }

  private *buildLive(target: CameraTarget, plan: LevelPlan, shapes: ShapesByLayer, rest: boolean, camera?: Affine): Generator<void, Live> {
    const scene: ProjectedScene = yield* projectScene(this.options.table, projectionFor(target), plan, shapes, this.viewport);
    const framed = camera ?? frameTarget(scene.projection, target, this.viewport, this.visibleArea());
    yield;
    const sampled = yield* sampleSteps(this.idCanvas, scene, framed, this.viewport, this.density, this.dpr);
    yield;
    const painted = this.paintFor(sampled, scene);
    return { target, scene, camera: framed, sampled, painted, rest, paintVersion: this.lastPaintVersion };
  }

  private repaint(): void {
    if (!this.live) return;
    this.live = { ...this.live, painted: this.paintFor(this.live.sampled, this.live.scene), paintVersion: this.paintVersion };
    this.markDirty("settle");
  }

  private centerRect(): Rect {
    const { width, height } = this.viewport;
    return { x0: width * 0.45, y0: height * 0.45, x1: width * 0.55, y1: height * 0.55 };
  }

  /** Where a target sits on the screen as currently drawn, mid-flight included. */
  private currentScreenRect(target: CameraTarget): Rect | null {
    if (!this.live) return null;
    const rect = screenRectOf(this.live.scene.projection, this.live.camera, target.bounds);
    if (!rect || !this.flight) return rect;
    const { source } = flightFrame(this.flight.plan, performance.now() - this.flight.start);
    return { x0: rect.x0 * source.k + source.x, y0: rect.y0 * source.k + source.y, x1: rect.x1 * source.k + source.x, y1: rect.y1 * source.k + source.y };
  }

  private snapshot(): HTMLCanvasElement {
    const copy = makeCanvas(this.canvas.width, this.canvas.height);
    context(copy).drawImage(this.canvas, 0, 0);
    return copy;
  }

  private startCrossfade(durationMs: number): void {
    if (durationMs <= 0 || !this.live || this.paused) {
      this.crossfade = null;
      return;
    }
    this.crossfade = { snapshot: this.snapshot(), tween: { start: performance.now(), duration: durationMs } };
  }

  private detachProgress(now: number): number {
    if (!this.detach) return this.selected.size > 0 ? 1 : 0;
    const { from, to, tween } = this.detach;
    return from + (to - from) * tweenProgress(tween, now);
  }

  private detachNow(now: number): DetachFrame {
    if (this.selected.size === 0) return AT_REST;
    return detachFrame(this.detachProgress(now), this.highContrast);
  }

  private markDirty(phase: FramePhase): void {
    this.phase = phase;
    this.dirty = true;
    if (this.paused) this.drawStill();
    else if (this.frameRequest === 0) this.frameRequest = requestAnimationFrame(this.frame);
  }

  /** The paused map's one frame: any flight, rebuild, detach or crossfade finished at once, then drawn. */
  private drawStill(): void {
    if (this.flight) return this.land(this.flight);
    if (this.upgrade) {
      const done = finish(this.upgrade);
      this.upgrade = null;
      this.live = done;
      this.options.onLanded?.(done.target);
    }
    this.crossfade = null;
    const clearing = this.detach?.to === 0;
    this.detach = null;
    if (clearing) return this.clearSelection();
    if (!this.live) return;
    this.draw(performance.now());
    this.dirty = false;
  }

  private readonly frame = (now: number): void => {
    this.frameRequest = 0;
    if (this.paused) return;
    const start = performance.now();
    const phase = this.phase;
    const keepGoing = this.flight ? this.stepFlight(start) : this.stepLive(start);
    const work = performance.now() - start;
    if (this.lastFrame > 0) this.log.push({ interval: now - this.lastFrame, work, phase });
    this.lastFrame = keepGoing ? now : 0;
    if ((keepGoing || this.dirty) && this.frameRequest === 0) this.frameRequest = requestAnimationFrame(this.frame);
  };

  private animating(now: number): boolean {
    const detaching = this.detach !== null && tweenProgress(this.detach.tween, now) < 1;
    const fading = this.crossfade !== null && tweenProgress(this.crossfade.tween, now) < 1;
    return detaching || fading;
  }

  private stepLive(start: number): boolean {
    if (this.upgrade) this.stepUpgrade(start);
    if (this.live && !this.dragging && !this.turning) this.relief.ensure(this.live.scene.state, this.live.camera, this.viewport);
    if (this.turning && !this.dragging && !this.upgrade) this.stepTurn(start);
    if (this.animating(start)) this.dirty = true;
    // A tween that ended since the last frame still needs its final frame drawn,
    // or the canvas keeps the last in-between one: a faint ghost of the old lens.
    if (this.settleTweens(start)) this.dirty = true;
    if (this.dirty) {
      this.draw(start);
      this.dirty = false;
    }
    return this.upgrade !== null || this.dragging || this.turning !== null || this.relief.fading(start) || this.animating(start);
  }

  /** Drop finished tweens; true when one ended, so the caller draws the settled frame. */
  private settleTweens(now: number): boolean {
    let settled = false;
    if (this.detach && tweenProgress(this.detach.tween, now) >= 1) {
      if (this.detach.to === 0) this.clearSelection();
      this.detach = null;
      settled = true;
    }
    if (this.crossfade && tweenProgress(this.crossfade.tween, now) >= 1) {
      this.crossfade = null;
      settled = true;
    }
    return settled;
  }

  private clearSelection(): void {
    this.selected = new Set();
    this.focused = new Set();
    this.paintVersion++;
    this.selectionNeeds = "nation";
    this.repaint();
  }

  private stepUpgrade(start: number): void {
    const upgrade = this.upgrade;
    if (!upgrade) return;
    const done = advance(upgrade, start + JOB_BUDGET_MS);
    if (!done) return;
    this.upgrade = null;
    const camera = this.live?.camera ?? done.camera;
    this.live = done;
    this.dirty = true;
    if (camera !== done.camera) this.resample(camera);
    this.options.onLanded?.(done.target);
    this.scheduleRecenter();
  }

  /** Pan the world at the turning rate, and every few seconds rebuild the projection a few degrees on and crossfade to it. */
  private stepTurn(now: number): void {
    const turn = this.turning;
    const live = this.live;
    if (!turn || !live || this.flight) return;
    const dt = turn.last > 0 ? Math.min(100, now - turn.last) : 0;
    const px = ((TURN_DEG_PER_SEC * dt) / 1000) * (Math.PI / 180) * NATURAL_EARTH_EQUATOR * PLANE_SCALE * live.camera.k;
    this.turning = { ...turn, last: now, sinceRebuild: turn.sinceRebuild + dt, shift: turn.shift + px };
    this.moveCamera({ ...live.camera, x: live.camera.x + px }, "idle");
    const current = this.turning;
    if (current.job === null && current.sinceRebuild >= TURN_REBUILD_MS) {
      const degrees = (current.sinceRebuild / 1000) * TURN_DEG_PER_SEC;
      const [lon, lat] = live.target.focus ?? [0, 0];
      const target: CameraTarget = { ...live.target, focus: [((lon - degrees + 540) % 360) - 180, lat] };
      const plan = live.scene.plan;
      this.turning = { ...current, sinceRebuild: 0, job: "loading", shiftAtStart: current.shift };
      void this.shapesFor(plan).then((shapes) => {
        if (this.turning?.job === "loading" && this.live === live) this.turning = { ...this.turning, job: this.buildLive(target, plan, shapes, true) };
      });
      return;
    }
    if (current.job !== null && current.job !== "loading") this.stepTurnJob(now, current.job);
  }

  private resetTurn(): void {
    if (this.turning) this.turning = { last: 0, sinceRebuild: 0, job: null, shiftAtStart: 0, shift: 0 };
  }

  private stepTurnJob(now: number, job: Job): void {
    const turn = this.turning;
    if (!turn) return;
    const done = advance(job, now + JOB_BUDGET_MS);
    if (!done) return;
    const moved = turn.shift - turn.shiftAtStart;
    this.startCrossfade(TURN_CROSSFADE_MS);
    this.live = done;
    this.turning = { ...turn, job: null, shift: 0, shiftAtStart: 0 };
    this.moveCamera({ ...done.camera, x: done.camera.x + moved }, "idle");
  }

  private stepFlight(start: number): boolean {
    const flight = this.flight;
    if (!flight) return false;
    const elapsed = start - flight.start;
    if (!flight.dest) flight.dest = advance(flight.job, start + JOB_BUDGET_MS);
    else if (!flight.bitmap) flight.bitmap = this.renderBitmap(flight.dest);
    if (elapsed >= flight.plan.duration) {
      this.land(flight);
      return true;
    }
    this.drawFlight(flight, elapsed);
    return true;
  }

  private land(flight: Flight): void {
    const dest = flight.dest ?? finish(flight.job);
    this.flight = null;
    this.flightView = null;
    this.live = dest.paintVersion === this.paintVersion ? dest : { ...dest, painted: this.paintFor(dest.sampled, dest.scene), paintVersion: this.paintVersion };
    this.phase = "settle";
    this.draw(performance.now());
    const restPlan = this.levelsFor(flight.target, false);
    const landed = this.live;
    void this.shapesFor(restPlan).then((shapes) => {
      if (this.live !== landed) return;
      this.upgrade = this.buildLive(flight.target, restPlan, shapes, true, landed.camera);
      this.markDirty("settle");
    });
  }

  private renderBitmap(live: Live): HTMLCanvasElement {
    const bitmap = makeCanvas(this.canvas.width, this.canvas.height);
    this.paintLive(context(bitmap), live, performance.now());
    return bitmap;
  }

  private drawFlight(flight: Flight, elapsed: number): void {
    const frame = flightFrame(flight.plan, elapsed);
    this.flightView = frame;
    const ctx = this.ctx;
    const { width, height } = this.viewport;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.fillStyle = this.colors.ground;
    ctx.fillRect(0, 0, width, height);
    ctx.setTransform(this.dpr * frame.source.k, 0, 0, this.dpr * frame.source.k, this.dpr * frame.source.x, this.dpr * frame.source.y);
    ctx.drawImage(flight.source, 0, 0, width, height);
    if (flight.bitmap && frame.destAlpha > 0) {
      ctx.globalAlpha = frame.destAlpha;
      ctx.setTransform(this.dpr * frame.dest.k, 0, 0, this.dpr * frame.dest.k, this.dpr * frame.dest.x, this.dpr * frame.dest.y);
      ctx.drawImage(flight.bitmap, 0, 0, width, height);
      ctx.globalAlpha = 1;
    }
    this.options.onView?.();
  }

  private paintLive(ctx: CanvasRenderingContext2D, live: Live, now: number): void {
    const octave = octaveOf(live.scene, live.camera, this.viewport, this.density, this.dpr);
    const relief = this.relief.frameFor(live.scene.state, now);
    const inner = this.provinces.linesFor(live.scene, this.options.table, this.selected);
    const input = { scene: live.scene, camera: live.camera, sampled: live.sampled, painted: live.painted, octave, selected: this.selected, focused: this.focused, detach: this.detachNow(now), radiusScale: this.highContrast ? 1.5 : 1, layers: regionLayers(this.options.table), ...(relief ? { relief } : {}), ...(inner ? { inner } : {}) };
    drawFrame(ctx, input, this.viewport, this.dpr, this.colors);
  }

  private draw(now: number): void {
    if (!this.live) return;
    this.paintLive(this.ctx, this.live, now);
    if (this.crossfade) drawCrossfade(this.ctx, this.crossfade.snapshot, 1 - tweenProgress(this.crossfade.tween, now));
    this.options.onView?.();
    if (this.firstPaint === null) {
      this.firstPaint = performance.now();
      performance.mark(MAP_FIRST_PAINT_MARK);
      if (this.options.prefetch !== false) this.startPrefetch();
      this.relief.start(() => this.markDirty("settle"));
    }
  }

  private startPrefetch(): void {
    const idle = (): Promise<void> =>
      new Promise((resolve) => {
        if (typeof requestIdleCallback === "function") requestIdleCallback(() => resolve(), { timeout: 2000 });
        else setTimeout(resolve, 200);
      });
    prefetchLazyLevels(this.options.table, idle).catch((cause: unknown) => {
      // A failed prefetch is not fatal: the view that needs the level fetches it again and reports its own failure.
      console.warn("Map levels could not be prefetched", cause);
    });
  }

  private resample(camera: Affine): void {
    if (!this.live) return;
    const { scene } = this.live;
    const sampled = sampleScene(this.idCanvas, scene, camera, this.viewport, this.density, this.dpr);
    this.live = { ...this.live, camera, sampled, painted: this.paintFor(sampled, scene), paintVersion: this.paintVersion };
    this.markDirty(this.phase);
  }

  private moveCamera(camera: Affine, phase: FramePhase): void {
    if (!this.live || this.flight) return;
    if (phase !== "idle") this.scheduleRecenter();
    if (stillCovered(this.live.sampled, this.live.scene, camera, this.viewport, this.density, this.dpr)) {
      this.live = { ...this.live, camera };
      this.markDirty(phase);
    } else {
      this.resample(camera);
      this.phase = phase;
    }
  }

  /** Re-center a tilted view once the camera has been still for a moment. */
  private scheduleRecenter(): void {
    this.cancelRecenter();
    if (this.turning || this.paused) return;
    this.recenterTimer = setTimeout(() => {
      this.recenterTimer = null;
      void this.recenter();
    }, RECENTER_IDLE_MS);
  }

  private cancelRecenter(): void {
    if (this.recenterTimer !== null) clearTimeout(this.recenterTimer);
    this.recenterTimer = null;
  }

  /**
   * Rebuild the view around what is in the middle of it, at the same zoom and
   * with that point where it was on screen, so a view far from its
   * projection's center stops slanting. The swap crossfades.
   */
  private async recenter(): Promise<void> {
    const live = this.live;
    if (!live || this.flight || this.dragging || this.upgrade) return;
    const view = recenteredView(live.scene.projection, live.scene.state, live.camera, this.visibleArea(), live.target);
    if (!view) return;
    const seq = this.moveSeq;
    const shapes = await this.shapesFor(live.scene.plan);
    if (this.live !== live || seq !== this.moveSeq || this.dragging) return;
    const next = finish(this.buildLive(view.target, live.scene.plan, shapes, true, view.camera));
    // The terrain belongs to one projection: swapping before the new one's arrives would draw the land bare for a beat.
    this.relief.ensure(next.scene.state, next.camera, this.viewport);
    await this.relief.settled(next.scene.state, RECENTER_RELIEF_WAIT_MS);
    if (this.live !== live || seq !== this.moveSeq || this.dragging) return;
    this.startCrossfade(RECENTER_CROSSFADE_MS);
    this.live = next;
    this.markDirty("settle");
  }

  private inputTarget() {
    return {
      camera: () => (this.flight ? null : (this.live?.camera ?? null)),
      enabled: () => !this.paused && !this.flight,
      moveCamera: (camera: Affine, phase: "pan" | "zoom") => this.moveCamera(camera, phase),
      endDrag: () => this.markDirty("idle"),
      hover: (x: number, y: number) => this.options.onHover?.(this.regionAt(x, y), x, y),
      click: (x: number, y: number) => {
        const region = this.regionAt(x, y);
        if (region) this.options.onSelect?.(region);
        else this.options.onEmpty?.();
      },
      dragging: (active: boolean) => {
        this.dragging = active;
        if (active) this.markDirty(this.phase);
      },
    };
  }
}
