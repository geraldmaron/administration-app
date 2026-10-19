import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Badge } from "./Badge";
import { Icon } from "./Icon";
/** Tones that are a state of play get a status dot; a kind (identity) or a plain fact (neutral) is the word alone. */
const DOTTED = new Set(["risk", "caution", "action", "good"]);
/**
 * A short label set as a chip: a severity, a kind, a staffing. Read at a
 * glance, never the only place the fact is said. A status reads by its dot and
 * tint; only the solid tag, the one that must be seen first, keeps its glyph.
 */
export function Tag({ children, tone = "neutral", icon, solid = false }) {
    const mark = solid ? (icon ? _jsx(Icon, { name: icon, size: 14, weight: "bold" }) : null) : DOTTED.has(tone) ? _jsx("span", { className: "ui-tag__dot", "aria-hidden": "true" }) : null;
    return (_jsxs(Badge, { className: "ui-tag", variant: "outline", "data-tone": tone, "data-solid": solid ? "true" : undefined, children: [mark, children] }));
}
