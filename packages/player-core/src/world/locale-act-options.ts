import {
  LOCALE_ACTS,
  REVIEW_DEFERRAL_TURNS,
  RELIEF_SIGNATURE_PREFIX,
  SURVEILLANCE_ORDER_KINDS,
  coercionOutcome,
  coercionOutlook,
  governorAssents,
  hazardLabel,
  homeActAvailability,
  liveCourtOrder,
  liveLocaleMissions,
  localeAct,
  localeActAuthority,
  localeActPrice,
  localeActProjection,
  localeAvailability,
  openRequests,
  reliefSignature,
  selectActiveConditions,
  statePartyName,
  surveillanceRisk,
  takeHomeAct,
  takeLocaleAct,
  unrestReaching,
  type Campaign,
  type ConditionKind,
  type EffectPacket,
  type LocaleAct,
  type LocaleActGroup,
  type LocaleActId,
  type LocaleActProjection,
  type LocaleAvailability,
  type OrderProjection,
  type ProspectiveOrderAuthority,
  type LocaleGateCheck,
} from "@admin/engine";
import type { StateId } from "@admin/world";
import { orderAuthorityRecord } from "../authority/registry";
import { formatSignedPoints } from "../format/figures";
import { formatMoney } from "../format/money";
import { holdingCount } from "./nation-forces";

// The acts a President can aim at one state. The cost and standing shown are
// the act's own price (`localeActPrice`), never totals read off the packet:
// the packet the engine builds for the commit already carries whether a suit
// is filed and whether something goes wrong, and summing it would show the
// President the answer before the choice. Litigation is shown as the odds the
// signature is drawn against, never as the draw.

/** Something in the state a locale act can answer: a live condition, a governor's request, or both. */
export type LocaleMatter = {
  readonly cause: ConditionKind;
  readonly title: string;
  /** The governor's open request over it, when there is one. */
  readonly request?: { readonly reason: string; readonly weeksLeft: number; readonly weight: number };
  /** 0..1, when a live condition carries it. */
  readonly severity?: number;
};

/** The law an act runs on, with the registry record a card opens for it. */
export type LocaleActAuthorityView = { readonly cite: string; readonly name: string; readonly limit: string; readonly recordId?: string };

/** What a suit against the act's mission order looks like before it is signed: odds only. */
export type LocaleLitigation = {
  /** 0..1: the chance somebody sues, the chance the signature is drawn against. */
  readonly filingChance: number;
  /** 0..1: the chance a court sets the order aside once challenged. */
  readonly meritsChance: number;
  /** Who would sue, states first. */
  readonly plaintiffs: readonly string[];
  /** The Attorney General's review, where the order reaches far enough to get one. */
  readonly counsel?: { readonly name: string; readonly objects: boolean };
  readonly reasoning: string;
  /** 0..1: the chance a court pauses the mission once a suit reaches interim relief. */
  readonly interimRelief?: number;
};

export type LocaleActOption = {
  readonly id: LocaleActId;
  readonly name: string;
  readonly summary: string;
  readonly group: LocaleActGroup;
  /** USD millions this obligates up front. */
  readonly cost: number;
  readonly costText: string;
  /** Standing given up at home, as a positive share; zero when it costs none. */
  readonly standing: number;
  readonly standingText: string;
  /** Relief the state did not ask for, which its governor will say so about. */
  readonly unrequested: boolean;
  /** Whether it discharges the state's open request over this matter. */
  readonly answers: boolean;
  /** Whether it buys the request more time instead. */
  readonly defers: boolean;
  /** The governor's part, said plainly, where the act needs their assent. */
  readonly assent?: string;
  readonly needsDeclaration: boolean;
  /** Why it cannot be taken now; absent when it can. */
  readonly locked?: string;
  /** The packet authorizing commits, built against this campaign. Absent when locked. */
  readonly packet?: EffectPacket;
  /**
   * For force or surveillance aimed at Americans: the chance something goes
   * wrong and how many recent acts are raising it. Only the odds: whether it
   * does go wrong is in the packet, and is read on the receipt, never before.
   */
  readonly risk?: { readonly odds: number; readonly recent: number; readonly erratic: boolean };
  /** Sent with no unrest to answer: read as overreach, and priced as it. */
  readonly unprovoked?: true;
  readonly authority?: LocaleActAuthorityView;
  /** Each legal condition the act waits on, and whether it holds this week. */
  readonly gates: readonly LocaleGateCheck[];
  readonly litigation?: LocaleLitigation;
  /** The standing mission it opens: the formations, the weekly bill and the term. */
  readonly commitment?: { readonly forcesText?: string; readonly weeklyText: string; readonly weeks: number };
  /**
   * What it does for the unrest: mission attention (0..1) for some weeks, and
   * the signed change to national protest pressure, negative where it eases.
   */
  readonly eases?: { readonly attention: number; readonly weeks: number; readonly protest: number };
  /** The governor's step toward (positive) or away from the administration. */
  readonly governorShift?: number;
  /** The act that must come first, said plainly. */
  readonly step?: { readonly after: "proclaim"; readonly text: string };
  /** Closed by law in every case: why, with the law, and the lawful act beside it. Never a button. */
  readonly refusedByLaw?: { readonly reason: string; readonly neighbor: "priority" | "surveil-under-order" };
};

/** A state's request on a clock: said beside the options as what goes unanswered, never as one of them. */
export type LocaleWaiting = {
  readonly line: string;
  readonly weeksLeft: number;
};

/** A federal mission running in a state, as a desk lists it. */
export type LocaleMissionView = {
  readonly act: LocaleActId;
  readonly name: string;
  /** The week it was ordered. */
  readonly since: number;
  readonly status: "in force" | "not yet in force" | "paused by a court" | "ended";
};

const causeOfClaim = (signature: string): ConditionKind | undefined =>
  signature.startsWith(`${RELIEF_SIGNATURE_PREFIX}:`) ? (signature.slice(RELIEF_SIGNATURE_PREFIX.length + 1) as ConditionKind) : undefined;

/** The conditions in this state, and unrest anywhere at home that reaches it. */
function stateConditions(campaign: Campaign, id: StateId) {
  const placed = selectActiveConditions(campaign).filter((condition) => condition.nation === campaign.founding.nation && condition.state === id);
  const unrest = unrestReaching(campaign, id);
  return unrest && !placed.some((condition) => condition.id === unrest.id) ? [...placed, unrest] : placed;
}

/** What in this state a locale act could answer, requests first, then the worst condition. */
export function localeMatters(campaign: Campaign, id: StateId): readonly LocaleMatter[] {
  const conditions = stateConditions(campaign, id);
  const requests = openRequests(campaign, id);
  const causes = [...new Set([...requests.flatMap((claim) => causeOfClaim(claim.signature) ?? []), ...conditions.map((condition) => condition.kind)])];
  return causes
    .map((cause): LocaleMatter => {
      const claim = requests.find((entry) => entry.signature === reliefSignature(cause));
      const severity = Math.max(-1, ...conditions.filter((condition) => condition.kind === cause).map((condition) => condition.severity));
      return {
        cause,
        title: hazardLabel(cause),
        ...(claim ? { request: { reason: claim.reason, weeksLeft: Math.max(0, claim.expiresTurn - campaign.turn), weight: claim.weight } } : {}),
        ...(severity >= 0 ? { severity } : {}),
      };
    })
    .sort((a, b) => Number(b.request !== undefined) - Number(a.request !== undefined) || (b.severity ?? 0) - (a.severity ?? 0) || a.cause.localeCompare(b.cause));
}

function assentWords(campaign: Campaign, id: StateId, act: LocaleAct): string | undefined {
  if (!act.needsGovernorAssent) return undefined;
  const governor = campaign.states[id]?.governor;
  if (!governor) return "There's no governor in office, so we can't tell whether they'd agree.";
  return governorAssents(governor) ? "The governor agrees to it." : "The governor won't agree to it.";
}

function riskOf(campaign: Campaign, id: StateId, act: LocaleAct, provoked: boolean): LocaleActOption["risk"] {
  const risk = surveillanceRisk(campaign, id, act);
  if (!risk) return undefined;
  const outlook = coercionOutlook(campaign, risk, provoked);
  return { odds: outlook.odds, recent: outlook.recent, erratic: outlook.erratic };
}

/** A weekly bill in USD millions, kept to one decimal below $100M so $13.45M reads $13.5M, not $13M. */
export function formatWeeklyBill(usdMillions: number): string {
  if (Math.abs(usdMillions) >= 100 || Number.isInteger(usdMillions)) return formatMoney(usdMillions);
  const tenths = Math.round(Math.abs(usdMillions) * 10 + 1e-9) / 10;
  return `${usdMillions < 0 ? "-" : ""}$${Number.isInteger(tenths) ? tenths.toFixed(0) : tenths.toFixed(1)}M`;
}

function authorityView(act: LocaleAct): LocaleActAuthorityView | undefined {
  const authority = localeActAuthority(act);
  if (!authority) return undefined;
  const record = orderAuthorityRecord(authority);
  return { cite: authority.cite, name: authority.name, limit: authority.limit, ...(record ? { recordId: record.id } : {}) };
}

const CLASS_WORDS: Readonly<Record<keyof OrderProjection["filing"]["classes"], string>> = {
  advocacy: "Civil liberties and advocacy groups",
  regulated: "Businesses the order binds",
  individuals: "People the mission stops or arrests",
  congress: "Members of Congress",
};

/** At most this many states are named before the rest are counted. */
const NAMED_STATES = 4;

function plaintiffsOf(projection: OrderProjection): readonly string[] {
  const states = projection.filing.states.slice(0, NAMED_STATES).map((entry) => statePartyName(entry.stateId, entry.name));
  const more = projection.filing.states.length - NAMED_STATES;
  const classes = (Object.keys(projection.filing.classes) as (keyof typeof CLASS_WORDS)[])
    .filter((kind) => (projection.filing.classes[kind] ?? 0) > 0).map((kind) => CLASS_WORDS[kind]);
  return [...states, ...(more > 0 ? [`${more} more ${more === 1 ? "state" : "states"}`] : []), ...classes];
}

function litigationOf(projected: LocaleActProjection): LocaleLitigation | undefined {
  const projection = projected.order?.projection;
  if (!projection) return undefined;
  const review = projection.review;
  return {
    filingChance: projection.challengeChance,
    meritsChance: projection.meritsChance,
    plaintiffs: plaintiffsOf(projection),
    ...(review ? { counsel: { name: review.reviewer.base.name, objects: review.objects } } : {}),
    reasoning: projection.reasoning,
    ...(projected.interimRelief ? { interimRelief: projected.interimRelief.chance } : {}),
  };
}

function commitmentOf(projected: LocaleActProjection): LocaleActOption["commitment"] {
  const commitment = projected.commitment;
  if (!commitment) return undefined;
  const forces = commitment.forces;
  return {
    ...(forces ? { forcesText: holdingCount(forces.unitType, forces.count) } : {}),
    weeklyText: formatWeeklyBill(commitment.amountPerTurn),
    weeks: commitment.weeks,
  };
}

function easesOf(projected: LocaleActProjection): LocaleActOption["eases"] {
  const mission = projected.mission;
  if (!mission && projected.protestDelta === 0) return undefined;
  return { attention: mission?.attention ?? 0, weeks: mission?.weeks ?? 0, protest: projected.protestDelta };
}

function stepOf(campaign: Campaign, id: StateId, act: LocaleAct, projected: LocaleActProjection): LocaleActOption["step"] {
  if (act.predicate !== "proclaimed") return undefined;
  const issued = projected.gates.some((gate) => gate.met);
  return {
    after: "proclaim",
    text: issued
      ? `Rests on the proclamation to disperse already issued for ${campaign.states[id]?.base.name ?? id}.`
      : "Issue a proclamation to disperse first. The troops can go in from the following week.",
  };
}

function refusedByLaw(campaign: Campaign, id: StateId, act: LocaleAct, availability: LocaleAvailability): LocaleActOption["refusedByLaw"] {
  if (!act.boundary || availability.ok) return undefined;
  const lawful = liveCourtOrder(campaign, id, SURVEILLANCE_ORDER_KINDS) ? "surveil-under-order" : "priority";
  return { reason: `This needs ${availability.missing}.`, neighbor: lawful };
}

const standingText = (standing: number): string => (standing > 0 ? `${formatSignedPoints(-standing)} pts` : "None");
const costText = (cost: number): string => (cost > 0 ? formatMoney(cost) : "None");

/** The law, the gates, the suit, the mission and its bill: what every desk reads beside the price. */
function legalTerms(campaign: Campaign, id: StateId, base: LocaleAct, projected: LocaleActProjection) {
  const authority = authorityView(projected.act);
  const litigation = litigationOf(projected);
  const commitment = commitmentOf(projected);
  const eases = easesOf(projected);
  const step = stepOf(campaign, id, base, projected);
  const refused = refusedByLaw(campaign, id, base, projected.availability);
  return {
    gates: projected.gates,
    ...(authority ? { authority } : {}),
    ...(litigation ? { litigation } : {}),
    ...(commitment ? { commitment } : {}),
    ...(eases ? { eases } : {}),
    ...(projected.governorShift ? { governorShift: projected.governorShift } : {}),
    ...(step ? { step } : {}),
    ...(refused ? { refusedByLaw: refused } : {}),
  };
}

type Built = { readonly packet?: EffectPacket; readonly refused?: string };

function built(result: ReturnType<typeof takeLocaleAct> | undefined): Built {
  if (!result) return {};
  return result.ok ? { packet: result.packet } : { refused: result.reason };
}

function answersMatter(campaign: Campaign, id: StateId, act: LocaleAct, cause: ConditionKind): boolean {
  const answers = act.answersClaim === true || (act.answersClaim === "with-assent" && governorAssents(campaign.states[id]?.governor));
  return answers && openRequests(campaign, id).some((claim) => claim.signature === reliefSignature(cause));
}

function optionFor(campaign: Campaign, id: StateId, cause: ConditionKind, base: LocaleAct): LocaleActOption {
  const projected = localeActProjection(campaign, id, base.id, cause);
  const act = projected.act;
  const { availability } = projected;
  const { packet, refused } = built(availability.ok ? takeLocaleAct(campaign, id, base.id, cause) : undefined);
  const price = localeActPrice(campaign, id, base);
  const cost = Math.abs(price.treasury ?? 0);
  const standing = Math.abs(price.standing ?? 0);
  const assent = assentWords(campaign, id, act);
  const risk = riskOf(campaign, id, act, true);
  return {
    id: act.id,
    name: act.name,
    summary: act.summary,
    group: act.group,
    cost,
    costText: costText(cost),
    standing,
    standingText: standingText(standing),
    unrequested: act.predicate === "request" && openRequests(campaign, id).length === 0,
    answers: answersMatter(campaign, id, act, cause),
    defers: act.id === "review" && openRequests(campaign, id).length > 0,
    ...(assent ? { assent } : {}),
    needsDeclaration: act.needsDeclaration,
    ...(availability.ok ? {} : { locked: `This needs ${availability.missing}.` }),
    ...(refused ? { locked: refused } : {}),
    ...(packet ? { packet } : {}),
    ...(risk ? { risk } : {}),
    ...legalTerms(campaign, id, base, projected),
  };
}

/**
 * Force and collection aimed at Americans answer disorder, and nothing else: a
 * brigade or a wiretap against a flood is not a choice anyone would weigh. An
 * immigration operation answers nothing at all, since it is routine federal
 * law that runs whatever is happening, so it is offered only as a home act.
 */
function answersOnlyUnrest(act: LocaleAct): boolean {
  return act.group === "enforcement" || act.group === "investigation" || (act.group === "military" && act.id !== "request-deployment");
}

const offeredAgainst = (cause: ConditionKind) => (act: LocaleAct): boolean =>
  act.id !== "immigration-operation" && (cause === "unrest" || !answersOnlyUnrest(act));

/** Every locale act against one matter in one state, in the engine's order, priced on this week's campaign. */
export function localeActOptions(campaign: Campaign, id: StateId, cause: ConditionKind): readonly LocaleActOption[] {
  return LOCALE_ACTS.filter(offeredAgainst(cause)).map((act) => optionFor(campaign, id, cause, act));
}

/**
 * How many of those acts the engine would take this week, read off its own
 * gate without pricing or building any of them: a table of every state asks
 * this once per row.
 */
export function openLocaleActCount(campaign: Campaign, id: StateId, cause: ConditionKind): number {
  return LOCALE_ACTS.filter(offeredAgainst(cause)).filter((act) => localeAvailability(campaign, id, act, cause).ok).length;
}

/** The state's request running out unanswered, which becomes a grievance; undefined when nothing is owed, so no clock runs. */
export function localeWaiting(campaign: Campaign, id: StateId, cause: ConditionKind): LocaleWaiting | undefined {
  const claim = openRequests(campaign, id).find((entry) => entry.signature === reliefSignature(cause));
  const name = campaign.states[id]?.base.name ?? id;
  if (!claim) return undefined;
  const weeksLeft = Math.max(0, claim.expiresTurn - campaign.turn);
  return {
    line: `${name}'s request runs out in ${weeksLeft} ${weeksLeft === 1 ? "week" : "weeks"}. If you don't answer it, the state will hold it against you.`,
    weeksLeft,
  };
}

/**
 * What went wrong when a coercive act was taken, read after the fact off the
 * campaign it was taken on: the draw is the same one the committed packet
 * made, so this is the incident on the books, not a second roll. Undefined
 * when the act carries no risk or nothing went wrong.
 */
export function localeIncident(before: Campaign, id: StateId, actId: LocaleActId, provoked = true): string | undefined {
  const act = localeAct(actId);
  const risk = act ? surveillanceRisk(before, id, act) : undefined;
  if (!risk) return undefined;
  return coercionOutcome(before, id, before.states[id]?.base.name ?? id, risk, provoked).incident;
}

function homeOptionFor(campaign: Campaign, id: StateId, base: LocaleAct): LocaleActOption {
  const projected = localeActProjection(campaign, id, base.id);
  const act = projected.act;
  const availability = homeActAvailability(campaign, id, base);
  const { packet, refused } = built(availability.ok ? takeHomeAct(campaign, id, base.id) : undefined);
  const price = localeActPrice(campaign, id, base, true);
  const cost = Math.abs(price.treasury ?? 0);
  const standing = Math.abs(price.standing ?? 0);
  // Routine enforcement is never read as unprovoked; force and collection with no unrest to answer are.
  const provoked = act.occasion === "enforcement";
  const risk = riskOf(campaign, id, act, provoked);
  return {
    id: act.id,
    name: act.name,
    summary: act.summary,
    group: act.group,
    cost,
    costText: costText(cost),
    standing,
    standingText: standingText(standing),
    unrequested: false,
    answers: false,
    defers: false,
    needsDeclaration: act.needsDeclaration,
    ...(availability.ok ? {} : { locked: `This needs ${availability.missing}.` }),
    ...(refused ? { locked: refused } : {}),
    ...(packet ? { packet } : {}),
    ...(risk ? { risk } : {}),
    ...(provoked ? {} : { unprovoked: true as const }),
    ...legalTerms(campaign, id, base, { ...projected, availability }),
  };
}

/**
 * Force and collection the President can send into a state on their own
 * initiative, with nothing there to answer: every coercive act the home path
 * takes, which is the ones whose occasion is not "any". Only routine
 * enforcement can actually go; the rest say which unrest they wait on.
 */
export function homeActOptions(campaign: Campaign, id: StateId): readonly LocaleActOption[] {
  return LOCALE_ACTS.filter((act) => act.coercion && act.occasion !== "any").map((act) => homeOptionFor(campaign, id, act));
}

const MISSION_STATUS: Readonly<Record<ProspectiveOrderAuthority, LocaleMissionView["status"]>> = {
  operative: "in force",
  "not-yet-effective": "not yet in force",
  suspended: "paused by a court",
  ended: "ended",
};

/** Every federal mission still inside its window in this state, newest first, with whether its order still runs. */
export function localeMissions(campaign: Campaign, id: StateId): readonly LocaleMissionView[] {
  return liveLocaleMissions(campaign, id).map((mission) => ({
    act: mission.act,
    name: localeAct(mission.act)?.name ?? mission.act,
    since: mission.sinceTurn,
    status: MISSION_STATUS[mission.status],
  }));
}

/** How long a review buys, for the sentence that says so. */
export const REVIEW_WEEKS = REVIEW_DEFERRAL_TURNS;
