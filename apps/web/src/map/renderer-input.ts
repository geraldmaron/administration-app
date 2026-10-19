import { zoomAbout, type Affine } from "./camera";

/** What the pointer can ask of the renderer. */
export interface InputTarget {
  readonly camera: () => Affine | null;
  readonly enabled: () => boolean;
  readonly moveCamera: (camera: Affine, phase: "pan" | "zoom") => void;
  readonly endDrag: () => void;
  readonly hover: (x: number, y: number) => void;
  readonly click: (x: number, y: number) => void;
  readonly dragging: (active: boolean) => void;
}

/** A press that travels less than this is a click, not a pan. */
const CLICK_SLOP_PX = 4;
/** The canvas never starts a touch pan this close to the left or bottom edge, where the system's back and home gestures live. */
const EDGE_GUARD_PX = 24;

type Point = { readonly x: number; readonly y: number };

interface Gesture {
  readonly pointers: Map<number, Point>;
  start: { readonly camera: Affine; readonly a: Point; readonly b?: Point } | null;
  moved: boolean;
}

function midpoint(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

/** The camera for the current pointers: one pointer pans, two pan and pinch about their midpoint. */
function gestureCamera(gesture: Gesture): Affine | null {
  const start = gesture.start;
  if (!start) return null;
  const [a, b] = [...gesture.pointers.values()];
  if (!a) return null;
  if (!start.b || !b) return { k: start.camera.k, x: start.camera.x + a.x - start.a.x, y: start.camera.y + a.y - start.a.y };
  const from = midpoint(start.a, start.b);
  const to = midpoint(a, b);
  const factor = Math.hypot(b.x - a.x, b.y - a.y) / Math.max(1, Math.hypot(start.b.x - start.a.x, start.b.y - start.a.y));
  const panned = { k: start.camera.k, x: start.camera.x + to.x - from.x, y: start.camera.y + to.y - from.y };
  return zoomAbout(panned, factor, to.x, to.y);
}

function restart(gesture: Gesture, camera: Affine | null): void {
  const [a, b] = [...gesture.pointers.values()];
  gesture.start = camera && a ? { camera, a, ...(b ? { b } : {}) } : null;
}

/** Bind pan, pinch, wheel zoom, hover and click on the canvas; the result undoes it. */
export function bindInput(canvas: HTMLCanvasElement, target: InputTarget): () => void {
  const gesture: Gesture = { pointers: new Map(), start: null, moved: false };
  const undo: (() => void)[] = [];
  const on = <K extends keyof HTMLElementEventMap>(type: K, handler: (event: HTMLElementEventMap[K]) => void, options?: AddEventListenerOptions): void => {
    canvas.addEventListener(type, handler, options);
    undo.push(() => canvas.removeEventListener(type, handler));
  };
  on("pointerdown", (event) => onDown(canvas, target, gesture, event));
  on("pointermove", (event) => onMove(target, gesture, event));
  on("pointerup", (event) => onUp(target, gesture, event));
  on("pointercancel", (event) => {
    gesture.pointers.delete(event.pointerId);
    if (gesture.pointers.size === 0) target.dragging(false);
    restart(gesture, target.camera());
  });
  on("pointerleave", () => {
    if (gesture.pointers.size === 0) target.hover(Number.NaN, Number.NaN);
  });
  on("wheel", (event) => onWheel(target, event), { passive: false });
  return () => undo.forEach((fn) => fn());
}

function onDown(canvas: HTMLCanvasElement, target: InputTarget, gesture: Gesture, event: PointerEvent): void {
  const camera = target.camera();
  if (!camera || !target.enabled()) return;
  const edge = event.pointerType === "touch" && gesture.pointers.size === 0 && (event.offsetX < EDGE_GUARD_PX || event.offsetY > canvas.clientHeight - EDGE_GUARD_PX);
  if (edge || gesture.pointers.size >= 2) return;
  canvas.setPointerCapture(event.pointerId);
  if (gesture.pointers.size === 0) gesture.moved = false;
  gesture.pointers.set(event.pointerId, { x: event.offsetX, y: event.offsetY });
  restart(gesture, camera);
  target.dragging(true);
}

function onMove(target: InputTarget, gesture: Gesture, event: PointerEvent): void {
  if (!gesture.pointers.has(event.pointerId)) {
    if (gesture.pointers.size === 0 && event.pointerType !== "touch") target.hover(event.offsetX, event.offsetY);
    return;
  }
  gesture.pointers.set(event.pointerId, { x: event.offsetX, y: event.offsetY });
  const start = gesture.start;
  if (!start) return;
  if (!gesture.moved && !start.b && Math.hypot(event.offsetX - start.a.x, event.offsetY - start.a.y) < CLICK_SLOP_PX) return;
  gesture.moved = true;
  const camera = gestureCamera(gesture);
  if (camera) target.moveCamera(camera, start.b ? "zoom" : "pan");
}

function onUp(target: InputTarget, gesture: Gesture, event: PointerEvent): void {
  if (!gesture.pointers.delete(event.pointerId)) return;
  if (gesture.pointers.size > 0) {
    restart(gesture, target.camera());
    return;
  }
  gesture.start = null;
  target.dragging(false);
  if (gesture.moved) target.endDrag();
  else target.click(event.offsetX, event.offsetY);
}

function onWheel(target: InputTarget, event: WheelEvent): void {
  const camera = target.camera();
  if (!camera || !target.enabled()) return;
  event.preventDefault();
  target.moveCamera(zoomAbout(camera, Math.exp(-event.deltaY * 0.002), event.offsetX, event.offsetY), "zoom");
}
