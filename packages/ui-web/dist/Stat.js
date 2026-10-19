import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Icon } from "./Icon";
const ARROW = { up: "▲", down: "▼", flat: "▬" };
const SPOKEN = { up: "up", down: "down", flat: "unchanged" };
function toneOfDelta(delta) {
    if (delta.tone)
        return delta.tone;
    if (!delta.better)
        return undefined;
    if (delta.direction === "flat")
        return "neutral";
    return delta.direction === delta.better ? "good" : "bad";
}
/** One reading: its name, its figure, how it moved and against what. */
export function Stat({ label, value, delta, period, reading, compact = false, size = "figure", icon, layout = "stacked", tone, heading = false, className }) {
    const Label = heading ? "h3" : "p";
    return (_jsxs("div", { "data-layout": layout === "comparison" ? layout : undefined, "data-tone": tone, className: ["ui-stat", compact ? "ui-stat--compact" : undefined, size === "heading" ? "ui-stat--heading" : undefined, className].filter(Boolean).join(" "), children: [_jsxs(Label, { className: "ui-stat__label", children: [icon ? _jsx(Icon, { name: icon, size: 16 }) : null, label] }), _jsx("p", { className: "ui-stat__value", children: value }), delta ? (_jsxs("p", { className: "ui-stat__delta", "data-direction": delta.direction, "data-tone": toneOfDelta(delta), children: [_jsx("span", { "aria-hidden": "true", children: ARROW[delta.direction] }), _jsx("span", { className: "ui-visually-hidden", children: SPOKEN[delta.direction] }), " ", delta.text, period ? _jsxs("span", { className: "ui-stat__period", children: [" ", period] }) : null] })) : period ? (_jsx("p", { className: "ui-stat__period", children: period })) : null, reading ? _jsx("div", { className: "ui-stat__reading", children: reading }) : null] }));
}
/** Several readings divided inside one surface, so a row of figures is one object rather than a row of cards. */
export function StatRow({ children, layout, as: Element = "div", className }) {
    return _jsx(Element, { className: ["ui-stat-row", className].filter(Boolean).join(" "), "data-layout": layout, children: children });
}
