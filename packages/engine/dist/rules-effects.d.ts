import type { Campaign } from "./state.js";
import { type RuleChange, type RulesState } from "./rules.js";
export type RulesEffect = {
    readonly kind: "rules";
    readonly change: RuleChange;
};
/**
 * Apply one rule change.
 *
 * A `suspend` while already suspended and a `resume` while not suspended do
 * nothing and log nothing. The app shell re-checks the entitlement on every
 * session and every load, so without that the log would grow by one entry per
 * launch and the seal would read as a campaign whose rules were changed
 * hundreds of times.
 */
export declare function applyRules(state: Campaign, effect: RulesEffect): Campaign;
/** Whether any paid rule is currently held back for want of the entitlement. */
export declare function rulesAreSuspended(campaign: Campaign): boolean;
/**
 * The changes a founding or a session check writes to put a set of values in
 * force. One `set` per named rule, dated off the campaign's own calendar so a
 * builder cannot misdate the log.
 */
export declare function setRuleChanges(campaign: Campaign, values: RulesState["values"]): readonly RuleChange[];
