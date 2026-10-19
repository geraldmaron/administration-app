/**
 * The one department proposal for this week, as a Desk row.
 *
 * The engine chooses the department. This file only says how that choice
 * reads: a soft matter from the government, or nothing when the week has
 * no trigger.
 */
import { type Campaign, type DepartmentProposal, type MinisterProposal, type ResignationOffer } from "@admin/engine";
import type { AttentionItem } from "./attention-row";
/** One proposal, as the row the Desk already draws from title and reason. */
export declare function cabinetProposalItem(campaign: Campaign, proposal: DepartmentProposal): AttentionItem;
/**
 * A Secretary's own act, as the Desk draws it. The engine wrote the sentence
 * from the decision it made, so the row repeats it rather than paraphrasing:
 * who proposes what, why it suits them, and what taking it does. It is an
 * opening rather than a problem, and it lapses at the week's end if nobody
 * answers it.
 */
export declare function ministerInitiativeItem(campaign: Campaign, proposal: MinisterProposal): AttentionItem;
/** Every act a Secretary has brought and the President has not yet answered. */
export declare function ministerInitiativeItems(campaign: Campaign): readonly AttentionItem[];
/** The week's department proposal, or no row, then any act a Secretary brought. The engine's choice is the only selection. */
export declare function cabinetProposalItems(campaign: Campaign): readonly AttentionItem[];
/** One resignation offer, as the Desk draws it: the officer's own stamped reason (CAB-8 12a). */
export declare function resignationOfferItem(campaign: Campaign, offer: ResignationOffer): AttentionItem;
/** Every resignation offer standing on the cabinet's agenda. */
export declare function resignationOfferItems(campaign: Campaign): readonly AttentionItem[];
