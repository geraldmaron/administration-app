import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { forwardRef, useId } from "react";
const STROKE_WIDTH = { regular: 16, bold: 24, duotone: 16, fill: 16 };
const drawnWeight = (weight) => weight === "bold" || weight === "duotone" || weight === "fill" ? weight : "regular";
/**
 * Builds a component that matches Phosphor's `Icon` type, so the ICONS table
 * takes it like any other glyph. Duotone lays a 20% fill under the stroke; fill
 * is the solid silhouette with the detail strokes cut out of it where they cross the body and kept where they stand clear of it.
 */
export function makeGlyph({ name, body, detail, rotate }) {
    const Component = forwardRef(function CustomGlyph(props, ref) {
        const { alt, color, size, weight, mirrored, children, ...rest } = props;
        const cutId = useId();
        const outsideId = useId();
        const drawn = drawnWeight(weight);
        const ink = color ?? "currentColor";
        const strokeWidth = STROKE_WIDTH[drawn];
        const stroke = { stroke: ink, strokeWidth, strokeLinecap: "round", strokeLinejoin: "round" };
        const solid = drawn === "fill";
        return (_jsxs("svg", { ref: ref, xmlns: "http://www.w3.org/2000/svg", width: size ?? "1em", height: size ?? "1em", viewBox: "0 0 256 256", fill: "none", transform: mirrored ? "scale(-1, 1)" : undefined, ...rest, children: [alt ? _jsx("title", { children: alt }) : null, children, _jsxs("g", { transform: rotate ? `rotate(${rotate} 128 128)` : undefined, children: [solid && detail ? (_jsxs(_Fragment, { children: [_jsxs("mask", { id: cutId, maskUnits: "userSpaceOnUse", x: -128, y: -128, width: 512, height: 512, children: [_jsx("rect", { x: -128, y: -128, width: 512, height: 512, fill: "white" }), _jsx("path", { d: detail, fill: "none", stroke: "black", strokeWidth: STROKE_WIDTH.regular, strokeLinecap: "round", strokeLinejoin: "round" })] }), _jsxs("mask", { id: outsideId, maskUnits: "userSpaceOnUse", x: -128, y: -128, width: 512, height: 512, children: [_jsx("rect", { x: -128, y: -128, width: 512, height: 512, fill: "white" }), _jsx("path", { d: body, fill: "black", stroke: "black", strokeWidth: STROKE_WIDTH.regular, strokeLinecap: "round", strokeLinejoin: "round" })] })] })) : null, _jsx("path", { d: body, ...stroke, fill: drawn === "duotone" || solid ? ink : "none", fillOpacity: drawn === "duotone" ? 0.2 : undefined, mask: solid && detail ? `url(#${cutId})` : undefined, "data-glyph-part": name }), detail ? _jsx("path", { d: detail, ...stroke, fill: "none", mask: solid ? `url(#${outsideId})` : undefined }) : null] })] }));
    });
    Component.displayName = `${name}Icon`;
    return Component;
}
