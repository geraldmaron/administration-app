import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * The player's layers, back to front: the map (shown only behind a spatial
 * screen), the navy masthead and navigation, the work surface, and the
 * overlays. On a phone the navigation is a bar under the work; from a tablet
 * up it is a drawer, a labeled rail, or the full list beside the work.
 */
export function AppFrame({ map, bar, nav, overlays, children }) {
    return (_jsxs("div", { className: "ui-frame", "data-nav": nav ? "true" : "false", children: [_jsx("a", { className: "ui-frame__skip", href: "#work", children: "Skip to the work" }), _jsx("div", { className: "ui-frame__map", "data-surface": "dark", children: map }), _jsx("div", { className: "ui-frame__bar", children: bar }), nav ? (_jsx("div", { className: "ui-frame__nav", children: nav })) : null, _jsx("main", { id: "work", className: "ui-frame__work", tabIndex: -1, children: children }), overlays] }));
}
