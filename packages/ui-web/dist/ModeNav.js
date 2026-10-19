import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Icon } from "./Icon";
function Anchor({ children, ...rest }) {
    return _jsx("a", { ...rest, children: children });
}
/** The five modes: a tab bar on a phone, a rail from a tablet up. */
export function ModeNav({ items, current, Link = Anchor }) {
    return (_jsx("nav", { className: "ui-mode-nav", "aria-label": "Modes", children: _jsx("ul", { className: "ui-mode-nav__list", children: items.map((item) => {
                const active = item.id === current;
                const count = item.attention ?? 0;
                return (_jsx("li", { children: _jsxs(Link, { href: item.href, className: "ui-mode-nav__item", ...(active ? { "aria-current": "page" } : {}), ...(count > 0 ? { "aria-label": `${item.label}, ${count} need${count === 1 ? "s" : ""} you` } : {}), children: [_jsxs("span", { className: "ui-mode-nav__glyph", children: [_jsx(Icon, { name: item.icon, size: 22 }), count > 0 ? (_jsx("span", { className: "ui-mode-nav__badge", "aria-hidden": "true", children: count > 9 ? "9+" : count })) : null] }), _jsx("span", { className: "ui-mode-nav__label", children: item.label })] }) }, item.id));
            }) }) }));
}
