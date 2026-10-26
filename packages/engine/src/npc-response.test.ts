import { describe, expect, it } from "vitest";
import { Nation, Relationship, type NationId } from "@admin/world";
import { buildCampaign, nationB } from "./__fixtures__/campaign.js";
import { relationshipKey, type ActionRecord, type Campaign } from "./state.js";
import type { InstrumentId, RungLevel } from "./instruments.js";
import {
  actWeight,
  answerFit,
  resolveToAnswer,
  responseBook,
  RESPONSE_WINDOW_WEEKS,
  strongestIntent,
} from "./npc-response.js";

const USA = "USA" as NationId;
const BIG = "BIG" as NationId;
const SML = "SML" as NationId;
const PAL = "PAL" as NationId;

function nation(id: string, powerTier: number, traits: Partial<Nation["traits"]>): Nation {
  return Nation.parse({
    ...nationB,
    id,
    identity: { ...nationB.identity, name: id },
    bands: { ...nationB.bands, powerTier },
    traits: { ...nationB.traits, ...traits },
  });
}

function edge(from: NationId, to: NationId, overrides: Partial<Relationship> = {}): Relationship {
  return Relationship.parse({
    from, to, trust: 0, alignment: 0, tension: 0.2, tradeDependence: 0.02, militaryThreat: 0, treaties: [], grudges: [], history: [], ...overrides,
  });
}

// A great power with a temper, a small state that sells two fifths of its
// goods to the President's country, and a close partner of the great power.
function world(): Campaign {
  const base = buildCampaign();
  const nations = [
    nation("BIG", 5, { vengefulness: 0.6, aggression: 0.6 }),
    nation("SML", 1, { vengefulness: 0.3, aggression: 0.3 }),
    nation("PAL", 4, { vengefulness: 0.5, aggression: 0.5 }),
  ];
  const usa = base.nations[USA]!;
  const edges = [
    edge(BIG, USA), edge(USA, BIG), edge(SML, USA, { tradeDependence: 0.4 }), edge(USA, SML),
    edge(PAL, BIG, { alignment: 0.7 }), edge(BIG, PAL, { alignment: 0.7 }), edge(PAL, USA), edge(USA, PAL),
  ];
  return {
    ...base,
    turn: 20,
    nations: {
      [USA]: { ...usa, base: { ...usa.base, bands: { ...usa.base.bands, powerTier: 5 } } },
      ...Object.fromEntries(nations.map((n) => [n.id, { base: n, stats: n.stats, traits: n.traits }])),
    },
    relationships: Object.fromEntries(edges.map((r) => [relationshipKey(r.from, r.to), r])),
  };
}

type ActOptions = { readonly visible?: boolean; readonly landed?: boolean; readonly answering?: boolean };

function act(campaign: Campaign, actor: NationId, target: NationId, instrument: InstrumentId, rung: RungLevel, turn: number, o: ActOptions = {}): ActionRecord {
  const player = actor === campaign.founding.nation;
  return {
    turn,
    actor: player ? "player" : "world",
    description: `${actor} acts on ${target}`,
    commitment: { instrument, rung, target, landed: o.landed ?? true },
    causal: {
      origin: "decision",
      eventId: `ev-${turn}-${actor}-${target}`,
      createdDate: campaign.calendar,
      visibility: o.visible === false ? "intelligence" : "public",
      entities: [actor as string, target as string],
      ...(player
        ? {}
        : {
            decision: {
              question: "npc-act", actor: actor as string, subject: target as string, score: 2, threshold: 1.8, acts: true, close: false, visibility: "intelligence",
              terms: [{ key: "response", source: "situation", value: o.answering ? 0.4 : 0 }],
            },
          }),
    },
  };
}

const withLedger = (campaign: Campaign, ledger: readonly ActionRecord[]): Campaign => ({ ...campaign, ledger: [...campaign.ledger, ...ledger] });
const intentOf = (campaign: Campaign, holder: NationId, toward: NationId) => responseBook(campaign).get(holder as string)?.get(toward as string)?.intent ?? 0;

describe("a government coerced means to answer", () => {
  it("holds an intent toward whoever coerced it, measured against the act", () => {
    const c = world();
    const book = responseBook(withLedger(c, [act(c, USA, BIG, "economic", 3, 19)]));
    const entry = book.get(BIG as string)?.get(USA as string);
    expect(entry?.intent).toBeGreaterThan(0.3);
    expect(entry).toMatchObject({ toward: USA, instrument: "economic", rung: 3 });
  });

  it("answers nothing it could not see, and nothing that was a gift", () => {
    const c = world();
    const covert = withLedger(c, [act(c, USA, BIG, "covert", 3, 19, { visible: false }), act(c, USA, BIG, "assistance", 2, 19)]);
    expect(intentOf(covert, BIG, USA)).toBe(0);
  });

  it("fades with time and is gone once the window closes", () => {
    const c = world();
    const ledger = [act(c, USA, BIG, "economic", 3, 19)];
    const fresh = intentOf(withLedger(c, ledger), BIG, USA);
    const later = intentOf(withLedger({ ...c, turn: 25 }, ledger), BIG, USA);
    const gone = intentOf(withLedger({ ...c, turn: 19 + RESPONSE_WINDOW_WEEKS + 1 }, ledger), BIG, USA);
    expect(later).toBeLessThan(fresh);
    expect(later).toBeGreaterThan(0);
    expect(gone).toBe(0);
  });

  it("is spent by an answer at the act's own height", () => {
    const c = world();
    const answered = withLedger(c, [act(c, USA, BIG, "economic", 3, 18), act(c, BIG, USA, "economic", 3, 19, { answering: true })]);
    expect(intentOf(answered, BIG, USA)).toBe(0);
    const protested = withLedger(c, [act(c, USA, BIG, "economic", 3, 18), act(c, BIG, USA, "diplomatic", 1, 19, { answering: true })]);
    expect(intentOf(protested, BIG, USA)).toBeGreaterThan(0);
    expect(intentOf(protested, BIG, USA)).toBeLessThan(intentOf(withLedger(c, [act(c, USA, BIG, "economic", 3, 18)]), BIG, USA));
  });

  it("saturates: ten sanctions in a week ask for less than twice what one does, and never more than the government's resolve", () => {
    const c = world();
    const one = intentOf(withLedger(c, [act(c, USA, BIG, "economic", 3, 19)]), BIG, USA);
    const ten = intentOf(withLedger(c, Array.from({ length: 10 }, () => act(c, USA, BIG, "economic", 3, 19))), BIG, USA);
    expect(ten).toBeLessThan(one * 2);
    expect(ten).toBeLessThanOrEqual(resolveToAnswer(c, BIG, USA));
  });

  it("asks less of each round of an exchange than of the first move, so two governments settle rather than spiral", () => {
    const c = world();
    const first = intentOf(withLedger(c, [act(c, PAL, BIG, "economic", 3, 19)]), BIG, PAL);
    const answer = withLedger(c, [act(c, PAL, BIG, "economic", 3, 18), act(c, BIG, PAL, "economic", 3, 19, { answering: true })]);
    const second = intentOf(answer, PAL, BIG);
    expect(second).toBeGreaterThan(0);
    // PAL's resolve against BIG is lower than BIG's against PAL, so compare gains on resolve.
    const gain = second / resolveToAnswer(c, PAL, BIG);
    expect(gain).toBeLessThan(first / resolveToAnswer(c, BIG, PAL));
    expect(gain).toBeLessThan(0.5);
  });

  it("reads the President's act after a government's own move as the President's answer", () => {
    const c = world();
    const unprovoked = intentOf(withLedger(c, [act(c, USA, BIG, "economic", 3, 19)]), BIG, USA);
    const provoked = intentOf(withLedger(c, [act(c, BIG, USA, "economic", 3, 17), act(c, USA, BIG, "economic", 3, 19)]), BIG, USA);
    expect(provoked).toBeLessThan(unprovoked);
  });
});

describe("who means to answer, and how hard", () => {
  it("leaves a small state that lives off the coercer's market far less to answer with than a great power", () => {
    const c = world();
    const big = intentOf(withLedger(c, [act(c, USA, BIG, "economic", 3, 19)]), BIG, USA);
    const small = intentOf(withLedger(c, [act(c, USA, SML, "economic", 3, 19)]), SML, USA);
    expect(small).toBeLessThan(big / 4);
  });

  it("gives a close partner a smaller intent of its own, and only for a first move", () => {
    const c = world();
    const first = withLedger(c, [act(c, USA, BIG, "economic", 3, 19)]);
    const partner = responseBook(first).get(PAL as string)?.get(USA as string);
    expect(partner?.onBehalfOf).toBe(BIG);
    expect(partner).toMatchObject({ instrument: "diplomatic", rung: 2 });
    expect(partner!.intent).toBeLessThan(intentOf(first, BIG, USA));
    const reply = withLedger(c, [act(c, BIG, USA, "economic", 3, 18), act(c, USA, BIG, "economic", 3, 19)]);
    expect(intentOf(reply, PAL, USA)).toBe(0);
  });

  it("reaches only the closest few partners, however many the coerced government has", () => {
    const c = world();
    const extra = ["PA1", "PA2", "PA3", "PA4"].map((id, i) => ({ n: nation(id, 3, {}), alignment: 0.55 + i * 0.1 }));
    const crowded: Campaign = {
      ...c,
      nations: { ...c.nations, ...Object.fromEntries(extra.map(({ n }) => [n.id, { base: n, stats: n.stats, traits: n.traits }])) },
      relationships: {
        ...c.relationships,
        ...Object.fromEntries(extra.flatMap(({ n, alignment }) => [edge(n.id, BIG, { alignment }), edge(n.id, USA)].map((r) => [relationshipKey(r.from, r.to), r]))),
      },
    };
    const book = responseBook(withLedger(crowded, [act(crowded, USA, BIG, "economic", 3, 19)]));
    const answering = ["PAL", "PA1", "PA2", "PA3", "PA4"].filter((id) => book.get(id)?.has(USA as string));
    // PAL at 0.7, PA3 at 0.85 and PA4 at 0.95 are the closest three.
    expect(answering.sort()).toEqual(["PA3", "PA4", "PAL"]);
  });

  it("never holds an intent for the President, who is nobody's agent", () => {
    const c = world();
    expect(strongestIntent(responseBook(withLedger(c, [act(c, BIG, USA, "military", 2, 19)])), USA)).toBe(0);
  });
});

describe("what answers an act", () => {
  const sanction = { instrument: "economic", rung: 3 } as const;
  it("prefers the act's own instrument, then a protest, then an asymmetric move", () => {
    expect(answerFit(sanction, "economic", 3)).toBeGreaterThan(answerFit(sanction, "diplomatic", 3));
    expect(answerFit(sanction, "diplomatic", 3)).toBeGreaterThan(answerFit(sanction, "military", 3));
    expect(answerFit(sanction, "assistance", 3)).toBe(0);
  });

  it("costs an overshoot more than an answer that stays below the act", () => {
    expect(answerFit(sanction, "economic", 5)).toBeLessThan(answerFit(sanction, "economic", 1));
  });

  it("weighs force over trade and a landed act over a failed one", () => {
    expect(actWeight({ instrument: "military", rung: 3, landed: true })).toBeGreaterThan(actWeight({ instrument: "economic", rung: 3, landed: true }));
    expect(actWeight({ instrument: "economic", rung: 3, landed: false })).toBeLessThan(actWeight({ instrument: "economic", rung: 3, landed: true }));
  });
});

describe("a government both coerced and the partner of one coerced", () => {
  it("measures its answer against what was done to it, not against a protest", () => {
    const c = world();
    const both = withLedger(c, [act(c, USA, BIG, "economic", 3, 18), act(c, USA, PAL, "economic", 3, 19)]);
    expect(responseBook(both).get(PAL as string)?.get(USA as string)).toMatchObject({ instrument: "economic", rung: 3 });
    expect(responseBook(both).get(PAL as string)?.get(USA as string)?.onBehalfOf).toBeUndefined();
  });
});

describe("two governments answering each other inside one week", () => {
  // Each acting government's packet lands before the next one decides, so an
  // exchange can run inside a turn; which act came first is the ledger's order.
  it("reads the second act of the week as the answer to the first, as it would across weeks", () => {
    const c = world();
    const sameWeek = withLedger(c, [act(c, BIG, USA, "diplomatic", 2, 19), act(c, USA, BIG, "diplomatic", 2, 19)]);
    const nextWeek = withLedger(c, [act(c, BIG, USA, "diplomatic", 2, 18), act(c, USA, BIG, "diplomatic", 2, 19)]);
    // The President's act answered China's, so it reaches no partner and is not
    // spent by the move that provoked it.
    expect(intentOf(sameWeek, PAL, USA)).toBe(0);
    expect(intentOf(sameWeek, BIG, USA)).toBeGreaterThan(0);
    expect(intentOf(nextWeek, PAL, USA)).toBe(0);
    expect(intentOf(sameWeek, BIG, USA)).toBeCloseTo(intentOf(nextWeek, BIG, USA), 4);
  });

  it("reads the act that comes first as the first move, and the answer after it as spending the intent", () => {
    const c = world();
    const firstMove = withLedger(c, [act(c, USA, BIG, "diplomatic", 2, 19)]);
    const answered = withLedger(c, [act(c, USA, BIG, "diplomatic", 2, 19), act(c, BIG, USA, "diplomatic", 2, 19, { answering: true })]);
    expect(intentOf(answered, PAL, USA)).toBeGreaterThan(0);
    expect(intentOf(answered, BIG, USA)).toBeLessThan(intentOf(firstMove, BIG, USA));
  });
});

describe("a tariff order", () => {
  // The trade book files a tariff order with no commitment on its entry; the
  // measure it writes is the record, and the answer it draws is the target's.
  function tariffed(c: Campaign, answered: boolean): Campaign {
    const id = `tariff:${BIG}:steel:19`;
    const measure = {
      id, kind: "tariff" as const, sector: "steel", target: BIG, rate: 0.25, imposedTurn: 19, imposedDate: c.calendar,
      authority: "INST-USTR", origin: "us" as const, actor: USA,
    };
    const order: ActionRecord = {
      turn: 19, actor: "player", description: "A 25% tariff is imposed on steel from BIG.",
      causal: { origin: "decision", eventId: "ev-19-tariff", createdDate: c.calendar, entities: [BIG as string, "INST-USTR"], systems: ["trade", "goods"] },
    };
    const retaliation = answered ? [{ id: `retaliation:${BIG}:19`, by: BIG, answering: id, dueTurn: 23, sector: "aircraft", rate: 0.2, landed: false }] : [];
    return {
      ...withLedger(c, [order]),
      trade: { ...c.trade, measures: { ...c.trade.measures, [id]: measure }, retaliation: [...c.trade.retaliation, ...retaliation] },
    } as unknown as Campaign;
  }

  it("leaves its target an intent to answer when the trade book drew no answer", () => {
    expect(responseBook(tariffed(world(), false)).get(BIG as string)?.get(USA as string)).toMatchObject({ instrument: "economic", rung: 2 });
  });

  it("is answered once: an answer the trade book has drawn spends the intent", () => {
    expect(intentOf(tariffed(world(), true), BIG, USA)).toBe(0);
  });
});
