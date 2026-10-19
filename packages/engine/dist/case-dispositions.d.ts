import type { CaseDisposition } from "./case-types.js";
import type { EffectPacket } from "./effects.js";
import type { Campaign } from "./state.js";
export type CaseDispositionAnswer = {
    readonly ok: true;
    readonly packet: EffectPacket;
} | {
    readonly ok: false;
    readonly reason: string;
};
/**
 * Commits one of the four generic dispositions, priced at nothing beyond the
 * case's own record: `withCaseTransition` is the one validator (a closed
 * case, a disposition the family does not allow, a deferral past the
 * deadline all refuse), called once here to turn its throw into a refusal
 * before anything commits, and once more inside `applyCase` when the packet
 * actually applies.
 */
export declare function dispositionCase(campaign: Campaign, id: string, disposition: Exclude<CaseDisposition, {
    readonly kind: "act";
}>): CaseDispositionAnswer;
