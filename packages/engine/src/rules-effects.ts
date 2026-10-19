// The one writer of `Campaign.rules`.
//
// It lives beside `effects.ts` rather than in it because that file is already
// past seven hundred lines, and apart from one writer for one field there is no
// other reason for this module to exist: a rule may be changed only by a dated
// packet that goes through `apply()`, so the log is complete by construction and
// there is nowhere else a value could have come from.

import type { Campaign } from "./state.js";
import { RULES, type RuleChange, type RuleSuspension, type RulesState } from "./rules.js";

export type RulesEffect = {
  readonly kind: "rules";
  readonly change: RuleChange;
};

const EMPTY: RulesState = { values: {}, log: [] };

/**
 * Apply one rule change.
 *
 * A `suspend` while already suspended and a `resume` while not suspended do
 * nothing and log nothing. The app shell re-checks the entitlement on every
 * session and every load, so without that the log would grow by one entry per
 * launch and the seal would read as a campaign whose rules were changed
 * hundreds of times.
 */
export function applyRules(state: Campaign, effect: RulesEffect): Campaign {
  const current = state.rules ?? EMPTY;
  const change = effect.change;
  if (change.kind === "suspend" && current.suspended) return state;
  if (change.kind === "resume" && !current.suspended) return state;

  const values = change.kind === "set" ? { ...current.values, [change.rule]: change.value } : current.values;
  const suspended = suspensionAfter(current.suspended, change);
  // Every rule packet re-anchors the weekly debt clamp, whichever rule it was
  // about. Turning one on, suspending it or resuming it all change what the week
  // is allowed to book, and a clamp still holding last week's figure would snap
  // the stock back to a number no rule now justifies.
  const inner = anchoredClamp(state, current);
  return {
    ...state,
    rules: {
      values,
      log: [...current.log, change],
      ...(suspended ? { suspended } : {}),
      ...(inner ? { state: inner } : {}),
    },
  };
}

function suspensionAfter(current: RuleSuspension | undefined, change: RuleChange): RuleSuspension | undefined {
  if (change.kind === "suspend") return { since: change.since, reason: change.reason };
  if (change.kind === "resume") return undefined;
  return current;
}

function anchoredClamp(state: Campaign, current: RulesState): RulesState["state"] {
  const debt = state.nations[state.founding.nation]?.stats.economy.debt;
  // No founding nation runtime means there is no stock to clamp, and writing a
  // zero would read as a debt-free United States on the next books day.
  if (debt === undefined) return current.state;
  return { ...current.state, debtRule: { lastBooked: debt } };
}

/** Whether any paid rule is currently held back for want of the entitlement. */
export function rulesAreSuspended(campaign: Campaign): boolean {
  return campaign.rules?.suspended !== undefined;
}

/**
 * The changes a founding or a session check writes to put a set of values in
 * force. One `set` per named rule, dated off the campaign's own calendar so a
 * builder cannot misdate the log.
 */
export function setRuleChanges(
  campaign: Campaign,
  values: RulesState["values"],
): readonly RuleChange[] {
  return (Object.keys(values) as (keyof RulesState["values"])[]).flatMap((rule) => {
    const value = values[rule];
    if (value === undefined || !(rule in RULES)) return [];
    return [{ kind: "set", rule, value, date: campaign.calendar } as const];
  });
}
