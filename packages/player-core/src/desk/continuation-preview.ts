import { compareDates, type Campaign, type GameDate } from "@admin/engine";
import { attentionItems } from "./attention";

// What Continue will run to, said before the press: the
// continuation preview. `advanceUntilAttention` has no forward projection of
// its own — it runs the world and reports what stopped it, after the fact —
// so this reads the docket instead: the nearest dated matter already on the
// board. Every one of them is a matter that will eventually present itself
// once its date arrives (a bill's constitutional clock, an appropriations
// deadline, the calendar), which is the same set `routes/index.tsx`'s "Ahead"
// list already shows; this file names the single soonest of them, for the
// one line beside the button that spends the week.

export type ContinuationHorizon = {
  readonly title: string;
  readonly dueDate: GameDate;
};

/**
 * The nearest dated matter not already presented this week — the soonest
 * date Continue could run into. Undefined on a board with nothing dated
 * ahead, which is a true quiet stretch, not a gap in this reading.
 */
export function continuationHorizon(campaign: Campaign): ContinuationHorizon | undefined {
  const dated = attentionItems(campaign)
    .filter((item): item is typeof item & { dueDate: GameDate } => item.urgency === "ambient" && item.dueDate !== undefined)
    .sort((a, b) => compareDates(a.dueDate, b.dueDate));
  const nearest = dated[0];
  return nearest ? { title: nearest.title, dueDate: nearest.dueDate } : undefined;
}
