import { actingEffects, selectAppointableFor, type Campaign, type OfficeId } from "@admin/engine";
import type { Person, PersonId, RoleId } from "@admin/world";
import type { ComparisonCell } from "../conversation/decision-comparison.js";
import { pricedRows, type PricedOption } from "../government/act-price.js";
import { judgeAttribute, type AttributeJudgment } from "../government/machine-readings.js";

// Who could act in an empty seat, side by side on banded readings rather than
// figures; the empty seat's own cost is the shortlist's waiting line. Nominating somebody is the
// appointments desk (appointments/desk.ts); acting is the one fill that
// needs no Senate, so it keeps its own short list.

/** A row cell the shortlist adds to the decision comparison's: a banded reading. */
export type ShortlistCell = ComparisonCell | { readonly kind: "band"; readonly judgment: AttributeJudgment };

export type ShortlistRow = { readonly id: string; readonly label: string; readonly cells: readonly ShortlistCell[] };

export type ShortlistOption = PricedOption & { readonly person?: PersonId; readonly name?: string };

export type Shortlist = {
  readonly mode: "acting";
  readonly options: readonly ShortlistOption[];
  readonly rows: readonly ShortlistRow[];
  /** What leaving the seat empty costs, said beside the names, never as one. */
  readonly waiting: string;
};

/** How many names a shortlist sets: enough to choose between, few enough to read on a phone. */
export const SHORTLIST_SIZE = 4;

function readingRows(people: readonly Person[]): readonly ShortlistRow[] {
  return (["competence", "loyalty"] as const).map((attribute) => ({
    id: attribute,
    label: attribute === "competence" ? "Competence" : "Loyalty",
    cells: people.map((person) => ({ kind: "band" as const, judgment: judgeAttribute(attribute, person[attribute]) })),
  }));
}

/**
 * The acting shortlist for a chair the law lets somebody act in: who could sign
 * for it tomorrow. The bench is the cabinet seat's own, or
 * for an agency the department's above it, which is where a deputy comes from.
 */
export function actingShortlist(campaign: Campaign, seat: RoleId | OfficeId, benchRole: RoleId | undefined, limitDays: number | undefined, limit: number = SHORTLIST_SIZE): Shortlist {
  const candidates = benchRole ? selectAppointableFor(campaign, benchRole).map((runtime) => runtime.base) : [];
  const people = candidates.filter((person) => actingEffects(campaign, seat, person.id).ok).slice(0, limit);
  const serves = limitDays !== undefined ? `Can serve up to ${limitDays} days unless you send the Senate a nominee` : "Serves until the Senate confirms someone";
  const options: ShortlistOption[] = people.map((person) => ({
    id: person.id as string,
    label: person.name,
    person: person.id,
    name: person.name,
    follows: [`${person.name} fills in without being confirmed. ${serves}.`],
  }));
  return { mode: "acting", options, rows: [...readingRows(people), ...pricedRows(campaign, options)], waiting: "Until someone fills in, nobody is in charge, and the office does its weakest work." };
}
