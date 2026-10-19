import { describe, expect, it } from "vitest";
import { buildCampaign } from "./__fixtures__/campaign.js";
import { apply } from "./effects.js";
import type { Campaign } from "./state.js";
import type { CourtProceeding } from "./state-judiciary.js";

const PATH = "security.borderControl";

function border(state: Campaign, value: number): Campaign {
  const id = state.founding.nation;
  const nation = state.nations[id]!;
  return { ...state, nations: { ...state.nations, [id]: { ...nation,
    stats: { ...nation.stats, security: { ...nation.stats.security, borderControl: value } } } } };
}

function move(state: Campaign, delta: number, ownerId?: string): Campaign {
  const before = state.nations[state.founding.nation]!.stats.security.borderControl;
  const after = Math.max(0, Math.min(1, before + delta));
  return apply(state, { source: "simulate", actor: "world", turn: state.turn,
    narration: { summary: "The policy moves the national border-control reading." }, effects: [
      { kind: "nationStat", nation: state.founding.nation, setStats: { security: { borderControl: after } },
        requestedDelta: { path: PATH, amount: delta, ...(ownerId ? { ownerId } : {}) } },
    ] });
}

function issue(state: Campaign, id: string, delta: number): Campaign {
  const moved = move(state, delta, id);
  const before = state.nations[state.founding.nation]!.stats.security.borderControl;
  const after = moved.nations[state.founding.nation]!.stats.security.borderControl;
  return { ...moved, orders: [...moved.orders, { id, order: "order-border-controls", turn: state.turn,
    contested: true, challengeChance: 0.5, nationContribution: { [PATH]: after - before } }] } as Campaign;
}

function remedy(state: Campaign, orderId: string): Campaign {
  return apply(state, { source: "simulate", actor: "world", turn: state.turn,
    narration: { summary: "The order is vacated." }, effects: [{ kind: "orderRemedy", orderId }] });
}

function proceeding(state: Campaign, orderId: string): Campaign {
  const caseRecord: CourtProceeding = { id: `statute:${orderId}`, subject: { kind: "statutory-authority", billId: "bill:test",
    actId: "act-defense-authorization", orderId: "order-defense-production", recordId: orderId },
    filedTurn: state.turn, stage: "interim", nextTurn: state.turn + 1, history: [] };
  return { ...state, judiciary: { ...state.judiciary, proceedings: [caseRecord] } };
}

function limited(state: Campaign, orderId: string, action: "apply" | "restore", fraction = 0.25): Campaign {
  return apply(state, { source: "simulate", actor: "world", turn: state.turn,
    narration: { summary: "The named suppliers receive bounded relief." }, effects: [
      { kind: "courtLimitedRelief", proceedingId: `statute:${orderId}`, orderId, action,
        scope: "defense-industrial", fraction }] });
}

describe("recorded order remedies", () => {
  it("restores only the share no other active proceeding still withholds", () => {
    const first = proceeding(issue(border(buildCampaign(), 0.6), "order:a", 0.2), "order:a");
    const secondCase = { ...first.judiciary.proceedings![0]!, id: "statute:second" };
    const two: Campaign = { ...first, judiciary: { ...first.judiciary,
      proceedings: [...first.judiciary.proceedings!, secondCase] } };
    const applyFor = (state: Campaign, proceedingId: string, action: "apply" | "restore", fraction: number) =>
      apply(state, { source: "simulate", actor: "world", turn: state.turn,
        narration: { summary: "The courts limit the same record." }, effects: [{ kind: "courtLimitedRelief",
          proceedingId, orderId: "order:a", action, scope: "defense-industrial", fraction }] });
    const one = applyFor(two, "statute:order:a", "apply", 0.25);
    const both = applyFor(one, "statute:second", "apply", 0.5);
    expect(both.nations[both.founding.nation]!.stats.security.borderControl).toBeCloseTo(0.7);
    const restored = applyFor(both, "statute:order:a", "restore", 0.25);
    expect(restored.nations[restored.founding.nation]!.stats.security.borderControl).toBeCloseTo(0.7);
    const final = applyFor(restored, "statute:second", "restore", 0.5);
    expect(final.nations[final.founding.nation]!.stats.security.borderControl).toBeCloseTo(0.8);
  });

  it("replays partial relief, restoration, and final vacatur without refunding debt", () => {
    const base = issue(border(buildCampaign(), 0.6), "order:a", 0.2);
    const withCase = proceeding(base, "order:a");
    const debt = withCase.nations[withCase.founding.nation]!.stats.economy.debt;
    const stayed = limited(withCase, "order:a", "apply");
    expect(stayed.nations[stayed.founding.nation]!.stats.security.borderControl).toBeCloseTo(0.75);
    expect(stayed.judiciary.proceedings?.[0]?.partyRelief?.outstanding[PATH]).toBeCloseTo(0.05);
    expect(limited(stayed, "order:a", "apply").nations[stayed.founding.nation]!.stats.security.borderControl).toBeCloseTo(0.75);
    const intervened = move(stayed, -0.1);
    const restored = limited(intervened, "order:a", "restore");
    expect(restored.nations[restored.founding.nation]!.stats.security.borderControl).toBeCloseTo(0.7);
    const struck = remedy(restored, "order:a");
    expect(struck.nations[struck.founding.nation]!.stats.security.borderControl).toBeCloseTo(0.5);
    expect(struck.nations[struck.founding.nation]!.stats.economy.debt).toBe(debt);
    expect(remedy(struck, "order:a").nations[struck.founding.nation]!.stats.security.borderControl).toBeCloseTo(0.5);
    const staleStay = { ...struck, judiciary: { ...struck.judiciary, proceedings: stayed.judiciary.proceedings } };
    expect(limited(staleStay, "order:a", "restore").nations[struck.founding.nation]!.stats.security.borderControl).toBeCloseTo(0.5);
  });

  it("removes two orders in either sequence with the same final result", () => {
    const both = issue(issue(border(buildCampaign(), 0.5), "order:a", 0.2), "order:b", 0.15);
    const first = remedy(remedy(both, "order:a"), "order:b");
    const second = remedy(remedy(both, "order:b"), "order:a");
    expect(first.nations[first.founding.nation]!.stats.security.borderControl).toBeCloseTo(0.5);
    expect(second.nations[second.founding.nation]!.stats.security.borderControl).toBeCloseTo(0.5);
  });

  it("does not invent a loss when an independent later gain saturates the upper bound", () => {
    const afterOrder = issue(border(buildCampaign(), 0.95), "order:a", 0.05);
    const saturated = move(afterOrder, 0.2);
    const struck = remedy(saturated, "order:a");
    expect(struck.nations[struck.founding.nation]!.stats.security.borderControl).toBe(1);
    expect(struck.orders[0]?.remedyContribution?.[PATH]).toBe(0);
  });

  it("does not invent a gain when an independent later loss saturates the lower bound", () => {
    const afterOrder = issue(border(buildCampaign(), 0.05), "order:a", -0.05);
    const saturated = move(afterOrder, -0.2);
    const struck = remedy(saturated, "order:a");
    expect(struck.nations[struck.founding.nation]!.stats.security.borderControl).toBe(0);
    expect(struck.orders[0]?.remedyContribution?.[PATH]).toBe(0);
  });

  it("keeps an old order attributable through hundreds of capped ordinary movements", () => {
    let state = issue(border(buildCampaign(), 0.7), "order:a", 0.1);
    for (let index = 0; index < 240; index += 1) state = move(state, index % 2 === 0 ? 0.3 : -0.25);
    expect(state.orderStatLineage?.[PATH]?.events).toHaveLength(2);
    const struck = remedy(state, "order:a");
    expect(struck.orders[0]?.remedyUnquantified).toBeUndefined();
    expect(struck.nations[struck.founding.nation]!.stats.security.borderControl).toBeCloseTo(0.75);
  });

  it("declines attribution if another writer changed the live value without a tracked event", () => {
    const issued = issue(border(buildCampaign(), 0.7), "order:a", 0.1);
    const drifted = border(issued, 0.4);
    const struck = remedy(drifted, "order:a");
    expect(struck.nations[struck.founding.nation]!.stats.security.borderControl).toBe(0.4);
    expect(struck.orders[0]?.remedyUnquantified).toBe(true);
  });

  it("marks legacy attribution and intervening absolute resets unknown", () => {
    const base = border(buildCampaign(), 0.7);
    const legacy = { ...base, orders: [{ id: "order:a", order: "order-border-controls", turn: base.turn,
      contested: true, challengeChance: 0.5, nationContribution: { [PATH]: 0.2 } }] } as Campaign;
    const old = remedy(legacy, "order:a");
    expect(old.nations[old.founding.nation]!.stats.security.borderControl).toBe(0.7);
    expect(old.orders[0]?.remedyUnquantified).toBe(true);
    const issued = issue(base, "order:b", 0.1);
    const reset = apply(issued, { source: "simulate", actor: "world", turn: issued.turn,
      narration: { summary: "An external reset establishes a new level." }, effects: [
        { kind: "nationStat", nation: issued.founding.nation, setStats: { security: { borderControl: 0.4 } } },
      ] });
    const struck = remedy(reset, "order:b");
    expect(struck.nations[struck.founding.nation]!.stats.security.borderControl).toBe(0.4);
    expect(struck.orders[0]?.remedyUnquantified).toBe(true);
    const unknownStay = limited(proceeding(legacy, "order:a"), "order:a", "apply");
    expect(unknownStay.judiciary.proceedings?.[0]?.partyRelief).toMatchObject({ active: false, unquantified: true });
  });
});
