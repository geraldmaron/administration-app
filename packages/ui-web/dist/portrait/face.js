import { portrait } from "@admin/design";
import { mix, shift } from "./color";
import { CX, clamp, fmt, lerp, pt, ribbon, sample, smooth } from "./geometry";
import { blurRef } from "./effects";
import { clip, el, group, path } from "./svg";
// The face itself: skin, shading, eyes, brows, nose and mouth. Light falls from
// the upper left, as in a studio portrait, so every shadow sits right and below.
export const LIPSTICK = portrait.lipstick;
const soft = (g) => (g.presentation === "feminine" ? 1 : g.presentation === "androgynous" ? 0.5 : 0);
function radial(id, color, opacity) {
    return el("radialGradient", { id }, el("stop", { offset: 0, "stop-color": color, "stop-opacity": opacity }) + el("stop", { offset: 1, "stop-color": color, "stop-opacity": 0 }));
}
function sideLight(id) {
    return el("linearGradient", { id: `${id}-side`, x1: 0, y1: 0, x2: 1, y2: 0 }, el("stop", { offset: 0.5, "stop-color": portrait.studio.shadow, "stop-opacity": 0 }) + el("stop", { offset: 1, "stop-color": portrait.studio.shadow, "stop-opacity": 0.28 }));
}
export function faceDefs(id, L, skin, iris) {
    return (sideLight(id) +
        clip(`${id}-face`, smooth(L.face)) +
        el("clipPath", { id: `${id}-rim` }, el("rect", { x: CX + L.cheekW * 0.3, y: 0, width: 120, height: 200 })) +
        radial(`${id}-blush`, skin.blush, 0.55) +
        radial(`${id}-sock`, skin.deep, 0.42) +
        el("linearGradient", { id: `${id}-scl`, x1: 0, y1: 0, x2: 0, y2: 1 }, el("stop", { offset: 0, "stop-color": portrait.eye.sclera.lid }) + el("stop", { offset: 0.5, "stop-color": portrait.eye.sclera.mid }) + el("stop", { offset: 1, "stop-color": portrait.eye.sclera.low })) +
        el("radialGradient", { id: `${id}-iris`, cx: 0.45, cy: 0.42, r: 0.62 }, el("stop", { offset: 0, "stop-color": shift(iris, { l: 0.14, s: 0.05 }) }) +
            el("stop", { offset: 0.62, "stop-color": iris }) +
            el("stop", { offset: 1, "stop-color": shift(iris, { l: -0.16 }) })));
}
export function ear(L, g, skin, s) {
    const size = (0.9 + g.ears.size * 0.25) * (1 + L.years * 0.08);
    const out = (3.4 + g.ears.set * 2.2) * size;
    const x0 = CX + s * (L.cheekW - 2.6);
    const top = L.earTop;
    const bot = L.earBottom + L.years * 1.6;
    const outer = `M${fmt(pt(x0, top + 1.5))}C${fmt(pt(x0 + s * (out + 2), top - 3.2))} ${fmt(pt(x0 + s * (out + 3), top + 9))} ` +
        `${fmt(pt(x0 + s * (out + 1.2), bot - 5.5))}C${fmt(pt(x0 + s * out, bot + 0.8))} ${fmt(pt(x0 + s * 1.6, bot + 2.8))} ${fmt(pt(x0 - s * 0.6, bot - 0.8))}Z`;
    const inner = `M${fmt(pt(x0 + s * 1.3, top + 3.2))}C${fmt(pt(x0 + s * (out - 0.2), top + 1.2))} ${fmt(pt(x0 + s * (out + 0.6), top + 10))} ${fmt(pt(x0 + s * (out - 1.4), bot - 7.5))}`;
    return (path(outer, { fill: s === 1 ? skin.shadow : skin.base }) +
        path(inner, { fill: "none", stroke: skin.deep, "stroke-width": 0.9, "stroke-linecap": "round", opacity: 0.55 }));
}
export function neck(id, L, skin) {
    const w = L.neckW;
    const top = L.jawY - 9;
    const base = 162;
    const d = `M${CX - w},${top}C${CX - w + 0.5},${L.chinY + 8} ${CX - w - 0.3},${base - 14} ${CX - w - 6},${base}` +
        `L${CX + w + 6},${base}C${CX + w + 0.3},${base - 14} ${CX + w - 0.5},${L.chinY + 8} ${CX + w},${top}Z`;
    const lines = L.years > 0.45
        ? path(`M${CX - w * 0.55},${L.chinY + 11}Q${CX},${L.chinY + 13} ${CX + w * 0.55},${L.chinY + 11}` +
            (L.years > 0.6 ? `M${CX - 4.5},${L.chinY + 5}Q${CX - 5.5},${L.chinY + 13} ${CX - 3.5},${base - 16}M${CX + 4.5},${L.chinY + 5}Q${CX + 5.5},${L.chinY + 13} ${CX + 3.5},${base - 16}` : ""), { fill: "none", stroke: skin.shadow, "stroke-width": 0.7, opacity: clamp((L.years - 0.45) * 1.6) })
        : "";
    return (clip(`${id}-neck`, d) +
        path(d, { fill: skin.base }) +
        group(path(smooth(L.face), { fill: skin.shadow, transform: "translate(0 7.5)", filter: blurRef(id, "f") }) +
            path(smooth(L.face), { fill: skin.deep, opacity: 0.35, transform: "translate(0 4)", filter: blurRef(id, "f") }) +
            el("rect", { x: CX + w - 7.5, y: top, width: 18, height: 70, fill: skin.shadow, opacity: 0.75, filter: blurRef(id, "m") }), { "clip-path": `url(#${id}-neck)` }) +
        lines);
}
export function skinShading(id, L, skin, blush = 0) {
    const d = smooth(L.face);
    const lit = "translate(-4.2 -3)";
    return (path(d, { fill: skin.shadow }) +
        group(path(d, { fill: skin.base, transform: lit, filter: blurRef(id, "m") }) +
            path(d, { fill: "none", stroke: skin.warm, "stroke-width": 3.4, opacity: 0.2, transform: lit, filter: blurRef(id, "f") }) +
            el("ellipse", { cx: CX - 7, cy: L.hairlineY + 11, rx: 14, ry: 7, fill: skin.light, opacity: 0.5, filter: blurRef(id, "g") }) +
            el("ellipse", { cx: CX - L.cheekW * 0.52, cy: L.cheekY - 2.5, rx: 6.5, ry: 3.2, fill: skin.light, opacity: 0.38, filter: blurRef(id, "m") }) +
            el("ellipse", { cx: CX - 1.2, cy: L.chinY - 5, rx: 5, ry: 2.6, fill: skin.light, opacity: 0.32, filter: blurRef(id, "m") }) +
            el("ellipse", { cx: CX - L.cheekW * 0.58, cy: L.eyeY + 13, rx: 8.5, ry: 6, fill: `url(#${id}-blush)`, opacity: Math.min(1, 0.7 + blush * 0.6) }) +
            el("ellipse", { cx: CX + L.cheekW * 0.58, cy: L.eyeY + 13, rx: 8.5, ry: 6, fill: `url(#${id}-blush)`, opacity: Math.min(1, 0.5 + blush * 0.5) }) +
            path(d, { fill: "none", stroke: skin.deep, "stroke-width": 4.5, opacity: 0.2, filter: blurRef(id, "m") }) +
            path(d, { fill: "none", stroke: portrait.studio.rim, "stroke-width": 1.8, opacity: 0.42, filter: blurRef(id, "e"), "clip-path": `url(#${id}-rim)` }), { "clip-path": `url(#${id}-face)` }));
}
function eyeFrame(L, s, shapeMono) {
    const inner = pt(CX + s * L.eyeInner, L.eyeY + 0.35);
    const outer = pt(CX + s * (L.eyeInner + L.eyeW), L.eyeY - L.eyeTilt);
    const H = L.eyeH;
    const at = (t, dy) => pt(lerp(inner.x, outer.x, t), lerp(inner.y, outer.y, t) + dy);
    const lift = shapeMono ? 0.86 : 1;
    const u1 = at(0.2, -H * 0.95 * lift);
    const u2 = at(0.68, -H * 1.02 * lift);
    const l1 = at(0.74, H * 0.62);
    const l2 = at(0.24, H * 0.56);
    const upper = `M${fmt(inner)}C${fmt(u1)} ${fmt(u2)} ${fmt(outer)}`;
    const lower = `M${fmt(outer)}C${fmt(l1)} ${fmt(l2)} ${fmt(inner)}`;
    return { at, almond: `${upper}C${fmt(l1)} ${fmt(l2)} ${fmt(inner)}Z`, upper, lower };
}
function crease(g, skin, f, H) {
    if (g.eyes.shape === "mono") {
        return path(`M${fmt(f.at(-0.04, -0.3))}Q${fmt(f.at(0.02, -H * 0.6))} ${fmt(f.at(0.14, -H * 0.75))}`, {
            fill: "none",
            stroke: skin.shadow,
            "stroke-width": 0.6,
            opacity: 0.8,
        });
    }
    const hooded = g.eyes.shape === "hooded";
    const k = hooded ? 1.32 : 1.72;
    const d = `M${fmt(f.at(0.1, -H * 1.02))}C${fmt(f.at(0.4, -H * k))} ${fmt(f.at(0.82, -H * (k - 0.2)))} ${fmt(f.at(1.04, -H * (hooded ? 0.55 : 0.85)))}`;
    return path(d, { fill: "none", stroke: skin.deep, "stroke-width": hooded ? 0.75 : 0.6, "stroke-linecap": "round", opacity: 0.55 });
}
function eye(id, L, g, skin, s) {
    const f = eyeFrame(L, s, g.eyes.shape === "mono");
    const H = L.eyeH;
    const cid = `${id}-eye${s === 1 ? "r" : "l"}`;
    const c = f.at(0.5, H * 0.12);
    const r = L.eyeW * 0.245;
    const lash = portrait.eye.lash;
    const fem = soft(g);
    const made = g.makeup.eyes;
    const wing = made === "wing" ? path(`M${fmt(f.at(0.9, -H * 0.2))}L${fmt(f.at(1.16, -H * 0.42 - 0.9))}`, { stroke: lash, "stroke-width": 1.1, "stroke-linecap": "round" }) : "";
    const smoky = made === "smoky"
        ? path(`${f.upper}Q${fmt(f.at(0.62, -H * 2.1))} ${fmt(f.at(0, -H * 0.2))}Z`, { fill: portrait.eye.smoky, opacity: 0.28 })
        : "";
    const lashWeight = 1.05 + fem * 0.3 + (made === "liner" || made === "wing" ? 0.35 : 0);
    const socket = el("ellipse", { cx: f.at(0.5, 0).x, cy: f.at(0.5, -H * 1.35).y, rx: L.eyeW * 0.66, ry: 3.6, fill: `url(#${id}-sock)`, opacity: s === 1 ? 1 : 0.75 });
    const bags = L.years > 0.3
        ? path(`M${fmt(f.at(0.08, H * 1.05))}Q${fmt(f.at(0.5, H * 1.75))} ${fmt(f.at(0.95, H * 0.85))}` +
            (L.years > 0.62 ? `M${fmt(f.at(0.2, H * 1.9))}Q${fmt(f.at(0.55, H * 2.5))} ${fmt(f.at(0.9, H * 1.6))}` : ""), { fill: "none", stroke: skin.shadow, "stroke-width": 0.75, opacity: clamp((L.years - 0.3) * 1.3) })
        : "";
    const hood = L.years > 0.5
        ? path(`M${fmt(f.at(0.3, -H * 1.3))}Q${fmt(f.at(0.8, -H * 1.35))} ${fmt(f.at(1.08, -H * 0.05))}Q${fmt(f.at(0.85, -H * 0.62))} ${fmt(f.at(0.3, -H * 1.3))}Z`, { fill: skin.base, opacity: clamp((L.years - 0.5) * 2.2) })
        : "";
    const feet = L.years > 0.4
        ? path(`M${fmt(f.at(1.12, -0.6))}l${s * 2.8},-1.4M${fmt(f.at(1.12, 1))}l${s * 2.6},1.2`, { stroke: skin.shadow, "stroke-width": 0.5, "stroke-linecap": "round", opacity: clamp((L.years - 0.4) * 1.6) })
        : "";
    return (socket +
        smoky +
        clip(cid, f.almond) +
        path(f.almond, { fill: `url(#${id}-scl)` }) +
        group(el("circle", { cx: c.x, cy: c.y, r, fill: `url(#${id}-iris)` }) +
            el("circle", { cx: c.x, cy: c.y, r, fill: "none", stroke: portrait.eye.limbus, "stroke-width": 0.45, opacity: 0.6 }) +
            el("circle", { cx: c.x, cy: c.y, r: r * 0.44, fill: portrait.eye.pupil }) +
            el("circle", { cx: c.x - r * 0.32, cy: c.y - r * 0.36, r: r * 0.26, fill: portrait.studio.light, opacity: 0.85 }) +
            el("circle", { cx: c.x + r * 0.34, cy: c.y + r * 0.3, r: r * 0.12, fill: portrait.studio.light, opacity: 0.3 }) +
            path(`${f.upper}L${fmt(f.at(1, 1.8))}L${fmt(f.at(0, 1.8))}Z`, { fill: skin.deep, opacity: 0.45, transform: "translate(0 1.1)", filter: blurRef(id, "e") }), { "clip-path": `url(#${cid})` }) +
        path(f.upper, { fill: "none", stroke: lash, "stroke-width": lashWeight, "stroke-linecap": "round" }) +
        path(f.lower, { fill: "none", stroke: skin.deep, "stroke-width": 0.5, opacity: 0.5 }) +
        path(f.lower, { fill: "none", stroke: portrait.eye.waterline, "stroke-width": 0.45, opacity: 0.45, transform: "translate(0 -0.55)" }) +
        wing +
        crease(g, skin, f, H) +
        hood +
        bags +
        feet);
}
export function eyes(id, L, g, skin) {
    return eye(id, L, g, skin, -1) + eye(id, L, g, skin, 1);
}
const ARCH = {
    straight: { arch: 0.5, peak: 0.55, tension: 1, thick: 1 },
    soft: { arch: 1.3, peak: 0.6, tension: 1, thick: 1 },
    arched: { arch: 2.3, peak: 0.66, tension: 1, thick: 0.92 },
    angled: { arch: 2, peak: 0.62, tension: 0.45, thick: 1 },
    bushy: { arch: 1.1, peak: 0.58, tension: 1, thick: 1.4 },
};
function brow(id, L, g, hair, s) {
    const style = ARCH[g.brows.style];
    const len = L.eyeW + 5.8;
    const x0 = CX + s * (L.eyeInner - 1.8);
    const arch = style.arch + g.brows.arch * 1.5;
    const tilt = (g.brows.tilt - 0.5) * 2.2;
    const pts = [
        pt(x0, L.browY + 1.4 - tilt),
        pt(x0 + s * len * 0.3, L.browY - arch * 0.6),
        pt(x0 + s * len * style.peak, L.browY - arch),
        pt(x0 + s * len, L.browY + 1.8 - L.eyeTilt * 0.4),
    ];
    const agedBrow = soft(g) > 0.6 ? 1 - L.years * 0.2 : 1 + L.years * 0.14;
    const thick = (0.95 + g.brows.thickness * 1.7) * (1 - soft(g) * 0.22) * style.thick * agedBrow;
    const width = (t) => thick * (t < 0.12 ? 1.08 : t < 0.62 ? lerp(1.08, 0.86, (t - 0.12) / 0.5) : lerp(0.86, 0.3, (t - 0.62) / 0.38));
    return path(ribbon(sample(pts, false, 7, style.tension), width), { fill: hair.brow, filter: blurRef(id, "e") });
}
export function brows(id, L, g, hair) {
    return brow(id, L, g, hair, -1) + brow(id, L, g, hair, 1);
}
export function nose(id, L, g, skin) {
    const w = L.noseW;
    const t = L.tipY;
    const bw = 2 + g.nose.bridge * 1.5;
    const tipR = 2.8 + g.nose.tip * 1.6;
    const side = smooth([pt(CX + bw * 0.5, L.eyeY - 1), pt(CX + bw, L.eyeY + 8), pt(CX + bw + 1, t - 6), pt(CX + w * 0.78, t - 2.4), pt(CX + w * 0.42, t - 3.8), pt(CX + bw - 0.8, t - 7.5), pt(CX + bw * 0.15, L.eyeY + 3)], true, 0.9);
    const under = smooth([pt(CX - w - 0.4, t - 1.6), pt(CX - w * 0.55, t + 2), pt(CX, t + 2.4), pt(CX + w * 0.55, t + 2), pt(CX + w + 0.4, t - 1.6), pt(CX + w * 0.5, t + 0.3), pt(CX, t + 0.9), pt(CX - w * 0.5, t + 0.3)], true, 0.8);
    const ala = (s) => `M${fmt(pt(CX + s * w * 0.6, t - 5.4))}C${fmt(pt(CX + s * (w + 1.4), t - 4.6))} ${fmt(pt(CX + s * (w + 1.3), t + 0.6))} ${fmt(pt(CX + s * w * 0.48, t + 1.2))}`;
    const nostril = (s) => el("ellipse", { cx: CX + s * w * 0.42, cy: t + 0.6, rx: 1.35, ry: 0.68, transform: `rotate(${s * 14} ${CX + s * w * 0.42} ${t + 0.6})`, fill: skin.line, opacity: 0.85 });
    return (path(side, { fill: skin.shadow, opacity: 0.75, filter: blurRef(id, "f") }) +
        path(under, { fill: skin.deep, opacity: 0.42, filter: blurRef(id, "f") }) +
        path(ala(-1), { fill: "none", stroke: skin.deep, "stroke-width": 0.75, "stroke-linecap": "round", opacity: 0.55 }) +
        path(ala(1), { fill: "none", stroke: skin.deep, "stroke-width": 0.8, "stroke-linecap": "round", opacity: 0.75 }) +
        nostril(-1) +
        nostril(1) +
        el("ellipse", { cx: CX - 0.7, cy: t - 3.1, rx: tipR * 0.5, ry: tipR * 0.34, fill: skin.light, opacity: 0.6, filter: blurRef(id, "e") }) +
        path(`M${CX - 0.9},${L.eyeY + 1}L${CX - 0.7},${t - 6.5}`, { stroke: skin.light, "stroke-width": 1.6, "stroke-linecap": "round", opacity: 0.4, filter: blurRef(id, "f") }));
}
export function mouth(id, L, g, skin) {
    const w = L.mouthW;
    const y = L.mouthY;
    const fem = soft(g);
    const ul = (1.15 + g.mouth.upper * 1.9 + fem * 0.45) * (1 - L.years * 0.3);
    const ll = (2 + g.mouth.lower * 2.3 + fem * 0.5) * (1 - L.years * 0.22);
    const e = (g.mouth.expression - 0.4) * 1.6;
    const cy = -e * 1.2;
    const bow = 0.3 + g.mouth.bow * 0.9;
    const line = [pt(CX - w, y + cy), pt(CX - w * 0.5, y + 0.45 - e * 0.25), pt(CX, y + 0.3), pt(CX + w * 0.5, y + 0.45 - e * 0.25), pt(CX + w, y + cy)];
    const upper = smooth([...line, pt(CX + w * 0.55, y - ul * 0.8), pt(CX + 2.3, y - ul), pt(CX, y - ul + bow), pt(CX - 2.3, y - ul), pt(CX - w * 0.55, y - ul * 0.8)], true, 0.8);
    const lower = smooth([line[0], pt(CX - w * 0.55, y + ll * 0.86), pt(CX, y + ll), pt(CX + w * 0.55, y + ll * 0.86), line[4], line[3], line[2], line[1]], true, 0.8);
    const folds = (s) => `M${fmt(pt(CX + s * (L.noseW + 1.8), L.tipY - 1.5))}Q${fmt(pt(CX + s * (w + 3.5), y - 5))} ${fmt(pt(CX + s * (w + 2.6), y + 2))}`;
    const foldOpacity = 0.1 + L.years * 0.55;
    const tinted = g.makeup.lips === "none" ? undefined : mix(LIPSTICK[g.makeup.lips], skin.lip, g.skin.tone >= 5 ? 0.3 : 0.18);
    const upperFill = tinted ? shift(tinted, { l: -0.04 }) : skin.lip;
    const lowerFill = tinted ?? skin.lipLight;
    return (path(folds(-1), { fill: "none", stroke: skin.shadow, "stroke-width": 1.2 + L.years * 0.6, "stroke-linecap": "round", opacity: foldOpacity * 0.8, filter: blurRef(id, "e") }) +
        path(folds(1), { fill: "none", stroke: skin.shadow, "stroke-width": 1.3 + L.years * 0.7, "stroke-linecap": "round", opacity: foldOpacity, filter: blurRef(id, "e") }) +
        el("ellipse", { cx: CX + 0.6, cy: y + ll + 2.4, rx: w * 0.45, ry: 1.6, fill: skin.deep, opacity: 0.35, filter: blurRef(id, "f") }) +
        path(upper, { fill: upperFill }) +
        path(lower, { fill: lowerFill }) +
        el("ellipse", { cx: CX - 1.2, cy: y + ll * 0.45, rx: w * 0.3, ry: ll * 0.22, fill: portrait.studio.light, opacity: 0.16, filter: blurRef(id, "e") }) +
        el("circle", { cx: CX - w + 0.4, cy: y + cy, r: 1.3, fill: skin.deep, opacity: 0.35, filter: blurRef(id, "e") }) +
        el("circle", { cx: CX + w - 0.4, cy: y + cy, r: 1.3, fill: skin.deep, opacity: 0.4, filter: blurRef(id, "e") }) +
        path(smooth(line, false), { fill: "none", stroke: skin.line, "stroke-width": 0.85, "stroke-linecap": "round", opacity: 0.9 }));
}
export function marks(L, g, skin, seed) {
    const out = [];
    const lined = clamp((L.years - 0.25) * 1.4) * (0.5 + g.marks.lines * 0.5);
    if (lined > 0.05) {
        for (let i = 0; i < 3; i += 1) {
            const y = L.browY - 7.5 - i * 3.6;
            if (y < L.hairlineY + 3)
                break;
            out.push(path(`M${CX - 12 + i},${y + 0.8}Q${CX},${y - 1} ${CX + 12 - i},${y + 0.8}`, { fill: "none", stroke: skin.shadow, "stroke-width": 0.55, opacity: lined * 0.8 }));
        }
        if (L.years > 0.5) {
            for (const s of [-1, 1]) {
                out.push(path(`M${fmt(pt(CX + s * (L.mouthW + 0.5), L.mouthY + 1.5))}q${s * 0.8},4 ${s * 0.2},7.5`, { fill: "none", stroke: skin.shadow, "stroke-width": 0.8, opacity: clamp((L.years - 0.5) * 1.6) }));
            }
        }
    }
    if (g.marks.freckles > 0.62) {
        const n = Math.round((g.marks.freckles - 0.62) * 40);
        for (let i = 0; i < n; i += 1) {
            const s = i % 2 === 0 ? -1 : 1;
            const x = CX + s * (2.5 + seed(i) * (L.cheekW * 0.5));
            const y = L.eyeY + 4 + seed(i + 31) * 6;
            out.push(el("circle", { cx: x, cy: y, r: 0.32 + seed(i + 57) * 0.22, fill: skin.shadow, opacity: 0.55 }));
        }
    }
    if (g.marks.mole > 0.82) {
        const s = g.marks.mole > 0.91 ? 1 : -1;
        out.push(el("circle", { cx: CX + s * (L.mouthW + 4), cy: L.mouthY - 5, r: 0.8, fill: skin.line, opacity: 0.7 }));
    }
    if (L.years > 0.72) {
        out.push(el("ellipse", { cx: CX - L.templeW + 6, cy: L.templeY + 1, rx: 1.4, ry: 1, fill: skin.shadow, opacity: 0.5 }));
        out.push(el("ellipse", { cx: CX + L.cheekW - 7, cy: L.eyeY + 9, rx: 1.1, ry: 0.8, fill: skin.shadow, opacity: 0.45 }));
    }
    return out.join("");
}
