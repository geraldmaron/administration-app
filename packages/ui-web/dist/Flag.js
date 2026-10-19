import { jsx as _jsx } from "react/jsx-runtime";
/** A real flag in a 3:2 box with a hairline, so a white field still reads as a flag on white. */
export function Flag({ name, src, height = 20, decorative = false }) {
    const style = { blockSize: `${height}px`, inlineSize: `${height * 1.5}px` };
    if (!src) {
        return _jsx("span", { className: "ui-flag ui-flag--missing", style: style, role: decorative ? undefined : "img", "aria-label": decorative ? undefined : `${name} (no flag on file)`, "aria-hidden": decorative || undefined });
    }
    return (_jsx("span", { className: "ui-flag", style: style, children: _jsx("img", { className: "ui-flag__image", src: src, alt: decorative ? "" : `Flag of ${name}`, draggable: false }) }));
}
