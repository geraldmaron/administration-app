import type { Charter, PersonId } from "@admin/world";
import type { ConstitutionalGround } from "./legislative-acts.js";
import { type BenchMember } from "./judiciary.js";
import type { ExecutiveOrder } from "./orders.js";
import { type Campaign } from "./state.js";
import type { CourtHolding, CourtVote } from "./state-judiciary.js";
import type { ExecutiveOrderRecord } from "./state-orders.js";
export type JusticeOnBench = {
    readonly person: PersonId;
    readonly seat: number;
    readonly senior: boolean;
    readonly member: BenchMember;
    readonly recused?: boolean;
};
export declare function benchForVotes(campaign: Campaign, challenged?: ExecutiveOrderRecord): readonly JusticeOnBench[];
export type CourtDecision = {
    readonly disposition: "majority" | "equal-division" | "no-quorum";
    readonly holding?: CourtHolding;
    readonly votes: readonly CourtVote[];
    readonly majorityAuthor?: PersonId;
    readonly dissentAuthor?: PersonId;
    readonly majority: number;
    readonly minority: number;
};
/** Probability over the same uniform case draw used by decideCase; a tie keeps the lower judgment. */
export declare function majorityStrikeChance(charter: Charter, order: ExecutiveOrder, bench: readonly JusticeOnBench[], ground: ConstitutionalGround, lower: CourtHolding, meritsChance?: (member: BenchMember) => number | undefined): number | undefined;
/** All votes read the same case uncertainty. A justice's own legal threshold determines their vote. */
export declare function decideCase(charter: Charter, order: ExecutiveOrder, bench: readonly JusticeOnBench[], ground: ConstitutionalGround, draw: number, _caseId: string, meritsChance?: (member: BenchMember) => number | undefined): CourtDecision;
