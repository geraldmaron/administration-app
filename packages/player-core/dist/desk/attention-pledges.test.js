import { describe, expect, it } from "vitest";
import { addDays, advanceUntilAttention, daysBetween, defaultTurnPhases } from "@admin/engine";
import { openingCampaign } from "../__fixtures__/opening";
import { PLEDGE_WARNING_DAYS, selectDuePledges } from "../record/promises";
import { attentionItems, matterFor } from "./attention";
import { PLEDGE_AHEAD_DAYS, pledgeAheadItem, pledgeItem, pledgeItems } from "./attention-pledges";
const hundredDays = (campaign) => ({
    id: "pledge:first-hundred-days",
    plank: "plank-secure-border",
    madeDate: campaign.calendar,
    dueDate: addDays(campaign.calendar, 100),
    firstHundredDays: true,
    status: "open",
});
describe("a promise coming due", () => {
    it("is a soft matter the Desk raises, dated to the pledge", () => {
        const campaign = openingCampaign();
        const pledge = hundredDays(campaign);
        const row = pledgeItem(campaign, pledge);
        expect(row).toMatchObject({ id: `pledge:${pledge.id}`, source: "pledge", urgency: "soft", dueDate: pledge.dueDate });
        expect(row.figure).toBe("14 weeks");
    });
    it("reads the Record's own selector, so the two lists cannot disagree", () => {
        const campaign = openingCampaign();
        const soft = pledgeItems(campaign).filter((item) => item.urgency === "soft");
        expect(soft).toEqual(selectDuePledges(campaign).map((pledge) => pledgeItem(campaign, pledge)));
        expect(attentionItems(campaign).filter((item) => item.source === "pledge")).toEqual(pledgeItems(campaign));
    });
    it("sits in the week ahead from the first morning, and opens where it is kept", () => {
        const opening = openingCampaign();
        const pledge = hundredDays(opening);
        const campaign = { ...opening, pledges: [pledge] };
        expect(pledgeItems(campaign)).toEqual([pledgeAheadItem(campaign, pledge)]);
        const [ahead] = attentionItems(campaign).filter((item) => item.source === "pledge");
        expect(ahead).toMatchObject({ urgency: "ambient", dueDate: pledge.dueDate, href: "/nation/policy/order/order-border-controls#order-status", title: "A promise is coming up: Secure the border" });
        expect(pledgeItem(campaign, pledge).href).toBe("/nation/policy/order/order-border-controls#order-status");
    });
    it("leaves a promise off the week ahead until it is inside four months", () => {
        const opening = openingCampaign();
        const campaign = { ...opening, pledges: [{ ...hundredDays(opening), dueDate: addDays(opening.calendar, PLEDGE_AHEAD_DAYS + 7) }] };
        expect(pledgeItems(campaign)).toEqual([]);
    });
    it("stops Continue two weeks before the pledge falls due", () => {
        const opening = openingCampaign();
        const pledge = hundredDays(opening);
        const campaign = { ...opening, pledges: [pledge] };
        const result = advanceUntilAttention(campaign, {
            phases: defaultTurnPhases,
            matterSources: [(state, date) => pledgeItems(state).map((item) => matterFor(item, date))],
            horizonDays: 120,
        });
        expect(result.stopReason).toBe("attention");
        expect(result.stop.presented.map((matter) => matter.id)).toEqual([`pledge:${pledge.id}`]);
        expect(daysBetween(result.campaign.calendar, pledge.dueDate)).toBe(PLEDGE_WARNING_DAYS);
    });
});
