import {
  BEAT_THRESHOLDS,
  DAYS_PER_TURN,
  DISAPPROVAL_WINDOW_TURNS,
  selectPerson,
  selectRemoval,
  selectRemovalVotes,
  terminationDaysRemaining,
  terminationStartDay,
  terminationWindowFromIntroduction,
  weeksFor,
  type Campaign,
  type Nomination,
  type PendingRule,
} from "@admin/engine";
import { place } from "../navigation/places";
import { warPowersHome } from "../world/war-powers-home";
import { formatRatio, stanceForPressure } from "../format/figures";
import { charterOf } from "../campaign/founding-options";
import {
  dateLabel,
  daysFigure,
  daysPhrase,
  daysUntil,
  stanceForUrgency,
  urgencyForDays,
  urgencyForWeeks,
  weeksFigure,
  weeksPhrase,
  weeksUntil,
} from "./clock-math";
import { counselFor, historyOf, ledgerLine } from "./compose";
import {
  DISAPPROVAL_LIVE_TURNS,
  INSTITUTION_NAMES,
  REMOVAL_TITLE,
  actingTitle,
  departureTitle,
  disapprovalWeeksLeft,
  exposedRule,
  institutionName,
  nearestActing,
  nearestDeparture,
  nearestNomination,
  nearestRule,
  nearestRuling,
  nearestTermination,
  nextRung,
  nextSeatMilestone,
  nominationTitle,
  reportTitle,
  ruleDisapprovalTitle,
  ruleEffectiveTitle,
  rulingTitle,
  stageDaysLeft,
  targetName,
  terminationTitle,
  turnOfDay,
  unfiledObligation,
} from "./due-executive";
import { subjectDoor } from "../advisor/types";
import type { SubjectRef } from "../shell/subject";
import { officeOfInstitution, officeOfRole } from "../shell/office-of";
import type { SummonsBrief, SummonsDoor, SummonsKind } from "./types";

/** The office a chair's clock is answered in; Washington only where the chair has no office page. */
function officeDoor(office: string | undefined): SummonsDoor {
  return office ? { label: "Open the office", ...subjectDoor({ kind: "office", id: office }) } : { label: "Open Washington", href: place.washington() };
}

/**
 * The clocks the executive branch runs on its own account, as documents.
 *
 * War powers, appointments, the courts and the calendar. When each lands is
 * `due-executive.ts`; this file is what the folio reads once one has, and it is
 * the half that reaches the owning room's advisor for counsel.
 */

function reportBrief(campaign: Campaign): SummonsBrief {
  const obligation = unfiledObligation(campaign);
  if (obligation === undefined) {
    return quietBrief(campaign, "No report due", "You've told Congress about every use of military force.", "security", {
      label: "Open Security",
      href: place.security(),
    });
  }
  const days = daysUntil(campaign, obligation.dueDay);
  const urgency = urgencyForDays(days, DAYS_PER_TURN);
  return {
    title: reportTitle(campaign, obligation),
    clockLine:
      days <= 0
        ? "The deadline to report has passed. Congress wasn't told, and the Record shows it."
        : `${daysPhrase(days)}, you owe Congress a written report on sending in the military.`,
    figure: daysFigure(days),
    stance: obligation.missed ? "adverse" : stanceForUrgency(urgency),
    history: historyOf(
      { key: "opened", label: "Military sent in", detail: dateLabel(campaign, turnOfDay(obligation.openedDay)) },
      { key: "action", label: "What was done", detail: obligation.description },
      obligation.missed ? { key: "missed", label: "Status", detail: "This report wasn't filed on time." } : undefined,
    ),
    posture: [
      { key: "target", caption: "Against", figure: targetName(campaign, obligation) },
      { key: "rung", caption: "Step", figure: String(obligation.rung) },
    ],
    // The window is the obligation's own two dates, not a constant restated
    // here: forces were introduced on one day and the report is owed on
    // another, and the days between them are the denominator "3 days left"
    // never states.
    window: {
      length: Math.max(1, obligation.dueDay - obligation.openedDay),
      consumed: Math.max(1, obligation.dueDay - obligation.openedDay) - days,
      unit: "day",
      statute: "War Powers Resolution",
    },
    counsel: counselFor(campaign, "security"),
    door: { label: "Open the War Powers deadline", href: warPowersHome(campaign, obligation.target) },
  };
}

function terminationBrief(campaign: Campaign): SummonsBrief {
  const obligation = nearestTermination(campaign);
  if (obligation === undefined) {
    return quietBrief(campaign, "No War Powers deadline", "No military action is up against a War Powers deadline.", "security", {
      label: "Open Security",
      href: place.security(),
    });
  }
  const days = terminationDaysRemaining(campaign, obligation);
  const urgency = urgencyForDays(days, 2 * DAYS_PER_TURN);
  const target = targetName(campaign, obligation);
  return {
    title: terminationTitle(campaign, obligation),
    clockLine:
      days <= 0
        ? `The legal time limit has run out. Unless Congress approves it, the forces sent against ${target} have to come home.`
        : `${daysPhrase(days)}, the legal time limit runs out. Unless Congress approves this use of force, it has to end.`,
    figure: daysFigure(days),
    stance: stanceForUrgency(urgency),
    history: historyOf(
      { key: "opened", label: "Clock started", detail: dateLabel(campaign, turnOfDay(terminationStartDay(obligation))) },
      obligation.filing
        ? { key: "filed", label: "Reported", detail: obligation.filing.authorityClaimed }
        : { key: "filed", label: "Reported", detail: "You haven't filed a report." },
      obligation.extension
        ? { key: "extension", label: "Extra time claimed", detail: obligation.extension.necessity }
        : undefined,
      ledgerLine(campaign, turnOfDay(obligation.openedDay), "record", "In the Record that week"),
    ),
    posture: [
      { key: "target", caption: "Against", figure: target },
      { key: "days", caption: "Days left", figure: String(Math.max(0, days)) },
    ],
    // The obligation's own window, extension included, rather than the base
    // sixty days restated in a turn count and multiplied back out: a
    // certified extension moves the length window and days does not carry a
    // turn-quantized number to disagree with.
    window: {
      length: terminationWindowFromIntroduction(obligation),
      consumed: terminationWindowFromIntroduction(obligation) - days,
      unit: "day",
      statute: "War Powers Resolution",
    },
    counsel: counselFor(campaign, "security"),
    door: { label: "Open the War Powers deadline", href: warPowersHome(campaign, obligation.target) },
  };
}

/** The stage id as English, since the engine's ids are hyphenated slugs. */
function stageWords(nomination: Nomination): string {
  const words = nomination.stage.replace(/-/g, " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function nominationBrief(campaign: Campaign): SummonsBrief {
  const nomination = nearestNomination(campaign);
  if (nomination === undefined) {
    return quietBrief(campaign, "No nominations waiting", "Nobody you've named is waiting on the Senate.", "washington", {
      label: "Open Washington",
      href: place.washington(),
    });
  }
  const days = stageDaysLeft(campaign, nomination);
  const last = nomination.history[nomination.history.length - 1];
  return {
    title: nominationTitle(campaign, nomination),
    clockLine:
      days <= 0
        ? `This nomination has been stuck at ${stageWords(nomination)} longer than it should be.`
        : `${daysPhrase(days)}, the nomination either gets past ${stageWords(nomination)} or gets stuck there.`,
    figure: daysFigure(days),
    stance: stanceForUrgency(urgencyForDays(days)),
    history: historyOf(
      { key: "opened", label: "Opened", detail: dateLabel(campaign, turnOfDay(nomination.openedDay)) },
      last ? { key: "last", label: "Last step", detail: last.note } : undefined,
      nomination.controversies.length > 0
        ? { key: "controversy", label: "Concerns raised", detail: nomination.controversies.join("; ") }
        : undefined,
    ),
    posture: [
      { key: "stage", caption: "Stage", figure: stageWords(nomination) },
      {
        key: "institution",
        caption: "Institution",
        figure: INSTITUTION_NAMES.get(String(nomination.institution)) ?? String(nomination.institution),
      },
    ],
    counsel: counselFor(campaign, "washington"),
    door: officeDoor(String(nomination.office)),
  };
}

function rulingBrief(campaign: Campaign): SummonsBrief {
  const order = nearestRuling(campaign);
  const dueTurn = order?.review?.dueTurn;
  if (order === undefined || dueTurn === undefined) {
    return quietBrief(campaign, "No court ruling coming", "None of your orders is being challenged in court.", "courts", {
      label: "Open the courts",
      href: place.courts(),
    });
  }
  const weeks = weeksUntil(campaign, dueTurn);
  const pending = campaign.orders.filter((record) => record.review?.status === "pending").length;
  return {
    title: rulingTitle(order),
    clockLine:
      weeks <= 0
        ? "A court rules on your order this week."
        : `${weeksPhrase(weeks)}, a court rules on an order you signed.`,
    figure: weeksFigure(weeks),
    stance: stanceForUrgency(urgencyForWeeks(weeks, 1)),
    history: historyOf(
      { key: "signed", label: "Signed", detail: dateLabel(campaign, order.turn) },
      ledgerLine(campaign, order.turn, "record", "In the Record that week"),
    ),
    posture: [
      { key: "pending", caption: "In court", figure: String(pending) },
      { key: "due", caption: "Ruling due", figure: dateLabel(campaign, dueTurn) },
    ],
    counsel: counselFor(campaign, "courts"),
    door: { label: "Read the case", ...subjectDoor({ kind: "case", id: order.id }) },
  };
}

/**
 * What the same order's earlier proceedings came to.
 *
 * A rule the courts stayed once and Congress struck down once is a different
 * proposition from a first attempt, and the record is the only place that
 * shows it.
 */
function priorRuleLines(campaign: Campaign, rule: PendingRule) {
  return campaign.pendingRules
    .filter((prior) => prior.order === rule.order && prior.id !== rule.id && prior.resolvedTurn !== undefined)
    .map((prior, index) => ({
      key: `prior-${index}`,
      label: dateLabel(campaign, prior.resolvedTurn ?? prior.signedTurn),
      detail: RULE_OUTCOMES[prior.status],
    }));
}

const RULE_OUTCOMES: Readonly<Record<PendingRule["status"], string>> = {
  pending: "The rule was still being written.",
  stayed: "A lower court put the rule on hold before it took effect, while the case went on.",
  "in-effect": "The rule became final, and the whole country had to follow it.",
  canceled: "The rule was dropped before it took effect, so it never changed anything.",
  rescinded: "The rule was withdrawn after it took effect. The money already spent, and the rule's history, stay in the Record.",
  "struck-down": "A court struck down the rule after it took effect, and its effects were undone.",
  disapproved: "Congress voted to cancel the rule, and its effects were undone.",
};

function ruleEffectiveBrief(campaign: Campaign): SummonsBrief {
  const rule = nearestRule(campaign);
  if (rule === undefined) {
    return quietBrief(campaign, "No rules being written", "None of your orders is being turned into a formal rule right now.", "policy", {
      label: "Open Policy",
      href: place.policy(),
    });
  }
  const weeks = weeksUntil(campaign, rule.effectiveTurn);
  const pending = campaign.pendingRules.filter((entry) => entry.status === "pending").length;
  const subject: SubjectRef = { kind: "order", id: rule.order };
  return {
    title: ruleEffectiveTitle(rule),
    clockLine:
      weeks <= 0
        ? "The rule is finished and takes effect this week."
        : `${weeksPhrase(weeks)}, the rule is finished and your order becomes law that everyone has to follow.`,
    figure: weeksFigure(weeks),
    stance: stanceForUrgency(urgencyForWeeks(weeks)),
    history: historyOf(
      { key: "signed", label: "Signed", detail: dateLabel(campaign, rule.signedTurn) },
      ...priorRuleLines(campaign, rule),
      ledgerLine(campaign, rule.signedTurn, "record", "In the Record that week"),
    ),
    posture: [
      { key: "final", caption: "Final", figure: dateLabel(campaign, rule.effectiveTurn) },
      { key: "pending", caption: "Being written", figure: String(pending) },
    ],
    counsel: counselFor(campaign, "policy"),
    door: { label: "Read the order", ...subjectDoor(subject) },
  };
}

function ruleDisapprovalBrief(campaign: Campaign): SummonsBrief {
  const rule = exposedRule(campaign);
  if (rule === undefined) {
    return quietBrief(campaign, "No rules Congress can cancel", "Congress can't vote to cancel any of your rules right now.", "policy", {
      label: "Open Policy",
      href: place.policy(),
    });
  }
  const weeks = disapprovalWeeksLeft(campaign, rule);
  const landed = rule.resolvedTurn ?? rule.effectiveTurn;
  const subject: SubjectRef = { kind: "order", id: rule.order };
  return {
    title: ruleDisapprovalTitle(rule),
    clockLine: `This rule has been in effect since ${dateLabel(campaign, landed)}. For ${weeks} more ${weeks === 1 ? "week" : "weeks"}, Congress can vote to cancel it. If they do, you can't issue the same rule again.`,
    figure: weeksFigure(weeks),
    stance: campaign.turn - landed <= DISAPPROVAL_LIVE_TURNS ? "caution" : "neutral",
    history: historyOf(
      { key: "signed", label: "Signed", detail: dateLabel(campaign, rule.signedTurn) },
      { key: "landed", label: "Became final", detail: dateLabel(campaign, landed) },
      ledgerLine(campaign, landed, "record", "In the Record that week"),
    ),
    posture: [
      { key: "window", caption: "Deadline", figure: dateLabel(campaign, landed + DISAPPROVAL_WINDOW_TURNS) },
      { key: "left", caption: "Weeks left", figure: String(Math.max(0, weeks)) },
    ],
    window: {
      length: DISAPPROVAL_WINDOW_TURNS,
      consumed: campaign.turn - landed,
      unit: "week",
      statute: "Congressional Review Act",
    },
    counsel: counselFor(campaign, "policy"),
    door: { label: "Read the order", ...subjectDoor(subject) },
  };
}

function actingBrief(campaign: Campaign): SummonsBrief {
  const seat = nearestActing(campaign);
  if (seat === undefined) {
    return quietBrief(campaign, "No temporary leaders running out of time", "Every office is led by someone the Senate confirmed.", "washington", {
      label: "Open Washington",
      href: place.washington(),
    });
  }
  const days = daysUntil(campaign, seat.expiresDay);
  const name = institutionName(seat);
  const holder = seat.runtime.actingLeader
    ? (selectPerson(campaign, seat.runtime.actingLeader)?.base.name ?? String(seat.runtime.actingLeader))
    : undefined;
  return {
    title: actingTitle(seat),
    clockLine:
      days <= 0
        ? `The temporary leader at ${name} has run out of time to serve under the law.`
        : `${daysPhrase(days)}, the temporary leader at ${name} runs out of time to serve under the law.`,
    figure: daysFigure(days),
    stance: stanceForUrgency(urgencyForDays(days)),
    history: historyOf(
      holder ? { key: "holder", label: "Filling in", detail: holder } : undefined,
      { key: "vacant", label: "Days without a confirmed leader", detail: String(seat.runtime.vacantDays) },
    ),
    posture: [
      { key: "institution", caption: "Institution", figure: name },
      { key: "days", caption: "Days left", figure: String(Math.max(0, days)) },
    ],
    counsel: counselFor(campaign, "washington"),
    door: officeDoor(officeOfInstitution(seat.runtime.id)),
  };
}

function departureBrief(campaign: Campaign): SummonsBrief {
  const transition = nearestDeparture(campaign);
  if (transition === undefined) {
    return quietBrief(campaign, "No secretary leaving without a replacement", "Nobody who's leaving is waiting for you to name a replacement.", "washington", {
      label: "Open Washington",
      href: place.washington(),
    });
  }
  const weeks = weeksUntil(campaign, transition.leavesTurn);
  const name = selectPerson(campaign, transition.person)?.base.name ?? String(transition.person);
  return {
    title: departureTitle(campaign, transition),
    clockLine:
      weeks <= 0
        ? `${name} leaves this week. No replacement is before the Senate, so the deputy will fill in.`
        : `${weeksPhrase(weeks)}, ${name} leaves. If you send the Senate a replacement, ${name} stays until that person is confirmed. If you send nobody, the deputy fills in.`,
    figure: weeksFigure(weeks),
    stance: stanceForUrgency(urgencyForWeeks(weeks)),
    history: historyOf({ key: "announced", label: "Announced", detail: dateLabel(campaign, transition.announcedTurn) }),
    posture: [{ key: "weeks", caption: "Weeks left", figure: String(Math.max(0, weeks)) }],
    counsel: counselFor(campaign, "washington"),
    door: officeDoor(officeOfRole(transition.role)),
  };
}

function milestoneBrief(campaign: Campaign): SummonsBrief {
  const milestone = nextSeatMilestone(campaign);
  if (milestone === undefined) {
    return quietBrief(campaign, "No election on the calendar", "There's no election or end of a term coming up.", "nation", {
      label: "Open the nation",
      href: place.nation(),
    });
  }
  const weeks = weeksFor(milestone.daysAway, "ceil");
  return {
    title: milestone.label,
    clockLine:
      milestone.daysAway <= 0
        ? `${milestone.label} is here.`
        : `${weeksPhrase(weeks)} (${milestone.daysAway} days), the country votes on how you've done the job.`,
    figure: weeksFigure(weeks),
    stance: stanceForUrgency(urgencyForDays(milestone.daysAway, 2 * DAYS_PER_TURN)),
    history: historyOf(ledgerLine(campaign, campaign.turn - 1, "record", "Last week in the Record")),
    posture: [
      { key: "days", caption: "Days away", figure: String(Math.max(0, milestone.daysAway)) },
      { key: "this-week", caption: "This week", figure: dateLabel(campaign, campaign.turn) },
    ],
    counsel: counselFor(campaign, "nation"),
    door: { label: "Read your approval", ...subjectDoor({ kind: "metric", id: "approval" }) },
  };
}

/** What crossing a given rung actually does, so a clock line never quotes 100%. */
function removalRungMeaning(rung: number): string {
  if (rung <= BEAT_THRESHOLDS[0]) return "the House starts talking about impeachment";
  if (rung <= BEAT_THRESHOLDS[1]) return "the House votes on impeachment";
  return "the Senate holds a trial, and two thirds of senators can remove you";
}

function removalBrief(campaign: Campaign): SummonsBrief {
  const removal = selectRemoval(campaign);
  const rung = nextRung(removal.pressure);
  const lastBeat = removal.beats[removal.beats.length - 1];
  const nextVote = selectRemovalVotes(campaign, charterOf(campaign)).find(
    (step) => step.beat === removal.beats.length,
  );
  return {
    title: REMOVAL_TITLE,
    clockLine:
      rung === undefined
        ? "Pressure to remove you has reached the last step. You're removed only if two thirds of the Senate votes to convict you."
        : `Pressure to remove you is at ${formatRatio(removal.pressure)}. At ${formatRatio(rung)}, ${removalRungMeaning(rung)}.`,
    figure: formatRatio(removal.pressure),
    stance: stanceForPressure(removal.pressure),
    history: historyOf(
      lastBeat
        ? { key: "beat", label: dateLabel(campaign, lastBeat.turn), detail: lastBeat.description }
        : undefined,
      ledgerLine(campaign, campaign.turn - 1, "record", "Last week in the Record"),
    ),
    posture: [
      { key: "pressure", caption: "Pressure", figure: formatRatio(removal.pressure) },
      { key: "beats", caption: "Steps taken", figure: String(removal.beats.length) },
      // The count the next step actually turns on, where there is one. The
      // reading alone opens the first step and nothing else, so a president
      // reading a clock that only ever showed a percentage was watching the
      // half of the mechanism that cannot remove them.
      ...(nextVote
        ? [{ key: "count", caption: nextVote.question, figure: `${nextVote.vote.yeas} / ${nextVote.vote.required}` }]
        : []),
    ],
    counsel: counselFor(campaign, "record"),
    door: { label: "See your approval", ...subjectDoor({ kind: "metric", id: "approval" }) },
  };
}

/** See the note on the twin in clocks-legislative.ts: `compose` is total by contract. */
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

export const EXECUTIVE_BRIEFS: Readonly<Partial<Record<SummonsKind, (campaign: Campaign) => SummonsBrief>>> = {
  "war-powers-report": reportBrief,
  "war-powers-termination": terminationBrief,
  "nomination-stage": nominationBrief,
  "ruling-due": rulingBrief,
  "rule-effective": ruleEffectiveBrief,
  "rule-disapproval": ruleDisapprovalBrief,
  "acting-authority": actingBrief,
  "departure-transition": departureBrief,
  "election-milestone": milestoneBrief,
  "removal-beat": removalBrief,
};
