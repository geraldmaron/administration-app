import { COHORT_IDS } from "@admin/world";
import { describe, expect, it } from "vitest";
import { atCampaignTurn, buildCampaign } from "./__fixtures__/campaign.js";
import { foundedForBalance } from "./balance-harness.js";
import { displayRollup } from "./electorate.js";
import { selectElectorate } from "./opinion.js";
import { cohortSupport } from "./demos.js";
import { archiveMonth } from "./economy-archive.js";
import { applyMoodDeltas } from "./opinion.js";
import { OPINION_HISTORY_WINDOW, opinionCourse, opinionSample } from "./opinion-record.js";
import { createSave, loadSave } from "./save.js";
import type { Campaign } from "./state.js";
import { advanceTurn } from "./turn-loop.js";
import { campaignTurnPhases } from "./turn-phases.js";

function played(from: Campaign, weeks: number): Campaign {
  let campaign = from;
  for (let i = 0; i < weeks; i += 1) campaign = advanceTurn(campaign);
  return campaign;
}

const roundTrip = (campaign: Campaign): Campaign => loadSave(JSON.parse(JSON.stringify(createSave(campaign))));

describe("what a week's opinion sample observes", () => {
  it("reads the six judgments, every cohort cell and the three shown blocs off the campaign", () => {
    const campaign = buildCampaign();
    const sample = opinionSample(campaign, 7);
    expect(sample.turn).toBe(7);
    const thousandth = (value: number) => Math.round(value * 1000) / 1000;
    expect(sample.judgments.prosperity).toBe(thousandth(campaign.player.opinion.prosperity));
    expect(sample.polarization).toBe(thousandth(campaign.player.opinion.polarization));
    expect(Object.keys(sample.cohorts)).toEqual([...COHORT_IDS]);
    for (const cohort of COHORT_IDS) expect(sample.cohorts[cohort]).toBe(cohortSupport(campaign, cohort));
    const reading = selectElectorate(campaign);
    const rollup = displayRollup(reading.shares, reading.approvals);
    expect(sample.blocs.own).toBe(Math.round(rollup.own.value * 1000) / 1000);
    expect(sample.blocs.opposition!).toBeLessThan(sample.blocs.own!);
  });

  it("files one sample at each close, stamped with the turn the week opens", () => {
    const campaign = played(buildCampaign(), 3);
    expect(campaign.opinionRecord!.since).toBe(1);
    expect(campaign.opinionRecord!.weekly.map((sample) => sample.turn)).toEqual([2, 3, 4]);
  });

  it("keeps what a week was after the public has moved on, rather than re-reading it", () => {
    const first = played(buildCampaign(), 1);
    const kept = first.opinionRecord!.weekly[0]!;
    const shaken = { ...first, player: { ...first.player, opinion: applyMoodDeltas(first.player.opinion, { prosperity: -0.2 }) } };
    const next = advanceTurn(shaken);
    expect(next.opinionRecord!.weekly[0]).toEqual(kept);
    expect(next.opinionRecord!.weekly[1]!.judgments.prosperity).toBeLessThan(kept.judgments.prosperity);
  });
});

describe("a presidency longer than the weekly ring", () => {
  const long = played(buildCampaign(), OPINION_HISTORY_WINDOW + 40);

  it("keeps two years weekly and the months before them, one sample a month", () => {
    const record = long.opinionRecord!;
    expect(record.weekly).toHaveLength(OPINION_HISTORY_WINDOW);
    expect(record.weekly[0]!.turn).toBe(long.turn - OPINION_HISTORY_WINDOW + 1);
    const months = record.monthly.map((sample) => archiveMonth(sample.turn));
    expect(new Set(months).size).toBe(months.length);
    expect(record.monthly.at(-1)!.turn).toBeLessThan(record.weekly[0]!.turn);
    const turns = opinionCourse(long).map((sample) => sample.turn);
    expect(turns).toEqual([...turns].sort((a, b) => a - b));
  });

  it("round-trips through a save without gaining or losing a week", () => {
    const loaded = roundTrip(long);
    expect(loaded.opinionRecord).toEqual(long.opinionRecord);
    expect(opinionCourse(loaded)).toHaveLength(opinionCourse(long).length);
  });
});

describe("a save written before the record", () => {
  function older(campaign: Campaign): unknown {
    const { opinionRecord: _record, ...rest } = campaign;
    return JSON.parse(JSON.stringify({ schemaVersion: 58, campaign: rest }));
  }

  it("opens with no record and invents none of the weeks it never kept", () => {
    const opened = loadSave(older(atCampaignTurn(buildCampaign(), 30)));
    expect(opened.opinionRecord).toBeUndefined();
    expect(opinionCourse(opened)).toEqual([]);
  });

  it("starts the record at the load, and says so by the turn it opened on", () => {
    const opened = loadSave(older(atCampaignTurn(buildCampaign(), 30)));
    const next = advanceTurn(opened);
    expect(next.opinionRecord!.since).toBe(30);
    expect(next.opinionRecord!.weekly.map((sample) => sample.turn)).toEqual([31]);
  });
});

describe("keeping the records changes nothing else", () => {
  it("plays the same campaign with the records kept and with them thrown away each week", () => {
    const { campaign: founded, charter } = foundedForBalance("records-are-observation");
    const phases = campaignTurnPhases(charter);
    const strip = (campaign: Campaign): Campaign => {
      const { opinionRecord: _opinion, relationsRecord: _relations, ...rest } = campaign;
      return rest;
    };
    let kept = founded;
    let thrown = founded;
    for (let week = 0; week < 12; week += 1) {
      kept = advanceTurn(kept, phases);
      thrown = strip(advanceTurn(thrown, phases));
    }
    expect(kept.opinionRecord!.weekly).toHaveLength(12);
    expect(kept.relationsRecord!.weekly).toHaveLength(12);
    expect(strip(kept)).toEqual(thrown);
  });
});
