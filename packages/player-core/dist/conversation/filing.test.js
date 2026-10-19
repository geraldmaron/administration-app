import { describe, expect, it } from "vitest";
import { addDays, apply } from "@admin/engine";
import { openingCampaign } from "../__fixtures__/opening";
import { deferMatterPacket } from "../campaign/stop-brief";
import { formatDate } from "../format/figures";
import { scenarioFiledDate } from "./filing";
const SUBJECT = "A patrol boat boxed in at low tide";
function matter(campaign) {
    return {
        id: "scenario:the-reef-line-at-low-tide",
        source: "scenario",
        urgency: "soft",
        title: SUBJECT,
        reason: "Waiting on your answer.",
        subject: "scenario:foreign-crisis",
        date: campaign.calendar,
    };
}
describe("scenarioFiledDate", () => {
    it("reads today for a decision that has never been put off", () => {
        const campaign = openingCampaign();
        expect(scenarioFiledDate(campaign, SUBJECT)).toEqual(campaign.calendar);
    });
    it("reads the day it was first put off, not the day of a later put-off", () => {
        const opening = openingCampaign();
        const firstPutOff = apply(opening, deferMatterPacket(opening, matter(opening)));
        // The world runs on a fortnight, and the President is asked again and puts
        // it off a second time — the second entry must not shadow the first.
        const later = { ...firstPutOff, calendar: addDays(firstPutOff.calendar, 14) };
        const secondPutOff = apply(later, deferMatterPacket(later, matter(later)));
        expect(scenarioFiledDate(secondPutOff, SUBJECT)).toEqual(opening.calendar);
        expect(scenarioFiledDate(secondPutOff, SUBJECT)).not.toEqual(secondPutOff.calendar);
    });
    it("names no weekday: the label formatDate would print is a bare calendar date", () => {
        const opening = openingCampaign();
        const filed = apply(opening, deferMatterPacket(opening, matter(opening)));
        expect(formatDate(scenarioFiledDate(filed, SUBJECT))).not.toMatch(/mon|tue|wed|thu|fri|sat|sun/i);
    });
    it("is untouched by a put-off filed for a different subject", () => {
        const opening = openingCampaign();
        const other = { ...matter(opening), title: "A different matter entirely" };
        const campaign = apply(opening, deferMatterPacket(opening, other));
        expect(scenarioFiledDate(campaign, SUBJECT)).toEqual(campaign.calendar);
    });
});
