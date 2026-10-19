import { describe, expect, it } from "vitest";
import { foundedForBalance } from "./balance-harness.js";
import { apply } from "./effects.js";
import { institutionDef } from "./institutions.js";
import { JUDICIARY_SEAT_INSTITUTIONS, judiciaryBenchSeats } from "./judiciary.js";
import { judicialDeathChance, judicialRetirementChance, judicialVacancyPhase } from "./judicial-vacancies.js";
import { CIRCUIT_SEATS } from "./lower-bench.js";
import { nominationPhase, openNomination, selectNominableFor } from "./nomination.js";
import { withWeeksElapsed } from "./__fixtures__/campaign.js";
function assessYear(campaign, year) {
    let state = { ...campaign, calendar: { ...campaign.calendar, year }, turn: campaign.turn + 52 };
    for (const packet of judicialVacancyPhase(state))
        state = apply(state, packet);
    return state;
}
describe("ordinary judicial vacancies", () => {
    it("opens an anonymous circuit seat once, then seats a Senate-confirmed successor", () => {
        const founding = foundedForBalance("anonymous-circuit-vacancy").campaign;
        const initial = CIRCUIT_SEATS[0];
        expect(founding.institutions[initial.id]?.leader).toBeUndefined();
        expect(founding.institutions[initial.id]?.judicialProvenance?.synthetic).toBe(true);
        let campaign = founding;
        let vacancy = undefined;
        for (let offset = 1; offset <= 8 && !vacancy; offset += 1) {
            campaign = assessYear(campaign, founding.calendar.year + offset);
            vacancy = CIRCUIT_SEATS.find((seat) => campaign.institutions[seat.id]?.vacancy);
        }
        expect(vacancy).toBeDefined();
        if (!vacancy)
            return;
        const emptied = campaign.institutions[vacancy.id];
        expect(emptied.leader).toBeUndefined();
        expect(emptied.judicialAssessmentYear).toBeDefined();
        expect(judicialVacancyPhase(campaign)).toEqual([]);
        const candidate = selectNominableFor(campaign, vacancy.office)[0];
        expect(candidate).toBeDefined();
        if (!candidate)
            return;
        const opened = openNomination(campaign, vacancy.office, candidate.base.id);
        expect(opened.ok).toBe(true);
        if (!opened.ok)
            return;
        campaign = apply(campaign, opened.packet);
        const id = Object.values(campaign.nominations).find((item) => item.office === vacancy.office)?.id;
        for (let week = 0; week < 40 && campaign.nominations[id]?.stage !== "confirmed"; week += 1) {
            campaign = withWeeksElapsed(campaign, 1);
            for (const packet of nominationPhase(campaign))
                campaign = apply(campaign, packet);
        }
        expect(campaign.nominations[id]?.stage).toBe("confirmed");
        expect(campaign.institutions[vacancy.id]?.leader).toBe(candidate.base.id);
        expect(campaign.institutions[vacancy.id]?.vacancy).toBe(false);
        expect(campaign.institutions[vacancy.id]?.lowerBenchSeat?.appointingParty).toBe(campaign.congress.administrationParty);
    });
    it("uses the sourced age curve and requires age plus service for voluntary retirement", () => {
        expect(judicialDeathChance(85)).toBeGreaterThan(judicialDeathChance(65));
        expect(judicialRetirementChance(64, 30, true)).toBe(0);
        expect(judicialRetirementChance(70, 9, true)).toBe(0);
        expect(judicialRetirementChance(70, 10, true)).toBeGreaterThan(judicialRetirementChance(70, 10, false));
    });
    it("seeds synthetic founding history and assesses an occupied seat once per year across save/reload", () => {
        const founding = foundedForBalance("court-annual-once").campaign;
        for (const id of JUDICIARY_SEAT_INSTITUTIONS) {
            expect(founding.institutions[id]?.judicialProvenance?.synthetic).toBe(true);
            expect(founding.institutions[id]?.judicialAssessmentYear).toBe(founding.calendar.year);
        }
        const assessed = assessYear(founding, founding.calendar.year + 1);
        expect(judicialVacancyPhase(assessed)).toEqual([]);
        const restored = JSON.parse(JSON.stringify(assessed));
        expect(judicialVacancyPhase(restored)).toEqual([]);
        expect(assessYear(founding, founding.calendar.year + 1)).toEqual(assessed);
    });
    it("opens a seat in ordinary seeded multi-term play and the existing Senate pipeline can fill it", () => {
        let open;
        let seatId;
        for (let n = 0; n < 36 && !open; n += 1) {
            const founding = foundedForBalance(`court-vacancy-${n}`).campaign;
            let campaign = founding;
            for (let offset = 1; offset <= 8 && !open; offset += 1) {
                campaign = assessYear(campaign, founding.calendar.year + offset);
                const vacancy = JUDICIARY_SEAT_INSTITUTIONS.find((id) => campaign.institutions[id]?.vacancy);
                if (vacancy) {
                    open = campaign;
                    seatId = vacancy;
                }
            }
        }
        expect(open).toBeDefined();
        expect(seatId).toBeDefined();
        const office = institutionDef(seatId).offices[0].id;
        const candidate = selectNominableFor(open, office)[0];
        expect(candidate).toBeDefined();
        const sitting = judiciaryBenchSeats(open).find((seat) => !seat.vacant);
        expect(sitting?.personId).toBeDefined();
        const historical = {
            id: "historical-opinion", order: "order-regulatory-review", question: "A recorded question.",
            ground: "silent", filedTurn: 1, dueTurn: 2, ruledTurn: 3, holding: "upheld",
            votes: [{ justice: sitting.personId, seat: sitting.seat, vote: "uphold" }],
            opinion: { majority: "The recorded judgment remains fixed." },
        };
        const withHistory = { ...open, judiciary: { ...open.judiciary, cases: [...open.judiciary.cases, historical] } };
        const nomination = openNomination(withHistory, office, candidate.base.id);
        expect(nomination.ok).toBe(true);
        if (!nomination.ok)
            return;
        let campaign = apply(withHistory, nomination.packet);
        const nominationId = Object.values(campaign.nominations).find((item) => item.office === office && item.nominee === candidate.base.id)?.id;
        expect(nominationId).toBeDefined();
        for (let week = 0; week < 40; week += 1) {
            campaign = withWeeksElapsed(campaign, 1);
            for (const packet of nominationPhase(campaign))
                campaign = apply(campaign, packet);
            if (campaign.nominations[nominationId]?.stage === "confirmed")
                break;
        }
        expect(campaign.nominations[nominationId]?.stage).toBe("confirmed");
        expect(campaign.institutions[seatId]?.leader).toBe(candidate.base.id);
        expect(campaign.institutions[seatId]?.judicialProvenance?.synthetic).toBeUndefined();
        expect(judiciaryBenchSeats(campaign).find((seat) => JUDICIARY_SEAT_INSTITUTIONS[seat.seat - 1] === seatId)?.vacant).toBe(false);
        expect(campaign.judiciary.cases.at(-1)).toEqual(historical);
        expect(JSON.parse(JSON.stringify(campaign)).judiciary.cases.at(-1)).toEqual(historical);
    });
});
