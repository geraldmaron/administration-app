import type { ChamberVote } from "./state-legislature.js";

export type BudgetSubject = "spending" | "revenue" | "debt-limit";

/** A committee instruction belongs to Congress, not to a law or the President's signing desk. */
export type BudgetResolution = {
  readonly id: string;
  readonly fiscalYear: number;
  readonly subject: BudgetSubject;
  readonly committee: string;
  readonly actId: string;
  readonly billId: string;
  readonly requestedTurn: number;
  readonly votes: readonly ChamberVote[];
  readonly adopted: boolean;
};
