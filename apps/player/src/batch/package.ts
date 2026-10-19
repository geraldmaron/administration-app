import { apply, type Campaign, type EffectPacket } from "@admin/engine";

/** One line of a package as the builder reads it: the subject and whatever the screen needs to price it. */
export type PackageLine<T> = { readonly key: string; readonly label: string; readonly terms: T };

/**
 * Every line's packet, each priced on the world the lines before it leave
 * behind, so N acts committed as one run (the store's commitAll) are the same
 * N acts taken one after another. `packetOf` throws, in the player's words,
 * when a line can no longer be taken once the earlier lines are in.
 */
export function buildSequential<T>(basis: Campaign, lines: readonly PackageLine<T>[], packetOf: (campaign: Campaign, line: PackageLine<T>) => EffectPacket): readonly EffectPacket[] {
  return lines.reduce<{ readonly running: Campaign; readonly packets: readonly EffectPacket[] }>(
    (built, line) => {
      const packet = packetOf(built.running, line);
      return { running: apply(built.running, packet), packets: [...built.packets, packet] };
    },
    { running: basis, packets: [] },
  ).packets;
}
