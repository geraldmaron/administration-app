import { describe, expect, it } from "vitest";
import { openingCampaign } from "../__fixtures__/opening";
import { foregroundLedger } from "./foreground";
function entry(description, background) {
    return { turn: 1, actor: "world", description, ...(background ? { background } : {}) };
}
describe("foregroundLedger", () => {
    it("drops a background-marked entry and keeps a foreground one from the same phase", () => {
        const opening = openingCampaign();
        const campaign = {
            ...opening,
            ledger: [
                entry("The world's economies move a week.", true),
                entry("The week adds 42 million to the federal debt.", true),
                entry("The rating outlook moves to negative."),
            ],
        };
        const rows = foregroundLedger(campaign).map((row) => row.description);
        expect(rows).toEqual(["The rating outlook moves to negative."]);
    });
    it("keeps every entry when nothing on the ledger is marked background", () => {
        const opening = openingCampaign();
        const campaign = { ...opening, ledger: [entry("An order is signed."), entry("A treaty is ratified.")] };
        expect(foregroundLedger(campaign).map((row) => row.description)).toEqual(["An order is signed.", "A treaty is ratified."]);
    });
});
