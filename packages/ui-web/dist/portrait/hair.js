import { portrait } from "@admin/design";
import { CX, clamp, inflate, lerp, mirror, offsetLine, pt, sample, scallop, smooth } from "./geometry";
import { onShoulders } from "./layout";
import { blurRef } from "./effects";
import { el, group, path } from "./svg";
const CUTS = {
    bald: undefined,
    balding: { top: 0, side: 2.2, hairline: "round", sideburn: 6, horseshoe: true },
    buzz: { top: 1.4, side: 1, hairline: "straight", sideburn: 3, opacity: 0.82 },
    crew: { top: 3.4, side: 1.7, hairline: "straight", sideburn: 5 },
    "side-part": { top: 5.4, side: 2.4, hairline: "round", sideburn: 5, parted: true },
    "swept-back": { top: 6.6, side: 2.6, hairline: "round", sideburn: 4 },
    "curly-top": { top: 8.5, side: 3.4, hairline: "round", sideburn: 4 },
    "close-coils": { top: 3.6, side: 2.1, hairline: "straight", sideburn: 4 },
    pixie: { top: 6.2, side: 3.2, hairline: "swept", sideburn: 3, parted: true },
    bob: { top: 6.6, side: 5.6, hairline: "round", sideburn: 0, back: 134, curtain: 133, parted: true },
    long: { top: 6.6, side: 5.2, hairline: "round", sideburn: 0, back: 180, curtain: 180, parted: true },
    "curls-long": { top: 11.5, side: 10.5, hairline: "round", sideburn: 0, back: 172, backWidth: 12, curtain: 168 },
    afro: { top: 19, side: 16.5, hairline: "round", sideburn: 0, back: 114, backWidth: 6 },
    locs: { top: 8, side: 7, hairline: "round", sideburn: 0, back: 182, curtain: 180, parted: true },
    bun: { top: 3.8, side: 2.4, hairline: "round", sideburn: 0, bun: "top" },
    "low-bun": { top: 3.8, side: 2.7, hairline: "round", sideburn: 0, bun: "nape" },
    "tied-back": { top: 4.4, side: 2.3, hairline: "round", sideburn: 3, bun: "nape" },
    fringe: { top: 5.8, side: 3.2, hairline: "fringe", sideburn: 4 },
    "slick-back": { top: 3.4, side: 1.8, hairline: "round", sideburn: 4, combed: true },
    "comb-over": { top: 1.4, side: 2.2, hairline: "round", sideburn: 5, opacity: 0.72, parted: true },
    quiff: { top: 9.5, side: 2, hairline: "round", sideburn: 4, combed: true },
    lob: { top: 6.4, side: 5.2, hairline: "round", sideburn: 0, back: 158, curtain: 157, parted: true },
    braids: { top: 7, side: 6.5, hairline: "straight", sideburn: 0, back: 184, curtain: 182, parted: true, braided: true },
    "high-top": { top: 12.5, side: 1.6, hairline: "straight", sideburn: 3 },
};
export const coversEars = (cut) => ["bob", "long", "curls-long", "locs", "lob", "braids"].includes(cut);
function skull(L) {
    const right = [
        pt(CX, L.crownY),
        pt(CX + L.crownSideW, L.crownY + 8),
        pt(CX + L.templeW, L.crownY + 23),
        pt(CX + L.templeW + 0.3, L.templeY + 3),
        pt(CX + L.templeW - 0.3, L.earTop + 2.5),
    ];
    return [...right.slice(1).map(mirror).reverse(), ...right];
}
function outer(L, cut, volume) {
    const scale = (0.8 + volume * 0.4) * (1 - L.years * 0.14);
    const center = pt(CX, L.eyeY - 4);
    return inflate(skull(L), center, (dir) => cut.side * scale + (cut.top - cut.side) * scale * Math.pow(Math.max(0, -dir.y), 1.3));
}
function recessionOf(L, g) {
    const masc = g.presentation === "masculine" ? 1 : g.presentation === "androgynous" ? 0.45 : 0.15;
    return g.hair.recession * masc * clamp((L.age - 24) / 42);
}
function hairline(L, g, cut) {
    const rec = recessionOf(L, g);
    const y0 = L.hairlineY + rec * 8;
    const corner = rec * 12;
    const straight = cut.hairline === "straight";
    const side = (s) => [
        pt(CX + s * (L.templeW - 0.4), L.earTop + 2.5),
        pt(CX + s * (L.templeW - 1.6), L.templeY - 2 - corner * 0.3),
        pt(CX + s * (L.templeW - 6), y0 + 7 - corner),
        pt(CX + s * 11, y0 + (straight ? 0.2 : 1.4) + rec * 3.5),
    ];
    if (cut.hairline === "fringe") {
        return [
            pt(CX + L.templeW - 0.4, L.earTop + 2.5),
            pt(CX + L.templeW - 2.5, L.browY - 5),
            pt(CX + 13, L.browY - 7.2),
            pt(CX + 5, L.browY - 6.2),
            pt(CX - 3, L.browY - 7.6),
            pt(CX - 12, L.browY - 6.4),
            pt(CX - L.templeW + 2.5, L.browY - 4.6),
            pt(CX - L.templeW + 0.4, L.earTop + 2.5),
        ];
    }
    if (cut.hairline === "swept") {
        const s = g.hair.part < 0.5 ? -1 : 1;
        const fromPart = [
            pt(CX + s * (L.templeW - 0.4), L.earTop + 2.5),
            pt(CX + s * (L.templeW - 3), L.templeY - 6),
            pt(CX + s * 9, y0 + 2),
            pt(CX - s * 4, L.browY - 9),
            pt(CX - s * (L.templeW - 5), L.browY - 4.5),
            pt(CX - s * (L.templeW - 0.4), L.earTop + 2.5),
        ];
        return s === 1 ? fromPart : fromPart.reverse();
    }
    return [...side(1), pt(CX, y0 + (straight ? 0 : 0.2)), ...side(-1).reverse()];
}
function wobble(seed) {
    return (i) => {
        const x = Math.sin(seed * 12.9898 + i * 78.233) * 43758.5453;
        return x - Math.floor(x);
    };
}
function edge(points, texture, seed) {
    if (texture === "coily")
        return scallop(sample(points, false, 12), 1.25, false, wobble(seed));
    if (texture === "curly")
        return smooth(waved(points, 1.5, seed), false, 0.7);
    if (texture === "wavy")
        return smooth(waved(points, 0.7, seed), false, 0.8);
    return smooth(points, false);
}
function cap(id, L, g, cut, hair, seed) {
    const top = outer(L, cut, g.hair.volume);
    const line = hairline(L, g, cut);
    const d = `${edge(top, g.hair.texture, seed)}${smooth(line, false).replace(/^M/, "L")}Z`;
    const cast = group(path(d, { fill: portrait.studio.shadow, opacity: 0.28, transform: "translate(0.6 2.2)", filter: blurRef(id, "f") }), { "clip-path": `url(#${id}-face)` });
    const sheen = path(smooth(top.slice(Math.floor(top.length * 0.3), Math.floor(top.length * 0.55)).map((p) => pt(lerp(p.x, CX, 0.16), lerp(p.y, L.eyeY, 0.12))), false), {
        fill: "none",
        stroke: hair.light,
        "stroke-width": 3.2,
        "stroke-linecap": "round",
        opacity: 0.4,
        filter: blurRef(id, "f"),
    });
    return cast + path(d, { fill: hair.base, opacity: cut.opacity, filter: blurRef(id, "e") }) + group(sheen, { "clip-path": `url(#${id}-cap)` }) + el("clipPath", { id: `${id}-cap` }, path(d));
}
function horseshoe(L, hair) {
    const side = (s) => smooth([
        pt(CX + s * (L.templeW - 0.6), L.templeY - 13),
        pt(CX + s * (L.templeW + 2.4), L.templeY - 6),
        pt(CX + s * (L.templeW + 2.2), L.templeY + 6),
        pt(CX + s * (L.cheekW + 0.2), L.earTop + 5),
        pt(CX + s * (L.cheekW - 2.6), L.earTop + 6),
        pt(CX + s * (L.templeW - 1.4), L.templeY + 2),
    ], true, 0.9);
    return path(side(-1), { fill: hair.temple }) + path(side(1), { fill: hair.temple });
}
function sideburns(L, cut, hair) {
    if (cut.sideburn <= 0)
        return "";
    const one = (s) => smooth([
        pt(CX + s * (L.templeW + 0.3), L.earTop - 1),
        pt(CX + s * (L.cheekW - 0.2), L.earTop + 2 + cut.sideburn * 0.6),
        pt(CX + s * (L.cheekW - 1.1), L.earTop + 2 + cut.sideburn),
        pt(CX + s * (L.cheekW - 2.4), L.earTop + 1 + cut.sideburn * 0.7),
        pt(CX + s * (L.templeW - 2.6), L.earTop),
    ], true, 0.8);
    return path(one(-1), { fill: hair.temple }) + path(one(1), { fill: hair.temple });
}
function strands(L, g, cut, hair) {
    const top = outer(L, cut, g.hair.volume);
    const mid = Math.floor(top.length / 2);
    const hi = top.slice(Math.max(0, mid - 4), mid + 1).map((p) => pt(lerp(p.x, CX, 0.12), lerp(p.y, L.eyeY, 0.1)));
    const out = [];
    if (hi.length > 2) {
        out.push(path(smooth(hi, false), { fill: "none", stroke: hair.light, "stroke-width": 1.6, "stroke-linecap": "round", opacity: 0.45 }));
    }
    if (cut.parted) {
        const s = g.hair.part < 0.5 ? -1 : 1;
        const px = CX + s * 10;
        const y0 = L.hairlineY + recessionOf(L, g) * 8;
        out.push(path(`M${px},${y0 + 0.5}Q${px - s * 1.5},${L.crownY + 8} ${px - s * 5},${L.crownY + 1}`, { fill: "none", stroke: hair.shadow, "stroke-width": 0.9, opacity: 0.8 }));
        for (let i = 0; i < 3; i += 1) {
            const y = y0 - 2 - i * 4.5;
            out.push(path(`M${px - s * 2},${y}Q${CX - s * 14},${y - 4 - i} ${CX - s * (L.templeW - 1)},${L.templeY - 8 + i * 3}`, { fill: "none", stroke: hair.shadow, "stroke-width": 0.6, opacity: 0.55 }));
        }
    }
    if (cut.combed) {
        for (let i = -3; i <= 3; i += 1) {
            const x = CX + i * (L.templeW / 4.2);
            out.push(path(`M${x},${L.hairlineY + 1 - Math.abs(i) * 0.4}Q${x * 0.9 + CX * 0.1},${L.crownY + 10} ${x * 0.7 + CX * 0.3},${L.crownY + 2}`, { fill: "none", stroke: hair.shadow, "stroke-width": 0.6, opacity: 0.5 }));
        }
    }
    if (g.hair.texture === "coily" && !cut.curtain) {
        const w = wobble(g.hair.volume * 97 + 3);
        const r = 0.9;
        for (let i = 0; i < 16; i += 1) {
            const x = CX + (w(i) - 0.5) * L.templeW * 1.4;
            const y = L.crownY + 3 + w(i + 40) * (L.hairlineY - L.crownY - 5);
            out.push(path(`M${x - r},${y}a${r},${r} 0 0 1 ${2 * r},0`, { fill: "none", stroke: hair.shadow, "stroke-width": 0.5, opacity: 0.4 }));
        }
    }
    return out.join("");
}
function backShape(L, g, cut) {
    const back = cut.back ?? 0;
    const bw = cut.backWidth ?? 0;
    const s = cut.side * (0.8 + g.hair.volume * 0.4);
    const top = outer(L, cut, g.hair.volume);
    const right = [
        pt(CX + L.cheekW + s + 1, L.cheekY),
        pt(CX + L.jawW + s + 3 + bw * 0.4, L.jawY + 8),
        ...(back > 150 ? [pt(CX + L.neckW + 17 + bw, back - 12), pt(CX + L.neckW + 13 + bw * 0.6, back)] : [pt(CX + L.jawW + s, back)]),
    ];
    const left = right.map(mirror).reverse();
    return onShoulders(L, [...left, ...top, ...right]);
}
export function hairBack(id, L, g, hair, seed) {
    const cut = CUTS[g.hair.cut];
    if (!cut)
        return "";
    const out = [];
    if (cut.back) {
        const shape = backShape(L, g, cut);
        const d = g.hair.texture === "coily" || g.hair.cut === "afro"
            ? scallop(sample(shape, true, 8), 1.9, true, wobble(seed + 5))
            : g.hair.texture === "curly"
                ? smooth(offsetLine(sample(shape, true, 10), (t) => 2.2 * Math.sin(t * 90 + seed)), true, 0.7)
                : smooth(shape, true, 0.85);
        out.push(path(d, { fill: g.hair.cut === "afro" ? hair.base : hair.shadow, filter: blurRef(id, "e") }));
    }
    if (cut.bun === "top") {
        const r = 8 + g.hair.volume * 2.2;
        out.push(el("circle", { cx: CX, cy: L.crownY - r * 0.55, r, fill: hair.base }));
        out.push(path(`M${CX - r * 0.6},${L.crownY - r * 0.9}A${r * 0.7},${r * 0.7} 0 0 1 ${CX + r * 0.2},${L.crownY - r * 1.3}`, { fill: "none", stroke: hair.light, "stroke-width": 1.2, opacity: 0.5 }));
    }
    return out.join("");
}
/** A lock of hair framing one side of the face: its outer edge, then its face-side edge back up. */
function curtain(L, g, cut, s) {
    const side = cut.side * (0.8 + g.hair.volume * 0.4);
    const len = cut.curtain ?? 0;
    const long = len > 150;
    const outer = [
        pt(CX + s * (L.templeW * 0.82), L.crownY + 13),
        pt(CX + s * (L.templeW + side), L.templeY - 10),
        pt(CX + s * (L.cheekW + side * 0.95), L.cheekY),
        pt(CX + s * (L.jawW + side * 0.8 + 2), L.jawY + 6),
        ...(long
            ? [pt(CX + s * (L.neckW + 14 + side * 0.4), 150), pt(CX + s * (L.neckW + 17), len - 6), pt(CX + s * (L.neckW + 11), len)]
            : [pt(CX + s * (L.jawW + side * 0.7), len - 3), pt(CX + s * (L.jawW - 2.5), len)]),
    ];
    const inner = [
        ...(long ? [pt(CX + s * (L.neckW + 5.5), len - 5), pt(CX + s * (L.neckW + 3.4), 152)] : [pt(CX + s * (L.jawW - 3.8), len - 3.5)]),
        pt(CX + s * (L.jawW - 1.4), L.jawY + 1),
        pt(CX + s * (L.cheekW - 3.2), L.cheekY - 1),
        pt(CX + s * (L.templeW - 3.4), L.eyeY - 11),
        pt(CX + s * (L.templeW - 5.5), L.hairlineY + 4),
    ];
    return { outer: onShoulders(L, outer), inner: onShoulders(L, inner) };
}
function waved(points, amp, seed) {
    const dense = sample(points, false, 10);
    return offsetLine(dense, (t) => amp * Math.sin(t * dense.length * 0.55 + seed));
}
function outerEdge(points, texture, seed, lobe) {
    if (texture === "coily")
        return scallop(sample(points, false, 12), lobe * 0.6, false, wobble(seed));
    if (texture === "curly")
        return smooth(waved(points, 2, seed), false, 0.7);
    if (texture === "wavy")
        return smooth(waved(points, 1.1, seed), false, 0.8);
    return smooth(points, false);
}
function curtainPath(c, g, seed) {
    return `${outerEdge(c.outer, g.hair.texture, seed, 3.4)}${smooth(c.inner, false, 0.9).replace(/^M/, "L")}Z`;
}
function curtainStrands(c, hair, s, rope, braided) {
    const spine = c.outer.slice(1);
    const lines = (rope || braided ? [2.2, 5, 7.8, 10.6] : [2.6, 6]).map((d) => path(smooth(spine.map((p) => pt(p.x - s * d, p.y + 1.5)), false), { fill: "none", stroke: hair.shadow, "stroke-width": rope || braided ? 0.9 : 0.6, opacity: rope || braided ? 0.75 : 0.5 }));
    if (braided) {
        const dense = sample(spine, false, 6);
        const ticks = dense.filter((_, i) => i % 2 === 0).map((p) => `M${p.x - s * 3.6},${p.y}l${s * 1.4},1.6l${s * 1.4},-1.6`).join("");
        lines.push(path(ticks, { fill: "none", stroke: hair.light, "stroke-width": 0.5, opacity: 0.45 }));
    }
    return lines.join("");
}
export function hairFront(id, L, g, hair, seed) {
    const cut = CUTS[g.hair.cut];
    if (!cut)
        return "";
    if (cut.horseshoe)
        return horseshoe(L, hair);
    const out = [cap(id, L, g, cut, hair, seed), sideburns(L, cut, hair)];
    if (cut.curtain) {
        for (const s of [-1, 1]) {
            const c = curtain(L, g, cut, s);
            out.push(path(curtainPath(c, g, seed + s), { fill: hair.base, filter: blurRef(id, "e") }));
            out.push(curtainStrands(c, hair, s, g.hair.cut === "locs", cut.braided === true));
        }
    }
    out.push(strands(L, g, cut, hair));
    return group(out.join(""));
}
