import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useId } from "react";
// The two parties' animals as plain silhouettes, with the three stars cut
// through so the ground shows. Drawn on a 64 by 48 grid, readable from a
// legend swatch up to a heading.
const BODY = {
    republican: "M4 23C5 21 7 20 9 20C10 12 17 7 27 7L41 7C50 7 56 11 58 18C60 22 61 27 61 32C61 37 59 40 56 40C54 40 53 38 54 36C55 34 56 33 55 30L53 29L53 44L45 44L45 35L37 35L37 44L29 44L29 35L21 35L21 44L13 44L13 32C11 30 10 27 9 25C7 25 5 25 4 23Z",
    democrat: "M2 24C2 21 4 19 7 17L12 12L14 1L18 9L23 0L22 11C23 14 25 17 28 18L49 18C52 18 54 17 55 15L60 8L61.5 10L57 18C56 21 56 25 57 28L60 44L54 44L50 32L47 33L47 44L41 44L40 34L34 34L33 44L27 44L26 31C23 29 21 27 19 24L11 28C6 29 2 28 2 24Z",
    independent: "M32 3L39.6 18.4L56.6 20.9L44.3 32.9L47.2 49.8L32 41.8L16.8 49.8L19.7 32.9L7.4 20.9L24.4 18.4Z",
};
const STARS = {
    republican: [[22.5, 21.5], [31.5, 21.5], [40.5, 21.5]],
    democrat: [[33, 25], [40, 25], [47, 25]],
    independent: [],
};
const EYE = {
    republican: [51, 17],
    democrat: [13, 18],
    independent: undefined,
};
function star(cx, cy, r) {
    const points = Array.from({ length: 10 }, (_, i) => {
        const angle = -Math.PI / 2 + (Math.PI / 5) * i;
        const radius = i % 2 === 0 ? r : r * 0.42;
        return `${(cx + radius * Math.cos(angle)).toFixed(2)},${(cy + radius * Math.sin(angle)).toFixed(2)}`;
    });
    return `M${points.join("L")}Z`;
}
/** The party's animal: the Democratic donkey, the Republican elephant, a plain star for an independent. */
export function PartyMark({ party, size = 16, label, className }) {
    const cut = useId();
    const eye = EYE[party];
    return (_jsxs("svg", { className: ["ui-party-mark", className].filter(Boolean).join(" "), "data-party": party, viewBox: "0 0 64 50", width: (size * 64) / 50, height: size, role: label ? "img" : undefined, "aria-label": label, "aria-hidden": label ? undefined : true, children: [_jsxs("mask", { id: cut, maskUnits: "userSpaceOnUse", x: 0, y: 0, width: 64, height: 50, children: [_jsx("rect", { width: 64, height: 50, fill: "white" }), STARS[party].map(([x, y]) => _jsx("path", { d: star(x, y, 3.4), fill: "black" }, x)), eye ? _jsx("circle", { cx: eye[0], cy: eye[1], r: 1.6, fill: "black" }) : null] }), _jsx("path", { d: BODY[party], fill: "var(--party-ink, currentColor)", mask: `url(#${cut})` })] }));
}
