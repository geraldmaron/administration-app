import { portrait } from "@admin/design";
import { mix, shift } from "./color";
import { CX, pt, sample, scallop, smooth } from "./geometry";
import { path } from "./svg";
const BEARDS = {
    stubble: { length: 0, cheek: 5, chinOnly: false },
    goatee: { length: 2.5, cheek: 0, chinOnly: true },
    "circle-beard": { length: 2.5, cheek: 0, chinOnly: true },
    "short-beard": { length: 1.6, cheek: 5.5, chinOnly: false },
    "full-beard": { length: 6.5, cheek: 3, chinOnly: false },
    "long-beard": { length: 15, cheek: 2.5, chinOnly: false },
};
const MUSTACHE = new Set(["stubble", "mustache", "pencil", "walrus", "circle-beard", "short-beard", "full-beard", "long-beard"]);
function lipGap(L, g) {
    return L.mouthY + 2.2 + g.mouth.lower * 2.2;
}
function jawBeard(L, g, b) {
    const f = b.length;
    const outerRight = [
        pt(CX + L.cheekW - 1.2, L.earTop + 5),
        pt(CX + L.cheekW + 0.7 + f * 0.25, L.cheekY + 5),
        pt(CX + L.jawW + 1.3 + f * 0.45, L.jawY + f * 0.45),
        pt(CX + L.chinW + 3 + f * 0.55, L.chinY + f * 0.85),
    ];
    const bottom = pt(CX, L.chinY + 1.4 + f);
    const lip = lipGap(L, g);
    const innerRight = [
        pt(CX + L.cheekW - 3.4, L.earTop + 7),
        pt(CX + L.cheekW - 5 - b.cheek * 0.3, L.cheekY + 4 + b.cheek),
        pt(CX + L.mouthW + 4.5, L.mouthY - 0.5),
        pt(CX + L.mouthW + 1.2, L.mouthY + 3),
        pt(CX + 3, lip),
    ];
    const mirrorPts = (ps) => ps.map((p) => pt(2 * CX - p.x, p.y));
    return [...mirrorPts(outerRight), bottom, ...[...outerRight].reverse(), ...innerRight, ...mirrorPts(innerRight).reverse()];
}
function beardTexture(L, b, color) {
    const ticks = [];
    const n = b.chinOnly ? 5 : 11;
    for (let i = 0; i < n; i += 1) {
        const t = i / (n - 1);
        const x = CX + (t - 0.5) * (b.chinOnly ? L.chinW * 3 : L.jawW * 1.7);
        const y = L.chinY - 2 + Math.abs(t - 0.5) * (b.chinOnly ? -2 : -14) + b.length * 0.5;
        ticks.push(`M${x},${y}l${(t - 0.5) * 1.2},2.6`);
    }
    return path(ticks.join(""), { fill: "none", stroke: color, "stroke-width": 0.6, "stroke-linecap": "round", opacity: 0.55 });
}
function chinBeard(L, g, b, joined) {
    const lip = lipGap(L, g);
    const w = L.mouthW * (joined ? 1 : 0.72);
    const up = joined ? L.mouthY - 1.5 : L.mouthY + 3;
    return [
        pt(CX - w - (joined ? 1.2 : -1), up),
        pt(CX - L.chinW - (joined ? 2.8 : 1.8), L.chinY - 3),
        pt(CX - L.chinW * 0.7, L.chinY + b.length * 0.8),
        pt(CX, L.chinY + 1.2 + b.length),
        pt(CX + L.chinW * 0.7, L.chinY + b.length * 0.8),
        pt(CX + L.chinW + (joined ? 2.8 : 1.8), L.chinY - 3),
        pt(CX + w + (joined ? 1.2 : -1), up),
        pt(CX + w - 1, L.mouthY + 3),
        pt(CX + 3, lip),
        pt(CX - 3, lip),
        pt(CX - w + 1, L.mouthY + 3),
    ];
}
function mustache(L, g) {
    const w = L.mouthW;
    const y = L.mouthY;
    const t = L.tipY;
    const style = g.facialHair;
    const top = style === "pencil" ? y - 2.2 : t + 3.4;
    const drop = style === "walrus" ? 3.6 : 0.8;
    const lower = style === "walrus" ? y + 0.8 : y - 0.9;
    return smooth([
        pt(CX - w - 1.6, y + drop),
        pt(CX - w * 0.6, top + (style === "pencil" ? 0.4 : 1.4)),
        pt(CX - 2, top),
        pt(CX, top + 0.6),
        pt(CX + 2, top),
        pt(CX + w * 0.6, top + (style === "pencil" ? 0.4 : 1.4)),
        pt(CX + w + 1.6, y + drop),
        pt(CX + w * 0.5, lower),
        pt(CX, lower - 0.3),
        pt(CX - w * 0.5, lower),
    ], true, 0.85);
}
function beardPalette(hair) {
    const base = mix(hair.base, portrait.hair.beardSilver, Math.min(1, hair.gray * 0.35));
    return { base, shadow: shift(base, { l: -0.07 }) };
}
/** Everything below the nose that is hair, split so the lips can sit between. */
export function facialHair(L, g, hair) {
    const style = g.facialHair;
    if (style === "none")
        return { beard: "", mustache: "" };
    const color = beardPalette(hair);
    const stubble = style === "stubble";
    const opacity = stubble ? 0.4 : 1;
    const b = BEARDS[style];
    let beard = "";
    if (b) {
        const pts = b.chinOnly ? chinBeard(L, g, b, style === "circle-beard") : jawBeard(L, g, b);
        const textured = g.hair.texture === "coily" || g.hair.texture === "curly";
        const d = textured && b.length > 4 ? scallop(sample(pts, true, 6), 1.6, true, (i) => ((i * 37) % 11) / 11) : smooth(pts, true, 0.8);
        beard = path(d, { fill: color.base, opacity }) + (stubble ? "" : path(d, { fill: "none", stroke: color.base, "stroke-width": 1.4, opacity: 0.35 }));
        if (!stubble)
            beard += beardTexture(L, b, color.shadow);
        if (!stubble && !b.chinOnly) {
            beard += path(`M${CX + 6},${L.chinY - 1 + b.length * 0.6}Q${CX + L.jawW * 0.6},${L.jawY + 5 + b.length * 0.4} ${CX + L.jawW - 1},${L.jawY + 1}`, { fill: "none", stroke: color.shadow, "stroke-width": 2.2, "stroke-linecap": "round", opacity: 0.45 });
        }
    }
    const lip = MUSTACHE.has(style) ? path(mustache(L, g), { fill: color.base, opacity: stubble ? 0.42 : 1 }) : "";
    return { beard, mustache: lip };
}
