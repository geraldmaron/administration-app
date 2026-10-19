import type { ProxyProfile } from "./balance-proxies.js";
import type { Campaign } from "./state.js";
/**
 * The week's budget, if this proxy sends one: only a careful proxy, only on a
 * deadline, and only while the next fiscal year is not yet paid for. A refused
 * budget leaves the government on the prior year's numbers, which is what a
 * refusal is.
 */
export declare function voteBudget(campaign: Campaign, profile: ProxyProfile): Campaign;
/**
 * The offers to resign a careful proxy has on its Desk this week, answered. A
 * President who reads the Desk answers every one: they accept the Secretary
 * whose department is failing under them and ask the rest to stay. Left
 * unanswered, every offer lapsed and cost the Secretary's loyalty, so a
 * careful cabinet leaked like an ignored one and almost nobody left it.
 * Returns the week's campaign and how many Secretaries were let go.
 */
export declare function answerOffers(campaign: Campaign, profile: ProxyProfile): {
    readonly campaign: Campaign;
    readonly accepted: number;
};
