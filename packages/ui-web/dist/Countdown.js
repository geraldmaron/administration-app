import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { Bar } from "./Bar";
import { Icon } from "./Icon";
function plural(n, unit) {
    return n === 1 ? unit : `${unit}s`;
}
/** A window running down is red once a third is left, amber under two thirds. */
function toneOf(left, window) {
    if (left <= 0)
        return "bad";
    if (window === undefined || window <= 0)
        return "neutral";
    const share = left / window;
    return share < 1 / 3 ? "bad" : share < 2 / 3 ? "watch" : "neutral";
}
const BAR_TONE = { good: "good", watch: "watch", bad: "bad", neutral: "neutral" };
/**
 * Time left as a flat track that drains toward the deadline, with the figure
 * big beside it and the date under it. Without a rule's window there is no
 * honest length to drain from, so only the figure and the date are drawn.
 */
export function Countdown({ left, window, unit, dueText, tone }) {
    const read = tone ?? toneOf(left, window);
    const share = window && window > 0 ? Math.min(1, Math.max(0, left / window)) : undefined;
    const said = left <= 0 ? "Due now" : `${left} ${plural(left, unit)} left`;
    const spoken = `${said}${window ? ` of ${window}` : ""}${dueText ? `, ${dueText}` : ""}`;
    return (_jsxs("span", { className: "ui-countdown", "data-valence": read, role: "img", "aria-label": spoken, children: [_jsx("span", { className: "ui-countdown__figure", "aria-hidden": "true", children: left <= 0 ? (_jsx("span", { className: "ui-countdown__num", children: "Due" })) : (_jsxs(_Fragment, { children: [_jsx("span", { className: "ui-countdown__num", children: left }), _jsx("span", { className: "ui-countdown__unit", children: plural(left, unit) })] })) }), share !== undefined ? _jsx(Bar, { value: share, tone: BAR_TONE[read], slim: true }) : null, dueText ? (_jsxs("span", { className: "ui-countdown__due", "aria-hidden": "true", children: [_jsx(Icon, { name: "schedule", size: 14 }), " ", dueText] })) : null] }));
}
/** A matter with no rule behind it has no deadline; saying so with a glyph beats a sentence about the absence. */
export function OpenEnded({ holds, note }) {
    return (_jsxs("span", { className: "ui-countdown", "data-open": "true", "data-valence": "neutral", role: "img", "aria-label": `No deadline${note ? `; ${note}` : ""}${holds ? "; time is held" : ""}`, children: [_jsxs("span", { className: "ui-countdown__figure", "aria-hidden": "true", children: [_jsx(Icon, { name: holds ? "paused" : "pending", size: 18 }), _jsx("span", { className: "ui-countdown__unit", children: holds ? "Time held" : "No deadline" })] }), note ? (_jsx("span", { className: "ui-countdown__due", "aria-hidden": "true", children: note })) : null] }));
}
