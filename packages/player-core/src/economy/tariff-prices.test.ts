import { describe, expect, it } from "vitest";
import { apply, tariffPacket, tariffPriceStep } from "@admin/engine";
import type { NationId } from "@admin/world";
import { openingCampaign } from "../__fixtures__/opening";
import { appliedTariffPrices, priceStep } from "./tariff-prices";

const base = openingCampaign();
const CHINA = "CHN" as NationId;

describe("a tariff's consumer-price step as the player reads it", () => {
  it("prints the figure the form previewed once the tariff is signed, with how far it has phased in", () => {
    const preview = priceStep(tariffPriceStep(CHINA, "consumer-electronics", 0.25));
    const imposed = tariffPacket(base, CHINA, "consumer-electronics", 0.25, "s301");
    expect(imposed.ok).toBe(true);
    if (!imposed.ok) return;
    const signed = apply(base, imposed.packet);
    const rows = appliedTariffPrices({ ...signed, turn: signed.turn + 3 });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ figure: preview, progress: "3 of 26 weeks in" });
    expect(rows[0]!.label).toBe("25% on consumer electronics from China");
    expect(appliedTariffPrices({ ...signed, turn: signed.turn + 30 })[0]!.progress).toBe("fully passed on to prices");
  });

  it("says a step in points of the price level, and says so when it is too small to print", () => {
    expect(priceStep(0.00031)).toBe("+0.03 pts");
    expect(priceStep(0.00004)).toBe("+under 0.01 pts");
    expect(priceStep(0)).toBe("No measurable change");
  });
});
