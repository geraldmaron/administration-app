import { hslToHex } from "./color";
import { LIPSTICK } from "./face";
import { FRAMES } from "./headwear";
import { EYES, HAIR, TONES } from "./palette";
import { FABRICS } from "./types";

// The colors a face builder offers, taken from the same tables the renderer
// paints with, so a swatch is exactly the color that lands on the face.

export const SKIN_SWATCHES: Readonly<Record<string, string>> = Object.fromEntries(TONES.map((tone, index) => [String(index + 1), hslToHex(tone)]));
export const HAIR_SWATCHES: Readonly<Record<string, string>> = HAIR;
export const EYE_SWATCHES: Readonly<Record<string, string>> = EYES;
export const FABRIC_SWATCHES: Readonly<Record<string, string>> = FABRICS;
export const FRAME_SWATCHES: Readonly<Record<string, string>> = FRAMES;
export const LIPSTICK_SWATCHES: Readonly<Record<string, string>> = { none: "transparent", ...LIPSTICK };
