import type { Campaign } from "../state.js";
import type { EffectSource } from "../effects.js";
import type { InstrumentId, RungLevel } from "../instruments.js";
import type { RngStreams } from "../rng.js";
import { type ResolutionResult } from "../resolution.js";
import type { NationId } from "@admin/world";
/**
 * Run one rung of the ladder through the resolver and force it to land.
 *
 * The engine has exactly one commit path (`resolveAction`), and a rung that
 * lands or fails on the seed is the right behavior for the game but the wrong
 * behavior for a test asserting what a rung *does*. This pins the outcome coin
 * so the rung's own effects are the ones under test, without giving the engine
 * a second entry point that could drift from the one the player uses.
 */
export declare function landRung(campaign: Campaign, actor: NationId, target: NationId, instrument: InstrumentId, rung: RungLevel, streams: RngStreams, source?: EffectSource): ResolutionResult;
