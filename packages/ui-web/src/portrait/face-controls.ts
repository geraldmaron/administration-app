import {
  FACE_BROOCHES,
  FACE_BROW_STYLES,
  FACE_EARRINGS,
  FACE_EYE_COLORS,
  FACE_EYE_MAKEUP,
  FACE_EYE_SHAPES,
  FACE_EYEWEAR,
  FACE_FABRICS,
  FACE_FACIAL_HAIR,
  FACE_FRAME_COLORS,
  FACE_HAIR_COLORS,
  FACE_HAIR_CUTS,
  FACE_HAIR_TEXTURES,
  FACE_HEADWEAR,
  FACE_LIPSTICKS,
  FACE_NECKLACES,
  FACE_PINS,
  FACE_SHAPES,
  FACE_UNDERTONES,
  type FaceGenome,
} from "@admin/world";
import type { FaceRegion } from "./crop";
import { EYE_SWATCHES, FABRIC_SWATCHES, FRAME_SWATCHES, HAIR_SWATCHES, LIPSTICK_SWATCHES, SKIN_SWATCHES } from "./swatches";

// Every control the face builder offers, as data: which gene it edits, and how.
// The option lists are the genome's own registries, so a part added to the
// schema appears here without a line of new interface code.

export type GenePath = readonly [string] | readonly [string, string];

export type FaceControl =
  | {
      readonly kind: "choice";
      readonly label: string;
      readonly path: GenePath;
      readonly options: readonly string[];
      /** Where the choice shows, when it is not where the rest of its section does: a beard on the lower face. */
      readonly region?: FaceRegion;
    }
  | {
      readonly kind: "swatch";
      readonly label: string;
      readonly path: GenePath;
      readonly options: readonly string[];
      readonly colors: Readonly<Record<string, string>>;
      /** The gene is a number the swatches name as text: skin tone. */
      readonly numeric?: boolean;
    }
  | { readonly kind: "slider"; readonly label: string; readonly path: GenePath; readonly low: string; readonly high: string }
  | { readonly kind: "toggle"; readonly label: string; readonly path: GenePath };

/** One tab of the builder, and the part of the face its pictures are cropped to. */
export type FaceSection = { readonly id: string; readonly label: string; readonly region: FaceRegion; readonly controls: readonly FaceControl[] };

const slider = (label: string, path: GenePath, low: string, high: string): FaceControl => ({ kind: "slider", label, path, low, high });
const choice = (label: string, path: GenePath, options: readonly string[], region?: FaceRegion): FaceControl => ({ kind: "choice", label, path, options, ...(region ? { region } : {}) });
const swatch = (label: string, path: GenePath, options: readonly string[], colors: Readonly<Record<string, string>>): FaceControl => ({ kind: "swatch", label, path, options, colors });

/** What a President might sit for: the dress of an American officeholder and the dress of the heritage they carry. */
const PRESIDENTIAL_DRESS = ["suit", "suit-open", "blazer", "dress", "nehru", "kaftan", "thobe", "academic", "field", "ceremonial", "military-open"] as const;

export const FACE_SECTIONS: readonly FaceSection[] = [
  {
    id: "face",
    label: "Face",
    region: "head",
    controls: [
      choice("Shape", ["head", "shape"], FACE_SHAPES),
      slider("Width", ["head", "width"], "Narrow", "Broad"),
      slider("Length", ["head", "length"], "Short", "Long"),
      slider("Jaw", ["head", "jaw"], "Tapered", "Strong"),
      slider("Chin", ["head", "chin"], "Pointed", "Broad"),
      slider("Cheekbones", ["head", "cheekbones"], "Soft", "High"),
      slider("Forehead", ["head", "forehead"], "Low", "High"),
      slider("Build", ["head", "build"], "Lean", "Heavy"),
      slider("Ears", ["ears", "size"], "Small", "Large"),
    ],
  },
  {
    id: "eyes",
    label: "Eyes",
    region: "eyes",
    controls: [
      choice("Lids", ["eyes", "shape"], FACE_EYE_SHAPES),
      swatch("Color", ["eyes", "color"], FACE_EYE_COLORS, EYE_SWATCHES),
      slider("Size", ["eyes", "size"], "Small", "Large"),
      slider("Spacing", ["eyes", "spacing"], "Close", "Wide"),
      slider("Tilt", ["eyes", "tilt"], "Down", "Up"),
      slider("Openness", ["eyes", "openness"], "Narrow", "Open"),
      choice("Brows", ["brows", "style"], FACE_BROW_STYLES),
      slider("Brow weight", ["brows", "thickness"], "Fine", "Heavy"),
      slider("Brow arch", ["brows", "arch"], "Flat", "Arched"),
      slider("Brow set", ["brows", "tilt"], "Stern", "Raised"),
    ],
  },
  {
    id: "features",
    label: "Nose and mouth",
    region: "features",
    controls: [
      slider("Nose length", ["nose", "length"], "Short", "Long"),
      slider("Nose width", ["nose", "width"], "Narrow", "Wide"),
      slider("Bridge", ["nose", "bridge"], "Low", "High"),
      slider("Tip", ["nose", "tip"], "Fine", "Full"),
      slider("Mouth width", ["mouth", "width"], "Narrow", "Wide"),
      slider("Upper lip", ["mouth", "upper"], "Thin", "Full"),
      slider("Lower lip", ["mouth", "lower"], "Thin", "Full"),
      slider("Resting expression", ["mouth", "expression"], "Grave", "Warm"),
    ],
  },
  {
    id: "skin",
    label: "Skin",
    region: "head",
    controls: [
      { kind: "swatch", label: "Tone", path: ["skin", "tone"], options: ["1", "2", "3", "4", "5", "6"], colors: SKIN_SWATCHES, numeric: true },
      slider("Shade", ["skin", "shade"], "Deeper", "Lighter"),
      choice("Undertone", ["skin", "undertone"], FACE_UNDERTONES),
      slider("Freckles", ["marks", "freckles"], "None", "Many"),
      slider("Lines", ["marks", "lines"], "Smooth", "Lined"),
    ],
  },
  {
    id: "hair",
    label: "Hair",
    region: "hair",
    controls: [
      choice("Cut", ["hair", "cut"], FACE_HAIR_CUTS),
      choice("Texture", ["hair", "texture"], FACE_HAIR_TEXTURES),
      swatch("Color", ["hair", "color"], FACE_HAIR_COLORS, HAIR_SWATCHES),
      slider("Grays", ["hair", "grayOnset"], "Early", "Late"),
      { kind: "toggle", label: "Dyed", path: ["hair", "dyed"] },
      slider("Hairline", ["hair", "recession"], "Full", "Receding"),
      slider("Part", ["hair", "part"], "Left", "Right"),
      slider("Volume", ["hair", "volume"], "Flat", "Full"),
      choice("Beard", ["facialHair"], FACE_FACIAL_HAIR, "lower"),
    ],
  },
  {
    id: "glasses",
    label: "Glasses",
    region: "eyes",
    controls: [
      choice("Frames", ["eyewear", "style"], FACE_EYEWEAR),
      swatch("Frame color", ["eyewear", "frame"], FACE_FRAME_COLORS, FRAME_SWATCHES),
      { kind: "toggle", label: "Tinted lenses", path: ["eyewear", "tinted"] },
    ],
  },
  {
    id: "makeup",
    label: "Makeup",
    region: "features",
    controls: [
      swatch("Lips", ["makeup", "lips"], FACE_LIPSTICKS, LIPSTICK_SWATCHES),
      choice("Eyes", ["makeup", "eyes"], FACE_EYE_MAKEUP),
      slider("Blush", ["makeup", "blush"], "None", "Warm"),
    ],
  },
  {
    id: "dress",
    label: "Dress",
    region: "dress",
    controls: [
      choice("Wearing", ["attire", "garment"], PRESIDENTIAL_DRESS),
      swatch("Main", ["attire", "primary"], FACE_FABRICS, FABRIC_SWATCHES),
      swatch("Shirt or blouse", ["attire", "secondary"], FACE_FABRICS, FABRIC_SWATCHES),
      swatch("Tie or accent", ["attire", "accent"], FACE_FABRICS, FABRIC_SWATCHES),
      choice("Lapel pin", ["attire", "pin"], FACE_PINS),
      choice("Head covering", ["headwear", "style"], FACE_HEADWEAR, "hair"),
      swatch("Covering color", ["headwear", "color"], FACE_FABRICS, FABRIC_SWATCHES),
    ],
  },
  {
    id: "jewelry",
    label: "Jewelry",
    region: "portrait",
    controls: [choice("Earrings", ["jewelry", "earrings"], FACE_EARRINGS, "head"), choice("Necklace", ["jewelry", "necklace"], FACE_NECKLACES, "dress"), choice("Brooch", ["jewelry", "brooch"], FACE_BROOCHES, "dress")],
  },
];

const LABELS: Readonly<Record<string, string>> = {
  "suit-open": "Suit, open collar",
  "military-open": "Service dress",
  "curls-long": "Long curls",
  "close-coils": "Close coils",
  "comb-over": "Comb-over",
  "high-top": "High-top",
  "low-bun": "Low bun",
  "tied-back": "Tied back",
  "side-part": "Side part",
  "swept-back": "Swept back",
  "slick-back": "Slicked back",
  "curly-top": "Curly top",
  "circle-beard": "Circle beard",
  "short-beard": "Short beard",
  "full-beard": "Full beard",
  "long-beard": "Long beard",
  "cat-eye": "Cat-eye",
  "dark-brown": "Dark brown",
  "light-brown": "Light brown",
  "dark-blonde": "Dark blonde",
  turban: "Dastar",
  none: "None",
};

/** A registry id as the builder shows it. */
export function optionLabel(id: string): string {
  const known = LABELS[id];
  if (known) return known;
  if (/^\d$/.test(id)) return `Tone ${id}`;
  const words = id.replace(/-/g, " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export function readGene(genome: FaceGenome, path: GenePath): unknown {
  const group = (genome as Record<string, unknown>)[path[0]];
  return path.length === 1 ? group : (group as Record<string, unknown>)[path[1]];
}

/** A new genome with one gene changed; the old one is untouched. */
export function writeGene(genome: FaceGenome, path: GenePath, value: unknown): FaceGenome {
  if (path.length === 1) return { ...genome, [path[0]]: value } as FaceGenome;
  const group = (genome as Record<string, unknown>)[path[0]] as Record<string, unknown>;
  return { ...genome, [path[0]]: { ...group, [path[1]]: value } } as FaceGenome;
}

/** The genes one section edits, copied from another face: redrawing a section and nothing else. */
export function withSection(genome: FaceGenome, from: FaceGenome, section: FaceSection): FaceGenome {
  return section.controls.reduce((acc, control) => writeGene(acc, control.path, readGene(from, control.path)), genome);
}
