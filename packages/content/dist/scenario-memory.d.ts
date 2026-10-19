import { type Campaign, type Effect, type EffectPacket, type ScenarioPlace } from "@admin/engine";
import type { CastScenario } from "./scenario-cast.js";
import { type ScenarioDef, type ScenarioSeverity } from "./scenario.js";
/**
 * What the president decided the last time this document was on the desk.
 *
 * `once` is the only thing that stops a scenario returning, and it is set on a
 * minority of the pool, so a term re-offers decisions the president has already
 * taken. A repeat is not in itself wrong — a question can come back — but a
 * repeat that opens as if the week never happened is, and the campaign already
 * holds everything needed to say otherwise: the fired flag, its turn marker,
 * and the door that was taken.
 *
 * Nothing is invented when the record is incomplete. A campaign whose answer
 * predates this stamping carries the fired flag and neither the marker nor the
 * reply, and "you decided this, at some point, somehow" is worse than silence.
 */
export type PriorAnswer = {
    /** The turn the decision was taken. */
    readonly turn: number;
    readonly replyId: string;
    /** The course taken, in the reply's own words. */
    readonly course: string;
};
export declare function priorAnswer(campaign: Campaign, def: ScenarioDef): PriorAnswer | undefined;
/**
 * The record that a week was allowed to pass on this document.
 *
 * Durable and marked, so a later scenario can be written against the thing
 * nobody decided the same way it is written against a decision.
 */
export declare function scenarioUnansweredFlag(id: string): string;
/**
 * What not deciding costs, by how loud the week was.
 *
 * A government is read on whether it governs, so every severity moves
 * `competence` and only `competence` is universal — the second driver is what
 * the particular week was about. The figures sit in the same range as the
 * impact model's own opinion movements, which is the calibration that matters:
 * an unanswered critical week has to read as heavier than an answered routine
 * one, or a president learns to let the loud weeks pass.
 */
export declare const INACTION_COMPETENCE: Readonly<Record<ScenarioSeverity, number>>;
/** The record that a week ended with a document still on the desk. */
export declare function deskDriftFlag(turn: number): string;
/**
 * The week ending with the document still on the desk, as a packet.
 *
 * Every scenario authors `context.inaction` — "the honest price of not
 * deciding" — and until this existed the screen printed that sentence and the
 * simulation charged nothing for it, which made never answering the strongest
 * way to play. The prose is the narration, because the author already wrote
 * what happens; the figures are derived from severity and class, because no
 * scenario authors them and asking three hundred of them to would be a corpus
 * migration rather than a mechanism.
 *
 * Costs nothing in treasury by construction. Silence is genuinely free in
 * money — it is the country's reading of its government that pays — and a
 * treasury debit here would make the packet a second decision rather than the
 * absence of one.
 */
export declare function inactionPacket(campaign: Campaign, cast: CastScenario): EffectPacket;
/**
 * The thread an opener starts the week it is raised, before anyone answers: the
 * counterpart and the place it was datelined in are pinned now, so the story
 * has one place whether it is answered, put off or left to expire. Nothing for
 * a scenario that opens no family.
 */
export declare function familyRaiseEffects(campaign: Campaign, cast: CastScenario): readonly Effect[];
/**
 * What a committed reply does to the family it belongs to: opens it and pins
 * the country, adds a beat to one already running, or closes it out the way
 * the chosen reply says it ended. The opener's rendered subject rides along so
 * the Record can name the arc when it ends, and so does where it happened at
 * home, so the arc's later scenes come back to it.
 */
export declare function familyEffects(cast: CastScenario, turn: number, replyId: string, place?: ScenarioPlace): readonly Effect[];
