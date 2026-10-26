import { describe, expect, it } from "vitest";
import { VICE_PRESIDENCY_INSTITUTION_ID } from "@admin/engine";
import { WHITE_HOUSE_ROLE_TITLES } from "@admin/world";
import { openingCampaign } from "../__fixtures__/opening";
import { cabinetSeats } from "../cabinet/seats";
import { whiteHouseSeatOf, whiteHouseSeats } from "./machine-white-house";
const campaign = openingCampaign();
describe("the White House around the President", () => {
    it("reads the Vice President first, then the three staff posts the founding filled", () => {
        const seats = whiteHouseSeats(campaign);
        expect(seats.map((seat) => seat.role)).toEqual([
            "role-vice-president",
            "role-chief-of-staff",
            "role-national-security-adviser",
            "role-press-secretary",
        ]);
        expect(seats[0]?.holder?.id).toBe(campaign.vicePresident);
        expect(seats[0]?.tenure).toBe("elected");
        for (const seat of seats.slice(1)) {
            expect(seat.tenure).toBe("appointed");
            expect(seat.holder?.id).toBe(campaign.founding.staff?.[seat.role]);
        }
        for (const seat of seats)
            expect(seat.title).toBe(WHITE_HOUSE_ROLE_TITLES[seat.role]);
    });
    it("reads a Vice President confirmed after a vacancy as confirmed, not elected", () => {
        const id = campaign.vicePresident;
        const nomination = {
            id: "OFF-VP:1", office: "OFF-VP", institution: VICE_PRESIDENCY_INSTITUTION_ID, nominee: id, stage: "sworn-in",
            stageEnteredDay: 1, openedDay: 1, controversies: [], history: [],
        };
        const seated = { ...campaign, nominations: { ...campaign.nominations, [nomination.id]: nomination } };
        expect(whiteHouseSeats(seated)[0]?.tenure).toBe("confirmed");
    });
    it("never names a cabinet chair as White House staff", () => {
        const cabinet = new Set(cabinetSeats(campaign).flatMap((seat) => (seat.holder ? [seat.holder.id] : [])));
        for (const seat of whiteHouseSeats(campaign)) {
            expect(seat.holder).toBeDefined();
            expect(cabinet.has(seat.holder.id)).toBe(false);
        }
    });
    it("finds the post a person holds, and nothing for anyone else", () => {
        const vicePresident = campaign.vicePresident;
        expect(whiteHouseSeatOf(campaign, vicePresident)?.title).toBe("Vice President");
        const secretary = cabinetSeats(campaign).find((seat) => seat.holder && !seat.isPlayer).holder;
        expect(whiteHouseSeatOf(campaign, secretary.id)).toBeUndefined();
    });
    it("keeps every post on the board for a campaign with no Vice President and no staff", () => {
        const { vicePresident: _vicePresident, ...rest } = campaign;
        const bare = { ...rest, founding: { ...campaign.founding, staff: {} } };
        const seats = whiteHouseSeats(bare);
        expect(seats).toHaveLength(4);
        expect(seats.every((seat) => seat.holder === undefined)).toBe(true);
    });
    it("does not seat someone who has died", () => {
        const id = campaign.vicePresident;
        const runtime = campaign.people[id];
        const mourning = { ...campaign, people: { ...campaign.people, [id]: { ...runtime, alive: false } } };
        expect(whiteHouseSeats(mourning)[0]?.holder).toBeUndefined();
        expect(whiteHouseSeatOf(mourning, id)).toBeUndefined();
    });
});
