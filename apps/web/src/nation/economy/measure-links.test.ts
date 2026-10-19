import { describe, expect, it } from "vitest";
import { COMMODITY_IDS } from "@admin/engine";
import { ECONOMY_MEASURE_VIEW, RELEASE_HREF, isEconomyMeasure, place } from "@admin/player-core";
import { isEconomyView } from "./EconomyScreen";

const search = (href: string) => new URL(href, "https://administration.test");

describe("economy measure links", () => {
  it("opens release links on a supported economy view and measure", () => {
    for (const href of Object.values(RELEASE_HREF)) {
      const url = search(href);
      expect(url.pathname).toBe("/nation/economy");
      expect(isEconomyMeasure(url.searchParams.get("measure"))).toBe(true);
      expect(isEconomyView(url.searchParams.get("view") ?? "overview")).toBe(true);
    }
  });

  it("sends every rate, the Fed and every commodity to the economy view that draws it", () => {
    for (const id of ["inflation", "unemployment", "growth", "policy-rate", ...COMMODITY_IDS] as const) {
      expect(place.metric(id)).toBe(place.economyMeasure(id, ECONOMY_MEASURE_VIEW[id]));
      expect(isEconomyView(ECONOMY_MEASURE_VIEW[id])).toBe(true);
    }
  });
});
