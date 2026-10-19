import {
  notchName,
  selectBooksChange,
  selectBooksOpening,
  selectDateOfTurn,
  selectDebtLimit,
  selectFiscalStatement,
  selectNationalBooks,
  type Campaign,
} from "@admin/engine";
import { PLACES, anchored, place } from "../navigation/places";
import type { AttentionItem } from "./attention-row.js";
import { weekCount } from "../summons/clock-math";

// The Desk's rows about the national books: the rating cut since the oath,
// the outlook turning negative, the coupon market rate jumping, interest
// passing a quarter of revenue, and the debt limit coming close and then
// binding. Each "since" reads what the books kept: the notch and interest
// share they opened on, and a year of weekly market rates.
//
// The limit is read as one crossing, `binding` going true, with a soft warning
// in the weeks of headroom `selectDebtLimit` derives from the projected
// borrowing before it. The record also keeps the extraordinary measures and
// the X-date, so the X-date could be a row of its own; this file does not draw
// one.

// The rating and the debt limit are read in the fiscal books, which the
// budget carries.
const DOOR = { href: anchored(place.budgetView("books"), "books-position"), icon: PLACES.budget.icon };

// Every row here is a notice rather than an ask. The rating agencies, the
// Treasury's headroom and the limit itself are facts about the books that no
// act in the room behind the door answers, and a row that asked for an answer
// it offered no way to give could only be put off.
const NOTICE = "ambient" as const;

/** Weeks of headroom at or under this many turns the approach to the ceiling gets a row. */
const WARNING_HEADROOM_WEEKS = 8;

function outlookItem(campaign: Campaign): AttentionItem | undefined {
  const books = selectNationalBooks(campaign, campaign.founding.nation);
  if (!books || books.rating.outlook !== "negative") return undefined;
  return {
    id: "fiscal:outlook-negative",
    source: "market-threshold",
    urgency: NOTICE,
    subject: "fiscal:outlook",
    title: "Credit agencies warn of a downgrade",
    reason: "The agencies that grade how safe it is to lend to the United States have put it on watch. Their next review is more likely to lower the grade than keep it.",
    ...DOOR,
    stance: "caution",
  };
}

function limitItem(campaign: Campaign): AttentionItem | undefined {
  const limit = selectDebtLimit(campaign);
  if (limit.binding) {
    return {
      id: "fiscal:debt-limit",
      source: "market-threshold",
      urgency: NOTICE,
      ...(limit.xDateTurn !== undefined ? { dueDate: selectDateOfTurn(campaign, limit.xDateTurn) } : {}),
      subject: "fiscal:debt-limit",
      title: "The debt limit has been reached",
      reason: "The Treasury has borrowed as much as the law allows. It can pay only the bills the limit still covers.",
      ...DOOR,
      stance: "adverse",
      figure: "at limit",
    };
  }
  if (limit.headroomWeeks > WARNING_HEADROOM_WEEKS) return undefined;
  return {
    id: "fiscal:debt-limit-approaching",
    source: "market-threshold",
    urgency: NOTICE,
    dueDate: selectDateOfTurn(campaign, campaign.turn + limit.headroomWeeks),
    subject: "fiscal:debt-limit",
    title: "The debt limit is close",
    reason: `At this year's pace of borrowing, the Treasury hits the legal limit in about ${limit.headroomWeeks} weeks.`,
    ...DOOR,
    stance: "caution",
    figure: weekCount(limit.headroomWeeks),
  };
}

/** How far the coupon market rate must rise inside `COUPON_JUMP_WEEKS` for a row: a quarter point. */
const COUPON_JUMP = 0.0025;
const COUPON_JUMP_WEEKS = 13;

/** The share of revenue interest has to pass, having opened at or under it, for a row. */
const INTEREST_SHARE_LINE = 0.25;

const percent = (fraction: number, digits = 0) => `${(fraction * 100).toFixed(digits)}%`;

function ratingCutItem(campaign: Campaign): AttentionItem | undefined {
  const books = selectNationalBooks(campaign, campaign.founding.nation);
  const opening = selectBooksOpening(campaign);
  if (!books || !opening || books.rating.score >= opening.score) return undefined;
  return {
    id: "fiscal:rating-cut",
    source: "market-threshold",
    urgency: NOTICE,
    subject: "fiscal:rating",
    title: "The country's credit rating has dropped since you took office",
    reason: `The agencies now rate the United States ${notchName(books.rating.score)}, down from ${notchName(opening.score)} when you took office. That makes new borrowing more expensive.`,
    ...DOOR,
    stance: "adverse",
    figure: notchName(books.rating.score),
  };
}

function couponJumpItem(campaign: Campaign): AttentionItem | undefined {
  const change = selectBooksChange(campaign, COUPON_JUMP_WEEKS);
  if (!change || change.market.to - change.market.from < COUPON_JUMP) return undefined;
  const points = Math.round((change.market.to - change.market.from) * 10_000);
  return {
    id: "fiscal:coupon-jump",
    source: "market-threshold",
    urgency: NOTICE,
    subject: "fiscal:rates",
    title: "The cost of new Treasury borrowing has jumped",
    reason: `The interest rate the government pays to borrow for ten years rose ${points} basis points (hundredths of a percent) in ${COUPON_JUMP_WEEKS} weeks, from ${percent(change.market.from, 2)} to ${percent(change.market.to, 2)}. Every new bond it sells now pays the higher rate.`,
    ...DOOR,
    stance: "caution",
    figure: `+${points} bp`,
  };
}

function interestShareItem(campaign: Campaign): AttentionItem | undefined {
  const opening = selectBooksOpening(campaign)?.interestShare;
  if (opening === undefined || opening > INTEREST_SHARE_LINE) return undefined;
  const statement = selectFiscalStatement(campaign);
  const share = statement.revenueTotal > 0 ? statement.outlay.debtService / statement.revenueTotal : 0;
  if (share <= INTEREST_SHARE_LINE) return undefined;
  return {
    id: "fiscal:interest-share",
    source: "market-threshold",
    urgency: NOTICE,
    subject: "fiscal:interest",
    title: "Interest now takes more than a quarter of what the government collects",
    reason: `Interest on the debt now costs ${percent(share)} of what the government takes in, up from ${percent(opening)} when you took office. It gets paid before anything you choose to fund.`,
    ...DOOR,
    stance: "adverse",
    figure: percent(share),
  };
}

export function fiscalAttentionItems(campaign: Campaign): readonly AttentionItem[] {
  return [ratingCutItem(campaign), outlookItem(campaign), couponJumpItem(campaign), interestShareItem(campaign), limitItem(campaign)].filter((item): item is AttentionItem => item !== undefined);
}
