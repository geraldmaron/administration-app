import { describe, expect, it } from "vitest";
import { Charter, worldDataset } from "@admin/world";
import { buildCampaign } from "./__fixtures__/campaign.js";
import {
  TERM_LIMIT,
  TERM_TURNS,
  advanceClock,
  campaignIsOver,
  electionPhase,
  holdElection,
  holdElectionsDueToday,
  holdsElections,
  nextElection,
  openingTermClock,
  pendingInauguration,
  presidencyElections,
  LAWS_EXPECTED_PER_TERM,
  projectVote,
  seatSwing,
  selectEnding,
} from "./elections.js";
import { FIRST_INAUGURATION, federalElectionDay, inaugurationDayOf, turnOnDate } from "./clock.js";
import { CITY_VOTE_LEVERAGE, selectUsCityVoteDriver } from "./cities.js";
import { apply } from "./effects.js";
import { openingCongress } from "./congress.js";
import { DEFAULT_ADMINISTRATION_PARTY } from "./party.js";
import type { Campaign, ElectionResult } from "./state.js";

const charter = Charter.parse({
  id: "charter-1",
  name: "The Constitution",
  removalMechanism: "impeachment",
  cabinetRoles: ["role-chancellor"],
  institutions: [{ name: "Congress", role: "Brings impeachment.", kind: "assembly" }],
  decisionConstraint: "Treaties require the Senate.",
  successionRule: "The Vice President serves out the term.",
  roleTitles: { "role-chancellor": "President" },
});

const junta = Charter.parse({ ...charter, id: "charter-2", removalMechanism: "coup" });

const at = (turn: number): Campaign => ({ ...buildCampaign(), turn });

/** The turn in progress on a federal Election Day, for the fixture's January 20, 2029 oath. */
const weekOf = (year: number): number => turnOnDate(FIRST_INAUGURATION, federalElectionDay(year));
const MIDTERM_WEEK = weekOf(2030);
const CONTEST_WEEK = weekOf(2032);

/** Run the phase for the week it is due and apply whatever it produced. */
function runPhase(campaign: Campaign, charterUsed = charter): Campaign {
  return electionPhase(charterUsed)(campaign).reduce((state, packet) => apply(state, packet), campaign);
}

const heldMidterm = (turn: number): ElectionResult => ({
  id: `election:midterm:${turn}`,
  kind: "midterm",
  turn,
  voteShare: 0.5,
  swing: { house: -10, senate: -2 },
  summary: "a midterm, already held",
});

describe("the term clock", () => {
  it("holds every election on federal Election Day, read off the civil calendar", () => {
    const campaign = buildCampaign();
    expect(nextElection(campaign)).toEqual({
      kind: "midterm",
      turn: MIDTERM_WEEK,
      turnsAway: MIDTERM_WEEK - campaign.turn,
      date: { year: 2030, month: 11, day: 5 },
      daysAway: 654,
    });
    const afterMidterm: Campaign = {
      ...campaign,
      termClock: advanceClock(campaign.termClock, holdElection(at(MIDTERM_WEEK), charter, "midterm", MIDTERM_WEEK)),
    };
    expect(nextElection(afterMidterm)).toMatchObject({ kind: "presidential", turn: CONTEST_WEEK, date: { year: 2032, month: 11, day: 2 } });
  });

  it("schedules two elections a term for two terms, and nothing past the second", () => {
    const schedule = presidencyElections(FIRST_INAUGURATION).map((milestone) => [milestone.kind, milestone.date]);
    expect(schedule).toEqual([
      ["midterm-election", { year: 2030, month: 11, day: 5 }],
      ["presidential-election", { year: 2032, month: 11, day: 2 }],
      ["midterm-election", { year: 2034, month: 11, day: 7 }],
      ["presidential-election", { year: 2036, month: 11, day: 4 }],
    ]);
  });

  it("derives the term's length in weeks from one Inauguration Day to the next", () => {
    expect(TERM_TURNS).toBe(208);
    expect(turnOnDate(FIRST_INAUGURATION, inaugurationDayOf(2033))).toBe(TERM_TURNS + 1);
  });

  it("holds elections only under a charter whose executive actually faces the country", () => {
    expect(holdsElections(charter)).toBe(true);
    expect(holdsElections(junta)).toBe(false);
    expect(runPhase(at(CONTEST_WEEK), junta).termClock.elections).toHaveLength(0);
  });

  it("does nothing at all on a week that is not one of the dates", () => {
    expect(electionPhase(charter)(at(40))).toHaveLength(0);
    expect(electionPhase(charter)(at(MIDTERM_WEEK - 1))).toHaveLength(0);
  });

  it("holds the election on its day and not the day before", () => {
    const eve: Campaign = { ...at(MIDTERM_WEEK), calendar: { year: 2030, month: 11, day: 4 } };
    expect(holdElectionsDueToday(eve)).toBe(eve);
    const held = holdElectionsDueToday({ ...eve, calendar: { year: 2030, month: 11, day: 5 } });
    expect(held.termClock.elections).toHaveLength(1);
    expect(held.termClock.elections[0]).toMatchObject({ kind: "midterm", turn: MIDTERM_WEEK });
    expect(held.ledger.at(-1)!.causal?.createdDate).toEqual({ year: 2030, month: 11, day: 5 });
  });
});

describe("what a term put on the statute book", () => {
  // The driver the two contest pins turn on, measured at the end of a term so
  // the elapsed-term scaling is at full weight.
  const atTheContest = (campaign: Campaign, laws: number): Campaign => ({
    ...campaign,
    turn: campaign.termClock.termStartTurn + TERM_TURNS,
    // Funded through the contest, so the jump in the calendar is not also a lapse.
    congress: {
      ...campaign.congress,
      appropriation: { ...campaign.congress.appropriation, throughTurn: campaign.termClock.termStartTurn + TERM_TURNS },
    },
    bills: Object.fromEntries(
      Array.from({ length: laws }, (_, index) => [
        `bill:act-x-${index}:1`,
        {
          id: `bill:act-x-${index}:1`,
          act: "act-debt-limit-increase",
          title: `Act ${index}`,
          sponsor: "administration" as const,
          introducedTurn: 1,
          status: "law" as const,
          passage: [],
        },
      ]),
    ) as Campaign["bills"],
  });

  it("charges its full weight at the contest", () => {
    // Against the same contest with the term's expected laws signed, so the
    // honeymoon every bloc now reads at the oath does not enter the comparison.
    const base = buildCampaign();
    const none = projectVote(atTheContest(base, 0)).share;
    const enough = projectVote(atTheContest(base, LAWS_EXPECTED_PER_TERM)).share;
    expect(enough - none).toBeCloseTo(0.12, 3);
    const opening = projectVote({ ...base, turn: base.termClock.termStartTurn }).drivers.find((driver) => driver.reason === "how little of the term reached the statute book");
    expect(opening?.delta ?? 0).toBeCloseTo(0, 6);
  });

  it("clears once the term reaches what a term is expected to legislate", () => {
    const base = buildCampaign();
    const none = projectVote(atTheContest(base, 0)).share;
    const some = projectVote(atTheContest(base, Math.floor(LAWS_EXPECTED_PER_TERM / 2))).share;
    const enough = projectVote(atTheContest(base, LAWS_EXPECTED_PER_TERM)).share;
    const more = projectVote(atTheContest(base, LAWS_EXPECTED_PER_TERM * 3)).share;
    expect(some).toBeGreaterThan(none);
    expect(enough).toBeGreaterThan(some);
    // Past the expectation the driver is spent; a twelfth act does not buy votes.
    expect(more).toBe(enough);
  });
});

describe("what the country is voting on", () => {
  it("reads the blocs rather than inventing a second poll", () => {
    const drivers = projectVote(buildCampaign()).drivers.map((driver) => driver.reason);
    expect(drivers).toContain("where the country's blocs stand");
  });

  it("charges the administration for the record it actually compiled", () => {
    const clean = buildCampaign();
    const dirty: Campaign = {
      ...clean,
      congress: {
        ...clean.congress,
        unauthorized: [1, 2, 3].map((turn) => ({
          id: `unauthorized:ALP:${turn}`,
          target: clean.founding.nation,
          turn,
          rung: 5 as const,
          description: "a strike nobody voted for",
        })),
      },
    };
    expect(projectVote(dirty).share).toBeLessThan(projectVote(clean).share);
  });

  it("caps each count so one kind of failure cannot lose the election on its own", () => {
    const clean = buildCampaign();
    const many: Campaign = {
      ...clean,
      congress: {
        ...clean.congress,
        unauthorized: Array.from({ length: 40 }, (_, i) => ({
          id: `unauthorized:ALP:${i}`,
          target: clean.founding.nation,
          turn: i,
          rung: 5 as const,
          description: "another one",
        })),
      },
    };
    expect(projectVote(clean).share - projectVote(many).share).toBeLessThanOrEqual(0.12 + 1e-9);
  });

  it("counts a country that starts out split rather than rescaling an approval rating", () => {
    // A share of approval plus the incumbency edge produces 82 percent for a
    // well-liked administration and 29 for a struggling one, margins no
    // republic has ever produced, and a contest decided inside the first year.
    // The electorate is anchored: what a record moves is the part of it that
    // has not already decided.
    const clean = buildCampaign();
    const projection = projectVote(clean);
    expect(projection.drivers[0]!.reason).toBe("a country that starts out evenly split");
    expect(projection.drivers[0]!.delta).toBe(0.5);
    expect(projection.share).toBeGreaterThan(0.3);
    expect(projection.share).toBeLessThan(0.7);
    // The drivers are the derivation, not a commentary beside it.
    const summed = projection.drivers.reduce((total, driver) => total + driver.delta, 0);
    expect(Math.abs(summed - projection.share)).toBeLessThan(0.005);
  });

  it("holds the whole record's drag to a margin, so a bad presidency loses rather than vanishes", () => {
    const clean = buildCampaign();
    const lawless: Campaign = {
      ...clean,
      congress: {
        ...clean.congress,
        appropriation: { ...clean.congress.appropriation, onPriorYear: true },
        unauthorized: Array.from({ length: 10 }, (_, i) => ({
          id: `unauthorized:ALP:${i}`,
          target: clean.founding.nation,
          turn: i,
          rung: 5 as const,
          description: "another one",
        })),
      },
      removal: { ...clean.removal, beats: Array.from({ length: 6 }, (_, i) => ({ turn: i, description: "the assembly moves again" })) },
    };
    // Every count capped separately still summed to 45 points, enough to put a
    // popular administration under 20 percent. That is not an election result.
    const drag = projectVote(clean).share - projectVote(lawless).share;
    expect(drag).toBeGreaterThan(0.1);
    expect(drag).toBeLessThanOrEqual(0.15 + 1e-9);
  });

  it("takes an unpopular and lawless administration's party no lower than 1974 took the President's", () => {
    const clean = buildCampaign();
    const lawless: Campaign = {
      ...clean,
      player: { ...clean.player, metrics: { ...clean.player.metrics, approval: 0.24 } },
      congress: {
        ...clean.congress,
        unauthorized: Array.from({ length: 10 }, (_, i) => ({
          id: `unauthorized:ALP:${i}`,
          target: clean.founding.nation,
          turn: i,
          rung: 5 as const,
          description: "another one",
        })),
      },
      removal: { ...clean.removal, beats: Array.from({ length: 6 }, (_, i) => ({ turn: i, description: "the assembly moves again" })) },
    };
    const share = projectVote(lawless).share;
    expect(share).toBeGreaterThanOrEqual(0.41);
    expect(share).toBeLessThan(0.45);
  });
});

function shockUsLean(campaign: Campaign, delta: number): Campaign {
  const cities = Object.fromEntries(
    Object.entries(campaign.cities).map(([id, city]) => {
      if (city.adminLean === undefined) return [id, city];
      const adminLean = Math.max(-1, Math.min(1, city.adminLean + delta));
      return [id, { ...city, adminLean }];
    }),
  );
  return { ...campaign, cities };
}

describe("geography as a vote driver", () => {
  it("does not replace the blocs on an unmoved map", () => {
    const clean = buildCampaign();
    expect(selectUsCityVoteDriver(clean)).toBe(0);
    const reasons = projectVote(clean).drivers.map((driver) => driver.reason);
    expect(reasons).toContain("where the country's blocs stand");
    expect(reasons).not.toContain("how the cities have moved");
  });

  it("moves the share when US city lean moves, at the stated leverage", () => {
    const clean = buildCampaign();
    const shocked = shockUsLean(clean, 0.08);
    expect(selectUsCityVoteDriver(shocked)).toBeCloseTo(0.08 * CITY_VOTE_LEVERAGE, 3);
    expect(projectVote(shocked).share).toBeGreaterThan(projectVote(clean).share);
    expect(projectVote(shocked).drivers.some((driver) => driver.reason === "how the cities have moved")).toBe(true);
    expect(projectVote(shocked).drivers.find((driver) => driver.reason === "how the cities have moved")!.delta).toBeCloseTo(
      0.02,
      3,
    );
  });

  it("skips the driver when the charter holds no elections", () => {
    const juntaCharter = worldDataset.charters.find((entry) => !holdsElections(entry));
    expect(juntaCharter).toBeDefined();
    const shocked = {
      ...shockUsLean(buildCampaign(), 0.08),
      founding: { ...buildCampaign().founding, charter: juntaCharter!.id },
    };
    expect(selectUsCityVoteDriver(shocked)).not.toBe(0);
    expect(projectVote(shocked).drivers.map((driver) => driver.reason)).not.toContain("how the cities have moved");
  });
});

describe("the midterm", () => {
  it("costs a president on even standing seats anyway", () => {
    const composition = openingCongress(
      buildCampaign().nations[buildCampaign().founding.nation]!.base,
      1,
      DEFAULT_ADMINISTRATION_PARTY,
      DEFAULT_ADMINISTRATION_PARTY,
    ).chambers.house;
    expect(seatSwing(0.5, "house", composition)).toBeLessThan(0);
  });

  it("moves the House further than the Senate on the same national mood", () => {
    const congress = buildCampaign().congress;
    const house = seatSwing(0.8, "house", congress.chambers.house) / congress.chambers.house.seats;
    const senate = seatSwing(0.8, "senate", congress.chambers.senate) / congress.chambers.senate.seats;
    expect(house).toBeGreaterThan(senate);
  });

  it("transfers seats between the caucuses without inventing or destroying any", () => {
    const before = at(MIDTERM_WEEK).congress.chambers.house;
    const after = runPhase(at(MIDTERM_WEEK)).congress.chambers.house;
    expect(after.seats).toBe(before.seats);
    expect(after.administration + after.opposition + after.independent).toBe(after.seats);
    expect(after.administration + after.opposition).toBe(before.administration + before.opposition);
  });

  it("recomposes the chamber and leaves the presidency alone", () => {
    const after = runPhase(at(MIDTERM_WEEK));
    expect(after.termClock.elections).toHaveLength(1);
    expect(after.termClock.outcome).toBeUndefined();
    expect(selectEnding(after)).toBe("in-office");
  });
});

describe("the contest at the end of the term", () => {
  const contest = (share: number): ElectionResult => ({
    id: `election:presidential:${CONTEST_WEEK}`,
    kind: "presidential",
    turn: CONTEST_WEEK,
    voteShare: share,
    won: share > 0.5,
    summary: "counted",
  });
  const firstTerm = advanceClock(openingTermClock(1), heldMidterm(MIDTERM_WEEK));

  it("records a win and waits for Inauguration Day to open the second term", () => {
    const clock = advanceClock(firstTerm, contest(0.6));
    expect(clock.term).toBe(1);
    expect(clock.termStartTurn).toBe(1);
    expect(clock.outcome).toBeUndefined();
    const reelected: Campaign = { ...at(CONTEST_WEEK), termClock: clock };
    expect(pendingInauguration(reelected)).toEqual({ year: 2033, month: 1, day: 20 });
    // Nothing before the oath: the second term's midterm is next, but the day
    // that opens the term comes first.
    const eve: Campaign = { ...reelected, turn: TERM_TURNS + 1, calendar: { year: 2033, month: 1, day: 19 } };
    expect(holdElectionsDueToday(eve)).toBe(eve);
    const sworn = holdElectionsDueToday({ ...eve, calendar: { year: 2033, month: 1, day: 20 } });
    expect(sworn.termClock.term).toBe(2);
    expect(sworn.termClock.termStartTurn).toBe(TERM_TURNS + 1);
    expect(pendingInauguration(sworn)).toBeUndefined();
    expect(nextElection(sworn)).toMatchObject({ kind: "midterm", date: { year: 2034, month: 11, day: 7 } });
  });

  it("can be lost, and losing is not being removed", () => {
    const clock = advanceClock(firstTerm, contest(0.4));
    const defeated: Campaign = { ...buildCampaign(), termClock: clock };
    expect(selectEnding(defeated)).toBe("defeated");
    expect(defeated.removal.resolved).toBe(false);
    expect(campaignIsOver(defeated)).toBe(true);
    expect(pendingInauguration(defeated)).toBeUndefined();
  });

  it("keeps removal the ending it is even in the same week as a defeat", () => {
    const both: Campaign = {
      ...buildCampaign(),
      termClock: advanceClock(firstTerm, contest(0.4)),
      removal: { mechanism: "impeachment", pressure: 0.9, pressureHistory: [], beats: [], resolved: true },
    };
    expect(selectEnding(both)).toBe("removed");
  });

  it("ends a second term without a contest, because the President is not on the ballot", () => {
    const secondTerm: Campaign = {
      ...at(weekOf(2036)),
      termClock: {
        term: TERM_LIMIT,
        termStartTurn: TERM_TURNS + 1,
        elections: [heldMidterm(MIDTERM_WEEK), contest(0.6), heldMidterm(weekOf(2034))],
      },
    };
    const after = runPhase(secondTerm);
    expect(after.termClock.outcome).toBe("term-limited");
    expect(selectEnding(after)).toBe("term-limited");
    // Filed under the turn the weekly tick closes, the week Election Day falls in.
    expect(after.termClock.elections.at(-1)).toMatchObject({ kind: "presidential", turn: weekOf(2036) + 1 });
    expect(after.termClock.elections.at(-1)!.won).toBeUndefined();
  });

  it("holds nothing once the campaign is over", () => {
    const over: Campaign = {
      ...at(CONTEST_WEEK),
      termClock: { term: 1, termStartTurn: 1, elections: [], outcome: "defeated" },
    };
    expect(electionPhase(charter)(over)).toHaveLength(0);
    expect(nextElection(over)).toBeUndefined();
  });

  it("titles the result from the charter rather than assuming a president", () => {
    const chancellery = Charter.parse({ ...charter, roleTitles: { "role-chancellor": "Chancellor" } });
    const result = holdElection(at(CONTEST_WEEK), chancellery, "presidential", CONTEST_WEEK);
    expect(result.summary).toContain("Chancellor");
    expect(result.summary).not.toContain("President");
  });
});
