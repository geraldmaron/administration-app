import { STATE_IDS, type StateId } from "@admin/world";
import { conditionFamily } from "./condition-kinds.js";
import type { Campaign } from "./state.js";
import type { EffectPacket } from "./effects.js";

export type StaffordResult = { readonly ok: true; readonly packet: EffectPacket; readonly declarationId: string }
  | { readonly ok: false; readonly reason: string };

export function staffordRequestsAwaitingDeclaration(campaign: Campaign): readonly StateId[] {
  return STATE_IDS.filter((state) => {
    const request = campaign.states[state]?.staffordRequest;
    return request && campaign.states[state]?.staffordDeclaration?.requestId !== request.id
      && campaign.conditions[request.conditionId]?.status === "active";
  });
}

/** A Stafford major-disaster declaration is separate from an NEA emergency. */
export function declareStaffordDisaster(campaign: Campaign, state: StateId): StaffordResult {
  const runtime = campaign.states[state];
  const request = runtime?.staffordRequest;
  if (!runtime || !request) return { ok: false, reason: "no governor request is on file for this state" };
  const condition = campaign.conditions[request.conditionId];
  if (!condition || condition.status !== "active" || condition.nation !== campaign.founding.nation
    || (condition.state !== undefined && condition.state !== state)
    || condition.kind !== request.cause || conditionFamily(condition.kind) !== "acute")
    return { ok: false, reason: "the governor's request does not identify a live disaster in this state" };
  if (!request.beyondStateCapacity || !request.responsePlan || !request.resourcesCommitted || !request.costShareAccepted)
    return { ok: false, reason: "the request lacks a beyond-capacity finding, response plan, state resources, or cost sharing" };
  if (runtime.staffordDeclaration?.requestId === request.id)
    return { ok: false, reason: "the President has already declared this major disaster" };
  const declarationId = `stafford-declaration:${request.id}:${campaign.turn}`;
  return { ok: true, declarationId, packet: {
    source: "action", actor: "player", turn: campaign.turn,
    narration: { summary: `The President declares a major disaster in ${runtime.base.name} on the governor's request.` },
    effects: [{ kind: "state", state, reason: "The President granted the governor's Stafford request.",
      setStaffordDeclaration: { id: declarationId, requestId: request.id, declaredTurn: campaign.turn } }],
  } };
}
