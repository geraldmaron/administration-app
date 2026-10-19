import { describe, expect, it } from "vitest";
import { ScenarioDef } from "@admin/content";
import { referenceExemplars } from "./reference.js";
import { preservationFindings } from "./upgrade.js";
import {
  buildRetimeBrief,
  collectRetimeChanges,
  criticalCountdownUses,
  evaluateRetimeCeiling,
  flaggedFieldsOf,
  measureNgramBaseline,
  needsRetime,
  passageTrigrams,
  retimeJob,
  selectRetimeCandidates,
  type NgramBaseline,
  type RetimeChange,
} from "./retime.js";

// The reference set is the fixture, same as upgrade.test.ts: it is real,
// reviewed content already carrying context and impact, so a test that
// overrides one field at a time is testing the pass the corpus will actually
// run rather than a shape invented here.
function exemplar(): ScenarioDef {
  const [first] = referenceExemplars();
  if (!first) throw new Error("the reference set is empty — retime tests have no fixture");
  return first;
}

/** The exemplar's first position reply, whose commitment carries a rejoinder and a remembered line. */
function positionReplyId(def: ScenarioDef): string {
  const reply = def.replies.find((candidate) => candidate.commitment?.kind === "position");
  if (!reply) throw new Error("the exemplar carries no position reply — retime tests have no fixture for one");
  return reply.id;
}

/** A flash-forward long enough to clear every prose floor, so it only ever fails the time audit. */
const FLASH_FORWARD = "Eleven weeks later, the numbers finally came back clean, and nobody in the building was surprised by how long it took.";
const CLEAN_REWRITE = "By morning the duty officer had logged the call, and the first cost was already on the week's ledger.";

function withRejoinderText(def: ScenarioDef, replyId: string, text: string): ScenarioDef {
  return ScenarioDef.parse({
    ...def,
    replies: def.replies.map((reply) =>
      reply.id === replyId && reply.commitment?.kind === "position"
        ? { ...reply, commitment: { ...reply.commitment, rejoinder: { ...reply.commitment.rejoinder, text } } }
        : reply,
    ),
  });
}

/**
 * The exemplar with every commit-time field forced to a known-clean text —
 * not the exemplar as shipped, which may still carry the
 * very flash-forwards the retime pass exists to fix. Building a genuinely clean
 * fixture this way keeps these tests correct whether or not it has been rewritten.
 */
function withCleanCommitTime(def: ScenarioDef): ScenarioDef {
  return ScenarioDef.parse({
    ...def,
    ...(def.context ? { context: { ...def.context, inaction: CLEAN_REWRITE } } : {}),
    replies: def.replies.map((reply) => ({
      ...reply,
      ...(reply.press ? { press: CLEAN_REWRITE } : {}),
      commitment:
        reply.commitment.kind === "position"
          ? { ...reply.commitment, remembered: CLEAN_REWRITE, rejoinder: { ...reply.commitment.rejoinder, text: CLEAN_REWRITE } }
          : reply.commitment.rejoinder
            ? { ...reply.commitment, rejoinder: { ...reply.commitment.rejoinder, text: CLEAN_REWRITE } }
            : reply.commitment,
    })),
  });
}

describe("which scenarios need a retime pass", () => {
  it("wants a scenario whose commit-time copy carries an error-tier finding", () => {
    const flagged = withRejoinderText(exemplar(), positionReplyId(exemplar()), FLASH_FORWARD);
    expect(needsRetime(flagged)).toBe(true);
  });

  it("leaves a scenario with no error-tier finding alone", () => {
    expect(needsRetime(withCleanCommitTime(exemplar()))).toBe(false);
  });

  it("flaggedFieldsOf names the field and the phrase the audit caught", () => {
    const flagged = withRejoinderText(exemplar(), positionReplyId(exemplar()), FLASH_FORWARD);
    const fields = flaggedFieldsOf(flagged);
    expect(fields.some((field) => field.label.startsWith("rejoinder for") && field.phrase.toLowerCase().includes("weeks later"))).toBe(true);
  });
});

describe("selecting a batch", () => {
  const flagged = withRejoinderText(withCleanCommitTime(exemplar()), positionReplyId(exemplar()), FLASH_FORWARD);
  const other = { ...flagged, id: "other-class-scenario", class: flagged.class === "scandal" ? "justice" : "scandal" } as ScenarioDef;
  const clean = withCleanCommitTime(exemplar());

  it("selects only what is both flagged and, when a shard is given, in that class", () => {
    expect(selectRetimeCandidates([flagged, clean]).map((def) => def.id)).toEqual([flagged.id]);
    expect(selectRetimeCandidates([flagged, other], flagged.class).map((def) => def.id)).toEqual([flagged.id]);
  });

  it("selects nothing when no scenario in the shard is flagged", () => {
    expect(selectRetimeCandidates([clean], clean.class)).toEqual([]);
  });
});

describe("the retime brief", () => {
  const flagged = withRejoinderText(exemplar(), positionReplyId(exemplar()), FLASH_FORWARD);
  const brief = buildRetimeBrief(flagged);

  it("names the flagged field and its phrase", () => {
    expect(brief).toContain("weeks later");
  });

  it("quotes the doctrine and the rewrite rules in full, not just a summary", () => {
    expect(brief).toContain("DOCTRINE §10.1");
    expect(brief).toContain("RULES FOR THIS PASS");
    expect(brief).toContain("No countdown phrases");
  });

  it("shows the scenario to retime and the reference bar", () => {
    expect(brief).toContain(flagged.id);
    expect(brief).toContain("THE SCENARIO TO RETIME");
    expect(brief).toContain("THE BAR");
  });

  it("says a rejoinder's speaker does not move, only its text", () => {
    expect(brief).toContain("speaker does not change");
  });
});

describe("the retime job", () => {
  it("is one item per scenario, kind scenario-retime, carrying the original for the gate", () => {
    const flagged = withRejoinderText(exemplar(), positionReplyId(exemplar()), FLASH_FORWARD);
    const job = retimeJob("retime-test", "session", [flagged]);
    expect(job.kind).toBe("scenario-retime");
    expect(job.items).toHaveLength(1);
    expect(job.items[0]?.id).toBe(`retime-test-${flagged.id}`);
    expect(ScenarioDef.safeParse(job.items[0]?.payload.original).success).toBe(true);
  });
});

describe("the retime allowance, through preservationFindings", () => {
  const replyId = positionReplyId(exemplar());
  const original = withRejoinderText(exemplar(), replyId, FLASH_FORWARD);
  const revised = withRejoinderText(exemplar(), replyId, CLEAN_REWRITE);

  it("accepts a rejoinder's text changing and nothing else", () => {
    expect(preservationFindings(original, revised, "scenario-retime")).toEqual([]);
  });

  it("refuses a rejoinder's speaker moving, even alongside a correct text change", () => {
    const speakerMoved = ScenarioDef.parse({
      ...revised,
      replies: revised.replies.map((reply) =>
        reply.id === replyId && reply.commitment?.kind === "position"
          ? { ...reply, commitment: { ...reply.commitment, rejoinder: { ...reply.commitment.rejoinder, speaker: { kind: "narrator" } } } }
          : reply,
      ),
    });
    expect(preservationFindings(original, speakerMoved, "scenario-retime").join(" ")).toContain("changed outside its rejoinder");
  });

  it("refuses a top-level field moving, however unrelated to time", () => {
    const subjectMoved = ScenarioDef.parse({ ...revised, subject: `${revised.subject} Updated.` });
    expect(preservationFindings(original, subjectMoved, "scenario-retime").join(" ")).toContain('"subject" changed');
  });

  it("refuses context changing outside inaction", () => {
    const precedentMoved = ScenarioDef.parse({ ...revised, context: { ...revised.context, precedent: `${revised.context!.precedent} And more.` } });
    expect(preservationFindings(original, precedentMoved, "scenario-retime").join(" ")).toContain('"context" changed outside "inaction"');
  });

  it("accepts inaction changing on its own", () => {
    const inactionRewrite = ScenarioDef.parse({ ...original, context: { ...original.context, inaction: CLEAN_REWRITE } });
    expect(preservationFindings(original, inactionRewrite, "scenario-retime")).toEqual([]);
  });
});

describe("the regate allowance, through preservationFindings", () => {
  const original = exemplar();

  it("accepts boosts changing (conditions is on the same allowance) and refuses everything else", () => {
    const boosted = ScenarioDef.parse({ ...original, boosts: [{ source: "tension", factor: 1.1 }] });
    expect(preservationFindings(original, boosted, "scenario-regate")).toEqual([]);
  });

  it("refuses weight moving — a regate may not touch the draw odds, only the gate", () => {
    const weighted = ScenarioDef.parse({ ...original, weight: original.weight + 1 });
    expect(preservationFindings(original, weighted, "scenario-regate").join(" ")).toContain('"weight" changed');
  });

  it("refuses a reply's text moving — a regate touches no prose at all", () => {
    const replyId = positionReplyId(original);
    const textMoved = ScenarioDef.parse({
      ...original,
      replies: original.replies.map((reply) => (reply.id === replyId ? { ...reply, text: `${reply.text} Different now.` } : reply)),
    });
    expect(preservationFindings(original, textMoved, "scenario-regate").join(" ")).toContain("regate");
  });
});

describe("the bind allowance, through preservationFindings", () => {
  const original = exemplar();

  // The four a bind is for: the place now follows the thing, the cast is the
  // government bearing it, the gate names the kind, and a beat trades a
  // hard-coded state name for the token that renders the real one.
  it("accepts the locus, the cast, the gate and the beats moving together", () => {
    const bound = ScenarioDef.parse({
      ...original,
      cast: { pick: "stricken" },
      locus: { ...original.locus, ground: "home", bind: "condition" },
      conditions: [{ kind: "conditionActive", condition: "wildfire", atLeast: 0.3 }],
      opening: original.opening.map((beat, index) => (index === 0 ? { ...beat, text: `The fire above the reservoir in {{state}} is nine days old and the crews are asking what happens next. ${beat.text}` } : beat)),
    });
    expect(preservationFindings(original, bound, "scenario-bind")).toEqual([]);
  });

  it("refuses a reply moving — a bind re-points a week, it does not re-answer it", () => {
    const replyId = positionReplyId(original);
    const reanswered = ScenarioDef.parse({
      ...original,
      replies: original.replies.map((reply) => (reply.id === replyId ? { ...reply, text: `${reply.text} Different now.` } : reply)),
    });
    expect(preservationFindings(original, reanswered, "scenario-bind").join(" ")).toContain("changed outside its impact");
  });

  it("refuses the subject moving — the week is the same week", () => {
    const retitled = ScenarioDef.parse({ ...original, subject: "A different week entirely" });
    expect(preservationFindings(original, retitled, "scenario-bind").join(" ")).toContain('"subject" changed');
  });
});

describe("collecting what a retime actually changed", () => {
  it("names exactly the fields whose text differs", () => {
    const replyId = positionReplyId(exemplar());
    const original = withRejoinderText(exemplar(), replyId, FLASH_FORWARD);
    const revised = withRejoinderText(exemplar(), replyId, CLEAN_REWRITE);
    const changes = collectRetimeChanges(original, revised);
    expect(changes).toHaveLength(1);
    expect(changes[0]?.label).toBe(`rejoinder for "${replyId}"`);
    expect(changes[0]?.before).toBe(FLASH_FORWARD);
    expect(changes[0]?.after).toBe(CLEAN_REWRITE);
  });

  it("reports nothing when no field's text moved", () => {
    expect(collectRetimeChanges(exemplar(), exemplar())).toEqual([]);
  });
});

describe("passageTrigrams", () => {
  it("keeps a run that carries at least one content word", () => {
    expect(passageTrigrams("the duty officer logged")).toContain("duty officer logged");
  });

  it("drops a run made entirely of function words", () => {
    expect([...passageTrigrams("and of the to in")]).toEqual([]);
  });

  it("counts a repeated run once per passage", () => {
    expect(passageTrigrams("the report arrived, and the report mattered").size).toBeLessThan(
      "the report arrived, and the report mattered".split(" ").length,
    );
  });
});

describe("measureNgramBaseline", () => {
  it("counts a passage's commit-time gram once, over every scenario given", () => {
    const baseline = measureNgramBaseline([exemplar()]);
    expect(baseline.totalPassages).toBeGreaterThan(0);
    expect(Object.keys(baseline.grams).length).toBeGreaterThan(0);
  });
});

// Built independently of `evaluateRetimeCeiling`'s own implementation: a
// synthetic baseline and a synthetic set of changes, chosen so each rule's
// ceiling is crossed by construction rather than by anything the corpus
// actually contains.
describe("the §8 ceiling, on cases built to cross each rule", () => {
  const emptyBaseline: NgramBaseline = { totalPassages: 100, grams: {} };

  const changeOf = (scenarioId: string, after: string): RetimeChange => ({
    scenarioId,
    label: `rejoinder for "${scenarioId}"`,
    before: "the previous line said nothing of the kind at all",
    after,
  });

  it("rule 1: a phrase absent from the baseline concentrating across the rewritten batch", () => {
    // Ceiling is max(3, 2 * 0 * n) = 3 when the baseline never carried the gram.
    const changes = [1, 2, 3, 4].map((n) => changeOf(`s${n}`, "a wholly invented phrase repeats here"));
    const report = evaluateRetimeCeiling(changes, emptyBaseline);
    expect(report.violations.some((violation) => violation.rule === 1)).toBe(true);
  });

  it("does not flag a gram the baseline already carries at the same rate", () => {
    const baseline: NgramBaseline = { totalPassages: 4, grams: { "a wholly invented": 4 } };
    // rate = 4/4 = 1; ceiling = max(3, 2*1*2) = 4, and only 2 rewritten lines carry it.
    const changes = [1, 2].map((n) => changeOf(`s${n}`, "a wholly invented"));
    const report = evaluateRetimeCeiling(changes, baseline);
    expect(report.violations).toEqual([]);
  });

  it("rule 2: the corpus-wide count of a gram rising by more than 3", () => {
    const baseline: NgramBaseline = { totalPassages: 100, grams: {} };
    const changes = [1, 2, 3, 4, 5].map((n) => changeOf(`s${n}`, "brand new corpus phrase arrives"));
    const report = evaluateRetimeCeiling(changes, baseline);
    expect(report.violations.some((violation) => violation.rule === 2)).toBe(true);
  });

  it("rule 3: a commit-window marker over 10% of the rewritten lines", () => {
    const changes = [
      changeOf("s1", "Tonight the order goes out and the room is told."),
      changeOf("s2", "A wholly unrelated line about something else entirely."),
    ];
    const report = evaluateRetimeCeiling(changes, emptyBaseline);
    expect(report.violations.some((violation) => violation.rule === 3 && violation.message.includes("tonight"))).toBe(true);
  });

  it("clears all three rules on a small, varied, structural rewrite", () => {
    const changes = [changeOf("s1", "The duty officer logged the call and moved to the next line on the sheet.")];
    const report = evaluateRetimeCeiling(changes, emptyBaseline);
    expect(report.violations).toEqual([]);
  });
});

describe("criticalCountdownUses", () => {
  it("names a countdown phrase used in a critical scenario's rewritten text", () => {
    const changes: RetimeChange[] = [
      { scenarioId: "s1", label: 'rejoinder for "r1"', before: "before", after: "The clock is already running on this one." },
    ];
    const uses = criticalCountdownUses(changes, () => "critical");
    expect(uses).toHaveLength(1);
    expect(uses[0]).toContain("s1");
  });

  it("ignores a routine or serious scenario — the gate already refuses those outright", () => {
    const changes: RetimeChange[] = [
      { scenarioId: "s1", label: 'rejoinder for "r1"', before: "before", after: "The clock is already running on this one." },
    ];
    expect(criticalCountdownUses(changes, () => "serious")).toEqual([]);
  });
});
