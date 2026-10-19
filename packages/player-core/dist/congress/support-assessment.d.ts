import { type Bill, type Campaign, type Chamber, type GameDate } from "@admin/engine";
import type { PersonId, StateId } from "@admin/world";
export type PublicMemberAssessment = {
    readonly person: PersonId;
    readonly seat: string;
    readonly state: StateId;
    readonly party: string;
    readonly alignment: "favorable" | "adverse" | "mixed" | "unknown";
    readonly basis: readonly string[];
    readonly priorVote?: {
        readonly yea: boolean;
        readonly turn: number;
        readonly title: string;
    };
};
export type ChamberSupportAssessment = {
    readonly chamber: Chamber;
    readonly seats: number;
    readonly required: number;
    readonly clotureRequired?: number;
    readonly interval: {
        readonly lower: number;
        readonly upper: number;
    };
    readonly confidence: "unknown";
    readonly asOf: GameDate;
    readonly provenance: string;
    readonly members: readonly PublicMemberAssessment[];
    readonly lobbying: readonly {
        readonly turn: number;
        readonly account: string;
    }[];
};
/** Public alignment supplies context, never a commitment or a calibrated probability. */
export declare function assessMemberSupport(campaign: Campaign, bill: Bill, against?: boolean): readonly ChamberSupportAssessment[];
