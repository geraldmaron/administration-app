import { z } from "zod";
import { COUNTDOWN_PHRASES, commitTimePassages, phraseIn, timeFindingsIn } from "@admin/content";
import { referenceExemplars } from "./reference.js";
// The retime pass: the harness for rewriting a shipped scenario's
// commit-time copy in place. A scenario that flash-forwards past the week the
// player is in is briefed exactly the way an upgrade is — one existing
// scenario, one allowed change, a gate that refuses anything else that moved
// (see upgrade.ts's `RevisionKind` and `preservationFindings`). This file is
// the retime kind's half of that: which scenarios need it, what a drafter is
// shown, and the batch-wide repetition ceiling a rewrite run is held to.
/**
 * A scenario needs a retime pass when its commit-time copy — the fields on
 * screen the instant the player commits — carries an error-tier finding. This
 * mirrors the baseline's own corpus rows exactly: `scenario-audit-time-baseline.test.ts`
 * lists the same set, read from the bake rather than the live shards.
 */
export function needsRetime(def) {
    return timeFindingsIn(commitTimePassages(def)).some((finding) => finding.severity === "error");
}
/**
 * Scenarios worth a retime job, narrowed by class (`--shard`, matching the
 * corpus's own shard-per-class convention) so a batch can be drafted and
 * reviewed one class at a time and a reviewer has one shard's worth of prose
 * to compare repetition against.
 */
export function selectRetimeCandidates(defs, shard) {
    const scoped = shard === undefined ? defs : defs.filter((def) => def.class === shard);
    return scoped.filter(needsRetime);
}
export function flaggedFieldsOf(def) {
    return timeFindingsIn(commitTimePassages(def)).map(({ label, phrase, severity }) => ({ label, phrase, severity }));
}
// Quoted in full in every brief, because a retime that is told only "fix the
// flagged phrase" reaches for the shortest edit that clears the gate, and the
// events-time-4 challenge is exactly that convergence. The doctrine's own
// numbering is kept so a drafter can cross-reference `docs/CONTENT_DOCTRINE.md`.
const DOCTRINE_TIME_FRAMING = `DOCTRINE §10.1 — TIME AND TENSE

Some copy is on screen the moment the player commits, and at that moment nothing has happened
yet: the rejoinder, the remembered line (also the Record's line), the press headline, and the
inaction text (which becomes the narration and a wire item dated the week of silence). The next
Continue is at most a week away.

1. Commit-time copy stays inside the week the player is in. Say what is true tonight, by
   morning, or this week: the order goes out, the call is returned, the first cost shows up.
2. A forecast is fine when it is one. A speaker may say "it could take months," hedged, and
   given to a person rather than the narrator.
3. A precedent is fine when it is about an earlier case. "The last time this happened, it took
   years" names time that already ran out before this decision.
4. Anything that happens months on is a later scenario — gated on the flag this reply sets,
   aged with agedAtLeast, once the months have actually passed.
5. Remembered is the Record's line: it states the decision and its immediate act, never its
   aftermath.
6. A callback does not state its own age. Name what happened, not how long ago.`;
const RETIME_RULES = `RULES FOR THIS PASS

1. Commit-window truth: say what is true tonight, by morning or this week — the order goes out,
   the call is returned, the first cost shows up.
2. No prescribed phrases. Do not reach for "tonight" or "this week" as a formula; a batch-wide
   ceiling on repeated three-word runs holds the monoculture down, not a required word.
3. No countdown phrases ("by tonight," "by morning," "the clock is," etc.) in a routine or
   serious scenario — the gate refuses them outright.
4. A forecast belongs to a person and is hedged. The narrator never forecasts.
5. Remembered is the Record's line: the decision and its immediate act, never its aftermath.
6. Inaction is the price of silence this week — what the silence costs now, not later.
7. No new facts a later scenario must honor. Remove the claim; do not replace it with a
   different future.
8. An aftermath worth keeping belongs on the disposition sheet, not in the line.
9. American English and US units.
10. Nothing outside the flagged field changes. The rest of this scenario is shipped and
    reviewed; a typo outside the allowed fields is not this pass's to fix.`;
/**
 * The brief for one scenario's retime pass: what is flagged and why, the
 * doctrine and the rewrite rules in full, and the reference set as the bar —
 * the same exemplars `buildUpgradeBrief` quotes, so a rewritten reference set
 * (R0) is what every later retime brief shows.
 */
export function buildRetimeBrief(original) {
    const flagged = flaggedFieldsOf(original);
    return [
        "Retime one shipped scenario's commit-time copy for a political simulation game. Return the SAME",
        "ScenarioDef as a JSON object, with ONLY the flagged fields' text rewritten and NOTHING else changed.",
        "",
        "WHAT IS FLAGGED ON THIS SCENARIO",
        ...flagged.map((field) => `  - ${field.label}: "${field.phrase}" (${field.severity})`),
        "",
        "WHAT YOU MAY REWRITE — the text only, nothing else about the field or the reply it belongs to:",
        '  "context.inaction", each reply\'s "commitment.rejoinder.text", "commitment.remembered", and "press".',
        "",
        "WHAT MAY NOT CHANGE — checked field by field; a revision that moved anything else is refused,",
        "however much better the new version reads:",
        `  ${PRESERVED_KEYS_NOTE}`,
        "  A rejoinder's speaker does not change, only its text. Do not fix a typo outside the flagged",
        "  fields. This scenario was reviewed and shipped; you are retiming it, not rewriting it.",
        "",
        DOCTRINE_TIME_FRAMING,
        "",
        RETIME_RULES,
        "",
        "THE BAR — the approved reference set:",
        "",
        ...referenceExemplars().map((exemplar) => JSON.stringify(exemplar, null, 1)),
        "",
        "THE SCENARIO TO RETIME:",
        "",
        JSON.stringify(original, null, 1),
        "",
        "Return ONLY the JSON object. No commentary.",
    ].join("\n");
}
// Named once rather than imported from upgrade.ts's PRESERVED_KEYS array, so
// the brief reads as prose instead of a dumped identifier list — the gate is
// what actually enforces the list; this line only orients a drafter.
const PRESERVED_KEYS_NOTE = "id, class, severity, subject, cast, conditions, weight, boosts, family, opening, particulars, scene, " +
    "every reply's id, tone, text, sets, effects, cost and impact — everything but the four fields above.";
/**
 * One item per scenario, deliberately, same reasoning as `upgradeJob`: a
 * short batch must not drop a shipped scenario from the run, and the journal
 * names exactly which scenarios were retimed.
 */
export function retimeJob(id, driver, originals) {
    return {
        id,
        kind: "scenario-retime",
        driver,
        items: originals.map((original) => ({
            id: `${id}-${original.id}`,
            payload: { prompt: buildRetimeBrief(original), original: original },
        })),
    };
}
// --- The 3-gram ceiling (content-plan §8) -----------------------------------
// Function words a bare repeated 3-gram is usually made of ("and the
// government," "in the room"). A run that clears the ceiling despite being
// all function words is structural to the language, not a rewrite tic; the
// ceiling only cares about a run that carries at least one content word.
const STOPWORDS = new Set([
    "a", "an", "the", "and", "or", "but", "of", "to", "in", "on", "at", "by", "for", "with", "as",
    "is", "was", "were", "be", "been", "it", "its", "this", "that", "these", "those", "into", "than",
    "then", "has", "have", "had", "will", "would", "could", "should", "not", "no", "so", "if", "we",
    "our", "they", "their", "he", "she", "his", "her", "you", "your", "i", "my", "who", "which",
]);
function tokenize(text) {
    return text
        .toLowerCase()
        .replace(/\{\{[^}]*\}\}/g, " ")
        .split(/[^a-z']+/)
        .filter(Boolean);
}
/** Content-word 3-grams in one passage, unique — a repeated run inside one line counts once. */
export function passageTrigrams(text) {
    const words = tokenize(text);
    const grams = new Set();
    for (let index = 0; index + 3 <= words.length; index += 1) {
        const gram = words.slice(index, index + 3);
        if (gram.some((word) => !STOPWORDS.has(word)))
            grams.add(gram.join(" "));
    }
    return grams;
}
export const NgramBaseline = z.object({ totalPassages: z.number().int().nonnegative(), grams: z.record(z.string(), z.number().int().nonnegative()) });
/**
 * The corpus-wide 3-gram baseline over every commit-time passage: how many
 * passages carry each gram. Taken once, before any rewrite, and stored beside
 * the wave's evidence — the after figure is compared against the same
 * tokenizer over the same set of grams, never re-measured with a different one.
 */
export function measureNgramBaseline(defs) {
    const counts = new Map();
    let totalPassages = 0;
    for (const def of defs) {
        for (const passage of commitTimePassages(def)) {
            totalPassages += 1;
            for (const gram of passageTrigrams(passage.text))
                counts.set(gram, (counts.get(gram) ?? 0) + 1);
        }
    }
    return { totalPassages, grams: Object.fromEntries(counts) };
}
/** The commit-time fields a revision touched, by comparing every field's text. */
export function collectRetimeChanges(original, revised) {
    const before = new Map(commitTimePassages(original).map((passage) => [passage.label, passage.text]));
    const changes = [];
    for (const passage of commitTimePassages(revised)) {
        const prior = before.get(passage.label);
        if (prior !== undefined && prior !== passage.text) {
            changes.push({ scenarioId: original.id, label: passage.label, before: prior, after: passage.text });
        }
    }
    return changes;
}
const COMMIT_WINDOW_MARKERS = ["tonight", "this week", "overnight", "by morning", "the next morning", "within the week", "today"];
/** §8 rule 1: no 3-gram concentrates in the rewritten set past its own structural rate. */
function gramCeilingViolations(changes, baseline) {
    const rewrittenCounts = new Map();
    for (const change of changes) {
        for (const gram of passageTrigrams(change.after))
            rewrittenCounts.set(gram, (rewrittenCounts.get(gram) ?? 0) + 1);
    }
    const violations = [];
    for (const [gram, count] of rewrittenCounts) {
        const rate = (baseline.grams[gram] ?? 0) / Math.max(baseline.totalPassages, 1);
        const ceiling = Math.max(3, 2 * rate * changes.length);
        if (count > ceiling)
            violations.push({ rule: 1, message: `"${gram}" appears in ${count} rewritten lines, over its ${ceiling.toFixed(1)}-line ceiling` });
    }
    return violations;
}
/**
 * §8 rule 2: no 3-gram's whole-corpus passage count rises by more than 3.
 *
 * The rise a batch contributes is exactly (occurrences in the after text)
 * minus (occurrences in the before text), independent of the gram's starting
 * count in the baseline — so this reads only the batch's own before/after
 * text, not the baseline's counts.
 */
function corpusDeltaViolations(changes) {
    const delta = new Map();
    for (const change of changes) {
        for (const gram of passageTrigrams(change.before))
            delta.set(gram, (delta.get(gram) ?? 0) - 1);
        for (const gram of passageTrigrams(change.after))
            delta.set(gram, (delta.get(gram) ?? 0) + 1);
    }
    const violations = [];
    for (const [gram, rise] of delta) {
        if (rise > 3)
            violations.push({ rule: 2, message: `"${gram}" rises by ${rise} corpus-wide passages, over the ceiling of 3` });
    }
    return violations;
}
/** §8 rule 3: a commit-window marker in at most 10% of the rewritten lines. */
function markerViolations(changes) {
    if (changes.length === 0)
        return [];
    const violations = [];
    for (const marker of COMMIT_WINDOW_MARKERS) {
        const count = changes.filter((change) => phraseIn(change.after, [marker]) !== undefined).length;
        if (count / changes.length > 0.1) {
            violations.push({ rule: 3, message: `"${marker}" appears in ${count} of ${changes.length} rewritten lines, over the 10% ceiling` });
        }
    }
    return violations;
}
/** §8 rule 4, informational here (the gate already refuses it for routine and serious): critical scenarios that reached for a countdown phrase. */
export function criticalCountdownUses(changes, severityOf) {
    return changes
        .filter((change) => severityOf(change.scenarioId) === "critical")
        .map((change) => ({ change, phrase: phraseIn(change.after, COUNTDOWN_PHRASES) }))
        .filter((entry) => entry.phrase !== undefined)
        .map((entry) => `${entry.change.scenarioId} (${entry.change.label}): "${entry.phrase}"`);
}
/** The whole §8 ceiling, over one batch's changes against the wave's before-baseline. */
export function evaluateRetimeCeiling(changes, baseline) {
    return {
        violations: [...gramCeilingViolations(changes, baseline), ...corpusDeltaViolations(changes), ...markerViolations(changes)],
        changeCount: changes.length,
    };
}
