import { color } from "./color.js";

// The pigments a drawn portrait is painted with. Not interface color: these are
// the palette of people (skin, hair, eyes, cloth) and the few fixed pigments of
// a studio sitting, held here so the player that draws faces carries no raw hex.
// Cloth is muted on purpose: it is cloth under portrait light, never a swatch.

/** Six skin tones as HSL anchors, spaced for an even perceived step rather than an even lightness step. */
const skinTones = [
  { h: 22, s: 0.58, l: 0.84 },
  { h: 25, s: 0.52, l: 0.75 },
  { h: 27, s: 0.46, l: 0.645 },
  { h: 26, s: 0.43, l: 0.53 },
  { h: 23, s: 0.42, l: 0.405 },
  { h: 20, s: 0.4, l: 0.29 },
] as const;

const cloth = {
  navy: "#1F2B45",
  charcoal: "#2F3237",
  black: "#18191C",
  slate: "#4A4F58",
  midnight: "#1C2E4F",
  brown: "#4A3A2E",
  olive: "#4B5234",
  forest: "#34432F",
  khaki: "#9C8B60",
  "air-blue": "#3A4E6A",
  burgundy: "#6B2231",
  emerald: "#1E5747",
  royal: "#2B4A94",
  cream: "#DCCFB6",
  red: "#A33434",
  teal: "#1F5C63",
  plum: "#4E2C4D",
  white: "#ECEAE6",
  "light-blue": "#C7D6E8",
  blush: "#E2C1BA",
  beige: "#CDB797",
  taupe: "#8E7A67",
  maroon: "#632432",
  "dusty-rose": "#B48585",
  sand: "#BFA67E",
  gold: "#B8913A",
  silver: "#8E949C",
  crimson: "#A8323A",
  blue: "#2F5D9B",
  green: "#2F5E45",
  saffron: "#D08A2C",
  tweed: "#6A5A45",
  camel: "#A07F55",
  ivory: "#EFE8DA",
} as const;

export const portrait = {
  skin: {
    tones: skinTones,
    /** Warmth pooled in the cheeks. */
    blush: "#C9544E",
    /** Light scattering red beneath the skin where it turns from light into shadow. */
    scatter: "#C2412F",
    /** The line where lips part and nostrils open, deepened from the skin. */
    line: "#24140F",
    lip: { light: "#B85E5C", mid: "#98504A", deep: "#5A2C2A" },
  },
  hair: {
    natural: {
      black: "#1D1917",
      "dark-brown": "#33251D",
      brown: "#533A2A",
      "light-brown": "#7A5A40",
      "dark-blonde": "#9C7D52",
      blonde: "#C4A06A",
      auburn: "#77391F",
      copper: "#A2532C",
    },
    /** The two ends of graying: salt-and-pepper, then white. */
    silver: { dark: "#9D9B97", light: "#E4E1DB" },
    /** Beards gray a little ahead of the head. */
    beardSilver: "#CFCBC4",
  },
  eye: {
    iris: {
      "dark-brown": "#2E1C12",
      brown: "#4F321D",
      hazel: "#6E5A2E",
      amber: "#7D5420",
      green: "#51704A",
      blue: "#4F77A0",
      gray: "#738291",
    },
    sclera: { lid: "#C9BFB4", mid: "#E8E2DA", low: "#F1ECE5" },
    lash: "#1C130F",
    pupil: "#0E0A08",
    limbus: "#1A120E",
    waterline: "#E6C8BE",
    smoky: "#3B2A36",
  },
  lipstick: { nude: "#B7806D", rose: "#B55E6A", berry: "#8C3350", red: "#A6282F", plum: "#6C2D4A", coral: "#CB6656" },
  frames: { black: "#1B1B1D", slate: cloth.slate, gold: cloth.gold, silver: "#A9AFB6", tortoise: "#5A3A24", burgundy: "#5E1F2B" },
  lens: { clear: "#CFE0F2", tinted: "#2E3A46" },
  cloth,
  shirt: "#EEF0F2",
  clerical: { shirt: "#1B1B1F", tab: "#F2F0EC" },
  robe: { body: "#16171A", seam: "#2A2B30", edge: "#0E0F11", collar: "#F2F0EB", collarEdge: "#CFCAC0" },
  metal: { gold: color.mark.gold, goldEdge: "#8E7443" },
  pearl: { face: "#EFE9DF", edge: "#B9AF9F" },
  flagPin: { field: "#F2EFE8", stripe: "#B83838", canton: "#2B3F7A" },
  ribbons: ["#B83838", cloth.blue, "#E3C45A", "#2F6B45", "#F1EEE6", "#6B2D5C", "#D98A3A", cloth.navy],
  shemagh: { ground: "#F0ECE6", thread: "#B02A30" },
  peci: "#151517",
  agal: "#141414",
  studio: {
    backdrop: { center: "#2F4C6C", mid: "#1B3452", edge: "#0F2238" },
    /** Cool light off the backdrop, along the shadow side of a face. */
    rim: "#A9C0D8",
    light: "#FFFFFF",
    shadow: "#000000",
  },
  treatment: { wire: "#8F8E8A", archival: "#7A6A55", silhouette: "#2A4868", redaction: "#0A0A0C" },
} as const;

export type PortraitCloth = keyof typeof cloth;
