import { type Campaign, type DisplayBloc } from "@admin/engine";
import { type Stance } from "../reading";
export type BlocMove = {
    readonly key: "record" | "rest";
    readonly label: string;
    /** In share of the bloc approving, signed. */
    readonly delta: number;
};
export type BlocHold = {
    readonly key: "scandal" | "force" | "rally";
    readonly label: string;
    /** What this holds the bloc's approval at, against the week without it, signed. */
    readonly delta: number;
};
export type BlocReading = {
    readonly id: DisplayBloc;
    readonly name: string;
    /** Where the President's own party sits; it is the base the caucus reads. */
    readonly base: boolean;
    readonly share: number;
    readonly approval: number;
    readonly stance: Stance;
    readonly word: string;
    /** What the bloc adds to the headline: its share of the country times its approval. */
    readonly contribution: number;
    /** How much of an independent's response to the record this bloc has: 1 is all of it. */
    readonly responsiveness: number;
    /** Against the previous closed week; undefined until two weeks have been observed. */
    readonly week?: {
        readonly change: number;
        readonly moves: readonly BlocMove[];
    };
    readonly holds: readonly BlocHold[];
    /** The share of the bloc that votes when nothing has moved it, and the share that would this week. */
    readonly turnout: {
        readonly habit: number;
        readonly now: number;
    };
};
export type BlocTopline = {
    readonly blocs: readonly BlocReading[];
    readonly headline: number;
    /** The President's own party's identifiers' approval: the figure their caucus reads. */
    readonly ownIdentifiers: number;
};
/** The three blocs this week, each with its share, approval, what moved it and who turns out. */
export declare function blocTopline(campaign: Campaign): BlocTopline;
