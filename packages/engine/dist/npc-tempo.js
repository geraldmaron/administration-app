// How often the world's other governments may do a kind of thing: a cap on
// how many such acts the whole world makes in any term, and a rest after each
// one on the thing it was done to (a pair of governments, a strait).
//
// Pricing alone did not hold the tempo. The agent weighs every act on its
// merits each week, so a world with nothing rationing it repeated the same
// war-opening act as often as its odds allowed: one passive term held Brent
// above $90 for 73 weeks on a single Chinese blockade of Russia. A rate is a
// different fact from a price, and it is kept as one dated ledger of acts.
//
// A family of act is data, declared by the module that owns the act and passed
// in here. This module keeps no list of families, so a new family (regime
// operations, say) declares its own cap and cooldown and needs no edit here.
/** A term, in weeks: the window every family's cap is counted over. */
export const TERM_WEEKS = 208;
/** The key for a pair of governments, the same whichever acted on which. */
export function pairKey(a, b) {
    return a < b ? `${a}|${b}` : `${b}|${a}`;
}
/** Every act still on the ledger, oldest first. Absent on older saves, which read as none. */
export function tempoLedger(campaign) {
    return campaign.npcTempo ?? [];
}
/** Acts of the family the world has made in the term ending this week. */
export function actsThisTerm(campaign, family) {
    return tempoLedger(campaign).filter((entry) => entry.family === family.id && entry.turn > campaign.turn - TERM_WEEKS).length;
}
/** The turn the family last acted on the key, if it ever did and the entry is still kept. */
export function lastActOn(campaign, family, key) {
    return tempoLedger(campaign)
        .filter((entry) => entry.family === family.id && entry.key === key)
        .reduce((latest, entry) => (latest === undefined || entry.turn > latest ? entry.turn : latest), undefined);
}
/** Why the world may not make this act this week, or undefined where it may. */
export function tempoRefusal(campaign, claim) {
    const { family, key, label } = claim;
    if (actsThisTerm(campaign, family) >= family.perTerm) {
        return `the world has made its ${family.perTerm} ${family.noun} for this term`;
    }
    const last = lastActOn(campaign, family, key);
    if (last !== undefined && campaign.turn - last < family.cooldownWeeks) {
        return `${family.noun} involving ${label ?? key} rest ${family.cooldownWeeks} weeks after the last, and it was ${campaign.turn - last} weeks ago`;
    }
    return undefined;
}
/** The first refusal among a decision's claims, or undefined where every one is allowed. */
export function firstTempoRefusal(campaign, claims) {
    for (const claim of claims) {
        const refusal = tempoRefusal(campaign, claim);
        if (refusal)
            return refusal;
    }
    return undefined;
}
/** The ledger entries an act makes, as the effect that writes them; undefined where it made none. */
export function tempoEffect(campaign, actor, claims) {
    if (claims.length === 0)
        return undefined;
    const entries = claims.map(({ family, key }) => ({
        family: family.id,
        key,
        actor,
        turn: campaign.turn,
        keepUntil: campaign.turn + Math.max(TERM_WEEKS, family.cooldownWeeks),
    }));
    return { kind: "npcTempo", entries };
}
/** Appends the act's entries and drops every entry past its keep, so the ledger stays a term long. */
export function applyNpcTempo(campaign, effect) {
    const kept = tempoLedger(campaign).filter((entry) => entry.keepUntil >= campaign.turn);
    return { ...campaign, npcTempo: [...kept, ...effect.entries] };
}
