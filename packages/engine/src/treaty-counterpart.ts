import { agendaTheme, type AgendaTheme, type NationId, type NationTraits, type RoleId } from "@admin/world";
import { selectNation, selectRelationship, type Campaign, type PersonRuntime, type TreatyKind } from "./state.js";
import { createRngStreams } from "./rng.js";
import { liveTemperament, TEMPERAMENT_CENTER } from "./temperament.js";
import { nationName, sentenceCase } from "./naming.js";
import { selectChairRunner } from "./appointments.js";
import { foreignLeaderFor } from "./foreign-leader.js";
import { axisLean, DISPOSITION_CENTER, leaderRapport } from "./person-disposition.js";
import {
  noiseFrom,
  projectWillingness,
  stampOf,
  weigh,
  willDraw,
  type DecisionStamp,
  type Term,
  type TermKey,
  type WillingnessForecast,
  type WillingnessProjection,
} from "./willingness.js";

// Whether the other government will sign. A treaty the Senate would ratify is
// still nothing until the counterpart puts its name to it, and that is a
// decision of its own, weighed from its trust in the United States and its
// own temperament.
//
// It sits after the administration's own trust floor, which stays: this
// government will not send a delegation to one it does not trust, and the
// other government will not sign with one it does not trust, and those are two
// different readings on two different edges.

/**
 * Where the counterpart's weighing must land for it to sign, by kind. A named
 * input rather than a buried constant, so a rule that makes treaty partners
 * more willing lowers it in one place and the stamp records the line it used.
 * Planning values: an executive agreement is the easiest thing to sign and a
 * mutual-defense treaty the hardest.
 */
export const ACCEPT_TREATY_THRESHOLDS: Readonly<Record<TreatyKind, number>> = {
  alliance: 0.2,
  trade: 0,
  "arms-control": 0.05,
  "executive-agreement": -0.15,
};

const ACCEPT_NOISE = 0.1;

// What each kind of instrument does for each kind of aim.
const TREATY_AFFINITY: Readonly<Record<TreatyKind, Record<AgendaTheme, number>>> = {
  alliance: { security: 0.9, economic: 0.3, prestige: 0.6, autonomy: 0.2, internal: 0.3 },
  trade: { security: 0.3, economic: 0.95, prestige: 0.5, autonomy: 0.5, internal: 0.5 },
  "arms-control": { security: 0.8, economic: 0.4, prestige: 0.7, autonomy: 0.4, internal: 0.4 },
  "executive-agreement": { security: 0.5, economic: 0.6, prestige: 0.5, autonomy: 0.5, internal: 0.5 },
};

/** How heavily a kind of instrument binds the government that signs it, which is what isolationism and legalism weigh. */
const BINDING: Readonly<Record<TreatyKind, number>> = {
  alliance: 1,
  trade: 0.6,
  "arms-control": 0.8,
  "executive-agreement": 0.3,
};

/** How much the Secretary of State's hand counts at the signing, scaled by how heavily the kind binds. */
const ENVOY_WEIGHT = 0.25;
/** How much the two leaders' rapport counts at the signing: less than in a meeting, because a treaty outlives both of them. */
const RAPPORT_WEIGHT = 0.1;

const round4 = (v: number) => Math.round(v * 10000) / 10000 || 0;

function affinity(temper: NationTraits, kind: TreatyKind): number {
  const total = temper.agendas.reduce((sum, agenda) => sum + agenda.weight, 0);
  if (total === 0) return 0.5;
  const weighted = temper.agendas.reduce((sum, agenda) => {
    const theme = agendaTheme(agenda.id);
    return sum + (theme ? TREATY_AFFINITY[kind][theme] : 0.5) * agenda.weight;
  }, 0);
  return weighted / total;
}

// --- The people at the table ----------------------------------------------
//
// Who the President sends and how the President gets on with the other leader
// weigh on a treaty and on every meeting alike. They are read here rather than
// in engagement.ts because engagement imports the wire desk, and a treaty
// module that imported engagement would pull the wire desk into the import
// cycle the treaty and instrument modules already share.

const SECRETARY_OF_STATE = "role-foreign-minister" as RoleId;

/**
 * The craft of the typical Secretary of State a President could name, and half
 * the distance from the weak end of that bench to the strong end (its 10th to
 * 90th percentile), measured over every State-eligible American in the founding
 * pools of the balance seeds and pinned by a test that measures them again.
 *
 * The Secretary is read against the people who could hold the job, not against
 * the cabinet as a whole: every plausible Secretary of State is a better
 * diplomat than the typical cabinet member, so a cabinet-wide middle would make
 * every Secretary a help and barely tell a strong one from a weak one.
 */
export const STATE_BENCH_MEDIAN = 0.783;
export const STATE_BENCH_HALF_SPREAD = 0.0562;

/**
 * Where an empty State Department sits on the same reading: below the weakest
 * Secretary on the bench, because a weak Secretary still makes the case and an
 * empty chair has nobody senior to make it.
 */
export const VACANT_BENCH_LEAN = -1.25;

/** Whoever runs the State Department this week: the confirmed Secretary, or the acting. */
export function secretaryOfState(campaign: Campaign): PersonRuntime | undefined {
  return selectChairRunner(campaign, SECRETARY_OF_STATE);
}

/**
 * How the Secretary of State compares with the people who could hold the job,
 * -1 (the weak end of the bench) to 1 (the strong end). An empty chair reads
 * below the whole bench.
 */
export function envoyBenchLean(campaign: Campaign): number {
  const secretary = secretaryOfState(campaign);
  if (!secretary) return VACANT_BENCH_LEAN;
  const craft = axisLean(secretary.base, "craft") + DISPOSITION_CENTER.craft;
  return round4(Math.max(-1, Math.min(1, (craft - STATE_BENCH_MEDIAN) / STATE_BENCH_HALF_SPREAD)));
}

/**
 * The same reading back on the craft scale, which is the unit the receive and
 * treaty weights were set in: a Secretary at the strong end of the bench is
 * worth half the bench's spread in craft.
 */
export function envoyLean(campaign: Campaign): number {
  return round4(envoyBenchLean(campaign) * STATE_BENCH_HALF_SPREAD);
}

/**
 * How well the President and this government's leader get on, -1..1 off the
 * typical pair. Undefined where either leader is not on the record, which
 * leaves the term out rather than reading a stranger as a typical pair.
 */
export function presidentRapport(campaign: Campaign, nation: NationId): number | undefined {
  const president = foreignLeaderFor(campaign, campaign.founding.nation);
  const leader = foreignLeaderFor(campaign, nation);
  const ours = president && campaign.people[president.person]?.base;
  const theirs = leader && campaign.people[leader.person]?.base;
  return ours && theirs ? leaderRapport(ours, theirs) : undefined;
}

/** How much the counterpart's own trust in the United States counts toward signing. */
const TRUST_IN_US_WEIGHT = 0.8;

/**
 * The counterpart's terms. Its trust is read on its own edge toward the United
 * States, not ours toward it; its temperament is the live one, so a successor
 * seated abroad signs or refuses as the new government would. The Secretary of
 * State who negotiated it and the two leaders' rapport are read as they stand.
 */
function acceptTerms(campaign: Campaign, counterpart: NationId, kind: TreatyKind): readonly Term[] | undefined {
  const edge = selectRelationship(campaign, counterpart, campaign.founding.nation);
  const temper = liveTemperament(campaign, counterpart);
  if (!edge || !temper) return undefined;
  const binding = BINDING[kind];
  return [
    { key: "trust-in-us", source: "interest", value: round4(TRUST_IN_US_WEIGHT * edge.trust) },
    { key: "agenda-fit", source: "interest", value: round4(0.4 * (affinity(temper, kind) - 0.5)) },
    { key: "legalism", source: "trait", value: round4(0.3 * binding * (temper.legalism - TEMPERAMENT_CENTER.legalism)) },
    { key: "reliability", source: "trait", value: round4(0.2 * binding * (temper.reliability - TEMPERAMENT_CENTER.reliability)) },
    { key: "isolationism", source: "trait", value: round4(-0.4 * binding * (temper.isolationism - TEMPERAMENT_CENTER.isolationism)) },
    { key: "envoy", source: "situation", value: round4(ENVOY_WEIGHT * binding * envoyLean(campaign)) },
    ...rapportTerm(campaign, counterpart),
  ];
}

function rapportTerm(campaign: Campaign, counterpart: NationId): readonly Term[] {
  const rapport = presidentRapport(campaign, counterpart);
  return rapport === undefined ? [] : [{ key: "rapport", source: "trait", value: round4(RAPPORT_WEIGHT * rapport) }];
}

/**
 * The counterpart's willingness to sign a treaty of this kind, forecast
 * without the draw. Undefined where the two governments hold no relationship.
 */
export function counterpartWillingness(
  campaign: Campaign,
  counterpart: NationId,
  kind: TreatyKind,
  threshold: number = ACCEPT_TREATY_THRESHOLDS[kind],
): WillingnessProjection | undefined {
  const terms = acceptTerms(campaign, counterpart, kind);
  if (!terms) return undefined;
  return projectWillingness("accept-treaty", terms, { threshold, noiseBound: ACCEPT_NOISE });
}

/**
 * The counterpart's reasoning as it stands, with no draw in it: what a reading
 * of the offer may name before it is made. Never applied.
 */
export function counterpartPreview(campaign: Campaign, counterpart: NationId, kind: TreatyKind): DecisionStamp | undefined {
  const terms = acceptTerms(campaign, counterpart, kind);
  if (!terms) return undefined;
  const preview = weigh("accept-treaty", terms, { threshold: ACCEPT_TREATY_THRESHOLDS[kind], noiseBound: ACCEPT_NOISE, noise: 0 });
  return stampOf(preview, counterpart as string, kind, "intelligence");
}

/** The counterpart's decision with its one draw, keyed without the week: the same offer gets the same answer until a term moves. */
export function counterpartDecision(
  campaign: Campaign,
  counterpart: NationId,
  kind: TreatyKind,
  threshold: number = ACCEPT_TREATY_THRESHOLDS[kind],
): DecisionStamp | undefined {
  const terms = acceptTerms(campaign, counterpart, kind);
  if (!terms) return undefined;
  const draw = willDraw(createRngStreams(campaign.seed), "accept-treaty", counterpart, kind);
  const decision = weigh("accept-treaty", terms, { threshold, noiseBound: ACCEPT_NOISE, noise: noiseFrom(draw, ACCEPT_NOISE) });
  return stampOf(decision, counterpart as string, kind, "intelligence");
}

// A refusal names the term that settled it and no figure. Each is said the way
// a cable back from the embassy would put it.
const REFUSALS: Readonly<Partial<Record<TermKey, (name: string) => string>>> = {
  "trust-in-us": (name) => `${name} does not trust this government enough to bind itself to it.`,
  "agenda-fit": (name) => `${name} sees nothing in it that serves what it is after.`,
  legalism: (name) => `${name} will not take on an obligation its own institutions have not argued through.`,
  reliability: (name) => `${name} will not sign what it is not sure it would keep.`,
  isolationism: (name) => `${name} wants no part of a commitment abroad.`,
  envoy: (name) => `${name} was not persuaded by the case the State Department made.`,
  rapport: (name) => `${name}'s leader will not put their name beside the President's.`,
};

// What a reading of the other side says about the offer, by the term that
// leads it, in the direction it pulls.
const REASONS: Readonly<Partial<Record<TermKey, { readonly up: string; readonly down: string }>>> = {
  "trust-in-us": { up: "its trust in the United States", down: "its distrust of the United States" },
  "agenda-fit": { up: "what it is after abroad", down: "aims this does not serve" },
  legalism: { up: "its regard for binding law", down: "its wariness of binding obligations" },
  reliability: { up: "a habit of keeping its word", down: "doubt it could keep this one" },
  isolationism: { up: "a readiness to commit abroad", down: "a wish to stay out of others' affairs" },
  envoy: { up: "the skill of your Secretary of State", down: "a weak hand at your State Department" },
  rapport: { up: "a good personal rapport between the leaders", down: "bad blood between the leaders" },
};

/**
 * Where the counterpart's own trust in the United States would have to stand
 * for its weighing of this kind to clear the line, every other term held where
 * it is. A forecast, not a promise: the decision still carries its draw, so a
 * government near the line can go either way. Undefined where the two hold no
 * relationship.
 */
export function counterpartTrustFloor(campaign: Campaign, counterpart: NationId, kind: TreatyKind): number | undefined {
  const edge = selectRelationship(campaign, counterpart, campaign.founding.nation);
  const willing = counterpartWillingness(campaign, counterpart, kind);
  if (!edge || !willing) return undefined;
  return round4(edge.trust - willing.margin / TRUST_IN_US_WEIGHT);
}

export type TreatyRefusal = { readonly ok: false; readonly reason: string; readonly decision: DecisionStamp };

/**
 * The signature gate's one call. Undefined when the counterpart signs, a
 * refusal carrying its own stamp when it will not.
 */
export function counterpartRefusal(campaign: Campaign, counterpart: NationId, kind: TreatyKind): TreatyRefusal | undefined {
  const decision = counterpartDecision(campaign, counterpart, kind);
  if (!decision || decision.acts) return undefined;
  const base = selectNation(campaign, counterpart)?.base;
  const name = sentenceCase(base ? nationName(base.identity) : (counterpart as string));
  // A thin record's temperament is its region's, so a refusal never blames it
  // on a character the country was never authored with.
  const thin = (base?.fidelity ?? "full") !== "full";
  const leading = decision.terms.filter((term) => !(thin && term.source === "trait")).sort((a, b) => a.value - b.value)[0];
  const line = (leading && REFUSALS[leading.key]) ?? ((n: string) => `${n} will not sign.`);
  return { ok: false, reason: line(name), decision };
}

export type TreatyForecast = {
  readonly forecast: WillingnessForecast;
  /** The two terms that lead the reading, as plain phrases, heaviest first. */
  readonly reasons: readonly string[];
};

/** Whether the counterpart would sign, said before the offer is made: likely, unlikely or a close call, and the two readings that lead it. */
export function treatyForecast(campaign: Campaign, counterpart: NationId, kind: TreatyKind): TreatyForecast | undefined {
  const projection = counterpartWillingness(campaign, counterpart, kind);
  if (!projection) return undefined;
  const terms = acceptTerms(campaign, counterpart, kind) ?? [];
  const reasons = projection.leading.slice(0, 2).flatMap((key) => {
    const phrase = REASONS[key];
    const value = terms.find((term) => term.key === key)?.value ?? 0;
    return phrase ? [value >= 0 ? phrase.up : phrase.down] : [];
  });
  return { forecast: projection.forecast, reasons };
}
