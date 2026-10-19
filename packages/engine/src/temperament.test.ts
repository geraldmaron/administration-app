import { describe, expect, it } from "vitest";
import type { NationId, Person, PersonId } from "@admin/world";
import { buildCampaign, nationB } from "./__fixtures__/campaign.js";
import { foundedForBalance } from "./balance-harness.js";
import { LEADER_OFFSET_BOUND, incumbentResidual, leadRoleFor, leaderOffset, tableIncumbentId } from "./foreign-leader.js";
import { withoutLeaderPersonality } from "./leader-index.js";
import type { Campaign } from "./state.js";
import { TEMPERAMENT_CENTER, appetite, inwardPull, isWorldActor, leaderLean, liveTemperament } from "./temperament.js";

const ALP = nationB.id as NationId;

function seated(campaign: Campaign, offset: Record<string, number>): Campaign {
  return {
    ...campaign,
    foreignPolitics: {
      seats: { [ALP]: { since: campaign.calendar, offset, provenance: "played" } },
      recent: [],
    },
  };
}

describe("a government's temperament", () => {
  it("centers on the authored world's medians, pinned so a roster change is seen rather than absorbed", () => {
    expect(TEMPERAMENT_CENTER).toEqual({ appetite: 0.344, isolationism: 0.37, legalism: 0.5, reliability: 0.51 });
  });

  it("reads appetite and inward pull by the same arithmetic the agent used", () => {
    const traits = { ...nationB.traits, riskTolerance: 0.5, aggression: 0.25, isolationism: 0.4 };
    expect(appetite(traits)).toBeCloseTo(0.4, 10);
    expect(inwardPull(traits)).toBeCloseTo(0.36, 10);
    expect(appetite({ ...traits, riskTolerance: 1, aggression: 1 })).toBe(1);
  });

  it("is the traits themselves, the same object, while no leader is seated or leans", () => {
    const campaign = buildCampaign();
    expect(liveTemperament(campaign, ALP)).toBe(campaign.nations[ALP]!.traits);
  });

  it("moves by a seated leader's offset, held inside the unit range", () => {
    const campaign = buildCampaign();
    const traits = campaign.nations[ALP]!.traits;
    const moved = liveTemperament(seated(campaign, { aggression: 0.1, isolationism: -5 }), ALP)!;
    expect(moved.aggression).toBeCloseTo(Math.min(1, traits.aggression + 0.1), 10);
    expect(moved.isolationism).toBe(0);
    expect(moved.legalism).toBe(traits.legalism);
  });

  it("has no temperament for a nation the campaign does not carry", () => {
    expect(liveTemperament(buildCampaign(), "ZZZ" as NationId)).toBeUndefined();
  });

  it("never counts the President's own country as a world actor", () => {
    const campaign = buildCampaign();
    expect(isWorldActor(campaign, campaign.founding.nation)).toBe(false);
    expect(isWorldActor(campaign, ALP)).toBe(true);
  });
});

describe("the lean of the leader in office at the start", () => {
  const { campaign } = foundedForBalance("temperament-lean");
  const onTable = (Object.keys(campaign.nations) as NationId[]).filter(
    (id) => id !== campaign.founding.nation && campaign.foreignPolitics?.seats[id]?.provenance === "table",
  );
  const AXES = ["aggression", "riskTolerance", "legalism", "reliability", "isolationism", "opportunism", "vengefulness"] as const;
  const midRange = (id: NationId) => AXES.every((axis) => campaign.nations[id]!.traits[axis] > 0.15 && campaign.nations[id]!.traits[axis] < 0.85);
  const nation = onTable.find(midRange)!;
  const incumbentId = tableIncumbentId(nation, leadRoleFor(campaign, nation)!);
  const incumbent = campaign.people[incumbentId]!.base;

  function recast(changes: Partial<Person>): Campaign {
    const runtime = campaign.people[incumbentId]!;
    return { ...campaign, people: { ...campaign.people, [incumbentId]: { ...runtime, base: { ...incumbent, ...changes } } } };
  }
  const live = (state: Campaign) => liveTemperament(state, nation)!;

  // The premise the change rests on: before it, the leader the founding
  // seated moved nothing, whoever they were.
  it("used to move nothing: with the character off, a government still on its table incumbent decides on its traits, the same object", () => {
    withoutLeaderPersonality(() => {
      for (const id of onTable) expect(liveTemperament(campaign, id), id).toBe(campaign.nations[id]!.traits);
      expect(liveTemperament(recast({ traits: ["hawkish"], ambition: 1 }), nation)).toBe(campaign.nations[nation]!.traits);
    });
  });

  it("now moves it by how far that leader sits from the leader the government would typically have, inside the bound", () => {
    const moved = onTable.filter((id) => liveTemperament(campaign, id) !== campaign.nations[id]!.traits);
    expect(moved.length).toBeGreaterThan(onTable.length / 2);
    for (const id of onTable) {
      expect(leaderLean(campaign, id), id).toEqual(incumbentResidual(campaign, id));
      for (const delta of Object.values(leaderLean(campaign, id))) expect(Math.abs(delta!)).toBeLessThanOrEqual(LEADER_OFFSET_BOUND);
    }
    const extreme = recast({ traits: ["hawkish", "ambitious"], ambition: 1, integrity: 0, loyalty: 0 });
    for (const delta of Object.values(leaderLean(extreme, nation))) expect(Math.abs(delta!)).toBeLessThanOrEqual(LEADER_OFFSET_BOUND);
  });

  it("reads a successor against the same typical leader: one with the incumbent's character leans the government exactly as the incumbent did", () => {
    const twin: Person = { ...incumbent, id: "PER-TWIN" as PersonId };
    const seat = { since: campaign.calendar, offset: leaderOffset(twin, incumbent), provenance: "played" as const, person: twin.id };
    const seated: Campaign = {
      ...campaign,
      people: { ...campaign.people, [twin.id]: { base: twin, alive: true } },
      foreignPolitics: { ...campaign.foreignPolitics!, seats: { ...campaign.foreignPolitics!.seats, [nation]: seat } },
    };
    expect(seat.offset).toEqual({});
    expect(leaderLean(seated, nation)).toEqual(leaderLean(campaign, nation));
    const hawk: Person = { ...twin, traits: ["hawkish"] };
    const dove: Person = { ...twin, traits: ["dovish"] };
    const seatedAs = (person: Person): Campaign => ({
      ...seated,
      foreignPolitics: { ...seated.foreignPolitics!, seats: { ...seated.foreignPolitics!.seats, [nation]: { ...seat, offset: leaderOffset(person, incumbent) } } },
    });
    expect(live(seatedAs(hawk)).aggression).toBeGreaterThan(live(seatedAs(dove)).aggression);
  });

  it("moves each axis the way the leader's own reading points", () => {
    const base = { ...incumbent, traits: ["pragmatic"] as Person["traits"], ambition: 0.5, integrity: 0.5, loyalty: 0.5, ideology: { ...incumbent.ideology, nationalistGlobalist: 0 } };
    const at = (changes: Partial<Person>) => live(recast({ ...base, ...changes }));
    expect(at({ traits: ["hawkish"] }).aggression).toBeGreaterThan(at({ traits: ["dovish"] }).aggression);
    expect(at({ ambition: 0.9 }).riskTolerance).toBeGreaterThan(at({ ambition: 0.1 }).riskTolerance);
    expect(at({ integrity: 0.9 }).legalism).toBeGreaterThan(at({ integrity: 0.1 }).legalism);
    expect(at({ loyalty: 0.9 }).reliability).toBeGreaterThan(at({ loyalty: 0.1 }).reliability);
    expect(at({ ideology: { ...base.ideology, nationalistGlobalist: 0.5 } }).isolationism).toBeGreaterThan(
      at({ ideology: { ...base.ideology, nationalistGlobalist: -0.5 } }).isolationism,
    );
    expect(at({ traits: ["hawkish", "ambitious"] }).opportunism).toBeGreaterThan(at({ traits: ["hawkish"] }).opportunism);
    expect(at({ traits: ["hawkish", "cautious"] }).opportunism).toBeLessThan(at({ traits: ["hawkish"] }).opportunism);
    expect(at({ traits: ["pragmatic"] }).vengefulness).toBeLessThan(at({ traits: ["hawkish"] }).vengefulness);
    expect(at({ traits: ["hawkish", "principled"] }).transparency).toBe(campaign.nations[nation]!.traits.transparency);
  });

  it("reads the same twice and on a copy of the campaign", () => {
    const copy = structuredClone(campaign);
    for (const id of onTable) {
      expect(liveTemperament(campaign, id)).toEqual(liveTemperament(campaign, id));
      expect(liveTemperament(copy, id)).toEqual(liveTemperament(campaign, id));
    }
  });
});
