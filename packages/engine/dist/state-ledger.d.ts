import type { InstrumentId, RungLevel } from "./instruments.js";
import type { NationId, PersonId, RoleId } from "@admin/world";
import type { CounselStance } from "./counsel.js";
import type { PositionAssessment } from "./position-assessment.js";
import type { CausalStamp } from "./causality.js";
import type { EffectActor, MetricSet, PublicMood } from "./state-campaign.js";
/**
 * The instrument an entry committed to, stated rather than narrated.
 *
 * With only the narrating sentence to go on, anything derived from the ledger
 * has to parse prose, and an entry an authored consequence card dressed carries
 * the card's prose instead and cannot be read at all. That makes the record
 * blinder the more the aftermath is written, which is backwards: authored
 * content should deepen the account of a campaign, never erase it.
 *
 * `landed` is optional because one commit path genuinely does not roll: the
 * ladder resolves an attempt outright, so there is no outcome to state and
 * claiming one would be inventing it.
 */
export type ActionCommitment = {
    readonly instrument: InstrumentId;
    readonly rung: RungLevel;
    readonly target: NationId;
    readonly landed?: boolean;
};
/**
 * What the room said before the decision was taken, kept beside the outcome it
 * was arguing about.
 *
 * The odds the minister was reading are the load-bearing part: counsel weighs
 * them, and a record without them can only reconstruct half the judgment. There
 * is deliberately no `landed` here, because the same entry's `commitment`
 * already carries it and a second copy is a field that can disagree with
 * itself.
 */
export type ActionCounsel = {
    readonly role: RoleId;
    readonly person: PersonId;
    readonly stance: CounselStance;
    readonly successChance?: number;
    /**
     * Every seat that spoke, in the order the room was shown, primary included.
     *
     * The fields above are the chair the decision routed to; this is the meeting.
     * Without it a cabinet that split three-to-one left a record naming one
     * minister, so the review could say what the Secretary of State thought and
     * could not say that anybody had objected. Odds are not repeated per voice —
     * they were the same odds for everyone in the room, and a second copy is a
     * field that can disagree with itself.
     *
     * Optional because the entries a save already carries do not have it, and an
     * appointment or a budget signature takes no counsel at all.
     */
    readonly room?: readonly ActionCounselVoice[];
};
/** One seat's view, kept for the room rather than for the forecast. */
export type ActionCounselVoice = {
    readonly role: RoleId;
    readonly person: PersonId;
    readonly stance: CounselStance;
};
export type ActionRecord = {
    readonly turn: number;
    readonly actor: EffectActor;
    readonly description: string;
    readonly cost?: Partial<Record<keyof MetricSet, number>>;
    readonly commitment?: ActionCommitment;
    readonly counsel?: ActionCounsel;
    /**
     * How the country's reading of its own government moved, and how many people
     * are not alive afterwards.
     *
     * Measured on the way through `apply()` exactly as `cost` is, rather than
     * re-derived later from the impact that caused it. That is the whole point:
     * a Record that recomputed what a decision "would" cost against a board that
     * has since moved would show the player a number they were never charged.
     *
     * Both are optional and omitted when nothing moved, for the same round-trip
     * reason as the fields above. `toll` is a positive count of lives lost, in
     * whichever nation bore them — a decision that killed nobody has no toll
     * rather than a toll of zero.
     */
    readonly mood?: Partial<Record<keyof PublicMood, number>>;
    readonly toll?: number;
    /**
     * What the act committed of the government's own capacity, as the content
     * layer's own tags.
     *
     * The third thing a decision does that no metric records. A president who
     * committed forces, burned an intelligence source or reached for emergency
     * powers charged nothing to the board for it, so the review afterwards had no
     * evidence any of it had happened — the same hole `mood` and `toll` were
     * added to close. Strings rather than an enum for the reason the packet field
     * gives.
     */
    readonly institutional?: readonly string[];
    /** The assessment the card printed before the act, copied from the packet; absent where nothing was assessed. */
    readonly assessment?: PositionAssessment;
    readonly subjects?: readonly import("./story-subject.js").StorySubject[];
    readonly accounting?: readonly import("./scenario-accounting.js").ScenarioAccounting[];
    readonly causal?: CausalStamp;
    /** The world's weekly bookkeeping, kept in the causal graph and left off the Record; absent means an act. */
    readonly background?: true;
};
