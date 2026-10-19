import { dark } from "@admin/design";

const [r, g, b] = [1, 3, 5].map((at) => parseInt(dark.ground.abyss.slice(at, at + 2), 16));

/**
 * The night ground at a given opacity, for what dims the page behind a layer
 * (a sheet's scrim, the title screen's fade over the world plate). It is the
 * one see-through color outside a chart band, so it is built here from the
 * token rather than written as a literal where it is used.
 */
export function veil(alpha: number): string {
  return `rgba(${r}, ${g}, ${b}, ${Math.max(0, Math.min(1, alpha))})`;
}
