import type { NationId } from "@admin/world";
import { INSTRUMENT_COERCION, type InstrumentId, type RungLevel } from "./instruments.js";
import { retained } from "./relationships.js";
import { selectNation, selectRelationship, type ActionRecord, type Campaign } from "./state.js";
import { liveTemperament } from "./temperament.js";

// What a government means to do about what was just done to it.
//
// The agent weighed every move on the standing record between two countries,
// and a coercive act that landed moved that record by a few hundredths. So a
// government sanctioned by the United States weighed its answer exactly as it
// had weighed the week before, and China answered nothing in twelve weeks on
// any seed. A received act is a reason of its own: it leaves a pending intent
// to answer the government that did it, which fades with time and is spent by
// answering.
//
// The intent is read off the ledger rather than kept as state. Every coercive
// act through the resolver states its actor, target, instrument, rung and
// whether the target could see it, so the reading is the record's and a save
// written before this module carries everything it needs.
//
// An answer is not a mirror. The intent says who to answer and how hard the
// thing answered was; the agent's own terms choose the instrument, so a protest,
// an asymmetric move, a later answer or holding all remain answers a government
// can give, and a small state facing a great power mostly gives the last.

/** How long a received act stays answerable, in weeks. A quarter: past it the act is the record's, not the week's. */
export const RESPONSE_WINDOW_WEEKS = 13;

// Planning value: half the pull is gone six weeks after the act. Retaliation
// to trade measures has typically come within weeks; a season later the
// moment to be seen answering has passed and the grievance lives on as trust.
const RESPONSE_HALF_LIFE_DAYS = 42;

const DAYS_PER_WEEK = 7;

// A failed act was still aimed at the government, and it saw it aimed.
const FAILED_SHARE = 0.6;

// An act that was itself an answer to something the receiver did first raises
// half the intent a first move does. That is the loop's gain: each round of an
// exchange asks for less than the one before, so two governments answering each
// other settle rather than spiral.
const REPLY_SHARE = 0.5;

// How fast received pressure saturates the intent. Set so one targeted
// sanction reads about two thirds of the way to a full intent, and ten of them
// in a week read no more than full: a government answers being sanctioned, it
// does not answer each designation separately.
const SATURATION_RATE = 3;

// A government aligned at this or better with the one coerced reads the act as
// partly aimed at itself, at this share of its alignment, and only the closest
// few do: an act on Poland is a matter for its nearest allies, not for every
// member of every body it sits in. Partners speak up; they rarely carry the
// quarrel as their own, so a partner's answer is measured against a protest.
// Without the limit one Russian move on Poland drew answers from two dozen
// capitals, and the world's military pressure doubled on the exchanges.
const PARTNER_ALIGNMENT = 0.5;
const PARTNER_SHARE = 0.35;
const PARTNER_LIMIT = 3;

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/** One coercive act the record states, as a reader of who did what to whom. */
export type StatedAct = {
  readonly actor: NationId;
  readonly target: NationId;
  readonly instrument: InstrumentId;
  readonly rung: RungLevel;
  readonly turn: number;
  /**
   * The act's place in the ledger. Two governments can answer each other inside
   * one week, since each acting government's packet lands before the next one
   * decides, so which came first is read from the record's order, never the turn.
   */
  readonly order: number;
  readonly landed: boolean;
  /** The actor's own stamp says the act was an answer to something. */
  readonly answering: boolean;
};

/** What one government means to answer, and the act its answer is measured against. */
export type ResponseIntent = {
  readonly toward: NationId;
  /** 0..1, after decay, saturation, resolve and whatever answers it has already given. */
  readonly intent: number;
  readonly instrument: InstrumentId;
  readonly rung: RungLevel;
  /** The partner coerced, where the intent is a partner's rather than the target's own. */
  readonly onBehalfOf?: NationId;
  /** The heaviest act it is answering, as it was made: what a bulletin names. */
  readonly answered: { readonly instrument: InstrumentId; readonly rung: RungLevel };
};

/** Every government's pending intents, keyed by holder then by the government it would answer. */
export type ResponseBook = ReadonlyMap<string, ReadonlyMap<string, ResponseIntent>>;

function statedAct(campaign: Campaign, entry: ActionRecord, order: number): StatedAct | undefined {
  const commitment = entry.commitment;
  const causal = entry.causal;
  if (!commitment || !causal || commitment.instrument === "assistance") return undefined;
  // A covert act the target never saw is not something it can answer.
  if (causal.visibility !== "public") return undefined;
  const actor = (entry.actor === "player" ? campaign.founding.nation : (causal.decision?.actor ?? causal.entities?.[0])) as
    | NationId
    | undefined;
  if (!actor || actor === commitment.target) return undefined;
  return {
    actor,
    target: commitment.target,
    instrument: commitment.instrument,
    rung: commitment.rung,
    turn: entry.turn,
    order,
    landed: commitment.landed !== false,
    answering: causal.decision?.terms.some((term) => term.key === "response" && term.value > 0) ?? false,
  };
}

/** The coercive acts inside the answerable window, oldest first. */
export function actsInWindow(campaign: Campaign): readonly StatedAct[] {
  const cutoff = campaign.turn - RESPONSE_WINDOW_WEEKS;
  const acts: StatedAct[] = [];
  const tariffOrders = new Map<string, number>();
  for (let i = campaign.ledger.length - 1; i >= 0; i -= 1) {
    const entry = campaign.ledger[i]!;
    // The ledger is appended in turn order, give or take the week a phase
    // stamps ahead, so the walk stops a little past the window.
    if (entry.turn < cutoff - 2) break;
    if (entry.turn < cutoff) continue;
    const act = statedAct(campaign, entry, i);
    if (act) acts.push(act);
    for (const target of tariffOrderTargets(campaign, entry)) tariffOrders.set(`${entry.turn}:${target}`, i);
  }
  return [...acts, ...tariffActs(campaign, cutoff, tariffOrders)].sort((a, b) => a.order - b.order);
}

// A tariff the President signs goes through the trade book rather than the
// resolver, so its ledger entry states no commitment; the measure it writes is
// the record. The entry is found by its week, the President as actor and the
// trade system, which is the shape every tariff order is filed in.
function tariffOrderTargets(campaign: Campaign, entry: ActionRecord): readonly string[] {
  if (entry.actor !== "player" || entry.commitment || !(entry.causal?.systems ?? []).includes("trade")) return [];
  return (entry.causal?.entities ?? []).filter((id) => campaign.nations[id as NationId] !== undefined);
}

// A tariff order and the answer the trade book drew for it, as acts the book
// reads. The answer is the partner's from the moment it is drawn, because the
// trade book commits it then and lands it weeks later: reading it as spent from
// the start is what keeps a partner from answering one tariff twice, once
// through the trade book and once through its own agent.
function tariffActs(campaign: Campaign, cutoff: number, orders: ReadonlyMap<string, number>): readonly StatedAct[] {
  const us = campaign.founding.nation;
  return Object.values(campaign.trade.measures)
    .filter((measure) => measure.kind === "tariff" && measure.origin === "us" && measure.imposedTurn >= cutoff)
    .sort((a, b) => a.id.localeCompare(b.id))
    .flatMap((measure) => {
      const order = orders.get(`${measure.imposedTurn}:${measure.target}`);
      if (order === undefined) return [];
      const base = { instrument: "economic" as const, rung: 2 as RungLevel, turn: measure.imposedTurn, landed: true };
      const tariff: StatedAct = { ...base, actor: us, target: measure.target, order, answering: false };
      const answer = campaign.trade.retaliation.find((record) => record.answering === measure.id);
      return answer ? [tariff, { ...base, actor: answer.by, target: us, order: order + 0.5, answering: true }] : [tariff];
    });
}

/** How hard an act pressed, before age: the instrument's coercion, the rung's height, and whether it landed. */
export function actWeight(act: Pick<StatedAct, "instrument" | "rung" | "landed">): number {
  return INSTRUMENT_COERCION[act.instrument] * (0.4 + 0.12 * act.rung) * (act.landed ? 1 : FAILED_SHARE);
}

const aged = (campaign: Campaign, turn: number) => retained((campaign.turn - turn) * DAYS_PER_WEEK, RESPONSE_HALF_LIFE_DAYS);

/**
 * How much a government is in a position to answer this one at all: its weight
 * against the other's, its temper, and how much of its own trade it would be
 * putting at risk. Honduras sanctioned by the United States has little weight,
 * a mild temper and two fifths of its trade on the line; China has none of
 * those reasons to hold.
 */
export function resolveToAnswer(campaign: Campaign, holder: NationId, coercer: NationId): number {
  const own = selectNation(campaign, holder);
  const other = selectNation(campaign, coercer);
  const temper = liveTemperament(campaign, holder);
  if (!own || !other || !temper) return 0;
  const weight = clamp01(own.base.bands.powerTier / other.base.bands.powerTier);
  const exposure = clamp01(selectRelationship(campaign, holder, coercer)?.tradeDependence ?? 0);
  return clamp01(weight * 0.45 + temper.vengefulness * 0.3 + temper.aggression * 0.25 - exposure * 0.6);
}

// `firstOrder` is the ledger position of the first act the holder is answering.
type Pressure = { raw: number; heaviest: StatedAct; heaviestWeight: number; firstOrder: number; onBehalfOf?: NationId };

function pressureKey(holder: NationId, coercer: NationId): string {
  return `${holder as string}>${coercer as string}`;
}

// Whether the receiver had already acted on the actor inside the window before
// this act: then the act is the actor's answer, whatever its stamp says. This
// is what reads the President's own answers as answers, since the President's
// acts carry no agent stamp.
function isReply(acts: readonly StatedAct[], act: StatedAct): boolean {
  return act.answering || acts.some((prior) => prior.actor === act.target && prior.target === act.actor && prior.order < act.order);
}

function addPressure(book: Map<string, Pressure>, key: string, act: StatedAct, amount: number, onBehalfOf?: NationId): void {
  const weight = actWeight(act);
  const existing = book.get(key);
  if (!existing) {
    book.set(key, { raw: amount, heaviest: act, heaviestWeight: weight, firstOrder: act.order, ...(onBehalfOf ? { onBehalfOf } : {}) });
    return;
  }
  // An act on the holder itself outranks any act on a partner: once the quarrel
  // is its own, its answer is measured against what was done to it.
  const ownOverPartner = !onBehalfOf && existing.onBehalfOf !== undefined;
  const heavier = ownOverPartner || (Boolean(onBehalfOf) === Boolean(existing.onBehalfOf) && weight > existing.heaviestWeight);
  book.set(key, {
    heaviest: existing.heaviest,
    heaviestWeight: existing.heaviestWeight,
    ...(existing.onBehalfOf && !ownOverPartner ? { onBehalfOf: existing.onBehalfOf } : {}),
    raw: existing.raw + amount,
    firstOrder: Math.min(existing.firstOrder, act.order),
    ...(heavier ? { heaviest: act, heaviestWeight: weight } : {}),
  });
}

/** The closest partners an act on `target` also lands on, closest first and by id on a tie, so every replay builds the same book. */
function partnersOf(campaign: Campaign, target: NationId, actor: NationId): readonly { id: NationId; alignment: number }[] {
  return (Object.keys(campaign.nations) as NationId[])
    .filter((id) => id !== target && id !== actor && id !== campaign.founding.nation)
    .map((id) => ({ id, alignment: selectRelationship(campaign, id, target)?.alignment ?? 0 }))
    .filter((partner) => partner.alignment >= PARTNER_ALIGNMENT)
    .sort((a, b) => b.alignment - a.alignment || (a.id as string).localeCompare(b.id as string))
    .slice(0, PARTNER_LIMIT);
}

function receivedPressure(campaign: Campaign, acts: readonly StatedAct[]): Map<string, Pressure> {
  const book = new Map<string, Pressure>();
  const player = campaign.founding.nation;
  for (const act of acts) {
    const reply = isReply(acts, act);
    const amount = actWeight(act) * aged(campaign, act.turn) * (reply ? REPLY_SHARE : 1);
    if (act.target !== player) addPressure(book, pressureKey(act.target, act.actor), act, amount);
    // Only a first move reaches the target's partners: an answer they hear as
    // the quarrel their partner started, and carrying it would turn every
    // exchange into a bloc's.
    if (reply) continue;
    for (const partner of partnersOf(campaign, act.target, act.actor)) {
      addPressure(book, pressureKey(partner.id, act.actor), act, amount * PARTNER_SHARE * partner.alignment, act.target);
    }
  }
  return book;
}

// What the holder has already given the coercer after the first act it is
// answering: every coercive act of its own recorded later, at its own weight
// and age. An act of its own earlier in the same week is what provoked the
// coercer, not an answer to it.
function answeredSince(campaign: Campaign, acts: readonly StatedAct[], holder: NationId, coercer: NationId, after: number): number {
  return acts
    .filter((act) => act.actor === holder && act.target === coercer && act.order > after)
    .reduce((sum, act) => sum + actWeight(act) * aged(campaign, act.turn), 0);
}

// Answers spend the intent in proportion to the pressure they answer: as much
// pressure given back as was received, at the same age, spends it all, and a
// protest against a sanction spends a little. Measured against the pressure
// rather than the saturated intent, so ten sanctions want more answering than
// one, though no more urgently.
function intentFrom(campaign: Campaign, acts: readonly StatedAct[], holder: NationId, coercer: NationId, pressure: Pressure): ResponseIntent | undefined {
  const wanted = (1 - Math.exp(-pressure.raw * SATURATION_RATE)) * resolveToAnswer(campaign, holder, coercer);
  const answered = answeredSince(campaign, acts, holder, coercer, pressure.firstOrder);
  const intent = wanted * Math.max(0, 1 - answered / pressure.raw);
  if (intent <= 0.001) return undefined;
  // A partner's answer is measured against a protest a step below the act,
  // since the quarrel is its partner's before it is its own.
  const partner = pressure.onBehalfOf !== undefined;
  return {
    toward: coercer,
    intent: Math.round(clamp01(intent) * 10000) / 10000,
    instrument: partner ? "diplomatic" : pressure.heaviest.instrument,
    rung: (partner ? Math.max(1, pressure.heaviest.rung - 1) : pressure.heaviest.rung) as RungLevel,
    ...(pressure.onBehalfOf ? { onBehalfOf: pressure.onBehalfOf } : {}),
    answered: { instrument: pressure.heaviest.instrument, rung: pressure.heaviest.rung },
  };
}

/** Every government's pending intent to answer, read off the window of the record. */
export function responseBook(campaign: Campaign): ResponseBook {
  const acts = actsInWindow(campaign);
  const book = new Map<string, Map<string, ResponseIntent>>();
  const pressures = [...receivedPressure(campaign, acts).entries()].sort(([a], [b]) => a.localeCompare(b));
  for (const [key, pressure] of pressures) {
    const [holder, coercer] = key.split(">") as [NationId, NationId];
    const intent = intentFrom(campaign, acts, holder, coercer, pressure);
    if (!intent) continue;
    const row = book.get(holder as string) ?? new Map<string, ResponseIntent>();
    row.set(coercer as string, intent);
    book.set(holder as string, row);
  }
  return book;
}

/** The heaviest intent a government holds against anybody: what the actor draw reads. */
export function strongestIntent(book: ResponseBook, holder: NationId): number {
  const row = book.get(holder as string);
  if (!row) return 0;
  return [...row.values()].reduce((max, entry) => Math.max(max, entry.intent), 0);
}

// How well a move answers the act it is measured against. The act's own
// instrument fits best; a protest always fits well, because a protest is an
// answer any government can give in proportion; another coercive instrument is
// the asymmetric answer and fits less. Height is measured as pressure rather
// than as a rung number, since a show of force presses harder than a targeted
// sanction a rung above it: an answer that presses harder than the act loses
// its fit in proportion to the excess, because an answer that overshoots is a
// new escalation, and one that presses less loses a little.
const SAME_INSTRUMENT = 1;
const PROTEST = 0.8;
const ASYMMETRIC = 0.6;
const OVERSHOOT_COST = 1;
const UNDERSHOOT_COST = 0.2;

export function answerFit(intent: Pick<ResponseIntent, "instrument" | "rung">, instrument: InstrumentId, rung: RungLevel): number {
  if (instrument === "assistance") return 0;
  const kind = instrument === intent.instrument ? SAME_INSTRUMENT : instrument === "diplomatic" ? PROTEST : ASYMMETRIC;
  const owed = actWeight({ instrument: intent.instrument, rung: intent.rung, landed: true });
  const given = actWeight({ instrument, rung, landed: true });
  const gap = (given - owed) / owed;
  return kind * clamp01(1 - (gap > 0 ? gap * OVERSHOOT_COST : -gap * UNDERSHOOT_COST));
}

/** The response term for one candidate: the pending intent toward its target, by how well the move answers it. */
export function responsePull(intent: ResponseIntent | undefined, instrument: InstrumentId, rung: RungLevel): number {
  if (!intent) return 0;
  return Math.round(intent.intent * answerFit(intent, instrument, rung) * 10000) / 10000;
}
