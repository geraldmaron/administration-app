import { describe, expect, it } from "vitest";
import { TRANSITION_WEEKS, apply, departingFlag, dismissMinister, flagMarker, institutionForRole, openNomination, selectNominationForOffice, } from "@admin/engine";
import { openingCampaign } from "../__fixtures__/opening";
import { cabinetSeats } from "./seats";
import { seatLever } from "./roster-row";
// A held chair reads the same bench a vacancy does. The bench is only
// honest if every name on it is one `openNomination` would actually accept
// once the chair opens — never "everyone eligible," which could offer a name
// the nomination path refuses for a reason the bench never showed.
/** The office a role's seat nominates through, the one the appointments desk sends. */
function officeOf(campaign, role) {
    const institution = institutionForRole(role);
    const office = institution?.offices[0]?.id;
    if (!office)
        throw new Error(`${role} resolves to no office`);
    return office;
}
describe("a held chair's bench", () => {
    it("excludes the holder", () => {
        const campaign = openingCampaign();
        for (const seat of cabinetSeats(campaign)) {
            if (!seat.holder)
                continue;
            expect(seat.candidates.some((candidate) => candidate.id === seat.holder.id)).toBe(false);
        }
    });
    it("dry-runs openNomination for every bench name once the chair is emptied, and expects no refusal but the chair itself", () => {
        const campaign = openingCampaign();
        // At least one held seat carries a bench on the founding roster, or this
        // test is proving nothing — a seed with an empty bench everywhere would
        // pass by construction.
        let checked = 0;
        for (const seat of cabinetSeats(campaign)) {
            if (seat.isPlayer || !seat.holder || seat.candidates.length === 0)
                continue;
            const role = seat.role;
            const office = officeOf(campaign, role);
            const dismissal = dismissMinister(campaign, role);
            if (!dismissal.ok)
                continue; // The head of state's own chair, or one already empty.
            const emptied = apply(campaign, dismissal.packet);
            expect(selectNominationForOffice(emptied, office)).toBeUndefined();
            for (const candidate of seat.candidates.slice(0, 3)) {
                checked += 1;
                const result = openNomination(emptied, office, candidate.id);
                expect(result.ok, `${seat.role}: ${candidate.name} — ${result.ok ? "" : result.reason}`).toBe(true);
            }
        }
        expect(checked).toBeGreaterThan(0);
    });
});
describe("a chair being handed on", () => {
    const ENERGY = "role-energy-secretary";
    function announcing() {
        const founding = openingCampaign();
        const flag = departingFlag(ENERGY, founding.player.cabinet[ENERGY]);
        return { ...founding, player: { ...founding.player, flags: { ...founding.player.flags, [flag]: true, [flagMarker(flag, founding.turn)]: true } } };
    }
    const seatFor = (campaign) => cabinetSeats(campaign).find((seat) => seat.role === ENERGY);
    it("asks for a successor while the Secretary serves out the transition", () => {
        const seat = seatFor(announcing());
        expect(seat.holder).toBeDefined();
        expect(seat.departing).toEqual({ weeksLeft: TRANSITION_WEEKS, successorPending: false });
        expect(seatLever(seat)).toMatchObject({ kind: "shortlist", label: expect.stringMatching(/Name a successor/) });
    });
    it("reads the successor's nomination once one is before the Senate", () => {
        const campaign = announcing();
        const nominee = seatFor(campaign).candidates[0].id;
        const sent = openNomination(campaign, officeOf(campaign, ENERGY), nominee);
        if (!sent.ok)
            throw new Error(sent.reason);
        const seat = seatFor(apply(campaign, sent.packet));
        expect(seat.departing?.successorPending).toBe(true);
        expect(seat.nomination).toBeDefined();
        expect(seatLever(seat).kind).toBe("waiting");
    });
    it("carries no departure for a Secretary who has announced nothing", () => {
        expect(seatFor(openingCampaign()).departing).toBeUndefined();
    });
});
