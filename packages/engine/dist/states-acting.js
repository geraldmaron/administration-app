/** Below this disposition a governor across the aisle stops cooperating. Planning value. */
export const REFUSAL_DISPOSITION = 0.3;
/** At or above this a governor carries the administration's program. Planning value. */
export const PARTNER_DISPOSITION = 0.65;
/** What the whole country's statehouses refusing would cost the ticket, before the cap. Planning value. */
export const NON_COOPERATION_WEIGHT = 0.03;
/** The most refusing statehouses can cost the count. One point. */
export const NON_COOPERATION_CAP = 0.01;
const round3 = (value) => Math.round(value * 1000) / 1000 + 0;
function acrossTheAisle(campaign, governor) {
    const standing = campaign.congress;
    const ours = standing.administrationParty === "independent" ? standing.caucusAnchor : standing.administrationParty;
    return governor.party !== ours && governor.party !== "independent";
}
/** How a statehouse stands toward the administration. Undefined where no governor is seated. */
export function statehouseStance(campaign, state) {
    const governor = campaign.states[state]?.governor;
    if (!governor)
        return undefined;
    if (governor.disposition >= PARTNER_DISPOSITION)
        return "partner";
    if (governor.disposition < REFUSAL_DISPOSITION && acrossTheAisle(campaign, governor))
        return "refusing";
    return "arms-length";
}
/** The statehouses refusing the administration's programs, in state order. */
export function refusingStatehouses(campaign) {
    return Object.keys(campaign.states).filter((state) => statehouseStance(campaign, state) === "refusing").sort();
}
/**
 * What refusing statehouses cost the President's count, as a share of the
 * vote: their share of the country's people, weighted and capped. Zero with
 * none refusing, and never positive: a partner statehouse carries programs
 * whose effects the count already reads, and only a refusal changes how they
 * land.
 */
export function nonCooperationShift(campaign) {
    const states = Object.values(campaign.states);
    const total = states.reduce((sum, runtime) => sum + runtime.population, 0);
    if (total <= 0)
        return 0;
    const refusing = new Set(refusingStatehouses(campaign));
    const share = states.filter((runtime) => refusing.has(runtime.base.id)).reduce((sum, runtime) => sum + runtime.population, 0) / total;
    return round3(-Math.min(NON_COOPERATION_CAP, share * NON_COOPERATION_WEIGHT));
}
