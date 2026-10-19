import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useRef, useState } from "react";
import { Button } from "./Button";
import { Icon } from "./Icon";
import { Popover, Sheet } from "./Layer";
/**
 * The one help affordance: an "i" that opens a short note on click, tap or
 * Enter (never hover alone), anchored to it in the top layer so no card can
 * clip it. "More context" opens the deeper explanation in an inspector, and
 * closing that returns focus to the "i". A press on the "i" inside a card's
 * door opens only the note.
 */
export function HelpTip({ label, children, more }) {
    const [inspecting, setInspecting] = useState(false);
    const trigger = useRef(null);
    return (_jsxs("span", { className: "ui-helptip", children: [_jsx(Popover, { label: label, triggerClassName: "ui-helptip__button", className: "ui-helptip__bubble", triggerRef: (element) => (trigger.current = element), trigger: _jsx(Icon, { name: "info", size: 16 }), children: (close) => (_jsxs(_Fragment, { children: [children, more ? (_jsx(Button, { kind: "ghost", size: "sm", type: "button", className: "ui-helptip__more", onClick: () => {
                                close();
                                setInspecting(true);
                            }, children: "More context" })) : null] })) }), more ? (_jsx(Sheet, { open: inspecting, onClose: () => setInspecting(false), placement: "side", title: more.title, returnFocus: () => trigger.current, children: more.body })) : null] }));
}
