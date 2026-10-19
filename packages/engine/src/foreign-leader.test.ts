import { describe, expect, it } from "vitest";
import { NATION_LEADER_CONSTRAINTS, defaultFlagDesign, nationLeadRole, worldDataset, type NationId, type Person } from "@admin/world";
import { draftCabinetCandidates, generateFoundingPool, sealFounding, type FoundingChoices } from "./founding.js";
import {
  LEADER_AMBITION_SWING,
  LEADER_DISPOSITION_SWING,
  LEADER_OFFSET_BOUND,
  LEADER_OPPORTUNISM_SWING,
  LEADER_VENGEFULNESS_SWING,
  dispositionWeights,
  foreignLeaderFor,
  leaderOffset,
  leaderRapportBetween,
  personalLean,
  pickLeadTraits,
} from "./foreign-leader.js";
import { defaultLeaderDraft } from "./leader.js";
import { withoutLeaderPersonality } from "./leader-index.js";
import { personIdFor } from "./person-id.js";
import { createRngStreams, makeCampaignSeed } from "./rng.js";
import type { Campaign } from "./state.js";
import { appetite, liveTemperament } from "./temperament.js";
import { stampOf, weigh } from "./willingness.js";

const seed = makeCampaignSeed("foreign-leader-seed");

// A founded campaign rather than a fixture: the claim under test is about the
// cast the founding actually deals.
function foundedCampaign(): Campaign {
  const pool = generateFoundingPool(seed, worldDataset);
  const nation = worldDataset.nations.find((n) => n.playable)!;
  const charter = worldDataset.charters[0]!;
  const cradle = worldDataset.cradles.find((c) => c.startingNeighbors.length > 0)!;
  const cabinet = Object.fromEntries(
    Object.entries(draftCabinetCandidates(charter, nation.id, pool)).map(([role, people]) => [role, people[0]!.id]),
  );
  const choices: FoundingChoices = {
    nationId: nation.id,
    nationName: nation.identity.name,
    name: "Test President",
    title: "President",
    charterId: charter.id,
    cradleId: cradle.id,
    flag: defaultFlagDesign,
    compactIds: [],
    cabinet,
    leader: { ...defaultLeaderDraft(), name: "Test President" },
  };
  return sealFounding(seed, worldDataset, choices);
}

const campaign = foundedCampaign();

function withDead(state: Campaign, personId: string): Campaign {
  const runtime = state.people[personId as keyof Campaign["people"]]!;
  return { ...state, people: { ...state.people, [personId]: { ...runtime, alive: false } } };
}

/** A nation the seal left on its table incumbent: no selection between the table's date and the oath changed its chair. */
const onTable = (nation: string): boolean => campaign.foreignPolitics?.seats[nation as NationId]?.provenance === "table";

describe("who runs a foreign government", () => {
  it("is the incumbent the leader table describes, or the successor the seal seated, in every one of the 195", () => {
    for (const nation of Object.keys(NATION_LEADER_CONSTRAINTS)) {
      const leader = foreignLeaderFor(campaign, nation as NationId);
      const seat = campaign.foreignPolitics?.seats[nation as NationId];
      const expected = seat?.provenance === "projected" ? seat.person : personIdFor(nation, nationLeadRole(nation)!, 0);
      expect(leader?.person as string | undefined, nation).toBe(expected);
    }
  });

  it("stays the incumbent even where a rival on the same bench is more competent", () => {
    const outranked = Object.keys(NATION_LEADER_CONSTRAINTS).filter(onTable).find((nation) => {
      const lead = nationLeadRole(nation)!;
      const incumbent = campaign.people[personIdFor(nation, lead, 0) as keyof Campaign["people"]]!;
      const rival = campaign.people[personIdFor(nation, lead, 1) as keyof Campaign["people"]];
      return rival !== undefined && rival.base.competence > incumbent.base.competence;
    });
    expect(outranked).toBeDefined();
    expect(foreignLeaderFor(campaign, outranked as NationId)?.person as string).toBe(
      personIdFor(outranked!, nationLeadRole(outranked!)!, 0),
    );
  });

  it("passes to the most competent living candidate once the incumbent dies", () => {
    const lead = nationLeadRole("DEU")!;
    const after = withDead(campaign, personIdFor("DEU", lead, 0));
    const survivors = [1, 2]
      .map((index) => after.people[personIdFor("DEU", lead, index) as keyof Campaign["people"]]!)
      .sort((a, b) => b.base.competence - a.base.competence);
    expect(foreignLeaderFor(after, "DEU" as NationId)?.person).toBe(survivors[0]!.base.id);
  });
});

describe("the disposition a government reads into its leader", () => {
  const hawkishTraits = { ...worldDataset.nations[0]!.traits, riskTolerance: 1, aggression: 1 };
  const dovishTraits = { ...worldDataset.nations[0]!.traits, riskTolerance: 0, aggression: 0 };

  it("leans a bold government's leaders hawkish and a timid one's dovish", () => {
    expect(dispositionWeights(hawkishTraits).hawkish).toBeGreaterThan(dispositionWeights(hawkishTraits).dovish);
    expect(dispositionWeights(dovishTraits).dovish).toBeGreaterThan(dispositionWeights(dovishTraits).hawkish);
  });

  // The name pins hold because nothing after the pick moves: the same stream
  // answers the next draw the same way whether the seat's pick or the
  // government's read was taken.
  it("takes exactly the draws the seat's ordinary pick takes, so no later draw moves", () => {
    const likely = ["ambitious", "charismatic", "pragmatic"] as const;
    for (const seedText of ["pins-a", "pins-b", "pins-c"]) {
      for (const nation of ["DEU", "CHN", "BRA", "RUS", "NGA"]) {
        const streams = createRngStreams(makeCampaignSeed(seedText));
        const read = streams.stream("people", nation, "role-president", 0);
        const ordinary = streams.stream("people", nation, "role-president", 0);
        expect(pickLeadTraits(read, likely, nation), nation).toBeDefined();
        ordinary.pick(likely);
        if (ordinary.next() < 0.6) ordinary.pick(likely.slice(1));
        expect(read.next(), `${seedText} ${nation}`).toBe(ordinary.next());
      }
    }
  });

  it("never names two dispositions, and leaves the President's own country to the seat's pick", () => {
    const streams = createRngStreams(makeCampaignSeed("pins-d"));
    for (let index = 0; index < 50; index += 1) {
      const traits = pickLeadTraits(streams.stream("people", "JPN", "role-prime-minister", index), ["ambitious", "pragmatic", "charismatic"], "JPN")!;
      expect(traits.filter((trait) => ["hawkish", "dovish", "pragmatic"].includes(trait)).length).toBe(1);
    }
    expect(pickLeadTraits(streams.stream("people", "USA", "role-president", 0), ["ambitious", "pragmatic"], "USA")).toBeUndefined();
  });
});

describe("the lean a leader puts on the government they lead", () => {
  const nation = "DEU" as NationId;
  const lead = nationLeadRole("DEU")!;
  const incumbent = campaign.people[personIdFor("DEU", lead, 0) as keyof Campaign["people"]]!.base;
  const rival = campaign.people[personIdFor("DEU", lead, 1) as keyof Campaign["people"]]!.base;

  it("is nothing for the leader the table seated", () => {
    expect(leaderOffset(incumbent, incumbent)).toEqual({});
  });

  it("stays inside the bound on every axis, however far apart two leaders sit", () => {
    const extreme = { ...rival, ambition: 1, integrity: 0, loyalty: 0, traits: ["hawkish" as const], ideology: { ...rival.ideology, nationalistGlobalist: 1 } };
    const calm = { ...incumbent, ambition: 0, integrity: 1, loyalty: 1, traits: ["dovish" as const], ideology: { ...incumbent.ideology, nationalistGlobalist: -1 } };
    for (const delta of Object.values(leaderOffset(extreme, calm))) {
      expect(Math.abs(delta!)).toBeLessThanOrEqual(LEADER_OFFSET_BOUND);
    }
    expect(personalLean(extreme).riskTolerance).toBeCloseTo(LEADER_DISPOSITION_SWING + LEADER_AMBITION_SWING, 10);
  });

  // A staged successor whose appetite sits a tenth above the table's leader
  // flips a question the government was within a tenth of answering the other
  // way, through the live temperament every decision reads, and the stamp
  // records the appetite it was decided on.
  it("reaches a decision through the live temperament, and the stamp records it", () => {
    const traits = campaign.nations[nation]!.traits;
    const before = appetite(liveTemperament(campaign, nation)!);
    const threshold = before + 0.05;
    const decide = (state: Campaign) => {
      const willingness = weigh("join-war", [{ key: "appetite", source: "trait", value: appetite(liveTemperament(state, nation)!) }], {
        threshold,
        noiseBound: 0,
        noise: 0,
      });
      return stampOf(willingness, nation, undefined, "intelligence");
    };
    expect(decide(campaign).acts).toBe(false);
    const seat = campaign.foreignPolitics!.seats[nation]!;
    const staged: Campaign = {
      ...campaign,
      foreignPolitics: { ...campaign.foreignPolitics!, seats: { ...campaign.foreignPolitics!.seats, [nation]: { ...seat, offset: { riskTolerance: 0.1, aggression: 0.1 } } } },
    };
    const after = appetite(liveTemperament(staged, nation)!);
    // Germany's nerve and aggression both sit well below the top of the range, so neither axis clamps.
    expect(traits.riskTolerance).toBeLessThan(0.9);
    expect(traits.aggression).toBeLessThan(0.9);
    expect(after - before).toBeCloseTo(0.1, 6);
    const stamp = decide(staged);
    expect(stamp.acts).toBe(true);
    expect(stamp.terms[0]).toEqual({ key: "appetite", source: "trait", value: after });
  });
});

describe("the axes a leader's traits fill", () => {
  const lead = nationLeadRole("DEU")!;
  const person = campaign.people[personIdFor("DEU", lead, 0) as keyof Campaign["people"]]!.base;
  const plain = { ...person, traits: ["hawkish" as const] };

  it("reads an ambitious leader quicker to take an opening and a cautious one slower, both at once as neither", () => {
    expect(personalLean(plain).opportunism).toBe(0);
    expect(personalLean({ ...plain, traits: ["hawkish", "ambitious"] }).opportunism).toBe(LEADER_OPPORTUNISM_SWING);
    expect(personalLean({ ...plain, traits: ["hawkish", "cautious"] }).opportunism).toBe(-LEADER_OPPORTUNISM_SWING);
    expect(personalLean({ ...plain, traits: ["ambitious", "cautious"] }).opportunism).toBe(0);
  });

  it("reads a pragmatist quicker to let a slight go, and leaves openness to the government", () => {
    expect(personalLean({ ...plain, traits: ["pragmatic"] }).vengefulness).toBe(-LEADER_VENGEFULNESS_SWING);
    expect(Object.is(personalLean(plain).vengefulness, 0)).toBe(true);
    expect(personalLean({ ...plain, traits: ["principled", "charismatic"], integrity: 1 }).transparency).toBe(0);
  });

  it("used to fill neither: with the character off, all three stay at zero", () => {
    withoutLeaderPersonality(() => {
      const lean = personalLean({ ...plain, traits: ["pragmatic", "ambitious"] });
      expect([lean.opportunism, lean.transparency, lean.vengefulness]).toEqual([0, 0, 0]);
    });
  });

  it("carries the filled axes into a successor's stored offset", () => {
    const offset = leaderOffset({ ...plain, id: "PER-SUCCESSOR" as Person["id"], traits: ["pragmatic", "ambitious"] }, { ...plain, traits: ["hawkish", "cautious"] });
    expect(offset.opportunism).toBeCloseTo(2 * LEADER_OPPORTUNISM_SWING, 6);
    expect(offset.vengefulness).toBeCloseTo(-LEADER_VENGEFULNESS_SWING, 6);
  });
});

describe("how well two capitals' leaders get on", () => {
  const from = "DEU" as NationId;
  const to = "FRA" as NationId;

  function recastLeader(state: Campaign, nation: NationId, changes: Partial<Person>): Campaign {
    const id = foreignLeaderFor(state, nation)!.person;
    const runtime = state.people[id]!;
    return { ...state, people: { ...state.people, [id]: { ...runtime, base: { ...runtime.base, ...changes } } } };
  }

  it("is one reading either way round, inside -1..1, and nothing where a chair is empty", () => {
    const rapport = leaderRapportBetween(campaign, from, to);
    expect(leaderRapportBetween(campaign, to, from)).toBe(rapport);
    expect(Math.abs(rapport)).toBeLessThanOrEqual(1);
    expect(leaderRapportBetween(campaign, from, "ZZZ" as NationId)).toBe(0);
  });

  it("is warmer for a leader who shares the other's politics and temperament than for one opposed to both", () => {
    const other = campaign.people[foreignLeaderFor(campaign, to)!.person]!.base;
    const flip = (value: number) => -value;
    const alike = recastLeader(campaign, from, { ideology: other.ideology, traits: other.traits });
    const opposed = recastLeader(campaign, from, {
      ideology: {
        economicLeftRight: flip(other.ideology.economicLeftRight),
        authLibertarian: flip(other.ideology.authLibertarian),
        nationalistGlobalist: flip(other.ideology.nationalistGlobalist),
      },
      traits: other.traits.includes("hawkish") ? ["dovish"] : ["hawkish"],
    });
    expect(leaderRapportBetween(alike, from, to)).toBeGreaterThan(leaderRapportBetween(opposed, from, to));
  });
});
