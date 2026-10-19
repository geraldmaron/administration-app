import { z } from "zod";
import { PortraitGenderPresentation, PortraitHeritage } from "./portrait.js";

// A face as data: what the renderer draws and the face builder edits. Every
// registry below is append-only, because an authored face is stored as
// positions in these lists; reordering one would silently re-dress every saved
// President.

export const FACE_SHAPES = ["oval", "round", "square", "oblong", "heart", "diamond", "triangle", "rectangle"] as const;
export const FACE_EYE_SHAPES = ["crease", "hooded", "mono", "round", "downturned"] as const;
export const FACE_EYE_COLORS = ["dark-brown", "brown", "hazel", "amber", "green", "blue", "gray"] as const;
export const FACE_BROW_STYLES = ["straight", "soft", "arched", "angled", "bushy"] as const;
export const FACE_HAIR_TEXTURES = ["straight", "wavy", "curly", "coily"] as const;
export const FACE_HAIR_CUTS = [
  "bald",
  "balding",
  "buzz",
  "crew",
  "side-part",
  "swept-back",
  "curly-top",
  "close-coils",
  "pixie",
  "bob",
  "long",
  "curls-long",
  "afro",
  "locs",
  "bun",
  "low-bun",
  "tied-back",
  "fringe",
  "slick-back",
  "comb-over",
  "quiff",
  "lob",
  "braids",
  "high-top",
] as const;
export const FACE_HAIR_COLORS = ["black", "dark-brown", "brown", "light-brown", "dark-blonde", "blonde", "auburn", "copper"] as const;
export const FACE_FACIAL_HAIR = [
  "none",
  "stubble",
  "mustache",
  "pencil",
  "walrus",
  "goatee",
  "circle-beard",
  "short-beard",
  "full-beard",
  "long-beard",
] as const;
export const FACE_EYEWEAR = ["none", "rect", "round", "browline", "thick", "rimless", "aviator", "cat-eye"] as const;
export const FACE_FRAME_COLORS = ["black", "slate", "gold", "silver", "tortoise", "burgundy"] as const;
export const FACE_LIPSTICKS = ["none", "nude", "rose", "berry", "red", "plum", "coral"] as const;
export const FACE_EYE_MAKEUP = ["none", "liner", "wing", "smoky"] as const;
export const FACE_HEADWEAR = [
  "none",
  "hijab",
  "headwrap",
  "gele",
  "turban",
  "ghutra",
  "shemagh",
  "kufi",
  "peci",
  "amamah",
  "kippah",
  "dupatta",
] as const;
export const FACE_GARMENTS = [
  "suit",
  "suit-open",
  "blazer",
  "military",
  "military-open",
  "ceremonial",
  "clerical",
  "robe",
  "academic",
  "field",
  "thobe",
  "kaftan",
  "nehru",
  "dress",
  "judicial",
] as const;
export const FACE_FABRICS = [
  "navy",
  "charcoal",
  "black",
  "slate",
  "midnight",
  "brown",
  "olive",
  "forest",
  "khaki",
  "air-blue",
  "burgundy",
  "emerald",
  "royal",
  "cream",
  "red",
  "teal",
  "plum",
  "white",
  "light-blue",
  "blush",
  "beige",
  "taupe",
  "maroon",
  "dusty-rose",
  "sand",
  "gold",
  "silver",
  "crimson",
  "blue",
  "green",
  "saffron",
  "tweed",
  "camel",
  "ivory",
] as const;
export const FACE_PINS = ["none", "flag", "gold", "enamel"] as const;
export const FACE_EARRINGS = ["none", "studs", "pearls", "hoops", "drops"] as const;
export const FACE_NECKLACES = ["none", "pearls", "chain", "pendant"] as const;
export const FACE_BROOCHES = ["none", "gold", "pearl", "enamel"] as const;
export const FACE_UNDERTONES = ["neutral", "warm", "pink", "olive"] as const;

/** What the moment shows on a face. A render input, never stored. */
export const FACE_MOODS = ["neutral", "warm", "stern", "concerned", "strained"] as const;
export type FaceMood = (typeof FACE_MOODS)[number];

/** How a surface presents a person. A render input, never stored. */
export const FACE_TREATMENTS = ["official", "wire", "archival", "silhouette", "redacted"] as const;
export type FaceTreatment = (typeof FACE_TREATMENTS)[number];

/** Every continuous gene is 0..1; the renderer decides what the range means. */
const gene = z.number().min(0).max(1);
const Fabric = z.enum(FACE_FABRICS);

export const FaceGenome = z.object({
  presentation: PortraitGenderPresentation,
  // The visual grouping the face was drawn from. It shapes nothing the renderer
  // draws; it is what a name suggestion or a redraw reads so a face and the name
  // beside it come from the same place.
  heritage: PortraitHeritage,
  skin: z.object({ tone: z.number().int().min(1).max(6), shade: gene, undertone: z.enum(FACE_UNDERTONES) }),
  head: z.object({ shape: z.enum(FACE_SHAPES), width: gene, jaw: gene, chin: gene, length: gene, cheekbones: gene, forehead: gene, build: gene }),
  eyes: z.object({ shape: z.enum(FACE_EYE_SHAPES), color: z.enum(FACE_EYE_COLORS), size: gene, spacing: gene, tilt: gene, openness: gene }),
  brows: z.object({ style: z.enum(FACE_BROW_STYLES), thickness: gene, arch: gene, tilt: gene, height: gene }),
  nose: z.object({ length: gene, width: gene, bridge: gene, tip: gene }),
  mouth: z.object({ width: gene, upper: gene, lower: gene, bow: gene, expression: gene }),
  ears: z.object({ size: gene, set: gene }),
  hair: z.object({
    cut: z.enum(FACE_HAIR_CUTS),
    texture: z.enum(FACE_HAIR_TEXTURES),
    color: z.enum(FACE_HAIR_COLORS),
    // The age graying begins, as a gene: the renderer reads the person's age against it.
    grayOnset: gene,
    recession: gene,
    part: gene,
    volume: gene,
    dyed: z.boolean(),
  }),
  facialHair: z.enum(FACE_FACIAL_HAIR),
  eyewear: z.object({ style: z.enum(FACE_EYEWEAR), frame: z.enum(FACE_FRAME_COLORS), tinted: z.boolean() }),
  makeup: z.object({ lips: z.enum(FACE_LIPSTICKS), eyes: z.enum(FACE_EYE_MAKEUP), blush: gene }),
  headwear: z.object({ style: z.enum(FACE_HEADWEAR), color: Fabric, accent: Fabric }),
  attire: z.object({ garment: z.enum(FACE_GARMENTS), primary: Fabric, secondary: Fabric, accent: Fabric, pin: z.enum(FACE_PINS) }),
  jewelry: z.object({ earrings: z.enum(FACE_EARRINGS), necklace: z.enum(FACE_NECKLACES), brooch: z.enum(FACE_BROOCHES) }),
  marks: z.object({ freckles: gene, mole: gene, lines: gene }),
});
export type FaceGenome = z.infer<typeof FaceGenome>;
