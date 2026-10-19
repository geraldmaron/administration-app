/**
 * The catalog is a menu of what a President of the United States can lawfully
 * sign: each family names its authority, is read by something the player can
 * see, charges what it quotes, and can be taken to court.
 */
import { describe, expect, it } from "vitest";
import { EMERGENCY_DECLARATION_AUTHORITY, FURTHER_US_ORDERS, orderFamily } from "./order-families.js";
import {
  EXECUTIVE_ORDERS,
  JUDICIAL_REVIEW_TURNS,
  ORDER_DOMAIN_BAND,
  availableOrders,
  dayOneOrders,
  executiveOrder,
  firstOrderSubject,
  orderAvailability,
  projectOrder,
  signOrder,
  type ExecutiveOrder,
} from "./orders.js";
import { POLICY_STAT_RANGES } from "./policy-stats.js";
import { committeeForOrderDomain } from "./committee-inquiry.js";
import { presidentialActs } from "./press-beliefs.js";
import { strikeDownChance } from "./strike-odds.js";
import { foundedForBalance } from "./balance-harness.js";
import { apply, type Effect } from "./effects.js";
import { createRngStreams } from "./rng.js";
import type { Campaign, ExecutiveOrderRecord } from "./state.js";

const { campaign: FOUNDED, charter: CHARTER } = foundedForBalance("order-catalog");

/**
 * What became of the five orders that read like a junta's menu, and why. A
 * deletion is a decision: each one names the law that closed it.
 */
const TREATMENT: Readonly<Record<string, { readonly kept: boolean; readonly why: RegExp }>> = {
  "order-emergency-detention": { kept: false, why: /4001\(a\)/ },
  "order-press-restriction": { kept: false, why: /First Amendment/ },
  "order-rule-by-decree": { kept: false, why: /Article I/ },
  "order-asset-seizure": { kept: true, why: /50 U\.S\.C\. §1702/ },
  "order-price-controls": { kept: true, why: /Economic Stabilization Act/ },
};

const DELETED_BECAUSE: Readonly<Record<string, string>> = {
  "order-emergency-detention": "18 U.S.C. §4001(a): no citizen may be detained except under an Act of Congress.",
  "order-press-restriction": "The First Amendment: no statute lets the office silence reporting.",
  "order-rule-by-decree": "Article I vests all legislative power in Congress; no President may suspend it.",
};

function contested(count: number): readonly ExecutiveOrderRecord[] {
  return Array.from({ length: count }, (_, turn) => ({
    id: `order-border-controls:${turn}`,
    order: "order-border-controls",
    turn,
    contested: true,
    challengeChance: 0.3,
  }));
}

const metricTreasury = (effects: readonly Effect[]): number =>
  effects.reduce((sum, effect) => sum + (effect.kind === "metric" ? effect.deltas.treasury ?? 0 : 0), 0);

describe("the family set", () => {
  it("offers about ten US families across twelve orders", () => {
    expect(EXECUTIVE_ORDERS).toHaveLength(12);
    const families = new Set(EXECUTIVE_ORDERS.map((order) => orderFamily(order.id)));
    expect(families.has(undefined)).toBe(false);
    expect(families.size).toBe(10);
  });

  it("records what became of each junta rung, and why", () => {
    for (const [id, treatment] of Object.entries(TREATMENT)) {
      const order = executiveOrder(id);
      if (!treatment.kept) {
        expect(order, id).toBeUndefined();
        expect(DELETED_BECAUSE[id], id).toMatch(treatment.why);
        continue;
      }
      expect(order, id).toBeDefined();
      expect(`${order!.authority?.cite} ${order!.authority?.name}`, id).toMatch(treatment.why);
    }
  });

  it("re-frames the seizure as blocking, which is not a taking and borrows nothing", () => {
    const blocking = executiveOrder("order-asset-seizure")!;
    expect(blocking.requires.needsEmergency).toBe(true);
    expect(blocking.treasuryOfGdp).toBeUndefined();
    expect(blocking.nationEffects["economy.debt"]).toBeUndefined();
  });
});

describe("every family has a reader", () => {
  it("uses only readable stat paths, and gives non-stat orders no nation-wide effect", () => {
    for (const order of EXECUTIVE_ORDERS) {
      const paths = Object.keys(order.nationEffects);
      if (["order-regulatory-review", "order-energy-leasing", "order-force-protection", "order-entry-suspension", "order-clean-energy", "order-asset-seizure", "order-defense-production"].includes(order.id)) {
        expect(paths, order.id).toHaveLength(0);
        continue;
      }
      expect(paths.length, order.id).toBeGreaterThan(0);
      for (const path of paths) expect(Object.keys(POLICY_STAT_RANGES), `${order.id} ${path}`).toContain(path);
    }
  });

  it("has a committee that can open an inquiry into it and a bench that can strike it", () => {
    for (const order of EXECUTIVE_ORDERS) {
      expect(committeeForOrderDomain(order.domain), order.id).toBeDefined();
      const chance = strikeDownChance(CHARTER, order);
      expect(chance, order.id).toBeGreaterThan(0);
      expect(chance, order.id).toBeLessThan(1);
    }
  });

  it("is named by the press desks that read what the President did", () => {
    for (const order of EXECUTIVE_ORDERS) {
      const record: ExecutiveOrderRecord = { id: `${order.id}:${FOUNDED.turn}`, order: order.id, turn: FOUNDED.turn, contested: false, challengeChance: 0.1 };
      const acts = presidentialActs({ ...FOUNDED, orders: [record] });
      expect(acts.map((act) => act.name), order.id).toContain(order.name);
    }
  });
});

describe("availability is lawful", () => {
  it("names a checked primary source for every family's authority", () => {
    for (const order of EXECUTIVE_ORDERS) {
      const authority = order.authority;
      expect(authority, order.id).toBeDefined();
      expect(authority!.cite.length, order.id).toBeGreaterThan(5);
      expect(authority!.limit.length, order.id).toBeGreaterThan(20);
      expect(authority!.source, order.id).toMatch(/^https:\/\/(uscode\.house\.gov|www\.govinfo\.gov|www\.ecfr\.gov|www\.archives\.gov|www\.boem\.gov)\//);
      expect(authority!.opened, order.id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
    expect(EMERGENCY_DECLARATION_AUTHORITY.cite).toBe("50 U.S.C. §1621");
  });

  it("closes a power the office holds only by grant until Congress grants it", () => {
    for (const order of EXECUTIVE_ORDERS) {
      expect(order.authority?.kind === "needs-act", order.id).toBe(order.requires.needsCongress !== undefined);
    }
  });

  it("does not offer an order with no statute or clause behind it", () => {
    const anchored = availableOrders(FOUNDED).find((order) => order.id !== "order-relief-program")!;
    const unanchored: ExecutiveOrder = { ...anchored, authority: undefined };
    const refusal = orderAvailability(FOUNDED, unanchored);
    expect(refusal.ok).toBe(false);
    if (!refusal.ok) expect(refusal.missing).toContain("statute or a clause of the Constitution");
    expect(orderAvailability(FOUNDED, anchored).ok).toBe(true);
  });

  it("does not charge the same signature twice in one week, but permits a later reissue", () => {
    const order = executiveOrder("order-border-controls")!;
    const first = signOrder(FOUNDED, CHARTER, order.id, createRngStreams(FOUNDED.seed), firstOrderSubject(FOUNDED, order.id));
    if (!first.ok) throw new Error(first.reason);
    const signed = apply(FOUNDED, first.packet);
    expect(signed.orders.filter((record) => record.id === first.record.id)).toHaveLength(1);
    expect(orderAvailability(signed, order, firstOrderSubject(FOUNDED, order.id)))
      .toMatchObject({ ok: false, missing: expect.stringContaining("new week") });
    expect(signOrder(signed, CHARTER, order.id, createRngStreams(signed.seed), firstOrderSubject(FOUNDED, order.id)).ok).toBe(false);
    expect(orderAvailability({ ...signed, turn: signed.turn + 1 }, order, firstOrderSubject(FOUNDED, order.id)).ok).toBe(true);
  });
});

describe("the price is the price", () => {
  it("charges every available order exactly the money its projection quoted", () => {
    const offered = availableOrders(FOUNDED);
    expect(offered.length).toBeGreaterThan(0);
    for (const order of offered) {
      const quoted = projectOrder(FOUNDED, CHARTER, order).cost.treasury ?? 0;
      const result = signOrder(FOUNDED, CHARTER, order.id, createRngStreams(FOUNDED.seed), firstOrderSubject(FOUNDED, order.id));
      if (!result.ok) throw new Error(`${order.id}: ${result.reason}`);
      expect(metricTreasury(result.packet.effects), order.id).toBe(quoted);
    }
  });
});

describe("the judicial path holds for every family", () => {
  it("sends a contested order to the bench on the review clock, and a rule into its proceeding", () => {
    const stacked: Campaign = { ...FOUNDED, orders: contested(8) };
    for (const order of availableOrders(stacked)) {
      const result = signOrder(stacked, CHARTER, order.id, createRngStreams(stacked.seed), firstOrderSubject(stacked, order.id));
      if (!result.ok) throw new Error(`${order.id}: ${result.reason}`);
      if (result.contested) {
        const rule = result.packet.effects.find((effect) => effect.kind === "pendingRule");
        const due = order.id === "order-energy-leasing" && rule?.kind === "pendingRule"
          ? rule.set.effectiveTurn + 1 : stacked.turn + JUDICIAL_REVIEW_TURNS;
        expect(result.record.review?.dueTurn, order.id).toBe(due);
      }
      const opensRule = result.packet.effects.some((effect) => effect.kind === "pendingRule");
      expect(opensRule, order.id).toBe(order.viaRulemaking === true);
    }
  });
});

describe("the catalogue's own rule", () => {
  it("bands every domain a family uses, and only the emergency powers sit at the top", () => {
    for (const order of EXECUTIVE_ORDERS) {
      const band = ORDER_DOMAIN_BAND[order.domain];
      expect(band, order.id).toBeDefined();
      expect(band === "high", order.id).toBe(order.requires.needsEmergency === true);
    }
  });

  it("keeps the rulemaking additions ordinary and lets only the statute-backed ones reach further", () => {
    for (const order of FURTHER_US_ORDERS) {
      if (order.viaRulemaking && order.domain !== "civil") expect(order.overreach, order.id).toBeLessThan(0.3);
    }
  });
});

describe("the first morning", () => {
  it("offers only what the desk would, and no emergency power", () => {
    const morning = dayOneOrders(FOUNDED);
    const desk = availableOrders(FOUNDED).map((order) => order.id);
    expect(morning.length).toBeGreaterThan(0);
    for (const order of morning) {
      expect(desk, order.id).toContain(order.id);
      expect(order.requires.needsEmergency, order.id).not.toBe(true);
      expect(order.requires.needsCongress, order.id).toBeUndefined();
    }
  });

  it("records what is signed that morning as the administration's first acts", () => {
    const streams = createRngStreams(FOUNDED.seed);
    const signed = dayOneOrders(FOUNDED)
      .slice(0, 2)
      .reduce<Campaign>((campaign, order) => {
        const result = signOrder(campaign, CHARTER, order.id, streams, firstOrderSubject(campaign, order.id));
        if (!result.ok) throw new Error(`${order.id}: ${result.reason}`);
        return apply(campaign, result.packet);
      }, FOUNDED);
    expect(signed.orders.length).toBe(FOUNDED.orders.length + 2);
    for (const record of signed.orders.slice(-2)) expect(record.turn).toBe(FOUNDED.turn);
    expect(presidentialActs(signed).filter((act) => act.kind === "order").map((act) => act.turn)).toEqual([FOUNDED.turn, FOUNDED.turn]);
  });
});
