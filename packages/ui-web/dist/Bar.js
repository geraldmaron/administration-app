import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
const clamp = (value) => Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));
const pct = (value) => `${(clamp(value) * 100).toFixed(2)}%`;
/** One flat, slim track filled to a value, with hairline ticks at what it is read against. */
export function Bar({ label, value, tone = "reading", marks = [], from, mode = "fill", slim = false }) {
    const spoken = label === undefined ? undefined : marks.length > 0 ? `${label}. ${marks.map((mark) => mark.label).join(", ")}` : label;
    const at = clamp(value);
    const origin = from === undefined ? undefined : clamp(from);
    const lo = origin === undefined ? 0 : Math.min(origin, at);
    const hi = origin === undefined ? at : Math.max(origin, at);
    const a11y = spoken === undefined ? { "aria-hidden": true } : { role: "img", "aria-label": spoken };
    return (_jsxs("span", { className: "ui-bar", "data-tone": tone, "data-mode": mode === "fill" ? undefined : mode, "data-slim": slim ? "true" : undefined, ...a11y, children: [mode === "level" ? (_jsxs(_Fragment, { children: [_jsx("span", { className: "ui-bar__fill", "data-span": "faint", style: { insetInlineStart: 0, inlineSize: pct(at) } }), _jsx("span", { className: "ui-bar__tick", style: { insetInlineStart: pct(at) } })] })) : mode === "shift" && origin !== undefined ? (_jsxs(_Fragment, { children: [_jsx("span", { className: "ui-bar__fill", "data-span": "move", style: { insetInlineStart: pct(lo), inlineSize: `${((hi - lo) * 100).toFixed(2)}%` } }), _jsx("span", { className: "ui-bar__dot", "data-end": "start", style: { insetInlineStart: pct(origin) } }), _jsx("span", { className: "ui-bar__dot", "data-end": "end", style: { insetInlineStart: pct(at) } })] })) : (_jsxs(_Fragment, { children: [origin === undefined ? null : _jsx("span", { className: "ui-bar__fill", "data-span": "base", style: { insetInlineStart: 0, inlineSize: pct(lo) } }), _jsx("span", { className: "ui-bar__fill", "data-span": origin === undefined ? undefined : "move", style: { insetInlineStart: pct(lo), inlineSize: `${((hi - lo) * 100).toFixed(2)}%` } })] })), marks.map((mark) => (_jsx("span", { className: "ui-bar__mark", style: { insetInlineStart: pct(mark.at) } }, mark.label)))] }));
}
/** Five steps of one hue, darkest first, so a stacked share reads as parts of one whole without five competing colors. */
const SHADES = 5;
/** A whole split into parts on one bar, each part named in a legend that carries its glyph and figure. */
export function ShareBar({ label, segments, shape = "bar" }) {
    const total = segments.reduce((sum, segment) => sum + Math.max(0, segment.share), 0);
    let offset = 0;
    return (_jsxs("figure", { className: "ui-share", "data-shape": shape, children: [_jsx("figcaption", { className: "ui-visually-hidden", children: label }), shape === "ring" ? _jsxs("div", { className: "ui-share__ring", children: [_jsxs("svg", { viewBox: "0 0 120 120", "aria-hidden": "true", focusable: "false", children: [_jsx("circle", { className: "ui-share__ring-track", cx: "60", cy: "60", r: "46" }), total > 0 ? segments.map((segment, index) => { const share = Math.max(0, segment.share) / total * 100; const start = offset; offset += share; return _jsx("circle", { className: "ui-share__ring-part", "data-tone": segment.tone, "data-shade": index % SHADES, cx: "60", cy: "60", r: "46", pathLength: "100", strokeDasharray: `${share} ${100 - share}`, strokeDashoffset: -start, transform: "rotate(-90 60 60)" }, segment.id); }) : null] }), _jsxs("span", { children: [total > 0 ? "100%" : "—", _jsx("small", { children: label })] })] }) : null, _jsx("span", { className: shape === "ring" ? "ui-visually-hidden" : "ui-share__bar", "aria-hidden": "true", children: total > 0
                    ? segments.map((segment, index) => (_jsx("span", { className: "ui-share__part", "data-shade": index % SHADES, style: { flexGrow: (Math.max(0, segment.share) / total) * 100 } }, segment.id)))
                    : null }), _jsx("ul", { className: "ui-share__legend", children: segments.map((segment, index) => (_jsxs("li", { className: "ui-share__item", children: [_jsx("span", { className: "ui-share__key", "data-tone": segment.tone, "data-shade": index % SHADES, "aria-hidden": "true" }), segment.icon, _jsx("span", { className: "ui-share__name", children: segment.label }), _jsx("span", { className: "ui-share__figure", children: segment.figure })] }, segment.id))) })] }));
}
/**
 * Labeled bars on one shared axis: the name (with its glyph) at the left, the
 * bar in the middle, the figure at the right, every column aligned across
 * rows so the eye reads straight down. Below a narrow width a row becomes its
 * label and figure over the full-width bar.
 */
export function BarRows({ label, rows, labelWidth, framed = false, figureInk = false, slim = false }) {
    const style = labelWidth ? { "--bar-label": labelWidth } : undefined;
    return (_jsx("ul", { className: "ui-bar-rows", "data-framed": framed ? "true" : undefined, "aria-label": label, style: style, children: rows.map((row) => {
            const tone = row.tone ?? "reading";
            const valence = tone === "good" || tone === "watch" || tone === "bad" ? tone : undefined;
            return (_jsxs("li", { className: "ui-bar-row", children: [_jsxs("span", { className: "ui-bar-row__label", children: [row.icon, _jsxs("span", { className: "ui-bar-row__text", children: [row.label, row.note ? _jsx("small", { children: row.note }) : null] })] }), _jsx(Bar, { value: row.value, tone: tone, slim: slim, marks: row.marks }), _jsx("span", { className: figureInk ? "ui-bar-row__figure ui-valence-ink" : "ui-bar-row__figure", "data-valence": valence, children: row.figure }), row.spoken ? _jsx("span", { className: "ui-visually-hidden", children: row.spoken }) : null] }, row.id));
        }) }));
}
