import { validStrikeAssessment } from "./strike-outcomes.js";
import { coalitionFor } from "./coalition.js";
import type { NationId } from "@admin/world";
import { addDays, compareDates } from "./clock.js";
import { selectRelationship, type Campaign, type GameDate, type IssuedInstrumentAct } from "./state.js";
import type { ResolutionRequest } from "./resolution.js";
import { sharedCovertThreat } from "./intelligence.js";

export type SupportChoice = { readonly mode: "unilateral" | "seek"; readonly partners: readonly NationId[] };
export type SupportResponse = {
  readonly nation: NationId; readonly name: string;
  readonly status: "pending" | "confirmed" | "refused" | "conditional";
  readonly days: number; readonly reason: string;
};
export type IssuedSupportRequest = SupportResponse & { readonly dueDate: GameDate };
export type SupportProjection = { readonly mode: SupportChoice["mode"]; readonly responses: readonly SupportResponse[]; readonly delayDays: number };

export function supportProjection(campaign: Campaign, request: ResolutionRequest): SupportProjection | undefined {
  if (!request.support || !["economic", "military"].includes(request.instrument)) return undefined;
  const stored = Object.values(campaign.issuedActs ?? {}).find((act) => act.kind === "instrument" && act.request === request && act.status !== "withdrawn");
  const responses: SupportResponse[] = request.support.mode === "unilateral" ? [] : [...new Set(request.support.partners)]
    .filter((id) => id !== request.actor && id !== request.target && campaign.nations[id])
    .map((nation) => ({ nation, name: campaign.nations[nation]!.base.identity.name, status: "pending", days: 3,
      reason: "Requested participation is unconfirmed. The partner considers its own interests and civilian protection terms." }));
  return { mode: request.support.mode, responses: stored?.kind === "instrument" ? stored.supportRequests ?? responses : responses, delayDays: responses.length ? 3 : 0 };
}

export function issueSupportRequests(campaign: Campaign, request: ResolutionRequest): readonly IssuedSupportRequest[] {
  return (supportProjection(campaign, request)?.responses ?? []).map((response) => ({ ...response, dueDate: addDays(campaign.calendar, response.days) }));
}

function answer(campaign: Campaign, request: ResolutionRequest, response: IssuedSupportRequest): IssuedSupportRequest {
  const trust = selectRelationship(campaign, response.nation, request.actor)?.trust ?? 0;
  const targetTrust = selectRelationship(campaign, response.nation, request.target)?.trust ?? 0;
  const shared = request.actor === campaign.founding.nation && request.instrument === "economic" && request.support?.mode === "seek"
    ? sharedCovertThreat(campaign, response.nation, request.target) : undefined;
  const trustFloor = shared ? 0.4 : 0.5;
  if (trust < trustFloor || targetTrust >= trust) return { ...response, status: "refused", reason: "The partner declines: alignment with the President is insufficient or its ties to the target take priority." };
  if (!coalitionFor(campaign, request.actor, request.target, trustFloor).backers.some((backer) => backer.nation === response.nation)) return { ...response, status: "refused", reason: "The partner declines participation: there is no available shared compact or its commitments to the target conflict with this request." };
  if (request.instrument === "military" && request.rung === 4 && request.civilianProtection !== "additional-assessment") return { ...response, status: "conditional", reason: "Participation requires additional civilian assessment. These authorized terms do not satisfy that condition; no contribution is counted." };
  return { ...response, status: "confirmed", reason: shared && trust < 0.5
    ? "The partner confirms economic participation after reviewing the shared report on a covert effort against it, under the authorized terms."
    : "The partner has confirmed participation under the authorized terms." };
}

export function answerSupportRequests(campaign: Campaign, act: IssuedInstrumentAct): readonly IssuedSupportRequest[] {
  return (act.supportRequests ?? []).map((response) => response.status === "pending" && compareDates(campaign.calendar, response.dueDate) >= 0 ? answer(campaign, act.request, response) : response);
}

export function actionTermsProblem(campaign: Campaign, request: ResolutionRequest): string | undefined {
  if (request.strikeObjective && (!(["military-capacity", "logistics", "infrastructure"] as readonly string[]).includes(request.strikeObjective) || request.instrument !== "military" || request.rung !== 4)) return "a valid limited-strike objective";
  if (!validStrikeAssessment(campaign, request)) return "a sourced site assessment for a limited strike";
  if (request.regimeAct && (request.instrument !== "covert" || request.rung !== 5)) return "a covert regime action for an operation against a government";
  if (request.civilianProtection === "additional-assessment" && (request.instrument !== "military" || request.rung !== 4)) return "a limited-strike instrument for civilian assessment terms";
  if (request.support && !["economic", "military"].includes(request.instrument)) return "an economic or military instrument for partner support";
  if (request.support?.mode === "seek" && (!request.support.partners.length || request.support.partners.some((id) => !campaign.nations[id] || id === request.actor || id === request.target))) return "at least one distinct partner government";
  return undefined;
}
