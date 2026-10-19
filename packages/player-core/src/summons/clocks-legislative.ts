import {
  DAYS_PER_TURN,
  daysBetween,
  elapsedDays,
  formatGameDate,
  selectBillsAwaitingSignature,
  selectSigningWindow,
  selectNation,
  selectShutdown,
  type BillSponsor,
  type Campaign,
  type FundingLapse,
} from "@admin/engine";
import {
  dateLabel,
  dayCount,
  daysFigure,
  stanceForUrgency,
  urgencyForDays,
  urgencyForWeeks,
  weekCount,
  weeksFigure,
  weeksPhrase,
  weeksUntil,
} from "./clock-math";
import { counselFor, historyOf, ledgerLine, voteLine } from "./compose";
import {
  SHUTDOWN_TITLE,
  appropriationTitle,
  nearestAuthorization,
  nearestDeskBill,
  oldestUnratified,
  treatyWaiting,
} from "./due-legislative";
import { place } from "../navigation/places";
import { subjectDoor } from "../advisor/types";
import { warPowersHome } from "../world/war-powers-home";
import type { SubjectRef } from "../shell/subject";
import type { SummonsBrief, SummonsKind } from "./types";

/**
 * The clocks Congress starts and the President has to answer, as documents.
 *
 * Money, a signature, an authorization and a ratification — four obligations
 * that lapse into a specific constitutional outcome if the week closes without
 * an answer. When each lands is `due-legislative.ts`; this file is what the
 * folio reads once one has.
 */

/** Who sent it, in the words the rest of the app uses for the same three cases. */
const SPONSOR_LABELS: Readonly<Record<BillSponsor, string>> = {
  administration: "This administration",
  opposition: "The opposition",
  bipartisan: "Bipartisan",
};

function appropriationBrief(campaign: Campaign): SummonsBrief {
  const appropriation = campaign.congress.appropriation;
  const lapseTurn = appropriation.throughTurn + 1;
  const weeks = weeksUntil(campaign, lapseTurn);
  const urgency = urgencyForWeeks(weeks);
  return {
    title: appropriationTitle(campaign),
    clockLine:
      weeks <= 0
        ? "Funding has run out. Until Congress passes a spending bill, the government can't legally spend money."
        : `${weeksPhrase(weeks)}, the government runs out of approved funding.`,
    figure: weeksFigure(weeks),
    stance: stanceForUrgency(urgency),
    history: historyOf(
      { key: "enacted", label: "Last funding bill", detail: dateLabel(campaign, appropriation.enactedTurn) },
      {
        key: "basis",
        label: "Basis",
        detail: appropriation.onPriorYear
          ? "Last year's budget, carried over instead of a new one"
          : "A full-year spending bill passed by the House and Senate",
      },
      ledgerLine(campaign, appropriation.enactedTurn, "record", "In the Record that week"),
    ),
    posture: [
      { key: "funded-through", caption: "Funded through", figure: dateLabel(campaign, appropriation.throughTurn) },
      { key: "this-week", caption: "This week", figure: dateLabel(campaign, campaign.turn) },
    ],
    counsel: counselFor(campaign, "budget"),
    door: { label: "Open the budget", href: place.budget() },
  };
}

/** How many of the closed bodies a posture cell names before it starts listing a directory. */
const CLOSED_BODIES_NAMED = 3;

/** The last shutdown this administration got out of, and what got it out. */
function priorLapse(campaign: Campaign): FundingLapse | undefined {
  return [...campaign.lapses]
    .filter((lapse) => lapse.endedTurn !== undefined)
    .sort((a, b) => (b.endedTurn ?? 0) - (a.endedTurn ?? 0))[0];
}

function priorLapseLine(campaign: Campaign) {
  const lapse = priorLapse(campaign);
  if (lapse?.endedTurn === undefined) return undefined;
  const days = elapsedDays(lapse.endedTurn - lapse.begunTurn);
  const ended =
    lapse.endedBy === "continuing-resolution"
      ? "a short-term funding bill"
      : lapse.endedBy === "appropriation"
        ? "a full-year spending bill"
        : "an act of Congress";
  return {
    key: "prior",
    label: "The last shutdown",
    detail: `${days} days, ended ${dateLabel(campaign, lapse.endedTurn)} by ${ended}.`,
  };
}

function shutdownBrief(campaign: Campaign): SummonsBrief {
  const reading = selectShutdown(campaign);
  const appropriation = campaign.congress.appropriation;
  if (reading === undefined) {
    return quietBrief(campaign, "The government is open", "The government is funded.", "budget", {
      label: "Open the budget",
      href: place.budget(),
    });
  }
  return {
    title: SHUTDOWN_TITLE,
    clockLine: `The government has had no approved funding since ${dateLabel(campaign, reading.begunTurn)}. Everything but essential work has stopped, and the people who do that other work are home without pay.`,
    figure: dayCount(reading.days),
    stance: "adverse",
    history: historyOf(
      { key: "funded-through", label: "Funded through", detail: dateLabel(campaign, appropriation.throughTurn) },
      { key: "enacted", label: "Last funding bill", detail: dateLabel(campaign, appropriation.enactedTurn) },
      priorLapseLine(campaign),
      ledgerLine(campaign, reading.begunTurn, "record", "In the Record that week"),
    ),
    posture: [
      { key: "closed-for", caption: "Closed for", figure: dayCount(reading.days), stance: "adverse" },
      { key: "bodies", caption: "Agencies closed", figure: String(reading.closed.length) },
      { key: "half", caption: "Agencies partly open", figure: String(reading.insulated) },
      {
        key: "largest",
        caption: "Largest closed",
        figure: reading.closed.slice(0, CLOSED_BODIES_NAMED).join(", "),
      },
    ],
    counsel: counselFor(campaign, "budget"),
    door: { label: "Open the budget", href: place.budget() },
  };
}

function billDeskBrief(campaign: Campaign): SummonsBrief {
  const bill = nearestDeskBill(campaign);
  const waiting = selectBillsAwaitingSignature(campaign).length;
  if (bill === undefined) {
    return quietBrief(campaign, "No bills to sign", "No bill is waiting for your signature.", "policy", {
      label: "Open Policy",
      href: place.policy(),
    });
  }
  const window = selectSigningWindow(campaign, bill);
  const days = daysBetween(campaign.calendar, window.deadline);
  const urgency = urgencyForDays(days, DAYS_PER_TURN);
  const subject: SubjectRef = { kind: "bill", id: bill.id };
  return {
    title: bill.title,
    clockLine:
      days < 0
        ? "Your ten days are up. You didn't sign it, so it becomes law without you."
        : `${days === 0 ? "Today is the last of your ten days" : `Your ten days run out ${days === 1 ? "tomorrow" : `in ${days} days`}`}. If you do nothing, it becomes law. You can sign it, or veto it by sending it back with your objections.`,
    figure: daysFigure(days),
    stance: stanceForUrgency(urgency),
    history: historyOf(
      { key: "sent", label: "Sent to you", detail: formatGameDate(window.presentedOn) },
      ...bill.passage.map((vote, index) => ({
        key: `passage-${index}`,
        label: "Vote",
        detail: voteLine(vote),
      })),
      { key: "sponsor", label: "Sponsor", detail: SPONSOR_LABELS[bill.sponsor] },
    ),
    posture: [
      { key: "awaiting", caption: "Bills to sign", figure: String(waiting) },
      { key: "window", caption: "Deadline", figure: formatGameDate(window.deadline) },
    ],
    window: {
      length: window.windowDays,
      consumed: Math.max(0, Math.min(window.windowDays, window.windowDays - days)),
      unit: "day",
      statute: "Presentment clause",
    },
    counsel: counselFor(campaign, "policy"),
    door: { label: "Read the bill", ...subjectDoor(subject) },
  };
}

function aumfBrief(campaign: Campaign): SummonsBrief {
  const authorization = nearestAuthorization(campaign);
  if (authorization === undefined) {
    return quietBrief(campaign, "No war authorization in effect", "Congress hasn't approved any use of military force.", "security", {
      label: "Open Security",
      href: place.security(),
    });
  }
  const weeks = weeksUntil(campaign, authorization.expiresTurn);
  const urgency = urgencyForWeeks(weeks, 4);
  const target = selectNation(campaign, authorization.target)?.base.identity.name ?? String(authorization.target);
  return {
    title: authorization.title,
    clockLine: `${weeksPhrase(weeks)}, Congress's approval to use force against ${target} expires.`,
    figure: weeksFigure(weeks),
    stance: stanceForUrgency(urgency),
    history: historyOf(
      { key: "enacted", label: "Passed", detail: dateLabel(campaign, authorization.enactedTurn) },
      ...authorization.vote.map((vote, index) => ({
        key: `vote-${index}`,
        label: "Authorized",
        detail: voteLine(vote),
      })),
      ledgerLine(campaign, authorization.enactedTurn, "record", "In the Record that week"),
    ),
    posture: [
      { key: "target", caption: "Against", figure: target },
      { key: "expires", caption: "Expires", figure: dateLabel(campaign, authorization.expiresTurn) },
    ],
    counsel: counselFor(campaign, "security"),
    door: { label: "Open the War Powers deadline", href: warPowersHome(campaign, authorization.target) },
  };
}

function treatyBrief(campaign: Campaign): SummonsBrief {
  const treaty = oldestUnratified(campaign);
  if (treaty === undefined) {
    return quietBrief(campaign, "No treaties waiting on the Senate", "No treaty you've signed is waiting for the Senate to approve it.", "congress", {
      label: "Open Congress",
      href: place.congress(),
    });
  }
  const waiting = treatyWaiting(campaign, treaty);
  const counterpart = selectNation(campaign, treaty.counterpart)?.base.identity.name ?? String(treaty.counterpart);
  return {
    title: treaty.title,
    clockLine:
      waiting <= 0
        ? `Signed with ${counterpart} and sent to the Senate. It only takes effect once the Senate approves it.`
        : `Signed with ${counterpart} and waiting on the Senate for ${waiting} ${waiting === 1 ? "week" : "weeks"}.`,
    figure: weekCount(Math.max(0, waiting)),
    stance: waiting >= 4 ? "caution" : "neutral",
    history: historyOf(
      { key: "signed", label: "Signed", detail: dateLabel(campaign, treaty.signedTurn) },
      treaty.vote ? { key: "vote", label: "Senate", detail: voteLine(treaty.vote) } : undefined,
      ledgerLine(campaign, treaty.signedTurn, "record", "In the Record that week"),
    ),
    posture: [
      { key: "counterpart", caption: "With", figure: counterpart },
      { key: "waiting", caption: "Waiting", figure: weekCount(Math.max(0, waiting)) },
    ],
    counsel: counselFor(campaign, "congress"),
    door: { label: "Read the treaty", ...subjectDoor({ kind: "treaty", id: treaty.id }) },
  };
}

/**
 * The brief for a clock whose subject has since gone away.
 *
 * `compose` is total by contract — the folio and the tests call it for any
 * spec, not only a due one — so every clock needs an answer for the week its
 * bill was signed or its treaty ratified. It says nothing is pending, which is
 * true, rather than rendering a countdown against a record that no longer exists.
 */
function quietBrief(
  campaign: Campaign,
  title: string,
  clockLine: string,
  owner: Parameters<typeof counselFor>[1],
  door: SummonsBrief["door"],
): SummonsBrief {
  return {
    title,
    clockLine,
    figure: "None",
    stance: "neutral",
    history: [],
    posture: [{ key: "this-week", caption: "This week", figure: dateLabel(campaign, campaign.turn) }],
    counsel: counselFor(campaign, owner),
    door,
  };
}

export const LEGISLATIVE_BRIEFS: Readonly<Partial<Record<SummonsKind, (campaign: Campaign) => SummonsBrief>>> = {
  appropriation: appropriationBrief,
  shutdown: shutdownBrief,
  "bill-desk": billDeskBrief,
  "aumf-expiry": aumfBrief,
  "treaty-ratification": treatyBrief,
};
