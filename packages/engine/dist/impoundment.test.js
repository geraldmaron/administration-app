import { describe, expect, it } from "vitest";
import { foundedForBalance } from "./balance-harness.js";
import { apply } from "./effects.js";
import { addDays, selectTurnOfDate } from "./clock.js";
import { selectBudget, selectBudgetOutlook, selectSpendableBudget, budgetPhase } from "./budget.js";
import { proposeDeferral, proposeRescission, projectRescission } from "./appropriation.js";
import { GAO_REPORT_SESSION_DAYS, impoundmentPackets, pendingImpoundments, RESCISSION_VOTE_SESSION_DAY, RESCISSION_WINDOW_SESSION_DAYS, UNLAWFUL_DEFERRAL_DISPOSITION_COST, selectImpoundments, withheldShare, } from "./impoundment.js";
import { sessionDayDate } from "./congressional-session.js";
const d = (year, month, day) => ({ year, month, day });
function at(campaign, date) {
    return { ...campaign, calendar: date, turn: selectTurnOfDate(campaign, date) };
}
function run(state, packets) {
    return packets.reduce((acc, packet) => apply(acc, packet), state);
}
function sent(campaign, date, act) {
    const state = at(campaign, date);
    const result = act(state);
    if (!result.ok)
        throw new Error(result.reason);
    return apply(state, result.packet);
}
const { campaign: founded } = foundedForBalance("impoundment");
const ACCOUNT = "military";
const only = (state) => selectImpoundments(state)[0];
describe("a rescission message", () => {
    it("holds the money back from the accounts the week it is sent, and leaves the book standing", () => {
        const state = sent(founded, d(2029, 3, 1), (c) => proposeRescission(c, { account: ACCOUNT, portion: 0.5 }));
        expect(pendingImpoundments(state)).toHaveLength(1);
        expect(selectBudget(state)[ACCOUNT]).toBe(selectBudget(founded)[ACCOUNT]);
        expect(selectSpendableBudget(state)[ACCOUNT]).toBeCloseTo(selectBudget(founded)[ACCOUNT] * 0.5, 3);
        const line = selectBudgetOutlook(state).lines.find((entry) => entry.account === ACCOUNT);
        expect(line.share).toBeCloseTo(selectBudget(founded)[ACCOUNT] * 0.5, 3);
        expect(withheldShare(state, "domestic")).toBe(0);
    });
    it("refuses an empty request, a second message on the same line, and money already held", () => {
        const state = sent(founded, d(2029, 3, 1), (c) => proposeRescission(c, { account: ACCOUNT, portion: 0.5 }));
        expect(proposeRescission(at(founded, d(2029, 3, 1)), { account: ACCOUNT, portion: 0 }).ok).toBe(false);
        expect(proposeRescission(state, { account: ACCOUNT, portion: 0.2 }).ok).toBe(false);
        expect(proposeDeferral(state, { account: ACCOUNT, portion: 0.2, purpose: "contingency", days: 30 }).ok).toBe(false);
    });
    it("releases by default on the 45th day of continuous session, which pro forma sittings make the 45th calendar day", () => {
        const sentOn = d(2029, 3, 1);
        const state = sent(founded, sentOn, (c) => proposeRescission(c, { account: ACCOUNT, portion: 0.5 }));
        const lastDay = sessionDayDate(sentOn, RESCISSION_WINDOW_SESSION_DAYS);
        expect(lastDay).toEqual(addDays(sentOn, 45));
        const beforeLast = at(state, addDays(lastDay, -1));
        expect(pendingImpoundments(run(beforeLast, impoundmentPackets(beforeLast)))).toHaveLength(1);
        const onLast = at(state, lastDay);
        const released = run(onLast, impoundmentPackets(onLast));
        expect(only(released).status).toBe("released");
        expect(withheldShare(released, ACCOUNT)).toBe(0);
        expect(selectSpendableBudget(released)[ACCOUNT]).toBe(selectBudget(founded)[ACCOUNT]);
    });
    it("bars proposing the same line for rescission again in the fiscal year after a default release", () => {
        const sentOn = d(2029, 3, 1);
        const state = sent(founded, sentOn, (c) => proposeRescission(c, { account: ACCOUNT, portion: 0.5 }));
        const onLast = at(state, sessionDayDate(sentOn, RESCISSION_WINDOW_SESSION_DAYS));
        const released = run(onLast, impoundmentPackets(onLast));
        const again = proposeRescission(released, { account: ACCOUNT, portion: 0.5 });
        expect(again.ok).toBe(false);
        if (!again.ok)
            expect(again.reason).toContain("bars proposing");
    });
    it("cancels the authority when both chambers carry the bill on the count day, and not before", () => {
        const sentOn = d(2029, 3, 1);
        const base = sent(founded, sentOn, (c) => proposeRescission(c, { account: ACCOUNT, portion: 0.5 }));
        const favored = { ...base, congress: { ...base.congress, appropriation: { ...base.congress.appropriation, impoundments: [{ ...only(base), appeal: 5 }] } } };
        const countDay = sessionDayDate(sentOn, RESCISSION_VOTE_SESSION_DAY);
        const early = at(favored, addDays(countDay, -1));
        expect(pendingImpoundments(run(early, impoundmentPackets(early)))).toHaveLength(1);
        const onDay = at(favored, countDay);
        const rescinded = run(onDay, impoundmentPackets(onDay));
        expect(only(rescinded).status).toBe("rescinded");
        expect(selectBudget(rescinded)[ACCOUNT]).toBeCloseTo(selectBudget(founded)[ACCOUNT] * 0.5, 3);
    });
    it("takes one count, and the money is still released on schedule when the bill fails", () => {
        const sentOn = d(2029, 3, 1);
        const base = sent(founded, sentOn, (c) => proposeRescission(c, { account: ACCOUNT, portion: 0.5 }));
        const opposed = { ...base, congress: { ...base.congress, appropriation: { ...base.congress.appropriation, impoundments: [{ ...only(base), appeal: -5 }] } } };
        const onDay = at(opposed, sessionDayDate(sentOn, RESCISSION_VOTE_SESSION_DAY));
        const failed = run(onDay, impoundmentPackets(onDay));
        expect(only(failed).counted).toBe(true);
        expect(only(failed).status).toBe("pending");
        expect(selectBudget(failed)[ACCOUNT]).toBe(selectBudget(founded)[ACCOUNT]);
        const last = at(failed, sessionDayDate(sentOn, RESCISSION_WINDOW_SESSION_DAYS));
        expect(only(run(last, impoundmentPackets(last))).status).toBe("released");
    });
});
describe("a pocket rescission", () => {
    const sentOn = d(2029, 8, 28);
    it("is flagged as contested when the 45 session days end after the fiscal year does, and costs the Hill more", () => {
        const ordinary = proposeRescission(at(founded, d(2029, 3, 1)), { account: ACCOUNT, portion: 0.5 });
        const late = proposeRescission(at(founded, sentOn), { account: ACCOUNT, portion: 0.5 });
        if (!ordinary.ok || !late.ok)
            throw new Error("both should be sent");
        expect(projectRescission(at(founded, sentOn), { account: ACCOUNT, portion: 0.5 }).pocket).toBe(true);
        expect(projectRescission(at(founded, d(2029, 3, 1)), { account: ACCOUNT, portion: 0.5 }).pocket).toBe(false);
        const disposition = (packet) => {
            const effect = packet.effects.find((entry) => entry.kind === "congress");
            return effect?.kind === "congress" && effect.set ? effect.set.disposition : NaN;
        };
        expect(disposition(late.packet)).toBeLessThan(disposition(ordinary.packet));
    });
    it("is never released by default and lapses when the fiscal year ends with the money held", () => {
        const state = sent(founded, sentOn, (c) => proposeRescission(c, { account: ACCOUNT, portion: 0.5 }));
        expect(only(state).pocket).toBe(true);
        const mid = at(state, d(2029, 9, 20));
        expect(pendingImpoundments(run(mid, impoundmentPackets(mid)))).toHaveLength(1);
        const after = at(state, d(2029, 9, 30));
        const lapsed = run(after, impoundmentPackets(after));
        expect(only(lapsed).status).toBe("lapsed");
    });
});
describe("a deferral message", () => {
    it("cannot run past the end of the fiscal year", () => {
        const result = proposeDeferral(at(founded, d(2029, 3, 1)), { account: ACCOUNT, portion: 0.5, purpose: "contingency", days: 400 });
        expect(result.ok).toBe(false);
    });
    it("is reported lawful for a contingency, held through its period and then released, with no suit", () => {
        const sentOn = d(2029, 3, 1);
        let state = sent(founded, sentOn, (c) => proposeDeferral(c, { account: ACCOUNT, portion: 0.5, purpose: "contingency", days: 90 }));
        for (let day = 7; day <= 100; day += 7) {
            const week = at(state, addDays(sentOn, day));
            state = run(week, impoundmentPackets(week));
        }
        expect(only(state).gao?.inAccordance).toBe(true);
        expect(only(state).gao?.suitFiled).toBeUndefined();
        expect(only(state).status).toBe("released");
    });
    it("is reported unlawful when held for policy, and the Comptroller General sues and a court orders release before the period is up", () => {
        const sentOn = d(2029, 3, 1);
        let state = sent(founded, sentOn, (c) => proposeDeferral(c, { account: ACCOUNT, portion: 0.5, purpose: "policy", days: 200 }));
        const before = state.congress.disposition;
        const trail = [];
        for (let day = 7; day <= 200 && only(state).status === "pending"; day += 7) {
            const week = at(state, addDays(sentOn, day));
            state = run(week, impoundmentPackets(week));
            const gao = only(state).gao;
            const note = `${gao ? "reported" : "none"}${gao?.suitFiled ? "+suit" : ""}`;
            if (trail.at(-1) !== note)
                trail.push(note);
        }
        expect(trail).toEqual(["none", "reported", "reported+suit"]);
        expect(only(state).gao?.inAccordance).toBe(false);
        expect(only(state).status).toBe("court-ordered");
        expect(state.congress.disposition).toBeLessThan(before);
        expect(GAO_REPORT_SESSION_DAYS).toBeLessThan(RESCISSION_VOTE_SESSION_DAY);
    });
});
describe("the weekly budget phase", () => {
    it("carries the release as part of the same phase that spends the budget", () => {
        const sentOn = d(2029, 3, 1);
        const state = sent(founded, sentOn, (c) => proposeRescission(c, { account: ACCOUNT, portion: 0.5 }));
        const onLast = at(state, sessionDayDate(sentOn, RESCISSION_WINDOW_SESSION_DAYS));
        const packets = budgetPhase(onLast);
        expect(packets.some((packet) => packet.effects.some((effect) => effect.kind === "congress"))).toBe(true);
    });
    it("round-trips through JSON with the messages intact", () => {
        const state = sent(founded, d(2029, 3, 1), (c) => proposeRescission(c, { account: ACCOUNT, portion: 0.5 }));
        const copy = JSON.parse(JSON.stringify(state));
        expect(selectImpoundments(copy)).toEqual(selectImpoundments(state));
    });
});
describe("repeated short deferrals", () => {
    const metricTreasury = (packet) => {
        const effect = packet.effects.find((entry) => entry.kind === "metric");
        return effect?.deltas.treasury ?? 0;
    };
    it("still meet the Comptroller General's review and keep the exposure when each is released early", () => {
        const start = d(2029, 3, 1);
        let state = at(founded, start);
        const before = state.congress.disposition;
        for (let n = 0; n < 8; n++) {
            const day = addDays(start, n * 7);
            state = at(state, day);
            const result = proposeDeferral(state, { account: ACCOUNT, portion: 1, purpose: "policy", days: 7 });
            if (!result.ok)
                throw new Error(result.reason);
            state = apply(state, result.packet);
            const end = at(state, addDays(day, 7));
            state = run(end, impoundmentPackets(end));
        }
        const messages = selectImpoundments(state);
        expect(messages).toHaveLength(8);
        expect(messages.every((message) => message.status !== "pending")).toBe(true);
        expect(messages.every((message) => message.gao?.inAccordance === false)).toBe(true);
        expect(messages.every((message) => message.gao?.reported === messages[0].gao?.reported)).toBe(true);
        expect(state.congress.disposition).toBeLessThan(before);
    });
    it("costs the Hill again on each repeat after a finding, more each time up to the first finding's price", () => {
        const start = d(2029, 3, 1);
        let state = at(founded, start);
        const costs = [];
        for (let n = 0; n < 6; n++) {
            const day = addDays(start, n * 7);
            state = at(state, day);
            const before = state.congress.disposition;
            const result = proposeDeferral(state, { account: ACCOUNT, portion: 1, purpose: "policy", days: 7 });
            if (!result.ok)
                throw new Error(result.reason);
            state = apply(state, result.packet);
            costs.push(Math.round((before - state.congress.disposition) * 1000) / 1000);
            const end = at(state, addDays(day, 7));
            state = run(end, impoundmentPackets(end));
        }
        expect(costs[0]).toBe(0);
        expect(costs[1]).toBeGreaterThan(0);
        expect(costs[2]).toBeGreaterThan(costs[1]);
        expect(Math.max(...costs)).toBeLessThanOrEqual(UNLAWFUL_DEFERRAL_DISPOSITION_COST);
    });
    it("spends the week on the book as a same-week release leaves it", () => {
        const sentOn = d(2029, 3, 1);
        const sentState = sent(founded, sentOn, (c) => proposeDeferral(c, { account: ACCOUNT, portion: 1, purpose: "contingency", days: 7 }));
        const endDay = at(sentState, addDays(sentOn, 7));
        const spending = budgetPhase(endDay).slice(1);
        const released = run(endDay, impoundmentPackets(endDay));
        expect(selectImpoundments(released)[0].status).toBe("released");
        const after = budgetPhase(released);
        expect(spending.map(metricTreasury)).toEqual(after.map(metricTreasury));
    });
});
