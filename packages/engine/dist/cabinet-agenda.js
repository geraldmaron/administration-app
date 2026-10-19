import { SLOW_WALK_QUALITY } from "./directives.js";
import { INSTITUTION_CATALOG } from "./institutions.js";
/**
 * The department the desk hears from this week, if any.
 *
 * A proposal exists when a cabinet institution's chair is vacant, or when its
 * implementation quality has fallen below the line that already means the
 * body will not carry an instruction. The desk receives one, chosen by a
 * fixed order on the current state, so the same state always yields the same
 * proposal.
 */
export function proposeThisWeek(campaign) {
    let chosen;
    for (const candidate of triggered(campaign)) {
        if (!chosen || byUrgency(candidate, chosen) < 0)
            chosen = candidate;
    }
    if (!chosen)
        return null;
    return { role: chosen.role, reason: chosen.reason, week: campaign.turn };
}
// SLOW_WALK_QUALITY is the delivery line the directive layer already reads
// off implementationQuality. A body under it is not carrying its work.
function triggerReason(runtime) {
    if (runtime.vacancy)
        return "vacancy";
    if (runtime.implementationQuality < SLOW_WALK_QUALITY)
        return "delivery";
    return undefined;
}
/** Every cabinet department that has crossed a trigger this week, in catalog order. */
export function triggered(campaign) {
    const found = [];
    for (const def of INSTITUTION_CATALOG) {
        const role = def.cabinetRole;
        if (!role)
            continue;
        const runtime = campaign.institutions[def.id];
        if (!runtime)
            continue;
        const reason = triggerReason(runtime);
        if (!reason)
            continue;
        found.push({
            role,
            reason,
            vacantDays: runtime.vacantDays,
            quality: runtime.implementationQuality,
            staffScale: def.staffScale,
        });
    }
    return found;
}
// Empty chairs first, then the vacancy that has lasted longer, then the
// worse delivery, then the larger staff, then the role id. The last two
// only break ties, so two departments in the same condition still produce
// one stable choice.
function byUrgency(candidate, than) {
    if (candidate.reason !== than.reason)
        return candidate.reason === "vacancy" ? -1 : 1;
    if (candidate.vacantDays !== than.vacantDays)
        return than.vacantDays - candidate.vacantDays;
    if (candidate.quality !== than.quality)
        return candidate.quality - than.quality;
    if (candidate.staffScale !== than.staffScale)
        return than.staffScale - candidate.staffScale;
    if (candidate.role < than.role)
        return -1;
    if (candidate.role > than.role)
        return 1;
    return 0;
}
