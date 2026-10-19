import { raiseForFamily, type CaseKind, type CaseRaise, type GameDate } from "@admin/engine";
import type { AttentionItem } from "./attention-row";

// The shape every family source yields, kept apart from the sources themselves
// so the commodity and emergency families can build one without importing the
// module that gathers them.

export type FamilySource = {
  readonly raise: CaseRaise;
  /** The row the attention composer ranks. Its id is the case id. */
  readonly row: AttentionItem;
  /** Where the family's own act is taken: the bill, the office, the budget, the emergency board, the world. */
  readonly door: { readonly href: string; readonly label: string };
  /** Governor Guard asks this case carries as its act, by state. */
  readonly guardStates?: readonly string[];
  /** The standing matter the case is about, where it has its own record: a relief request's emergency. */
  readonly context?: CaseContext;
};

/** What a case is about, in the words and at the door of the matter's own record. */
export type CaseContext = { readonly title: string; readonly line: string; readonly href: string };

export function familyRaise(kind: CaseKind, id: string, title: string, subject: CaseRaise["subject"], dueAt?: GameDate): CaseRaise {
  return raiseForFamily({ kind, id, title, subject, ...(dueAt === undefined ? {} : { dueAt }) });
}
