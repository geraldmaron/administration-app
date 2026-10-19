import { daysBetween } from "./clock.js";
import type { RngStream } from "./rng.js";
import type { GameDate } from "./state.js";
import { EMPTY_IMPACT_TOTALS, ImpactSpec, type ImpactEvent, type ImpactReport, type ImpactResponse, type ImpactState, type ImpactTotals } from "./impact-event.js";

const bounded = (n: number) => Math.min(1, Math.max(0, n));
const count = (expected: number, rng: RngStream) => Math.floor(expected) + (rng.next() < expected % 1 ? 1 : 0);

export function openImpactEvent(input: ImpactSpec, date: GameDate): ImpactEvent {
  const spec = ImpactSpec.parse(input);
  const infected = spec.mechanism.kind === "outbreak" ? spec.mechanism.initialInfected : 0;
  return { spec, revision: 0, started: date, lastUpdated: date, elapsedDays: 0, status: "active",
    state: { susceptible: spec.exposure.population - infected, exposed: 0, infected, recovered: 0, careDemand: 0, disruptedShare: spec.mechanism.kind === "cyber" ? spec.mechanism.initialCompromisedShare : 0, displacedNow: 0 },
    totals: { ...EMPTY_IMPACT_TOTALS, infections: infected }, reports: [] };
}

type Step = { readonly state: ImpactState; readonly totals: ImpactTotals; readonly finished: boolean };

function outbreak(event: ImpactEvent, response: ImpactResponse, rng: RngStream): Step {
  const m = event.spec.mechanism;
  if (m.kind !== "outbreak") throw new Error("Expected outbreak");
  const { exposure: e } = event.spec;
  const before = event.state;
  const spread = event.elapsedDays < m.durationDays ? m.transmissionPerDay * (1 - .85 * response.containment) : 0;
  const infected = Math.min(before.susceptible, count(spread * before.infected * before.susceptible / Math.max(1, e.population), rng));
  const infectious = Math.min(before.exposed, count(before.exposed / m.latentDays, rng));
  const careDemand = Math.round(before.infected * m.severeFraction);
  const overload = careDemand > 0 ? Math.max(0, 1 - e.careCapacity * (1 + response.care) / careDemand) : 0;
  const leaving = Math.min(before.infected, count(before.infected / m.infectiousDays, rng));
  const dead = Math.min(leaving, count(leaving * m.fatalityFraction * (1 + e.vulnerability + overload) * (1 - .8 * response.care), rng));
  const active = before.infected + infectious - leaving;
  const severe = Math.min(infected, count(infected * m.severeFraction * (1 - .6 * response.care), rng));
  const disruption = bounded(active / Math.max(1, e.population) * 2);
  return { state: { ...before, susceptible: before.susceptible - infected, exposed: before.exposed + infected - infectious, careDemand, infected: active, recovered: before.recovered + leaving - dead, disruptedShare: disruption },
    totals: { ...event.totals, infections: event.totals.infections + infected, deaths: event.totals.deaths + dead, injured: event.totals.injured + severe, servicePersonDays: event.totals.servicePersonDays + e.serviceUsers * disruption, outputLossUSDm: event.totals.outputLossUSDm + e.dailyOutputUSDm * disruption }, finished: active === 0 && before.exposed + infected - infectious === 0 };
}

function cyber(event: ImpactEvent, response: ImpactResponse): Step {
  const m = event.spec.mechanism;
  if (m.kind !== "cyber") throw new Error("Expected cyber incident");
  const e = event.spec.exposure;
  const before = event.state.disruptedShare;
  const spread = event.elapsedDays < m.durationDays ? before * (1 - before) * m.spreadPerDay * (1 - response.containment) * (1 - e.resilience) : 0;
  const repaired = m.restorePerDay * (.5 + response.repair + e.resilience);
  const share = bounded(before + spread - repaired);
  const compromised = Math.round(e.serviceUsers * m.dataExposureShare * Math.max(before, share));
  return { state: { ...event.state, disruptedShare: share }, totals: { ...event.totals,
    compromisedRecords: Math.max(event.totals.compromisedRecords, compromised),
    servicePersonDays: event.totals.servicePersonDays + e.serviceUsers * share,
    outputLossUSDm: event.totals.outputLossUSDm + e.dailyOutputUSDm * share }, finished: share === 0 };
}

function physical(event: ImpactEvent, response: ImpactResponse, rng: RngStream): Step {
  const m = event.spec.mechanism;
  if (m.kind === "outbreak" || m.kind === "cyber") throw new Error("Expected physical hazard");
  const e = event.spec.exposure;
  const first = event.elapsedDays === 0;
  const duration = m.kind === "strike" ? m.recoveryDays : m.kind === "infrastructure" ? m.repairDays : m.durationDays;
  const intensity = m.kind === "infrastructure" ? m.outageShare : m.intensity;
  const prolonged = (m.kind === "industrial" && m.hazard !== "explosion") || (m.kind === "natural" && ["drought", "heat-wave", "winter-storm"].includes(m.hazard));
  const decay = bounded(1 - event.elapsedDays * (1 + response.repair) / duration);
  const harm = (first || prolonged) && (m.kind !== "strike" || rng.next() < m.civilianHarmChance);
  const rate = m.kind === "infrastructure" ? m.dailyExcessMortalityRate * decay : m.kind === "strike" ? m.casualtyRate : m.fatalityRate;
  const mortality = m.kind === "strike" ? m.casualtyRate : rate;
  const dose = m.kind === "infrastructure" ? intensity : harm ? intensity * (prolonged ? decay / duration : 1) : 0;
  const alive = Math.max(0, e.population - event.totals.deaths);
  const deaths = Math.min(alive, count(alive * mortality * dose * (1 + e.vulnerability) * (1 - .8 * response.evacuation) * (1 - .65 * response.care) * (.6 + rng.next() * .8), rng));
  const injuryRatio = m.kind === "infrastructure" ? 0 : m.injuryRatio;
  const injuries = Math.min(Math.max(0, alive - deaths - event.totals.injured), count(deaths * injuryRatio, rng));
  const footprintHit = m.kind !== "strike" || !event.spec.site || (first ? harm : event.state.disruptedShare > 0);
  const disruption = footprintHit ? bounded(intensity * decay * (1 - .7 * e.resilience)) : 0;
  const displaced = m.kind === "industrial" || m.kind === "natural" ? Math.round(alive * m.displacementShare * intensity * decay) : 0;
  const assetLoss = first && footprintHit && m.kind !== "infrastructure" ? e.assetsUSDm * m.damageShare * intensity * (1 - .7 * e.resilience) : 0;
  return { state: { ...event.state, disruptedShare: disruption, displacedNow: displaced }, totals: { ...event.totals,
    deaths: event.totals.deaths + deaths, injured: event.totals.injured + injuries,
    displaced: Math.max(event.totals.displaced, displaced), assetLossUSDm: event.totals.assetLossUSDm + assetLoss,
    outputLossUSDm: event.totals.outputLossUSDm + e.dailyOutputUSDm * disruption,
    servicePersonDays: event.totals.servicePersonDays + e.serviceUsers * disruption }, finished: decay === 0 };
}

/** One day only. The caller owns elapsed-calendar stepping and replay protection. */
export function stepImpactEvent(event: ImpactEvent, date: GameDate, response: ImpactResponse, rng: RngStream): ImpactEvent {
  if (event.status === "resolved") return event;
  const elapsed = daysBetween(event.lastUpdated, date);
  if (elapsed < 0 || (event.elapsedDays > 0 && elapsed === 0)) return event;
  if (elapsed > 1) throw new Error("Impact steps must advance at most one day");
  if (Object.values(response).some((value) => !Number.isFinite(value) || value < 0 || value > 1)) throw new Error("Impact response must contain finite fractions");
  let step = event.spec.mechanism.kind === "outbreak" ? outbreak(event, response, rng) : event.spec.mechanism.kind === "cyber" ? cyber(event, response) : physical(event, response, rng);
  const demographics = event.spec.exposure.demographics;
  if (demographics) {
    const childAlive = Math.max(0, demographics.children - event.totals.childDeaths);
    const adultAlive = Math.max(0, demographics.adults - (event.totals.deaths - event.totals.childDeaths));
    const dead = step.totals.deaths - event.totals.deaths;
    const childDeaths = Math.min(childAlive, Math.max(dead - adultAlive, count(dead * childAlive / Math.max(1, childAlive + adultAlive), rng)));
    step = { ...step, totals: { ...step.totals, childDeaths: event.totals.childDeaths + childDeaths } };
  }
  const next: ImpactEvent = { ...event, revision: event.revision + 1, lastUpdated: date, elapsedDays: event.elapsedDays + 1, state: step.state, totals: step.totals,
    status: step.finished ? "resolved" : step.state.disruptedShare < .05 ? "recovering" : "active" };
  return { ...next, reports: [...event.reports, impactReport(next, date)].slice(-12) };
}

export function impactReport(event: ImpactEvent, date: GameDate): ImpactReport {
  const confidence = event.spec.exposure.evidence === "country-proxy" ? "low" : event.spec.calibration.status === "calibrated" && event.spec.exposure.evidence === "site-assessment" ? "high" : "medium";
  const error = confidence === "low" ? .6 : confidence === "medium" ? .3 : .1;
  const range = (n: number) => ({ low: Math.max(0, Math.floor(n * (1 - error))), high: Math.ceil(n * (1 + error)) });
  const deaths = boundedRange(event.totals.deaths, event.spec.exposure.population, error);
  return { date, revision: event.revision, confidence, stage: event.status === "resolved" ? "final" : event.elapsedDays <= 1 ? "initial" : "update",
    deaths,
    ...(event.spec.exposure.demographics ? { childDeaths: boundedRange(event.totals.childDeaths, Math.min(event.spec.exposure.demographics.children, deaths.high), Math.max(error, .6)) } : {}), injured: boundedRange(event.totals.injured, event.spec.exposure.population, error), infections: boundedRange(event.totals.infections, event.spec.exposure.population, error), displaced: boundedRange(event.totals.displaced, event.spec.exposure.population, error),
    lossUSDm: range(event.totals.assetLossUSDm + event.totals.outputLossUSDm), serviceDisruption: boundedRange(event.spec.exposure.serviceUsers * event.state.disruptedShare, event.spec.exposure.serviceUsers, error), compromisedRecords: boundedRange(event.totals.compromisedRecords, event.spec.exposure.serviceUsers, error),
    basis: `${event.spec.exposure.basis} ${event.spec.calibration.status === "provisional" ? "Provisional simulation assumptions; not an independently verified count." : event.spec.calibration.basis}` };
}

function boundedRange(value: number, maximum: number, error: number) {
  return { low: Math.max(0, Math.floor(value * (1 - error))), high: Math.min(maximum, Math.ceil(value * (1 + error))) };
}
