import { type CampaignSummary } from "./save-store";
/**
 * One saved administration, as the replace-a-slot chooser shows it.
 *
 * Everything the chooser prints is decided here rather than in the sheet so the
 * order, the default and the sentence the player confirms against are one
 * tested account of what is about to be lost.
 */
export type ReplacementCandidate = {
    readonly id: string;
    readonly name: string;
    readonly leader: string;
    readonly dateLabel: string;
    readonly savedAt: number | null;
    readonly inPlay: boolean;
    /** The save cannot be continued, so replacing it loses a record rather than a game. */
    readonly unplayable: boolean;
    /** Its bytes are still worth a copy: intact but retired, or healthy. Damaged payloads have nothing to give back. */
    readonly exportable: boolean;
};
/**
 * Every saved administration in the order the chooser lists them: saves that can
 * no longer be continued first (they cost the player least), then the rest from
 * the longest untouched, with the one in play last so it is the hardest to reach
 * by accident.
 */
export declare function replacementCandidates(campaigns: readonly CampaignSummary[], activeCampaignId: string | null): readonly ReplacementCandidate[];
/** The slot the chooser preselects: the first in order, unless that is the one in play, which is never a default. */
export declare function defaultReplacementId(candidates: readonly ReplacementCandidate[]): string | null;
/** The lines under a candidate in the list, so a damaged save and the one in play each say what they are. */
export declare function candidateStanding(candidate: ReplacementCandidate): string;
/**
 * The sentence the player confirms against: exactly what is deleted, that it
 * cannot be brought back, and what happens next. It names a copy only when one
 * was actually exported this sitting, so it never promises a safety net that
 * does not exist.
 */
export declare function replacementSentence(candidate: ReplacementCandidate, options: {
    readonly then: string;
    readonly copyKept: boolean;
}): string;
