import type { Charter, RoleId } from "@admin/world";
import { type PolicyDomain, type PolicyOutlookLine, type PolicySet, type PolicyStance } from "./policy.js";
import { type AlignmentVector, type Campaign } from "./state.js";
import type { EffectPacket } from "./effects.js";
import { type PolicyOpposition } from "./policy-teeth.js";
import type { MetricDeltas } from "./effect-types.js";
export type PolicyResult = {
    readonly ok: true;
    readonly packet: EffectPacket;
} | {
    readonly ok: false;
    readonly reason: string;
};
export type PolicyDraftInput = Partial<Record<PolicyDomain, string>>;
export type PolicyDraftLine = PolicyOutlookLine & {
    readonly previous: PolicyStance;
    readonly changed: boolean;
    readonly enactment: MetricDeltas;
};
export type PolicyDraftCandidate = {
    readonly policies: PolicySet;
    readonly changes: readonly PolicyDraftLine[];
    readonly lines: readonly PolicyDraftLine[];
    readonly enactment: MetricDeltas;
    readonly perTurn: MetricDeltas;
    /**
     * The approval rating this program is being weighed against, as it stands.
     *
     * Not a projection, and it used to be one: it read the headline composite
     * after the program's own metric deltas, so drafting a bill moved the number
     * on screen before the bill existed. The headline is now the public's, and a
     * program reaches the public through what it does to order, to the forces, to
     * standing and to the accounts, over the season the public takes to notice
     * (`OPINION_DRIFT`). There is no honest one-week figure to quote, so this
     * quotes today's and the surface says so.
     */
    readonly approvalNow: number;
};
export type PolicyDraftResult = {
    readonly ok: true;
    readonly candidate: PolicyDraftCandidate;
} | {
    readonly ok: false;
    readonly reason: string;
};
/**
 * Normalize a policy draft before any UI previews or commits it.
 *
 * This is the authoritative contract for the six-domain policy workspace: the
 * candidate is complete, gated, priced, and projected here, so a screen never
 * needs to reproduce multipliers, treasury conversion, approval derivation, or
 * effect combination. `enactPolicyDraft()` consumes this same candidate.
 */
export declare function projectPolicyDraft(campaign: Campaign, draft: PolicyDraftInput, charter?: Charter): PolicyDraftResult;
/**
 * What one standing stance would cost, before it is adopted.
 *
 * An order projects, a rung projects, a peace table projects, a veto projects —
 * and the one act a president takes that binds every week of the rest of the
 * term did not. The policy room could price a whole draft (`projectPolicyDraft`)
 * but a screen showing a single stance beside its siblings had no way to ask
 * "what does *this* one cost", so the standing program was the only decision in
 * the game with no price on it at the point of choosing.
 *
 * Same shape family as `projectOrder`: what it costs, what it is worth, who
 * carries it, whether it can be taken at all, and one sentence saying why the
 * answer is what it is. Pure and seed-independent, and it reaches the same
 * `projectPolicyDraft` the enactment path runs, so the price shown and the
 * price charged cannot drift.
 */
/** What a drafted stance would move where the economy rests: growth, inflation and unemployment. */
export type RestingMove = {
    readonly growth: number;
    readonly inflation: number;
    readonly unemployment: number;
};
export type PolicyStanceProjection = {
    readonly domain: PolicyDomain;
    readonly stance: PolicyStance;
    readonly previous: PolicyStance;
    readonly available: boolean;
    /**
     * What the draft moves against the resting point the President is
     * actually held to, `programRestingOffset` with this domain's line
     * swapped at the chair's own `executionQuality` — never `policyRestingOffset`
     * of the draft alone, which has no chair and so no quality, and would
     * overstate a draft nobody has yet been asked to carry. Undefined on the
     * unavailable branch, where no draft was ever priced.
     */
    readonly restingMove?: RestingMove;
    /** Present only when it cannot be adopted, in the words a screen prints. */
    readonly missing?: string;
    /** Paid once, the week it is signed. */
    readonly enactment: MetricDeltas;
    /** What holding it costs, or earns, every week after that. */
    readonly perTurn: MetricDeltas;
    /** The chair answerable for it, and who is sitting in it. */
    /**
     * The chair that would sign it, where the charter seats one. Absent for a
     * domain this constitution has nobody answerable for — which is a real
     * reading rather than a missing field, and the reason the projection also
     * carries `missing`.
     */
    readonly chair?: RoleId;
    readonly minister?: string;
    /** How well that chair would carry it, 0..1-ish on the competence band. */
    readonly quality: number;
    readonly alignment: Partial<AlignmentVector>;
    /** The approval rating the program is weighed against. See `approvalNow` above. */
    readonly approvalNow: number;
    /**
     * The constituency this stance pushes against hardest, read off the
     * country's own cohorts rather than authored per stance. Undefined for a
     * stance that pushes nowhere — the inherited position, honestly, and only
     * ever that one.
     */
    readonly opposition: PolicyOpposition | undefined;
    /** What a president may actually do about this domain, in one clause. */
    readonly authority: string;
    /**
     * Weeks left before this stance, if signed today, would start doing
     * anything to the country. Zero for the inherited position, which was
     * already running on the morning of the oath, and zero for a program that
     * has already stood the wait out.
     */
    readonly standUpTurns: number;
    readonly reasoning: string;
};
export declare function projectPolicyStance(campaign: Campaign, charter: Charter, domain: PolicyDomain, stanceId: string): PolicyStanceProjection;
export type RevenueStatute = {
    readonly actId: string;
    readonly title: string;
};
/**
 * The bill this domain's program needs before the stance may change, or
 * `undefined` where the domain is executive or the statute is already law.
 *
 * `stanceId` names the position actually being proposed, where the caller has
 * one — see `revenueStatuteActId`.
 */
export declare function revenueStatuteRequired(campaign: Campaign, domain: PolicyDomain, stanceId?: string): RevenueStatute | undefined;
export declare function enactPolicyDraft(campaign: Campaign, candidate: PolicyDraftCandidate): PolicyResult;
/**
 * Adopt a stance. The change is the decision; the stance then works every turn
 * until it is changed again.
 *
 * Enactment costs are paid once, now, and are deliberately not scaled by
 * competence — the price of putting a program in place is paid by the
 * government, not by the ministry.
 */
export declare function enactPolicy(campaign: Campaign, stanceId: string): PolicyResult;
