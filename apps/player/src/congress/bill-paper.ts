import type { Bill, Chamber, GameDate } from "@admin/engine";

// What a bill's printed page needs that the record does not keep as such:
// the Congress and session it sits in, the chamber it came from, a bill
// number, and the line saying how it was introduced. Each is read from the
// record (the date, the first floor vote, who wrote it) so the same bill
// always prints the same way.

/** The First Congress met in 1789 and each lasts two years, so 2029 sits in the 121st. */
export function congressOf(year: number): number {
  return Math.floor((year - 1789) / 2) + 1;
}

/** A Congress's first session falls in its odd year. */
export function sessionOf(year: number): number {
  return year % 2 === 1 ? 1 : 2;
}

/** The chamber of the first floor vote on it, or the House while no chamber has voted. */
export function originOf(bill: Pick<Bill, "passage">): Chamber {
  return bill.passage[0]?.chamber ?? "house";
}

/** A bill number that stays the same for the same bill: "H. R. 4021", "S. 1187". */
export function billNumber(bill: Pick<Bill, "id" | "passage">): string {
  const hash = [...bill.id].reduce((sum, char) => (sum * 31 + char.charCodeAt(0)) % 9_000, 17);
  return `${originOf(bill) === "house" ? "H. R." : "S."} ${1000 + hash}`;
}

/** How the bill came in, in the wording the Congressional Record uses. */
export function introducedBy(bill: Pick<Bill, "sponsor">, opposition: string): string {
  if (bill.sponsor === "administration") return "Introduced the following bill at the request of the President, which was referred to the appropriate committees.";
  if (bill.sponsor === "bipartisan") return "Members of both parties introduced the following bill, which was referred to the appropriate committees.";
  return `${opposition} introduced the following bill, which was referred to the appropriate committees.`;
}

export function paperYear(date: GameDate): { readonly congress: number; readonly session: number } {
  return { congress: congressOf(date.year), session: sessionOf(date.year) };
}

/**
 * The objections a vetoed bill went back with. The engine keeps them only in
 * the Record line of the veto ("The President vetoes … and returns it to
 * Congress. {message}"), so they are read back from there; undefined when that
 * line is not on the record.
 */
export function vetoMessage(ledger: readonly { readonly turn: number; readonly description: string }[], bill: Pick<Bill, "title" | "resolvedTurn">): string | undefined {
  const opening = `The President vetoes ${bill.title} and returns it to Congress. `;
  const entry = ledger.find((record) => (bill.resolvedTurn === undefined || record.turn === bill.resolvedTurn) && record.description.startsWith(opening));
  const message = entry?.description.slice(opening.length).trim();
  return message ? message : undefined;
}
