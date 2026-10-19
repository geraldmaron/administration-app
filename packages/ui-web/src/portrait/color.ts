// Color arithmetic in HSL, where "a little darker, a little warmer" is one move.

export type Hsl = { readonly h: number; readonly s: number; readonly l: number };

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

export function hexToHsl(hex: string): Hsl {
  const n = Number.parseInt(hex.replace("#", ""), 16);
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return { h: h * 60, s, l };
}

export function hslToHex({ h, s, l }: Hsl): string {
  const hue = ((h % 360) + 360) % 360;
  const sat = clamp01(s);
  const lig = clamp01(l);
  const c = (1 - Math.abs(2 * lig - 1)) * sat;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = lig - c / 2;
  const [r, g, b] =
    hue < 60 ? [c, x, 0] : hue < 120 ? [x, c, 0] : hue < 180 ? [0, c, x] : hue < 240 ? [0, x, c] : hue < 300 ? [x, 0, c] : [c, 0, x];
  const to = (v: number) => Math.round((v + m) * 255).toString(16).padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`;
}

export function shift(hex: string, d: { h?: number; s?: number; l?: number }): string {
  const c = hexToHsl(hex);
  return hslToHex({ h: c.h + (d.h ?? 0), s: c.s + (d.s ?? 0), l: c.l + (d.l ?? 0) });
}

export function mix(a: string, b: string, t: number): string {
  const pa = Number.parseInt(a.replace("#", ""), 16);
  const pb = Number.parseInt(b.replace("#", ""), 16);
  const ch = (p: number, s: number) => (p >> s) & 255;
  const m = (s: number) => Math.round(ch(pa, s) + (ch(pb, s) - ch(pa, s)) * t);
  return `#${[16, 8, 0].map((s) => m(s).toString(16).padStart(2, "0")).join("")}`;
}
