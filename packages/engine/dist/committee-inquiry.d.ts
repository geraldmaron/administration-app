import type { Campaign } from "./state.js";
import { committeeForInstitution } from "./committees.js";
export { committeeForInstitution };
import { type OrderDomain } from "./orders.js";
import type { TurnPhase } from "./turn-loop.js";
import type { OversightMatter } from "./oversight.js";
/**
 * The committee that would take a matter about an order in this domain.
 *
 * Routed through the bodies that would have to carry the order out, so the
 * jurisdiction is the same one the confirmation lattice already uses. An order
 * about the border is a Homeland matter because the border is run by bodies the
 * Homeland committee confirms, not because a list here says so.
 */
export declare function committeeForOrderDomain(domain: OrderDomain): string | undefined;
/**
 * The week Congress decides whether to look at something.
 *
 * One inquiry at a time across the whole Congress, for the same reason the
 * auditors open one at a time: a president who has done four investigable
 * things should watch four committees arrive over four months with room to
 * answer each, rather than open the board one morning and find the term
 * already over.
 */
export declare const committeeInquiryPhase: TurnPhase;
/** Every matter this committee has open, for the panel's own page. */
export declare function selectInquiriesFor(campaign: Campaign, committee: string): readonly OversightMatter[];
/**
 * The committee file opened on a press story, if the story ever reached one.
 *
 * A story ends and the inquiry it started does not: a committee keeps asking
 * after the papers have moved on, so the story's own page has to be able to say
 * who is still looking into it. Found through the cause the file was opened on,
 * the same key that keeps a story from being opened twice.
 */
export declare function matterForScandal(campaign: Campaign, scandalId: string): OversightMatter | undefined;
/** Whether this committee is currently investigating the administration. */
export declare function committeeIsInvestigating(campaign: Campaign, committee: string): boolean;
