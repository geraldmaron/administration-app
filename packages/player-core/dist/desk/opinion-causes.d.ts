import { type Campaign, type OpinionDriver } from "@admin/engine";
import { type Stance } from "../reading";
/**
 * One of the six judgments approval is made of, with what moved it. The
 * approval file draws all six so a player can see the world moving the number
 * as well as their own decisions.
 */
export type DriverBar = {
    readonly driver: OpinionDriver;
    readonly label: string;
    /** The judgment's level, 0..1. */
    readonly value: number;
    /** Where the country's own board is taking it, 0..1. */
    readonly target: number;
    /** This judgment's share of approval this week, after the week has had its say. */
    readonly weight: number;
    readonly word: string;
    readonly stance: Stance;
    /** What weighed most on it this week, in words, when anything did. */
    readonly leadingCause?: string;
    /** The figure behind the leading cause, in the model's own sentence. */
    readonly leadingDetail?: string;
    /**
     * Every reason the week made this judgment louder than it rests; empty when
     * none did. All of them, because two can fire on one judgment at once (a
     * pump shock and prices biting both raise prosperity), and naming only the
     * first hid the one a new shock had just added.
     */
    readonly louder: readonly string[];
};
/**
 * The six judgments behind approval, each with its level, heading and leading
 * cause: the term that moved where the judgment has fallen over the Desk's
 * window, so the file and the Desk tile name the same thing, and otherwise the
 * heaviest standing term.
 */
export declare function approvalDrivers(campaign: Campaign): readonly DriverBar[];
/** The one cause pulling approval down hardest, and the judgment it pulls on. */
export type ApprovalDrag = {
    readonly cause: string;
    readonly driver: string;
};
/**
 * What is pulling approval down: the judgment that fell furthest over the last
 * few weeks, priced at the weight the week gives it, named by the term
 * behind it that moved. Read off the mood every packet already leaves on the ledger.
 *
 * A fall rather than a standing drag, because the largest standing drag is
 * almost always the same structural one (a divided country's unity), and a
 * Desk that named it every week would be telling the player nothing. Nothing
 * when no judgment has fallen by a noticeable amount.
 */
export declare function approvalDrag(campaign: Campaign): ApprovalDrag | undefined;
