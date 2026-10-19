import { describe, expect, it } from "vitest";
import { debtToGdp, worldDataset } from "@admin/world";
import type { NationId } from "@admin/world";
import { buildCampaign, nationA, nationB } from "./__fixtures__/campaign.js";
import {
  GOVERNANCE_REVIEW_INTERVAL,
  audienceCost,
  chooseGovernmentProgram,
  governancePhase,
  governmentCharacter,
  governmentQuality,
  openingGovernments,
  programRestingOffset,
  purseStrain,
  ratificationDrag,
  regimeSurvivalDrive,
  reviewsProgramThisTurn,
  scoreDomain,
  selectGovernment,
  selectGovernmentStance,
  worldNorms,
} from "./governance.js";
import { apply } from "./effects.js";
import { FISCAL_PROGRAM_SHIFTS } from "./fiscal-impulse.js";
import { POLICY_DOMAINS, POLICY_STAT_RANGES, policyStance, policyStatBounds, policyStatValue, type PolicyStatPath } from "./policy.js";
import { selectFeed, selectNation, type Campaign, type NationRuntime } from "./state.js";

const USA = nationA.id;
const ALP = nationB.id;

const worldRuntimes = Object.fromEntries(
  worldDataset.nations.map((nation) => [nation.id, { base: nation, stats: nation.stats, traits: nation.traits }]),
) as Record<NationId, NationRuntime>;

function governed(campaign: Campaign): Campaign {
  return { ...campaign, governments: openingGovernments(campaign.nations, campaign.founding.nation) };
}

function runPhase(state: Campaign): Campaign {
  return governancePhase(state).reduce((acc, packet) => apply(acc, packet), state);
}

function advance(state: Campaign, turns: number): Campaign {
  let working = state;
  for (let index = 0; index < turns; index++) {
    working = { ...runPhase(working), turn: working.turn + 1 };
  }
  return working;
}

// The whole point of the module: fifty countries that were governed identically
// — by nobody, on continuity, forever — now govern differently from each other.
// A model that produced one program for the world would be the same scenery
// with more code behind it.
describe("the world's governments", () => {
  it("gives the authored world a spread of programs rather than one", () => {
    const governments = openingGovernments(worldRuntimes, USA);
    const distinct = new Set(Object.values(governments).map((program) => JSON.stringify(program)));
    expect(Object.keys(governments).length).toBe(worldDataset.nations.length - 1);
    expect(distinct.size).toBeGreaterThan(10);
  });

  it("splits every domain the dataset gives it grounds to split", () => {
    const governments = Object.values(openingGovernments(worldRuntimes, USA));
    const everything = new Set<string>();
    for (const domain of POLICY_DOMAINS) {
      const held = new Set(governments.map((program) => program[domain]));
      for (const stance of held) everything.add(stance);
      // Two is the floor a domain has to clear to be a decision at all. Where
      // the world holds only two, that is the dataset speaking rather than the
      // model: trade splits weakly because the authored world is almost
      // uniformly low-isolationism, and open markets beat protection on every
      // stat path for a state that is not nationalist. The model reaches the
      // fourth stance in a domain when a nation's condition argues for it (the
      // protective-tariff case below), not on a schedule.
      expect(held.size, `${domain} holds ${held.size} distinct stances`).toBeGreaterThanOrEqual(2);
    }
    // Across the whole board, most of the catalogue is in use — a world running
    // six programs out of twenty-four would be a model with a favorite.
    expect(everything.size).toBeGreaterThanOrEqual(14);
  });

  it("does not leave the player's own nation to be governed by the world", () => {
    const governments = openingGovernments(worldRuntimes, USA);
    expect(governments[USA]).toBeUndefined();
  });

  it("chooses the same program twice from the same nation — no rng, no drift on replay", () => {
    const norms = worldNorms(worldRuntimes);
    for (const runtime of Object.values(worldRuntimes).slice(0, 8)) {
      expect(chooseGovernmentProgram(runtime, norms)).toEqual(chooseGovernmentProgram(runtime, norms));
    }
  });
});

// The two readings the choice is built from, checked directly: a model that
// scored well in aggregate while reading a state backwards would be a
// coincidence rather than a mechanism.
describe("what a government is reading", () => {
  it("reads a closed state as authoritarian and an open one as not", () => {
    const closed = {
      ...worldRuntimes[USA]!,
      stats: { ...worldRuntimes[USA]!.stats, politics: { ...worldRuntimes[USA]!.stats.politics, pressFreedom: 0.05 } },
      traits: { ...worldRuntimes[USA]!.traits, transparency: 0.05, legalism: 0.1 },
    };
    const open = {
      ...closed,
      stats: { ...closed.stats, politics: { ...closed.stats.politics, pressFreedom: 0.95 } },
      traits: { ...closed.traits, transparency: 0.9, legalism: 0.9 },
    };
    expect(governmentCharacter(closed).authLibertarian).toBeGreaterThan(0.5);
    expect(governmentCharacter(open).authLibertarian).toBeLessThan(-0.5);
  });

  it("reaches protective tariffs for the nationalist, unemployed state the authored world happens to lack", () => {
    const base = worldRuntimes[USA]!;
    const inward: NationRuntime = {
      ...base,
      stats: {
        ...base.stats,
        economy: { ...base.stats.economy, unemployment: 0.3, inflation: 0.01 },
        softPower: { ...base.stats.softPower, diplomaticReach: 0.05 },
      },
      traits: { ...base.traits, isolationism: 0.95 },
    };
    const norms = worldNorms({ ...worldRuntimes, [USA]: inward });
    expect(scoreDomain(inward, "trade", norms)[0]!.stance.id).toBe("trade-protective");
  });

  it("delivers less from a corrupt, illegitimate government than from a clean one", () => {
    const base = worldRuntimes[USA]!;
    const captured = {
      ...base,
      stats: {
        ...base.stats,
        security: { ...base.stats.security, corruptionIndex: 0.9 },
        politics: { ...base.stats.politics, legitimacy: 0.2 },
      },
    };
    const clean = {
      ...base,
      stats: {
        ...base.stats,
        security: { ...base.stats.security, corruptionIndex: 0.05 },
        politics: { ...base.stats.politics, legitimacy: 0.9 },
      },
    };
    expect(governmentQuality(captured)).toBeLessThan(governmentQuality(clean));
    // The same band the player's ministers are scored on, not a second one.
    expect(governmentQuality(captured)).toBeGreaterThanOrEqual(0.6);
    expect(governmentQuality(clean)).toBeLessThanOrEqual(1.4);
  });

  it("judges a nation against the world's spread, not against the schema's", () => {
    // Unemployment is authored in a narrow band inside a 0..1 schema range. A
    // nation at the top of the world's band must read as urgent, which it
    // cannot if the reference is a range nobody occupies.
    const norms = worldNorms(worldRuntimes);
    const [low, high] = norms["economy.unemployment" as PolicyStatPath];
    expect(high - low).toBeLessThan(POLICY_STAT_RANGES["economy.unemployment"][1]);
    expect(high).toBeGreaterThan(low);
  });
});

// The teeth, on somebody else's country. This is the gap C2b left open: the
// same per-turn stat movement the player's program makes, made by everyone.
describe("a week of the world governing", () => {
  it("moves a governed nation's own stats", () => {
    const start = governed(buildCampaign());
    const before = selectNation(start, ALP)!.stats;
    const after = selectNation(runPhase(start), ALP)!.stats;
    expect(after).not.toEqual(before);
  });

  it("leaves the player's nation to the player's own program", () => {
    const start = governed(buildCampaign());
    const before = selectNation(start, USA)!.stats;
    const after = selectNation(runPhase(start), USA)!.stats;
    expect(after).toEqual(before);
  });

  it("writes one ledger entry for the whole world's week, not one per country", () => {
    const start = governed(buildCampaign());
    const after = runPhase(start);
    expect(after.ledger.length).toBe(start.ledger.length + 1);
    expect(after.ledger.at(-1)!.actor).toBe("world");
  });

  it("keeps every stat inside its schema range over a long campaign", () => {
    const after = advance(governed(buildCampaign()), 60);
    for (const runtime of Object.values(after.nations)) {
      for (const path of Object.keys(POLICY_STAT_RANGES) as PolicyStatPath[]) {
        const [min, max] = policyStatBounds(runtime.stats, path);
        const value = policyStatValue(runtime.stats, path);
        expect(value, `${runtime.base.id} ${path}`).toBeGreaterThanOrEqual(min);
        expect(value, `${runtime.base.id} ${path}`).toBeLessThanOrEqual(max);
      }
    }
  });
});

// A government that re-legislated every week would be noise; one that never
// did would be the scenery this replaces.
describe("revisiting a program", () => {
  it("staggers reviews across the world instead of legislating in unison", () => {
    const turns = [...Array(GOVERNANCE_REVIEW_INTERVAL).keys()];
    const reviewingTurns = new Set(
      Object.keys(worldRuntimes).flatMap((nation) =>
        turns.filter((turn) => reviewsProgramThisTurn(nation as NationId, turn)),
      ),
    );
    expect(reviewingTurns.size).toBeGreaterThan(1);
  });

  it("holds a program steady between reviews", () => {
    const start = governed(buildCampaign());
    const quiet = (Object.keys(start.nations) as NationId[]).filter(
      (id) => id !== start.founding.nation && !reviewsProgramThisTurn(id, start.turn),
    );
    const after = runPhase(start);
    for (const nation of quiet) expect(selectGovernment(after, nation)).toEqual(selectGovernment(start, nation));
  });

  it("tells the player when a foreign government changes course, and only then", () => {
    let working = governed(buildCampaign());
    let changes = 0;
    for (let turn = 0; turn < GOVERNANCE_REVIEW_INTERVAL * 2; turn++) {
      const before = working;
      working = { ...runPhase(working), turn: working.turn + 1 };
      const newItems = selectFeed(working).slice(selectFeed(before).length);
      changes += newItems.length;
      for (const item of newItems) {
        expect(item.kind).toBe("governance");
        // A legislature is not a secret. Nothing here should ever arrive as an
        // intelligence read.
        expect(item.visibility).toBe("public");
        expect(item.headline).toMatch(/adopts .+ as its .+ program\.$/);
        expect(item.facts?.instrument).toMatch(/program$/);
        expect(item.facts?.stake?.length).toBeGreaterThan(0);
      }
    }
    // Openings are already the program each nation wants, so a change only
    // comes once the country underneath it has moved. What must not happen is
    // an unexplained change every week.
    expect(changes).toBeLessThan(GOVERNANCE_REVIEW_INTERVAL * 2);
  });
});

describe("reading a program back", () => {
  it("answers for the player's nation out of the player's own policies", () => {
    const campaign = governed(buildCampaign());
    expect(selectGovernment(campaign, USA)).toEqual(campaign.player.policies);
    expect(selectGovernmentStance(campaign, USA, "fiscal").domain).toBe("fiscal");
  });

  it("falls back to continuity for a nation with no program on record", () => {
    const campaign = buildCampaign();
    expect(selectGovernmentStance(campaign, ALP, "defense").inherited).toBe(true);
  });

  it("routes a nation-scoped policy effect to that government, not to the player's", () => {
    const start = governed(buildCampaign());
    const after = apply(start, {
      source: "simulate",
      actor: "world",
      turn: start.turn,
      narration: { summary: "A foreign legislature moves." },
      effects: [{ kind: "policy", nation: ALP, domain: "defense", stance: "defense-rearmament" }],
    });
    expect(selectGovernment(after, ALP).defense).toBe("defense-rearmament");
    expect(after.player.policies).toEqual(start.player.policies);
  });
});


describe("what kind of government this is", () => {
  const nationWith = (patch: Record<string, unknown>, stats: Record<string, unknown> = {}) => {
    const runtime = buildCampaign().nations[nationB.id]!;
    return {
      ...runtime,
      base: { ...runtime.base, ...patch },
      stats: { ...runtime.stats, ...stats },
    };
  };

  it("reads ratification drag off who can remove the government", () => {
    const byCharter = (charter: string) =>
      ratificationDrag(nationWith({ identity: { ...nationB.identity, government: charter } }));
    // A cabinet that can lose a confidence vote this week carries the most; a
    // throne and a junta answer to nobody they have to persuade in advance.
    expect(byCharter("charter-parliamentary-republic")).toBeGreaterThan(byCharter("charter-electoral-democracy"));
    expect(byCharter("charter-electoral-democracy")).toBeGreaterThan(byCharter("charter-presidential-republic"));
    expect(byCharter("charter-presidential-republic")).toBeGreaterThan(byCharter("charter-theocratic-council"));
    expect(byCharter("charter-theocratic-council")).toBeGreaterThan(byCharter("charter-military-junta"));
    expect(byCharter("charter-absolute-monarchy")).toBe(0);
  });

  it("reads no drag from a constitution this build does not carry", () => {
    // Not a silent zero: a charter nothing describes cannot be said to place a
    // body in the way, and inventing one would be a rule about a fiction.
    expect(ratificationDrag(nationWith({ identity: { ...nationB.identity, government: "charter-nobody-ships" } }))).toBe(0);
  });

  it("prices climbing down by who is watching at home", () => {
    const politics = buildCampaign().nations[nationB.id]!.stats.politics;
    const contested = audienceCost(
      nationWith({ partySystem: { contest: "multiparty", parties: [] } }, { politics: { ...politics, legitimacy: 0.3 } }),
    );
    const unchallenged = audienceCost(
      nationWith({ partySystem: { contest: "one-party", parties: [] } }, { politics: { ...politics, legitimacy: 0.9 } }),
    );
    expect(contested).toBeGreaterThan(unchallenged * 3);
  });

  it("sends a shaky government outward or inward by whether its elite holds together", () => {
    const politics = buildCampaign().nations[nationB.id]!.stats.politics;
    const united = regimeSurvivalDrive(nationWith({}, { politics: { ...politics, regimeStability: 0.1, factionalism: 0.05 } }));
    const split = regimeSurvivalDrive(nationWith({}, { politics: { ...politics, regimeStability: 0.1, factionalism: 0.95 } }));
    const secure = regimeSurvivalDrive(nationWith({}, { politics: { ...politics, regimeStability: 1, factionalism: 0.5 } }));
    expect(united).toBeGreaterThan(0);
    expect(split).toBeLessThan(0);
    expect(secure).toBe(0);
  });

  it("reads a country's position on the economy off its own tickets, not off its statistics", () => {
    const left = governmentCharacter(
      nationWith({
        partySystem: {
          contest: "multiparty",
          parties: [
            {
              id: "party-left",
              name: "The Labor Union",
              shortName: "LU",
              kind: "major",
              beliefs: { economicLeftRight: -0.8, authLibertarian: 0, nationalistGlobalist: 0 },
              cohesion: 0.9,
            },
          ],
        },
      }),
    );
    const none = governmentCharacter(nationWith({ partySystem: { contest: "none", parties: [] } }));
    expect(left.economicLeftRight).toBeLessThan(-0.5);
    // A country the dataset says runs no parties states no position, and that
    // is the reading rather than a stand-in for the middle.
    expect(none.economicLeftRight).toBe(0);
  });
});

describe("where a program nobody has adopted would rest the rates", () => {
  it("reads the override in place of the President's held stance, and nothing else", () => {
    const campaign = buildCampaign();
    const adopted: Campaign = { ...campaign, player: { ...campaign.player, policies: { ...campaign.player.policies, fiscal: "fiscal-investment" } } };
    expect(programRestingOffset(campaign, USA, { fiscal: "fiscal-investment" })).toEqual(programRestingOffset(adopted, USA));
    expect(programRestingOffset(campaign, USA, {})).toEqual(programRestingOffset(campaign, USA));
  });

  it("reads the override in place of a foreign government's held stance", () => {
    const campaign = buildCampaign();
    const held = selectGovernment(campaign, nationB.id);
    const adopted: Campaign = { ...campaign, governments: { ...campaign.governments, [nationB.id]: { ...held, fiscal: "fiscal-austerity" } } };
    const previewed = programRestingOffset(campaign, nationB.id, { fiscal: "fiscal-austerity" });
    expect(previewed).toEqual(programRestingOffset(adopted, nationB.id));
    expect(previewed).not.toEqual(programRestingOffset(campaign, nationB.id));
  });
});

describe("the purse: what a government's books let it choose", () => {
  const withEconomy = (runtime: NationRuntime, economy: Partial<NationRuntime["stats"]["economy"]>): NationRuntime => ({
    ...runtime,
    stats: { ...runtime.stats, economy: { ...runtime.stats.economy, ...economy } },
  });
  const sample = worldRuntimes[worldDataset.nations[0]!.id]!;
  const gdp = sample.stats.economy.gdp;
  const comfortable = withEconomy(sample, { debt: gdp * 0.3, sovereignRating: "AAA" });
  const strained = withEconomy(sample, { debt: gdp * 1.6, sovereignRating: "B" });

  it("judges a debt's urgency as a share of output, never as a stock that ranks economies by size", () => {
    const [low, high] = worldNorms(worldRuntimes)["economy.debt"];
    const ratios = Object.values(worldRuntimes).map((runtime) => debtToGdp(runtime.stats));
    expect(low).toBeCloseTo(Math.min(...ratios), 9);
    expect(high).toBeCloseTo(Math.max(...ratios), 9);
    expect(high).toBeLessThanOrEqual(POLICY_STAT_RANGES["economy.debt"][1]);
  });

  it("reads no strain at a light debt and a top rating, full strain in a debt crisis, and more for more debt or a worse letter", () => {
    expect(purseStrain(comfortable)).toBe(0);
    expect(purseStrain(comfortable, { inCrisis: true })).toBe(1);
    expect(purseStrain(strained)).toBeGreaterThan(0.5);
    expect(purseStrain(withEconomy(strained, { sovereignRating: "BBB" }))).toBeLessThan(purseStrain(strained));
    expect(purseStrain(withEconomy(strained, { debt: gdp * 1.0 }))).toBeLessThan(purseStrain(strained));
  });

  it("reads no strain from an investment-grade letter at a light debt, and some from a junk one", () => {
    for (const letter of ["AA", "A", "BBB"] as const) {
      expect(purseStrain(withEconomy(comfortable, { sovereignRating: letter })), letter).toBe(0);
    }
    expect(purseStrain(withEconomy(comfortable, { sovereignRating: "BB" }))).toBeGreaterThan(0);
  });

  it("prices what a program does to the balance by the strain, and not at all for a government with room", () => {
    const transition = policyStance("industry-transition")!;
    const priced = (runtime: NationRuntime) =>
      scoreDomain(runtime, "industry", worldNorms(worldRuntimes)).find((row) => row.stance.id === transition.id)!.purseFit;
    expect(priced(comfortable)).toBe(0);
    expect(priced(strained)).toBeCloseTo((transition.perTurn.treasuryOfGdp ?? 0) * purseStrain(strained) * 75, 9);
    expect(priced(strained)).toBeLessThan(0);
  });

  it("reads each fiscal program's pull on the balance from the books' own table", () => {
    const norms = worldNorms(worldRuntimes);
    for (const row of scoreDomain(strained, "fiscal", norms, { inCrisis: true })) {
      const shift = FISCAL_PROGRAM_SHIFTS[row.stance.id];
      const balance = (row.stance.perTurn.treasuryOfGdp ?? 0) + (shift ? (shift.take ?? 0) - (shift.outlays ?? 0) : 0);
      expect(row.purseFit, row.stance.id).toBeCloseTo(balance * 75, 9);
    }
  });
});
