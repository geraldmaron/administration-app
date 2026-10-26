import { describe, expect, it } from "vitest";
import { foundedForBalance } from "./balance-harness.js";
import { apply } from "./effects.js";
import { flagMarker } from "./marked-flags.js";
import { makeCampaignSeed } from "./rng.js";
import { localeAct, localeAvailability, playerCharter } from "./locale-acts.js";
import { localeActProjection, surveillanceRisk, takeLocaleAct } from "./locale-act-effects.js";
import { insurrectionGround } from "./locale-missions.js";
import { answeredSignature } from "./obligations.js";
import { prospectiveOrderAuthority } from "./order-authority.js";
import { commitmentPhase } from "./commitments.js";
import { judicialReviewPhase } from "./judicial-review.js";
import { missionInterimRelief } from "./mission-interim-relief.js";
import { COURT_ORDER_KIND_IDS, courtApplicationFlag, courtOrderDecideTurn, courtOrderLosses, courtOrderRecords, courtOrderStatus, courtOrderTermWeeks, courtRulingFlag, DENIAL_COOLDOWN_WEEKS, liveCourtOrder, } from "./court-order-records.js";
import { courtOrderProjection, courtOrderRulingEffects, FISC_APPROVAL_2025, requestCourtOrder } from "./court-orders.js";
const { campaign: base } = foundedForBalance("court-orders");
const MN = "MN";
function withUnrest(campaign, severity, disposition = 0.3) {
    const unrest = { id: "condition:unrest:USA:mn", nation: campaign.founding.nation, kind: "unrest", scope: "nation", state: MN,
        severity, startedTurn: campaign.turn, status: "active", beats: [] };
    const mn = campaign.states[MN];
    return { ...campaign, conditions: { ...campaign.conditions, [unrest.id]: unrest },
        states: { ...campaign.states, [MN]: { ...mn, governor: { ...mn.governor, disposition } } } };
}
function withInsurgency(campaign, pressure) {
    const us = campaign.nations[campaign.founding.nation];
    return { ...campaign, nations: { ...campaign.nations, [campaign.founding.nation]: { ...us,
                stats: { ...us.stats, security: { ...us.stats.security, insurgencyPressure: pressure } } } } };
}
function withForeignPursuit(campaign, commitment, overt) {
    const pursuit = { id: "pursuit:RUS:USA:1", actor: "RUS", target: campaign.founding.nation, aim: "security",
        openedTurn: 1, commitment, progress: 0.1, rungReached: 1, overt, lastActedTurn: campaign.turn, status: "active", beats: [] };
    return { ...campaign, pursuits: { ...campaign.pursuits, [pursuit.id]: pursuit } };
}
const CERTAIN = {
    granted: { granted: 1, narrowed: 0 }, narrowed: { granted: 0, narrowed: 1 }, denied: { granted: 0, narrowed: 0 },
};
/**
 * An application on the record with odds that make its answer certain, as the
 * request would leave it, and the ruling the court phase would stamp on the
 * week it answers.
 */
function withApplication(campaign, kind, outcome, turn = campaign.turn) {
    const flag = courtApplicationFlag(kind, MN, CERTAIN[outcome]);
    const ruling = courtRulingFlag(kind, MN, outcome);
    const decideTurn = courtOrderDecideTurn(campaign, kind, MN, turn);
    return { ...campaign, player: { ...campaign.player, flags: { ...campaign.player.flags, [flag]: true, [flagMarker(flag, turn)]: true,
                [ruling]: true, [flagMarker(ruling, decideTurn)]: true } } };
}
const at = (campaign, turn) => ({ ...campaign, turn });
function run(campaign, packets) {
    return packets.reduce((state, packet) => apply(state, packet), campaign);
}
describe("court orders the administration seeks", () => {
    it("never finds a FISA predicate in unrest alone, and finds one in a foreign government's campaign", () => {
        const unrest = withUnrest(base, 0.8);
        const refused = courtOrderProjection(unrest, MN, "fisa-order");
        expect(refused.availability.ok).toBe(false);
        expect(refused.availability.ok ? "" : refused.availability.missing).toContain("First Amendment");
        expect(refused.odds.denied).toBe(1);
        const covert = courtOrderProjection(withForeignPursuit(unrest, 0.9, false), MN, "fisa-order");
        expect(covert.availability.ok).toBe(true);
        const overt = courtOrderProjection(withForeignPursuit(unrest, 0.3, true), MN, "fisa-order");
        expect(covert.evidence.score).toBeGreaterThan(overt.evidence.score);
        expect(covert.odds.granted + covert.odds.narrowed).toBeGreaterThan(overt.odds.granted + overt.odds.narrowed);
        expect(covert.odds.granted + covert.odds.narrowed).toBeLessThanOrEqual(FISC_APPROVAL_2025 + 1e-9);
    });
    it("reads the wiretap statute's riot offense only in violent disorder, and a warrant in any", () => {
        expect(courtOrderProjection(withUnrest(base, 0.3), MN, "title-iii-order").availability.ok).toBe(false);
        expect(courtOrderProjection(withUnrest(base, 0.3), MN, "search-warrant").availability.ok).toBe(true);
        expect(courtOrderProjection(withUnrest(base, 0.5), MN, "title-iii-order").availability.ok).toBe(true);
        expect(courtOrderProjection(base, MN, "search-warrant").availability.ok).toBe(false);
    });
    it("raises the odds with a carried investigative priority on the state", () => {
        const unrest = withUnrest(base, 0.6);
        const before = courtOrderProjection(unrest, MN, "search-warrant");
        const priority = takeLocaleAct(unrest, MN, "priority", "unrest");
        if (!priority.ok)
            throw new Error(priority.reason);
        const after = courtOrderProjection(apply(unrest, priority.packet), MN, "search-warrant");
        expect(after.evidence.priority).toBe(true);
        expect(after.odds.granted).toBeGreaterThan(before.odds.granted);
    });
    it("needs a federal mission meeting the unrest before Justice can sue to enforce federal law", () => {
        const unrest = withUnrest(base, 0.6);
        expect(courtOrderProjection(unrest, MN, "injunction-enforcement").availability.ok).toBe(false);
        const surge = takeLocaleAct(unrest, MN, "property-surge", "unrest");
        if (!surge.ok)
            throw new Error(surge.reason);
        const projection = courtOrderProjection(apply(unrest, surge.packet), MN, "injunction-enforcement");
        expect(projection.availability.ok).toBe(true);
        expect(projection.bench?.court).toContain("Minnesota");
    });
    it("files a carried application, withholds the answer until the court's week, and lets it expire", () => {
        const unrest = withUnrest(base, 0.6);
        const result = requestCourtOrder(unrest, MN, "search-warrant");
        if (!result.ok)
            throw new Error(result.reason);
        expect(result.filed).toBe(true);
        const filed = apply(unrest, result.packet);
        const pending = courtOrderStatus(filed, MN, "search-warrant");
        expect(pending.status).toBe("pending");
        expect(pending.outcome).toBeUndefined();
        expect(requestCourtOrder(filed, MN, "search-warrant").ok).toBe(false);
        const eve = at(filed, pending.decideTurn - 1);
        const ruled = apply(eve, { source: "simulate", actor: "world", turn: pending.decideTurn,
            narration: { summary: "The court rules." }, effects: courtOrderRulingEffects(eve) });
        const decided = courtOrderStatus(at(ruled, pending.decideTurn), MN, "search-warrant");
        expect(["granted", "narrowed", "denied"]).toContain(decided.status);
        if (decided.status !== "denied") {
            expect(courtOrderStatus(at(ruled, decided.termEndsTurn), MN, "search-warrant").status).toBe("expired");
        }
        expect(requestCourtOrder(unrest, MN, "search-warrant")).toEqual(result);
    });
    it("lands the ruling with the week it is dated, and a known denial costs standing", () => {
        const applied = withApplication(withUnrest(base, 0.6), "injunction-enforcement", "denied");
        const decideTurn = courtOrderDecideTurn(applied, "injunction-enforcement", MN, applied.turn);
        expect(courtOrderRulingEffects(at(applied, decideTurn - 2))).toEqual([]);
        const effects = courtOrderRulingEffects(at(applied, decideTurn - 1));
        expect(effects.some((effect) => effect.kind === "flag" && effect.set?.includes(courtRulingFlag("injunction-enforcement", MN, "denied")))).toBe(true);
        expect(effects.some((effect) => effect.kind === "metric" && (effect.deltas.standing ?? 0) < 0)).toBe(true);
        expect(courtOrderLosses(at(applied, decideTurn))).toBe(1);
        expect(courtOrderLosses(at(applied, decideTurn - 1))).toBe(0);
    });
    it("holds a denied application for a cool-down and allows renewal only near an order's end", () => {
        const denied = withApplication(withUnrest(base, 0.6), "search-warrant", "denied");
        const decideTurn = courtOrderDecideTurn(denied, "search-warrant", MN, denied.turn);
        const cooling = courtOrderProjection(at(denied, decideTurn), MN, "search-warrant");
        expect(cooling.availability.ok).toBe(false);
        expect(courtOrderProjection(at(denied, decideTurn + DENIAL_COOLDOWN_WEEKS), MN, "search-warrant").availability.ok).toBe(true);
        const granted = withApplication(withUnrest(base, 0.6), "fisa-order", "granted");
        const foreign = withForeignPursuit(granted, 0.8, false);
        const grantTurn = courtOrderDecideTurn(foreign, "fisa-order", MN, foreign.turn);
        expect(courtOrderProjection(at(foreign, grantTurn), MN, "fisa-order").availability.ok).toBe(false);
        const late = courtOrderProjection(at(foreign, grantTurn + courtOrderTermWeeks("fisa-order") - 1), MN, "fisa-order");
        expect(late.availability.ok).toBe(true);
        expect(late.renewal).toBe(true);
    });
});
describe("surveillance under a court order", () => {
    it("keeps the direct order refused and opens collection only while a FISA or Title III order runs", () => {
        const unrest = withUnrest(base, 0.6);
        expect(localeAvailability(unrest, MN, localeAct("surveil"), "unrest").ok).toBe(false);
        const act = localeAct("surveil-under-order");
        expect(localeAvailability(unrest, MN, act, "unrest").ok).toBe(false);
        const warrant = withApplication(unrest, "search-warrant", "granted");
        expect(localeAvailability(at(warrant, courtOrderDecideTurn(warrant, "search-warrant", MN, warrant.turn)), MN, act, "unrest").ok).toBe(false);
        const wiretap = withApplication(unrest, "title-iii-order", "granted");
        const live = at(wiretap, courtOrderDecideTurn(wiretap, "title-iii-order", MN, wiretap.turn));
        expect(liveCourtOrder(live, MN, ["title-iii-order"])?.status).toBe("granted");
        expect(localeAvailability(live, MN, act, "unrest").ok).toBe(true);
        expect(localeActProjection(live, MN, "surveil-under-order", "unrest").gates.every((gate) => gate.met)).toBe(true);
        const taken = takeLocaleAct(live, MN, "surveil-under-order", "unrest");
        if (!taken.ok)
            throw new Error(taken.reason);
        const after = apply(live, taken.packet);
        expect(after.player.flags["surveilling-domestic:MN"]).toBe(true);
        expect(courtOrderProjection(after, MN, "search-warrant").evidence.surveillance).toBe(true);
        const expired = at(wiretap, courtOrderDecideTurn(wiretap, "title-iii-order", MN, wiretap.turn) + courtOrderTermWeeks("title-iii-order"));
        expect(localeAvailability(expired, MN, act, "unrest").ok).toBe(false);
    });
    it("runs hotter under a narrowed order", () => {
        const act = localeAct("surveil-under-order");
        const full = withApplication(withUnrest(base, 0.6), "title-iii-order", "granted");
        const narrow = withApplication(withUnrest(base, 0.6), "title-iii-order", "narrowed");
        const turn = courtOrderDecideTurn(full, "title-iii-order", MN, full.turn);
        expect(surveillanceRisk(at(narrow, turn), MN, act).odds).toBeGreaterThan(surveillanceRisk(at(full, turn), MN, act).odds);
    });
});
describe("§252 reads a federal court's order the state has let stand", () => {
    it("is open only after a granted injunction is defied a week, and closes on the state's own answer", () => {
        const applied = withApplication(withUnrest(base, 0.6), "injunction-enforcement", "granted");
        const grantTurn = courtOrderDecideTurn(applied, "injunction-enforcement", MN, applied.turn);
        expect(insurrectionGround(withUnrest(base, 0.55), MN)).toBeUndefined();
        const sameWeek = withUnrest(at(applied, grantTurn), 0.55);
        expect(insurrectionGround(sameWeek, MN)).toBeUndefined();
        const defied = withUnrest(at(applied, grantTurn + 1), 0.55);
        expect(insurrectionGround(defied, MN)).toBe("252");
        const mn = defied.states[MN];
        const answered = { ...defied, states: { ...defied.states, [MN]: { ...mn, marks: [...mn.marks,
                        { turn: grantTurn, signature: answeredSignature("unrest"), weight: 0.3, valence: 1, decayRate: 0.1, reason: "The state acted." }] } } };
        expect(insurrectionGround(answered, MN)).toBeUndefined();
    });
});
describe("interim relief against a federal mission", () => {
    function federalized(seed) {
        const campaign = withInsurgency(withUnrest({ ...base, seed: makeCampaignSeed(seed) }, 0.6), 0.25);
        const taken = takeLocaleAct(campaign, MN, "federalize", "unrest");
        if (!taken.ok)
            throw new Error(taken.reason);
        const state = apply(campaign, taken.packet);
        return { state, recordId: state.orders.find((record) => record.subject?.kind === "locale-mission").id };
    }
    it("projects the odds before signing from the merits and the harm", () => {
        const projection = localeActProjection(withInsurgency(withUnrest(base, 0.6), 0.25), MN, "federalize", "unrest");
        expect(projection.interimRelief?.harm).toBe(0.85);
        expect(projection.interimRelief.chance).toBeGreaterThan(0);
        expect(localeActProjection(withUnrest(base, 0.6), MN, "relief", "unrest").interimRelief).toBeUndefined();
    });
    it("suspends the order once enjoined and releases the brigade's bill the next week", () => {
        const { state, recordId } = federalized("interim-release");
        const record = state.orders.find((entry) => entry.id === recordId);
        const enjoined = { id: `case:${recordId}`, subject: { kind: "executive-order", recordId, orderId: record.order },
            filedTurn: state.turn, stage: "lower-merits", nextTurn: state.turn + 20, interim: "order-enjoined", history: [] };
        const suspended = { ...state, judiciary: { ...state.judiciary, proceedings: [...(state.judiciary.proceedings ?? []).filter((entry) => entry.id !== enjoined.id), enjoined] } };
        expect(prospectiveOrderAuthority(suspended, recordId)).toBe("suspended");
        const released = run(suspended, commitmentPhase(suspended));
        const commitment = Object.values(released.commitments).find((entry) => entry.authorizedBy === recordId);
        expect(commitment.status).toBe("wound-down");
    });
    it("enjoins a mission order at the interim stage at the modeled odds and leaves rules to their stays", () => {
        const charter = playerCharter(base);
        let enjoined = 0;
        let denied = 0;
        for (let index = 0; index < 24; index++) {
            const { state, recordId } = federalized(`interim-${index}`);
            const record = state.orders.find((entry) => entry.id === recordId);
            const proceeding = { id: `case:${recordId}`, subject: { kind: "executive-order", recordId, orderId: record.order },
                filedTurn: state.turn, stage: "interim", nextTurn: state.turn, history: [] };
            const ready = { ...state, orders: state.orders.map((entry) => entry.id === recordId ? { ...entry, review: { dueTurn: state.turn, status: "pending" } } : entry),
                judiciary: { ...state.judiciary, proceedings: [proceeding] } };
            expect(missionInterimRelief(ready, charter, record, proceeding)?.chance).toBeGreaterThan(0);
            const after = run(ready, judicialReviewPhase(charter)(ready));
            const interim = after.judiciary.proceedings?.find((entry) => entry.id === proceeding.id)?.interim;
            if (interim === "order-enjoined")
                enjoined++;
            if (interim === "denied")
                denied++;
            expect(prospectiveOrderAuthority(after, recordId)).toBe(interim === "order-enjoined" ? "suspended" : "operative");
        }
        expect(enjoined).toBeGreaterThan(0);
        expect(denied).toBeGreaterThan(0);
    });
});
it("names every kind's law", () => {
    for (const kind of COURT_ORDER_KIND_IDS)
        expect(courtOrderProjection(base, MN, kind).def.authority.cite).toMatch(/U\.S\.C\.|Fed\. R\. Crim\. P\./);
    expect(courtOrderRecords(base)).toEqual([]);
});
