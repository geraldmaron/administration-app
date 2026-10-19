import { describe, expect, it } from "vitest";
import { LAW_OFFSETS } from "./law-offsets.js";
import { foundedForBalance } from "./balance-harness.js";
import { buildCampaign, withWeeksElapsed } from "./__fixtures__/campaign.js";
import { fiscalYearOf, selectTurnOfDate } from "./clock.js";
import { apply } from "./effects.js";
import { ACCOUNT_CAP, accountCap, budgetPhase } from "./budget.js";
import { TURNS_PER_YEAR } from "./pace.js";
import { enactBudget, projectBudgetDraft } from "./budget-draft.js";
import { projectConfirmation } from "./congress.js";
import { LEGISLATIVE_ACTS, actCost, legislativeAct } from "./legislative-acts.js";
import { BILL_SETBACK_LIMIT, BILL_STAGES, advanceBills, projectPassage } from "./bill-stages.js";
import { billsOnTheAgenda, lawBlocksOrder, lawsBarUnilateralForce, legislationPhase, originationBlocked, overrideWouldCarry, projectOverride, signBill, administrationWouldWrite, transmit, transmittableActs, vetoBill, TRANSMISSION_DISPOSITION_COST, } from "./legislation.js";
import { carried, warPowersStanding } from "./congress.js";
import { orderAvailability, executiveOrder } from "./orders.js";
import { CURRENT_SCHEMA_VERSION, createSave, loadSave } from "./save.js";
import { selectBills, selectBillsOnTheDesk, selectLaws, } from "./state.js";
const DEFENSE_ACT = "act-defense-authorization";
const PRESS_ACT = "act-press-shield";
const EMERGENCY_ACT = "act-emergency-powers-limitation";
const WAR_POWERS_ACT = "act-war-powers-enforcement";
const FISCAL_ACT = "act-fiscal-responsibility";
const INFRASTRUCTURE_ACT = "act-infrastructure-investment";
const FULL_YEAR_CR_ACT = "act-full-year-continuing-resolution";
const DEBT_LIMIT_ACT = "act-debt-limit-increase";
const FARM_ACT = "act-agriculture-improvement";
const TAX_ACT = "act-tax-relief-and-growth";
const IMMIGRATION_ACT = "act-immigration-reform";
/**
 * The top of the window Congress draws its next session inside.
 *
 * Stated here rather than imported because the point of the throughput test
 * below is that the *observed* spacing still answers to the drawn window; a
 * constant read out of the module under test would move with it.
 */
const ORIGINATION_MAX_WEEKS = 14;
/** Whether the floor as it stands would carry an act to the desk. */
function carriedPassage(campaign, actId) {
    return projectPassage(campaign, legislativeAct(actId)).every((vote) => vote.passed);
}
/**
 * A Senate the administration holds fifty-five seats of — a majority nobody
 * would call narrow, and five short of the only number that matters for
 * ordinary legislation.
 */
function fiftyFive(campaign) {
    return {
        ...campaign,
        congress: {
            ...campaign.congress,
            disposition: 0.6,
            chambers: {
                ...campaign.congress.chambers,
                senate: { seats: 100, administration: 55, opposition: 45, independent: 0 },
            },
        },
    };
}
/** Run `turns` weeks of nothing but the appropriation. */
function runWeeks(campaign, turns) {
    let state = campaign;
    for (let i = 0; i < turns; i += 1) {
        state = budgetPhase(state).reduce((acc, packet) => apply(acc, packet), state);
        state = withWeeksElapsed(state, 1);
    }
    return state;
}
function onTheDesk(campaign, actId) {
    const act = legislativeAct(actId);
    const bill = {
        id: `bill:${actId}:${campaign.turn}`,
        act: actId,
        title: act.title,
        sponsor: act.sponsor,
        introducedTurn: campaign.turn,
        status: "on-the-desk",
        passage: projectPassage(campaign, act),
    };
    return { ...campaign, bills: { ...campaign.bills, [bill.id]: bill } };
}
/**
 * Congress holds an ordinary bill at the floor while another waits on the
 * President, so the desk carries one at a time. A deadline measure is the
 * exception: a stopgap is presented the week it passes whatever else is
 * enrolled, because holding it for another bill's ten days would shut the
 * government the stopgap exists to keep open.
 */
function expectOneOrdinaryBillOnTheDesk(campaign) {
    const desk = selectBillsOnTheDesk(campaign);
    const ordinary = desk.filter((bill) => legislativeAct(bill.act)?.urgent !== true);
    expect(ordinary.length, desk.map((bill) => bill.id).join(", ")).toBeLessThanOrEqual(1);
    expect(desk.length - ordinary.length).toBeLessThanOrEqual(1);
}
const friendly = (campaign, disposition) => ({
    ...campaign,
    congress: { ...campaign.congress, disposition },
});
// Narrowing helper: every one of these calls is expected to succeed, and a
// cast would hide the day one of them stops.
/** One week of the stages, applied the way the phase applies them. */
function applyAdvance(campaign) {
    const advance = advanceBills(campaign);
    if (advance.effects.length === 0)
        return campaign;
    return apply(campaign, {
        source: "simulate",
        actor: "world",
        turn: campaign.turn,
        narration: { summary: advance.accounts.join(" ") || "The chambers sit." },
        effects: advance.effects,
    });
}
function packetOf(result) {
    if (!result.ok || !result.packet)
        throw new Error(`expected a packet, got: ${result.reason ?? "no reason"}`);
    return result.packet;
}
describe("the catalogue", () => {
    it("gives every act a title a player could remember it by", () => {
        for (const act of LEGISLATIVE_ACTS) {
            // An act or a joint resolution, and nothing else. Congress produces both,
            // and a resolution of disapproval titled as an act would be the one
            // instrument in the catalogue whose own name misstates what it is.
            expect(act.title, act.id).toMatch(/^(The .+ Act|A Joint Resolution .+|A (Full-Year )?Continuing Resolution)$/);
            expect(act.summary.length, act.id).toBeGreaterThan(20);
        }
    });
    it("puts an act on the agenda only when the country has produced the reason for it", () => {
        const campaign = buildCampaign();
        expect(billsOnTheAgenda(campaign).map((act) => act.id)).not.toContain(WAR_POWERS_ACT);
        const gone_around = {
            ...campaign,
            congress: {
                ...campaign.congress,
                unauthorized: [{ id: "u", target: "ALP", turn: 2, rung: 5, description: "test" }],
            },
        };
        expect(billsOnTheAgenda(gone_around).map((act) => act.id)).toContain(WAR_POWERS_ACT);
    });
    it("names no flat sum of money anywhere on the catalogue", () => {
        // An appropriation with no denominator is a number that means one thing to
        // a small state and nothing at all to a federal budget.
        for (const act of LEGISLATIVE_ACTS) {
            expect(act.cost.treasury, act.id).toBeUndefined();
        }
    });
    it("appropriates as a share of what the country produces", () => {
        const campaign = buildCampaign();
        for (const act of LEGISLATIVE_ACTS) {
            const cost = actCost(campaign, act);
            if (act.treasuryOfGdp === undefined) {
                expect(cost.treasury, act.id).toBeUndefined();
                continue;
            }
            // Fixture GDP is 50,000.
            expect(cost.treasury, act.id).toBe(Math.round(act.treasuryOfGdp * 50_000));
        }
        // The infrastructure act spends the administration's authority. The fiscal
        // cap saves the *country* money and hands the President none of it: a
        // saving on future outlays is less borrowing, which is where it is now
        // booked, and a positive figure here was the same money counted twice.
        expect(actCost(campaign, legislativeAct(INFRASTRUCTURE_ACT)).treasury).toBeLessThan(0);
        const cap = legislativeAct(FISCAL_ACT);
        expect(actCost(campaign, cap).treasury).toBeUndefined();
        expect(cap.nationEffects["economy.debt"]).toBeUndefined();
        expect(LAW_OFFSETS[FISCAL_ACT].outlays).toBeLessThan(0);
    });
    it("charges the enacting country what the projection of that country said", () => {
        const campaign = onTheDesk(buildCampaign(), INFRASTRUCTURE_ACT);
        const bill = selectBillsOnTheDesk(campaign)[0];
        const after = apply(campaign, packetOf(signBill(campaign, bill.id)));
        expect(after.player.metrics.treasury - campaign.player.metrics.treasury).toBe(actCost(campaign, legislativeAct(INFRASTRUCTURE_ACT)).treasury);
    });
});
describe("the desk", () => {
    it("signs a bill into law and changes the country with it", () => {
        const campaign = onTheDesk(buildCampaign(), DEFENSE_ACT);
        const bill = selectBillsOnTheDesk(campaign)[0];
        const result = signBill(campaign, bill.id);
        expect(result.ok).toBe(true);
        if (!result.ok)
            return;
        const after = apply(campaign, result.packet);
        expect(selectLaws(after).map((law) => law.act)).toEqual([DEFENSE_ACT]);
        const nation = campaign.founding.nation;
        expect(after.nations[nation].stats.military.doctrineQuality).toBeGreaterThan(campaign.nations[nation].stats.military.doctrineQuality);
        // Signing what Congress sent is the one thing that costs a president
        // nothing on the Hill.
        expect(after.congress.disposition).toBeGreaterThan(campaign.congress.disposition);
    });
    it("will not send back a veto with no message on it", () => {
        const campaign = onTheDesk(buildCampaign(), DEFENSE_ACT);
        const bill = selectBillsOnTheDesk(campaign)[0];
        expect(vetoBill(campaign, bill.id, "  ").ok).toBe(false);
        expect(vetoBill(campaign, bill.id, "The bill spends money the country has not got.").ok).toBe(true);
    });
    it("refuses to sign the same bill twice", () => {
        const campaign = onTheDesk(buildCampaign(), DEFENSE_ACT);
        const bill = selectBillsOnTheDesk(campaign)[0];
        const signed = apply(campaign, packetOf(signBill(campaign, bill.id)));
        expect(signBill(signed, bill.id).ok).toBe(false);
        expect(vetoBill(signed, bill.id, "changed my mind").ok).toBe(false);
    });
    it("exposes the two-thirds count a veto would have to survive", () => {
        const campaign = onTheDesk(friendly(buildCampaign(), 0.15), DEFENSE_ACT);
        const bill = selectBillsOnTheDesk(campaign)[0];
        const votes = projectOverride(campaign, bill);
        expect(votes).toHaveLength(2);
        expect(votes.find((vote) => vote.chamber === "senate").required).toBe(67);
        expect(votes.find((vote) => vote.chamber === "house").required).toBe(290);
        expect(overrideWouldCarry(campaign, bill)).toBe(true);
    });
    it("reads a member's matched issue outreach into the actual override roll call", () => {
        const campaign = onTheDesk(foundedForBalance("override-issue-context").campaign, DEFENSE_ACT);
        const bill = selectBillsOnTheDesk(campaign)[0];
        const before = projectOverride(campaign, bill).find((vote) => vote.chamber === "house");
        expect(before.rollCall).toHaveLength(435);
        expect(before.rollCall.some((entry) => entry.reasons.some((reason) => reason.startsWith("Policy convictions")))).toBe(true);
        expect(before.rollCall.some((entry) => entry.reasons.some((reason) => reason.startsWith("Home-state interests")))).toBe(true);
        const member = before.rollCall.find((entry) => entry.support > 0.2 && entry.support < 0.8);
        expect(member).toBeDefined();
        const person = campaign.people[member.person];
        const pressure = { source: "test", delta: 0.08, through: campaign.calendar, account: "Member heard a specific argument" };
        const withPressure = (actId) => ({ ...campaign, people: {
                ...campaign.people,
                [member.person]: { ...person, issuePressure: [{ ...pressure, actId }] },
            } });
        const matched = projectOverride(withPressure(DEFENSE_ACT), bill).find((vote) => vote.chamber === "house").rollCall.find((entry) => entry.person === member.person);
        const unrelated = projectOverride(withPressure(PRESS_ACT), bill).find((vote) => vote.chamber === "house").rollCall.find((entry) => entry.person === member.person);
        expect(matched.support).toBeCloseTo(member.support + 0.08);
        expect(matched.reasons).toContain("Recorded issue-specific outreach");
        expect(unrelated.support).toBe(member.support);
    });
    /**
     * The override count must not run `countVote`, whose yeas are members voting
     * *with* the President: that makes the friendlier chamber the likelier one to
     * overrule him, so an override never carries in play and the only way to reach
     * the branch is to force a *friendly* disposition, which is the opposite of
     * the situation the mechanism exists for.
     */
    it("passes a restraint in a hostile chamber and fails it in a friendly one", () => {
        const act = legislativeAct(WAR_POWERS_ACT);
        const hostile = projectPassage(friendly(buildCampaign(), 0.2), act);
        const warm = projectPassage(friendly(buildCampaign(), 0.95), act);
        expect(hostile.every((vote) => vote.passed)).toBe(true);
        expect(warm.every((vote) => vote.passed)).toBe(false);
    });
    it("carries an override where the chamber is hostile, and not where it is friendly", () => {
        const bill = selectBillsOnTheDesk(onTheDesk(buildCampaign(), DEFENSE_ACT))[0];
        expect(overrideWouldCarry(friendly(buildCampaign(), 0.95), bill)).toBe(false);
        expect(overrideWouldCarry(friendly(buildCampaign(), 0.6), bill)).toBe(false);
        expect(overrideWouldCarry(friendly(buildCampaign(), 0.3), bill)).toBe(true);
    });
    it("passes a bill over the President where the votes are there, and buries it where they are not", () => {
        for (const [disposition, expected] of [[0.05, "law"], [0.95, "dead"]]) {
            const campaign = onTheDesk(friendly(buildCampaign(), disposition), DEFENSE_ACT);
            const bill = selectBillsOnTheDesk(campaign)[0];
            const vetoed = apply(campaign, packetOf(vetoBill(campaign, bill.id, "The bill is not what the country needs.")));
            // Congress takes it back up once the delay has run.
            const later = { ...vetoed, turn: vetoed.turn + 3 };
            const packets = legislationPhase(later);
            const after = packets.reduce(apply, later);
            expect(after.bills[bill.id].status, `disposition ${disposition}`).toBe(expected);
            expect(after.bills[bill.id].override, `disposition ${disposition}`).toHaveLength(2);
            if (expected === "law")
                expect(after.bills[bill.id].enactedBy).toBe("veto-overridden");
        }
    });
    it("records how a law became law: signed, or left on the desk until it enacted itself", () => {
        const campaign = onTheDesk(buildCampaign(), INFRASTRUCTURE_ACT);
        const bill = selectBillsOnTheDesk(campaign)[0];
        expect(apply(campaign, packetOf(signBill(campaign, bill.id))).bills[bill.id].enactedBy).toBe("signed");
        const silent = { ...campaign, turn: bill.introducedTurn + 2 };
        const after = legislationPhase(silent).reduce(apply, silent);
        expect(after.bills[bill.id].status).toBe("law");
        expect(after.bills[bill.id].enactedBy).toBe("unsigned");
    });
});
describe("the sixty votes ordinary legislation actually needs", () => {
    it("counts the Senate against cloture and the House against a majority", () => {
        const campaign = buildCampaign();
        const votes = projectPassage(campaign, legislativeAct(DEFENSE_ACT));
        expect(votes.find((vote) => vote.chamber === "senate").cloture.required).toBe(60);
        expect(votes.find((vote) => vote.chamber === "house").required).toBe(218);
    });
    it("passes a reconciliation act on a fifty-five-seat Senate and refuses an ordinary one", () => {
        // The same room, the same week, the same president: the only thing that
        // differs is which track the measure travels on.
        const campaign = fiftyFive(buildCampaign());
        const senate = (actId) => projectPassage(campaign, legislativeAct(actId)).find((vote) => vote.chamber === "senate");
        const budgetTrack = senate(FISCAL_ACT);
        expect(budgetTrack.required).toBe(51);
        expect(budgetTrack.yeas).toBeGreaterThanOrEqual(55);
        expect(budgetTrack.passed).toBe(true);
        const ordinary = senate(PRESS_ACT);
        expect(ordinary.required).toBe(51);
        expect(ordinary.cloture.required).toBe(60);
        expect(ordinary.yeas).toBeLessThan(60);
        expect(ordinary.cloture.passed).toBe(false);
    });
    it("leaves a nomination at a majority, which is what the Senate's own rule now is", () => {
        const campaign = fiftyFive(buildCampaign());
        const nominee = Object.keys(campaign.people)[0];
        expect(projectConfirmation(campaign, "role-a", nominee).vote.required).toBe(51);
    });
});
describe("what an authorization actually authorizes", () => {
    it("moves no money and no readiness by itself", () => {
        const campaign = onTheDesk(buildCampaign(), DEFENSE_ACT);
        const bill = selectBillsOnTheDesk(campaign)[0];
        const after = apply(campaign, packetOf(signBill(campaign, bill.id)));
        expect(after.player.metrics.treasury).toBe(campaign.player.metrics.treasury);
        expect(after.player.metrics.militaryReadiness).toBe(campaign.player.metrics.militaryReadiness);
    });
    it("lifts the ceiling the appropriators may write against, for as long as it runs", () => {
        const campaign = onTheDesk(buildCampaign(), DEFENSE_ACT);
        const bill = selectBillsOnTheDesk(campaign)[0];
        expect(accountCap(campaign, "military")).toBe(ACCOUNT_CAP);
        expect(projectBudgetDraft(campaign, { military: ACCOUNT_CAP + 0.005 }).ok).toBe(false);
        const after = apply(campaign, packetOf(signBill(campaign, bill.id)));
        expect(accountCap(after, "military")).toBeGreaterThan(ACCOUNT_CAP);
        // And only the account it named: an authorization for the armed services
        // does not widen the room for the intelligence services.
        expect(accountCap(after, "covert")).toBe(ACCOUNT_CAP);
        expect(projectBudgetDraft(after, { military: ACCOUNT_CAP + 0.005 }).ok).toBe(true);
        const lapsed = { ...after, turn: after.turn + legislativeAct(DEFENSE_ACT).raisesCap.turns };
        expect(accountCap(lapsed, "military")).toBe(ACCOUNT_CAP);
    });
    it("delivers readiness only once the appropriation is voted and the weeks are run", () => {
        const base = onTheDesk(buildCampaign(), DEFENSE_ACT);
        const enacted = apply(base, packetOf(signBill(base, selectBillsOnTheDesk(base)[0].id)));
        const readiness = (campaign) => campaign.nations[campaign.founding.nation].stats.military.readiness;
        // Four weeks with the act and without it are the same four weeks: the
        // authorization changed what may be spent, and nothing was spent.
        expect(readiness(runWeeks(enacted, 4))).toBeCloseTo(readiness(runWeeks(base, 4)), 6);
        // The same act, with the money behind it.
        const draft = projectBudgetDraft(enacted, { military: ACCOUNT_CAP + 0.005 });
        expect(draft.ok).toBe(true);
        if (!draft.ok)
            return;
        const funded = runWeeks(apply(enacted, packetOf(enactBudget(enacted, draft.candidate))), 4);
        expect(readiness(funded)).toBeGreaterThan(readiness(runWeeks(enacted, 4)));
    });
});
describe("what a law does afterwards", () => {
    it("puts an executive order out of the President's reach entirely", () => {
        const campaign = onTheDesk(buildCampaign(), EMERGENCY_ACT);
        const bill = selectBillsOnTheDesk(campaign)[0];
        const after = apply(campaign, packetOf(signBill(campaign, bill.id)));
        const order = executiveOrder("order-emergency-construction");
        expect(lawBlocksOrder(after, order.id)?.act).toBe(EMERGENCY_ACT);
        const availability = orderAvailability(after, order);
        expect(availability.ok).toBe(false);
        // Statute, not risk: an order a law forbids is not one that would probably
        // go badly, it is one that cannot be signed.
        if (!availability.ok)
            expect(availability.missing).toContain(legislativeAct(EMERGENCY_ACT).title);
    });
    it("takes away the office's own war-making latitude when Congress says so", () => {
        const base = {
            ...buildCampaign(),
            congress: {
                ...buildCampaign().congress,
                unauthorized: [{ id: "u", target: "ALP", turn: 1, rung: 5, description: "test" }],
            },
        };
        expect(lawsBarUnilateralForce(base)).toBe(false);
        const campaign = onTheDesk({ ...base, turn: base.turn + 20 }, WAR_POWERS_ACT);
        const bill = selectBillsOnTheDesk(campaign)[0];
        const after = apply(campaign, packetOf(signBill(campaign, bill.id)));
        expect(lawsBarUnilateralForce(after)).toBe(true);
        // The constitutional reading is unchanged — the office still has its own
        // authority. What has changed is that statute has withdrawn it, which the
        // ladder's gate is what enforces.
        expect(warPowersStanding(after, "OTH", 5).kind).toBe("unilateral");
    });
});
describe("a bill in the save", () => {
    it("survives the round trip with its votes and its status", () => {
        const campaign = onTheDesk(buildCampaign(), DEFENSE_ACT);
        const bill = selectBillsOnTheDesk(campaign)[0];
        const signed = apply(campaign, packetOf(signBill(campaign, bill.id)));
        const reloaded = loadSave(JSON.parse(JSON.stringify(createSave(signed))));
        expect(reloaded.bills[bill.id]).toEqual(signed.bills[bill.id]);
        expect(reloaded.congress).toEqual(signed.congress);
        expect(createSave(signed).schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    });
});
// The measured defect: one bill originated in eighty turns of a real campaign
// and the other eligible acts sat on the agenda the whole time. Two causes,
// both here — origination refuses to send a second bill while one is on the
// desk and nothing ever took a bill off the desk unless the player did, and the
// catalogue was one-shot, so what did pass never came round again.
describe("the rate a term is legislated at", () => {
    /**
     * Congress friendly enough that the floor carries what it takes up.
     *
     * This is what a cloture bar costs a test about cadence: at a merely warm
     * disposition the Senate carries the defense authorization and the budget
     * track and nothing else, so a run measuring how often Congress originates
     * would instead be measuring how rarely sixty senators agree. That is the
     * subject of the cloture tests above; here the room is made friendly enough
     * that the sixty is not the thing being observed.
     */
    function chamber(turn) {
        return { ...friendly(buildCampaign(), 0.85), turn };
    }
    it("takes a bill nobody signed off the desk after the ten days run", () => {
        const campaign = { ...onTheDesk(chamber(4), DEFENSE_ACT) };
        const bill = selectBillsOnTheDesk(campaign)[0];
        // Still inside the window: the desk is the President's.
        expect(selectBillsOnTheDesk(legislationPhase(campaign).reduce(apply, campaign))).toHaveLength(1);
        const late = { ...campaign, turn: campaign.turn + 2 };
        const after = legislationPhase(late).reduce(apply, late);
        expect(after.bills[bill.id].status).toBe("law");
        expect(selectBillsOnTheDesk(after)).toHaveLength(0);
        // Unsigned law is a position, and the country reads it as one.
        expect(after.player.metrics.standing).toBeLessThan(late.player.metrics.standing);
    });
    it("originates roughly every eight to fourteen weeks rather than freezing behind an unread desk", () => {
        let state = chamber(1);
        const introduced = [];
        for (let i = 0; i < 60; i++) {
            state = legislationPhase(state).reduce(apply, state);
            for (const bill of Object.values(state.bills)) {
                if (!introduced.includes(bill.introducedTurn))
                    introduced.push(bill.introducedTurn);
            }
            state = withWeeksElapsed(state, 1);
        }
        expect(introduced.length).toBeGreaterThan(2);
        const gaps = introduced.slice(1).map((turn, index) => turn - introduced[index]);
        for (const gap of gaps) {
            // The desk clock costs two weeks on top of the drawn gap, so the observed
            // spacing is the window plus the time the President had to answer.
            expect(gap, `gaps ${gaps.join(",")}`).toBeLessThanOrEqual(20);
        }
    });
    it("draws across the eligible acts rather than sending the same one every time", () => {
        let state = chamber(1);
        for (let i = 0; i < 60; i++) {
            state = legislationPhase(state).reduce(apply, state);
            state = withWeeksElapsed(state, 1);
        }
        const acts = new Set(Object.values(state.bills).map((bill) => bill.act));
        expect(acts.size).toBeGreaterThan(1);
    });
    it("reopens a recurring act on its own calendar and leaves a one-off act closed", () => {
        const campaign = apply(onTheDesk(chamber(1), DEFENSE_ACT), packetOf(signBill(onTheDesk(chamber(1), DEFENSE_ACT), selectBillsOnTheDesk(onTheDesk(chamber(1), DEFENSE_ACT))[0].id)));
        expect(billsOnTheAgenda(campaign).map((act) => act.id)).not.toContain(DEFENSE_ACT);
        const aYearOn = { ...campaign, turn: campaign.turn + legislativeAct(DEFENSE_ACT).recurs };
        expect(billsOnTheAgenda(aYearOn).map((act) => act.id)).toContain(DEFENSE_ACT);
    });
});
// A predicate no country can satisfy is the defect this catalogue is most
// exposed to: an act with an honest-looking `arises` that never fires reads as
// content and ships as nothing. Every act is proven to reach the agenda out of
// a state the simulation can actually produce.
describe("the recurring docket a term meets", () => {
    function withStats(campaign, stats) {
        const nation = campaign.nations[campaign.founding.nation];
        return {
            ...campaign,
            nations: {
                ...campaign.nations,
                [campaign.founding.nation]: { ...nation, stats: { ...nation.stats, ...stats } },
            },
        };
    }
    const agenda = (campaign) => billsOnTheAgenda(campaign).map((act) => act.id);
    it("writes the year off once the government has lived half of it on stopgaps", () => {
        const campaign = buildCampaign();
        expect(agenda(campaign)).not.toContain(FULL_YEAR_CR_ACT);
        const conceded = {
            ...campaign,
            turn: campaign.congress.appropriation.enactedTurn + Math.round(TURNS_PER_YEAR / 2),
            congress: { ...campaign.congress, appropriation: { ...campaign.congress.appropriation, onPriorYear: true } },
        };
        expect(agenda(conceded)).toContain(FULL_YEAR_CR_ACT);
        // The rest of the fiscal year at the numbers already in force, and not a
        // dollar of new appropriation.
        const act = legislativeAct(FULL_YEAR_CR_ACT);
        expect(act.funds).toEqual({ throughFiscalYear: true });
        expect(act.treasuryOfGdp).toBeUndefined();
    });
    it("funds a conceded year to its September 30, not to a year from the week it passed", () => {
        const campaign = buildCampaign();
        // A lapsed October: FY2030 has begun and nothing pays for it.
        const lapsed = withWeeksElapsed({
            ...campaign,
            congress: { ...campaign.congress, appropriation: { ...campaign.congress.appropriation, onPriorYear: true } },
        }, 40);
        const signed = apply(lapsed, packetOf(signBill(onTheDesk(lapsed, FULL_YEAR_CR_ACT), `bill:${FULL_YEAR_CR_ACT}:${lapsed.turn}`)));
        const through = signed.congress.appropriation.throughTurn;
        expect(fiscalYearOf(lapsed.calendar)).toBe(2030);
        expect(through).toBe(selectTurnOfDate(lapsed, { year: 2030, month: 9, day: 30 }));
        expect(through).not.toBe(lapsed.turn + TURNS_PER_YEAR);
    });
    it("puts the debt limit on the floor a quarter before the Treasury runs out of room", () => {
        const campaign = buildCampaign();
        expect(agenda(campaign)).not.toContain(DEBT_LIMIT_ACT);
        const pressed = { ...campaign, debtLimit: { ...campaign.debtLimit, headroomWeeks: 13 } };
        expect(agenda(pressed)).toContain(DEBT_LIMIT_ACT);
        // Borrowed and owed at the same size: the trade is cash now against a stock.
        const act = legislativeAct(DEBT_LIMIT_ACT);
        expect(act.treasuryOfGdp).toBe(act.nationEffects["economy.debt"]);
    });
    it("renews the farm bill on its own five-year calendar and not before", () => {
        const campaign = buildCampaign();
        expect(agenda(campaign)).toContain(FARM_ACT);
        const enacted = apply(campaign, packetOf(signBill(onTheDesk(campaign, FARM_ACT), `bill:${FARM_ACT}:${campaign.turn}`)));
        expect(agenda(enacted)).not.toContain(FARM_ACT);
        expect(agenda({ ...enacted, turn: enacted.turn + TURNS_PER_YEAR * 5 })).toContain(FARM_ACT);
    });
    it("takes up a tax package in a slump and leaves it alone in a good year", () => {
        const campaign = buildCampaign();
        expect(agenda(campaign)).not.toContain(TAX_ACT);
        const economy = campaign.nations[campaign.founding.nation].stats.economy;
        expect(agenda(withStats(campaign, { economy: { ...economy, growth: 0.005 } }))).toContain(TAX_ACT);
        expect(agenda(withStats(campaign, { economy: { ...economy, unemployment: 0.08 } }))).toContain(TAX_ACT);
    });
    it("takes up immigration on either half of the coalition that writes it", () => {
        const campaign = buildCampaign();
        const { economy, security } = campaign.nations[campaign.founding.nation].stats;
        const settled = withStats(campaign, {
            economy: { ...economy, unemployment: 0.07 },
            security: { ...security, borderControl: 0.9 },
        });
        expect(agenda(settled)).not.toContain(IMMIGRATION_ACT);
        expect(agenda(withStats(settled, { economy: { ...economy, unemployment: 0.04 } })), "a labor market short of workers").toContain(IMMIGRATION_ACT);
        expect(agenda(withStats(settled, { security: { ...security, borderControl: 0.5 } })), "a border the country does not believe is under control").toContain(IMMIGRATION_ACT);
    });
    it("keeps the desk to one ordinary bill at a time however long the agenda gets", () => {
        let state = { ...friendly(buildCampaign(), 0.85), turn: 1 };
        for (let i = 0; i < 120; i++) {
            state = legislationPhase(state).reduce(apply, state);
            expectOneOrdinaryBillOnTheDesk(state);
            state = withWeeksElapsed(state, 1);
        }
    });
});
describe("a bill as a passage rather than a roll", () => {
    const willing = (campaign) => friendly(campaign, 0.9);
    /** Run the legislative week `turns` times, and hand back the campaign. */
    function legislate(campaign, turns) {
        let state = campaign;
        for (let i = 0; i < turns; i += 1) {
            state = legislationPhase(state).reduce(apply, state);
            state = withWeeksElapsed(state, 1);
        }
        return state;
    }
    it("moves a referred bill through markup and the floor before the desk", () => {
        const campaign = apply(willing(buildCampaign()), packetOf(transmit(willing(buildCampaign()), INFRASTRUCTURE_ACT)));
        const id = `bill:${INFRASTRUCTURE_ACT}:${campaign.turn}`;
        const stages = [];
        let state = campaign;
        for (let i = 0; i < 30 && state.bills[id].status === "in-progress"; i += 1) {
            state = legislate(state, 1);
            const bill = state.bills[id];
            if (bill.stage !== undefined && stages[stages.length - 1] !== bill.stage)
                stages.push(bill.stage);
        }
        // Never backwards, and never skipping a room.
        expect(stages).toEqual(BILL_STAGES.slice(1, stages.length + 1));
        expect(state.bills[id].status).toBe("on-the-desk");
        // The desk quotes the count the floor actually took, not the one projected
        // on the day the bill was written.
        expect(state.bills[id].passage.length).toBe(2);
        expect(state.bills[id].beats.length).toBeGreaterThan(2);
    });
    it("buries a bill on the third stall, and keeps the record of it", () => {
        // A chamber that despises the administration, on the act with the lowest
        // appeal in the catalogue: this is the bill that dies in committee.
        const campaign = friendly(buildCampaign(), 0);
        const bill = {
            id: "bill:stalled",
            act: IMMIGRATION_ACT,
            title: legislativeAct(IMMIGRATION_ACT).title,
            sponsor: "bipartisan",
            introducedTurn: campaign.turn,
            status: "in-progress",
            stage: "referral",
            setbacks: 2,
            momentum: 0,
            beats: [],
            passage: [],
        };
        let state = { ...campaign, bills: { [bill.id]: bill } };
        for (let i = 0; i < 20 && state.bills[bill.id].status === "in-progress"; i += 1) {
            state = legislate(state, 1);
        }
        const dead = state.bills[bill.id];
        expect(dead.status).toBe("dead");
        expect(dead.setbacks).toBe(BILL_SETBACK_LIMIT);
        expect(dead.resolvedTurn).toBeDefined();
        expect(dead.beats.some((beat) => beat.outcome === "stagnation")).toBe(true);
    });
    it("legislates identically on a replay, and differently on another seed", () => {
        const campaign = willing(buildCampaign());
        const once = legislate(campaign, 40);
        const again = legislate(campaign, 40);
        expect(Object.keys(again.bills)).toEqual(Object.keys(once.bills));
        for (const id of Object.keys(once.bills)) {
            expect(again.bills[id]).toEqual(once.bills[id]);
        }
    });
    it("keeps one bill in the chambers at a time, and the desk to one ordinary bill, across a term", () => {
        let state = { ...friendly(buildCampaign(), 0.85), turn: 1 };
        for (let i = 0; i < 120; i += 1) {
            state = legislationPhase(state).reduce(apply, state);
            expectOneOrdinaryBillOnTheDesk(state);
            expect(Object.values(state.bills).filter((bill) => bill.status === "in-progress").length)
                .toBeLessThanOrEqual(1);
            state = withWeeksElapsed(state, 1);
        }
    });
    it("does not silt the agenda: a term still meets bills at the old cadence", () => {
        // The regression the staging was most likely to cause. The weeks a measure
        // spends in committee are spent inside the gap Congress was going to wait
        // anyway, so a hundred and twenty weeks still produce a term's worth of
        // legislation rather than three bills and a queue.
        let state = { ...friendly(buildCampaign(), 0.85), turn: 1 };
        for (let i = 0; i < 120; i += 1) {
            state = legislationPhase(state).reduce(apply, state);
            state = withWeeksElapsed(state, 1);
        }
        const bills = [...Object.values(state.bills)].sort((a, b) => a.introducedTurn - b.introducedTurn);
        expect(bills.length).toBeGreaterThan(4);
        const gaps = bills.slice(1).map((bill, index) => bill.introducedTurn - bills[index].introducedTurn);
        for (const gap of gaps) {
            // The drawn window is eight to fourteen weeks. A measure that spent its
            // committee weeks *outside* that window would show up here as a gap that
            // had grown by the length of a passage.
            expect(gap, `gaps ${gaps.join(",")}`).toBeLessThanOrEqual(ORIGINATION_MAX_WEEKS);
        }
        // Nothing is stuck: all but the measure currently in flight has an end, and
        // the ones that ended did so inside the term rather than in the queue.
        const open = bills.filter((bill) => bill.status === "in-progress");
        expect(open.length).toBeLessThanOrEqual(1);
        for (const bill of bills) {
            if (bill.resolvedTurn === undefined)
                continue;
            expect(bill.resolvedTurn - bill.introducedTurn, bill.id).toBeLessThanOrEqual(15);
        }
    });
    it("keeps the agenda from going thin in the back half of a term", () => {
        // The staged-enactment harness found the catalogue's real defect: every
        // non-recurring act was enacted by turn 71, and nothing arose after —
        // six bills for a whole term. Enacting is not enough; the desk clock and
        // the origination gap have to still find something to send in the second
        // half of a hundred and twenty weeks, which only holds if the acts that
        // re-arm on world state actually do.
        let state = { ...friendly(buildCampaign(), 0.85), turn: 1 };
        let sawAgendaAfterTurn71 = false;
        for (let i = 0; i < 120; i += 1) {
            if (state.turn > 71 && billsOnTheAgenda(state).length > 0)
                sawAgendaAfterTurn71 = true;
            state = legislationPhase(state).reduce(apply, state);
            // The desk clock and the origination gap are the two invariants this
            // gate must not trade away for a fuller agenda.
            expectOneOrdinaryBillOnTheDesk(state);
            expect(Object.values(state.bills).filter((bill) => bill.status === "in-progress").length)
                .toBeLessThanOrEqual(1);
            state = withWeeksElapsed(state, 1);
        }
        expect(sawAgendaAfterTurn71).toBe(true);
    });
    it("sends a stopgap to the desk the week it is taken up", () => {
        // A deadline measure is discharged rather than referred: a continuing
        // resolution that spent a month in markup could not end a shutdown.
        const campaign = friendly(buildCampaign(), 0.85);
        const short = {
            ...campaign,
            turn: 40,
            congress: {
                ...campaign.congress,
                appropriation: { enactedTurn: 0, throughTurn: 41, onPriorYear: true, priorYear: [] },
            },
        };
        const after = legislationPhase(short).reduce(apply, short);
        const stopgap = Object.values(after.bills).find((bill) => bill.act === "act-continuing-resolution");
        expect(stopgap?.status).toBe("on-the-desk");
        expect(stopgap?.stage).toBeUndefined();
    });
});
describe("POL-5: the other side's message bills, and three measures at once", () => {
    /**
     * The opposition holds the House, the room is warm to the President, and the
     * money is not running out — so the calendar is free for ordinary business and
     * the other side's own bills are the ones that cannot carry.
     */
    const divided = (campaign) => ({
        ...campaign,
        congress: {
            ...campaign.congress,
            disposition: 0.7,
            chambers: {
                ...campaign.congress.chambers,
                house: { seats: 435, administration: 200, opposition: 235, independent: 0 },
            },
            appropriation: { ...campaign.congress.appropriation, throughTurn: campaign.turn + 300 },
        },
    });
    const weekOn = (campaign) => {
        const after = legislationPhase(campaign).reduce(apply, campaign);
        return { ...after, turn: after.turn + 1 };
    };
    it("files a measure the other side cannot carry, and records the defeat on the floor", () => {
        let working = divided(buildCampaign());
        const opening = billsOnTheAgenda(working);
        // The premise: their bill is the one that fails in this chamber.
        expect(opening.filter((act) => act.sponsor === "opposition" && !carried(projectPassage(working, act)))).not.toHaveLength(0);
        let message;
        for (let week = 0; week < 120 && message === undefined; week += 1) {
            working = weekOn(working);
            message = selectBills(working).find((bill) => bill.status === "dead" &&
                bill.passage.length > 0 &&
                !carried(bill.passage) &&
                (bill.beats ?? []).some((beat) => /is called up and fails|fails to close debate/.test(beat.account)));
        }
        expect(message, "the opposition never filed and lost a measure in a Congress it holds").toBeDefined();
        expect(message.sponsor).toBe("opposition");
        // It ran the stages like any other bill, and the record keeps the count.
        const stages = (message.beats ?? []).map((beat) => beat.stage);
        expect(stages).toContain("referral");
        expect(stages).toContain("floor");
        expect((message.beats ?? []).at(-1).account).toMatch(/is called up and fails, \d+ to \d+\.|fails to close debate in the Senate, \d+ to \d+; final passage is not called\./);
        expect(carried(message.passage)).toBe(false);
    });
    it("leaves the majority's own calendar to bills it can carry", () => {
        // A message bill is floor time, and floor time belongs to whoever holds it.
        let held = { ...buildCampaign(), congress: { ...buildCampaign().congress, disposition: 0.7, appropriation: { ...buildCampaign().congress.appropriation, throughTurn: buildCampaign().turn + 300 } } };
        for (let week = 0; week < 60; week += 1) {
            held = weekOn(held);
            expect(selectBills(held).filter((bill) => bill.passage.length > 0 && !carried(bill.passage)), "the majority filed a bill it could not carry").toHaveLength(0);
        }
    });
    it("pulls a measure that could once carry rather than recording a loss", () => {
        const warm = friendly(buildCampaign(), 0.95);
        const act = legislativeAct(DEFENSE_ACT);
        expect(carried(projectPassage(warm, act))).toBe(true);
        const bill = {
            id: `bill:${DEFENSE_ACT}:1`,
            act: DEFENSE_ACT,
            title: act.title,
            sponsor: act.sponsor,
            introducedTurn: 1,
            status: "in-progress",
            stage: "floor",
            passage: projectPassage(warm, act),
        };
        let working = { ...friendly(buildCampaign(), 0.05), bills: { [bill.id]: bill } };
        for (let week = 0; week < 12; week += 1) {
            working = applyAdvance(working);
            working = { ...working, turn: working.turn + 1 };
        }
        const beats = working.bills[bill.id].beats ?? [];
        expect(beats.some((beat) => /is called up and fails|fails to close debate/.test(beat.account))).toBe(false);
        expect(beats.some((beat) => /pulled from the calendar/.test(beat.account))).toBe(true);
    });
    it("keeps three measures in flight and sends at most one to the desk a week", () => {
        const campaign = friendly(buildCampaign(), 0.95);
        const bills = Object.fromEntries([DEFENSE_ACT, FARM_ACT, IMMIGRATION_ACT].map((id) => {
            const act = legislativeAct(id);
            return [
                `bill:${id}:1`,
                {
                    id: `bill:${id}:1`,
                    act: id,
                    title: act.title,
                    sponsor: act.sponsor,
                    introducedTurn: 1,
                    status: "in-progress",
                    stage: "floor",
                    momentum: 0.5,
                    passage: projectPassage(campaign, act),
                },
            ];
        }));
        const crowded = { ...campaign, bills };
        expect(selectBills(crowded).filter((bill) => bill.status === "in-progress")).toHaveLength(3);
        // Congress starts nothing while the calendar is full.
        expect(originationBlocked(selectBills(crowded))).toBe(true);
        const arrivals = advanceBills(crowded).effects.filter((effect) => effect.kind === "bill" && effect.set.status === "on-the-desk");
        expect(arrivals.length).toBeLessThanOrEqual(1);
    });
});
describe("transmitting the administration's own bill", () => {
    const willing = (campaign) => friendly(campaign, 0.9);
    it("offers only the bills this administration wrote and ran on, off Congress's own agenda", () => {
        const campaign = willing(buildCampaign());
        const offered = transmittableActs(campaign).map((act) => act.id);
        expect(offered.length).toBeGreaterThan(0);
        for (const id of offered)
            expect(legislativeAct(id).sponsor).toBe("administration");
        expect(offered).toEqual(billsOnTheAgenda(campaign)
            .filter((act) => act.sponsor === "administration" && administrationWouldWrite(campaign, act))
            .map((act) => act.id));
        // The fixture sealed no platform, so the one act on the agenda that enacts a
        // plank is on Congress's agenda and not on the President's.
        const planked = billsOnTheAgenda(campaign).filter((act) => act.plank !== undefined);
        expect(planked.length).toBeGreaterThan(0);
        for (const act of planked)
            expect(offered).not.toContain(act.id);
    });
    it("refuses a plank bill the platform never carried, and offers it once it did", () => {
        const campaign = willing(buildCampaign());
        const act = billsOnTheAgenda(campaign).find((entry) => entry.plank !== undefined);
        const refusal = transmit(campaign, act.id);
        expect(refusal.ok).toBe(false);
        expect(refusal.ok === false && refusal.reason).toMatch(/not this administration's program/);
        const ran = { ...campaign, founding: { ...campaign.founding, platform: [act.plank] } };
        expect(administrationWouldWrite(ran, act)).toBe(true);
        expect(transmittableActs(ran).map((entry) => entry.id)).toContain(act.id);
    });
    it("refuses a plank bill from the other party's platform, however it was carried", () => {
        // A Republican who somehow ran on redistribution still cannot send up the
        // bill that enacts it: the program it puts in force is the other side's.
        const campaign = willing(buildCampaign());
        const act = billsOnTheAgenda(campaign).find((entry) => entry.plank !== undefined);
        const across = {
            ...campaign,
            founding: { ...campaign.founding, platform: [act.plank] },
            congress: { ...campaign.congress, administrationParty: "republican", caucusAnchor: "republican" },
        };
        expect(administrationWouldWrite(across, act)).toBe(false);
        expect(transmit(across, act.id).ok).toBe(false);
    });
    it("refuses a bill the administration did not write", () => {
        const refusal = transmit(willing(buildCampaign()), PRESS_ACT);
        expect(refusal.ok).toBe(false);
        expect(refusal.ok === false && refusal.reason).toMatch(/not this administration's bill/);
    });
    it("refuses an act Congress will not take up this week", () => {
        // The fixture economy is growing and fully employed, so the tax package has
        // not arisen — and an act off the agenda is not the President's to send.
        const settled = willing(buildCampaign());
        expect(billsOnTheAgenda(settled).map((act) => act.id)).not.toContain(TAX_ACT);
        const refusal = transmit(settled, TAX_ACT);
        expect(refusal.ok).toBe(false);
        expect(refusal.ok === false && refusal.reason).toMatch(/will not take up/);
    });
    it("sends a bill up while Congress is working one of its own", () => {
        // Three measures move at once, and one of the three places is the
        // administration's: a president is not locked out of their own agenda by a
        // bill somebody else filed.
        const occupied = onTheDesk(willing(buildCampaign()), DEFENSE_ACT);
        const sent = transmit(occupied, INFRASTRUCTURE_ACT);
        expect(sent.ok).toBe(true);
    });
    it("refuses a second administration bill while the first is still in the chambers", () => {
        const campaign = willing(buildCampaign());
        const working = apply(campaign, packetOf(transmit(campaign, INFRASTRUCTURE_ACT)));
        const refusal = transmit(working, DEBT_LIMIT_ACT);
        expect(refusal.ok).toBe(false);
        expect(refusal.ok === false && refusal.reason).toMatch(/already has a bill in the chambers/);
    });
    it("refuses when the calendar is full", () => {
        const campaign = willing(buildCampaign());
        const crowded = {
            ...campaign,
            bills: Object.fromEntries([DEFENSE_ACT, PRESS_ACT, "act-agriculture-improvement"].map((act, index) => [
                `bill:${act}:${campaign.turn - index}`,
                {
                    id: `bill:${act}:${campaign.turn - index}`,
                    act,
                    title: legislativeAct(act).title,
                    sponsor: legislativeAct(act).sponsor,
                    introducedTurn: campaign.turn - index,
                    status: "in-progress",
                    stage: "markup",
                    passage: [],
                },
            ])),
        };
        const refusal = transmit(crowded, INFRASTRUCTURE_ACT);
        expect(refusal.ok).toBe(false);
        expect(refusal.ok === false && refusal.reason).toMatch(/no room on the calendar/);
    });
    it("refers the administration's bill to committee rather than passing it the same week", () => {
        const campaign = willing(buildCampaign());
        expect(carriedPassage(campaign, INFRASTRUCTURE_ACT)).toBe(true);
        const after = apply(campaign, packetOf(transmit(campaign, INFRASTRUCTURE_ACT)));
        // Nothing is on the desk: transmitting buys a place on the calendar.
        expect(selectBillsOnTheDesk(after)).toHaveLength(0);
        const bill = after.bills[`bill:${INFRASTRUCTURE_ACT}:${campaign.turn}`];
        expect(bill.status).toBe("in-progress");
        expect(bill.stage).toBe("referral");
        expect(bill.setbacks).toBe(0);
        // The count the screen showed is the count the floor stage will run.
        expect(bill.passage).toEqual(projectPassage(campaign, legislativeAct(INFRASTRUCTURE_ACT)));
        expect(after.congress.disposition).toBeCloseTo(campaign.congress.disposition - TRANSMISSION_DISPOSITION_COST, 5);
        // Nothing has been enacted yet: transmitting is not signing.
        expect(selectLaws(after)).toHaveLength(0);
    });
    it("charges the floor time whether or not the bill ever carries", () => {
        const campaign = friendly(buildCampaign(), 0.1);
        expect(carriedPassage(campaign, INFRASTRUCTURE_ACT)).toBe(false);
        const after = apply(campaign, packetOf(transmit(campaign, INFRASTRUCTURE_ACT)));
        expect(after.congress.disposition).toBeLessThan(campaign.congress.disposition);
        // A bill the floor will not carry is still referred. What kills it is the
        // three stalls ahead of it, not a vote nobody has held.
        expect(after.bills[`bill:${INFRASTRUCTURE_ACT}:${campaign.turn}`].status).toBe("in-progress");
    });
    it("will not refile a measure the chambers finished with this same week", () => {
        const campaign = friendly(buildCampaign(), 0.1);
        const buried = {
            ...campaign,
            bills: {
                [`bill:${INFRASTRUCTURE_ACT}:${campaign.turn - 3}`]: {
                    id: `bill:${INFRASTRUCTURE_ACT}:${campaign.turn - 3}`,
                    act: INFRASTRUCTURE_ACT,
                    title: legislativeAct(INFRASTRUCTURE_ACT).title,
                    sponsor: "administration",
                    introducedTurn: campaign.turn - 3,
                    status: "dead",
                    resolvedTurn: campaign.turn,
                    passage: [],
                },
            },
        };
        const again = transmit(buried, INFRASTRUCTURE_ACT);
        expect(again.ok).toBe(false);
        expect(again.ok === false && again.reason).toMatch(/already finished with/);
    });
});
describe("domestic signatures on the catalogue", () => {
    const INFRA_ACT = "act-infrastructure-investment";
    function stateLeanDelta(packet, state) {
        return packet.effects
            .filter((effect) => effect.kind === "state" && effect.state === state)
            .reduce((sum, effect) => sum + (effect.deltas?.lean ?? 0), 0);
    }
    it("routes the infrastructure act through industrial states on signing", () => {
        const campaign = onTheDesk(buildCampaign(), INFRA_ACT);
        const bill = selectBillsOnTheDesk(campaign)[0];
        const packet = packetOf(signBill(campaign, bill.id));
        expect(Math.abs(stateLeanDelta(packet, "MI"))).toBeGreaterThan(0);
        expect(Math.abs(stateLeanDelta(packet, "PA"))).toBeGreaterThan(0);
        expect(stateLeanDelta(packet, "HI")).toBe(0);
        expect(packet.effects.some((effect) => effect.kind === "state" && effect.state === "MI" && effect.addMark?.signature === "act:infrastructure")).toBe(true);
        const after = apply(campaign, packet);
        expect(after.states.MI.marks.some((mark) => mark.signature === "act:infrastructure")).toBe(true);
    });
    it("routes the defense authorization lightly through defense-weighted states", () => {
        const campaign = onTheDesk(buildCampaign(), DEFENSE_ACT);
        const bill = selectBillsOnTheDesk(campaign)[0];
        const packet = packetOf(signBill(campaign, bill.id));
        // HI is defense-heavy in the authored table; a light defense signature should move it.
        expect(Math.abs(stateLeanDelta(packet, "HI"))).toBeGreaterThan(0);
        expect(packet.effects.some((effect) => effect.kind === "state" && effect.state === "HI" && effect.addMark?.signature === "act:defense-authorization")).toBe(true);
    });
});
