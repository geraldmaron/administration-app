import { describe, expect, it } from "vitest";
import { foundedForBalance } from "./balance-harness.js";
import { NPC_REGIME_OPERATIONS } from "./coercion-tempo.js";
import { nuclearArmed } from "./regime-acts.js";
import { npcRegimeStart } from "./regime-npc.js";
import type { Campaign } from "./state.js";
import type { RegimeOperation } from "./state-world.js";

const base = foundedForBalance("regime-npc").campaign;
const starts = (campaign: Campaign, weeks = 400) =>
  Array.from({ length: weeks }, (_, i) => npcRegimeStart({ ...campaign, turn: campaign.turn + i })).filter((packet) => packet !== undefined);

describe("other governments' regime operations", () => {
  it("start now and then, never by the President's government and never against a nuclear-armed one", () => {
    const packets = starts(base);
    expect(packets.length).toBeGreaterThan(0);
    for (const packet of packets) {
      const op = packet!.effects.find((effect) => effect.kind === "regime") as { readonly upsert: RegimeOperation } | undefined;
      if (!op) continue;
      expect(op.upsert.sponsor).not.toBe(base.founding.nation);
      expect(nuclearArmed(base, op.upsert.target)).toBe(false);
    }
  });

  it("are the same on the same week of the same campaign", () => {
    expect(npcRegimeStart({ ...base, turn: base.turn + 7 })).toEqual(npcRegimeStart({ ...base, turn: base.turn + 7 }));
  });

  it("stop once the term's cap is spent", () => {
    const entries = Array.from({ length: NPC_REGIME_OPERATIONS.perTerm }, (_, i) => ({ family: NPC_REGIME_OPERATIONS.id, key: `X${i}>Y${i}`, actor: "X" as never, turn: base.turn, keepUntil: base.turn + 1000 }));
    // Within the term the six already spent stand; the ledger looks back 208 weeks.
    expect(starts({ ...base, npcTempo: entries }, 200).length).toBe(0);
  });
});
