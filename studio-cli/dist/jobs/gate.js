import { existsSync } from "node:fs";
import { z } from "zod";
import { COUNTDOWN_PHRASES, commitTimePassages, phraseIn, SCENE_STANDARD, ScenarioDef, TIME_FINDING_KINDS, timeFindingsIn } from "@admin/content";
import { shippedErrorKeys, validateScenarioDocument } from "../scenarios/validate.js";
import { bindingErrors } from "../scenarios/binding.js";
import { preservationFindings, upgradeCorpusContext } from "../scenarios/upgrade.js";
import { validateConsequenceDocument } from "../consequences/validate.js";
const ImageRecord = z.object({
    filePath: z.string().min(1),
    bytes: z.number().int().positive(),
    mimeType: z.string().min(1),
    model: z.string().min(1),
});
// Below this, an "image" is a placeholder, a solid color, or an error page.
const MIN_PLAUSIBLE_IMAGE_BYTES = 2_000;
function rejection({ shapeErrors, errors }) {
    const reasons = [...shapeErrors, ...errors].slice(0, 3).join("; ");
    return `rejected by the publish gate — ${shapeErrors.length + errors.length} defect(s): ${reasons}`;
}
// The binding contract is checked here and not inside `validateScenarioDocument`
// on purpose: that function is also what the upgrade pass and every corpus-wide
// audit run through, and the shipped pool it reads gates on nothing in 41% of
// cases. Refusing that content there would refuse the very pass built to repair
// it. New drafts are held to the standard; the pool is measured and fixed by its
// own wave. See scenarios/binding.ts.
const scenarioBatchGate = (item, output, corpus) => {
    const validation = validateScenarioDocument(item.id, output, corpus?.scenarios, corpus?.scenarioFlags);
    const binding = bindingErrors(output);
    if (validation.ok && binding.length === 0)
        return undefined;
    return rejection({
        shapeErrors: validation.shapeErrors,
        errors: [...validation.findings.filter((finding) => finding.severity === "error").map((finding) => finding.message), ...binding],
    });
};
// An upgrade is held to everything a fresh batch is held to, and then to the
// one thing a fresh batch has no version of: it must still be the scenario it
// started as. The scenario gate cannot see that — a beautifully rewritten
// scenario passes every rule it knows — so the original rides on the job item
// and the two are compared field by field.
const scenarioUpgradeGate = (item, output, corpus) => {
    const original = ScenarioDef.safeParse(item.payload.original);
    if (!original.success) {
        return `the job item carries no parseable original — an upgrade cannot be checked for preservation without one`;
    }
    const revised = ScenarioDef.safeParse(output);
    if (!revised.success) {
        return rejection({
            shapeErrors: revised.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`),
            errors: [],
        });
    }
    const moved = preservationFindings(original.data, revised.data);
    if (moved.length > 0)
        return rejection({ shapeErrors: [], errors: moved });
    // See `upgradeCorpusContext` for which two corpus indexes an upgrade is
    // judged without, and why a correct one fails both.
    const scenarios = upgradeCorpusContext(corpus?.scenarios);
    const validation = validateScenarioDocument(item.id, [revised.data], scenarios, corpus?.scenarioFlags);
    // Reachability is decided by `conditions` and `cast`, both of which an
    // upgrade is forbidden to touch, so a shipped scenario that reaches no board
    // fails this check no matter what is written for it — the pass would refuse
    // the same items forever and never brief them. It is a real defect and it
    // stays visible: the corpus-wide audit reports it on every run, and the fix
    // is a change to the gates the scenario waits on, which is its own pass.
    //
    // A flash-forward in a rejoinder, remembered or press line is the same case:
    // those fields are preserved, so the one the original shipped with is not the
    // revision's to fix. Only a flash-forward the revision introduced refuses it.
    const inherited = new Set(timeFindingsIn(commitTimePassages(original.data)).map((finding) => finding.message));
    const errors = validation.findings.filter((finding) => finding.severity === "error" &&
        finding.kind !== "unreachable-scenario" &&
        !(TIME_FINDING_KINDS.has(finding.kind) && inherited.has(finding.message)));
    if (validation.shapeErrors.length === 0 && errors.length === 0)
        return undefined;
    return rejection({ shapeErrors: validation.shapeErrors, errors: errors.map((finding) => finding.message) });
};
// The retime and regate gates: an upgrade held to one further thing — the
// text it was allowed to touch must actually be clean of the finding it was
// touched to fix, and must not have grown a new one anywhere else.
/** Every commit-time field's current text, by label ("context.inaction", `rejoinder for "id"`, …). */
function commitTimeFieldTexts(def) {
    return new Map(commitTimePassages(def).map((passage) => [passage.label, passage.text]));
}
/** The labels whose text actually differs between the original and the revision. */
function changedLabels(original, revised) {
    const before = commitTimeFieldTexts(original);
    const changed = new Set();
    for (const [label, text] of commitTimeFieldTexts(revised)) {
        if (before.get(label) !== text)
            changed.add(label);
    }
    return changed;
}
/**
 * Rule 2 of the retime gate: a field the revision changed must carry no time
 * finding at all afterward, and no field may gain a finding it did not
 * already carry — a revision that leaves the flagged phrase in place, or
 * trades it for a different one, has not retimed anything.
 */
function timeFindingViolations(original, revised) {
    const changed = changedLabels(original, revised);
    const inherited = new Set(timeFindingsIn(commitTimePassages(original)).map((finding) => `${finding.label}::${finding.phrase}`));
    const violations = [];
    for (const finding of timeFindingsIn(commitTimePassages(revised))) {
        if (changed.has(finding.label)) {
            violations.push(`"${finding.label}" still carries a time finding after the rewrite — ${finding.message}`);
        }
        else if (!inherited.has(`${finding.label}::${finding.phrase}`)) {
            violations.push(`"${finding.label}" gained a time finding the revision never touched — ${finding.message}`);
        }
    }
    return violations;
}
/** Rule 3 of the retime gate: no countdown phrase reached for in a routine or serious scenario's changed text. */
function countdownViolations(revised, changed) {
    if (revised.severity === "critical")
        return [];
    const violations = [];
    for (const [label, text] of commitTimeFieldTexts(revised)) {
        if (!changed.has(label))
            continue;
        const phrase = phraseIn(text, COUNTDOWN_PHRASES);
        if (phrase)
            violations.push(`"${label}" reaches for a countdown phrase ("${phrase}") in a ${revised.severity} scenario`);
    }
    return violations;
}
/**
 * The shared shape behind every revision gate: parse both sides, refuse
 * anything `preservationFindings` says moved outside the kind's allowance,
 * then run the standard document validator against the narrowed corpus every
 * revision is judged with (`upgradeCorpusContext`), because the opening and
 * particulars are preserved and the nearest thing to a revision in the corpus
 * is its own shipped self.
 *
 * `enforceReachability` is false for `scenario-retime`, which may not touch
 * `conditions` or `cast` and so cannot be blamed for where they leave it —
 * the same exemption `scenario-upgrade` gets. It is true for `scenario-regate`,
 * whose whole job is `conditions`, so a regate that leaves the scenario
 * unreachable is exactly the defect this gate exists to catch.
 */
/**
 * The original an arc revision is checked against, with the revision's own
 * endings copied onto its replies by id. A shipped close that says nothing
 * about how the arc ended no longer parses — which is the defect the revision
 * exists to fix — so without this the gate could never read the thing it is
 * preserving. Only `resolves` is copied, and the preservation contract strips
 * it anyway: every other field is still compared against the shipped text.
 */
function withEndingsFrom(original, output) {
    if (!original || typeof original !== "object" || !output || typeof output !== "object")
        return original;
    const endings = new Map();
    for (const reply of (output.replies ?? [])) {
        if (reply.id && reply.resolves !== undefined)
            endings.set(reply.id, reply.resolves);
    }
    const replies = (original.replies ?? []);
    return {
        ...original,
        replies: replies.map((reply) => (reply.id && endings.has(reply.id) ? { ...reply, resolves: endings.get(reply.id) } : reply)),
    };
}
function revisionGate(kind, enforceReachability, waived = new Set()) {
    return (item, output, corpus) => {
        const original = ScenarioDef.safeParse(kind === "scenario-arc" ? withEndingsFrom(item.payload.original, output) : item.payload.original);
        if (!original.success) {
            return `the job item carries no parseable original — a ${kind} cannot be checked for preservation without one`;
        }
        const revised = ScenarioDef.safeParse(output);
        if (!revised.success) {
            return rejection({ shapeErrors: revised.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`), errors: [] });
        }
        const moved = preservationFindings(original.data, revised.data, kind);
        if (moved.length > 0)
            return rejection({ shapeErrors: [], errors: moved });
        const changed = changedLabels(original.data, revised.data);
        const timeErrors = timeFindingViolations(original.data, revised.data);
        const countdownErrors = countdownViolations(revised.data, changed);
        const scenarios = upgradeCorpusContext(corpus?.scenarios);
        const validation = validateScenarioDocument(item.id, [revised.data], scenarios, corpus?.scenarioFlags);
        const inherited = new Set(timeFindingsIn(commitTimePassages(original.data)).map((finding) => finding.message));
        const shipped = shippedErrorKeys(item.id, original.data, scenarios, corpus?.scenarioFlags);
        const validationErrors = validation.findings.filter((finding) => finding.severity === "error" &&
            (enforceReachability || finding.kind !== "unreachable-scenario") &&
            !waived.has(finding.kind) &&
            !(TIME_FINDING_KINDS.has(finding.kind) && inherited.has(finding.message)) &&
            !shipped.has(`${finding.kind}|${finding.message}`));
        const errors = [...timeErrors, ...countdownErrors, ...validationErrors.map((finding) => finding.message)];
        if (validation.shapeErrors.length === 0 && errors.length === 0)
            return undefined;
        return rejection({ shapeErrors: validation.shapeErrors, errors });
    };
}
const scenarioRetimeGate = revisionGate("scenario-retime", false);
const scenarioRegateGate = revisionGate("scenario-regate", true);
// Reachability is enforced: a bind's whole job is the gate and the place, and one
// that leaves the week unreachable has re-pointed it at nothing.
const scenarioBindGate = revisionGate("scenario-bind", true);
// A rejoin may not touch conditions or cast, so where they leave the scenario is not its to answer.
const scenarioRejoinGate = revisionGate("scenario-rejoin", false);
// An arc revision is judged one scenario at a time, and a family is a pair:
// the opener's close and the close's opener are usually the next item in the
// same job. Whether the pair holds is the corpus-wide audit's to say after the
// revision is written back, where both halves are in the pool.
const scenarioArcGate = revisionGate("scenario-arc", true, new Set(["family-without-opener", "family-without-close"]));
// A full repair may move the board gate, prose, and command together. It is
// therefore held to the fresh-draft contract, with no inherited-error waiver.
// The shipped id/class/reply ids still have to match the original, and the
// reduced corpus context prevents only self-collision on that same id.
const scenarioRepairGate = (item, output, corpus) => {
    const original = ScenarioDef.safeParse(item.payload.original);
    const revised = ScenarioDef.safeParse(output);
    if (!original.success)
        return `the job item carries no parseable original — a repair needs its shipped body`;
    if (!revised.success)
        return rejection({ shapeErrors: revised.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`), errors: [] });
    const moved = preservationFindings(original.data, revised.data, "scenario-repair");
    const validation = validateScenarioDocument(item.id, [output], upgradeCorpusContext(corpus?.scenarios), corpus?.scenarioFlags);
    const errors = [
        ...moved,
        ...validation.findings.filter((finding) => finding.severity === "error").map((finding) => finding.message),
        ...bindingErrors([output]),
    ];
    if (validation.shapeErrors.length === 0 && errors.length === 0)
        return undefined;
    return rejection({ shapeErrors: validation.shapeErrors, errors });
};
const consequenceBatchGate = (item, output, corpus) => {
    const validation = validateConsequenceDocument(item.id, output, corpus?.consequenceFlags, corpus?.consequences);
    if (validation.ok)
        return undefined;
    return rejection({
        shapeErrors: validation.shapeErrors,
        errors: validation.findings.filter((finding) => finding.severity === "error").map((finding) => finding.message),
    });
};
// An image cannot be checked for craft the way prose can, so what this gate
// holds is the part that *is* checkable and that a bad batch fails on: the
// file exists, it is the format and weight the player ships, and the model
// returned something rather than a token-sized placeholder. Whether the image
// is any good is a human review step, not a gate.
function imageGate(output, standard) {
    const image = ImageRecord.safeParse(output);
    if (!image.success) {
        return rejection({ shapeErrors: image.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`), errors: [] });
    }
    const errors = [];
    if (image.data.mimeType !== `image/${standard.format}`) {
        errors.push(`expected ${standard.format}, got ${image.data.mimeType.replace("image/", "")}`);
    }
    if (image.data.bytes > standard.maxBytes) {
        errors.push(`${image.data.bytes} bytes exceeds the ${standard.maxBytes} byte ceiling`);
    }
    // A model that errors politely can still return a few hundred bytes of solid
    // color, which passes every other check here.
    if (image.data.bytes < MIN_PLAUSIBLE_IMAGE_BYTES) {
        errors.push(`${image.data.bytes} bytes is too small to be a real image`);
    }
    if (!existsSync(image.data.filePath)) {
        errors.push(`no file at ${image.data.filePath}`);
    }
    return errors.length > 0 ? rejection({ shapeErrors: [], errors }) : undefined;
}
// A dispatch photograph is held to its own standard of format and weight; the
// ways a paid batch comes back worthless are the same for every image.
const sceneBatchGate = (_item, output) => imageGate(output, { format: SCENE_STANDARD.format, maxBytes: SCENE_STANDARD.maxBytes });
const GATES = {
    "scenario-batch": scenarioBatchGate,
    "scenario-upgrade": scenarioUpgradeGate,
    "scenario-retime": scenarioRetimeGate,
    "scenario-regate": scenarioRegateGate,
    "scenario-bind": scenarioBindGate,
    "scenario-rejoin": scenarioRejoinGate,
    "scenario-arc": scenarioArcGate,
    "scenario-repair": scenarioRepairGate,
    "consequence-batch": consequenceBatchGate,
    "scene-batch": sceneBatchGate,
};
/** Every job kind that has a gate, which is every kind a job may be. */
export const GATED_JOB_KINDS = Object.keys(GATES);
/**
 * Apply the gate for a job kind to one driver result. A kind with no
 * registered gate fails closed: an unvalidated batch is never worth more than
 * no batch, and a new job kind should have to say how its output is checked.
 */
export function gateResult(kind, item, result, corpus) {
    if (result.status !== "done")
        return result;
    const gate = GATES[kind];
    if (!gate) {
        return { ...result, status: "failed", error: `job kind "${kind}" has no publish gate — nothing ships unvalidated` };
    }
    const rejected = gate(item, result.output, corpus);
    return rejected ? { ...result, status: "failed", error: rejected } : result;
}
