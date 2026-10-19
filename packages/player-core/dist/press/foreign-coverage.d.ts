import { type Campaign, type CoverageBand, type ForeignOutletKind, type ForeignPiece, type ForeignSeat, type LeadershipArticle } from "@admin/engine";
import type { NationId } from "@admin/world";
/** "How they cover you": what each band says on a country file, and what a state press says instead. */
export declare const COVERAGE_CAPTIONS: Readonly<Record<CoverageBand | "echo", string>>;
export type ForeignCoverageView = {
    readonly nation: NationId;
    readonly band: CoverageBand;
    readonly caption: string;
    readonly echo: boolean;
    readonly outlet?: {
        readonly id: string;
        readonly name: string;
        readonly kind: ForeignOutletKind;
        readonly beat: string;
    };
    /** The outlet's piece this week, where the roster carries an outlet for the country. */
    readonly piece?: ForeignPiece;
};
/** One nation's coverage of the President. Undefined until the press abroad has first filed, and for the President's own country. */
export declare function foreignCoverageReading(campaign: Campaign, nation: NationId): ForeignCoverageView | undefined;
/** The week's pieces from every outlet on the foreign roster, for the press room. */
export declare function foreignPressReading(campaign: Campaign): readonly ForeignPiece[];
/** A date to its month, "March 2027", off the same month names every other date is printed with. */
export declare function monthOf(date: ForeignSeat["since"]): string;
export type ForeignLeadershipView = {
    readonly since: string;
    /** The government's next scheduled selection, to the month, where the calendar carries one. */
    readonly nextSelection?: string;
    /** The changes of government on the record for this country, newest first. */
    readonly articles: readonly LeadershipArticle[];
};
/** Who governs a country and how they came to: the seat's date and the stories of its changes. */
export declare function foreignLeadershipReading(campaign: Campaign, nation: NationId): ForeignLeadershipView | undefined;
