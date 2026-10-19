import { ConsequenceDef } from "@admin/content";
import { guardProvisional, reviewJob as reviewAny, reviewSchemas, } from "../jobs/review-core.js";
import { validateConsequenceDocument } from "./validate.js";
export { reviewPathsFor } from "../jobs/review-core.js";
// The aftermath side of the review handshake, and deliberately the scenario
// side's twin rather than its cousin: same record, same tiers, same audit draw,
// same provisional mark, same refusal at publish. What differs is the contract
// a reviewer is judging against, so what differs here is the protocol and the
// gate — and nothing else, because everything else is a property of reviewing.
const PUBLISH_COMMAND = "studio corpus consequences publish";
const REVIEW_COMMAND = "studio consequences review";
const PROTOCOL = `# Review protocol

Every consequence card below was journaled done by the publish gate. The gate proves shape, the
coverage rules, and the harm floor; it cannot tell you whether the writing lands. That judgment is
this file's job.

Each decision carries a tier, because a batch of thousands cannot honestly be read line by line:

- **flagged** — the gate raised a warning, or the corpus says it is a near-duplicate. Its reasons
  are in \`flags\`. You must decide these.
- **sampled** — the seeded audit share of everything else. You must decide these too. The draw is
  deterministic per (runId, consequenceId), so it cannot be rerolled for a friendlier set.
- **clean** — no warning, not sampled. Ships on the gate alone. Read them if you like; reject one
  and it stays out. Leaving them pending is not a defect.

For each decision you owe an answer on:

1. Read the card in full at its sourcePath — the body, its conditions, the flags it sets.
2. Judge: does the aftermath read as a consequence of the instrument and the rung, or would it
   sit equally well under any other cell? Does a failure cost something nameable, or does the
   prose reach for the cost? Is a condition doing real work, or is it decoration on a card that
   would fire anyway?
3. Set decision to "approve" or "reject", and write a note saying why — either way.

Then fill in reviewer (your identity string) and reviewerIsAuthor. Answer it honestly: true only
if this same session drafted the batch. Independence here is between sessions, not people — a
reviewer that did not write the draft has no stake in the draft surviving, and that is the whole
of what the second pass buys. A batch reviewed by its own author ships marked provisional and
\`studio corpus consequences publish\` refuses it, because the corpus is what every later batch is
judged against. Run
\`studio consequences review <jobId>\` again. It refuses to emit until every decision is made and
noted, re-runs the gate on every approved card's current content, and writes shipped.json.

If you are the owner and you are accepting a self-reviewed batch deliberately — because the pool
needs a floor before it can be judged at all, say — run
\`studio consequences review <jobId> --owner-review "<why>"\`. That records who authorized it and
what they were weighing, on the batch, permanently. It does not clear the provisional mark: the
batch really was reviewed by the session that wrote it, and the corpus keeps saying so. What it
changes is whether that fact blocks the publish. Prefer it to \`--allow-provisional\`, which
opens the same door and writes down nothing.

`;
export const CONSEQUENCE_REVIEW = {
    idKey: "consequenceId",
    noun: "consequence",
    manifestKey: "consequences",
    def: ConsequenceDef,
    idOf: (def) => def.id,
    protocol: PROTOCOL,
    gate: (file, defs, corpus) => {
        const result = validateConsequenceDocument(file, defs, corpus?.consequenceFlags, corpus?.consequences);
        return {
            ok: result.ok,
            shapeErrors: result.shapeErrors,
            findings: result.findings.map((finding) => ({ id: finding.consequence, severity: finding.severity, message: finding.message })),
        };
    },
};
const schemas = reviewSchemas(CONSEQUENCE_REVIEW.idKey);
export const ConsequenceReviewFile = schemas.File;
export async function reviewConsequenceJob(jobId, paths, ownerAuthorization, corpus) {
    return await reviewAny(CONSEQUENCE_REVIEW, jobId, paths, PUBLISH_COMMAND, ownerAuthorization, corpus);
}
/** The publish gate's half of reviewer independence, named for this group's review command. */
export function guardConsequencePublish(jobId, provisional, args, ownerAuthorization) {
    return guardProvisional(jobId, provisional, args, REVIEW_COMMAND, ownerAuthorization);
}
