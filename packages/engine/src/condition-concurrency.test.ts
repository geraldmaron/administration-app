// Two acute conditions of one kind may run in different places. Ending one
// clears that place's flag only; the nation flag stays until the last one ends.

import { describe, expect, it } from "vitest";
import { Nation, type NationId } from "@admin/world";
import { nationA, buildCampaign } from "./__fixtures__/campaign.js";
import { conditionPhase } from "./conditions.js";
import {
  conditionFlag,
  conditionFlagsToSet,
  conditionId,
  onsetCandidates,
  openCondition,
  type OnsetCandidate,
} from "./condition-onset.js";
import { apply } from "./effects.js";
import { createRngStreams, type RngStream } from "./rng.js";
import { hasFlag, selectActiveConditions, type Campaign, type NationCondition } from "./state.js";

const USA = nationA.id;

function scripted(values: readonly number[]): { readonly stream: RngStream; readonly reads: () => number } {
  let cursor = 0;
  const next = (): number => {
    const value = values[cursor] ?? 0;
    cursor += 1;
    return value;
  };
  return {
    reads: () => cursor,
    stream: {
      key: "scripted",
      next,
      nextInt(min, max) {
        return min + Math.floor(next() * (max - min));
      },
      pick(items) {
        return items[Math.min(items.length - 1, Math.floor(next() * items.length))]!;
      },
    },
  };
}

function withExposure(campaign: Campaign, exposure: Record<string, number>): Campaign {
  const runtime = campaign.nations[USA]!;
  return {
    ...campaign,
    nations: {
      ...campaign.nations,
      [USA]: {
        ...runtime,
        base: Nation.parse({ ...runtime.base, geo: { ...runtime.base.geo, disasterExposure: exposure } }),
      },
    },
  };
}

function store(campaign: Campaign, condition: NationCondition): Campaign {
  return { ...campaign, conditions: { ...campaign.conditions, [condition.id]: condition } };
}

const WILDFIRE: OnsetCandidate = { nation: USA, kind: "wildfire", chance: 1 };

// 0.85 is a region at home: the home scope draw puts city under 0.78 and region
// under 0.95, so most of what strikes the country is one city.
function regionWildfire(campaign: Campaign, placeRoll: number): NationCondition {
  return openCondition(campaign, WILDFIRE, scripted([0.85, 0, placeRoll]).stream);
}

function placeFlag(state: string): string {
  return `condition:wildfire:${USA}:${state}`;
}

const NATION_FLAG = "condition:wildfire:USA";

function stage(campaign: Campaign, conditions: readonly NationCondition[]): Campaign {
  const stored = conditions.reduce((acc, condition) => ({ ...acc, [condition.id]: condition }), campaign.conditions);
  const flags = conditions.flatMap((condition) => conditionFlagsToSet(condition));
  return apply(
    { ...campaign, conditions: stored },
    {
      source: "simulate",
      actor: "world",
      turn: campaign.turn,
      narration: { summary: "Wildfires are burning." },
      effects: [{ kind: "flag", set: [...new Set(flags)] }],
    },
  );
}

/** A turn whose condition stream eases a 0.01 severity acute condition under the resolve line. */
function turnThatEnds(campaign: Campaign, id: string): number {
  const streams = createRngStreams(campaign.seed);
  for (let turn = 1; turn < 1000; turn += 1) {
    const draw = streams.stream("condition", id, turn).next();
    const drift = 0.01 + (draw - 0.5) * 0.25 - 0.02;
    if (drift < 0.08) return turn;
  }
  throw new Error(`no resolving turn for ${id}`);
}

function burnOut(campaign: Campaign, id: string): Campaign {
  const turn = turnThatEnds(campaign, id);
  const condition = campaign.conditions[id];
  if (!condition) throw new Error(`missing ${id}`);
  const primed = {
    ...campaign,
    turn,
    conditions: { ...campaign.conditions, [id]: { ...condition, severity: 0.01 } },
  };
  return conditionPhase(primed).reduce((state, packet) => apply(state, packet), primed);
}

describe("two wildfires at once", () => {
  it("keeps the nation flag string and the old condition id", () => {
    expect(conditionFlag("wildfire", USA)).toBe(NATION_FLAG);
    expect(conditionId("wildfire", USA, 4)).toBe("condition:wildfire:USA:4");
  });

  it("offers another wildfire while one is already burning, and still refuses a second unrest", () => {
    const open = buildCampaign();
    const burning = regionWildfire(open, 0);
    const exposed = withExposure(store(open, burning), { wildfire: 1 });
    expect(onsetCandidates(exposed).some((candidate) => candidate.nation === USA && candidate.kind === "wildfire")).toBe(true);

    const unrest: NationCondition = {
      id: "condition:unrest:USA:1",
      nation: USA,
      kind: "unrest",
      scope: "nation",
      severity: 0.6,
      startedTurn: 1,
      status: "active",
      beats: [{ turn: 1, description: "The streets are up." }],
    };
    expect(onsetCandidates(open).some((candidate) => candidate.nation === USA && candidate.kind === "unrest")).toBe(true);
    expect(onsetCandidates(store(open, unrest)).some((candidate) => candidate.nation === USA && candidate.kind === "unrest")).toBe(false);
  });

  it("opens two wildfires in different states and does not open a second one on the same state", () => {
    const open = buildCampaign();
    const first = regionWildfire(open, 0);
    const later = { ...store(open, first), turn: open.turn + 1 };
    const second = regionWildfire(later, 0.99);
    expect(first.state).toBeTruthy();
    expect(first.city).toBeUndefined();
    expect(second.state).toBeTruthy();
    expect(second.state).not.toBe(first.state);
    // The place is in the id, which is what lets two of one kind be open in one
    // country in one week rather than only across two.
    expect(second.id).toBe(`condition:wildfire:${USA}:${later.turn}:${second.state}`);
    expect(second.place).toBe(second.state);
    expect(selectActiveConditions(store(later, second)).filter((condition) => condition.kind === "wildfire")).toHaveLength(2);

    const planted = { ...first, severity: 0.55 };
    const occupied = store(open, planted);
    const again = scripted([0.85, 0, 0]);
    const repeat = openCondition(occupied, WILDFIRE, again.stream);
    expect(again.reads()).toBe(3);
    expect(repeat.severity).toBe(0.55);
    expect(repeat.id).toBe(planted.id);
    expect(Object.keys(occupied.conditions).filter((id) => id.startsWith("condition:wildfire:"))).toEqual([planted.id]);
  });

  it("clears only the place that ended, and the nation flag when the last wildfire ends", () => {
    const open = buildCampaign();
    const first = { ...regionWildfire(open, 0), severity: 0.6 };
    const later = { ...store(open, first), turn: open.turn + 1 };
    const second = { ...regionWildfire(later, 0.99), severity: 0.6 };
    expect(first.state).toBeTruthy();
    expect(second.state).not.toBe(first.state);
    expect(conditionFlagsToSet(first)).toEqual([NATION_FLAG, placeFlag(first.state!)]);
    expect(conditionFlagsToSet(second)).toEqual([NATION_FLAG, placeFlag(second.state!)]);

    const both = stage(open, [first, second]);
    expect(hasFlag(both, NATION_FLAG)).toBe(true);
    expect(hasFlag(both, placeFlag(first.state!))).toBe(true);
    expect(hasFlag(both, placeFlag(second.state!))).toBe(true);

    const oneLeft = burnOut(both, first.id);
    const ended = oneLeft.conditions[first.id]!;
    const still = oneLeft.conditions[second.id]!;
    expect(ended.status).toBe("resolved");
    expect(still.status).toBe("active");
    expect(hasFlag(oneLeft, placeFlag(first.state!))).toBe(false);
    expect(hasFlag(oneLeft, placeFlag(second.state!))).toBe(true);
    expect(hasFlag(oneLeft, NATION_FLAG)).toBe(true);

    const none = burnOut(oneLeft, second.id);
    expect(none.conditions[second.id]!.status).toBe("resolved");
    expect(hasFlag(none, placeFlag(second.state!))).toBe(false);
    expect(hasFlag(none, NATION_FLAG)).toBe(false);
  });

  it("resolves a save that stored the old nation flag and the old condition id", () => {
    const open = buildCampaign();
    const legacy: NationCondition = {
      id: "condition:wildfire:USA:4",
      nation: USA as NationId,
      kind: "wildfire",
      scope: "nation",
      severity: 0.6,
      startedTurn: 4,
      status: "active",
      beats: [{ turn: 4, description: "United States is struck by wildfires nationwide." }],
    };
    const stateFire = { ...regionWildfire(open, 0), severity: 0.6 };
    const both = stage(open, [legacy, stateFire]);
    expect(hasFlag(both, NATION_FLAG)).toBe(true);

    const stateStill = burnOut(both, legacy.id);
    expect(stateStill.conditions[legacy.id]!.status).toBe("resolved");
    expect(stateStill.conditions[legacy.id]!.id).toBe("condition:wildfire:USA:4");
    expect(stateStill.conditions[stateFire.id]!.status).toBe("active");
    expect(hasFlag(stateStill, NATION_FLAG)).toBe(true);
    expect(hasFlag(stateStill, placeFlag(stateFire.state!))).toBe(true);

    const clear = burnOut(stateStill, stateFire.id);
    expect(clear.conditions[stateFire.id]!.status).toBe("resolved");
    expect(hasFlag(clear, NATION_FLAG)).toBe(false);
  });
});
