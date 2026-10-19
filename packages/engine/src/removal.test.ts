import { describe, it, expect } from "vitest";
import { genericCharters, type NationId } from "@admin/world";
import { buildCampaign } from "./__fixtures__/campaign.js";
import { apply } from "./effects.js";
import { advanceTurn } from "./turn-loop.js";
import {
  advanceRemovalArc,
  BEAT_THRESHOLDS,
  computeRemovalPressure,
  PRESSURE_WEIGHTS,
  pressureCompositionTotal,
  removalPhase,
  removalSeverity,
  removalVoteLine,
  selectPressureComposition,
  selectRemovalVotes,
  CAUCUS_BREAK_CEILING,
} from "./removal.js";
import { projectVote } from "./elections.js";
import { caucusBreakShare } from "./electorate.js";
import { CAUCUS_BREAK_VISIBLE } from "./removal-votes.js";
import { majorityOf, supermajorityOf } from "./congress.js";
import type { Campaign } from "./state.js";

const junta = genericCharters.find((c) => c.id === "charter-military-junta")!;
const democracy = genericCharters.find((c) => c.id === "charter-electoral-democracy")!;
const presidential = genericCharters.find((c) => c.id === "charter-presidential-republic")!;

// Collapses the country's judgment of the government along with the state
// metrics, and pulls the player's alignment further from what the junta's
// institutions expect each turn — sustaining the unpopularity, floors and
// alignment components of removal pressure across several turns rather than a
// single instantaneous drop.
//
// The opinion effect is what carries the headline: unpopularity is `1 -
// approval` at 36% of pressure, and approval is settled from the public, so a
// collapse written on the state metrics alone reaches it only at the drift
// speed the public actually changes its mind at. A scandal that breaks
// confidence is a fact about what the country thinks, and that is where it has
// to be written.
function collapseApproval(state: Campaign, turn: number): Campaign {
  return apply(state, {
    source: "action",
    actor: "player",
    turn,
    narration: { summary: "A scandal breaks and confidence collapses" },
    effects: [
      { kind: "metric", deltas: { stability: -1, standing: -1, militaryReadiness: -1, treasury: -state.player.metrics.treasury } },
      { kind: "opinion", deltas: { security: -1, prosperity: -1, services: -1, integrity: -1, unity: -1, competence: -1 } },
      { kind: "alignment", pull: { authLibertarian: -0.2 } },
    ],
  });
}

function recoverApproval(state: Campaign, turn: number): Campaign {
  return apply(state, {
    source: "action",
    actor: "player",
    turn,
    narration: { summary: "A popular reform program restores confidence" },
    effects: [
      { kind: "metric", deltas: { stability: 1, standing: 1, militaryReadiness: 1 } },
      { kind: "opinion", deltas: { security: 1, prosperity: 1, services: 1, integrity: 1, unity: 1, competence: 1 } },
      { kind: "alignment", pull: { authLibertarian: 0.5 } },
    ],
  });
}

describe("computeRemovalPressure", () => {
  it("derives from state, not turn count: identical turn, different metrics, different pressure", () => {
    const healthy = buildCampaign();
    const collapsing = collapseApproval(buildCampaign(), healthy.turn);
    expect(collapsing.turn).toBe(healthy.turn);
    expect(computeRemovalPressure(collapsing, junta)).toBeGreaterThan(computeRemovalPressure(healthy, junta));
  });

  it("advancing turns alone, with no metric change, does not raise pressure", () => {
    let state = buildCampaign();
    const initialPressure = computeRemovalPressure(state, junta);
    for (let i = 0; i < 10; i++) state = advanceTurn(state);
    expect(computeRemovalPressure(state, junta)).toBeCloseTo(initialPressure);
  });

  it("responds to which charter's institutions are asking, given the same alignment", () => {
    const state = buildCampaign();
    // Same state, two different charters with opposite expected alignments —
    // pressure differs because the institutions reading it differ.
    const juntaPressure = computeRemovalPressure(state, junta);
    const democracyPressure = computeRemovalPressure(state, democracy);
    expect(juntaPressure).not.toBeCloseTo(democracyPressure);
  });
});

describe("selectPressureComposition", () => {
  it("lists exactly the terms PRESSURE_WEIGHTS declares, in its order", () => {
    const state = buildCampaign();
    const composition = selectPressureComposition(state, junta);
    expect(composition.components.map((c) => c.term)).toEqual(Object.keys(PRESSURE_WEIGHTS));
  });

  it("each component's contribution is its reading times its weight, and the terms plus fragility match the pressure figure before any open beat", () => {
    const state = buildCampaign();
    const composition = selectPressureComposition(state, junta);
    for (const component of composition.components) {
      expect(component.contribution).toBeCloseTo(component.reading * component.weight, 10);
    }
    const conditions = composition.components.reduce((sum, c) => sum + c.contribution, 0);
    // No beat is open on a fresh campaign, so the standing-beat addend is zero
    // and the terms plus the fragility line should equal the reported pressure.
    // Fragility multiplies rather than adds, so it cannot be one of the
    // weighted shares; it is reported as its own accounted line precisely so
    // this sum still closes. An amplification the composition could not account
    // for would be the hidden difficulty multiplier the design forbids.
    expect(composition.standingBeatContribution).toBe(0);
    expect(conditions + composition.fragilityContribution).toBeCloseTo(
      computeRemovalPressure(state, junta),
      10,
    );
    expect(composition.fragility.amplification).toBeGreaterThanOrEqual(1);
  });

  it("reports a nonzero standing-beat contribution once a beat has stood without being answered, and it accounts for the rest of the gap to the reported pressure", () => {
    let collapsed = buildCampaign();
    for (let turn = 1; turn <= 6; turn++) {
      collapsed = collapseApproval(collapsed, turn);
      collapsed = advanceTurn(collapsed);
    }
    const leftStanding = apply(collapsed, {
      source: "simulate",
      actor: "world",
      turn: collapsed.turn,
      narration: { summary: "A motion is filed" },
      effects: [
        {
          kind: "removal",
          arc: { ...collapsed.removal, beats: [{ turn: collapsed.turn - 12, description: "A motion is filed" }], resolved: false },
        },
      ],
    });

    const composition = selectPressureComposition(leftStanding, junta);
    const conditions = composition.components.reduce((sum, c) => sum + c.contribution, 0);
    expect(composition.standingBeatContribution).toBeGreaterThan(0);
    // Bounded on the way in, because the reported pressure is: a campaign this
    // far gone sits at the ceiling, and the property under test is that the
    // parts account for the figure rather than that the figure is under one.
    expect(
      Math.min(1, conditions + composition.fragilityContribution + composition.standingBeatContribution),
    ).toBeCloseTo(computeRemovalPressure(leftStanding, junta), 10);
  });
});

describe("pressureCompositionTotal", () => {
  it("always equals what the composition's own rows add to, for any state it is read against", () => {
    const state = buildCampaign();
    const composition = selectPressureComposition(state, junta);
    const byHand =
      composition.components.reduce((sum, c) => sum + c.contribution, 0) +
      composition.fragilityContribution +
      composition.standingBeatContribution;
    expect(pressureCompositionTotal(composition)).toBeCloseTo(Math.max(0, Math.min(1, byHand)), 10);
  });

  // A screen drew its breakdown's total from `RemovalArc.pressure` — the
  // figure the last weekly tick's removal phase computed and left standing —
  // while the breakdown's rows came from `selectPressureComposition` read on
  // the *live* campaign. A mid-week act (here, the same confidence collapse
  // `computeRemovalPressure`'s own tests use) moves a reading the live
  // composition sees at once and the stored arc figure does not see until the
  // next tick, so the two can disagree. `pressureCompositionTotal` is read off
  // the same live composition the rows are, so it never can.
  it("tracks a mid-week act the stored arc pressure has not caught up to yet", () => {
    let state = buildCampaign();
    state = advanceTurn(state, { simulate: removalPhase(junta), select: () => [] });
    const staleArcPressure = state.removal.pressure;

    const midWeek = collapseApproval(state, state.turn);
    expect(midWeek.removal.pressure).toBe(staleArcPressure); // no tick ran; the arc did not move

    const composition = selectPressureComposition(midWeek, junta);
    const liveTotal = pressureCompositionTotal(composition);

    // The bug this reproduces: a breakdown whose total is the stale arc
    // figure would not add up to its own rows once they diverge.
    expect(liveTotal).not.toBeCloseTo(staleArcPressure, 6);
    // The fix: the total this exposes to a screen always does.
    expect(liveTotal).toBeCloseTo(computeRemovalPressure(midWeek, junta), 10);
  });
});

describe("removal is reachable", () => {
  it("a sustained collapse in approval eventually resolves the arc with a legible ending", () => {
    let state = buildCampaign();
    for (let turn = 1; turn <= 15; turn++) {
      state = collapseApproval(state, turn);
      state = advanceTurn(state, { simulate: removalPhase(junta), select: () => [] });
    }
    expect(state.removal.resolved).toBe(true);
    expect(state.removal.beats.length).toBeGreaterThanOrEqual(3);
    expect(state.removal.endingSummary).toBeTruthy();
    expect(state.removal.endingSummary).toMatch(/removed/);
  });

  it("is a multi-beat arc, not a single threshold check — beats accumulate one at a time", () => {
    let state = buildCampaign();
    const beatCounts: number[] = [];
    for (let turn = 1; turn <= 15; turn++) {
      state = collapseApproval(state, turn);
      state = advanceTurn(state, { simulate: removalPhase(junta), select: () => [] });
      beatCounts.push(state.removal.beats.length);
    }
    // Beats never jump by more than one per turn, and more than one beat
    // exists before resolution — this is an arc, not a trapdoor.
    for (let i = 1; i < beatCounts.length; i++) {
      expect(beatCounts[i]! - beatCounts[i - 1]!).toBeLessThanOrEqual(1);
    }
    expect(new Set(beatCounts).size).toBeGreaterThan(1);
  });
});

describe("a breached floor is not free", () => {
  // The measured defect: a president could be insolvent for two years out of
  // four, hold their own country's stability on the floor and answer nobody
  // abroad, and the arc read all of that only through a approval composite the
  // opinion layer damps. Each of these pairs differs by one fact and by nothing
  // the other four terms can see — approval is identical on both sides.
  const withMetrics = (state: Campaign, deltas: Partial<Campaign["player"]["metrics"]>): Campaign => ({
    ...state,
    player: { ...state.player, metrics: { ...state.player.metrics, ...deltas } },
  });

  it("charges a government that cannot pay its bills, at identical approval", () => {
    // Exhausted rather than overdrawn. A government cannot go into deficit on
    // its own appropriation — an obligation in excess of it is void — so the
    // breach is a week at zero authority, which is a week in which every
    // obligation the administration reached for was refused.
    const state = buildCampaign();
    const solvent = withMetrics(state, { treasury: 1_000 });
    const exhausted = withMetrics(state, { treasury: 0 });
    expect(solvent.player.metrics.approval).toBe(exhausted.player.metrics.approval);
    expect(computeRemovalPressure(exhausted, junta)).toBeGreaterThan(computeRemovalPressure(solvent, junta));
  });

  it("charges a country on the floor and a government nobody abroad will take a call from", () => {
    const state = buildCampaign();
    const holding = withMetrics(state, { stability: 0.5, standing: 0.5 });
    const floored = withMetrics(state, { stability: 0, standing: 0 });
    expect(holding.player.metrics.approval).toBe(floored.player.metrics.approval);
    expect(computeRemovalPressure(floored, junta)).toBeGreaterThan(computeRemovalPressure(holding, junta));
  });

  it("keeps the weights shares of one pressure, so no term is added on top of the rest", () => {
    const total = Object.values(PRESSURE_WEIGHTS).reduce((sum, weight) => sum + weight, 0);
    expect(total).toBeCloseTo(1);
  });
});

describe("an open beat is a clock rather than furniture", () => {
  // The measured defect: a formal motion stood for 188 consecutive turns while
  // the arc neither advanced nor eased it. Both cases below hold every metric,
  // alignment and disposition fixed and vary only how long the filed motion has
  // been sitting there, which is the whole of what changed.
  const withOpenBeat = (state: Campaign, openedAt: number): Campaign =>
    apply(state, {
      source: "simulate",
      actor: "world",
      turn: state.turn,
      narration: { summary: "A motion is filed" },
      effects: [
        {
          kind: "removal",
          arc: { ...state.removal, beats: [{ turn: openedAt, description: "A motion is filed" }], resolved: false },
        },
      ],
    });

  it("gathers weight while the conditions that opened it still stand", () => {
    let collapsed = buildCampaign();
    for (let turn = 1; turn <= 6; turn++) {
      collapsed = collapseApproval(collapsed, turn);
      collapsed = advanceTurn(collapsed);
    }
    const justFiled = withOpenBeat(collapsed, collapsed.turn);
    const leftStanding = withOpenBeat(collapsed, collapsed.turn - 12);
    expect(computeRemovalPressure(leftStanding, junta)).toBeGreaterThan(computeRemovalPressure(justFiled, junta));
  });

  it("loses signatures once the administration has pulled the ground back out from under it", () => {
    const healthy = buildCampaign();
    const justFiled = withOpenBeat(healthy, healthy.turn);
    const leftStanding = withOpenBeat(healthy, healthy.turn - 12);
    expect(computeRemovalPressure(leftStanding, junta)).toBeLessThan(computeRemovalPressure(justFiled, junta));
  });

  it("eases the pressure without ever unwriting the beat from the record", () => {
    const healthy = buildCampaign();
    const leftStanding = withOpenBeat(healthy, healthy.turn - 12);
    const next = advanceRemovalArc(leftStanding, junta);
    expect(next.pressure).toBeLessThan(BEAT_THRESHOLDS[0]);
    expect(next.beats).toHaveLength(1);
    expect(next.resolved).toBe(false);
  });
});

describe("the two votes", () => {
  // The arithmetic, not the mood: a president is impeached when the House votes
  // the articles and removed when two thirds of the Senate convicts. Pressure
  // decides when the question is put; these decide the answer.
  const withDisposition = (state: Campaign, disposition: number): Campaign => ({
    ...state,
    congress: { ...state.congress, disposition },
  });

  const collapsedPast = (rung: number): Campaign => {
    let state = buildCampaign();
    for (let turn = 1; turn <= 8; turn++) {
      state = collapseApproval(state, turn);
      state = advanceTurn(state);
    }
    expect(computeRemovalPressure(state, presidential)).toBeGreaterThan(rung);
    return state;
  };

  it("counts a House majority and a Senate two-thirds, and nothing for a charter that removes another way", () => {
    const state = buildCampaign();
    const votes = selectRemovalVotes(state, presidential);
    expect(votes.map((v) => v.step)).toEqual(["articles", "conviction"]);
    expect(votes[0]!.vote.required).toBe(majorityOf(state.congress.chambers.house.seats));
    expect(votes[1]!.vote.required).toBe(supermajorityOf(state.congress.chambers.senate.seats));
    expect(selectRemovalVotes(state, junta)).toEqual([]);
  });

  it("holds the arc at the first beat in a House the President's party holds, however high the reading goes", () => {
    // Grave conduct, a room at zero, and a party whose voters have not left it:
    // the President's own members hold, and the opposition alone is short.
    let state: Campaign = {
      ...inHouse(failingGovernment(), "friendly"),
      removal: { ...buildCampaign().removal, beats: [{ turn: 1, description: "Talk of impeachment" }] },
    };
    for (let turn = 13; turn <= 30; turn++) {
      state = withDisposition(advanceTurn(state, { simulate: removalPhase(presidential), select: () => [] }), 0);
    }
    expect(state.removal.pressure).toBeGreaterThan(BEAT_THRESHOLDS[2]);
    expect(state.removal.beats).toHaveLength(1);
    expect(state.removal.resolved).toBe(false);
    // And the week says why, down to how many of the President's own it needs.
    expect(state.ledger.some((entry) => /votes needed to impeach; \d+ of your own \d+ would have to break\./.test(entry.description))).toBe(true);
  });

  it("removes a president whose chamber has turned and whose public has gone", () => {
    let state = withDisposition(collapsedPast(BEAT_THRESHOLDS[2]), 0);
    for (let turn = 9; turn <= 30; turn++) {
      state = collapseApproval(state, turn);
      state = withDisposition(advanceTurn(state, { simulate: removalPhase(presidential), select: () => [] }), 0);
    }
    expect(state.removal.beats.length).toBe(3);
    expect(state.removal.resolved).toBe(true);
  });

  it("prints a count rather than a verdict, so the margin can be whipped", () => {
    const votes = selectRemovalVotes(buildCampaign(), presidential);
    expect(removalVoteLine(votes[0]!)).toMatch(
      new RegExp(`^The House counts \\d+ of the ${votes[0]!.vote.required} votes needed to impeach(; \\d+ of your own \\d+ would have to break)?\\.$`),
    );
    expect(removalVoteLine(votes[1]!)).toMatch(/^The Senate counts \d+ of the \d+ votes needed to convict(; \d+ of your own \d+ would have to break)?\.$/);
  });
});

// A government failing at the job in ways the country can see from outside
// the building: the floors breached for a season, conduct pulled away from what
// the institutions expect, force used twice without a vote and a room at zero.
// What it leaves alone is the public's own judgment, so the President's own
// members have no reason to leave: the reading is grave and approval holds.
function failingGovernment(): Campaign {
  let state = buildCampaign();
  for (let turn = 1; turn <= 12; turn++) {
    state = apply(state, {
      source: "action",
      actor: "player",
      turn,
      narration: { summary: "The government runs out of money and order" },
      effects: [
        { kind: "metric", deltas: { stability: -1, standing: -1, treasury: -state.player.metrics.treasury } },
        { kind: "alignment", pull: { authLibertarian: 0.3 } },
      ],
    });
    state = advanceTurn(state);
  }
  const unauthorized = [1, 2].map((turn) => ({ id: `unauthorized:ALP:${turn}`, target: "ALP" as NationId, turn, rung: 5 as const, description: "Strikes" }));
  const failing = { ...state, congress: { ...state.congress, disposition: 0, unauthorized } };
  return { ...failing, removal: { ...failing.removal, pressure: computeRemovalPressure(failing, presidential) } };
}

type Seats = { readonly administration: number; readonly opposition: number; readonly independent: number };

function seated(state: Campaign, chamber: "house" | "senate", seats: Seats): Campaign {
  const total = seats.administration + seats.opposition + seats.independent;
  const chambers = { ...state.congress.chambers, [chamber]: { seats: total, ...seats } };
  return { ...state, congress: { ...state.congress, chambers } };
}

function inHouse(state: Campaign, mood: "friendly" | "hostile"): Campaign {
  const [ours, theirs] = mood === "friendly" ? [230, 205] : [205, 230];
  return seated(state, "house", { administration: ours, opposition: theirs, independent: 0 });
}

function anchored(state: Campaign, caucusAnchor: "democrat" | "republican"): Campaign {
  return { ...state, congress: { ...state.congress, administrationParty: caucusAnchor, caucusAnchor } };
}

describe("the removal votes are counted by caucus", () => {
  // The country has turned on the government and it has gone to war four times
  // without asking: its ticket is under a third of the vote.
  const collapsed = (): Campaign => {
    let state = buildCampaign();
    for (let turn = 1; turn <= 8; turn++) state = advanceTurn(collapseApproval(state, turn));
    const unauthorized = [1, 2, 3, 4].map((turn) => ({ id: `unauthorized:ALP:${turn}`, target: "ALP" as NationId, turn, rung: 5 as const, description: "Strikes" }));
    return { ...state, congress: { ...state.congress, disposition: 0, unauthorized } };
  };
  const at = (state: Campaign, pressure: number): Campaign => ({ ...state, removal: { ...state.removal, pressure } });
  const conviction = (state: Campaign) => selectRemovalVotes(state, presidential).find((vote) => vote.step === "conviction")!;
  const articles = (state: Campaign) => selectRemovalVotes(state, presidential).find((vote) => vote.step === "articles")!;

  it("impeaches in a hostile House and not in a friendly one, at the same pressure", () => {
    const failing = failingGovernment();
    expect(failing.removal.pressure).toBeGreaterThan(BEAT_THRESHOLDS[1]);
    expect(articles(inHouse(failing, "hostile")).vote.passed).toBe(true);
    expect(articles(inHouse(failing, "friendly")).vote.passed).toBe(false);

    // And the arc moves on exactly that difference: the same week, the same
    // reading, one beat further in the chamber the President does not hold.
    const opened = (state: Campaign): Campaign => ({
      ...state,
      removal: { ...state.removal, beats: [{ turn: state.turn, description: "Talk of impeachment" }] },
    });
    expect(advanceRemovalArc(opened(inHouse(failing, "hostile")), presidential).beats).toHaveLength(2);
    expect(advanceRemovalArc(opened(inHouse(failing, "friendly")), presidential).beats).toHaveLength(1);
  });

  it("never convicts a President whose party holds 34 or more Senate seats unless the charge is grave", () => {
    const collapsedButMinor = at(collapsed(), BEAT_THRESHOLDS[1]);
    expect(conviction(collapsedButMinor).caucusBreak).toMatchObject({ grave: false, collapsed: true, breaking: 0 });
    for (const anchor of ["democrat", "republican"] as const) {
      for (let ours = 34; ours <= 60; ours++) {
        for (const independent of [0, 2]) {
          const seats = { administration: ours, opposition: 100 - ours - independent, independent };
          const vote = conviction(seated(anchored(collapsedButMinor, anchor), "senate", seats));
          expect(vote.vote.byCaucus.administration.yeas, `${anchor} ${ours}+${independent}`).toBe(0);
          expect(vote.vote.passed, `${anchor} ${ours}+${independent}`).toBe(false);
        }
      }
    }
    // A grave charge against a President whose own side has given up, and the same Senate convicts.
    const broken = conviction(seated(at(collapsed(), 1), "senate", { administration: 34, opposition: 64, independent: 2 }));
    expect(broken.caucusBreak).toMatchObject({ grave: true, collapsed: true });
    expect(broken.vote.passed).toBe(true);
  });

  it("holds the caucus against a grave charge while the President's own identifiers still approve", () => {
    const holding = conviction(seated(at(failingGovernment(), 1), "senate", { administration: 45, opposition: 53, independent: 2 }));
    expect(holding.caucusBreak.grave).toBe(true);
    expect(holding.caucusBreak.approval).toBeGreaterThan(0.85);
    expect(holding.caucusBreak.breaking).toBeLessThan(CAUCUS_BREAK_VISIBLE);
    expect(holding.vote.passed).toBe(false);
  });

  it("breaks the President's caucus by how far their own identifiers have turned, never whole", () => {
    const broken = conviction(seated(at(collapsed(), 1), "senate", { administration: 60, opposition: 40, independent: 0 }));
    expect(broken.caucusBreak.breaking).toBeCloseTo(caucusBreakShare(broken.caucusBreak.approval), 12);
    expect(broken.caucusBreak.breaking).toBeLessThanOrEqual(CAUCUS_BREAK_CEILING);
    expect(broken.vote.byCaucus.administration.yeas).toBe(Math.round(60 * broken.caucusBreak.breaking));
    expect(broken.vote.byCaucus.administration.yeas).toBeLessThan(60);
  });

  // The projected vote charges the record, and one charge on it is the removal
  // arc's own beats. A break read off it would let a charge lower the number
  // that lets the charge carry. The break reads the President's own voters,
  // which no beat writes.
  it("reads the President's own identifiers, which the arc's own beats cannot lower", () => {
    const holding = at(failingGovernment(), 1);
    const beats = [1, 2, 3].map((turn) => ({ turn, description: "A beat of the arc" }));
    const charged: Campaign = { ...holding, removal: { ...holding.removal, beats } };
    expect(projectVote(charged).share).toBeLessThan(projectVote(holding).share);
    const seats = { administration: 45, opposition: 53, independent: 2 };
    expect(conviction(seated(charged, "senate", seats)).caucusBreak).toEqual(conviction(seated(holding, "senate", seats)).caucusBreak);
  });

  it("reproduces the Senate trials it is fitted to and the one it is not", () => {
    // February 2020: own identifiers about 91, one of 53 voted to convict.
    expect(caucusBreakShare(0.908) * 53).toBeGreaterThan(0.5);
    expect(caucusBreakShare(0.908) * 53).toBeLessThan(3);
    // February 2021: own identifiers 82, seven of 50.
    expect(caucusBreakShare(0.82) * 50).toBeGreaterThan(5);
    expect(caucusBreakShare(0.82) * 50).toBeLessThan(9);
    // February 1999, out of sample: own identifiers about 89, none of 45.
    expect(caucusBreakShare(0.894) * 45).toBeLessThan(3);
  });


  it("counts the independents with the caucus they sit with", () => {
    const seats = { administration: 45, opposition: 51, independent: 4 };
    const holding = at(failingGovernment(), 1);
    const withDemocrats = conviction(seated(anchored(holding, "democrat"), "senate", seats)).vote.byCaucus;
    const acrossTheAisle = conviction(seated(anchored(holding, "republican"), "senate", seats)).vote.byCaucus;
    // A Democrat-anchored presidency: they hold with the President's caucus.
    expect(withDemocrats.independent).toEqual({ seats: 4, yeas: 0 });
    // A Republican-anchored one: they vote with the opposition.
    expect(acrossTheAisle.independent.yeas / 4).toBeCloseTo(acrossTheAisle.opposition.yeas / 51, 1);
    expect(acrossTheAisle.independent.yeas).toBeGreaterThan(0);
  });

  it("tells the screen how many of the President's own would have to break", () => {
    const vote = conviction(seated(anchored(at(failingGovernment(), 1), "democrat"), "senate", { administration: 45, opposition: 53, independent: 2 }));
    const otherSide = vote.vote.byCaucus.opposition.yeas;
    // A grave charge against a President whose own side still approves costs a member or two, as in 2020.
    expect(vote.caucus).toEqual({ seats: 47, yeas: vote.vote.byCaucus.administration.yeas, mustBreak: vote.vote.required - otherSide });
    expect(vote.caucus.yeas).toBeLessThan(3);
    expect(vote.caucus.mustBreak).toBeGreaterThan(0);
    const tallied = vote.vote.byCaucus.administration.yeas + vote.vote.byCaucus.opposition.yeas + vote.vote.byCaucus.independent.yeas;
    expect(vote.vote.yeas).toBe(tallied);
  });
});

describe("removal is survivable", () => {
  it("recovering approval before the final beat stops the arc from resolving", () => {
    let state = buildCampaign();
    // Escalate partway, but stop short of the final beat...
    for (let turn = 1; turn <= 2; turn++) {
      state = collapseApproval(state, turn);
      state = advanceTurn(state, { simulate: removalPhase(junta), select: () => [] });
    }
    const beatsBeforeRecovery = state.removal.beats.length;
    expect(state.removal.resolved).toBe(false);
    expect(beatsBeforeRecovery).toBeGreaterThan(0);

    // ...then recover.
    for (let turn = 3; turn <= 20; turn++) {
      state = recoverApproval(state, turn);
      state = advanceTurn(state, { simulate: removalPhase(junta), select: () => [] });
    }

    expect(state.removal.resolved).toBe(false);
    expect(state.removal.beats.length).toBe(beatsBeforeRecovery); // no further beats were added
  });
});

describe("advanceRemovalArc", () => {
  it("is a no-op once the arc has resolved", () => {
    let state = buildCampaign();
    for (let turn = 1; turn <= 15; turn++) {
      state = collapseApproval(state, turn);
      state = advanceTurn(state, { simulate: removalPhase(junta), select: () => [] });
    }
    expect(state.removal.resolved).toBe(true);
    const arcAfterResolution = advanceRemovalArc(state, junta);
    expect(arcAfterResolution).toBe(state.removal);
  });

  it("every beat is attributable to a packet with narration", () => {
    let state = buildCampaign();
    for (let turn = 1; turn <= 5; turn++) {
      state = collapseApproval(state, turn);
      state = advanceTurn(state, { simulate: removalPhase(junta), select: () => [] });
    }
    if (state.removal.beats.length > 0) {
      const latestBeatDescription = state.removal.beats.at(-1)!.description;
      expect(state.ledger.some((entry) => entry.description === latestBeatDescription)).toBe(true);
    }
  });
});

describe("removalSeverity", () => {
  // The Situation Room colors this reading. A screen picking its own threshold,
  // say a 0.45 matching no beat threshold in removal.ts, stays calm through the
  // first beat and alarms inside it. Severity is the arc's own beat count, and
  // these are the boundaries that count.
  const arc = (pressure: number, beats: number, resolved = false) => ({
    mechanism: "no-confidence" as const,
    pressure,
    pressureHistory: [],
    beats: Array.from({ length: beats }, (_, i) => ({ turn: i + 1, description: "" })),
    resolved,
  });

  it("is calm only while the arc has opened no beat", () => {
    expect(removalSeverity(arc(0, 0))).toBe("neutral");
    expect(removalSeverity(arc(BEAT_THRESHOLDS[0] - 0.01, 0))).toBe("neutral");
  });

  it("turns cautionary the moment the first beat is reachable, not at some later figure", () => {
    expect(removalSeverity(arc(BEAT_THRESHOLDS[0], 1))).toBe("caution");
    expect(removalSeverity(arc(BEAT_THRESHOLDS[1] - 0.01, 1))).toBe("caution");
  });

  it("reads adverse from the second beat on", () => {
    expect(removalSeverity(arc(BEAT_THRESHOLDS[1], 2))).toBe("adverse");
    expect(removalSeverity(arc(0.9, 3))).toBe("adverse");
  });

  it("reads adverse once the arc has resolved, whatever the pressure has fallen back to", () => {
    expect(removalSeverity(arc(0.1, 3, true))).toBe("adverse");
  });

  it("never reports calm at a pressure the arc has already acted on", () => {
    // The specific regression: 0.45 sits above the first beat threshold, so
    // calling it neutral is wrong.
    expect(removalSeverity(arc(0.45, 1))).not.toBe("neutral");
  });
});

// The finding this closes: the cabinet phase could produce a Secretary publicly
// counted as building a following inside the administration, and the arc that
// decides whether a president survives could not see them. A president
// governing with half their own cabinet in open revolt read exactly as safe as
// one governing with none.
describe("a bloc inside the President's own government", () => {
  function withFaction(campaign: Campaign, formedTurn: number): Campaign {
    const [person] = Object.keys(campaign.people);
    const role = Object.keys(campaign.player.cabinet).find(
      (seat) => campaign.player.cabinet[seat as never] === person,
    );
    if (!person || !role) throw new Error("the fixture should seat somebody");
    const id = `${role}-rival`;
    return {
      ...campaign,
      people: { ...campaign.people, [person]: { ...campaign.people[person as never]!, affiliation: id as never } },
      player: {
        ...campaign.player,
        flags: { ...campaign.player.flags, [`faction:${id}`]: true, [`flagset:faction:${id}:${formedTurn}`]: true },
      },
    };
  }

  it("weighs as its own term rather than as nothing", () => {
    const clean = buildCampaign();
    const revolt = withFaction(clean, 0);
    expect(computeRemovalPressure(revolt, presidential)).toBeGreaterThan(computeRemovalPressure(clean, presidential));
  });

  it("costs more the longer it stands, which is what the arc's other terms cannot do", () => {
    const base = { ...buildCampaign(), turn: 30 };
    const fresh = withFaction(base, 29);
    const entrenched = withFaction(base, 0);
    expect(computeRemovalPressure(entrenched, presidential)).toBeGreaterThan(
      computeRemovalPressure(fresh, presidential),
    );
  });

  it("shows its work on the composition, so no screen prints a figure it cannot account for", () => {
    const composition = selectPressureComposition(withFaction(buildCampaign(), 0), presidential);
    const faction = composition.components.find((component) => component.term === "faction");
    expect(faction).toBeDefined();
    expect(faction!.weight).toBe(PRESSURE_WEIGHTS.faction);
    expect(faction!.reading).toBeGreaterThan(0);
  });

  it("reads zero for a president whose government is their own", () => {
    const composition = selectPressureComposition(buildCampaign(), presidential);
    expect(composition.components.find((component) => component.term === "faction")!.reading).toBe(0);
  });
});
