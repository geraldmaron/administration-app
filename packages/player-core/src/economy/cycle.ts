import { cycleWord, NO_CYCLE, type Campaign, type CyclePhase } from "@admin/engine";

// The business cycle as the room shows it: a position on a loop, never a
// window consumed (trap 7). The four phases repeat, so the rail this reading
// feeds marks only where the economy sits today — it never claims a phase
// already "done", because a loop has no such thing.

/** The loop's four phases, in the order the economy actually moves through them. */
export const CYCLE_PHASE_ORDER: readonly CyclePhase[] = ["expansion", "peak", "contraction", "trough"];

export type CycleReading = {
  readonly phase: CyclePhase;
  readonly word: string;
  /** Weeks since the economy entered this phase. */
  readonly weeksInPhase: number;
};

export function cycleReading(campaign: Campaign): CycleReading {
  const cycle = campaign.cycles[campaign.founding.nation] ?? NO_CYCLE;
  return {
    phase: cycle.phase,
    word: cycleWord(cycle),
    weeksInPhase: Math.max(0, campaign.turn - cycle.enteredTurn),
  };
}
