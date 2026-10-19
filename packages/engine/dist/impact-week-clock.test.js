import { describe, expect, it } from "vitest";
import { buildCampaign, nationA } from "./__fixtures__/campaign.js";
import { addDays, CAMPAIGN_OPENING_DATE, daysBetween, weekCloseDate } from "./clock.js";
import { cyberImpactEvent } from "./impact-adapters.js";
import { advanceImpactEvents, applyImpactEvent } from "./impact-lifecycle.js";
const opening = buildCampaign();
function onDay(day) {
    return { ...opening, calendar: addDays(CAMPAIGN_OPENING_DATE, day) };
}
/** The operators phase files a cyber crew's attack on the given day of the first week. */
function attackedOn(day) {
    const campaign = onDay(day);
    const [effect] = cyberImpactEvent(campaign, nationA.id, "operator:test-crew");
    return applyImpactEvent(campaign, effect);
}
/** Steps the calendar a day at a time, the way `day-step.ts` advances incidents. */
function stepThrough(campaign, lastDay) {
    const from = daysBetween(CAMPAIGN_OPENING_DATE, campaign.calendar);
    let current = campaign;
    for (let day = from + 1; day <= lastDay; day += 1) {
        current = advanceImpactEvents({ ...current, calendar: addDays(CAMPAIGN_OPENING_DATE, day) });
    }
    return current;
}
describe("the impact-event clock under the office-day cut", () => {
    it("dates a weekly phase's clock to the day the week closes", () => {
        expect(weekCloseDate(onDay(0))).toEqual(CAMPAIGN_OPENING_DATE);
        expect(weekCloseDate(onDay(1))).toEqual(addDays(CAMPAIGN_OPENING_DATE, 7));
        expect(weekCloseDate(onDay(4))).toEqual(addDays(CAMPAIGN_OPENING_DATE, 7));
        expect(weekCloseDate(onDay(7))).toEqual(addDays(CAMPAIGN_OPENING_DATE, 7));
        expect(weekCloseDate(onDay(8))).toEqual(addDays(CAMPAIGN_OPENING_DATE, 14));
    });
    it.each([1, 3, 6])("runs a cyber incident opened on office day %i the same days as the one-shot week", (day) => {
        const flat = stepThrough(attackedOn(7), 12);
        const laid = stepThrough(attackedOn(day), 12);
        expect(laid.impactEvents).toEqual(flat.impactEvents);
        const wire = (campaign) => campaign.feed.map((item) => ({ headline: item.headline, date: item.date }));
        expect(wire(laid)).toEqual(wire(flat));
    });
    it("holds an incident unstepped until the week closes", () => {
        const opened = attackedOn(3);
        const midweek = stepThrough(opened, 7);
        const event = Object.values(midweek.impactEvents ?? {})[0];
        expect(event.started).toEqual(addDays(CAMPAIGN_OPENING_DATE, 7));
        expect(event.elapsedDays).toBe(0);
        expect(event.reports).toHaveLength(0);
    });
});
