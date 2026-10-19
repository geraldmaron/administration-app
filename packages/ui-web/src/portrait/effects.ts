import { portrait } from "@admin/design";
import { el } from "./svg";

// The browser's own shaders: SVG filter primitives and gradients. They run
// once, when the browser rasterizes a portrait, and the result is cached with
// the image, so a face costs the same to show the hundredth time as a flat one.

/** Blur radii, in frame units, named by what they soften. */
export const SOFT = { edge: "e", fold: "f", form: "m", glow: "g" } as const;
const RADII: Record<(typeof SOFT)[keyof typeof SOFT], number> = { e: 0.28, f: 1.1, m: 2.6, g: 4.5 };

export const blurRef = (id: string, key: (typeof SOFT)[keyof typeof SOFT]): string => `url(#${id}-${key})`;

function blurs(id: string): string {
  return Object.entries(RADII)
    .map(([key, sd]) => el("filter", { id: `${id}-${key}`, x: "-30%", y: "-30%", width: "160%", height: "160%" }, el("feGaussianBlur", { stdDeviation: sd })))
    .join("");
}

/** Film grain: a fine monochrome noise that breaks up flat vector fills. */
function grain(id: string): string {
  return el(
    "filter",
    { id: `${id}-grain`, x: 0, y: 0, width: "100%", height: "100%", "color-interpolation-filters": "sRGB" },
    el("feTurbulence", { type: "fractalNoise", baseFrequency: 0.85, numOctaves: 2, seed: 3, result: "n" }) +
      el("feColorMatrix", { in: "n", type: "matrix", values: "0 0 0 0 0.5 0 0 0 0 0.5 0 0 0 0 0.5 1.6 0 0 0 -0.55" }),
  );
}

/** A coarser weave for cloth, so a suit reads as wool rather than paint. */
function weave(id: string): string {
  return el(
    "filter",
    { id: `${id}-weave`, x: 0, y: 0, width: "100%", height: "100%", "color-interpolation-filters": "sRGB" },
    el("feTurbulence", { type: "fractalNoise", baseFrequency: "2.2 0.9", numOctaves: 1, seed: 11, result: "n" }) +
      el("feColorMatrix", { in: "n", type: "matrix", values: "0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1.4 -0.62" }),
  );
}

function vignette(id: string): string {
  return el(
    "radialGradient",
    { id: `${id}-vig`, cx: 0.5, cy: 0.42, r: 0.72 },
    el("stop", { offset: 0.55, "stop-color": portrait.studio.shadow, "stop-opacity": 0 }) + el("stop", { offset: 1, "stop-color": portrait.studio.shadow, "stop-opacity": 0.32 }),
  );
}

/** Top-lit cloth: a touch of light across the shoulders, falling off toward the frame's edge. */
function clothLight(id: string): string {
  return el(
    "linearGradient",
    { id: `${id}-cloth`, x1: 0, y1: 0, x2: 0, y2: 1 },
    el("stop", { offset: 0.72, "stop-color": portrait.studio.light, "stop-opacity": 0.1 }) +
      el("stop", { offset: 0.85, "stop-color": portrait.studio.light, "stop-opacity": 0 }) +
      el("stop", { offset: 1, "stop-color": portrait.studio.shadow, "stop-opacity": 0.28 }),
  );
}

export function effectDefs(id: string): string {
  return blurs(id) + grain(id) + weave(id) + vignette(id) + clothLight(id);
}

/** Drawn last: the grain and the vignette that make the frame a photograph of a sitting. */
export function finish(id: string): string {
  return (
    el("rect", { width: 200, height: 200, filter: `url(#${id}-grain)`, opacity: 0.5, style: "mix-blend-mode:soft-light" }) +
    el("rect", { width: 200, height: 200, fill: `url(#${id}-vig)` })
  );
}
