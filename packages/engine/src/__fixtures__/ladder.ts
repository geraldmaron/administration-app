import type { Campaign } from "../state.js";
import type { EffectSource } from "../effects.js";
import type { InstrumentId, RungLevel } from "../instruments.js";
import type { RngStreams } from "../rng.js";
import { resolveAction, type ResolutionResult } from "../resolution.js";
import type { NationId } from "@admin/world";

// A campaign's own streams with the resolution draw pinned to 0, which is
// below every reachable success chance. Only the outcome coin is replaced:
// jitter, consequence draws and everything else still come from the real
// seed, so a forced landing stays deterministic and stays honest about
// magnitudes.
function alwaysLands(streams: RngStreams): RngStreams {
  return {
    stream(...keyParts) {
      const real = streams.stream(...keyParts);
      return keyParts[0] === "resolution" ? { ...real, next: () => 0 } : real;
    },
  };
}

/**
 * Run one rung of the ladder through the resolver and force it to land.
 *
 * The engine has exactly one commit path (`resolveAction`), and a rung that
 * lands or fails on the seed is the right behavior for the game but the wrong
 * behavior for a test asserting what a rung *does*. This pins the outcome coin
 * so the rung's own effects are the ones under test, without giving the engine
 * a second entry point that could drift from the one the player uses.
 */
export function landRung(
  campaign: Campaign,
  actor: NationId,
  target: NationId,
  instrument: InstrumentId,
  rung: RungLevel,
  streams: RngStreams,
  source: EffectSource = "action",
): ResolutionResult {
  return resolveAction(campaign, { actor, target, instrument, rung }, alwaysLands(streams), source);
}
