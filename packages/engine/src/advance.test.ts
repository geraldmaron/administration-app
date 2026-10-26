import { describe, expect, it } from "vitest";
import { advanceUntilAttention, DEFAULT_HORIZON_DAYS } from "./advance.js";
import { buildCampaign } from "./__fixtures__/campaign.js";
import { noopPhase, tickWeek, DAYS_PER_TURN } from "./turn-loop.js";
import { deferUntil, type AttentionMatter, type MatterSource } from "./attention.js";
import { apply } from "./effects.js";
import { CAMPAIGN_OPENING_DATE, addDays, daysBetween, federalElectionDay, turnOnDate, weekdayOf } from "./clock.js";
import { advanceClock, presidencyElections, selectEnding } from "./elections.js";
import { foundedForBalance } from "./balance-harness.js";
import { campaignTurnPhases } from "./turn-phases.js";
import type { Campaign, ElectionResult, GameDate } from "./state.js";

const phases = { simulate: noopPhase, select: noopPhase };

function matter(id: string, over: Partial<AttentionMatter> = {}): AttentionMatter {
  return {
    id,
    source: "scenario",
    urgency: "soft",
    title: id,
    reason: "because",
    subject: id,
    date: CAMPAIGN_OPENING_DATE,
    ...over,
  };
}

/** Quiet until the campaign has run `after` turns, then raises one matter. */
function quietUntilTurn(after: number): MatterSource<Campaign> {
  return (state) => (state.turn >= after ? [matter("wake")] : []);
}

describe("a quiet world stays quiet", () => {
  it("runs to the horizon and presents nothing when no source wants anything", () => {
    const result = advanceUntilAttention(buildCampaign(), { phases, matterSources: [] });
    expect(result.stopReason).toBe("horizon");
    expect(result.stop.presented).toEqual([]);
  });

  it("does not manufacture a matter to justify having stopped", () => {
    const result = advanceUntilAttention(buildCampaign(), { phases, matterSources: [() => []] });
    expect(result.stop.presented.length).toBe(0);
    expect(result.stop.deferred.length).toBe(0);
  });

  it("spends real calendar days rather than one turn at a time", () => {
    const result = advanceUntilAttention(buildCampaign(), { phases, horizonDays: 28 });
    expect(result.elapsedDays).toBe(28);
    expect(result.turnsRun).toBe(4);
  });

  it("defaults to a four-week horizon", () => {
    const result = advanceUntilAttention(buildCampaign(), { phases });
    expect(result.elapsedDays).toBe(DEFAULT_HORIZON_DAYS);
  });

  it("never runs past the horizon it was given", () => {
    for (const horizon of [1, 6, 7, 8, 13, 14, 30, 90]) {
      const result = advanceUntilAttention(buildCampaign(), { phases, horizonDays: horizon });
      expect(result.elapsedDays).toBe(horizon);
    }
  });

  it("can stop inside a week when the horizon is shorter than seven days", () => {
    const result = advanceUntilAttention(buildCampaign(), { phases, horizonDays: 3 });
    expect(result.elapsedDays).toBe(3);
    expect(result.turnsRun).toBe(0);
    expect(result.elapsedDays % DAYS_PER_TURN).not.toBe(0);
  });
});

describe("stopping for the President", () => {
  it("stops without spending a day when the desk already has something on it", () => {
    const result = advanceUntilAttention(buildCampaign(), {
      phases,
      matterSources: [() => [matter("bill", { urgency: "hard" })]],
    });
    expect(result.stopReason).toBe("attention");
    expect(result.elapsedDays).toBe(0);
    expect(result.turnsRun).toBe(0);
    expect(result.stop.presented.map((m) => m.id)).toEqual(["bill"]);
  });

  it("advances weeks and stops the moment the world raises something", () => {
    const start = buildCampaign();
    const result = advanceUntilAttention(start, {
      phases,
      matterSources: [quietUntilTurn(start.turn + 3)],
      horizonDays: 90,
    });
    expect(result.stopReason).toBe("attention");
    expect(result.turnsRun).toBe(3);
    expect(result.elapsedDays).toBe(21);
  });

  it("never presents more than three however loud the world is", () => {
    const result = advanceUntilAttention(buildCampaign(), {
      phases,
      matterSources: [() => Array.from({ length: 12 }, (_, i) => matter(`m${i}`))],
    });
    expect(result.stop.presented.length).toBeLessThanOrEqual(3);
    expect(result.stop.deferred.length).toBe(9);
  });

  it("does not stop for ambient movement alone", () => {
    const result = advanceUntilAttention(buildCampaign(), {
      phases,
      matterSources: [() => [matter("weather", { urgency: "ambient" })]],
      horizonDays: 14,
    });
    expect(result.stopReason).toBe("horizon");
    expect(result.elapsedDays).toBe(14);
    expect(result.stop.ambient.length).toBe(1);
  });
});

describe("determinism", () => {
  it("produces the identical world from the identical campaign and options", () => {
    const a = advanceUntilAttention(buildCampaign(), { phases, horizonDays: 56 });
    const b = advanceUntilAttention(buildCampaign(), { phases, horizonDays: 56 });
    expect(a.campaign).toEqual(b.campaign);
    expect(a.elapsedDays).toBe(b.elapsedDays);
    expect(a.stopReason).toBe(b.stopReason);
  });

  it("reads no wall clock: the same call twice never diverges", () => {
    const start = buildCampaign();
    const first = advanceUntilAttention(start, { phases, horizonDays: 28 });
    const second = advanceUntilAttention(start, { phases, horizonDays: 28 });
    expect(first.campaign.calendar).toEqual(second.campaign.calendar);
    expect(first.campaign.turn).toBe(second.campaign.turn);
  });
});

/** The whole phase list a real week runs, so the equivalence is measured on real work. */
const livePhases = campaignTurnPhases(foundedForBalance("election-week").charter);

/** The fixture moved to `date`, on the turn the day loop would be on there. */
function on(campaign: Campaign, date: GameDate): Campaign {
  return { ...campaign, calendar: date, turn: turnOnDate(campaign.foundingDate!, date) };
}

/** A record the country will not re-elect: the constitutional counts at their joint cap. */
function lawless(campaign: Campaign): Campaign {
  return {
    ...campaign,
    congress: {
      ...campaign.congress,
      unauthorized: Array.from({ length: 10 }, (_, i) => ({
        id: `unauthorized:ALP:${i}`,
        target: campaign.founding.nation,
        turn: i,
        rung: 5 as const,
        description: "a strike nobody voted for",
      })),
    },
    removal: { ...campaign.removal, beats: Array.from({ length: 6 }, (_, i) => ({ turn: i, description: "the House moves again" })) },
  };
}

function midtermHeld(campaign: Campaign): Campaign {
  const midterm: ElectionResult = {
    id: "election:midterm:94",
    kind: "midterm",
    turn: turnOnDate(campaign.foundingDate!, federalElectionDay(2030)),
    voteShare: 0.5,
    swing: { house: -8, senate: -2 },
    summary: "The midterms, already held.",
  };
  return { ...campaign, termClock: advanceClock(campaign.termClock, midterm) };
}

describe("the end of a presidency", () => {
  it("stops dead rather than simulating a government that no longer holds office", () => {
    const removed: Campaign = {
      ...buildCampaign(),
      removal: { ...buildCampaign().removal, resolved: true },
    } as Campaign;
    const result = advanceUntilAttention(removed, { phases, horizonDays: 90 });
    expect(result.stopReason).toBe("ended");
    expect(result.turnsRun).toBe(0);
    expect(result.elapsedDays).toBe(0);
  });

  it("stops on election night when the country votes the President out, and runs no day after it", () => {
    const eve = on(lawless(midtermHeld(buildCampaign())), { year: 2032, month: 10, day: 20 });
    const result = advanceUntilAttention(eve, { phases, horizonDays: DEFAULT_HORIZON_DAYS });
    expect(selectEnding(result.campaign)).toBe("defeated");
    expect(result.stopReason).toBe("ended");
    expect(result.campaign.calendar).toEqual({ year: 2032, month: 11, day: 2 });
    expect(result.elapsedDays).toBeLessThan(DEFAULT_HORIZON_DAYS);
    // Nothing ticked on election night or after it: the turn is still the one
    // the week opened with.
    expect(result.campaign.turn).toBe(turnOnDate(eve.foundingDate!, { year: 2032, month: 11, day: 2 }));
    expect(advanceUntilAttention(result.campaign, { phases, horizonDays: 90 })).toMatchObject({ stopReason: "ended", elapsedDays: 0 });
  });

  it("stops when a second term runs out, on the day the country elects a successor", () => {
    const founded = buildCampaign();
    const lastEve = on(founded, { year: 2036, month: 10, day: 20 });
    const served: Campaign = {
      ...lastEve,
      termClock: { term: 2, termStartTurn: turnOnDate(founded.foundingDate!, { year: 2033, month: 1, day: 20 }), elections: midtermHeld(founded).termClock.elections.concat([
        { id: "election:presidential:198", kind: "presidential", turn: 198, voteShare: 0.56, won: true, summary: "Re-elected." },
        { id: "election:midterm:303", kind: "midterm", turn: 303, voteShare: 0.5, swing: { house: -5, senate: -1 }, summary: "The second midterms." },
      ]) },
    };
    const result = advanceUntilAttention(served, { phases, horizonDays: DEFAULT_HORIZON_DAYS });
    expect(selectEnding(result.campaign)).toBe("term-limited");
    expect(result.stopReason).toBe("ended");
    expect(result.campaign.calendar).toEqual({ year: 2036, month: 11, day: 4 });
  });

  // The harness's week, and why it has to be driven rather than called once.
  //
  // The loop halts on every federal Election Day, and an Election Day is a
  // Tuesday: one seven-day call across that week comes back after three days, and
  // a gate measuring per week would then compare a half week against every later
  // full one from November 2030 to the end of the campaign. Resuming from each
  // stop until seven days have elapsed has to land on exactly the campaign seven
  // one-day calls land on, or the harness is measuring its own resumption.
  it("lands a resumed election week on the same campaign seven one-day steps land on", () => {
    const day = federalElectionDay(2030);
    const monday = addDays(day, -1);
    const start = on(foundedForBalance("election-week").campaign, monday);

    let resumed = start;
    let elapsed = 0;
    while (elapsed < 7) {
      const run = advanceUntilAttention(resumed, { phases: livePhases, horizonDays: 7 - elapsed });
      resumed = run.campaign;
      if (run.elapsedDays === 0 || run.stopReason === "ended") break;
      elapsed += run.elapsedDays;
    }

    let daily = start;
    for (let step = 0; step < 7; step += 1) {
      daily = advanceUntilAttention(daily, { phases: livePhases, horizonDays: 1 }).campaign;
    }

    expect(resumed.calendar).toEqual(addDays(monday, 7));
    expect(JSON.stringify(resumed)).toBe(JSON.stringify(daily));
  });

  it("stops on a federal Election Day while the President is still in office", () => {
    const day = federalElectionDay(2030);
    const eve = on(buildCampaign(), addDays(day, -1));
    const result = advanceUntilAttention(eve, { phases, horizonDays: 3 });
    expect(result.stopReason).toBe("election");
    expect(result.campaign.calendar).toEqual(day);
    expect(selectEnding(result.campaign)).toBe("in-office");
  });
});

describe("the calendar the elections are held on, whatever day the week turns over", () => {
  /** The dates the Record files each election under, in order: the day its packet was applied. */
  function filedOn(campaign: Campaign, results: readonly ElectionResult[]): readonly (GameDate | undefined)[] {
    let from = 0;
    return results.map((result) => {
      const at = campaign.ledger.findIndex((entry, index) => index >= from && entry.description === result.summary);
      from = at + 1;
      return at < 0 ? undefined : campaign.ledger[at]!.causal?.createdDate;
    });
  }

  // The oath is always a Saturday, January 20, 2029, so the weekly tick always
  // lands on a Saturday and Election Day is always a Tuesday. Moving the oath
  // through all seven weekdays is what proves the result is filed on the
  // calendar's day and not on whichever day the tick happens to fall.
  /**
   * A record the country re-elects, so the calendar can be measured over both
   * terms. The vote reads how much of a term reached the statute book, so a
   * campaign that signs nothing loses its contest — which is the right answer to
   * a do-nothing presidency and the wrong fixture for a test about dates.
   */
  function withARecord(campaign: Campaign): Campaign {
    const bills = Object.fromEntries(
      Array.from({ length: 6 }, (_, index) => [
        `bill:act-calendar-${index}:1`,
        {
          id: `bill:act-calendar-${index}:1`,
          act: "act-debt-limit-increase",
          title: `Calendar Act ${index}`,
          sponsor: "administration" as const,
          introducedTurn: 1,
          status: "law" as const,
          passage: [],
        },
      ]),
    ) as Campaign["bills"];
    return { ...campaign, bills };
  }

  it.each([0, 1, 2, 3, 4, 5, 6])("files both terms' elections on Election Day for an oath %i days after January 20, 2029", (offset) => {
    const oath = addDays(CAMPAIGN_OPENING_DATE, offset);
    const founded: Campaign = { ...withARecord(buildCampaign()), calendar: oath, foundingDate: oath };
    const closing = { year: 2037, month: 1, day: 20 };
    let result = advanceUntilAttention(founded, { phases, horizonDays: daysBetween(oath, closing) });
    for (let stop = 0; result.stopReason === "election" && stop < 8; stop += 1) {
      const left = daysBetween(result.campaign.calendar, closing);
      result = advanceUntilAttention(result.campaign, { phases, horizonDays: Math.max(1, left) });
    }
    expect(result.stopReason).toBe("ended");
    expect(selectEnding(result.campaign)).toBe("term-limited");

    const clock = result.campaign.termClock;
    const schedule = presidencyElections(oath);
    expect(clock.elections.map((election) => `${election.kind}-election`)).toEqual(schedule.map((milestone) => milestone.kind));
    const filed = filedOn(result.campaign, clock.elections);
    clock.elections.forEach((election, index) => {
      const due = schedule[index]!.date;
      expect(weekdayOf(due)).toBe(2);
      expect(filed[index], `${election.kind} ${index}`).toEqual(due);
      expect(election.turn).toBe(turnOnDate(oath, due));
      expect(result.campaign.feed.filter((item) => item.headline === election.summary).map((item) => item.turn)).toContain(election.turn);
    });
    expect(clock.term).toBe(2);
    expect(clock.termStartTurn).toBe(turnOnDate(oath, { year: 2033, month: 1, day: 20 }));
    expect(result.campaign.calendar).toEqual(schedule.at(-1)!.date);
  });
});

describe("what the player was told, and when", () => {
  it("files a story under the turn of the packet that carried it, whatever its producer wrote", () => {
    const campaign = buildCampaign();
    const after = apply(campaign, {
      source: "simulate",
      actor: "world",
      turn: 7,
      narration: { summary: "A week that happened." },
      effects: [{ kind: "feed", items: [{ turn: 3, kind: "press", visibility: "public", headline: "Filed a week early." }] }],
    });
    expect(after.feed.at(-1)!.turn).toBe(7);
    expect(after.ledger.at(-1)!.turn).toBe(7);
  });

  it("dates a story the day it was filed, whatever its producer wrote", () => {
    const campaign = buildCampaign();
    const after = apply(campaign, {
      source: "simulate",
      actor: "world",
      turn: 7,
      narration: { summary: "A week that happened." },
      effects: [{ kind: "feed", items: [{ turn: 3, kind: "press", visibility: "public", headline: "Dated wrong.", date: { year: 1999, month: 1, day: 1 } }] }],
    });
    expect(after.feed.at(-1)!.date).toEqual(campaign.calendar);
  });

  // Election Day is a Tuesday and the week turns on a Saturday, so the one-day
  // step onto it files the result under the turn the step started in.
  it("hands back every story filed during a call, including one filed under the turn it started in", () => {
    const eve = on(lawless(midtermHeld(buildCampaign())), { year: 2032, month: 11, day: 1 });
    const result = advanceUntilAttention(eve, { phases, horizonDays: 1 });
    const filed = result.campaign.feed.slice(eve.feed.length);
    expect(filed.some((item) => item.turn === eve.turn)).toBe(true);
    expect(result.ambientEvents).toEqual(filed);
  });

  it("dates every story a real week files on the turn its ledger entry carries", () => {
    const { campaign: founded, charter } = foundedForBalance("feed-turn-single-writer");
    const weekly = campaignTurnPhases(charter);
    let working = founded;
    for (let week = 0; week < 12; week++) {
      const feedBefore = working.feed.length;
      const ledgerBefore = working.ledger.length;
      working = tickWeek(working, weekly);
      const turns = new Set(working.ledger.slice(ledgerBefore).map((entry) => entry.turn));
      for (const item of working.feed.slice(feedBefore)) {
        expect(turns.has(item.turn), `"${item.headline}" filed on turn ${item.turn}`).toBe(true);
        expect(item.turn).toBe(working.turn);
      }
    }
  });
});

describe("a matter the President put off", () => {
  /** Always raises the same matter, so only a deferral can stop it re-presenting. */
  const persistent: MatterSource<Campaign> = () => [matter("the-bill")];

  it("is not presented again before its date, so Continue can actually move time", () => {
    const start = buildCampaign();
    const first = advanceUntilAttention(start, { phases, matterSources: [persistent] });
    expect(first.stopReason).toBe("attention");
    expect(first.elapsedDays).toBe(0);

    // Without a deferral this is the trap: the pre-tick look re-presents the
    // same matter forever and the world never advances a single day.
    const stuck = advanceUntilAttention(first.campaign, { phases, matterSources: [persistent] });
    expect(stuck.elapsedDays).toBe(0);

    const shown = first.stop.presented[0]!;
    const deferred = apply(first.campaign, {
      source: "action",
      actor: "player",
      turn: first.campaign.turn,
      narration: { summary: "Put off until it can be answered properly." },
      effects: [{ kind: "attention", defer: { [shown.id]: deferUntil(shown, first.campaign.calendar) } }],
    });

    const moved = advanceUntilAttention(deferred, { phases, matterSources: [persistent] });
    expect(moved.elapsedDays).toBeGreaterThan(0);
  });

  it("comes back once its date arrives rather than being lost", () => {
    const start = buildCampaign();
    const shown = matter("the-bill");
    const deferred = apply(start, {
      source: "action",
      actor: "player",
      turn: start.turn,
      narration: { summary: "Not this week." },
      effects: [{ kind: "attention", defer: { [shown.id]: deferUntil(shown, start.calendar) } }],
    });
    // A soft matter is put off a fortnight; a horizon long enough to outlive it
    // has to hand it back, or deferring would be deleting.
    const result = advanceUntilAttention(deferred, { phases, matterSources: [persistent], horizonDays: 56 });
    expect(result.stopReason).toBe("attention");
    expect(result.stop.presented.map((m) => m.id)).toContain("the-bill");
  });

  it("cannot be put off past its own deadline", () => {
    const due = { year: 2029, month: 1, day: 22 };
    const hard = matter("the-deadline", { urgency: "hard" as const, dueDate: due });
    const on = CAMPAIGN_OPENING_DATE;
    // DEFER_DAYS.hard is seven; the deadline is two days out, so the deadline wins.
    expect(deferUntil(hard, on)).toEqual(due);
  });

  it("lets the week run past a deadline that has already arrived, and raises it again after", () => {
    const start = buildCampaign();
    const today = start.calendar;
    const lapsing: MatterSource<Campaign> = () => [matter("the-lapse", { urgency: "hard" as const, dueDate: today })];
    const stuck = advanceUntilAttention(start, { phases, matterSources: [lapsing] });
    expect(stuck.elapsedDays).toBe(0);

    const shown = stuck.stop.presented[0]!;
    // Held to its own date the deferral would end today, which is no deferral:
    // the world would stop before its first day on every press.
    expect(deferUntil(shown, today)).not.toEqual(today);
    const deferred = apply(start, {
      source: "action",
      actor: "player",
      turn: start.turn,
      narration: { summary: "Let it lapse." },
      effects: [{ kind: "attention", defer: { [shown.id]: deferUntil(shown, today) } }],
    });
    const moved = advanceUntilAttention(deferred, { phases, matterSources: [lapsing] });
    expect(moved.elapsedDays).toBeGreaterThan(0);
    expect(moved.stop.presented.map((m) => m.id)).toContain("the-lapse");
  });

  it("stops carrying a deferral once the world has run past it", () => {
    const start = buildCampaign();
    const shown = matter("the-bill");
    const deferred = apply(start, {
      source: "action",
      actor: "player",
      turn: start.turn,
      narration: { summary: "Not this week." },
      effects: [{ kind: "attention", defer: { [shown.id]: deferUntil(shown, start.calendar) } }],
    });
    expect(Object.keys(deferred.deferrals)).toEqual(["the-bill"]);
    const result = advanceUntilAttention(deferred, { phases, matterSources: [], horizonDays: 56 });
    expect(result.campaign.deferrals).toEqual({});
  });
});

describe("a matter stops the world once per signature", () => {
  const signed = (signature: string): MatterSource<Campaign> => () => [matter("standing", { signature })];

  it("does not stop again for a matter whose signature has not changed", () => {
    const sources = [signed("rung:0.45")];
    const first = advanceUntilAttention(buildCampaign(), { phases, matterSources: sources });
    expect(first.stopReason).toBe("attention");
    expect(first.campaign.noticed).toEqual({ standing: "rung:0.45" });
    const second = advanceUntilAttention(first.campaign, { phases, matterSources: sources });
    expect(second.stopReason).toBe("horizon");
    expect(second.elapsedDays).toBe(DEFAULT_HORIZON_DAYS);
  });

  it("notes a notice through apply without a ledger entry, and an unchanged look writes nothing", () => {
    const before = buildCampaign();
    const first = advanceUntilAttention(before, { phases, matterSources: [signed("rung:0.45")] });
    expect(first.campaign.ledger.length).toBe(before.ledger.length);
    const again = advanceUntilAttention(first.campaign, { phases, matterSources: [signed("rung:0.45")], horizonDays: 1 });
    expect(again.campaign.noticed).toBe(first.campaign.noticed);
  });

  it("stops again when the signature changes", () => {
    const first = advanceUntilAttention(buildCampaign(), { phases, matterSources: [signed("rung:0.45")] });
    const next = advanceUntilAttention(first.campaign, { phases, matterSources: [signed("rung:0.70")] });
    expect(next.stopReason).toBe("attention");
    expect(next.campaign.noticed).toEqual({ standing: "rung:0.70" });
  });

  it("re-arms after the matter has left and come back", () => {
    const sources: readonly MatterSource<Campaign>[] = [(state) => (state.turn === 2 ? [] : [matter("standing", { signature: "a" })])];
    const first = advanceUntilAttention(buildCampaign(), { phases, matterSources: sources });
    const quiet = advanceUntilAttention(first.campaign, { phases, matterSources: sources, horizonDays: 21 });
    expect(quiet.stopReason).toBe("attention");
    expect(quiet.campaign.turn).toBe(3);
  });

  it("still stops on every look for a matter that carries no signature", () => {
    const first = advanceUntilAttention(buildCampaign(), { phases, matterSources: [() => [matter("plain")]] });
    const second = advanceUntilAttention(first.campaign, { phases, matterSources: [() => [matter("plain")]] });
    expect(second.stopReason).toBe("attention");
    expect(second.elapsedDays).toBe(0);
  });

  it("does not record a noticed matter the composer held back for the cap", () => {
    const many: MatterSource<Campaign> = () => ["a", "b", "c", "d"].map((id) => matter(id, { signature: "x" }));
    const result = advanceUntilAttention(buildCampaign(), { phases, matterSources: [many] });
    expect(Object.keys(result.campaign.noticed ?? {}).sort()).toEqual(["a", "b", "c"]);
    expect(result.stop.deferred.map((m) => m.id)).toEqual(["d"]);
  });
});
