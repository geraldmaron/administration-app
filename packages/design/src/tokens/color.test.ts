import { describe, expect, it } from "vitest";
import { anchor, categorical, chrome, dark, darkHighContrast, divergingPalettes, ground, highContrast, line, mapBoard, mapPartyPalettes, paper, partyPalettes, sequential, status, text, theater } from "./color";
import { AA_NON_TEXT, AA_NORMAL_TEXT, contrastRatio, relativeLuminance } from "./contrast";

// The color rules DESIGN.md states, checked against the values the page draws.

const LIGHT = [ground.abyss, ground.sunken, ground.base, ground.raised, ground.raisedHover, ground.overlay];
const DARK = [dark.ground.abyss, dark.ground.sunken, dark.ground.base, dark.ground.raised, dark.ground.overlay];

describe("reading inks on light surfaces", () => {
  it("keep AA on every light ground and on paper", () => {
    for (const surface of [...LIGHT, paper.surface]) {
      for (const ink of [text.primary, text.secondary, text.tertiary, anchor.blue, anchor.gold, anchor.red, line.focus]) {
        expect(contrastRatio(ink, surface), `${ink} on ${surface}`).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
      }
    }
  });

  it("keep AA for white on every action fill and on the navy chrome", () => {
    for (const fill of [anchor.blueFill, anchor.blueFillHover, anchor.redFill, anchor.redFillHover, chrome.navy, chrome.navyHover]) {
      expect(contrastRatio(anchor.white, fill), fill).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
    }
    expect(contrastRatio(paper.ink, paper.surface)).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
  });

  it("draws a control's edge at 3:1 on the surfaces it sits on", () => {
    for (const surface of [ground.sunken, ground.base, ground.raised]) {
      expect(contrastRatio(line.strong, surface), surface).toBeGreaterThanOrEqual(AA_NON_TEXT);
      expect(contrastRatio(line.focus, surface), surface).toBeGreaterThanOrEqual(AA_NON_TEXT);
    }
  });

  it("holds every dark status ink at AA on the dark grounds and on its own fill", () => {
    for (const [name, pair] of Object.entries(dark.status)) {
      for (const surface of [dark.ground.base, dark.ground.sunken, dark.ground.raised]) {
        expect(contrastRatio(pair.ink, surface), `${name} on ${surface}`).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
      }
      expect(contrastRatio(pair.ink, pair.fill), `${name} on its fill`).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
    }
  });

  it("holds every status pair at AA, ink on its own fill and on white", () => {
    for (const [name, pair] of Object.entries(status)) {
      expect(contrastRatio(pair.ink, pair.fill), name).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
      expect(contrastRatio(pair.ink, ground.base), name).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
    }
  });

  it("only gets louder under high contrast", () => {
    expect(contrastRatio(highContrast.textTertiary, ground.raised)).toBeGreaterThan(contrastRatio(text.tertiary, ground.raised));
    expect(contrastRatio(highContrast.lineStrong, ground.raised)).toBeGreaterThan(contrastRatio(line.strong, ground.raised));
  });

  it("only gets louder under high contrast on the dark set too", () => {
    expect(contrastRatio(darkHighContrast.textTertiary, dark.ground.raised)).toBeGreaterThan(contrastRatio(dark.text.tertiary, dark.ground.raised));
    expect(contrastRatio(darkHighContrast.lineSubtle, dark.ground.raised)).toBeGreaterThan(contrastRatio(dark.line.subtle, dark.ground.raised));
    expect(contrastRatio(darkHighContrast.lineStrong, dark.ground.raised)).toBeGreaterThan(contrastRatio(dark.line.strong, dark.ground.raised));
  });
});

describe("the navy chrome and the map theater", () => {
  it("keep their inks, interaction color, focus and edges readable", () => {
    for (const ink of [chrome.text, chrome.secondary, chrome.focus]) expect(contrastRatio(ink, chrome.navy), ink).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
    expect(contrastRatio(chrome.border, chrome.navy)).toBeGreaterThanOrEqual(AA_NON_TEXT);
    for (const ink of [theater.text, theater.secondary, theater.interactive]) expect(contrastRatio(ink, theater.surface), ink).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
    expect(contrastRatio(theater.border, theater.surface)).toBeGreaterThanOrEqual(AA_NON_TEXT);
  });

  it("keeps the dark set's inks at AA on every dark ground", () => {
    for (const surface of DARK) {
      for (const ink of [dark.text.primary, dark.text.secondary, dark.text.tertiary, dark.anchor.blue, dark.anchor.gold, dark.anchor.red, dark.line.focus]) {
        expect(contrastRatio(ink, surface), `${ink} on ${surface}`).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
      }
    }
  });
});

describe("party colors", () => {
  it("hold 4.5:1 on white in every color-vision palette, so a seat and its label agree", () => {
    for (const palette of Object.values(partyPalettes)) {
      for (const value of Object.values(palette)) expect(contrastRatio(value, ground.base), value).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
    }
  });

  it("hold 3:1 on the dark map and keep Democratic blue above the navy", () => {
    for (const palette of Object.values(mapPartyPalettes)) {
      for (const value of Object.values(palette)) expect(contrastRatio(value, dark.ground.abyss), value).toBeGreaterThanOrEqual(AA_NON_TEXT);
      expect(relativeLuminance(palette.democrat)).toBeGreaterThan(relativeLuminance(dark.anchor.blueFill));
    }
  });
});

describe("data palettes on the dark map", () => {
  it("keeps the sequential ramp lightness-first and visible", () => {
    const lightness = sequential.map(relativeLuminance);
    lightness.slice(1).forEach((value, i) => expect(value).toBeGreaterThan(lightness[i]!));
    for (const value of sequential) expect(contrastRatio(value, dark.ground.abyss), value).toBeGreaterThanOrEqual(AA_NON_TEXT);
  });

  it("keeps every diverging step and category visible on the canvas", () => {
    for (const ramp of Object.values(divergingPalettes)) {
      for (const value of ramp) expect(contrastRatio(value, dark.ground.abyss), value).toBeGreaterThanOrEqual(AA_NON_TEXT);
    }
    for (const value of categorical) expect(contrastRatio(value, dark.ground.abyss), value).toBeGreaterThanOrEqual(AA_NON_TEXT);
  });

  it("keeps each diverging ramp symmetric, brightening from the middle out", () => {
    for (const ramp of Object.values(divergingPalettes)) {
      const onCanvas = ramp.map((value) => contrastRatio(value, dark.ground.abyss));
      for (let step = 1; step <= 3; step++) {
        const [cool, warm] = [onCanvas[3 - step]!, onCanvas[3 + step]!];
        expect(Math.max(cool, warm) / Math.min(cool, warm), `${ramp[3 - step]} against ${ramp[3 + step]}`).toBeLessThanOrEqual(1.1);
        expect(cool).toBeGreaterThan(onCanvas[4 - step]!);
        expect(warm).toBeGreaterThan(onCanvas[2 + step]!);
      }
    }
  });

  it("lifts every ramp step clear of the land it is filled over", () => {
    for (const ramp of [...Object.values(divergingPalettes), sequential]) {
      for (const value of ramp) expect(contrastRatio(value, mapBoard.land), value).toBeGreaterThanOrEqual(2.2);
    }
  });
});
