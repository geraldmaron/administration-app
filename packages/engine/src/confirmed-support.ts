import type { NationId } from "@admin/world";
import type { Campaign, IssuedInstrumentAct } from "./state.js";
import type { ResolutionRequest } from "./resolution.js";

/** Only stored, answered requests contribute. A draft cannot self-certify partners. */
export function confirmedSupport(campaign: Campaign, request: ResolutionRequest): readonly NationId[] {
  if (request.support?.mode !== "seek") return [];
  const act = Object.values(campaign.issuedActs ?? {}).find((entry): entry is IssuedInstrumentAct => entry.kind === "instrument" && entry.request === request && entry.status !== "withdrawn");
  return (act?.supportRequests ?? []).filter((response) => response.status === "confirmed").map((response) => response.nation);
}
