import { apply } from "../effects.js";
import { issuePressAction, resolveIssuedPress } from "../press-issued.js";
import { issueLobbying } from "../lobbying.js";
import { issueRatification, resolveIssuedTreaty } from "../treaties.js";
import { issueForceAuthorization, resolveIssuedAuthorization } from "../force-authorization.js";
// Issue then resolve at the due date in one call. Tests use these; the player
// surface issues and lets Continue resolve through advance. They live with the
// fixtures because a production module must not export a verb no screen calls.
export function takePressAction(campaign, charter, kind, _streams, outletId) {
    const issued = issuePressAction(campaign, kind, outletId);
    if (!issued.ok)
        return issued;
    const pending = apply(campaign, issued.packet);
    const resolved = resolveIssuedPress({ ...pending, calendar: issued.act.dueDate }, issued.act.id, charter.roleTitles);
    if (!resolved.ok)
        return resolved;
    // Single-apply callers need the upfront cost that issue billed onto `pending`.
    const upfront = issued.projection.play.cost;
    if (Object.keys(upfront).length === 0)
        return resolved;
    return { ...resolved, packet: { ...resolved.packet, effects: [{ kind: "metric", deltas: upfront }, ...resolved.packet.effects] } };
}
export function lobbyFigure(campaign, target, approach) {
    return issueLobbying(campaign, target, approach);
}
export function submitForRatification(campaign, charter, id) {
    const issued = issueRatification(campaign, id);
    if (!issued.ok)
        return issued;
    const pending = apply(campaign, issued.packet);
    return resolveIssuedTreaty({ ...pending, calendar: issued.act.dueDate }, issued.act.id, charter.roleTitles);
}
export function requestForceAuthorization(campaign, target) {
    const issued = issueForceAuthorization(campaign, target);
    if (!issued.ok)
        return issued;
    const pending = apply(campaign, issued.packet);
    return resolveIssuedAuthorization({ ...pending, calendar: issued.act.dueDate }, issued.act.id);
}
