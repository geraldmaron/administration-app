import { describe, expect, it } from "vitest";
import { foundedForBalance } from "./balance-harness.js";
import { apply } from "./effects.js";
import { flagMarker } from "./marked-flags.js";
import { makeCampaignSeed } from "./rng.js";
import { localeAct, localeAvailability, priorityDirectiveId } from "./locale-acts.js";
import { takeHomeAct, takeLocaleAct } from "./locale-act-effects.js";
import { federalServiceGround, insurrectionGrounds, INSURRECTION_SEVERITY, liveLocaleMissions, liveProclamation, LOCALE_REFUSALS, MISSION_WEEKS, missionAttention, REGULAR_FORCES_WEEKS, } from "./locale-missions.js";
import { commitmentPhase, MISSION_MINIMUM_WEEKS, setCommitmentStatus } from "./commitments.js";
import { rescindOrder } from "./order-lifecycle.js";
import { prospectiveOrderAuthority } from "./order-authority.js";
import { answeredSignature } from "./obligations.js";
import { courtApplicationFlag, courtOrderDecideTurn, courtRulingFlag } from "./court-order-records.js";
import { courtOrderProjection, requestCourtOrder } from "./court-orders.js";
// The statutory predicates federal force at home moves on, read through the
// acts that take them: what opens a mission, what caps it, what ends it and
// what each of those costs.
const { campaign: founded } = foundedForBalance("locale-missions");
const base = { ...founded, turn: 5 };
const MN = "MN";
const WI = "WI";
const MN_UNREST = "condition:unrest:USA:mn";
const at = (campaign, turn) => ({ ...campaign, turn });
const run = (campaign, packets) => packets.reduce((state, packet) => apply(state, packet), campaign);
function withGovernor(campaign, state, disposition) {
    const runtime = campaign.states[state];
    return { ...campaign, states: { ...campaign.states, [state]: { ...runtime, governor: { ...runtime.governor, disposition } } } };
}
/** Live unrest at the given severity: placed in `state`, or national when `state` is absent. */
function withUnrest(campaign, severity, state) {
    const id = state === MN ? MN_UNREST : `condition:unrest:USA:${state?.toLowerCase() ?? "nation"}`;
    const unrest = { id, nation: campaign.founding.nation, kind: "unrest", scope: "nation", ...(state ? { state } : {}),
        severity, startedTurn: campaign.turn, status: "active", beats: [] };
    return { ...campaign, conditions: { ...campaign.conditions, [id]: unrest } };
}
const withMnSeverity = (campaign, severity) => ({ ...campaign, conditions: { ...campaign.conditions,
        [MN_UNREST]: { ...campaign.conditions[MN_UNREST], severity } } });
function withInsurgency(campaign, pressure) {
    const us = campaign.nations[campaign.founding.nation];
    return { ...campaign, nations: { ...campaign.nations, [campaign.founding.nation]: { ...us,
                stats: { ...us.stats, security: { ...us.stats.security, insurgencyPressure: pressure } } } } };
}
function take(campaign, state, act) {
    const result = takeLocaleAct(campaign, state, act, "unrest");
    if (!result.ok)
        throw new Error(`${act}: ${result.reason}`);
    return apply(campaign, result.packet);
}
function refusal(campaign, state, act) {
    const result = takeLocaleAct(campaign, state, act, "unrest");
    return result.ok ? "" : result.reason;
}
/** Placed unrest and an opposed governor in Minnesota: §253 is open, and nothing else. */
const placed = (severity = 0.65) => withGovernor(withUnrest(base, severity, MN), MN, 0.3);
/** A proclamation the week of `campaign`, troops the week after. */
const troopsSent = (campaign) => take(at(take(campaign, MN, "proclaim"), campaign.turn + 1), MN, "troops");
const missionCommitment = (campaign, act) => {
    const record = campaign.orders.find((entry) => entry.subject?.kind === "locale-mission" && entry.subject.act === act);
    return Object.values(campaign.commitments).find((entry) => entry.authorizedBy === record.id);
};
const phaseSum = (campaign, metric) => commitmentPhase(campaign).flatMap((packet) => packet.effects)
    .reduce((sum, effect) => sum + (effect.kind === "metric" ? effect.deltas[metric] ?? 0 : 0), 0);
const attention = (campaign) => missionAttention(campaign, campaign.conditions[MN_UNREST]);
describe("the Guard follows the regular forces", () => {
    it("is not opened by a proclamation alone, however long it stands", () => {
        const proclaimed = take(placed(), MN, "proclaim");
        for (const weeks of [1, 2, 3]) {
            const later = at(proclaimed, base.turn + weeks);
            expect(liveProclamation(later, MN)).toBeDefined();
            expect(federalServiceGround(later, MN)).toBeUndefined();
            expect(refusal(later, MN, "federalize")).toContain(LOCALE_REFUSALS.federalize);
        }
    });
    it("opens two weeks after troops are sent, and not the week before", () => {
        expect(REGULAR_FORCES_WEEKS).toBe(2);
        const sent = troopsSent(placed());
        const sentTurn = base.turn + 1;
        expect(federalServiceGround(at(sent, sentTurn + 1), MN)).toBeUndefined();
        expect(refusal(at(sent, sentTurn + 1), MN, "federalize")).toContain(LOCALE_REFUSALS.federalize);
        expect(federalServiceGround(at(sent, sentTurn + REGULAR_FORCES_WEEKS), MN)).toBe("regular-forces");
        expect(takeLocaleAct(at(sent, sentTurn + REGULAR_FORCES_WEEKS), MN, "federalize", "unrest").ok).toBe(true);
    });
    it("stays shut when the unrest has fallen below the obstruction level, and opens at the level itself", () => {
        const ready = at(troopsSent(placed()), base.turn + 1 + REGULAR_FORCES_WEEKS);
        expect(federalServiceGround(withMnSeverity(ready, INSURRECTION_SEVERITY.obstruction - 0.01), MN)).toBeUndefined();
        expect(federalServiceGround(withMnSeverity(ready, INSURRECTION_SEVERITY.obstruction), MN)).toBe("regular-forces");
    });
    it("is not opened by troops whose order a court has suspended", () => {
        const ready = at(troopsSent(placed()), base.turn + 1 + REGULAR_FORCES_WEEKS);
        const record = ready.orders.find((entry) => entry.subject?.kind === "locale-mission" && entry.subject.act === "troops");
        expect(federalServiceGround(suspended(ready, record.id), MN)).toBeUndefined();
    });
    it("opens on an invasion or a rebellion with no troops sent at all", () => {
        expect(federalServiceGround(withInsurgency(base, 0.25), MN)).toBe("rebellion");
        expect(federalServiceGround(withInsurgency(base, 0.05), MN)).toBeUndefined();
    });
});
function suspended(campaign, recordId) {
    const record = campaign.orders.find((entry) => entry.id === recordId);
    const enjoined = { id: `case:${recordId}`, subject: { kind: "executive-order", recordId, orderId: record.order },
        filedTurn: campaign.turn, stage: "lower-merits", nextTurn: campaign.turn + 20, interim: "order-enjoined", history: [] };
    return { ...campaign, judiciary: { ...campaign.judiciary, proceedings: [...(campaign.judiciary.proceedings ?? []), enjoined] } };
}
describe("one federalization and one troop mission to a state", () => {
    const rebellion = () => withInsurgency(placed(), 0.25);
    it("refuses a second troop mission while the first is in force", () => {
        const sent = troopsSent(rebellion());
        expect(refusal(at(sent, base.turn + 2), MN, "troops")).toContain(LOCALE_REFUSALS.stacked);
    });
    it("refuses a second federalization while the first is in force", () => {
        const guard = take(rebellion(), MN, "federalize");
        expect(refusal(at(guard, base.turn + 1), MN, "federalize")).toContain(LOCALE_REFUSALS.stacked);
    });
    it("refuses federalizing the same week troops are sent, and troops the same week the Guard is", () => {
        const sent = troopsSent(rebellion());
        expect(refusal(sent, MN, "federalize")).toContain(LOCALE_REFUSALS.stacked);
        const proclaimed = at(take(rebellion(), MN, "proclaim"), base.turn + 1);
        const guard = take(proclaimed, MN, "federalize");
        expect(refusal(guard, MN, "troops")).toContain(LOCALE_REFUSALS.stacked);
    });
    it("allows the Guard a later week than the troops, and the other state its own missions", () => {
        const sent = troopsSent(rebellion());
        expect(takeLocaleAct(at(sent, base.turn + 2), MN, "federalize", "unrest").ok).toBe(true);
        const both = withGovernor(withUnrest(rebellion(), 0.65, WI), WI, 0.3);
        expect(takeLocaleAct(take(both, MN, "federalize"), WI, "federalize", "unrest").ok).toBe(true);
    });
    it("counts both missions as one when they weigh on the unrest, not two", () => {
        const sent = troopsSent(rebellion());
        const stacked = take(at(sent, base.turn + 2), MN, "federalize");
        expect(missionCommitment(stacked, "troops").status).toBe("active");
        expect(missionCommitment(stacked, "federalize").status).toBe("active");
        expect(attention(at(sent, base.turn + 2))).toBe(1);
        expect(attention(stacked)).toBe(1);
    });
});
describe("which Insurrection Act occasions the unrest in the record opens", () => {
    it("reads §253 and §252 only off unrest placed in the state, and §251 off national unrest too", () => {
        const national = withUnrest(base, 0.7);
        const opposed = insurrectionGrounds(withGovernor(national, MN, 0.3), MN);
        expect(opposed).toEqual({ "251": false, "252": false, "253": false });
        expect(insurrectionGrounds(withGovernor(national, MN, 0.7), MN)).toEqual({ "251": true, "252": false, "253": false });
        expect(insurrectionGrounds(placed(0.7), MN)["253"]).toBe(true);
    });
    it("does not let unrest placed in another state open §253 here", () => {
        expect(insurrectionGrounds(withGovernor(withUnrest(base, 0.8, WI), MN, 0.3), MN)["253"]).toBe(false);
    });
    it("holds §253 shut until the severity reaches the rights level, and closes it on a state that protects", () => {
        expect(insurrectionGrounds(placed(INSURRECTION_SEVERITY.rights - 0.01), MN)["253"]).toBe(false);
        expect(insurrectionGrounds(placed(INSURRECTION_SEVERITY.rights), MN)["253"]).toBe(true);
        const open = placed();
        const mn = open.states[MN];
        const protecting = { ...open, states: { ...open.states, [MN]: { ...mn, marks: [...mn.marks,
                        { turn: open.turn, signature: answeredSignature("unrest"), weight: 0.3, valence: 1, decayRate: 0.1, reason: "The state acted." }] } } };
        expect(insurrectionGrounds(protecting, MN)["253"]).toBe(false);
    });
    it("opens the Guard's rebellion and invasion grounds with no unrest reading at all", () => {
        expect(federalServiceGround(withInsurgency(base, 0.3), WI)).toBe("rebellion");
    });
});
/** A granted injunction on the record, the week it was granted being `grantTurn`. */
function withGrantedInjunction(campaign) {
    const flag = courtApplicationFlag("injunction-enforcement", MN, { granted: 1, narrowed: 0 });
    const ruling = courtRulingFlag("injunction-enforcement", MN, "granted");
    const grantTurn = courtOrderDecideTurn(campaign, "injunction-enforcement", MN, campaign.turn);
    return { grantTurn, campaign: { ...campaign, player: { ...campaign.player, flags: { ...campaign.player.flags, [flag]: true,
                    [flagMarker(flag, campaign.turn)]: true, [ruling]: true, [flagMarker(ruling, grantTurn)]: true } } } };
}
describe("the court-based ground for §252", () => {
    const unrest = () => withGovernor(withUnrest(base, 0.55, MN), MN, 0.3);
    it("opens a week after a granted injunction is defied, and only on unrest placed in the state", () => {
        const { campaign, grantTurn } = withGrantedInjunction(unrest());
        expect(insurrectionGrounds(at(campaign, grantTurn), MN)["252"]).toBe(false);
        expect(insurrectionGrounds(at(campaign, grantTurn + 1), MN)["252"]).toBe(true);
        const national = withGovernor(withUnrest(base, 0.55), MN, 0.3);
        const defied = withGrantedInjunction(national);
        expect(insurrectionGrounds(at(defied.campaign, defied.grantTurn + 1), MN)["252"]).toBe(false);
    });
    it("is not opened by a mission in the state with no injunction behind it", () => {
        const surged = take(unrest(), MN, "property-surge");
        expect(insurrectionGrounds(at(surged, base.turn + 3), MN)["252"]).toBe(false);
    });
    it("closes once the state answers the unrest after the court granted the order", () => {
        const { campaign, grantTurn } = withGrantedInjunction(unrest());
        const mn = campaign.states[MN];
        const answered = { ...campaign, states: { ...campaign.states, [MN]: { ...mn, marks: [...mn.marks,
                        { turn: grantTurn, signature: answeredSignature("unrest"), weight: 0.3, valence: 1, decayRate: 0.1, reason: "The state acted." }] } } };
        expect(insurrectionGrounds(at(answered, grantTurn + 1), MN)["252"]).toBe(false);
    });
    it("carries a proclamation and troops signed on §252", () => {
        const { campaign, grantTurn } = withGrantedInjunction(unrest());
        const proclaimed = take(at(campaign, grantTurn + 1), MN, "proclaim");
        expect(liveProclamation(at(proclaimed, grantTurn + 2), MN)?.subject).toMatchObject({ act: "proclaim", ground: "252" });
        const sent = take(at(proclaimed, grantTurn + 2), MN, "troops");
        expect(sent.orders.find((entry) => entry.order === "order-insurrection-enforcement")?.subject).toMatchObject({ ground: "252" });
    });
});
describe("an immigration operation is a mission a court can enforce", () => {
    it("runs its eight weeks as a live mission and supports an injunction application only while it lives", () => {
        expect(MISSION_WEEKS["immigration-operation"]).toBe(8);
        const unrest = withUnrest(base, 0.6, MN);
        expect(courtOrderProjection(unrest, MN, "injunction-enforcement").availability.ok).toBe(false);
        const taken = take(unrest, MN, "immigration-operation");
        const live = (turn) => liveLocaleMissions(at(taken, turn), MN).some((mission) => mission.act === "immigration-operation");
        expect(live(base.turn + 7)).toBe(true);
        expect(live(base.turn + 8)).toBe(false);
        expect(courtOrderProjection(at(taken, base.turn + 7), MN, "injunction-enforcement").availability.ok).toBe(true);
        expect(courtOrderProjection(at(taken, base.turn + 8), MN, "injunction-enforcement").availability.ok).toBe(false);
    });
    it("is taken from the home path with no unrest, and then supports no application", () => {
        const result = takeHomeAct(base, MN, "immigration-operation");
        if (!result.ok)
            throw new Error(result.reason);
        const taken = apply(base, result.packet);
        expect(liveLocaleMissions(taken, MN).some((mission) => mission.act === "immigration-operation")).toBe(true);
        expect(courtOrderProjection(taken, MN, "injunction-enforcement").availability.ok).toBe(false);
    });
});
describe("an investigative priority is kept per state", () => {
    const nationwide = () => withUnrest(base, 0.6);
    it("carries two states in one week and refuses the same state twice", () => {
        const both = take(take(nationwide(), MN, "priority"), WI, "priority");
        expect(both.directives?.[priorityDirectiveId(base.turn, MN)]?.status).toBe("carried");
        expect(both.directives?.[priorityDirectiveId(base.turn, WI)]?.status).toBe("carried");
        expect(refusal(both, MN, "priority")).toContain("for this state");
        expect(refusal(both, WI, "priority")).toContain("for this state");
        expect(takeLocaleAct(at(both, base.turn + 1), MN, "priority", "unrest").ok).toBe(true);
    });
    it("is not blocked by a court application the same week, and does not block one", () => {
        const unrest = withUnrest(base, 0.6, MN);
        const applied = requestCourtOrder(unrest, MN, "search-warrant");
        if (!applied.ok)
            throw new Error(applied.reason);
        expect(takeLocaleAct(apply(unrest, applied.packet), MN, "priority", "unrest").ok).toBe(true);
        const prioritized = take(unrest, MN, "priority");
        expect(requestCourtOrder(prioritized, MN, "search-warrant").ok).toBe(true);
    });
});
describe("two states ordered in one week", () => {
    it("draw their challenges independently, and each draw is repeatable", () => {
        const nationwide = withUnrest(base, 0.6);
        const contested = (campaign, state) => campaign.orders.find((entry) => entry.subject?.kind === "locale-mission" && entry.subject.state === state).contested;
        let differing = 0;
        let challenged = 0;
        for (let index = 0; index < 80; index++) {
            const seeded = { ...nationwide, seed: makeCampaignSeed(`mission-draw-${index}`) };
            const both = take(take(seeded, MN, "property-surge"), WI, "property-surge");
            const again = take(take(seeded, MN, "property-surge"), WI, "property-surge");
            expect(contested(again, MN)).toBe(contested(both, MN));
            expect(contested(again, WI)).toBe(contested(both, WI));
            if (contested(both, MN) !== contested(both, WI))
                differing++;
            if (contested(both, MN) || contested(both, WI))
                challenged++;
        }
        expect(challenged).toBeGreaterThan(0);
        expect(differing).toBeGreaterThan(0);
    });
});
describe("a mission whose order a court suspends or the President rescinds", () => {
    const guarded = () => take(withInsurgency(withUnrest(base, 0.6, MN), 0.25), MN, "federalize");
    const baseline = () => phaseSum(withInsurgency(withUnrest(base, 0.6, MN), 0.25), "treasury");
    const recordOf = (campaign) => missionCommitment(campaign, "federalize").authorizedBy;
    const amount = () => missionCommitment(guarded(), "federalize").resource.amountPerTurn;
    it("bills and weighs on the unrest while it stands", () => {
        expect(attention(guarded())).toBe(1);
        expect(Math.abs(baseline() - phaseSum(guarded(), "treasury") - amount())).toBeLessThanOrEqual(1);
    });
    it("winds the commitment down the next week and stops both the bill and the attention once a court suspends the order", () => {
        const campaign = guarded();
        const stopped = suspended(campaign, recordOf(campaign));
        expect(prospectiveOrderAuthority(stopped, recordOf(campaign))).toBe("suspended");
        expect(attention(stopped)).toBe(0);
        expect(Math.abs(phaseSum(stopped, "treasury") - baseline())).toBeLessThanOrEqual(1);
        const wound = run(stopped, commitmentPhase(stopped));
        expect(missionCommitment(wound, "federalize").status).toBe("wound-down");
        expect(attention(wound)).toBe(0);
        expect(Math.abs(phaseSum(at(wound, base.turn + 1), "treasury") - baseline())).toBeLessThanOrEqual(1);
    });
    it("stops the attention of a property surge the same way, though it signs no commitment", () => {
        const surged = take(withUnrest(base, 0.6, MN), MN, "property-surge");
        expect(attention(surged)).toBe(0.5);
        const record = surged.orders.find((entry) => entry.subject?.kind === "locale-mission");
        expect(attention(suspended(surged, record.id))).toBe(0);
    });
    it("winds down and stops billing on rescission, once the two-week minimum is served", () => {
        const campaign = at(guarded(), base.turn + MISSION_MINIMUM_WEEKS);
        const result = rescindOrder(campaign, recordOf(campaign));
        if (!result.ok)
            throw new Error(result.reason);
        const rescinded = apply(campaign, result.packet);
        expect(attention(rescinded)).toBe(0);
        expect(Math.abs(phaseSum(rescinded, "treasury") - baseline())).toBeLessThanOrEqual(1);
        expect(missionCommitment(run(rescinded, commitmentPhase(rescinded)), "federalize").status).toBe("wound-down");
    });
});
describe("the two-week minimum", () => {
    const guarded = () => take(withInsurgency(withUnrest(base, 0.6, MN), 0.25), MN, "federalize");
    const baseline = () => phaseSum(withInsurgency(withUnrest(base, 0.6, MN), 0.25), "treasury");
    function owedWhenRescinded(weeksServed) {
        const campaign = at(guarded(), base.turn + weeksServed);
        const result = rescindOrder(campaign, missionCommitment(campaign, "federalize").authorizedBy);
        if (!result.ok)
            throw new Error(result.reason);
        return baseline() - phaseSum(apply(campaign, result.packet), "treasury");
    }
    it("bills each unserved week of the minimum when the order is rescinded early", () => {
        const weekly = missionCommitment(guarded(), "federalize").resource.amountPerTurn;
        expect(Math.abs(owedWhenRescinded(0) - MISSION_MINIMUM_WEEKS * weekly)).toBeLessThanOrEqual(1);
        expect(Math.abs(owedWhenRescinded(1) - weekly)).toBeLessThanOrEqual(1);
        expect(Math.abs(owedWhenRescinded(MISSION_MINIMUM_WEEKS))).toBeLessThanOrEqual(1);
    });
    it("bills nothing extra when a court suspends the order in the first week", () => {
        const campaign = guarded();
        const stopped = suspended(campaign, missionCommitment(campaign, "federalize").authorizedBy);
        expect(Math.abs(baseline() - phaseSum(stopped, "treasury"))).toBeLessThanOrEqual(1);
    });
    it("bills a rescinded troop mission the same way", () => {
        const sent = troopsSent(withInsurgency(placed(), 0.05));
        const commitment = missionCommitment(sent, "troops");
        const result = rescindOrder(sent, commitment.authorizedBy);
        if (!result.ok)
            throw new Error(result.reason);
        const rescinded = apply(sent, result.packet);
        const without = phaseSum(withInsurgency(placed(), 0.05), "treasury");
        expect(Math.abs(without - phaseSum(rescinded, "treasury") - MISSION_MINIMUM_WEEKS * commitment.resource.amountPerTurn)).toBeLessThanOrEqual(1);
    });
});
describe("forces sent into a state as the commitment ledger sees them", () => {
    const guarded = () => take(withInsurgency(withUnrest(base, 0.6, MN), 0.25), MN, "federalize");
    it("refuses to wind them down by hand", () => {
        const campaign = guarded();
        const commitment = missionCommitment(campaign, "federalize");
        for (const status of ["wound-down", "suspended"]) {
            const result = setCommitmentStatus(campaign, commitment.id, status, "Done.");
            expect(result.ok).toBe(false);
            if (!result.ok)
                expect(result.reason).toBe("Rescind the order that sent them.");
        }
    });
    it("buys no kept-promise standing for a deployment into a state", () => {
        const before = withInsurgency(withUnrest(base, 0.6, MN), 0.25);
        expect(phaseSum(guarded(), "standing")).toBe(phaseSum(before, "standing"));
    });
});
describe("a lapse in appropriations", () => {
    const lapse = (campaign) => ({ ...campaign, congress: { ...campaign.congress,
            appropriation: { ...campaign.congress.appropriation, throughTurn: campaign.turn - 3 } } });
    const lapsed = () => lapse(withInsurgency(withGovernor(withUnrest(base, 0.65, MN), MN, 0.3), 0.25));
    it("lets the Guard be federalized and troops be sent, each opening its weekly commitment", () => {
        const guard = take(lapsed(), MN, "federalize");
        expect(missionCommitment(guard, "federalize").target).toEqual({ kind: "state", id: MN });
        // The proclamation is issued before the lapse: it carries no price, but no act without the exception is taken during one.
        const proclaimed = at(take(withInsurgency(withGovernor(withUnrest(base, 0.65, MN), MN, 0.3), 0.25), MN, "proclaim"), base.turn + 1);
        const sent = take(lapse(proclaimed), MN, "troops");
        expect(missionCommitment(sent, "troops").status).toBe("active");
    });
    it("still refuses the acts that spend without an exception, and honors the one for relief", () => {
        for (const act of ["waiver", "review"]) {
            expect(localeAvailability(lapsed(), MN, localeAct(act), "unrest").ok, act).toBe(false);
        }
        expect(localeAvailability(lapsed(), MN, localeAct("relief"), "unrest").ok).toBe(true);
        expect(localeAvailability(base, MN, localeAct("waiver"), "unrest").ok).toBe(true);
    });
});
