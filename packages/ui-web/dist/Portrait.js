import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { framed, regionBox } from "./portrait/crop.js";
import { renderFace } from "./portrait/render.js";
const cache = new Map();
const MAX_CACHED = 2000;
/**
 * A face as an image URI, drawn once per genome, age, mood and treatment.
 * The face is all a portrait shows: it never carries a reading the player
 * has not earned.
 */
export function faceSource(genome, age, options = {}) {
    const region = options.region ?? "portrait";
    const key = `${options.key ?? `${JSON.stringify(genome)}|${age}|${options.mood ?? ""}|${options.treatment ?? ""}`}|${region}`;
    const hit = cache.get(key);
    if (hit)
        return hit;
    const whole = renderFace(genome, { age, ...(options.mood ? { mood: options.mood } : {}), ...(options.treatment ? { treatment: options.treatment } : {}) });
    const svg = region === "portrait" ? whole : framed(whole, regionBox(genome, age, region));
    const uri = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    if (cache.size >= MAX_CACHED)
        cache.clear();
    cache.set(key, uri);
    return uri;
}
/** A person's face in an editorial frame, or their initials when they have no face yet. */
export function Portrait({ name, src, monogram, size = "md", decorative = false, party, redacted = true }) {
    const className = `ui-portrait ui-portrait--${size}`;
    if (redacted)
        return _jsxs("span", { className: className, "data-treatment": "redacted", "data-party": party, role: decorative ? undefined : "img", "aria-label": decorative ? undefined : `${name}: portrait redacted`, "aria-hidden": decorative || undefined, children: [_jsxs("svg", { className: "ui-portrait__redaction", viewBox: "0 0 72 90", "aria-hidden": "true", focusable: "false", children: [_jsx("path", { d: "M9 9H63V81H9Z", className: "ui-portrait__file" }), _jsx("circle", { cx: "36", cy: "31", r: "12", className: "ui-portrait__silhouette" }), _jsx("path", { d: "M16 69C16 45 56 45 56 69Z", className: "ui-portrait__silhouette" }), _jsx("path", { d: "M16 25H56V35H16ZM12 56H60V65H12Z", className: "ui-portrait__redacted-bar" }), _jsx("path", { d: "M20 75H52", className: "ui-portrait__file-line" })] }), _jsx("span", { className: "ui-portrait__redacted-label", children: "REDACTED" })] });
    if (src) {
        return (_jsx("span", { className: className, "data-party": party, children: _jsx("img", { className: "ui-portrait__image", src: src, alt: decorative ? "" : name, draggable: false }) }));
    }
    return (_jsx("span", { className: className, "data-party": party, role: decorative ? undefined : "img", "aria-label": decorative ? undefined : name, "aria-hidden": decorative || undefined, children: _jsx("span", { className: "ui-portrait__monogram", "aria-hidden": "true", children: monogram ?? "?" }) }));
}
