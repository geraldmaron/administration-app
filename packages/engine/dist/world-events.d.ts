import { type NationId } from "@admin/world";
import { type Campaign } from "./state.js";
import type { TurnPhase } from "./turn-loop.js";
import { type StatedAct } from "./npc-response.js";
export { applyMembership, type MembershipEffect } from "./world-effects.js";
/** The pair's weekly clash hazard: zero while it rests, the base raised by the episode, damped by a guarantee. */
export declare function clashHazard(campaign: Campaign, actor: NationId, subject: NationId, acts: readonly StatedAct[]): number;
/**
 * The week's world events, on day 3 after the wars have moved. Each family
 * finds its occasions on the state the week opened this day with; the packets
 * are applied in order after the phase returns.
 */
export declare const worldEventPhase: TurnPhase;
