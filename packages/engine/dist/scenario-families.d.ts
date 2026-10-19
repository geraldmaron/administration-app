import type { CityId, SettlementId, NationId, StateId } from "@admin/world";
import type { Campaign } from "./state.js";
export type ScenarioFamilyId = string;
/**
 * Where at home a story happened: a state, and the dataset city inside it
 * where the resolver stood the event. Kept so the story's next scene comes
 * back to the same place instead of drawing a new one. Two short ids and
 * nothing else, because it rides the save for as long as the story runs.
 */
export type ScenarioPlace = {
    readonly state: StateId;
    readonly city?: CityId;
    readonly settlement?: SettlementId;
};
/**
 * How an arc ended. `held` and `lost` are authored on the close member's
 * replies, so the writer who wrote the ending decides which door was which;
 * `lapsed` is the engine's alone, for an arc nobody closed.
 */
export type FamilyDisposition = "held" | "lost" | "lapsed";
export type ScenarioFamilyRun = {
    readonly family: ScenarioFamilyId;
    /** Bound once, at the opener. Every later member of the family reads this. */
    readonly counterpart: NationId;
    /**
     * Where at home the opener happened, when it happened somewhere below the
     * capital. Dropped when the family closes, because nothing is dealt after
     * that and the place has nothing left to answer. Absent on a run saved
     * before places were kept, and its later members draw a place as before.
     */
    readonly place?: ScenarioPlace;
    /**
     * Set from the week the opener is raised until it is answered. The thread
     * and its place exist from the raise, but a follow-up written as a callback
     * to the President's answer is not live on a story nobody answered. Absent
     * on every run saved before the pin moved to the raise, all of which were
     * opened by an answer.
     */
    readonly unanswered?: true;
    readonly openedTurn: number;
    /** The turn the family last put something in front of the president. */
    readonly lastTurn: number;
    /** Scenario ids dealt under this family, in the order they were dealt. */
    readonly beats: readonly string[];
    /** Set when a member marked `close` was answered. A closed family deals nothing more. */
    readonly closedTurn?: number;
    /** How it ended. Present exactly when `closedTurn` is; absent on a run saved before endings were recorded. */
    readonly disposition?: FamilyDisposition;
    /**
     * The opener's subject as the President read it, so the Record can name a
     * story that ended without re-rendering a scenario the corpus may since have
     * rewritten. Absent on a run saved before titles were kept.
     */
    readonly title?: string;
};
export type ScenarioFamilyState = Readonly<Record<ScenarioFamilyId, ScenarioFamilyRun>>;
export declare function foundingScenarioFamilies(): ScenarioFamilyState;
export declare function selectFamilyRun(campaign: Campaign, family: ScenarioFamilyId): ScenarioFamilyRun | undefined;
/** Families still running, oldest first. */
export declare function selectOpenFamilies(campaign: Campaign): readonly ScenarioFamilyRun[];
/** Families that ended, most recent close first. */
export declare function selectClosedFamilies(campaign: Campaign): readonly ScenarioFamilyRun[];
/**
 * The country this family is about, or nothing where it has not opened.
 *
 * The one read the cast binding needs, and deliberately narrow: a member that
 * asks for the pin and does not get one is not live, which is what stops a
 * follow-up from arriving before the thing it follows.
 */
export declare function familyCounterpart(campaign: Campaign, family: ScenarioFamilyId): NationId | undefined;
/** Where a running family's opener happened, for its later members to return to. */
export declare function familyPlace(campaign: Campaign, family: ScenarioFamilyId): ScenarioPlace | undefined;
/**
 * Where the last answer that set this flag happened, for a scenario gated on
 * the flag. Absent when that answer happened in Washington or abroad, or on a
 * save from before places were kept.
 */
export declare function flagPlace(campaign: Campaign, flag: string): ScenarioPlace | undefined;
/** How long a family has been running, in turns. */
export declare function familyAge(campaign: Campaign, family: ScenarioFamilyId): number | undefined;
