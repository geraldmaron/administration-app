import { type Campaign, type NationCondition } from "@admin/engine";
import { type NationId, type StateId } from "@admin/world";
import { type MetricStance } from "../format/figures";
export type BoardReading = {
    readonly key: string;
    readonly label: string;
    readonly fraction: number;
    readonly value: string;
    readonly stance: MetricStance;
    /** What the figure means, in the terms the player is deciding in. */
    readonly note: string;
};
export type WarReading = {
    readonly id: string;
    readonly headline: string;
    /** Weeks it has been running, which is the fact a player asks for first. */
    readonly standfirst: string;
    readonly readings: readonly BoardReading[];
    /**
     * The principal the country fights beside and the government it fights, set
     * when the country joined somebody else's war. Willingness and wear on that
     * side are the principal's figures, so a joined reading leaves them out
     * rather than print another government's as this one's.
     */
    readonly joined?: {
        readonly alongside: NationId;
        readonly against: NationId;
    };
};
export type ConditionReading = {
    readonly id: string;
    /**
     * The kind, carried rather than folded into the headline.
     *
     * A surface routing this reading has to be able to ask whether it is a
     * condition an agency can be deployed against, and the engine answers that
     * off the kind. Composing the kind into a display name and throwing it away
     * left every caller unable to tell a hurricane from a debt crisis.
     */
    readonly kind: NationCondition["kind"];
    readonly headline: string;
    readonly standfirst: string;
    /**
     * That this was one afternoon rather than a file the government is carrying.
     *
     * Carried rather than derived a second time, because a surface that dates its
     * rows and decides how long they stay open has to be able to tell the two
     * apart, and the engine already marked the record at onset. Absent is the
     * ordinary case: a condition the country is inside for weeks.
     */
    readonly incident?: true;
    readonly severity: BoardReading;
    /**
     * The state this condition is running in, when it names one.
     *
     * Carried on the reading because the surface that prints "Detroit · Michigan"
     * is also the surface that has to be able to *go* there. Before this, the
     * place was composed into `standfirst` and thrown away, and every attention
     * row about a state opened the whole country.
     */
    readonly state?: StateId;
};
/**
 * Every war the player is actually in, as a principal or beside one. A war
 * between two other nations is the world board's business, not the situation
 * room's — this screen answers "what is this government carrying", and
 * somebody else's war is not on it until this government joins it.
 */
export declare function warReadings(campaign: Campaign): readonly WarReading[];
/** Every condition running at home, worst first. */
export declare function conditionReadings(campaign: Campaign): readonly ConditionReading[];
/**
 * The one-line answer to "what is this government carrying", or undefined on a
 * week where the answer is nothing. Undefined rather than "nothing is
 * happening" so the surface can leave the card out entirely: an empty card
 * every quiet week trains the player to stop looking at it.
 */
export declare function boardStateSummary(campaign: Campaign): string | undefined;
