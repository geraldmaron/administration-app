import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { Icon } from "./Icon";
/** Internal composition boundary: modal work must not dock into an inert parent surface. */
export const SurfaceFootContext = createContext(null);
/**
 * The surface's foot, below its scrolling body: where a verb docks so it stays
 * in the thumb's reach and never covers what scrolls above it. Null outside a
 * surface, where a part keeps its verb in place.
 */
export function useSurfaceFoot() {
    return useContext(SurfaceFootContext);
}
const ORDER = ["peek", "half", "full"];
const SPOKEN = { peek: "lowered", half: "half open", full: "fully open" };
function nextDetent(detent) {
    return ORDER[(ORDER.indexOf(detent) + 1) % ORDER.length];
}
/** The detent whose height is nearest where the drag let go. */
function nearestDetent(height, sheet) {
    const style = getComputedStyle(sheet);
    const peek = Number.parseFloat(style.getPropertyValue("--detent-peek")) || 168;
    const half = Number.parseFloat(style.getPropertyValue("--detent-half")) || 334;
    const full = sheet.parentElement?.getBoundingClientRect().height ?? half * 2;
    const candidates = [["peek", peek], ["half", half], ["full", full]];
    return [...candidates].sort((a, b) => Math.abs(a[1] - height) - Math.abs(b[1] - height))[0][0];
}
function useSheetDrag(setDetent) {
    const sheet = useRef(null);
    const start = useRef(null);
    const [dragHeight, setDragHeight] = useState(null);
    const onPointerDown = useCallback((event) => {
        if (!sheet.current || event.target.closest("button:not([data-handle]), a, input, select, textarea"))
            return;
        start.current = { y: event.clientY, height: sheet.current.getBoundingClientRect().height };
    }, []);
    // The pointer is captured only once it has moved: captured from the press, a
    // tap's click would land on the header rather than the handle button.
    const onPointerMove = useCallback((event) => {
        if (!start.current)
            return;
        const moved = start.current.y - event.clientY;
        if (Math.abs(moved) <= 4)
            return;
        if (!event.currentTarget.hasPointerCapture(event.pointerId))
            event.currentTarget.setPointerCapture(event.pointerId);
        setDragHeight(Math.max(64, start.current.height + moved));
    }, []);
    const onPointerUp = useCallback(() => {
        if (start.current && sheet.current && dragHeight !== null)
            setDetent(nearestDetent(dragHeight, sheet.current));
        start.current = null;
        setDragHeight(null);
    }, [dragHeight, setDetent]);
    return { sheet, dragHeight, handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp } };
}
/**
 * The opaque surface the work happens in, so text never sits on dots. On a
 * phone it is a bottom sheet with three detents, dragged from its handle and
 * header, with its content scrolling inside; from a tablet up it is a panel
 * docked beside the map, or a workspace that takes the room.
 */
export function WorkSurface({ label, kind = "panel", measure = "standard", initialDetent, header, footer, onSettle, children }) {
    const [detent, setDetent] = useState(initialDetent ?? (kind === "workspace" ? "full" : "half"));
    const [expanded, setExpanded] = useState(false);
    const { sheet, dragHeight, handlers } = useSheetDrag(setDetent);
    const [foot, setFoot] = useState(null);
    // A change of kind moves the surface's edge as surely as a detent does, so the map is told again.
    useEffect(() => onSettle?.(detent), [detent, onSettle, kind, expanded]);
    const next = nextDetent(detent);
    return (_jsxs("section", { ref: sheet, className: `ui-surface ui-surface--${kind}`, "data-measure": measure, "data-detent": detent, "data-expanded": expanded || undefined, "data-dragging": dragHeight !== null ? "true" : undefined, style: dragHeight !== null ? { blockSize: `${dragHeight}px` } : undefined, "aria-label": label, children: [_jsxs("div", { className: "ui-surface__head", ...handlers, children: [_jsx("button", { type: "button", "data-handle": true, className: "ui-surface__handle", "aria-label": `${label}: ${SPOKEN[detent]}. ${next === "peek" ? "Lower" : "Raise"} the panel.`, onClick: () => setDetent(next), children: _jsx("span", { className: "ui-surface__grip", "aria-hidden": "true" }) }), kind === "panel" ? (_jsxs("div", { className: "ui-surface__views", role: "group", "aria-label": "Show", children: [_jsxs("button", { type: "button", className: "ui-surface__view", "aria-pressed": detent !== "peek", onClick: () => setDetent("full"), children: [_jsx(Icon, { name: "dossier", size: 18 }), "Details"] }), _jsxs("button", { type: "button", className: "ui-surface__view", "aria-pressed": detent === "peek", onClick: () => setDetent("peek"), children: [_jsx(Icon, { name: "world", size: 18 }), "Map"] })] })) : null, header, _jsx("button", { type: "button", className: "ui-surface__expand", "aria-label": expanded ? "Restore standard panel" : "Expand panel", "aria-pressed": expanded, title: expanded ? "Restore standard panel" : "Expand panel", onClick: () => setExpanded((current) => !current), children: _jsx(Icon, { name: expanded ? "restorePanel" : "expandPanel", size: 18 }) })] }), _jsx(SurfaceFootContext.Provider, { value: foot, children: _jsx("div", { className: "ui-surface__body", children: children }) }), _jsx("div", { className: "ui-surface__foot", ref: setFoot, children: footer })] }));
}
