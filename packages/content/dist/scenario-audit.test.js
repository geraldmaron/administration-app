import { describe, expect, it } from "vitest";
import { auditPasses, auditScenario, auditScenarios, phraseCarrierIndex } from "./scenario-audit.js";
import { auditImpactDeclared } from "./scenario-audit-impact.js";
import { committedRungName } from "./scenario-vocabulary.js";
import { deskClosedFlag } from "./desk-window.js";
import { ScenarioDef, scenarioEra, scenarioFiredFlag } from "./scenario.js";
import { CORE_SCENARIOS } from "./packs/core.js";
// A minimal scenario that should pass every rule; each test breaks exactly
// one thing and expects exactly that finding.
function withCounterpart(overrides = {}) {
    return {
        id: "test-scenario",
        class: "foreign-crisis",
        severity: "serious",
        dilemmaShape: "containment",
        subject: "A test of nerve",
        cast: { pick: "tensest" },
        // A clean scenario is a *bound* scenario: the grounding rules read a real
        // condition, four particulars and a counterpart's own words, so a fixture
        // that skipped them would fail every rule this file is not about. The
        // particulars carry numerals because a particular is a readout cell, not
        // prose — the readout rules refuse a figure written out in words.
        conditions: [{ kind: "relationship", field: "trust", atMost: 0.5 }],
        weight: 1,
        locus: { site: "interior", ground: "counterpart", descriptor: "the valley track where the patrol crossed" },
        particulars: [
            { label: "Crossing", value: "2 hours before first light" },
            { label: "Depth", value: "400 yards past the line" },
            { label: "Photographs", value: "9, timed and filed" },
            { label: "Last incident", value: "2 winters ago, same track" },
        ],
        transmission: {
            relay: "cable",
            text: "The patrol was inside its own ground and will be there again tomorrow. We are not asking, and we will not be answering questions about the timing of it.",
            attribution: "Their foreign ministry, to our embassy, unsigned",
        },
        opening: [
            {
                speaker: { kind: "cabinet", roleHint: "foreign" },
                text: "A patrol crossed the line before first light and sat there for two hours, and the duty officer has photographs.",
            },
        ],
        replies: [
            {
                id: "hold-firm",
                tone: "firm",
                text: "Hold the line exactly where it is, and say so plainly before the day is out.",
                commitment: {
                    kind: "position",
                    cost: { standing: -0.05, militaryReadiness: 0.02 },
                    // Holding a line is a deployment: it commits the force that holds it,
                    // and the clean fixture carries a declaration because every scenario
                    // the audit accepts has to.
                    impact: { institutional: ["forces-committed"] },
                    remembered: "The line held where it was drawn, and the government said so out loud the same day.",
                    rejoinder: { speaker: { kind: "narrator" }, text: "The port stayed open another day, which nobody in this room expected of it, and the harbor office has asked why we doubted them." },
                },
            },
            {
                id: "let-it-go",
                tone: "conciliatory",
                text: "Let this one pass without any comment, and see whether it happens a second time.",
                commitment: {
                    kind: "position",
                    cost: { stability: -0.02 },
                    remembered: "It was let go without any comment at all, and nobody was asked to explain the silence.",
                    rejoinder: { speaker: { kind: "cabinet", roleHint: "defense" }, text: "By evening two districts had answered without being asked to, and a third has written to say it will not be answering at all." },
                },
            },
        ],
        ...overrides,
    };
}
/**
 * The fixture casts a counterpart and relays its words, which the grounding
 * rules want. A test overriding it to `cast: none` is testing domestic copy,
 * and a domestic scenario cannot carry a transmission — there is nobody to
 * have sent it — so the relay comes off with the counterpart rather than
 * every such test having to remember to strip it.
 */
function cleanScenario(overrides = {}) {
    const def = withCounterpart(overrides);
    if (def.cast.pick !== "none")
        return def;
    const { transmission: _relay, ...domestic } = def;
    // Same reason the relay comes off: the fixture's gate reads the counterpart's
    // trust, and a domestic week has no counterpart to read. It still gates on
    // real state, which is what the grounding rules ask of it.
    return {
        ...domestic,
        ...(overrides.transmission ? { transmission: overrides.transmission } : {}),
        // The base locus stands on the counterpart's frontier, which is coherent
        // only while there is a counterpart. Casting nobody moves the event home,
        // and saying so is what keeps the fixture clean under the grounding rules
        // rather than tripping `domestic-incoherence` on its own scaffolding.
        locus: overrides.locus ?? { ...def.locus, ground: "home" },
        conditions: overrides.conditions ?? [{ kind: "metric", metric: "stability", atMost: 0.6 }],
    };
}
const kindsOf = (def) => auditScenario(def).map((finding) => finding.kind);
const packKindsOf = (defs, knownFlags) => auditScenarios(defs, knownFlags).map((finding) => finding.kind);
// A probe is a phrase, not a paragraph, and most are well under the length the
// thin-text warning wants. Carrying a neutral tail keeps length from becoming a
// second defect in a test that is about the phrase in front of it.
const NEUTRAL_TAIL = " The duty officer wrote it up at once and the paperwork went upstairs two hours later.";
/** A scenario whose only defect is the one line of prose under test. */
function scenarioSaying(text, overrides = {}) {
    return cleanScenario({ opening: [{ speaker: { kind: "narrator" }, text: `${text}${NEUTRAL_TAIL}` }], ...overrides });
}
describe("the content-side trade-off gate", () => {
    it("passes a scenario with real choices and real costs", () => {
        expect(auditScenario(cleanScenario())).toEqual([]);
    });
    it("rejects replies that all strike one tone", () => {
        const def = cleanScenario();
        const replies = def.replies.map((reply) => ({ ...reply, tone: "firm" }));
        expect(kindsOf({ ...def, replies })).toContain("single-tone");
    });
    it("rejects a position that costs nothing, including explicit zeros", () => {
        const def = cleanScenario();
        const free = {
            ...def.replies[0],
            commitment: {
                kind: "position",
                cost: { standing: 0 },
                remembered: "Nothing was spent on it, which is how everyone knew it had not been a decision.",
                rejoinder: { speaker: { kind: "cabinet", roleHint: "finance" }, text: "The first bill arrived on Thursday and it is larger than the estimate allowed for, and the estimate was written in this building." },
            },
        };
        expect(kindsOf({ ...def, replies: [free, def.replies[1]] })).toContain("costless-position");
    });
    it("rejects duplicate reply ids", () => {
        const def = cleanScenario();
        const twin = { ...def.replies[1], id: def.replies[0].id };
        expect(kindsOf({ ...def, replies: [def.replies[0], twin] })).toContain("duplicate-reply-id");
    });
});
describe("the depth floor", () => {
    it("rejects a scenario where no reply commits heavily", () => {
        const def = cleanScenario();
        const replies = def.replies.map((reply, index) => ({
            ...reply,
            commitment: {
                kind: "position",
                cost: index === 0 ? { standing: -0.02 } : { stability: -0.02 },
                remembered: "It was answered quietly, in the smallest coin the room had, and the papers never heard.",
                rejoinder: { speaker: { kind: "cabinet", roleHint: "justice" }, text: "Nobody outside this ministry noticed for a week, and then a clerk did, and she wrote it down in a register anybody may ask to read." },
            },
        }));
        expect(kindsOf({ ...def, replies })).toContain("shallow-stakes");
    });
    it("accepts a heavy instrument as the expensive door", () => {
        const def = cleanScenario();
        const replies = [
            { ...def.replies[1] },
            {
                id: "send-the-fleet",
                tone: "coercive",
                text: "Send the fleet up the channel tonight and let their radar explain it to them.",
                commitment: { kind: "instrument", instrument: "military", rung: 3 },
            },
        ];
        expect(kindsOf({ ...def, replies })).not.toContain("shallow-stakes");
    });
    it("rejects a position that moves nothing and stamps no flag", () => {
        const def = cleanScenario();
        const token = {
            id: "shrug-it-off",
            tone: "evasive",
            text: "Say nothing at all today, and let the whole thing find its own way out of the papers.",
            commitment: {
                kind: "position",
                cost: { stability: -0.01 },
                remembered: "Nothing was said and nothing was done, and the week simply closed over the whole affair.",
                rejoinder: { speaker: { kind: "cabinet", roleHint: "foreign" }, text: "Two of the people it touched have written since, and only one of them was angry, which is not the proportion anybody predicted." },
            },
        };
        expect(kindsOf({ ...def, replies: [...def.replies, token] })).toContain("token-position");
    });
    it("lets a cheap reply through when it stamps a flag", () => {
        const def = cleanScenario();
        const cheapButRemembered = {
            id: "let-the-insult-pass",
            tone: "evasive",
            text: "Let the insult pass without an answer, and keep the ledger of it for another day.",
            sets: ["let-the-insult-pass"],
            commitment: {
                kind: "position",
                cost: { stability: -0.01 },
                remembered: "The insult went unanswered on the day, and the government kept its own ledger of the fact.",
                rejoinder: { speaker: { kind: "cabinet", roleHint: "defense" }, text: "The office that carries this has asked for the decision in writing, which it has never once asked for in eleven years of carrying it." },
            },
        };
        expect(kindsOf({ ...def, replies: [...def.replies, cheapButRemembered] })).not.toContain("token-position");
    });
    it("rejects a reply that is another reply with extra downside", () => {
        const def = cleanScenario();
        const better = {
            id: "pay-a-little",
            tone: "conciliatory",
            text: "Pay the smaller claim now and be done with the whole file before the recess starts.",
            commitment: {
                kind: "position",
                cost: { treasury: -40, standing: -0.04 },
                remembered: "The smaller claim was paid at once and the file was closed before the recess began.",
                rejoinder: { speaker: { kind: "cabinet", roleHint: "finance" }, text: "It held through the season, and the survey that comes in spring will say whether it holds twice." },
            },
        };
        const worse = {
            id: "pay-a-lot",
            tone: "evasive",
            text: "Pay the larger claim as well, quietly, and hope that nobody ever adds the two together.",
            commitment: {
                kind: "position",
                cost: { treasury: -80, standing: -0.04 },
                remembered: "Both claims were paid in full and in silence, and the sum was left for someone to find.",
                rejoinder: { speaker: { kind: "narrator" }, text: "A reporter had the paperwork by morning and it is accurate in every particular, including the two pages nobody meant to file." },
            },
        };
        expect(kindsOf({ ...def, replies: [...def.replies, better, worse] })).toContain("dominated-reply");
    });
    it("does not call dominance between replies that stamp different flags", () => {
        const def = cleanScenario();
        const replies = def.replies.map((reply, index) => ({ ...reply, sets: [`deed-${index}`] }));
        expect(kindsOf({ ...def, replies })).not.toContain("dominated-reply");
    });
    it("warns when every reply is pure loss", () => {
        const def = cleanScenario();
        const replies = def.replies.map((reply) => ({
            ...reply,
            commitment: {
                kind: "position",
                cost: { standing: -0.05, stability: -0.02 },
                remembered: "Whatever was chosen, something was surrendered for it and nothing at all came back.",
                rejoinder: { speaker: { kind: "cabinet", roleHint: "interior" }, text: "The council that has to live with it met on Tuesday and put out no statement at all, which its own members are now arguing about." },
            },
            sets: [reply.id],
        }));
        const findings = auditScenario({ ...def, replies });
        expect(findings.map((finding) => finding.kind)).toContain("all-downside");
        expect(findings.find((finding) => finding.kind === "all-downside")?.severity).toBe("warning");
    });
    it("warns when a whole batch reads no flags at all", () => {
        const defs = Array.from({ length: 5 }, (_, index) => cleanScenario({ id: `island-${index}` }));
        const findings = auditScenarios(defs);
        expect(findings.map((finding) => finding.kind)).toContain("island-pack");
        expect(findings.find((finding) => finding.kind === "island-pack")?.severity).toBe("warning");
    });
    it("stays quiet when the batch carries its own follow-up", () => {
        const defs = Array.from({ length: 5 }, (_, index) => cleanScenario({ id: `chain-${index}` }));
        const first = defs[0];
        defs[0] = { ...first, replies: [{ ...first.replies[0], sets: ["the-first-deed"] }, first.replies[1]] };
        defs[4] = { ...defs[4], conditions: [{ kind: "flag", flag: "the-first-deed", is: true }] };
        expect(packKindsOf(defs)).not.toContain("island-pack");
    });
});
describe("the language gates", () => {
    it("rejects engine language in player copy", () => {
        const def = cleanScenario({ subject: "The rung of escalation" });
        expect(kindsOf(def)).toContain("mechanics-language");
    });
    it("rejects British spellings in player copy", () => {
        const def = cleanScenario({
            opening: [{ speaker: { kind: "narrator" }, text: "The harbour was grey by evening." }],
        });
        const kinds = kindsOf(def);
        expect(kinds.filter((kind) => kind === "british-spelling").length).toBeGreaterThan(0);
    });
    // The list enumerates the -ise family's inflections by hand and forgot the
    // -our family's, so every form below shipped while the bare stem was refused.
    it.each(["favouring", "favoured", "favourable", "honourable", "neighbourhood", "behavioural", "labourer", "harbouring", "colourful"])("rejects the British spelling %s, not only its stem", (word) => {
        expect(kindsOf(scenarioSaying(`The ruling was ${word} in the end.`))).toContain("british-spelling");
    });
    // A mechanics word inflects into ordinary English, so the widened match must
    // not reach past the base form the way the spelling gate now does.
    it.each(["rolling blackouts", "a statist argument", "seeding the fund", "rolled it back", "an effective answer"])("leaves %s alone: an inflected mechanics word is prose, not the engine leaking", (phrase) => {
        expect(kindsOf(scenarioSaying(`They called it ${phrase} by the morning.`))).not.toContain("mechanics-language");
    });
    it("still rejects the bare mechanics word the inflections are spared for", () => {
        expect(kindsOf(scenarioSaying("The stat moved against us overnight."))).toContain("mechanics-language");
    });
    // Figures read as a briefing document about a government; the game wants the
    // line the way it would be said out loud in the room.
    it.each([
        ["$5 million", "The fund lost $5 million before lunch."],
        ["a bare digit", "Eleven children and 2 teachers were inside."],
        ["a percentage", "Turnout fell to 33% by the afternoon."],
        ["a grouped figure", "The claim came to 1,200 in the end."],
        ["a lone currency mark", "They asked what the £ was doing this morning."],
    ])("rejects %s in player copy", (_label, text) => {
        expect(kindsOf(scenarioSaying(text))).toContain("numeral-in-prose");
    });
    it("wants the number, only spelled: counting in words is the point, not a workaround", () => {
        const def = scenarioSaying("Two phones bought there last month, and five million dollars gone by Friday.");
        expect(kindsOf(def)).not.toContain("numeral-in-prose");
    });
    it("rejects a placeholder the binder does not fill", () => {
        const def = cleanScenario({
            opening: [{ speaker: { kind: "narrator" }, text: "{{presidentName}} looked out the window." }],
        });
        expect(kindsOf(def)).toContain("unknown-placeholder");
    });
});
describe("coherence rules", () => {
    it("rejects a domestic scenario that reaches for a counterpart", () => {
        const def = cleanScenario({
            cast: { pick: "none" },
            opening: [{ speaker: { kind: "narrator" }, text: "The room waits on what {{counterpart}} decides to do about it." }],
            conditions: [{ kind: "relationship", field: "tension", atLeast: 0.2 }],
        });
        const kinds = kindsOf(def);
        expect(kinds.filter((kind) => kind === "domestic-incoherence").length).toBeGreaterThanOrEqual(2);
    });
    it.each([
        ["a compact shared with itself", { kind: "sharedMembership", present: true }],
        ["a coalition standing against itself", { kind: "coalition", against: "counterpart", present: true }],
    ])("rejects a domestic scenario asking about %s", (_label, condition) => {
        const def = cleanScenario({ cast: { pick: "none" }, conditions: [condition] });
        expect(kindsOf(def)).toContain("domestic-incoherence");
    });
    it("allows a domestic scenario to ask whether a coalition stands against the player", () => {
        const def = cleanScenario({ cast: { pick: "none" }, conditions: [{ kind: "coalition", against: "player", present: true }] });
        expect(kindsOf(def)).not.toContain("domestic-incoherence");
    });
    // The other half of the altitude contract. The opening had `duty-log-opening`
    // from the first corpus review; the replies — the half the player actually
    // says out loud — had nothing.
    describe("reply altitude", () => {
        const withReply = (text) => cleanScenario({
            replies: [
                { id: "act", tone: "firm", text, sets: ["acted"], commitment: { kind: "instrument", instrument: "military", rung: 4 } },
                {
                    id: "hold",
                    tone: "evasive",
                    text: "Say nothing today and let the week decide what we are answering for.",
                    sets: ["held"],
                    commitment: {
                        kind: "position",
                        cost: { standing: -0.08, stability: -0.05 },
                        remembered: "Nothing was said on the day it happened, and the week was allowed to decide it instead.",
                        rejoinder: { speaker: { kind: "cabinet", roleHint: "finance" }, text: "Three of the staff who worked that night have asked to be moved to another section, and none of the three gave a reason for it." },
                    },
                },
            ],
        });
        it("refuses a reply that orders a force it does not name", () => {
            expect(kindsOf(withReply("Send the team. If we can reach them we take them out, and I will answer for the cost."))).toContain("unnamed-capability");
        });
        it("accepts the same order once the capability is named", () => {
            expect(kindsOf(withReply("Authorize a special forces rescue on the valley tonight, and I will answer for whatever it costs."))).not.toContain("unnamed-capability");
        });
        // The qualifier is the whole point: the noun is fine, the bare definite
        // article in front of it is not.
        it("does not fire on a named force that happens to be a team", () => {
            expect(kindsOf(withReply("Send the rescue team in before first light and tell the families it is happening."))).not.toContain("unnamed-capability");
        });
    });
    // The defect that reached a player: a hostage scenario cast on
    // `stabilityBand: "fragile"` drew the United States, and the briefing put an
    // armed group holding four citizens for ransom somewhere in the American
    // interior. Every other rule passed it.
    describe("host plausibility", () => {
        const abroad = { site: "interior", ground: "counterpart", descriptor: "the aid station past the last graded road" };
        it("refuses a non-state armed group staged on a counterpart a cast does not establish has lost control", () => {
            const def = cleanScenario({ class: "hostage", locus: abroad, cast: { pick: "band", stabilityBand: "fragile" } });
            expect(kindsOf(def)).toContain("implausible-host");
        });
        it("refuses it on an unconstrained cast too, where the board may hand it any nation at all", () => {
            expect(kindsOf(cleanScenario({ class: "hostage", locus: abroad, cast: { pick: "tensest" } }))).toContain("implausible-host");
        });
        it("accepts an archetype that carries the premise", () => {
            const def = cleanScenario({ class: "hostage", locus: abroad, cast: { pick: "band", archetype: "post-conflict" } });
            expect(kindsOf(def)).not.toContain("implausible-host");
        });
        // A government speaking from its own soil is the ordinary case, and the
        // rule must not fire on it or every foreign scenario becomes a finding.
        it("leaves a state voice on a counterpart's ground alone", () => {
            const def = cleanScenario({ class: "foreign-crisis", locus: abroad, cast: { pick: "tensest" } });
            expect(kindsOf(def)).not.toContain("implausible-host");
        });
    });
    it("rejects a pinned nation without a set-piece declaration, and a pointless one", () => {
        expect(kindsOf(cleanScenario({ cast: { pick: "nation", nation: "FRA" } }))).toContain("undeclared-set-piece");
        expect(kindsOf(cleanScenario({ setPiece: { reason: "a scripted confrontation", owner: "content" } }))).toContain("pointless-set-piece");
    });
    // The schema only asks the reason to be non-empty, which "n/a" satisfies. A
    // declaration that records no reason grants the exception without recording
    // why, which is the whole thing requiring one was meant to prevent.
    it("rejects a set-piece whose stated reason is not a reason", () => {
        const thin = cleanScenario({ cast: { pick: "nation", nation: "FRA" }, setPiece: { reason: "n/a", owner: "content" } });
        expect(kindsOf(thin)).toContain("undeclared-set-piece");
        const declared = cleanScenario({
            cast: { pick: "nation", nation: "FRA" },
            setPiece: { reason: "a scripted confrontation with the one great power", owner: "content" },
        });
        expect(kindsOf(declared)).not.toContain("undeclared-set-piece");
    });
    it("rejects duplicate scenario ids across a pack", () => {
        const findings = auditScenarios([cleanScenario(), cleanScenario()]);
        expect(findings.map((finding) => finding.kind)).toContain("duplicate-scenario-id");
    });
    it("rejects two replies that resolve to the same outcome in different words", () => {
        const def = cleanScenario();
        const twin = {
            ...def.replies[0],
            id: "hold-firm-politely",
            tone: "principled",
            text: "Hold the line exactly where it is, but say it a good deal more courteously.",
        };
        expect(kindsOf({ ...def, replies: [def.replies[0], twin] })).toContain("indistinct-replies");
    });
    it("rejects a domestic scenario whose boost reads a relationship it does not have", () => {
        const def = cleanScenario({ cast: { pick: "none" }, boosts: [{ source: "tension", factor: 1.5 }] });
        expect(kindsOf(def)).toContain("inert-boost");
    });
    it("accepts a domestic scenario boosting on something it can actually read", () => {
        const def = cleanScenario({ cast: { pick: "none" }, boosts: [{ source: "instability", factor: 1.5 }] });
        expect(kindsOf(def)).toEqual([]);
    });
    describe("conflict moves", () => {
        const settling = (def) => ({
            ...def,
            replies: def.replies.map((reply, index) => index === 0 && reply.commitment.kind === "position"
                ? { ...reply, commitment: { ...reply.commitment, conflictMove: "acceptTerms" } }
                : reply),
        });
        it("refuses a reply that ends a war the scenario is not gated on the player fighting", () => {
            expect(kindsOf(settling(cleanScenario()))).toContain("ungrounded-conflict-move");
        });
        it("refuses one gated only on a war the player is out of — you cannot sign someone else's terms", () => {
            const def = settling(cleanScenario({ class: "war", conditions: [{ kind: "warState", role: "none" }] }));
            expect(kindsOf(def)).toContain("ungrounded-conflict-move");
        });
        it("refuses one on a domestic scenario, which has no counterpart to be at war with", () => {
            const def = settling(cleanScenario({ cast: { pick: "none" }, conditions: [{ kind: "warState", role: "any" }] }));
            expect(kindsOf(def)).toContain("ungrounded-conflict-move");
        });
        // The move settles the conflict between the player and whoever the cast
        // bound, so a cast that ranks relationships rather than reading the wars
        // can hand it a nation this government is at peace with.
        it("refuses one on a scenario cast by tension, which need not be who the player is fighting", () => {
            const def = settling(cleanScenario({ class: "war", cast: { pick: "tensest" }, conditions: [{ kind: "warState", role: "any" }] }));
            expect(kindsOf(def)).toContain("ungrounded-conflict-move");
        });
        it("accepts one on a scenario the board can only open while the player is at war", () => {
            const def = settling(cleanScenario({ class: "war", cast: { pick: "warCounterpart" }, conditions: [{ kind: "warState", role: "any" }] }));
            expect(kindsOf(def)).toEqual([]);
        });
    });
    // Entering somebody else's war is resolved against the counterpart's own
    // conflict, so the cast has to be one that guarantees the counterpart is in
    // one. The alternative a writer reaches for otherwise — a military rung
    // aimed at the cast nation — invades the ally the reply meant to defend.
    describe("joins", () => {
        const entering = (def) => ({
            ...def,
            replies: def.replies.map((reply, index) => index === 0 ? { ...reply, commitment: { kind: "join", side: "beside" } } : reply),
        });
        it("refuses a join on a scenario cast by tension, which need not be at war with anyone", () => {
            const def = entering(cleanScenario({ class: "war", cast: { pick: "tensest" } }));
            expect(kindsOf(def)).toContain("ungrounded-join");
        });
        it("refuses a join on a domestic scenario, which casts nobody to stand beside", () => {
            expect(kindsOf(entering(cleanScenario({ cast: { pick: "none" } })))).toContain("ungrounded-join");
        });
        it("accepts a join cast on a live belligerent", () => {
            const def = entering(cleanScenario({ class: "war", cast: { pick: "belligerent" } }));
            expect(kindsOf(def)).not.toContain("ungrounded-join");
        });
    });
    describe("stateGrievance", () => {
        it("refuses scope locus with no locus.state", () => {
            const def = cleanScenario({
                conditions: [{ kind: "stateGrievance", scope: "locus", atLeast: 0.1 }],
                locus: { site: "interior", ground: "counterpart", descriptor: "the valley with no state bind" },
            });
            expect(kindsOf(def)).toContain("ungrounded-state-grievance");
        });
        it("accepts scope locus when locus.state is set", () => {
            const def = cleanScenario({
                cast: { pick: "none" },
                conditions: [{ kind: "stateGrievance", scope: "locus", signature: "water-scare:fresno", atMost: -0.2 }],
                locus: { site: "interior", ground: "home", state: "CA", descriptor: "the valley" },
            });
            expect(kindsOf(def)).not.toContain("ungrounded-state-grievance");
        });
        it("accepts scope any without a locus.state", () => {
            const def = cleanScenario({
                conditions: [{ kind: "stateGrievance", scope: "any", atLeast: 0.1 }],
            });
            expect(kindsOf(def)).not.toContain("ungrounded-state-grievance");
        });
    });
    describe("unrouted-domestic-act", () => {
        it("refuses a domestic week with locus.state and no gazetteer or domestic on any reply", () => {
            const def = cleanScenario({
                cast: { pick: "none" },
                class: "economy",
                locus: { site: "interior", ground: "home", state: "PA", descriptor: "the valley" },
            });
            expect(kindsOf(def)).toContain("unrouted-domestic-act");
        });
        it("accepts the same week once a reply declares domestic", () => {
            const base = cleanScenario({
                cast: { pick: "none" },
                class: "economy",
                locus: { site: "interior", ground: "home", state: "PA", descriptor: "the valley" },
            });
            const def = {
                ...base,
                replies: base.replies.map((reply, index) => index === 0 && reply.commitment.kind === "position"
                    ? {
                        ...reply,
                        commitment: {
                            ...reply.commitment,
                            domestic: {
                                sectors: ["steel-heavy"],
                                magnitude: "heavy",
                                signature: "steel-scare:test",
                                reason: "The mills were named.",
                            },
                        },
                    }
                    : reply),
            };
            expect(kindsOf(def)).not.toContain("unrouted-domestic-act");
        });
    });
    describe("unplaced-domestic-signature", () => {
        const placed = (gazetteer) => {
            const base = cleanScenario({
                cast: { pick: "none" },
                class: "economy",
                locus: { site: "interior", ground: "home", state: "MO", descriptor: "the river bend" },
            });
            return {
                ...base,
                replies: base.replies.map((reply, index) => index === 0 && reply.commitment.kind === "position"
                    ? {
                        ...reply,
                        commitment: {
                            ...reply.commitment,
                            domestic: { urban: -0.3, magnitude: "moderate", signature: "levee:test", reason: "The river towns carried it." },
                            ...(gazetteer ? { gazetteer } : {}),
                        },
                    }
                    : reply),
            };
        };
        it("warns when a place-bound week routes only a national signature, and names the reply and the place", () => {
            const findings = auditScenario(placed()).filter((finding) => finding.kind === "unplaced-domestic-signature");
            expect(findings).toHaveLength(1);
            expect(findings[0].severity).toBe("warning");
            expect(findings[0].message).toMatch(/MO/);
        });
        it("is satisfied once the place's own lean moves beside the national echo", () => {
            expect(kindsOf(placed({ stateLean: -0.04 }))).not.toContain("unplaced-domestic-signature");
        });
        it("says nothing about a national week with no place", () => {
            const base = placed();
            expect(kindsOf({ ...base, locus: { ...base.locus, state: undefined, city: undefined } })).not.toContain("unplaced-domestic-signature");
        });
    });
    describe("dead-grievance-gate", () => {
        it("warns when a stateGrievance signature is never written by any reply", () => {
            const def = cleanScenario({
                cast: { pick: "none" },
                conditions: [{ kind: "stateGrievance", scope: "any", signature: "water-scare:never", atMost: -0.2 }],
                locus: { site: "interior", ground: "home", state: "CA", descriptor: "the catchment" },
                replies: cleanScenario({ cast: { pick: "none" } }).replies.map((reply) => reply.commitment.kind === "position"
                    ? {
                        ...reply,
                        commitment: {
                            ...reply.commitment,
                            domestic: {
                                sectors: ["agriculture"],
                                magnitude: "light",
                                signature: "other-slug",
                                reason: "A different scare.",
                            },
                        },
                    }
                    : reply),
            });
            expect(packKindsOf([def])).toContain("dead-grievance-gate");
        });
        it("stays quiet when a reply writes the signature the gate waits on", () => {
            const def = cleanScenario({
                cast: { pick: "none" },
                conditions: [{ kind: "stateGrievance", scope: "any", signature: "water-scare:fresno", atMost: -0.2 }],
                locus: { site: "interior", ground: "home", state: "CA", descriptor: "the catchment" },
                replies: cleanScenario({ cast: { pick: "none" } }).replies.map((reply) => reply.commitment.kind === "position"
                    ? {
                        ...reply,
                        commitment: {
                            ...reply.commitment,
                            domestic: {
                                sectors: ["agriculture"],
                                magnitude: "heavy",
                                signature: "water-scare:fresno",
                                reason: "The scare landed.",
                            },
                        },
                    }
                    : reply),
            });
            expect(packKindsOf([def])).not.toContain("dead-grievance-gate");
        });
    });
    describe("unnamed-group-toll", () => {
        it("refuses one-group without human.cohorts", () => {
            const def = cleanScenario();
            const replies = def.replies.map((reply, index) => index === 0 && reply.commitment.kind === "position"
                ? {
                    ...reply,
                    commitment: {
                        ...reply.commitment,
                        impact: { human: { lives: "dozens", borneBy: "one-group" }, agency: "our-doing" },
                    },
                }
                : reply);
            expect(kindsOf({ ...def, replies })).toContain("unnamed-group-toll");
        });
        it("accepts one-group once cohorts name the group", () => {
            const def = cleanScenario();
            const replies = def.replies.map((reply, index) => index === 0 && reply.commitment.kind === "position"
                ? {
                    ...reply,
                    commitment: {
                        ...reply.commitment,
                        impact: {
                            human: {
                                lives: "dozens",
                                borneBy: "one-group",
                                cohorts: ["rural", "goods-producing"],
                            },
                            agency: "our-doing",
                        },
                    },
                }
                : reply);
            expect(kindsOf({ ...def, replies })).not.toContain("unnamed-group-toll");
        });
    });
    describe("cohort-toll-implausible", () => {
        it("refuses a mass toll named onto a tiny cross-cut of the country", () => {
            const def = cleanScenario();
            const replies = def.replies.map((reply, index) => index === 0 && reply.commitment.kind === "position"
                ? {
                    ...reply,
                    commitment: {
                        ...reply.commitment,
                        impact: {
                            human: {
                                lives: "mass",
                                borneBy: "one-group",
                                cohorts: ["public-and-uniformed", "age-65-plus"],
                            },
                            agency: "our-doing",
                        },
                    },
                }
                : reply);
            expect(kindsOf({ ...def, replies })).toContain("cohort-toll-implausible");
        });
    });
    describe("dead-cohort-gate", () => {
        it("warns when a cohortStrain cause is never written", () => {
            const def = cleanScenario({
                cast: { pick: "none" },
                conditions: [{ kind: "cohortStrain", cohort: "rural", cause: "water-scare:never", atMost: -0.2 }],
                locus: { site: "interior", ground: "home", state: "CA", descriptor: "the catchment" },
                replies: cleanScenario({ cast: { pick: "none" } }).replies.map((reply) => reply.commitment.kind === "position"
                    ? {
                        ...reply,
                        commitment: {
                            ...reply.commitment,
                            domestic: {
                                sectors: ["agriculture"],
                                magnitude: "light",
                                signature: "other-slug",
                                reason: "A different scare.",
                            },
                        },
                    }
                    : reply),
            });
            expect(packKindsOf([def])).toContain("dead-cohort-gate");
        });
        it("stays quiet when a reply writes the cause the gate waits on", () => {
            const def = cleanScenario({
                cast: { pick: "none" },
                class: "public-health",
                conditions: [{ kind: "cohortStrain", cohort: "rural", cause: "water-scare:fresno", atMost: -0.2 }],
                locus: { site: "interior", ground: "home", state: "CA", descriptor: "the catchment" },
                replies: cleanScenario({ cast: { pick: "none" } }).replies.map((reply) => reply.commitment.kind === "position"
                    ? {
                        ...reply,
                        commitment: {
                            ...reply.commitment,
                            domestic: {
                                sectors: ["agriculture"],
                                magnitude: "heavy",
                                signature: "water-scare:fresno",
                                reason: "The scare landed.",
                            },
                        },
                    }
                    : reply),
            });
            expect(packKindsOf([def])).not.toContain("dead-cohort-gate");
        });
    });
});
describe("unrouted-domestic-act", () => {
    // Previously scanned the live shipped corpus for a naturally-occurring
    // violation, on the theory that a rule with nothing to catch might be dead
    // code. That coupled a unit test to mutable content: the corpus-wide content
    // audit and rewrite pass of 2026-09-02 fixed every real instance, and the
    // proof this test wanted — that the rule really fires — is better served by
    // a fixture the rule is built to catch, the same way every other audit rule
    // in this file is tested. `auditUnroutedDomesticAct`'s own two-line trigger
    // (`cast.pick === "none"` and `locus.state` bound, with no reply routing
    // `gazetteer` or `domestic`) is exercised directly below.
    it("fails a domestic scenario whose state bind no reply routes", () => {
        const domestic = cleanScenario({ cast: { pick: "none" } });
        const def = cleanScenario({ cast: { pick: "none" }, locus: { ...domestic.locus, state: "MT" } });
        expect(kindsOf(def)).toContain("unrouted-domestic-act");
    });
    it("passes the same scenario once a reply declares domestic", () => {
        const domestic = cleanScenario({ cast: { pick: "none" } });
        const def = cleanScenario({ cast: { pick: "none" }, locus: { ...domestic.locus, state: "MT" } });
        const replies = def.replies.map((reply, index) => index === 0 && reply.commitment.kind === "position"
            ? {
                ...reply,
                commitment: {
                    ...reply.commitment,
                    domestic: {
                        sectors: ["agriculture"],
                        magnitude: "light",
                        signature: "state-bind-routed-in-test",
                        reason: "the fixture routes the act so the rule can pass it.",
                    },
                },
            }
            : reply);
        expect(kindsOf({ ...def, replies })).not.toContain("unrouted-domestic-act");
    });
});
// The question is "does this survive being cast onto any nation, under any
// charter" — checked against the real dataset rather than a hand-typed list,
// so the rules cannot go stale as the roster changes.
describe("world neutrality", () => {
    it("rejects a real nation, demonym, or capital in content that casts by board state", () => {
        expect(kindsOf(scenarioSaying("Germany moved a brigade to the line."))).toContain("nation-name-in-generic");
        expect(kindsOf(scenarioSaying("A Brazilian delegation is waiting."))).toContain("nation-name-in-generic");
        expect(kindsOf(scenarioSaying("The cable came in from Ankara overnight."))).toContain("nation-name-in-generic");
    });
    it("rejects a capability figure that could only be true of one nation", () => {
        expect(kindsOf(scenarioSaying("Their economy clears $400 billion and they know it."))).toContain("literal-capability-figure");
        expect(kindsOf(scenarioSaying("They can put 40 thousand troops on that border by Friday."))).toContain("literal-capability-figure");
    });
    // Player copy spells its numbers out, so the digit-shaped rule above would
    // otherwise only catch the drafts that were going to be rewritten anyway.
    it("rejects the same capability claim written out in words", () => {
        expect(kindsOf(scenarioSaying("They can put forty thousand troops on that border by Friday."))).toContain("literal-capability-figure");
        expect(kindsOf(scenarioSaying("Five thousand of their best soldiers are already across."))).toContain("literal-capability-figure");
        expect(kindsOf(scenarioSaying("A million citizens are on the move tonight."))).toContain("literal-capability-figure");
    });
    // The window is adjacency, not the sentence: a bribe and the budget speech
    // share a sentence in shipped content and that is correct writing.
    it("leaves a magnitude that does not modify the capability noun alone", () => {
        const def = scenarioSaying("Four million was routed offshore while the budget speech promised belt-tightening.");
        expect(kindsOf(def)).not.toContain("literal-capability-figure");
    });
    it("lets a declared set-piece name the nation it was written for", () => {
        const setPiece = { reason: "a scripted confrontation", owner: "content" };
        const def = scenarioSaying("Germany moved a brigade to the line.", { cast: { pick: "nation", nation: "DEU" }, setPiece });
        expect(kindsOf(def)).toEqual([]);
    });
    it("rejects an institution only one charter has, set-piece or not", () => {
        expect(kindsOf(scenarioSaying("The National Assembly will not sit before Thursday."))).toContain("charter-institution-literal");
        const setPiece = { reason: "a scripted confrontation", owner: "content" };
        const pinned = scenarioSaying("The National Assembly will not sit before Thursday.", {
            cast: { pick: "nation", nation: "DEU" },
            setPiece,
        });
        expect(kindsOf(pinned)).toContain("charter-institution-literal");
    });
    // The live constitution's own institutions are what the cabinet-title rule
    // already permits for its own chairs, and the same reasoning applies here:
    // the dataset ships one playable nation under one pinned charter, and that
    // charter's Congress is not a lie in a domestic scenario about it.
    it("takes the live constitution's own institutions as the way to name a body", () => {
        expect(kindsOf(scenarioSaying("Congress will not sit before Thursday.", { cast: { pick: "none" } }))).not.toContain("charter-institution-literal");
    });
    it("still refuses another constitution's institution for the player's own government", () => {
        expect(kindsOf(scenarioSaying("The National Assembly will not sit before Thursday.", { cast: { pick: "none" } }))).toContain("charter-institution-literal");
    });
    it("rejects a hardcoded cabinet chair, phrased either way round", () => {
        expect(kindsOf(scenarioSaying("The Foreign Minister is already on the aircraft."))).toContain("cabinet-title-literal");
        expect(kindsOf(scenarioSaying("Send the Minister of Finance instead."))).toContain("cabinet-title-literal");
    });
    it("leaves ordinary prose about somebody else's head of state alone", () => {
        expect(kindsOf(scenarioSaying("Their president will not take the call before morning."))).toEqual([]);
    });
    it("rejects an invented individual named with a rank or honorific", () => {
        expect(kindsOf(scenarioSaying("General Marks died in detention last night."))).toContain("hardcoded-individual");
        expect(kindsOf(scenarioSaying("The hospital fire killed Dr. Reeves this morning."))).toContain("hardcoded-individual");
    });
    it("lets a role or function stand in for the person nobody can name yet", () => {
        expect(kindsOf(scenarioSaying("The general who ran the detention facility died in custody last night."))).toEqual([]);
        expect(kindsOf(scenarioSaying("The hospital fire killed the government's most visible critic this morning."))).toEqual([]);
    });
    it("does not fire on a capitalized rank word alone, only a rank welded to a name", () => {
        expect(kindsOf(scenarioSaying("A general strike closed every depot in the country this week."))).toEqual([]);
    });
    it("rejects a bare, lowercase 'minister' naming the player's own cabinet in a domestic scenario", () => {
        expect(kindsOf(scenarioSaying("The finance minister took half a million from donors last year.", { cast: { pick: "none" } }))).toContain("cabinet-title-literal");
        expect(kindsOf(scenarioSaying("Two of your ministers are asking whether to resign in solidarity.", { cast: { pick: "none" } }))).toContain("cabinet-title-literal");
    });
    // "Chair" is charter-neutral, which is why the corpus reached for it, and it
    // stays out of cabinet-title-literal's way. It is still not a word a player
    // has been taught: the title token renders what the cabinet screen shows, so
    // that is what prose is pointed at now.
    it("keeps a charter-neutral chair out of the title rule, and still asks for the token", () => {
        const kinds = kindsOf(scenarioSaying("The finance chair took half a million from donors last year.", { cast: { pick: "none" } }));
        expect(kinds).not.toContain("cabinet-title-literal");
        expect(kinds).toContain("insider-shorthand");
    });
    // The one constitution a player can found under calls its seats Secretaries,
    // so prose may say so. It was forbidden while several charters were reachable
    // and only one is now, and the prohibition was what drove the corpus to
    // "chair".
    it("takes the live constitution's own titles as the way to name a seat", () => {
        expect(kindsOf(scenarioSaying("The Secretary of the Treasury took half a million from donors last year.", { cast: { pick: "none" } }))).toEqual([]);
    });
    it("still refuses another constitution's vocabulary for the player's own cabinet", () => {
        expect(kindsOf(scenarioSaying("The Treasury Minister took half a million from donors last year.", { cast: { pick: "none" } }))).toContain("cabinet-title-literal");
    });
    it("leaves 'minister' alone when a counterpart exists, since it may be their government's word for it", () => {
        expect(kindsOf(scenarioSaying("Their foreign minister will not take the call before morning."))).toEqual([]);
    });
    it("lets content name the player's own bodies by function, since the charter fills them", () => {
        expect(kindsOf(scenarioSaying("{{assembly}} will not sit before Thursday."))).toEqual([]);
    });
    it("makes content gate on a body not every charter has", () => {
        expect(kindsOf(scenarioSaying("{{judiciary}} has ruled against the decree."))).toContain("ungated-institution-token");
        const gated = scenarioSaying("{{judiciary}} has ruled against the decree.", {
            conditions: [{ kind: "charterInstitution", institution: "judiciary", present: true }],
        });
        expect(kindsOf(gated)).toEqual([]);
    });
});
describe("the impact contract", () => {
    const stripImpact = (def) => ({
        ...def,
        replies: def.replies.map((reply) => reply.commitment.kind === "position"
            ? { ...reply, commitment: { ...reply.commitment, impact: undefined } }
            : reply),
    });
    it("reports a scenario where no answer declares an impact", () => {
        const findings = auditScenario(stripImpact(cleanScenario())).filter((f) => f.kind === "impact-undeclared");
        expect(findings).toHaveLength(1);
        // Reported, not refused: a week whose briefing states no toll may be one
        // where no answer spends anything, and only a reader can tell that from an
        // author who skipped the work.
        expect(findings[0].severity).toBe("warning");
    });
    it("says so in the sharper terms when the briefing itself states a toll", () => {
        const def = stripImpact(cleanScenario({
            opening: [
                {
                    speaker: { kind: "cabinet", roleHint: "interior" },
                    text: "Nineteen people are dead under the market walkway and the families are outside the building asking what we knew about the inspection file.",
                },
            ],
        }));
        const finding = auditScenario(def).find((f) => f.kind === "impact-undeclared");
        expect(finding?.message).toContain("nobody died");
    });
    it("accepts a scenario where one answer declares an impact, since the others may have nothing to declare", () => {
        expect(kindsOf(cleanScenario())).not.toContain("impact-undeclared");
    });
    it("treats typed tariff, directive, and bill-text actions as priced without hiding a stated toll", () => {
        const commands = [
            { tariff: { sector: "energy-refined", rate: 0.15 } },
            { directive: { kind: "investigation" } },
            { billText: { action: "propose" } },
        ];
        for (const command of commands) {
            const def = stripImpact(cleanScenario());
            const replies = def.replies.map((reply, index) => index === 0 && reply.commitment.kind === "position"
                ? { ...reply, commitment: { ...reply.commitment, ...command } }
                : reply);
            const tollless = { ...def, replies };
            const findings = [];
            auditImpactDeclared(tollless, findings);
            expect(findings).toEqual([]);
            const withToll = {
                ...tollless,
                opening: [{ speaker: { kind: "narrator" }, text: "Nineteen people are dead after the collapse." }],
            };
            auditImpactDeclared(withToll, findings);
            expect(findings).toEqual([expect.objectContaining({ kind: "impact-undeclared", severity: "error" })]);
        }
    });
    // A judgment week: nothing has happened yet, the answer that spends anything
    // is the engine-priced instrument, and the positions beside it hold. Asking
    // those for a band buys a false one.
    it("does not refuse a tollless week whose only spending answer is an instrument", () => {
        const def = stripImpact(cleanScenario({
            replies: [
                {
                    id: "move-our-units-up-now",
                    tone: "firm",
                    text: "Move our own units up to the line now, on the single report.",
                    sets: ["moved-on-one-report"],
                    commitment: { kind: "instrument", instrument: "military", rung: 2 },
                },
                {
                    id: "wait-for-a-second-look",
                    tone: "principled",
                    text: "Keep units in garrison until a second crew can confirm the report.",
                    sets: ["waited-for-a-second-look"],
                    commitment: {
                        kind: "position",
                        cost: { militaryReadiness: -0.05 },
                        remembered: "The government held its units in garrison until a second crew could confirm the report.",
                        rejoinder: {
                            speaker: { kind: "narrator" },
                            text: "The second crew went up on the fourth day and found tracks and no armor.",
                        },
                    },
                },
            ],
        }));
        const errors = auditScenario(def).filter((f) => f.kind === "impact-undeclared" && f.severity === "error");
        expect(errors).toEqual([]);
    });
    it("still refuses a week whose briefing states a toll, instrument answer or not", () => {
        const def = stripImpact(cleanScenario({
            opening: [
                {
                    speaker: { kind: "cabinet", roleHint: "interior" },
                    text: "Nineteen people are dead under the market walkway and the families are outside the building asking what we knew about the inspection file.",
                },
            ],
            replies: [
                {
                    id: "send-the-engineers",
                    tone: "firm",
                    text: "Send the engineers onto every walkway in the city tonight.",
                    sets: ["sent-the-engineers"],
                    commitment: { kind: "instrument", instrument: "military", rung: 1 },
                },
                {
                    id: "publish-the-inspection-file",
                    tone: "principled",
                    text: "Publish the file and let it say what it says.",
                    sets: ["published-the-file"],
                    commitment: {
                        kind: "position",
                        cost: { standing: -0.04 },
                        remembered: "The government published the inspection file the week the walkway came down.",
                        rejoinder: {
                            speaker: { kind: "narrator" },
                            text: "The file went out on the Friday and named two inspectors who no longer work for the city.",
                        },
                    },
                },
            ],
        }));
        const finding = auditScenario(def).find((f) => f.kind === "impact-undeclared");
        // A stated toll is the case the rule can prove, so it stays an error.
        expect(finding?.severity).toBe("error");
    });
    // The field an author reaches for once told a block may not be empty. It
    // multiplies a death toll and nothing else, so without one it moves no number
    // while making the block look like it declares something.
    const firstReplyImpact = (impact) => cleanScenario({
        replies: cleanScenario().replies.map((reply, index) => index === 0 && reply.commitment.kind === "position"
            ? { ...reply, commitment: { ...reply.commitment, impact: impact } }
            : reply),
    });
    it("refuses an agency with no toll beside it", () => {
        const def = firstReplyImpact({ institutional: ["legal-authority-spent"], agency: "our-doing" });
        expect(kindsOf(def)).toContain("inert-impact-field");
    });
    it("leaves an agency alone where a toll gives it something to multiply", () => {
        const def = firstReplyImpact({ human: { lives: "dozens" }, agency: "our-doing" });
        expect(kindsOf(def)).not.toContain("inert-impact-field");
    });
    // The only impact field that can flip the sign of what it prices: a rally is
    // what a country feels when its own are killed, so "acted-upon" and "abroad"
    // cannot both be true, and together they pay the player for a death.
    it("refuses a toll declared acted-upon and borne abroad", () => {
        const def = firstReplyImpact({ human: { lives: "dozens", borneBy: "abroad" }, agency: "acted-upon" });
        expect(kindsOf(def)).toContain("acted-upon-abroad");
    });
    it("refuses acted-upon with nobody named as having borne it", () => {
        // The silence defaults to "diffuse" — our own people — which is the very
        // case the value is for, so it fails open into the most legitimate shape.
        const def = firstReplyImpact({ human: { lives: "dozens" }, agency: "acted-upon" });
        expect(kindsOf(def)).toContain("acted-upon-abroad");
    });
    it("leaves acted-upon alone where the dead are our own", () => {
        const def = firstReplyImpact({ human: { lives: "dozens", borneBy: "one-region" }, agency: "acted-upon" });
        expect(kindsOf(def)).not.toContain("acted-upon-abroad");
    });
    it("leaves a toll borne abroad alone under any other agency", () => {
        const def = firstReplyImpact({ human: { lives: "dozens", borneBy: "abroad" }, agency: "our-doing" });
        expect(kindsOf(def)).not.toContain("acted-upon-abroad");
    });
    it("says nothing about a block that declares its costs and no agency", () => {
        const def = firstReplyImpact({ financial: { scale: "supplemental", horizon: "one-off" }, divisive: true });
        expect(kindsOf(def)).not.toContain("inert-impact-field");
    });
    // The arithmetic check the band table exists for: the author's own sentence
    // against the author's own declaration.
    it("refuses a declared band that contradicts the reply's own prose", () => {
        const def = cleanScenario({
            replies: [
                {
                    id: "own-it",
                    tone: "principled",
                    text: "Say what the strike did before anyone else counts it for us.",
                    commitment: {
                        kind: "position",
                        cost: { standing: -0.06 },
                        impact: { human: { lives: "hundreds", borneBy: "abroad" }, agency: "our-doing" },
                        remembered: "The government said out loud that nineteen people had died in the second building, on the day it happened.",
                        rejoinder: { speaker: { kind: "narrator" }, text: "The count held. Two other governments put out statements before ours had finished reading, and both of them used the same word we had avoided." },
                    },
                },
                {
                    id: "wait-for-the-count",
                    tone: "evasive",
                    text: "Wait for a count we can stand behind before we say anything at all.",
                    commitment: {
                        kind: "position",
                        cost: { stability: -0.03 },
                        remembered: "Nothing was said until a count had been agreed, which took nine days.",
                        rejoinder: { speaker: { kind: "cabinet", roleHint: "foreign" }, text: "By the fourth day the number in circulation was somebody else's, and it was wrong in the direction that hurt us most." },
                    },
                },
            ],
        });
        const finding = auditScenario(def).find((f) => f.kind === "impact-contradicts-prose");
        expect(finding?.message).toContain("dozens");
    });
    it("accepts a band that matches the sentence it is declared beside", () => {
        const def = cleanScenario({
            replies: [
                {
                    id: "own-it",
                    tone: "principled",
                    text: "Say what the strike did before anyone else counts it for us.",
                    commitment: {
                        kind: "position",
                        cost: { standing: -0.06 },
                        impact: { human: { lives: "dozens", borneBy: "abroad" }, agency: "our-doing" },
                        remembered: "The government said out loud that nineteen people had died in the second building, on the day it happened.",
                        rejoinder: { speaker: { kind: "narrator" }, text: "The count held. Two other governments put out statements before ours had finished reading, and both of them used the same word we had avoided." },
                    },
                },
                {
                    id: "wait-for-the-count",
                    tone: "evasive",
                    text: "Wait for a count we can stand behind before we say anything at all.",
                    commitment: {
                        kind: "position",
                        cost: { stability: -0.03 },
                        remembered: "Nothing was said until a count had been agreed, which took nine days.",
                        rejoinder: { speaker: { kind: "cabinet", roleHint: "foreign" }, text: "By the fourth day the number in circulation was somebody else's, and it was wrong in the direction that hurt us most." },
                    },
                },
            ],
        });
        expect(kindsOf(def)).not.toContain("impact-contradicts-prose");
    });
    // A briefing states what already happened; an impact states what this answer
    // did. An answer that escalates past the week it opened in is correct.
    it("does not read the briefing's toll against a reply that declares its own", () => {
        const def = cleanScenario({
            opening: [
                {
                    speaker: { kind: "cabinet", roleHint: "defense" },
                    text: "Three of our people are dead on the river line this morning and their commander is asking what he is authorized to do about it before dark.",
                },
            ],
            replies: [
                {
                    id: "answer-in-kind",
                    tone: "firm",
                    text: "Answer it in kind, tonight, and let them count what it costs them.",
                    commitment: {
                        kind: "position",
                        cost: { standing: 0.04 },
                        impact: { human: { lives: "hundreds", borneBy: "abroad" }, agency: "our-doing" },
                        remembered: "The line was answered in kind before dark, and the answer was larger than the thing it answered.",
                        rejoinder: { speaker: { kind: "cabinet", roleHint: "defense" }, text: "Their side stopped moving by midnight, which is what we wanted, and their casualty figure is now the number everybody is quoting." },
                    },
                },
                {
                    id: "hold-them-where-they-are",
                    tone: "evasive",
                    text: "Hold everyone exactly where they are and give me the night to find out who fired first.",
                    commitment: {
                        kind: "position",
                        cost: { militaryReadiness: -0.03 },
                        remembered: "Nobody moved for a night while the question of who had fired first was settled.",
                        rejoinder: { speaker: { kind: "narrator" }, text: "The answer arrived at four in the morning and it was not the one anybody in the room had been arguing from." },
                    },
                },
            ],
        });
        expect(kindsOf(def)).not.toContain("impact-contradicts-prose");
    });
});
describe("prose quality", () => {
    it("rejects a real news organisation", () => {
        expect(kindsOf(scenarioSaying("Reuters has the photographs already."))).toContain("press-organization");
    });
    it("rejects filler that breaks the register", () => {
        expect(kindsOf(scenarioSaying("At the end of the day, this is what we have."))).toContain("filler-language");
    });
    it("rejects a doubled function word", () => {
        expect(kindsOf(scenarioSaying("The the patrol turned back at first light."))).toContain("doubled-word");
    });
    it("rejects copy that runs past what its field allows", () => {
        const def = cleanScenario({ subject: "A very long subject line that goes on describing the situation well past the point of being a headline" });
        expect(kindsOf(def)).toContain("overlong-text");
    });
    it("rejects a subject that says a scenario is happening rather than which one", () => {
        expect(kindsOf(cleanScenario({ subject: "Tensions rise" }))).toContain("generic-subject");
    });
    it("warns on copy that clears the floor but sits under the target", () => {
        const terse = cleanScenario({
            opening: [{ speaker: { kind: "narrator" }, text: "The patrol crossed the line and then it went home." }],
        });
        const findings = auditScenario(terse);
        expect(findings.map((finding) => finding.kind)).toContain("thin-text");
        // Thin writing is a judgement about craft, not a defect — it belongs in
        // front of a reviewer, not in front of a blocked publish.
        expect(auditPasses(findings)).toBe(true);
    });
});
// The floors are the schema's, not the audit's: copy this short is not thin,
// it is absent, and it should never become a document the audit then measures
// for register and neutrality — every one of which passes trivially on nothing.
describe("the schema's length floors", () => {
    const clean = cleanScenario();
    it("refuses a beat, reply, remembered line or press headline below its floor", () => {
        const stub = (def) => ScenarioDef.safeParse(def).success;
        expect(stub(clean)).toBe(true);
        expect(stub({ ...clean, subject: "Trouble" })).toBe(false);
        expect(stub({ ...clean, opening: [{ speaker: { kind: "narrator" }, text: "It happened." }] })).toBe(false);
        expect(stub({ ...clean, replies: [{ ...clean.replies[0], text: "Yes." }, clean.replies[1]] })).toBe(false);
        expect(stub({
            ...clean,
            replies: [
                {
                    ...clean.replies[0],
                    commitment: {
                        kind: "position",
                        cost: { standing: -0.02 },
                        remembered: "It held.",
                        rejoinder: {
                            speaker: { kind: "cabinet", roleHint: "justice" },
                            text: "The number came back higher than the room had planned for and it came back early, which is the part the finance office minds.",
                        },
                    },
                },
                clean.replies[1],
            ],
        })).toBe(false);
        expect(stub({ ...clean, replies: [{ ...clean.replies[0], press: "It Held" }, clean.replies[1]] })).toBe(false);
    });
    it("does not let whitespace stand in for writing", () => {
        const padded = { ...clean, opening: [{ speaker: { kind: "narrator" }, text: `It happened.${" ".repeat(80)}` }] };
        expect(ScenarioDef.safeParse(padded).success).toBe(false);
    });
    it("leaves every floor under the shortest line the core pack actually ships", () => {
        for (const def of CORE_SCENARIOS) {
            expect(ScenarioDef.safeParse(def).success).toBe(true);
        }
    });
});
describe("particulars", () => {
    it("lets a particular carry figures the prose rules would refuse", () => {
        const def = cleanScenario({
            particulars: [
                { label: "Dead so far", value: "19" },
                { label: "First report", value: "06:40" },
            ],
        });
        const kinds = kindsOf(def);
        expect(kinds).not.toContain("numeral-in-prose");
        expect(kinds).not.toContain("thin-text");
        expect(kinds).not.toContain("overlong-text");
    });
    it("still holds a particular to world-neutrality", () => {
        const def = cleanScenario({ particulars: [{ label: "Claimed by", value: "a cell traced to Germany" }] });
        expect(kindsOf(def)).toContain("nation-name-in-generic");
    });
    it("still refuses engine language in a particular", () => {
        const def = cleanScenario({ particulars: [{ label: "The reading", value: "a stability delta of 0.03" }] });
        expect(kindsOf(def)).toContain("mechanics-language");
    });
    it("caps the strip at four and each field at its width", () => {
        const stub = (particulars) => ScenarioDef.safeParse({ ...cleanScenario(), particulars }).success;
        expect(stub([{ label: "Dead so far", value: "19" }])).toBe(true);
        expect(stub(Array.from({ length: 5 }, (_, index) => ({ label: `Fact ${index}`, value: "19" })))).toBe(false);
        expect(stub([{ label: "A label far too long for a wire strip", value: "19" }])).toBe(false);
        expect(stub([{ label: "The trace", value: "a value that runs far past what the strip can set" }])).toBe(false);
        expect(stub([])).toBe(false);
    });
});
describe("flag economy", () => {
    // A deed gate carries the ripening boost the audit expects of one, and an
    // engine-stamped gate carries none — the audit calls that boost inert there.
    // These cases are about which flags may be waited on, and getting either
    // wrong buries the rule under test under a ripening finding.
    const authored = (flag) => !flag.startsWith(scenarioFiredFlag("")) && !flag.startsWith(deskClosedFlag(0).slice(0, -1));
    const gatedOn = (flag) => cleanScenario({
        conditions: [{ kind: "flag", flag, is: true }],
        ...(authored(flag) ? { boosts: [{ source: "flagAge", factor: 1 }] } : {}),
    });
    it("rejects a scenario waiting on a flag nothing ever sets", () => {
        expect(packKindsOf([gatedOn("never-written")])).toContain("flag-condition-never-set");
    });
    it("accepts a gate a reply in the same batch writes", () => {
        const writer = cleanScenario({
            id: "writer",
            subject: "A resignation over dinner",
            opening: [
                {
                    speaker: { kind: "narrator" },
                    text: "A cabinet secretary resigned over dinner, in front of two ambassadors and most of a visiting trade delegation.",
                },
            ],
            replies: [
                {
                    id: "accept-it",
                    tone: "firm",
                    text: "Accept it tonight, and have a successor named before the morning papers go out.",
                    sets: ["the-line-held"],
                    commitment: {
                        kind: "position",
                        cost: { stability: -0.05, standing: 0.02 },
                        remembered: "The chair was refilled overnight, before anyone outside the building knew it was empty.",
                        rejoinder: { speaker: { kind: "cabinet", roleHint: "foreign" }, text: "Somebody in this building told a broadcaster, correctly, and nobody has asked who, which is a decision as much as an oversight." },
                    },
                },
                {
                    id: "talk-them-round",
                    tone: "conciliatory",
                    text: "Drive over there tonight and talk them out of it before anyone else hears.",
                    commitment: {
                        kind: "position",
                        cost: { standing: -0.03 },
                        impact: { institutional: ["legislative-capital-spent"] },
                        remembered: "They were talked round before midnight, and everyone in the room knew what it had cost.",
                        rejoinder: { speaker: { kind: "cabinet", roleHint: "defense" }, text: "The families were told before the papers were, which took four hours nobody had budgeted for and two staff who volunteered them." },
                    },
                },
            ],
        });
        expect(packKindsOf([writer, gatedOn("the-line-held")])).toEqual([]);
    });
    it("accepts a gate a pack already installed writes", () => {
        expect(packKindsOf([gatedOn("set-by-the-core-pack")], ["set-by-the-core-pack"])).toEqual([]);
    });
    it("accepts the flags the engine stamps itself rather than an author", () => {
        expect(packKindsOf([gatedOn(scenarioFiredFlag("test-scenario"))])).toEqual([]);
        expect(packKindsOf([gatedOn(deskClosedFlag(3))])).toEqual([]);
    });
    it("leaves a gate waiting for a flag to be absent alone", () => {
        expect(packKindsOf([cleanScenario({ conditions: [{ kind: "flag", flag: "never-written", is: false }] })])).toEqual([]);
    });
});
describe("a callback that never ripens", () => {
    const bare = (flag) => cleanScenario({ conditions: [{ kind: "flag", flag, is: true }] });
    const ripening = (flag) => cleanScenario({ conditions: [{ kind: "flag", flag, is: true }], boosts: [{ source: "flagAge", factor: 1 }] });
    it("warns on a flag-gated scenario with no flagAge boost", () => {
        const findings = auditScenario(bare("cleared-the-square"));
        expect(findings.map((finding) => finding.kind)).toContain("callback-never-ripens");
        // A warning, not a gate: a deliberately rare follow-up still ships.
        expect(auditPasses(findings)).toBe(true);
    });
    it("stays quiet once the callback ripens", () => {
        expect(kindsOf(ripening("cleared-the-square"))).not.toContain("callback-never-ripens");
    });
    it("asks nothing of a gate on a flag the engine stamps itself", () => {
        expect(kindsOf(bare(scenarioFiredFlag("some-scenario")))).not.toContain("callback-never-ripens");
        expect(kindsOf(bare(deskClosedFlag(3)))).not.toContain("callback-never-ripens");
    });
    it("leaves a gate waiting for a flag to be absent alone — nothing has been stamped to age", () => {
        expect(kindsOf(cleanScenario({ conditions: [{ kind: "flag", flag: "cleared-the-square", is: false }] }))).not.toContain("callback-never-ripens");
    });
    it("refuses a flagAge boost on a scenario that waits on no flag", () => {
        expect(kindsOf(cleanScenario({ boosts: [{ source: "flagAge", factor: 1 }] }))).toContain("inert-boost");
    });
});
describe("severity", () => {
    it("warns rather than blocks when two scenarios of a class are one template", () => {
        const text = "The patrol turned back at first light and the cable landed an hour later, which is how these things always start.";
        const a = scenarioSaying(text, { id: "twin-a" });
        const b = scenarioSaying(text, { id: "twin-b" });
        const findings = auditScenarios([a, b]);
        expect(findings.map((finding) => finding.kind)).toContain("template-overlap");
        expect(auditPasses(findings)).toBe(true);
    });
    it("blocks on an error", () => {
        expect(auditPasses(auditScenario(cleanScenario({ subject: "Tensions rise" })))).toBe(false);
    });
});
describe("the manufactured clock", () => {
    const countdown = "You have until the vote tonight to decide which of the two programs this government still believes in.";
    it("refuses a routine scenario whose opening puts the decision on a countdown", () => {
        const def = scenarioSaying(countdown, { severity: "routine" });
        const finding = auditScenario(def).find((entry) => entry.kind === "manufactured-clock");
        expect(finding?.severity).toBe("error");
    });
    it("flags the same phrase in a reply, where the player would say it out loud", () => {
        const def = cleanScenario({ severity: "routine" });
        const replies = [{ ...def.replies[0], text: "Tell them the clock is running and I want an answer on my desk." }, def.replies[1]];
        expect(kindsOf({ ...def, replies })).toContain("manufactured-clock");
    });
    it("flags a countdown routed through the transmission alone, where opening and replies stay clean", () => {
        const def = cleanScenario({ severity: "routine" });
        const withCountdown = {
            ...def,
            transmission: { ...def.transmission, text: `${countdown}${NEUTRAL_TAIL}` },
        };
        expect(kindsOf(withCountdown)).toContain("manufactured-clock");
    });
    it("only warns when a serious scenario carries one, for a person to judge", () => {
        const finding = auditScenario(scenarioSaying(countdown, { severity: "serious" })).find((entry) => entry.kind === "manufactured-clock");
        expect(finding?.severity).toBe("warning");
    });
    it("lets a critical week keep its countdown: the fiction earned the clock", () => {
        expect(kindsOf(scenarioSaying(countdown, { severity: "critical" }))).not.toContain("manufactured-clock");
    });
    it("stays quiet on a routine week with no countdown in it", () => {
        expect(kindsOf(cleanScenario({ severity: "routine" }))).not.toContain("manufactured-clock");
    });
});
describe("the severity mix", () => {
    const tier = (severity, index) => cleanScenario({ id: `mix-${severity}-${index}`, severity });
    it("warns when a batch is mostly critical", () => {
        const defs = [tier("critical", 1), tier("critical", 2), tier("critical", 3), tier("routine", 1)];
        const finding = auditScenarios(defs).find((entry) => entry.kind === "severity-monotone");
        expect(finding?.severity).toBe("warning");
    });
    it("warns when a batch of size carries no routine week at all", () => {
        const defs = [tier("serious", 1), tier("serious", 2), tier("serious", 3), tier("critical", 1)];
        expect(auditScenarios(defs).map((entry) => entry.kind)).toContain("severity-monotone");
    });
    it("stays quiet on a mixed batch, and on a small one", () => {
        const mixed = [tier("routine", 1), tier("serious", 1), tier("serious", 2), tier("critical", 1)];
        expect(auditScenarios(mixed).map((entry) => entry.kind)).not.toContain("severity-monotone");
        const small = [tier("critical", 1), tier("critical", 2)];
        expect(auditScenarios(small).map((entry) => entry.kind)).not.toContain("severity-monotone");
    });
});
describe("briefing register", () => {
    // The line that made this rule necessary, close to verbatim: accurate,
    // concrete, and pitched at a watch officer's altitude rather than a head of
    // government's.
    it("flags an opening that reads as a duty log", () => {
        const def = cleanScenario({
            opening: [
                {
                    speaker: { kind: "cabinet", roleHint: "interior" },
                    text: "The dockers did not clock on at six, and every container quay in the country is stopped where it stands.",
                },
            ],
        });
        expect(kindsOf(def)).toContain("duty-log-opening");
    });
    // The discriminator earning its keep. A clock reading is not the defect —
    // this opens on an act of war at an hour, which is exactly the right way to
    // tell a head of government that a plane has been shot down.
    it("leaves an opening that states the stakes at an hour alone", () => {
        const def = cleanScenario({
            opening: [
                {
                    speaker: { kind: "cabinet", roleHint: "defense" },
                    text: "They shot down one of our planes at dawn, over the water we both claim, and two of our people went into it.",
                },
            ],
        });
        expect(kindsOf(def)).not.toContain("duty-log-opening");
    });
    // Shift vocabulary is not banned. A strike scenario is about shifts, and the
    // detail is what makes the scene real — it just cannot be the first thing
    // the room is told.
    it("leaves shift detail alone once the stakes have been stated first", () => {
        const def = cleanScenario({
            opening: [
                {
                    speaker: { kind: "cabinet", roleHint: "interior" },
                    text: "The ports stop paying for themselves tonight and you have until the vote to decide what this government pays to end it. The dockers did not clock on at six.",
                },
            ],
        });
        expect(kindsOf(def)).not.toContain("duty-log-opening");
    });
    it("refuses a transmission on a scenario with no counterpart to have sent it", () => {
        const parsed = ScenarioDef.safeParse({
            ...cleanScenario(),
            cast: { pick: "none" },
            transmission: {
                relay: "cable",
                attribution: "their foreign ministry",
                text: "We have read your statement and we do not accept a word of it. Withdraw it by tonight or we will act.",
            },
        });
        expect(parsed.success).toBe(false);
    });
    it("audits a transmission's prose on the same pass as every other passage", () => {
        const def = cleanScenario({
            transmission: {
                relay: "broadcast",
                attribution: "their head of government",
                text: "The United States has chosen this, not us, and our people will remember which of the two governments blinked.",
            },
        });
        expect(kindsOf(def)).toContain("nation-name-in-generic");
    });
});
// Pool-scale rules: distributional and diversity warnings that only mean
// something over a batch large enough to have a shape. Every
// one of these is a "warning", never an "error" — auditPasses gates on errors
// only, and the thresholds below are explicitly provisional.
describe("pool-scale diversity", () => {
    // Ten replies, alternating "firm then conciliatory" and "coercive then
    // principled": one tuple covers 8 of 10 scenarios, well over the 40%
    // ceiling.
    const toneTupleScenario = (id, tones) => cleanScenario({
        id,
        replies: [
            { ...cleanScenario().replies[0], tone: tones[0] },
            { ...cleanScenario().replies[1], tone: tones[1] },
        ],
    });
    it("warns when one reply-tone tuple dominates a batch of eight or more", () => {
        const defs = [
            ...Array.from({ length: 8 }, (_, i) => toneTupleScenario(`tuple-mono-${i}`, ["firm", "conciliatory"])),
            toneTupleScenario("tuple-mono-8", ["coercive", "evasive"]),
            toneTupleScenario("tuple-mono-9", ["principled", "evasive"]),
        ];
        const finding = auditScenarios(defs).find((entry) => entry.kind === "tone-tuple-monoculture");
        expect(finding).toBeDefined();
        expect(finding?.severity).toBe("warning");
        expect(finding?.message).toContain("80%");
        expect(finding?.message).toContain("40%");
    });
    it("stays quiet when reply tones vary across the batch", () => {
        const tones = [
            ["firm", "conciliatory"],
            ["coercive", "evasive"],
            ["principled", "evasive"],
            ["firm", "principled"],
            ["evasive", "coercive"],
            ["conciliatory", "principled"],
            ["coercive", "conciliatory"],
            ["principled", "firm"],
        ];
        const defs = tones.map((pair, index) => toneTupleScenario(`tuple-mixed-${index}`, pair));
        expect(packKindsOf(defs)).not.toContain("tone-tuple-monoculture");
    });
    it("stays quiet below the size floor even when every tuple matches", () => {
        const defs = Array.from({ length: 6 }, (_, i) => toneTupleScenario(`tuple-small-${i}`, ["firm", "conciliatory"]));
        expect(packKindsOf(defs)).not.toContain("tone-tuple-monoculture");
    });
    const framingScenario = (id, speaker) => cleanScenario({ id, opening: [{ speaker, text: cleanScenario().opening[0].text }] });
    it("warns when one opening speaker sequence dominates a batch of eight or more", () => {
        const defs = [
            ...Array.from({ length: 7 }, (_, i) => framingScenario(`frame-mono-${i}`, { kind: "cabinet", roleHint: "foreign" })),
            framingScenario("frame-mono-7", { kind: "narrator" }),
            framingScenario("frame-mono-8", { kind: "narrator" }),
        ];
        const finding = auditScenarios(defs).find((entry) => entry.kind === "opening-framing-monoculture");
        expect(finding).toBeDefined();
        expect(finding?.severity).toBe("warning");
        expect(finding?.message).toContain("78%");
        expect(finding?.message).toContain("60%");
    });
    it("stays quiet when opening speaker kinds vary across the batch", () => {
        // The rule reads speaker *kind* only, not roleHint — four cabinet chairs
        // would still collapse to one "cabinet" sequence, so the mix has to vary
        // by kind itself to prove the rule quiet.
        const speakers = [
            { kind: "cabinet", roleHint: "foreign" },
            { kind: "narrator" },
            { kind: "player" },
            { kind: "narrator" },
            { kind: "cabinet", roleHint: "finance" },
            { kind: "player" },
            { kind: "cabinet", roleHint: "interior" },
            { kind: "narrator" },
        ];
        const defs = speakers.map((speaker, index) => framingScenario(`frame-mixed-${index}`, speaker));
        expect(packKindsOf(defs)).not.toContain("opening-framing-monoculture");
    });
    it("stays quiet below the size floor even when every opening matches", () => {
        const defs = Array.from({ length: 6 }, (_, i) => framingScenario(`frame-small-${i}`, { kind: "narrator" }));
        expect(packKindsOf(defs)).not.toContain("opening-framing-monoculture");
    });
    it("warns when fewer than half a batch of eight or more carries any condition", () => {
        const conditioned = cleanScenario({
            id: "cond-yes",
            conditions: [{ kind: "turn", atLeast: 2 }],
        });
        const bare = (id) => cleanScenario({ id, conditions: [] });
        const defs = [conditioned, bare("cond-1"), bare("cond-2"), bare("cond-3"), bare("cond-4"), bare("cond-5"), bare("cond-6"), bare("cond-7")];
        const finding = auditScenarios(defs).find((entry) => entry.kind === "condition-coverage-thin");
        expect(finding).toBeDefined();
        expect(finding?.severity).toBe("warning");
        expect(finding?.message).toContain("1 of 8");
    });
    it("stays quiet when at least half a batch carries a condition", () => {
        const conditioned = (id) => cleanScenario({ id, conditions: [{ kind: "turn", atLeast: 2 }] });
        const bare = (id) => cleanScenario({ id, conditions: [] });
        const defs = [conditioned("c1"), conditioned("c2"), conditioned("c3"), conditioned("c4"), bare("b1"), bare("b2"), bare("b3"), bare("b4")];
        expect(packKindsOf(defs)).not.toContain("condition-coverage-thin");
    });
    it("stays quiet below the size floor even with zero conditioned scenarios", () => {
        const defs = Array.from({ length: 6 }, (_, i) => cleanScenario({ id: `cond-small-${i}`, conditions: [] }));
        expect(packKindsOf(defs)).not.toContain("condition-coverage-thin");
    });
    it("warns when a batch writes ten or more distinct flags and reads none of them", () => {
        const defs = Array.from({ length: 5 }, (_, i) => {
            const base = cleanScenario({ id: `write-${i}` });
            return {
                ...base,
                replies: [
                    { ...base.replies[0], sets: [`deed-${i}-a`] },
                    { ...base.replies[1], sets: [`deed-${i}-b`] },
                ],
            };
        });
        const finding = auditScenarios(defs).find((entry) => entry.kind === "flag-economy-imbalance");
        expect(finding).toBeDefined();
        expect(finding?.severity).toBe("warning");
        expect(finding?.message).toContain("10 distinct flags");
    });
    // Calibrated against real content: the run length is long enough that
    // connective tissue does not trip it and short enough to catch a borrowed
    // image. The core pack's own exemplars must stay clean at this setting.
    it("warns when three scenarios lean on the same phrase", () => {
        const borrowed = "and everyone in the room already knew what the answer would be";
        const defs = Array.from({ length: 8 }, (_, i) => cleanScenario({
            id: `stock-${i}`,
            opening: [
                {
                    speaker: { kind: "narrator" },
                    text: i < 3
                        ? `The duty officer wrote it up before dawn, ${borrowed}, and the file went upstairs regardless.`
                        : `Report number ${i} arrived on its own schedule and nobody thought it worth a second reading at all.`,
                },
            ],
        }));
        const finding = auditScenarios(defs).find((entry) => entry.kind === "stock-phrasing");
        expect(finding).toBeDefined();
        expect(finding?.severity).toBe("warning");
    });
    it("leaves ordinary connective phrasing alone", () => {
        const openings = [
            "The harbor office sent its return up a day late and nobody chased it until the auditors asked.",
            "Two provinces filed the same objection in different words, which the registry noticed before anyone else.",
            "A grain contract lapsed quietly at midnight and the buyer has already found somebody else to sign.",
            "The northern line closed for repairs that were supposed to take a fortnight and have taken three.",
            "An old boundary survey turned up in a drawer and contradicts the map every ministry has been using.",
            "The mint struck a run of coins with last year's date and nobody caught it for a month.",
            "A retired clerk wrote to say the pension formula has been wrong since before the last government.",
            "The ferry contract renews itself unless somebody objects, and the deadline to object was yesterday.",
        ];
        const defs = openings.map((text, i) => cleanScenario({
            id: `plain-${i}`,
            opening: [{ speaker: { kind: "narrator" }, text }],
            replies: [
                {
                    id: `settle-${i}`,
                    tone: "firm",
                    text: `Settle it now on the terms the ${openings[i].split(" ")[1]} office already proposed, and close the file.`,
                    commitment: {
                        kind: "position",
                        cost: { treasury: -70 },
                        remembered: `The matter was closed on the spot, paid in full, and never reopened by anybody afterward.`,
                        rejoinder: {
                            speaker: { kind: "narrator" },
                            text: `The office that had raised it wrote once more to confirm, and then stopped writing altogether.`,
                        },
                    },
                },
                {
                    id: `defer-${i}`,
                    tone: "evasive",
                    text: `Leave it where it sits until somebody with a real claim comes forward to press the question.`,
                    sets: [`deferred-${i}`],
                    commitment: {
                        kind: "position",
                        cost: { stability: -0.02 },
                        remembered: `Nothing was decided, and the file went back in the drawer to wait for a better week.`,
                        rejoinder: {
                            speaker: { kind: "cabinet", roleHint: "interior" },
                            text: `Nobody came forward all season, and the drawer it went into is one two people have keys to.`,
                        },
                    },
                },
            ],
        }));
        // The two replies repeat by construction here; what must not fire is a
        // finding about the eight genuinely different openings.
        const reported = auditScenarios(defs)
            .filter((entry) => entry.kind === "stock-phrasing")
            .map((entry) => entry.message);
        expect(reported.some((message) => message.includes("office sent its return"))).toBe(false);
    });
    // The blind spot that let a real batch through: the rule counts carriers in
    // whatever set it is handed, so a phrase borrowed from the *shipped corpus*
    // was invisible to a batch gate however carefully it was run.
    it("counts carriers already in the shipped corpus, not only those in the batch", () => {
        // Eight deliberately unlike openings, so the batch is clean on its own and
        // the only thing the corpus index can be credited with is the borrowing.
        const distinct = [
            "The duty officer wrote it up before dawn, and everyone in the room already knew, and filed it anyway.",
            "The harbor office sent its return up a day late and nobody chased it until the auditors asked.",
            "Two provinces filed the same objection in different words, which the registry noticed before anyone else.",
            "A grain contract lapsed quietly at midnight and the buyer has already found somebody else to sign.",
            "The northern line closed for repairs that were supposed to take a fortnight and have taken three.",
            "An old boundary survey turned up in a drawer and contradicts the map every ministry has been using.",
            "The mint struck a run of coins with last year's date and nobody caught it for a month.",
            "A retired clerk wrote to say the pension formula has been wrong since before the last government.",
        ];
        const defs = distinct.map((text, i) => cleanScenario({
            id: `borrow-${i}`,
            opening: [{ speaker: { kind: "narrator" }, text }],
        }));
        // Asserted on this one run rather than on "any finding": the shared fixture
        // gives all eight scenarios the same replies, so the batch reports plenty of
        // its own repetition. What is on trial is whether a phrase only ONE batch
        // scenario carries can be caught at all.
        const borrowed = "everyone in the room already";
        const carriedByBatch = (findings) => findings.some((entry) => entry.kind === "stock-phrasing" && entry.message.includes(borrowed));
        // Two shipped carriers for exactly the runs the first scenario carries. The
        // batch contributes one; one plus two is over the ceiling.
        const shipped = new Map([...phraseCarrierIndex([defs[0], defs[0]]).keys()].map((run) => [run, 2]));
        expect(carriedByBatch(auditScenarios(defs))).toBe(false);
        expect(carriedByBatch(auditScenarios(defs, undefined, { phraseCarriers: shipped }))).toBe(true);
        const finding = auditScenarios(defs, undefined, { phraseCarriers: shipped }).find((entry) => entry.kind === "stock-phrasing" && entry.message.includes(borrowed));
        expect(finding).toBeDefined();
        expect(finding?.severity).toBe("warning");
        // The count is the pool total, and the message says where the rest of it is
        // so a writer does not go looking for a repetition inside their own batch.
        expect(finding?.message).toContain("3 scenarios share the phrase");
        expect(finding?.message).toContain("already in the shipped corpus");
    });
    it("indexes only runs the corpus carries more than once, which is what keeps it an index", () => {
        const once = cleanScenario({
            id: "once",
            opening: [{ speaker: { kind: "narrator" }, text: "A singular sentence nobody else in this pool has written down anywhere." }],
        });
        const twice = [0, 1].map((i) => cleanScenario({
            id: `twice-${i}`,
            opening: [{ speaker: { kind: "narrator" }, text: "The very same borrowed clause appears here, and here it is again in a second document." }],
        }));
        const index = phraseCarrierIndex([once, ...twice]);
        expect([...index.values()].every((count) => count >= 2)).toBe(true);
        expect([...index.keys()].some((run) => run.includes("singular sentence nobody"))).toBe(false);
        expect([...index.keys()].some((run) => run.includes("same borrowed clause appears"))).toBe(true);
    });
    it("stays quiet on a batch too small to have a house style yet", () => {
        const shared = "and everyone in the room already knew what the answer would be";
        const defs = Array.from({ length: 3 }, (_, i) => cleanScenario({
            id: `tiny-${i}`,
            opening: [{ speaker: { kind: "narrator" }, text: `It came in at first light, ${shared}, plainly.` }],
        }));
        expect(auditScenarios(defs).map((entry) => entry.kind)).not.toContain("stock-phrasing");
    });
    // The failure `class` cannot see: eight different desks, one argument.
    it("warns when over half a batch is the same dilemma, however varied its classes", () => {
        const classes = ["justice", "institution", "scandal", "economy", "culture", "death"];
        const defs = classes.map((klass, i) => ({
            ...cleanScenario({ id: `same-shape-${i}` }),
            class: klass,
            dilemmaShape: "loyalty-test",
        }));
        const finding = auditScenarios(defs).find((entry) => entry.kind === "dilemma-shape-monoculture");
        expect(finding).toBeDefined();
        expect(finding?.message).toContain("loyalty-test");
    });
    it("leaves a batch that spreads its shapes alone", () => {
        const shapes = ["allocation", "containment", "retaliation", "disclosure", "loyalty-test", "credulity-bet"];
        const defs = shapes.map((shape, i) => ({ ...cleanScenario({ id: `spread-${i}` }), dilemmaShape: shape }));
        expect(auditScenarios(defs).map((entry) => entry.kind)).not.toContain("dilemma-shape-monoculture");
    });
    it("stays quiet below the batch floor, where one repeated shape is a theme not a rut", () => {
        const defs = [0, 1, 2].map((i) => ({ ...cleanScenario({ id: `small-${i}` }), dilemmaShape: "containment" }));
        expect(auditScenarios(defs).map((entry) => entry.kind)).not.toContain("dilemma-shape-monoculture");
    });
    // motifs is the image underneath the argument dilemmaShape names, and
    // optional where dilemmaShape is required — so its monoculture check has to
    // measure against however many scenarios bothered to tag one, not the
    // batch size.
    it("warns when over the ceiling of labeled scenarios reuse the same motif", () => {
        const shapes = ["allocation", "containment", "retaliation", "disclosure"];
        const defs = Array.from({ length: 8 }, (_, i) => ({
            ...cleanScenario({ id: `same-motif-${i}` }),
            dilemmaShape: shapes[i % shapes.length],
            motifs: ["uncorroborated-source"],
        }));
        const finding = auditScenarios(defs).find((entry) => entry.kind === "motif-monoculture");
        expect(finding).toBeDefined();
        expect(finding?.message).toContain("uncorroborated-source");
    });
    it("leaves a batch that spreads its motifs alone", () => {
        const motifs = [
            "uncorroborated-source",
            "agency-non-confirmation",
            "broken-chain-of-custody",
            "border-crossing",
            "quiet-transfer",
            "divided-public-perception",
            "closing-claim-of-ownership",
            "border-crossing",
        ];
        const defs = motifs.map((motif, i) => ({ ...cleanScenario({ id: `spread-motif-${i}` }), motifs: [motif] }));
        expect(auditScenarios(defs).map((entry) => entry.kind)).not.toContain("motif-monoculture");
    });
    it("stays quiet below the labeled-scenario floor", () => {
        const defs = Array.from({ length: 3 }, (_, i) => ({
            ...cleanScenario({ id: `small-motif-${i}` }),
            motifs: ["uncorroborated-source"],
        }));
        expect(auditScenarios(defs).map((entry) => entry.kind)).not.toContain("motif-monoculture");
    });
    it("does not count unlabeled scenarios toward the motif floor or the batch base", () => {
        // 8 scenarios reuse a motif but only 5 carry one at all — under the
        // labeled-floor of 8, so this must stay quiet even though the batch
        // itself is large.
        const labeled = Array.from({ length: 5 }, (_, i) => ({
            ...cleanScenario({ id: `labeled-${i}` }),
            motifs: ["uncorroborated-source"],
        }));
        const unlabeled = Array.from({ length: 5 }, (_, i) => cleanScenario({ id: `unlabeled-${i}` }));
        expect(auditScenarios([...labeled, ...unlabeled]).map((entry) => entry.kind)).not.toContain("motif-monoculture");
    });
    // The write side of the flag economy has a read-side twin: a batch can read
    // plenty and still spend one deed over and over, which is what a pool looks
    // like when a writer reaches for the vocabulary in front of them.
    it("warns when more scenarios than the ceiling gate on the same deed", () => {
        const defs = Array.from({ length: 4 }, (_, i) => ({
            ...cleanScenario({ id: `reader-${i}` }),
            conditions: [{ kind: "flag", flag: "hunted-the-leak", is: true }],
        }));
        const finding = auditScenarios(defs, ["hunted-the-leak"]).find((entry) => entry.kind === "callback-concentration");
        expect(finding).toBeDefined();
        expect(finding?.severity).toBe("warning");
        expect(finding?.message).toContain("hunted-the-leak");
    });
    it("leaves a deed answered a few times alone — a file may be reopened, just not every week", () => {
        const defs = Array.from({ length: 3 }, (_, i) => ({
            ...cleanScenario({ id: `few-${i}` }),
            conditions: [{ kind: "flag", flag: "hunted-the-leak", is: true }],
        }));
        expect(auditScenarios(defs, ["hunted-the-leak"]).map((entry) => entry.kind)).not.toContain("callback-concentration");
    });
    it("counts each deed separately, so a batch spending its callbacks widely stays quiet", () => {
        const defs = Array.from({ length: 8 }, (_, i) => ({
            ...cleanScenario({ id: `wide-${i}` }),
            conditions: [{ kind: "flag", flag: `deed-${i}`, is: true }],
        }));
        const known = defs.map((_, i) => `deed-${i}`);
        expect(auditScenarios(defs, known).map((entry) => entry.kind)).not.toContain("callback-concentration");
    });
    it("stays quiet once something in the batch reads one of the flags it wrote", () => {
        const defs = Array.from({ length: 5 }, (_, i) => {
            const base = cleanScenario({ id: `write-read-${i}` });
            return {
                ...base,
                replies: [
                    { ...base.replies[0], sets: [`deed-${i}-a`] },
                    { ...base.replies[1], sets: [`deed-${i}-b`] },
                ],
            };
        });
        defs[4] = { ...defs[4], conditions: [{ kind: "flag", flag: "deed-0-a", is: true }] };
        expect(packKindsOf(defs)).not.toContain("flag-economy-imbalance");
    });
    it("stays quiet when a batch reads a flag already known from an installed pack instead of its own writes", () => {
        const defs = Array.from({ length: 5 }, (_, i) => {
            const base = cleanScenario({ id: `write-known-${i}` });
            return {
                ...base,
                replies: [
                    { ...base.replies[0], sets: [`deed-${i}-a`] },
                    { ...base.replies[1], sets: [`deed-${i}-b`] },
                ],
            };
        });
        defs[4] = { ...defs[4], conditions: [{ kind: "flag", flag: "prior-pack-flag", is: true }] };
        expect(auditScenarios(defs, ["prior-pack-flag"]).map((entry) => entry.kind)).not.toContain("flag-economy-imbalance");
    });
    it("stays quiet below the ten-flag write floor", () => {
        const defs = Array.from({ length: 4 }, (_, i) => {
            const base = cleanScenario({ id: `write-small-${i}` });
            return {
                ...base,
                replies: [
                    { ...base.replies[0], sets: [`deed-${i}-a`] },
                    { ...base.replies[1], sets: [`deed-${i}-b`] },
                ],
            };
        });
        expect(packKindsOf(defs)).not.toContain("flag-economy-imbalance");
    });
});
describe("invented proper nouns", () => {
    it("rejects a bare invented surname no honorific pattern reaches", () => {
        expect(kindsOf(scenarioSaying("The bar wants us to seat Marchen on the bench before the recess."))).toContain("invented-proper-noun");
    });
    it("rejects an invented place name", () => {
        expect(kindsOf(scenarioSaying("The families have buried their dead at Restwell Cemetery for three generations."))).toContain("invented-proper-noun");
    });
    it("allows weekdays and months mid-sentence", () => {
        expect(kindsOf(scenarioSaying("The square fills again on Friday, and the count is due by early March."))).not.toContain("invented-proper-noun");
    });
    // The player is the President of the United States, so the player's own
    // buildings and departments are real names, not inventions.
    it("allows the playable government's own departments and bodies by their real names", () => {
        const line = "The lawyers at the Justice Department want the file before the Senate asks, and the Pentagon has already sent its own.";
        expect(kindsOf(scenarioSaying(line))).not.toContain("invented-proper-noun");
    });
    it("allows the playable government's real cabinet-rank titles beyond the seats the charter models", () => {
        const line = "The Secretary of Transportation wants the ports reopened, and the Director of National Intelligence has read the same cable.";
        const kinds = kindsOf(scenarioSaying(line));
        expect(kinds).not.toContain("cabinet-title-literal");
        expect(kinds).not.toContain("invented-proper-noun");
    });
    it("still refuses another charter's title phrased the American way round", () => {
        expect(kindsOf(scenarioSaying("The Minister of Finance wants the ports reopened before the vote."))).toContain("cabinet-title-literal");
    });
    it("does not mistake a sentence's own opening word for a name", () => {
        expect(kindsOf(scenarioSaying("Nobody has signed the order. Whoever signs it owns what follows."))).not.toContain("invented-proper-noun");
    });
    it("leaves real nation names to the neutrality rule rather than reporting them twice", () => {
        const findings = auditScenario(scenarioSaying("Their convoy crossed into France before the escort caught up."));
        const kinds = findings.map((finding) => finding.kind);
        expect(kinds).toContain("nation-name-in-generic");
        expect(kinds).not.toContain("invented-proper-noun");
    });
});
describe("stilted register", () => {
    it("warns when the room reaches above the words people use", () => {
        const findings = auditScenario(scenarioSaying("The delegation waited in the anteroom while the chair decided."));
        const stilted = findings.filter((finding) => finding.kind === "stilted-register");
        expect(stilted).toHaveLength(1);
        expect(stilted[0].severity).toBe("warning");
    });
    it("stays quiet on plain speech about the same scene", () => {
        expect(kindsOf(scenarioSaying("The delegation waited in the outer office while the chair decided."))).not.toContain("stilted-register");
    });
});
describe("a promised follow-up nobody wrote", () => {
    const announcing = (sets) => {
        const base = cleanScenario({ id: "the-review-opener" });
        return {
            ...base,
            replies: [
                base.replies[1],
                {
                    ...base.replies[0],
                    id: "open-the-review",
                    text: "This is bigger than one trip. Open a formal review of every chair's disclosures, not just the one caught.",
                    sets: sets ? [...sets] : undefined,
                },
            ],
        };
    };
    it("warns when a reply opens a review whose flag nothing reads", () => {
        const findings = auditScenarios([announcing(["opened-the-disclosure-review"])]);
        const promised = findings.filter((finding) => finding.kind === "promised-follow-up-unread");
        expect(promised).toHaveLength(1);
        expect(promised[0].severity).toBe("warning");
    });
    it("warns when the announcing reply stamps no flag at all, so nothing could ever collect", () => {
        expect(packKindsOf([announcing(undefined)])).toContain("promised-follow-up-unread");
    });
    it("stays quiet when the reader ships in the same batch", () => {
        const reader = cleanScenario({
            id: "the-review-reports-back",
            conditions: [{ kind: "flag", flag: "opened-the-disclosure-review", is: true, agedAtLeast: 6 }],
            boosts: [{ source: "flagAge", factor: 1 }],
        });
        expect(packKindsOf([announcing(["opened-the-disclosure-review"]), reader])).not.toContain("promised-follow-up-unread");
    });
    it("stays quiet when the shipped corpus already reads the flag", () => {
        const findings = auditScenarios([announcing(["opened-the-disclosure-review"])], [], {
            readFlags: ["opened-the-disclosure-review"],
        });
        expect(findings.map((finding) => finding.kind)).not.toContain("promised-follow-up-unread");
    });
    it("stays quiet on a reply that announces nothing", () => {
        expect(packKindsOf([cleanScenario()])).not.toContain("promised-follow-up-unread");
    });
});
// The rejoinder is the beat a position reply gets in place of the aftermath an
// instrument reply earns from the resolver. Both rules below are warnings: the
// field is optional while the corpus is backfilled, and the echo threshold is
// argued rather than measured because no shipped scenario carries one yet.
describe("the rejoinder", () => {
    /** A position reply whose rejoinder says whatever the test needs it to say. */
    function withRejoinder(text, overrides = {}) {
        const def = cleanScenario(overrides);
        const first = def.replies[0];
        if (first.commitment.kind !== "position")
            throw new Error("fixture drift: first reply is no longer a position");
        return {
            ...def,
            replies: [
                { ...first, commitment: { ...first.commitment, rejoinder: { speaker: { kind: "narrator" }, text } } },
                def.replies[1],
            ],
        };
    }
    it("accepts a rejoinder that tells the room something it did not have", () => {
        const def = withRejoinder("By the evening the border villages had started moving their livestock west, and nobody had told them to.");
        expect(auditScenario(def)).toEqual([]);
    });
    it("warns when the rejoinder only says the remembered line again", () => {
        // Near-verbatim on purpose: this is the failure the rule exists to name, a
        // beat that costs the player a read and returns nothing.
        const def = withRejoinder("The line held where it was drawn, and the government said so out loud the same day.");
        const finding = auditScenario(def).find((entry) => entry.kind === "rejoinder-restates");
        expect(finding).toBeDefined();
        expect(finding?.severity).toBe("warning");
        expect(finding?.message).toContain("the remembered line");
    });
    it("warns when the rejoinder only says the reply back", () => {
        const def = withRejoinder("Hold the line exactly where it is, and say so plainly before the day is out.");
        const finding = auditScenario(def).find((entry) => entry.kind === "rejoinder-restates");
        expect(finding).toBeDefined();
        expect(finding?.message).toContain("the reply itself");
    });
    it("audits a rejoinder as player copy like any other beat", () => {
        // The point of folding it into `passages`: a rejoinder that skips the
        // language gates is a rejoinder that eventually ships a real country's name.
        const def = withRejoinder("The envoy in France called within the hour to ask what the government had meant by any of it, and waited.");
        expect(kindsOf(def)).toContain("nation-name-in-generic");
    });
});
// The schema narrows a speaker's roleHint to exclude "lead" (ScenarioSpeakerRoleHint),
// so a well-typed ScenarioDef cannot construct this shape without a cast — these
// tests simulate content that reaches the audit without going through that type,
// e.g. a shard read back off disk before it is re-validated.
describe("the lead-speaker self-address rule", () => {
    it("rejects an opening beat that speaks as the player's own lead chair", () => {
        const def = cleanScenario({
            opening: [
                {
                    speaker: { kind: "cabinet", roleHint: "lead" },
                    text: "Can we wait for rates to fall? How long do we have before the bonds mature and the choice is made for us.",
                },
            ],
        });
        const finding = auditScenario(def).find((entry) => entry.kind === "lead-speaker-addresses-self");
        expect(finding).toBeDefined();
        expect(finding?.severity).toBe("error");
        expect(finding?.message).toContain("the player's own");
    });
    it("rejects a rejoinder that speaks as the player's own lead chair", () => {
        const def = cleanScenario();
        const first = def.replies[0];
        if (first.commitment.kind !== "position")
            throw new Error("fixture drift: first reply is no longer a position");
        const withLeadRejoinder = {
            ...def,
            replies: [
                {
                    ...first,
                    commitment: {
                        ...first.commitment,
                        rejoinder: {
                            speaker: { kind: "cabinet", roleHint: "lead" },
                            text: "The bonds matured on schedule and the room said so out loud the same day.",
                        },
                    },
                },
                def.replies[1],
            ],
        };
        const finding = auditScenario(withLeadRejoinder).find((entry) => entry.kind === "lead-speaker-addresses-self");
        expect(finding).toBeDefined();
        expect(finding?.message).toContain("rejoinder speaks as");
    });
    it("stays quiet on a real department speaker", () => {
        expect(kindsOf(cleanScenario())).not.toContain("lead-speaker-addresses-self");
    });
});
// The defect an arc cell introduces: a chain that only comes back down one of
// its branches. Every other flag rule passes such a batch — it reads deeds, so
// island-pack and flag-economy-imbalance are quiet, and no single deed is
// over-read, so callback-concentration is too.
describe("arc branch coverage", () => {
    /** A setter whose two replies stamp their own distinct deeds. */
    const setter = (id = "the-setter") => cleanScenario({
        id,
        replies: [
            { ...cleanScenario().replies[0], sets: ["held-the-line"] },
            { ...cleanScenario().replies[1], sets: ["let-it-pass"] },
        ],
    });
    const reader = (id, flag) => cleanScenario({
        id,
        conditions: [{ kind: "flag", flag, is: true, agedAtLeast: 6 }],
        boosts: [{ source: "flagAge", factor: 1 }],
    });
    it("warns when one branch is answered and the other is not", () => {
        const finding = auditScenarios([setter(), reader("the-reader", "held-the-line")]).find((entry) => entry.kind === "arc-branch-unread");
        expect(finding).toBeDefined();
        expect(finding?.severity).toBe("warning");
        expect(finding?.scenario).toBe("the-setter");
        expect(finding?.message).toContain('"let-it-go"');
        expect(finding?.message).toContain("1 of 2 replies");
    });
    it("stays quiet when every branch comes back", () => {
        const defs = [setter(), reader("reader-a", "held-the-line"), reader("reader-b", "let-it-pass")];
        expect(packKindsOf(defs)).not.toContain("arc-branch-unread");
    });
    it("stays quiet when nothing reads the setter at all", () => {
        // Packs compose: writing the setter before its readers is not an offense,
        // which is why the inverse of flag-condition-never-set is not a rule.
        expect(packKindsOf([setter()])).not.toContain("arc-branch-unread");
    });
    it("counts a branch answered by the shipped corpus, not only by the batch", () => {
        const findings = auditScenarios([setter()], [], { readFlags: ["held-the-line", "let-it-pass"] });
        expect(findings.map((finding) => finding.kind)).not.toContain("arc-branch-unread");
    });
    it("still names the dead branch when only the corpus answers the other one", () => {
        const findings = auditScenarios([setter()], [], { readFlags: ["held-the-line"] });
        const finding = findings.find((entry) => entry.kind === "arc-branch-unread");
        expect(finding).toBeDefined();
        expect(finding?.message).toContain('"let-it-go"');
    });
});
// --- The rules the rendered loops surfaced ---------------------------------
describe("the locus and the ground it stands on", () => {
    // The bug, exactly as a player met it: a critical hostage week cast onto the
    // tensest nation on the board, pinned "home", and described as being held
    // under occupation. The map datelined Washington, D.C., so a week-one player
    // was told a foreign army held a district of their own capital.
    it("refuses a cast scenario pinned home whose descriptor stands on the counterpart's ground", () => {
        const def = cleanScenario({
            cast: { pick: "tensest" },
            locus: { site: "capital", ground: "home", descriptor: "the detention block at the capital's edge, held under occupation" },
        });
        expect(kindsOf(def)).toContain("locus-ground-mismatch");
    });
    it("names the counterpart token as the same defect", () => {
        const def = cleanScenario({
            locus: { site: "city", ground: "home", descriptor: "the market square where the {{counterpart}} convoy stopped" },
        });
        expect(kindsOf(def)).toContain("locus-ground-mismatch");
    });
    it("leaves a cast scenario genuinely at home alone", () => {
        const def = cleanScenario({
            locus: { site: "capital", ground: "home", descriptor: "the visa hall on our own embassy row, three streets from the gate" },
        });
        expect(kindsOf(def)).not.toContain("locus-ground-mismatch");
    });
    it("leaves the default alone, since an unset ground already resolves abroad", () => {
        const def = cleanScenario({ locus: { site: "capital", ground: "counterpart", descriptor: "the ministry block they hold under occupation" } });
        expect(kindsOf(def)).not.toContain("locus-ground-mismatch");
    });
    it("does not reach a domestic scenario, whose home ground is the only ground there is", () => {
        const def = cleanScenario({
            cast: { pick: "none" },
            transmission: undefined,
            locus: { site: "city", ground: "home", descriptor: "the district still under occupation from the last war" },
        });
        expect(kindsOf(def)).not.toContain("locus-ground-mismatch");
    });
});
describe("the playable charter's vocabulary", () => {
    it("refuses a no-confidence motion, which no President ever faces", () => {
        expect(kindsOf(scenarioSaying("The no-confidence motion is tabled for Thursday and the whips are counting."))).toContain("parliamentary-vocabulary");
    });
    it("refuses backbenchers, parliament, and a ministry of the player's own", () => {
        for (const line of [
            "Backbenchers have started briefing against the plan in the corridors outside.",
            "Parliament will not sit again before the money runs out at the end of the month.",
            "The finance ministry's fifth floor has been drafting an answer since Tuesday.",
        ]) {
            expect(kindsOf(scenarioSaying(line)), line).toContain("parliamentary-vocabulary");
        }
    });
    it("names the replacement rather than only the offense", () => {
        const finding = auditScenario(scenarioSaying("Parliament will not sit before the money runs out.")).find((entry) => entry.kind === "parliamentary-vocabulary");
        expect(finding?.message).toContain("Congress");
    });
    it("leaves the counterpart's own government its own words", () => {
        expect(kindsOf(scenarioSaying("Their foreign ministry will not answer before morning, and their minister is abroad."))).not.toContain("parliamentary-vocabulary");
        expect(kindsOf(scenarioSaying("The {{counterpart}} prime minister said as much on the record this morning."))).not.toContain("parliamentary-vocabulary");
    });
    it("exempts a transmission whole, since it is somebody else's document", () => {
        const def = cleanScenario({
            transmission: {
                relay: "cable",
                attribution: "their foreign ministry",
                text: "Our prime minister has instructed us to say that the fisheries question will not be reopened in this parliament, whatever your government now proposes to do about the boats.",
            },
        });
        expect(kindsOf(def)).not.toContain("parliamentary-vocabulary");
    });
});
describe("money against the volume dial", () => {
    const withImpact = (severity, financial) => {
        const def = cleanScenario({ severity });
        const [first, ...rest] = def.replies;
        const commitment = { ...first.commitment, impact: { financial } };
        return { ...def, replies: [{ ...first, commitment }, ...rest] };
    };
    it("refuses a routine week declaring an emergency appropriation", () => {
        expect(kindsOf(withImpact("routine", { scale: "emergency" }))).toContain("financial-scale-exceeds-severity");
    });
    it("refuses a structural claim on a serious week", () => {
        expect(kindsOf(withImpact("serious", { scale: "structural" }))).toContain("financial-scale-exceeds-severity");
    });
    it("lets a critical week declare anything", () => {
        expect(kindsOf(withImpact("critical", { scale: "structural", horizon: "permanent" }))).not.toContain("financial-scale-exceeds-severity");
    });
    it("lets a routine week ask for a supplemental, which is the tier's ceiling", () => {
        expect(kindsOf(withImpact("routine", { scale: "supplemental" }))).not.toContain("financial-scale-exceeds-severity");
    });
    it("refuses a permanent horizon in a routine week whatever the scale", () => {
        expect(kindsOf(withImpact("routine", { scale: "discretionary", horizon: "permanent" }))).toContain("financial-scale-exceeds-severity");
    });
});
describe("the rung and the sentence that commits it", () => {
    const withInstrument = (text, instrument, rung) => cleanScenario({
        replies: [
            cleanScenario().replies[1],
            { id: "commit", tone: "coercive", text, commitment: { kind: "instrument", instrument, rung } },
        ],
    });
    // The shipped defect: authored as diplomatic rung 3, which the engine calls
    // Recall Ambassador, and the Record said the ambassador had come home.
    it("refuses a reply that opens talks while committing the recall of an ambassador", () => {
        const findings = auditScenario(withInstrument("Open talks on the fisheries line and keep them running as long as they will sit.", "diplomatic", 3));
        const finding = findings.find((entry) => entry.kind === "instrument-reply-contradicts-rung");
        expect(finding?.severity).toBe("error");
        expect(finding?.message).toContain("Recall Ambassador");
    });
    it("accepts a reply that says what its own rung does", () => {
        expect(kindsOf(withInstrument("Call our ambassador home tonight and say plainly why the ambassador is coming.", "diplomatic", 3))).not.toContain("instrument-reply-contradicts-rung");
    });
    it("warns rather than refuses when a reply names no rung at all", () => {
        const findings = auditScenario(withInstrument("Do the thing we discussed this morning, and do it before the day is out.", "military", 4));
        const finding = findings.find((entry) => entry.kind === "instrument-reply-contradicts-rung");
        expect(finding?.severity).toBe("warning");
    });
    // The rung names come off the engine's own ladder rather than a copy here, so
    // a renamed rung updates the rule instead of drifting away from it.
    it("quotes the engine's live rung name", () => {
        const findings = auditScenario(withInstrument("Do what we discussed and do it quietly.", "military", 5));
        expect(findings.find((entry) => entry.kind === "instrument-reply-contradicts-rung")?.message).toContain(committedRungName("military", 5));
    });
});
describe("the papers on the loudest week", () => {
    it("warns when a critical week's expensive door prints nothing", () => {
        expect(kindsOf(cleanScenario({ severity: "critical" }))).toContain("press-missing-on-heavy-reply");
    });
    it("stays quiet once any reply in the set carries a headline", () => {
        const def = cleanScenario({ severity: "critical" });
        const replies = [{ ...def.replies[0], press: "Government holds the frontier and says so before dusk" }, def.replies[1]];
        expect(kindsOf({ ...def, replies })).not.toContain("press-missing-on-heavy-reply");
    });
    it("does not reach a routine or serious week, where the reference set itself often prints nothing", () => {
        expect(kindsOf(cleanScenario({ severity: "serious" }))).not.toContain("press-missing-on-heavy-reply");
        expect(kindsOf(cleanScenario({ severity: "routine" }))).not.toContain("press-missing-on-heavy-reply");
    });
});
describe("the chair the player appointed", () => {
    const batch = (count, gated) => Array.from({ length: count }, (_, index) => cleanScenario({
        id: `batch-${index}`,
        conditions: index < gated ? [{ kind: "cabinetAttribute", roleHint: "finance", attribute: "integrity", atMost: 0.4 }] : [],
    }));
    it("warns when a whole batch reads nothing off the cabinet", () => {
        expect(packKindsOf(batch(10, 0))).toContain("cabinet-gate-unused");
    });
    it("is satisfied by one scenario in ten", () => {
        expect(packKindsOf(batch(10, 1))).not.toContain("cabinet-gate-unused");
    });
    it("says nothing about a batch too small for a share to mean anything", () => {
        expect(packKindsOf(batch(4, 0))).not.toContain("cabinet-gate-unused");
    });
});
describe("unplaced domestic plant and strike copy", () => {
    it("rejects a domestic economy week that talks about a plant with no city, state, or sector", () => {
        const def = cleanScenario({
            class: "economy",
            cast: { pick: "none" },
            locus: { site: "interior", ground: "counterpart", descriptor: "the plant town where the subsidy pays half of every wage" },
            opening: [
                {
                    speaker: { kind: "narrator" },
                    text: `The plant has two thousand on the line and the rail spur has been unused since spring.${NEUTRAL_TAIL}`,
                },
            ],
        });
        const finding = auditScenario(def).find((entry) => entry.kind === "unplaced-domestic");
        expect(finding?.severity).toBe("error");
        expect(finding?.message).toMatch(/dataset city/);
    });
    it("rejects plant copy that only binds a state or a sector", () => {
        const opening = [
            {
                speaker: { kind: "narrator" },
                text: `The plant has two thousand on the line and the rail spur has been unused since spring.${NEUTRAL_TAIL}`,
            },
        ];
        const stateOnly = cleanScenario({
            class: "economy",
            cast: { pick: "none" },
            locus: { site: "interior", ground: "home", state: "PA", descriptor: "the plant town where the subsidy pays half of every wage" },
            opening,
        });
        const sectorOnly = cleanScenario({
            class: "economy",
            cast: { pick: "none" },
            locus: { site: "interior", ground: "counterpart", sector: "auto", descriptor: "the plant town where the subsidy pays half of every wage" },
            opening,
        });
        expect(kindsOf(stateOnly)).toContain("unplaced-domestic");
        expect(kindsOf(sectorOnly)).toContain("unplaced-domestic");
    });
    it("accepts the same copy once a named city and sector are bound", () => {
        const def = cleanScenario({
            class: "economy",
            cast: { pick: "none" },
            locus: {
                site: "interior",
                ground: "home",
                city: "CITY-USA-pittsburgh",
                state: "PA",
                sector: "steel-heavy",
                descriptor: "the plant yards in {{city}} where the subsidy pays half of every wage",
            },
            opening: [
                {
                    speaker: { kind: "narrator" },
                    text: `The plant in {{city}} has two thousand on the line and the rail spur has been unused since spring.${NEUTRAL_TAIL}`,
                },
            ],
        });
        expect(kindsOf(def)).not.toContain("unplaced-domestic");
        expect(kindsOf(def)).not.toContain("missing-city-token");
        expect(kindsOf(def)).not.toContain("unknown-city");
    });
    it("does not force a US state on a foreign compact plant", () => {
        const def = cleanScenario({
            class: "economy",
            cast: { pick: "closest" },
            locus: { site: "city", ground: "counterpart", descriptor: "the plant town where the subsidy pays half of every wage" },
        });
        expect(kindsOf(def)).not.toContain("unplaced-domestic");
    });
    it("rejects the industrial zone as a stand-in metro", () => {
        const def = cleanScenario({
            class: "economy",
            cast: { pick: "none" },
            locus: { site: "interior", ground: "counterpart", descriptor: "the industrial zone west of the river along the old mill spur" },
            opening: [
                {
                    speaker: { kind: "narrator" },
                    text: `The industrial zone west of the river still wants an answer this week.${NEUTRAL_TAIL}`,
                },
            ],
        });
        const findings = auditScenario(def);
        expect(findings.find((entry) => entry.kind === "unplaced-domestic")?.severity).toBe("error");
        expect(findings.find((entry) => entry.kind === "generic-place")?.severity).toBe("error");
    });
    it("still errors on industrial-zone phrasing when a city is already bound", () => {
        const def = cleanScenario({
            class: "economy",
            cast: { pick: "none" },
            locus: {
                site: "interior",
                ground: "home",
                city: "CITY-USA-pittsburgh",
                descriptor: "the mill yards in {{city}} west of the river along the old mill spur",
            },
            opening: [
                {
                    speaker: { kind: "narrator" },
                    text: `The industrial zone in {{city}} still wants an answer this week.${NEUTRAL_TAIL}`,
                },
            ],
        });
        const findings = auditScenario(def);
        expect(findings.find((entry) => entry.kind === "generic-place")?.severity).toBe("error");
        expect(findings.map((entry) => entry.kind)).not.toContain("unplaced-domestic");
    });
    it("rejects a city gazetteer recipe with no locus.city", () => {
        const def = cleanScenario({
            class: "economy",
            cast: { pick: "none" },
            locus: { site: "interior", ground: "home", state: "PA", descriptor: "the plant town where the subsidy pays half of every wage" },
            replies: [
                {
                    id: "hold-firm",
                    tone: "firm",
                    text: "Hold the line exactly where it is, and say so plainly before the day is out.",
                    commitment: {
                        kind: "position",
                        cost: { standing: -0.05, treasury: -60 },
                        gazetteer: { cityEmployment: 4000, taxHolidayYears: 10, adminLean: 0.05 },
                        remembered: "The line held where it was drawn, and the government said so out loud the same day.",
                        rejoinder: {
                            speaker: { kind: "narrator" },
                            text: "The port stayed open another day, which nobody in this room expected of it, and the harbor office has asked why we doubted them.",
                        },
                    },
                },
                {
                    id: "let-it-go",
                    tone: "conciliatory",
                    text: "Let this one pass without any comment, and see whether it happens a second time.",
                    commitment: {
                        kind: "position",
                        cost: { stability: -0.02 },
                        remembered: "It was let go without any comment at all, and nobody was asked to explain the silence.",
                        rejoinder: {
                            speaker: { kind: "cabinet", roleHint: "interior" },
                            text: "By evening two districts had answered without being asked to, and a third has written to say it will not be answering at all.",
                        },
                    },
                },
            ],
        });
        expect(kindsOf(def)).toContain("city-effect-unplaced");
    });
    it("rejects a bound domestic economy week that never writes {{city}}", () => {
        const def = cleanScenario({
            class: "economy",
            cast: { pick: "none" },
            locus: {
                site: "interior",
                ground: "home",
                city: "CITY-USA-pittsburgh",
                descriptor: "the mill yards along the river where the subsidy still pays",
            },
        });
        expect(kindsOf(def)).toContain("missing-city-token");
    });
    it("refuses a free-text Pittsburgh in a field week with no city bound to the map", () => {
        const def = cleanScenario({
            class: "economy",
            cast: { pick: "none" },
            locus: { site: "interior", ground: "counterpart", descriptor: "the mill yards along the river where the subsidy still pays" },
            opening: [
                {
                    speaker: { kind: "narrator" },
                    text: `The plant in Pittsburgh has two thousand on the line and the rail spur has been unused since spring.${NEUTRAL_TAIL}`,
                },
            ],
        });
        expect(kindsOf(def)).toContain("unplaced-city-name");
    });
    it("rejects a locus.city id that is not in the dataset", () => {
        const def = cleanScenario({
            class: "economy",
            cast: { pick: "none" },
            locus: {
                site: "interior",
                ground: "home",
                city: "CITY-USA-not-a-place",
                descriptor: "the mill yards in {{city}} where the subsidy pays half of every wage",
            },
            opening: [
                {
                    speaker: { kind: "narrator" },
                    text: `The plant in {{city}} has two thousand on the line and the rail spur has been unused since spring.${NEUTRAL_TAIL}`,
                },
            ],
        });
        const finding = auditScenario(def).find((entry) => entry.kind === "unknown-city");
        expect(finding?.severity).toBe("error");
        expect(finding?.message).toMatch(/CITY-USA-not-a-place/);
        expect(finding?.message).toMatch(/dataset/i);
    });
    it("accepts CITY-USA-pittsburgh on a domestic none week without unknown-city", () => {
        const def = cleanScenario({
            class: "economy",
            cast: { pick: "none" },
            locus: {
                site: "interior",
                ground: "home",
                city: "CITY-USA-pittsburgh",
                descriptor: "the mill yards in {{city}} where the subsidy pays half of every wage",
            },
            opening: [
                {
                    speaker: { kind: "narrator" },
                    text: `The plant in {{city}} has two thousand on the line and the rail spur has been unused since spring.${NEUTRAL_TAIL}`,
                },
            ],
        });
        expect(kindsOf(def)).not.toContain("unknown-city");
    });
    it("rejects a DEU city on a US domestic none week as a ground mismatch", () => {
        const def = cleanScenario({
            class: "economy",
            cast: { pick: "none" },
            locus: {
                site: "interior",
                ground: "counterpart",
                city: "CITY-DEU-berlin",
                descriptor: "the mill yards in {{city}} where the subsidy pays half of every wage",
            },
            opening: [
                {
                    speaker: { kind: "narrator" },
                    text: `The plant in {{city}} has two thousand on the line and the rail spur has been unused since spring.${NEUTRAL_TAIL}`,
                },
            ],
        });
        const finding = auditScenario(def).find((entry) => entry.kind === "unknown-city");
        expect(finding?.severity).toBe("error");
        expect(finding?.message).toMatch(/DEU/);
        expect(finding?.message).toMatch(/ground/);
    });
});
describe("an arc has one door in", () => {
    it("refuses a beat nothing opens, and accepts one whose opener ships beside it", () => {
        const beat = cleanScenario({ id: "arc-beat", family: { id: "strait", role: "beat" } });
        expect(packKindsOf([beat])).toContain("family-without-opener");
        const opener = cleanScenario({ id: "arc-opener", family: { id: "strait", role: "opener" } });
        expect(packKindsOf([opener, beat])).not.toContain("family-without-opener");
    });
    it("accepts a beat whose opener is already installed", () => {
        const beat = cleanScenario({ id: "arc-beat", family: { id: "strait", role: "beat" } });
        const findings = auditScenarios([beat], [], { familyOpeners: ["strait"] });
        expect(findings.map((finding) => finding.kind)).not.toContain("family-without-opener");
    });
    it("refuses a second opener for one family", () => {
        const first = cleanScenario({ id: "arc-a", family: { id: "strait", role: "opener" } });
        const second = cleanScenario({ id: "arc-b", family: { id: "strait", role: "opener" } });
        const finding = auditScenarios([first, second]).find((entry) => entry.kind === "family-two-openers");
        expect(finding?.severity).toBe("error");
        expect(finding?.scenario).toBe("arc-b");
    });
    it("leaves a standalone scenario alone", () => {
        expect(packKindsOf([cleanScenario()])).not.toContain("family-without-opener");
        expect(packKindsOf([cleanScenario()])).not.toContain("family-without-close");
    });
});
describe("an arc has a way out", () => {
    it("refuses an opener nothing closes, and accepts one whose close ships beside it or is installed", () => {
        const opener = cleanScenario({ id: "arc-opener", family: { id: "strait", role: "opener" } });
        const finding = auditScenarios([opener]).find((entry) => entry.kind === "family-without-close");
        expect(finding?.severity).toBe("error");
        expect(finding?.scenario).toBe("arc-opener");
        const close = cleanScenario({ id: "arc-close", family: { id: "strait", role: "close" } });
        expect(packKindsOf([opener, close])).not.toContain("family-without-close");
        const installed = auditScenarios([opener], [], { familyCloses: ["strait"] });
        expect(installed.map((entry) => entry.kind)).not.toContain("family-without-close");
    });
    it("parses a close only when every reply says how the arc ended, with both endings possible", () => {
        const base = cleanScenario({ id: "arc-close", family: { id: "strait", role: "close" } });
        const marked = (endings) => ({
            ...base,
            replies: base.replies.map((reply, index) => (endings[index] ? { ...reply, resolves: endings[index] } : reply)),
        });
        const both = base.replies.map((_, index) => (index === 0 ? "held" : "lost"));
        expect(ScenarioDef.safeParse(marked(both)).success).toBe(true);
        expect(ScenarioDef.safeParse(base).success).toBe(false);
        expect(ScenarioDef.safeParse(marked(base.replies.map(() => "held"))).success).toBe(false);
    });
    it("refuses an ending on a scenario that closes nothing", () => {
        const standalone = cleanScenario();
        const ending = { ...standalone, replies: standalone.replies.map((reply) => ({ ...reply, resolves: "held" })) };
        expect(ScenarioDef.safeParse(ending).success).toBe(false);
    });
});
describe("topic tags", () => {
    it("parses with no topics and no eraAssumption, the shape of every scenario shipped before this field existed", () => {
        const def = cleanScenario();
        expect(ScenarioDef.safeParse(def).success).toBe(true);
    });
    it("accepts a closed-vocabulary topic list", () => {
        const def = cleanScenario({ topics: ["trade", "fiscal"] });
        expect(ScenarioDef.safeParse(def).success).toBe(true);
    });
    it("refuses a topic outside the closed vocabulary at parse time", () => {
        const def = { ...cleanScenario(), topics: ["not-a-real-topic"] };
        expect(ScenarioDef.safeParse(def).success).toBe(false);
    });
    it("flags an unknown topic that reached a well-typed ScenarioDef anyway (topic-tag-unknown)", () => {
        // Cast past the enum the way scenario.js's own doc comment describes for
        // lead-speaker-addresses-self: content built or edited outside the type,
        // read back as ScenarioDef without being re-parsed.
        const def = { ...cleanScenario(), topics: ["not-a-real-topic"] };
        const finding = auditScenario(def).find((entry) => entry.kind === "topic-tag-unknown");
        expect(finding?.severity).toBe("error");
        expect(finding?.message).toMatch(/not-a-real-topic/);
    });
    it("does not flag a scenario with a valid topic list", () => {
        const def = cleanScenario({ topics: ["war", "diplomacy"] });
        expect(kindsOf(def)).not.toContain("topic-tag-unknown");
    });
    it("does not flag a scenario with no topics at all", () => {
        expect(kindsOf(cleanScenario())).not.toContain("topic-tag-unknown");
    });
});
describe("entity registry", () => {
    it("parses with no entities, the shape of every scenario shipped before this field existed", () => {
        const def = cleanScenario();
        expect(ScenarioDef.safeParse(def).success).toBe(true);
    });
    it("accepts a closed-registry entity list", () => {
        const def = cleanScenario({ entities: ["voss-shipyard", "restwell-cemetery"] });
        expect(ScenarioDef.safeParse(def).success).toBe(true);
    });
    it("refuses an entity id outside the closed registry at parse time", () => {
        const def = { ...cleanScenario(), entities: ["not-a-real-entity"] };
        expect(ScenarioDef.safeParse(def).success).toBe(false);
    });
    it("flags an unknown entity that reached a well-typed ScenarioDef anyway (unknown-entity)", () => {
        // Cast past the enum the way scenario.js's own doc comment describes for
        // lead-speaker-addresses-self: content built or edited outside the type,
        // read back as ScenarioDef without being re-parsed.
        const def = { ...cleanScenario(), entities: ["not-a-real-entity"] };
        const finding = auditScenario(def).find((entry) => entry.kind === "unknown-entity");
        expect(finding?.severity).toBe("error");
        expect(finding?.message).toMatch(/not-a-real-entity/);
    });
    it("does not flag a scenario with a valid entity list", () => {
        const def = cleanScenario({ entities: ["national-orchestra"] });
        expect(kindsOf(def)).not.toContain("unknown-entity");
    });
    it("does not flag a scenario with no entities at all", () => {
        expect(kindsOf(cleanScenario())).not.toContain("unknown-entity");
    });
});
describe("era assumption", () => {
    it("defaults to evergreen behavior when the field is absent", () => {
        expect(scenarioEra(cleanScenario())).toBe("evergreen");
    });
    it("reads an explicit eraAssumption back", () => {
        expect(scenarioEra(cleanScenario({ eraAssumption: "dated", staleAfter: "2027-01-01" }))).toBe("dated");
    });
    it("parses evergreen content with no staleAfter", () => {
        const def = cleanScenario({ eraAssumption: "evergreen" });
        expect(ScenarioDef.safeParse(def).success).toBe(true);
    });
    it("parses dated content that carries staleAfter", () => {
        const def = cleanScenario({ eraAssumption: "dated", staleAfter: "2027-01-01" });
        expect(ScenarioDef.safeParse(def).success).toBe(true);
    });
    it("refuses staleAfter on evergreen content", () => {
        const def = cleanScenario({ eraAssumption: "evergreen", staleAfter: "2027-01-01" });
        expect(ScenarioDef.safeParse(def).success).toBe(false);
    });
    it("refuses staleAfter with no eraAssumption at all", () => {
        const def = { ...cleanScenario(), staleAfter: "2027-01-01" };
        expect(ScenarioDef.safeParse(def).success).toBe(false);
    });
    it("refuses dated content with no staleAfter", () => {
        const def = cleanScenario({ eraAssumption: "dated" });
        expect(ScenarioDef.safeParse(def).success).toBe(false);
    });
});
