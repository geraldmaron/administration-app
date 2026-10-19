import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useId } from "react";
import { Icon } from "./Icon";
/** The proof an act happened: what, when, what it set, and where it is recorded. */
export function Receipt({ title, date, lines, outcome = "done", record, children }) {
    const id = useId();
    const refused = outcome === "refused";
    return (_jsxs("article", { className: "ui-receipt", "data-outcome": outcome, "aria-labelledby": `${id}-title`, children: [_jsxs("header", { className: "ui-receipt__head", children: [_jsx(Icon, { name: refused ? "reject" : "approve", size: 24, className: "ui-receipt__mark" }), _jsxs("div", { children: [refused ? _jsx("p", { className: "ui-receipt__outcome", children: "Refused" }) : null, _jsx("h3", { id: `${id}-title`, className: "ui-receipt__title", children: title }), _jsx("p", { className: "ui-receipt__date", children: date })] })] }), lines.length > 0 ? (_jsx("dl", { className: "ui-receipt__lines", children: lines.map((line) => (_jsxs("div", { className: "ui-receipt__line", children: [_jsx("dt", { children: line.label }), _jsx("dd", { children: line.value })] }, line.label))) })) : null, record ? _jsx("p", { className: "ui-receipt__record", children: record }) : null, children ? _jsx("div", { className: "ui-receipt__doors", children: children }) : null] }));
}
