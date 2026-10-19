import { NearDuplicateIndex } from "./corpus/near-duplicate.js";
import type { Passage, PassageFindingKind } from "./passage-audit.js";
import type { ScenarioDef, ScenarioReply } from "./scenario.js";
import type { ExecutiveFindingKind } from "./scenario-oversight.js";
import type { GroundingFindingKind } from "./scenario-grounding.js";
import type { ReadoutFindingKind } from "./scenario-audit-readout.js";
import type { TimeFindingKind } from "./scenario-audit-time.js";
/**
 * The corpus a batch is landing in. Both halves are indexes rather than the
 * content itself, so validating a batch against a five-figure corpus costs the
 * batch's size, not the corpus's.
 */
export type CorpusContext = {
    /** Every id already shipped, so a batch cannot re-use one. */
    readonly installedIds?: Iterable<string>;
    /** The near-duplicate index of everything already shipped. */
    readonly overlapIndex?: NearDuplicateIndex;
    /**
     * Every flag the shipped corpus's conditions gate on. The read half of the
     * flag economy, mirroring the write half the gate already takes as
     * `knownFlags`: a batch's promise (a reply announcing a review) is kept if
     * anything reads the flag it stamps, and "anything" has to include the
     * corpus the batch is landing in, not just the batch itself.
     */
    readonly readFlags?: Iterable<string>;
    /**
     * Every family the shipped corpus already opens. An arc is normally written
     * across several batches, so an opener that shipped last month is a perfectly
     * good door for a beat shipping today — without this index the gate would
     * refuse every continuation of an existing arc.
     */
    readonly familyOpeners?: Iterable<string>;
    /**
     * Every family the shipped corpus already closes, for the same reason: an
     * opener shipping today may be answered by a close that shipped last month.
     */
    readonly familyCloses?: Iterable<string>;
    /**
     * Five-word runs the shipped corpus already carries, and how many scenarios
     * carry each. The third index, and the one that closes `stock-phrasing`'s
     * blind spot: the rule counts carriers within whatever set it is handed, so a
     * batch borrowing a phrase from the *corpus* was invisible to a batch gate
     * however carefully it was run.
     *
     * Only runs at or above `PHRASE_INDEX_FLOOR` carriers are worth shipping in
     * this index, which is what makes it an index rather than a copy of the
     * corpus — see that constant for the measurement and for the one case the
     * cut deliberately gives up.
     */
    readonly phraseCarriers?: Iterable<readonly [string, number]>;
};
export type ScenarioFindingKind = PassageFindingKind | "single-tone" | "costless-position" | "indistinct-replies" | "unknown-placeholder" | "generic-subject" | "ungated-institution-token" | "premise-class-ungated" | "ungated-organization-token" | "ungated-tariff-token" | "domestic-incoherence" | "implausible-host" | "inert-boost" | "ungrounded-conflict-move" | "ungrounded-join" | "ungrounded-report" | "ungrounded-command" | "ungrounded-transmission" | "classified-report-disclosure" | ReadoutFindingKind | "ungrounded-state-grievance" | "undeclared-set-piece" | "pointless-set-piece" | "duplicate-reply-id" | "duplicate-scenario-id" | "flag-condition-never-set" | "template-overlap" | "duty-log-opening" | "manufactured-clock" | "severity-monotone" | "unnamed-capability" | "shallow-stakes" | "token-position" | "dominated-reply" | "all-downside" | "island-pack" | "tone-tuple-monoculture" | "opening-framing-monoculture" | "condition-coverage-thin" | "flag-economy-imbalance" | "callback-never-ripens" | "callback-concentration" | "dilemma-shape-monoculture" | "motif-monoculture" | "stock-phrasing" | "insider-shorthand" | "briefing-without-a-figure" | "locus-asserts-landform" | "locus-ground-mismatch" | "unplaced-domestic" | "generic-place" | "coastal-counterpart-ungated" | "unplaced-city-name" | "city-effect-unplaced" | "unrouted-domestic-act" | "unrouted-trade-act" | "trade-act-terms-mismatch" | "unstated-trade-act" | "unplaced-domestic-signature" | "dead-grievance-gate" | "unnamed-group-toll" | "cohort-toll-implausible" | "dead-cohort-gate" | "missing-city-token" | "unknown-city" | "parliamentary-vocabulary" | "financial-scale-exceeds-severity" | "financial-basis-without-band" | "financial-basis-off-band" | "financial-basis-incomplete" | "financial-scale-duplicates-cost" | "instrument-reply-contradicts-rung" | "press-missing-on-heavy-reply" | "cabinet-gate-unused" | "promised-follow-up-unread" | "family-without-opener" | "family-two-openers" | "family-without-close" | "impact-undeclared" | "impact-contradicts-prose" | "inert-impact-field" | "acted-upon-abroad" | "rejoinder-restates" | "rejoinder-presumes-outcome" | "arc-branch-unread" | "intel-tell-missing" | "intel-doubt-unanswerable" | "unreachable-scenario" | "inert-gate" | "lead-speaker-addresses-self" | "topic-tag-unknown" | "unknown-entity" | ExecutiveFindingKind | GroundingFindingKind | TimeFindingKind | "speaker-department-mismatch" | "unbound-disaster" | "narrated-vacancy" | "season-literal";
export type ScenarioFindingSeverity = "error" | "warning";
export type ScenarioFinding = {
    readonly kind: ScenarioFindingKind;
    readonly severity: ScenarioFindingSeverity;
    readonly scenario: string;
    readonly message: string;
};
export declare const PLACEHOLDERS: readonly string[];
/**
 * Ceilings per field rather than one number for all copy: a subject is a
 * headline, a beat is a paragraph, and a reply is something a leader says out
 * loud in one breath. Exported so the generation brief quotes the numbers the
 * validator actually enforces instead of a remembered copy of them.
 */
export declare const LENGTH_CEILINGS: {
    readonly subject: 70;
    readonly beat: 400;
    readonly reply: 160;
    readonly remembered: 220;
    readonly press: 130;
    readonly locus: 90;
    readonly transmission: 320;
};
/**
 * What a writer is aiming for, under the ceiling and well over the schema's
 * refusal floor (`LENGTH_FLOORS`). Copy between the floor and the target parses
 * and ships; it just reads thin — a beat that states the situation without
 * setting a scene, a reply that picks a side without saying anything a person
 * would say out loud. That is a judgment about writing, not a defect, so it is
 * a warning: at corpus scale it is the signal that tells a reviewer which of
 * seven hundred scenarios to read first.
 *
 * A subject has no target. A headline earns its force by being short, and the
 * ceiling is the only bound worth putting on one.
 */
export declare const LENGTH_TARGETS: {
    readonly beat: 90;
    readonly reply: 70;
    readonly remembered: 80;
    readonly press: 50;
    readonly locus: 30;
    readonly transmission: 110;
};
export declare function passages(def: ScenarioDef): readonly Passage[];
export type LengthField = keyof typeof LENGTH_CEILINGS;
export declare function fieldFor(label: string): LengthField;
export declare function isDeclaredSetPiece(def: ScenarioDef): boolean;
/**
 * The depth floor. The language gates keep a batch clean; these keep it a
 * game. A generator held only to prohibitions learns that the cheapest way
 * through is a set of near-zero, all-loss, interchangeable answers — every
 * one of them valid, none of them a decision. Exported so the generation
 * brief quotes the numbers the validator actually enforces.
 *
 * `heavy*` is what makes one reply a door the player is afraid of: an
 * instrument at the rung where it stops being a gesture, a metric move a
 * player can feel, a treasury line worth a cabinet argument, or an alignment
 * pull that changes who this government is. `token*` is the other end: a
 * position under every one of those thresholds that also stamps no flag has
 * no consequence of any kind, and "reply that does nothing" is a defect, not
 * a style.
 */
export declare const STAKES_FLOORS: {
    readonly heavyRung: 3;
    readonly heavyMetric: 0.04;
    readonly heavyTreasury: 60;
    readonly heavyPull: 0.06;
    readonly tokenMetric: 0.02;
    readonly tokenTreasury: 20;
    readonly tokenPull: 0.03;
};
export declare function costEntries(reply: ScenarioReply): {
    metrics: number[];
    treasury: number;
    pulls: number[];
};
export declare function isHeavy(reply: ScenarioReply): boolean;
export declare function isToken(reply: ScenarioReply): boolean;
/** The board behavior used to reject two differently worded copies of one answer. */
export declare function outcomeFingerprint(reply: ScenarioReply): string;
/**
 * How many ways a reply costs something.
 *
 * Reads the declared impact as well as the authored cost, because a reply that
 * declares a human toll and an emergency appropriation is not a costless
 * decision — it is a decision whose price is computed rather than typed. Before
 * this, every scenario written the new way tripped `costless-position`, which
 * would have made the rule a reason not to migrate.
 *
 * The two are alternatives, never layers: a reply states what it spent or what
 * it did, and counting both would let one decision be billed twice.
 */
export declare function positionCost(reply: ScenarioReply): number;
/**
 * Whether this reply's authored `cost.treasury` and its declared
 * `impact.financial.scale` read as one price named twice.
 *
 * Before the treasury/budget-authority split, the two books were the same
 * book, so any reply naming both was billing one decision twice by
 * construction — the corpus-wide count `docs/CONTENT_DOCTRINE.md` §3 used to
 * quote. Since the split, `cost.treasury` is what the reply obligates against
 * the administration's own authority and `impact.financial` is what it does
 * to the *bearing nation's* debt (`resolveImpact` books a `choiceBorrowing`
 * amount added to the live stock, never the President's authority) — two pots a single decision can
 * genuinely draw from at once, e.g. an order that spends a little now and
 * triggers a much larger supplemental later.
 *
 * What is still worth flagging is the pairing that reads like one price typed
 * twice rather than two real pots: a treasury line already at the heavy
 * floor sitting beside a financial band big enough to be its own emergency
 * appropriation. The schema cannot tell intent apart from coincidence, so
 * this is read as a warning for a reviewer, never a refusal — see
 * `docs/CONTENT_DOCTRINE.md` §3.
 */
export declare function costAndImpactBothPriced(reply: ScenarioReply): boolean;
/**
 * How heavy the heaviest thing this reply does is, on the 0..1 scale the stakes
 * rule reads. Mirrors the impact model's own ordering without importing its
 * tables — the audit asks whether an option is expensive, not what it costs.
 */
export declare function impactWeight(reply: ScenarioReply): number;
