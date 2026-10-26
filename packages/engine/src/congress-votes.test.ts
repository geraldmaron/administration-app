/**
 * The vote model: one entry point, one arithmetic, and a count that knows whose
 * measure it is answering.
 */
import { describe, expect, it } from "vitest";
import { genericCharters, type PersonId } from "@admin/world";
import { buildCampaign, nationA } from "./__fixtures__/campaign.js";
import {
  CHAMBERS,
  floorThreshold,
  majorityOf,
  openingCongress,
  projectConfirmation,
  supermajorityOf,
  clotureOf,
} from "./congress.js";
import { countFundingContinuityVote, voteOn } from "./congress-votes.js";
import { projectPassage, restrainsThePresident, stanceOf } from "./bill-stages.js";
import { LEGISLATIVE_ACTS, legislativeAct } from "./legislative-acts.js";
import { readingsFor } from "./caucus-count.js";
import { fiscalAppetite } from "./legislative-acts-fiscal.js";
import { chamberDisposition, senateLiaison, SENATE_LIAISON_BOUND } from "./hill.js";
import { partyReading, signatureStance } from "./party-beliefs.js";
import { usTicket } from "./party.js";
import { countRemovalVotes } from "./removal-votes.js";
import type { Campaign, Congress } from "./state.js";

const withCongress = (campaign: Campaign, changes: Partial<Congress>): Campaign => ({
  ...campaign,
  congress: { ...campaign.congress, ...changes },
});

/** A chamber seated to order, so a count is read against seats the test chose. */
const seated = (
  campaign: Campaign,
  chamber: "house" | "senate",
  administration: number,
  opposition: number,
  independent = 0,
): Campaign =>
  withCongress(campaign, {
    chambers: {
      ...campaign.congress.chambers,
      [chamber]: { seats: administration + opposition + independent, administration, opposition, independent },
    },
  });

describe("POL-3 step 1: a measure that binds the President is counted from the other end", () => {
  const disapproval = legislativeAct("act-rule-disapproval")!;

  it("passes a hostile chamber and fails a friendly one on the same resolution", () => {
    const campaign = buildCampaign();
    expect(restrainsThePresident(disapproval)).toBe(true);
    const hostile = projectPassage(withCongress(campaign, { disposition: 0.15 }), disapproval);
    const friendly = projectPassage(withCongress(campaign, { disposition: 0.85 }), disapproval);
    expect(hostile.every((vote) => vote.passed)).toBe(true);
    expect(friendly.some((vote) => vote.passed)).toBe(false);
    for (const chamber of CHAMBERS) {
      const against = hostile.find((vote) => vote.chamber === chamber)!;
      const with_ = friendly.find((vote) => vote.chamber === chamber)!;
      expect(against.yeas).toBeGreaterThan(with_.yeas);
    }
  });

  it("counts a bipartisan bill against the President too, on what it does", () => {
    const warPowers = legislativeAct("act-war-powers-enforcement")!;
    expect(warPowers.sponsor).toBe("bipartisan");
    expect(restrainsThePresident(warPowers)).toBe(true);
    const campaign = withCongress(buildCampaign(), { disposition: 0.15 });
    const hostile = projectPassage(campaign, warPowers);
    const warm = projectPassage(withCongress(buildCampaign(), { disposition: 0.9 }), warPowers);
    expect(hostile.find((vote) => vote.chamber === "house")!.yeas).toBeGreaterThan(
      warm.find((vote) => vote.chamber === "house")!.yeas,
    );
  });
});

describe("POL-3 step 2: each caucus votes its own reading", () => {
  it("stops an administration bill and an opposition bill sharing one support figure", () => {
    const campaign = buildCampaign();
    const required = majorityOf(campaign.congress.chambers.house.seats);
    const ask = { chamber: "house" as const, appeal: 0.1, required };
    const mine = voteOn(campaign, { ...ask, stance: "administration" });
    const theirs = voteOn(campaign, { ...ask, stance: "opposition" });
    const nobodys = voteOn(campaign, { ...ask, stance: "neutral" });
    // Each side turns out for its own measure and has to be carried on the other's.
    expect(mine.byCaucus.administration.yeas).toBeGreaterThan(nobodys.byCaucus.administration.yeas);
    expect(mine.byCaucus.opposition.yeas).toBeLessThan(nobodys.byCaucus.opposition.yeas);
    expect(theirs.byCaucus.opposition.yeas).toBeGreaterThan(nobodys.byCaucus.opposition.yeas);
    expect(theirs.byCaucus.administration.yeas).toBeLessThan(nobodys.byCaucus.administration.yeas);
    // And the two are no longer one figure: neither count is the other's.
    expect(mine.yeas).not.toBe(theirs.yeas);
  });

  it("gives the two caucuses different support on a bill with a signature", () => {
    const campaign = buildCampaign();
    const act = legislativeAct("act-tax-relief-and-growth")!;
    const readings = readingsFor(act.domestic!, campaign.congress.caucusAnchor);
    const required = majorityOf(campaign.congress.chambers.house.seats);
    const ask = { chamber: "house" as const, appeal: act.appeal, required, stance: stanceOf(act) };
    const read = voteOn(campaign, { ...ask, readings });
    const unread = voteOn(campaign, ask);
    expect(readings.administration).not.toBe(readings.opposition);
    expect(read.yeas).not.toBe(unread.yeas);
  });

  it("still moves an opposition count and a bipartisan count when the room moves", () => {
    // What lobbying the Speaker buys is the room, so the room has to reach every
    // caucus's own figure whoever wrote the bill.
    const cold = buildCampaign();
    const warm = withCongress(cold, { disposition: cold.congress.disposition + 0.2 });
    const required = majorityOf(cold.congress.chambers.house.seats);
    for (const stance of ["opposition", "neutral"] as const) {
      const before = voteOn(cold, { chamber: "house", appeal: 0.1, required, stance });
      const after = voteOn(warm, { chamber: "house", appeal: 0.1, required, stance });
      expect(after.yeas, stance).toBeGreaterThan(before.yeas);
    }
  });
});

describe("POL-3: the reach-scaled rule for a President with no party", () => {
  const partyCongress = openingCongress(nationA, 1, "democrat", "democrat");
  const independentCongress = openingCongress(nationA, 1, "independent", "democrat");

  it("holds only the share of the anchor caucus an independent's politics reach", () => {
    const campaign = buildCampaign();
    const required = majorityOf(partyCongress.chambers.house.seats);
    const ask = { chamber: "house" as const, appeal: 0.2, required, stance: "administration" as const };
    const partisan = voteOn({ ...campaign, congress: { ...partyCongress, disposition: 0.6 } }, ask);
    const independent = voteOn({ ...campaign, congress: { ...independentCongress, disposition: 0.6 } }, ask);
    const shareOf = (vote: typeof partisan): number =>
      vote.byCaucus.administration.yeas / vote.byCaucus.administration.seats;
    expect(shareOf(independent)).toBeLessThan(shareOf(partisan));
    // The rest of that caucus answers the question the way the other side does,
    // rather than not answering it: the share sits between the two.
    const otherSide = partisan.byCaucus.opposition.yeas / partisan.byCaucus.opposition.seats;
    expect(shareOf(independent)).toBeGreaterThan(otherSide);
  });

  it("leaves every count under a president with a party byte-identical", () => {
    const campaign = buildCampaign();
    const congress = { ...partyCongress, disposition: 0.55 };
    for (const chamber of CHAMBERS) {
      const required = floorThreshold(congress, chamber, "ordinary");
      for (const stance of ["administration", "opposition", "neutral"] as const) {
        const vote = voteOn({ ...campaign, congress }, { chamber, appeal: 0.1, required, stance });
        const composition = congress.chambers[chamber];
        // The co-partisan band and nothing else: floor 0.8, range 0.2 on support.
        const support = Math.min(1, chamberDisposition(congress, chamber, undefined, campaign.people) + 0.1);
        const sponsor = stance === "administration" ? 0.08 : stance === "opposition" ? -0.06 : 0;
        const own = Math.min(1, Math.max(0, support + sponsor));
        expect(vote.byCaucus.administration.yeas, `${chamber} ${stance}`).toBe(
          Math.round(composition.administration * (0.8 + 0.2 * own)),
        );
      }
    }
  });

  it("reaches the removal count, where the anchor caucus is not co-partisan either", () => {
    const campaign = buildCampaign();
    const charter = genericCharters.find((entry) => entry.id === "charter-presidential-republic")!;
    const grave = 0.9;
    const rungs = [0.3, 0.6, 0.8];
    const collapsed = {
      ...campaign,
      player: { ...campaign.player, metrics: { ...campaign.player.metrics, approval: 0.2 } },
    };
    const partisan = countRemovalVotes(
      { ...collapsed, congress: { ...partyCongress, disposition: 0.2 } },
      charter,
      grave,
      rungs,
    );
    const independent = countRemovalVotes(
      { ...collapsed, congress: { ...independentCongress, disposition: 0.2 } },
      charter,
      grave,
      rungs,
    );
    expect(partisan.length).toBeGreaterThan(0);
    // A quarter of the column answers the way the other side does, so the House
    // count against a president with no party is never the lower of the two.
    expect(independent[0]!.vote.byCaucus.administration.yeas).toBeGreaterThan(
      partisan[0]!.vote.byCaucus.administration.yeas,
    );
  });
});

describe("POL-4: what an act says about the country", () => {
  it("folds a values-only signature, so every caucus does not read it alike", () => {
    const relief = legislativeAct("act-tax-relief-and-growth")!.domestic!;
    const stance = signatureStance(relief);
    expect(stance.economicLeftRight).toBe(0.6);
    for (const party of ["democrat", "republican"] as const) {
      expect(partyReading(usTicket(party).beliefs, relief), party).not.toBe(0);
    }
    const fairness = legislativeAct("act-tax-fairness-and-revenue")!.domestic!;
    expect(signatureStance(fairness).economicLeftRight).toBe(-0.6);
    expect(partyReading(usTicket("democrat").beliefs, relief)).not.toBe(
      partyReading(usTicket("democrat").beliefs, fairness),
    );
  });

  it("leaves no act with a signature that both parties read as nothing", () => {
    const silent = LEGISLATIVE_ACTS.filter(
      (act) =>
        act.domestic !== undefined &&
        ["democrat", "republican"].every((party) =>
          partyReading(usTicket(party as "democrat").beliefs, act.domestic!) === 0,
        ),
    );
    expect(silent.map((act) => act.id)).toEqual([]);
  });

  it("names the acts with no domestic signature, which read zero by design", () => {
    // Each of these says nothing about the country: a stopgap, a ceiling, a
    // budget cap, an authorization, a constraint on the office. A caucus has no
    // platform position to take on the arithmetic of keeping the lights on.
    expect(LEGISLATIVE_ACTS.filter((act) => act.domestic === undefined).map((act) => act.id)).toEqual([
      "act-military-facilities-appropriation",
      "act-war-powers-enforcement",
      // Ending or extending a named declaration acts on the office's own
      // authority, not on any part of the country.
      "act-emergency-termination",
      "act-emergency-renewal",
      "act-emergency-powers-limitation",
      "act-economic-stabilization",
      "act-intelligence-authorization",
      "act-press-shield",
      "act-fiscal-responsibility",
      "act-continuing-resolution",
      "act-rule-disapproval",
      "act-full-year-continuing-resolution",
      "act-debt-limit-increase",
      "act-debt-limit-deal",
      // Revising a program changes its ongoing text; it does not replay the
      // original act's one-off domestic signature on the day of enactment.
      "act-housing-repeal",
      "act-housing-renewal",
      "act-housing-replacement",
    ]);
  });
});

describe("the tracks a measure travels on", () => {
  const campaign = buildCampaign();
  const senateSeats = campaign.congress.chambers.senate.seats;

  it("asks sixty for ordinary legislation, a majority on the budget track and fifty-one for a disapproval", () => {
    expect(floorThreshold(campaign.congress, "senate", "ordinary")).toBe(clotureOf(senateSeats));
    expect(floorThreshold(campaign.congress, "senate", "reconciliation")).toBe(majorityOf(senateSeats));
    expect(floorThreshold(campaign.congress, "senate", "privileged")).toBe(majorityOf(senateSeats));
    // The House has one arithmetic on every track.
    for (const track of ["ordinary", "reconciliation", "privileged"] as const) {
      expect(floorThreshold(campaign.congress, "house", track)).toBe(
        majorityOf(campaign.congress.chambers.house.seats),
      );
    }
  });

  it("puts the stopgap and the year's appropriation on the sixty-vote track and revenue on the budget one", () => {
    const tracksOf = (id: string): string => legislativeAct(id)!.track ?? "ordinary";
    expect(tracksOf("act-continuing-resolution")).toBe("ordinary");
    expect(tracksOf("act-full-year-continuing-resolution")).toBe("ordinary");
    expect(tracksOf("act-tax-relief-and-growth")).toBe("reconciliation");
    expect(tracksOf("act-tax-fairness-and-revenue")).toBe("reconciliation");
    expect(tracksOf("act-debt-limit-increase")).toBe("reconciliation");
    expect(tracksOf("act-fiscal-responsibility")).toBe("ordinary");
    expect(tracksOf("act-debt-limit-deal")).toBe("ordinary");
    expect(tracksOf("act-small-business-credit")).toBe("ordinary");
    expect(tracksOf("act-rule-disapproval")).toBe("privileged");
  });

  it("keeps expedited candidates limited to spending, revenue and the debt limit", () => {
    const budget = LEGISLATIVE_ACTS.filter((act) => act.track === "reconciliation");
    expect(budget.length).toBeGreaterThan(1);
    expect(budget.every((act) => act.recurs !== undefined)).toBe(true);
  });
});

describe("POL-7: the sixty-vote stopgap has a way out", () => {
  it("clears sixty at any disposition and any seat split", () => {
    // The guard on trap 3: continuing resolutions travel on the ordinary
    // sixty-vote track, and a stopgap that could fail on the room's mood would be
    // a lapse with no way out of it — every week of which costs stability and
    // feeds removal pressure. The floor under the count and the share of the
    // other side that votes to keep the lights on are what prevent that, and this
    // is the assertion that says so.
    const base = buildCampaign();
    const splits: readonly (readonly [number, number, number])[] = [
      [50, 50, 0],
      [45, 53, 2],
      [30, 68, 2],
      [60, 40, 0],
    ];
    const stopgap = legislativeAct("act-continuing-resolution")!;
    for (const [administration, opposition, independent] of splits) {
      const campaign = seated(base, "senate", administration, opposition, independent);
      const required = floorThreshold(campaign.congress, "senate", stopgap.track ?? "ordinary");
      expect(required).toBe(clotureOf(100));
      for (let step = 0; step <= 20; step += 1) {
        const congress = { ...campaign.congress, disposition: step / 20 };
        const vote = countFundingContinuityVote(congress, "senate", stopgap.appeal, required, campaign.states);
        expect(vote.passed, `${administration}-${opposition} at ${step / 20}`).toBe(true);
      }
    }
  });

  it("counts a full-year resolution on the same track with no such floor under it", () => {
    // Which is the measure that can fail, and the one the failing-cr fixture is
    // built on: the resolution the floor reaches once the appropriations process
    // has already collapsed is ordinary legislation and needs sixty on its own.
    const base = seated(buildCampaign(), "senate", 45, 53, 2);
    const cold = withCongress(base, { disposition: 0.2 });
    const fullYear = legislativeAct("act-full-year-continuing-resolution")!;
    expect(fullYear.track ?? "ordinary").toBe("ordinary");
    const senate = projectPassage(cold, fullYear).find((vote) => vote.chamber === "senate")!;
    expect(senate.required).toBe(majorityOf(100));
    expect(senate.cloture?.required).toBe(clotureOf(100));
    expect(senate.passed).toBe(false);
  });
});

describe("CAB-2: the Vice President's tie-break", () => {
  const officer = (campaign: Campaign): PersonId => Object.values(campaign.player.cabinet)[0]!;

  const tied = (campaign: Campaign): Campaign => seated(campaign, "senate", 50, 50);

  it("carries a fifty-fifty Senate for the administration on a simple majority", () => {
    const base = tied(buildCampaign());
    const chair = withCongress(base, { presidingOfficer: { person: officer(base), liaison: 0 } });
    const ask = {
      chamber: "senate" as const,
      required: majorityOf(100),
      stance: "administration" as const,
    };
    // A count that lands exactly even: the appeal is tuned to the seats, so the
    // arithmetic is the chair's and not the room's.
    const vacant = voteOn(base, { ...ask, appeal: appealForTie(base) });
    const broken = voteOn(chair, { ...ask, appeal: appealForTie(base) });
    expect(vacant.yeas).toBe(50);
    expect(vacant.passed).toBe(false);
    expect(vacant.tieBrokenBy).toBeUndefined();
    expect(broken.yeas).toBe(51);
    expect(broken.passed).toBe(true);
    expect(broken.tieBrokenBy).toBe(officer(base));
  });

  it("leaves cloture, an override, a treaty and a conviction to the chamber alone", () => {
    const base = tied(buildCampaign());
    const chair = withCongress(base, { presidingOfficer: { person: officer(base), liaison: 0 } });
    for (const required of [clotureOf(100), supermajorityOf(100)]) {
      const vote = voteOn(chair, {
        chamber: "senate",
        appeal: appealForTie(base),
        required,
        stance: "administration",
      });
      expect(vote.tieBrokenBy, String(required)).toBeUndefined();
    }
  });

  it("holds a tied resolution of disapproval, and says who held it", () => {
    const base = tied(buildCampaign());
    const chair = withCongress(base, { presidingOfficer: { person: officer(base), liaison: 0 } });
    const ask = {
      chamber: "senate" as const,
      required: majorityOf(100),
      stance: "opposition" as const,
      counted: "against" as const,
    };
    const appeal = appealAgainstForTie(base);
    const vacant = voteOn(base, { ...ask, appeal });
    const held = voteOn(chair, { ...ask, appeal });
    expect(vacant.yeas).toBe(50);
    expect(vacant.passed).toBe(false);
    expect(held.passed).toBe(false);
    expect(held.nays).toBe(51);
    expect(held.tieBrokenBy).toBe(officer(base));
  });
});

describe("D50: the Senate liaison term", () => {
  it("is zero when no Vice President is seated, and the tie-break reads the same fact", () => {
    const campaign = buildCampaign();
    expect(campaign.congress.presidingOfficer).toBeUndefined();
    expect(senateLiaison(campaign.congress)).toBe(0);
    expect(chamberDisposition(campaign.congress, "senate", undefined, campaign.people)).toBe(
      chamberDisposition({ ...campaign.congress, presidingOfficer: undefined }, "senate", undefined, campaign.people),
    );
  });

  it("is bounded however large a figure is written to it", () => {
    const campaign = buildCampaign();
    const person = Object.values(campaign.player.cabinet)[0]!;
    for (const [written, expected] of [
      [0.02, 0.02],
      [5, SENATE_LIAISON_BOUND],
      [-5, -SENATE_LIAISON_BOUND],
    ] as const) {
      const congress = { ...campaign.congress, presidingOfficer: { person, liaison: written } };
      expect(senateLiaison(congress), String(written)).toBe(expected);
    }
    const generous = {
      ...campaign.congress,
      disposition: 0.5,
      presidingOfficer: { person, liaison: 5 },
    };
    expect(chamberDisposition(generous, "senate", undefined, campaign.people)).toBeCloseTo(0.5 + SENATE_LIAISON_BOUND, 10);
    // The House does not have a presiding officer of the President's choosing.
    expect(chamberDisposition(generous, "house", undefined, campaign.people)).toBe(chamberDisposition({ ...generous, presidingOfficer: undefined }, "house", undefined, campaign.people));
  });
});

describe("VOTE-1: one entry point", () => {
  it("answers every question the engine asks, tallied by bloc", () => {
    const campaign = buildCampaign();
    const required = majorityOf(campaign.congress.chambers.house.seats);
    for (const question of [
      { chamber: "house", appeal: 0, required, stance: "administration" },
      { chamber: "house", appeal: 0, required, stance: "opposition", counted: "against" },
      { chamber: "house", appeal: 0, required, stance: "neutral", counted: "against", administrationBreak: 0.4 },
    ] as const) {
      const vote = voteOn(campaign, question);
      const seats = campaign.congress.chambers.house;
      expect(vote.byCaucus.administration.seats).toBe(seats.administration);
      expect(vote.byCaucus.opposition.seats).toBe(seats.opposition);
      expect(vote.yeas + vote.nays).toBe(seats.seats);
      expect(vote.yeas).toBe(
        Math.min(
          seats.seats,
          vote.byCaucus.administration.yeas + vote.byCaucus.opposition.yeas + vote.byCaucus.independent.yeas,
        ),
      );
    }
  });

  it("carries the confirmation preview, so the count a screen shows is the count taken", () => {
    const campaign = buildCampaign();
    const role = Object.keys(campaign.player.cabinet)[0]!;
    const nominee = Object.values(campaign.player.cabinet)[0]!;
    const projection = projectConfirmation(campaign, role as never, nominee);
    const direct = voteOn(campaign, {
      chamber: "senate",
      appeal: 0,
      required: majorityOf(campaign.congress.chambers.senate.seats),
      stance: "neutral",
    });
    expect(projection.vote.required).toBe(direct.required);
    expect(projection.vote.byCaucus).toBeDefined();
  });
});

describe("ECO-28: Congress's own appetite for a fiscal bill", () => {
  const books = (campaign: Campaign, changes: { balance?: number; outlook?: "negative" | "stable" }): Campaign => {
    const nation = campaign.founding.nation;
    const kept = campaign.books?.[nation];
    if (!kept) throw new Error("the fixture keeps no books to read");
    return {
      ...campaign,
      books: {
        ...campaign.books,
        [nation]: {
          ...kept,
          ...(changes.balance === undefined ? {} : { lastStructuralBalance: changes.balance }),
          ...(changes.outlook === undefined ? {} : { rating: { ...kept.rating, outlook: changes.outlook } }),
        },
      },
    };
  };

  it("reads the deficit, a rating move and the room left under the ceiling", () => {
    const campaign = buildCampaign();
    const quiet = books(campaign, { balance: -0.01, outlook: "stable" });
    expect(fiscalAppetite(quiet)).toBe(0);
    // A deficit past what the country tolerates.
    expect(fiscalAppetite(books(campaign, { balance: -0.09, outlook: "stable" }))).toBeGreaterThan(0);
    // The agencies moving against it, with the same deficit.
    expect(fiscalAppetite(books(campaign, { balance: -0.01, outlook: "negative" }))).toBeGreaterThan(
      fiscalAppetite(quiet),
    );
    // And the Treasury close to the ceiling.
    const cramped = { ...quiet, debtLimit: { ...quiet.debtLimit!, headroomWeeks: 2 } };
    expect(fiscalAppetite(cramped)).toBeGreaterThan(fiscalAppetite(quiet));
    // Bounded: the Hill's interest in the books is not a majority by itself.
    const everything = books({ ...campaign, debtLimit: { ...campaign.debtLimit!, headroomWeeks: 0 } }, {
      balance: -0.5,
      outlook: "negative",
    });
    expect(fiscalAppetite(everything)).toBeLessThanOrEqual(0.12);
  });

  it("moves a fiscal count and leaves every other count alone", () => {
    const campaign = buildCampaign();
    const hungry = books(campaign, { balance: -0.12, outlook: "negative" });
    expect(fiscalAppetite(hungry)).toBeGreaterThan(0);
    const fiscal = legislativeAct("act-fiscal-responsibility")!;
    const farm = legislativeAct("act-agriculture-improvement")!;
    const yeasOn = (state: Campaign, act: typeof fiscal): number =>
      projectPassage(state, act).find((vote) => vote.chamber === "house")!.yeas;
    expect(yeasOn(hungry, fiscal)).toBeGreaterThan(yeasOn(campaign, fiscal));
    expect(yeasOn(hungry, farm)).toBe(yeasOn(campaign, farm));
  });

  it("writes the deal instead of the clean lift once the books are the argument", () => {
    const campaign = buildCampaign();
    const near = (state: Campaign): Campaign => ({
      ...state,
      debtLimit: { ...state.debtLimit!, headroomWeeks: 6 },
    });
    const clean = near(books(campaign, { balance: -0.01, outlook: "stable" }));
    const demanded = near(books(campaign, { balance: -0.12, outlook: "negative" }));
    const lift = legislativeAct("act-debt-limit-increase")!;
    const deal = legislativeAct("act-debt-limit-deal")!;
    expect(lift.arises(clean)).toBe(true);
    expect(deal.arises(clean)).toBe(false);
    expect(lift.arises(demanded)).toBe(false);
    expect(deal.arises(demanded)).toBe(true);
    // Both lift the ceiling; only the deal carries the cap, and the lift act
    // stays urgent at thirteen weeks of room or less.
    expect(deal.borrowingCeilingOfGdp).toBe(lift.borrowingCeilingOfGdp);
    expect(lift.urgent).toBe(true);
    expect(deal.urgent).toBe(true);
    expect(lift.arises({ ...clean, debtLimit: { ...clean.debtLimit!, headroomWeeks: 13 } })).toBe(true);
    expect(lift.arises({ ...clean, debtLimit: { ...clean.debtLimit!, headroomWeeks: 14 } })).toBe(false);
    // A deal is both sides' bill, and the President pays for it in public.
    expect(deal.sponsor).toBe("bipartisan");
    expect(deal.cost.standing).toBeLessThan(lift.cost.standing ?? 0);
  });
});

/** The appeal that lands a "with" count exactly even, found by search. */
function appealForTie(campaign: Campaign): number {
  return searchAppeal(campaign, (appeal) =>
    voteOn(campaign, { chamber: "senate", appeal, required: majorityOf(100), stance: "administration" }).yeas,
  );
}

/** The same for a count taken from the other end. */
function appealAgainstForTie(campaign: Campaign): number {
  return searchAppeal(campaign, (appeal) =>
    voteOn(campaign, {
      chamber: "senate",
      appeal,
      required: majorityOf(100),
      stance: "opposition",
      counted: "against",
    }).yeas,
  );
}

function searchAppeal(campaign: Campaign, yeasAt: (appeal: number) => number): number {
  for (let appeal = -1; appeal <= 1.0001; appeal = Math.round((appeal + 0.001) * 1000) / 1000) {
    if (yeasAt(appeal) === 50) return appeal;
  }
  throw new Error("no appeal lands this chamber at fifty; the fixture's seats changed");
}
