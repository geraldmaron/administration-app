import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { NativeSelect } from "./NativeSelect";
import { useEffect, useRef, useState } from "react";
/** Pressing the active column flips it; pressing another starts it in the direction that column reads best first. */
export function nextSort(current, key, first = "ascending") {
    if (current.key !== key)
        return { key, direction: first };
    return { key, direction: current.direction === "ascending" ? "descending" : "ascending" };
}
/**
 * Rows ordered by one column. Missing values go last in either direction, and
 * ties fall back to `tiebreak` so the order is stable from one render to the next.
 */
export function sortRows(rows, sort, value, tiebreak) {
    const sign = sort.direction === "ascending" ? 1 : -1;
    const read = value[sort.key];
    return [...rows].sort((a, b) => {
        const left = read(a);
        const right = read(b);
        if (left === undefined || right === undefined) {
            if (left === right)
                return tiebreak?.(a, b) ?? 0;
            return left === undefined ? 1 : -1;
        }
        const order = typeof left === "string" || typeof right === "string" ? String(left).localeCompare(String(right)) : left - right;
        return order * sign || (tiebreak?.(a, b) ?? 0);
    });
}
/**
 * Sort state that starts again from `initial` when `resetKey` changes, so a new
 * filter or selection opens in its own natural order.
 */
export function useSort(initial, resetKey) {
    const [state, setState] = useState({ reset: resetKey, sort: initial });
    const sort = state.reset === resetKey ? state.sort : initial;
    const onSort = (key, first) => setState({ reset: resetKey, sort: nextSort(sort, key, first) });
    const setSort = (next) => setState({ reset: resetKey, sort: next });
    return [sort, onSort, setSort];
}
/** A column header that sorts its table: the button announces the column and the header carries `aria-sort`. */
export function SortHeader({ label, detail, sortKey, sort, onSort, first = "ascending", align = "start", className }) {
    const active = sort.key === sortKey;
    return (_jsx("th", { scope: "col", "aria-sort": active ? sort.direction : "none", className: className, "data-align": align, children: _jsxs("button", { type: "button", className: "ui-sort", "data-align": align, "data-active": active ? "true" : undefined, onClick: () => onSort(sortKey, first), children: [_jsxs("span", { className: "ui-sort__label", children: [label, detail ? _jsx("span", { className: "ui-sort__detail", children: detail }) : null] }), _jsx("span", { "aria-hidden": "true", className: "ui-sort__arrow", children: active ? (sort.direction === "ascending" ? "▲" : "▼") : "↕" })] }) }));
}
const DIRECTION_WORD = { ascending: "low to high", descending: "high to low" };
/** Whether the table right after `element` (or inside the wrapper right after it) hides its header row, whichever stacking rule hid it. */
function headersHidden(element) {
    const next = element?.nextElementSibling;
    const table = next?.matches("table") ? next : next?.querySelector("table");
    const head = table?.querySelector("thead");
    if (!head)
        return false;
    const box = head.getBoundingClientRect();
    return box.height <= 1 || box.width <= 1 || getComputedStyle(head).display === "none";
}
/**
 * The same sort as a select, for a table whose column headers are hidden
 * because it has stacked into blocks on a narrow screen. It measures its own
 * table rather than assuming a breakpoint, so it appears exactly when the
 * headers are gone, under any of the app's stacking rules. Place it directly
 * before the table, or before the wrapper that holds it.
 */
export function SortPicker({ options, sort, onSort, label = "Sort by", defaultLabel = "Listed order", alwaysVisible = false }) {
    const ref = useRef(null);
    const [shown, setShown] = useState(false);
    useEffect(() => {
        if (alwaysVisible)
            return;
        const element = ref.current;
        const parent = element?.parentElement;
        if (!element || !parent || typeof ResizeObserver === "undefined")
            return;
        const check = () => setShown(headersHidden(element));
        check();
        const observer = new ResizeObserver(check);
        observer.observe(parent);
        return () => observer.disconnect();
    }, [alwaysVisible]);
    const listed = !options.some((option) => option.key === sort.key);
    return (_jsxs("label", { ref: ref, className: "ui-sort-picker", hidden: !alwaysVisible && !shown, children: [_jsx("span", { children: label }), _jsxs(NativeSelect, { value: `${sort.key}:${sort.direction}`, onChange: (event) => {
                    const [key, direction] = event.target.value.split(":");
                    onSort({ key, direction });
                }, children: [listed ? _jsx("option", { value: `${sort.key}:${sort.direction}`, children: defaultLabel }) : null, options.flatMap((option) => ["ascending", "descending"].map((direction) => (_jsxs("option", { value: `${option.key}:${direction}`, children: [option.label, ", ", DIRECTION_WORD[direction]] }, `${option.key}:${direction}`))))] })] }));
}
