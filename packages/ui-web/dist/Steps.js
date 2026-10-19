import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Icon } from "./Icon";
/**
 * A reading that is a band, not a figure: a short run of segments lit up to
 * the step reached, with its word. Compact enough to stack two beside a
 * portrait. Optional numerals identify ordinal bands, never precise scores.
 */
export function Steps({ label, lit, steps = 4, word, tone = "reading", labelHidden = false, caption, icon, layout = "stack", showBand = false }) {
    const reached = Math.min(steps, Math.max(0, Math.round(lit)));
    return (_jsxs("div", { className: "ui-steps", "data-numeric": showBand || undefined, "data-tone": tone, "data-layout": layout === "row" ? "row" : undefined, "data-label": labelHidden ? "hidden" : undefined, role: "meter", "aria-label": label, "aria-valuemin": 1, "aria-valuemax": steps, "aria-valuenow": Math.max(1, reached), "aria-valuetext": showBand ? `Band ${reached} of ${steps}: ${word}` : word, children: [_jsxs("span", { className: labelHidden ? "ui-visually-hidden" : "ui-steps__label", children: [icon && !labelHidden ? _jsx(Icon, { name: icon, size: 16 }) : null, label] }), showBand ? _jsxs("strong", { className: "ui-steps__ordinal", children: [reached, _jsxs("small", { children: ["/", steps] })] }) : null, _jsx("span", { className: "ui-steps__track", "aria-hidden": "true", style: layout === "row" ? { gridTemplateColumns: `repeat(${steps}, 1fr)` } : undefined, children: Array.from({ length: steps }, (_, index) => (_jsx("span", { className: "ui-steps__step", "data-lit": index < reached ? "true" : undefined }, index))) }), _jsx("span", { className: "ui-steps__word", children: word }), caption ? _jsx("span", { className: "ui-steps__caption", children: caption }) : null] }));
}
/** A group of row-layout steps under one label, on shared columns. */
export function StepsTable({ label, children }) {
    return (_jsx("div", { className: "ui-steps-table", role: "group", "aria-label": label, children: children }));
}
