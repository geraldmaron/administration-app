import { withStrikeAssessment } from "./strike-assessment.js";
import { openImpactEvent, stepImpactEvent } from "./impact-calculation.js";
import { countryExposure } from "./impact-adapters.js";
import { IMPACT_CALIBRATION } from "./impact-catalog.js";
import { NO_IMPACT_RESPONSE, ImpactExposure, ImpactSpec } from "./impact-event.js";
import { forceScale } from "./force-packages.js";
import { defenseHolds, sharedBodies } from "./compacts.js";
import type { Effect } from "./effects.js";
import type { ResolutionRequest } from "./resolution.js";
import type { RngStreams } from "./rng.js";
import { selectRelationship, type Campaign, type CasualtyBand } from "./state.js";

export type CivilianRisk = { readonly chance: number; readonly basis: string };
/** A separate axis from accomplishing the military objective. */
export function strikeCivilianRisk(campaign: Campaign, request: ResolutionRequest): CivilianRisk | undefined {
  if (request.instrument !== "military" || request.rung !== 4) return undefined;
  const actor = campaign.nations[request.actor]?.stats;
  const target = campaign.nations[request.target]?.stats;
  if (!actor || !target) return undefined;
  const evidence = actor.security.intelCapability;
  const discipline = actor.military.readiness * actor.military.doctrineQuality;
  const exposure = target.demography.urbanization;
  const missionExposure = ({ "military-capacity": 1, logistics: 1.15, infrastructure: 1.35 })[request.strikeObjective ?? "military-capacity"];
  const protection = request.civilianProtection === "additional-assessment" ? .65 : 1;
  const chance = protection * Math.min(.65, Math.max(.03, (.08 + exposure * .2 + (1 - evidence) * .15 + (1 - discipline) * .12) * forceScale(4, request.force) * missionExposure));
  return { chance, basis: `${request.civilianProtection === "additional-assessment" ? "Additional assessment adds three preparation days and reduces modeled risk, without guaranteeing civilian safety. " : ""}Civilian harm can accompany a successful strike. Exposure rises with urbanization, package size and disruption-focused objectives; intelligence, readiness and doctrine reduce risk. ${request.assessedSite ? `The target site's classification is ${request.assessedSite.site.confirmed ? "confirmed" : "assessed, not confirmed"}.` : "Site identity and children's presence are not established by this country-level estimate."}` };
}

export type StrikeOutcome = { readonly effects: readonly Effect[]; readonly account: string; readonly casualties?: CasualtyBand };

function defensePromiseBreach(campaign: Campaign, request: ResolutionRequest): boolean {
  const actor = campaign.nations[request.actor]?.base;
  const target = campaign.nations[request.target]?.base;
  if (!actor || !target) return false;
  const counterpart = request.actor === campaign.founding.nation ? request.target
    : request.target === campaign.founding.nation ? request.actor : undefined;
  const bilateral = counterpart !== undefined && Object.values(campaign.treaties).some((record) =>
    record.kind === "alliance" && record.status === "ratified" && record.counterpart === counterpart);
  const compact = sharedBodies(actor.memberships, target.memberships).some((body) =>
    body.kind === "defense" && defenseHolds(body.defenseScope, target.geo.region as string));
  return bilateral || compact;
}

/** Seeded simulation assumptions. Counts describe a realized event, never a promised result. */
export function resolveStrikeHarm(campaign: Campaign, request: ResolutionRequest, streams: RngStreams, missionSucceeded = false): StrikeOutcome | undefined {
  request = withStrikeAssessment(campaign, request);
  const risk = strikeCivilianRisk(campaign, request);
  if (!risk) return undefined;
  const rng = streams.stream("strike-civilian-harm", request.actor, request.target, campaign.turn, request.force?.count ?? 200);
  const target = campaign.nations[request.target]!;
  const scale = forceScale(4, request.force);
  const spec: ImpactSpec = { version: 1, id: `impact:strike:${request.actor}:${request.target}:${campaign.ledger.length}`, nation: request.target,
    title: "Strike damage assessment", source: "action", ...(missionSucceeded && request.strikeObjective && request.strikeObjective !== "military-capacity" ? { parentId: `impact:mission:${request.actor}:${request.target}:${campaign.ledger.length}` } : {}), accounting: { population: "self", economy: missionSucceeded && request.strikeObjective && request.strikeObjective !== "military-capacity" ? "parent" : "self" }, exposure: request.assessedSite?.exposure ?? countryExposure(campaign, request.target, 100 + 900 * target.stats.demography.urbanization), ...(request.assessedSite ? { site: request.assessedSite.site } : {}), calibration: IMPACT_CALIBRATION,
    mechanism: { kind: "strike", intensity: Math.min(1, .65 * scale), civilianHarmChance: risk.chance, casualtyRate: .08, injuryRatio: 3, damageShare: .15, recoveryDays: 14 } };
  const event = stepImpactEvent(openImpactEvent(spec, campaign.calendar), campaign.calendar, NO_IMPACT_RESPONSE, rng);
  const report = event.reports.at(-1)!;
  const deaths = event.totals.deaths;
  const casualties: CasualtyBand | undefined = deaths ? { ...report.deaths, confidence: report.confidence } : undefined;
  const severity = Math.min(.12, Math.log1p(deaths) * .018);
  const effects: Effect[] = [{ kind: "impactEvent", event, expectedRevision: null }];
  if (request.actor === campaign.founding.nation) effects.push({ kind: "metric", deltas: { standing: -severity } }, { kind: "opinion", deltas: { integrity: -severity, competence: -severity * .5 } });
  const towardActor = selectRelationship(campaign, request.target, request.actor);
  // The first deliberate strike on a trusting partner is a breach even when
  // the damage assessment finds no civilian deaths. The existing casualty
  // charge remains separate; later strikes do not collect this first-breach
  // charge again against the same relationship.
  const promisedDefense = defensePromiseBreach(campaign, request);
  const firstBreach = towardActor && !towardActor.history?.some((entry) => entry.kind === "betrayal");
  const betrayal = firstBreach && (promisedDefense || towardActor.trust >= 0.4)
    ? 0.2 * Math.max(0, towardActor.trust) : 0;
  if (towardActor) effects.push({
    kind: "relationship", from: request.target, to: request.actor,
    deltas: { trust: -(severity + betrayal), tension: severity + betrayal },
    ...(firstBreach && (promisedDefense || betrayal > 0) ? { addHistory: { turn: campaign.turn, kind: "betrayal", description: promisedDefense
      ? "A defense partner ordered a strike against us despite its commitment."
      : "A trusted partner ordered a strike against us." } } : {}),
  });
  if (!casualties) return { effects, account: "Initial assessment reports no civilian deaths; this is not independent confirmation. Damage assessment and recovery continue." };
  return { effects, casualties, account: `Civilian harm is reported: an initial estimate of ${casualties.low}–${casualties.high} deaths, ${report.confidence} confidence. ${request.assessedSite ? `The ${request.assessedSite.site.category} classification is ${request.assessedSite.site.confirmed ? "confirmed" : "assessed, not confirmed"} by the strike assessment; casualty estimates remain provisional.` : "The site and victims' ages remain unverified."} Military success does not remove this consequence.` };
}

/** Evidence is an assessment input from scenario/operator producers, never inferred from national statistics. */
export function validStrikeAssessment(campaign: Campaign, request: ResolutionRequest): boolean {
  if (!request.assessedSite) return true;
  return request.instrument === "military" && request.rung === 4
    && request.assessedSite.exposure.population <= (campaign.nations[request.target]?.stats.demography.population ?? 0)
    && request.assessedSite.exposure.evidence === "site-assessment"
    && ImpactExposure.safeParse(request.assessedSite.exposure).success
    && request.assessedSite.site !== undefined
    && ImpactSpec.shape.site.safeParse(request.assessedSite.site).success;
}
