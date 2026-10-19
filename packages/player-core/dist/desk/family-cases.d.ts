import { type Campaign, type CaseDispositionAnswer, type CaseKind, type Effect, type GameDate, type PresidentialCase } from "@admin/engine";
import type { FamilySource } from "./family-raise";
export declare const FAMILY_KINDS: ReadonlySet<CaseKind>;
/**
 * Raises a case for every family source the registry has not seen, and closes
 * every open family case whose source is gone. The same campaign comes back
 * when nothing moved, so a caller can seat on every read path for free.
 */
export declare function seatFamilyCases(campaign: Campaign): Campaign;
export type FamilyEntry = {
    readonly source: FamilySource;
    readonly record: PresidentialCase;
};
/**
 * The Desk's case queue: every live family matter the President has not yet
 * closed, with its record. A source not yet seated reads as raised today,
 * which is what the next seat writes.
 */
export declare function familyQueue(campaign: Campaign): readonly FamilyEntry[];
/** Every id a family row carries, closed or not, so a surface can keep them out of its own lists. */
export declare function familyRowIds(campaign: Campaign): ReadonlySet<string>;
/** The attention urgency a family row keeps once its case is closed: none. */
export declare function familyRowUrgency(campaign: Campaign, source: FamilySource): FamilySource["row"]["urgency"];
/**
 * A put-off said to the family case as well as to the attention record, for
 * the Desk's own put-off and the Chief of Staff's. Nothing when the id is not
 * a family case, the case cannot be deferred, or its deadline leaves no day.
 */
export declare function familyPutOffEffects(campaign: Campaign, id: string, until: GameDate): readonly Effect[];
/** A generic disposition the Desk's tray commits. Family acts with a document of their own stay on that document. */
export type FamilyDispositionKind = "defer" | "decline" | "allow-default";
/** Commits one tray disposition on a family case, raising the case first where the registry has not seen it yet. */
export declare function familyDisposition(campaign: Campaign, id: string, kind: FamilyDispositionKind): CaseDispositionAnswer;
