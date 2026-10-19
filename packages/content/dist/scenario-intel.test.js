import { apply, commitReply, createRngStreams, drawConsequence, eligibleConsequences, INSTRUMENT_IDS, makeCampaignSeed, outstandingInstrumentActs, resolveDueInstruments, } from "@admin/engine";
import { describe, expect, it } from "vitest";
import { auditConsequence, auditConsequences } from "./consequence-audit.js";
import { compileConsequences } from "./consequence-compile.js";
import { BRIEFING_CONSEQUENCES, CORE_CONSEQUENCES } from "./packs/core-consequences.js";
import { sealedCampaign } from "./preview-board.js";
import { auditScenario } from "./scenario-audit.js";
import { castScenario } from "./scenario-cast.js";
import { FALSE_INTEL_RATE, intelContext, intelProvedFalse, intelTell } from "./scenario-intel.js";
import { ScenarioDef } from "./scenario.js";
// The three fairness rules, each proved by a fixture that breaks it rather than
// by asserting that the rule exists. A rule nobody has watched fail is a rule
// nobody knows is wired up — which is exactly how the sourced hedges this
// mechanism replaces came to be decoration in the first place.
const TELL = "The figure comes from one source, and the second service disputes it.";
function markedScenario(overrides = {}) {
    return {
        id: "the-yard-across-the-line",
        class: "foreign-crisis",
        severity: "serious",
        dilemmaShape: "containment",
        intelConfidence: "single-sourced",
        subject: "The yard across the line",
        cast: { pick: "tensest" },
        conditions: [],
        weight: 1,
        locus: { site: "border", ground: "counterpart", descriptor: "a rail yard four hours from the frontier crossing" },
        opening: [
            {
                speaker: { kind: "cabinet", roleHint: "defense" },
                text: `Movement into the yard began before first light and has not stopped. ${TELL}`,
            },
        ],
        replies: [
            {
                id: "hit-the-yard",
                tone: "coercive",
                text: "Take the yard out tonight, before whatever is in it finishes being loaded.",
                commitment: { kind: "instrument", instrument: "military", rung: 4 },
            },
            {
                id: "wait-for-the-second-pass",
                tone: "principled",
                text: "Nothing moves until a second pass says the same thing this one does.",
                commitment: {
                    kind: "position",
                    cost: { militaryReadiness: -0.03, standing: -0.02 },
                    remembered: "The government waited for a second look before it did anything, and said so at the time.",
                    rejoinder: { speaker: { kind: "cabinet", roleHint: "justice" }, text: "Before the month was out two other offices had asked whether the same applies to them, and one of them has already acted as if it does." },
                },
            },
        ],
        ...overrides,
    };
}
const kindsOf = (def) => auditScenario(def).map((finding) => finding.kind);
describe("fairness rule (a): the tell is always present", () => {
    it("passes a marked scenario whose briefing hedges its sourcing", () => {
        expect(intelTell(markedScenario())).toBeDefined();
        expect(kindsOf(markedScenario())).not.toContain("intel-tell-missing");
    });
    it("refuses a marked scenario whose briefing states the claim flat", () => {
        const flat = markedScenario({
            opening: [
                {
                    speaker: { kind: "cabinet", roleHint: "defense" },
                    text: "Movement into the yard began before first light and has not stopped. The loading is for a crossing.",
                },
            ],
        });
        expect(intelTell(flat)).toBeUndefined();
        expect(kindsOf(flat)).toContain("intel-tell-missing");
    });
    it("accepts the hedge from a transmission as readily as from a beat", () => {
        const hedgedElsewhere = markedScenario({
            opening: [
                {
                    speaker: { kind: "cabinet", roleHint: "defense" },
                    text: "Movement into the yard began before first light and has not stopped. The loading is for a crossing.",
                },
            ],
            transmission: {
                relay: "intercept",
                attribution: "the general staff's evening summary",
                text: "The estimate remains unconfirmed and rests on the account of a single crew that was not debriefed twice.",
            },
        });
        expect(kindsOf(hedgedElsewhere)).not.toContain("intel-tell-missing");
    });
    // The gate's own failure mode, and the expensive one: a word that reads as
    // doubt in ordinary prose lets a marked briefing carrying no tell at all pass
    // as hedged, which is a lie shipping unmarked. Both of these sentences are
    // ordinary register in this corpus and neither says anything about sourcing.
    it.each([
        ["The yard sits on the disputed side of the border and has done for a generation.", "a disputed place"],
        ["The chiefs disagree about what to do, and have said so to each other at length.", "a disagreement about policy"],
        ["Both claims are contested and both capitals have lawyers on retainer over it.", "contested claims"],
    ])("refuses %s, which is %s rather than a word about sourcing", (text) => {
        const flat = markedScenario({ opening: [{ speaker: { kind: "cabinet", roleHint: "defense" }, text }] });
        expect(intelTell(flat)).toBeUndefined();
        expect(kindsOf(flat)).toContain("intel-tell-missing");
    });
    it.each([
        "The figure is what it is because the second service disputes it and has since Tuesday.",
        "The estimate is contested by the desk that produced the first one, which is unusual.",
        "The count arrives twice and the two reports do not agree about where it came from.",
        "The whole case is disputed by the analysts who ran the earlier pass over the ground.",
        "Nobody will stand behind it: the assessment disputes the reporting it was drawn from.",
    ])("accepts %s, where the doubt is about who is saying it", (text) => {
        const hedged = markedScenario({ opening: [{ speaker: { kind: "cabinet", roleHint: "defense" }, text }] });
        expect(intelTell(hedged), text).toBeDefined();
        expect(kindsOf(hedged)).not.toContain("intel-tell-missing");
    });
    // The cabinet is told to speak with contractions, so a matcher that only
    // knows the expanded forms rejects the voice the brief asks for. A real batch
    // lost three well-written tells to this and had them rewritten stiffer.
    it.each([
        "One tape, a broken chain of custody, and two analysts that won't sign the same word.",
        "The desks won’t stand behind it, and the one that drew it up says so itself.",
        "We have the count twice over and the two reports don't agree about the source.",
        "The second service didn't agree with a line of it when they read the file.",
        "It is one crew's word: the station won't confirm the timing, and says as much.",
    ])("accepts the contracted form of the same relation: %s", (text) => {
        const hedged = markedScenario({ opening: [{ speaker: { kind: "cabinet", roleHint: "defense" }, text }] });
        expect(intelTell(hedged), text).toBeDefined();
        expect(kindsOf(hedged)).not.toContain("intel-tell-missing");
    });
    // Widening the vocabulary must not widen what counts as doubt-about-sourcing.
    it.each([
        ["The chiefs don't agree about what to do, and have said so at length.", "a disagreement about policy"],
        ["The border won't be settled by us, and the disputed side stays disputed.", "a disputed place"],
    ])("still refuses %s, which is %s", (text) => {
        const flat = markedScenario({ opening: [{ speaker: { kind: "cabinet", roleHint: "defense" }, text }] });
        expect(intelTell(flat)).toBeUndefined();
        expect(kindsOf(flat)).toContain("intel-tell-missing");
    });
    it("leaves an unmarked scenario alone however flatly it states its facts", () => {
        const unmarked = markedScenario({ intelConfidence: undefined, opening: markedScenario().opening });
        expect(kindsOf(unmarked)).not.toContain("intel-tell-missing");
    });
    it("refuses a marked scenario no act can answer, because no reveal could ever be drawn", () => {
        const wordsOnly = markedScenario({
            replies: [
                markedScenario().replies[1],
                {
                    id: "say-it-plainly",
                    tone: "firm",
                    text: "Say plainly that we have seen it, and let them work out how much we saw.",
                    commitment: {
                        kind: "position",
                        cost: { standing: -0.04 },
                        remembered: "The government said out loud that it had seen the yard, and left the rest unsaid.",
                        rejoinder: { speaker: { kind: "cabinet", roleHint: "foreign" }, text: "The oldest hand in that department resigned the following week without giving a reason, and her deputy has asked for a transfer." },
                    },
                },
            ],
        });
        expect(kindsOf(wordsOnly)).toContain("intel-doubt-unanswerable");
        expect(kindsOf(markedScenario())).not.toContain("intel-doubt-unanswerable");
    });
});
describe("fairness rule (b): the rate is low, fixed, and never touches a confirmed claim", () => {
    // One sealed campaign with its seed swapped, rather than six hundred sealed
    // campaigns: the verdict is a function of the seed and the scenario id alone,
    // and founding a whole board per sample costs a minute to prove nothing extra.
    const board = sealedCampaign("intel-rate");
    const seeds = Array.from({ length: 600 }, (_, index) => makeCampaignSeed(`intel-rate-${index}`));
    const falseShare = (confidence) => seeds.filter((seed) => intelProvedFalse({ ...board, seed }, { id: "the-yard-across-the-line", intelConfidence: confidence })).length /
        seeds.length;
    it("never overturns a confirmed claim, and never one that carries no marker at all", () => {
        expect(falseShare("confirmed")).toBe(0);
        expect(falseShare(undefined)).toBe(0);
    });
    it("overturns a low-confidence claim at about the doctrine's one in six", () => {
        for (const confidence of ["single-sourced", "disputed"]) {
            const share = falseShare(confidence);
            expect(share, confidence).toBeGreaterThan(FALSE_INTEL_RATE - 0.05);
            expect(share, confidence).toBeLessThan(FALSE_INTEL_RATE + 0.05);
        }
    });
    it("gives one campaign one answer, however often it is asked", () => {
        const campaign = sealedCampaign("intel-stability");
        const def = markedScenario();
        const first = intelProvedFalse(campaign, def);
        expect(intelProvedFalse(campaign, def)).toBe(first);
        // The verdict is a fact about the world, not about the week it is asked in:
        // a player who reloads must not be able to re-roll the briefing.
        expect(intelProvedFalse({ ...campaign, turn: campaign.turn + 7 }, def)).toBe(first);
    });
    it("hands the aftermath layer nothing at all for an unmarked briefing", () => {
        const campaign = sealedCampaign("intel-context");
        expect(intelContext(campaign, { id: "x", intelConfidence: undefined })).toEqual({});
        expect(intelContext(campaign, { id: "x", intelConfidence: "confirmed" })).toEqual({});
        expect(intelContext(campaign, markedScenario())).toHaveProperty("intelFalse");
    });
});
describe("fairness rule (c): the reveal names the check that would have caught it", () => {
    const reveal = BRIEFING_CONSEQUENCES.find((def) => def.conditions?.intelFalse === true);
    it("every shipped reveal card names one", () => {
        const reveals = BRIEFING_CONSEQUENCES.filter((def) => def.conditions?.intelFalse === true);
        expect(reveals.length).toBeGreaterThan(0);
        for (const def of reveals) {
            expect(auditConsequence(def).map((finding) => finding.kind), def.id).not.toContain("reveal-without-the-check");
        }
    });
    it("refuses a reveal that only announces the player was wrong", () => {
        const gloating = {
            ...reveal,
            id: "cq-briefing-gloat",
            beats: [
                "The yard is hit exactly as planned and there is nothing in it. The estimate was wrong from the start and the room finds that out on the evening broadcast, along with everybody else.",
            ],
            remembered: undefined,
        };
        expect(auditConsequence(gloating).map((finding) => finding.kind)).toContain("reveal-without-the-check");
    });
    it("leaves a card that is not a reveal outside the rule", () => {
        const ordinary = { ...reveal, id: "cq-briefing-ordinary", conditions: undefined };
        expect(auditConsequence(ordinary).map((finding) => finding.kind)).not.toContain("reveal-without-the-check");
    });
});
describe("fairness rule (c) part two: wherever the act lands, the truth can be told", () => {
    const campaign = sealedCampaign("intel-reach");
    const pool = compileConsequences(CORE_CONSEQUENCES);
    const target = Object.keys(campaign.nations).find((id) => id !== campaign.founding.nation);
    const reveals = new Set(BRIEFING_CONSEQUENCES.filter((def) => def.conditions?.intelFalse === true).map((def) => def.id));
    // The failure this proves against: a marked scenario whose only act is
    // assistance, or military at a low rung, or anything at all that the resolver
    // rules a success. Each of those lands in a cell, and a cell with no reveal
    // in it is a false briefing the player is never told about.
    it("offers a reveal for every act a resolver can rule on", () => {
        const bare = [];
        for (const instrument of INSTRUMENT_IDS) {
            for (const rung of [1, 2, 3, 4, 5]) {
                for (const valence of ["success", "partial", "failure"]) {
                    const situation = {
                        actor: campaign.founding.nation,
                        target: target,
                        instrument,
                        rung,
                        valence,
                        context: { intelFalse: true },
                    };
                    const offered = eligibleConsequences(campaign, pool, situation).some((card) => reveals.has(card.id));
                    if (!offered)
                        bare.push(`${instrument}/${rung}/${valence}`);
                }
            }
        }
        expect(bare).toEqual([]);
    });
    it("says so as an audit error when a cell has no reveal in it", () => {
        const stripped = CORE_CONSEQUENCES.filter((def) => def.id !== "cq-briefing-assistance-success-a-shortage-already-over");
        const kinds = auditConsequences(stripped).map((finding) => finding.kind);
        expect(kinds).toContain("reveal-cell-uncovered");
        expect(auditConsequences(CORE_CONSEQUENCES).map((finding) => finding.kind)).not.toContain("reveal-cell-uncovered");
    });
    // Eligible is not the same as told. A reveal shares its cell with the cards
    // written for the act itself, and at even weight it would lose the week it
    // exists for often enough that a player could never learn anything from it.
    it("wins its cell often enough to be learnable", () => {
        const situation = {
            actor: campaign.founding.nation,
            target: target,
            instrument: "assistance",
            rung: 2,
            valence: "failure",
            context: { intelFalse: true },
        };
        const streams = createRngStreams(campaign.seed);
        const draws = Array.from({ length: 400 }, (_, index) => drawConsequence(campaign, pool, situation, streams.stream("draw", String(index))));
        const told = draws.filter((card) => card && reveals.has(card.id)).length;
        expect(told / draws.length).toBeGreaterThan(0.5);
    });
});
describe("the reveal is drawn by the same mechanism every other card is", () => {
    const campaign = sealedCampaign("intel-selection");
    const pool = compileConsequences(BRIEFING_CONSEQUENCES);
    const target = Object.keys(campaign.nations).find((id) => id !== campaign.founding.nation);
    const situation = (intelFalse) => ({
        actor: campaign.founding.nation,
        target: target,
        instrument: "military",
        rung: 4,
        valence: "failure",
        context: { scenarioClass: "foreign-crisis", ...(intelFalse === undefined ? {} : { intelFalse }) },
    });
    const idsFor = (intelFalse) => eligibleConsequences(campaign, pool, situation(intelFalse)).map((card) => card.id);
    it("offers the reveal only in a campaign where the claim was actually false", () => {
        expect(idsFor(true)).toContain("cq-briefing-military-high-failure-the-yard-was-an-exercise");
    });
    it("refuses it when the briefing held, and when there was no briefing to be wrong about", () => {
        expect(idsFor(false)).not.toContain("cq-briefing-military-high-failure-the-yard-was-an-exercise");
        expect(idsFor(undefined)).not.toContain("cq-briefing-military-high-failure-the-yard-was-an-exercise");
    });
});
// The gap the tests above leave: every one of them hands `eligibleConsequences`
// or `drawConsequence` a hand-assembled `ConsequenceSituation`, which proves the
// selection math but never actually walks `commitReply`'s own wiring — the path
// `intelContext` is really carried through in the running game, from a marked
// scenario's own instrument reply, through `resolveAction`'s `dressOutcome`, out
// to what a player reads. A refactor could break that thread without any
// test above ever noticing, because none of them go through it.
describe("the reveal actually reaches the player through commitReply, not only through the selection math", () => {
    // A tiny bespoke pool rather than the shipped BRIEFING_CONSEQUENCES bank: one
    // card per valence, each requiring `intelFalse: true` and covering every rung
    // band, so exactly one card is ever eligible whatever the resolver's own roll
    // decides — the draw is settled by construction, and the test is not also a
    // test of the resolver's odds.
    const revealFor = (valence) => ({
        id: `cq-reveal-${valence}`,
        instrument: "military",
        rungBands: ["low", "mid", "high"],
        valence,
        conditions: { intelFalse: true },
        weight: 1,
        beats: [`The estimate that sent {{actor}} to the yard did not hold up (${valence}).`],
        effects: [],
    });
    const pool = compileConsequences([revealFor("success"), revealFor("partial"), revealFor("failure")]);
    it("surfaces a reveal when a marked scenario's instrument reply is actually committed on a campaign where the briefing proved false", () => {
        // Found by search over seed labels for `intelProvedFalse` on this exact
        // scenario id — the verdict is a pure function of the seed, so this label
        // reads `true` every time this test runs.
        const campaign = sealedCampaign("intel-e2e-1");
        const def = markedScenario();
        expect(intelProvedFalse(campaign, def), "the fixture needs a campaign this scenario actually proved false in").toBe(true);
        const cast = castScenario(campaign, def);
        expect(cast, "the scenario has to bind a real counterpart to be playable at all").toBeDefined();
        if (!cast)
            return;
        const option = cast.script.options.find((reply) => reply.id === "hit-the-yard");
        expect(option?.commitment.kind).toBe("instrument");
        if (!option)
            return;
        const streams = createRngStreams(campaign.seed);
        const result = commitReply(campaign, cast.script, option, streams, {
            consequences: pool,
            context: { scenarioClass: def.class, ...intelContext(campaign, def) },
        });
        expect(result.ok).toBe(true);
        if (!result.ok)
            return;
        // A strike takes days to mount, so the reply orders it and the outcome,
        // reveal included, is reported the day it executes, with the briefing's
        // verdict carried on the order.
        const spoken = result.beats.map((beat) => beat.text).join(" ");
        expect(spoken).not.toContain("did not hold up");
        const ordered = apply(campaign, result.packet);
        const [due] = outstandingInstrumentActs(ordered).map((act) => act.dueDate);
        expect(due, "the strike was not ordered").toBeDefined();
        if (!due)
            return;
        const executed = resolveDueInstruments({ ...ordered, calendar: due }).campaign;
        const reported = Object.values(executed.issuedActs ?? {}).find((act) => act.kind === "instrument");
        expect(reported?.outcome?.account).toContain("did not hold up");
        expect(executed.feed.some((item) => item.headline.includes("did not hold up"))).toBe(true);
    });
    it("carries no reveal on a position reply, on the same scenario and the same campaign", () => {
        const campaign = sealedCampaign("intel-e2e-1");
        const def = markedScenario();
        const cast = castScenario(campaign, def);
        if (!cast)
            return;
        const option = cast.script.options.find((reply) => reply.id === "wait-for-the-second-pass");
        expect(option?.commitment.kind).toBe("position");
        if (!option)
            return;
        const streams = createRngStreams(campaign.seed);
        const result = commitReply(campaign, cast.script, option, streams, {
            consequences: pool,
            context: { scenarioClass: def.class, ...intelContext(campaign, def) },
        });
        expect(result.ok).toBe(true);
        if (!result.ok)
            return;
        const spoken = result.beats.map((beat) => beat.text).join(" ");
        expect(spoken).not.toContain("did not hold up");
    });
});
// The trap this refusal closes: left to the audit, a domestic scenario marked
// as doubtful drew `intel-doubt-unanswerable` for carrying no instrument reply
// and `domestic-incoherence` for adding one, with neither finding admitting the
// other existed.
describe("a doubtful briefing needs somewhere to be proved wrong", () => {
    it("refuses a marked scenario with no counterpart at parse, naming why", () => {
        const domestic = { ...markedScenario(), cast: { pick: "none" }, transmission: undefined };
        const parsed = ScenarioDef.safeParse(domestic);
        expect(parsed.success).toBe(false);
        const messages = parsed.success ? [] : parsed.error.issues.map((issue) => issue.message);
        expect(messages.join(" ")).toContain("could never be proved wrong to the player");
    });
    it("leaves a domestic scenario alone when it makes no claim that can be wrong", () => {
        const domestic = {
            ...markedScenario(),
            intelConfidence: undefined,
            cast: { pick: "none" },
            transmission: undefined,
        };
        expect(ScenarioDef.safeParse(domestic).success).toBe(true);
    });
    it("allows a confirmed briefing at home, which is not a claim that can turn out false", () => {
        const domestic = {
            ...markedScenario(),
            intelConfidence: "confirmed",
            cast: { pick: "none" },
            transmission: undefined,
        };
        expect(ScenarioDef.safeParse(domestic).success).toBe(true);
    });
});
