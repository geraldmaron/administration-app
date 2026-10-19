import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
const MIN_R = 5.5;
const MAX_R = 12;
/** The plot is drawn in these units and scaled to the container, so the swarm is the same at every width. */
export const STRIP_WIDTH = 320;
/**
 * Lay dots along one axis, each at its value, stacking any that would
 * overlap above and below the line in turn, biggest first so the heavy
 * ones sit on the axis where they are read first.
 */
export function swarm(items, width = STRIP_WIDTH) {
    const placed = [];
    const order = [...items].sort((a, b) => (b.weight ?? 0) - (a.weight ?? 0) || a.key.localeCompare(b.key));
    for (const item of order) {
        const r = MIN_R + (MAX_R - MIN_R) * Math.sqrt(Math.min(1, Math.max(0, item.weight ?? 0)));
        const x = MAX_R + Math.min(1, Math.max(0, item.at)) * (width - MAX_R * 2);
        let y = 0;
        for (let step = 0; step < 400; step++) {
            const candidate = step === 0 ? 0 : Math.ceil(step / 2) * (step % 2 === 1 ? -1 : 1) * 1.5;
            if (!placed.some((p) => Math.hypot(p.x - x, p.y - candidate) < p.r + r + 1)) {
                y = candidate;
                break;
            }
        }
        placed.push({ key: item.key, x, y, r });
    }
    return items.map((item) => placed.find((p) => p.key === item.key));
}
/**
 * Every member of a set on one axis as a dot sized by its weight: the
 * spread, the outliers and where the heavy ones sit, at a glance. Each dot
 * opens its own screen, and focusing one tells the caller, so the map can
 * show where it is.
 */
export function Strip({ label, items, ends, mark, renderDot, onFocusItem, scale = "partisan" }) {
    const dots = swarm(items);
    const top = Math.min(0, ...dots.map((d) => d.y - d.r)) - 2;
    const bottom = Math.max(0, ...dots.map((d) => d.y + d.r)) + 2;
    const height = bottom - top;
    const pct = (v, of) => `${((v / of) * 100).toFixed(3)}%`;
    return (_jsxs("figure", { className: "ui-strip", "data-scale": scale, "aria-label": label, onMouseLeave: () => onFocusItem?.(null), children: [_jsxs("div", { className: "ui-strip__plot", style: { aspectRatio: `${STRIP_WIDTH} / ${height}` }, children: [_jsx("span", { className: "ui-strip__axis", style: { insetBlockStart: pct(-top, height) }, "aria-hidden": "true" }), mark ? _jsx("span", { className: "ui-strip__mark", style: { insetInlineStart: pct(MAX_R + mark.at * (STRIP_WIDTH - MAX_R * 2), STRIP_WIDTH) }, "aria-hidden": "true", title: mark.label }) : null, _jsx("ul", { className: "ui-strip__dots", children: items.map((item, i) => {
                            const d = dots[i];
                            const style = {
                                insetInlineStart: pct(d.x - d.r, STRIP_WIDTH),
                                insetBlockStart: pct(d.y - d.r - top, height),
                                inlineSize: pct(d.r * 2, STRIP_WIDTH),
                                // The code scales with the dot: a share of the plot's width, in container units.
                                fontSize: `max(var(--size-caption), ${((d.r * 0.85) / STRIP_WIDTH) * 100}cqi)`,
                            };
                            return (_jsx("li", { onMouseEnter: () => onFocusItem?.(item.key), onFocus: () => onFocusItem?.(item.key), onBlur: () => onFocusItem?.(null), children: renderDot(item, {
                                    className: "ui-strip__dot",
                                    style,
                                    "data-side": item.side ?? "even",
                                    "data-tip": `${item.label} · ${item.valueText}`,
                                    "data-tip-align": item.at < 0.25 ? "start" : item.at > 0.75 ? "end" : "center",
                                    children: (_jsxs(_Fragment, { children: [item.short ? (_jsx("span", { className: "ui-strip__code", "aria-hidden": "true", children: item.short })) : null, _jsx("span", { className: "ui-visually-hidden", children: `${item.label}, ${item.valueText}` })] })),
                                }) }, item.key));
                        }) })] }), _jsxs("figcaption", { className: "ui-strip__ends", children: [_jsx("span", { children: ends[0] }), mark ? _jsx("span", { className: "ui-strip__mark-label", children: mark.label }) : null, _jsx("span", { children: ends[1] })] })] }));
}
