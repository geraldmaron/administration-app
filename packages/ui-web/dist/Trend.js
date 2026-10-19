import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { useId } from "react";
import { fitDomain, linePath as line, plotValues } from "./Sparkline";
const WIDTH = 160;
const HEIGHT = 44;
const PAD = 3;
const ARROW = { up: "▲", down: "▼", flat: "▬" };
/**
 * A reading as a figure with its recent path: what it is, which way it is
 * going and how far, read at a glance. The line carries the shape; the
 * figure carries the value; the change says how much this period moved it.
 */
export function Trend({ label, figure, values, domain, splitAt = 0, change, tone = "reading", icon, caption }) {
    const id = useId();
    const pts = values.length > 1 ? plotValues(values, domain ?? fitDomain(values), WIDTH, HEIGHT, PAD) : [];
    const split = Math.min(Math.max(splitAt - 1, 0), Math.max(pts.length - 1, 0));
    const before = splitAt > 0 ? pts.slice(0, split + 1) : [];
    const after = splitAt > 0 ? pts.slice(split) : pts;
    const last = pts[pts.length - 1];
    const area = after.length > 1 ? `${line(after)} L${after[after.length - 1][0].toFixed(1)} ${HEIGHT} L${after[0][0].toFixed(1)} ${HEIGHT} Z` : "";
    const spoken = change ? `${figure}, ${change.text}${change.period ? ` ${change.period}` : ""}` : figure;
    return (_jsxs("div", { className: "ui-trend", "data-tone": tone, role: "group", "aria-label": `${label}: ${spoken}`, children: [_jsxs("span", { className: "ui-trend__label", children: [icon, label] }), _jsx("span", { className: "ui-trend__figure", children: figure }), change ? (_jsxs("span", { className: "ui-trend__change", "data-direction": change.direction, "data-good": change.good === undefined ? undefined : String(change.good), children: [_jsx("span", { "aria-hidden": "true", children: ARROW[change.direction] }), " ", change.text, change.period ? _jsxs("span", { className: "ui-trend__period", children: [" ", change.period] }) : null] })) : null, pts.length > 1 ? (_jsxs("svg", { className: "ui-trend__plot", viewBox: `0 0 ${WIDTH} ${HEIGHT}`, preserveAspectRatio: "none", "aria-hidden": "true", focusable: "false", children: [_jsx("defs", { children: _jsxs("linearGradient", { id: `${id}-wash`, x1: "0", x2: "0", y1: "0", y2: "1", children: [_jsx("stop", { offset: "0", className: "ui-trend__wash-top" }), _jsx("stop", { offset: "1", className: "ui-trend__wash-bottom" })] }) }), area ? _jsx("path", { className: "ui-trend__area", d: area, fill: `url(#${id}-wash)` }) : null, before.length > 1 ? _jsx("path", { className: "ui-trend__line ui-trend__line--before", d: line(before) }) : null, after.length > 1 ? _jsx("path", { className: "ui-trend__line", d: line(after) }) : null, last ? _jsx("circle", { className: "ui-trend__now", cx: last[0], cy: last[1], r: 2.5 }) : null] })) : null, caption ? _jsx("span", { className: "ui-trend__caption", children: caption }) : null] }));
}
