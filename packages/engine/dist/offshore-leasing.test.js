import { describe, expect, it } from "vitest";
import { buildCampaign } from "./__fixtures__/campaign.js";
import { addDays } from "./clock.js";
import { apply } from "./effects.js";
import { fiscalPhase } from "./fiscal.js";
import { pendingOffshoreLeaseBonus } from "./national-books.js";
import { leasePlanningArea } from "./order-authority-subjects.js";
import { makeCampaignSeed } from "./rng.js";
import { createSave, loadSave } from "./save.js";
import { availableOffshoreLeaseActions, hasOffshoreExplorationPermit, offshoreLeaseSaleAction, offshoreLeaseSalePhase, operativeLeasePlanningRule, selectOffshoreLeaseSale, } from "./offshore-leasing.js";
const AREA = "ocs-gulf-program-2029";
const SIGNATURE = { id: "lease-rule:1", order: "order-energy-leasing",
    subject: { kind: "lease-planning", areaId: AREA }, turn: 1, contested: false, challengeChance: 0 };
const RULE = { id: SIGNATURE.id, order: SIGNATURE.order,
    signedTurn: 1, effectiveTurn: 7, status: "in-effect", resolvedTurn: 7 };
function ready(seed = "offshore-ledger") {
    const base = buildCampaign();
    return { ...base, seed: makeCampaignSeed(seed), turn: 7,
        calendar: addDays(base.calendar, 42), orders: [SIGNATURE], pendingRules: [RULE] };
}
function act(state, action) {
    const result = offshoreLeaseSaleAction(state, AREA, action);
    if (!result.ok)
        throw new Error(result.reason);
    return apply(state, result.packet);
}
function week(state) {
    const next = { ...state, turn: state.turn + 1, calendar: addDays(state.calendar, 7) };
    return offshoreLeaseSalePhase(next).reduce(apply, next);
}
function weeks(state, count) {
    return Array.from({ length: count }).reduce((current) => week(current), state);
}
describe("offshore sale and exploration ledger", () => {
    it("requires an operative final rule and an open approved program, and creates only a modeled tract review", () => {
        const unplanned = buildCampaign();
        expect(offshoreLeaseSaleAction(unplanned, AREA, "initiate-sale")).toMatchObject({ ok: false });
        const pending = { ...ready(), pendingRules: [{ ...RULE, status: "pending" }] };
        expect(availableOffshoreLeaseActions(pending, AREA)).toEqual([]);
        const stayed = { ...ready(), pendingRules: [{ ...RULE, status: "stayed" }] };
        expect(operativeLeasePlanningRule(stayed, AREA)).toBeUndefined();
        const struck = { ...ready(), orders: [{ ...SIGNATURE, review: { dueTurn: 8, status: "struck-down" } }] };
        expect(operativeLeasePlanningRule(struck, AREA)).toBeUndefined();
        const rescinded = { ...ready(), orders: [{ ...SIGNATURE, rescindedTurn: 7 }] };
        expect(operativeLeasePlanningRule(rescinded, AREA)).toBeUndefined();
        const late = { ...ready(), calendar: addDays(leasePlanningArea(AREA).programThrough, 1) };
        expect(operativeLeasePlanningRule(late, AREA)).toBeUndefined();
        const opened = act(ready(), "initiate-sale");
        expect(selectOffshoreLeaseSale(opened, AREA)).toMatchObject({ stage: "environmental-analysis",
            tract: { modeled: true }, bids: [] });
        expect(hasOffshoreExplorationPermit(opened)).toBe(false);
        expect(offshoreLeaseSaleAction(opened, AREA, "initiate-sale")).toMatchObject({ ok: false });
    });
    it("records sale-specific analysis, consultation, both notices and bid review before any decision", () => {
        const opened = act(ready(), "initiate-sale");
        const analysis = weeks(opened, 1);
        expect(selectOffshoreLeaseSale(analysis, AREA)).toMatchObject({ stage: "consultation",
            environmentalCompletedTurn: 8 });
        const noticed = weeks(analysis, 1);
        expect(selectOffshoreLeaseSale(noticed, AREA)).toMatchObject({ stage: "proposed-notice",
            consultationCompletedTurn: 9, proposedNoticeTurn: 9 });
        expect(offshoreLeaseSaleAction(noticed, AREA, "accept-bid")).toMatchObject({ ok: false });
        const final = weeks(noticed, 4);
        expect(selectOffshoreLeaseSale(final, AREA)).toMatchObject({ stage: "final-notice", finalNoticeTurn: 13 });
        const held = weeks(final, 5);
        const record = selectOffshoreLeaseSale(held, AREA);
        expect(record.stage).toBe("bid-collection");
        expect(record.saleHeldTurn - record.proposedNoticeTurn).toBeGreaterThanOrEqual(9);
        expect(record.saleHeldTurn - record.finalNoticeTurn).toBeGreaterThanOrEqual(5);
        expect(hasOffshoreExplorationPermit(held)).toBe(false);
        expect(weeks(held, 3).offshoreLeaseSales?.[0]?.fairValueReviewedTurn).toBeDefined();
    });
    it("expires an unfinished sale if the rule stops operating or the program ends before the sale", () => {
        const opened = act(ready(), "initiate-sale");
        const stayed = { ...opened, pendingRules: [{ ...RULE, status: "stayed" }] };
        expect(week(stayed).offshoreLeaseSales?.[0]).toMatchObject({ stage: "environmental-analysis",
            pausedWeeks: 1 });
        const late = { ...opened, calendar: leasePlanningArea(AREA).programThrough };
        expect(week(late).offshoreLeaseSales?.[0]).toMatchObject({ stage: "expired" });
        expect(hasOffshoreExplorationPermit(late)).toBe(false);
    });
    it("pauses staff work during a stay or lost Interior capacity and resumes with time still owed", () => {
        const opened = act(ready(), "initiate-sale");
        const proposed = weeks(opened, 2);
        expect(selectOffshoreLeaseSale(proposed, AREA)?.stage).toBe("proposed-notice");
        const partlyElapsed = weeks(proposed, 2);
        const stayed = { ...partlyElapsed, pendingRules: [{ ...RULE, status: "stayed" }] };
        const paused = weeks(stayed, 3);
        expect(selectOffshoreLeaseSale(paused, AREA)).toMatchObject({ stage: "proposed-notice", pausedWeeks: 3 });
        expect(offshoreLeaseSalePhase(paused)).toEqual([]);
        const resumed = { ...paused, pendingRules: [RULE] };
        expect(selectOffshoreLeaseSale(week(resumed), AREA)?.stage).toBe("proposed-notice");
        expect(selectOffshoreLeaseSale(weeks(resumed, 2), AREA)?.stage).toBe("final-notice");
        const interior = resumed.institutions["INST-INTERIOR"];
        const stalled = { ...resumed, institutions: { ...resumed.institutions,
                "INST-INTERIOR": { ...interior, implementationQuality: 0 } } };
        expect(selectOffshoreLeaseSale(week(stalled), AREA)).toMatchObject({ stage: "proposed-notice",
            pausedWeeks: 4 });
    });
    it("does not count unfunded weeks toward separate exploration permit review", () => {
        const base = act(ready(), "initiate-sale");
        const sale = { ...selectOffshoreLeaseSale(base, AREA), stage: "awarded",
            acceptedBidId: "prior-bid", awardedTurn: base.turn,
            exploration: { status: "under-review", submittedTurn: base.turn } };
        const interior = base.institutions["INST-INTERIOR"];
        const stalled = { ...base, offshoreLeaseSales: [sale], institutions: { ...base.institutions,
                "INST-INTERIOR": { ...interior, implementationQuality: 0 } } };
        const paused = weeks(stalled, 3);
        expect(selectOffshoreLeaseSale(paused, AREA)?.exploration).toMatchObject({ status: "under-review",
            reviewPausedWeeks: 3 });
        const resumed = { ...paused, institutions: base.institutions };
        expect(selectOffshoreLeaseSale(weeks(resumed, 3), AREA)?.exploration?.status).toBe("under-review");
        expect(["permitted", "refused"]).toContain(selectOffshoreLeaseSale(weeks(resumed, 4), AREA)?.exploration?.status);
    });
    it("records a due bonus while capacity is lost without advancing the exploration clock", () => {
        const base = act(ready(), "initiate-sale");
        const sale = { ...selectOffshoreLeaseSale(base, AREA), stage: "awarded",
            acceptedBidId: "prior-bid", awardedTurn: base.turn, stageTurn: base.turn,
            bonusReceipt: { id: "bonus:pause", amountUsdMillions: 150, dueTurn: base.turn + 1 },
            exploration: { status: "awaiting-plan" } };
        const interior = base.institutions["INST-INTERIOR"];
        const stalled = { ...base, offshoreLeaseSales: [sale], institutions: { ...base.institutions,
                "INST-INTERIOR": { ...interior, implementationQuality: 0 } } };
        const paidAndPaused = week(stalled);
        expect(selectOffshoreLeaseSale(paidAndPaused, AREA)).toMatchObject({
            bonusReceipt: { receivedTurn: base.turn + 1 },
            exploration: { status: "awaiting-plan", reviewPausedWeeks: 1 },
        });
        const resumed = { ...paidAndPaused, institutions: base.institutions };
        expect(selectOffshoreLeaseSale(week(resumed), AREA)?.exploration).toMatchObject({
            status: "under-review", submittedTurn: base.turn + 2,
        });
        expect(selectOffshoreLeaseSale(weeks(resumed, 4), AREA)?.exploration?.status).toBe("under-review");
        expect(["permitted", "refused"]).toContain(selectOffshoreLeaseSale(weeks(resumed, 5), AREA)?.exploration?.status);
    });
    it("obligates live Interior funding once and rejects an unfunded or incapable start", () => {
        const base = ready();
        const opened = act(base, "initiate-sale");
        expect(base.player.metrics.treasury - opened.player.metrics.treasury).toBe(5);
        expect(selectOffshoreLeaseSale(opened, AREA)).toMatchObject({ reviewObligationUsdMillions: 5,
            interiorCapacityAtStart: expect.any(Number) });
        const unfunded = { ...base, player: { ...base.player,
                metrics: { ...base.player.metrics, treasury: 0 } } };
        expect(offshoreLeaseSaleAction(unfunded, AREA, "initiate-sale")).toMatchObject({ ok: false });
        const interior = base.institutions["INST-INTERIOR"];
        const incapable = { ...base, institutions: { ...base.institutions,
                "INST-INTERIOR": { ...interior, implementationQuality: 0 } } };
        expect(offshoreLeaseSaleAction(incapable, AREA, "initiate-sale")).toMatchObject({ ok: false });
    });
    it("refuses an award without qualified fair-value bids and permits a reviewed refusal", () => {
        const base = act(ready(), "initiate-sale");
        const sale = selectOffshoreLeaseSale(base, AREA);
        const noBid = { ...sale, stage: "bid-review", stageTurn: base.turn - 2,
            saleHeldTurn: base.turn - 3, bids: [] };
        const noBidState = { ...base, offshoreLeaseSales: [noBid] };
        expect(offshoreLeaseSalePhase(noBidState).reduce(apply, noBidState).offshoreLeaseSales?.[0])
            .toMatchObject({ stage: "no-sale" });
        const tooLow = { ...noBid, bids: [{ id: "bid-1", bidder: "Bidder A",
                    qualified: true, amountUsdMillions: 119 }] };
        const tooLowState = { ...base, offshoreLeaseSales: [tooLow] };
        expect(offshoreLeaseSalePhase(tooLowState).reduce(apply, tooLowState).offshoreLeaseSales?.[0])
            .toMatchObject({ stage: "no-sale", reason: "No qualified bid met modeled fair value." });
        const decision = { ...tooLow, stage: "decision", bids: [{ ...tooLow.bids[0], amountUsdMillions: 121 }] };
        const decided = { ...base, offshoreLeaseSales: [decision] };
        expect(act(decided, "decline-bid").offshoreLeaseSales?.[0]).toMatchObject({ stage: "no-sale" });
        expect(hasOffshoreExplorationPermit(act(decided, "decline-bid"))).toBe(false);
    });
    it("halts a new award if the rule is struck after sale, while preserving an already awarded right", () => {
        const base = act(ready(), "initiate-sale");
        const sale = selectOffshoreLeaseSale(base, AREA);
        const decision = { ...sale, stage: "decision", saleHeldTurn: base.turn - 1,
            fairValueReviewedTurn: base.turn, bids: [{ id: "qualified-bid", bidder: "Bidder A",
                    qualified: true, amountUsdMillions: 150 }] };
        const decided = { ...base, offshoreLeaseSales: [decision] };
        const afterDeadline = { ...decided, calendar: addDays(leasePlanningArea(AREA).programThrough, 1) };
        expect(offshoreLeaseSaleAction(afterDeadline, AREA, "accept-bid")).toMatchObject({ ok: true });
        const struck = { ...afterDeadline, orders: [{ ...SIGNATURE,
                    review: { dueTurn: base.turn, status: "struck-down" } }] };
        expect(offshoreLeaseSaleAction(struck, AREA, "accept-bid")).toMatchObject({ ok: false });
        expect(offshoreLeaseSalePhase(struck).reduce(apply, struck).offshoreLeaseSales?.[0])
            .toMatchObject({ stage: "no-sale" });
        const awarded = act(afterDeadline, "accept-bid");
        const alreadyLeased = { ...awarded, orders: struck.orders };
        expect(week(alreadyLeased).offshoreLeaseSales?.[0]?.stage).toBe("awarded");
    });
    it("keeps a lease award separate from an exploration plan and permit, and round-trips the ledger", () => {
        const base = act(ready(), "initiate-sale");
        const sale = selectOffshoreLeaseSale(base, AREA);
        const decision = { ...sale, stage: "decision", fairValueReviewedTurn: base.turn,
            saleHeldTurn: base.turn - 1, bids: [{ id: "qualified-bid", bidder: "Bidder A",
                    qualified: true, amountUsdMillions: 150 }] };
        const before = { ...base, offshoreLeaseSales: [decision] };
        const awarded = act(before, "accept-bid");
        expect(selectOffshoreLeaseSale(awarded, AREA)).toMatchObject({ stage: "awarded",
            acceptedBidId: "qualified-bid", exploration: { status: "awaiting-plan" } });
        expect(hasOffshoreExplorationPermit(awarded)).toBe(false);
        expect(loadSave(createSave(awarded)).offshoreLeaseSales).toEqual(awarded.offshoreLeaseSales);
        const reviewed = { ...selectOffshoreLeaseSale(awarded, AREA),
            exploration: { status: "under-review", submittedTurn: awarded.turn - 4 } };
        const inReview = { ...awarded, offshoreLeaseSales: [reviewed] };
        expect(hasOffshoreExplorationPermit(inReview)).toBe(false);
        const permitted = { ...reviewed, exploration: { status: "permitted",
                submittedTurn: awarded.turn - 4, resolvedTurn: awarded.turn } };
        expect(hasOffshoreExplorationPermit({ ...awarded, offshoreLeaseSales: [permitted] })).toBe(true);
        expect(week({ ...awarded, offshoreLeaseSales: [permitted] }).offshoreLeaseSales?.[0]?.bonusReceipt)
            .toMatchObject({ amountUsdMillions: 150, receivedTurn: awarded.turn + 1 });
        const us = awarded.nations[awarded.founding.nation].stats.energy;
        expect(us).toEqual(before.nations[before.founding.nation].stats.energy);
    });
    it("books the accepted bonus as one federal receipt without crediting presidential authority", () => {
        const base = act(ready(), "initiate-sale");
        const sale = selectOffshoreLeaseSale(base, AREA);
        const decision = { ...sale, stage: "decision", saleHeldTurn: base.turn - 1,
            fairValueReviewedTurn: base.turn, bids: [{ id: "paid-bid", bidder: "Bidder A",
                    qualified: true, amountUsdMillions: 150 }] };
        const awarded = act({ ...base, offshoreLeaseSales: [decision] }, "accept-bid");
        const paidWeek = week(awarded);
        expect(pendingOffshoreLeaseBonus(paidWeek)).toMatchObject({ amountUsdMillions: 150 });
        expect(pendingOffshoreLeaseBonus({ ...paidWeek, turn: paidWeek.turn + 1 }).amountUsdMillions).toBe(150);
        const noBonus = { ...paidWeek, offshoreLeaseSales: [{ ...paidWeek.offshoreLeaseSales[0], bonusReceipt: undefined }] };
        const withBooks = fiscalPhase(paidWeek).reduce(apply, paidWeek);
        const withoutBooks = fiscalPhase(noBonus).reduce(apply, noBonus);
        const usId = paidWeek.founding.nation;
        expect(withoutBooks.nations[usId].stats.economy.debt - withBooks.nations[usId].stats.economy.debt)
            .toBeCloseTo(150, 0);
        expect(withBooks.books?.[usId]?.leaseBonusReceiptIds).toContain(paidWeek.offshoreLeaseSales[0].bonusReceipt.id);
        expect(pendingOffshoreLeaseBonus(withBooks).amountUsdMillions).toBe(0);
        expect(withBooks.player.metrics.treasury).toBe(paidWeek.player.metrics.treasury);
    });
    it("has a reachable but not guaranteed path from planning through bid, award and separate permit", () => {
        const runs = Array.from({ length: 24 }, (_, index) => {
            const endOfSale = weeks(act(ready(`offshore-outcome-${index}`), "initiate-sale"), 14);
            if (selectOffshoreLeaseSale(endOfSale, AREA)?.stage !== "decision")
                return endOfSale;
            return weeks(act(endOfSale, "accept-bid"), 8);
        });
        expect(runs.some((run) => selectOffshoreLeaseSale(run, AREA)?.stage === "no-sale")).toBe(true);
        expect(runs.some(hasOffshoreExplorationPermit)).toBe(true);
        const permitted = runs.find(hasOffshoreExplorationPermit);
        const sale = selectOffshoreLeaseSale(permitted, AREA);
        expect(sale).toMatchObject({ stage: "awarded", saleHeldTurn: expect.any(Number),
            fairValueReviewedTurn: expect.any(Number), awardedTurn: expect.any(Number),
            exploration: { submittedTurn: expect.any(Number), resolvedTurn: expect.any(Number), status: "permitted" } });
        expect(sale.awardedTurn).toBeGreaterThanOrEqual(sale.fairValueReviewedTurn);
        expect(sale.exploration.submittedTurn).toBeGreaterThan(sale.awardedTurn);
    });
});
