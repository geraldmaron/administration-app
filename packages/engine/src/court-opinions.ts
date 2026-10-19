import type { ConstitutionalGround } from "./legislative-acts.js";
import type { ExecutiveOrder } from "./orders.js";
import type { CourtHolding } from "./state-judiciary.js";

// The opinion a case document prints, composed from fixed sentences: the
// ground Congress left the order on, the field it works in, the holding, and
// the margin. No sentence is generated at play time; each is chosen.

const GROUND_LINES: Readonly<Record<ConstitutionalGround, string>> = {
  silent: "Congress has said nothing on the matter, so the Court weighs the order against the office alone.",
  authorized: "Congress authorized the field the order works in, and the Court asks only whether the statute reaches this far.",
  forbidden: "Congress forbade what the order attempts, and the Court has never permitted an order to do what a statute denies.",
};

const DOMAIN_LINES: Readonly<Record<string, string>> = {
  security: "The order concerns the nation's security, where the office's authority is at its broadest and the Court's patience with it is not unlimited.",
  emergency: "The order invokes an emergency, and an emergency is a fact the Court examines rather than a word it defers to.",
  economy: "The order reaches into the economy, where Congress holds the purse and the office holds the pen.",
  civil: "The order touches the rights of citizens, which the Court reads most narrowly against the office.",
};

const DEFAULT_DOMAIN_LINE = "The order reaches into a field the office shares with Congress.";

const HOLDING_LINES: Readonly<Record<CourtHolding, string>> = {
  "struck-down": "The order exceeds the office and is set aside; what it did is undone.",
  upheld: "The order is within the office and stands.",
};

const DISSENT_LINES: Readonly<Record<CourtHolding, string>> = {
  "struck-down": "The dissent would have left the order in force: how far the office reaches is for the political branches to contest, not for the Court to draw.",
  upheld: "The dissent would have set the order aside: an office that can do this without Congress can do most things without it.",
};

/** The question a case puts to the bench, in one sentence. */
export function caseQuestion(order: ExecutiveOrder, ground: ConstitutionalGround): string {
  if (ground === "forbidden") return `Whether ${order.name} may do what Congress has forbidden.`;
  if (ground === "authorized") return `Whether the statute Congress passed reaches what ${order.name} does.`;
  return `Whether the President may sign ${order.name} with Congress having said nothing.`;
}

function marginLine(majority: number, minority: number): string {
  if (majority < 6 && majority + minority < 6) throw new Error("A Supreme Court merits opinion requires six participating justices.");
  if (minority === 0) return "The Court is unanimous.";
  if (majority - minority <= 1) return `The Court divides ${majority} to ${minority}, and one vote decided it.`;
  return `The Court divides ${majority} to ${minority}.`;
}

export type OpinionText = { readonly majority: string; readonly dissent?: string };

/** The majority's paragraph, and the dissent's where there was one. */
export function composeOpinion(order: ExecutiveOrder, ground: ConstitutionalGround, holding: CourtHolding, majority: number, minority: number): OpinionText {
  const majorityText = [GROUND_LINES[ground], DOMAIN_LINES[order.domain] ?? DEFAULT_DOMAIN_LINE, HOLDING_LINES[holding], marginLine(majority, minority)].join(" ");
  return minority > 0 ? { majority: majorityText, dissent: DISSENT_LINES[holding] } : { majority: majorityText };
}
