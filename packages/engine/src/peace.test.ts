import { describe, expect, it } from "vitest";
import { buildCampaign, nationA, nationB } from "./__fixtures__/campaign.js";
import { apply } from "./effects.js";
import { openConflict, termsOfferedFlag } from "./conflicts.js";
import { joinConflict } from "./war-entry.js";
import {
  ACCEPTS_TERMS,
  alliancePackets,
  coolFront,
  departurePackets,
  leaveWar,
  npcSettlementPacket,
  offerTerms,
  peaceReading,
  projectLeave,
  projectPeace,
  selectPeaceTables,
  settleWar,
  weighPeace,
} from "./peace.js";
import { activeCommitments } from "./commitments.js";
import { foundedForBalance } from "./balance-harness.js";
import { createRngStreams } from "./rng.js";
import type { NationId } from "@admin/world";
import type { Campaign, Commitment, Conflict } from "./state.js";

const USA = nationA.id;
const ALP = nationB.id;

function atWar(overrides: Partial<Conflict> = {}): Campaign {
  const campaign = buildCampaign();
  const conflict = { ...openConflict(USA, ALP, campaign.turn, "USA invades ALP"), ...overrides };
  return { ...campaign, conflicts: { [conflict.id]: conflict } };
}

function idOf(campaign: Campaign): string {
  return Object.keys(campaign.conflicts)[0]!;
}

/** Terms on the table, for the tests whose subject is what happens after that. */
function withTermsOffered(campaign: Campaign): Campaign {
  const result = offerTerms(campaign, idOf(campaign));
  if (!result.ok) throw new Error(result.reason);
  return apply(campaign, result.packet);
}

/** A defender who is worn out, out of support at home, and therefore ready to sign. */
function spentDefender(campaign: Campaign): Campaign {
  const id = idOf(campaign);
  const conflict = campaign.conflicts[id]!;
  return {
    ...campaign,
    conflicts: {
      [id]: {
        ...conflict,
        exhaustion: { ...conflict.exhaustion, defender: 0.8 },
        warSupport: { ...conflict.warSupport, defender: 0.1 },
      },
    },
  };
}

describe("reading the peace table", () => {
  it("reads nothing where this government is not a party", () => {
    const campaign = buildCampaign();
    expect(selectPeaceTables(campaign)).toHaveLength(0);
  });

  it("reads one table per live war, from the other side's point of view", () => {
    const campaign = spentDefender(atWar());
    const tables = selectPeaceTables(campaign);
    expect(tables).toHaveLength(1);
    expect(tables[0]!.counterpart).toBe(ALP);
    expect(tables[0]!.ourSide).toBe("aggressor");
    expect(tables[0]!.wouldAccept).toBe(true);
  });

  it("names a counterpart the way a sentence carries it", () => {
    const base = atWar();
    const campaign: Campaign = {
      ...base,
      nations: {
        ...base.nations,
        [ALP]: { ...base.nations[ALP]!, base: { ...base.nations[ALP]!.base, identity: { ...base.nations[ALP]!.base.identity, name: "United Kingdom" } } },
      },
    };
    const table = projectPeace(campaign, idOf(campaign))!;
    expect(table.counterpartName).toBe("the United Kingdom");
    expect(table.reasoning.startsWith("The United Kingdom ")).toBe(true);

    const cooled = coolFront(campaign, idOf(campaign));
    if (!cooled.ok) throw new Error(cooled.reason);
    expect(cooled.packet.narration.summary).toContain("on the United Kingdom front");
  });

  it("does not read a war that has already ended", () => {
    const campaign = atWar({ status: "settled" });
    expect(projectPeace(campaign, idOf(campaign))).toBeUndefined();
    expect(selectPeaceTables(campaign)).toHaveLength(0);
  });

  it("holds a fresh opponent unwilling — nothing has worn them down yet", () => {
    const campaign = atWar();
    expect(projectPeace(campaign, idOf(campaign))!.wouldAccept).toBe(false);
  });
});

describe("suing for peace", () => {
  it("costs standing whether or not the other side would take it", () => {
    const campaign = atWar();
    const result = offerTerms(campaign, idOf(campaign));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.packet.effects).toContainEqual({ kind: "metric", deltas: { standing: -0.02 } });
  });

  it("puts terms on the table, and refuses to put them there twice", () => {
    const campaign = atWar();
    const first = offerTerms(campaign, idOf(campaign));
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    const after = apply(campaign, first.packet);
    expect(projectPeace(after, idOf(after))!.offered).toBe(true);
    const again = offerTerms(after, idOf(after));
    expect(again.ok).toBe(false);
  });
});

describe("ending it at a table", () => {
  it("refuses before terms are put, naming the missing half", () => {
    const campaign = spentDefender(atWar());
    const result = settleWar(campaign, idOf(campaign));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toContain("Terms come before a signature");
  });

  it("refuses while the other side is still willing to fight", () => {
    const campaign = atWar();
    const offered = withTermsOffered(campaign);
    const result = settleWar(offered, idOf(offered));
    expect(result.ok).toBe(false);
  });

  it("settles once both halves are there", () => {
    const campaign = spentDefender(atWar());
    const offered = withTermsOffered(campaign);
    expect(offered.player.flags[termsOfferedFlag(idOf(offered)) as never]).toBe(true);
    const result = settleWar(offered, idOf(offered));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const after = apply(offered, result.packet);
    expect(after.conflicts[idOf(after)]!.status).toBe("settled");
  });
});

describe("cooling a front", () => {
  it("steps the intensity down and leaves the war running", () => {
    const campaign = atWar({ intensity: 0.6 });
    const result = coolFront(campaign, idOf(campaign));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const after = apply(campaign, result.packet);
    const conflict = after.conflicts[idOf(after)]!;
    expect(conflict.intensity).toBeCloseTo(0.4);
    expect(conflict.status).toBe("active");
  });

  it("refuses on a front that is already as quiet as a war gets", () => {
    const campaign = atWar({ intensity: 0 });
    expect(coolFront(campaign, idOf(campaign)).ok).toBe(false);
  });
});

// A rung-5 act opens a war and, in the same packet, the sustainment commitment
// that keeps the corps in the field. Ending the war touched the conflict and
// nothing else, so the sustainment went on billing the treasury and holding the
// order of battle short for the rest of the campaign — a `standing` review
// never lapses on its own.
describe("what a war stops costing once it is over", () => {
  function sustaining(campaign: Campaign, overrides: Partial<Commitment> = {}): Campaign {
    const commitment: Commitment = {
      id: "commitment:sustainment:USA:ALP:1",
      kind: "sustainment",
      actor: USA,
      target: { kind: "nation", id: ALP as string },
      resource: { spec: { kind: "currency", scale: 6, suffix: "USD" }, amountPerTurn: 1_900 },
      source: { kind: "orderOfBattle", branch: "army", unitType: "army.brigade-combat-team", count: 8 },
      startedTurn: campaign.turn,
      review: "standing",
      status: "active",
      rationale: "A corps in the field has to be fed for as long as it is there.",
      ...overrides,
    };
    return { ...campaign, commitments: { ...campaign.commitments, [commitment.id]: commitment } };
  }

  it("winds down the sustainment of a war that has been settled at a table", () => {
    const campaign = sustaining(withTermsOffered(spentDefender(atWar())));
    expect(activeCommitments(campaign, USA)).toHaveLength(1);
    const result = settleWar(campaign, idOf(campaign));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const after = apply(campaign, result.packet);
    expect(activeCommitments(after, USA)).toHaveLength(0);
    const wound = Object.values(after.commitments)[0]!;
    expect(wound.status).toBe("wound-down");
    expect(wound.endedTurn).toBe(campaign.turn);
  });

  it("leaves aid and guarantees alone — those outlive the war they were made during", () => {
    const campaign = sustaining(withTermsOffered(spentDefender(atWar())), {
      id: "commitment:aid:USA:ALP:1",
      kind: "aid",
      source: { kind: "budgetLine", line: "foreignAffairs" },
    });
    const result = settleWar(campaign, idOf(campaign));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(activeCommitments(apply(campaign, result.packet), USA)).toHaveLength(1);
  });
});

// The counterpart's character and its danger at home are part of the verdict.
describe("what the other government is like", () => {
  function counterpartWith(campaign: Campaign, changes: { vengefulness?: number; regimeStability?: number; factionalism?: number }): Campaign {
    const runtime = campaign.nations[ALP]!;
    return {
      ...campaign,
      nations: {
        ...campaign.nations,
        [ALP]: {
          ...runtime,
          traits: { ...runtime.traits, vengefulness: changes.vengefulness ?? runtime.traits.vengefulness },
          stats: {
            ...runtime.stats,
            politics: {
              ...runtime.stats.politics,
              regimeStability: changes.regimeStability ?? runtime.stats.politics.regimeStability,
              factionalism: changes.factionalism ?? runtime.stats.politics.factionalism,
            },
          },
        },
      },
    };
  }

  const worn = () => atWar({ exhaustion: { aggressor: 0.2, defender: 0.6 }, warSupport: { aggressor: 0.7, defender: 0.5 } });

  it("gives a vengeful and a forgiving counterpart at equal exhaustion different verdicts, each stated", () => {
    const forgiving = projectPeace(counterpartWith(worn(), { vengefulness: 0.05 }), idOf(worn()))!;
    const vengeful = projectPeace(counterpartWith(worn(), { vengefulness: 0.9 }), idOf(worn()))!;
    expect(forgiving.wouldAccept).toBe(true);
    expect(vengeful.wouldAccept).toBe(false);
    expect(vengeful.reasoning).toContain("grudge");
    expect(forgiving.reasoning).not.toBe(vengeful.reasoning);
    expect(vengeful.leading).toContain("vengefulness");
  });

  it("lowers the bar for a government in danger at home", () => {
    const calm = projectPeace(counterpartWith(worn(), { regimeStability: 0.9, factionalism: 0.2 }), idOf(worn()))!;
    const shaken = projectPeace(counterpartWith(worn(), { regimeStability: 0.1, factionalism: 0.9 }), idOf(worn()))!;
    expect(calm.threshold).toBe(ACCEPTS_TERMS);
    expect(shaken.threshold).toBeLessThan(ACCEPTS_TERMS);
  });

  it("projects exactly the decision with no noise in it, and draws nothing", () => {
    const campaign = worn();
    const projection = projectPeace(campaign, idOf(campaign))!;
    const decision = weighPeace(peaceReading(campaign, campaign.conflicts[idOf(campaign)]!, "defender"));
    expect(decision.acts).toBe(projection.wouldAccept);
    expect(decision.threshold).toBe(projection.threshold);
    expect(projectPeace(campaign, idOf(campaign))).toEqual(projection);
  });

  it("stamps the counterpart's acceptance on the settlement it signs", () => {
    const offered = withTermsOffered(spentDefender(atWar()));
    const result = settleWar(offered, idOf(offered));
    if (!result.ok) throw new Error(result.reason);
    const decision = result.packet.provenance?.decision;
    expect(decision?.question).toBe("accept-peace");
    expect(decision?.actor).toBe(ALP);
    expect(decision?.acts).toBe(true);
  });
});

// Two other governments can end their own war, and a government that came in
// can go home without the war ending.
describe("peace between other governments", () => {
  const RUS = "RUS" as NationId;
  const EST = "EST" as NationId;
  const POL = "POL" as NationId;

  function npcWar(seed: string, overrides: Partial<Conflict> = {}): { campaign: Campaign; war: Conflict } {
    const { campaign } = foundedForBalance(seed);
    const war = { ...openConflict(RUS, EST, campaign.turn, "The border is crossed."), ...overrides };
    return { campaign: { ...campaign, conflicts: { ...campaign.conflicts, [war.id]: war } }, war };
  }

  const spent = { exhaustion: { aggressor: 0.9, defender: 0.9 }, warSupport: { aggressor: 0.05, defender: 0.05 } };

  it("ends a war both principals want out of by agreement, with no victor, a feed item and the deciding stamp", () => {
    const { campaign, war } = npcWar("peace-npc-1", spent);
    const packet = npcSettlementPacket(campaign, war, createRngStreams(campaign.seed));
    if (!packet) throw new Error("two spent governments did not settle");
    const set = packet.effects.find((effect) => effect.kind === "conflict");
    expect(set && set.kind === "conflict" ? set.set.status : undefined).toBe("settled");
    expect(packet.effects.some((effect) => effect.kind === "feed")).toBe(true);
    const decision = packet.provenance?.decision;
    expect(decision?.question).toBe("accept-peace");
    const reading = peaceReading(campaign, war, decision!.actor === RUS ? "aggressor" : "defender");
    expect(decision?.terms).toEqual(reading.terms);
  });

  it("leaves a fresh war running", () => {
    const { campaign, war } = npcWar("peace-npc-2");
    expect(npcSettlementPacket(campaign, war, createRngStreams(campaign.seed))).toBeUndefined();
  });

  it("never settles a war the President's country is a principal of", () => {
    const { campaign } = foundedForBalance("peace-npc-3");
    const war = { ...openConflict(RUS, campaign.founding.nation, campaign.turn, "War."), ...spent };
    const board = { ...campaign, conflicts: { ...campaign.conflicts, [war.id]: war } };
    expect(npcSettlementPacket(board, war, createRngStreams(board.seed))).toBeUndefined();
  });

  it("lets a worn co-belligerent leave while the principals fight on, onto the list of those who left", () => {
    const { campaign, war } = npcWar("peace-npc-4", {
      joined: { aggressor: [], defender: [POL] },
      exhaustion: { aggressor: 0.1, defender: 0.9 },
      warSupport: { aggressor: 0.9, defender: 0.05 },
    });
    const packets = departurePackets(campaign, war, createRngStreams(campaign.seed));
    expect(packets).toHaveLength(1);
    const after = apply(campaign, packets[0]!);
    const conflict = after.conflicts[war.id]!;
    expect(conflict.status).toBe("active");
    expect(conflict.joined.defender).not.toContain(POL);
    expect(conflict.left).toEqual([POL]);
    expect(packets[0]!.provenance?.decision?.question).toBe("accept-peace");
    expect(alliancePackets(campaign, war, createRngStreams(campaign.seed))).toEqual(packets);
  });
});

describe("leaving a war the country joined", () => {
  function joinedWar(): { campaign: Campaign; id: string } {
    const { campaign } = foundedForBalance("peace-leave");
    const war: Conflict = {
      ...openConflict("RUS" as NationId, "EST" as NationId, campaign.turn, "The border is crossed."),
      joined: { aggressor: [], defender: [campaign.founding.nation] },
    };
    return { campaign: { ...campaign, conflicts: { ...campaign.conflicts, [war.id]: war } }, id: war.id };
  }

  it("refuses to let a country that joined sign the principals' peace for them", () => {
    const { campaign, id } = joinedWar();
    const result = settleWar(campaign, id);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toContain("it can leave it");
  });

  it("takes the country out of the war at a stated price, and brings its forces home", () => {
    const { campaign, id } = joinedWar();
    const us = campaign.founding.nation;
    const deployment: Commitment = {
      id: `commitment:deployment:${us}:${id}:1`,
      kind: "deployment",
      actor: us,
      target: { kind: "conflict", id },
      resource: { spec: { kind: "currency", scale: 6, suffix: "USD" }, amountPerTurn: 100 },
      source: { kind: "budgetLine", line: "defense" },
      startedTurn: campaign.turn,
      review: "standing",
      status: "active",
      rationale: "Forces beside Estonia.",
    };
    const committed = { ...campaign, commitments: { ...campaign.commitments, [deployment.id]: deployment } };
    const projection = projectLeave(committed, id)!;
    expect(projection.refusal).toBeUndefined();
    const result = leaveWar(committed, id);
    if (!result.ok) throw new Error(result.reason);
    expect(result.packet.effects).toContainEqual({ kind: "metric", deltas: { standing: projection.cost.standing } });
    const after = apply(committed, result.packet);
    expect(after.conflicts[id]!.joined.defender).not.toContain(us);
    expect(after.conflicts[id]!.left).toContain(us);
    expect(after.conflicts[id]!.status).toBe("active");
    expect(activeCommitments(after, us).some((commitment) => commitment.target.id === id)).toBe(false);
  });

  it("does not take the country back into a war it has left, so the list of leavers names it once", () => {
    const { campaign, id } = joinedWar();
    const us = campaign.founding.nation;
    const result = leaveWar(campaign, id);
    if (!result.ok) throw new Error(result.reason);
    const after = apply(campaign, result.packet);
    const rejoin = joinConflict(after, us, id, "defender");
    expect(rejoin.ok).toBe(false);
    if (!rejoin.ok) expect(rejoin.reason).toContain("has already left that war");
    expect(after.conflicts[id]!.left!.filter((nation) => nation === us)).toHaveLength(1);
  });

  it("refuses to walk away from the country's own war", () => {
    const campaign = atWar();
    expect(leaveWar(campaign, idOf(campaign)).ok).toBe(false);
    expect(projectLeave(campaign, idOf(campaign))?.refusal).toBeDefined();
  });
});
