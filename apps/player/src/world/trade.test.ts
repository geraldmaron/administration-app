import { describe, expect, it } from "vitest";
import { barPercent, rowsToShow, tradeGlyph, tradeScale } from "./trade";

const row = (sector: string, imports: number, exports: number) => ({ sector, rollup: "steel-heavy" as const, imports, exports });

describe("the shared scale of paired trade bars", () => {
  it("measures every bar, buying and selling, against the widest figure on the screen", () => {
    const rows = [row("a", 40_000, 5_000), row("b", 10_000, 80_000)];
    expect(tradeScale(rows)).toBe(80_000);
    expect(barPercent(40_000, 80_000)).toBe(50);
    expect(barPercent(80_000, 80_000)).toBe(100);
  });

  it("never draws a real figure as nothing, and never draws nothing as a figure", () => {
    expect(barPercent(1, 1_000_000)).toBe(2);
    expect(barPercent(0, 1_000_000)).toBe(0);
    expect(tradeScale([])).toBe(1);
  });
});

describe("keeping the picked goods in view", () => {
  const rows = Array.from({ length: 20 }, (_, index) => row(`s${index}`, 100 - index, 0));

  it("shows the first rows when nothing is picked", () => {
    expect(rowsToShow(rows, 8, undefined)).toBe(8);
  });

  it("stretches the first view to reach a pick ranked below it", () => {
    expect(rowsToShow(rows, 8, "s14")).toBe(15);
    expect(rowsToShow(rows, 8, "s2")).toBe(8);
    expect(rowsToShow(rows, 8, "nope")).toBe(8);
  });
});

describe("the mark a kind of goods wears", () => {
  it("gives a commodity its own mark and every other goods its dataset sector's", () => {
    expect(tradeGlyph({ sector: "energy-crude", rollup: "energy-oil" })).toBe("commodityCrudeOil");
    expect(tradeGlyph({ sector: "steel", rollup: "steel-heavy" })).toBe("sectorSteelHeavy");
  });
});
