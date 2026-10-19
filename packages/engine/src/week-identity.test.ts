import { describe, expect, it } from "vitest";
import { advanceUntilAttention } from "./advance.js";
import { daysBetween } from "./clock.js";
import { foundedForBalance } from "./balance-harness.js";
import type { Campaign } from "./state.js";
import { campaignTurnPhases } from "./turn-phases.js";

const SEEDS = ["living-clock-a", "living-cold-b", "perf-0"] as const;
const WEEKS = 52;

function idle(seed: string, layout: boolean): Campaign {
  const { campaign, charter } = foundedForBalance(seed);
  const result = advanceUntilAttention(campaign, {
    phases: campaignTurnPhases(charter, layout),
    horizonDays: WEEKS * 7,
    matterSources: [],
  });
  return result.campaign;
}

function picture(campaign: Campaign) {
  return {
    turn: campaign.turn,
    week: campaign.week,
    metrics: campaign.player.metrics,
    polarization: campaign.player.opinion.polarization,
    pressure: campaign.removal.pressure,
    ledger: campaign.ledger.map((entry) => `${entry.turn}|${String(entry.actor)}|${entry.description}`),
    feed: campaign.feed.length,
    crime: Object.fromEntries(
      Object.entries(campaign.nations).map(([id, nation]) => [id, nation.stats.security.crimeIndex]),
    ),
    cohorts: campaign.cohorts,
  };
}

/** Intelligence files on day 5 under the layout and on day 7 under the one-shot week. */
const ASSESSMENT_STAMP_BOUND = 2;
/** A story filed on day 1 is six days earlier than the same story filed at the Friday tick. */
const FEED_STAMP_BOUND = 6;
/** The chamber sits on day 6 under the layout and at the day-7 tick under the one-shot week. */
const PRESENTMENT_STAMP_BOUND = 1;

function withoutStamps(campaign: Campaign): Campaign {
  return {
    ...campaign,
    security: {
      ...campaign.security,
      assessments: campaign.security.assessments.map((assessment) => ({
        ...assessment,
        id: assessment.id.replace(/:\d+$/, ":day"),
        issuedDay: 0,
        issuedDate: { year: 1, month: 1, day: 1 },
      })),
    },
    feed: campaign.feed.map((item) => ({ ...item, date: { year: 1, month: 1, day: 1 } })),
  };
}

const STAMP_KEYS = new Set(["date", "issuedDate", "issuedDay", "createdDate", "presentedOn"]);

function differences(left: unknown, right: unknown, path: string, out: string[]): void {
  if (out.length > 12) return;
  if (Object.is(left, right)) return;
  if (typeof left !== "object" || typeof right !== "object" || left === null || right === null) {
    out.push(path);
    return;
  }
  if (Array.isArray(left) || Array.isArray(right)) {
    if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) {
      out.push(`${path}.length`);
      return;
    }
    for (let index = 0; index < left.length; index += 1) differences(left[index], right[index], `${path}[${index}]`, out);
    return;
  }
  const keys = new Set([...Object.keys(left as object), ...Object.keys(right as object)]);
  for (const key of keys) {
    if (STAMP_KEYS.has(key)) continue;
    differences(
      (left as Record<string, unknown>)[key],
      (right as Record<string, unknown>)[key],
      `${path}.${key}`,
      out,
    );
  }
}

function stampSlips(laid: Campaign, flat: Campaign): number[] {
  return laid.security.assessments.map((assessment, index) => {
    const other = flat.security.assessments[index];
    return other === undefined ? Number.POSITIVE_INFINITY : Math.abs(assessment.issuedDay - other.issuedDay);
  });
}

describe("an idle staggered week", () => {
  for (const seed of SEEDS) {
    // Pinned known defect: under the office-day cut a phase reads the date of its own day, so a
    // choice gated on a date window (a covert campaign ahead of a foreign vote) can fall a week
    // apart; the two weeks diverge in that choice, not in the player's metrics. Incidents a weekly
    // phase opens are dated to the week's closing day and no longer diverge.
    it.fails(`matches the one-shot week on ${seed}, aside from assessment stamps`, () => {
      const laid = idle(seed, true);
      const flat = idle(seed, false);
      expect(picture(laid)).toEqual(picture(flat));
      expect(laid.security.assessments).toHaveLength(flat.security.assessments.length);
      expect(stampSlips(laid, flat).every((slip) => slip <= ASSESSMENT_STAMP_BOUND)).toBe(true);
      const feedSlips = laid.feed.map((item, index) => {
        const other = flat.feed[index]?.date;
        if (!item.date || !other) return 0;
        return Math.abs(daysBetween(item.date, other));
      });
      expect(feedSlips.every((slip) => slip <= FEED_STAMP_BOUND)).toBe(true);
      const ledgerSlips = laid.ledger.map((entry, index) => {
        const other = flat.ledger[index]?.causal?.createdDate;
        const created = entry.causal?.createdDate;
        if (!created || !other) return 0;
        return Math.abs(daysBetween(created, other));
      });
      expect(ledgerSlips.every((slip) => slip <= FEED_STAMP_BOUND)).toBe(true);
      const presentmentSlips = Object.values(laid.bills).map((bill) => {
        const other = flat.bills[bill.id]?.presentedOn;
        if (!bill.presentedOn || !other) return bill.presentedOn === other ? 0 : Number.POSITIVE_INFINITY;
        return Math.abs(daysBetween(bill.presentedOn, other));
      });
      expect(presentmentSlips.every((slip) => slip <= PRESENTMENT_STAMP_BOUND)).toBe(true);
      const drifted: string[] = [];
      differences(withoutStamps(laid), withoutStamps(flat), "campaign", drifted);
      expect(drifted, drifted.join("\n")).toEqual([]);
    });
  }
});
