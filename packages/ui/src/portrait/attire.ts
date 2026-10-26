import { portrait } from "@admin/design";
import { mix, shift } from "./color";
import { FABRICS, type FaceGenome } from "./types";
import { CX, pt, polygon, smooth } from "./geometry";
import type { Layout } from "./layout";
import type { SkinPalette } from "./palette";
import { blurRef } from "./effects";
import { clip, el, group, path } from "./svg";

// What a person wears, in two passes: the garment's mass, drawn before the
// neck, and everything that sits over the neck — collars, ties, lapels.

export type Dress = { readonly back: string; readonly front: string };

const GOLD = portrait.metal.gold;

function body(L: Layout): string {
  const n = L.neckW;
  const w = L.shoulderW;
  return `M${CX - n - 3},151C${CX - n - 16},155 ${CX - w + 14},159 ${CX - w},170L${CX - w - 16},214L${CX + w + 16},214L${CX + w},170C${CX + w - 14},159 ${CX + n + 16},155 ${CX + n + 3},151Z`;
}

function mass(id: string, L: Layout, color: string): string {
  const d = body(L);
  return (
    clip(`${id}-body`, d) +
    path(d, { fill: color }) +
    group(
      el("rect", { x: 0, y: 140, width: 200, height: 80, fill: `url(#${id}-side)` }) +
        el("rect", { x: 0, y: 140, width: 200, height: 80, fill: `url(#${id}-cloth)` }) +
        path(`M${CX - L.shoulderW},172C${CX - L.shoulderW + 8},162 ${CX - L.neckW - 16},157 ${CX - L.neckW - 4},154`, { fill: "none", stroke: shift(color, { l: 0.12 }), "stroke-width": 3, opacity: 0.35 }),
      { "clip-path": `url(#${id}-body)` },
    )
  );
}

const g2 = (g: FaceGenome) => ({ primary: FABRICS[g.attire.primary], secondary: FABRICS[g.attire.secondary], accent: FABRICS[g.attire.accent] });

function lapels(L: Layout, color: string, narrow: boolean, id = "f"): string {
  const n = L.neckW;
  const one = (s: 1 | -1): string =>
    polygon(
      narrow
        ? [pt(CX + s * (n + 2.5), 151), pt(CX + s * (n + 8), 154), pt(CX + s * 25, 184), pt(CX + s * 8, 214), pt(CX + s * 2.5, 214)]
        : [pt(CX + s * (n + 2.5), 151), pt(CX + s * (n + 10), 154.5), pt(CX + s * 32, 180), pt(CX + s * 27.5, 182.5), pt(CX + s * 9, 214), pt(CX + s * 2.5, 214)],
    );
  const edge = shift(color, { l: -0.07 });
  const face = shift(color, { l: 0.035 });
  return (
    path(one(-1), { fill: portrait.studio.shadow, opacity: 0.35, transform: "translate(1.4 1.2)", filter: blurRef(id, "f") }) +
    path(one(1), { fill: portrait.studio.shadow, opacity: 0.35, transform: "translate(1.4 1.2)", filter: blurRef(id, "f") }) +
    path(one(-1), { fill: face, stroke: edge, "stroke-width": 0.6, "stroke-linejoin": "round" }) +
    path(one(1), { fill: shift(face, { l: -0.04 }), stroke: edge, "stroke-width": 0.6, "stroke-linejoin": "round" })
  );
}

function shirtV(L: Layout, color: string, open = false): string {
  const n = L.neckW;
  const top = open ? 152 : 149;
  return path(polygon([pt(CX - n - 3.5, top), pt(CX + n + 3.5, top), pt(CX + 3, 214), pt(CX - 3, 214)]), { fill: color });
}

function collar(L: Layout, color: string, spread: number): string {
  const n = L.neckW;
  const edge = shift(color, { l: -0.16 });
  const one = (s: 1 | -1): string =>
    polygon([pt(CX + s * (n + 1), 146.5), pt(CX + s * 3.4, 153.5 + spread * 0.5), pt(CX + s * (9 + spread * 4), 164 + spread * 2), pt(CX + s * (n + 4.5), 155.5)]);
  return path(one(-1), { fill: color, stroke: edge, "stroke-width": 0.5 }) + path(one(1), { fill: shift(color, { l: -0.05 }), stroke: edge, "stroke-width": 0.5 });
}

function tie(color: string): string {
  const dark = shift(color, { l: -0.08 });
  return (
    path(polygon([pt(CX - 2.6, 160.5), pt(CX + 2.6, 160.5), pt(CX + 6.4, 205), pt(CX, 211), pt(CX - 6.4, 205)]), { fill: color }) +
    path(polygon([pt(CX + 0.2, 160.5), pt(CX + 2.6, 160.5), pt(CX + 6.4, 205), pt(CX + 0.6, 211)]), { fill: dark, opacity: 0.55 }) +
    path(polygon([pt(CX - 3.7, 152.5), pt(CX + 3.7, 152.5), pt(CX + 2.6, 160.8), pt(CX - 2.6, 160.8)]), { fill: shift(color, { l: 0.03 }) }) +
    path(`M${CX + 0.4},153.5L${CX + 0.2},160`, { stroke: dark, "stroke-width": 0.6, opacity: 0.7 })
  );
}

function openNeck(L: Layout, skin: SkinPalette, depth: number): string {
  const n = L.neckW;
  return path(`M${CX - n + 0.5},146C${CX - n + 2},${150 + depth * 0.4} ${CX - 4},${152 + depth} ${CX},${154 + depth}C${CX + 4},${152 + depth} ${CX + n - 2},${150 + depth * 0.4} ${CX + n - 0.5},146Z`, { fill: skin.base }) +
    path(`M${CX - 3},${150 + depth}Q${CX},${153 + depth} ${CX + 3},${150 + depth}`, { fill: "none", stroke: skin.shadow, "stroke-width": 0.8, opacity: 0.5 });
}

function pin(g: FaceGenome): string {
  const x = CX + 21.5;
  const y = 170.5;
  switch (g.attire.pin) {
    case "flag":
      return (
        el("rect", { x, y, width: 4.6, height: 3.1, rx: 0.4, fill: portrait.flagPin.field }) +
        path(`M${x},${y + 0.5}h4.6M${x},${y + 1.55}h4.6M${x},${y + 2.6}h4.6`, { stroke: portrait.flagPin.stripe, "stroke-width": 0.55 }) +
        el("rect", { x, y, width: 2, height: 1.6, fill: portrait.flagPin.canton })
      );
    case "gold":
      return el("circle", { cx: x + 2, cy: y + 1.5, r: 1.5, fill: GOLD, stroke: portrait.metal.goldEdge, "stroke-width": 0.3 });
    case "enamel":
      return el("circle", { cx: x + 2, cy: y + 1.5, r: 1.6, fill: FABRICS[g.attire.accent], stroke: GOLD, "stroke-width": 0.45 });
    default:
      return "";
  }
}

function shoulderBoards(L: Layout, color: string, stars: number): string {
  const n = L.neckW;
  const one = (s: 1 | -1): string => {
    const a = pt(CX + s * (n + 10), 155.2);
    const b = pt(CX + s * (L.shoulderW - 5), 166.5);
    const board = polygon([a, b, pt(b.x - s * 1.6, 173), pt(a.x - s * 1.2, 160.8)]);
    const marks = Array.from({ length: stars }, (_, i) => {
      const t = 0.3 + i * 0.2;
      return el("circle", { cx: a.x + (b.x - a.x) * t - s * 0.6, cy: a.y + (b.y - a.y) * t + 2.6, r: 1.05, fill: GOLD });
    }).join("");
    return path(board, { fill: shift(color, { l: -0.06 }), stroke: GOLD, "stroke-width": 0.5 }) + marks;
  };
  return one(-1) + one(1);
}

const RIBBON_COLORS = portrait.ribbons;

function ribbons(x0: number, y0: number, rows: number, seed: number): string {
  const out: string[] = [];
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < 3; c += 1) {
      const k = (seed * 7 + r * 3 + c * 5) % RIBBON_COLORS.length;
      const x = x0 + c * 5.4 + (r % 2) * 1.2;
      const y = y0 + r * 3;
      out.push(el("rect", { x, y, width: 5.2, height: 2.6, fill: RIBBON_COLORS[k] }));
      out.push(el("rect", { x: x + 2, y, width: 1.2, height: 2.6, fill: RIBBON_COLORS[(k + 3) % RIBBON_COLORS.length] }));
    }
  }
  return out.join("");
}

function star(cx: number, cy: number, r: number, color: string): string {
  const pts = Array.from({ length: 16 }, (_, i) => {
    const a = (Math.PI / 8) * i - Math.PI / 2;
    const rr = i % 2 === 0 ? r : r * 0.45;
    return pt(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
  });
  return path(polygon(pts), { fill: color, stroke: portrait.metal.goldEdge, "stroke-width": 0.35 });
}

function sash(accent: string, secondary: string): string {
  const band = polygon([pt(CX - 44, 163), pt(CX - 33, 157), pt(CX + 36, 212), pt(CX + 22, 216)]);
  return path(band, { fill: accent }) + path(`M${CX - 41.5},161.4L${CX + 25},214.5M${CX - 35},158.4L${CX + 33},211.6`, { stroke: secondary, "stroke-width": 1, opacity: 0.9 });
}

function necklace(L: Layout, g: FaceGenome): string {
  const n = L.neckW;
  if (g.jewelry.necklace === "pearls") {
    return Array.from({ length: 13 }, (_, i) => {
      const t = i / 12;
      const x = CX - n - 0.5 + (2 * n + 1) * t;
      const y = 150.5 + Math.sin(Math.PI * t) * 9;
      return el("circle", { cx: x, cy: y, r: 1.05, fill: portrait.pearl.face, stroke: portrait.pearl.edge, "stroke-width": 0.25 });
    }).join("");
  }
  if (g.jewelry.necklace === "pendant") {
    return path(`M${CX - n + 1},149Q${CX},${166} ${CX + n - 1},149`, { fill: "none", stroke: GOLD, "stroke-width": 0.5 }) + path(`M${CX},158.5l1.8,2.6l-1.8,2.6l-1.8,-2.6z`, { fill: FABRICS[g.attire.accent], stroke: GOLD, "stroke-width": 0.4 });
  }
  if (g.jewelry.necklace === "chain") {
    return path(`M${CX - n + 1},149Q${CX},${164} ${CX + n - 1},149`, { fill: "none", stroke: GOLD, "stroke-width": 0.55 }) + el("circle", { cx: CX, cy: 156.8, r: 1.3, fill: GOLD });
  }
  return "";
}

function brooch(g: FaceGenome): string {
  const x = CX + 25;
  const y = 176;
  switch (g.jewelry.brooch) {
    case "gold":
      return star(x, y, 3.2, GOLD);
    case "pearl":
      return [0, 1, 2, 3, 4].map((i) => el("circle", { cx: x + Math.cos((i / 5) * Math.PI * 2) * 1.8, cy: y + Math.sin((i / 5) * Math.PI * 2) * 1.8, r: 1.05, fill: portrait.pearl.face, stroke: portrait.pearl.edge, "stroke-width": 0.2 })).join("") + el("circle", { cx: x, cy: y, r: 0.9, fill: GOLD });
    case "enamel":
      return el("circle", { cx: x, cy: y, r: 2.4, fill: FABRICS[g.attire.accent], stroke: GOLD, "stroke-width": 0.6 });
    default:
      return "";
  }
}

function dress_(id: string, L: Layout, g: FaceGenome): Dress {
  const c = g2(g);
  const n = L.neckW;
  const v = g.marks.lines > 0.5;
  const neckline = v
    ? `M${CX - n - 6},149L${CX},167L${CX + n + 6},149L${CX + n + 12},214L${CX - n - 12},214Z`
    : `M${CX - n - 6},149Q${CX},160 ${CX + n + 6},149L${CX + n + 12},214L${CX - n - 12},214Z`;
  const edge = v ? `M${CX - n - 6},149L${CX},167L${CX + n + 6},149` : `M${CX - n - 6},149Q${CX},160 ${CX + n + 6},149`;
  return {
    back: mass(id, L, c.primary),
    front: path(neckline, { fill: c.primary }) + path(edge, { fill: "none", stroke: shift(c.primary, { l: -0.08 }), "stroke-width": 1 }) + necklace(L, g) + brooch(g),
  };
}

function judicial(id: string, L: Layout, g: FaceGenome, skin: SkinPalette): Dress {
  const robe = portrait.robe.body;
  const n = L.neckW;
  const fem = g.presentation === "feminine";
  const yoke = path(`M${CX - L.shoulderW + 6},176Q${CX - 30},166 ${CX - n - 6},156M${CX + L.shoulderW - 6},176Q${CX + 30},166 ${CX + n + 6},156`, { fill: "none", stroke: portrait.robe.seam, "stroke-width": 1.2 });
  const opening = polygon([pt(CX - n - 2, 150), pt(CX + n + 2, 150), pt(CX + 5, 190), pt(CX - 5, 190)]);
  const collarFem = fem
    ? smooth([pt(CX - n - 3, 149), pt(CX - 8, 160), pt(CX, 163), pt(CX + 8, 160), pt(CX + n + 3, 149), pt(CX + n - 1, 155), pt(CX, 169), pt(CX - n + 1, 155)], true, 0.7)
    : "";
  const inner = fem
    ? path(opening, { fill: skin.base }) + path(collarFem, { fill: portrait.robe.collar, stroke: portrait.robe.collarEdge, "stroke-width": 0.5 })
    : path(opening, { fill: portrait.shirt }) + collar(L, portrait.shirt, 0) + tie(FABRICS[g.attire.accent]);
  return { back: mass(id, L, robe), front: inner + path(`M${CX - n - 2},151L${CX - 5},214M${CX + n + 2},151L${CX + 5},214`, { stroke: portrait.robe.edge, "stroke-width": 2.2 }) + yoke };
}

function suit(id: string, L: Layout, g: FaceGenome, skin: SkinPalette, withTie: boolean): Dress {
  const c = g2(g);
  const front = withTie
    ? shirtV(L, c.secondary) + collar(L, c.secondary, 0) + tie(c.accent)
    : shirtV(L, c.secondary, true) + openNeck(L, skin, 7) + collar(L, c.secondary, 1);
  return { back: mass(id, L, c.primary), front: front + lapels(L, c.primary, false, id) + pin(g) };
}

function blazer(id: string, L: Layout, g: FaceGenome, skin: SkinPalette): Dress {
  const c = g2(g);
  const neckline = path(`M${CX - L.neckW - 2},149C${CX - L.neckW + 1},${160} ${CX - 5},${164.5} ${CX},${165}C${CX + 5},${164.5} ${CX + L.neckW - 1},${160} ${CX + L.neckW + 2},149Z`, { fill: skin.base });
  const shade = path(`M${CX + L.neckW - 3},150C${CX + L.neckW - 2},157 ${CX + 6},163 ${CX},164.6L${CX + L.neckW + 2},149Z`, { fill: skin.shadow, opacity: 0.5 });
  return { back: mass(id, L, c.primary), front: shirtV(L, c.secondary) + neckline + shade + necklace(L, g) + lapels(L, c.primary, true, id) + pin(g) + brooch(g) };
}

function military(id: string, L: Layout, g: FaceGenome, skin: SkinPalette, open: boolean): Dress {
  const c = g2(g);
  const n = L.neckW;
  const stars = 1 + (Math.round(g.marks.lines * 10) % 3);
  if (open) {
    const s = suit(id, L, { ...g, attire: { ...g.attire, pin: "none" } }, skin, true);
    return { back: s.back, front: s.front + shoulderBoards(L, c.primary, stars) + ribbons(CX + 33, 168, 2, Math.round(g.marks.mole * 10)) };
  }
  const band = polygon([pt(CX - n - 2.5, 142.5), pt(CX + n + 2.5, 142.5), pt(CX + n + 4, 153), pt(CX + 1, 156), pt(CX - 1, 156), pt(CX - n - 4, 153)]);
  const buttons = [166, 179, 192].map((y) => el("circle", { cx: CX, cy: y, r: 1.35, fill: GOLD, stroke: portrait.metal.goldEdge, "stroke-width": 0.3 })).join("");
  const front =
    path(band, { fill: shift(c.primary, { l: -0.03 }), stroke: shift(c.primary, { l: -0.1 }), "stroke-width": 0.6 }) +
    el("rect", { x: CX - n + 1, y: 146.5, width: 3.4, height: 2, fill: GOLD }) +
    el("rect", { x: CX + n - 4.4, y: 146.5, width: 3.4, height: 2, fill: GOLD }) +
    path(`M${CX},156L${CX},214`, { stroke: shift(c.primary, { l: -0.1 }), "stroke-width": 0.7 }) +
    buttons +
    path(`M${CX - 38},180h16M${CX + 22},180h16`, { stroke: shift(c.primary, { l: -0.1 }), "stroke-width": 0.8 }) +
    shoulderBoards(L, c.primary, stars) +
    ribbons(CX + 20, 170, 3, Math.round(g.marks.mole * 10));
  return { back: mass(id, L, c.primary), front };
}

function clerical(id: string, L: Layout, g: FaceGenome): Dress {
  const c = g2(g);
  const n = L.neckW;
  const band = polygon([pt(CX - n - 1.5, 144), pt(CX + n + 1.5, 144), pt(CX + n + 3, 151), pt(CX - n - 3, 151)]);
  return {
    back: mass(id, L, c.primary),
    front: shirtV(L, portrait.clerical.shirt) + path(band, { fill: portrait.clerical.shirt }) + el("rect", { x: CX - 2.8, y: 145, width: 5.6, height: 4.8, fill: portrait.clerical.tab }) + lapels(L, c.primary, false, id),
  };
}

function robe(id: string, L: Layout, g: FaceGenome): Dress {
  const c = g2(g);
  const n = L.neckW;
  const inner = polygon([pt(CX - n - 6, 150), pt(CX + n + 6, 150), pt(CX + 15, 214), pt(CX - 15, 214)]);
  const collarBand = `M${CX - n - 1},145C${CX - n + 2},${153} ${CX + n - 2},${153} ${CX + n + 1},145L${CX + n + 3},149C${CX + n},${157} ${CX - n},${157} ${CX - n - 3},149Z`;
  const trim = (s: 1 | -1) => `M${CX + s * (n + 6)},151L${CX + s * 15},214`;
  const trimColor = g.attire.accent === "gold" ? GOLD : shift(c.primary, { l: -0.08 });
  return {
    back: mass(id, L, c.primary),
    front: path(inner, { fill: c.secondary }) + path(collarBand, { fill: shift(c.secondary, { l: -0.05 }) }) + path(trim(-1) + trim(1), { stroke: trimColor, "stroke-width": 1.6 }),
  };
}

function academic(id: string, L: Layout, g: FaceGenome): Dress {
  const c = g2(g);
  const n = L.neckW;
  const roll = smooth([pt(CX - n - 1.4, 136.5), pt(CX, 135), pt(CX + n + 1.4, 136.5), pt(CX + n + 3.5, 152), pt(CX, 154), pt(CX - n - 3.5, 152)], true, 0.7);
  return {
    back: mass(id, L, c.primary),
    front: shirtV(L, c.secondary) + path(roll, { fill: c.secondary }) + path(`M${CX - n - 1.6},141.5Q${CX},${143.5} ${CX + n + 1.6},141.5`, { fill: "none", stroke: shift(c.secondary, { l: -0.1 }), "stroke-width": 0.8 }) + lapels(L, c.primary, false, id),
  };
}

function field(id: string, L: Layout, g: FaceGenome, skin: SkinPalette): Dress {
  const c = g2(g);
  const placket = path(`M${CX},156L${CX},214`, { stroke: shift(c.primary, { l: -0.12 }), "stroke-width": 0.8 }) + [168, 184, 200].map((y) => el("circle", { cx: CX + 0.9, cy: y, r: 0.9, fill: shift(c.primary, { l: -0.15 }) })).join("");
  const pockets = path(`M${CX - 34},178h15v2.5h-15zM${CX + 19},178h15v2.5h-15z`, { fill: shift(c.primary, { l: -0.05 }), stroke: shift(c.primary, { l: -0.14 }), "stroke-width": 0.5 });
  return { back: mass(id, L, c.primary), front: openNeck(L, skin, 8) + collar(L, shift(c.primary, { l: 0.06 }), 1.4) + placket + pockets };
}

function thobe(id: string, L: Layout, g: FaceGenome): Dress {
  const c = g2(g);
  const n = L.neckW;
  const band = `M${CX - n - 0.5},144C${CX - n + 1},${150} ${CX + n - 1},${150} ${CX + n + 0.5},144L${CX + n + 2},148.5C${CX + n},${155} ${CX - n},${155} ${CX - n - 2},148.5Z`;
  let front = path(band, { fill: shift(c.primary, { l: -0.04 }) }) + path(`M${CX},153L${CX},186`, { stroke: shift(c.primary, { l: -0.14 }), "stroke-width": 0.7 }) + el("circle", { cx: CX, cy: 157, r: 0.9, fill: shift(c.primary, { l: -0.2 }) });
  if (g.attire.accent === "black" || g.attire.accent === "brown" || g.attire.accent === "camel") {
    const cloak = FABRICS[g.attire.accent];
    const panel = (s: 1 | -1) => polygon([pt(CX + s * (L.shoulderW + 16), 214), pt(CX + s * L.shoulderW, 170), pt(CX + s * (n + 14), 156), pt(CX + s * (n + 6), 154.5), pt(CX + s * 17, 214)]);
    front += path(panel(-1), { fill: cloak }) + path(panel(1), { fill: shift(cloak, { l: -0.04 }) }) + path(`M${CX - n - 6},155L${CX - 17},214M${CX + n + 6},155L${CX + 17},214`, { stroke: GOLD, "stroke-width": 1.4 });
  }
  return { back: mass(id, L, c.primary), front };
}

function kaftan(id: string, L: Layout, g: FaceGenome): Dress {
  const c = g2(g);
  const n = L.neckW;
  const band = `M${CX - n - 1},145C${CX - n + 2},${152} ${CX + n - 2},${152} ${CX + n + 1},145L${CX + n + 4},150C${CX + n + 1},${158.5} ${CX - n - 1},${158.5} ${CX - n - 4},150Z`;
  const diamonds = Array.from({ length: 6 }, (_, i) => {
    const y = 160 + i * 6;
    return path(`M${CX},${y - 2.2}L${CX + 2.2},${y}L${CX},${y + 2.2}L${CX - 2.2},${y}Z`, { fill: c.accent });
  }).join("");
  const panel = el("rect", { x: CX - 4, y: 156, width: 8, height: 58, fill: shift(c.primary, { l: -0.05 }), stroke: c.accent, "stroke-width": 0.6 });
  return { back: mass(id, L, c.primary), front: path(band, { fill: c.accent }) + panel + diamonds };
}

function nehru(id: string, L: Layout, g: FaceGenome): Dress {
  const c = g2(g);
  const n = L.neckW;
  const kurta = `M${CX - n - 0.5},143.5C${CX - n + 1},${149} ${CX + n - 1},${149} ${CX + n + 0.5},143.5L${CX + n + 1},146C${CX + n},${151.5} ${CX - n},${151.5} ${CX - n - 1},146Z`;
  const band = polygon([pt(CX - n - 2.5, 145.5), pt(CX - 1, 151.5), pt(CX - 1, 157), pt(CX - n - 4, 153.5)]) + polygon([pt(CX + n + 2.5, 145.5), pt(CX + 1, 151.5), pt(CX + 1, 157), pt(CX + n + 4, 153.5)]);
  const buttons = [163, 175, 187, 199].map((y) => el("circle", { cx: CX, cy: y, r: 1, fill: GOLD })).join("");
  return {
    back: mass(id, L, c.primary),
    front: path(kurta, { fill: c.secondary }) + path(band, { fill: shift(c.primary, { l: 0.03 }), stroke: shift(c.primary, { l: -0.1 }), "stroke-width": 0.5 }) + path(`M${CX},157L${CX},214`, { stroke: shift(c.primary, { l: -0.12 }), "stroke-width": 0.7 }) + buttons,
  };
}

export function dress(id: string, L: Layout, g: FaceGenome, skin: SkinPalette): Dress {
  switch (g.attire.garment) {
    case "suit":
      return suit(id, L, g, skin, true);
    case "suit-open":
      return suit(id, L, g, skin, false);
    case "blazer":
      return blazer(id, L, g, skin);
    case "military":
      return military(id, L, g, skin, false);
    case "military-open":
      return military(id, L, g, skin, true);
    case "ceremonial": {
      const base = g.presentation === "feminine" ? blazer(id, L, g, skin) : suit(id, L, { ...g, attire: { ...g.attire, accent: "black" } }, skin, true);
      const c = g2(g);
      return { back: base.back, front: base.front + sash(c.accent, c.secondary === FABRICS.white ? GOLD : mix(c.secondary, portrait.studio.light, 0.3)) + star(CX + 24, 184, 5.6, GOLD) };
    }
    case "clerical":
      return clerical(id, L, g);
    case "robe":
      return robe(id, L, g);
    case "academic":
      return academic(id, L, g);
    case "field":
      return field(id, L, g, skin);
    case "thobe":
      return thobe(id, L, g);
    case "kaftan":
      return kaftan(id, L, g);
    case "nehru":
      return nehru(id, L, g);
    case "dress":
      return dress_(id, L, g);
    case "judicial":
      return judicial(id, L, g, skin);
  }
}
