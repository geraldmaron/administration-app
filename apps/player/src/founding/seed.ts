// The campaign seed a founding opens on: two words and a number, so a player
// can read it aloud, write it down and type it again to found the same world.

const FIRST = [
  "amber", "brass", "cedar", "copper", "granite", "harbor", "iron", "juniper",
  "lantern", "maple", "meadow", "northern", "prairie", "quarry", "river", "saddle",
  "silver", "summit", "timber", "valley", "walnut", "western", "willow", "winter",
] as const;

const SECOND = [
  "anchor", "beacon", "bridge", "canyon", "charter", "compass", "courthouse", "crossing",
  "depot", "ferry", "foundry", "gazette", "junction", "landing", "ledger", "lighthouse",
  "mill", "outpost", "pioneer", "railway", "ridge", "signal", "square", "trail",
] as const;

function pick<T>(items: readonly T[], random: () => number): T {
  return items[Math.floor(random() * items.length) % items.length]!;
}

/** A fresh seed nobody typed, such as "cedar-junction-417". */
export function readableSeed(random: () => number = Math.random): string {
  const number = 100 + Math.floor(random() * 900);
  return `${pick(FIRST, random)}-${pick(SECOND, random)}-${number}`;
}

/** The seed a founding actually uses: what the field says, or the last one that said anything. */
export function usableSeed(text: string, lastValid: string): string {
  const trimmed = text.trim();
  return trimmed.length > 0 ? trimmed : lastValid;
}
