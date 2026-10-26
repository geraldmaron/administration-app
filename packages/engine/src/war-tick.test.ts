import { describe, expect, it } from "vitest";
import type { ForceAssetId, MilitaryBranch, NationId } from "@admin/world";
import { buildCampaign, nationA, nationB } from "./__fixtures__/campaign.js";
import { apply } from "./effects.js";
import { openConflict } from "./conflicts.js";
import { joinConflict } from "./war-entry.js";
import { foundedForBalance } from "./balance-harness.js";
import { relationshipKey } from "./state.js";
import { pressedThreatLevel, pressedTrustLevel } from "./relationships.js";
import { HELD_FRONT_INTENSITY, OPENING_WAR_SUPPORT, aftermathPacket, commandQuality, conflictPhase, settle, strengthRatio } from "./war-tick.js";
import { fullFrontPersonnel, sideCombatants } from "./war-forces.js";
import { OUTCOME_LINES } from "./war-outcomes.js";
import { forceProjectionProfile } from "./warfighting.js";
import { liveNation } from "./war-entry.js";
import type { Campaign, Commitment, Conflict } from "./state.js";

const USA = nationA.id;
const ALP = nationB.id;

function atWar(shape: Partial<Pick<Conflict, "intensity" | "warSupport" | "exhaustion">> = {}): { campaign: Campaign; conflict: Conflict } {
  const campaign = buildCampaign();
  const conflict = { ...openConflict(USA, ALP, campaign.turn, "The United States invades Alpland."), ...shape };
  return { campaign: { ...campaign, conflicts: { [conflict.id]: conflict } }, conflict };
}

function week(campaign: Campaign): Campaign {
  const fought = conflictPhase(campaign).reduce((state, packet) => apply(state, packet), campaign);
  return { ...fought, turn: fought.turn + 1 };
}

function withReadiness(campaign: Campaign, nation: NationId, readiness: number): Campaign {
  const runtime = campaign.nations[nation]!;
  return {
    ...campaign,
    nations: { ...campaign.nations, [nation]: { ...runtime, stats: { ...runtime.stats, military: { ...runtime.stats.military, readiness } } } },
  };
}

function committing(campaign: Campaign, branch: MilitaryBranch, unitType: ForceAssetId, count: number): Campaign {
  const id = `commitment:deployment:${USA}:${ALP}:${unitType}`;
  const commitment: Commitment = {
    id,
    kind: "deployment",
    actor: USA,
    target: { kind: "nation", id: ALP as string },
    resource: { spec: { kind: "currency", scale: 6, suffix: "USD" }, amountPerTurn: 0 },
    source: { kind: "orderOfBattle", branch, unitType, count },
    startedTurn: campaign.turn,
    review: "standing",
    status: "active",
    rationale: "On station until it is recalled.",
  };
  return { ...campaign, commitments: { ...campaign.commitments, [id]: commitment } };
}

describe("war strength follows the live force", () => {
  it("scores a side bled of readiness lower than the same side whole", () => {
    const { campaign, conflict } = atWar();
    expect(strengthRatio(withReadiness(campaign, USA, 0.1), conflict)).toBeLessThan(strengthRatio(campaign, conflict));
  });

  it("carries a week's attrition into the next week's strength", () => {
    // A thin force, so its strength is not already at the top of the scale.
    const campaign = withReadiness(atWar().campaign, USA, 0.1);
    const before = forceProjectionProfile(liveNation(campaign.nations[USA]!)).expeditionary;
    const after = forceProjectionProfile(liveNation(week(campaign).nations[USA]!)).expeditionary;
    expect(after).toBeLessThan(before);
  });
});

describe("what a commitment adds to a front", () => {
  const personnelOf = (campaign: Campaign, conflict: Conflict) => sideCombatants(campaign, conflict, "aggressor").find((c) => c.nation === USA)!.personnel;

  it("fights with what the President committed, and never with less than a corps", () => {
    const { campaign, conflict } = atWar();
    expect(personnelOf(campaign, conflict)).toBe(fullFrontPersonnel());
    for (const [branch, unitType, count] of [
      ["navy", "navy.aircraft-carrier", 1],
      ["navy", "navy.surface-combatant", 4],
      ["air", "air.fighter", 48],
      ["air", "air.fighter", 200],
      ["army", "army.brigade-combat-team", 2],
    ] as const) {
      expect(strengthRatio(committing(campaign, branch, unitType, count), conflict), `${count} ${unitType}`).toBeGreaterThanOrEqual(strengthRatio(campaign, conflict));
    }
    expect(personnelOf(committing(campaign, "army", "army.brigade-combat-team", 12), conflict)).toBe(48_000);
  });

  it("weighs a commitment in people, so a strike package does not outweigh a corps", () => {
    const { campaign, conflict } = atWar();
    expect(personnelOf(committing(campaign, "air", "air.fighter", 200), conflict)).toBe(fullFrontPersonnel());
    expect(strengthRatio(committing(campaign, "army", "army.brigade-combat-team", 12), conflict)).toBeGreaterThan(strengthRatio(committing(campaign, "air", "air.fighter", 200), conflict));
  });

  it("rises with what is committed, with diminishing returns", () => {
    const { campaign, conflict } = atWar();
    const ratios = [8, 16, 32, 64].map((count) => strengthRatio(committing(campaign, "army", "army.brigade-combat-team", count), conflict));
    for (let i = 1; i < ratios.length; i += 1) expect(ratios[i]!).toBeGreaterThan(ratios[i - 1]!);
    expect(ratios[3]! / ratios[0]!).toBeLessThan(8);
  });

  it("charges the President's side for what it sent, not its whole establishment", () => {
    const { campaign, conflict } = atWar();
    const runtime = campaign.nations[USA]!;
    const larger: Campaign = { ...campaign, nations: { ...campaign.nations, [USA]: { ...runtime, stats: { ...runtime.stats, military: { ...runtime.stats.military, activeHeadcount: runtime.stats.military.activeHeadcount * 10 } } } } };
    expect(personnelOf(larger, conflict)).toBe(personnelOf(campaign, conflict));
  });
});

describe("a front held at low intensity", () => {
  const spent = { intensity: 0.05, warSupport: { aggressor: 0.3, defender: 0.35 }, exhaustion: { aggressor: 0.6, defender: 0.6 } };

  it("rebuilds support and rests its forces instead of wearing them", () => {
    const { campaign, conflict } = atWar(spent);
    const after = week(campaign).conflicts[conflict.id]!;
    expect(after.warSupport.aggressor).toBeGreaterThan(spent.warSupport.aggressor);
    expect(after.warSupport.defender).toBeGreaterThan(spent.warSupport.defender);
    expect(after.exhaustion.aggressor).toBeLessThan(spent.exhaustion.aggressor);
  });

  it("can freeze: held cold for a year, it is still a war and never more wanted than when it began", () => {
    // Tired enough that a year's rest does not bring it to the armistice line.
    let { campaign, conflict } = atWar({ ...spent, exhaustion: { aggressor: 0.7, defender: 0.7 } });
    for (let i = 0; i < 52; i += 1) {
      const held = campaign.conflicts[conflict.id]!;
      campaign = week({ ...campaign, conflicts: { [conflict.id]: { ...held, intensity: 0.05 } } });
      conflict = campaign.conflicts[conflict.id]!;
      expect(conflict.warSupport.aggressor).toBeLessThanOrEqual(OPENING_WAR_SUPPORT.aggressor);
      expect(conflict.warSupport.defender).toBeLessThanOrEqual(OPENING_WAR_SUPPORT.defender);
    }
    expect(conflict.status).toBe("active");
    expect(conflict.warSupport.aggressor).toBe(OPENING_WAR_SUPPORT.aggressor);
  });

  it("wears out when it is fought instead", () => {
    let { campaign, conflict } = atWar({ ...spent, intensity: 0.6 });
    for (let i = 0; i < 52 && conflict.status === "active"; i += 1) {
      campaign = week(campaign);
      conflict = campaign.conflicts[conflict.id]!;
    }
    expect(conflict.status).not.toBe("active");
  });
});

// The weekly draw brings governments into wars beside allies they trust. The
// United States enters a war only by the President's order, through the one
// path that files its War Powers record, so the draw never picks it.
describe("the weekly draw never drafts the United States", () => {
  const RUS = "RUS" as NationId;
  const EST = "EST" as NationId;
  // A seed on which the unguarded draw drafted the United States into this war in its eighth week.
  const founded = foundedForBalance("war-1").campaign;
  const US = founded.founding.nation;
  const war = openConflict(RUS, EST, founded.turn, "Russia invades Estonia.");
  const opened: Campaign = { ...founded, conflicts: { ...founded.conflicts, [war.id]: war } };

  function weeks(campaign: Campaign, count: number): Campaign {
    let state = campaign;
    for (let week = 0; week < count; week += 1) {
      state = conflictPhase(state).reduce((next, packet) => apply(next, packet), state);
      if (state.conflicts[war.id]?.status !== "active") break;
      state = { ...state, turn: state.turn + 1 };
    }
    return state;
  }

  it("trusts the attacked treaty partner above the draw's gate", () => {
    expect(founded.relationships[relationshipKey(US, EST)]?.trust).toBeGreaterThan(0.35);
    expect(founded.nations[US]?.base.memberships.some((org) => founded.nations[EST]?.base.memberships.includes(org))).toBe(true);
  });

  it("keeps the United States out of the war through a year of weekly decisions, while others still come in", () => {
    const after = weeks(opened, 52).conflicts[war.id]!;
    expect([...after.joined.aggressor, ...after.joined.defender]).not.toContain(US);
    // A joiner may since have gone home from a worn defense; it still came in.
    expect([...after.joined.defender, ...(after.left ?? [])].length).toBeGreaterThan(0);
  });

  it("still lets the President enter the same war by order, with its War Powers record", () => {
    const joined = joinConflict(opened, US, war.id, "defender");
    expect(joined.ok).toBe(true);
    if (!joined.ok) return;
    const after = apply(opened, joined.packet);
    expect(after.conflicts[war.id]?.joined.defender).toContain(US);
    expect(after.security.warPowers.obligations.some((obligation) => obligation.target === RUS)).toBe(true);
  });
});

// A held front stays held until an act moves it, and it ends only once both
// sides have rested back to where they began.
describe("a held front", () => {
  const cold = { intensity: 0.1, warSupport: { aggressor: 0.3, defender: 0.35 }, exhaustion: { aggressor: 0.7, defender: 0.7 } };

  it("never climbs back over the held line on its own", () => {
    let { campaign, conflict } = atWar(cold);
    for (let i = 0; i < 52; i += 1) {
      campaign = week(campaign);
      conflict = campaign.conflicts[conflict.id]!;
      expect(conflict.intensity).toBeLessThan(HELD_FRONT_INTENSITY);
    }
    expect(conflict.status).toBe("active");
  });

  it("is put back in motion by an act that heats it", () => {
    const { campaign, conflict } = atWar(cold);
    const struck = { ...conflict, intensity: conflict.intensity + 0.2 };
    const after = week({ ...campaign, conflicts: { [conflict.id]: struck } }).conflicts[conflict.id]!;
    expect(after.exhaustion.aggressor).toBeGreaterThan(cold.exhaustion.aggressor);
  });

  it("can be written down as an armistice once both sides are rested, and ends with no victor", () => {
    let { campaign, conflict } = atWar({ intensity: 0.1, warSupport: { ...OPENING_WAR_SUPPORT }, exhaustion: { aggressor: 0, defender: 0 } });
    for (let i = 0; i < 400 && conflict.status === "active"; i += 1) {
      campaign = week(campaign);
      conflict = campaign.conflicts[conflict.id]!;
    }
    expect(conflict.status).toBe("settled");
  });

  it("files a beat the week a fought front freezes", () => {
    let { campaign, conflict } = atWar({ intensity: 0.22, exhaustion: { aggressor: 0.6, defender: 0.6 } });
    for (let i = 0; i < 12 && conflict.intensity >= HELD_FRONT_INTENSITY && conflict.status === "active"; i += 1) {
      campaign = week(campaign);
      conflict = campaign.conflicts[conflict.id]!;
    }
    if (conflict.status === "active") expect(conflict.beats.some((beat) => /front goes quiet/.test(beat.description))).toBe(true);
  });
});

describe("command quality reads doctrine for every government but the President's", () => {
  function withDoctrine(campaign: Campaign, nation: NationId, doctrineQuality: number): Campaign {
    const runtime = campaign.nations[nation]!;
    return {
      ...campaign,
      nations: { ...campaign.nations, [nation]: { ...runtime, stats: { ...runtime.stats, military: { ...runtime.stats.military, doctrineQuality } } } },
    };
  }

  it("reads an NPC's doctrine, not a flat half", () => {
    const { campaign } = atWar();
    expect(commandQuality(withDoctrine(campaign, ALP, 0.9), ALP)).toBe(0.9);
    expect(commandQuality(withDoctrine(campaign, ALP, 0.2), ALP)).toBe(0.2);
  });

  it("fights the same war to a different place for two armies a doctrine band apart", () => {
    const THIRD = "CAS" as NationId;
    const base = buildCampaign();
    const runtime = base.nations[ALP]!;
    const withThird: Campaign = { ...base, nations: { ...base.nations, [THIRD]: { ...runtime, base: { ...runtime.base, id: THIRD } } } };
    const war = openConflict(ALP, THIRD, withThird.turn, "Alpland attacks.");
    const run = (doctrine: number) => {
      let state = withDoctrine({ ...withThird, conflicts: { [war.id]: war } }, ALP, doctrine);
      for (let i = 0; i < 6; i += 1) state = week(state);
      return state.conflicts[war.id]!;
    };
    expect(run(0.95).exhaustion.aggressor).toBeLessThan(run(0.2).exhaustion.aggressor);
  });
});

describe("a war week records its casualties as bands", () => {
  it("writes both sides' bands onto the war", () => {
    const { campaign, conflict } = atWar({ intensity: 0.3 });
    const after = week(campaign).conflicts[conflict.id]!;
    expect(after.casualties?.aggressor?.killed.high).toBeGreaterThan(0);
    expect(after.casualties?.aggressor?.wounded.high).toBeGreaterThan(after.casualties!.aggressor!.killed.high);
    // The United States is the aggressor here: its own side is counted with high
    // confidence, and the other side's first weeks are a guess.
    expect(after.casualties?.aggressor?.confidence).toBe("high");
    expect(after.casualties?.defender?.confidence).toBe("low");
  });
});

describe("a war's last week", () => {
  it("keeps the final week's attrition under the settlement's standing", () => {
    // The aggressor's public is gone, so this week is its last: it is fought, then settled.
    const { campaign, conflict } = atWar({ intensity: 0.8, warSupport: { aggressor: 0, defender: 0.85 } });
    const before = campaign.nations[ALP]!.stats.politics;
    const after = conflictPhase(campaign).reduce((state, packet) => apply(state, packet), campaign);
    expect(after.conflicts[conflict.id]!.status).toBe("defender-victory");
    const politics = after.nations[ALP]!.stats.politics;
    expect(politics.regimeStability).toBeLessThan(before.regimeStability);
    expect(politics.legitimacy).toBeGreaterThan(before.legitimacy);
  });

  it("sends home a government that came in during the week the war ended", () => {
    const { campaign, conflict } = atWar();
    const id = `commitment:deployment:${ALP}:${conflict.id}`;
    const late: Commitment = {
      id,
      kind: "deployment",
      actor: ALP,
      target: { kind: "conflict", id: conflict.id },
      resource: { spec: { kind: "currency", scale: 6, suffix: "USD" }, amountPerTurn: 0 },
      source: { kind: "orderOfBattle", branch: "army", unitType: "army.division" as ForceAssetId, count: 1 },
      startedTurn: campaign.turn,
      review: "standing",
      status: "active",
      rationale: "Forces sent into the war it joined.",
    };
    const ended = settle(conflict, campaign.turn, "settled", OUTCOME_LINES.armistice);
    const settled: Campaign = { ...campaign, conflicts: { [conflict.id]: ended }, commitments: { ...campaign.commitments, [id]: late } };
    const after = apply(settled, aftermathPacket(settled, ended, false, OUTCOME_LINES.armistice));
    expect(after.commitments[id]?.status).toBe("wound-down");
  });
});

describe("the world's reading of an aggressor", () => {
  it("settles at a level set by the front's heat instead of falling every week of a long war", () => {
    const { campaign: founded } = foundedForBalance("war-opinion-level");
    const conflict = Object.values(founded.conflicts).find((c) => c.status === "active")!;
    const bystander = Object.keys(founded.nations).sort().find(
      (id) => outsideOf(conflict, id) && founded.relationships[relationshipKey(id as NationId, conflict.aggressor)],
    ) as NationId;
    const key = relationshipKey(bystander, conflict.aggressor);
    let state: Campaign = founded;
    for (let w = 0; w < 104; w++) state = week(state);
    const reading = state.relationships[key]!;
    const hottest = pressedTrustLevel(state, reading, 0.2 * 1.5 * 1.5)!;
    expect(founded.relationships[key]!.trust - reading.trust).toBeGreaterThan(0);
    expect(reading.trust).toBeGreaterThanOrEqual(hottest - 1e-9);
    expect(reading.militaryThreat).toBeLessThanOrEqual(pressedThreatLevel(state, reading, 0.125 * 1.5)! + 1e-9);
  });
});

function outsideOf(conflict: Conflict, id: string): boolean {
  const sides = [conflict.aggressor, conflict.defender, ...conflict.joined.aggressor, ...conflict.joined.defender] as string[];
  return !sides.includes(id);
}
