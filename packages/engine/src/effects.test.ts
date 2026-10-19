import { describe, it, expect } from "vitest";
import { Relationship, type NationId, type RoleId, type TreatyId } from "@admin/world";
import { buildCampaign, nationA, person, relationship } from "./__fixtures__/campaign.js";
import { apply, type Effect, type EffectPacket } from "./effects.js";
import { relationshipKey, type Campaign, selectLedger, selectMetrics, selectNation, selectPerson, selectPlayerLedger, selectRelationship } from "./state.js";
import { selectApproval } from "./opinion.js";
import { shockPressure } from "./external-shocks.js";

function packet(source: EffectPacket["source"], effects: readonly Effect[], summary = "Something happened"): EffectPacket {
  const actor = source === "simulate" || source === "operator" ? "world" : source === "godmode" ? "developer" : "player";
  return { source, actor, turn: 2, narration: { summary }, effects };
}

const grudge = { cause: "a border incident", weight: 0.4, createdTurn: 2, decayRate: 0.1 } as const;

// The fixture ships one directed pair; a packet that writes more than one pair
// is what tells a per-pair write apart from a per-packet one.
function twoWayCampaign(): Campaign {
  const reverse = Relationship.parse({ ...relationship, from: relationship.to, to: relationship.from });
  const base = buildCampaign();
  return {
    ...base,
    relationships: { ...base.relationships, [relationshipKey(reverse.from, reverse.to)]: reverse },
  };
}

describe("apply", () => {
  it("rejects a packet without narration", () => {
    const state = buildCampaign();
    expect(() => apply(state, packet("action", [], "   "))).toThrow(/narration/);
  });

  it("does not mutate the input state", () => {
    const state = buildCampaign();
    const before = JSON.stringify(state);
    apply(state, packet("action", [{ kind: "metric", deltas: { treasury: 500 } }]));
    expect(JSON.stringify(state)).toBe(before);
  });

  it("adds a metric effect's deltas to live metrics and settles approval from the public rather than accepting a direct override", () => {
    const state = buildCampaign();
    const before = selectMetrics(state);
    // The type refuses the key; the cast-free runtime path is still proven
    // inert for a packet that arrives untyped (a save, a corpus file).
    // @ts-expect-error approval is not a metric an effect may write
    const next = apply(state, packet("action", [{ kind: "metric", deltas: { treasury: 1500, approval: 0.9 } }]));
    const treasury = before.treasury + 1500;
    // The declared metric lands; the headline does not, because the public is
    // approval's only writer and the packet moved no judgment it holds.
    expect(selectMetrics(next)).toEqual({ ...before, treasury });
    expect(selectMetrics(next).approval).not.toBe(0.9);
    expect(selectMetrics(next).approval).toBe(selectApproval(state));
  });

  it("sums two metric effects touching the same metric in one packet", () => {
    const state = buildCampaign();
    const before = selectMetrics(state);
    const next = apply(
      state,
      packet("action", [
        { kind: "metric", deltas: { treasury: -200 } },
        { kind: "metric", deltas: { treasury: 50 } },
      ]),
    );
    expect(selectMetrics(next).treasury).toBe(before.treasury - 150);
  });

  it("clamps a 0..1 metric at its bounds and floors budget authority at zero", () => {
    // No overdraft. An obligation in excess of the available appropriation is
    // void, so a cost larger than the authority buys a refusal rather than a
    // negative balance — the government does not borrow against itself.
    const state = buildCampaign();
    const next = apply(state, packet("action", [{ kind: "metric", deltas: { stability: -5, standing: 5, treasury: -1_000_000 } }]));
    expect(selectMetrics(next).stability).toBe(0);
    expect(selectMetrics(next).standing).toBe(1);
    expect(selectMetrics(next).treasury).toBe(0);
  });

  it("applies a relationship effect, including appending a treaty and history entry", () => {
    const state = buildCampaign();
    const next = apply(
      state,
      packet("conversation", [
        {
          kind: "relationship",
          from: relationship.from,
          to: relationship.to,
          deltas: { trust: 0.5 },
          addTreaty: "TRT-1" as TreatyId,
          addHistory: { turn: 2, kind: "summit", description: "A summit was held." },
        },
      ]),
    );
    const rel = selectRelationship(next, relationship.from, relationship.to)!;
    expect(rel.trust).toBeCloseTo(relationship.trust + 0.5);
    expect(rel.treaties).toEqual(["TRT-1"]);
    expect(rel.history).toHaveLength(1);
  });

  it("clamps relationship scalars to their schema ranges rather than writing out-of-schema state", () => {
    const state = buildCampaign();
    const next = apply(
      state,
      packet("action", [
        { kind: "relationship", from: relationship.from, to: relationship.to, deltas: { tradeDependence: -5, tension: 5, trust: -5 } },
      ]),
    );
    const rel = selectRelationship(next, relationship.from, relationship.to)!;
    expect(rel.tradeDependence).toBe(0);
    expect(rel.tension).toBe(1);
    expect(rel.trust).toBe(-1);
  });

  it("takes a relationship scalar to an absolute value with set, ignoring what it held before", () => {
    const state = buildCampaign();
    const next = apply(
      state,
      packet("action", [{ kind: "relationship", from: relationship.from, to: relationship.to, set: { tradeDependence: 0 } }]),
    );
    expect(selectRelationship(next, relationship.from, relationship.to)!.tradeDependence).toBe(0);
  });

  it("throws applying a relationship effect for a pair with no existing relationship", () => {
    const state = buildCampaign();
    expect(() =>
      apply(state, packet("simulate", [{ kind: "relationship", from: relationship.to, to: relationship.from, deltas: { trust: 0.1 } }])),
    ).toThrow(/no relationship/);
  });

  it("folds every relationship effect in one packet, in order, to the state one-packet-per-effect would reach", () => {
    const state = buildCampaign();
    const effects: Effect[] = [
      { kind: "relationship", from: relationship.from, to: relationship.to, deltas: { trust: 0.3 } },
      { kind: "relationship", from: relationship.from, to: relationship.to, addGrudge: grudge },
      { kind: "relationship", from: relationship.from, to: relationship.to, deltas: { trust: -0.1, tension: 0.2 } },
    ];
    const batched = apply(state, packet("simulate", effects));
    const oneAtATime = effects.reduce((acc, effect) => apply(acc, packet("simulate", [effect])), state);
    expect(batched.relationships).toEqual(oneAtATime.relationships);
  });

  it("lets the last write to a pair in a packet win, not the first", () => {
    const state = buildCampaign();
    const next = apply(
      state,
      packet("simulate", [
        { kind: "relationship", from: relationship.from, to: relationship.to, set: { trust: 0.9 } },
        { kind: "relationship", from: relationship.from, to: relationship.to, set: { trust: 0.4 } },
      ]),
    );
    expect(selectRelationship(next, relationship.from, relationship.to)!.trust).toBe(0.4);
  });

  it("reads a pair's value written earlier in the same packet, so deltas within a packet compound", () => {
    const state = buildCampaign();
    const next = apply(
      state,
      packet("simulate", [
        { kind: "relationship", from: relationship.from, to: relationship.to, set: { tension: 0.5 } },
        { kind: "relationship", from: relationship.from, to: relationship.to, deltas: { tension: 0.2 } },
      ]),
    );
    expect(selectRelationship(next, relationship.from, relationship.to)!.tension).toBeCloseTo(0.7);
  });

  it("leaves the caller's relationship graph untouched by a packet that writes several pairs", () => {
    const state = twoWayCampaign();
    const before = JSON.stringify(state.relationships);
    apply(
      state,
      packet("simulate", [
        { kind: "relationship", from: relationship.from, to: relationship.to, deltas: { trust: 0.4 } },
        { kind: "relationship", from: relationship.to, to: relationship.from, deltas: { tension: 0.4 } },
      ]),
    );
    expect(JSON.stringify(state.relationships)).toBe(before);
  });

  it("leaves the caller's relationship graph untouched when a later effect in the packet throws", () => {
    const state = buildCampaign();
    const before = JSON.stringify(state.relationships);
    expect(() =>
      apply(
        state,
        packet("simulate", [
          { kind: "relationship", from: relationship.from, to: relationship.to, deltas: { trust: 0.4 } },
          { kind: "relationship", from: relationship.to, to: relationship.from, deltas: { trust: 0.1 } },
        ]),
      ),
    ).toThrow(/no relationship/);
    expect(JSON.stringify(state.relationships)).toBe(before);
  });

  it("hands back a relationship graph no later packet can write into", () => {
    const state = twoWayCampaign();
    const first = apply(state, packet("simulate", [{ kind: "relationship", from: relationship.from, to: relationship.to, deltas: { trust: 0.2 } }]));
    const afterFirst = JSON.stringify(first.relationships);
    const second = apply(first, packet("simulate", [{ kind: "relationship", from: relationship.from, to: relationship.to, deltas: { trust: 0.2 } }]));
    expect(JSON.stringify(first.relationships)).toBe(afterFirst);
    expect(second.relationships).not.toBe(first.relationships);
  });

  it("applies a nationStat effect as a deep merge, leaving untouched fields intact", () => {
    const state = buildCampaign();
    const next = apply(
      state,
      packet("simulate", [{ kind: "nationStat", nation: nationA.id, setStats: { economy: { unemployment: 0.2 } } }]),
    );
    const stats = selectNation(next, nationA.id)!.stats;
    expect(stats.economy.unemployment).toBe(0.2);
    expect(stats.economy.gdp).toBe(nationA.stats.economy.gdp);
  });

  it("applies a flag effect", () => {
    const state = buildCampaign();
    const next = apply(state, packet("action", [{ kind: "flag", set: ["new-flag"], clear: ["founding-complete"] }]));
    expect(next.player.flags["new-flag"]).toBe(true);
    expect(next.player.flags["founding-complete"]).toBe(false);
  });

  it("applies a person effect", () => {
    const state = buildCampaign();
    const next = apply(state, packet("action", [{ kind: "person", person: person.id, changes: { alive: false } }]));
    expect(selectPerson(next, person.id)?.alive).toBe(false);
  });

  it("applies an operator effect, spawning and removing", () => {
    const state = { ...buildCampaign(), operators: [{ id: "op-1", kind: "smuggler" }] };
    const next = apply(
      state,
      packet("operator", [{ kind: "operator", spawn: [{ id: "op-2", kind: "financier" }], removeIds: ["op-1"] }]),
    );
    expect(next.operators.map((o) => o.id)).toEqual(["op-2"]);
  });

  it("appends a ledger entry with the packet's narration", () => {
    const state = buildCampaign();
    const next = apply(state, packet("godmode", [], "The player did a thing"));
    // Kept as an exact-shape assertion rather than a partial match: the entry
    // now also carries its causal stamp, and asserting the whole entry is what
    // catches a field appearing on the ledger that nobody meant to put there.
    expect(next.ledger.at(-1)).toEqual({
      turn: 2,
      actor: "developer",
      description: "The player did a thing",
      causal: { origin: "scheduled", eventId: "ev-2-1", createdDate: state.calendar },
    });
  });

  it("copies a background packet's mark onto its ledger entry, and omits the field when the packet carries none", () => {
    const state = buildCampaign();
    const marked = apply(state, { ...packet("simulate", [], "Another week of upkeep"), background: true });
    expect(marked.ledger.at(-1)?.background).toBe(true);
    const unmarked = apply(state, packet("simulate", [], "A neighbor moved a brigade"));
    expect(unmarked.ledger.at(-1)).not.toHaveProperty("background");
  });

  // The ledger is read as two documents — everything that happened, and what
  // this administration decided — so the entry has to carry who ordered it
  // rather than leaving the surface to guess from the wording.
  it("records who ordered the change, not just what changed", () => {
    const state = buildCampaign();
    const decided = apply(state, packet("conversation", [], "The player answered the ambassador"));
    const happened = apply(decided, packet("simulate", [], "A neighbor moved a brigade"));

    expect(happened.ledger.map((entry) => entry.actor)).toEqual(["player", "player", "world"]);
    expect(selectPlayerLedger(happened).map((entry) => entry.description)).toEqual([
      "Took the oath of office",
      "The player answered the ambassador",
    ]);
    expect(selectLedger(happened)).toHaveLength(3);
  });

  it("applies a state lean delta and clamps it", () => {
    const state = buildCampaign();
    const opening = state.states.OH!.lean;
    const next = apply(state, packet("action", [{ kind: "state", state: "OH", deltas: { lean: 0.05 }, reason: "the plant stayed" }]));
    expect(next.states.OH!.lean).toBeCloseTo(opening + 0.05, 3);
    const clamped = apply(state, packet("action", [{ kind: "state", state: "OH", deltas: { lean: 10 }, reason: "a wave" }]));
    expect(clamped.states.OH!.lean).toBe(1);
  });

  const mark = (signature: string, weight: number, turn: number): { turn: number; signature: string; weight: number; valence: 1 | -1; decayRate: number; reason: string } => ({
    turn,
    signature,
    weight,
    valence: -1,
    decayRate: 0.1,
    reason: `mark ${signature}`,
  });

  const claim = (signature: string, weight: number, openedTurn: number): { signature: string; openedTurn: number; expiresTurn: number; weight: number; reason: string } => ({
    signature,
    openedTurn,
    expiresTurn: openedTurn + 4,
    weight,
    reason: `claim ${signature}`,
  });

  it("appends a grievance mark to a state's marks", () => {
    const state = buildCampaign();
    const next = apply(state, packet("action", [{ kind: "state", state: "OH", addMark: mark("neglect:disaster", 0.5, 2), reason: "storm went unanswered" }]));
    expect(next.states.OH!.marks).toEqual([mark("neglect:disaster", 0.5, 2)]);
  });

  it("evicts the lowest-weight mark once a state is over MAX_STATE_MARKS, ties broken by turn then signature", () => {
    const state = buildCampaign();
    const packed = Array.from({ length: 8 }, (_, i) => mark(`neglect:${i}`, 0.5, i));
    const seeded = apply(state, packet("action", [{ kind: "state", state: "OH", replaceMarks: packed, reason: "seed" }]));
    // Ninth mark is the lowest-priority entry in the set: lowest weight wins the
    // eviction regardless of insertion order, which is what the test proves.
    const next = apply(seeded, packet("action", [{ kind: "state", state: "OH", addMark: mark("neglect:new", 0.1, 9), reason: "a ninth mark" }]));
    expect(next.states.OH!.marks).toHaveLength(8);
    expect(next.states.OH!.marks.map((m) => m.signature)).not.toContain("neglect:new");
    expect(next.states.OH!.marks.map((m) => m.signature)).toContain("neglect:0");
  });

  it("never grows a state's marks past MAX_STATE_MARKS across many writes", () => {
    const state = buildCampaign();
    let campaign = state;
    for (let i = 0; i < 20; i++) {
      campaign = apply(campaign, packet("action", [{ kind: "state", state: "OH", addMark: mark(`neglect:${i}`, (i % 7) / 7, i), reason: "a write" }]));
    }
    expect(campaign.states.OH!.marks.length).toBeLessThanOrEqual(8);
  });

  it("evicts marks identically across two runs from the same seed", () => {
    const state = buildCampaign();
    const writes = Array.from({ length: 15 }, (_, i) => mark(`neglect:${i}`, (i * 37) % 11, i));
    const run = (): readonly string[] =>
      writes
        .reduce((acc, m) => apply(acc, packet("action", [{ kind: "state", state: "OH", addMark: m, reason: "a write" }])), state)
        .states.OH!.marks.map((m) => m.signature);
    expect(run()).toEqual(run());
  });

  it("keeps a state's marks in append order after eviction, not resorted by priority", () => {
    const state = buildCampaign();
    const packed = Array.from({ length: 8 }, (_, i) => mark(`neglect:${i}`, i + 1, i));
    const seeded = apply(state, packet("action", [{ kind: "state", state: "OH", replaceMarks: packed, reason: "seed" }]));
    const next = apply(seeded, packet("action", [{ kind: "state", state: "OH", addMark: mark("neglect:new", 5, 9), reason: "a ninth mark" }]));
    // neglect:0 (weight 1) is dropped; the rest keep the order they were written in.
    expect(next.states.OH!.marks.map((m) => m.signature)).toEqual(["neglect:1", "neglect:2", "neglect:3", "neglect:4", "neglect:5", "neglect:6", "neglect:7", "neglect:new"]);
  });

  it("replaces rather than duplicates a claim reopened under the same signature", () => {
    const state = buildCampaign();
    const opened = apply(state, packet("action", [{ kind: "state", state: "OH", addClaim: claim("flood-aid", 0.4, 2), reason: "promised aid" }]));
    const reopened = apply(opened, packet("action", [{ kind: "state", state: "OH", addClaim: claim("flood-aid", 0.7, 5), reason: "promised again" }]));
    expect(reopened.states.OH!.claims).toHaveLength(1);
    expect(reopened.states.OH!.claims[0]).toEqual(claim("flood-aid", 0.7, 5));
  });

  it("bounds a state's claims at MAX_STATE_CLAIMS with the same eviction rule", () => {
    const state = buildCampaign();
    let campaign = state;
    for (let i = 0; i < 6; i++) {
      campaign = apply(campaign, packet("action", [{ kind: "state", state: "OH", addClaim: claim(`claim-${i}`, i, i), reason: "a promise" }]));
    }
    expect(campaign.states.OH!.claims).toHaveLength(3);
    expect(campaign.states.OH!.claims.map((c) => c.signature)).toEqual(["claim-3", "claim-4", "claim-5"]);
  });

  it("replaces a state's delegation and governor whole", () => {
    const state = buildCampaign();
    const delegation = {
      house: { seats: 16, administration: 10, opposition: 6, independent: 0 },
      senate: [
        { party: "republican" as const, seatClass: 1 as const, disposition: 0.4 },
        { party: "democrat" as const, seatClass: 3 as const, disposition: 0.6 },
      ] as const,
      disposition: 0.5,
    };
    const governor = { person: person.id, party: "democrat" as const, disposition: 0.55 };
    const next = apply(state, packet("action", [{ kind: "state", state: "OH", setDelegation: delegation, setGovernor: governor, reason: "the census ran" }]));
    expect(next.states.OH!.delegation).toEqual(delegation);
    expect(next.states.OH!.governor).toEqual(governor);
  });

  it("applies a sector employment hit and dates it as a shift in where unemployment is headed", () => {
    const state = buildCampaign();
    const before = state.nations[nationA.id]!.stats.economy.unemployment;
    const next = apply(
      state,
      packet("action", [
        { kind: "sector", nation: nationA.id, sector: "textiles", deltas: { employment: -50_000, laborPressure: 0.1 }, reason: "the embargo landed" },
      ]),
    );
    expect(next.sectors[nationA.id]!.textiles!.employment).toBe(state.sectors[nationA.id]!.textiles!.employment - 50_000);
    // The rate itself is the drift phase's to move; the layoffs are on file with their week.
    expect(next.nations[nationA.id]!.stats.economy.unemployment).toBe(before);
    expect(shockPressure(next, nationA.id).unemployment).toBeGreaterThan(0);
    expect(next.externalShocks).toEqual([expect.objectContaining({ nation: nationA.id, kind: "jobs", fromTurn: state.turn })]);
  });

  // An acting seat is not a confirmation, so it has its own store and its own
  // kind. Clearing one removes the key rather than setting it undefined: an
  // undefined value would survive the save as a seat that is neither filled nor
  // empty.
  it("seats and clears an acting officer through apply(), keeping the store free of undefined seats", () => {
    const state = buildCampaign();
    expect(state.actings).toBeUndefined();
    const seated = apply(state, packet("action", [{ kind: "acting", seat: "role-treasury-minister", person: person.id }]));
    expect(seated.actings).toEqual({ "role-treasury-minister": person.id });
    expect(state.actings).toBeUndefined();
    const cleared = apply(seated, packet("action", [{ kind: "acting", seat: "role-treasury-minister" }]));
    expect(cleared.actings).toEqual({});
    expect("role-treasury-minister" in cleared.actings!).toBe(false);
  });

  it("replaces the cabinet's agenda whole rather than merging it, so a withdrawn proposal cannot survive", () => {
    const state = buildCampaign();
    const first = {
      proposals: [{ id: "proposal:1", role: "role-foreign-minister" as RoleId, person: person.id, turn: 2, summary: "Reopen the channel." }],
      offers: [],
      lastProposalTurn: 2,
    };
    const withFirst = apply(state, packet("simulate", [{ kind: "cabinetAgenda", set: first }]));
    expect(withFirst.cabinetAgenda).toEqual(first);
    const second = { proposals: [], offers: [], lastProposalTurn: 2 };
    const withSecond = apply(withFirst, packet("simulate", [{ kind: "cabinetAgenda", set: second }]));
    expect(withSecond.cabinetAgenda).toEqual(second);
  });

  it("fails loudly on an unrecognized effect kind rather than silently no-opping", () => {
    const state = buildCampaign();
    const bogus = { kind: "not-a-real-kind" } as unknown as Effect;
    expect(() => apply(state, packet("action", [bogus]))).toThrow(/no handler registered/);
  });
});

describe("the economy's kept records", () => {
  it("replaces one nation's macro record whole and leaves every other nation's alone", () => {
    const state = buildCampaign();
    const set = { potential: 1_000, expectedInflation: 0.02, policyRate: 0.03 };
    const next = apply(state, packet("simulate", [{ kind: "macroState", nation: nationA.id, set }]));
    expect(next.macro![nationA.id]).toEqual(set);
    const others = (Object.keys(state.macro!) as NationId[]).filter((id) => id !== nationA.id);
    for (const id of others) expect(next.macro![id]).toBe(state.macro![id]);
  });

  it("replaces one nation's books whole", () => {
    const state = buildCampaign();
    const set = { rates: { effective: 0.05 }, rating: { score: 10, outlook: "negative" as const, negativeSince: 2 }, stress: 0.5, impulse: 0, lastStructuralBalance: -0.02, aidSeen: 0 };
    const next = apply(state, packet("simulate", [{ kind: "books", nation: nationA.id, set }]));
    expect(next.books![nationA.id]).toEqual(set);
  });

  it("replaces the debt-limit record whole", () => {
    const state = buildCampaign();
    const set = { base: 100, lifts: { "bill:act-debt-limit-increase:3": 10 }, bindingSince: 2, arrears: 0, headroomWeeks: 0 };
    const next = apply(state, packet("simulate", [{ kind: "debtLimit", set }]));
    expect(next.debtLimit).toEqual(set);
  });
});
