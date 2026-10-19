import { describe, expect, it } from "vitest";
import { EXTENSION_OPENS_DAYS, apply, joinConflict, openConflict } from "@admin/engine";
import { openingCampaign } from "../__fixtures__/opening";
import { extensionGrounds, extensionNotices } from "../congress/congress-acts";
import { attentionItems } from "../desk/attention";
import { place } from "../navigation/places";
import { countryWarPowers, warPowersHome } from "./war-powers-home";
const RUS = "RUS";
const UKR = "UKR";
/** The United States in Ukraine's war against Russia, without a vote, so the sixty days run. */
function atWar() {
    const opening = openingCampaign({ seedText: "war-powers-home" });
    const conflict = openConflict(RUS, UKR, opening.turn, "Russia invades Ukraine.");
    const campaign = { ...opening, conflicts: { ...opening.conflicts, [conflict.id]: conflict } };
    const joined = joinConflict(campaign, campaign.founding.nation, conflict.id, "defender");
    if (!joined.ok)
        throw new Error(joined.reason);
    return { campaign: apply(campaign, joined.packet), war: conflict.id };
}
/** The same force still on the clock after the war it was part of has ended. */
function warOver() {
    const { campaign, war } = atWar();
    const conflict = campaign.conflicts[war];
    return { ...campaign, conflicts: { ...campaign.conflicts, [war]: { ...conflict, status: "settled" } } };
}
describe("where a War Powers matter is decided", () => {
    it("is the war the force belongs to, opened on its War Powers section", () => {
        const { campaign, war } = atWar();
        expect(warPowersHome(campaign, RUS)).toBe(`${place.war(war)}#war-powers`);
    });
    it("is the target's security view when no war is running", () => {
        expect(warPowersHome(warOver(), RUS)).toBe("/world/nation/RUS?view=security#war-powers");
    });
    it("is where the Desk's unauthorized-force row and the Congress notice both point", () => {
        const { campaign } = atWar();
        const row = attentionItems(campaign).find((item) => item.subject === "war-powers");
        expect(row?.href).toBe(warPowersHome(campaign, RUS));
        expect(extensionNotices(campaign).map((notice) => notice.home)).toEqual([warPowersHome(campaign, RUS)]);
    });
});
describe("the country file's War Powers paper", () => {
    it("hands off to the war while one is running", () => {
        const { campaign, war } = atWar();
        const reading = countryWarPowers(campaign, RUS);
        expect(reading.papers).toHaveLength(1);
        expect(reading.war).toBe(`${place.war(war)}#war-powers`);
    });
    it("carries the paper itself, with Congress not yet asked, once the war is over and the clock still runs", () => {
        const reading = countryWarPowers(warOver(), RUS);
        expect(reading.war).toBeUndefined();
        expect(reading.papers).toHaveLength(1);
        expect(reading.papers[0]?.withdrawal).toBeDefined();
        expect(reading.papers[0]?.authorization.state).toBe("open");
    });
});
describe("the thirty-day extension", () => {
    it("says when it opens, and what to do until then, while the clock is young", () => {
        const { campaign } = atWar();
        const [notice] = extensionNotices(campaign);
        expect(notice.daysLeft).toBeGreaterThan(EXTENSION_OPENS_DAYS);
        expect(notice.refusal).toBe(`You can ask for the extension when ${EXTENSION_OPENS_DAYS} days are left, which is ${notice.daysLeft - EXTENSION_OPENS_DAYS} days from now. Until then, you can ask Congress to approve the mission or bring your forces home.`);
    });
    it("reads back the ground the President certified, instead of offering it again", () => {
        const { campaign } = atWar();
        const [open] = extensionNotices(campaign);
        const ground = extensionGrounds(open.target)[1].value;
        const certified = {
            ...campaign,
            security: {
                ...campaign.security,
                warPowers: {
                    ...campaign.security.warPowers,
                    obligations: campaign.security.warPowers.obligations.map((obligation) => (obligation.id === open.id ? { ...obligation, extension: { certifiedDay: obligation.openedDay, necessity: ground } } : obligation)),
                },
            },
        };
        const [notice] = extensionNotices(certified);
        expect(notice.certified).toBe(ground);
        expect(notice.refusal).toBeUndefined();
    });
    it("is certified on one of a fixed set of grounds, with the target named", () => {
        const grounds = extensionGrounds("Ghana");
        expect(grounds.length).toBeGreaterThan(1);
        expect(grounds.some((ground) => ground.value.includes("Ghana"))).toBe(true);
        expect(grounds.every((ground) => ground.value === ground.label)).toBe(true);
    });
});
