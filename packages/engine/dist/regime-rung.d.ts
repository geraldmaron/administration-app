import type { NationId } from "@admin/world";
import type { Effect } from "./effect-types.js";
import { type CapabilityCheck, type InstrumentContext } from "./instrument-gates.js";
import type { Campaign } from "./state.js";
import type { RegimeAct } from "./state-world.js";
/** The act a covert regime action runs when the actor names none. */
export declare const DEFAULT_REGIME_ACT: RegimeAct;
/** Whether an act runs under a covert finding and tradecraft, rather than as a use of force or a Justice Department filing. */
export declare function isCovertRegimeAct(act: RegimeAct): boolean;
/** The counsel's reading a lethal operation rests on, for the review sheet: the ground that takes it outside the ban. */
export declare function lethalGround(campaign: Campaign, actor: NationId, target: NationId): "armed-conflict" | "imminent-threat" | undefined;
/**
 * Why a lethal operation against this leader cannot be authorized, or nothing.
 *
 * EO 12333 §2.11 and 18 U.S.C. §1116 stay in force: the executive does not
 * amend them. What it can do is conclude that a particular killing is an act in
 * an armed conflict or lawful self-defense against an imminent threat, which
 * takes it outside "assassination", and it can never reach an ally.
 */
export declare function lethalRefusal(campaign: Campaign, actor: NationId, target: NationId): string | undefined;
/** The share of lethal removals that come out, whatever the cover: no such operation stays quiet for long. Design judgment, labeled. */
export declare const LETHAL_EXPOSURE_CHANCE = 0.6;
/** Why a leader cannot be taken into custody, or nothing: the President's government only, an open indictment, and no treaty ally unless a war stands between them. */
export declare function captureRefusal(campaign: Campaign, actor: NationId, target: NationId): string | undefined;
/** Why an indictment cannot be filed, or nothing: only the President's Justice Department files, once per leader, and not against the government of a treaty ally. */
export declare function indictRefusal(campaign: Campaign, actor: NationId, target: NationId): string | undefined;
/** What every regime act needs on top of the rung's own capability gate. */
export declare function regimeActGate(ctx: InstrumentContext): CapabilityCheck;
/** The regime rung's effects, by the act chosen. */
export declare function regimeActResolve(ctx: InstrumentContext): readonly Effect[];
/** The rung's capability gate. Capture and indictment answer to their own gate, not to tradecraft or covert reach. */
export declare function regimeCapabilityGate(ctx: InstrumentContext, reach: CapabilityCheck): CapabilityCheck;
