import { describe, expect, it } from "vitest";
import { openingCampaign } from "../__fixtures__/opening";
import { rankedFeed } from "./feed-rank";
const campaign = openingCampaign();
function item(partial) {
    return { turn: 1, kind: "drift", visibility: "public", headline: "x", ...partial };
}
describe("the front page's rank", () => {
    it("is a pure reordering: the same items, none dropped, none invented", () => {
        const items = [item({ headline: "a", kind: "press" }), item({ headline: "b", kind: "conflict" }), item({ headline: "c", kind: "drift" })];
        const ranked = rankedFeed(campaign, items);
        expect(ranked).toHaveLength(items.length);
        expect(new Set(ranked)).toEqual(new Set(items));
    });
    it("ranks a conflict above a drift item, deterministically across repeated calls", () => {
        const items = [item({ headline: "drift", kind: "drift" }), item({ headline: "war", kind: "conflict" })];
        const first = rankedFeed(campaign, items);
        const second = rankedFeed(campaign, items);
        expect(first.map((entry) => entry.headline)).toEqual(["war", "drift"]);
        expect(first.map((entry) => entry.headline)).toEqual(second.map((entry) => entry.headline));
    });
    it("keeps the feed's own order between two items that rank equal", () => {
        const items = [item({ headline: "first", kind: "drift" }), item({ headline: "second", kind: "drift" })];
        expect(rankedFeed(campaign, items).map((entry) => entry.headline)).toEqual(["first", "second"]);
    });
});
