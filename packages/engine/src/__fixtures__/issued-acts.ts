import type { Charter } from "@admin/world";
import type { NationId } from "@admin/world";
import type { Campaign, HillPostId, PressAction } from "../state.js";
import { apply } from "../effects.js";
import type { RngStreams } from "../rng.js";
import { issuePressAction, resolveIssuedPress, type PressResult } from "../press-issued.js";
import { issueLobbying } from "../lobbying.js";
import { issueRatification, resolveIssuedTreaty, type TreatyResult } from "../treaties.js";
import { issueForceAuthorization, resolveIssuedAuthorization } from "../force-authorization.js";

// Issue then resolve at the due date in one call. Tests use these; the player
// surface issues and lets Continue resolve through advance. They live with the
// fixtures because a production module must not export a verb no screen calls.

export function takePressAction(campaign: Campaign, charter: Charter, kind: PressAction, _streams: RngStreams, outletId?: string): PressResult {
  const issued = issuePressAction(campaign, kind, outletId);
  if (!issued.ok) return issued;
  const pending = apply(campaign, issued.packet);
  const resolved = resolveIssuedPress({ ...pending, calendar: issued.act.dueDate }, issued.act.id, charter.roleTitles);
  if (!resolved.ok) return resolved;
  // Single-apply callers need the upfront cost that issue billed onto `pending`.
  const upfront = issued.projection.play.cost;
  if (Object.keys(upfront).length === 0) return resolved;
  return { ...resolved, packet: { ...resolved.packet, effects: [{ kind: "metric", deltas: upfront }, ...resolved.packet.effects] } };
}

export function lobbyFigure(campaign: Campaign, target: HillPostId, approach: Parameters<typeof issueLobbying>[2]): ReturnType<typeof issueLobbying> {
  return issueLobbying(campaign, target, approach);
}

export function submitForRatification(campaign: Campaign, charter: Charter, id: string): TreatyResult {
  const issued = issueRatification(campaign, id);
  if (!issued.ok) return issued;
  const pending = apply(campaign, issued.packet);
  return resolveIssuedTreaty({ ...pending, calendar: issued.act.dueDate }, issued.act.id, charter.roleTitles);
}

export function requestForceAuthorization(campaign: Campaign, target: NationId): ReturnType<typeof resolveIssuedAuthorization> {
  const issued = issueForceAuthorization(campaign, target);
  if (!issued.ok) return issued;
  const pending = apply(campaign, issued.packet);
  return resolveIssuedAuthorization({ ...pending, calendar: issued.act.dueDate }, issued.act.id);
}
