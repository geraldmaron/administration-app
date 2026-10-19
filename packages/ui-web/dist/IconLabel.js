import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Icon } from "./Icon";
export function IconLabel({ icon, size = 18, weight = "regular", className, children }) {
    return _jsxs("span", { className: ["ui-icon-label", className].filter(Boolean).join(" "), children: [_jsx(Icon, { name: icon, size: size, weight: weight }), _jsx("span", { children: children })] });
}
