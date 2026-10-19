// The smallest SVG writer that keeps attribute order stable, so a face renders
// to identical bytes on every machine and can be snapshot-tested.
function esc(value) {
    return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}
export function el(tag, attrs, inner = "") {
    const parts = Object.entries(attrs)
        .filter((entry) => entry[1] !== undefined)
        .map(([k, v]) => `${k}="${typeof v === "number" ? Math.round(v * 100) / 100 : esc(v)}"`);
    const open = parts.length > 0 ? `<${tag} ${parts.join(" ")}` : `<${tag}`;
    return inner === "" ? `${open}/>` : `${open}>${inner}</${tag}>`;
}
export const path = (d, attrs = {}) => el("path", { d, ...attrs });
export const group = (inner, attrs = {}) => (inner === "" ? "" : el("g", attrs, inner));
export const clip = (id, d) => el("clipPath", { id }, path(d));
