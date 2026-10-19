import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/** The values' own range, padded, so a small move is still seen. */
export function fitDomain(values) {
    const low = Math.min(...values);
    const high = Math.max(...values);
    const pad = Math.max((high - low) * 0.15, Math.abs(high) * 0.02, 1e-6);
    return [low - pad, high + pad];
}
/** Values, oldest first, as points across a `width` by `height` box inset by `pad`. */
export function plotValues(values, domain, width, height, pad) {
    const [low, high] = domain;
    const span = high - low || 1;
    const step = values.length > 1 ? (width - pad * 2) / (values.length - 1) : 0;
    return values.map((v, i) => [pad + i * step, height - pad - ((Math.min(high, Math.max(low, v)) - low) / span) * (height - pad * 2)]);
}
export const linePath = (pts) => pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
const WIDTH = 96;
const HEIGHT = 28;
const PAD = 3;
/**
 * A reading's recent path at the size of a word, for a row that already says
 * the figure. Decorative: the row it sits in carries the value and the change.
 */
export function Sparkline({ values, splitAt = 0, valence = "neutral" }) {
    if (values.length < 2)
        return _jsx("span", { className: "ui-sparkline", "aria-hidden": "true" });
    const pts = plotValues(values, fitDomain(values), WIDTH, HEIGHT, PAD);
    const split = Math.min(Math.max(splitAt - 1, 0), pts.length - 1);
    const before = splitAt > 0 ? pts.slice(0, split + 1) : [];
    const after = splitAt > 0 ? pts.slice(split) : pts;
    const last = pts[pts.length - 1];
    return (_jsxs("svg", { className: "ui-sparkline", "data-valence": valence, viewBox: `0 0 ${WIDTH} ${HEIGHT}`, preserveAspectRatio: "none", "aria-hidden": "true", focusable: "false", children: [before.length > 1 ? _jsx("path", { className: "ui-sparkline__line ui-sparkline__line--before", d: linePath(before) }) : null, after.length > 1 ? _jsx("path", { className: "ui-sparkline__line", d: linePath(after) }) : null, _jsx("circle", { className: "ui-sparkline__now", cx: last[0], cy: last[1], r: 2.5 })] }));
}
