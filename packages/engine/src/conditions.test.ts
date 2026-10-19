import { describe, expect, it } from "vitest";
import { Nation, STATE_DISASTER_ELIGIBILITY, type NationId } from "@admin/world";
import { makeCampaignSeed } from "./rng.js";
import { buildCampaign, nationA, nationB } from "./__fixtures__/campaign.js";
import {
  UNTARGETED_ORDER_ATTENTION,
  conditionAttention,
  conditionFlag,
  conditionPhase,
  conditionRecoveryRate,
  MAX_NEW_CONDITIONS_PER_TURN,
  MAX_NEW_HOME_CONDITIONS_PER_TURN,
} from "./conditions.js";
import { openConflict } from "./conflicts.js";
import { apply } from "./effects.js";
import type { PolicyDomain } from "./policy.js";
import {
  hasFlag,
  selectActiveConditions,
  selectConditionsFor,
  type Campaign,
  type ConditionScope,
  type NationCondition,
} from "./state.js";

const USA = nationA.id;
const ALP = nationB.id;

function withExposure(campaign: Campaign, nation: NationId, exposure: Record<string, number>): Campaign {
  const runtime = campaign.nations[nation]!;
  return {
    ...campaign,
    nations: {
      ...campaign.nations,
      [nation]: {
        ...runtime,
        base: Nation.parse({ ...runtime.base, geo: { ...runtime.base.geo, disasterExposure: exposure } }),
      },
    },
  };
}

function withCondition(campaign: Campaign, condition: NationCondition): Campaign {
  return { ...campaign, conditions: { ...campaign.conditions, [condition.id]: condition } };
}

function condition(overrides: Partial<NationCondition> = {}): NationCondition {
  return {
    id: "condition:flood:USA:1",
    nation: USA,
    kind: "flood",
    scope: "nation",
    severity: 0.6,
    startedTurn: 1,
    status: "active",
    beats: [{ turn: 1, description: "United States is struck by flooding nationwide." }],
    ...overrides,
  };
}


// The fixture seats one chair, so no domain is legislable in it and no
// government founded on it can be asked about a department it has no minister
// for. A test about attention has to seat the ministers first.
const CHAIRS: Readonly<Record<string, string>> = {
  fiscal: "role-treasury-minister",
  industry: "role-treasury-minister",
  civil: "role-interior-minister",
  security: "role-intelligence-director",
};

function seating(campaign: Campaign, domains: readonly PolicyDomain[]): Campaign {
  const holder = Object.values(campaign.founding.cabinet)[0]!;
  const seats = Object.fromEntries(domains.map((domain) => [CHAIRS[domain]!, holder]));
  return { ...campaign, founding: { ...campaign.founding, cabinet: { ...campaign.founding.cabinet, ...seats } } };
}

function running(campaign: Campaign, stances: Readonly<Partial<Record<PolicyDomain, string>>>): Campaign {
  return { ...campaign, player: { ...campaign.player, policies: { ...campaign.player.policies, ...stances } } };
}

function runPhase(state: Campaign): Campaign {
  return conditionPhase(state).reduce((acc, packet) => apply(acc, packet), state);
}

function advance(state: Campaign, turns: number): Campaign {
  let working = state;
  for (let i = 0; i < turns; i++) {
    working = { ...runPhase(working), turn: working.turn + 1 };
  }
  return working;
}

describe("onset", () => {
  it("reads the nation's authored exposure — an unexposed country never suffers that disaster", () => {
    // The fixture authors no exposure at all, so nothing geographic may open.
    const quiet = advance(buildCampaign(), 60);
    const geographic = Object.values(quiet.conditions).filter((c) => c.kind !== "unrest");
    expect(geographic).toHaveLength(0);
  });

  it("opens the kinds the country is actually exposed to", () => {
    const exposed = withExposure(buildCampaign(), USA, { flood: 1, earthquake: 1 });
    const after = advance(exposed, 60);
    const kinds = new Set(Object.values(after.conditions).map((c) => c.kind));

    expect(kinds.has("flood") || kinds.has("earthquake")).toBe(true);
    for (const opened of Object.values(after.conditions)) {
      if (opened.kind === "unrest") continue;
      expect(opened.nation).toBe(USA);
      expect(["flood", "earthquake"]).toContain(opened.kind);
    }
  });

  it("never opens two floods in the same place at once", () => {
    const exposed = withExposure(buildCampaign(), USA, { flood: 1 });
    const after = advance(exposed, 60);
    const places = selectActiveConditions(after)
      .filter((c) => c.kind === "flood")
      .map((c) => `${c.nation}:${c.city ?? c.state ?? "nation"}`);
    expect(new Set(places).size).toBe(places.length);
  });

  it("holds the week's onsets to a legible number", () => {
    let exposed = withExposure(buildCampaign(), USA, { flood: 1, earthquake: 1, drought: 1, cyclone: 1 });
    exposed = withExposure(exposed, ALP, { flood: 1, earthquake: 1, drought: 1, cyclone: 1 });
    for (let turn = 0; turn < 30; turn++) {
      const before = selectActiveConditions(exposed).length;
      const after = runPhase(exposed);
      const opened = selectActiveConditions(after).filter((c) => c.startedTurn === exposed.turn);
      expect(opened.filter((c) => c.nation === USA).length).toBeLessThanOrEqual(MAX_NEW_HOME_CONDITIONS_PER_TURN);
      expect(opened.filter((c) => c.nation !== USA).length).toBeLessThanOrEqual(MAX_NEW_CONDITIONS_PER_TURN);
      expect(selectActiveConditions(after).length - before).toBeLessThanOrEqual(
        MAX_NEW_CONDITIONS_PER_TURN + MAX_NEW_HOME_CONDITIONS_PER_TURN,
      );
      exposed = { ...after, turn: after.turn + 1 };
    }
  });

  it("gives the country the player governs a draw the rest of the world cannot spend", () => {
    // One global onset queue ordered by nation id puts the home nation near its
    // end, where the week's budget is routinely gone before the queue reaches
    // it, which makes a bad week at home a function of how sick fifty other
    // capitals happen to be. Same home country, same
    // seed, a world that is perfectly well against a world falling apart: what
    // opens at home has to be identical in both.
    const home = { flood: 1, drought: 1, cyclone: 1 };
    const quietWorld = withExposure(withExposure(buildCampaign(), USA, home), ALP, {});
    const sickWorld = withExposure(withExposure(buildCampaign(), USA, home), ALP, {
      flood: 1,
      earthquake: 1,
      drought: 1,
      cyclone: 1,
      wildfire: 1,
      pandemic: 1,
    });

    const homeConditions = (state: Campaign): readonly string[] =>
      Object.values(advance(state, 40).conditions)
        .filter((condition) => condition.nation === USA)
        .map((condition) => `${condition.kind}:${condition.startedTurn}:${condition.scope}`)
        .sort();

    const quiet = homeConditions(quietWorld);
    expect(quiet.length).toBeGreaterThan(0);
    expect(homeConditions(sickWorld)).toEqual(quiet);
  });

  it("raises a country's unrest risk while it is at war", () => {
    const restive = (campaign: Campaign): Campaign => ({
      ...campaign,
      nations: {
        ...campaign.nations,
        [USA]: {
          ...campaign.nations[USA]!,
          stats: {
            ...campaign.nations[USA]!.stats,
            politics: { ...campaign.nations[USA]!.stats.politics, protestPressure: 0.9, legitimacy: 0.2 },
          },
        },
      },
    });
    const peace = restive(buildCampaign());
    const war = (() => {
      const conflict = openConflict(ALP, USA, peace.turn, "ALP invades USA");
      return { ...peace, conflicts: { [conflict.id]: conflict } };
    })();

    // A single campaign proves nothing about a probability: the same seed can
    // hand both worlds the same draw. Summed over seeds, unrest reaching the
    // streets sooner in the country at war is the claim, and it is testable.
    const turnsUntilUnrest = (start: Campaign, seed: string): number => {
      let working: Campaign = { ...start, seed: makeCampaignSeed(seed) };
      for (let turn = 0; turn < 40; turn++) {
        working = { ...runPhase(working), turn: working.turn + 1 };
        if (Object.values(working.conditions).some((c) => c.kind === "unrest" && c.nation === USA)) return turn;
      }
      return 40;
    };
    const seeds = Array.from({ length: 12 }, (_, index) => `unrest-seed-${index}`);
    const total = (start: Campaign) => seeds.reduce((sum, seed) => sum + turnsUntilUnrest(start, seed), 0);

    expect(total(war)).toBeLessThan(total(peace));
  });

  it("pins a US city-scoped disaster to a dataset city and its state", () => {
    for (let index = 0; index < 24; index++) {
      const exposed = withExposure(
        { ...buildCampaign(), seed: makeCampaignSeed(`us-place-${index}`) },
        USA,
        { flood: 1 },
      );
      const after = advance(exposed, 80);
      const cityScoped = Object.values(after.conditions).find(
        (opened) => opened.kind === "flood" && opened.scope === "city",
      );
      if (!cityScoped) continue;
      expect(cityScoped.city).toBeDefined();
      expect(cityScoped.state).toBeDefined();
      expect(after.cities[cityScoped.city!]?.base.state).toBe(cityScoped.state);
      return;
    }
    throw new Error("no city-scoped US flood opened across 24 seeds");
  });

  it("only places a disaster in a state genuinely eligible for that kind — never a wildfire in Rhode Island", () => {
    const eligible = new Set(STATE_DISASTER_ELIGIBILITY.wildfire);
    expect(eligible.has("RI")).toBe(false); // sanity: the case this test exists to catch

    let sawRegionScoped = 0;
    for (let index = 0; index < 40; index++) {
      const exposed = withExposure(
        { ...buildCampaign(), seed: makeCampaignSeed(`wildfire-place-${index}`) },
        USA,
        { wildfire: 1 },
      );
      const after = advance(exposed, 80);
      for (const opened of Object.values(after.conditions)) {
        if (opened.kind !== "wildfire") continue;
        if (opened.state) {
          sawRegionScoped++;
          expect(eligible.has(opened.state)).toBe(true);
        }
        if (opened.city) {
          expect(eligible.has(after.cities[opened.city]!.base.state!)).toBe(true);
        }
      }
    }
    expect(sawRegionScoped).toBeGreaterThan(0);
  });

  it("a standing condition (unrest) is not geography-gated — any state can carry the grievance", () => {
    // Standing conditions have no disaster-eligibility list at all; this just
    // confirms placement still runs for them without throwing or excluding
    // states, unlike an acute (disaster) kind.
    const restive = {
      ...buildCampaign(),
      nations: {
        ...buildCampaign().nations,
        [USA]: {
          ...buildCampaign().nations[USA]!,
          stats: {
            ...buildCampaign().nations[USA]!.stats,
            politics: { ...buildCampaign().nations[USA]!.stats.politics, protestPressure: 0.95, legitimacy: 0.1 },
          },
        },
      },
    };
    const after = advance(restive, 40);
    const unrest = Object.values(after.conditions).find((c) => c.kind === "unrest" && c.nation === USA);
    expect(unrest).toBeDefined();
  });
});

describe("living through one", () => {
  it("takes something out of the country every week it runs", () => {
    const before = withCondition(buildCampaign(), condition());
    const after = runPhase(before);
    const stats = after.nations[USA]!.stats;

    expect(stats.politics.regimeStability).toBeLessThan(before.nations[USA]!.stats.politics.regimeStability);
    expect(stats.politics.protestPressure).toBeGreaterThan(before.nations[USA]!.stats.politics.protestPressure);
    expect(stats.economy.reserves).toBeLessThan(before.nations[USA]!.stats.economy.reserves);
  });

  it("does not move growth, inflation or unemployment itself — that is macroDriftPhase's to write", () => {
    // Law 8. A condition that writes the macro stats is one that can feed its
    // own onset, so growth, inflation and unemployment have exactly one
    // writer and a condition states its pressure rather than applying it.
    // The pressure is real: macro.test.ts asserts the same condition moves
    // all three once the phase that owns them has run.
    const before = withCondition(buildCampaign(), condition());
    const after = runPhase(before);
    expect(after.nations[USA]!.stats.economy.growth).toBe(before.nations[USA]!.stats.economy.growth);
    expect(after.nations[USA]!.stats.economy.inflation).toBe(before.nations[USA]!.stats.economy.inflation);
    expect(after.nations[USA]!.stats.economy.unemployment).toBe(before.nations[USA]!.stats.economy.unemployment);
  });

  it("costs the player's own metrics when it is their country", () => {
    const before = withCondition(buildCampaign(), condition());
    const after = runPhase(before);
    expect(after.player.metrics.stability).toBeLessThan(before.player.metrics.stability);
    expect(after.player.metrics.treasury).toBeLessThan(before.player.metrics.treasury);
  });

  it("scales its bite by how much of the country is inside it", () => {
    const stabilityAfter = (scope: ConditionScope): number =>
      runPhase(withCondition(buildCampaign(), condition({ scope }))).nations[USA]!.stats.politics.regimeStability;

    expect(stabilityAfter("city")).toBeGreaterThan(stabilityAfter("region"));
    expect(stabilityAfter("region")).toBeGreaterThan(stabilityAfter("nation"));
  });

  it("reports itself to the player and journals the week", () => {
    const after = runPhase(withCondition(buildCampaign(), condition()));
    expect(after.feed.some((item) => item.kind === "condition" && item.target === USA)).toBe(true);
    expect(after.ledger.at(-1)!.actor).toBe("world");
  });

  it("keeps every stat it writes inside the dataset's own ranges", () => {
    const severe = withCondition(buildCampaign(), condition({ severity: 1 }));
    const after = advance(severe, 25);
    const stats = after.nations[USA]!.stats;

    expect(stats.economy.growth).toBeGreaterThanOrEqual(-0.3);
    expect(stats.politics.regimeStability).toBeGreaterThanOrEqual(0);
    expect(stats.politics.protestPressure).toBeLessThanOrEqual(1);
    expect(stats.economy.reserves).toBeGreaterThanOrEqual(0);
  });
});

describe("resolution", () => {
  it("ends once it has burned out, and says so", () => {
    const spent = withCondition(buildCampaign(), condition({ severity: 0.01 }));
    const after = runPhase(spent);
    const resolved = Object.values(after.conditions)[0]!;

    expect(resolved.status).toBe("resolved");
    expect(resolved.endedTurn).toBe(spent.turn);
    expect(resolved.beats.at(-1)!.description).toMatch(/over/i);
    expect(selectConditionsFor(after, USA)).toHaveLength(0);
  });

  it("does not leave its gate flag standing for authored content to read", () => {
    const active = apply(withCondition(buildCampaign(), condition({ severity: 0.01 })), {
      source: "simulate",
      actor: "world",
      turn: 1,
      narration: { summary: "The flood begins." },
      effects: [{ kind: "flag", set: [conditionFlag("flood", USA)] }],
    });
    expect(hasFlag(active, conditionFlag("flood", USA))).toBe(true);
    expect(hasFlag(runPhase(active), conditionFlag("flood", USA))).toBe(false);
  });

  it("sets that flag the week it opens", () => {
    const exposed = withExposure(buildCampaign(), USA, { flood: 1 });
    const after = advance(exposed, 60);
    for (const opened of selectActiveConditions(after)) {
      expect(hasFlag(after, conditionFlag(opened.kind, opened.nation))).toBe(true);
    }
  });

  it("is a pure function of the seed", () => {
    const start = withExposure(buildCampaign(), USA, { flood: 1, drought: 1 });
    expect(advance(start, 20)).toEqual(advance(start, 20));
  });
});

describe("attention", () => {
  const governing = (campaign: Campaign) =>
    running(seating(campaign, ["fiscal", "civil"]), { fiscal: "fiscal-investment", civil: "civil-open-society" });
  const inheriting = (campaign: Campaign) => seating(campaign, ["fiscal", "civil"]);

  it("leaves a flood nobody is working still running long after an attended one is over", () => {
    // One seed, one condition, one difference: the same weekly draws reach both
    // countries, so the gap between them is the government and nothing else.
    const start = withCondition(buildCampaign(), condition({ severity: 0.6 }));
    const attended = advance(governing(start), 12);
    const ignored = advance(inheriting(start), 12);

    // Twelve weeks in, the same flood is over for the government that took
    // hold of the treasury and the interior, and is still most of what it was
    // for the one that changed nothing.
    expect(selectConditionsFor(attended, USA).filter((c) => c.kind === "flood")).toHaveLength(0);
    const stillRunning = selectConditionsFor(ignored, USA).find((c) => c.kind === "flood");
    expect(stillRunning?.severity).toBeGreaterThan(0.3);
  });

  it("costs the country every week nobody is on it", () => {
    const start = withCondition(buildCampaign(), condition({ severity: 0.6 }));
    const attended = advance(governing(start), 12);
    const ignored = advance(inheriting(start), 12);

    expect(ignored.nations[USA]!.stats.politics.regimeStability).toBeLessThan(
      attended.nations[USA]!.stats.politics.regimeStability,
    );
    expect(ignored.player.metrics.stability).toBeLessThan(attended.player.metrics.stability);
  });

  it("credits half a rate to a government running one of the two departments answerable", () => {
    const start = withCondition(buildCampaign(), condition());
    const partial = running(seating(start, ["fiscal", "civil"]), { fiscal: "fiscal-investment" });

    expect(conditionAttention(inheriting(start), condition())).toBe(0);
    expect(conditionAttention(partial, condition())).toBe(0.5);
    expect(conditionAttention(governing(start), condition())).toBe(1);
    expect(conditionRecoveryRate(0)).toBeLessThan(conditionRecoveryRate(0.5));
    expect(conditionRecoveryRate(0.5)).toBeLessThan(conditionRecoveryRate(1));
  });

  it("asks a different pair of departments about the street than about a flood", () => {
    const start = buildCampaign();
    const interiorOnly = running(seating(start, ["fiscal", "civil", "security"]), { civil: "civil-public-order" });
    const treasuryOnly = running(seating(start, ["fiscal", "civil", "security"]), { fiscal: "fiscal-austerity" });
    const unrest = condition({ kind: "unrest" });

    expect(conditionAttention(interiorOnly, unrest)).toBe(0.5);
    expect(conditionAttention(treasuryOnly, unrest)).toBe(0);
    expect(conditionAttention(treasuryOnly, condition())).toBe(0.5);
  });

  it("does not hold a government to a ministry its charter never gave it", () => {
    // The fixture charter seats a chancellor and nobody else. A president with
    // no treasury and no interior has not neglected a flood by having neither.
    expect(conditionAttention(buildCampaign(), condition())).toBe(1);
  });

  it("asks the question only of the government it models", () => {
    const abroad = condition({ id: "condition:flood:ALP:1", nation: ALP });
    expect(conditionAttention(inheriting(buildCampaign()), abroad)).toBe(1);
  });

  it("credits a signed order partly, but no longer as if it were aimed here", () => {
    // It used to return a flat 1: any order at all, on any subject, bought
    // every condition in the country the fully-attended recovery rate, so
    // tightening border controls eased a flood in Michigan. A government
    // visibly governing is not absent, but it is not on this file either.
    const start = inheriting(buildCampaign());
    const signed: Campaign = {
      ...start,
      turn: start.turn + 1,
      orders: [{ id: "order-1:1", order: "order-1", turn: start.turn, contested: false, challengeChance: 0.1 }],
    };
    expect(conditionAttention(signed, condition())).toBe(UNTARGETED_ORDER_ATTENTION);
  });

  it("does not credit an order signed a season ago", () => {
    const start = inheriting(buildCampaign());
    const stale: Campaign = {
      ...start,
      turn: start.turn + 20,
      orders: [{ id: "order-1:1", order: "order-1", turn: start.turn, contested: false, challengeChance: 0.1 }],
    };
    expect(conditionAttention(stale, condition())).toBe(0);
  });
});
