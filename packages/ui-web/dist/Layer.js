import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useId, useLayoutEffect, useRef, useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { Icon } from "./Icon";
import { SurfaceFootContext } from "./WorkSurface";
// Opening order handles both nested inspectors and globally mounted reviews.
// Unlike fixed z-indices, a later modal scrim also covers the earlier content.
let nextLayer = 0;
function useLayerOrder(open) {
    const [order, setOrder] = useState(0);
    useLayoutEffect(() => { if (open)
        setOrder(++nextLayer); }, [open]);
    return 80 + order * 2;
}
/** Source-owned shadcn Sheet/Dialog composition. Radix owns trapping, inertness and Escape. */
export function Sheet({ open, onClose, title, lead, placement = "center", dismissible = true, backdropDismiss = true, closeLabel = "Close", foot, className, returnFocus, children }) {
    const layer = useLayerOrder(open);
    const descriptionId = useId();
    const trigger = useRef(null);
    if (open && !trigger.current && typeof document !== "undefined")
        trigger.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    return _jsx(SurfaceFootContext.Provider, { value: null, children: _jsx(DialogPrimitive.Root, { open: open, onOpenChange: (next) => { if (!next && dismissible)
                onClose(); }, children: _jsxs(DialogPrimitive.Portal, { children: [_jsx(DialogPrimitive.Overlay, { className: "ui-sheet-overlay", style: { zIndex: layer } }), _jsx(DialogPrimitive.Content, { "data-slot": "sheet-content", className: ["ui-sheet", className].filter(Boolean).join(" "), "data-placement": placement, style: { zIndex: layer + 1 }, onEscapeKeyDown: (event) => { if (!dismissible)
                            event.preventDefault(); }, onInteractOutside: (event) => { if (!dismissible || !backdropDismiss)
                            event.preventDefault(); }, onCloseAutoFocus: (event) => { event.preventDefault(); (returnFocus?.() ?? trigger.current)?.focus({ preventScroll: true }); trigger.current = null; }, "aria-describedby": lead ? descriptionId : undefined, children: _jsxs("div", { className: "ui-sheet__frame", children: [_jsxs("header", { className: "ui-sheet__head", children: [_jsxs("div", { className: "ui-sheet__heading", children: [_jsx(DialogPrimitive.Title, { className: "ui-sheet__title", children: title }), lead ? _jsx(DialogPrimitive.Description, { id: descriptionId, className: "ui-sheet__lead", children: lead }) : null] }), dismissible ? _jsx(DialogPrimitive.Close, { className: "ui-sheet__close", "aria-label": closeLabel, children: _jsx(Icon, { name: "close", size: 20 }) }) : null] }), children ? _jsx("div", { className: "ui-sheet__body", children: children }) : null, foot ? _jsx("footer", { className: "ui-sheet__foot", children: foot }) : null] }) })] }) }) });
}
/** Source-owned shadcn Popover; collision-aware placement replaces manual viewport math. */
export function Popover({ trigger, label, triggerClassName, className, triggerRef, children }) {
    const [open, setOpen] = useState(false);
    const layer = useLayerOrder(open);
    return _jsxs(PopoverPrimitive.Root, { open: open, onOpenChange: setOpen, children: [_jsx(PopoverPrimitive.Trigger, { ref: triggerRef, className: ["ui-popover__trigger", triggerClassName].filter(Boolean).join(" "), "aria-label": label, onClick: (event) => event.stopPropagation(), children: trigger }), _jsx(PopoverPrimitive.Portal, { children: _jsx(PopoverPrimitive.Content, { "aria-label": label, sideOffset: 6, collisionPadding: 8, className: ["ui-popover", className].filter(Boolean).join(" "), "data-slot": "popover-content", style: { zIndex: layer + 1 }, children: typeof children === "function" ? children(() => setOpen(false)) : children }) })] });
}
/**
 * A view that can be opened on its own. Only this view expands: the page
 * behind keeps its size, scroll, selection and anything typed, and closing
 * returns focus to the expand control.
 */
export function Expandable({ title, children, expanded, lead }) {
    const [open, setOpen] = useState(false);
    return (_jsxs("div", { className: "ui-expandable", children: [children, _jsx("button", { type: "button", className: "ui-expandable__open", "aria-label": `Expand ${title}`, onClick: () => setOpen(true), children: _jsx(Icon, { name: "expandPanel", size: 16 }) }), _jsx(Sheet, { open: open, onClose: () => setOpen(false), placement: "wide", title: title, ...(lead ? { lead } : {}), children: open ? (expanded ?? children) : null })] }));
}
