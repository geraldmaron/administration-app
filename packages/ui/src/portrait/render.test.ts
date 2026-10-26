import { describe, expect, it } from "vitest";
import {
  FACE_EYEWEAR,
  FACE_FACIAL_HAIR,
  FACE_GARMENTS,
  FACE_HAIR_CUTS,
  FACE_HAIR_TEXTURES,
  FACE_HEADWEAR,
  FACE_MOODS,
  FACE_SHAPES,
  FACE_TREATMENTS,
  generateFace,
  type FaceGenome,
  type PortraitFacets,
} from "@admin/world";
import { renderFace } from "./render";

const FACETS: PortraitFacets = {
  heritage: "latin-america",
  gender: "feminine",
  ageBand: "established",
  skinTone: "tone-3",
  attire: "business",
  hairStyle: "long",
  hairColor: "brown",
  facialHair: "none",
  eyewear: "glasses",
  variant: 1,
};

const base: FaceGenome = generateFace(FACETS, "render-test", { age: 52, nation: "USA" });

/** Every opened tag closed, in order: a malformed face would render as a broken image. */
function wellFormed(svg: string): boolean {
  const stack: string[] = [];
  for (const match of svg.matchAll(/<(\/?)([a-zA-Z]+)[^>]*?(\/?)>/g)) {
    const [, closing, name, selfClosing] = match;
    if (selfClosing) continue;
    if (closing) {
      if (stack.pop() !== name) return false;
    } else stack.push(name!);
  }
  return stack.length === 0;
}

function check(genome: FaceGenome, age = 52, extra: Parameters<typeof renderFace>[1] = { age: 52 }): void {
  const svg = renderFace(genome, { ...extra, age });
  expect(svg.startsWith("<svg")).toBe(true);
  expect(svg).not.toMatch(/NaN|undefined|Infinity/);
  expect(wellFormed(svg)).toBe(true);
  expect(drawnByNativeSvg(svg)).toEqual([]);
}

// The filter primitives react-native-svg draws on iOS, Android and the web; it renders nothing for turbulence and has no component transfer.
const NATIVE_FILTERS = new Set(["feGaussianBlur", "feColorMatrix", "feFlood", "feComposite", "feOffset", "feMerge", "feMergeNode", "feBlend"]);

/** Every filter primitive in the face that react-native-svg would not draw. */
function drawnByNativeSvg(svg: string): string[] {
  return [...svg.matchAll(/<(fe[A-Za-z]+)/g)].map((match) => match[1]!).filter((name) => !NATIVE_FILTERS.has(name));
}

describe("renderFace", () => {
  it("draws every cut in every texture", () => {
    for (const cut of FACE_HAIR_CUTS) for (const texture of FACE_HAIR_TEXTURES) check({ ...base, hair: { ...base.hair, cut, texture } });
  });

  it("draws every garment, covering, beard, frame and head shape", () => {
    for (const garment of FACE_GARMENTS) check({ ...base, attire: { ...base.attire, garment } });
    for (const style of FACE_HEADWEAR) check({ ...base, headwear: { ...base.headwear, style } });
    for (const facialHair of FACE_FACIAL_HAIR) check({ ...base, presentation: "masculine", facialHair });
    for (const style of FACE_EYEWEAR) check({ ...base, eyewear: { ...base.eyewear, style, tinted: style === "aviator" } });
    for (const shape of FACE_SHAPES) check({ ...base, head: { ...base.head, shape } });
  });

  it("draws every mood and treatment, and every age from thirty to ninety", () => {
    for (const mood of FACE_MOODS) check(base, 52, { age: 52, mood });
    for (const treatment of FACE_TREATMENTS) check(base, 52, { age: 52, treatment });
    for (let age = 30; age <= 90; age += 10) check(base, age);
  });

  it("holds at the rails of every continuous gene", () => {
    const rails = (v: number): FaceGenome => ({
      ...base,
      head: { ...base.head, width: v, jaw: v, chin: v, length: v, cheekbones: v, forehead: v, build: v },
      eyes: { ...base.eyes, size: v, spacing: v, tilt: v, openness: v },
      nose: { length: v, width: v, bridge: v, tip: v },
      mouth: { width: v, upper: v, lower: v, bow: v, expression: v },
    });
    check(rails(0));
    check(rails(1));
  });

  it("draws one face identically every time, and ages it", () => {
    expect(renderFace(base, { age: 52 })).toBe(renderFace(base, { age: 52 }));
    expect(renderFace(base, { age: 52 })).not.toBe(renderFace(base, { age: 74 }));
  });
});
