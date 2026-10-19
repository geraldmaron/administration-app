import { describe, expect, it } from "vitest";
import { CHARTER_USA_CONSTITUTION, US_ID, VICE_PRESIDENT_ROLE_ID, worldDataset } from "@admin/world";
import { foundedForBalance } from "./balance-harness.js";
import { dismissMinister } from "./appointments.js";
import { cabinetConsequencesPhase, selectCabinetExposureFor } from "./cabinet.js";
import { removeOfficer } from "./career-incumbents.js";
import { usPartyOfPerson } from "./cast-fit.js";
import { stateOfBirthplace, stateRegion } from "./cast-home.js";
import { generateFoundingPool, sealFounding } from "./founding.js";
import { VICE_PRESIDENCY_INSTITUTION_ID } from "./institution-catalog.js";
import { defaultLeaderDraft } from "./leader.js";
import { makeCampaignSeed } from "./rng.js";
import { createSave, loadSave } from "./save.js";
import { advanceTurn } from "./turn-loop.js";
import { campaignTurnPhases } from "./turn-phases.js";
import { RUNNING_MATE_SHORTLIST, runningMateCandidates, ticketBalance } from "./vice-president.js";
// The Vice President: elected on the ticket, seated at the oath, never a
// cabinet chair, never dismissed, and never one of the chairs the weekly break
// sweep rolls for.
const PARTIES = ["democrat", "republican", "independent"];
function vicePresidentOf(campaign) {
    const id = campaign.vicePresident;
    if (!id)
        throw new Error("no Vice President was seated");
    return campaign.people[id];
}
describe("the Vice President on the first morning", () => {
    for (const party of PARTIES) {
        it(`is seated for a ${party} President, in their own office and on their own ticket`, () => {
            const { campaign } = foundedForBalance(`vp-seated-${party}`, party);
            const vp = vicePresidentOf(campaign);
            expect(vp.currentRole).toBe(VICE_PRESIDENT_ROLE_ID);
            expect(campaign.institutions[VICE_PRESIDENCY_INSTITUTION_ID].leader).toBe(campaign.vicePresident);
            expect(campaign.institutions[VICE_PRESIDENCY_INSTITUTION_ID].vacancy).toBe(false);
            const vpParty = usPartyOfPerson(vp.base);
            if (party === "independent")
                expect(["independent", campaign.congress.caucusAnchor]).toContain(vpParty);
            else
                expect(vpParty).toBe(party);
        });
    }
    it("is never a cabinet chair, and the charter seats no such chair", () => {
        const { campaign } = foundedForBalance("vp-not-cabinet");
        expect(Object.values(campaign.player.cabinet)).not.toContain(campaign.vicePresident);
        expect(CHARTER_USA_CONSTITUTION.cabinetRoles).not.toContain(VICE_PRESIDENT_ROLE_ID);
    });
    it("holds no seat on the Hill, no gavel and no statehouse", () => {
        const { campaign } = foundedForBalance("vp-not-hill");
        expect(campaign.congress.leadership.map((figure) => figure.person)).not.toContain(campaign.vicePresident);
        const gavels = Object.values(campaign.congress.committees).flatMap((seat) => [seat.chair, seat.ranking]);
        expect(gavels).not.toContain(campaign.vicePresident);
        expect(vicePresidentOf(campaign).state).toBeUndefined();
    });
});
describe("what a President cannot do to a Vice President", () => {
    it("cannot dismiss them, from the cabinet or from their office", () => {
        const { campaign } = foundedForBalance("vp-dismiss");
        expect(dismissMinister(campaign, VICE_PRESIDENT_ROLE_ID).ok).toBe(false);
        expect(removeOfficer(campaign, VICE_PRESIDENCY_INSTITUTION_ID).ok).toBe(false);
    });
    it("never rolls them for a leak, a challenge or a resignation", () => {
        const { campaign } = foundedForBalance("vp-break-rolls");
        const vp = vicePresidentOf(campaign);
        expect(selectCabinetExposureFor(campaign, vp.base.id)).toBeUndefined();
        for (let turn = 1; turn <= 60; turn += 1) {
            const packets = cabinetConsequencesPhase({ ...campaign, turn });
            const named = packets.flatMap((packet) => packet.effects.flatMap((effect) => (effect.kind === "person" ? [effect.person] : [])));
            expect(named).not.toContain(vp.base.id);
            for (const packet of packets)
                expect(packet.narration.summary).not.toContain(vp.base.name);
        }
    });
});
describe("a campaign with no Vice President", () => {
    it("still saves, loads and plays a week", () => {
        const { campaign, charter } = foundedForBalance("vp-absent");
        const { vicePresident: _dropped, ...withoutVp } = campaign;
        const office = withoutVp.institutions[VICE_PRESIDENCY_INSTITUTION_ID];
        const { leader: _leader, ...vacant } = office;
        const absent = {
            ...withoutVp,
            institutions: { ...withoutVp.institutions, [VICE_PRESIDENCY_INSTITUTION_ID]: vacant },
        };
        const loaded = loadSave(JSON.parse(JSON.stringify(createSave(absent))));
        expect(loaded.vicePresident).toBeUndefined();
        const next = advanceTurn(loaded, campaignTurnPhases(charter));
        expect(next.turn).toBe(loaded.turn + 1);
    });
});
describe("the running mate shortlist", () => {
    const seed = makeCampaignSeed("vp-shortlist");
    const pool = generateFoundingPool(seed, worldDataset);
    for (const party of PARTIES) {
        it(`offers a ${party} President only people who can run on their ticket, best-balanced first`, () => {
            const president = {
                party,
                ideology: { economicLeftRight: party === "republican" ? 0.3 : -0.2, authLibertarian: 0, nationalistGlobalist: 0 },
                age: 58,
                homeState: "OH",
            };
            const shortlist = runningMateCandidates(pool, US_ID, president);
            expect(shortlist.length).toBe(RUNNING_MATE_SHORTLIST);
            for (let i = 1; i < shortlist.length; i += 1) {
                expect(shortlist[i - 1].balance).toBeGreaterThanOrEqual(shortlist[i].balance);
            }
            for (const candidate of shortlist) {
                const own = usPartyOfPerson(candidate.person);
                if (party === "independent")
                    expect(own === "independent" || !candidate.crossesTheAisle).toBe(true);
                else
                    expect(own).toBe(party);
            }
        });
    }
    it("prefers a running mate from another part of the country, all else equal", () => {
        const president = {
            party: "democrat",
            ideology: { economicLeftRight: -0.2, authLibertarian: 0, nationalistGlobalist: 0 },
            age: 58,
            homeState: "OH",
        };
        const mate = pool.find((person) => {
            const state = stateOfBirthplace(person.birthplace);
            return state !== undefined && stateRegion(state) !== stateRegion(president.homeState);
        });
        const fromHome = { ...mate, birthplace: "Columbus, Ohio" };
        expect(ticketBalance(president, mate)).toBeGreaterThan(ticketBalance(president, fromHome));
    });
    it("is what the seal takes when the player names nobody", () => {
        const campaign = sealFounding(seed, worldDataset, {
            cabinet: foundedForBalance("vp-shortlist").campaign.founding.cabinet,
            leader: { ...defaultLeaderDraft(), name: "Test Leader" },
        });
        expect(campaign.vicePresident).toBeDefined();
    });
});
