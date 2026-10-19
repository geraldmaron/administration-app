import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Icon } from "./Icon";
import { cn } from "./lib/utils";
/** shadcn NativeSelect pattern: native platform selection, shared field semantics and focus. */
export function NativeSelect({ className, ref, children, ...props }) {
    return _jsxs("div", { "data-slot": "native-select-wrapper", className: "ui-native-select", children: [_jsx("select", { ref: ref, "data-slot": "native-select", className: cn("ui-input", className), ...props, children: children }), _jsx(Icon, { name: "chevron", size: 16, className: "ui-native-select__chevron" })] });
}
