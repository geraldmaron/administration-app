import { orderChair, type Campaign } from "@admin/engine";
import { charterOf, formatMoney, roleTitle, weeksWords, type ChoiceTable, type OrderDesk, type OrderEffectLine } from "@admin/player-core";
import { stateById } from "@admin/world";

/**
 * The operative terms of one order, read once from the desk so the draft the
 * President reviews and the page that is signed say the same thing. A signed
 * page keeps the object it was signed from, so editing or re-reading the desk
 * later never rewrites it.
 */
export type OrderTerms = {
  readonly reference: string;
  readonly name: string;
  readonly purpose: string;
  /** "The whole country" or the count of states it lands on. */
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
  readonly authority: { readonly name: string; readonly cite: string; readonly limit: string } | undefined;
};

const cellText = (desk: OrderDesk, rowId: string): string | undefined => desk.comparison.rows.find((row) => row.id === rowId)?.cells[1]?.text;

function departmentWords(campaign: Campaign, desk: OrderDesk): string {
  const chair = orderChair(campaign, desk.order);
  if (!chair) return "No department is named for it in this charter";
  const title = roleTitle(chair as string, charterOf(campaign).roleTitles);
  const holder = desk.projection.minister?.base.name;
  return holder ? `${title}, ${holder}` : `${title} (the seat is empty)`;
}

function scopeWords(desk: OrderDesk): string {
  if (desk.order.id === "order-defense-production") return "One existing federal precision-fires order at a modeled named supplier";
  const count = desk.states.length;
  if (count === 0) return "The whole country; no state is singled out";
  if (desk.order.id === "order-relief-program") return `${count} ${count === 1 ? "state receives" : "states receive"} disaster relief`;
  const helped = desk.states.filter((entry) => entry.helps).length;
  return `${count} ${count === 1 ? "state" : "states"}; ${helped} gain and ${count - helped} bear the cost`;
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
    recurring: order.id === "order-defense-production" ? "Weekly production-line priority, bounded by the outstanding contract" : "None modeled: the order lands once",
    department: departmentWords(campaign, desk),
    timing: order.id === "order-defense-production" ? "Priority begins on signature; deliveries depend on weekly line capacity"
      : desk.landsInWeeks === 0 ? "Takes effect the day it is signed" : `A rule: the departments write it, and it takes effect ${weeksWords(desk.landsInWeeks)} after signing`,
    challenge: cellText(desk, "challenge") ?? "Not assessed",
    attorneyGeneral: review ? `${review.reviewer.base.name}, the Attorney General, ${review.objects ? "objects in writing" : "clears it"}` : undefined,
    excepted: order.excepted === true,
    authority: desk.authority ? { name: desk.authority.name, cite: desk.authority.cite, limit: desk.authority.limit } : undefined,
  };
}

/** The rows of the comparison that carry risk and politics; the rest of its rows are terms, said once in the rail and the page. */
const RISK_ROWS: ReadonlySet<string> = new Set(["challenge", "review", "politics", "pledges"]);

/** The desk's comparison cut to what the terms do not already say. */
export function riskTable(desk: OrderDesk): ChoiceTable {
  return { columns: desk.comparison.columns, rows: desk.comparison.rows.filter((row) => RISK_ROWS.has(row.id)) };
}
