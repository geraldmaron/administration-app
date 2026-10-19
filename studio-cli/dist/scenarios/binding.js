import { z } from "zod";
import { needsClassPremise, ScenarioDef } from "@admin/content";
// The binding gate: whether a freshly drafted week is tied to the board it is
// dealt on, or floats free of it.
//
// This is a generation-only check and it lives here rather than in
// `@admin/content`'s audit for one reason: the audit runs over the published
// corpus and over every upgrade, and 41% of the shipped corpus gates on
// nothing. A rule that refuses that content refuses the upgrade pass whose job
// is to repair it, and the pass would then never brief the scenarios it was
// built for. So the standard binds what is being written now — `scenario-batch`
// in jobs/gate.ts — and the shipped pool is measured by the corpus audit and
// fixed by its own wave.
//
// THE MECHANISM SIDECAR. A priced metric owes the sentence that explains it,
// and that sentence is not player copy: printing "this reply moves standing
// because the room said so out loud" into a scenario would be the game
// narrating its own arithmetic, which rule 4 of the gate summary bans outright.
// It therefore rides as a `binding` object on each scenario in the driver's
// raw output, and it never ships: `ScenarioDef` is a non-strict `z.object`, so
// the same parse that every publish path already runs (`validateScenarioDocument`,
// `readScenarioDir`, `publishToCorpus`) drops the key on the floor. The gate
// reads the raw document *before* that parse, which is the only place the field
// still exists. No schema in `@admin/content` changes, no corpus row grows a
// field, and nothing downstream has to remember to strip anything.
/**
 * Short enough that a real sentence clears it, long enough that "budget" does
 * not. A mechanism that fits in a word is a label, not a mechanism.
 */
export const MECHANISM_FLOOR = 30;
/** One priced metric, and the sentence that says why the fiction moved it. */
export const MechanismNote = z.object({
    /** The reply id whose `commitment.cost` this explains. */
    reply: z.string().min(1),
    metric: z.enum(["treasury", "stability", "militaryReadiness", "standing"]),
    /** Completes "this reply moves <metric> because ___", in the scenario's own facts. */
    because: z.string().trim().min(MECHANISM_FLOOR),
});
export const BindingSidecar = z.object({
    /**
     * Retired: the durable `premise` field on the scenario states this once and
     * survives into the corpus, so a sidecar copy is refused and says where to
     * move it. Kept in the shape so the refusal can name it instead of the
     * sidecar failing as malformed.
     */
    universal: z.string().trim().min(40).optional(),
    mechanisms: z.array(MechanismNote).optional(),
});
/** The condition kinds that say *when* the game may deal a week, never *why it is this board's*. */
const CALENDAR_KINDS = new Set(["turn", "flag"]);
/**
 * A `turn` floor this low is satisfied within the first month of any campaign,
 * so it is a pacing note rather than a gate. Doctrine counts a scenario holding
 * only one of these as gating on nothing.
 */
const TRIVIAL_TURN_FLOOR = 5;
/**
 * How much of one document may be declared universal.
 *
 * Doctrine allows two or three such weeks in a batch of ten. Expressed as a
 * share so it holds for a cell of three as well as a cell of twelve, with a
 * floor of one so a single-scenario item can still be an honest universal week.
 */
const UNIVERSAL_SHARE = 0.3;
/** The smallest document the whole-batch calendar rule judges. */
const BATCH_FLOOR = 2;
function named(finding) {
    return `${finding.kind} (${finding.scenario}): ${finding.message}`;
}
/** The gate's channel is a list of reason strings; the kind leads each one so a refusal is greppable. */
export function bindingErrors(raw) {
    return bindingFindings(raw).map(named);
}
function boardConditions(conditions) {
    return conditions.filter((condition) => !CALENDAR_KINDS.has(condition.kind));
}
function gatesOnNothing(conditions) {
    if (conditions.length === 0)
        return true;
    return conditions.every((condition) => condition.kind === "turn" && (condition.atLeast ?? 0) <= TRIVIAL_TURN_FLOOR && condition.atMost === undefined);
}
function pricedMetrics(def) {
    return def.replies.flatMap((reply) => reply.commitment.kind === "position"
        ? Object.entries(reply.commitment.cost)
            .filter(([, value]) => typeof value === "number" && value !== 0)
            .map(([metric]) => ({ reply: reply.id, metric }))
        : []);
}
function sidecarOf(raw, id, findings) {
    if (raw.binding === undefined)
        return {};
    const parsed = BindingSidecar.safeParse(raw.binding);
    if (parsed.success)
        return parsed.data;
    findings.push({
        kind: "binding-sidecar-malformed",
        scenario: id,
        message: `"binding" does not parse — ${parsed.error.issues.map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`).join("; ")}`,
    });
    return {};
}
/**
 * Every way a drafted document fails the binding contract.
 *
 * Takes the raw document rather than parsed defs because the mechanism sidecar
 * only exists before the parse. A document that does not parse at all returns
 * nothing: the shape errors are the report in that case, and piling binding
 * findings on top of them buries the reason it was refused.
 */
export function bindingFindings(raw) {
    const document = Array.isArray(raw) ? raw : isRecord(raw) && Array.isArray(raw.scenarios) ? raw.scenarios : undefined;
    if (!document)
        return [];
    const findings = [];
    let read = 0;
    let universals = 0;
    let boardGated = 0;
    for (const entry of document) {
        if (!isRecord(entry))
            continue;
        const parsed = ScenarioDef.safeParse(entry);
        if (!parsed.success)
            continue;
        const def = parsed.data;
        read += 1;
        const sidecar = sidecarOf(entry, def.id, findings);
        const declaredUniversal = def.premise?.kind === "universal";
        const declaredPremise = def.premise !== undefined;
        if (declaredUniversal)
            universals += 1;
        if (sidecar.universal !== undefined) {
            findings.push({
                kind: "premise-in-sidecar",
                scenario: def.id,
                message: 'states the premise in binding.universal; state it once in the scenario\'s own "premise" field ({"kind":"universal","reason":...}), which the corpus keeps',
            });
        }
        if (boardConditions(def.conditions).length > 0)
            boardGated += 1;
        if (gatesOnNothing(def.conditions)) {
            if (!declaredPremise && sidecar.universal === undefined) {
                findings.push({
                    kind: "unbound-week",
                    scenario: def.id,
                    message: "no condition outside a low turn floor, and no declaration that this is deliberately a universal week. " +
                        "Gate it on the board, or say why it deals anywhere in the premise field.",
                });
            }
        }
        else if (declaredUniversal && !needsClassPremise(def)) {
            findings.push({
                kind: "undeclared-universal-week",
                scenario: def.id,
                message: 'declares a universal premise while carrying real conditions — a gated week is not a universal one (a state-dependent class that reads none of its state may still declare one)',
            });
        }
        if (def.topics === undefined || def.topics.length === 0) {
            findings.push({
                kind: "topics-missing",
                scenario: def.id,
                message: "carries no topics, so no coverage, upgrade or retire pass can ever find it",
            });
        }
        findings.push(...mechanismFindings(def, sidecar));
    }
    const ceiling = Math.max(1, Math.floor(read * UNIVERSAL_SHARE));
    if (universals > ceiling) {
        findings.push({
            kind: "universal-week-overused",
            scenario: "(document)",
            message: `${universals} of ${read} scenarios declare themselves universal weeks; at most ${ceiling} may`,
        });
    }
    // Counted over the weeks that are not declared universal. A cell whose every
    // scenario is an argued universal week has not gated on the clock — it has
    // said, and had accepted, that it should deal anywhere.
    // A batch of one is not a batch: a lone follow-up gated on the player's own earlier act (a flag) is not "gated on the clock",
    // and the rule would only push its author to bolt on a gate that is true on every board.
    if (read >= BATCH_FLOOR && read - universals > 0 && boardGated === 0) {
        findings.push({
            kind: "calendar-gated-batch",
            scenario: "(document)",
            message: "not one scenario here gates on anything but turn and flag. A batch gated on the clock is not gated on the board — " +
                "reach for metric, alignment, relationship, institutionState, oversightMatter, shutdown, appropriation or pendingRule",
        });
    }
    return findings;
}
function mechanismFindings(def, sidecar) {
    const priced = pricedMetrics(def);
    const notes = sidecar.mechanisms ?? [];
    const findings = [];
    for (const { reply, metric } of priced) {
        if (notes.some((note) => note.reply === reply && note.metric === metric))
            continue;
        findings.push({
            kind: "mechanism-missing",
            scenario: def.id,
            message: `reply "${reply}" prices ${metric} and nothing says why — complete "this reply moves ${metric} because ___" in binding.mechanisms`,
        });
    }
    for (const note of notes) {
        if (priced.some((entry) => entry.reply === note.reply && entry.metric === note.metric))
            continue;
        findings.push({
            kind: "mechanism-orphaned",
            scenario: def.id,
            message: `binding.mechanisms explains ${note.metric} on reply "${note.reply}", which prices no such metric`,
        });
    }
    return findings;
}
function isRecord(value) {
    return typeof value === "object" && value !== null;
}
