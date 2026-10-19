import { describe, expect, it } from "vitest";
import { atCampaignTurn, buildCampaign, withWeeksElapsed } from "./__fixtures__/campaign.js";
import { weekdayOf } from "./clock.js";
import { apply, type EffectPacket } from "./effects.js";
import { legislativeAct } from "./legislative-acts.js";
import { projectPassage } from "./bill-stages.js";
import { legislationPhase, signBill, transmit, vetoBill } from "./legislation.js";
import { selectBillsAwaitingSignature, selectSigningWindow, signingDeadline, sittingDate } from "./signing-window.js";
import { selectBillsOnTheDesk, type Bill, type Campaign, type GameDate } from "./state.js";

const DEFENSE_ACT = "act-defense-authorization";
const INFRASTRUCTURE_ACT = "act-infrastructure-investment";

const day = (year: number, month: number, date: number): GameDate => ({ year, month, day: date });

/** A bill introduced in the first week that reached the desk on `presentedOn`. */
function presentedOn(campaign: Campaign, presented: GameDate): Campaign {
  const act = legislativeAct(DEFENSE_ACT)!;
  const bill: Bill = {
    id: `bill:${DEFENSE_ACT}:1`,
    act: DEFENSE_ACT,
    title: act.title,
    sponsor: act.sponsor,
    introducedTurn: 1,
    status: "on-the-desk",
    passage: projectPassage(campaign, act),
    presentedOn: presented,
  };
  return { ...campaign, bills: { ...campaign.bills, [bill.id]: bill } };
}

const onDate = (campaign: Campaign, date: GameDate): Campaign => ({ ...campaign, calendar: date });
const statusOf = (campaign: Campaign): Bill => Object.values(campaign.bills)[0]!;

describe("the ten days, Sundays excepted, after presentment", () => {
  it("counts ten days from presentment and skips every Sunday in them", () => {
    // Inauguration Day 2029 is a Saturday: the Sundays of the 21st and the 28th
    // do not count, so the tenth day is Thursday, February 1.
    expect(weekdayOf(day(2029, 1, 20))).toBe(6);
    expect(signingDeadline(day(2029, 1, 20))).toEqual(day(2029, 2, 1));
    // Presented on Monday, July 7, 2025: one Sunday inside, so Friday the 18th.
    expect(weekdayOf(day(2025, 7, 7))).toBe(1);
    expect(signingDeadline(day(2025, 7, 7))).toEqual(day(2025, 7, 18));
    // Across a month end: Friday, March 2, 2029 runs to Wednesday, March 14.
    expect(signingDeadline(day(2029, 3, 2))).toEqual(day(2029, 3, 14));
  });

  it("reads the window off the desk, and dates the lapse to the week the deadline falls in", () => {
    const campaign = presentedOn(atCampaignTurn(buildCampaign(), 6), day(2029, 3, 2));
    const window = selectSigningWindow(campaign, statusOf(campaign));
    expect(window).toEqual({ presentedOn: day(2029, 3, 2), deadline: day(2029, 3, 14), lapseTurn: 8, windowDays: 12 });
  });

  it("leaves a bill that spent weeks in committee on the desk until its own ten days run", () => {
    // Introduced in week 1 and presented in week 6: counting from introduction,
    // it lapsed the week it arrived.
    const week7 = presentedOn(atCampaignTurn(buildCampaign(), 7), day(2029, 3, 2));
    const afterWeek7 = legislationPhase(week7).reduce(apply, week7);
    expect(selectBillsOnTheDesk(afterWeek7)).toHaveLength(1);
  });

  it("is the President's through the tenth day, and out of reach the day after", () => {
    const week8 = atCampaignTurn(presentedOn(buildCampaign(), day(2029, 3, 2)), 8);
    const id = statusOf(week8).id;

    const onDeadline = onDate(week8, day(2029, 3, 14));
    expect(selectBillsAwaitingSignature(onDeadline)).toHaveLength(1);
    expect(signBill(onDeadline, id).ok).toBe(true);
    expect(vetoBill(onDeadline, id, "Not this bill.").ok).toBe(true);

    const dayAfter = onDate(week8, day(2029, 3, 15));
    expect(selectBillsAwaitingSignature(dayAfter)).toHaveLength(0);
    const late = signBill(dayAfter, id);
    expect(late.ok).toBe(false);
    if (!late.ok) expect(late.reason).toMatch(/ten days .* ran out; it becomes law without a signature/);
    expect(vetoBill(dayAfter, id, "Too late.").ok).toBe(false);

    // The chamber's sitting that week records it as law, unsigned.
    const recorded = legislationPhase(dayAfter).reduce(apply, dayAfter);
    expect(statusOf(recorded).status).toBe("law");
    expect(statusOf(recorded).enactedBy).toBe("unsigned");
    expect(statusOf(recorded).resolvedTurn).toBe(8);
  });

  it("lapses a bill in the weekly tick once the week's close is past the deadline", () => {
    const campaign = presentedOn(atCampaignTurn(buildCampaign(), 8), day(2029, 3, 2));
    // The week of March 11 closes on the 17th, past the 14th.
    const after = legislationPhase(campaign).reduce(apply, campaign);
    expect(statusOf(after).status).toBe("law");
  });

  it("stamps presentment with the day the bill reached the desk", () => {
    const willing = (campaign: Campaign): Campaign => ({ ...campaign, congress: { ...campaign.congress, disposition: 0.9 } });
    const start = willing(buildCampaign());
    const sent = transmit(start, INFRASTRUCTURE_ACT);
    if (!sent.ok) throw new Error(sent.reason);
    const id = `bill:${INFRASTRUCTURE_ACT}:${start.turn}`;
    let state = apply(start, sent.packet as EffectPacket);
    let sitting = sittingDate(state);
    for (let i = 0; i < 30 && state.bills[id]!.status === "in-progress"; i += 1) {
      sitting = sittingDate(state);
      state = withWeeksElapsed(legislationPhase(state).reduce(apply, state), 1);
    }
    const bill = state.bills[id]!;
    expect(bill.status).toBe("on-the-desk");
    expect(bill.presentedOn).toEqual(sitting);
    expect(state.turn - bill.introducedTurn).toBeGreaterThan(2);
  });
});
