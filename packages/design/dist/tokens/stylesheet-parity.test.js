import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { artifact } from "./artifact.js";
import { chrome } from "./chrome.js";
import { accent, color } from "./color.js";
import { control } from "./control.js";
import { elevation } from "./elevation.js";
import { materials } from "./materials.js";
import { motion } from "./motion.js";
import { PATTERN_KINDS, pattern } from "./patterns.js";
import { mapBoard, ramp } from "./ramps.js";
import { semantic } from "./semantic.js";
import { radius, spacing } from "./spacing.js";
import { typography } from "./typography.js";
// The TypeScript tokens are what the contrast and role tests check; the
// stylesheets are what the player actually sees. They were two hand-synced
// palettes with nothing tying them together, so a value could be fixed in one
// and ship unfixed in the other. This file is the tie: every custom property
// in tokens.css is the projection of a TS token or is named below as web-only,
// and patterns.css is held to the pattern tokens and to its own sources.
const TOKENS_CSS = readFileSync(new URL("../tokens.css", import.meta.url), "utf8");
const PATTERNS_CSS = readFileSync(new URL("../patterns.css", import.meta.url), "utf8");
const PATTERN_SOURCES = new URL("../../../../design/patterns/", import.meta.url);
function stripComments(css) {
    return css.replace(/\/\*[\s\S]*?\*\//g, "");
}
/** The text between the brace at `open` and the brace that closes it. */
function blockBody(css, open) {
    let depth = 0;
    for (let index = open; index < css.length; index += 1) {
        if (css[index] === "{")
            depth += 1;
        if (css[index] === "}")
            depth -= 1;
        if (depth === 0)
            return css.slice(open + 1, index);
    }
    throw new Error("The stylesheet's braces do not balance.");
}
/** The first top-level `:root` block, which is where the unconditional tokens live. */
function rootBody(css) {
    const clean = stripComments(css);
    const open = clean.indexOf(":root {");
    if (open < 0)
        throw new Error("The stylesheet has no :root block.");
    return blockBody(clean, clean.indexOf("{", open));
}
/** Every top-level `@media` block, with its query as written. */
function mediaBlocks(css) {
    const clean = stripComments(css);
    return Array.from(clean.matchAll(/@media([^{]+)\{/g), (match) => ({
        query: (match[1] ?? "").trim(),
        body: blockBody(clean, (match.index ?? 0) + match[0].length - 1),
    }));
}
function declarations(body) {
    return new Map(Array.from(body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g), (match) => [match[1] ?? "", (match[2] ?? "").trim()]));
}
/** Case, spacing inside a list or a call, and line breaks are how a value is written, not what it is. */
function normalize(value) {
    return value.replace(/\s+/g, " ").replace(/\s*([(),])\s*/g, "$1").trim().toLowerCase();
}
const px = (value) => (value === 0 ? "0" : `${value}px`);
const rem = (value) => `${value / 16}rem`;
const ms = (value) => `${value}ms`;
const kebab = (name) => name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
function cssShadow(shadows) {
    return shadows
        .map((shadow) => [
        shadow.inset ? "inset" : "",
        px(shadow.offsetX),
        px(shadow.offsetY),
        px(shadow.blurRadius ?? 0),
        shadow.spreadDistance === undefined ? "" : px(shadow.spreadDistance),
        shadow.color,
    ]
        .filter((part) => part !== "")
        .join(" "))
        .join(", ");
}
function numbered(prefix, values) {
    return Object.fromEntries(values.map((value, index) => [`${prefix}-${index + 1}`, value]));
}
const DIVERGING_STEPS = ["n3", "n2", "n1", "0", "p1", "p2", "p3"];
const COLOR_PROJECTION = {
    "--color-ground-abyss": color.ground.abyss,
    "--color-ground-sunken": color.ground.sunken,
    "--color-ground-base": color.ground.base,
    "--color-ground-raised": color.ground.raised,
    "--color-ground-raised-hover": color.ground.raisedHover,
    "--color-ground-overlay": color.ground.overlay,
    "--color-ground-overlay-hover": color.ground.overlayHover,
    "--color-ground-soft": color.ground.soft,
    "--color-text-primary": color.text.primary,
    "--color-text-secondary": color.text.secondary,
    "--color-text-tertiary": color.text.tertiary,
    "--color-text-disabled": color.text.disabled,
    "--color-text-on-light": color.text.onLight,
    "--color-accent": accent.primary,
    "--color-accent-bright": accent.bright,
    "--color-accent-hover": accent.hover,
    "--color-interaction": semantic.interaction,
    "--color-action": semantic.action,
    "--color-action-hover": semantic.actionHover,
    "--color-action-pressed": semantic.actionPressed,
    "--color-mark-gold": color.mark.gold,
    ...Object.fromEntries(Object.entries(color.room).map(([name, value]) => [`--color-room-${name}`, value])),
    "--color-stance-favorable": color.stance.favorable,
    "--color-stance-neutral": color.stance.neutral,
    "--color-stance-caution": color.stance.caution,
    "--color-stance-adverse": color.stance.adverse,
    "--color-stance-critical": semantic.critical,
    "--color-stance-destructive": semantic.destructive,
    "--color-party-democrat": color.party.democrat,
    "--color-party-republican": color.party.republican,
    "--color-party-independent": color.party.independent,
    "--color-border-subtle": color.border.subtle,
    "--color-border-strong": color.border.strong,
    "--color-focus": color.focus.ring,
    "--color-paper": materials.paper.background,
    "--color-paper-ink": materials.folio.ink,
    "--color-paper-rule": materials.paper.rule,
};
const RAMP_PROJECTION = {
    ...numbered("--map-seq", ramp.mapSequential),
    ...Object.fromEntries(DIVERGING_STEPS.map((step, index) => [`--map-div-${step}`, ramp.mapDiverging[index] ?? ""])),
    ...numbered("--map-cat", ramp.categorical),
    ...numbered("--chart-series", ramp.chartSeries),
    "--chart-grid": ramp.chartGrid,
    ...Object.fromEntries(Object.entries(mapBoard).map(([name, value]) => [`--map-board-${kebab(name)}`, value])),
};
const SCALE_PROJECTION = {
    // The hairline gap is half the smallest step, not a step of its own.
    "--space-2xs": px(spacing.xs / 2),
    ...Object.fromEntries(Object.entries(spacing).map(([name, value]) => [`--space-${name}`, px(value)])),
    ...Object.fromEntries(Object.entries(radius).map(([name, value]) => [`--radius-${name}`, px(value)])),
    "--control-height": px(control.height.standard),
    "--control-compact": px(control.height.compact),
    "--font-geist": `"${typography.family.body}", system-ui, sans-serif`,
    "--font-serif": `"${typography.family.prose}", "Iowan Old Style", Georgia, serif`,
    "--font-mono": `"${typography.family.mono}", ui-monospace, Menlo, monospace`,
    "--size-hero": rem(typography.size.hero),
    "--size-display": rem(typography.size.display),
    "--size-figure": rem(typography.size.figure),
    "--size-heading": rem(typography.size.heading),
    "--size-title": rem(typography.size.title),
    "--size-body": rem(typography.size.body),
    "--size-label": rem(typography.size.label),
    "--size-caption": rem(typography.size.caption),
    "--size-eyebrow": rem(typography.size.eyebrow),
    ...Object.fromEntries(Object.entries(motion.duration).map(([name, value]) => [`--duration-${name}`, ms(value)])),
    ...Object.fromEntries(Object.entries(motion.easing).map(([name, value]) => [`--ease-${name}`, value])),
    "--chrome-masthead-band": px(chrome.mastheadBand),
    ...Object.fromEntries(Object.entries(artifact.opacity).map(([name, value]) => [`--artifact-${name}`, String(value)])),
    "--shadow-card": cssShadow(elevation.card.boxShadow),
    "--shadow-raised": cssShadow(elevation.raised.boxShadow),
};
const PROJECTION = { ...COLOR_PROJECTION, ...RAMP_PROJECTION, ...SCALE_PROJECTION };
/** Custom properties with no TS twin, each with the reason it has none. */
const WEB_ONLY = {
    "--measure-reading": "the web reading column's cap; the TS `measure` is a phone tray's and a different width",
    "--nav-width": "shell geometry the web layout owns",
    "--inspector-width": "shell geometry the web layout owns",
    "--ui-texture-fine-noise": "a drawn data-URI texture; nothing outside CSS can draw it",
    "--ui-texture-paper-fiber": "a drawn data-URI texture; nothing outside CSS can draw it",
    ...Object.fromEntries(["--glass-fill", "--glass-fill-strong", "--glass-blur", "--edge-brass", "--edge-hairline", "--glow-interaction", "--glow-gold", "--glow-alert", "--glow-favorable", "--scrim-hero", "--scrim-atmosphere", "--tracking-display", "--sr-blue", "--sr-line", "--sr-line-soft", "--sr-plate-top", "--sr-plate-bottom", "--sr-well", "--sr-lift", "--sr-sink", "--grid-line-atmosphere", "--glass-fill-chrome", "--edge-brass-side", "--glass-fill-hero", "--shadow-hero", "--scrim-masthead"].map((name) => [name, "a light material (translucency, blur, glow, scrim): a CSS rendering effect nothing outside the stylesheet draws"])),
};
describe("tokens.css against the TypeScript tokens", () => {
    const root = declarations(rootBody(TOKENS_CSS));
    it("projects every TS token it names with the TS value", () => {
        const drift = Object.entries(PROJECTION)
            .filter(([name, value]) => normalize(root.get(name) ?? "(missing)") !== normalize(value))
            .map(([name, value]) => `${name}: css ${root.get(name) ?? "(missing)"} vs ts ${value}`);
        expect(drift).toEqual([]);
    });
    it("carries no custom property that is neither a projection nor named web-only", () => {
        const unaccounted = [...root.keys()].filter((name) => !(name in PROJECTION) && !(name in WEB_ONLY));
        expect(unaccounted).toEqual([]);
    });
    it("swaps in the TS contrast tokens when more contrast is asked for", () => {
        const block = mediaBlocks(TOKENS_CSS).find((media) => media.query.includes("prefers-contrast: more"));
        const swapped = declarations(block?.body ?? "");
        expect(normalize(swapped.get("--color-border-subtle") ?? "")).toBe(normalize(color.contrast.border));
        expect(normalize(swapped.get("--color-border-strong") ?? "")).toBe(normalize(color.contrast.borderStrong));
        expect(normalize(swapped.get("--color-text-secondary") ?? "")).toBe(normalize(color.contrast.textSecondary));
        expect(normalize(swapped.get("--color-text-tertiary") ?? "")).toBe(normalize(color.contrast.textTertiary));
    });
    it("stills every duration when motion is reduced", () => {
        const block = mediaBlocks(TOKENS_CSS).find((media) => media.query.includes("prefers-reduced-motion: reduce"));
        const stilled = declarations(block?.body ?? "");
        const durations = [...root.keys()].filter((name) => name.startsWith("--duration-"));
        expect(durations.length).toBe(Object.keys(motion.duration).length);
        for (const name of durations)
            expect(stilled.get(name), name).toBe("0ms");
    });
});
describe("patterns.css against the pattern tokens", () => {
    const root = declarations(rootBody(PATTERNS_CSS));
    it("mixes each ink from its token at its alpha", () => {
        for (const [name, ink] of Object.entries(pattern.ink)) {
            const expected = `color-mix(in srgb, var(${ink.cssVar}) ${Math.round(ink.alpha * 100)}%, transparent)`;
            expect(normalize(root.get(`--pattern-ink-${name}`) ?? ""), name).toBe(normalize(expected));
            expect(normalize(declarations(rootBody(TOKENS_CSS)).get(ink.cssVar) ?? ""), ink.cssVar).toBe(normalize(ink.hex));
        }
    });
    it("sizes each tile as the tokens say", () => {
        for (const kind of PATTERN_KINDS) {
            expect(root.get(`--pattern-size-${kind}`), kind).toBe(px(pattern.tileSize[kind]));
        }
    });
    it("prints each tile exactly as its source in design/patterns draws it", () => {
        const normalizeSvg = (svg) => svg.replace(/<!--[\s\S]*?-->/g, "").replace(/>\s+</g, "><").replace(/\s+/g, " ").trim();
        for (const kind of PATTERN_KINDS) {
            const tile = /^url\("data:image\/svg\+xml,([^"]*)"\)$/.exec(root.get(`--pattern-tile-${kind}`) ?? "");
            expect(tile, `--pattern-tile-${kind} is not a data-URI SVG`).not.toBeNull();
            const source = readFileSync(new URL(`${kind}.svg`, PATTERN_SOURCES), "utf8");
            expect(decodeURIComponent(tile?.[1] ?? ""), kind).toBe(normalizeSvg(source));
        }
    });
    it("prints at full strength by default and not at all for more contrast, forced colors or print", () => {
        expect(root.get("--pattern-strength")).toBe("1");
        const off = mediaBlocks(PATTERNS_CSS).filter((media) => declarations(media.body).get("--pattern-strength") === "0");
        const queries = off.map((media) => media.query).join(" | ");
        expect(queries).toContain("prefers-contrast: more");
        expect(queries).toContain("forced-colors: active");
        expect(queries).toContain("print");
    });
});
