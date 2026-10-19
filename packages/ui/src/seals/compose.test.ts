import { describe, expect, it } from "vitest";
import { SEAL_PALETTE } from "../theme/seal-palette";
import { COMPACT_BELOW, composeSeal, type SealElement } from "./compose";
import { DEVICES } from "./devices";
import type { SealSpec } from "./types";

const TREASURY: SealSpec = {
  id: "INST-TREASURY",
  shape: "roundel",
  field: "forest",
  rim: "gold",
  ring: { text: "DEPARTMENT OF THE TREASURY · UNITED STATES OF AMERICA", color: "gold" },
  device: "scales",
  deviceColor: "gold",
  charge: { device: "key", color: "gold", field: "forest" },
  accents: { stars: 13 },
};

function flat(elements: readonly SealElement[]): readonly SealElement[] {
  return elements.flatMap((e) => (e.kind === "group" ? flat(e.children) : [e]));
}

const texts = (elements: readonly SealElement[]) => flat(elements).filter((e) => e.kind === "text");

describe("device drawings", () => {
  it("draw every device but the lettered one, with finite coordinates on the 100 grid", () => {
    for (const [id, drawing] of Object.entries(DEVICES)) {
      if (id === "monogram") continue;
      expect(drawing.parts.length, id).toBeGreaterThan(0);
      for (const part of drawing.parts) {
        const numbers = part.d.match(/-?\d+(\.\d+)?/g)?.map(Number) ?? [];
        expect(part.d, id).not.toMatch(/NaN|undefined/);
        // Relative commands (the circle helper's arcs) carry offsets, not positions; only absolute paths are bounded.
        const absolute = !/[a-z]/.test(part.d);
        expect(numbers.every((n) => Number.isFinite(n) && (!absolute || (n >= -10 && n <= 110))), `${id}: ${part.d.slice(0, 60)}`).toBe(true);
      }
    }
  });
});

describe("composeSeal", () => {
  it("sets the legend one glyph per letter, over the top and along the bottom", () => {
    const glyphs = texts(composeSeal(TREASURY, 160));
    expect(glyphs.map((g) => (g.kind === "text" ? g.text : "")).join("")).toBe("DEPARTMENTOFTHETREASURYUNITEDSTATESOFAMERICA");
  });

  it("drops the legend and ornaments below the compact size and keeps the device", () => {
    const compact = composeSeal(TREASURY, COMPACT_BELOW - 1);
    expect(texts(compact)).toHaveLength(0);
    expect(compact.some((e) => e.kind === "group")).toBe(true);
  });

  it("sets a lettered device's monogram in place of a drawing", () => {
    const eu: SealSpec = { id: "ORG-EU", shape: "roundel", field: "federalBlue", rim: "gold", device: "monogram", deviceColor: "gold", monogram: "EU", accents: { stars: 12 } };
    expect(texts(composeSeal(eu, 24)).map((t) => (t.kind === "text" ? t.text : ""))).toEqual(["EU"]);
  });

  it("bears a charge on an escutcheon over the device", () => {
    const device = composeSeal(TREASURY, 160).find((e) => e.kind === "group");
    expect(device?.kind === "group" ? device.children.filter((c) => c.kind === "group") : []).toHaveLength(1);
  });

  it("names only colors the palette resolves", () => {
    const keys = flat(composeSeal(TREASURY, 160)).flatMap((e) => (e.kind === "path" ? [e.fill, e.stroke] : e.kind === "text" ? [e.color] : []));
    for (const key of keys.filter((k): k is string => k !== undefined)) expect(key in SEAL_PALETTE, key).toBe(true);
  });

  it("draws every shape", () => {
    for (const shape of ["roundel", "shield", "star", "masthead", "rosette", "octagon"] as const) {
      const outline = composeSeal({ ...TREASURY, shape }, 160)[0];
      expect(outline?.kind === "path" ? outline.d : "", shape).toMatch(/^M[\d.]+,[\d.]+/);
    }
  });
});
