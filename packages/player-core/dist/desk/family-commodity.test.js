import { describe, expect, it } from "vitest";
import { openingCampaign } from "../__fixtures__/opening";
import { COMMODITY_EASED, COMMODITY_FACTORIES, commoditySources } from "./family-commodity";
import { seatFamilyCases } from "./family-cases";
import { familySources } from "./family-sources";
// The market model stores `campaign.markets`; until it lands, a fixture writes
// the one field the factories read, through the same narrow shape they read it by.
function withIndex(campaign, commodities) {
    const markets = { commodities: Object.fromEntries(Object.entries(commodities).map(([id, index]) => [id, { index }])) };
    return { ...campaign, markets };
}
const base = openingCampaign();
describe("cases a market raises", () => {
    it("raises nothing while every index sits at its founding 1.0", () => {
        expect(commoditySources(base)).toEqual([]);
    });
    it("raises one case per factory and commodity past its line, hard on the worse band", () => {
        const shocked = withIndex(base, { crude: 1.6, wheat: 1.2, potash: 1.2 });
        const sources = commoditySources(shocked);
        expect(sources.map((source) => source.raise.id.split(":").slice(2, 4).join(":"))).toEqual(["reserve-release:crude", "farm-inputs:potash"]);
        const crude = sources[0];
        expect(crude.row.urgency).toBe("hard");
        expect(crude.row.source).toBe("market-threshold");
        expect(crude.raise.kind).toBe("emergency");
        expect(crude.raise.subject).toEqual({ kind: "commodity", id: "crude" });
        expect(crude.door.href).toBe("/nation/economy?view=markets#economy-commodities");
        expect(crude.row.href).toBe("/nation/economy?view=markets#economy-commodities");
        expect(crude.row.title).not.toMatch(/\$|\d/);
        // Wheat at 1.2 is elevated, and the importers only ask once it is spiking.
        expect(familySources(shocked).some((source) => source.raise.id.includes("allied-supply"))).toBe(false);
    });
    it("keeps one open case through a long shock, and settles it when the market comes back", () => {
        const seated = seatFamilyCases(withIndex(base, { crude: 1.6 }));
        const raised = Object.values(seated.cases ?? {}).filter((item) => item.subject.kind === "commodity");
        expect(raised).toHaveLength(1);
        const weekLater = { ...seated, turn: seated.turn + 1 };
        expect(commoditySources(weekLater)[0]?.raise.id).toBe(raised[0].id);
        const eased = seatFamilyCases(withIndex(weekLater, { crude: 1 }));
        const settled = eased.cases?.[raised[0].id];
        expect(settled?.status).not.toBe("raised");
        expect(settled?.history.at(-1)?.narration).toBe(COMMODITY_EASED);
    });
    it("names every commodity it reads with a price-free title", () => {
        for (const factory of COMMODITY_FACTORIES) {
            for (const commodity of factory.commodities) {
                const title = factory.title(commodity, "spiking");
                expect(title).not.toMatch(/\d/);
            }
        }
    });
});
