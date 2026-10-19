import { statehouseStance, type Campaign, type StatehouseStance } from "@admin/engine";
import type { StateId } from "@admin/world";

// What a governor's statehouse is doing with the administration's programs, in
// the one line the governor's card has room for. The stance is the engine's;
// the words are the room's.

export type StatehouseReading = {
  readonly stance: StatehouseStance;
  readonly line: string;
};

function lineFor(stance: StatehouseStance, state: string): string {
  switch (stance) {
    case "partner":
      return `${state} runs your programs through its own state agencies.`;
    case "arms-length":
      return `${state} works with you when it helps the state and keeps its distance otherwise.`;
    case "refusing":
      return `${state} is dragging its feet on federal programs, and its governor is campaigning against you.`;
  }
}

/** One statehouse's stance and its line. Undefined where no governor is seated. */
export function statehouseReading(campaign: Campaign, state: StateId): StatehouseReading | undefined {
  const stance = statehouseStance(campaign, state);
  if (!stance) return undefined;
  const name = campaign.states[state]?.base.name ?? (state as string);
  return { stance, line: lineFor(stance, name) };
}
