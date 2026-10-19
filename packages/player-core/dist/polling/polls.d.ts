import { type Campaign } from "@admin/engine";
import { type Stance } from "../reading";
export type PollReading = {
    /** What the poll put approval at this week. */
    readonly reading: number;
    readonly low: number;
    readonly high: number;
    /** The reading as a percentage, with its band, for the figure line. */
    readonly figure: string;
    readonly range: string;
    readonly word: string;
    readonly stance: Stance;
    /** The margin, in the words a topline would carry it in. */
    readonly margin: string;
};
/**
 * This week's topline.
 *
 * A sample of the settled figure, with its error drawn. The settled figure is
 * printed on the Brief, the Nation home and the Digest, so a poll shown alone
 * read as a second, disagreeing approval; the Nation screen draws the poll as a
 * labeled sample beside the settled figure instead.
 */
export declare function pollReading(campaign: Campaign): PollReading;
