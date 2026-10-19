import { describe, expect, it } from "vitest";
import { FACE_SHAPES, generateFace, type PortraitFacets } from "@admin/world";
import { framed, regionBox, type FaceRegion } from "./crop";
import { layoutFor } from "./layout";
import { renderFace } from "./render";

const FACETS: PortraitFacets = {
  heritage: "europe-north",
  gender: "masculine",
  ageBand: "established",
  skinTone: "tone-2",
  attire: "business",
  hairStyle: "short",
  hairColor: "brown",
  facialHair: "none",
  eyewear: "none",
  variant: 1,
};

const face = generateFace(FACETS, "crop-test", { age: 55, nation: "USA" });
const REGIONS: readonly FaceRegion[] = ["head", "hair", "eyes", "features", "lower", "dress"];

describe("a face framed to one region", () => {
  it("keeps every feature it frames inside the frame, for every head shape", () => {
    for (const shape of FACE_SHAPES) {
      const genome = { ...face, head: { ...face.head, shape } };
      const L = layoutFor(genome, 55);
      const eyes = regionBox(genome, 55, "eyes");
      expect(eyes.y).toBeLessThan(L.browY);
      expect(eyes.y + eyes.size).toBeGreaterThan(L.eyeY);
      const head = regionBox(genome, 55, "head");
      expect(head.y).toBeLessThan(L.crownY);
      expect(head.y + head.size).toBeGreaterThan(L.chinY);
    }
  });

  it("frames each part closer than the whole portrait", () => {
    for (const region of REGIONS) expect(regionBox(face, 55, region).size).toBeLessThan(200);
    expect(regionBox(face, 55, "eyes").size).toBeLessThan(regionBox(face, 55, "head").size);
  });

  it("narrows only the drawing's frame, not the drawing", () => {
    const whole = renderFace(face, { age: 55 });
    const cropped = framed(whole, regionBox(face, 55, "eyes"));
    expect(cropped).not.toContain('viewBox="0 0 200 200"');
    expect(cropped.replace(/viewBox="[^"]*"/, "")).toBe(whole.replace(/viewBox="[^"]*"/, ""));
  });
});
