import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { anchor, categorical, chrome, dark, darkHighContrast, divergingPalettes, ground, highContrast, line, mapBoard, mapPartyPalettes, paper, partyPalettes, sequential, status, text, theater } from "./color";
import { motion } from "./motion";
import { layout, radius, space } from "./spacing";
import { typography } from "./typography";

// tokens.css is the web's copy of these values. A token edited in one place
// and not the other is a color the TypeScript side reasons about (contrast,
// palettes) that the page never shows, so every value is compared here.

const css = readFileSync(fileURLToPath(new URL("../tokens.css", import.meta.url)), "utf8");

/** The declarations inside the first block whose selector is exactly `selector`. */
function block(selector: string): ReadonlyMap<string, string> {
  const start = css.indexOf(`${selector} {`);
  if (start === -1) throw new Error(`tokens.css has no ${selector} block`);
  const body = css.slice(css.indexOf("{", start) + 1, css.indexOf("\n}", start));
  return new Map([...body.matchAll(/(--[a-z0-9-]+):\s*([^;]+);/g)].map((m) => [m[1]!, m[2]!.trim()]));
}

const kebab = (key: string): string => key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
const root = block(":root");

function expectSet(declared: ReadonlyMap<string, string>, prefix: string, values: Readonly<Record<string, string | number>>, unit = "") {
  for (const [key, value] of Object.entries(values)) {
    expect(declared.get(`${prefix}${kebab(key)}`), `${prefix}${kebab(key)}`).toBe(`${value}${unit}`);
  }
}

describe("tokens.css matches the TypeScript tokens", () => {
  it("carries every color", () => {
    expectSet(root, "--color-ground-", ground);
    expectSet(root, "--color-text-", text);
    expectSet(root, "--color-", anchor);
    expectSet(root, "--color-border-", { subtle: line.subtle, strong: line.strong });
    expect(root.get("--color-focus")).toBe(line.focus);
    expect(root.get("--color-paper")).toBe(paper.surface);
    expect(root.get("--color-paper-ink")).toBe(paper.ink);
    expectSet(root, "--color-party-", partyPalettes.standard);
    expectSet(root, "--map-board-", mapBoard);
    expectSet(root, "--map-party-", mapPartyPalettes.standard);
    expectSet(root, "--color-chrome-", chrome);
    expectSet(root, "--color-theater-", theater);
    for (const [name, pair] of Object.entries(status)) {
      expect(root.get(`--status-${name}-ink`), name).toBe(pair.ink);
      expect(root.get(`--status-${name}-fill`), name).toBe(pair.fill);
    }
  });

  it("restores the dark set inside the map theater", () => {
    const scope = block(`[data-surface="dark"]`);
    expectSet(scope, "--color-ground-", dark.ground);
    expectSet(scope, "--color-text-", dark.text);
    const { white: _white, ...darkAnchors } = dark.anchor;
    expectSet(scope, "--color-", darkAnchors);
    expectSet(scope, "--color-border-", { subtle: dark.line.subtle, strong: dark.line.strong });
    expect(scope.get("--color-focus")).toBe(dark.line.focus);
    for (const [name, pair] of Object.entries(dark.status)) {
      expect(scope.get(`--status-${name}-ink`), name).toBe(pair.ink);
      expect(scope.get(`--status-${name}-fill`), name).toBe(pair.fill);
    }
  });

  it("carries every data ramp", () => {
    sequential.forEach((value, i) => expect(root.get(`--map-seq-${i + 1}`)).toBe(value));
    categorical.forEach((value, i) => expect(root.get(`--map-cat-${i + 1}`)).toBe(value));
    const steps = ["n3", "n2", "n1", "0", "p1", "p2", "p3"];
    divergingPalettes.standard.forEach((value, i) => expect(root.get(`--map-div-${steps[i]}`)).toBe(value));
  });

  it("swaps the palettes for each kind of color vision", () => {
    const red = block(`:root[data-vision="protan"],\n:root[data-vision="deutan"]`);
    expect(partyPalettes.deutan).toEqual(partyPalettes.protan);
    expect(mapPartyPalettes.deutan).toEqual(mapPartyPalettes.protan);
    const blue = block(`:root[data-vision="tritan"]`);
    // Each block declares only the party colors that differ from the standard palette, light and map alike.
    for (const [declared, light, map] of [
      [red, partyPalettes.protan, mapPartyPalettes.protan],
      [blue, partyPalettes.tritan, mapPartyPalettes.tritan],
    ] as const) {
      for (const key of ["democrat", "republican", "independent"] as const) {
        expect(declared.get(`--color-party-${key}`) ?? partyPalettes.standard[key], `light ${key}`).toBe(light[key]);
        expect(declared.get(`--map-party-${key}`) ?? mapPartyPalettes.standard[key], `map ${key}`).toBe(map[key]);
      }
    }
    // Each block declares only the steps it changes from the standard ramp; every step it declares must match its palette.
    const steps = ["n3", "n2", "n1", "0", "p1", "p2", "p3"];
    for (const [declared, palette] of [
      [red, divergingPalettes.protan],
      [blue, divergingPalettes.tritan],
    ] as const) {
      steps.forEach((step, i) => {
        const value = declared.get(`--map-div-${step}`);
        if (value !== undefined) expect(value, `--map-div-${step}`).toBe(palette[i]);
      });
    }
  });

  it("applies the same dark set to the whole page under the dark theme", () => {
    expect(css).toContain(`:root[data-theme="dark"],\n[data-surface="dark"] {`);
  });

  it("swaps the inks under high contrast on the dark theme", () => {
    const high = block(`:root[data-theme="dark"][data-contrast="high"]`);
    const media = css.slice(css.indexOf("@media (prefers-contrast: more) {\n  :root[data-theme=\"dark\"] {"));
    const system = new Map([...media.slice(0, media.indexOf("\n  }")).matchAll(/(--[a-z0-9-]+):\s*([^;]+);/g)].map((m) => [m[1]!, m[2]!.trim()]));
    for (const declared of [high, system]) {
      expect(declared.get("--color-text-secondary")).toBe(darkHighContrast.textSecondary);
      expect(declared.get("--color-text-tertiary")).toBe(darkHighContrast.textTertiary);
      expect(declared.get("--color-border-subtle")).toBe(darkHighContrast.lineSubtle);
      expect(declared.get("--color-border-strong")).toBe(darkHighContrast.lineStrong);
    }
  });

  it("swaps the inks under high contrast", () => {
    const high = block(`:root[data-contrast="high"]`);
    expect(high.get("--color-text-secondary")).toBe(highContrast.textSecondary);
    expect(high.get("--color-text-tertiary")).toBe(highContrast.textTertiary);
    expect(high.get("--color-border-subtle")).toBe(highContrast.lineSubtle);
    expect(high.get("--color-border-strong")).toBe(highContrast.lineStrong);
  });

  it("carries type, space, radius, layout and motion", () => {
    expectSet(root, "--size-", typography.size, "rem");
    expect(root.get("--size-display")).toBe(typography.fluid.display);
    expect(root.get("--size-hero")).toBe(typography.fluid.hero);
    expectSet(root, "--leading-", typography.leading);
    expectSet(root, "--weight-", typography.weight);
    expectSet(root, "--space-", space, "px");
    expectSet(root, "--radius-", radius, "px");
    expect(root.get("--bar-phone")).toBe(`${layout.barPhone}px`);
    expect(root.get("--detent-peek")).toBe(`${layout.detentPeek}px`);
    expect(root.get("--detent-half")).toBe(`${layout.detentHalf}px`);
    expect(root.get("--panel-min")).toBe(`${layout.panelMin}px`);
    expect(root.get("--panel-max")).toBe(`${layout.panelMax}px`);
    expect(root.get("--panel-wide")).toBe(`${layout.panelWide}px`);
    expectSet(root, "--duration-", motion.duration, "ms");
    expectSet(root, "--ease-", motion.easing);
  });
});
