import { describe, expect, it } from "vitest";
import { advanceTurn, apply, campaignTurnPhases, commitReply, createRngStreams } from "@admin/engine";
import { worldDataset } from "@admin/world";
import { sealedCampaign } from "./preview-board.js";
import { CORE_SCENARIOS } from "./packs/core.js";
import { PILOT_SCENARIOS } from "./packs/pilot.js";
import { combinedPool, memoryPool, stageFromResidentPool } from "./corpus/pool.js";
import { rememberReply } from "./scenario-cast.js";
import { inactionPacket } from "./scenario-memory.js";
// The finding this answers: over a full term against the shipped corpus, never
// answering anything beat three of four governing policies on approval and all
// four on the treasury, and carried the lowest removal pressure of any of them.
// Every reply is a debit and silence was free.
//
// Hermetic on purpose. The pool here is the authored packs, which are source in
// this repository; the corpus shards are publish output and are gitignored, so
// a test that read them would measure a different game on a machine that has
// them and on one that does not. That makes this a thinner board and a shorter
// horizon than a player gets, so what it asserts is the ordering against the
// *best* way of answering rather than against every way — a mediocre policy on
// a thin pool is not what "a competently governed term" means, and pinning
// silence below it would be pinning noise. Measured once at corpus scale
// (208-week terms, three seeds, the shipped corpus), never answering went from
// the best approval and lowest removal pressure of any policy to the worst
// approval and highest removal pressure; this file pins that ordering, not
// those figures.
//
// Twenty-odd seconds of simulation. `packages/content` has no balance-config
// split the way `packages/engine` does; if this file grows a second case it
// wants one.
const POOL = combinedPool([memoryPool(CORE_SCENARIOS), memoryPool(PILOT_SCENARIOS)]);
const TURNS = 52;
const SEEDS = ["balance-alpha", "balance-beta"];
/** Wide enough that a seeded wobble cannot satisfy the ordering on its own. */
const MATERIAL = 0.05;
/** The campaign after the first course this policy can actually commit, or nothing. */
function commitFrom(campaign, cast, policy) {
    const options = cast.script.options;
    const start = policy === "first" ? 0 : Math.floor(options.length / 2);
    for (let step = 0; step < options.length; step += 1) {
        const option = options[(start + step) % options.length];
        if (!option)
            continue;
        const result = commitReply(campaign, cast.script, option, createRngStreams(campaign.seed));
        if (!result.ok)
            continue;
        return apply(campaign, rememberReply(campaign, result.packet, cast, option.id));
    }
    return undefined;
}
function runTerm(seedLabel, policy, priceInaction) {
    let campaign = sealedCampaign(seedLabel);
    const charter = worldDataset.charters.find((candidate) => candidate.id === campaign.founding.charter);
    if (!charter)
        throw new Error("the shipped dataset lacks the founding charter");
    const phases = campaignTurnPhases(charter);
    let offered = 0;
    let left = 0;
    for (let week = 0; week < TURNS; week += 1) {
        const cast = stageFromResidentPool(campaign, POOL)[0];
        if (cast) {
            offered += 1;
            // A competent president answers with a course the government can
            // actually carry out. Taking the first option and calling a refusal an
            // answer would have the answering policies abstaining a quarter of the
            // time, which is the thing under measurement.
            const answered = policy === "never" ? undefined : commitFrom(campaign, cast, policy);
            if (answered) {
                campaign = answered;
            }
            else {
                left += 1;
                if (priceInaction)
                    campaign = apply(campaign, inactionPacket(campaign, cast));
            }
        }
        campaign = advanceTurn(campaign, phases);
    }
    return {
        approval: campaign.player.metrics.approval,
        pressure: campaign.removal.pressure,
        offered,
        left,
    };
}
function mean(readings, field) {
    return readings.reduce((sum, reading) => sum + reading[field], 0) / readings.length;
}
const across = (policy, priceInaction) => SEEDS.map((seed) => runTerm(seed, policy, priceInaction));
describe("governing has to beat refusing to govern", () => {
    const answering = across("first", true);
    const median = across("middle", true);
    const silent = across("never", true);
    const silentUnpriced = across("never", false);
    // "A competently answering one" is the best a policy managed here, not the
    // average of them: the claim under test is that refusing to decide is worse
    // than governing well, and measuring it against a policy that governed badly
    // would let a wide enough spread satisfy it by accident.
    const bestApproval = Math.max(mean(answering, "approval"), mean(median, "approval"));
    const lowestPressure = Math.min(mean(answering, "pressure"), mean(median, "pressure"));
    it("puts a decision in front of the president most weeks, so the comparison is about answering", () => {
        expect(Math.min(...silent.map((reading) => reading.offered))).toBeGreaterThan(TURNS / 2);
        expect(silent.every((reading) => reading.left === reading.offered)).toBe(true);
        expect(answering.every((reading) => reading.left < reading.offered / 4)).toBe(true);
    });
    it("ends an abstaining term materially below a competently answered one", () => {
        expect(mean(silent, "approval")).toBeLessThan(bestApproval - MATERIAL);
    });
    it("ends an abstaining term materially above a competently answered one on removal pressure", () => {
        expect(mean(silent, "pressure")).toBeGreaterThan(lowestPressure + MATERIAL);
    });
    it("is the pricing that inverts it — unpriced, silence beats the best way of governing", () => {
        // The control: with the charge removed, the defect this whole mechanism
        // exists to fix has to reappear, or the two cases above are proving nothing.
        //
        // Approval is the axis that carries it and the axis the finding was about —
        // silence beating governing on the numbers the player watches — and it does
        // so by a wide margin. Removal pressure is asserted only as "no better",
        // not as "better": the two policies land within about 0.002 of each other
        // there, which is noise rather than a claim. Pinning a strict inequality on
        // a gap that small makes this case fail on an unrelated tune of the cabinet
        // or the ladder, which is exactly what it did.
        expect(mean(silentUnpriced, "approval")).toBeGreaterThan(bestApproval);
        expect(mean(silentUnpriced, "pressure")).toBeLessThan(lowestPressure + MATERIAL);
    });
});
