import { describe, expect, it } from "vitest";
import { STATE_IDS } from "@admin/world";
import { buildCampaign, withWeeksElapsed } from "./__fixtures__/campaign.js";
import { apply } from "./effects.js";
import { DOMESTIC_ACTS } from "./legislative-acts-domestic.js";
import { legislativeAct } from "./legislative-acts.js";
import { billsOnTheAgenda, signBill, transmit, transmittableActs, vetoBill } from "./legislation.js";
import { lawRestingOffset, lawShift } from "./law-offsets.js";
import { TURNS_PER_YEAR } from "./pace.js";
import { createSave, loadSave } from "./save.js";
const base = buildCampaign();
const agenda = (c) => transmittableActs(c).map((a) => a.id);
function onDesk(c, id) {
    const act = legislativeAct(id);
    const bill = { id: `bill:${id}:${c.turn}`, act: id, title: act.title, sponsor: act.sponsor, introducedTurn: c.turn, status: "on-the-desk", presentedOn: c.calendar, passage: [] };
    return { campaign: { ...c, bills: { ...c.bills, [bill.id]: bill } }, bill };
}
function signed(c, id) {
    const desk = onDesk(c, id);
    const result = signBill(desk.campaign, desk.bill.id);
    if (!result.ok)
        throw new Error(result.reason);
    return apply(desk.campaign, result.packet);
}
describe("the presidency's domestic legislative agenda", () => {
    it("opens with healthcare, civil rights and training, while contingent measures stay absent", () => {
        expect(agenda(base)).toEqual(expect.arrayContaining(["act-health-coverage", "act-rural-care", "act-equal-protection", "act-apprenticeships"]));
        expect(agenda(base)).not.toContain("act-unemployment-extension");
        expect(agenda(base)).not.toContain("act-disaster-recovery");
        expect(agenda(base)).not.toContain("act-police-accountability");
        expect(agenda(base)).not.toContain("act-paid-leave");
    });
    it("responds to economic and public pressures, and to a developing term", () => {
        const home = base.nations[base.founding.nation];
        const stressed = { ...base, nations: { ...base.nations, [base.founding.nation]: { ...home, stats: { ...home.stats, economy: { ...home.stats.economy, unemployment: 0.08, inflation: 0.07 }, politics: { ...home.stats.politics, protestPressure: 0.5 } } } } };
        expect(agenda(stressed)).toEqual(expect.arrayContaining(["act-unemployment-extension", "act-small-business-credit", "act-housing-supply", "act-police-accountability"]));
        expect(agenda(withWeeksElapsed(base, 12))).toEqual(expect.arrayContaining(["act-paid-leave", "act-data-privacy", "act-sentencing-reentry"]));
        expect(transmit(base, "act-unemployment-extension").ok).toBe(false);
    });
    it("transmits through committee without granting the law's benefits, and respects the one-bill slot", () => {
        const result = transmit(base, "act-health-coverage");
        if (!result.ok)
            throw new Error(result.reason);
        const sent = apply(base, result.packet);
        expect(Object.values(sent.bills).find((b) => b.act === "act-health-coverage")?.stage).toBe("referral");
        expect(lawShift(sent)).toEqual(lawShift(base));
        expect(transmit(sent, "act-equal-protection").ok).toBe(false);
        expect(agenda(sent)).not.toContain("act-health-coverage");
    });
    it("offers recovery for an active natural disaster, not an expired declaration or an unrelated emergency", () => {
        const declaration = { id: "recovery-test", scope: { kind: "nation" }, cause: "wildfire", declaredTurn: base.turn, renewedTurn: base.turn, reason: "Homes and public infrastructure were damaged." };
        const disaster = { ...base, emergencies: { [declaration.id]: declaration } };
        expect(agenda(disaster)).toContain("act-disaster-recovery");
        expect(agenda({ ...base, emergencies: { [declaration.id]: { ...declaration, endedTurn: base.turn } } })).not.toContain("act-disaster-recovery");
        expect(agenda({ ...base, emergencies: { [declaration.id]: { ...declaration, cause: "unrest" } } })).not.toContain("act-disaster-recovery");
        expect(agenda(withWeeksElapsed(disaster, TURNS_PER_YEAR + 1))).not.toContain("act-disaster-recovery");
    });
    it("books healthcare for four years, never charges authority twice, and reopens only after expiry", () => {
        const law = signed(base, "act-health-coverage");
        expect(lawShift(law).outlays - lawShift(base).outlays).toBeCloseTo(0.003);
        expect(lawShift(law).transfers - lawShift(base).transfers).toBeCloseTo(0.0025);
        expect(law.player.metrics.treasury).toBe(base.player.metrics.treasury);
        expect(agenda(withWeeksElapsed(law, TURNS_PER_YEAR * 4 - 1))).not.toContain("act-health-coverage");
        const expired = withWeeksElapsed(law, TURNS_PER_YEAR * 4);
        expect(lawShift(expired).outlays).toBe(lawShift(base).outlays);
        expect(agenda(expired)).toContain("act-health-coverage");
    });
    it("a veto grants none of the new spending, and a signature survives save and reload", () => {
        const desk = onDesk(base, "act-paid-leave");
        const veto = vetoBill(desk.campaign, desk.bill.id, "The proposed contributions do not cover the benefit.");
        if (!veto.ok)
            throw new Error(veto.reason);
        expect(lawShift(apply(desk.campaign, veto.packet))).toEqual(lawShift(base));
        const law = signed(base, "act-paid-leave");
        expect(lawShift(law).outlays - lawShift(law).take).toBeCloseTo(0.001);
        const reloaded = loadSave(JSON.parse(JSON.stringify(createSave(law))));
        expect(lawShift(reloaded)).toEqual(lawShift(law));
    });
    it("original domestic programs have a consequence and ordinary rights measures keep the ordinary Senate threshold", () => {
        for (const act of DOMESTIC_ACTS.filter((entry) => !entry.revises)) {
            const law = signed(base, act.id);
            expect(lawShift(law).outlays, act.id).toBeGreaterThan(lawShift(base).outlays);
            expect(act.tradeoff, act.id).toBeTruthy();
            expect(act.domestic, act.id).toBeDefined();
            expect(billsOnTheAgenda(law).some((a) => a.id === act.id)).toBe(false);
        }
        expect(legislativeAct("act-equal-protection")?.track ?? "ordinary").toBe("ordinary");
        expect(lawRestingOffset(signed(base, "act-apprenticeships"))["economy.unemployment"]).toBeLessThan(lawRestingOffset(base)["economy.unemployment"]);
        const rights = signed(base, "act-equal-protection");
        expect(rights.nations[base.founding.nation].stats.politics.legitimacy).toBeGreaterThan(base.nations[base.founding.nation].stats.politics.legitimacy);
        expect(rights.player.alignments.authLibertarian).not.toEqual(base.player.alignments.authLibertarian);
        expect(STATE_IDS.some((id) => rights.states[id]?.lean !== base.states[id]?.lean)).toBe(true);
        expect(signed(base, "act-health-coverage").cohorts).not.toEqual(base.cohorts);
    });
    it("offers housing revisions only against an existing law without replaying its one-off benefits", () => {
        const revisions = DOMESTIC_ACTS.filter((act) => act.revises);
        expect(revisions.map((act) => act.revises?.kind)).toEqual(["repeal", "renewal", "replacement"]);
        expect(revisions.every((act) => act.domestic === undefined && Object.keys(act.nationEffects).length === 0)).toBe(true);
        expect(revisions.every((act) => !billsOnTheAgenda(base).some((offered) => offered.id === act.id))).toBe(true);
        const housing = signed(base, "act-housing-supply");
        expect(revisions.every((act) => billsOnTheAgenda(housing).some((offered) => offered.id === act.id))).toBe(true);
    });
});
