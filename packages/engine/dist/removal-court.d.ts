import type { Campaign } from "./state.js";
import type { Effect } from "./effects.js";
import type { CourtProceeding, CourtVote } from "./state-judiciary.js";
type RemovalSubject = Extract<CourtProceeding["subject"], {
    kind: "commission-removal";
}>;
/** Each justice's chance of reinstating: Slaughter's level for the bench as a whole, spread by how far each sits from the executive's position. */
export declare function justiceReinstatementVotes(campaign: Campaign, draw: number): readonly CourtVote[];
/** Reinstatement when the seat can be returned to a living member who holds nothing else; otherwise back pay only. */
export declare function removalRemedy(campaign: Campaign, subject: RemovalSubject): {
    readonly effects: readonly Effect[];
    readonly words: string;
};
/** Every contested removal whose member has decided to sue opens one proceeding, and each open one takes its next dated step. */
export declare function removalMatterEffects(campaign: Campaign): readonly Effect[];
export {};
