import { type Campaign, type GameDate } from "@admin/engine";
import type { PersonConnection, PersonId, PersonTieKind, TieProvenance } from "@admin/world";
/**
 * Which end of a tie the file's subject is standing at.
 *
 * `mentor` is the one kind that runs in a direction — `from` is the senior
 * figure and `to` the junior one — so a single edge is two different words
 * depending on whose file it is drawn on. Every other kind is symmetric and
 * ignores this.
 */
export type TieEnd = "from" | "to";
export type PersonConnectionRow = {
    readonly edge: PersonConnection;
    readonly otherId: PersonId;
    readonly otherName: string;
    readonly subjectEnd: TieEnd;
    readonly observed?: {
        readonly date: GameDate;
        readonly actId: string;
        readonly direction: "outgoing" | "incoming";
    };
};
export declare function connectionKindLabel(kind: PersonTieKind, subjectEnd: TieEnd): string;
export declare function connectionProvenanceLabel(provenance: TieProvenance): string;
/**
 * Everything one tie says, composed once.
 *
 * The row draws this and the row's spoken label carries it. Assembled
 * separately out of the same facts, a screen reader can end up announcing
 * stale copy after the drawn line is rewritten; composed once, it cannot.
 */
export declare function connectionLine(row: PersonConnectionRow): string;
export declare function connectionsForPerson(campaign: Campaign, personId: PersonId): readonly PersonConnectionRow[];
export declare function connectionTone(kind: PersonTieKind): "favorable" | "adverse" | "neutral";
export declare function circleOrder(rows: readonly PersonConnectionRow[]): readonly PersonConnectionRow[];
/**
 * The circle in one sentence, for the file's own meta: how many ties, and how
 * many of them are against this person. A count of edges alone would be the
 * same number for a person with four patrons and one with four rivals.
 */
export declare function circleSummary(rows: readonly PersonConnectionRow[]): string;
