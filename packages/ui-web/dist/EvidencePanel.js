import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { Button } from "./Button";
import { Icon } from "./Icon";
import { Sheet } from "./Layer";
/** One contextual drill-down: keep the subject, route, selection and scroll behind the inspector. */
export function EvidencePanel({ title, label = title, children }) {
    const [open, setOpen] = useState(false);
    return _jsxs(_Fragment, { children: [_jsx(Button, { kind: "secondary", size: "sm", icon: _jsx(Icon, { name: "info", size: 16 }), onClick: () => setOpen(true), children: label }), _jsx(Sheet, { open: open, onClose: () => setOpen(false), title: title, placement: "side", foot: _jsx(Button, { kind: "secondary", onClick: () => setOpen(false), children: "Return to workspace" }), children: _jsx("div", { className: "ui-evidence-panel", children: typeof children === "function" ? children(() => setOpen(false)) : children }) })] });
}
