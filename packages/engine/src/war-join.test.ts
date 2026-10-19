// The join as a decision: what a government owes, wants and is like, weighed
// once per war against one bar, with its reason stamped.

import { describe, expect, it } from "vitest";
import type { NationId, NationTraits } from "@admin/world";
import { foundedForBalance } from "./balance-harness.js";
import { assessDeterrence, openConflict } from "./conflicts.js";
import { joinConflict } from "./war-entry.js";
import { apply } from "./effects.js";
import { createRngStreams, type RngStreams } from "./rng.js";
import { hasIntelOnNation } from "./state-selectors.js";
import type { Campaign, Conflict } from "./state.js";
import { isWorldActor } from "./temperament.js";
import { campaignPhaseSequence, weekGroups } from "./turn-phases.js";
import { weigh } from "./willingness.js";
import { regimeSurvivalDrive } from "./governance.js";
import { callCompact, obligationWeight, OBLIGATION_WEIGHT, sharedBodies } from "./compacts.js";
import {
  JOIN_NOISE,
  JOIN_THRESHOLD,
  CALL_THRESHOLD,
  allyJoinEffects,
  joinCounterfactual,
  joinDecisionPackets,
  joinGrade,
  joinReading,
  likelyJoinersOf,
  projectLikelyJoiners,
  regimeDanger,
  weekOfJoins,
  weighJoin,
  type JoinDecision,
} from "./war-join.js";

const RUS = "RUS" as NationId;
const EST = "EST" as NationId;

function atWar(seed: string, aggressor = RUS, defender = EST): { campaign: Campaign; war: Conflict } {
  const { campaign } = foundedForBalance(seed);
  const war = openConflict(aggressor, defender, campaign.turn, "The border is crossed.");
  return { campaign: { ...campaign, conflicts: { ...campaign.conflicts, [war.id]: war } }, war };
}

function withTraits(campaign: Campaign, nation: NationId, traits: NationTraits): Campaign {
  return { ...campaign, nations: { ...campaign.nations, [nation]: { ...campaign.nations[nation]!, traits } } };
}

function traitSum(decision: JoinDecision): number {
  return decision.reading.terms.filter((term) => term.source === "trait").reduce((sum, term) => sum + term.value, 0);
}

/** Every stream key a caller asks for, so a test can see what a decision drew. */
function spying(seed: Campaign["seed"]): { streams: RngStreams; keys: string[][] } {
  const inner = createRngStreams(seed);
  const keys: string[][] = [];
  return {
    keys,
    streams: {
      stream: (...parts) => {
        keys.push(parts.map(String));
        return inner.stream(...parts);
      },
    },
  };
}

describe("what a shared body obliges", () => {
  it("weighs a defense treaty that binds at 1, another shared body at 0.4 and none at 0", () => {
    expect(obligationWeight([], "region-northern-europe")).toBe(OBLIGATION_WEIGHT.none);
    expect(obligationWeight([{ kind: "economic" }], "region-northern-europe")).toBe(0.4);
    expect(obligationWeight([{ kind: "defense" }], "region-northern-europe")).toBe(1);
  });

  it("does not give two members of a trade bloc the defense weight", () => {
    const { campaign } = foundedForBalance("war-join-compacts");
    const ireland = campaign.nations["IRL" as NationId]!;
    const austria = campaign.nations["AUT" as NationId]!;
    const bodies = sharedBodies(ireland.base.memberships, austria.base.memberships);
    expect(bodies.some((body) => body.kind === "defense")).toBe(false);
    expect(obligationWeight(bodies, austria.base.geo.region as string)).toBe(OBLIGATION_WEIGHT.shared);
    const france = campaign.nations["FRA" as NationId]!;
    const germany = campaign.nations["DEU" as NationId]!;
    expect(obligationWeight(sharedBodies(france.base.memberships, germany.base.memberships), germany.base.geo.region as string)).toBe(1);
  });

  it("counts a treaty with an area as defense only when its member is attacked inside it: a member attacked in the Gulf is owed a shared body's weight", () => {
    const atlantic = { kind: "defense" as const, defenseScope: { kind: "area" as const, area: ["region-western-europe", "region-north-america"] as never, source: "Article 6" } };
    expect(obligationWeight([atlantic], "region-western-europe")).toBe(1);
    expect(obligationWeight([atlantic], "region-middle-east")).toBe(0.4);
    const territory = { kind: "defense" as const, defenseScope: { kind: "parties-territory" as const, source: "Article V" } };
    expect(obligationWeight([territory], "region-east-asia")).toBe(1);
  });

  it("never gives a defense treaty's weight to joining a member's attack", () => {
    const { campaign, war } = atWar("war-1", "DEU" as NationId, RUS);
    const reading = joinReading(campaign, war, "FRA" as NationId, "aggressor");
    expect(reading?.obligation).toBe(OBLIGATION_WEIGHT.shared);
  });
});

describe("the President's country is never an actor", () => {
  it("is excluded by the actor rule and never drawn into a war over 52 weeks", () => {
    const { campaign, war } = atWar("war-1");
    const founder = campaign.founding.nation;
    expect(isWorldActor(campaign, founder)).toBe(false);
    const streams = createRngStreams(campaign.seed);
    for (let turn = campaign.turn; turn < campaign.turn + 52; turn += 1) {
      const drawn = allyJoinEffects({ ...campaign, turn }, war, streams);
      expect(drawn.joined.aggressor, `turn ${turn}`).not.toContain(founder);
      expect(drawn.joined.defender, `turn ${turn}`).not.toContain(founder);
    }
    for (const [aggressor, defender] of [["RUS", "UKR"], ["CHN", "TWN"], ["IND", "PAK"]] as const) {
      const other = openConflict(aggressor as NationId, defender as NationId, campaign.turn, "War.");
      expect(weekOfJoins(campaign, other, streams).map((decision) => decision.reading.nation)).not.toContain(founder);
    }
  });

  it("still enters the same war on the President's order, with its War Powers record", () => {
    const { campaign, war } = atWar("war-1");
    const result = joinConflict(campaign, campaign.founding.nation, war.id, "defender");
    if (!result.ok) throw new Error(result.reason);
    const after = apply(campaign, result.packet);
    expect(after.conflicts[war.id]!.joined.defender).toContain(campaign.founding.nation);
    expect(result.packet.effects.some((effect) => effect.kind === "warPowers")).toBe(true);
  });
});

describe("a government's character decides at the margin", () => {
  const { campaign, war } = atWar("war-1");
  const streams = createRngStreams(campaign.seed);
  const partners = weekOfJoins(campaign, war, streams).filter(
    (decision) => decision.reading.side === "defender" && decision.reading.obligation === 1,
  );
  const full = (decision: JoinDecision) =>
    campaign.nations[decision.reading.nation]!.base.fidelity === "full";
  const byTemper = [...partners].sort((a, b) => traitSum(a) - traitSum(b));
  const lowest = byTemper[Math.floor((byTemper.length - 1) * 0.1)]!;
  const highest = byTemper[Math.ceil((byTemper.length - 1) * 0.9)]!;

  it("sends a full-fidelity joiner home when it is given its alliance's lowest-decile temperament, and says so", () => {
    const joiner = partners.filter((decision) => decision.joins && full(decision)).sort((a, b) => a.willingness.margin - b.willingness.margin)[0];
    if (!joiner) throw new Error("no full-fidelity partner of Estonia joins on this seed");
    const nation = joiner.reading.nation;
    const reshaped = withTraits(campaign, nation, campaign.nations[lowest.reading.nation]!.traits);
    const reading = joinReading(reshaped, war, nation, "defender")!;
    const decision = weighJoin(reading, war, streams);
    expect(decision.acts).toBe(false);
    const against = [...decision.terms].filter((term) => term.value < 0).sort((a, b) => a.value - b.value)[0];
    expect(against?.source).toBe("trait");
  });

  it("brings a non-joiner in when it is given the top-decile temperament", () => {
    const outsider = partners
      .filter((decision) => !decision.willingness.acts && full(decision))
      .sort((a, b) => b.willingness.margin - a.willingness.margin)[0];
    if (!outsider) throw new Error("every full-fidelity partner of Estonia joins on this seed");
    const nation = outsider.reading.nation;
    const reshaped = withTraits(campaign, nation, campaign.nations[highest.reading.nation]!.traits);
    expect(weighJoin(joinReading(reshaped, war, nation, "defender")!, war, streams).acts).toBe(true);
  });

  it("reads the dataset's centers, so a world reshaped toward the top of every range sends more governments in", () => {
    const joins = (world: Campaign) => weekOfJoins(world, war, createRngStreams(world.seed)).filter((decision) => decision.joins).length;
    const up = (value: number, by: number) => Math.max(0, Math.min(1, value + by));
    const nations = Object.fromEntries(
      Object.entries(campaign.nations).map(([id, runtime]) => [
        id,
        {
          ...runtime,
          traits: {
            ...runtime.traits,
            riskTolerance: up(runtime.traits.riskTolerance, 0.1),
            aggression: up(runtime.traits.aggression, 0.1),
            reliability: up(runtime.traits.reliability, 0.07),
            isolationism: up(runtime.traits.isolationism, -0.1),
          },
        },
      ]),
    ) as Campaign["nations"];
    expect(joins({ ...campaign, nations })).toBeGreaterThan(joins(campaign));
  });

  it("sets each partner beside a typical government in its seat: the same decision on its structural terms alone", () => {
    for (const decision of partners) {
      const counter = joinCounterfactual(campaign, war.id, decision.reading.nation)!;
      const structural = decision.reading.terms.filter((term) => term.source !== "trait").reduce((sum, term) => sum + term.value, 0);
      expect(counter.margin).toBeCloseTo(structural - decision.reading.threshold, 3);
    }
  });
});

describe("a standing question draws once and holds its answer", () => {
  it("draws from the will stream keyed on the question, the government and the war, with no week in it", () => {
    const { campaign, war } = atWar("war-2");
    const spy = spying(campaign.seed);
    const decisions = weekOfJoins(campaign, war, spy.streams);
    expect(spy.keys.length).toBeGreaterThan(0);
    for (const key of spy.keys) {
      expect(key[0]).toBe("will");
      expect(["join-war", "answer-call"]).toContain(key[1]);
      expect(key[3]).toBe(war.id);
      expect(key).toHaveLength(4);
    }
    expect(decisions.length).toBeGreaterThan(0);
  });

  it("gives the same answer twice, on a clone, and in a later week where nothing it weighs has moved", () => {
    const { campaign, war } = atWar("war-2");
    const once = weekOfJoins(campaign, war, createRngStreams(campaign.seed));
    expect(weekOfJoins(campaign, war, createRngStreams(campaign.seed))).toEqual(once);
    expect(weekOfJoins(structuredClone(campaign), structuredClone(war), createRngStreams(campaign.seed))).toEqual(once);
    expect(weekOfJoins({ ...campaign, turn: campaign.turn + 10 }, war, createRngStreams(campaign.seed))).toEqual(once);
  });

  it("changes an answer only when a term moves", () => {
    const { campaign, war } = atWar("war-2");
    const streams = createRngStreams(campaign.seed);
    const before = weekOfJoins(campaign, war, streams);
    const hotter = weekOfJoins(campaign, { ...war, intensity: 1 }, streams);
    const moved = before.filter((decision, index) => decision.willingness.score !== hotter[index]!.willingness.score);
    expect(moved.length).toBeGreaterThan(0);
    for (const [index, decision] of before.entries()) {
      expect(hotter[index]!.willingness.noise).toBe(decision.willingness.noise);
    }
  });

  it("forecasts without drawing anything", () => {
    const { campaign, war } = atWar("war-2");
    const spy = spying(campaign.seed);
    const likely = projectLikelyJoiners(campaign, war.id, "defender");
    expect(spy.keys).toHaveLength(0);
    for (const joiner of likely) expect(["likely", "close"]).toContain(joiner.forecast);
    const decided = weekOfJoins(campaign, war, spy.streams).filter((decision) => decision.joins && decision.reading.side === "defender");
    for (const decision of decided) {
      if (Math.abs(decision.willingness.margin - decision.willingness.noise) >= JOIN_NOISE && hasIntelOnNation(campaign, decision.reading.nation)) {
        expect(likely.map((joiner) => joiner.nation)).toContain(decision.reading.nation);
      }
    }
  });

  it("forecasts only governments the President's services read, and leaves the aggressor's own reckoning unfogged", () => {
    const { campaign, war } = atWar("war-2");
    const sides = ["aggressor", "defender"] as const;
    for (const side of sides) {
      const shown = projectLikelyJoiners(campaign, war.id, side);
      expect(shown.every((joiner) => hasIntelOnNation(campaign, joiner.nation))).toBe(true);
      const all = likelyJoinersOf(campaign, war, side);
      expect(shown).toEqual(all.filter((joiner) => hasIntelOnNation(campaign, joiner.nation)));
    }
  });
});

describe("the record a join decision leaves", () => {
  it("stamps each join with its terms and the bar it cleared, in public", () => {
    const { campaign, war } = atWar("war-1");
    const packets = joinDecisionPackets(campaign, war, createRngStreams(campaign.seed));
    const joins = packets.filter((packet) => packet.provenance?.decision?.acts);
    expect(joins.length).toBeGreaterThan(0);
    for (const packet of joins) {
      const decision = packet.provenance!.decision!;
      expect(decision.question).toBe("join-war");
      expect(decision.threshold).toBe(JOIN_THRESHOLD);
      expect(decision.visibility).toBe("public");
      expect(decision.subject).toBe(war.id);
    }
  });

  it("names at most three governments for staying out, as an intelligence read, and names them once", () => {
    const { campaign, war } = atWar("war-1");
    const streams = createRngStreams(campaign.seed);
    const first = joinDecisionPackets(campaign, war, streams);
    const refusals = first.filter((packet) => packet.provenance?.decision?.acts === false);
    expect(refusals.length).toBeLessThanOrEqual(3);
    for (const packet of refusals) {
      expect(packet.provenance!.decision!.visibility).toBe("intelligence");
      expect(packet.narration.summary).toContain("has not sent forces");
    }
    const after = first.reduce((state, packet) => apply(state, packet), campaign);
    const again = joinDecisionPackets(after, after.conflicts[war.id] ?? war, streams).filter((packet) => packet.provenance?.decision?.acts === false);
    expect(refusals.length + again.length).toBeLessThanOrEqual(3);
  });

  it("grades a willingness between the aid bar and the force bar as aid, and stamps it as staying out", () => {
    const at = (value: number) => weigh("join-war", [{ key: "bond", source: "interest", value }], { threshold: JOIN_THRESHOLD, noiseBound: JOIN_NOISE, noise: 0 });
    expect(joinGrade(at(1.2))).toBe("forces");
    const aid = at(0.8);
    expect(joinGrade(aid)).toBe("aid");
    expect(aid.acts).toBe(false);
    expect(joinGrade(at(0.3))).toBe("stayed-out");
  });
});

describe("the dated act", () => {
  it("decides on the third office day, inside the war's own phase", () => {
    const { charter } = foundedForBalance("war-1");
    const days = weekGroups(campaignPhaseSequence(charter));
    expect(days[2]?.map((phase) => phase.id)).toContain("conflictPhase");
  });

  it("reads an act the President took earlier in the week: a call on the second day turns the week's question into an answer to it", () => {
    const { campaign, war } = atWar("war-1", RUS, foundedForBalance("war-1").campaign.founding.nation);
    const nato = campaign.nations[campaign.founding.nation]!.base.memberships.find((org) => (org as string) === "ORG-NATO");
    if (!nato) throw new Error("the United States sits in no NATO on this board");
    const called = callCompact(campaign, nato, war.id);
    if (!called.ok) throw new Error(called.reason);
    const dayTwo = apply(campaign, called.packet);
    const questions = weekOfJoins(dayTwo, war, createRngStreams(dayTwo.seed))
      .filter((decision) => decision.reading.side === "defender" && decision.reading.calledBody === nato)
      .map((decision) => decision.reading.question);
    expect(questions.length).toBeGreaterThan(0);
    expect(new Set(questions)).toEqual(new Set(["answer-call"]));
    const answered = weekOfJoins(dayTwo, war, createRngStreams(dayTwo.seed)).find((decision) => decision.reading.calledBody === nato)!;
    expect(answered.willingness.threshold).toBe(CALL_THRESHOLD);
    expect(answered.reading.terms.some((term) => term.key === "call-raised" && term.value > 0)).toBe(true);
  });
});

// An alliance deters by the governments it would bring into the war, read
// from the same forecast a war already on the board is read with.
describe("what the victim's allies put in an attacker's way", () => {
  it("names the governments likely to come in beside an alliance member, only when asked", () => {
    const { campaign } = foundedForBalance("deterrence-allies");
    const plain = assessDeterrence(campaign, RUS, EST);
    expect(plain.expectedJoiners).toBeUndefined();
    const asked = assessDeterrence(campaign, RUS, EST, { expectJoiners: true });
    expect(asked.expectedJoiners!.length).toBeGreaterThan(0);
    expect(asked.alliedSeverity!).toBeGreaterThan(0);
    expect(asked.summary).toContain("likely to come into the war beside the defender");
    expect(asked.retaliationSeverity).toBe(plain.retaliationSeverity);
  });

  it("reads fewer likely allies for a victim that sits in no alliance with them", () => {
    const { campaign } = foundedForBalance("deterrence-allies");
    const member = assessDeterrence(campaign, RUS, EST, { expectJoiners: true });
    const outsider = assessDeterrence(campaign, RUS, "UKR" as NationId, { expectJoiners: true });
    expect(outsider.expectedJoiners!.length).toBeLessThan(member.expectedJoiners!.length);
  });
});

describe("danger at home", () => {
  it("reads the same danger the agent's survival drive does, for every government on the board", () => {
    const { campaign } = foundedForBalance("war-1");
    for (const runtime of Object.values(campaign.nations)) {
      expect(regimeDanger(runtime)).toBeCloseTo(Math.max(0, -regimeSurvivalDrive(runtime)), 12);
    }
  });
});
