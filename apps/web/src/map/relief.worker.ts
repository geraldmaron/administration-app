// The terrain, off the main thread: the plate is fetched and decoded here once,
// and each view's shading is rendered here and handed back as pixels, so a
// view's terrain costs the map no frames however large the plate.
import type { Affine, Viewport } from "./camera";
import reliefUrl from "./data/relief.jpg?url";
import { makeProjection, type ProjectionState } from "./projection";
import { plateFromPixels, renderShade, type ReliefPlate } from "./relief";

export interface ReliefRequest {
  readonly id: number;
  readonly state: ProjectionState;
  readonly camera: Affine;
  readonly viewport: Viewport;
  readonly scale: number;
}

export type ReliefReply =
  | { readonly id: number; readonly width: number; readonly height: number; readonly data: Uint8ClampedArray }
  | { readonly id: number; readonly error: string };

interface WorkerScope {
  onmessage: ((event: MessageEvent<ReliefRequest>) => void) | null;
  postMessage(message: ReliefReply, transfer?: Transferable[]): void;
}

const scope = self as unknown as WorkerScope;

async function decode(): Promise<ReliefPlate> {
  const response = await fetch(reliefUrl);
  if (!response.ok) throw new Error(`The relief plate answered ${response.status}`);
  const bitmap = await createImageBitmap(await response.blob());
  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("The relief plate has no 2D context to decode into");
  ctx.drawImage(bitmap, 0, 0);
  return plateFromPixels(bitmap.width, bitmap.height, ctx.getImageData(0, 0, bitmap.width, bitmap.height).data);
}

const plate = decode();

scope.onmessage = (event) => {
  const { id, state, camera, viewport, scale } = event.data;
  plate
    .then((relief) => {
      const pixels = renderShade(makeProjection(state), camera, viewport, relief, scale);
      scope.postMessage({ id, ...pixels }, [pixels.data.buffer]);
    })
    .catch((cause: unknown) => scope.postMessage({ id, error: cause instanceof Error ? cause.message : String(cause) }));
};
