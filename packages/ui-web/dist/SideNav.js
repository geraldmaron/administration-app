import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { Sheet } from "./Layer";
import { Icon } from "./Icon";
function Anchor({ children, ...rest }) {
    return _jsx("a", { ...rest, children: children });
}
const countsOf = (item) => ({ fresh: item.attention ?? 0, waiting: Math.max(item.waiting ?? 0, item.attention ?? 0) });
const sum = (items) => items.map(countsOf).reduce((total, next) => ({ fresh: total.fresh + next.fresh, waiting: total.waiting + next.waiting }), { fresh: 0, waiting: 0 });
/** "Congress, 1 new, 3 waiting on you": what the badge draws, said to a screen reader. */
function named(label, { fresh, waiting }) {
    if (waiting <= 0)
        return undefined;
    return fresh > 0 ? `${label}, ${fresh} new, ${waiting} waiting on you` : `${label}, ${waiting} waiting on you`;
}
/** Red while anything here is new; once all of it has been seen, a quiet count of what still waits. */
function Badge({ counts }) {
    const shown = counts.fresh > 0 ? counts.fresh : counts.waiting;
    if (shown <= 0)
        return null;
    return (_jsx("span", { className: counts.fresh > 0 ? "ui-nav__badge" : "ui-nav__badge ui-nav__badge--quiet", "aria-hidden": "true", children: shown > 9 ? "9+" : shown }));
}
/** Every destination under its group's heading: the wide navigation and the drawer. */
function FullList({ groups, utilities = [], current, Link, onNavigate }) {
    const link = (item) => {
        const label = named(item.label, countsOf(item));
        return (_jsx("li", { children: _jsxs(Link, { href: item.href, className: "ui-nav__link", ...(item.id === current ? { "aria-current": "page" } : {}), ...(label ? { "aria-label": label } : {}), ...(onNavigate ? { onClick: onNavigate } : {}), children: [_jsx(Icon, { name: item.icon, size: 20 }), _jsx("span", { className: "ui-nav__label", children: item.label }), _jsx(Badge, { counts: countsOf(item) })] }) }, item.id));
    };
    return (_jsxs("div", { className: "ui-nav__full", children: [groups.map((group) => (_jsxs("section", { className: "ui-nav__group", "aria-labelledby": `nav-group-${group.id}`, children: [_jsx("h2", { className: "ui-nav__heading", id: `nav-group-${group.id}`, children: group.label }), _jsx("ul", { className: "ui-nav__list", children: group.items.map(link) })] }, group.id))), utilities.length > 0 ? _jsx("ul", { className: "ui-nav__list ui-nav__list--utilities", children: utilities.map(link) }) : null] }));
}
/** One entry per group, the label under its mark: the compact rail and the phone bar. */
function GroupEntry({ group, current, Link }) {
    const active = group.items.some((item) => item.id === current);
    const count = sum(group.items);
    const label = named(group.label, count);
    return (_jsx("li", { children: _jsxs(Link, { href: group.items[0].href, className: "ui-nav__group-link", ...(active ? { "aria-current": "page" } : {}), ...(label ? { "aria-label": label } : {}), children: [_jsxs("span", { className: "ui-nav__glyph", children: [_jsx(Icon, { name: group.icon, size: 24 }), _jsx(Badge, { counts: count })] }), _jsx("span", { className: "ui-nav__group-label", children: group.label })] }) }));
}
/**
 * The main navigation. Wide screens list every destination under its group;
 * a laptop width shows one labeled entry per group; a tablet opens the full
 * list as a drawer; a phone keeps a bar of the main groups and More.
 */
export function SideNav({ groups, utilities = [], current, phoneGroups, drawerFoot, Link = Anchor }) {
    const [open, setOpen] = useState(false);
    const show = () => setOpen(true);
    const close = () => setOpen(false);
    const onPhone = phoneGroups ? groups.filter((group) => phoneGroups.includes(group.id)) : groups.slice(0, 4);
    const behindMore = groups.filter((group) => !onPhone.includes(group));
    const moreActive = behindMore.some((group) => group.items.some((item) => item.id === current)) || utilities.some((item) => item.id === current);
    const moreCount = sum(behindMore.flatMap((group) => group.items));
    return (_jsxs("nav", { className: "ui-nav", "aria-label": "Main", children: [_jsxs("button", { type: "button", className: "ui-nav__menu", "aria-haspopup": "dialog", "aria-expanded": open, onClick: show, children: [_jsx(Icon, { name: "menu", size: 24 }), _jsx("span", { className: "ui-nav__menu-label", children: "Menu" })] }), _jsx(FullList, { groups: groups, utilities: utilities, current: current, Link: Link }), _jsx("ul", { className: "ui-nav__rail", children: groups.map((group) => (_jsx(GroupEntry, { group: group, current: current, Link: Link }, group.id))) }), _jsxs("ul", { className: "ui-nav__bar", children: [onPhone.map((group) => (_jsx(GroupEntry, { group: group, current: current, Link: Link }, group.id))), _jsx("li", { children: _jsxs("button", { type: "button", className: "ui-nav__group-link", "aria-haspopup": "dialog", "aria-expanded": open, ...(moreActive ? { "data-current": "true" } : {}), "aria-label": named("More", moreCount) ?? "More", onClick: show, children: [_jsxs("span", { className: "ui-nav__glyph", children: [_jsx(Icon, { name: "menu", size: 24 }), _jsx(Badge, { counts: moreCount })] }), _jsx("span", { className: "ui-nav__group-label", children: "More" })] }) })] }), _jsx(Sheet, { open: open, onClose: close, placement: "side", className: "ui-nav__drawer", title: "All destinations", closeLabel: "Close the menu", foot: drawerFoot ? _jsx("div", { className: "ui-nav__drawer-foot", children: drawerFoot }) : undefined, children: _jsx(FullList, { groups: groups, utilities: utilities, current: current, Link: Link, onNavigate: close }) })] }));
}
