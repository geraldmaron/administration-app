import { describe, expect, it } from "vitest";
import { appointActing, dismissMinister, selectActing, selectAppointableFor } from "./appointments.js";
import { foundedForBalance } from "./balance-harness.js";
import { campaignDay } from "./clock.js";
import { advanceOneDay } from "./day-step.js";
import { apply } from "./effects.js";
import { institutionForRole } from "./institutions.js";
import { openNomination, selectNominableFor, withdrawNomination } from "./nomination.js";
import { selectNominationForOffice } from "./nomination-stages.js";
import { loadSave } from "./save.js";
import { campaignTurnPhases } from "./turn-phases.js";
const TREASURY = "role-treasury-minister";
const INSTITUTION = "INST-TREASURY";
const def = institutionForRole(TREASURY);
const office = def.offices[0].id;
const LIMIT = def.offices[0].actingLimitDays;
const packetOf = (result) => {
    if (!result.ok || !result.packet)
        throw new Error("expected an ok result");
    return result.packet;
};
const runtimeOf = (state) => state.institutions[INSTITUTION];
function vacantTreasury(seed) {
    const { campaign, charter } = foundedForBalance(seed);
    const phases = campaignTurnPhases(charter);
    const dismissed = apply(campaign, packetOf(dismissMinister(campaign, TREASURY)));
    return { dismissed, phases };
}
function stepUntil(state, phases, done, cap = 400) {
    let working = state;
    for (let day = 0; day < cap && !done(working); day += 1)
        working = advanceOneDay(working, phases);
    expect(done(working)).toBe(true);
    return working;
}
const submitted = (state) => Object.values(state.nominations).some((n) => n.office === office && n.history.some((step) => step.stage === "nominated"));
function nominateOnVacancyDay(seed) {
    const { dismissed, phases } = vacantTreasury(seed);
    const acting = selectActing(dismissed, TREASURY);
    const nominee = selectNominableFor(dismissed, office).find((person) => person.base.id !== acting);
    const opened = apply(dismissed, packetOf(openNomination(dismissed, office, nominee.base.id)));
    return { opened, phases, acting: acting, nominee };
}
describe("the acting clock through the scheduler (5 U.S.C. 3346(a)(2), (b))", () => {
    it("tolls for a nomination opened on the vacancy day, restarts on its withdrawal, then lapses at the new deadline", () => {
        const { opened, phases, acting } = nominateOnVacancyDay("w3-acting-calendar");
        const vacancyExpiry = runtimeOf(opened).actingExpiresDay;
        expect(vacancyExpiry).toBeDefined();
        const sent = stepUntil(opened, phases, submitted);
        expect(runtimeOf(sent).actingExpiresDay).toBeUndefined();
        expect(selectActing(sent, TREASURY)).toBe(acting);
        const pending = selectNominationForOffice(sent, office);
        const withdrawn = apply(sent, packetOf(withdrawNomination(sent, pending.id)));
        const restartDay = campaignDay(withdrawn);
        // 3346(a)(1) and (b) are alternatives: the restart never shortens the period the vacancy itself earned.
        const deadline = Math.max(vacancyExpiry, restartDay + LIMIT);
        expect(runtimeOf(withdrawn).actingExpiresDay).toBe(deadline);
        expect(runtimeOf(withdrawn).actingExpiresDay).toBeGreaterThanOrEqual(vacancyExpiry);
        const beforeLapse = stepUntil(withdrawn, phases, (state) => campaignDay(state) >= deadline - 8);
        expect(selectActing(beforeLapse, TREASURY)).toBe(acting);
        const lapsed = stepUntil(beforeLapse, phases, (state) => selectActing(state, TREASURY) === undefined, 30);
        expect(campaignDay(lapsed)).toBeGreaterThanOrEqual(deadline);
    });
    it("gives a replacement acting no deadline while a first nomination is pending", () => {
        const { opened, phases, acting, nominee } = nominateOnVacancyDay("w3-acting-replacement");
        const sent = stepUntil(opened, phases, submitted);
        const replacement = selectAppointableFor(sent, TREASURY, true).find((person) => person.base.id !== acting && person.base.id !== nominee.base.id);
        const swapped = apply(sent, packetOf(appointActing(sent, TREASURY, replacement.base.id)));
        expect(selectActing(swapped, TREASURY)).toBe(replacement.base.id);
        expect(runtimeOf(swapped).actingExpiresDay).toBeUndefined();
    });
    it("restores an acting whose 210 days ran out when a nomination is then submitted", () => {
        const { dismissed, phases } = vacantTreasury("w3-acting-lapsed");
        const lapsed = stepUntil(dismissed, phases, (state) => selectActing(state, TREASURY) === undefined);
        const nominee = selectNominableFor(lapsed, office).at(0);
        const opened = apply(lapsed, packetOf(openNomination(lapsed, office, nominee.base.id)));
        const sent = stepUntil(opened, phases, submitted);
        expect(selectActing(sent, TREASURY)).toBeDefined();
        expect(selectActing(sent, TREASURY)).not.toBe(nominee.base.id);
        expect(runtimeOf(sent).actingExpiresDay).toBeUndefined();
    });
    it("loads a saved nomination that was already pending with the clock tolled", () => {
        const { opened, phases } = nominateOnVacancyDay("w3-acting-old-save");
        const sent = stepUntil(opened, phases, submitted);
        const pending = selectNominationForOffice(sent, office);
        const stale = {
            ...sent,
            nominations: { ...sent.nominations, [pending.id]: { ...pending, stage: "floor-pending" } },
            institutions: { ...sent.institutions, [INSTITUTION]: { ...runtimeOf(sent), vacantDays: 280, actingExpiresDay: 300 } },
        };
        const loaded = loadSave(JSON.parse(JSON.stringify({ schemaVersion: 67, campaign: stale })));
        expect(runtimeOf(loaded).actingExpiresDay).toBeUndefined();
        expect(selectActing(loaded, TREASURY)).toBe(selectActing(sent, TREASURY));
    });
});
