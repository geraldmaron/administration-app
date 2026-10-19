import { ScenarioDef } from "@admin/content";
import { doneItems, finishReview as finishAny, guardProvisional, personaTally as tallyAny, recordDefects as defectsFor, reviewJob as reviewAny, reviewSchemas, scaffoldReview as scaffoldAny, } from "../jobs/review-core.js";
import { validateScenarioDocument } from "./validate.js";
export { FULL_REVIEW_CEILING, reviewPathsFor, sampled, sampleRateFor, } from "../jobs/review-core.js";
// The scenario side of the review handshake. Everything that decides *how* a
// batch is reviewed — the tier split, the audit draw, the note floor, the
// provisional mark and the publish refusal that enforces it — is in the core;
// what a scenario supplies is what a scenario is: its schema, its id, its gate,
// and the protocol the reviewer reads. The command a self-reviewed batch will
// be refused by is named here because it is this group's command.
const PUBLISH_COMMAND = "studio corpus publish";
const REVIEW_COMMAND = "studio scenarios review";
const PROTOCOL = `# Review protocol

Every scenario below was journaled done by the publish gate. The gate proves shape and
world-neutrality; it cannot tell you whether the writing is good. That judgment is this file's job.

Each decision carries a tier, because a batch of thousands cannot honestly be read line by line:

- **flagged** — the gate raised a warning, or the corpus says it is a near-duplicate. Its reasons
  are in \`flags\`. You must decide these.
- **sampled** — the seeded audit share of everything else. You must decide these too. The draw is
  deterministic per (runId, scenarioId), so it cannot be rerolled for a friendlier set.
- **clean** — no warning, not sampled. Ships on the gate alone. Read them if you like; reject one
  and it stays out. Leaving them pending is not a defect.

For each decision you owe an answer on:

1. Read the scenario in full at its sourcePath — every opening beat, every reply, every
   remembered line. Skimming one reply and assuming the others match is how a bad one ships.
2. Judge: is the stake real and specific? Do replies genuinely diverge, or is one choice wearing
   two hats? Does each remembered line plausibly follow from its reply? If the scenario casts a
   counterpart, is the counterpart load-bearing in the replies, or decorative?
3. Set decision to "approve" or "reject", and write a note saying why — either way.

Then fill in reviewer (your identity string) and reviewerIsAuthor. Answer it honestly: true only
if this same session drafted the batch. Independence here is between sessions, not people — a
reviewer that did not write the draft has no stake in the draft surviving, and that is the whole
of what the second pass buys. A batch reviewed by its own author ships marked provisional and
\`studio corpus publish\` refuses it, because the corpus is what every later batch is judged
against. Run
\`studio scenarios review <jobId>\` again. It refuses to emit until every decision is made and
noted, re-runs the gate on every approved scenario's current content, and writes shipped.json.

If you are the owner and you are accepting a self-reviewed batch deliberately — because the pool
needs a floor before it can be judged at all, say — run
\`studio scenarios review <jobId> --owner-review "<why>"\`. That records who authorized it and
what they were weighing, on the batch, permanently. It does not clear the provisional mark: the
batch really was reviewed by the session that wrote it, and the corpus keeps saying so. What it
changes is whether that fact blocks the publish. Prefer it to \`--allow-provisional\`, which
opens the same door and writes down nothing.

`;
export const SCENARIO_REVIEW = {
    idKey: "scenarioId",
    noun: "scenario",
    manifestKey: "scenarios",
    def: ScenarioDef,
    idOf: (def) => def.id,
    protocol: PROTOCOL,
    gate: (file, defs, corpus) => {
        const result = validateScenarioDocument(file, defs, corpus?.scenarios, corpus?.scenarioFlags);
        return {
            ok: result.ok,
            shapeErrors: result.shapeErrors,
            findings: result.findings.map((finding) => ({
                id: finding.scenario,
                severity: finding.severity,
                message: finding.message,
                kind: finding.kind,
            })),
        };
    },
};
const schemas = reviewSchemas(SCENARIO_REVIEW.idKey);
export const ReviewDecision = schemas.Decision;
export const ReviewFile = schemas.File;
export async function doneScenarios(paths) {
    return await doneItems(SCENARIO_REVIEW, paths);
}
export async function scaffoldReview(jobId, paths, corpus) {
    return await scaffoldAny(SCENARIO_REVIEW, jobId, paths, corpus);
}
export function recordDefects(record, known) {
    return defectsFor(SCENARIO_REVIEW.idKey, record, known);
}
export function personaTally(decisions, approvedIds) {
    return tallyAny(SCENARIO_REVIEW.idKey, decisions, approvedIds);
}
export async function finishReview(jobId, paths, corpus) {
    return await finishAny(SCENARIO_REVIEW, jobId, paths, corpus);
}
export async function reviewJob(jobId, paths, ownerAuthorization, corpus) {
    return await reviewAny(SCENARIO_REVIEW, jobId, paths, PUBLISH_COMMAND, ownerAuthorization, corpus);
}
/** The publish gate's half of reviewer independence, named for this group's review command. */
export function guardScenarioPublish(jobId, provisional, args, ownerAuthorization) {
    return guardProvisional(jobId, provisional, args, REVIEW_COMMAND, ownerAuthorization);
}
