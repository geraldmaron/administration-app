import { describe, expect, it } from "vitest";
import { CABINET_GATE_SHARE_FLOOR, CHARTER_INSTITUTIONS, CORE_SCENARIOS, corePack, INSTRUMENT_RUNG_NAMES, LENGTH_CEILINGS, NEWS_ORGANIZATIONS, REVEALED_PREFERENCE_EVIDENCE_FLOOR, SEVERITY_SCALE_CEILING, } from "@admin/content";
import { buildScenarioBrief, scenarioJob } from "./brief.js";
import { validateScenarioDocument } from "./validate.js";
describe("the generation brief", () => {
    const brief = buildScenarioBrief({ class: "espionage", severity: "serious", cast: "tensest", steer: "a defector with a suitcase", count: 3 });
    it("embeds the gates, the craft rules, and the shipped exemplars in full", () => {
        // The bar is the approved reference set, not the bundled pack — those were
        // written before the impact bands existed and teaching them would teach the
        // corpus we are replacing.
        expect(brief).toContain("the-strike-that-hit-the-second-building");
        // The two written to teach binding: a cast week with a transmission and a
        // relationship move, and an ordinary week bound to the funding clock.
        expect(brief).toContain("the-berth-they-will-not-open");
        expect(brief).toContain("the-yards-and-the-money-that-runs-out");
        expect(brief).toContain("At least two replies");
        expect(brief).toContain("American English");
        // A writer who is never shown the vocabulary declares no impact, which is
        // how a corpus of three hundred came to price nothing at all.
        expect(brief).toContain("IMPACT — what the decision did to people and to money");
        expect(brief).toContain('Any toll above "none" MUST declare "agency"');
        expect(brief).toContain("a defector with a suitcase");
    });
    // A generator held to a stale gate list writes batches the validator then
    // rejects — on the unattended path that is money spent on content that was
    // never going to publish. The brief quotes the audit's own constants, and
    // this is what keeps that true.
    it("teaches the world-neutrality gates the validator actually enforces", () => {
        expect(brief).toContain("Name no real country");
        expect(brief).toContain("THE PLAYER IS THE PRESIDENT OF THE UNITED STATES");
        expect(brief).toContain(`subject ${LENGTH_CEILINGS.subject}`);
        expect(brief).toContain(NEWS_ORGANIZATIONS[0]);
        expect(brief).toContain(CHARTER_INSTITUTIONS[0]);
    });
    // The playable charter's vocabulary, in the one place a drafter reads before writing.
    // The corpus is being written by hands that will not infer "Secretary" from a
    // rule that only forbids "minister".
    it("teaches the playable charter's own words, and leaves the counterpart theirs", () => {
        expect(brief).toContain("THE PLAYER IS THE PRESIDENT OF THE UNITED STATES");
        expect(brief).toContain("the Secretary of Defense");
        expect(brief).toContain("impeachment");
        expect(brief).toContain("parliamentary-vocabulary");
        expect(brief).toContain("THEIR government keeps its own words");
        expect(brief).not.toContain('write "the chair" or "the official" instead');
    });
    // A drafter with no route through a brief this long writes the fields in the
    // order the JSON prints them, which is how a subject comes to summarize a
    // context block written after the replies it was supposed to cause.
    it("gives a weaker hand a route through the document, with a skeleton to fill", () => {
        expect(brief).toContain("WRITE IN THIS ORDER");
        expect(brief).toContain("THE CONTEXT BLOCK, all five fields, before you write a single beat");
        expect(brief).toContain('"rejoinder": { "speaker": { "kind": "narrator" }, "text": "..." }');
        for (const step of ["THE SUBJECT", "THE OPENING BEATS", "THE TRANSMISSION", "THE REPLIES", "THE REMEMBERED LINE", "THE PRESS HEADLINE"]) {
            expect(brief, step).toContain(step);
        }
    });
    it("says what a position reply can and cannot reach, so spread is written and not promised", () => {
        expect(brief).toContain("RIPPLES IN THE FICTION");
        expect(brief).toContain("SPREAD LIVES IN THE FICTION, NOT IN THE NUMBERS");
        expect(brief).toContain("the board shows a position reply ONE line");
    });
    it("asks a batch to bind one week to the cabinet the player assembled", () => {
        expect(brief).toContain("BIND THE CABINET");
        expect(brief).toContain("cabinet-gate-unused");
        expect(brief).toContain(`${Math.round(CABINET_GATE_SHARE_FLOOR * 100)}%`);
    });
    it("states the plain-words procedure rather than asking for plain words", () => {
        expect(brief).toContain("PLAIN WORDS");
        expect(brief).toContain("EXPAND EVERY TERM OF ART IN THE SENTENCE THAT USES IT");
        expect(brief).toContain("ONE IDEA PER SENTENCE");
        expect(brief).toContain("THE REFERENCE POINT BEFORE THE CHANGE");
    });
    // Each of these quotes a constant the validator reads, so a threshold moved
    // in the audit and not here is a gate list that lies to the generator.
    it("quotes the new gates' live constants rather than a remembered copy", () => {
        expect(brief).toContain(`routine at most "${SEVERITY_SCALE_CEILING.routine}"`);
        expect(brief).toContain(`"${SEVERITY_SCALE_CEILING.serious}", critical anything`);
        expect(brief).toContain("financial-scale-exceeds-severity");
        expect(brief).toContain("instrument-reply-contradicts-rung");
        expect(brief).toContain("press-missing-on-heavy-reply");
        expect(brief).toContain("locus-ground-mismatch");
        // The ladders are printed in the engine's own words, so a renamed rung
        // reaches the writer on the same edit it reaches the player.
        expect(brief).toContain(INSTRUMENT_RUNG_NAMES.diplomatic[2]);
        expect(brief).toContain(INSTRUMENT_RUNG_NAMES.military[4]);
    });
    // The brief is the only place a generator learns a schema surface exists.
    // A boost source the validator warns about and the brief never mentions is a
    // finding every batch comes back carrying.
    it("teaches the ripening boost and where the corpus's flag vocabulary lives", () => {
        expect(brief).toContain('"source": "flagAge"');
        expect(brief).toContain("callback-never-ripens");
        expect(brief).toContain("content/corpus/flags.jsonl");
    });
    // The three doctrines are prose rather than gates, which is exactly why they
    // need a test that is not the full-text snapshot: a snapshot update accepts
    // whatever it is handed, and a doctrine silently dropped from the brief is a
    // corpus that quietly stops doing the thing.
    it("teaches the quoted callback with a worked example on both halves", () => {
        expect(brief).toContain("QUOTE THE PLAYER BACK");
        expect(brief).toContain("Regret attaches to sentences");
        // The example is only worth anything if it shows the flag on both sides.
        expect(brief).toContain('"sets": ["paid-for-the-crew"]');
        expect(brief).toContain('"flag": "paid-for-the-crew", "is": true');
        expect(brief).toContain("Quote only a flag that exactly one reply stamps");
    });
    it("teaches the announced fuse, and that it burns in turns rather than hours", () => {
        expect(brief).toContain("ANNOUNCE THE FUSE");
        expect(brief).toContain("THE FUSE BURNS IN TURNS AND IN NOTHING ELSE");
        expect(brief).toContain("nothing that rewards returning quickly or punishes staying away");
    });
    it("names all eight dilemma types, and forbids naming any of them to a player", () => {
        for (const type of ["DIRTY HANDS", "SACRED TRADE", "FOOT IN THE DOOR", "LOYALTY TEST", "LEGIBILITY BET", "TIME TRADE", "CREDULITY BET", "MIRROR"]) {
            expect(brief, type).toContain(type);
        }
        expect(brief).toContain("LOAD-BEARING, NEVER LABELED");
        expect(brief).toContain("One type per scenario");
        expect(brief).toContain("no two of them may instantiate the same type");
    });
    it("teaches the condition that gates on the player's own record", () => {
        expect(brief).toContain('"kind": "revealedPreference"');
        expect(brief).toContain("concedesUnderPressure");
        expect(brief).toContain(`at least ${REVEALED_PREFERENCE_EVIDENCE_FLOOR} times`);
    });
    // A routine brief must not be handed the spread instruction: routine weeks
    // are the connective tissue, and demanding eight structures across them is
    // how a brief manufactures drama the tier is defined by not having.
    it("asks a serious batch for a spread and lets a routine one alone", () => {
        const routine = buildScenarioBrief({ class: "economy", severity: "routine", cast: "none", count: 4 });
        expect(routine).not.toContain("no two of them may instantiate the same type");
        expect(routine).toContain("A routine week is not required to carry a type");
    });
    // The arc cell is a change to what a cell *is*, so the test is that the shape
    // is stated, that the two rules an arc can silently break are printed, and
    // that an ordinary cell is untouched by any of it.
    describe("an arc cell", () => {
        const arc = buildScenarioBrief({ class: "scandal", severity: "serious", cast: "none", count: 3, arc: true });
        it("asks for a chain, and says how many readers that is", () => {
            expect(arc).toContain("THIS CELL IS ONE ARC, NOT 3 SEPARATE WEEKS");
            expect(arc).toContain("Write one SETTER and 2 READER(S)");
        });
        // The count is a bijection, not a suggestion: one reader per setter reply.
        // Left unstated, a writer reaches for the corpus-normal three replies in a
        // three-scenario cell and ships a door that opens onto nothing — which is
        // what happened the first time this cell was actually used.
        it("binds the setter's reply count to the number of readers", () => {
            expect(arc).toContain("it has exactly");
            expect(arc).toContain("2 REPLIES");
            expect(arc).toContain("A setter with more replies than this cell has readers ships a");
            const four = buildScenarioBrief({ class: "scandal", severity: "serious", cast: "none", count: 4, arc: true });
            expect(four).toContain("3 REPLIES");
            expect(four).toContain("Write one SETTER and 3 READER(S)");
        });
        it("prints the reader's gate and its boost as copyable shapes", () => {
            expect(arc).toContain('"agedAtLeast": <4 to 10>');
            expect(arc).toContain('"boosts": [{ "source": "flagAge", "factor": 1 }]');
        });
        // The two failures an arc produces that no earlier rule could catch: a
        // reader written as an epilogue, and every reader hanging off one branch.
        it("names the epilogue trap and the single-branch trap", () => {
            expect(arc).toContain("A READER IS A WEEK, NOT AN EPILOGUE");
            expect(arc).toContain("SPREAD THE READERS ACROSS DIFFERENT REPLIES");
            expect(arc).toContain("arc-branch-unread");
        });
        // Rule 4 lets a reader land on another desk, which flatly contradicts the
        // class contract as it is worded for an ordinary cell. The contract is
        // restated for arcs rather than left for a writer to reconcile.
        it("scopes the class contract to the setter so rule 4 is not a contradiction", () => {
            expect(arc).toContain("The SETTER must actually be that");
            expect(arc).not.toContain("Every scenario in this batch must actually be that");
        });
        // An arc spans four to ten turns, so holding every scenario in it to the
        // cell's tier is both worse content and a `severity-monotone` warning on
        // every arc batch — which is how a reviewer learns to stop reading warnings.
        it("lets the readers carry their own tier while the setter keeps the cell's", () => {
            expect(arc).toContain("The SETTER of this arc is severity");
            expect(arc).toContain("An arc that starts routine and ends critical");
            expect(arc).not.toContain("Every scenario in this batch is severity");
        });
        it("leaves an ordinary cell with no arc section at all", () => {
            expect(brief).not.toContain("THIS CELL IS ONE ARC");
            expect(brief).toContain("Every scenario in this batch must actually be that");
            expect(brief).toContain("Every scenario in this batch is severity");
        });
    });
    it("packs a batch as a resumable job the existing runner executes", () => {
        const job = scenarioJob("scn-espionage-1", "mock", [
            { class: "espionage", severity: "serious", cast: "tensest", count: 2 },
            { class: "hostage", severity: "critical", cast: "closest", count: 2 },
        ]);
        expect(job.kind).toBe("scenario-batch");
        expect(job.items).toHaveLength(2);
        expect(job.items[0].payload.prompt).toContain("espionage");
    });
});
// Rule 26 has always asked a batch to answer an older deed and always pointed
// at a file to find one. A measured batch put 25 of 31 callbacks on the 12
// flags quoted inline and 2 on the several hundred in that file, so the deeds
// are now offered in the brief itself.
describe("the deeds a brief offers", () => {
    const deeds = [
        { flag: "sealed-the-improper-surveillance", scenario: "the-improper-surveillance", class: "justice" },
        { flag: "protected-the-judge", scenario: "the-judge-under-pressure", class: "justice" },
        { flag: "named-the-shootdown", scenario: "the-shootdown", class: "foreign-crisis" },
        { flag: "held-the-levee-line", scenario: "the-levee", class: "disaster" },
    ];
    const cell = { class: "justice", severity: "serious", cast: "none", count: 3 };
    it("names the deed and the scenario that stamped it, because a flag id alone is not writable", () => {
        const brief = buildScenarioBrief({ ...cell, deeds });
        expect(brief).toContain("sealed-the-improper-surveillance");
        expect(brief).toContain('stamped by "the-improper-surveillance"');
    });
    it("puts the batch's own class first, since a week most plausibly follows another at the same desk", () => {
        const brief = buildScenarioBrief({ ...cell, deeds });
        const section = brief.slice(brief.indexOf("DEEDS THE CORPUS ALREADY REMEMBERS"));
        expect(section.indexOf("protected-the-judge")).toBeLessThan(section.indexOf("named-the-shootdown"));
    });
    it("is byte-identical on a rebuild, or the snapshots that pin the brief are worthless", () => {
        expect(buildScenarioBrief({ ...cell, deeds })).toBe(buildScenarioBrief({ ...cell, deeds }));
    });
    it("prints nothing at all when there is no corpus behind the brief", () => {
        expect(buildScenarioBrief(cell)).not.toContain("DEEDS THE CORPUS ALREADY REMEMBERS");
        expect(buildScenarioBrief({ ...cell, deeds: [] })).not.toContain("DEEDS THE CORPUS ALREADY REMEMBERS");
    });
    it("reaches the job file, so a generated batch actually carries them", () => {
        const job = scenarioJob("deed-job", "session", [cell], undefined, deeds);
        expect(String(job.items[0].payload.prompt)).toContain("sealed-the-improper-surveillance");
    });
});
describe("the publish gate", () => {
    // Pinned known defect: The shipped core pack fails the publish gate on family-without-close
    // errors: arcs open with no close member.
    it.fails("passes the shipped core pack byte-for-byte", () => {
        const result = validateScenarioDocument("core.json", JSON.parse(JSON.stringify(corePack)));
        expect(result.ok).toBe(true);
        expect(result.scenarios).toBe(CORE_SCENARIOS.length);
    });
    it("fails a malformed document on shape, before the audit runs", () => {
        const result = validateScenarioDocument("bad.json", { id: "x", version: 1, scenarios: [{ id: "no-fields" }] });
        expect(result.ok).toBe(false);
        expect(result.shapeErrors.length).toBeGreaterThan(0);
    });
    // A generator that answers with the shape but not the writing must not reach
    // the audit: the audit measures register, neutrality and overlap, and a
    // two-word beat passes every one of them for the wrong reason. The floor
    // stops it a layer earlier, at shape, where an absent field belongs.
    it("fails a stub that has every field and no writing in any of them", () => {
        const stub = JSON.parse(JSON.stringify(corePack));
        stub.scenarios[0].opening[0].text = "It happened.";
        stub.scenarios[0].replies[0].text = "Yes.";
        const result = validateScenarioDocument("stub.json", stub);
        expect(result.ok).toBe(false);
        expect(result.shapeErrors.length).toBeGreaterThan(0);
        expect(result.findings).toEqual([]);
    });
    it("fails a well-shaped scenario that breaks a content gate", () => {
        const broken = JSON.parse(JSON.stringify(corePack));
        broken.scenarios[0].replies = broken.scenarios[0].replies.map((reply) => ({
            ...reply,
            tone: "firm",
        }));
        const result = validateScenarioDocument("single-tone.json", broken);
        expect(result.ok).toBe(false);
        expect(result.findings.map((finding) => finding.kind)).toContain("single-tone");
    });
    // The stat line a run prints. Carried on the result rather than as a
    // finding: it is a pool-scale number with no threshold behind it, and the
    // run reports it by merging the documents it read.
    it("carries what a document remembers beside its findings", () => {
        const result = validateScenarioDocument("core.json", JSON.parse(JSON.stringify(corePack)));
        expect(result.deeds.set.length).toBeGreaterThan(0);
        expect(result.deeds.read).toContain("paid-the-winter-wages");
    });
    it("reports no deeds for a document that never parsed", () => {
        const result = validateScenarioDocument("bad.json", { id: "x", version: 1, scenarios: [{ id: "no-fields" }] });
        expect(result.deeds.set).toEqual([]);
        expect(result.deeds.ratio).toBe(0);
    });
});
