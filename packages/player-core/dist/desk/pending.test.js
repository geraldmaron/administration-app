import { describe, expect, it } from "vitest";
import { addDays, advanceUntilAttention, apply, campaignTurnPhases, daysBetween, openTariffInvestigation, suppliersOf, TRADE_SECTORS } from "@admin/engine";
import { charterOf } from "../campaign/founding-options";
import { openingCampaign } from "../__fixtures__/opening";
import { deskMatterSource, presentedItems } from "./attention";
import { buildCalendar } from "../calendar/build";
import { pendingAbout, pendingHref, selectPending } from "./pending";
function withInvestigation(statute) {
    const opening = openingCampaign({ seedText: "pending" });
    const sector = TRADE_SECTORS.find((entry) => entry.instrument === "tariff" && suppliersOf(opening, entry.id).length > 0);
    const partner = suppliersOf(opening, sector.id)[0].partner;
    const opened = openTariffInvestigation(opening, statute, partner, sector.id);
    if (!opened.ok)
        throw new Error(opened.reason);
    return { campaign: apply(opening, opened.packet), partner, id: opened.finding.id };
}
describe("selectPending", () => {
    it("counts an investigation down on the country it names, from the day it opened", () => {
        const { campaign, partner, id } = withInvestigation("s301");
        const item = pendingAbout(campaign, `nation:${partner}`).find((entry) => entry.id === id);
        expect(item).toBeDefined();
        expect(item.waitingOn).toBe("The Trade Representative");
        expect(item.daysLeft).toBe(daysBetween(campaign.calendar, item.dueDate));
        expect(item.windowDays).toBe(item.daysLeft);
        expect(item.progress).toBe(0);
        expect(item.stops).toBe(true);
        expect(new URL(item.href, "https://example.test").pathname).toBe(`/world/nation/${partner}/act`);
        expect(pendingHref(campaign, id)).toBe(item.href);
    });
    it("puts the finding's due date on the calendar", () => {
        const { campaign, id } = withInvestigation("s301");
        const event = buildCalendar(campaign).find((entry) => entry.id === `pending:${id}`);
        expect(event?.kind).toBe("pending");
        expect(event?.date).toEqual(campaign.trade.findings?.[id]?.dueDate);
    });
    it("puts a goods investigation on every supplier's page", () => {
        const { campaign, id } = withInvestigation("s232");
        const item = selectPending(campaign).find((entry) => entry.id === id);
        expect(item.about.filter((key) => key.startsWith("nation:")).length).toBeGreaterThan(0);
        for (const key of item.about)
            expect(pendingAbout(campaign, key).some((entry) => entry.id === id)).toBe(true);
    });
    it("reads progress against the game's own day counter as time passes", () => {
        const { campaign, id } = withInvestigation("s301");
        const later = { ...campaign, calendar: addDays(campaign.calendar, 14) };
        const item = selectPending(later).find((entry) => entry.id === id);
        expect(item.progress).toBeCloseTo(14 / item.windowDays, 5);
        expect(item.daysLeft).toBe(item.windowDays - 14);
    });
    it("keeps the ambient row out of what holds Continue", () => {
        const { campaign, id } = withInvestigation("s301");
        expect(deskMatterSource(campaign, campaign.calendar).find((matter) => matter.id === id)?.urgency).toBe("ambient");
        expect(presentedItems(campaign).some((item) => item.id === id)).toBe(false);
    });
    it("stops the run once on the day the finding lands, and then lets time run", () => {
        const opened = withInvestigation("s301");
        const id = opened.id;
        // Due within the week, so the run reaches it without simulating half a year.
        const finding = opened.campaign.trade.findings[id];
        const campaign = { ...opened.campaign, trade: { ...opened.campaign.trade, findings: { ...opened.campaign.trade.findings, [id]: { ...finding, dueDate: addDays(opened.campaign.calendar, 3) } } } };
        const run = advanceUntilAttention(campaign, { phases: campaignTurnPhases(charterOf(campaign)), horizonDays: 30 });
        const stop = run.stop.presented.find((matter) => matter.id === id);
        expect(stop?.title).toBe("Section 301 finding");
        expect(run.campaign.trade.findings?.[id]?.outcome).toBeDefined();
        expect(selectPending(run.campaign).some((item) => item.id === id)).toBe(false);
        expect(pendingHref(run.campaign, id)).toBeDefined();
        expect(presentedItems(run.campaign).some((item) => item.id === id)).toBe(false);
        const next = advanceUntilAttention(run.campaign, { phases: campaignTurnPhases(charterOf(run.campaign)), horizonDays: 7 });
        expect(next.stop.presented.some((matter) => matter.id === id)).toBe(false);
    });
});
