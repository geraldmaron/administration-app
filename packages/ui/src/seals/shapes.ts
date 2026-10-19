import { circle, poly, polar, star } from "./devices/draw";

/*
 * Seal outlines on a 200×200 grid centered at (100, 100). Each returns the
 * outline at a given inset so the rim and the field are the same figure.
 */

function octagon(r: number): string {
  return poly(Array.from({ length: 8 }, (_, i) => polar(100, 100, r, 22.5 + i * 45)));
}

function rosette(r: number): string {
  const lobes = 24;
  const step = 360 / lobes;
  const start = polar(100, 100, r * 0.94, 0);
  const segments = Array.from({ length: lobes }, (_, i) => {
    const [cx, cy] = polar(100, 100, r * 1.04, i * step + step / 2);
    const [x, y] = polar(100, 100, r * 0.94, (i + 1) * step);
    return `Q${cx.toFixed(2)},${cy.toFixed(2)} ${x.toFixed(2)},${y.toFixed(2)}`;
  });
  return `M${start[0].toFixed(2)},${start[1].toFixed(2)} ${segments.join(" ")} Z`;
}


function shield(inset: number): string {
  const [l, t, r] = [14 + inset, 8 + inset, 186 - inset];
  const bottom = 194 - inset * 1.4;
  return `M${l},${t} L${r},${t} L${r},92 C${r},146 ${140 - inset * 0.4},176 100,${bottom} C${60 + inset * 0.4},176 ${l},146 ${l},92 Z`;
}

function badge(inset: number): string {
  const [a, b, rr] = [6 + inset, 194 - inset, Math.max(4, 22 - inset)];
  return `M${a + rr},${a} L${b - rr},${a} Q${b},${a} ${b},${a + rr} L${b},${b - rr} Q${b},${b} ${b - rr},${b} L${a + rr},${b} Q${a},${b} ${a},${b - rr} L${a},${a + rr} Q${a},${a} ${a + rr},${a} Z`;
}

export type ShapeName = "roundel" | "shield" | "star" | "masthead" | "rosette" | "octagon";

/** The outline at `inset` grid units inside the outer edge. */
export function outline(shape: ShapeName, inset: number): string {
  switch (shape) {
    case "roundel":
      return circle(100, 100, 98 - inset);
    case "octagon":
      return octagon(102 - inset * 1.08);
    case "rosette":
      return rosette(100 - inset);
    case "shield":
      return shield(inset);
    case "star":
      return star(100, 106, 100 - inset * 1.6, 5, 0.5);
    case "masthead":
      return badge(inset);
  }
}

/** Where the device sits and how much room it has, by shape. */
export function centerOf(shape: ShapeName): { readonly x: number; readonly y: number; readonly r: number } {
  switch (shape) {
    case "shield":
      return { x: 100, y: 96, r: 66 };
    case "star":
      return { x: 100, y: 108, r: 44 };
    default:
      return { x: 100, y: 100, r: 84 };
  }
}

