import { describe, expect, it } from "vitest";
import { defaultFlagDesign, worldDataset } from "@admin/world";
import { makeCampaignSeed } from "./rng.js";
import { draftCabinetCandidates, generateFoundingPool, sealFounding } from "./founding.js";
import { defaultLeaderDraft } from "./leader.js";
import { COMMITTEE_IDS, COMMITTEE_NAMES, committeeDisposition, committeeName, committeePanel, panelBalance, seatCommittees, } from "./committees.js";
import { INSTITUTION_CATALOG } from "./institution-catalog.js";
import { apply } from "./effects.js";
import { openNomination, selectNominableFor, selectCommitteeDockets } from "./nomination.js";
import { stageDuration } from "./nomination-stages.js";
import { dismissMinister } from "./appointments.js";
import { officeInstitution } from "./institutions.js";
import { createSave, loadSave } from "./save.js";
const seed = makeCampaignSeed("committee-seed");
// A founded campaign rather than a fixture: the claim under test is that the
// panels are seated out of the cast the founding actually deals.
function foundedCampaign() {
    const pool = generateFoundingPool(seed, worldDataset);
    const nation = worldDataset.nations.find((n) => n.playable);
    const charter = worldDataset.charters[0];
    const cradle = worldDataset.cradles.find((c) => c.startingNeighbors.length > 0);
    const cabinet = Object.fromEntries(Object.entries(draftCabinetCandidates(charter, nation.id, pool)).map(([role, people]) => [role, people[0].id]));
    const choices = {
        nationId: nation.id,
        nationName: nation.identity.name,
        name: "Test President",
        title: "President",
        charterId: charter.id,
        cradleId: cradle.id,
        flag: defaultFlagDesign,
        compactIds: [],
        cabinet,
        leader: { ...defaultLeaderDraft(), name: "Test President" },
    };
    return sealFounding(seed, worldDataset, choices);
}
const campaign = foundedCampaign();
describe("the committees the catalog already refers to", () => {
    it("takes its ids off the catalog rather than a second list of them", () => {
        const fromCatalog = new Set(INSTITUTION_CATALOG.flatMap((institution) => institution.offices.flatMap((office) => (office.committee ? [office.committee] : []))));
        expect([...COMMITTEE_IDS].sort()).toEqual([...fromCatalog].sort());
        expect(COMMITTEE_IDS).toHaveLength(13);
    });
    it("names every one of them, never falling back to a raw id", () => {
        for (const id of COMMITTEE_IDS) {
            expect(COMMITTEE_NAMES[id], `${id} is unnamed`).toBeDefined();
            expect(committeeName(id)).not.toMatch(/^CMTE-/);
        }
    });
});
describe("seating them", () => {
    it("seats a chair and a ranking member on every committee, from the campaign's own cast", () => {
        for (const id of COMMITTEE_IDS) {
            const seat = campaign.congress.committees[id];
            expect(seat, `${id} unseated`).toBeDefined();
            expect(seat.chair).toBeDefined();
            expect(seat.ranking).toBeDefined();
            expect(campaign.people[seat.chair]?.base.nationality).toBe(campaign.founding.nation);
            expect(campaign.people[seat.ranking]?.base.nationality).toBe(campaign.founding.nation);
        }
    });
    it("seats nobody twice, and nobody who already holds a leadership post", () => {
        const onLeadership = new Set(campaign.congress.leadership.map((figure) => figure.person));
        const seated = Object.values(campaign.congress.committees).flatMap((seat) => [seat.chair, seat.ranking].flatMap((person) => (person ? [person] : [])));
        expect(new Set(seated).size).toBe(seated.length);
        for (const person of seated)
            expect(onLeadership.has(person)).toBe(false);
    });
    it("records the seat on the person, so the cast knows who sits on a committee", () => {
        for (const seat of Object.values(campaign.congress.committees)) {
            expect(campaign.people[seat.chair]?.currentRole).toBe("role-committee-chair");
        }
    });
    it("is idempotent: reseating an already-seated Congress moves nobody", () => {
        const again = seatCommittees(campaign.congress, campaign.people, campaign.founding.nation, campaign.turn + 20);
        expect(again).toEqual(campaign.congress.committees);
    });
    it("deals the same panels for the same seed", () => {
        expect(foundedCampaign().congress.committees).toEqual(campaign.congress.committees);
    });
    it("hands the gavel to the ranking member when the chamber changes hands", () => {
        const seat = campaign.congress.committees["CMTE-ARMED"];
        const flipped = {
            ...campaign.congress,
            committees: {
                ...campaign.congress.committees,
                "CMTE-ARMED": {
                    ...seat,
                    chairCaucus: seat.chairCaucus === "administration" ? "opposition" : "administration",
                },
            },
        };
        const reseated = seatCommittees(flipped, campaign.people, campaign.founding.nation, campaign.turn)["CMTE-ARMED"];
        expect(reseated.chair).toBe(seat.ranking);
        expect(reseated.ranking).toBe(seat.chair);
    });
    it("carries the chamber's own balance onto every panel", () => {
        const balance = panelBalance(campaign.congress);
        for (const seat of Object.values(campaign.congress.committees))
            expect(seat.balance).toBe(balance);
        expect(balance).toBeGreaterThan(0);
        expect(balance).toBeLessThan(1);
    });
});
describe("what a panel is disposed to", () => {
    it("differs between committees, because the members differ", () => {
        const readings = new Set(COMMITTEE_IDS.map((id) => committeeDisposition(campaign, id)));
        expect(readings.size).toBeGreaterThan(1);
    });
    it("stays near the room rather than replacing it", () => {
        for (const id of COMMITTEE_IDS) {
            const gap = Math.abs(committeeDisposition(campaign, id) - campaign.congress.disposition);
            expect(gap).toBeLessThan(0.12);
        }
    });
    it("is the room's own disposition for an unrouted measure, and for an unseated panel", () => {
        expect(committeeDisposition(campaign, undefined)).toBe(campaign.congress.disposition);
        const bare = { ...campaign, congress: { ...campaign.congress, committees: {} } };
        expect(committeeDisposition(bare, "CMTE-ARMED")).toBe(campaign.congress.disposition);
    });
    it("sits below the room when the other caucus holds the gavel", () => {
        const seat = campaign.congress.committees["CMTE-ARMED"];
        const flipped = {
            ...campaign,
            congress: {
                ...campaign.congress,
                committees: {
                    ...campaign.congress.committees,
                    "CMTE-ARMED": {
                        ...seat,
                        chairCaucus: seat.chairCaucus === "administration" ? "opposition" : "administration",
                    },
                },
            },
        };
        const friendly = committeeDisposition(campaign, "CMTE-ARMED");
        const hostile = committeeDisposition(flipped, "CMTE-ARMED");
        expect(Math.sign(friendly - campaign.congress.disposition)).toBe(-Math.sign(hostile - campaign.congress.disposition));
    });
    it("reads the chair and the ranking member as the two members they are", () => {
        const panel = committeePanel(campaign, "CMTE-ARMED");
        expect(panel.chairDisposition).toBeDefined();
        expect(panel.rankingDisposition).toBeDefined();
        expect(panel.chairDisposition).not.toBe(panel.rankingDisposition);
        expect(panel.name).toBe("Committee on Armed Services");
    });
});
describe("what the panels reach", () => {
    function withNomination(state, office) {
        // A name is only sent up for an empty chair, so the sitting Secretary goes first.
        const role = officeInstitution(office)?.cabinetRole;
        const dismissed = role ? dismissMinister(state, role) : undefined;
        const open = dismissed?.ok ? apply(state, dismissed.packet) : state;
        const candidate = selectNominableFor(open, office)[0];
        const result = openNomination(open, office, candidate.base.id);
        if (!result.ok)
            throw new Error(result.reason);
        return apply(open, result.packet);
    }
    it("stretches a committee stage by the panel rather than by the room", () => {
        const nominated = withNomination(campaign, "OFF-DEFENSE-SEC");
        const nomination = Object.values(nominated.nominations)[0];
        const inCommittee = { ...nomination, stage: "hearing-scheduled" };
        const roomOnly = { ...inCommittee, committee: undefined };
        const panel = committeeDisposition(nominated, "CMTE-ARMED");
        // The two readings differ, so the two durations must: a stage that took the
        // same number of days either way would be the panel reaching nothing.
        expect(panel).not.toBe(nominated.congress.disposition);
        expect(stageDuration(nominated, inCommittee)).not.toBe(stageDuration(nominated, roomOnly));
    });
    it("gives the pending-before-a-committee selector its callers", () => {
        const nominated = withNomination(campaign, "OFF-DEFENSE-SEC");
        const dockets = selectCommitteeDockets(nominated);
        expect(dockets).toHaveLength(COMMITTEE_IDS.length);
        const armed = dockets.find((docket) => docket.panel.committee === "CMTE-ARMED");
        expect(armed.pending.map((nomination) => nomination.office)).toEqual(["OFF-DEFENSE-SEC"]);
        expect(dockets.filter((docket) => docket.pending.length > 0)).toHaveLength(1);
    });
});
describe("bringing a save forward", () => {
    it("round-trips a current save without reseating anybody", () => {
        const loaded = loadSave(createSave(campaign));
        expect(loaded.congress.committees).toEqual(campaign.congress.committees);
    });
});
