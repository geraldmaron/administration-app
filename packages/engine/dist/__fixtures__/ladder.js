import { resolveAction } from "../resolution.js";
// A campaign's own streams with the resolution draw pinned to 0, which is
// below every reachable success chance. Only the outcome coin is replaced:
// jitter, consequence draws and everything else still come from the real
// seed, so a forced landing stays deterministic and stays honest about
// magnitudes.
function alwaysLands(streams) {
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
export function landRung(campaign, actor, target, instrument, rung, streams, source = "action") {
    return resolveAction(campaign, { actor, target, instrument, rung }, alwaysLands(streams), source);
}
