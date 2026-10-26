import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { LEGACY_BRAND_DESK_PATH, LEGACY_BRAND_PORTAL_PATH, LEGACY_BRAND_VIEW_BOX } from "./brand-geometry";
/** Product identity, not an official government seal. Decorative beside a name. */
export function BrandGlyph({ size = 18, className }) {
    return (_jsxs("svg", { className: className, width: size, height: size, viewBox: LEGACY_BRAND_VIEW_BOX, "aria-hidden": "true", focusable: "false", children: [_jsx("path", { d: LEGACY_BRAND_PORTAL_PATH, fill: "currentColor" }), _jsx("path", { d: LEGACY_BRAND_DESK_PATH, fill: "var(--color-gold, currentColor)" })] }));
}
