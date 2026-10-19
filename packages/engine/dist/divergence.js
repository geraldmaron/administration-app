// The measuring instrument behind "no two campaigns feel the same". The claim
// is only worth making if a number enforces it, so this turns two campaigns
// run under an identical decision script into a single figure, and the probe
// test fails the build when that figure drops.
//
// What is measured is deliberately *not* raw state equality. Two campaigns
// differ trivially in their seed string; what matters is whether the world
// the player meets is a different world — different personalities, different
// alliances and grievances, a different cast, and a different history of
// things that actually happened.
export const DIVERGENCE_FACETS = ["traits", "relationships", "people", "events"];
const round3 = (v) => Math.round(v * 1000) / 1000;
// Share of compared values that differ. Both campaigns are walked from the
// same key set so a value present in one and absent in the other counts as a
// difference rather than being skipped.
function shareDifferent(a, b) {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    if (keys.size === 0)
        return 0;
    let differing = 0;
    for (const key of keys) {
        if (JSON.stringify(a[key]) !== JSON.stringify(b[key]))
            differing++;
    }
    return differing / keys.size;
}
function traitFacet(campaign) {
    return Object.fromEntries(Object.entries(campaign.nations).map(([id, runtime]) => [
        id,
        { ...runtime.traits, agendas: runtime.traits.agendas.map((a) => `${a.id}:${a.weight}`) },
    ]));
}
function relationshipFacet(campaign) {
    return Object.fromEntries(Object.entries(campaign.relationships).map(([key, rel]) => [
        key,
        { trust: rel.trust, tension: rel.tension, grudges: rel.grudges.length, history: rel.history.length },
    ]));
}
function peopleFacet(campaign) {
    return Object.fromEntries(Object.entries(campaign.people).map(([id, person]) => [id, person.base.name]));
}
// What actually happened, turn by turn: the narrated record of moves, crises
// and consequences. Two worlds can start from similar numbers and still tell
// entirely different stories, and this is the facet that notices.
function eventFacet(campaign) {
    const byTurn = {};
    for (const entry of campaign.ledger) {
        (byTurn[String(entry.turn)] ??= []).push(entry.description);
    }
    return byTurn;
}
const FACET_READERS = {
    traits: traitFacet,
    relationships: relationshipFacet,
    people: peopleFacet,
    events: eventFacet,
};
// Facets are weighted by how much of "this campaign feels different" each one
// carries. What happened matters most: a player meets the story before they
// ever read a stat.
const FACET_WEIGHT = {
    events: 0.4,
    relationships: 0.25,
    traits: 0.2,
    people: 0.15,
};
export function measureDivergence(a, b) {
    const byFacet = Object.fromEntries(DIVERGENCE_FACETS.map((facet) => [facet, round3(shareDifferent(FACET_READERS[facet](a), FACET_READERS[facet](b)))]));
    const score = DIVERGENCE_FACETS.reduce((sum, facet) => sum + byFacet[facet] * FACET_WEIGHT[facet], 0);
    return { score: round3(score), byFacet, turn: a.turn };
}
