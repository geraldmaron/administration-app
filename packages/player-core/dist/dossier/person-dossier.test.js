import { describe, expect, it } from "vitest";
import { foreignLeaderFor, judiciaryBenchSeats, selectHill } from "@admin/engine";
import { openingCampaign } from "../__fixtures__/opening";
import { cabinetSeats } from "../cabinet/seats";
import { charterOf } from "../campaign/founding-options";
import { personBackground, personDossier } from "./person-dossier";
describe("personDossier", () => {
    const campaign = openingCampaign();
    it("reads the President's own file as the President's", () => {
        const player = cabinetSeats(campaign).find((seat) => seat.isPlayer);
        expect(personDossier(campaign, player.holder.id)?.standing.kind).toBe("president");
    });
    it("reads a seated secretary as the chair they hold, titled by the charter", () => {
        const seat = cabinetSeats(campaign).find((row) => !row.isPlayer && row.holder);
        const standing = personDossier(campaign, seat.holder.id)?.standing;
        expect(standing?.kind).toBe("cabinet");
        if (standing?.kind === "cabinet")
            expect(standing.title).not.toMatch(/^role-/);
    });
    it("reads a sitting justice from the bench, not from the pool", () => {
        const bench = judiciaryBenchSeats(campaign).find((seat) => seat.personId);
        expect(personDossier(campaign, bench.personId)?.standing.kind).toBe("justice");
    });
    it("reads a Hill leader by their post, with the person's own name kept separate", () => {
        const member = selectHill(campaign).find((entry) => entry.person);
        const standing = personDossier(campaign, member.person.id)?.standing;
        expect(standing?.kind).toBe("hill");
        if (standing?.kind === "hill")
            expect(standing.title).toBe(member.post.title);
    });
    it("reads a governor as their state's executive", () => {
        const governor = Object.values(campaign.states).find((state) => state.governor);
        const standing = personDossier(campaign, governor.governor.person)?.standing;
        expect(standing?.kind).toBe("governor");
        if (standing?.kind === "governor")
            expect(standing.stateName).toBe(governor.base.name);
    });
    it("reads a foreign head of government as their country's leader", () => {
        const nation = Object.values(campaign.nations).find((entry) => entry.base.id !== campaign.founding.nation && foreignLeaderFor(campaign, entry.base.id));
        const leader = foreignLeaderFor(campaign, nation.base.id);
        const standing = personDossier(campaign, leader.person)?.standing;
        expect(standing?.kind).toBe("foreign-leader");
    });
    it("titles a foreign leader the way their own country does, not by the player's charter", () => {
        const titleOf = (nation) => {
            const leader = foreignLeaderFor(campaign, nation);
            const standing = personDossier(campaign, leader.person)?.standing;
            return standing?.kind === "foreign-leader" ? standing.title : undefined;
        };
        expect(titleOf("DEU")).toBe("Federal Chancellor");
        expect(titleOf("SAU")).toBe("Crown Prince and Prime Minister");
        expect(titleOf("CHN")).toBe("General Secretary and President");
    });
    it("names the school a person studied at, not its id", () => {
        const seat = cabinetSeats(campaign).find((row) => !row.isPlayer && row.holder);
        const education = personDossier(campaign, seat.holder.id)?.education;
        expect(education?.school).toBeTruthy();
        expect(education?.school).not.toMatch(/^SCH-/);
    });
    it("reads education and eligibility through the same Person-level reader the founding uses", () => {
        const seat = cabinetSeats(campaign).find((row) => !row.isPlayer && row.holder);
        const dossier = personDossier(campaign, seat.holder.id);
        const background = personBackground(campaign.people[seat.holder.id].base, charterOf(campaign).roleTitles);
        expect(dossier.education).toEqual(background.education);
        expect(dossier.eligible).toEqual(background.eligible);
    });
    it("has no file for someone who is not in this campaign", () => {
        expect(personDossier(campaign, "PER-nobody")).toBeUndefined();
    });
});
