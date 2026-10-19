import { towardAdministrationSign } from "./party.js";
// What sharing a bill's credit costs the President, charged where it shows.
//
// Nothing stores the President's credit for a law. It shows once, the week the
// law lands: the states it moves toward the administration and the groups that
// remember it kindly. Handing a member the credit takes a share of exactly that
// movement. The blame stays whole: a President who signs a law owns what it
// costs, whoever stood at the podium beside them.
/**
 * The share of a law's favorable movement that goes to the member instead.
 *
 * Under half, because the President still signs it and the coverage still
 * leads with the White House; a named co-author takes a real slice of the
 * story, not most of it.
 */
export const SHARED_CREDIT_FRACTION = 0.3;
const round3 = (value) => Math.round(value * 1000) / 1000 + 0;
function scaledDown(campaign, effect, keep) {
    if (effect.kind === "state") {
        const lean = effect.deltas?.lean;
        const toward = lean === undefined ? 0 : lean * towardAdministrationSign(campaign.congress.caucusAnchor);
        if (lean === undefined || toward <= 0)
            return effect;
        return { ...effect, deltas: { ...effect.deltas, lean: round3(lean * keep) } };
    }
    if (effect.kind === "cohort" && effect.addStrain && effect.addStrain.valence === 1) {
        return { ...effect, addStrain: { ...effect.addStrain, weight: round3(effect.addStrain.weight * keep) } };
    }
    return effect;
}
/** A law's domestic effects with the shared credit taken out of the favorable part. Unchanged when nothing was shared. */
export function withSharedCredit(campaign, bill, effects) {
    const shared = bill.sharedCredit;
    if (!shared)
        return effects;
    const keep = 1 - shared.fraction;
    return effects.map((effect) => scaledDown(campaign, effect, keep));
}
