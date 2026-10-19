import { MAX_STATE_MARKS, MAX_STATE_CLAIMS } from "./state-geography.js";
/**
 * The most one answer may move a governor's standing toward or away from the
 * administration, on the 0..1 disposition scale. A planning value, not a
 * fitted one. The answer also leaves a tilt the governor remembers
 * (`GovernorStanding.answerTilt`), which moves where the statehouse settles and
 * fades, so an answer is felt for months rather than for the fortnight the
 * statehouse's own drift would take to erase a bare step. The balance run sizes
 * both.
 */
export const GOVERNOR_STANDING_STEP_CAP = 0.04;
/** The most a governor's remembered tilt may hold, either way: three capped answers' worth, so no run of answers buys a statehouse. */
export const GOVERNOR_TILT_CAP = 0.12;
/**
 * Deterministic eviction: when `items` is over `max`, drop the lowest
 * `weight`, ties broken by the lowest `turn`, ties broken by `signature`
 * ascending — the ordering state-geography.ts's MAX_STATE_MARKS comment
 * specifies. Sorting only picks *which* entries go; the survivors keep their
 * original relative order, so an append-ordered array (marks are "newest
 * last") stays append-ordered after eviction rather than coming out sorted
 * by priority.
 */
function bounded(items, max, keyOf) {
    if (items.length <= max)
        return items;
    const sorted = [...items].sort((a, b) => {
        const [aWeight, aTurn, aSignature] = keyOf(a);
        const [bWeight, bTurn, bSignature] = keyOf(b);
        if (aWeight !== bWeight)
            return aWeight - bWeight;
        if (aTurn !== bTurn)
            return aTurn - bTurn;
        return aSignature < bSignature ? -1 : aSignature > bSignature ? 1 : 0;
    });
    const drop = new Set(sorted.slice(0, items.length - max));
    return items.filter((item) => !drop.has(item));
}
function boundMarks(marks) {
    return bounded(marks, MAX_STATE_MARKS, (mark) => [mark.weight, mark.turn, mark.signature]);
}
function boundClaims(claims) {
    return bounded(claims, MAX_STATE_CLAIMS, (claim) => [claim.weight, claim.openedTurn, claim.signature]);
}
function nextMarks(current, ops) {
    if (ops.replaceMarks)
        return boundMarks(ops.replaceMarks);
    if (ops.addMark)
        return boundMarks([...current.marks, ops.addMark]);
    return current.marks;
}
function nextClaims(current, ops) {
    if (ops.replaceClaims)
        return boundClaims(ops.replaceClaims);
    if (ops.addClaim) {
        const claim = ops.addClaim;
        const withoutReopened = current.claims.filter((existing) => existing.signature !== claim.signature);
        return boundClaims([...withoutReopened, claim]);
    }
    return current.claims;
}
function shiftedGovernor(current, shift) {
    const governor = current.governor;
    if (!governor || !shift)
        return governor;
    const step = Math.max(-GOVERNOR_STANDING_STEP_CAP, Math.min(GOVERNOR_STANDING_STEP_CAP, shift));
    const disposition = Math.round(Math.max(0, Math.min(1, governor.disposition + step)) * 1000) / 1000;
    const tilt = Math.max(-GOVERNOR_TILT_CAP, Math.min(GOVERNOR_TILT_CAP, (governor.answerTilt ?? 0) + step));
    return { ...governor, disposition, answerTilt: Math.round(tilt * 10_000) / 10_000 };
}
/** Merges a StateEffect's geography operations onto one state's runtime. */
export function applyStateGeography(current, ops) {
    const shifted = shiftedGovernor(current, ops.governorShift);
    return {
        ...current,
        ...(shifted ? { governor: shifted } : {}),
        marks: nextMarks(current, ops),
        claims: nextClaims(current, ops),
        ...(ops.setDelegation ? { delegation: ops.setDelegation } : {}),
        ...(ops.setGovernor ? { governor: ops.setGovernor } : {}),
        ...(ops.setStaffordRequest ? { staffordRequest: ops.setStaffordRequest } : {}),
        ...(ops.setStaffordDeclaration ? { staffordDeclaration: ops.setStaffordDeclaration } : {}),
        ...(ops.setElectionAccess ? { electionAccess: ops.setElectionAccess } : {}),
    };
}
