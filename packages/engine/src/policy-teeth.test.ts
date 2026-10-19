import { describe, expect, it } from "vitest";
import { CHARTER_USA_CONSTITUTION, consumerByPath, type PersonId, type RoleId } from "@admin/world";
import { buildCampaign } from "./__fixtures__/campaign.js";
import { apply } from "./effects.js";
import { FISCAL_PROGRAM_SHIFTS } from "./fiscal-impulse.js";
import { macroDriftPhase } from "./macro.js";
import { programRestingOffset } from "./governance.js";
import { RESTING_POINT_PATHS } from "./policy-stats.js";
import {
  policyNationEffects,
  policyPhase,
  policyStance,
  POLICY_DOMAINS,
  POLICY_STANCES,
  policyStatBounds,
  POLICY_STAT_RANGES,
  selectPolicyStance,
  stancesForDomain,
  type PolicyStance,
  type PolicyStatPath,
} from "./policy.js";
import { domainAuthority, PROGRAM_STANDUP_TURNS, programStandUpRemaining, stanceOpposition } from "./policy-teeth.js";
import type { Campaign } from "./state.js";

// The policy contract, mirroring the authored-field consumer registry: a stance
// that moves nothing the simulation reads is decor, and decor reads to a player
// as depth the game does not have. This file is what makes that a build failure
// rather than an audit finding.

const USA = buildCampaign().founding.nation;

// A cabinet with every chair filled, so a test about what a program does is
// not a test about a vacancy.
function runPhase(state: Campaign): Campaign {
  return policyPhase(state).reduce((acc, packet) => apply(acc, packet), state);
}

function seatEveryChair(campaign: Campaign): Campaign {
  const holder = Object.keys(campaign.people)[0]! as PersonId;
  const chairs = Object.fromEntries(
    // Every chair the playable constitution seats, so every domain resolves
    // a minister. Seating them per-domain would be circular now that a
    // domain's chair is resolved against the seats that exist.
    (CHARTER_USA_CONSTITUTION.cabinetRoles as readonly RoleId[]).map((role) => [role, holder]),
  ) as Record<RoleId, PersonId>;
  return {
    ...campaign,
    founding: { ...campaign.founding, cabinet: { ...campaign.founding.cabinet, ...chairs } },
    player: { ...campaign.player, cabinet: { ...campaign.player.cabinet, ...chairs } },
  };
}


describe("every stance has teeth", () => {
  it("moves the country, not only the player's dashboard", () => {
    const toothless = POLICY_STANCES.filter(
      (stance) => !stance.inherited && Object.keys(stance.nationEffects).length === 0,
    );
    expect(toothless.map((s) => s.id)).toEqual([]);
  });

  it("leaves the inherited stance of each domain holding the line, and nothing more", () => {
    for (const domain of POLICY_DOMAINS) {
      const inherited = stancesForDomain(domain).filter((s) => s.inherited);
      expect(inherited, domain).toHaveLength(1);
      expect(Object.keys(inherited[0]!.nationEffects), inherited[0]!.id).toEqual([]);
    }
  });

  // The claim a stance makes about what it moves has to be a claim about a
  // field something else already reads. Without this a program could satisfy
  // the test above by moving a number as inert as the stance was.
  it("moves only stats the authored-field registry accounts for", () => {
    for (const path of Object.keys(POLICY_STAT_RANGES) as PolicyStatPath[]) {
      expect(consumerByPath.get(path), `${path} is registered`).toBeDefined();
    }
  });

  it("gives every stance at least one consequence a live rule actually reads", () => {
    for (const stance of POLICY_STANCES) {
      if (stance.inherited) continue;
      const live = (Object.keys(stance.nationEffects) as PolicyStatPath[]).filter((path) => {
        const entry = consumerByPath.get(path);
        return entry !== undefined && "readBy" in entry;
      });
      expect(live.length, `${stance.id} moves something a rule consults`).toBeGreaterThan(0);
    }
  });

  // Writing a stat is not the same as anything reading it, and laundering the
  // one as the other is how a field goes dead in the first place. A program
  // may move a stat no rule consults yet — a country's press freedom is real
  // whether or not a rule has been written against it — but the debt is pinned
  // here so it cannot quietly grow.
  it("pins exactly which of its consequences nothing reads yet", () => {
    const unread = (Object.keys(POLICY_STAT_RANGES) as PolicyStatPath[]).filter((path) => {
      const entry = consumerByPath.get(path);
      return entry === undefined || "owedBy" in entry;
    });
    // Every policy stat currently has a reader, so the expected list is empty.
    // The assertion stays rather than being deleted, because what it pins is
    // that a stance cannot move a stat nothing reads, and that has to keep
    // failing the moment one appears.
    expect(unread.sort()).toEqual([]);
  });

  it("gives the four stances in a domain genuinely different consequences", () => {
    for (const domain of POLICY_DOMAINS) {
      const shapes = stancesForDomain(domain).map((stance) =>
        JSON.stringify(Object.entries(stance.nationEffects).sort()),
      );
      expect(new Set(shapes).size, domain).toBe(shapes.length);
    }
  });
});

describe("what a week of a program does to the country", () => {
  // The fixture charter seats one chair, and a domain with no minister is not
  // legislable at all — which is the rule working, not a gap. These tests are

  function underProgram(campaign: Campaign, stanceIds: readonly string[]): Campaign {
    const policies = { ...campaign.player.policies };
    for (const id of stanceIds) policies[policyStance(id)!.domain] = id;
    return seatEveryChair({ ...campaign, player: { ...campaign.player, policies } });
  }

  /**
   * A program past its stand-up, so a test about what a program *does* is not
   * accidentally a test about the month it spends being written into rules.
   * Runs the phase once to put the program on the record, then walks the clock
   * past the wait — the same route a played campaign takes.
   */
  function working(state: Campaign): Campaign {
    const marked = runPhase(state);
    return { ...marked, turn: marked.turn + PROGRAM_STANDUP_TURNS };
  }

  it("a surveillance state watches more and censors more", () => {
    const before = working(underProgram(buildCampaign(), ["security-surveillance"]));
    const after = runPhase(before);
    expect(after.nations[USA]!.stats.security.intelCapability).toBeGreaterThan(
      before.nations[USA]!.stats.security.intelCapability,
    );
    expect(after.nations[USA]!.stats.politics.pressFreedom).toBeLessThan(
      before.nations[USA]!.stats.politics.pressFreedom,
    );
  });

  it("an open society is the same trade run the other way", () => {
    const before = working(underProgram(buildCampaign(), ["civil-open-society"]));
    const after = runPhase(before);
    expect(after.nations[USA]!.stats.politics.pressFreedom).toBeGreaterThan(
      before.nations[USA]!.stats.politics.pressFreedom,
    );
    // Its louder streets are the other half of the same trade, and they arrive
    // through the drift law rather than through this phase: `protestPressure`
    // reverts, so what the stance names is where the street rests.
    expect(programRestingOffset(before, USA)["politics.protestPressure"]).toBeGreaterThan(0);
    const settled = Array.from({ length: 600 }).reduce<Campaign>(
      (acc) => macroDriftPhase(acc).reduce((state, packet) => apply(state, packet), acc),
      before,
    );
    expect(settled.nations[USA]!.stats.politics.protestPressure).toBeGreaterThan(
      before.nations[USA]!.stats.politics.protestPressure,
    );
  });

  // The five rates whose evolution law lives in `macro.ts` may not be written
  // as a weekly level by anything else: against a proportional reversion that
  // settles at the authored figure over the reversion rate rather than at the
  // figure. They leave through the resting offset instead.
  it("keeps a program's rate deltas out of the weekly level write", () => {
    const campaign = underProgram(buildCampaign(), [
      "fiscal-investment",
      "civil-emergency-powers",
      "trade-protective",
    ]);
    const written = policyNationEffects(
      campaign.nations[USA]!,
      POLICY_DOMAINS.map((domain) => ({ stance: selectPolicyStance(campaign, domain), quality: 1 })),
    ).flatMap((effect) =>
      effect.kind === "nationStat"
        ? Object.entries(effect.setStats as Record<string, Record<string, number> | undefined>).flatMap(
            ([group, fields]) => Object.keys(fields ?? {}).map((field) => `${group}.${field}`),
          )
        : [],
    );
    expect(written.filter((path) => RESTING_POINT_PATHS.includes(path as never))).toEqual([]);
    expect(written.length).toBeGreaterThan(0);
  });

  it("rearmament raises readiness on the nation, not just on the player's reading of it", () => {
    const before = working(underProgram(buildCampaign(), ["defense-rearmament"]));
    const after = runPhase(before);
    expect(after.nations[USA]!.stats.military.readiness).toBeGreaterThan(
      before.nations[USA]!.stats.military.readiness,
    );
  });

  it("changes nothing on a government still running what it inherited", () => {
    const before = seatEveryChair(buildCampaign());
    const after = runPhase(before);
    expect(after.nations[USA]!.stats).toEqual(before.nations[USA]!.stats);
  });

  it("sums two domains pushing the same stat rather than letting the last one win", () => {
    const runtime = buildCampaign().nations[USA]!;
    const both = policyNationEffects(runtime, [
      { stance: policyStance("civil-emergency-powers")!, quality: 1 },
      { stance: policyStance("security-surveillance")!, quality: 1 },
    ]);
    const pressFreedom = both.filter(
      (effect) => effect.kind === "nationStat" && effect.setStats?.politics?.pressFreedom !== undefined,
    );
    expect(pressFreedom).toHaveLength(1);
    // Emergency powers alone is -0.002; both together must be worse than either.
    const only = policyNationEffects(runtime, [
      { stance: policyStance("civil-emergency-powers")!, quality: 1 },
    ]);
    const valueOf = (effects: readonly ReturnType<typeof policyNationEffects>[number][]) =>
      effects
        .map((e) => (e.kind === "nationStat" ? e.setStats?.politics?.pressFreedom : undefined))
        .find((v) => v !== undefined)!;
    expect(valueOf(both)).toBeLessThan(valueOf(only));
  });

  it("holds every stat it writes inside the schema's own range however long it runs", () => {
    let state = underProgram(buildCampaign(), [
      "civil-emergency-powers",
      "security-surveillance",
      "defense-conscription",
      "fiscal-austerity",
      "trade-protective",
      "industry-extraction",
    ]);
    for (let turn = 0; turn < 400; turn++) state = { ...runPhase(state), turn: state.turn + 1 };

    const stats = state.nations[USA]!.stats;
    for (const path of Object.keys(POLICY_STAT_RANGES) as PolicyStatPath[]) {
      const [min, max] = policyStatBounds(stats, path);
      const [group, field] = path.split(".") as [keyof typeof stats, string];
      const value = (stats[group] as unknown as Record<string, number>)[field]!;
      expect(value, path).toBeGreaterThanOrEqual(min);
      expect(value, path).toBeLessThanOrEqual(max);
    }
  });

  it("scales delivery by the minister carrying it, and never the cost", () => {
    const campaign = underProgram(buildCampaign(), ["security-surveillance"]);
    const runtime = campaign.nations[USA]!;
    const stance = selectPolicyStance(campaign, "security");
    const at = (quality: number) => policyNationEffects(runtime, [{ stance, quality }]);
    const read = (effects: readonly ReturnType<typeof policyNationEffects>[number][], group: string, field: string) =>
      effects
        .map((e) => (e.kind === "nationStat" ? (e.setStats as Record<string, Record<string, number>>)[group]?.[field] : undefined))
        .find((v) => v !== undefined)!;

    // A weak service collects less...
    expect(read(at(0.6), "security", "intelCapability")).toBeLessThan(read(at(1.4), "security", "intelCapability"));
    // ...and censors exactly as much.
    expect(read(at(0.6), "politics", "pressFreedom")).toBe(read(at(1.4), "politics", "pressFreedom"));
  });
});

// The North Star trade-off gate, applied to the standing program.
//
// A stance was a setting: nobody objected to it, it drew on no authority, and
// it paid on the tick after it was signed. These are the three that make a
// change of program a political act instead — and none of them is authored per
// stance, so a new program cannot be written without them and cannot have them
// faked for it.
describe("a change of program is a political act", () => {
  /**
   * The one program in the catalogue that declares no direction at all, and so
   * has nobody to be against.
   *
   * It is debt, not an exemption: "sector by sector, negotiated, reviewed on a
   * calendar" has opponents at both ends — the free traders who want the
   * schedule gone and the protectionists who want a wall — and the catalogue
   * entry simply carries an empty `alignment`. Named here so the gate holds the
   * line at one while it waits, and so a second such stance fails.
   */
  it("costs something, is against somebody, and does something to the country", () => {
    const free: string[] = [];
    const unopposed: string[] = [];
    const inert: string[] = [];
    for (const stance of POLICY_STANCES) {
      // Continuity is what everybody is already living with, so it is the one
      // position with nothing on the other side of it.
      if (stance.inherited) continue;
      // A program that borrows is priced on the books: the interest on what it
      // adds comes out of the President's own room.
      const shift = FISCAL_PROGRAM_SHIFTS[stance.id];
      const borrows = (shift?.outlays ?? 0) - (shift?.take ?? 0) > 0;
      const priced =
        borrows ||
        Object.values(stance.enactment).some((value) => value !== 0) ||
        Object.values(stance.perTurn).some((value) => value !== 0);
      if (!priced) free.push(stance.id);
      if (!stanceOpposition(stance)) unopposed.push(stance.id);
      if (Object.keys(stance.nationEffects).length === 0) inert.push(stance.id);
    }
    expect({ free, unopposed, inert }).toEqual({ free: [], unopposed: [], inert: [] });
  });

  // The gate's own proof: it has to fail something. A stance that pushes on no
  // axis is exactly the shape a settings panel is made of.
  it("refuses a program nobody could be against", () => {
    const settingNotStance: PolicyStance = {
      ...policyStance("defense-rearmament")!,
      id: "defense-a-setting",
      alignment: {},
    };
    expect(stanceOpposition(settingNotStance)).toBeUndefined();
  });

  it("names an authority for every domain, and never the same one twice", () => {
    const authorities = POLICY_DOMAINS.map((domain) => domainAuthority(domain));
    expect(authorities.filter((words) => words.trim().length === 0)).toEqual([]);
    expect(new Set(authorities).size).toBe(POLICY_DOMAINS.length);
  });

  it("pays nothing for the month it spends being stood up, then pays", () => {
    const seated = seatEveryChair(buildCampaign());
    const adopted: Campaign = {
      ...seated,
      player: { ...seated.player, policies: { ...seated.player.policies, defense: "defense-rearmament" } },
    };
    const stance = policyStance("defense-rearmament")!;

    // The week it is signed: the program is on the record and worth nothing.
    const first = runPhase(adopted);
    expect(first.nations[USA]!.stats.military.readiness).toBe(adopted.nations[USA]!.stats.military.readiness);
    expect(first.ledger.at(-1)!.description).toContain("being stood up");
    // And the record says what it is being stood up under and who is against it.
    expect(first.ledger.at(-1)!.description).toContain("annual authorization");
    expect(programStandUpRemaining(first, "defense", stance)).toBeGreaterThan(0);

    // A month later it is at work.
    const later: Campaign = { ...first, turn: first.turn + PROGRAM_STANDUP_TURNS };
    expect(programStandUpRemaining(later, "defense", stance)).toBe(0);
    const working = runPhase(later);
    expect(working.nations[USA]!.stats.military.readiness).toBeGreaterThan(
      later.nations[USA]!.stats.military.readiness,
    );
  });

  it("lets the program the administration inherited work from the morning of the oath", () => {
    // It was already running. A month's wait on continuity would be the game
    // claiming the country stopped governing itself while the oath was read.
    const seated = seatEveryChair(buildCampaign());
    for (const domain of POLICY_DOMAINS) {
      const stance = selectPolicyStance(seated, domain);
      if (!stance.inherited) continue;
      expect(programStandUpRemaining(seated, domain, stance), domain).toBe(0);
    }
  });
});
