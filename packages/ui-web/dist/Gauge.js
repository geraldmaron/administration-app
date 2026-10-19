import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Bar } from "./Bar";
const clamp = (value) => Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));
/** A point on the dial's half circle, 0 at the left end and 1 at the right. */
function onArc(t, radius) {
    const angle = Math.PI * (1 - clamp(t));
    return { x: 50 + radius * Math.cos(angle), y: 50 - radius * Math.sin(angle) };
}
function arcPath(from, to, radius) {
    const start = onArc(from, radius);
    const end = onArc(to, radius);
    return `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} A ${radius} ${radius} 0 0 1 ${end.x.toFixed(2)} ${end.y.toFixed(2)}`;
}
/** The arc lit up to the value, with a knob at the reading and ticks at the thresholds; the figure sits inside the arc. */
function Dial({ value, marks }) {
    const knob = onArc(value, 40);
    return (_jsxs("svg", { className: "ui-gauge__dial", viewBox: "0 0 100 56", "aria-hidden": "true", focusable: "false", children: [_jsx("path", { className: "ui-gauge__track", d: arcPath(0, 1, 40) }), value > 0 ? _jsx("path", { className: "ui-gauge__fill", d: arcPath(0, value, 40) }) : null, marks.map((mark) => {
                const inner = onArc(mark.at, 31);
                const outer = onArc(mark.at, 35);
                return _jsx("line", { className: "ui-gauge__mark", x1: inner.x, y1: inner.y, x2: outer.x, y2: outer.y }, mark.label);
            }), _jsx("circle", { className: "ui-gauge__knob", cx: knob.x, cy: knob.y, r: 5.5 })] }));
}
/** A full-circle assessment, with a fixed start at twelve and threshold ticks. */
function Ring({ value, marks }) {
    return _jsxs("svg", { className: "ui-gauge__ring", viewBox: "0 0 120 120", "aria-hidden": "true", focusable: "false", children: [_jsx("circle", { className: "ui-gauge__track", cx: "60", cy: "60", r: "49" }), value > 0 ? _jsx("circle", { className: "ui-gauge__fill", cx: "60", cy: "60", r: "49", pathLength: "100", strokeDasharray: `${value * 100} 100`, transform: "rotate(-90 60 60)" }) : null, marks.map((mark) => { const angle = clamp(mark.at) * Math.PI * 2 - Math.PI / 2; return _jsx("line", { className: "ui-gauge__mark", x1: 60 + Math.cos(angle) * 37, y1: 60 + Math.sin(angle) * 37, x2: 60 + Math.cos(angle) * 42, y2: 60 + Math.sin(angle) * 42 }, mark.label); })] });
}
function Meter({ value, marks }) {
    return (_jsx("span", { className: "ui-gauge__meter", "aria-hidden": "true", children: _jsx(Bar, { value: value, marks: marks, slim: true }) }));
}
/** A reading drawn on a scale, so its size is seen before its number is read. */
export function Gauge({ label, value, valueText, tone = "reading", marks = [], shape = "dial", caption, labelHidden = false, stacked = false }) {
    const marksSpoken = marks.length > 0 ? `. ${marks.map((mark) => `${mark.label} at ${Math.round(mark.at * 100)}%`).join(", ")}` : "";
    return (_jsxs("div", { className: `ui-gauge ui-gauge--${shape}`, "data-label": labelHidden ? "hidden" : undefined, "data-stacked": stacked && shape === "meter" ? "true" : undefined, "data-tone": tone, role: "meter", "aria-label": label, "aria-valuemin": 0, "aria-valuemax": 100, "aria-valuenow": Math.round(clamp(value) * 100), "aria-valuetext": `${valueText}${marksSpoken}`, children: [_jsx("span", { className: labelHidden ? "ui-visually-hidden" : "ui-gauge__label", children: label }), shape === "ring" ? _jsx(Ring, { value: clamp(value), marks: marks }) : shape === "dial" ? _jsx(Dial, { value: clamp(value), marks: marks }) : _jsx(Meter, { value: value, marks: marks }), _jsx("span", { className: "ui-gauge__value", children: valueText }), caption ? _jsx("span", { className: "ui-gauge__caption", children: caption }) : null] }));
}
