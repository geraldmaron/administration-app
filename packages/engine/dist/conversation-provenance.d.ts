import { type CausalProvenance } from "./causality.js";
import type { ConversationScript } from "./conversations.js";
import type { Effect, EffectPacket } from "./effect-types.js";
import type { Campaign } from "./state.js";
/**
 * The stamp a spoken decision carries.
 *
 * It is observed because the words were said rather than inferred. The script
 * carries the access of the room: a classified briefing stays classified even
 * when the President gives an answer. Both governments are named, not only the
 * capital spoken to: the exchange between two capitals is a thread, and a
 * thread with one end on it is not one anything can walk.
 */
export declare function decisionProvenance(campaign: Campaign, script: ConversationScript, effects: readonly Effect[]): CausalProvenance;
/**
 * A packet another module built, given the situation's own place in the graph.
 *
 * The resolver and the conflict writer each stamp what they know — a covert
 * order is not public, an instrument names its own subsystem — and neither of
 * them has ever heard of the situation that put the decision on the desk. So
 * what they stamped wins on every field they set, and the three fields this
 * knows more about, the causes, the markers and the places, are the union of
 * both.
 */
export declare function stampedDecision(campaign: Campaign, script: ConversationScript, packet: EffectPacket): EffectPacket;
