// Contrast is a token-level property, not a per-screen one: a color pairing
// either clears the standard everywhere it is used or it should not be a token.
// The ratios here are WCAG 2.1's, computed from the same hex the components
// render, so the checks in patterns.test.ts and ramps.test.ts fail on a token
// edit rather than on a review someone remembers to do.

export type Rgb = { readonly r: number; readonly g: number; readonly b: number };

export function parseHex(hex: string): Rgb {
  const body = hex.replace("#", "");
  const full =
    body.length === 3
      ? body
          .split("")
          .map((digit) => digit + digit)
          .join("")
      : body;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) throw new Error(`"${hex}" is not a 3- or 6-digit hex color.`);
  return {
    r: Number.parseInt(full.slice(0, 2), 16),
    g: Number.parseInt(full.slice(2, 4), 16),
    b: Number.parseInt(full.slice(4, 6), 16),
  };
}

function channelLuminance(value8Bit: number): number {
  const channel = value8Bit / 255;
  return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
}

/** WCAG relative luminance, 0 (black) to 1 (white). */
export function relativeLuminance(hex: string): number {
  const { r, g, b } = parseHex(hex);
  return (
    0.2126 * channelLuminance(r) + 0.7152 * channelLuminance(g) + 0.0722 * channelLuminance(b)
  );
}

/** WCAG contrast ratio between two opaque colors, 1:1 to 21:1. */
export function contrastRatio(foreground: string, background: string): number {
  const a = relativeLuminance(foreground);
  const b = relativeLuminance(background);
  const lighter = Math.max(a, b);
  const darker = Math.min(a, b);
  return (lighter + 0.05) / (darker + 0.05);
}

// WCAG 2.1 AA. "Large" is >=18pt, or >=14pt bold — which in this app's scale
// means heading and display sizes only; label/body/caption are all normal text.
export const AA_NORMAL_TEXT = 4.5;
export const AA_NON_TEXT = 3; // borders, focus rings, meaningful graphics
