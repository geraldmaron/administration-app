import { describe, expect, it } from "vitest";
import { hasIntelOnNation } from "@admin/engine";
import { openingCampaign } from "../__fixtures__/opening";
import { coupItems, marketShockItems } from "./attention-markets";
import { attentionItems } from "./attention";
// A crash stops the clock the week it happens and never after; a coup stops it
// where the services read that government and is logged where they do not.
const base = openingCampaign();
function withEquity(campaign, series) {
    return { ...campaign, markets: { commodities: {}, equity: { level: series.at(-1) ?? 1, series } } };
}
function withCoup(campaign, nation) {
    return {
        ...campaign,
        foreignPolitics: { seats: {}, recent: [{ nation, date: campaign.calendar, kind: "coup" }] },
    };
}
describe("the market-shock row", () => {
    it("is soft in the week the index fell past the line, and on the Desk", () => {
        const crashed = withEquity(base, [1, 1, 0.9]);
        const [row] = marketShockItems(crashed);
        expect(row?.source).toBe("market-shock");
        expect(row?.urgency).toBe("soft");
        expect(row?.title).toBe("Stocks fall 10% in a week");
        // The door opens the room's markets tab, where the crash is drawn.
        expect(row?.href).toBe("/nation/economy?view=markets#economy-markets");
        expect(attentionItems(crashed).some((item) => item.source === "market-shock")).toBe(true);
    });
    it("is gone the week after", () => {
        expect(marketShockItems(withEquity(base, [1, 0.9, 0.9]))).toEqual([]);
        expect(marketShockItems(base)).toEqual([]);
    });
});
describe("the coup row", () => {
    const nations = Object.keys(base.nations).filter((id) => id !== base.founding.nation);
    const read = nations.find((id) => hasIntelOnNation(base, id));
    const unread = nations.find((id) => !hasIntelOnNation(base, id));
    it("pauses where the services read the government", () => {
        expect(read).toBeDefined();
        const [row] = coupItems(withCoup(base, read));
        expect(row?.source).toBe("coup");
        expect(row?.urgency).toBe("soft");
        expect(row?.href).toContain(read);
    });
    it("is logged, never paused, where they do not", () => {
        if (!unread)
            return;
        const [row] = coupItems(withCoup(base, unread));
        expect(row?.urgency).toBe("ambient");
    });
});
