import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useId, useState } from "react";
import { Sheet } from "./Layer";
import { Input } from "./Input";
import { Icon } from "./Icon";
function Results({ items, active, listId, onPick }) {
    return (_jsx("ul", { id: listId, role: "listbox", "aria-label": "Results", className: "ui-palette__results", children: items.map((item, index) => (_jsxs("li", { id: `${listId}-${index}`, role: "option", "aria-selected": index === active, className: "ui-palette__item", "data-first-in-group": index === 0 || items[index - 1]?.group !== item.group ? item.group : undefined, onMouseDown: (event) => event.preventDefault(), onClick: () => onPick(index), children: [item.icon ? _jsx(Icon, { name: item.icon, size: 18, className: "ui-palette__glyph" }) : _jsx("span", { className: "ui-palette__glyph" }), _jsxs("span", { className: "ui-palette__text", children: [_jsx("span", { className: "ui-palette__title", children: item.title }), item.detail ? _jsx("span", { className: "ui-palette__detail", children: item.detail }) : null] }), _jsx("span", { className: "ui-palette__group", children: item.group })] }, item.id))) }));
}
/** The highlighted result, moved by the arrows and chosen by Enter; a result with no action only opens its body. */
function useActiveItem(items, query, onClose) {
    const [chosen, setChosen] = useState(0);
    useEffect(() => setChosen(0), [query]);
    const active = Math.max(0, Math.min(chosen, items.length - 1));
    const pick = (index) => {
        const item = items[index];
        setChosen(index);
        if (item?.onSelect) {
            item.onSelect();
            onClose();
        }
    };
    const onKeyDown = (event) => {
        if (event.key === "ArrowDown")
            setChosen(Math.min(items.length - 1, active + 1));
        else if (event.key === "ArrowUp")
            setChosen(Math.max(0, active - 1));
        else if (event.key === "Enter")
            pick(active);
        else
            return;
        event.preventDefault();
    };
    return { active, current: items[active], pick, onKeyDown };
}
/** Search across places and the glossary: type, move with the arrows, Enter to go, Escape to close. */
export function CommandPalette({ open, onClose, query, onQueryChange, items, placeholder = "Search places and terms" }) {
    const id = useId();
    const listId = `${id}-list`;
    const { active, current, pick, onKeyDown } = useActiveItem(items, query, onClose);
    return (_jsx(Sheet, { open: open, onClose: onClose, className: "ui-palette", title: "Search", placement: "center", children: _jsxs("div", { className: "ui-palette__box", children: [_jsxs("div", { className: "ui-palette__field", children: [_jsx(Icon, { name: "review", size: 20 }), _jsx(Input, { className: "ui-palette__input", role: "combobox", "aria-expanded": items.length > 0, "aria-controls": listId, "aria-activedescendant": current ? `${listId}-${active}` : undefined, "aria-autocomplete": "list", "aria-label": placeholder, placeholder: placeholder, value: query, autoFocus: true, onChange: (event) => onQueryChange(event.target.value), onKeyDown: onKeyDown })] }), items.length === 0 ? _jsxs("p", { className: "ui-palette__none", role: "status", children: ["Nothing matches \u201C", query, "\u201D."] }) : _jsx(Results, { items: items, active: active, listId: listId, onPick: pick }), current?.body ? (_jsxs("div", { className: "ui-palette__body", "aria-live": "polite", children: [_jsx("p", { className: "ui-palette__body-title", children: current.title }), current.body] })) : null] }) }));
}
