import { describe, it, expect } from "vitest";
import { Relationship, genericCharters } from "@admin/world";
import type { CityId, NationId, PersonId, RoleId } from "@admin/world";
import { buildCampaign, nationA, nationB, relationship } from "./__fixtures__/campaign.js";
import { apply } from "./effects.js";
import type { Campaign } from "./state.js";
import {
  hasIntelOnNation,
  isGodMode,
  isRankable,
  relationshipKey,
  selectDiscoverableRelationshipsFrom,
  selectGodMode,
  selectRelationship,
} from "./state.js";
import { createSave, loadSave } from "./save.js";
import { campaignStatus, ruleValue } from "./rules.js";
import { removalPhase } from "./removal.js";
import { advanceTurn } from "./turn-loop.js";
import { feedVisibility } from "./npc-turn.js";
import {
  editCity,
  editNationStat,
  editRelationship,
  enableGodMode,
  grantMetrics,
  recordBranchPoint,
  seatByDecree,
  setGodFlag,
  settleConflict,
  spawnConflict,
} from "./god.js";

const junta = genericCharters.find((c) => c.id === "charter-military-junta")!;

function godCampaign(): Campaign {
  const base = buildCampaign();
  return apply(base, enableGodMode(base));
}

describe("god mode is ordinary state, reached through the ordinary gate", () => {
  it("enabling it is an EffectPacket sourced godmode and acted by the developer", () => {
    const base = buildCampaign();
    const packet = enableGodMode(base);
    expect(packet.source).toBe("godmode");
    expect(packet.actor).toBe("developer");
    expect(packet.narration.summary).toBeTruthy();

    const next = apply(base, packet);
    expect(isGodMode(next)).toBe(true);
    expect(selectGodMode(next)).toMatchObject({ enabled: true, enabledTurn: base.turn, actions: 1 });
  });

  it("every god action lands in the ledger, attributable to the developer and not to the player", () => {
    const state = godCampaign();
    const next = apply(state, grantMetrics(state, { stability: 0.2 }));
    const entry = next.ledger.at(-1)!;
    expect(entry.actor).toBe("developer");
    expect(entry.description).toBeTruthy();
    expect(entry.cost?.stability).toBeCloseTo(0.2);
    expect(next.ledger.filter((record) => record.actor === "player")).toHaveLength(
      state.ledger.filter((record) => record.actor === "player").length,
    );
  });

  it("counts god actions and only god actions", () => {
    let state = godCampaign();
    expect(selectGodMode(state)?.actions).toBe(1);
    state = apply(state, grantMetrics(state, { standing: 0.1 }));
    expect(selectGodMode(state)?.actions).toBe(2);
    state = apply(state, {
      source: "action",
      actor: "player",
      turn: state.turn,
      narration: { summary: "The administration acts on its own account." },
      effects: [{ kind: "metric", deltas: { standing: 0.1 } }],
    });
    expect(selectGodMode(state)?.actions).toBe(2);
  });

  it("a god edit on an unmarked campaign marks it permanently on that first amendment", () => {
    const base = buildCampaign();
    expect(isGodMode(base)).toBe(false);
    const next = apply(base, grantMetrics(base, { stability: 0.1 }));
    expect(isGodMode(next)).toBe(true);
    expect(isRankable(next)).toBe(false);
    expect(selectGodMode(next)).toMatchObject({ enabled: true, enabledTurn: base.turn, actions: 1 });
  });

  it("a campaign never touched by god mode carries no godMode key at all", () => {
    const base = buildCampaign();
    const next = apply(base, {
      source: "action",
      actor: "player",
      turn: base.turn,
      narration: { summary: "An ordinary week." },
      effects: [{ kind: "metric", deltas: { standing: 0.05 } }],
    });
    expect("godMode" in next).toBe(false);
    expect(isRankable(next)).toBe(true);
  });
});

describe("the flag is permanent", () => {
  it("no ordinary effect can clear it, and it survives a state rebuilt without it", () => {
    const state = godCampaign();
    // The hostile case: a packet whose handler returns a campaign with the
    // field dropped entirely. apply() must carry it forward regardless.
    const stripped: Campaign = { ...state };
    delete (stripped as { godMode?: unknown }).godMode;
    expect(isGodMode(stripped)).toBe(false);

    const restored = apply(state, {
      source: "action",
      actor: "player",
      turn: state.turn,
      narration: { summary: "A week passes under an amended record." },
      effects: [{ kind: "flag", clear: ["founding-complete"] }],
    });
    expect(isGodMode(restored)).toBe(true);
    expect(isRankable(restored)).toBe(false);
  });

  it("survives forty subsequent packets of every kind the campaign takes", () => {
    let state = godCampaign();
    for (let turn = 1; turn <= 40; turn++) {
      state = apply(state, {
        source: turn % 2 === 0 ? "simulate" : "action",
        actor: turn % 2 === 0 ? "world" : "player",
        turn,
        narration: { summary: `Week ${turn} passes.` },
        effects: [{ kind: "metric", deltas: { standing: 0.01 } }, { kind: "alignment", pull: { authLibertarian: 0.01 } }],
      });
    }
    expect(selectGodMode(state)).toMatchObject({ enabled: true, enabledTurn: 1, actions: 1 });
  });

  it("survives a save round-trip, and an untouched campaign round-trips without one", () => {
    const god = godCampaign();
    const restored = loadSave(JSON.parse(JSON.stringify(createSave(god))));
    expect(restored).toEqual(god);
    expect(isGodMode(restored)).toBe(true);

    const plain = loadSave(JSON.parse(JSON.stringify(createSave(buildCampaign()))));
    expect(isGodMode(plain)).toBe(false);
    expect("godMode" in plain).toBe(false);
  });

  it("records the turns a timeline was branched from, appending rather than replacing", () => {
    let state = godCampaign();
    state = apply(state, recordBranchPoint(state, 4));
    state = apply(state, recordBranchPoint(state, 9));
    expect(selectGodMode(state)?.branchPoints).toEqual([4, 9]);
  });
});

describe("invulnerability", () => {
  function collapse(state: Campaign, turn: number): Campaign {
    return apply(state, {
      source: "action",
      actor: "player",
      turn,
      narration: { summary: "A scandal breaks and confidence collapses" },
      effects: [
        { kind: "metric", deltas: { stability: -1, standing: -1, militaryReadiness: -1, treasury: -state.player.metrics.treasury } },
        // Unpopularity is 36% of removal pressure and approval is settled from
        // the public, so a collapse the country never registers does not reach
        // the arc. Same helper as removal.test.ts, for the same reason.
        { kind: "opinion", deltas: { security: -1, prosperity: -1, services: -1, integrity: -1, unity: -1, competence: -1 } },
        { kind: "alignment", pull: { authLibertarian: -0.2 } },
      ],
    });
  }

  function playToCollapse(start: Campaign): Campaign {
    let state = start;
    for (let turn = 1; turn <= 15; turn++) {
      state = collapse(state, turn);
      state = advanceTurn(state, { simulate: removalPhase(junta), select: () => [] });
    }
    return state;
  }

  it("the same collapse that removes an ordinary administration never removes a god one", () => {
    expect(playToCollapse(buildCampaign()).removal.resolved).toBe(true);

    const god = playToCollapse(godCampaign());
    expect(god.removal.resolved).toBe(false);
    expect(god.removal.endingSummary).toBeUndefined();
  });

  it("pressure still computes and the earlier beats still fire — the arc stops one beat short", () => {
    const god = playToCollapse(godCampaign());
    expect(god.removal.pressure).toBeGreaterThan(0.4);
    expect(god.removal.beats.length).toBe(2);
  });
});

describe("omniscience is a read, not a write", () => {
  function withHiddenPair(): Campaign {
    const base = buildCampaign();
    const fortify = (id: string) => ({
      ...nationB,
      id: id as NationId,
      stats: { ...nationB.stats, security: { ...nationB.stats.security, counterIntel: 0.9 } },
    });
    const weak = fortify("WEK");
    const strong = fortify("FOR");
    const hidden = Relationship.parse({
      from: weak.id, to: strong.id, trust: 0, alignment: 0, tension: 0, tradeDependence: 0,
      militaryThreat: 0, treaties: [], grudges: [], history: [],
    });
    return {
      ...base,
      nations: {
        ...base.nations,
        [weak.id]: { base: weak, stats: weak.stats, traits: nationB.traits },
        [strong.id]: { base: strong, stats: strong.stats, traits: nationB.traits },
      },
      relationships: { ...base.relationships, [relationshipKey(weak.id, strong.id)]: hidden },
    };
  }

  it("a relationship the player's intel cannot reach is visible under god mode and hidden without it", () => {
    const ordinary = withHiddenPair();
    const hidden = selectRelationship(ordinary, "WEK" as NationId, "FOR" as NationId)!;
    expect(selectDiscoverableRelationshipsFrom(ordinary, "WEK" as NationId)).not.toContainEqual(hidden);

    const god = apply(ordinary, enableGodMode(ordinary));
    expect(selectDiscoverableRelationshipsFrom(god, "WEK" as NationId)).toContainEqual(hidden);
  });

  it("covert activity nobody caught reaches the feed as intelligence, never as news", () => {
    const ordinary = withHiddenPair();
    const covert = { covert: true, exposed: false, actor: "FOR" as NationId };
    expect(feedVisibility(ordinary, covert)).toBeUndefined();

    const god = apply(ordinary, enableGodMode(ordinary));
    expect(feedVisibility(god, covert)).toBe("intelligence");
    // An overt move is still public: god mode reveals, it does not relabel.
    expect(feedVisibility(god, { ...covert, covert: false })).toBe("public");
  });

  it("reading under god mode changes nothing about the campaign", () => {
    const ordinary = withHiddenPair();
    const god = apply(ordinary, enableGodMode(ordinary));
    const snapshot = JSON.stringify(god);
    selectDiscoverableRelationshipsFrom(god, "WEK" as NationId);
    feedVisibility(god, { covert: true, exposed: false, actor: "FOR" as NationId });
    expect(JSON.stringify(god)).toBe(snapshot);
  });

  it("what a foreign government holds on the player is gated by that one government's cover", () => {
    const ordinary = withHiddenPair();
    expect(hasIntelOnNation(ordinary, "FOR" as NationId)).toBe(false);
    // The player's own government keeps no file on itself worth spying on.
    expect(hasIntelOnNation(ordinary, ordinary.founding.nation)).toBe(true);

    const reaching = apply(
      ordinary,
      editNationStat(ordinary, ordinary.founding.nation, { setStats: { security: { intelCapability: 0.95 } } }),
    );
    expect(hasIntelOnNation(reaching, "FOR" as NationId)).toBe(true);

    expect(hasIntelOnNation(apply(ordinary, enableGodMode(ordinary)), "FOR" as NationId)).toBe(true);
  });

  it("the intelligence limits of ordinary play are untouched", () => {
    const ordinary = withHiddenPair();
    expect(isGodMode(ordinary)).toBe(false);
    expect(selectDiscoverableRelationshipsFrom(ordinary, "WEK" as NationId)).toHaveLength(0);
    // The player's own relationship is still legible without any god mode.
    expect(selectDiscoverableRelationshipsFrom(ordinary, relationship.from)).toContainEqual(relationship);
  });
});

describe("world editing produces valid state", () => {
  it("edits a nation's live stats without touching the authored record", () => {
    const state = godCampaign();
    const next = apply(state, editNationStat(state, nationA.id, { setStats: { security: { intelCapability: 0.95 } } }));
    expect(next.nations[nationA.id]!.stats.security.intelCapability).toBeCloseTo(0.95);
    expect(next.nations[nationA.id]!.base).toEqual(state.nations[nationA.id]!.base);
  });

  it("refuses an edit to a nation the campaign does not have", () => {
    const state = godCampaign();
    expect(() => editNationStat(state, "NOWHERE" as NationId, { setStats: {} })).toThrow(/no such nation/);
  });

  it("clamps a relationship edit to the schema's own range rather than writing an invalid campaign", () => {
    const state = godCampaign();
    const next = apply(state, editRelationship(state, relationship.from, relationship.to, { trust: 9, tension: -9 }));
    const edited = selectRelationship(next, relationship.from, relationship.to)!;
    expect(edited.trust).toBe(1);
    expect(edited.tension).toBe(0);
    expect(() => Relationship.parse(edited)).not.toThrow();
  });

  it("spawns a war through the same constructor a real one uses, and settles it terminally", () => {
    let state = godCampaign();
    state = apply(state, spawnConflict(state, nationA.id, nationB.id, "a border the record now disputes"));
    const opened = Object.values(state.conflicts).find((conflict) => conflict.status === "active")!;
    expect(opened.aggressor).toBe(nationA.id);
    expect(opened.joined).toEqual({ aggressor: [], defender: [] });

    state = apply(state, settleConflict(state, opened.id, "Terms are imposed from outside the fiction."));
    expect(state.conflicts[opened.id]!.status).toBe("settled");
    expect(state.conflicts[opened.id]!.endedTurn).toBe(state.turn);
  });

  it("refuses a war between a nation and itself, and a settlement of a war that is not there", () => {
    const state = godCampaign();
    expect(() => spawnConflict(state, nationA.id, nationA.id, "nothing")).toThrow(/itself/);
    expect(() => settleConflict(state, "war:nope", "nothing")).toThrow(/no such conflict/);
  });

  it("sets and clears a flag, and seats or empties a chair by decree", () => {
    let state = godCampaign();
    state = apply(state, setGodFlag(state, "sanctions-imposed", true));
    expect(state.player.flags["sanctions-imposed"]).toBe(true);
    state = apply(state, setGodFlag(state, "sanctions-imposed", false));
    expect(state.player.flags["sanctions-imposed"]).toBe(false);

    const role = Object.keys(state.player.cabinet)[0]! as RoleId;
    state = apply(state, seatByDecree(state, role));
    expect(role in state.player.cabinet).toBe(false);
    expect(() => seatByDecree(state, role, "person-nobody" as PersonId)).toThrow(/no such person/);
  });

  it("cannot write a metric outside the range ordinary play is held to", () => {
    const state = godCampaign();
    const next = apply(state, grantMetrics(state, { stability: 99, standing: -99 }));
    expect(next.player.metrics.stability).toBe(1);
    expect(next.player.metrics.standing).toBe(0);
  });

  it("edits a city through apply, as a godmode packet", () => {
    const state = godCampaign();
    const city = "CITY-USA-pittsburgh" as CityId;
    const opening = state.cities[city]!.employment;
    const packet = editCity(state, city, { employment: 4000, adminLean: 0.05 });
    expect(packet.source).toBe("godmode");
    expect(packet.actor).toBe("developer");
    expect(packet.effects[0]).toMatchObject({ kind: "city", city });
    const next = apply(state, packet);
    expect(next.cities[city]!.employment).toBe(opening + 4000);
    expect(() => editCity(state, "CITY-NOWHERE" as CityId, { employment: 1 })).toThrow(/no such city/);
  });
});

describe("entering by hand sets the flag and the two rules it used to mean", () => {
  it("does all three in one packet, so the in-session path grants what it always granted", () => {
    const base = buildCampaign();
    const packet = enableGodMode(base);
    expect(packet.effects.filter((effect) => effect.kind === "rules")).toHaveLength(2);

    const next = apply(base, packet);
    expect(isGodMode(next)).toBe(true);
    expect(ruleValue(next, "information.omniscient")).toBe(true);
    expect(ruleValue(next, "removal.immune")).toBe(true);
    expect(next.rules?.log).toHaveLength(2);
    expect(campaignStatus(next).status).toBe("sandbox");
    expect(isRankable(next)).toBe(false);
  });

  it("writes no rule from any other god edit, so the rule log has one writer", () => {
    const state = godCampaign();
    const before = state.rules?.log.length;
    const next = apply(state, grantMetrics(state, { stability: 0.1 }));
    expect(next.rules?.log.length).toBe(before);
    expect(next.rules?.values).toEqual(state.rules?.values);
  });
});
