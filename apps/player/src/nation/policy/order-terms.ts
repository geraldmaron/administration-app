import { orderChair, type Campaign, type OrderAuthority } from "@admin/engine";
import { charterOf, formatMoney, roleTitle, weeksWords, type ChoiceTable, type OrderDesk, type OrderEffectLine } from "@admin/player-core";
import { stateById } from "@admin/world";

/**
 * The operative terms of one order, read once from the desk so the draft the
 * President reviews and the page that is signed say the same thing. A signed
 * page keeps the object it was signed from, so re-reading the desk later never
 * rewrites it.
 */
export type OrderTerms = {
  readonly reference: string;
  readonly name: string;
  readonly purpose: string;
  readonly scope: string;
  readonly landed: readonly { readonly name: string; readonly helps: boolean }[];
  readonly changes: readonly OrderEffectLine[];
  readonly costNow: string;
  readonly debt: string | undefined;
  readonly recurring: string;
  readonly department: string;
  readonly timing: string;
  readonly challenge: string;
  readonly attorneyGeneral: string | undefined;
  readonly excepted: boolean;
  readonly authority: OrderAuthority | undefined;
};

const cellText = (desk: OrderDesk, rowId: string): string | undefined => desk.comparison.rows.find((row) => row.id === rowId)?.cells[1]?.text;

function departmentWords(campaign: Campaign, desk: OrderDesk): string {
  const chair = orderChair(campaign, desk.order);
  if (!chair) return "No department is in charge of this";
  const title = roleTitle(chair as string, charterOf(campaign).roleTitles);
  const holder = desk.projection.minister?.base.name;
  return holder ? `${title}, ${holder}` : `${title} (nobody holds this job right now)`;
}

export function scopeWords(desk: Pick<OrderDesk, "order" | "states">): string {
  if (desk.order.id === "order-defense-production") return "One existing federal order for precision weapons, from one named supplier in the game";
  const count = desk.states.length;
  if (count === 0) return "The whole country, with no state singled out";
  if (desk.order.id === "order-relief-program") return `${count} ${count === 1 ? "state receives" : "states receive"} disaster relief`;
  const helped = desk.states.filter((entry) => entry.helps).length;
  return `${count} ${count === 1 ? "state" : "states"} affected, ${helped} helped and ${count - helped} paying the cost`;
}

export function orderTerms(campaign: Campaign, desk: OrderDesk): OrderTerms {
  const { order, projection } = desk;
  const review = projection.review;
  return {
    reference: order.id,
    name: order.name,
    purpose: order.summary,
    scope: scopeWords(desk),
    landed: desk.states.map((entry) => ({ name: stateById.get(entry.state)?.name ?? (entry.state as string), helps: entry.helps })),
    changes: desk.effects,
    costNow: cellText(desk, "cost") ?? "Nothing up front",
    debt: desk.debt !== 0 ? `Adds ${formatMoney(desk.debt)} to the debt in the first year` : undefined,
    recurring: order.id === "order-defense-production" ? "Each week the factory puts this contract first, until the order is filled" : "None. The order takes effect once",
    department: departmentWords(campaign, desk),
    timing: order.id === "order-defense-production" ? "The contract goes first as soon as you sign, and deliveries depend on what the factory can make each week" : desk.landsInWeeks === 0 ? "Takes effect the day you sign it" : `Departments have to write a rule first, so it takes effect ${weeksWords(desk.landsInWeeks)} after you sign`,
    challenge: cellText(desk, "challenge") ?? "Not known",
    attorneyGeneral: review ? `${review.reviewer.base.name}, the Attorney General, ${review.objects ? "objects in writing" : "approves it"}` : undefined,
    excepted: order.excepted === true,
    authority: desk.authority,
  };
}

/** The rows of the comparison that carry risk and politics; the rest are terms, said once on the page. */
const RISK_ROWS: ReadonlySet<string> = new Set(["challenge", "review", "politics", "pledges"]);

/** The desk's comparison cut to what the terms do not already say. */
export function riskTable(desk: Pick<OrderDesk, "comparison">): ChoiceTable {
  return { columns: desk.comparison.columns, rows: desk.comparison.rows.filter((row) => RISK_ROWS.has(row.id)) };
}

/**
 * What the order's authority says about the power, in plain words. An order
 * whose power the office has held only when Congress granted it names the act
 * that would have to pass before it can be signed again.
 */
export function authorityWords(authority: OrderAuthority | undefined): string {
  if (!authority) return "No law or part of the Constitution gives you this power, so you can't sign this order.";
  switch (authority.kind) {
    case "needs-act":
      return `Congress would have to pass a law giving you this power again. ${authority.name} (${authority.cite}) once did. Until a law like it is in effect, you can't sign this order. ${authority.limit}`;
    case "constitution":
      return `Your power here comes from the Constitution, in ${authority.name} (${authority.cite}). ${authority.limit}`;
    case "statute":
      return `Your power here comes from a law, ${authority.name} (${authority.cite}). ${authority.limit}`;
    case "regulation":
      return `Your power here comes from an agency rule, ${authority.name} (${authority.cite}). ${authority.limit}`;
  }
}
