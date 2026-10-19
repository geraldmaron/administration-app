import { hslToHex } from "./color";
import { LIPSTICK } from "./face";
import { FRAMES } from "./headwear";
import { EYES, HAIR, TONES } from "./palette";
import { FABRICS } from "./types";
// The colors a face builder offers, taken from the same tables the renderer
// paints with, so a swatch is exactly the color that lands on the face.
export const SKIN_SWATCHES = Object.fromEntries(TONES.map((tone, index) => [String(index + 1), hslToHex(tone)]));
export const HAIR_SWATCHES = HAIR;
export const EYE_SWATCHES = EYES;
export const FABRIC_SWATCHES = FABRICS;
export const FRAME_SWATCHES = FRAMES;
export const LIPSTICK_SWATCHES = { none: "transparent", ...LIPSTICK };
