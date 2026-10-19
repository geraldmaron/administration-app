import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { useEffect, useRef } from "react";
import { Icon } from "./Icon";
/** Source-owned shadcn Tabs with controlled URL state and automatic keyboard activation. */
export function Tabs({ label, tabs, selected, onSelect, compact = false, children }) {
    const list = useRef(null);
    const current = tabs.some((tab) => tab.id === selected) ? selected : tabs[0]?.id;
    useEffect(() => {
        const tab = list.current?.querySelector('[aria-selected="true"]');
        const strip = list.current;
        if (tab && strip && strip.scrollWidth > strip.clientWidth)
            strip.scrollTo({ left: tab.offsetLeft - (strip.clientWidth - tab.offsetWidth) / 2, behavior: "auto" });
    }, [current]);
    return _jsxs(TabsPrimitive.Root, { value: current, onValueChange: onSelect, className: "ui-tabs", "data-density": compact ? "compact" : undefined, children: [_jsx(TabsPrimitive.List, { ref: list, className: "ui-tabs__list", "aria-label": label, children: tabs.map((tab) => _jsxs(TabsPrimitive.Trigger, { value: tab.id, "data-tab": tab.id, className: "ui-tabs__tab", children: [tab.icon ? _jsx(Icon, { name: tab.icon, size: 20 }) : null, _jsx("span", { children: tab.label }), tab.count !== undefined ? _jsx("span", { className: "ui-tabs__count", children: tab.count }) : null] }, tab.id)) }), tabs.map((tab) => _jsx(TabsPrimitive.Content, { value: tab.id, className: "ui-tabs__panel", children: tab.id === current ? children : null }, tab.id))] });
}
