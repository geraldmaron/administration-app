import type { Affine, Viewport } from "./camera";
import type { ProjectionState } from "./projection";
import type { ReliefReply, ReliefRequest } from "./relief.worker";

/** The terrain is rendered at this fraction of screen resolution: it is soft by nature, and the full size costs four times the work. */
const RELIEF_SCALE = 0.5;
const RELIEF_FADE_MS = 300;
/** Extra view rendered on each side, as a share of the viewport, so a pan stays lit while the next render runs. */
const MARGIN = 0.4;
/** A zoom or pan that moves the view this far from where its terrain was rendered renders it again. */
const STALE_ZOOM = 1.12;
const STALE_SHIFT = 0.2;

/** A view's terrain, ready to draw: its pixels and the projection and camera they were rendered for. */
export interface ReliefImage {
  readonly canvas: HTMLCanvasElement;
  readonly state: ProjectionState;
  readonly camera: Affine;
  readonly scale: number;
}

interface Asked {
  readonly id: number;
  readonly state: ProjectionState;
  readonly camera: Affine;
}

function sameState(a: ProjectionState, b: ProjectionState): boolean {
  return Math.abs(a.lon - b.lon) < 1e-9 && Math.abs(a.lat - b.lat) < 1e-9 && Math.abs(a.blend - b.blend) < 1e-9;
}

/** Whether terrain rendered for `drawn` still covers a view at `camera`. */
function covers(state: ProjectionState, drawn: Asked | ReliefImage, camera: Affine, viewport: Viewport): boolean {
  if (!sameState(state, drawn.state)) return false;
  const ratio = camera.k / drawn.camera.k;
  // The render camera sits a margin up and left of the view it was asked for.
  const mx = viewport.width * MARGIN;
  const my = viewport.height * MARGIN;
  const shift = Math.hypot(camera.x + mx - drawn.camera.x * ratio, camera.y + my - drawn.camera.y * ratio);
  return ratio <= STALE_ZOOM && ratio >= 1 / STALE_ZOOM && shift <= Math.max(viewport.width, viewport.height) * STALE_SHIFT;
}

function toCanvas(reply: { readonly width: number; readonly height: number; readonly data: Uint8ClampedArray }): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = reply.width;
  canvas.height = reply.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("The relief canvas has no 2D context");
  ctx.putImageData(new ImageData(new Uint8ClampedArray(reply.data), reply.width, reply.height), 0, 0);
  return canvas;
}

/** One worker for every map on the page, so the plate is decoded once; replies route back to whichever layer asked. */
let shared: { readonly worker: Worker; readonly waiting: Map<number, (reply: ReliefReply) => void> } | null = null;
let nextId = 0;

function sharedWorker(): NonNullable<typeof shared> | null {
  if (shared) return shared;
  if (typeof Worker === "undefined") return null;
  const worker = new Worker(new URL("./relief.worker.ts", import.meta.url), { type: "module" });
  const waiting = new Map<number, (reply: ReliefReply) => void>();
  worker.onmessage = (event: MessageEvent<ReliefReply>) => {
    const answer = waiting.get(event.data.id);
    waiting.delete(event.data.id);
    answer?.(event.data);
  };
  worker.onerror = (event) => {
    // The terrain is texture, not information: without it the map still says everything.
    console.warn("The relief worker failed", event.message);
  };
  shared = { worker, waiting };
  return shared;
}

/**
 * The terrain under the land. A worker decodes the plate and renders each
 * view; the renderer asks for the view it is about to show (a flight asks for
 * its destination at take-off, so the terrain is there when it lands) and
 * draws whatever matches the projection on screen.
 */
export class ReliefLayer {
  private started = false;
  private ready: () => void = () => undefined;
  private image: { readonly image: ReliefImage; readonly shown: number } | null = null;
  private asked: Asked | null = null;
  private waiters: { readonly state: ProjectionState; readonly resolve: () => void }[] = [];

  /** Join the shared worker; `ready` asks the renderer for a frame whenever new terrain arrives. */
  start(ready: () => void): void {
    this.ready = ready;
    this.started = sharedWorker() !== null;
  }

  /** Stop listening; the shared worker stays up for the other maps. */
  destroy(): void {
    if (this.asked) shared?.waiting.delete(this.asked.id);
    this.asked = null;
    this.started = false;
    this.release(() => true);
  }

  /** Ask for a view's terrain unless what is drawn or already asked for covers it. */
  ensure(state: ProjectionState, camera: Affine, viewport: Viewport): void {
    const pool = this.started ? sharedWorker() : null;
    if (!pool) return;
    if (this.image && covers(state, this.image.image, camera, viewport)) return;
    if (this.asked && covers(state, this.asked, camera, viewport)) return;
    const mx = viewport.width * MARGIN;
    const my = viewport.height * MARGIN;
    const render: Affine = { k: camera.k, x: camera.x + mx, y: camera.y + my };
    if (this.asked) pool.waiting.delete(this.asked.id);
    const id = ++nextId;
    this.asked = { id, state, camera: render };
    pool.waiting.set(id, (reply) => this.receive(reply));
    const request: ReliefRequest = { id, state, camera: render, viewport: { width: viewport.width + 2 * mx, height: viewport.height + 2 * my }, scale: RELIEF_SCALE };
    pool.worker.postMessage(request);
  }

  /**
   * Resolves once terrain for this projection is in hand, or after
   * `timeoutMs`: a view swap waits on it rather than drawing the land bare.
   */
  settled(state: ProjectionState, timeoutMs: number): Promise<void> {
    if (!this.started || (this.image && sameState(this.image.image.state, state))) return Promise.resolve();
    return new Promise((resolve) => {
      const entry = { state, resolve };
      this.waiters = [...this.waiters, entry];
      setTimeout(() => this.release((waiter) => waiter === entry), timeoutMs);
    });
  }

  private release(which: (waiter: { readonly state: ProjectionState }) => boolean): void {
    const [done, rest] = [this.waiters.filter(which), this.waiters.filter((waiter) => !which(waiter))];
    this.waiters = rest;
    for (const waiter of done) waiter.resolve();
  }

  fading(now: number): boolean {
    return this.image !== null && this.image.shown > 0 && now - this.image.shown < RELIEF_FADE_MS;
  }

  /** What a frame drawn in this projection draws, faded in when a new projection's terrain first arrives. */
  frameFor(state: ProjectionState, now: number): { readonly image: ReliefImage; readonly alpha: number } | undefined {
    const current = this.image;
    if (!current || !sameState(current.image.state, state)) return undefined;
    return { image: current.image, alpha: current.shown === 0 ? 1 : Math.min(1, (now - current.shown) / RELIEF_FADE_MS) };
  }

  private receive(reply: ReliefReply): void {
    const asked = this.asked;
    if (!asked || reply.id !== asked.id) return;
    this.asked = null;
    if ("error" in reply) {
      console.warn("The relief could not be rendered", reply.error);
      this.release(() => true);
      return;
    }
    // Only the first terrain fades in. After that a new projection's terrain arrives before the view that needs it is swapped in, so fading it would flash the land bare.
    this.image = { image: { canvas: toCanvas(reply), state: asked.state, camera: asked.camera, scale: RELIEF_SCALE }, shown: this.image === null ? performance.now() : 0 };
    this.release((waiter) => sameState(waiter.state, asked.state));
    this.ready();
  }
}
