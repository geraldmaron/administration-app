export type Party = "democrat" | "republican" | "independent";
export type PartySeats = {
    readonly party: Party;
    readonly seats: number;
    readonly label: string;
};
export type PartyBarProps = {
    readonly label: string;
    /** In the order they sit, left to right. */
    readonly parties: readonly PartySeats[];
    /** Seats needed for control; drawn as a line across the bar. */
    readonly majority?: number;
    /** One line under the bar: who holds it, and whether that is you. */
    readonly verdict?: string;
};
/**
 * A chamber's seats as one bar split by party, with the majority line drawn
 * on it. Each party's count is printed beside its name, so color is never the
 * only way to tell the parties apart.
 */
export declare function PartyBar({ label, parties, majority, verdict }: PartyBarProps): import("react").JSX.Element;
