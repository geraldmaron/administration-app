import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Icon } from "./Icon";
const MARK = { done: "approve", now: "pending", ahead: "neutral", ended: "reject" };
const SPOKEN = { done: "reached", now: "where it stands now", ahead: "not yet reached", ended: "ended here" };
/**
 * Where a thing stands on its way somewhere: each stage a mark on one rule,
 * the ones passed filled and joined, the one it waits at emphasized, an
 * ending in red. State is a glyph and a word, never color alone.
 */
export function Stages({ label, stages }) {
    return (_jsx("div", { className: "ui-stages-frame", children: _jsx("ol", { className: "ui-stages", "aria-label": label, children: stages.map((stage) => (_jsxs("li", { className: "ui-stages__step", "data-state": stage.state, "aria-current": stage.state === "now" ? "step" : undefined, children: [_jsx("span", { className: "ui-stages__mark", "aria-hidden": "true", children: _jsx(Icon, { name: MARK[stage.state], size: 16 }) }), _jsxs("span", { className: "ui-stages__word", children: [stage.label, _jsxs("span", { className: "ui-visually-hidden", children: [", ", SPOKEN[stage.state]] })] }), stage.note ? _jsx("span", { className: "ui-stages__note", children: stage.note }) : null] }, stage.id))) }) }));
}
