import {
  HERITAGE_SKIN_TONES,
  ageBandFor,
  faceDraw,
  faceRef,
  generateFace,
  isFaceRef,
  parseFaceRef,
  parsePortraitRef,
  portraitRef,
  seatHeritageMixFor,
  type FaceGenome,
  type PortraitFacets,
  type PortraitGenderPresentation,
  type PortraitHeritage,
} from "@admin/world";

// The President's face, as the founding holds it: a `face:` reference carrying
// the whole genome the player built. A draft saved before the face builder
// holds a facet reference instead; it is read as the face those facets draw,
// and the first edit turns it into a genome.

const PRESIDENT_SEAT = "role-president";

type Draw = () => number;

function pick<T>(r: Draw, options: ReadonlyArray<readonly [T, number]>): T {
  const total = options.reduce((sum, [, weight]) => sum + weight, 0);
  let x = r() * total;
  for (const [value, weight] of options) {
    x -= weight;
    if (x <= 0) return value;
  }
  return options[options.length - 1]![0];
}

function hairFacets(presentation: PortraitGenderPresentation, age: number, r: Draw): Pick<PortraitFacets, "hairStyle" | "hairColor" | "facialHair" | "eyewear"> {
  const masc = presentation === "masculine";
  const hairStyle = masc
    ? pick(r, [["short", 0.62], ["cropped", 0.22], ["bald", age > 50 ? 0.16 : 0.04]] as const)
    : pick(r, [["short", 0.4], ["long", 0.4], ["tied-back", 0.2]] as const);
  const gray = Math.min(0.85, Math.max(0, (age - 40) / 35));
  const hairColor = r() < gray ? (r() < 0.35 && age > 62 ? "white" : "graying") : pick(r, [["black", 0.35], ["brown", 0.45], ["fair", 0.15], ["red", 0.05]] as const);
  const facialHair = masc ? pick(r, [["none", 0.62], ["trimmed-beard", 0.16], ["mustache", 0.1], ["stubble", 0.08], ["full-beard", 0.04]] as const) : "none";
  const eyewear = r() < (age > 55 ? 0.4 : 0.18) ? "glasses" : "none";
  return { hairStyle, hairColor, facialHair, eyewear };
}

/**
 * A face drawn for the President: from the same heritage mix every American
 * officeholder is drawn from unless a heritage is given, in business dress,
 * with a flag pin as often as the bench wears one. Deterministic in the seed.
 */
export function drawnFace(presentation: PortraitGenderPresentation, age: number, seed: string, heritage?: PortraitHeritage): FaceGenome {
  const r = faceDraw(`president:${seed}`);
  const mix = seatHeritageMixFor("USA", PRESIDENT_SEAT, undefined);
  const drawn = heritage ?? pick(r, mix.map((entry) => [entry.heritage, entry.weight] as const));
  const tones = HERITAGE_SKIN_TONES[drawn];
  const facets: PortraitFacets = {
    heritage: drawn,
    gender: presentation,
    ageBand: ageBandFor(age),
    skinTone: tones[Math.floor(r() * tones.length)]!,
    attire: "business",
    ...hairFacets(presentation, age, r),
    variant: 1,
  };
  return generateFace(facets, `president:${seed}`, { age, nation: "USA" });
}

/** The face a stated reference describes, whichever form it was saved in. */
export function faceOf(ref: string | undefined, age: number): FaceGenome | undefined {
  if (ref === undefined) return undefined;
  try {
    if (isFaceRef(ref)) return parseFaceRef(ref);
    return generateFace(parsePortraitRef(ref), "president", { age, nation: "USA" });
  } catch (error) {
    // A reference that no longer reads is no face at all, which the person
    // stage then offers to draw again; anything else is a real fault.
    if (error instanceof Error) return undefined;
    throw error;
  }
}

/** The same face presented another way: a beard does not follow a feminine presentation, nor lipstick a masculine one. */
export function withPresentation(genome: FaceGenome, presentation: PortraitGenderPresentation): FaceGenome {
  return {
    ...genome,
    presentation,
    facialHair: presentation === "feminine" ? "none" : genome.facialHair,
    makeup: presentation === "masculine" ? { lips: "none", eyes: "none", blush: 0 } : genome.makeup,
  };
}

export function faceHeritage(ref: string | undefined): PortraitHeritage | undefined {
  if (ref === undefined) return undefined;
  if (isFaceRef(ref)) return faceOf(ref, 50)?.heritage;
  try {
    return parsePortraitRef(ref).heritage;
  } catch (error) {
    if (error instanceof Error) return undefined;
    throw error;
  }
}

/** A face at a new age. A genome carries no age, so only an old facet reference moves. */
export function faceAtAge(ref: string, age: number): string {
  if (isFaceRef(ref)) return ref;
  return portraitRef({ ...parsePortraitRef(ref), ageBand: ageBandFor(age) });
}

export { faceRef };
