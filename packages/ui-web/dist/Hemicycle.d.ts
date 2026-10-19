import type { PartySeats } from "./PartyBar";
export type HemicycleProps = {
    readonly label: string;
    /** In the order they sit, left to right. */
    readonly parties: readonly PartySeats[];
    readonly majority?: number;
    readonly verdict?: string;
};
type Seat = {
    readonly x: number;
    readonly y: number;
    readonly angle: number;
};
/**
 * Every seat's place on a half ring, filled row by row in proportion to each
 * row's length, then ordered by angle so parties fill from left to right as a
 * chamber's seating does.
 */
export declare function hemicycleSeats(total: number): readonly Seat[];
/** A chamber drawn as its seats, each party in its color, with the majority line and the counts printed beneath. */
export declare function Hemicycle({ label, parties, majority, verdict }: HemicycleProps): import("react").JSX.Element;
export {};
