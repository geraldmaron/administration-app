const indexes = new WeakMap();
function buildIndex(people) {
    const byNation = new Map();
    for (const runtime of Object.values(people)) {
        const nation = runtime.base.nationality;
        const bucket = byNation.get(nation);
        if (bucket)
            bucket.push(runtime);
        else
            byNation.set(nation, [runtime]);
    }
    return { byNation, leaders: new Map(), rapport: new Map() };
}
function indexOf(people) {
    const known = indexes.get(people);
    if (known)
        return known;
    const built = buildIndex(people);
    indexes.set(people, built);
    return built;
}
/** Everyone of one nationality in the cast, living or not, in the cast's own order. */
export function nationalsOf(campaign, nation) {
    return indexOf(campaign.people).byNation.get(nation) ?? [];
}
/**
 * The person `find` names as a nation's leader, worked out once per cast.
 * `lead` is in the key because a chair is named by the nation's charter, and a
 * campaign that changed one would otherwise read the old chair's holder.
 */
export function rememberedLeader(campaign, nation, lead, find) {
    const { leaders } = indexOf(campaign.people);
    const key = `${nation}|${lead}`;
    const known = leaders.get(key);
    if (known !== undefined)
        return known ?? undefined;
    const found = find();
    leaders.set(key, found ?? null);
    return found;
}
/**
 * A rapport `find` reads between two leaders, worked out once per cast and per
 * pair. Keyed by the two people rather than their countries, because the
 * President's chair is read off the administration rather than off the cast.
 */
export function rememberedRapport(campaign, from, to, find) {
    const { rapport } = indexOf(campaign.people);
    const key = `${from}|${to}`;
    const known = rapport.get(key);
    if (known !== undefined)
        return known;
    const found = find();
    rapport.set(key, found);
    return found;
}
// --- Measurement only --------------------------------------------------------
let personalityOn = true;
/** Whether foreign leaders' own character reaches their governments' decisions. Always true outside a measurement. */
export function leaderPersonalityOn() {
    return personalityOn;
}
/**
 * Runs `measure` with foreign leaders' own character switched off — the lean
 * the leader in office at the start puts on their government, the two axes
 * their traits fill, and their rapport with the leader across the table — so a
 * battery can measure the world with and without it from one copy of the code.
 * Restored on the way out, thrown or not, so nothing outside the run sees it off.
 */
export function withoutLeaderPersonality(measure) {
    const previous = personalityOn;
    personalityOn = false;
    try {
        return measure();
    }
    finally {
        personalityOn = previous;
    }
}
