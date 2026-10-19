import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const VERDICT = { good: ", in your favor", bad: ", against you", watch: ", worth watching", neutral: "" };
/**
 * A signed move drawn from a center line: left for a fall, right for a rise,
 * its length against the largest move compared beside it, its color whether
 * it helps or hurts. The sign and the figure stay in words, so neither the
 * direction nor the verdict rests on the hue.
 */
export function Movement({ label, value, scale, text, valence, steps }) {
    const share = scale > 0 ? Math.min(1, Math.abs(value) / scale) : 0;
    const side = value < 0 ? "fall" : value > 0 ? "rise" : "flat";
    const spoken = `${label ? `${label}: ` : ""}${text}${VERDICT[valence]}`;
    return (_jsxs("span", { className: "ui-movement", "data-valence": valence, "data-side": side, role: "img", "aria-label": spoken, children: [label ? (_jsx("span", { className: "ui-movement__label", "aria-hidden": "true", children: label })) : null, _jsxs("span", { className: "ui-movement__track", "aria-hidden": "true", style: { "--movement-share": share }, children: [steps ? (_jsx("span", { className: "ui-movement__ticks", style: { "--movement-steps": steps } })) : null, _jsx("span", { className: "ui-movement__bar" })] }), _jsxs("span", { className: "ui-movement__figure", "aria-hidden": "true", children: [_jsx("span", { className: "ui-movement__sign", children: side === "fall" ? "▼" : side === "rise" ? "▲" : "–" }), text] })] }));
}
/** The largest absolute move among `values`, or 1 where nothing moves, so a scale is never zero. */
export function movementScale(values) {
    const largest = values.reduce((most, value) => Math.max(most, Math.abs(value)), 0);
    return largest > 0 ? largest : 1;
}
