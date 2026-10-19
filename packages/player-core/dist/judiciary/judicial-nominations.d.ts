import { type Campaign, type ChamberVote, type NominationId, type OfficeId } from "@admin/engine";
import { type LeverTerms } from "../dossier/person-lever";
export type JudicialNomination = {
    readonly id: NominationId;
    readonly office: OfficeId;
    readonly title: string;
    readonly nomineeId: string;
    readonly name: string;
    readonly standing: string;
    readonly days: number;
    readonly committee?: string;
    readonly controversies: readonly string[];
    /** The Senate's count today; it moves as the chamber does. */
    readonly vote: ChamberVote;
    /** What pulling the name back charges, off the packet `withdrawNomination` commits. */
    readonly withdrawal?: LeverTerms;
};
/** Every name before the Senate for a seat on the Court, oldest first. */
export declare function judicialNominations(campaign: Campaign): readonly JudicialNomination[];
