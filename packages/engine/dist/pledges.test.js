import { imposeTestTariff } from "./__fixtures__/tariff.js";
import { describe, expect, it } from "vitest";
import { CHARTER_USA_CONSTITUTION, COHORT_IDS, US_ID, plankById, worldDataset, } from "@admin/world";
import { buildCampaign } from "./__fixtures__/campaign.js";
import { addDays, CAMPAIGN_OPENING_DATE } from "./clock.js";
import { COHORT_MOTIVATION } from "./demos.js";
import { apply } from "./effects.js";
import { draftCabinetCandidates, generateFoundingPool, sealFounding } from "./founding.js";
import { defaultLeaderDraft } from "./leader.js";
import { enactPolicy } from "./policy-draft.js";
import { PROGRAM_STANDUP_TURNS, programStandUpRemaining } from "./policy-teeth.js";
import { inheritedPolicies, policyStance } from "./policy.js";
import { FIRST_HUNDRED_DAYS_MAX, PLATFORM_MAX_PLANKS, PLEDGE_STAKES, platformRejections, pledgeAtStakeLine, pledgeDueDate, pledgePhase, pledgesAtStake, sealPlatform, } from "./pledges.js";
import { bundleOrder, bundlePolicyStance } from "./projection.js";
import { executiveOrder, projectOrder } from "./orders.js";
import { projectPolicyStance } from "./policy-draft.js";
import { makeCampaignSeed } from "./rng.js";
import { createSave, loadSave } from "./save.js";
import { campaignTurnPhases } from "./turn-phases.js";
import { advanceTurn } from "./turn-loop.js";
const plank = (id) => id;
const OATH = { year: 2029, month: 1, day: 20 };
const pledge = (status) => ({
    id: "pledge-1",
    plank: plank("plank-test"),
    madeDate: { year: 2029, month: 1, day: 20 },
    dueDate: { year: 2029, month: 4, day: 30 },
    firstHundredDays: true,
    status,
});
const packet = (set) => ({
    source: "simulate",
    actor: "player",
    turn: 1,
    narration: { summary: "The ledger moves." },
    effects: [{ kind: "pledge", set }],
});
const SEED = makeCampaignSeed("pledges-seed");
const pool = generateFoundingPool(SEED, worldDataset);
const cabinet = Object.fromEntries(Object.entries(draftCabinetCandidates(CHARTER_USA_CONSTITUTION, US_ID, pool)).map(([role, list]) => [role, list[0].id]));
const leader = { ...defaultLeaderDraft(), name: "Pledge Test" };
const PLATFORM = [plank("plank-balanced-budget"), plank("plank-fair-trade"), plank("plank-open-government")];
function sealedWith(platform) {
    return sealFounding(SEED, worldDataset, { cabinet, leader, platform });
}
function pledgeOn(campaign, id) {
    const found = campaign.pledges?.find((entry) => entry.plank === id);
    if (!found)
        throw new Error(`no pledge on ${id}`);
    return found;
}
// A pledge moved onto this week's calendar through the one writer the ledger
// has after the seal, so a test can reach a due date without playing to it.
function dueThisWeek(campaign, id) {
    return apply(campaign, packet({ ...pledgeOn(campaign, id), dueDate: addDays(campaign.calendar, 3) }));
}
function strainsCaused(campaign, cohort, cause) {
    return (campaign.cohorts[cohort] ?? []).filter((strain) => strain.cause === cause);
}
describe("the pledge effect", () => {
    it("adds a pledge the ledger has not seen", () => {
        expect(apply(buildCampaign(), packet(pledge("open"))).pledges).toEqual([pledge("open")]);
    });
    it("replaces a pledge by id rather than filing it twice", () => {
        const made = apply(buildCampaign(), packet(pledge("open")));
        const broken = apply(made, packet({ ...pledge("broken"), settledDate: { year: 2029, month: 4, day: 30 } }));
        expect(broken.pledges).toHaveLength(1);
        expect(broken.pledges?.[0]?.status).toBe("broken");
    });
});
describe("sealing a platform", () => {
    it("writes nothing for an empty platform", () => {
        expect(sealPlatform([], OATH)).toEqual({ pledges: [], policies: {}, flags: {} });
    });
    it("makes one open pledge per plank, in the order chosen, due at the first midterm", () => {
        const { pledges } = sealPlatform(PLATFORM, OATH);
        expect(pledges.map((entry) => entry.plank)).toEqual(PLATFORM);
        expect(pledges.map((entry) => entry.id)).toEqual(PLATFORM.map((id) => `pledge:${id}`));
        for (const entry of pledges) {
            expect(entry).toMatchObject({ madeDate: OATH, dueDate: { year: 2030, month: 11, day: 5 }, firstHundredDays: false, status: "open" });
            expect(entry.settledDate).toBeUndefined();
        }
    });
    it("dates a first-hundred-days pledge a hundred days after the oath", () => {
        expect(pledgeDueDate(OATH, true)).toEqual({ year: 2029, month: 4, day: 30 });
        const { pledges } = sealPlatform(PLATFORM, OATH, [plank("plank-open-government")]);
        const early = pledges.find((entry) => entry.plank === "plank-open-government");
        expect(early).toMatchObject({ firstHundredDays: true, dueDate: { year: 2029, month: 4, day: 30 } });
        expect(pledges.filter((entry) => entry.firstHundredDays)).toHaveLength(1);
    });
    it("opens the term on each economic plank's program and leaves the rest alone", () => {
        expect(sealPlatform(PLATFORM, OATH).policies).toEqual({ fiscal: "fiscal-austerity", trade: "trade-protective" });
    });
    it("raises a dated plank flag for each plank", () => {
        expect(sealPlatform([plank("plank-secure-border")], OATH).flags).toEqual({
            "plank:plank-secure-border": true,
            "flagset:plank:plank-secure-border:1": true,
        });
    });
    it("refuses a platform the seal cannot honor rather than sealing part of it", () => {
        expect(() => sealPlatform([plank("plank-balanced-budget"), plank("plank-fair-share")], OATH)).toThrow(/both set the fiscal program/);
    });
});
describe("what a platform may not be", () => {
    const explain = (platform, first = []) => platformRejections(platform.map(plank), first.map(plank)).map((rejection) => rejection.explanation);
    it("accepts a platform the seal can honor, and an empty one", () => {
        expect(platformRejections(PLATFORM, [plank("plank-open-government")])).toEqual([]);
        expect(platformRejections([])).toEqual([]);
    });
    it("refuses an unknown plank and a repeated one", () => {
        expect(explain(["plank-nobody-drafted"])).toEqual(["Nobody drafted a plank by that name, so it can't be run on."]);
        expect(explain(["plank-secure-border", "plank-secure-border"])[0]).toMatch(/on the platform twice/);
    });
    it("refuses two planks that set the same program", () => {
        expect(explain(["plank-energy-dominance", "plank-clean-energy"])).toEqual([
            "Unleash American energy and Build the clean energy economy both set the industry and energy program, and an administration runs one at a time.",
        ]);
    });
    // The sentences name the limits in words, so they have to move with the constants.
    it("refuses more planks and more priorities than the limits allow, in the limits' own words", () => {
        const words = ["zero", "one", "two", "three", "four", "five", "six"];
        const six = ["plank-balanced-budget", "plank-energy-dominance", "plank-fair-trade", "plank-secure-border", "plank-rebuild-military", "plank-reform-policing"];
        expect(explain(six.slice(0, PLATFORM_MAX_PLANKS))).toEqual([]);
        expect(explain(six)[0]).toContain(`${words[PLATFORM_MAX_PLANKS]} planks at most`);
        const priorities = ["plank-secure-border", "plank-rebuild-military", "plank-reform-policing", "plank-open-government"];
        const platform = ["plank-balanced-budget", ...priorities];
        expect(explain(platform, priorities.slice(0, FIRST_HUNDRED_DAYS_MAX))).toEqual([]);
        expect(explain(platform, priorities)[0]).toContain(`${words[FIRST_HUNDRED_DAYS_MAX]} at most`);
    });
    it("refuses a priority off the platform, and one the seal would keep by itself", () => {
        expect(explain(["plank-balanced-budget"], ["plank-secure-border"])[0]).toMatch(/isn't on the platform/);
        expect(explain(["plank-balanced-budget"], ["plank-balanced-budget"])[0]).toMatch(/in force from the first day/);
    });
});
describe("the seal writes a PolicySet and the pledge ledger", () => {
    const sealed = sealedWith(PLATFORM);
    it("opens on the platform's economic program, with the rest inherited", () => {
        expect(sealed.player.policies).toEqual({ ...inheritedPolicies(), fiscal: "fiscal-austerity", trade: "trade-protective" });
    });
    // The program is in force from the oath and still has to be stood up, so a
    // promise takes the same month to reach the country as any other program.
    it("stands the platform's programs up like any other", () => {
        expect(programStandUpRemaining(sealed, "fiscal", policyStance("fiscal-austerity"))).toBe(PROGRAM_STANDUP_TURNS);
        expect(programStandUpRemaining(sealed, "trade", policyStance("trade-protective"))).toBe(PROGRAM_STANDUP_TURNS);
    });
    it("writes the ledger dated from the oath, with the plank flags beside it", () => {
        expect(sealed.pledges).toEqual(sealPlatform(PLATFORM, CAMPAIGN_OPENING_DATE).pledges);
        for (const entry of sealed.pledges ?? [])
            expect(entry.madeDate).toEqual(sealed.foundingDate);
        for (const id of PLATFORM)
            expect(sealed.player.flags[`plank:${id}`]).toBe(true);
        expect(sealed.player.flags["founding-complete"]).toBe(true);
    });
    it("keeps pledge ids stable across a save", () => {
        const settled = apply(sealed, packet({ ...pledgeOn(sealed, "plank-open-government"), status: "kept", settledDate: sealed.calendar }));
        const reloaded = loadSave(JSON.parse(JSON.stringify(createSave(settled))));
        expect(reloaded.pledges).toEqual(settled.pledges);
    });
    it("settles nothing in the first week of an untouched platform", () => {
        expect(pledgePhase(sealed)).toEqual([]);
    });
});
describe("a pledge falling due", () => {
    const sealed = sealedWith(PLATFORM);
    const courts = plankById.get("plank-open-government").courts;
    const cause = "plank-broken:plank-open-government";
    it("adds strain to the cohorts it courts, and to no one else, when broken", () => {
        const due = dueThisWeek(sealed, "plank-open-government");
        const after = pledgePhase(due).reduce((state, settled) => apply(state, settled), due);
        const stakes = PLEDGE_STAKES.term.broken;
        for (const cohort of courts) {
            const [strain] = strainsCaused(after, cohort, cause);
            expect(strain, cohort).toMatchObject({ valence: -1, weight: Math.round(stakes.strain * COHORT_MOTIVATION[cohort].attention * 1000) / 1000 });
            expect(strain?.reason).toBe("You promised to defend a free press and open government, and the deadline passed.");
        }
        for (const cohort of COHORT_IDS.filter((id) => !courts.includes(id))) {
            expect(strainsCaused(after, cohort, cause), cohort).toEqual([]);
        }
        expect(pledgeOn(after, "plank-open-government")).toMatchObject({ status: "broken", settledDate: pledgeOn(due, "plank-open-government").dueDate });
        // Lower, and by no more than the stake: a polarized public moves less than the delta.
        expect(after.player.opinion.integrity).toBeLessThan(due.player.opinion.integrity);
        expect(after.player.opinion.integrity).toBeGreaterThanOrEqual(due.player.opinion.integrity + stakes.integrity);
        expect(after.player.flags["plank:plank-open-government:broken"]).toBe(true);
    });
    it("does it through the real week, and the strain outlives the week's own fading", () => {
        const phases = campaignTurnPhases(CHARTER_USA_CONSTITUTION);
        const control = advanceTurn(apply(sealed, packet(pledgeOn(sealed, "plank-open-government"))), phases);
        const broken = advanceTurn(dueThisWeek(sealed, "plank-open-government"), phases);
        expect(pledgeOn(control, "plank-open-government").status).toBe("open");
        expect(pledgeOn(broken, "plank-open-government").status).toBe("broken");
        for (const cohort of courts) {
            expect(strainsCaused(control, cohort, cause), cohort).toEqual([]);
            expect(strainsCaused(broken, cohort, cause)[0]?.weight ?? 0, cohort).toBeGreaterThan(0);
        }
        expect(broken.player.opinion.integrity).toBeLessThan(control.player.opinion.integrity);
        expect(broken.ledger.some((entry) => entry.description.startsWith("The pledge to defend a free press and open government is broken"))).toBe(true);
    });
    it("credits the cohorts it courts when kept by the President's own act", () => {
        const enacted = enactPolicy(sealed, "civil-open-society");
        if (!enacted.ok)
            throw new Error(enacted.reason);
        const adopted = apply(sealed, enacted.packet);
        const [settled] = pledgePhase(adopted);
        expect(settled?.narration.summary).toBe("The pledge to defend a free press and open government is kept: Open society is now the civil liberties program.");
        const after = apply(adopted, settled);
        for (const cohort of courts) {
            expect(strainsCaused(after, cohort, "plank-kept:plank-open-government")[0]?.valence, cohort).toBe(1);
        }
        expect(pledgeOn(after, "plank-open-government")).toMatchObject({ status: "kept", settledDate: sealed.calendar });
        expect(pledgePhase(after)).toEqual([]);
    });
    it("breaks a promise to keep a program the week the program goes", () => {
        const dropped = apply(sealed, {
            ...packet(pledgeOn(sealed, "plank-fair-trade")),
            effects: [{ kind: "policy", domain: "trade", stance: "trade-open" }],
        });
        const [settled] = pledgePhase(dropped);
        expect(settled?.narration.summary).toBe("The pledge to protect American jobs from unfair trade is broken: Protective tariffs is no longer the trade program.");
        const after = apply(dropped, settled);
        expect(strainsCaused(after, "goods-producing", "plank-broken:plank-fair-trade")[0]?.reason).toBe("You promised to protect American jobs from unfair trade, and then dropped it.");
    });
    it("weighs a first-hundred-days pledge more heavily than a term pledge", () => {
        expect(PLEDGE_STAKES.firstHundredDays.broken.strain).toBeGreaterThan(PLEDGE_STAKES.term.broken.strain);
        expect(PLEDGE_STAKES.firstHundredDays.kept.integrity).toBeGreaterThan(PLEDGE_STAKES.term.kept.integrity);
        const early = { ...pledgeOn(sealed, "plank-open-government"), firstHundredDays: true, dueDate: addDays(sealed.calendar, 3) };
        const [settled] = pledgePhase(apply(sealed, packet(early)));
        expect(settled?.narration.summary).toMatch(/^The first-hundred-days pledge to defend a free press and open government is broken: /);
    });
});
describe("what a broken first-hundred-days pledge costs on screen", () => {
    it("takes close to a point of approval the week it breaks, and a full point within the quarter", () => {
        // At a third of today's stakes it cost a quarter of a point, which is a
        // promise nobody could feel breaking. Measured against the same campaign
        // with no ledger, so everything else the weeks do is held equal.
        const phases = campaignTurnPhases(CHARTER_USA_CONSTITUTION);
        const promised = sealFounding(SEED, worldDataset, { cabinet, leader, platform: [plank("plank-secure-border")], firstHundredDays: [plank("plank-secure-border")] });
        let kept = promised;
        let control = { ...promised, pledges: [] };
        const costs = [];
        for (let week = 0; week < 29; week += 1) {
            kept = advanceTurn(kept, phases);
            control = advanceTurn(control, phases);
            if (pledgeOn(kept, "plank-secure-border").status === "broken")
                costs.push(control.player.metrics.approval - kept.player.metrics.approval);
        }
        expect(costs.length).toBeGreaterThanOrEqual(13);
        expect(costs[0]).toBeGreaterThan(0.008);
        expect(Math.max(...costs)).toBeGreaterThanOrEqual(0.01);
    }, 60_000);
});
describe("the pledges an act would settle", () => {
    const sealed = sealedWith([...PLATFORM, plank("plank-secure-border")]);
    it("keeps a pledge to adopt a program, breaks one to hold a program, and leaves the rest alone", () => {
        expect(pledgesAtStake(sealed, { kind: "policy", domain: "civil", stance: "civil-open-society" }).map((stake) => [stake.plank.id, stake.effect])).toEqual([
            ["plank-open-government", "keeps"],
        ]);
        expect(pledgesAtStake(sealed, { kind: "policy", domain: "trade", stance: "trade-open" }).map((stake) => [stake.plank.id, stake.effect])).toEqual([
            ["plank-fair-trade", "breaks"],
        ]);
        expect(pledgesAtStake(sealed, { kind: "policy", domain: "trade", stance: "trade-protective" })).toEqual([]);
        expect(pledgesAtStake(sealed, { kind: "order", order: "order-border-controls" }).map((stake) => stake.effect)).toEqual(["keeps"]);
    });
    it("names the promise in the projection the President reads before committing", () => {
        const [stake] = pledgesAtStake(sealed, { kind: "policy", domain: "trade", stance: "trade-open" });
        expect(pledgeAtStakeLine(stake)).toBe("Breaks your pledge to protect American jobs from unfair trade, due November 5, 2030.");
        const stance = bundlePolicyStance(sealed, projectPolicyStance(sealed, CHARTER_USA_CONSTITUTION, "trade", "trade-open"));
        expect(stance.assumptions[0]).toBe(pledgeAtStakeLine(stake));
        const order = bundleOrder(sealed, projectOrder(sealed, CHARTER_USA_CONSTITUTION, executiveOrder("order-border-controls")));
        expect(order.assumptions[0]).toBe("Keeps your pledge to secure the border, due November 5, 2030.");
    });
    it("says nothing once a pledge has settled", () => {
        const settled = apply(sealed, packet({ ...pledgeOn(sealed, "plank-fair-trade"), status: "kept", settledDate: sealed.calendar }));
        expect(pledgesAtStake(settled, { kind: "policy", domain: "trade", stance: "trade-open" })).toEqual([]);
    });
});
// A promise to keep a program the platform already put in force is settled on
// the outcome the plank names, measured from the oath: a President who held the
// program and did nothing else has closed no deficit.
it("does not keep a promise to hold a program for a President who did nothing", () => {
    const sealed = sealedWith(PLATFORM);
    const due = dueThisWeek(sealed, "plank-balanced-budget");
    const settled = pledgePhase(due).map((settlement) => settlement.effects.find((effect) => effect.kind === "pledge"));
    expect(settled.map((effect) => (effect?.kind === "pledge" ? effect.set.status : undefined))).not.toContain("kept");
});
describe("a promise to hold a program, settled on what it was for", () => {
    const sealed = sealedWith(PLATFORM);
    const statusOf = (campaign, id) => {
        const effect = pledgePhase(dueThisWeek(campaign, id))
            .flatMap((settlement) => settlement.effects)
            .find((entry) => entry.kind === "pledge");
        return effect?.kind === "pledge" ? effect.set.status : undefined;
    };
    const withLaw = (campaign, act) => {
        const bill = { id: `bill:${act}:${campaign.turn}`, act, title: act, sponsor: "administration", introducedTurn: campaign.turn, status: "law", passage: [] };
        return { ...campaign, bills: { ...campaign.bills, [bill.id]: bill } };
    };
    it("keeps a promise to balance the budget once a law has closed the deficit, and says what it came to", () => {
        expect(statusOf(withLaw(sealed, "act-fiscal-responsibility"), "plank-balanced-budget")).toBe("kept");
        const [broken] = pledgePhase(dueThisWeek(sealed, "plank-balanced-budget"));
        expect(broken.narration.summary).toMatch(/is broken: .* passed and the deficit had not closed\.$/);
    });
    it("keeps a promise to protect trade only while a tariff the President imposed stands", () => {
        expect(statusOf(sealed, "plank-fair-trade")).toBe("broken");
        const result = imposeTestTariff(sealed, "CHN", "consumer-electronics", 0.25);
        if (!result.ok)
            throw new Error(result.reason);
        expect(statusOf(apply(sealed, result.packet), "plank-fair-trade")).toBe("kept");
    });
    it("still breaks the week the program goes, whatever the law delivered", () => {
        const policies = { ...sealed.player.policies, fiscal: "fiscal-continuity" };
        const dropped = withLaw({ ...sealed, player: { ...sealed.player, policies } }, "act-fiscal-responsibility");
        expect(statusOf(dropped, "plank-balanced-budget")).toBe("broken");
    });
});
