import { describe, expect, it } from "vitest";
import { atWarAsParty } from "./war-party.js";
import { MILITARY_BRANCHES, worldNations } from "@admin/world";
import {
  COMBATANT_COMMANDS,
  FUNCTIONAL_COMMANDS,
  GEOGRAPHIC_COMMANDS,
  POSTURE_PRESSURE_RELIEF,
  POSTURE_READINESS_COST,
  SUCCESSOR_CONFIRMATION_DAYS,
  amendUnifiedCommandPlan,
  assignedShare,
  commandAuthority,
  commandChain,
  commandDef,
  commandFor,
  commandEngagement,
  commandPhase,
  effectivePosture,
  foundingUnifiedCommand,
  nationsInAor,
  posturePressureFactor,
  reassignForces,
  relieveCommander,
  setCommandPosture,
} from "./combatant-commands.js";
import { DEFAULT_AOR_BY_REGION } from "./command-catalog.js";
import { apply } from "./effects.js";
import { buildCampaign, withWeeksElapsed } from "./__fixtures__/campaign.js";
import { landRung } from "./__fixtures__/ladder.js";
import { foundedForBalance } from "./balance-harness.js";
import { openConflict } from "./conflicts.js";
import { conflictPhase } from "./war-tick.js";
import { joinConflict } from "./war-entry.js";
import { createRngStreams } from "./rng.js";
import type { Campaign } from "./state.js";
import type { NationId } from "@admin/world";

/** The fixture's world uses invented region ids; the map is real, so give it a real region. */
function withRegion(campaign: Campaign, nation: NationId, region: string): Campaign {
  const runtime = campaign.nations[nation]!;
  return {
    ...campaign,
    nations: {
      ...campaign.nations,
      [nation]: { ...runtime, base: { ...runtime.base, geo: { ...runtime.base.geo, region } } },
    },
  };
}

describe("the unified command structure", () => {
  it("is eleven commands, seven geographic and four functional", () => {
    expect(COMBATANT_COMMANDS).toHaveLength(11);
    expect(GEOGRAPHIC_COMMANDS).toHaveLength(7);
    expect(FUNCTIONAL_COMMANDS).toHaveLength(4);
  });

  it("assigns every service exactly once across the eleven", () => {
    const campaign = buildCampaign();
    for (const branch of MILITARY_BRANCHES) {
      expect(assignedShare(campaign, branch)).toBeCloseTo(1, 3);
    }
  });

  it("holds a commander in every theater at inauguration, which the civilian side does not", () => {
    const unified = foundingUnifiedCommand();
    for (const def of COMBATANT_COMMANDS) {
      const runtime = unified.commands[def.id];
      expect(runtime?.commander?.name).toBeTruthy();
      expect(runtime?.commander?.acting).toBeUndefined();
    }
  });

  it("has a default command for every region the dataset actually uses", () => {
    const regions = new Set(worldNations.map((nation) => nation.geo.region as string));
    for (const region of regions) {
      expect(DEFAULT_AOR_BY_REGION[region], `no combatant command owns ${region}`).toBeTruthy();
    }
  });

  it("puts the named exceptions where the decision put them rather than where the map would", () => {
    const campaign = buildCampaign();
    const withEgypt = withRegion(campaign, "ALP" as NationId, "region-north-africa");
    expect(commandFor(withEgypt, "ALP" as never)).toBe("CCMD-AFRICOM");
    // The exception table wins over the region: Egypt is CENTCOM's, not AFRICOM's.
    expect(commandDef("CCMD-CENTCOM")?.abbr).toBe("CENTCOM");
  });
});

describe("the chain of command", () => {
  it("runs through the Secretary of Defense, and reads an empty Pentagon as the expensive break", () => {
    const campaign = withRegion(buildCampaign(), "ALP" as NationId, "region-western-europe");
    const authority = commandAuthority(campaign, "ALP" as never);
    expect(authority.command?.abbr).toBe("EUCOM");
    // The fixture opens with the political offices empty, which is what a real
    // inauguration is: no confirmed Secretary yet.
    expect(authority.breaks.some((entry) => entry.link === "secretary")).toBe(true);
    expect(authority.execution).toBeLessThan(1);
    expect(authority.execution).toBeGreaterThan(0);
  });

  it("degrades further under an acting commander, and never to zero", () => {
    const campaign = withRegion(buildCampaign(), "ALP" as NationId, "region-western-europe");
    const before = commandAuthority(campaign, "ALP" as never).execution;
    const relief = relieveCommander(campaign, "CCMD-EUCOM", "Public dissent from the President's policy.");
    expect(relief.ok).toBe(true);
    if (!relief.ok) return;
    const after = commandAuthority(apply(campaign, relief.packet), "ALP" as never);
    expect(after.execution).toBeLessThan(before);
    expect(after.execution).toBeGreaterThan(0);
  });

  it("reads the same chain for a command as for a country on its map, and answers for a command that holds none", () => {
    const campaign = withRegion(buildCampaign(), "ALP" as NationId, "region-western-europe");
    expect(commandChain(campaign, "CCMD-EUCOM")).toEqual(commandAuthority(campaign, "ALP" as never));
    const functional = FUNCTIONAL_COMMANDS[0]!;
    const chain = commandChain(campaign, functional.id);
    expect(chain.command?.id).toBe(functional.id);
    expect(chain.breaks.some((entry) => entry.link === "secretary")).toBe(true);
    expect(chain.execution).toBeGreaterThan(0);
  });
});

describe("relieving a commander", () => {
  it("puts the deputy in the chair the same day rather than leaving the theater unled", () => {
    const campaign = buildCampaign();
    const relief = relieveCommander(campaign, "CCMD-INDOPACOM", "A judgment about the officer.");
    expect(relief.ok).toBe(true);
    if (!relief.ok) return;
    const next = apply(campaign, relief.packet);
    const runtime = next.security.unifiedCommand.commands["CCMD-INDOPACOM"]!;
    expect(runtime.commander?.acting).toBe(true);
    expect(runtime.reliefs).toBe(1);
  });

  it("refuses a relief with no reason given, and a second relief of an acting officer", () => {
    const campaign = buildCampaign();
    expect(relieveCommander(campaign, "CCMD-EUCOM", "   ").ok).toBe(false);
    const first = relieveCommander(campaign, "CCMD-EUCOM", "A reason.");
    if (!first.ok) throw new Error("expected the first relief to stand");
    const after = apply(campaign, first.packet);
    expect(relieveCommander(after, "CCMD-EUCOM", "Another reason.").ok).toBe(false);
  });

  it("confirms the successor only once the Senate has had the time it takes", () => {
    const campaign = buildCampaign();
    const relief = relieveCommander(campaign, "CCMD-SOUTHCOM", "A reason.");
    if (!relief.ok) throw new Error("expected the relief to stand");
    const relieved = apply(campaign, relief.packet);

    const tooSoon = withWeeksElapsed(relieved, 4);
    expect(commandPhase(tooSoon).flatMap((packet) => packet.effects).some(
      (effect) => effect.kind === "command" && effect.confirmActing !== undefined,
    )).toBe(false);

    const later = withWeeksElapsed(relieved, Math.ceil(SUCCESSOR_CONFIRMATION_DAYS / 7) + 1);
    const packets = commandPhase(later);
    const confirming = packets
      .flatMap((packet) => packet.effects)
      .find((effect) => effect.kind === "command" && effect.confirmActing !== undefined);
    expect(confirming).toBeTruthy();
    const settled = packets.reduce((state, packet) => apply(state, packet), later);
    expect(settled.security.unifiedCommand.commands["CCMD-SOUTHCOM"]?.commander?.acting).toBeUndefined();
  });
});

describe("assignment and the map", () => {
  it("refuses to move forces between commands with no Secretary of Defense", () => {
    const campaign = buildCampaign();
    const refused = reassignForces(campaign, "CCMD-EUCOM", "CCMD-INDOPACOM", "navy", 0.05);
    expect(refused.ok).toBe(false);
    if (refused.ok) return;
    expect(refused.reason).toContain("Secretary of Defense");
  });

  it("moves the share and leaves the service's total assignment unchanged", () => {
    const base = buildCampaign();
    const seated: Campaign = {
      ...base,
      institutions: {
        ...base.institutions,
        "INST-DOD": { ...base.institutions["INST-DOD"]!, vacancy: false, leader: "PER-1" as never },
      },
    };
    const moved = reassignForces(seated, "CCMD-EUCOM", "CCMD-INDOPACOM", "navy", 0.05);
    expect(moved.ok).toBe(true);
    if (!moved.ok) return;
    const next = apply(seated, moved.packet);
    expect(assignedShare(next, "navy")).toBeCloseTo(1, 3);
    expect(next.security.unifiedCommand.commands["CCMD-INDOPACOM"]!.assignment.navy).toBeCloseTo(0.45, 3);
  });

  it("moves a country between commands as an amendment with a reason on it", () => {
    const campaign = withRegion(buildCampaign(), "ALP" as NationId, "region-western-europe");
    const amended = amendUnifiedCommandPlan(campaign, "ALP" as never, "CCMD-CENTCOM", "The theater it actually fights in.");
    expect(amended.ok).toBe(true);
    if (!amended.ok) return;
    const next = apply(campaign, amended.packet);
    expect(commandFor(next, "ALP" as never)).toBe("CCMD-CENTCOM");
    expect(nationsInAor(next, "CCMD-CENTCOM")).toContain("ALP");
    expect(next.security.unifiedCommand.amendments[0]?.rationale).toBeTruthy();
  });

  it("will not move the homeland, and will not amend into a functional command", () => {
    const campaign = withRegion(buildCampaign(), "ALP" as NationId, "region-western-europe");
    expect(amendUnifiedCommandPlan(campaign, "USA" as never, "CCMD-EUCOM", "why").ok).toBe(false);
    expect(amendUnifiedCommandPlan(campaign, "ALP" as never, "CCMD-SOCOM", "why").ok).toBe(false);
  });
});

describe("posture", () => {
  it("bills the national force every week a theater is held above routine", () => {
    const campaign = buildCampaign();
    const surged = setCommandPosture(campaign, "CCMD-CENTCOM", "surge");
    expect(surged.ok).toBe(true);
    if (!surged.ok) return;
    const next = apply(campaign, surged.packet);
    const drawn = commandPhase(next)
      .flatMap((packet) => packet.effects)
      .find((effect) => effect.kind === "metric");
    expect(drawn).toBeTruthy();
    if (drawn?.kind !== "metric") return;
    expect(drawn.deltas.militaryReadiness).toBeLessThan(0);
  });

  it("refuses a posture the theater is already at", () => {
    expect(setCommandPosture(buildCampaign(), "CCMD-CENTCOM", "routine").ok).toBe(false);
  });
});

describe("posture follows war", () => {
  const founded = foundedForBalance("posture-follows-war").campaign;
  const US = founded.founding.nation;
  const RUS = "RUS" as NationId;
  const UKR = "UKR" as NationId;
  const IRN = "IRN" as NationId;
  const POL = "POL" as NationId;

  function landed(campaign: Campaign, target: NationId, instrument: "military" | "assistance", rung: 4 | 5): Campaign {
    const result = landRung(campaign, US, target, instrument, rung, createRngStreams(campaign.seed));
    if (!result.ok) throw new Error(`the rung was refused: ${result.missingCapability}`);
    return apply(campaign, result.packet);
  }

  function joinedAgainstRussia(): Campaign {
    const war = openConflict(RUS, UKR, founded.turn, "Russia invades Ukraine.");
    const board = { ...founded, conflicts: { ...founded.conflicts, [war.id]: war } };
    const joined = joinConflict(board, US, war.id, "defender");
    if (!joined.ok) throw new Error(joined.reason);
    return apply(board, joined.packet);
  }

  function billed(campaign: Campaign): number {
    const drawn = commandPhase(campaign).flatMap((packet) => packet.effects).find((effect) => effect.kind === "metric");
    return drawn?.kind === "metric" ? -(drawn.deltas.militaryReadiness ?? 0) : 0;
  }

  it("leaves every theater at routine, and bills nothing, while the country is at peace", () => {
    for (const def of COMBATANT_COMMANDS) {
      expect(commandEngagement(founded, def.id)).toBeUndefined();
      expect(effectivePosture(founded, def.id)).toBe("routine");
    }
    expect(billed(founded)).toBe(0);
  });

  it("engages the theater of a war the country joined, and bills it at heightened", () => {
    const joined = joinedAgainstRussia();
    expect(commandEngagement(joined, "CCMD-EUCOM")?.against).toContain(RUS);
    expect(commandEngagement(joined, "CCMD-EUCOM")?.against).not.toContain(UKR);
    expect(effectivePosture(joined, "CCMD-EUCOM")).toBe("heightened");
    expect(joined.security.unifiedCommand.commands["CCMD-EUCOM"]?.posture).toBe("routine");
    expect(billed(joined)).toBeCloseTo(POSTURE_READINESS_COST.heightened, 9);
  });

  it("engages the theater of a strike that opened no war, because forces were introduced there", () => {
    const struck = landed(founded, IRN, "military", 4);
    // The seeded 2029 world carries other governments' wars, so the claim is
    // about this country: the strike engaged the theater without making the
    // United States a party to anything.
    expect(atWarAsParty(struck)).toBe(false);
    expect(commandEngagement(struck, "CCMD-CENTCOM")?.against).toEqual([IRN]);
    expect(effectivePosture(struck, "CCMD-CENTCOM")).toBe("heightened");
  });

  it("engages the theater of a government the country holds forces committed toward", () => {
    const guaranteed = landed(founded, POL, "assistance", 5);
    expect(commandEngagement(guaranteed, "CCMD-EUCOM")).toEqual({ against: [], toward: [POL] });
    expect(effectivePosture(guaranteed, "CCMD-EUCOM")).toBe("heightened");
  });

  it("still lets the President surge an engaged theater, and holds an order back to routine until the engagement ends", () => {
    const struck = landed(founded, IRN, "military", 4);
    const surge = setCommandPosture(struck, "CCMD-CENTCOM", "surge");
    if (!surge.ok) throw new Error(surge.reason);
    const surged = apply(struck, surge.packet);
    expect(effectivePosture(surged, "CCMD-CENTCOM")).toBe("surge");
    const stand = setCommandPosture(surged, "CCMD-CENTCOM", "routine");
    if (!stand.ok) throw new Error(stand.reason);
    const ordered = apply(surged, stand.packet);
    expect(effectivePosture(ordered, "CCMD-CENTCOM")).toBe("heightened");
    const again = setCommandPosture(ordered, "CCMD-CENTCOM", "routine");
    expect(again.ok ? "" : again.reason).toMatch(/until the engagement ends/);
    const warPowers = ordered.security.warPowers;
    // The force comes out: the introduction is terminated and the strike package's commitment ends with it.
    const ended: Campaign = {
      ...ordered,
      security: { ...ordered.security, warPowers: { ...warPowers, obligations: warPowers.obligations.map((obligation) => ({ ...obligation, terminated: { day: obligation.openedDay + 1 } })) } },
      commitments: Object.fromEntries(Object.entries(ordered.commitments).map(([key, commitment]) => [key, { ...commitment, status: "wound-down" as const, endedTurn: ordered.turn }])),
    };
    const introducedOnly: Campaign = { ...ended, commitments: ordered.commitments };
    expect(commandEngagement(introducedOnly, "CCMD-CENTCOM")).toEqual({ against: [], toward: [IRN] });
    expect(commandEngagement(ended, "CCMD-CENTCOM")).toBeUndefined();
    expect(effectivePosture(ended, "CCMD-CENTCOM")).toBe("routine");
  });
});

// A theater's posture sways the weight of a war week on the American side by
// at most a tenth; the surge keeps its readiness bill.
describe("posture sways a theater's weekly pressure", () => {
  const founded = foundedForBalance("posture-sway").campaign;
  const IRN = "IRN" as NationId;
  const command = commandFor(founded, IRN)!;

  function at(posture: "routine" | "heightened" | "surge"): Campaign {
    const result = setCommandPosture(founded, command, posture);
    return result.ok ? apply(founded, result.packet) : founded;
  }

  it("takes nothing at routine and at most a tenth at surge", () => {
    expect(posturePressureFactor(at("routine"), IRN)).toBe(1);
    expect(posturePressureFactor(at("surge"), IRN)).toBe(0.9);
    expect(Math.max(...Object.values(POSTURE_PRESSURE_RELIEF))).toBeLessThanOrEqual(0.1);
  });

  it("keeps the surge's readiness cost", () => {
    expect(POSTURE_READINESS_COST.surge).toBeGreaterThan(0);
  });

  it("lightens the American side of a war week in that theater", () => {
    const war = openConflict(IRN, founded.founding.nation, founded.turn, "Iran attacks.");
    const week = (campaign: Campaign) => {
      const opened = { ...campaign, conflicts: { ...campaign.conflicts, [war.id]: war } };
      return conflictPhase(opened).reduce((state, packet) => apply(state, packet), opened).conflicts[war.id]!;
    };
    expect(week(at("surge")).exhaustion.defender).toBeLessThanOrEqual(week(at("routine")).exhaustion.defender);
  });
});
