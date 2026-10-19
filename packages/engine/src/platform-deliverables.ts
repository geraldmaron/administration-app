import type { PlankId } from "@admin/world";
import { compareDates, selectDateOfTurn } from "./clock.js";
import { executiveOrder } from "./orders.js";
import { heldOutcome } from "./pledge-outcomes.js";
import { POLICY_DOMAIN_SPECS, policyStance, selectPolicyStance, type PolicyDomain } from "./policy.js";
import type { AlignmentVector, Campaign, GameDate } from "./state.js";
import { isOrderCourtSuspended, prospectiveOrderAuthority } from "./order-authority.js";

// What each plank of the platform commits the administration to, in terms the
// engine can check.
//
// The world's plank table says what a player reads and who a plank is written
// for; it cannot name a stance or an order, because it cannot see the catalogs
// those live in. This table is the other half: one deliverable per plank, each
// on a program or an order already in the game, so every pledge made on a
// plank can be settled kept or broken without a new system to settle it.
//
// Three kinds, and the split is about what the promise was:
//
//   - hold-program: an economic plank. The platform opens the term on the
//     program, so the promise is to keep it. It is kept on the due date if the
//     program is still in force, and broken the week it is dropped.
//   - adopt-program: a program the President still has to put in place. Kept
//     the week it becomes the domain's program, broken if the due date passes
//     first.
//   - sign-order: an order the President still has to sign. Kept the week it
//     is signed and stands, broken if the due date passes first.
//
// No plank rests on a bill. A bill needs sixty senators or the budget track,
// and a pledge settled on one would punish the President for the cloture rule
// rather than for anything they chose.

export type PlankDeliverable =
  | { readonly kind: "hold-program"; readonly domain: PolicyDomain; readonly stance: string }
  | { readonly kind: "adopt-program"; readonly domain: PolicyDomain; readonly stance: string }
  | { readonly kind: "sign-order"; readonly order: string };

const PLANK_DELIVERABLES: Readonly<Record<string, PlankDeliverable>> = {
  "plank-balanced-budget": { kind: "hold-program", domain: "fiscal", stance: "fiscal-austerity" },
  "plank-rebuild-infrastructure": { kind: "hold-program", domain: "fiscal", stance: "fiscal-investment" },
  "plank-fair-share": { kind: "hold-program", domain: "fiscal", stance: "fiscal-redistribution" },
  "plank-energy-dominance": { kind: "hold-program", domain: "industry", stance: "industry-extraction" },
  "plank-clean-energy": { kind: "hold-program", domain: "industry", stance: "industry-transition" },
  "plank-fair-trade": { kind: "hold-program", domain: "trade", stance: "trade-protective" },
  "plank-secure-border": { kind: "sign-order", order: "order-border-controls" },
  "plank-rebuild-military": { kind: "adopt-program", domain: "defense", stance: "defense-rearmament" },
  "plank-reform-policing": { kind: "adopt-program", domain: "security", stance: "security-community" },
  "plank-open-government": { kind: "adopt-program", domain: "civil", stance: "civil-open-society" },
};

/** What a plank commits the administration to, or nothing for a plank the engine does not know. */
export function plankDeliverable(plank: PlankId | string): PlankDeliverable | undefined {
  return PLANK_DELIVERABLES[plank as string];
}

/**
 * Whether a plank can be promised for the first hundred days. A program the
 * platform opens the term on is already in force on the first day, so a
 * hundred-day promise on it would be kept by doing nothing.
 */
export function plankFitsFirstHundredDays(plank: PlankId | string): boolean {
  const deliverable = plankDeliverable(plank);
  return deliverable !== undefined && deliverable.kind !== "hold-program";
}

/** Which way the plank's program or order pushes, on the axes every cohort's politics sit on. */
export function plankAlignment(deliverable: PlankDeliverable): Partial<AlignmentVector> {
  if (deliverable.kind === "sign-order") return executiveOrder(deliverable.order)?.alignment ?? {};
  return policyStance(deliverable.stance)?.alignment ?? {};
}

// An order signed before the pledge was made was not signed to keep it.
function orderStands(campaign: Campaign, order: string, madeDate: GameDate): boolean {
  return campaign.orders.some(
    (record) =>
      record.order === order &&
      prospectiveOrderAuthority(campaign, record.id) !== "ended" &&
      !isOrderCourtSuspended(campaign, record.id) &&
      compareDates(selectDateOfTurn(campaign, record.turn), madeDate) >= 0,
  );
}

/**
 * Whether the thing the plank promised is true of the campaign right now: the
 * program is the domain's program, or the order is signed and not struck down.
 */
export function deliverableInForce(campaign: Campaign, deliverable: PlankDeliverable, madeDate: GameDate): boolean {
  if (deliverable.kind === "sign-order") return orderStands(campaign, deliverable.order, madeDate);
  return selectPolicyStance(campaign, deliverable.domain).id === deliverable.stance;
}

/** What a plank does and what settles it, in the sentences a player reads beside it. */
export type PlankTerms = {
  /** What the platform puts in force at the oath, for a plank that opens the term on a program. */
  readonly opensOn?: string;
  readonly keptWhen: string;
  readonly brokenWhen: string;
};

/** "the fiscal program", "the civil liberties program": a domain's program inside a sentence. */
export function programWords(domain: PolicyDomain): string {
  return `the ${POLICY_DOMAIN_SPECS[domain].name.toLowerCase()} program`;
}

/** The program or the order a deliverable names, as it reads inside a sentence. */
export function deliverableName(deliverable: PlankDeliverable): string {
  if (deliverable.kind === "sign-order") {
    const order = executiveOrder(deliverable.order);
    return order ? `the order to ${order.name.charAt(0).toLowerCase()}${order.name.slice(1)}` : deliverable.order;
  }
  return policyStance(deliverable.stance)?.name ?? deliverable.stance;
}

/** The terms of a plank, or nothing for a plank the engine does not know. */
export function plankTerms(plank: PlankId | string): PlankTerms | undefined {
  const deliverable = plankDeliverable(plank);
  if (!deliverable) return undefined;
  const name = deliverableName(deliverable);
  switch (deliverable.kind) {
    case "hold-program":
      return {
        opensOn: `The term opens on ${name} as ${programWords(deliverable.domain)}.`,
        keptWhen: `Kept if ${name} is still ${programWords(deliverable.domain)} on the due date and ${heldOutcome(deliverable.stance)?.keptWhen ?? "it has delivered"}.`,
        brokenWhen: `Broken the week ${programWords(deliverable.domain)} changes.`,
      };
    case "adopt-program":
      return {
        keptWhen: `Kept the week ${name} becomes ${programWords(deliverable.domain)}.`,
        brokenWhen: `Broken if ${name} isn't in place by the due date.`,
      };
    case "sign-order":
      return {
        keptWhen: `Kept the week ${name} is signed.`,
        brokenWhen: `Broken if ${name} isn't signed by the due date.`,
      };
  }
}
