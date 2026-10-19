import { weeksFor } from "./pace.js";
import { currentEventId } from "./causality.js";
import { addDays, daysBetween } from "./clock.js";
import { apply, type Effect, type EffectPacket } from "./effects.js";
import { openImpactEvent, stepImpactEvent } from "./impact-calculation.js";
import { ImpactSpec, type ImpactEvent, type ImpactEventEffect, type ImpactReport, type ImpactResponse } from "./impact-event.js";
import { responseEffectiveness } from "./response.js";
import { createRngStreams } from "./rng.js";
import type { Campaign } from "./state.js";
import { nationName } from "./naming.js";
import { stateDeathDeltas } from "./vitals.js";

function statesAfterDeaths(campaign: Campaign, event: ImpactEvent, deaths: number): Campaign["states"] {
  if (deaths === 0 || Object.keys(campaign.states).length === 0) return campaign.states;
  const parent = event.spec.source === "condition" && event.spec.parentId ? campaign.conditions[event.spec.parentId] : undefined;
  const condition = parent?.nation === event.spec.nation ? parent : undefined;
  const place = condition?.state ?? (condition?.city ? campaign.cities[condition.city]?.base.state : undefined);
  // Incident location is known only for condition-backed cases. Residual or
  // unlocated deaths use the same population weights as weekly vital changes.
  const deltas = stateDeathDeltas(campaign.states, deaths, place);
  const states = { ...campaign.states };
  for (const [id, delta] of deltas) {
    if (delta === 0) continue;
    const current = states[id]!;
    states[id] = { ...current, population: Math.max(0, current.population + delta) };
  }
  return states;
}

/** Optimistic revision check makes repeated/stale packets harmless to population. */
export function applyImpactEvent(campaign: Campaign, effect: ImpactEventEffect): Campaign {
  const old = campaign.impactEvents?.[effect.event.spec.id];
  if ((old?.revision ?? null) !== effect.expectedRevision) return campaign;
  const event = { ...effect.event, causedBy: old?.causedBy ?? effect.event.causedBy ?? currentEventId() };
  if (!old) ImpactSpec.parse(event.spec);
  if (Object.values(event.totals).some((n) => !Number.isFinite(n) || n < 0) || event.totals.deaths > event.spec.exposure.population) throw new Error("Invalid impact totals");
  if (old && Object.keys(old.totals).some((key) => event.totals[key as keyof typeof event.totals] < old.totals[key as keyof typeof old.totals])) throw new Error("Cumulative impact totals cannot decrease");
  if (old && (event.revision <= old.revision || event.spec.nation !== old.spec.nation)) throw new Error("Invalid impact revision");
  const runtime = campaign.nations[event.spec.nation];
  if (!runtime) throw new Error("Impact nation is absent");
  const reportedDeaths = event.spec.accounting.population === "parent" ? 0 : Math.max(0, event.totals.deaths - (old?.totals.deaths ?? 0));
  const deaths = Math.min(reportedDeaths, Math.max(0, runtime.stats.demography.population - 1));
  const nation = { ...runtime, stats: { ...runtime.stats, demography: { ...runtime.stats.demography, population: Math.max(1, runtime.stats.demography.population - deaths) } } };
  const states = event.spec.nation === campaign.founding.nation ? statesAfterDeaths(campaign, event, deaths) : campaign.states;
  return { ...campaign, impactEvents: { ...campaign.impactEvents, [event.spec.id]: event }, nations: deaths ? { ...campaign.nations, [event.spec.nation]: nation } : campaign.nations, states };
}

export function impactResponseFor(campaign: Campaign, event: ImpactEvent): ImpactResponse {
  const condition = event.spec.source === "condition" && event.spec.parentId ? campaign.conditions[event.spec.parentId] : undefined;
  const institutional = condition ? responseEffectiveness(campaign, condition) : 0;
  const capacity = event.spec.exposure.resilience;
  return { containment: Math.min(1, capacity * .4 + institutional * .6), care: Math.min(1, capacity * .5 + institutional * .5), evacuation: institutional, repair: Math.min(1, capacity * .4 + institutional * .6) };
}

// A wire line, not a log record. The title is often a whole sentence already
// (a condition's onset beat), so it loses its stop before the colon rather than
// printing ".:"; counts are written with separators; the site's assessment id
// is an internal key and stays off the page; and the confidence reads as words
// in a sentence of its own. `place` names the country a strike was assessed in,
// since the strike title alone says only that an assessment exists.
export function impactReportSummary(event: ImpactEvent, report: ImpactReport, place?: string): string {
  const count = (n: number) => Math.round(n).toLocaleString("en-US");
  const range = (v: { low: number; high: number }) => (v.low === v.high ? count(v.low) : `${count(v.low)}–${count(v.high)}`);
  const facts = [
    report.deaths.high ? `${range(report.deaths)} ${report.deaths.high === 1 ? "death" : "deaths"}` : "no deaths reported so far",
    ...(report.infections.high ? [`${range(report.infections)} infections to date`] : []),
    ...(report.serviceDisruption.high ? [`${range(report.serviceDisruption)} people without services`] : []),
  ];
  const site = event.spec.site ? `${event.spec.site.category} site, ${event.spec.site.confirmed ? "confirmed" : "not yet confirmed"}; ` : "";
  const title = event.spec.title.trim().replace(/[.!?]+$/, "");
  const lead = event.spec.source === "action" && place ? `${title} in ${place}` : title;
  const stage = report.stage === "final" ? "Recovery report" : "Preliminary assessment";
  return `${lead}: ${site}${facts.join("; ")}. ${stage}, ${report.confidence} confidence.`;
}

/** One batched packet per calendar day, with each event retaining its own reports. */
export function advanceImpactEvents(campaign: Campaign): Campaign {
  const effects: Effect[] = [];
  const causes = new Set<string>();
  const streams = createRngStreams(campaign.seed);
  for (const event of Object.values(campaign.impactEvents ?? {})) {
    if (event.status === "resolved") continue;
    const days = daysBetween(event.lastUpdated, campaign.calendar);
    if (days <= 0) continue;
    let next = event;
    for (let day = 1; day <= days && next.status !== "resolved"; day++) {
      const date = addDays(event.lastUpdated, day);
      next = stepImpactEvent(next, date, impactResponseFor(campaign, next), streams.stream("impact-event", event.spec.id, next.elapsedDays));
    }
    if (event.causedBy) causes.add(event.causedBy);
    effects.push({ kind: "impactEvent", event: next, expectedRevision: event.revision });
    const report = next.reports.at(-1)!;
    if ((event.spec.nation === campaign.founding.nation || event.spec.source === "action") && (event.elapsedDays === 0 || next.status === "resolved" || weeksFor(next.elapsedDays, "floor") > weeksFor(event.elapsedDays, "floor"))) effects.push({ kind: "feed", items: [{ turn: campaign.turn, kind: "press", visibility: "public", target: event.spec.nation, headline: impactReportSummary(next, report, placeName(campaign, next)), date: campaign.calendar }] });
  }
  if (!effects.length) return campaign;
  const packet: EffectPacket = { source: "simulate", actor: "world", turn: campaign.turn,
    narration: { summary: "Incident assessments updated as response and recovery continue." }, effects,
    provenance: { origin: "scheduled", causeIds: [...causes], systems: ["impacts"], effectiveDate: campaign.calendar } };
  return apply(campaign, packet);
}

function placeName(campaign: Campaign, event: ImpactEvent): string | undefined {
  const identity = campaign.nations[event.spec.nation]?.base.identity;
  return identity ? nationName(identity) : undefined;
}

/** Existing condition macro costs remain authoritative; only independent incidents add pressure. */
export function independentImpactPressure(campaign: Campaign, nation: string): number {
  const output = campaign.nations[nation as keyof Campaign["nations"]]?.stats.economy.gdp ?? 0;
  if (output <= 0) return 0;
  const dailyLoss = Object.values(campaign.impactEvents ?? {}).filter((event) => event.spec.nation === nation && event.spec.accounting.economy === "self" && event.status !== "resolved")
    .reduce((sum, event) => sum + event.spec.exposure.dailyOutputUSDm * event.state.disruptedShare, 0);
  return Math.min(.1, dailyLoss * 365 / output);
}


/** Explicit producer API for authored accidents and infrastructure failures. */
export function issueImpactIncident(campaign: Campaign, spec: ImpactSpec): EffectPacket {
  if (campaign.impactEvents?.[spec.id]) throw new Error("Incident already exists");
  const nation = campaign.nations[spec.nation];
  if (!nation || spec.exposure.population > nation.stats.demography.population) throw new Error("Incident exposure exceeds the living population");
  return { source: "simulate", actor: "world", turn: campaign.turn, narration: { summary: `${spec.title}: assessment and response underway.` },
    provenance: { origin: "world", entities: [spec.nation], systems: ["impacts"], effectiveDate: campaign.calendar },
    effects: [{ kind: "impactEvent", event: openImpactEvent(spec, campaign.calendar), expectedRevision: null }] };
}
