import type { FaceGenome } from "./types";
import { CX } from "./geometry";
import { layoutFor } from "./layout";

// A part of a drawn face, framed square. A picker that offers a choice of eye
// shape shows the eyes, not a whole face at thumbnail size where the change is
// a pixel wide; the frame is read from the same layout the renderer draws
// from, so a long face or a wide-set pair of eyes stays inside it.

export type FaceRegion = "portrait" | "head" | "hair" | "eyes" | "features" | "lower" | "dress";

export type RegionBox = { readonly x: number; readonly y: number; readonly size: number };

const square = (cy: number, size: number): RegionBox => ({ x: CX - size / 2, y: cy - size / 2, size });

/** The square of the 200-unit portrait that shows one region of this face at this age. */
export function regionBox(genome: FaceGenome, age: number, region: FaceRegion): RegionBox {
  const L = layoutFor(genome, age);
  switch (region) {
    case "portrait":
      return { x: 0, y: 0, size: 200 };
    case "head": {
      const size = L.chinY - L.crownY + 22;
      return square((L.crownY + L.chinY) / 2, size);
    }
    case "hair": {
      const size = L.chinY - L.crownY + 48;
      return square((L.crownY + L.chinY) / 2 + 6, size);
    }
    case "eyes":
      return square((L.browY + L.eyeY) / 2 + 1, (L.eyeInner + L.eyeW) * 2 + 18);
    case "features":
      return square((L.eyeY + L.chinY) / 2 + 4, L.chinY - L.eyeY + 14);
    case "lower":
      return square((L.mouthY + L.chinY) / 2 + 2, L.cheekW * 2 + 14);
    case "dress": {
      const top = L.chinY - 6;
      return { x: CX - (200 - top) / 2, y: top, size: 200 - top };
    }
  }
}

/** The SVG with its frame narrowed to one region. */
export function framed(svg: string, box: RegionBox): string {
  const view = `viewBox="${box.x.toFixed(1)} ${box.y.toFixed(1)} ${box.size.toFixed(1)} ${box.size.toFixed(1)}"`;
  return svg.replace('viewBox="0 0 200 200"', view);
}
