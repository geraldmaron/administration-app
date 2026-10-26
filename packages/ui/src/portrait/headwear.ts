import { portrait } from "@admin/design";
import { shift } from "./color";
import { FABRICS, type FaceGenome, type Headwear } from "./types";
import { CX, pt, ribbon, sample, smooth, symmetric, type Pt } from "./geometry";
import { onShoulders, type Layout } from "./layout";
import { clip, el, group, path } from "./svg";

// Head coverings and what sits on the face: they are drawn last, over hair and
// ears, because in a portrait they are in front of both.

/** Coverings that hide the hair entirely, so no cut is drawn beneath them. */
export const HIDES_HAIR: ReadonlySet<Headwear> = new Set(["hijab", "headwrap", "gele", "turban", "ghutra", "shemagh", "amamah"]);
/** Coverings that also hide the ears. */
export const HIDES_EARS: ReadonlySet<Headwear> = new Set(["hijab", "ghutra", "shemagh", "dupatta"]);

export const FRAMES: Readonly<Record<FaceGenome["eyewear"]["frame"], string>> = portrait.frames;

/** A scarf over the back of the head: the front hair shows, the ears and shoulders do not. */
function dupatta(L: Layout, g: FaceGenome): string {
  const n = L.neckW;
  const inner = (s: 1 | -1): Pt[] => [
    pt(CX + s * (L.templeW * 0.55), L.crownY + 4),
    pt(CX + s * (L.templeW + 1.2), L.templeY - 5),
    pt(CX + s * (L.cheekW + 1.2), L.cheekY),
    pt(CX + s * (L.jawW + 2), L.jawY + 5),
    pt(CX + s * (n + 6), 149),
    pt(CX + s * 18, 214),
  ];
  const outerSide = (s: 1 | -1): Pt[] => [
    pt(CX + s * 50, 214),
    pt(CX + s * 46, 176),
    pt(CX + s * (n + 19), 150),
    pt(CX + s * (L.cheekW + 8), L.cheekY + 8),
    pt(CX + s * (L.templeW + 7), L.templeY - 12),
    pt(CX + s * (L.templeW * 0.7), L.crownY - 3),
  ];
  const shape = onShoulders(L, [...inner(-1).reverse(), pt(CX, L.crownY + 3), ...inner(1), ...outerSide(1), pt(CX, L.crownY - 5), ...outerSide(-1).reverse()]);
  const color = FABRICS[g.headwear.color];
  const border = [...inner(1)].map((p) => pt(p.x + 1.6, p.y));
  return (
    path(smooth(shape, true, 0.7), { fill: color }) +
    path(smooth(border, false), { fill: "none", stroke: FABRICS[g.headwear.accent], "stroke-width": 1.4 }) +
    path(smooth([...inner(-1)].map((p) => pt(p.x - 1.6, p.y)), false), { fill: "none", stroke: FABRICS[g.headwear.accent], "stroke-width": 1.4 })
  );
}

function hijab(id: string, L: Layout, g: FaceGenome): string {
  const color = FABRICS[g.headwear.color];
  const n = L.neckW;
  const outer = onShoulders(L, symmetric([
    pt(CX, L.crownY - 7),
    pt(CX + L.templeW * 0.82, L.crownY - 2),
    pt(CX + L.templeW + 7.5, L.templeY - 14),
    pt(CX + L.cheekW + 8.5, L.eyeY + 5),
    pt(CX + L.jawW + 8, L.jawY + 3),
    pt(CX + n + 14, 147),
    pt(CX + 43, 162),
    pt(CX + 47, 182),
    pt(CX + 30, 204),
    pt(CX, 208),
  ]));
  const opening = symmetric([
    pt(CX, L.hairlineY - 1),
    pt(CX + L.templeW - 5, L.hairlineY + 2.5),
    pt(CX + L.templeW - 1.6, L.templeY + 1),
    pt(CX + L.cheekW - 1.4, L.cheekY),
    pt(CX + L.jawW - 1, L.jawY),
    pt(CX + L.chinW + 2, L.chinY + 0.8),
    pt(CX, L.chinY + 2),
  ]);
  const d = smooth(outer) + smooth(opening);
  const band = group(path(smooth(opening), { fill: "none", stroke: FABRICS[g.headwear.accent], "stroke-width": 5 }), { "clip-path": `url(#${id}-brow)` });
  const folds = `M${CX - 22},${L.chinY + 9}Q${CX},${L.chinY + 17} ${CX + 23},${L.chinY + 8}M${CX - 28},${L.chinY + 20}Q${CX - 2},${L.chinY + 30} ${CX + 30},${L.chinY + 18}`;
  return (
    clip(`${id}-hijab`, d) +
    el("clipPath", { id: `${id}-brow` }, el("rect", { x: 0, y: 0, width: 200, height: L.browY - 4 })) +
    band +
    path(d, { fill: color, "fill-rule": "evenodd" }) +
    path(smooth(opening), { fill: "none", stroke: shift(color, { l: -0.1 }), "stroke-width": 0.8 }) +
    group(
      el("rect", { x: 0, y: 0, width: 200, height: 220, fill: `url(#${id}-side)` }) +
        path(folds, { fill: "none", stroke: shift(color, { l: -0.08 }), "stroke-width": 1.2, opacity: 0.8 }) +
        el("ellipse", { cx: CX - 12, cy: L.crownY + 6, rx: 18, ry: 8, fill: shift(color, { l: 0.1 }), opacity: 0.35 }),
      { "clip-path": `url(#${id}-hijab)`, "fill-rule": "evenodd" },
    )
  );
}

function dome(points: readonly Pt[], color: string, tension = 0.9): string {
  return path(smooth(points, true, tension), { fill: color });
}

function headwrap(L: Layout, g: FaceGenome): string {
  const color = FABRICS[g.headwear.color];
  const pts = [
    pt(CX - L.templeW - 3, L.hairlineY + 8),
    pt(CX - L.templeW - 5.5, L.crownY + 3),
    pt(CX - 14, L.crownY - 12),
    pt(CX + 10, L.crownY - 14),
    pt(CX + L.templeW + 5.5, L.crownY + 1),
    pt(CX + L.templeW + 3, L.hairlineY + 8),
    pt(CX + 10, L.hairlineY + 2.5),
    pt(CX - 10, L.hairlineY + 2.5),
  ];
  const twistA = ribbon(sample([pt(CX - 15, L.hairlineY + 4), pt(CX - 4, L.hairlineY - 6), pt(CX + 7, L.crownY - 4)], false, 6), (t) => 6 - t * 2);
  const twistB = ribbon(sample([pt(CX + 15, L.hairlineY + 4), pt(CX + 4, L.hairlineY - 6), pt(CX - 7, L.crownY - 4)], false, 6), (t) => 6 - t * 2);
  return dome(pts, color) + path(twistB, { fill: shift(color, { l: -0.07 }) }) + path(twistA, { fill: shift(color, { l: 0.05 }) });
}

function gele(L: Layout, g: FaceGenome): string {
  const color = FABRICS[g.headwear.color];
  const top = [
    pt(CX - L.templeW - 4, L.hairlineY + 8),
    pt(CX - L.templeW - 14, L.crownY - 3),
    pt(CX - 38, L.crownY - 21),
    pt(CX - 14, L.crownY - 28),
    pt(CX + 14, L.crownY - 27),
    pt(CX + 40, L.crownY - 15),
    pt(CX + L.templeW + 13, L.crownY + 5),
    pt(CX + L.templeW + 4, L.hairlineY + 8),
    pt(CX, L.hairlineY + 3),
  ];
  const pleats = [top[1]!, top[2]!, top[3]!, top[4]!, top[5]!, top[6]!]
    .map((p) => `M${CX},${L.hairlineY + 1}L${p.x * 0.92 + CX * 0.08},${p.y * 0.92 + (L.hairlineY + 1) * 0.08}`)
    .join("");
  return dome(top, color, 0.8) + path(pleats, { fill: "none", stroke: shift(color, { l: -0.1 }), "stroke-width": 0.9, opacity: 0.8 }) + path(ribbon(sample([pt(CX - L.templeW - 3, L.hairlineY + 5), pt(CX, L.hairlineY + 0.5), pt(CX + L.templeW + 3, L.hairlineY + 5)], false, 6), () => 3), { fill: FABRICS[g.headwear.accent] });
}

function turban(L: Layout, g: FaceGenome): string {
  const color = FABRICS[g.headwear.color];
  const pts = [
    pt(CX - L.templeW - 3.5, L.hairlineY + 9),
    pt(CX - L.templeW - 5.5, L.crownY + 6),
    pt(CX - 19, L.crownY - 10),
    pt(CX, L.crownY - 13),
    pt(CX + 19, L.crownY - 10),
    pt(CX + L.templeW + 5.5, L.crownY + 6),
    pt(CX + L.templeW + 3.5, L.hairlineY + 9),
    pt(CX + 7, L.hairlineY + 1.5),
    pt(CX, L.hairlineY - 3),
    pt(CX - 7, L.hairlineY + 1.5),
  ];
  const folds = [0, 1, 2]
    .map((i) => {
      const y = L.hairlineY + 5 - i * 7;
      return `M${CX - L.templeW - 3},${y}Q${CX - 12},${y - 5} ${CX + 1},${y - 12 - i}M${CX + L.templeW + 3},${y}Q${CX + 12},${y - 5} ${CX - 1},${y - 12 - i}`;
    })
    .join("");
  return dome(pts, color, 0.85) + path(folds, { fill: "none", stroke: shift(color, { l: -0.09 }), "stroke-width": 1.1, "stroke-linecap": "round" }) + el("ellipse", { cx: CX - 12, cy: L.crownY - 2, rx: 11, ry: 5, fill: shift(color, { l: 0.08 }), opacity: 0.4 });
}

function checkPattern(id: string): string {
  return el(
    "pattern",
    { id: `${id}-check`, width: 4, height: 4, patternUnits: "userSpaceOnUse" },
    el("rect", { width: 4, height: 4, fill: portrait.shemagh.ground }) + path("M0,0h2v1.2h-2zM2,2h2v1.2h-2zM0,0h1.2v2h-1.2zM2,2h1.2v2h-1.2z", { fill: portrait.shemagh.thread, opacity: 0.85 }),
  );
}

function ghutra(id: string, L: Layout, g: FaceGenome, checked: boolean): string {
  const n = L.neckW;
  const inner = (s: 1 | -1): Pt[] => [
    pt(CX + s * (L.templeW - 3), L.hairlineY + 3.5),
    pt(CX + s * (L.cheekW + 0.6), L.eyeY),
    pt(CX + s * (L.cheekW + 0.2), L.jawY - 2),
    pt(CX + s * (n + 7), 146),
    pt(CX + s * 24, 178),
    pt(CX + s * 27, 214),
  ];
  const outerSide = (s: 1 | -1): Pt[] => [
    pt(CX + s * 58, 214),
    pt(CX + s * 52, 178),
    pt(CX + s * (n + 22), 150),
    pt(CX + s * (L.cheekW + 9), L.jawY + 4),
    pt(CX + s * (L.cheekW + 8.5), L.eyeY + 6),
    pt(CX + s * (L.templeW + 7.5), L.templeY - 10),
    pt(CX + s * (L.templeW * 0.85), L.crownY - 4),
  ];
  const shape = onShoulders(L, [...inner(-1).reverse(), pt(CX, L.hairlineY - 1.5), ...inner(1), ...outerSide(1), pt(CX, L.crownY - 8), ...outerSide(-1).reverse()]);
  const fill = checked ? `url(#${id}-check)` : FABRICS[g.headwear.color];
  const cord = (dy: number) => `M${CX - L.templeW - 6.5},${L.crownY + 15 + dy}Q${CX},${L.crownY + 1 + dy} ${CX + L.templeW + 6.5},${L.crownY + 15 + dy}`;
  return (
    (checked ? checkPattern(id) : "") +
    path(smooth(shape, true, 0.7), { fill }) +
    group(path(smooth(shape, true, 0.7), { fill: `url(#${id}-side)` })) +
    path(cord(0) + cord(4.2), { fill: "none", stroke: portrait.agal, "stroke-width": 3.2, "stroke-linecap": "round" })
  );
}

function cap(L: Layout, color: string, height: number, flat: boolean, band?: string): string {
  const pts = [
    pt(CX - L.templeW + 0.2, L.hairlineY + 2.5),
    pt(CX - L.templeW + 1, L.crownY - height * 0.7),
    pt(CX, L.crownY - height),
    pt(CX + L.templeW - 1, L.crownY - height * 0.7),
    pt(CX + L.templeW - 0.2, L.hairlineY + 2.5),
    pt(CX, L.hairlineY + 0.5),
  ];
  const stripe = band
    ? path(ribbon(sample([pt(CX - L.templeW + 0.6, L.hairlineY - 0.5), pt(CX, L.hairlineY - 2.6), pt(CX + L.templeW - 0.6, L.hairlineY - 0.5)], false, 6), () => 3), { fill: band })
    : "";
  return dome(pts, color, flat ? 0.45 : 0.9) + stripe + el("ellipse", { cx: CX - 9, cy: L.crownY - height * 0.4, rx: 8, ry: 3, fill: portrait.studio.light, opacity: 0.08 });
}

function amamah(L: Layout, g: FaceGenome): string {
  const color = FABRICS[g.headwear.color];
  const pts = [
    pt(CX - L.templeW - 4, L.hairlineY + 5),
    pt(CX - L.templeW - 6.5, L.crownY + 1),
    pt(CX - 16, L.crownY - 13),
    pt(CX + 16, L.crownY - 13),
    pt(CX + L.templeW + 6.5, L.crownY + 1),
    pt(CX + L.templeW + 4, L.hairlineY + 5),
    pt(CX, L.hairlineY + 1.5),
  ];
  const wraps = [0, 1, 2].map((i) => `M${CX - L.templeW - 4.5},${L.hairlineY - 2 - i * 6}Q${CX},${L.hairlineY - 8 - i * 6} ${CX + L.templeW + 4.5},${L.hairlineY - 2 - i * 6}`).join("");
  return dome(pts, color, 0.85) + path(wraps, { fill: "none", stroke: shift(color, { l: color === FABRICS.black ? 0.1 : -0.1 }), "stroke-width": 1, opacity: 0.8 });
}

function kippah(L: Layout, g: FaceGenome): string {
  return dome([pt(CX - 12, L.crownY + 3.5), pt(CX - 8, L.crownY - 2.4), pt(CX + 8, L.crownY - 2.4), pt(CX + 12, L.crownY + 3.5), pt(CX, L.crownY + 1.6)], FABRICS[g.headwear.color], 0.9);
}

export function headwear(id: string, L: Layout, g: FaceGenome): string {
  switch (g.headwear.style) {
    case "none":
      return "";
    case "hijab":
      return hijab(id, L, g);
    case "headwrap":
      return headwrap(L, g);
    case "gele":
      return gele(L, g);
    case "turban":
      return turban(L, g);
    case "ghutra":
      return ghutra(id, L, g, false);
    case "shemagh":
      return ghutra(id, L, g, true);
    case "kufi":
      return cap(L, FABRICS[g.headwear.color], 6.5, false, FABRICS[g.headwear.accent]);
    case "peci":
      return cap(L, portrait.peci, 8.5, true);
    case "amamah":
      return amamah(L, g);
    case "kippah":
      return kippah(L, g);
    case "dupatta":
      return dupatta(L, g);
  }
}

export function glasses(L: Layout, g: FaceGenome): string {
  const style = g.eyewear.style;
  if (style === "none") return "";
  const color = FRAMES[g.eyewear.frame];
  const y = L.eyeY - 0.8 - L.eyeTilt * 0.3;
  const w = L.eyeW + 7;
  const h = style === "round" ? w * 0.86 : style === "aviator" ? 12 : 10.5;
  const weight = style === "thick" || style === "cat-eye" ? 1.7 : style === "rimless" ? 0.35 : style === "browline" ? 0.7 : 0.85;
  const tint = g.eyewear.tinted ? { fill: portrait.lens.tinted, "fill-opacity": 0.62 } : { fill: portrait.lens.clear, "fill-opacity": 0.08 };
  const lens = (s: 1 | -1): string => {
    const cx = CX + s * (L.eyeInner + L.eyeW / 2);
    const top = y - h / 2;
    const shape =
      style === "round"
        ? el("ellipse", { cx, cy: y, rx: w / 2 - 0.4, ry: h / 2 - 0.4 })
        : style === "aviator"
          ? path(`M${cx - s * (w / 2)},${top + 1}Q${cx},${top - 1} ${cx + s * (w / 2)},${top + 0.5}Q${cx + s * (w / 2 + 0.6)},${top + h * 0.75} ${cx + s * (w * 0.1)},${top + h}Q${cx - s * (w / 2)},${top + h * 0.9} ${cx - s * (w / 2)},${top + 1}Z`)
          : style === "cat-eye"
            ? path(`M${cx - s * (w / 2)},${top + 2}Q${cx},${top + 0.6} ${cx + s * (w / 2 + 1.4)},${top - 1.6}Q${cx + s * (w / 2)},${top + h} ${cx},${top + h}Q${cx - s * (w / 2)},${top + h} ${cx - s * (w / 2)},${top + 2}Z`)
            : el("rect", { x: cx - w / 2, y: top, width: w, height: h, rx: style === "thick" ? 3.2 : 2.4 });
    const glint = path(`M${cx - w * 0.28},${y - h * 0.12}l${w * 0.18},${-h * 0.22}`, { stroke: portrait.studio.light, "stroke-width": 0.8, opacity: 0.35, "stroke-linecap": "round" });
    const brow = style === "browline" ? path(`M${cx - w / 2},${y - h / 2 + 1.4}Q${cx},${y - h / 2 - 0.8} ${cx + w / 2},${y - h / 2 + 1.4}`, { fill: "none", stroke: color, "stroke-width": 2.2 }) : "";
    const temple = path(`M${cx + s * (w / 2)},${y - h * 0.2}L${CX + s * (L.cheekW - 0.2)},${y - 1.2}`, { stroke: color, "stroke-width": Math.max(0.7, weight) });
    return group(shape, { ...tint, stroke: color, "stroke-width": weight }) + glint + brow + temple;
  };
  const bridge =
    path(`M${CX - L.eyeInner + 0.4},${y - 1.8}Q${CX},${y - 3.6} ${CX + L.eyeInner - 0.4},${y - 1.8}`, { fill: "none", stroke: color, "stroke-width": Math.max(0.8, weight) }) +
    (style === "aviator" ? path(`M${CX - L.eyeInner - 2},${y - h / 2 + 0.2}L${CX + L.eyeInner + 2},${y - h / 2 + 0.2}`, { stroke: color, "stroke-width": 0.8 }) : "");
  return lens(-1) + lens(1) + bridge;
}

export function earrings(L: Layout, g: FaceGenome): string {
  const kind = g.jewelry.earrings;
  if (kind === "none") return "";
  return ([-1, 1] as const)
    .map((s) => {
      const x = CX + s * (L.cheekW + 1.8);
      const y = L.earBottom - 0.6;
      if (kind === "hoops") return el("circle", { cx: x, cy: y + 2.2, r: 2.3, fill: "none", stroke: portrait.metal.gold, "stroke-width": 0.8 });
      if (kind === "pearls") return el("circle", { cx: x, cy: y + 0.6, r: 1.45, fill: portrait.pearl.face, stroke: portrait.pearl.edge, "stroke-width": 0.25 });
      if (kind === "drops") return el("circle", { cx: x, cy: y - 0.2, r: 0.8, fill: portrait.metal.gold }) + path(`M${x},${y + 0.6}q1.6,2.6 0,4.2q-1.6,-1.6 0,-4.2z`, { fill: portrait.metal.gold });
      return el("circle", { cx: x, cy: y, r: 1.05, fill: portrait.metal.gold });
    })
    .join("");
}
