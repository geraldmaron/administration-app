import { describe, expect, it } from "vitest";
import type { NationId } from "@admin/world";
import { openingCampaign } from "../__fixtures__/opening";
import { nationFile } from "./nation-file";
import { bilateralTradePartners } from "./trade-partners";

const opening = openingCampaign({ seedText: "trade-partners" });
const foreign = (Object.keys(opening.nations) as NationId[]).filter((id) => id !== opening.founding.nation);

describe("a country's whole trade", () => {
  it("lists every kind of goods the United States trades with it, ranked by value, with the numbers behind the words", () => {
    const trade = bilateralTradePartners(opening, "MEX" as NationId)!;
    expect(trade.sectors.length).toBeGreaterThan(5);
    const values = trade.sectors.map((sector) => sector.imports + sector.exports);
    expect([...values].sort((a, b) => b - a)).toEqual(values);
    for (const sector of trade.sectors) {
      expect(sector.rollup).toBeTruthy();
      expect(sector.imports + sector.exports).toBeGreaterThan(0);
    }
    expect(trade.imports).toBeGreaterThan(0);
  });

  it("lists every partner the country sends trade to, not the first six", () => {
    const counts = foreign.map((id) => bilateralTradePartners(opening, id)!.partners.length);
    expect(Math.max(...counts)).toBeGreaterThan(6);
  });

  it("keeps the map to six trade lines and the nearest ties however many partners are listed", () => {
    for (const id of foreign.slice(0, 20)) {
      const file = nationFile(opening, id);
      if (!file) continue;
      expect(file.arcs.filter((arc) => arc.kind === "trade").length).toBeLessThanOrEqual(6);
      expect(file.arcs.length).toBeLessThanOrEqual(8);
    }
  });
});
