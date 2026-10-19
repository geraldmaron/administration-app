import type { Charter, IdeologyVector } from "@admin/world";
import type { BenchMember } from "./judiciary.js";
import type { ConstitutionalGround } from "./legislative-acts.js";
import type { ExecutiveOrder } from "./orders.js";
import { type Campaign, type PersonRuntime } from "./state.js";
/**
 * How much of a check the charter's own institutions actually are.
 *
 * A judiciary and an assembly are the two bodies that can refuse an order, and
 * a charter that seats neither — a junta compact answers to an officers'
 * council, not a court — is one where an order is contested by the people who
 * could remove the player instead, which is a rarer and far worse event. The
 * floor is what keeps a charter with no courts from being a free hand.
 */
export declare function institutionalCheck(charter: Charter): number;
/**
 * What the three grounds do to the institutional reading of an order.
 *
 * Silence leaves it exactly where it was, which is what makes this a widening
 * of the model rather than a retune of it: an order nobody has legislated about
 * is priced today the way it was priced before Congress could speak at all.
 *
 * Exported because the challenge and the strike-down are the same question put
 * to two bodies, and the relief a statute buys has to be the same size at both
 * or a player would read one number before signing and meet another at the
 * bench.
 */
export declare function groundFactor(ground: ConstitutionalGround): number;
/**
 * What the administration's own record does to it. Only contested orders count:
 * an order nobody challenged did not establish that this government reaches too
 * far, and counting it would make the mere use of the instrument the offense
 * rather than the overreach.
 */
export declare function accumulatedOverreach(campaign: Campaign): number;
/**
 * The seated minister's effect on a challenge.
 *
 * Competence defends the order — a well-drafted instrument survives review —
 * and loyalty is the other half: a minister who does not want to be holding
 * this is a minister the challengers can talk to. Both are read off the same
 * Person the rest of the cabinet model reads, and a vacant chair is priced at
 * neither end, because a ministry with nobody in it neither defends the order
 * nor betrays it.
 */
export declare function ministerSway(minister: PersonRuntime | undefined): number;
export declare function orderDomainLean(order: ExecutiveOrder): IdeologyVector;
export declare function ideologyDistanceFromLean(ideology: IdeologyVector, lean: IdeologyVector): number;
/**
 * How likely a challenged order is to be struck down.
 *
 * Read off the same overreach the challenge itself was read off, because it is
 * the same question asked by a different body. When a bench is provided, the
 * median distance from the order's domain lean and the bench's own
 * integrity/competence add uncertainty rather than turning review into a
 * partisan scoreboard.
 *
 * `ground` is the third thing the bench actually asks, and the one the model
 * had no way to represent: whether Congress has authorized the act, said
 * nothing about it, or forbidden it. It is passed already resolved rather than
 * as the campaign so that this module stays readable from the case file without
 * pulling in the statute book.
 */
export declare function strikeDownChance(charter: Charter, order: ExecutiveOrder, bench?: readonly BenchMember[], ground?: ConstitutionalGround): number;
/**
 * One justice's inclination to strike, read off the same terms as the
 * bench's odds with their own ideology and skill in place of the medians. The
 * bench's odds stay the median formula above; this is what orders the votes
 * behind them, never what decides the holding.
 */
export declare function justiceStrikePropensity(charter: Charter, order: ExecutiveOrder, member: BenchMember, ground?: ConstitutionalGround): number;
