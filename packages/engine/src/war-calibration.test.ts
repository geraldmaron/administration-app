/**
 * The war's losses and endings against the record, on the real dataset at
 * twelve seeds. Each case names its source and its tolerance. US figures are
 * from CRS RL32492 (2020-07-29) as quoted in
 * docs/audits/2026-10-12-data-model/RESEARCH-SECURITY-CONFLICT.md section 4.2.
 */
import { describe, expect, it } from "vitest";
import type { NationId } from "@admin/world";
import { foundedForBalance } from "./balance-harness.js";
import { openConflict } from "./conflicts.js";
import { apply } from "./effects.js";
import { selectLeadershipChanges } from "./foreign-politics.js";
import { specAgainst, specForRung } from "./force-packages.js";
import { weeklyLosses } from "./war-attrition.js";
import { conflictPhase, derivedPressure } from "./war-tick.js";
import type { Campaign, Commitment, Conflict } from "./state.js";

const USA = "USA" as NationId;
const SEEDS = Array.from({ length: 12 }, (_, i) => `war-calibration-${i}`);
const founded = SEEDS.map((seed) => foundedForBalance(seed, "democrat", {}, { carriedWorld: false }).campaign);

function brigades(campaign: Campaign, target: NationId, count: number): Campaign {
  const id = `commitment:sustainment:${USA}:${target}`;
  const commitment: Commitment = {
    id,
    kind: "sustainment",
    actor: USA,
    target: { kind: "nation", id: target as string },
    resource: { spec: { kind: "currency", scale: 6, suffix: "USD" }, amountPerTurn: 0 },
    source: { kind: "orderOfBattle", branch: "army", unitType: "army.brigade-combat-team", count },
    startedTurn: campaign.turn,
    review: "standing",
    status: "active",
    rationale: "A corps in the field.",
  };
  return { ...campaign, commitments: { ...campaign.commitments, [id]: commitment } };
}

/** The invasion package the staff would size against this target. */
function sizedPackage(campaign: Campaign, target: NationId): number {
  return specAgainst(campaign, target, specForRung(5)!).preferred;
}

type Fought = { readonly campaign: Campaign; readonly conflict: Conflict; readonly weeks: number };

/** Fight one war, and only the war, week by week until it ends or the weeks run out. */
function fight(campaign: Campaign, aggressor: NationId, defender: NationId, maxWeeks: number): Fought {
  const opened = { ...openConflict(aggressor, defender, campaign.turn, "A calibration war."), intensity: 0.5 };
  let state: Campaign = { ...campaign, conflicts: { [opened.id]: opened } };
  for (let week = 1; week <= maxWeeks; week += 1) {
    state = conflictPhase(state).reduce((next, packet) => apply(next, packet), state);
    if (state.conflicts[opened.id]!.status !== "active") return { campaign: state, conflict: state.conflicts[opened.id]!, weeks: week };
    state = { ...state, turn: state.turn + 1 };
  }
  return { campaign: state, conflict: state.conflicts[opened.id]!, weeks: maxWeeks };
}

const killed = (fought: Fought, side: "aggressor" | "defender") => {
  const band = fought.conflict.casualties?.[side];
  return band ? (band.killed.low + band.killed.high) / 2 : 0;
};
/** Whether the war's end seated a new government in the loser: a succession on the record that the founding board did not carry. */
const seated = (fought: Fought, before: Campaign, loser: NationId) =>
  selectLeadershipChanges(fought.campaign, loser).filter((change) => change.kind === "succession").length >
  selectLeadershipChanges(before, loser).filter((change) => change.kind === "succession").length;

describe("Iraq, March 2003 to December 2011 (fitted)", () => {
  // Iraqi Freedom and New Dawn: 4,418 + 74 = 4,492 deaths and 31,994 + 298 =
  // 32,292 wounded over 456 weeks. The force is an assumed average of 120,000
  // (thirty brigade combat teams), which the research note brackets with CRS
  // RL33110's 124,000 to 165,000 troop counts; the front is held at 0.3, fought
  // lightly. The hostile rate is fitted to this case, so it passes by
  // construction: this test holds the fit in place. Tolerance ±15% each.
  it("puts US killed and wounded over the occupation's length within 15% of the record on every seed", () => {
    for (const campaign of founded) {
      const IRQ = "IRQ" as NationId;
      const state = brigades(campaign, IRQ, 30);
      const conflict = { ...openConflict(USA, IRQ, state.turn, "Iraq."), intensity: 0.3 };
      const week = weeklyLosses(state, conflict, "aggressor", derivedPressure(state, conflict).aggressor);
      expect(week.killed * 456, campaign.seed).toBeGreaterThan(4_492 * 0.85);
      expect(week.killed * 456, campaign.seed).toBeLessThan(4_492 * 1.15);
      expect(week.wounded * 456, campaign.seed).toBeGreaterThan(32_292 * 0.85);
      expect(week.wounded * 456, campaign.seed).toBeLessThan(32_292 * 1.15);
    }
  });
});

describe("the Gulf War, 1991 (held out)", () => {
  // Desert Storm: 147 hostile deaths and 467 wounded in a short war against a
  // mid-tier army, fought with a force many times the corps the game sends;
  // Just Cause (Panama) 23 deaths and Urgent Fury (Grenada) 19. A sized
  // expeditionary corps against Iraq's establishment, with no act after the
  // first, must win decisively and seat a successor on at least 9 of 12 seeds,
  // each within a season (17 weeks; the record's war ran about six), and lose
  // between 5 and 300 dead on every seed. A front can still cool into a held
  // line before the defense breaks, which is why the bar is not 12 of 12.
  it("ends in a decisive US victory that seats a successor, at a US cost in the record's range", () => {
    const IRQ = "IRQ" as NationId;
    const wars = founded.map((campaign) => fight(brigades(campaign, IRQ, sizedPackage(campaign, IRQ)), USA, IRQ, 26));
    const decisive = wars.filter((war, i) => war.conflict.status === "aggressor-victory" && seated(war, founded[i]!, IRQ));
    expect(decisive.length).toBeGreaterThanOrEqual(9);
    for (const war of decisive) expect(war.weeks, war.campaign.seed).toBeLessThanOrEqual(17);
    for (const war of wars) {
      expect(killed(war, "aggressor"), war.campaign.seed).toBeGreaterThanOrEqual(5);
      expect(killed(war, "aggressor"), war.campaign.seed).toBeLessThanOrEqual(300);
    }
  });
});

describe("wars between large armies stay indecisive", () => {
  // No source sets these outcomes; they are the design's acceptance: a peer
  // war grinds rather than collapses, and an expeditionary corps does not
  // decide a war against an army ten times its size.
  it("never seats a successor in a year of Russia against Ukraine or India against Pakistan", () => {
    for (const campaign of founded) {
      for (const [aggressor, defender] of [["RUS", "UKR"], ["IND", "PAK"]] as const) {
        const war = fight(campaign, aggressor as NationId, defender as NationId, 52);
        expect(seated(war, campaign, defender as NationId) || seated(war, campaign, aggressor as NationId), `${campaign.seed} ${aggressor}-${defender}`).toBe(false);
      }
    }
  });

  it("never decides a US invasion of Iran with the largest package in half a year", () => {
    const IRN = "IRN" as NationId;
    for (const campaign of founded) {
      const war = fight(brigades(campaign, IRN, 12), USA, IRN, 26);
      expect(seated(war, campaign, IRN), campaign.seed).toBe(false);
    }
  });
});
