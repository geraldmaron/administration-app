import type { PersonId } from "@admin/world";
import type { Campaign } from "./state.js";
export type SuccessionMechanism = "removal" | "resignation" | "incapacity";
export type Succession = {
    readonly successor: PersonId;
    readonly mechanism: SuccessionMechanism;
    /** Which office the successor held when the presidency passed to them. */
    readonly from: "vice-president" | "speaker";
};
/**
 * Who would take the oath if the office passed today: the Vice President, and
 * with no living Vice President the Speaker. Asked before the office passes,
 * which is what lets the removal that causes it name who comes next.
 */
export declare function nextInLine(campaign: Campaign): Pick<Succession, "successor" | "from"> | undefined;
/** Who succeeds this President, once the office has passed. Undefined while the President serves. */
export declare function successionOf(campaign: Campaign): Succession | undefined;
/**
 * The line a removal closes on: the successor taking the oath. Empty when
 * nobody in the line can be named, rather than a sentence about a stranger.
 */
export declare function successionHandover(campaign: Campaign): string;
/**
 * The Twenty-fifth Amendment's fourth section, asked by the balance harness
 * and nothing else: if the Vice President and a majority of the Cabinet
 * declared the President unable to serve today, who would act as President.
 * Nothing is written; the harness reads the answer.
 */
export declare function section4Succession(campaign: Campaign): Succession | undefined;
