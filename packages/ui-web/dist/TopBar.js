import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { BrandGlyph } from "./BrandGlyph";
/** The mark, the presidency's current state, and the controls that act on the whole game. */
export function TopBar({ home, status, actions }) {
    return (_jsxs("header", { className: "ui-top-bar", children: [_jsx("div", { className: "ui-top-bar__home", children: home }), status ? _jsx("div", { className: "ui-top-bar__status", children: status }) : null, actions ? _jsx("div", { className: "ui-top-bar__actions", children: actions }) : null] }));
}
/** The seal and the office it stands for, as the top bar draws them. The words hide on a phone; the seal keeps its label. */
export function Wordmark({ holder }) {
    return (_jsxs("span", { className: "ui-wordmark", children: [_jsx(BrandGlyph, { size: 24, className: "ui-wordmark__glyph" }), _jsxs("span", { className: "ui-wordmark__name", children: [_jsx("span", { className: "ui-wordmark__office", children: "Office of the President" }), holder ? _jsx("span", { className: "ui-wordmark__holder", children: holder }) : null] })] }));
}
