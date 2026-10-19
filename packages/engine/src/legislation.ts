import { IDEOLOGY_AXES } from "@admin/world";
import {
  selectBills,
  selectBillsOnTheDesk,
  selectCurrentLaws,
  type Bill,
  type Campaign,
  type ChamberVote,
  type GameDate,
} from "./state.js";
import {
  CHAMBERS,
  carried,
  floorThreshold,
  fundingContinuityDue,
  supermajorityOf,
} from "./congress.js";
import { countFundingContinuityVote } from "./congress-votes.js";
import { advanceBills, projectPassage, stanceOf } from "./bill-stages.js";
import { voteOn } from "./congress-votes.js";
import { orderStatEffects } from "./policy.js";
import { militaryConstructionAppropriation } from "./military-construction.js";
import { lawOffsetForBill } from "./law-offsets.js";
import { TURNS_PER_YEAR } from "./pace.js";
import type { Effect, EffectPacket } from "./effects.js";
import { createRngStreams } from "./rng.js";
import type { TurnPhase } from "./turn-loop.js";
import { routeDomestic, type DomesticSignature } from "./domestic-signature.js";
import { routeCohorts } from "./route-cohorts.js";
import { beliefSplitEffects } from "./party-beliefs.js";
import { usTicket } from "./party.js";
import { chamberMajority } from "./hill.js";
import { withSharedCredit } from "./credit-share.js";
import { plankAlignment, plankDeliverable } from "./platform-deliverables.js";
import { selectBudgetYear, selectFiscalYearEndTurn } from "./clock.js";
import { signingWindowClosed, sittingDate } from "./signing-window.js";
import { legislativeTrack } from "./reconciliation.js";
import {
  LEGISLATIVE_ACTS,
  actCost,
  actOf,
  type ConstitutionalGround,
  type LawConstraint,
  type LegislativeAct,
} from "./legislative-acts.js";

// Law, as opposed to everything else a president can do.
//
// The instruments reach other capitals, the program is a standing position, an
// executive order is the president acting alone. None of them is legislation,
// and legislation is most of what an American government actually produces: a
// bill Congress wrote, on Congress's own agenda, that arrives on the desk as a
// decision the president did not choose to be handed.
//
// Two things make it a different kind of decision from an order. It is durable
// — a law constrains the presidency that signed it and the ones after — and it
// is not the president's to refuse absolutely: a veto goes back, and Congress
// can pass it over the President's objection with two thirds of both chambers.
// The whip count is exposed on the way in, because a veto taken without knowing
// whether it can be overridden is a gesture rather than a decision.

// --- What the laws in force forbid -----------------------------------------

/**
 * Everything the acts currently in force put out of the president's reach.
 *
 * Merged in one place so that no caller has to walk the record itself: a
 * constraint the orders screen enforced and the ladder did not would be a law
 * that binds only where somebody remembered it.
 */
export function lawConstraints(campaign: Campaign): LawConstraint {
  const enacted = selectCurrentLaws(campaign);
  const laws = enacted.flatMap((bill) => {
    const act = actOf(bill);
    return act?.constrains ? [act.constrains] : [];
  });
  // A resolution of disapproval bars the order it named, and the catalogue
  // entry cannot state which order that was — Congress chose it. So the bar is
  // read off the enacted instance, and lands in the same merged constraint
  // every other closure does rather than in a second rule somebody has to
  // remember to consult.
  const disapproved = enacted.flatMap((bill) =>
    actOf(bill)?.disapproves === true && bill.target !== undefined ? [bill.target] : [],
  );
  return {
    blocksOrders: [...laws.flatMap((constraint) => constraint.blocksOrders ?? []), ...disapproved],
    authorizesOrders: [...new Set(enacted.flatMap((bill) => actOf(bill)?.constrains?.authorizesOrders ?? []))]
      .filter((orderId) => lawAuthorizesOrder(campaign, orderId) !== undefined),
    barsUnilateralForce: laws.some((constraint) => constraint.barsUnilateralForce === true),
  };
}

/** A final Supreme Court construction narrows only this enacted bill's named grant. */
export function statutoryAuthorityLimited(campaign: Campaign, billId: string, orderId: string): boolean {
  return campaign.judiciary.cases.some((entry) =>
    entry.subject?.kind === "statutory-authority" && entry.subject.billId === billId &&
    entry.subject.orderId === orderId && entry.holding === "struck-down" &&
    entry.procedure?.relief === "statutory-construction");
}

/** Whether statute has taken away the office's own war-making latitude. */
export function lawsBarUnilateralForce(campaign: Campaign): boolean {
  return lawConstraints(campaign).barsUnilateralForce === true;
}

/** Whether statute forbids one particular executive order outright. */
export function lawBlocksOrder(campaign: Campaign, orderId: string): Bill | undefined {
  return selectCurrentLaws(campaign).find((bill) => {
    const act = actOf(bill);
    if (act === undefined) return false;
    if (act.constrains?.blocksOrders?.includes(orderId) === true) return true;
    return act.disapproves === true && bill.target === orderId;
  });
}

/** The act of Congress that puts the legislature behind one order, if one has passed. */
export function lawAuthorizesOrder(campaign: Campaign, orderId: string): Bill | undefined {
  const grants = selectCurrentLaws(campaign)
    .filter((bill) => actOf(bill)?.constrains?.authorizesOrders?.includes(orderId) === true)
    .sort((a, b) => (b.resolvedTurn ?? b.introducedTurn) - (a.resolvedTurn ?? a.introducedTurn) || b.id.localeCompare(a.id));
  const governing = grants[0];
  return governing && !statutoryAuthorityLimited(campaign, governing.id, orderId) ? governing : undefined;
}

/**
 * Which of the three grounds an order stands on this week.
 *
 * A prohibition governs an authorization rather than cancelling out with it:
 * Congress saying no is the later and more specific word, and an order named by
 * both is one the legislature has taken back. There is no fourth answer — an
 * order nobody has legislated about is standing in the silence, which is where
 * almost every order stands and is a real position rather than a missing one.
 */
export function constitutionalGround(campaign: Campaign, orderId: string): ConstitutionalGround {
  if (lawBlocksOrder(campaign, orderId)) return "forbidden";
  return lawAuthorizesOrder(campaign, orderId) ? "authorized" : "silent";
}

// --- Congress's own agenda -------------------------------------------------

/**
 * The window Congress originates inside, in turns.
 *
 * A fixed every-sixth-week cadence was one number doing two jobs badly: it made
 * the arrival of a bill predictable to the week, and — because a draw that
 * happened to land on an act the floor could not carry produced nothing — it
 * meant a session could go a month and a half between attempts. The gap is now
 * drawn per session inside this window, which puts a bill on the desk roughly
 * every eleven weeks: often enough that a term is legislated in, rare enough
 * that signing is not the thing a player does every other Monday.
 */
const ORIGINATION_MIN_TURNS = 8;
const ORIGINATION_MAX_TURNS = 14;

/** How long a vetoed bill sits before the override is attempted or abandoned. */
const OVERRIDE_DELAY_TURNS = 2;

/**
 * How many measures the chambers work at once.
 *
 * Three, and it is the calendar rather than a capacity: floor time is what a
 * chamber is short of, and a legislature that could only hold one bill at a
 * time made the whole institution a queue the President could block by not
 * signing. One of the three places is kept for a bill the administration
 * transmits, so a president is never locked out of their own agenda by
 * Congress's.
 */
const BILLS_IN_FLIGHT = 3;

const billId = (act: LegislativeAct, turn: number) => `bill:${act.id}:${turn}`;

/**
 * Every bill Congress has not finished with: still moving through the chambers,
 * or enrolled and waiting on a signature.
 *
 * One list, because the two questions the rest of this file asks — what is on
 * the agenda, and whether Congress may start something else — are both about
 * whether a measure is still live rather than about where it happens to sit.
 */
function inFlight(bills: readonly Bill[]): readonly Bill[] {
  return bills.filter((bill) => bill.status === "in-progress" || bill.status === "on-the-desk");
}

/**
 * What Congress could take up this week, given the country it is looking at.
 *
 * An act is off the agenda while a bill for it is in progress or on the desk,
 * and after it is law — permanently, unless the act declares itself a recurring
 * one, in which case the calendar reopens it.
 */
export function billsOnTheAgenda(campaign: Campaign): readonly LegislativeAct[] {
  const bills = selectBills(campaign);
  const pendingBills = inFlight(bills);
  const pending = new Set(pendingBills.map((bill) => bill.act));
  const enacted = new Map<string, number>();
  for (const bill of bills.filter((bill) => bill.status === "law")) {
    const turn = bill.resolvedTurn ?? bill.introducedTurn;
    enacted.set(bill.act, Math.max(enacted.get(bill.act) ?? turn, turn));
  }
  return LEGISLATIVE_ACTS.filter((act) => {
    if (pending.has(act.id)) return false;
    if (act.revises?.family === "housing-supply" && pendingBills.some((bill) =>
      bill.act === "act-housing-supply" || actOf(bill)?.revises?.family === "housing-supply")) return false;
    if (act.id === "act-housing-supply" && pendingBills.some((bill) =>
      actOf(bill)?.revises?.family === "housing-supply")) return false;
    const lastEnacted = enacted.get(act.id);
    if (lastEnacted !== undefined && (act.recurs === undefined || campaign.turn - lastEnacted < act.recurs)) {
      return false;
    }
    if (act.targetsOrder && act.targetsOrder(campaign) === undefined) return false;
    return act.arises(campaign);
  });
}

/**
 * The two-thirds count on passing a vetoed bill over the President's objection.
 *
 * Counted through `countVoteAgainst` rather than `countVote`, whose yeas are
 * members voting *with* the President: counting an override that way makes the
 * friendlier chamber the likelier one to overrule him and a genuinely hostile
 * Congress incapable of it, so an override would never carry in natural play.
 * Removal answers to the same arithmetic, from the same function, for the same
 * reason.
 */
export function projectOverride(campaign: Campaign, bill: Bill): readonly ChamberVote[] {
  const act = actOf(bill);
  // A veto is itself an argument, and it moves members: the question on an
  // override is no longer the bill, it is whether the President is to be
  // overruled, which is a harder thing to vote for and a more attractive one.
  const appeal = (act?.appeal ?? 0) + 0.1;
  return CHAMBERS.map((chamber) =>
    voteOn(campaign, {
      chamber,
      appeal,
      required: supermajorityOf(campaign.congress.chambers[chamber].seats),
      ...(act ? { actId: act.id, ...(act.domestic ? { signature: act.domestic } : {}) } : {}),
      stance: act ? stanceOf(act) : "neutral",
      counted: "against",
    }),
  );
}

/** Whether an override would carry, for a screen that has to show the margin. */
export function overrideWouldCarry(campaign: Campaign, bill: Bill): boolean {
  return carried(projectOverride(campaign, bill));
}

// --- The president's half --------------------------------------------------

export type LegislationResult =
  | { readonly ok: true; readonly packet: EffectPacket }
  | { readonly ok: false; readonly reason: string };

function onTheDesk(campaign: Campaign, id: string): Bill | { readonly refusal: string } {
  const bill = campaign.bills[id];
  if (!bill) return { refusal: `No such bill: ${id}.` };
  if (bill.status !== "on-the-desk") return { refusal: `${bill.title} is not on the desk.` };
  if (signingWindowClosed(campaign, bill, campaign.calendar)) {
    return { refusal: `The ten days for ${bill.title} ran out; it becomes law without a signature.` };
  }
  return bill;
}

/**
 * The money an act puts back in place: a span of weeks for a stopgap, counted
 * from the turn it lands in, or the fiscal year's last week for a full-year
 * resolution, which is the same date however late in the year it passes.
 */
function fundingEffect(campaign: Campaign, funds: NonNullable<LegislativeAct["funds"]>): Effect {
  if ("turns" in funds) return { kind: "appropriation", fundTurns: funds.turns };
  return { kind: "appropriation", throughTurn: selectFiscalYearEndTurn(campaign, selectBudgetYear(campaign)) };
}

/**
 * What an act does to the country the week it becomes law.
 *
 * The same one-off application an executive order gets, through the same
 * closed vocabulary and the same clamping, because a statute and a decree
 * change the same country and there is no reason for two arithmetics.
 */
function enactmentEffects(campaign: Campaign, act: LegislativeAct, bill: Bill): readonly Effect[] {
  return [
    { kind: "metric", deltas: actCost(campaign, act) },
    { kind: "alignment", pull: act.alignment },
    ...orderStatEffects(campaign, act.nationEffects),
    ...(act.militaryConstruction ?? []).map((project) => ({ kind: "militaryConstructionProject" as const,
      set: militaryConstructionAppropriation(campaign, bill.id, project.id, project.name, project.shareOfGdp, project.hostState) })),
    ...(act.raisesCap
      ? [
          {
            kind: "capRaise" as const,
            set: {
              id: bill.id,
              account: act.raisesCap.account,
              share: act.raisesCap.share,
              enactedTurn: campaign.turn,
              throughTurn: campaign.turn + act.raisesCap.turns,
            },
          },
        ]
      : []),
    // Applied against the turn it lands in rather than against a date computed
    // here: a stopgap can be signed the week it arrives, lapse onto the desk
    // clock two weeks later, or be overridden later still, and all three have
    // to buy the same six weeks from the day the President stopped being the
    // reason the money was not there.
    ...(act.funds ? [fundingEffect(campaign, act.funds)] : []),
    // The cohort half is not optional here for the same reason it is not
    // optional on an executive order: a statute that routes to fifty states and
    // to none of the sixteen cells the states are made of leaves every
    // household in the country with no memory of the law that changed their
    // week. `routeCohorts` reads the state effects that actually landed rather
    // than the signature alone, so the weighting follows who was moved.
    ...(act.domestic ? withSharedCredit(campaign, bill, domesticEffects(campaign, act.domestic)) : []),
  ];
}

/** State lean and marks, the belief split, and the people the act lands on. */
function domesticEffects(campaign: Campaign, domestic: DomesticSignature): readonly Effect[] {
  const routed = routeDomestic(campaign, domestic);
  return [...routed, ...beliefSplitEffects(campaign, domestic), ...routeCohorts(campaign, domestic, routed)];
}

/** Every route into law stamps the same fixed appropriation, never today's later GDP. */
function enactBill(campaign: Campaign, law: Bill): Bill {
  if (law.act !== "act-disaster-recovery") return law;
  const offset = lawOffsetForBill(law);
  const gdp = campaign.nations[campaign.founding.nation]?.stats.economy.gdp ?? 0;
  return { ...law, recoveryAuthority: {
    appropriated: Math.round(gdp * (offset?.outlays ?? 0) * (offset?.years ?? 0)),
    throughTurn: campaign.turn + (offset?.years ?? 0) * TURNS_PER_YEAR,
  } };
}

export function signBill(campaign: Campaign, id: string): LegislationResult {
  const found = onTheDesk(campaign, id);
  if ("refusal" in found) return { ok: false, reason: found.refusal };
  const act = actOf(found);
  if (!act) return { ok: false, reason: `${found.title} names an act this build does not carry.` };
  const law: Bill = enactBill(campaign, { ...found, status: "law", enactedBy: "signed", resolvedTurn: campaign.turn });
  return {
    ok: true,
    packet: {
      source: "action",
      actor: "player",
      turn: campaign.turn,
      narration: { summary: `The President signs ${found.title} into law.` },
      effects: [
        { kind: "bill", set: law },
        // Signing what Congress sent is the cheapest thing a president can do
        // for their standing on the Hill, and the only one that costs nothing.
        //
        // Before the enactment rather than after it, and this is load-bearing:
        // this is a whole-`Congress` write built from the campaign as it stood
        // when the packet was planned, and an act that funds the government
        // patches the appropriation inside that same object. Folded the other
        // way round, the disposition would carry a stale appropriation back
        // over the stopgap that had just been signed.
        { kind: "congress", set: { ...campaign.congress, disposition: bounded(campaign.congress.disposition + 0.03) } },
        ...enactmentEffects(campaign, act, law),
      ],
    },
  };
}

/**
 * Return it, with a message.
 *
 * The veto message is required rather than optional: a veto is a signed
 * document in the American system, and the record of a presidency that refused
 * six bills without ever saying why would be a record of nothing.
 */
export function vetoBill(campaign: Campaign, id: string, message: string): LegislationResult {
  const found = onTheDesk(campaign, id);
  if ("refusal" in found) return { ok: false, reason: found.refusal };
  if (!message.trim()) return { ok: false, reason: "A veto goes back with a message stating the objection." };
  const vetoed: Bill = { ...found, status: "vetoed", resolvedTurn: campaign.turn };
  return {
    ok: true,
    packet: {
      source: "action",
      actor: "player",
      turn: campaign.turn,
      narration: { summary: `The President vetoes ${found.title} and returns it to Congress. ${message}` },
      effects: [
        { kind: "bill", set: vetoed },
        { kind: "congress", set: { ...campaign.congress, disposition: bounded(campaign.congress.disposition - 0.06) } },
      ],
    },
  };
}

const bounded = (value: number) => Math.round(Math.max(0, Math.min(1, value)) * 1000) / 1000 + 0;

// --- Transmitting an administration bill ------------------------------------

/**
 * What sending the administration's own bill up costs on the Hill.
 *
 * Floor time is the scarcest thing a chamber has, and a president who takes it
 * has spent something whether or not the bill carries. This is the price of the
 * asking; the price of losing is below.
 */
export const TRANSMISSION_DISPOSITION_COST = 0.03;

/**
 * The acts the President could send up this week.
 *
 * Congress's own agenda, narrowed to the bills this administration wrote. An
 * act nobody in the administration sponsored is not the President's to
 * transmit — a president may lobby for the opposition's bill and may sign it,
 * but they cannot introduce it.
 *
 * And narrowed again to the bills this administration would have written, which
 * is the half that was missing: every president was offered every
 * administration bill in the catalogue, so a Republican could transmit the
 * revenue bill written for the other party's platform and a president who ran on
 * nothing could transmit a plank they never stood on.
 */
export function transmittableActs(campaign: Campaign): readonly LegislativeAct[] {
  return billsOnTheAgenda(campaign).filter(
    (act) => act.sponsor === "administration" && administrationWouldWrite(campaign, act),
  );
}

/**
 * Whether this administration could have written this bill: the platform it
 * sealed carries the plank the act enacts, and its own party would have run on
 * that plank in the first place.
 *
 * Both halves are about the plank rather than about the act's industries. A
 * measure with no plank is nobody's program — a debt ceiling, a stopgap, an
 * authorization — and any administration may send it up. A measure that enacts
 * one is the promise a president stood on, and it is not transmittable by a
 * president who stood on something else, whatever the chamber thinks of it.
 *
 * The party half is the plank's own program read against the party's platform:
 * not how much they like it, but whether it points their way at all. A
 * Republican who somehow carried a redistribution plank still cannot send up the
 * bill that enacts it, because the program it puts in force is the other side's.
 */
export function administrationWouldWrite(campaign: Campaign, act: LegislativeAct): boolean {
  const plank = act.plank;
  if (plank === undefined) return true;
  if (!(campaign.founding.platform ?? []).includes(plank)) return false;
  const deliverable = plankDeliverable(plank);
  if (!deliverable) return true;
  const alignment = plankAlignment(deliverable);
  const beliefs = usTicket(campaign.congress.administrationParty).beliefs;
  const agreement = IDEOLOGY_AXES.reduce(
    (sum, axis) => sum + beliefs[axis] * (alignment[axis] ?? 0),
    0,
  );
  return agreement >= 0;
}

/**
 * Send an administration bill to the Hill now, rather than waiting for Congress
 * to reach it.
 *
 * This was the largest hole in the legislative model: every bill in the game
 * arrived because `originate` drew it, so a president had opinions about
 * legislation and no way to act on one. The office's actual power here is
 * narrow and real — the administration writes a bill, transmits it, and spends
 * capital getting it to the floor. It does not get to decide the count.
 *
 * What it buys is a place on the calendar, not a result. The bill enters the
 * chambers at referral exactly as an originated one does and takes its chances
 * through markup and the floor from there — the President's own bill is not a
 * measure Congress passes on the day it is asked to. The count the screen shows
 * is `projectPassage`, which is the count the floor stage will actually run; the
 * weeks in between are what can move it.
 */
export function transmit(campaign: Campaign, actId: string): LegislationResult {
  const act = LEGISLATIVE_ACTS.find((entry) => entry.id === actId);
  if (!act) return { ok: false, reason: `No such act: ${actId}.` };
  if (act.sponsor !== "administration") {
    return { ok: false, reason: `${act.title} is not this administration's bill to transmit.` };
  }
  const live = inFlight(selectBills(campaign));
  if (live.some((bill) => bill.sponsor === "administration")) {
    return { ok: false, reason: "The administration already has a bill in the chambers. It gets one place on the calendar." };
  }
  if (live.length >= BILLS_IN_FLIGHT) {
    return { ok: false, reason: "Congress has three measures on the floor already. There is no room on the calendar this week." };
  }
  if (!administrationWouldWrite(campaign, act)) {
    return { ok: false, reason: `${act.title} is not this administration's program to send up.` };
  }
  if (!transmittableActs(campaign).some((entry) => entry.id === actId)) {
    return { ok: false, reason: `Congress will not take up ${act.title} this week.` };
  }
  // A chamber finishes with a measure once in a week. Without this, a president
  // whose bill had just died in committee could refile it the same afternoon
  // under the same identifier and overwrite the record of the loss.
  if (selectBills(campaign).some((bill) => bill.act === actId && bill.resolvedTurn === campaign.turn)) {
    return { ok: false, reason: `Congress has already finished with ${act.title} this week.` };
  }
  return { ok: true, packet: transmissionPacket(campaign, act) };
}

function transmissionPacket(campaign: Campaign, act: LegislativeAct): EffectPacket {
  return {
    source: "action",
    actor: "player",
    turn: campaign.turn,
    narration: {
      summary: `The administration transmits ${act.title}, and it is referred to committee.`,
    },
    effects: [
      { kind: "bill", set: introduced(campaign, act) },
      {
        kind: "congress",
        set: {
          ...campaign.congress,
          disposition: bounded(campaign.congress.disposition - TRANSMISSION_DISPOSITION_COST),
        },
      },
    ],
  };
}

/** The measures that raise the debt limit, in either of the two forms Congress writes. */
const DEBT_LIMIT_MEASURES: ReadonlySet<string> = new Set(["act-debt-limit-increase", "act-debt-limit-deal"]);

/**
 * Whether members answer this count to keeping the government running rather
 * than to the President who sent it: a stopgap at the funding deadline, and a
 * debt-limit bill once the Treasury is on its extraordinary measures. Congress
 * has let neither default happen, whatever it thought of the President: the
 * leaders of both sides carry the lift in the weeks before the X-date, and a
 * President with no caucus of their own is lifted the same way.
 */
function continuityVote(campaign: Campaign, act: LegislativeAct): boolean {
  if (act.id === "act-continuing-resolution") return fundingContinuityDue(campaign);
  return DEBT_LIMIT_MEASURES.has(act.id) && campaign.debtLimit?.bindingSince !== undefined;
}

/**
 * A measure as it enters the chambers, whichever end asked for it.
 *
 * One shape for Congress's own bill and the administration's, because there is
 * only one legislative process and a president's bill that skipped the
 * committee it was referred to would be a different game's presidency.
 *
 * `passage` is filled with the count as it stands today rather than left empty:
 * every surface that reads a bill reads that field, and a bill that could quote
 * no count until the week it carried would print a blank docket row for a month.
 */
function passageVotes(campaign: Campaign, act: LegislativeAct): readonly ChamberVote[] {
  if (!continuityVote(campaign, act)) return projectPassage(campaign, act);
  return CHAMBERS.map((chamber) =>
    countFundingContinuityVote(
      campaign.congress,
      chamber,
      act.appeal,
      floorThreshold(campaign.congress, chamber, legislativeTrack(campaign, act)),
      campaign.states,
      campaign.people,
    ),
  );
}

function introduced(campaign: Campaign, act: LegislativeAct): Bill {
  const target = act.targetsOrder?.(campaign);
  const predecessor = act.revises?.family === "housing-supply"
    ? selectCurrentLaws(campaign).find((bill) =>
        ["act-housing-supply", "act-housing-renewal", "act-housing-replacement"].includes(bill.act))
    : undefined;
  return {
    id: billId(act, campaign.turn),
    act: act.id,
    title: act.title,
    sponsor: act.sponsor,
    introducedTurn: campaign.turn,
    status: "in-progress",
    stage: "referral",
    setbacks: 0,
    momentum: 0,
    beats: [],
    passage: passageVotes(campaign, act),
    // Omitted rather than written as undefined on the acts that name no order:
    // an explicit undefined does not survive the JSON round trip a save is.
    ...(target === undefined ? {} : { target }),
    ...(predecessor && act.revises ? { revises: {
      billId: predecessor.id, kind: act.revises.kind,
      ...(act.revises.kind === "renewal" ? { provision: predecessor.revises?.provision
        ?? (predecessor.revises?.kind === "replacement" ? "targeted" : predecessor.text?.enrolled ?? "base") } : {}),
    } } : {}),
  };
}

// --- The week --------------------------------------------------------------

/**
 * Congress legislating, and answering a veto.
 *
 * Origination is on a cadence rather than every week, because a chamber that
 * put a bill on the desk every seven days would make the signing ceremony the
 * thing a player does instead of the thing they occasionally have to. The draw
 * that picks which act is seeded on the campaign and the turn, so a replay
 * legislates identically.
 */
export const legislationPhase: TurnPhase = (state: Campaign) => {
  const lapsed = deskLapses(state);
  // The stages read the desk for the same reason origination does: a bill that
  // lapsed into law this week has already left it, and one that carried the
  // floor the same week should take the place it vacated rather than wait.
  const stages = advanceBills(state, lapsed.cleared);
  const effects: Effect[] = [...overrideAttempts(state), ...lapsed.effects, ...stages.effects];
  // Origination reads the desk, so a bill that lapsed into law this same week
  // has already left it — otherwise the ten-day clock would clear the desk and
  // Congress would still be told to wait another session.
  const originated = originate(state, lapsed.cleared);
  if (originated) effects.push(originated.effect);

  if (effects.length === 0) return [];
  return [
    {
      source: "simulate",
      actor: "world",
      turn: state.turn + 1,
      narration: { summary: phaseSummary(originated?.line, lapsed.titles, stages.accounts) },
      effects,
    },
  ] satisfies readonly EffectPacket[];
};

function phaseSummary(
  originated: string | undefined,
  lapsed: readonly string[],
  stages: readonly string[],
): string {
  const parts: string[] = [];
  if (lapsed.length > 0) {
    parts.push(
      `${lapsed.join(" and ")} ${lapsed.length === 1 ? "becomes" : "become"} law without a signature; the ten days ran out.`,
    );
  }
  // The week of the chambers themselves, in the same sentence the desk gets:
  // there is no second wire for legislation, and a bill that spent a month in
  // markup should be a month the country could read about.
  parts.push(...stages);
  if (originated) parts.push(originated);
  if (parts.length === 0) return "Congress takes up the President's vetoes.";
  return parts.join(" ");
}

/**
 * The bills the President neither signed nor returned in time.
 *
 * Law rather than dead: the Constitution's default is that silence enacts. The
 * pocket veto is the one exception and it needs an adjourned Congress, which
 * the game does not have. The President loses the bill the day after its
 * tenth day (`onTheDesk` refuses a signature or a veto from then), and the
 * chamber's next sitting records it as law. Recording it at the sitting rather
 * than on the morning itself keeps the week's order the same whether the week
 * runs as one tick or as seven office days.
 */
function deskLapses(state: Campaign, today: GameDate = sittingDate(state)): {
  readonly effects: readonly Effect[];
  readonly cleared: readonly string[];
  readonly titles: readonly string[];
} {
  const lapsed = selectBillsOnTheDesk(state).filter((bill) => signingWindowClosed(state, bill, today));
  const effects = lapsed.flatMap((bill): readonly Effect[] => {
    const act = actOf(bill);
    if (!act) return [{ kind: "bill", set: { ...bill, status: "dead", resolvedTurn: state.turn } }];
    const law: Bill = enactBill(state, { ...bill, status: "law", enactedBy: "unsigned", resolvedTurn: state.turn });
    return [
      { kind: "bill", set: law },
      ...enactmentEffects(state, act, law),
      // Letting a bill become law unsigned is a position, and the country reads
      // it as one: the President neither owned it nor stopped it.
      { kind: "metric", deltas: { standing: -0.01 } },
    ];
  });
  return { effects, cleared: lapsed.map((bill) => bill.id), titles: lapsed.map((bill) => bill.title) };
}

/** Congress's own hopper stops one short of the cap unless an administration bill already holds a slot. */
export function originationBlocked(bills: readonly Bill[], cleared: readonly string[] = []): boolean {
  const live = inFlight(bills).filter((bill) => !cleared.includes(bill.id));
  const cap = live.some((bill) => bill.sponsor === "administration") ? BILLS_IN_FLIGHT : BILLS_IN_FLIGHT - 1;
  return live.length >= cap;
}

/**
 * Whether Congress sends a bill this week, and which.
 *
 * The gap between sessions is drawn from the seed rather than being a modulus,
 * so a replay legislates identically while a player cannot set their watch by
 * it. The draw is keyed on the last bill's turn, which makes the whole schedule
 * a function of the record rather than of the calendar.
 *
 * The gap is counted from the last introduction rather than from the last
 * signature, which is what keeps a staged bill from silting the agenda: the
 * weeks a measure spends in committee are spent inside the window Congress was
 * going to wait anyway, so a term meets the same number of bills it did when a
 * bill was a single roll.
 */
function originate(
  state: Campaign,
  clearedThisWeek: readonly string[] = [],
): { readonly effect: Effect; readonly line: string } | undefined {
  // Three live bills, and one of those slots stays open for a bill the
  // administration transmits. Congress fills the other two on its own.
  if (originationBlocked(selectBills(state), clearedThisWeek)) return undefined;
  const since = lastOriginationTurn(state);
  const streams = createRngStreams(state.seed);
  const gap =
    ORIGINATION_MIN_TURNS +
    Math.floor(streams.stream("legislation-gap", String(since)).next() * (ORIGINATION_MAX_TURNS - ORIGINATION_MIN_TURNS + 1));
  const onCadence = state.turn - since >= Math.min(gap, ORIGINATION_MAX_TURNS);

  // Every eligible act is tried, best-supported first, rather than one draw
  // that produces nothing when it lands on a bill the floor cannot carry.
  const draw = streams.stream("legislation", state.turn).next();
  const offered = billsOnTheAgenda(state);
  const carrying = offered.filter((act) => carried(passageVotes(state, act)));
  // Beside them, the measures the other side would take up knowing they fail.
  // Every bill in the game used to be a bill somebody expected to win, which left
  // out most of what a divided Congress does with its calendar: the side holding
  // the floor puts its own bill up, loses the vote, and has the vote on the
  // record — which is the point of having held it.
  const messages = messageBills(state, offered).filter((act) => !carrying.includes(act));
  const agenda = [...carrying, ...messages];
  // A deadline measure jumps the queue and is taken up whatever the calendar
  // says; everything else waits for the session the draw picked.
  const urgent = agenda.filter((act) => act.urgent === true);
  const eligible = urgent.length > 0 ? urgent : onCadence ? agenda : [];
  if (eligible.length === 0) return undefined;
  const act = eligible[Math.min(eligible.length - 1, Math.floor(draw * eligible.length))]!;
  const bill = introduced(state, act);
  // A deadline measure is discharged rather than referred. A stopgap that spent
  // a month in markup would be a stopgap that could not end a shutdown before
  // the country had lived a season of one, which is the same reason the act is
  // allowed to jump the calendar in the first place: the whole subject of the
  // measure is that there is no time.
  if (act.urgent !== true) {
    return { effect: { kind: "bill", set: bill }, line: `Congress takes up ${act.title} and refers it to committee.` };
  }
  const { stage: _discharged, ...rest } = bill;
  return {
    effect: { kind: "bill", set: { ...rest, status: "on-the-desk", presentedOn: sittingDate(state) } },
    line: `Congress passes ${act.title} and sends it to the President.`,
  };
}

/**
 * The measures the opposition would take up knowing they fail.
 *
 * Only the other side's, and only while the other side holds the House: a
 * message bill is floor time, and floor time belongs to whoever holds the
 * calendar. A bill introduced this way carries its own failing count from the
 * week it was filed, which is how the floor stage later knows to hold the vote
 * rather than pull it.
 */
function messageBills(state: Campaign, offered: readonly LegislativeAct[]): readonly LegislativeAct[] {
  if (chamberMajority(state.congress, "house") !== "opposition") return [];
  return offered.filter((act) => act.sponsor === "opposition");
}

/** When Congress last sent something up, or the founding if it never has. */
function lastOriginationTurn(state: Campaign): number {
  return selectBills(state).reduce((latest, bill) => Math.max(latest, bill.introducedTurn), 0);
}

function overrideAttempts(state: Campaign): readonly Effect[] {
  return selectBills(state)
    .filter(
      (bill) =>
        bill.status === "vetoed" &&
        bill.override === undefined &&
        state.turn - (bill.resolvedTurn ?? bill.introducedTurn) >= OVERRIDE_DELAY_TURNS,
    )
    .flatMap((bill): readonly Effect[] => {
      const votes = projectOverride(state, bill).map((vote) => ({ ...vote, recordedTurn: state.turn }));
      const act = actOf(bill);
      if (!carried(votes) || !act) {
        return [{ kind: "bill", set: { ...bill, status: "dead", override: votes, resolvedTurn: state.turn } }];
      }
      // Overridden: the act becomes law anyway, and the presidency has been
      // publicly overruled by the branch that can remove it.
      const law: Bill = enactBill(state, { ...bill, status: "law", enactedBy: "veto-overridden", override: votes, resolvedTurn: state.turn });
      return [
        { kind: "bill", set: law },
        ...enactmentEffects(state, act, law),
        { kind: "metric", deltas: { standing: -0.03, stability: -0.02 } },
      ];
    });
}
