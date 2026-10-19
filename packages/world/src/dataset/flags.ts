import {
  FlagDesign,
  type FlagEmblem,
  type FlagLayout,
  type FlagTincture,
} from "../schemas/flag.js";

// The authored flag vocabulary: what a banner in this world can be made of, and
// what makes one legible enough to fly.
//
// Color lives here rather than in the design system because it is world data,
// not theme: these are the pigments a country in this setting has, and they do
// not restyle when the app does. `packages/ui` is handed resolved hex and draws
// it, which is why the design system needs no knowledge of tincture ids and the
// engine needs no knowledge of geometry.

export type FlagTinctureSpec = {
  /** What a player and a screen reader both call it. */
  readonly name: string;
  readonly hex: string;
};

// Fourteen pigments, weighted the way national flags actually are: several
// saturated darks, two metals, one near-white, and enough earth tones that a
// flag can be sober rather than primary.
export const FLAG_TINCTURES: Readonly<Record<FlagTincture, FlagTinctureSpec>> = {
  crimson: { name: "Crimson", hex: "#A3182B" },
  vermilion: { name: "Vermilion", hex: "#D9442A" },
  ochre: { name: "Ochre", hex: "#B7791F" },
  gold: { name: "Gold", hex: "#E3B341" },
  bone: { name: "Bone", hex: "#F2ECE1" },
  ash: { name: "Ash", hex: "#9AA0A6" },
  slate: { name: "Slate", hex: "#4A5560" },
  ink: { name: "Ink", hex: "#16243F" },
  sea: { name: "Sea", hex: "#1F7A78" },
  pine: { name: "Pine", hex: "#14452F" },
  verdant: { name: "Verdant", hex: "#2E8B4F" },
  plum: { name: "Plum", hex: "#5B2B54" },
  sand: { name: "Sand", hex: "#D8C79A" },
  copper: { name: "Copper", hex: "#8C4A2F" },
};

export type FlagLayoutSpec = {
  readonly name: string;
  /** How many of the design's three tinctures this construction actually draws. */
  readonly bands: 2 | 3;
  /** Which tincture the charge is drawn over — the one it has to be legible against. */
  readonly emblemBand: 0 | 1 | 2;
  /** Which drawn areas share an edge, and therefore have to be told apart. */
  readonly touching: readonly (readonly [number, number])[];
};

export const FLAG_LAYOUTS: Readonly<Record<FlagLayout, FlagLayoutSpec>> = {
  "horizontal-bicolor": { name: "Horizontal bicolor", bands: 2, emblemBand: 0, touching: [[0, 1]] },
  "horizontal-triband": { name: "Horizontal triband", bands: 3, emblemBand: 1, touching: [[0, 1], [1, 2]] },
  "vertical-bicolor": { name: "Vertical bicolor", bands: 2, emblemBand: 0, touching: [[0, 1]] },
  "vertical-triband": { name: "Vertical triband", bands: 3, emblemBand: 1, touching: [[0, 1], [1, 2]] },
  "nordic-cross": { name: "Nordic cross", bands: 2, emblemBand: 0, touching: [[0, 1]] },
  saltire: { name: "Saltire", bands: 2, emblemBand: 1, touching: [[0, 1]] },
  canton: { name: "Canton", bands: 2, emblemBand: 1, touching: [[0, 1]] },
  "hoist-triangle": { name: "Hoist triangle", bands: 3, emblemBand: 2, touching: [[0, 1], [0, 2], [1, 2]] },
  bordered: { name: "Bordered field", bands: 2, emblemBand: 0, touching: [[0, 1]] },
  quartered: { name: "Quartered", bands: 2, emblemBand: 0, touching: [[0, 1]] },
};

export const FLAG_EMBLEMS: Readonly<Record<FlagEmblem, string>> = {
  none: "No charge",
  star: "Star",
  crescent: "Crescent",
  sun: "Sun",
  wing: "Wing",
  wheat: "Wheat",
  tower: "Tower",
  anchor: "Anchor",
  flame: "Flame",
  laurel: "Laurel",
  mountain: "Mountain",
  key: "Key",
  trident: "Trident",
  book: "Book",
};

// --- Legibility: the rule of tincture, as a computation. ------------------

function channel(hex: string, offset: number): number {
  const raw = Number.parseInt(hex.slice(offset, offset + 2), 16) / 255;
  return raw <= 0.04045 ? raw / 12.92 : ((raw + 0.055) / 1.055) ** 2.4;
}

/**
 * sRGB relative luminance, 0..1 — derived from the pigment rather than authored
 * beside it, so a palette edit cannot leave a stale brightness behind it.
 */
export function tinctureLuminance(tincture: FlagTincture): number {
  const { hex } = FLAG_TINCTURES[tincture];
  return 0.2126 * channel(hex, 1) + 0.7152 * channel(hex, 3) + 0.0722 * channel(hex, 5);
}

// Heraldry's oldest rule — never metal on metal, never color on color —
// exists because a flag is read at distance, at speed, against weather. These
// are that rule as numbers. The charge floor is the higher of the two: a star
// is a thin shape carrying detail, where a band is half the field.
const BAND_CONTRAST_FLOOR = 0.1;
const EMBLEM_CONTRAST_FLOOR = 0.15;

export type FlagObjection = {
  /** In-fiction, because it is read by a player designing a flag, not a linter. */
  readonly explanation: string;
};

/**
 * Whether a design would actually read as a flag. Two near-identical greens
 * beside each other are not a bicolor, they are a smudge — and a charge that
 * disappears into the field it sits on is a charge nobody will ever see.
 */
export function flagObjections(design: FlagDesign): readonly FlagObjection[] {
  const spec = FLAG_LAYOUTS[design.layout];
  const objections: FlagObjection[] = [];

  for (const [a, b] of spec.touching) {
    const first = design.tinctures[a]!;
    const second = design.tinctures[b]!;
    if (Math.abs(tinctureLuminance(first) - tinctureLuminance(second)) >= BAND_CONTRAST_FLOOR) continue;
    objections.push({
      explanation: `${FLAG_TINCTURES[first].name} and ${FLAG_TINCTURES[second].name} sit against each other too closely to be told apart at any distance — from a mast this reads as one color, not two.`,
    });
  }

  if (design.emblem !== "none") {
    const field = design.tinctures[spec.emblemBand]!;
    if (Math.abs(tinctureLuminance(design.emblemTincture) - tinctureLuminance(field)) < EMBLEM_CONTRAST_FLOOR) {
      objections.push({
        explanation: `A ${FLAG_EMBLEMS[design.emblem].toLowerCase()} in ${FLAG_TINCTURES[design.emblemTincture].name} vanishes into a ${FLAG_TINCTURES[field].name} field. The charge has to be visible from further away than the flag is wide.`,
      });
    }
  }

  return objections;
}

/**
 * The banner a founding opens on: sober, legible, and plainly a placeholder for
 * the player's own — three bands and a single star, the most common national
 * flag on earth in outline.
 */
export const defaultFlagDesign: FlagDesign = FlagDesign.parse({
  layout: "horizontal-triband",
  tinctures: ["crimson", "bone", "ink"],
  emblem: "star",
  emblemTincture: "ink",
});
