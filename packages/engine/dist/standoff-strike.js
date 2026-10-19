/** A local partner or a neighbor. Not an ocean strike, and not a missile count. */
export function proxyReach(profile) {
    return profile.regionalProjection > 0 && profile.expeditionary <= 0 && profile.globalReach <= 0;
}
export function standoffStrike(profile, stock) {
    if (stock === null)
        return { ok: false, reason: "The stock is not known." };
    if (stock <= 0)
        return { ok: false, reason: "The class is empty." };
    if (profile.expeditionary > 0 || profile.globalReach > 0)
        return { ok: true, band: "expeditionary" };
    if (profile.regionalProjection > 0)
        return { ok: true, band: "regional" };
    return { ok: false, reason: "No force can be brought to bear." };
}
