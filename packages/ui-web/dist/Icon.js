import { jsx as _jsx } from "react/jsx-runtime";
import { ICONS } from "./assets/icons/icon-data.js";
/** Whether a string names a glyph the set draws, for data that carries icon names as plain text. */
export function isIconName(value) {
    return value !== undefined && Object.prototype.hasOwnProperty.call(ICONS, value);
}
/**
 * A glyph from the set, drawn inline so it takes the surrounding text color
 * and scales with it. Decorative unless labeled: an icon beside a word says
 * nothing a screen reader needs twice.
 */
export function Icon({ name, size = 20, weight = "duotone", label, className }) {
    const Glyph = ICONS[name].glyph;
    return (_jsx(Glyph, { className: ["ui-icon", className].filter(Boolean).join(" "), "data-glyph": name, size: size, weight: weight, focusable: "false", role: label ? "img" : undefined, "aria-label": label, "aria-hidden": label ? undefined : true }));
}
/** A glyph set in a tinted tile: the identity mark of a section, a card or an office. */
export function IconBadge({ name, tone = "blue", size = 36, label, className }) {
    return (_jsx("span", { className: ["ui-icon-badge", className].filter(Boolean).join(" "), "data-tone": tone, "data-size": size, children: _jsx(Icon, { name: name, size: Math.round(size * 0.56), ...(label ? { label } : {}) }) }));
}
