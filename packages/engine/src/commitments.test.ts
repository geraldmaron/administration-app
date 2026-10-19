import { describe, expect, it } from "vitest";
import type { NationId } from "@admin/world";
import { apply } from "./effects.js";
import {
  activeCommitments,
  commitmentPhase,
  commitmentWeeklyCost,
  describeCommitment,
  joinerCommitment,
  openCommitment,
  releaseWarCommitments,
  setCommitmentStatus,
  type CommitmentDraft,
} from "./commitments.js";
import { availableUnits } from "./capacity.js";
import { createSave, loadSave } from "./save.js";
import { buildCampaign as buildFixtureCampaign } from "./__fixtures__/campaign.js";
import { relationshipKey, selectRelationship, type Campaign, type NationCondition } from "./state.js";
import { deedFlag, deedTowardFlag } from "./deeds.js";
import { flagMarker } from "./marked-flags.js";
import { foundedForBalance } from "./balance-harness.js";
import { openConflict } from "./conflicts.js";
import { createRngStreams } from "./rng.js";
import { standingCommitment } from "./instrument-records.js";

const TARGET = "ALP" as NationId;

/**
 * The fixture government, with the appropriation behind it.
 *
 * `openCommitment` refuses a money promise whose first year does not fit inside
 * the budget authority on hand, and the promises in this file are deliberately
 * large — the banding tests need a commitment worth a fifth of the fixture
 * nation's output to land in the high band at all. What is under test here is
 * what a commitment *is*, not whether it fits, so these run in a government
 * whose appropriation covers it.
 */
function buildCampaign(): Campaign {
  const base = buildFixtureCampaign();
  return { ...base, player: { ...base.player, metrics: { ...base.player.metrics, treasury: 30_000 } } };
}

// The fixture only wires the USA -> ALP direction; a grudge belongs to the
// aggrieved party, so reading it back needs ALP's own read of USA too.
function withReverseRelationship(campaign: Campaign): Campaign {
  return {
    ...campaign,
    relationships: {
      ...campaign.relationships,
      [relationshipKey(TARGET, campaign.founding.nation)]: {
        from: TARGET,
        to: campaign.founding.nation,
        trust: 0.2,
        alignment: 0.1,
        tension: 0.1,
        tradeDependence: 0.2,
        militaryThreat: 0.1,
        treaties: [],
        grudges: [],
        history: [],
      },
    },
  };
}

function withCondition(campaign: Campaign, overrides: Partial<NationCondition> = {}): Campaign {
  const drought: NationCondition = {
    id: "condition:drought:ALP:1",
    nation: TARGET,
    kind: "drought",
    scope: "nation",
    severity: 0.5,
    startedTurn: 1,
    status: "active",
    beats: [{ turn: 1, description: "Ally is struck by drought nationwide." }],
    ...overrides,
  };
  return { ...campaign, conditions: { ...campaign.conditions, [drought.id]: drought } };
}

function money(campaign: Campaign, amountPerTurn = 200): CommitmentDraft {
  return {
    kind: "aid",
    actor: campaign.founding.nation,
    target: { kind: "nation", id: TARGET },
    resource: { spec: { kind: "currency", scale: 6, suffix: "USD" }, amountPerTurn },
    source: { kind: "budgetLine", line: "foreignAffairs" },
    review: "standing",
    rationale: "A country the administration decided to keep standing.",
  };
}

function open(campaign: Campaign, draft: CommitmentDraft): Campaign {
  const result = openCommitment(campaign, draft);
  if (!result.ok) throw new Error(result.reason);
  return apply(campaign, result.packet);
}

function withOrderOfBattle(campaign: Campaign, brigades: number): Campaign {
  const runtime = campaign.nations[campaign.founding.nation]!;
  const military = runtime.stats.military;
  return {
    ...campaign,
    nations: {
      ...campaign.nations,
      [campaign.founding.nation]: {
        ...runtime,
        stats: {
          ...runtime.stats,
          military: {
            ...military,
            orderOfBattle: {
              army: { headcount: 20_000, units: [{ type: "army.brigade-combat-team", count: brigades, readiness: 0.8 }] },
              navy: { headcount: 0 },
              air: { headcount: 0 },
              marines: { headcount: 0 },
              space: { headcount: 0 },
              cyber: { headcount: 0 },
            },
          },
        },
      },
    },
  };
}

describe("standing commitments", () => {
  it("is a fact the campaign carries, not an effect that happened once", () => {
    const after = open(buildCampaign(), money(buildCampaign()));
    expect(activeCommitments(after, after.founding.nation)).toHaveLength(1);
  });

  it("is charged every week it stands, through the ordinary packet path", () => {
    const base = open(buildCampaign(), money(buildCampaign(), 200));
    const packets = commitmentPhase(base);
    expect(packets).toHaveLength(1);
    const after = apply(base, packets[0]!);
    expect(after.player.metrics.treasury).toBe(base.player.metrics.treasury - 200);
    expect(commitmentWeeklyCost(base)).toBe(200);
  });

  it("pays in stability what the authority cannot carry, rather than forgiving it", () => {
    const opened = open(buildCampaign(), money(buildCampaign(), 500));
    const deltasAt = (treasury: number) => {
      const state = { ...opened, player: { ...opened.player, metrics: { ...opened.player.metrics, treasury } } };
      const metric = commitmentPhase(state)[0]!.effects.find((effect) => effect.kind === "metric");
      return metric?.kind === "metric" ? metric.deltas : {};
    };
    const empty = deltasAt(0);
    expect(empty.treasury).toBeUndefined();
    expect(empty.stability).toBeLessThan(0);
    const funded = deltasAt(10_000);
    expect(funded.treasury).toBe(-500);
    expect(funded.stability).toBeUndefined();
  });

  it("takes the units it deploys out of the homeland bench", () => {
    const base = withOrderOfBattle(buildCampaign(), 10);
    expect(availableUnits(base, base.founding.nation, "army")).toBe(10);
    const deployed = open(base, {
      ...money(base, 0),
      kind: "deployment",
      source: { kind: "orderOfBattle", branch: "army", unitType: "army.brigade-combat-team", count: 6 },
      rationale: "A theater the administration chose to be in.",
    });
    expect(availableUnits(deployed, deployed.founding.nation, "army")).toBe(4);
  });

  it("refuses a deployment the order of battle cannot supply rather than promising it anyway", () => {
    const base = withOrderOfBattle(buildCampaign(), 10);
    const deployed = open(base, {
      ...money(base, 0),
      kind: "deployment",
      source: { kind: "orderOfBattle", branch: "army", unitType: "army.brigade-combat-team", count: 6 },
      rationale: "The first theater.",
    });
    const second = openCommitment(deployed, {
      ...money(deployed, 0),
      kind: "deployment",
      source: { kind: "orderOfBattle", branch: "army", unitType: "army.brigade-combat-team", count: 6 },
      rationale: "The second crisis, which finds a thinner bench.",
    });
    expect(second.ok).toBe(false);
    if (!second.ok) expect(second.reason).toContain("uncommitted");
  });

  it("stops costing anything once it is wound down, and is kept as a record", () => {
    const base = open(buildCampaign(), money(buildCampaign(), 200));
    const id = Object.keys(base.commitments)[0]!;
    const ended = setCommitmentStatus(base, id, "wound-down", "The program had run its course.");
    expect(ended.ok).toBe(true);
    if (!ended.ok) return;
    const after = apply(base, ended.packet);
    expect(commitmentWeeklyCost(after)).toBe(0);
    // Kept rather than deleted: what an administration promised and then
    // stopped paying for is the fact the country it promised remembers.
    expect(after.commitments[id]).toBeDefined();
    expect(after.commitments[id]!.endedTurn).toBe(base.turn);
  });

  it("lapses on its own when it was given a term", () => {
    const base = buildCampaign();
    const termed = open(base, { ...money(base), review: { endsTurn: base.turn + 1 } });
    const later: Campaign = { ...termed, turn: termed.turn + 2 };
    const after = commitmentPhase(later).reduce((acc, packet) => apply(acc, packet), later);
    expect(activeCommitments(after, after.founding.nation)).toHaveLength(0);
  });

  it("survives a save round-trip without an absent value becoming an explicit undefined", () => {
    const base = open(buildCampaign(), money(buildCampaign()));
    const round = loadSave(JSON.parse(JSON.stringify(createSave(base))));
    const commitment = Object.values(round.commitments)[0]!;
    expect(commitment.review).toBe("standing");
    // A standing commitment has no `endedTurn`, and the key must be absent
    // rather than present-and-undefined — JSON drops the latter, so a shape
    // written with one is not the shape that comes back.
    expect("endedTurn" in commitment).toBe(false);
    expect(activeCommitments(round, round.founding.nation)).toHaveLength(1);
  });

  it("refuses a campaign saved before commitments existed rather than half-reading it", () => {
    const base = buildCampaign();
    const { commitments: _dropped, ...withoutCommitments } = base;
    expect(() => loadSave({ schemaVersion: 14, campaign: withoutCommitments })).toThrow(
      /no migration path/,
    );
  });
});

describe("winding down or suspending costs a grudge", () => {
  it("gives the target a grudge and a colder relationship when a standing commitment is wound down early", () => {
    const base = withReverseRelationship(open(buildCampaign(), money(buildCampaign())));
    const id = Object.keys(base.commitments)[0]!;
    const before = selectRelationship(base, TARGET, base.founding.nation)!;
    const ended = setCommitmentStatus(base, id, "wound-down", "The program is over.");
    expect(ended.ok).toBe(true);
    if (!ended.ok) return;
    const after = apply(base, ended.packet);
    const relationship = selectRelationship(after, TARGET, base.founding.nation)!;
    expect(relationship.grudges).toHaveLength(1);
    expect(relationship.grudges[0]!.cause).toBe("commitment-withdrawn");
    expect(relationship.grudges[0]!.weight).toBeGreaterThan(0);
    expect(relationship.trust).toBeLessThan(before.trust);
    expect(relationship.tension).toBeGreaterThan(before.tension);
  });

  it("weighs a wind-down harder than a suspension of the same commitment, because a suspension can still be reversed", () => {
    const base = withReverseRelationship(open(buildCampaign(), money(buildCampaign())));
    const id = Object.keys(base.commitments)[0]!;
    const woundDown = setCommitmentStatus(base, id, "wound-down", "Ended.");
    const suspended = setCommitmentStatus(base, id, "suspended", "Paused.");
    if (!woundDown.ok || !suspended.ok) throw new Error("expected both to succeed");
    const woundDownWeight = (woundDown.packet.effects[1] as { addGrudge: { weight: number } }).addGrudge.weight;
    const suspendedWeight = (suspended.packet.effects[1] as { addGrudge: { weight: number } }).addGrudge.weight;
    expect(woundDownWeight).toBeGreaterThan(suspendedWeight);
  });

  it("weighs a commitment cut short earlier in its term harder than one stopped near its own end", () => {
    const base = buildCampaign();
    const termed = withReverseRelationship(
      open(base, { ...money(base), review: { endsTurn: base.turn + 10 } }),
    );
    const id = Object.keys(termed.commitments)[0]!;
    const early: Campaign = { ...termed, turn: termed.turn + 1 }; // 9 of 10 weeks still owed
    const late: Campaign = { ...termed, turn: termed.turn + 9 }; // 1 of 10 weeks still owed
    const earlyResult = setCommitmentStatus(early, id, "wound-down", "Cut short.");
    const lateResult = setCommitmentStatus(late, id, "wound-down", "Nearly done anyway.");
    if (!earlyResult.ok || !lateResult.ok) throw new Error("expected both to succeed");
    const earlyWeight = (earlyResult.packet.effects[1] as { addGrudge: { weight: number } }).addGrudge.weight;
    const lateWeight = (lateResult.packet.effects[1] as { addGrudge: { weight: number } }).addGrudge.weight;
    expect(earlyWeight).toBeGreaterThan(lateWeight);
  });

  it("does not grudge a commitment wound down at or after its own stated end — nothing was cut short", () => {
    const base = buildCampaign();
    const termed = withReverseRelationship(
      open(base, { ...money(base), review: { endsTurn: base.turn + 1 } }),
    );
    const id = Object.keys(termed.commitments)[0]!;
    const atTerm: Campaign = { ...termed, turn: termed.turn + 1 };
    const ended = setCommitmentStatus(atTerm, id, "wound-down", "Its term is up.");
    expect(ended.ok).toBe(true);
    if (!ended.ok) return;
    // The status change and the withdrawal deed (the government still wound
    // it down, whatever its own paper said) — but no grudge, since nothing
    // was cut short.
    expect(ended.packet.effects).toHaveLength(2);
    const after = apply(atTerm, ended.packet);
    expect(selectRelationship(after, TARGET, base.founding.nation)!.grudges).toHaveLength(0);
  });

  it("does not grudge a commitment that lapses on schedule through commitmentPhase — that is a promise kept, not broken", () => {
    const base = buildCampaign();
    const termed = withReverseRelationship(
      open(base, { ...money(base), review: { endsTurn: base.turn + 1 } }),
    );
    const later: Campaign = { ...termed, turn: termed.turn + 2 };
    const after = commitmentPhase(later).reduce((acc, packet) => apply(acc, packet), later);
    expect(selectRelationship(after, TARGET, base.founding.nation)!.grudges).toHaveLength(0);
  });

  it("does not grudge winding down a commitment made to a conflict or an organization, only to a nation", () => {
    const base = buildCampaign();
    const draft: CommitmentDraft = {
      ...money(base),
      target: { kind: "conflict", id: "conflict-1" },
    };
    const opened = open(base, draft);
    const id = Object.keys(opened.commitments)[0]!;
    const ended = setCommitmentStatus(opened, id, "wound-down", "The war is over.");
    expect(ended.ok).toBe(true);
    if (!ended.ok) return;
    // The status change and the unbound withdrawal deed, but no bound
    // `deed-toward` and no grudge — a conflict is not a nation to blame.
    expect(ended.packet.effects).toHaveLength(2);
  });
});

describe("a lapse that leaves a live need standing costs the target a smaller grudge", () => {
  it("does not grudge a lapse whose named need has since resolved", () => {
    const base = buildCampaign();
    const termed = withReverseRelationship(
      open(base, {
        ...money(base),
        review: { endsTurn: base.turn + 1 },
        addressedCondition: { kind: "drought", nation: TARGET },
      }),
    );
    // No matching active condition exists — the drought this commitment
    // named was never opened here, which reads exactly like "resolved": the
    // promise ran its course over a need that no longer stands.
    const later: Campaign = { ...termed, turn: termed.turn + 2 };
    const after = commitmentPhase(later).reduce((acc, packet) => apply(acc, packet), later);
    expect(selectRelationship(after, TARGET, base.founding.nation)!.grudges).toHaveLength(0);
  });

  it("grudges a lapse whose named need still stands", () => {
    const base = withCondition(buildCampaign());
    const termed = withReverseRelationship(
      open(base, {
        ...money(base),
        review: { endsTurn: base.turn + 1 },
        addressedCondition: { kind: "drought", nation: TARGET },
      }),
    );
    const later: Campaign = { ...termed, turn: termed.turn + 2 };
    const after = commitmentPhase(later).reduce((acc, packet) => apply(acc, packet), later);
    const relationship = selectRelationship(after, TARGET, base.founding.nation)!;
    expect(relationship.grudges).toHaveLength(1);
    expect(relationship.grudges[0]!.cause).toBe("commitment-lapsed");
    expect(relationship.grudges[0]!.weight).toBeGreaterThan(0);
  });

  it("weighs a live-need lapse below an early deliberate wind-down of the same size commitment", () => {
    const base = withCondition(buildCampaign());
    const opened = withReverseRelationship(
      open(base, {
        ...money(base),
        review: { endsTurn: base.turn + 10 },
        addressedCondition: { kind: "drought", nation: TARGET },
      }),
    );
    const id = Object.keys(opened.commitments)[0]!;

    // The same commitment, cut short early in its own term.
    const early: Campaign = { ...opened, turn: opened.turn + 1 };
    const withdrawn = setCommitmentStatus(early, id, "wound-down", "Cut short.");
    if (!withdrawn.ok) throw new Error(withdrawn.reason);
    const withdrawalWeight = (withdrawn.packet.effects[1] as { addGrudge: { weight: number } }).addGrudge.weight;

    // The same commitment, left to run its full term while the need it
    // named is still live.
    const later: Campaign = { ...opened, turn: opened.turn + 10 };
    const lapsePackets = commitmentPhase(later);
    const lapseEffect = lapsePackets[0]!.effects.find((e) => e.kind === "relationship") as
      | { addGrudge: { weight: number } }
      | undefined;
    expect(lapseEffect).toBeDefined();
    expect(lapseEffect!.addGrudge.weight).toBeLessThan(withdrawalWeight);
  });
});

function forceDraft(campaign: Campaign, count: number): CommitmentDraft {
  return {
    kind: "deployment",
    actor: campaign.founding.nation,
    target: { kind: "nation", id: TARGET },
    resource: { spec: { kind: "currency", scale: 6, suffix: "USD" }, amountPerTurn: 50 },
    source: { kind: "orderOfBattle", branch: "army", unitType: "army.brigade-combat-team", count },
    review: "standing",
    rationale: "A deployment sized to test the order-of-battle band.",
  };
}

// gdp is 50,000 in the fixture, so the three money() amounts below sit
// cleanly either side of the 0.1% / 0.5% cuts commitmentBand reads against
// it: 40 -> 0.08% (low), 200 -> 0.4% (mid), 400 -> 0.8% (high).
describe("pledge and withdrawal deeds", () => {
  it("stamps deed:pledge:<band>:landed, banded on the commitment's own share of GDP", () => {
    const base = buildCampaign();
    const opened = openCommitment(base, money(base, 400));
    if (!opened.ok) throw new Error(opened.reason);
    const flags = opened.packet.effects.find((e) => e.kind === "flag")?.set ?? [];
    expect(flags).toContain(deedFlag("pledge", "high", "landed"));
    expect(flags).toContain(deedTowardFlag(TARGET, "pledge", "high", "landed"));
    expect(flags).toContain(flagMarker(deedFlag("pledge", "high", "landed"), base.turn));
  });

  it("bands a low-share commitment low and a mid-share commitment mid", () => {
    const base = buildCampaign();
    const low = openCommitment(base, money(base, 40));
    const mid = openCommitment(base, money(base, 200));
    if (!low.ok || !mid.ok) throw new Error("expected both to open");
    const lowFlags = low.packet.effects.find((e) => e.kind === "flag")?.set ?? [];
    const midFlags = mid.packet.effects.find((e) => e.kind === "flag")?.set ?? [];
    expect(lowFlags).toContain(deedFlag("pledge", "low", "landed"));
    expect(midFlags).toContain(deedFlag("pledge", "mid", "landed"));
  });

  it("bands a force commitment on the fraction of the order of battle it removes, not on GDP", () => {
    const base = withOrderOfBattle(buildCampaign(), 2_000); // 1 of 2,000 brigades: 0.05%, low
    const low = openCommitment(base, forceDraft(base, 1));
    if (!low.ok) throw new Error(low.reason);
    const lowFlags = low.packet.effects.find((e) => e.kind === "flag")?.set ?? [];
    expect(lowFlags).toContain(deedFlag("pledge", "low", "landed"));

    const heavy = withOrderOfBattle(buildCampaign(), 100); // 1 of 100 brigades: 1%, high
    const high = openCommitment(heavy, forceDraft(heavy, 1));
    if (!high.ok) throw new Error(high.reason);
    const highFlags = high.packet.effects.find((e) => e.kind === "flag")?.set ?? [];
    expect(highFlags).toContain(deedFlag("pledge", "high", "landed"));
  });

  it("bands a force commitment low, not high, when the actor's order of battle was never authored", () => {
    // withOrderOfBattle is not applied — the fixture's default order of
    // battle has no army units to divide by, the same reading forceShortfall
    // gives it: an unwritten bench is not an empty one, and inventing a band
    // for it would be a judgment this derivation is supposed not to make.
    const base = buildCampaign();
    const opened = openCommitment(base, forceDraft(base, 1));
    if (!opened.ok) throw new Error(opened.reason);
    const flags = opened.packet.effects.find((e) => e.kind === "flag")?.set ?? [];
    expect(flags).toContain(deedFlag("pledge", "low", "landed"));
  });

  it("stamps only the unbound form when the commitment targets a conflict or an org, not a nation", () => {
    const base = buildCampaign();
    const draft: CommitmentDraft = { ...money(base, 200), target: { kind: "conflict", id: "conflict-1" } };
    const opened = openCommitment(base, draft);
    if (!opened.ok) throw new Error(opened.reason);
    const flags = opened.packet.effects.find((e) => e.kind === "flag")?.set ?? [];
    expect(flags).toContain(deedFlag("pledge", "mid", "landed"));
    expect(flags.filter((f) => f.startsWith("deed-toward:"))).toEqual([]);
  });

  it("does not stamp a pledge deed for a commitment opened by anyone other than the player's own government", () => {
    const base = buildCampaign();
    const draft: CommitmentDraft = { ...money(base, 200), actor: TARGET };
    const opened = openCommitment(base, draft);
    if (!opened.ok) throw new Error(opened.reason);
    expect(opened.packet.effects).toHaveLength(1); // only the commitment record, no deed
  });

  it("stamps deed:withdrawal:<band>:landed on a deliberate wind-down, always landed — walking away does not fail", () => {
    const base = open(buildCampaign(), money(buildCampaign(), 400));
    const id = Object.keys(base.commitments)[0]!;
    const ended = setCommitmentStatus(base, id, "wound-down", "The program is over.");
    if (!ended.ok) throw new Error(ended.reason);
    const flags = ended.packet.effects.find((e) => e.kind === "flag")?.set ?? [];
    expect(flags).toContain(deedFlag("withdrawal", "high", "landed"));
    expect(flags).toContain(deedTowardFlag(TARGET, "withdrawal", "high", "landed"));
  });

  it("stamps a withdrawal deed on a suspension too, the same act the grudge answers", () => {
    const base = open(buildCampaign(), money(buildCampaign(), 400));
    const id = Object.keys(base.commitments)[0]!;
    const suspended = setCommitmentStatus(base, id, "suspended", "Paused pending review.");
    if (!suspended.ok) throw new Error(suspended.reason);
    const flags = suspended.packet.effects.find((e) => e.kind === "flag")?.set ?? [];
    expect(flags).toContain(deedFlag("withdrawal", "high", "landed"));
  });

  it("does not stamp a withdrawal deed for commitmentPhase's own automatic lapse — nothing was withdrawn", () => {
    const base = buildCampaign();
    const termed = open(base, { ...money(base), review: { endsTurn: base.turn + 1 } });
    const later: Campaign = { ...termed, turn: termed.turn + 2 };
    const packets = commitmentPhase(later);
    const flags = packets.flatMap((p) => p.effects.filter((e) => e.kind === "flag").flatMap((e) => e.set ?? []));
    expect(flags.filter((f) => f.startsWith("deed"))).toEqual([]);
  });

  it("is a fact, not a tally: applying the same pledge packet twice leaves the same flag record", () => {
    const base = buildCampaign();
    const opened = openCommitment(base, money(base, 400));
    if (!opened.ok) throw new Error(opened.reason);
    const once = apply(base, opened.packet);
    const twice = apply(once, opened.packet);
    expect(twice.player.flags).toEqual(once.player.flags);
    expect(once.player.flags[deedFlag("pledge", "high", "landed")]).toBe(true);
  });

  it("is a fact, not a tally: applying the same withdrawal packet twice leaves the same flag record", () => {
    const base = open(buildCampaign(), money(buildCampaign(), 400));
    const id = Object.keys(base.commitments)[0]!;
    const ended = setCommitmentStatus(base, id, "wound-down", "The program is over.");
    if (!ended.ok) throw new Error(ended.reason);
    const once = apply(base, ended.packet);
    const twice = apply(once, ended.packet);
    expect(twice.player.flags).toEqual(once.player.flags);
    expect(once.player.flags[deedFlag("withdrawal", "high", "landed")]).toBe(true);
  });
});

describe("what the record calls a commitment", () => {
  it("names the country it is to, not its id", () => {
    const base = buildCampaign();
    const opened = openCommitment(base, money(base));
    if (!opened.ok) throw new Error(opened.reason);
    const name = base.nations[TARGET]!.base.identity.name;
    expect(opened.packet.narration.summary).toContain(`an assistance package to ${name}`);
    expect(opened.packet.narration.summary).not.toContain(` ${TARGET},`);
  });

  it("names a war by its two sides, and falls back to the id with no board to read", () => {
    const base = buildCampaign();
    const campaign: Campaign = {
      ...base,
      conflicts: {
        ...base.conflicts,
        "conflict-1": { ...Object.values(base.conflicts)[0]!, id: "conflict-1", aggressor: TARGET, defender: base.founding.nation },
      },
    };
    const opened = open(campaign, { ...money(campaign), kind: "sustainment", target: { kind: "conflict", id: "conflict-1" } });
    const commitment = Object.values(opened.commitments)[0]!;
    expect(describeCommitment(commitment, opened)).toBe(
      `the sustainment of the war between ${campaign.nations[TARGET]!.base.identity.name} and ${campaign.nations[campaign.founding.nation]!.base.identity.name}`,
    );
    expect(describeCommitment(commitment)).toBe("the sustainment of conflict-1");
  });
});

// Another government that joins a war goes in with something, and the war
// file can say what.
describe("a joiner's forces in the war it joined", () => {
  function npcWar(): { campaign: Campaign; id: string } {
    const { campaign } = foundedForBalance("joiner-forces");
    const war = { ...openConflict("RUS" as NationId, "EST" as NationId, campaign.turn, "The border is crossed."), joined: { aggressor: [], defender: ["NLD" as NationId, "LVA" as NationId] } };
    return { campaign: { ...campaign, conflicts: { ...campaign.conflicts, [war.id]: war } }, id: war.id };
  }

  it("sizes the commitment from the joiner's own land force where its order of battle names one", () => {
    const { campaign, id } = npcWar();
    const committed = joinerCommitment(campaign, "NLD" as NationId, id)!;
    expect(committed.actor).toBe("NLD");
    expect(committed.target).toEqual({ kind: "conflict", id });
    expect(committed.source.kind).toBe("orderOfBattle");
    expect(committed.status).toBe("active");
  });

  it("draws on the defense budget where the dataset never decomposed the joiner's army", () => {
    const { campaign, id } = npcWar();
    const committed = joinerCommitment(campaign, "LVA" as NationId, id)!;
    expect(committed.source).toEqual({ kind: "budgetLine", line: "defense" });
    expect(committed.resource.amountPerTurn).toBeGreaterThan(0);
  });

  it("writes nothing for the President's country, whose forces go in only by an order", () => {
    const { campaign, id } = npcWar();
    expect(joinerCommitment(campaign, campaign.founding.nation, id)).toBeUndefined();
  });

  it("is what an act by a joiner against the side it is fighting returns, once", () => {
    const { campaign, id } = npcWar();
    const ctx = { campaign, actor: "LVA" as NationId, target: "RUS" as NationId, streams: createRngStreams(campaign.seed) };
    const spec = { kind: "sustainment" as const, shareOfGdp: 0.0001, line: "defense" as const, rationale: "A front to hold." };
    const first = standingCommitment(ctx, spec);
    expect(first).toHaveLength(1);
    expect(first[0]!.kind === "commitment" ? first[0]!.set.target.id : undefined).toBe(id);
    const after = apply(campaign, { source: "simulate", actor: "world", turn: campaign.turn, narration: { summary: "Committed." }, effects: [...first] });
    expect(standingCommitment({ ...ctx, campaign: after }, spec)).toEqual([]);
    expect(standingCommitment({ ...ctx, actor: "FRA" as NationId }, spec)).toEqual([]);
  });

  it("comes home when the war ends", () => {
    const { campaign, id } = npcWar();
    const committed = joinerCommitment(campaign, "LVA" as NationId, id)!;
    const withIt = { ...campaign, commitments: { ...campaign.commitments, [committed.id]: committed } };
    const released = releaseWarCommitments(withIt, id, ["RUS" as NationId, "EST" as NationId], "The war is over.");
    expect(released.some((effect) => effect.kind === "commitment" && effect.set.id === committed.id && effect.set.status === "wound-down")).toBe(true);
  });
});

describe("commitment identity", () => {
  it("keeps two different operations of one kind, actor, target and week as two commitments", () => {
    const base = buildCampaign();
    const first = money(base, 200);
    const second: CommitmentDraft = { ...money(base, 300), source: { kind: "budgetLine", line: "defense" } };
    const after = open(open(base, first), second);
    expect(Object.keys(after.commitments)).toHaveLength(2);
    expect(Object.values(after.commitments).map((c) => c.resource.amountPerTurn).sort()).toEqual([200, 300]);
  });

  it("is idempotent when the same operation is submitted again", () => {
    const base = buildCampaign();
    const once = open(base, money(base, 200));
    const twice = open(once, money(base, 200));
    expect(Object.keys(twice.commitments)).toEqual(Object.keys(once.commitments));
  });
});
