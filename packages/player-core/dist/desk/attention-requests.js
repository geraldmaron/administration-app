import { guardAskFor, guardEligibleCondition, hazardLabel, projectGovernorWillingness, RELIEF_SIGNATURE_PREFIX, } from "@admin/engine";
import { stateById } from "@admin/world";
/** A key that cannot collide with a real signature, since `reliefSignature` itself contains a colon. */
function groupKey(signature, openedTurn) {
    return `${signature}\u0000${openedTurn}`;
}
/**
 * Every emergency a governor is waiting on Washington over, bundled by the
 * ask rather than by the state asking: claims that share a signature and an
 * opening turn are the same emergency asking once.
 */
export function governorRequestGroups(campaign) {
    const groups = new Map();
    for (const id of Object.keys(campaign.states)) {
        const runtime = campaign.states[id];
        if (!runtime)
            continue;
        for (const claim of runtime.claims) {
            if (!claim.signature.startsWith(`${RELIEF_SIGNATURE_PREFIX}:`))
                continue;
            const key = groupKey(claim.signature, claim.openedTurn);
            const held = groups.get(key);
            groups.set(key, held
                ? { ...held, states: [...held.states, id], expiresTurn: Math.max(held.expiresTurn, claim.expiresTurn) }
                : { signature: claim.signature, openedTurn: claim.openedTurn, expiresTurn: claim.expiresTurn, reason: claim.reason, states: [id] });
        }
    }
    return [...groups.values()];
}
/**
 * Every state a Guard federalization could be asked over right now, worst
 * emergency first. Projects off `projectGovernorWillingness` directly, the
 * same forecast function `requestGuardFederalization` (`guard-
 * federalization.ts`) decides through — one terms builder (`guardAskFor`),
 * read on both sides of the ask.
 */
export function guardRequestCandidates(campaign) {
    return Object.keys(campaign.states)
        .flatMap((state) => {
        const condition = guardEligibleCondition(campaign, state);
        if (!condition)
            return [];
        const forecast = projectGovernorWillingness(campaign, state, guardAskFor(condition));
        return [{ state, stateName: stateById.get(state)?.name ?? state, condition, forecast }];
    })
        .sort((a, b) => b.condition.severity - a.condition.severity);
}
/** The condition a candidate's headline names, in the Desk's own hazard vocabulary. */
export function guardCandidateHeadline(candidate) {
    return hazardLabel(candidate.condition.kind);
}
