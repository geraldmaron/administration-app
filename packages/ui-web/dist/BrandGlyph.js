import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { BRAND_DESK_PATH, BRAND_PORTAL_PATH, BRAND_VIEW_BOX } from "@admin/design";
/** Product identity, not an official government seal. Decorative beside a name. */
export function BrandGlyph({ size = 18, className }) {
    return (_jsxs("svg", { className: className, width: size, height: size, viewBox: BRAND_VIEW_BOX, "aria-hidden": "true", focusable: "false", children: [_jsx("path", { d: BRAND_PORTAL_PATH, fill: "currentColor" }), _jsx("path", { d: BRAND_DESK_PATH, fill: "var(--color-gold, currentColor)" })] }));
}
