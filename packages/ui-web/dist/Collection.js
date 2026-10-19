import { jsxs as _jsxs, jsx as _jsx, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from "react";
/** The page numbers a pager shows: the first, the last and the neighbors of the current page, with gaps marked. */
export function pageWindow(page, pages) {
    const keep = new Set([0, pages - 1, page - 1, page, page + 1].filter((n) => n >= 0 && n < pages));
    const sorted = [...keep].sort((a, b) => a - b);
    return sorted.flatMap((n, i) => (i > 0 && n - sorted[i - 1] > 1 ? ["gap", n] : [n]));
}
/** The count of what is in view, the pages, and one control to show every row. */
function CollectionFoot({ total, size, page, all, noun, onPage, onAll }) {
    const pages = Math.ceil(total / size);
    const first = all ? 1 : page * size + 1;
    const last = all ? total : Math.min(total, (page + 1) * size);
    return (_jsxs("div", { className: "ui-collection__foot", children: [_jsxs("span", { className: "ui-collection__count", "aria-live": "polite", children: [first, "\u2013", last, " of ", total, " ", noun] }), !all ? (_jsxs("nav", { className: "ui-collection__pages", "aria-label": `Pages of ${noun}`, children: [_jsx("button", { type: "button", className: "ui-collection__page", disabled: page === 0, "aria-label": "Previous page", onClick: () => onPage(page - 1), children: "\u2039" }), pageWindow(page, pages).map((entry, i) => entry === "gap" ? (_jsx("span", { className: "ui-collection__gap", "aria-hidden": "true", children: "\u2026" }, `gap-${i}`)) : (_jsx("button", { type: "button", className: "ui-collection__page", "aria-current": entry === page ? "page" : undefined, "aria-label": `Page ${entry + 1} of ${pages}`, onClick: () => onPage(entry), children: entry + 1 }, entry))), _jsx("button", { type: "button", className: "ui-collection__page", disabled: page >= pages - 1, "aria-label": "Next page", onClick: () => onPage(page + 1), children: "\u203A" })] })) : null, _jsx("button", { type: "button", className: "ui-button ui-button--ghost ui-collection__toggle", "aria-expanded": all, onClick: () => onAll(!all), children: all ? "Show by page" : `Show all ${total}` })] }));
}
/**
 * A ranked collection that never hides its tail: rows come a page at a time
 * with the true total always in view, every page is one press away, and one
 * control shows every row at once. Use this instead of slicing a list for
 * display. A new set of items starts again at the first page.
 */
export function Collection({ items, initial, noun, render, as = "ul", className, columns = 1, empty, resetKey }) {
    const [all, setAll] = useState(false);
    const key = resetKey ?? items.length;
    const [paging, setPaging] = useState({ key, page: 0 });
    if (items.length === 0)
        return empty ? _jsx("p", { className: "ui-collection__empty", children: empty }) : null;
    const pages = Math.max(1, Math.ceil(items.length / initial));
    const page = paging.key === key ? Math.min(paging.page, pages - 1) : 0;
    const shown = all ? items : items.slice(page * initial, (page + 1) * initial);
    const Wrapper = as;
    const foot = items.length > initial ? (_jsx(CollectionFoot, { total: items.length, size: initial, page: page, all: all, noun: noun, onPage: (next) => setPaging({ key, page: next }), onAll: setAll })) : null;
    const offset = all ? 0 : page * initial;
    const rows = shown.map((item, index) => render(item, offset + index));
    if (as === "tbody") {
        return (_jsxs(_Fragment, { children: [_jsx("tbody", { className: className, children: rows }), foot ? (_jsx("tfoot", { children: _jsx("tr", { className: "ui-collection__foot-row", children: _jsx("td", { colSpan: columns, className: "ui-collection__foot-cell", style: { padding: 0, border: 0, fontWeight: "var(--weight-regular)" }, children: foot }) }) })) : null] }));
    }
    return (_jsxs("div", { className: "ui-collection", children: [_jsx(Wrapper, { className: className, children: rows }), foot] }));
}
