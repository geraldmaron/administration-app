// A preserved briefing thread and an engine-calculated reported incident for Record inspectors.
import { addDays, apply, createRngStreams, NO_IMPACT_RESPONSE, openImpactEvent, stepImpactEvent } from "../../packages/engine/dist/index.js";
import { build as caseBacked } from "./decision-case-backed.mjs";
export const name = "record-investigations";
export function build() {
  let campaign = caseBacked();
  const file = Object.values(campaign.cases ?? {}).find((entry) => entry.contentPin);
  if (!file) throw new Error("The fixture needs a preserved authored briefing.");
  campaign = apply(campaign, { source: "conversation", actor: "player", turn: campaign.turn, narration: { summary: "The reported industrial incident is recorded." }, effects: [
    { kind: "scenarioFamily", open: { family: "record-inspection", counterpart: "MEX", scenario: file.contentPin.scenarioId, turn: campaign.turn, title: file.title } },
  ], provenance: { origin: "decision", entities: ["MEX"], visibility: "public" } });
  const cause = campaign.ledger.at(-1).causal.eventId;
  const spec = { version: 1, id: "record-inspection-incident", nation: "MEX", title: "Reported industrial fire", source: "action",
    exposure: { population: 1000, assetsUSDm: 50, dailyOutputUSDm: 2, serviceUsers: 800, careCapacity: 40, vulnerability: 0.3, resilience: 0.5, evidence: "regional-estimate", basis: "Regional industrial exposure estimate." },
    mechanism: { kind: "industrial", hazard: "fire", intensity: 0.4, fatalityRate: 0.01, injuryRatio: 3, damageShare: 0.2, displacementShare: 0.1, durationDays: 10 },
    accounting: { population: "self", economy: "self" }, calibration: { status: "provisional", basis: "Fixture uses the existing industrial incident mechanism.", sourceRefs: [] } };
  const event = { ...stepImpactEvent(openImpactEvent(spec, addDays(campaign.calendar, -1)), campaign.calendar, NO_IMPACT_RESPONSE, createRngStreams(campaign.seed).stream("record-inspection")), causedBy: cause };
  if (!event.reports.length) throw new Error("The incident must have a filed report.");
  return apply(campaign, { source: "simulate", actor: "world", turn: campaign.turn, narration: { summary: "The agency files its assessment." }, effects: [{ kind: "impactEvent", event, expectedRevision: null }], provenance: { origin: "world", causeIds: [cause], entities: ["MEX"] } });
}
