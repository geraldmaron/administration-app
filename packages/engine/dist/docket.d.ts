import type { AlignmentVector, Campaign } from "./state.js";
import type { TurnPhase } from "./turn-loop.js";
import { type InstitutionId } from "./institutions.js";
export type DocketStage = "proposed" | "omb-review" | "comment" | "final" | "litigated" | "vacated";
export declare const DOCKET_INSTITUTIONS: readonly InstitutionId[];
export type DocketItem = {
    readonly id: string;
    readonly institution: InstitutionId;
    readonly cycle: number;
    readonly openedDay: number;
    readonly landsDay: number;
    readonly stage: DocketStage;
    readonly stageEnteredDay: number;
    readonly lean: AlignmentVector;
    readonly challenged: boolean;
    /** Set only once the item has reached `litigated`: the day the case resolves. */
    readonly resolvesDay?: number;
    /**
     * Why the President cannot move this, stated rather than left for a
     * surface to infer from an absent button. For an independent body this is
     * the whole of the President's reach; for an executive one it names the
     * lever that does exist — direction through the confirmed officer — and
     * why that is not the same as writing the rule.
     */
    readonly constraint: string;
};
/** Every body's current item, for a room that wants the whole belt at once. */
export declare function selectActiveDocket(campaign: Campaign): readonly DocketItem[];
export declare function selectDocketItem(campaign: Campaign, institution: InstitutionId): DocketItem | undefined;
/**
 * The belt's own week: every body's rulemaking moves whether or not the
 * President did anything, and a landing or a vacatur this week is reported
 * the same turn it happens rather than waiting to be asked about.
 */
export declare const docketPhase: TurnPhase;
