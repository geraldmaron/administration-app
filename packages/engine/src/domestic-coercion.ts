import type { StateId } from "@admin/world";
import type { Effect } from "./effects.js";
import { markedFlags } from "./marked-flags.js";
import { createRngStreams } from "./rng.js";
import type { Campaign, FlagId } from "./state.js";

// What happens when the President points federal force or federal eyes at
// Americans.
//
// The locale acts that do it are priced up front like any other act. This file
// is the part a price cannot hold: that armed agents in a city sometimes shoot
// someone, that a surveillance program sometimes reaches a reporter, and that a
// President who does this week after week is read as reaching for force by
// reflex. None of it is new machinery. An incident moves the public's verdicts
// (opinion), the country's temper (protest pressure, which is what opens
// unrest), and the record a committee reads (a scandal flag, which the scandal
// phase opens and the inquiry phase follows); removal pressure already reads
// all three.

export type CoercionKind = "agents" | "troops" | "surveillance";

/** How dangerous one use is before tempo: the chance of an incident, and how hard one lands. */
export type CoercionRisk = { readonly kind: CoercionKind; readonly odds: number; readonly severity: number };

/** How many weeks back an earlier coercive act still colors how the next one is read. */
export const COERCION_TEMPO_WEEKS = 8;
/** Each recent act raises the chance of an incident by this share of its base, up to the cap. */
export const TEMPO_ODDS_STEP = 0.6;
/** Each recent act makes an incident land this much harder, up to the cap. */
export const TEMPO_SEVERITY_STEP = 0.35;
export const MAX_INCIDENT_ODDS = 0.85;
export const MAX_SEVERITY = 2.5;
/** From the second recent act on, the run itself costs: the country sees a pattern, not a decision. */
export const ERRATIC_FROM = 2;
export const ERRATIC_COMPETENCE = 0.012;
export const ERRATIC_UNITY = 0.008;

/**
 * Taken with no unrest to answer, the same act is a choice rather than a
 * response: the public reads it as overreach before anything happens, crowds
 * meet it angrier, and what goes wrong lands harder.
 */
export const UNPROVOKED_ODDS = 1.5;
export const UNPROVOKED_SEVERITY = 1.3;
export const UNPROVOKED_INTEGRITY = 0.015;
export const UNPROVOKED_POLARIZE = 0.006;

const COERCED_PREFIX = "coerced:";

/**
 * The deed flag one coercive act leaves, read back by tempo. Numbered by how
 * many came before it, so the same act taken twice in a week is two deeds on
 * the record rather than one flag set twice.
 */
export function coercedFlag(kind: CoercionKind, state: StateId, sequence: number): FlagId {
  return `${COERCED_PREFIX}${kind}:${state}:${sequence}`;
}

/** Every coercive act this administration has taken, ever: the next deed's number. */
function coercionCount(campaign: Campaign): number {
  return Object.keys(campaign.player.flags).filter((key) => key.startsWith(COERCED_PREFIX) && campaign.player.flags[key]).length;
}

/** The flag a surveillance program leaves on a state: the intelligence committee hears of it. */
export function surveillanceFlag(state: StateId): FlagId {
  return `surveilling-domestic:${state}`;
}

/**
 * How many coercive acts the President has taken in the last
 * `COERCION_TEMPO_WEEKS`, counted off the turn-stamped markers each one left,
 * so the count is the record's and survives a save.
 */
export function recentCoercion(campaign: Campaign): number {
  const prefix = `flagset:${COERCED_PREFIX}`;
  const since = campaign.turn - COERCION_TEMPO_WEEKS;
  return Object.keys(campaign.player.flags)
    .filter((key) => key.startsWith(prefix) && campaign.player.flags[key])
    .map((key) => Number(key.slice(key.lastIndexOf(":") + 1)))
    .filter((turn) => Number.isInteger(turn) && turn > since).length;
}

export type CoercionOutlook = {
  /** Whether there was unrest for the act to answer. */
  readonly provoked: boolean;
  readonly recent: number;
  readonly odds: number;
  readonly severity: number;
  readonly erratic: boolean;
};

/** The chance and weight of an incident if the act were taken now, with the run that came before it. */
export function coercionOutlook(campaign: Campaign, risk: CoercionRisk, provoked = true): CoercionOutlook {
  const recent = recentCoercion(campaign);
  const odds = provoked ? 1 : UNPROVOKED_ODDS;
  const weight = provoked ? 1 : UNPROVOKED_SEVERITY;
  return {
    provoked,
    recent,
    odds: Math.min(MAX_INCIDENT_ODDS, risk.odds * odds * (1 + TEMPO_ODDS_STEP * recent)),
    severity: Math.min(MAX_SEVERITY, risk.severity * weight * (1 + TEMPO_SEVERITY_STEP * recent)),
    erratic: recent + 1 >= ERRATIC_FROM,
  };
}

type Incident = {
  readonly key: string;
  readonly headline: (place: string) => string;
  /** At or past this share of the worst case it is a death or an exposure, which is a scandal. */
  readonly grave: boolean;
  readonly integrity: number;
  readonly unity: number;
  readonly stability: number;
  readonly protest: number;
};

// Per unit of severity. A killing by federal forces is the heaviest thing this
// file can do: its integrity cost is a broken first-hundred-days pledge, and its
// protest shock is forty weeks of the most inflammatory policy in the catalog
// landing at once, which is what a shooting on video is.
const INCIDENTS: Readonly<Record<CoercionKind, readonly [Incident, Incident]>> = {
  agents: [
    { key: "arrests", headline: (place) => `Federal agents in ${place} detain protesters without charge`, grave: false, integrity: 0.02, unity: 0.015, stability: 0.01, protest: 0.025 },
    { key: "killed", headline: (place) => `A civilian is shot dead by federal agents in ${place}`, grave: true, integrity: 0.05, unity: 0.04, stability: 0.025, protest: 0.06 },
  ],
  troops: [
    { key: "clash", headline: (place) => `Troops and crowds clash in ${place}`, grave: false, integrity: 0.025, unity: 0.02, stability: 0.015, protest: 0.035 },
    { key: "killed", headline: (place) => `Soldiers open fire in ${place}; civilians are dead`, grave: true, integrity: 0.07, unity: 0.05, stability: 0.035, protest: 0.08 },
  ],
  surveillance: [
    { key: "exposed", headline: (place) => `A federal surveillance program in ${place} is exposed`, grave: false, integrity: 0.02, unity: 0.01, stability: 0.005, protest: 0.015 },
    { key: "journalists", headline: (place) => `Surveillance in ${place} reached reporters and lawmakers`, grave: true, integrity: 0.05, unity: 0.02, stability: 0.01, protest: 0.03 },
  ],
};

/** Below this share of the odds an incident is the grave one; the rest of the odds are the lesser one. */
const GRAVE_SHARE = 0.35;

const round4 = (value: number) => Math.round(value * 10000) / 10000 + 0;
const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

function incidentEffects(campaign: Campaign, incident: Incident, severity: number, place: string): readonly Effect[] {
  const nation = campaign.founding.nation;
  const protest = campaign.nations[nation]?.stats.politics.protestPressure ?? 0;
  const scandal = `scandal:${incident.headline(place).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+$/, "")}`;
  return [
    { kind: "opinion", deltas: { integrity: -round4(incident.integrity * severity), unity: -round4(incident.unity * severity) }, polarize: round4(0.01 * severity) },
    { kind: "metric", deltas: { stability: -round4(incident.stability * severity) } },
    { kind: "nationStat", nation, setStats: { politics: { protestPressure: round4(clamp01(protest + incident.protest * severity)) } } },
    ...(incident.grave ? [{ kind: "flag" as const, set: markedFlags([scandal], campaign.turn) }] : []),
  ];
}

export type CoercionOutcome = {
  readonly effects: readonly Effect[];
  /** The incident's headline, for the packet's narration; absent when nothing went wrong this time. */
  readonly incident?: string;
  readonly outlook: CoercionOutlook;
};

/**
 * Everything one coercive act sets in motion beyond its price: the deed flags
 * tempo and the inquiry read, the cost of a run when this act extends one, and
 * the incident, if the draw finds one. The draw has its own stream, keyed by
 * the state, the week and how many acts preceded it ever, so taking the same
 * act twice in a week is two draws and an old save's other streams are untouched.
 */
export function coercionOutcome(campaign: Campaign, state: StateId, place: string, risk: CoercionRisk, provoked = true): CoercionOutcome {
  const outlook = coercionOutlook(campaign, risk, provoked);
  const deeds: readonly FlagId[] = [coercedFlag(risk.kind, state, coercionCount(campaign)), ...(risk.kind === "surveillance" ? [surveillanceFlag(state)] : [])];
  const effects: Effect[] = [{ kind: "flag", set: markedFlags(deeds, campaign.turn) }];
  if (!provoked) effects.push({ kind: "opinion", deltas: { integrity: -UNPROVOKED_INTEGRITY }, polarize: UNPROVOKED_POLARIZE });
  if (outlook.erratic) {
    const run = outlook.recent + 1 - ERRATIC_FROM + 1;
    effects.push({ kind: "opinion", deltas: { competence: -round4(ERRATIC_COMPETENCE * run), unity: -round4(ERRATIC_UNITY * run) } });
  }
  const draw = createRngStreams(campaign.seed).stream("coercion-incident", state, campaign.turn, coercionCount(campaign)).next();
  if (draw >= outlook.odds) return { effects, outlook };
  const [lesser, grave] = INCIDENTS[risk.kind];
  const incident = draw < outlook.odds * GRAVE_SHARE ? grave : lesser;
  return { effects: [...effects, ...incidentEffects(campaign, incident, outlook.severity, place)], incident: incident.headline(place), outlook };
}
