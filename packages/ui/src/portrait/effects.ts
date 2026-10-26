import { portrait } from "@admin/design";
import { el } from "./svg";

// SVG filter primitives and gradients, limited to what react-native-svg draws
// on iOS, Android and the web: blurs and color matrices. It renders no
// turbulence, so the legacy renderer's film grain and cloth weave are left out
// here and the finish is the vignette alone.

/** Blur radii, in frame units, named by what they soften. */
export const SOFT = { edge: "e", fold: "f", form: "m", glow: "g" } as const;
const RADII: Record<(typeof SOFT)[keyof typeof SOFT], number> = { e: 0.28, f: 1.1, m: 2.6, g: 4.5 };

export const blurRef = (id: string, key: (typeof SOFT)[keyof typeof SOFT]): string => `url(#${id}-${key})`;

function blurs(id: string): string {
  return Object.entries(RADII)
    .map(([key, sd]) => el("filter", { id: `${id}-${key}`, x: "-30%", y: "-30%", width: "160%", height: "160%" }, el("feGaussianBlur", { stdDeviation: sd })))
    .join("");
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
  return blurs(id) + vignette(id) + clothLight(id);
}

/** Drawn last: the vignette that makes the frame a photograph of a sitting. */
export function finish(id: string): string {
  return el("rect", { width: 200, height: 200, fill: `url(#${id}-vig)` });
}
