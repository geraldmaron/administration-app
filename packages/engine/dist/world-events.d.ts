import type { TurnPhase } from "./turn-loop.js";
export { applyMembership, type MembershipEffect } from "./world-effects.js";
/**
 * The week's world events, on day 3 after the wars have moved. Each family
 * finds its occasions on the state the week opened this day with; the packets
 * are applied in order after the phase returns.
 */
export declare const worldEventPhase: TurnPhase;
