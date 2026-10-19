import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Icon } from "./Icon";
/** Where a reading or a list has nothing to show: what is absent, and what would fill it. */
export function EmptyState({ icon = "emptyRecord", title, children, busy = false }) {
    return (_jsxs("div", { className: "ui-empty", role: "status", "aria-busy": busy || undefined, children: [_jsx(Icon, { name: busy ? "loadingOrbit" : icon, size: 32, className: "ui-empty__icon" }), _jsx("p", { className: "ui-empty__title", children: title }), children ? _jsx("div", { className: "ui-empty__body", children: children }) : null] }));
}
