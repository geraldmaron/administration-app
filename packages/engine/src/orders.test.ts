import { describe, expect, it } from "vitest";
import { COHORT_IDS, Charter, Person, type RoleId, type StateId } from "@admin/world";
import { CHARTER_MILITARY_JUNTA, CHARTER_PRESIDENTIAL_REPUBLIC } from "@admin/world";
import { judicialReviewPhase } from "./judicial-review.js";
import { buildCampaign, nationA, person, atCampaignTurn } from "./__fixtures__/campaign.js";
import { apply, type Effect, type EffectPacket } from "./effects.js";
import { createRngStreams, type RngStreams } from "./rng.js";
import { openConflict } from "./conflicts.js";
import { EMERGENCY_MISSING, EXECUTIVE_ORDERS, ORDER_DOMAIN_BAND, availableOrders, executiveOrder, orderAvailability, orderCost, latestRuleForOrder, projectOrder, reliefOrderSubjects, signOrder, RULEMAKING_TURNS } from "./orders.js";
import { negatedStatEffects } from "./order-contribution.js";
import { declareStaffordDisaster } from "./stafford.js";
import { orderStatEffects } from "./policy.js";
import { foundedForBalance } from "./balance-harness.js";
import { accumulatedOverreach, institutionalCheck, ministerSway, strikeDownChance } from "./strike-odds.js";
import { netStrain } from "./demos.js";
import { rulemakingPhase } from "./rulemaking.js";
import { DISAPPROVAL_WINDOW_TURNS, LEGISLATIVE_ACTS, legislativeAct } from "./legislative-acts.js";
import {
  billsOnTheAgenda,
  constitutionalGround,
  projectOverride,
  signBill,
  vetoBill,
} from "./legislation.js";
import {
  selectContestedOrders,
  selectOrders,
  type Bill,
  type Campaign,
  type ExecutiveOrderRecord,
} from "./state.js";
import { deedFlag } from "./deeds.js";
import { flagMarker } from "./marked-flags.js";
import { benchMembersForReview, JUDICIARY_SEAT_INSTITUTIONS } from "./judiciary.js";
import { obligationPhase } from "./obligations.js";
import { militaryConstructionPhase } from "./military-construction.js";
import { constructionInterimRelief, specializedGround } from "./specialized-court-matters.js";
import { addDays } from "./clock.js";
import { openingMunitions } from "./munitions.js";
import { constructionOrderSubjects, DOMESTIC_EMERGENCY_CONSTRUCTION_CAP } from "./order-subjects.js";
import { rescindOrder } from "./order-lifecycle.js";
import { lawShift, lawShiftOverTenYears } from "./law-offsets.js";
import { withDueCaseDefaults } from "./case-defaults.js";

function withCourtBench(campaign: Campaign): Campaign {
  const people = { ...campaign.people };
  const institutions = { ...campaign.institutions };
  JUDICIARY_SEAT_INSTITUTIONS.forEach((institution, index) => {
    const id = `order-test-justice-${index}`;
    const base = Person.parse({ ...person, id, name: `Justice ${index}`, eligibleRoles: ["role-journalist"],
      integrity: 0.55 + index * 0.03, competence: 0.65, ideology: { economicLeftRight: index * 0.12 - 0.5, authLibertarian: 0, nationalistGlobalist: 0 } });
    people[base.id] = { base, alive: true };
    institutions[institution] = { ...institutions[institution]!, leader: base.id, vacancy: false };
  });
  return { ...campaign, people, institutions };
}

function courtToFinal(campaign: Campaign): Campaign {
  let state = atCampaignTurn(campaign, campaign.orders.at(-1)!.review!.dueTurn);
  for (let step = 0; step < 20; step += 1) {
    state = withDueCaseDefaults(state);
    state = judicialReviewPhase(CHARTER)(state).reduce(apply, state);
    if (state.orders.at(-1)?.review?.status !== "pending") return state;
    const proceeding = state.judiciary.proceedings?.find((entry) => entry.subject.kind === "executive-order"
      && entry.subject.recordId === state.orders.at(-1)?.id);
    // Each stage waits for its own dated step; the lower-response deadline is a week.
    const nextTurn = Math.max(state.turn + 1, proceeding?.nextTurn ?? 0);
    state = atCampaignTurn(state, nextTurn);
  }
  throw new Error("court did not reach final disposition");
}

const CHARTER = CHARTER_PRESIDENTIAL_REPUBLIC;
const INTERIOR = "role-interior-minister" as RoleId;
const TREASURY = "role-treasury-minister" as RoleId;
const DEFENSE = "role-defense-minister" as RoleId;
const DISAPPROVAL_ACT = "act-rule-disapproval";
const STABILIZATION_ACT = "act-economic-stabilization";
const DEFENSE_ACT = "act-defense-authorization";
const EMERGENCY_ACT = "act-emergency-powers-limitation";

function minister(id: string, over: { competence?: number; loyalty?: number }): Person {
  return Person.parse({
    ...person,
    id,
    name: `Minister ${id}`,
    competence: over.competence ?? 0.6,
    loyalty: over.loyalty ?? 0.6,
    eligibleRoles: [INTERIOR, TREASURY, DEFENSE],
  });
}

/** A campaign whose cabinet actually seats the chairs the orders need. */
function governing(over: { competence?: number; loyalty?: number } = {}): Campaign {
  const base = buildCampaign();
  const interior = minister("PER-INT", over);
  const treasury = minister("PER-TRE", over);
  const defense = minister("PER-DEF", over);
  const cabinet = { ...base.player.cabinet, [INTERIOR]: interior.id, [TREASURY]: treasury.id, [DEFENSE]: defense.id };
  return {
    ...base,
    founding: { ...base.founding, cabinet },
    people: {
      ...base.people,
      [interior.id]: { base: interior, alive: true, currentRole: INTERIOR },
      [treasury.id]: { base: treasury, alive: true, currentRole: TREASURY },
      [defense.id]: { base: defense, alive: true, currentRole: DEFENSE },
    },
    player: { ...base.player, cabinet },
  };
}

function inEmergency(campaign: Campaign): Campaign {
  const war = openConflict(nationA.id, "ALP" as never, campaign.turn, "Invaded.");
  return { ...campaign, conflicts: { [war.id]: war } };
}

function withPriorityBacklog(campaign: Campaign): Campaign {
  const state = campaign.munitions ?? openingMunitions();
  return { ...campaign, player: { ...campaign.player, budget: { ...campaign.player.budget, military: 0.01 } },
    munitions: { ...state, us: { ...state.us,
    "precision-fires": { ...state.us["precision-fires"]!,
      onOrder: [{ arrives: addDays(campaign.calendar, 156 * 7), count: 0.05 }] } } } };
}

// The fixture's nation is smaller than Michigan alone, and a governor's damage
// estimate reads the nation's own scale (obligations.ts), so the relief chain
// estimates on a country the size of the states it is made of; the packets it
// files are then applied to the campaign under test unchanged.
function atStateScale(campaign: Campaign): Campaign {
  const states = Object.values(campaign.states);
  const population = states.reduce((sum, state) => sum + state.population, 0);
  const gdp = states.reduce((sum, state) => sum + state.base.grp, 0);
  const home = campaign.nations[campaign.founding.nation]!;
  const stats = { ...home.stats, demography: { ...home.stats.demography, population }, economy: { ...home.stats.economy, gdp, gdpPerCapita: gdp * 1_000_000 / population } };
  return { ...campaign, nations: { ...campaign.nations, [campaign.founding.nation]: { ...home, stats } } };
}

function withReliefRequest(campaign: Campaign): Campaign {
  const state = "MI" as StateId;
  const condition = { id: `condition:flood:${campaign.founding.nation}:${campaign.turn}`, nation: campaign.founding.nation,
    kind: "flood" as const, scope: "region" as const, severity: 0.6, startedTurn: campaign.turn,
    status: "active" as const, beats: [], state };
  const running = { ...campaign, conditions: { ...campaign.conditions, [condition.id]: condition } };
  const requested = obligationPhase(atStateScale(running)).reduce(apply, running);
  const declaration = declareStaffordDisaster(requested, state);
  if (!declaration.ok) throw new Error(declaration.reason);
  const declared = apply(requested, declaration.packet);
  const bill: Bill = { id: "bill:disaster-recovery", act: "act-disaster-recovery", title: "Disaster Recovery and Resilience Act",
    sponsor: "administration", introducedTurn: campaign.turn, status: "on-the-desk", passage: [] };
  const pending = { ...declared, bills: { ...declared.bills, [bill.id]: bill } };
  const enactment = signBill(pending, bill.id);
  if (!enactment.ok) throw new Error(enactment.reason);
  return apply(pending, enactment.packet);
}

const reliefSubject = (campaign: Campaign) => reliefOrderSubjects(campaign)[0]!;

/** The same campaign with the country's inflation at the given rate. */
function withInflation(campaign: Campaign, inflation: number): Campaign {
  const nation = campaign.nations[campaign.founding.nation]!;
  const economy = { ...nation.stats.economy, inflation };
  return {
    ...campaign,
    nations: { ...campaign.nations, [campaign.founding.nation]: { ...nation, stats: { ...nation.stats, economy } } },
  };
}

/** Put one act of the catalogue on the desk and sign it into law. */
function enacted(campaign: Campaign, actId: string): Campaign {
  const act = legislativeAct(actId)!;
  const bill: Bill = {
    id: `bill:${actId}:${campaign.turn}`,
    act: actId,
    title: act.title,
    sponsor: act.sponsor,
    introducedTurn: campaign.turn,
    status: "on-the-desk",
    passage: [],
  };
  const onTheDesk = { ...campaign, bills: { ...campaign.bills, [bill.id]: bill } };
  return apply(onTheDesk, packetOf(signBill(onTheDesk, bill.id)));
}

function contestedOrders(count: number): readonly ExecutiveOrderRecord[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `order-border-controls:${i}`,
    order: "order-border-controls",
    turn: i,
    contested: true,
    challengeChance: 0.3,
    review: { dueTurn: i, status: "struck-down" as const, ruledTurn: i },
  }));
}

const streams = createRngStreams(buildCampaign().seed);

// Defense production is the one priority decree used here, and a challenge is a
// roll against odds capped at 95%. The fixture seed's draw for it lands in the
// five percent no challenge reaches, so the contested cases roll on a seed
// whose draw does not; each still asserts the signing came out contested.
const CONTESTED_BORROWER = "order-defense-production";
// A draw of zero files the suit whatever the order's filing odds are: these
// tests are about what follows a suit, not about how often one is filed.
const contestedRoll = { stream: () => ({ next: () => 0, nextInt: (min: number) => min }) } as unknown as RngStreams;

// Narrowing helper: every one of these calls is expected to succeed, and a
// cast would hide the day one of them stops.
function packetOf(result: { readonly ok: boolean } & Partial<{ readonly packet: EffectPacket; readonly reason: string }>): EffectPacket {
  if (!result.ok || !result.packet) throw new Error(`expected a packet, got: ${result.reason ?? "no reason"}`);
  return result.packet;
}

function flagsOf(packet: EffectPacket): readonly string[] {
  return packet.effects.filter((effect) => effect.kind === "flag").flatMap((effect) => effect.set ?? []);
}

describe("the catalogue", () => {
  it("moves substantive orders through the policy vocabulary without crediting procedural review as production", () => {
    for (const order of EXECUTIVE_ORDERS) {
      if (["order-regulatory-review", "order-energy-leasing", "order-force-protection", "order-entry-suspension", "order-clean-energy", "order-asset-seizure", "order-defense-production"].includes(order.id)) {
        expect(Object.keys(order.nationEffects), order.id).toHaveLength(0);
        continue;
      }
      expect(Object.keys(order.nationEffects).length, order.id).toBeGreaterThan(0);
    }
  });

  it("prices reaching further as reaching further, in every domain", () => {
    for (const domain of new Set(EXECUTIVE_ORDERS.map((o) => o.domain))) {
      const inDomain = EXECUTIVE_ORDERS.filter((o) => o.domain === domain);
      if (inDomain.length < 2) continue;
      const spread = Math.max(...inDomain.map((o) => o.overreach)) - Math.min(...inDomain.map((o) => o.overreach));
      expect(spread, `${domain} offers a real choice about how far to go`).toBeGreaterThan(0.2);
    }
  });

  it("names no flat sum of money anywhere on the catalogue", () => {
    // A flat treasury line is a price with no denominator: the same figure that
    // buys a small state's whole program is invisible against a federal budget.
    for (const order of EXECUTIVE_ORDERS) {
      expect(order.cost.treasury, order.id).toBeUndefined();
    }
  });

  it("prices an order against the country signing it", () => {
    const campaign = governing();
    for (const order of EXECUTIVE_ORDERS) {
      const cost = orderCost(campaign, order);
      if (order.treasuryOfGdp === undefined) {
        expect(cost.treasury, order.id).toBeUndefined();
        continue;
      }
      // Fixture GDP is 50,000.
      expect(cost.treasury, order.id).toBe(Math.round(order.treasuryOfGdp * 50_000));
    }
  });

  it("charges a richer country more for the same order", () => {
    const poor = governing();
    const rich: Campaign = {
      ...poor,
      nations: {
        ...poor.nations,
        [poor.founding.nation]: {
          ...poor.nations[poor.founding.nation]!,
          stats: {
            ...poor.nations[poor.founding.nation]!.stats,
            economy: { ...poor.nations[poor.founding.nation]!.stats.economy, gdp: 500_000 },
          },
        },
      },
    };
    const relief = executiveOrder("order-relief-program")!;
    expect(orderCost(rich, relief).treasury).toBeUndefined();
    expect(orderCost(poor, relief).treasury).toBeUndefined();
  });

  it("signs an order for exactly the money the projection quoted", () => {
    const campaign = withReliefRequest(governing());
    const order = executiveOrder("order-relief-program")!;
    const projection = projectOrder(campaign, CHARTER, order);
    const packet = packetOf(signOrder(campaign, CHARTER, order.id, streams, reliefSubject(campaign)));
    const charged = packet.effects
      .filter((effect): effect is Extract<Effect, { kind: "metric" }> => effect.kind === "metric")
      .reduce((sum, effect) => sum + (effect.deltas.treasury ?? 0), 0);
    expect(charged).toBe(projection.cost.treasury ?? 0);
    // The share itself never reaches the packet as a metric of its own.
    expect(Object.keys(projection.cost)).not.toContain("treasuryOfGdp");
  });
});

describe("what is on the desk", () => {
  it("refuses an emergency power when there is no emergency, naming the act a declaration is made under", () => {
    const campaign = governing();
    const blocking = executiveOrder("order-asset-seizure")!;
    expect(orderAvailability(campaign, blocking)).toMatchObject({ ok: false,
      missing: expect.stringContaining("a current national emergency declared over this named foreign threat") });
    expect(EMERGENCY_MISSING).toContain("National Emergencies Act");
    expect(orderAvailability(inEmergency(campaign), blocking).ok).toBe(false);
  });

  it("refuses an order the cabinet has nobody to carry out", () => {
    const base = buildCampaign();
    const controls = executiveOrder("order-border-controls")!;
    expect(orderAvailability(base, controls).ok).toBe(false);
    expect(orderAvailability(governing(), controls).ok).toBe(true);
  });

  it("refuses an order the state has not the grip to enforce", () => {
    const shaky = enacted(governing(), STABILIZATION_ACT);
    const weak = { ...shaky, player: { ...shaky.player, metrics: { ...shaky.player.metrics, stability: 0.2 } } };
    expect(orderAvailability(shaky, executiveOrder("order-price-controls")!).ok).toBe(true);
    expect(orderAvailability(weak, executiveOrder("order-price-controls")!).ok).toBe(false);
  });

  it("always leaves the administration something it can lawfully do", () => {
    expect(availableOrders(governing()).length).toBeGreaterThan(0);
  });

  it("states the grip an order needs without quoting the scalar it is measured on", () => {
    const shaky = enacted(governing(), STABILIZATION_ACT);
    const weak = { ...shaky, player: { ...shaky.player, metrics: { ...shaky.player.metrics, stability: 0.2 } } };
    const refusal = orderAvailability(weak, executiveOrder("order-price-controls")!);
    expect(refusal.ok).toBe(false);
    if (refusal.ok) return;
    expect(refusal.missing).not.toMatch(/0\.\d/);
    expect(refusal.missing).not.toMatch(/[≥≤<>]/);
  });
});

// No standing statute lets a President fix prices. The 1970 act that did
// expired in 1974, so the freeze is Congress's to grant before it is the
// office's to sign.
describe("a price freeze is Congress's to grant", () => {
  const freeze = executiveOrder("order-price-controls")!;

  it("refuses the freeze on the office's own authority, and names the act that once granted it", () => {
    const refusal = orderAvailability(governing(), freeze);
    expect(refusal.ok).toBe(false);
    if (refusal.ok) return;
    expect(refusal.missing).toContain("Economic Stabilization Act of 1970");
    expect(freeze.authority?.kind).toBe("needs-act");
  });

  it("opens on the statute, and stands on it at the bench", () => {
    const granted = enacted(governing(), STABILIZATION_ACT);
    expect(orderAvailability(granted, freeze).ok).toBe(true);
    expect(constitutionalGround(granted, freeze.id)).toBe("authorized");
  });

  it("gives Congress no reason to take the power up until prices are running", () => {
    const act = legislativeAct(STABILIZATION_ACT)!;
    expect(act.constrains?.authorizesOrders).toEqual([freeze.id]);
    expect(act.arises(withInflation(governing(), 0.02))).toBe(false);
    expect(act.arises(withInflation(governing(), 0.08))).toBe(true);
  });
});

describe("the three grounds an order stands on", () => {
  const seizure = executiveOrder("order-defense-production")!;

  it("reads silence, authorization and prohibition off the statute book", () => {
    expect(constitutionalGround(governing(), seizure.id)).toBe("silent");
    expect(constitutionalGround(enacted(governing(), DEFENSE_ACT), seizure.id)).toBe("authorized");
    expect(constitutionalGround(enacted(governing(), EMERGENCY_ACT), "order-emergency-construction")).toBe("forbidden");
  });

  it("strikes an authorized order down less often than the same order in the silence", () => {
    const bench = benchMembersForReview(governing());
    expect(strikeDownChance(CHARTER, seizure, bench, "authorized")).toBeLessThan(
      strikeDownChance(CHARTER, seizure, bench, "silent"),
    );
    expect(strikeDownChance(CHARTER, seizure, undefined, "authorized")).toBeLessThan(
      strikeDownChance(CHARTER, seizure, undefined, "silent"),
    );
  });

  it("leaves an authorized order its constitutional exposure: a statute cures only the statutory question", () => {
    // Grant conditions are mostly a Spending Clause question, border checks mostly statutory.
    const grants = executiveOrder("order-grant-conditions")!;
    const border = executiveOrder("order-border-controls")!;
    const relief = (order: typeof grants) => strikeDownChance(CHARTER, order, undefined, "silent") - strikeDownChance(CHARTER, order, undefined, "authorized");
    expect(strikeDownChance(CHARTER, grants, undefined, "authorized")).toBeGreaterThan(0.15);
    expect(relief(grants) / grants.overreach).toBeLessThan(relief(border) / border.overreach);
  });

  it("puts an order Congress forbade at the top of the range whatever the bench thinks of it", () => {
    const bench = benchMembersForReview(governing());
    expect(strikeDownChance(CHARTER, seizure, bench, "forbidden")).toBe(0.9);
  });

  it("lowers the merits on the page too, leaves the chance of a suit alone, and names the act that carried it", () => {
    const silent = projectOrder(governing(), CHARTER, seizure);
    const authorized = projectOrder(enacted(governing(), DEFENSE_ACT), CHARTER, seizure);
    // Whether anyone sues reads injury and salience; a statute changes who wins.
    expect(authorized.meritsChance).toBeLessThan(silent.meritsChance);
    expect(authorized.filing.chance).toBe(silent.filing.chance);
    expect(silent.ground).toBe("silent");
    expect(authorized.ground).toBe("authorized");
    expect(authorized.authorizedBy).toBe(legislativeAct(DEFENSE_ACT)!.title);
    expect(authorized.reasoning).toContain(legislativeAct(DEFENSE_ACT)!.title);
    expect(silent.reasoning).not.toBe(authorized.reasoning);
  });

  it("still refuses outright under a blocking act — a statute is not priced as a risk", () => {
    const blocked = enacted(inEmergency(governing()), EMERGENCY_ACT);
    const availability = orderAvailability(blocked, executiveOrder("order-emergency-construction")!);
    expect(availability.ok).toBe(false);
    if (availability.ok) return;
    expect(availability.missing).toContain(legislativeAct(EMERGENCY_ACT)!.title);
  });

  it("reaches the tier in ordinary play — at least two acts authorize an order", () => {
    const authorizing = LEGISLATIVE_ACTS.filter((act) => (act.constrains?.authorizesOrders ?? []).length > 0);
    expect(authorizing.length).toBeGreaterThanOrEqual(2);
    for (const act of authorizing) {
      for (const orderId of act.constrains!.authorizesOrders!) expect(executiveOrder(orderId)).toBeDefined();
    }
  });
});

describe("who can refuse an order", () => {
  it("makes a charter with courts and an assembly the hardest to govern around", () => {
    // Both are read off the charter's own institution list rather than a table
    // of charter ids, so a new charter is checked by what it seats.
    expect(institutionalCheck(CHARTER_PRESIDENTIAL_REPUBLIC)).toBeGreaterThan(
      institutionalCheck(Charter.parse(CHARTER_MILITARY_JUNTA)),
    );
  });

  it("never leaves a charter with no courts as a completely free hand", () => {
    expect(institutionalCheck(Charter.parse(CHARTER_MILITARY_JUNTA))).toBeGreaterThan(0);
  });

  it("lets a strong, loyal minister defend an order and a weak or disloyal one expose it", () => {
    const strong = ministerSway({ base: minister("A", { competence: 0.9, loyalty: 0.9 }), alive: true });
    const weak = ministerSway({ base: minister("B", { competence: 0.2, loyalty: 0.2 }), alive: true });
    expect(strong).toBeLessThan(1);
    expect(weak).toBeGreaterThan(1);
    // A chair with nobody in it neither defends the order nor betrays it.
    expect(ministerSway(undefined)).toBe(1);
  });
});

describe("overreach compounds", () => {
  it("counts only the orders a court actually struck down, not every suit", () => {
    const campaign = governing();
    const onlySued = { ...campaign, orders: contestedOrders(3).map((r) => ({ ...r, review: { dueTurn: r.turn, status: "pending" as const } })) };
    expect(accumulatedOverreach(onlySued)).toBe(0);
    expect(accumulatedOverreach({ ...campaign, orders: contestedOrders(3) })).toBeGreaterThan(0);
  });

  it("makes the next order harder for every one the institutions have already refused", () => {
    const campaign = governing();
    const controls = executiveOrder("order-border-controls")!;
    const clean = projectOrder(campaign, CHARTER, controls).challengeChance;
    const stained = projectOrder({ ...campaign, orders: contestedOrders(3) }, CHARTER, controls).challengeChance;
    expect(stained).toBeGreaterThan(clean);
  });

  it("says so in the reasoning, rather than moving the number silently", () => {
    const campaign = { ...governing(), orders: contestedOrders(2) };
    expect(projectOrder(campaign, CHARTER, executiveOrder("order-border-controls")!).reasoning).toContain("before");
  });
});

describe("signing", () => {
  it("rolls against exactly the chance it showed", () => {
    // The same parity contract projectAction holds. Without it the projection
    // is a decoration and the player is deciding on a number that is not the
    // one the game uses.
    const campaign = governing();
    const projected = projectOrder(campaign, CHARTER, executiveOrder("order-border-controls")!);
    const result = signOrder(campaign, CHARTER, "order-border-controls", streams);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.projection.challengeChance).toBe(projected.challengeChance);
    expect(result.record.challengeChance).toBe(projected.challengeChance);
  });

  it("gives the same campaign the same answer on every replay", () => {
    const campaign = governing();
    const once = signOrder(campaign, CHARTER, "order-border-controls", createRngStreams(campaign.seed));
    const twice = signOrder(campaign, CHARTER, "order-border-controls", createRngStreams(campaign.seed));
    expect(once.ok && once.contested).toBe(twice.ok && twice.contested);
  });

  it("refuses an order that is not on the desk rather than signing it anyway", () => {
    const result = signOrder(governing(), CHARTER, "order-asset-seizure", streams);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toContain("cannot be signed");
  });

  it("refuses an order that does not exist", () => {
    expect(signOrder(governing(), CHARTER, "order-invent-a-power", streams).ok).toBe(false);
  });

  it("changes the country, and lands the change on the player's own nation", () => {
    // Not a rule, deliberately: a priority order binds the week it is signed.
    // The instruments whose substance is a rule are the subject of "a rule
    // takes as long as a rule takes" below.
    const campaign = withPriorityBacklog(governing());
    const result = signOrder(campaign, CHARTER, "order-defense-production", streams);
    if (!result.ok) throw new Error("expected the order to be signable");
    const before = campaign.nations[nationA.id]!.stats.economy.debt;
    const after = apply(campaign, result.packet);
    expect(after.nations[nationA.id]!.stats.economy.debt).toBe(before);
    expect(after.munitions?.us["precision-fires"]?.onOrder[0]?.priorityContractId).toBe(result.record.id);
  });

  it("refuses a priority designation without an existing backlog and live defense funding", () => {
    const peaceful = governing();
    expect(orderAvailability(peaceful, executiveOrder("order-defense-production")!).ok).toBe(false);
    const backed = withPriorityBacklog(peaceful);
    expect(orderAvailability(backed, executiveOrder("order-defense-production")!).ok).toBe(true);
    const unfunded = { ...backed, player: { ...backed.player,
      budget: { ...backed.player.budget, military: 0 } } };
    expect(orderAvailability(unfunded, executiveOrder("order-defense-production")!).ok).toBe(false);
    const lapsed = { ...backed, congress: { ...backed.congress,
      appropriation: { ...backed.congress.appropriation, throughTurn: backed.turn - 1 } } };
    expect(orderAvailability(lapsed, executiveOrder("order-defense-production")!).ok).toBe(false);
  });

  it("records what was signed, so the next order can be priced against it", () => {
    const campaign = governing();
    const result = signOrder(campaign, CHARTER, "order-border-controls", streams);
    if (!result.ok) throw new Error("expected the order to be signable");
    const after = apply(campaign, result.packet);
    expect(selectOrders(after)).toHaveLength(1);
    expect(selectContestedOrders(after).length).toBe(result.contested ? 1 : 0);
  });

  it("charges a contested order more than an uncontested one, and still applies it", () => {
    // Being refused is a bill, not an undo: what a court can actually reverse
    // is a question for the removal arc, not for the signature.
    const campaign = withPriorityBacklog(withCourtBench({ ...atCampaignTurn(governing(), 8), orders: contestedOrders(8) }));
    const result = signOrder(campaign, CHARTER, CONTESTED_BORROWER, contestedRoll);
    if (!result.ok) throw new Error("expected the order to be signable");
    expect(result.contested).toBe(true);
    const after = apply(campaign, result.packet);
    expect(after.player.metrics.standing).toBeLessThan(campaign.player.metrics.standing);
    expect(after.munitions?.us["precision-fires"]?.onOrder[0]?.priorityContractId).toBe(result.record.id);
  });

  it("names the charter's own removal path when it is challenged", () => {
    const campaign = { ...atCampaignTurn(governing(), 8), orders: contestedOrders(8) };
    const result = signOrder(campaign, CHARTER, "order-border-controls", streams);
    if (!result.ok || !result.contested) throw new Error("expected a contested order");
    expect(result.packet.narration.summary).toContain("impeachment");
  });

  it("moves the player's alignment, so reaching for emergency power is a reputation", () => {
    const campaign = inEmergency(governing());
    const war = Object.values(campaign.conflicts)[0]!;
    const declaration = { id: "emergency:nation:armed-conflict:1", scope: { kind: "nation" as const }, cause: "armed-conflict" as const,
      declaredTurn: campaign.turn, renewedTurn: campaign.turn, reason: "Armed forces required.", armedForcesConflictId: war.id };
    const source = { id: "milcon:base", name: "Existing military base project", appropriationBill: "bill:milcon",
      hostState: "NC" as StateId, appropriated: 1_000_000, obligated: 100_000, enactedTurn: campaign.turn, status: "active" as const };
    const appropriation: Bill = { id: source.appropriationBill, act: "act-military-facilities-appropriation",
      title: "Military facilities", sponsor: "administration", introducedTurn: campaign.turn, status: "law", passage: [] };
    const funded = { ...campaign, emergencies: { ...campaign.emergencies, [declaration.id]: declaration },
      militaryConstructionProjects: [source], bills: { ...campaign.bills, [appropriation.id]: appropriation } };
    const subject = { kind: "construction" as const, sourceId: source.id, declarationId: declaration.id };
    const result = signOrder(funded, CHARTER, "order-emergency-construction", streams, subject);
    if (!result.ok) throw new Error(result.reason);
    const after = apply(funded, result.packet);
    expect(after.player.alignments.authLibertarian).toBeGreaterThan(campaign.player.alignments.authLibertarian);
    expect(after.militaryConstructionProjects?.[0]?.status).toBe("canceled");
    expect(after.militaryConstructionProjects?.[0]?.obligated).toBe(source.obligated);
    expect(result.record.subject?.kind === "construction" ? result.record.subject.amount : 0).toBe(DOMESTIC_EMERGENCY_CONSTRUCTION_CAP);
    expect(result.record.constructionNotice?.mayContractDay).toBe(result.record.constructionNotice!.receivedDay + 5);
    expect(after.judiciary.proceedings?.[0]?.matter?.kind).toBe("emergency-construction");
    expect(after.judiciary.proceedings?.[0]?.matter?.injury).toContain(source.name);
    const gdp = after.nations[after.founding.nation]!.stats.economy.gdp;
    expect(lawShift(after).outlays).toBe(0);
    expect(lawShiftOverTenYears(after).outlays * gdp * 10).toBeCloseTo(source.obligated + DOMESTIC_EMERGENCY_CONSTRUCTION_CAP, 5);
    const matter = after.judiciary.proceedings?.[0]?.matter;
    expect(specializedGround(matter, undefined, "silent", result.record, after)).toBe("silent");
    expect(specializedGround(matter, undefined, "silent", { ...result.record,
      constructionNotice: { ...result.record.constructionNotice!, destinationProject: "" } }, after)).toBe("forbidden");
    expect(specializedGround(matter, undefined, "silent", { ...result.record,
      constructionNotice: { ...result.record.constructionNotice!, mayContractDay: result.record.constructionNotice!.receivedDay + 4 } }, after))
      .toBe("forbidden");
    expect(constructionInterimRelief(after, result.record, CHARTER,
      executiveOrder(result.record.order)!, constitutionalGround(after, result.record.order), 0)).toBe(true);
    expect(constructionInterimRelief(after, result.record, CHARTER,
      executiveOrder(result.record.order)!, constitutionalGround(after, result.record.order), 1)).toBe(false);
    const proceeding = after.judiciary.proceedings![0]!;
    const pausedBeforeWork = { ...after, judiciary: { ...after.judiciary, proceedings: [
      { ...proceeding, interim: "construction-obligations-stayed" as const }] } };
    expect(lawShiftOverTenYears(pausedBeforeWork).outlays * gdp * 10).toBeCloseTo(source.obligated, 5);
    expect(militaryConstructionPhase(pausedBeforeWork)[0]?.effects.find((effect) => effect.kind === "militaryConstructionProject")?.set.redirectedObligated).toBe(0);
    expect(militaryConstructionPhase(after)[0]?.effects.find((effect) => effect.kind === "militaryConstructionProject")?.set.sourceSpent).toBeGreaterThan(0);
    expect(militaryConstructionPhase({ ...after, calendar: addDays(after.calendar, 4) })[0]?.effects
      .find((effect) => effect.kind === "militaryConstructionProject")?.set.redirectedObligated).toBe(0);
    const contractDay = { ...after, turn: after.turn + 1, calendar: addDays(after.calendar, 5) };
    const building = militaryConstructionPhase(contractDay).reduce(apply, contractDay);
    const progress = building.militaryConstructionProjects![0]!;
    expect(progress.redirected).toBe(DOMESTIC_EMERGENCY_CONSTRUCTION_CAP);
    expect(progress.redirectedObligated).toBeGreaterThan(0);
    expect(progress.redirectedSpent).toBe(0);
    expect(lawShift(building).outlays * gdp / 52).toBeCloseTo(progress.lastCashOutlay!, 5);
    expect(progress.redirectedFirstContractDay).toBe(result.record.constructionNotice?.mayContractDay);
    expect(progress.redirectedContractId).toBe(result.record.constructionNotice?.contractId);
    const withdrawal = rescindOrder(building, result.record.id);
    if (!withdrawal.ok) throw new Error(withdrawal.reason);
    const rescinded = apply(building, withdrawal.packet);
    const postRescission = militaryConstructionPhase({ ...rescinded, turn: rescinded.turn + 1 })
      .reduce(apply, { ...rescinded, turn: rescinded.turn + 1 }).militaryConstructionProjects![0]!;
    expect(postRescission.redirectedObligated).toBe(progress.redirectedObligated);
    expect(postRescission.redirectedSpent).toBeGreaterThan(progress.redirectedSpent!);
    expect(rescinded.judiciary.proceedings).toEqual(building.judiciary.proceedings);
    expect(specializedGround(matter, undefined, "silent", result.record, building)).toBe("silent");
    const earlyContract = { ...building, militaryConstructionProjects: [{ ...progress,
      redirectedFirstContractDay: result.record.constructionNotice!.mayContractDay - 1 }] };
    expect(specializedGround(matter, undefined, "silent", result.record, earlyContract)).toBe("forbidden");
    const secondWeek = { ...building, turn: building.turn + 1 };
    const next = militaryConstructionPhase(secondWeek).reduce(apply, secondWeek);
    const stayed = { ...next, turn: next.turn + 1, judiciary: { ...next.judiciary, proceedings: [
      { ...proceeding, interim: "construction-obligations-stayed" as const }] } };
    const pausedState = militaryConstructionPhase(stayed).reduce(apply, stayed);
    const paused = pausedState.militaryConstructionProjects![0]!;
    expect(paused.redirectedObligated).toBe(next.militaryConstructionProjects![0]!.redirectedObligated);
    expect(paused.redirectedSpent).toBeGreaterThan(next.militaryConstructionProjects![0]!.redirectedSpent!);
    const upheld = { ...pausedState, turn: pausedState.turn + 1,
      judiciary: { ...pausedState.judiciary, proceedings: [{ ...proceeding, stage: "final" as const }] },
      orders: pausedState.orders.map((entry) => entry.id === result.record.id
        ? { ...entry, review: { ...entry.review!, status: "upheld" as const, ruledTurn: pausedState.turn } } : entry) };
    const resumed = militaryConstructionPhase(upheld).reduce(apply, upheld).militaryConstructionProjects![0]!;
    expect(resumed.redirectedObligated).toBeGreaterThan(next.militaryConstructionProjects![0]!.redirectedObligated!);
    expect(resumed.redirectedSpent).toBeGreaterThanOrEqual(paused.redirectedSpent!);
    const stopped = { ...next, orders: next.orders.map((entry) => entry.id === result.record.id
      ? { ...entry, review: { ...entry.review!, status: "struck-down" as const, ruledTurn: next.turn } } : entry) };
    const injunctionWeek = { ...stopped, turn: stopped.turn + 1 };
    const settled = militaryConstructionPhase(injunctionWeek).reduce(apply, injunctionWeek).militaryConstructionProjects![0]!;
    expect(settled.redirectedObligated).toBe(next.militaryConstructionProjects![0]!.redirectedObligated);
    expect(settled.redirectedSpent).toBeGreaterThan(next.militaryConstructionProjects![0]!.redirectedSpent!);
    expect(settled.obligated).toBe(source.obligated);
    expect(lawShiftOverTenYears(stopped).outlays * gdp * 10).toBeCloseTo(
      source.obligated - next.militaryConstructionProjects![0]!.sourceSpent!
        + next.militaryConstructionProjects![0]!.redirectedObligated! - next.militaryConstructionProjects![0]!.redirectedSpent!, 5);
    const afterHorizon = { ...stopped, turn: stopped.turn + 104 };
    expect(lawShiftOverTenYears(afterHorizon).outlays).toBeGreaterThan(0);
    expect(militaryConstructionPhase(afterHorizon)[0]?.effects.find((effect) => effect.kind === "militaryConstructionProject")?.set.lastCashOutlay)
      .toBeGreaterThan(0);
    const secondSource = { ...source, id: "milcon:other", hostState: "TX" as StateId, obligated: 0, status: "active" as const };
    const another = { ...after, militaryConstructionProjects: [...after.militaryConstructionProjects!, secondSource] };
    expect(constructionOrderSubjects(another).some((entry) => entry.sourceId === secondSource.id)).toBe(false);
    const revoked = { ...another, emergencies: { ...another.emergencies,
      [declaration.id]: { ...declaration, endedTurn: another.turn } } };
    expect(constructionOrderSubjects(revoked)).toEqual([]);
    const stoppedByRevocation = { ...building, turn: building.turn + 1, emergencies: { ...building.emergencies,
      [declaration.id]: { ...declaration, endedTurn: building.turn + 1 } } };
    const revokedProgress = militaryConstructionPhase(stoppedByRevocation).reduce(apply, stoppedByRevocation)
      .militaryConstructionProjects![0]!;
    expect(revokedProgress.redirectedObligated).toBe(progress.redirectedObligated);
    expect(revokedProgress.redirectedSpent).toBeGreaterThan(progress.redirectedSpent!);
    const renewedDeclaration = { ...declaration, id: "emergency:nation:armed-conflict:2", declaredTurn: revoked.turn + 1,
      renewedTurn: revoked.turn + 1 };
    const reissued = { ...revoked, turn: revoked.turn + 1, emergencies: { ...revoked.emergencies,
      [renewedDeclaration.id]: renewedDeclaration } };
    expect(constructionOrderSubjects(reissued).some((entry) => entry.sourceId === secondSource.id
      && entry.declarationId === renewedDeclaration.id)).toBe(true);
    const secondSignature = signOrder(reissued, CHARTER, "order-emergency-construction", streams,
      { kind: "construction", sourceId: secondSource.id, declarationId: renewedDeclaration.id });
    if (!secondSignature.ok) throw new Error(secondSignature.reason);
    expect(secondSignature.record.subject?.kind === "construction" ? secondSignature.record.subject.amount : 0)
      .toBe(DOMESTIC_EMERGENCY_CONSTRUCTION_CAP);
    expect(orderAvailability(after, executiveOrder("order-emergency-construction")!, subject).ok).toBe(false);
  });
});

// A challenge that is only a bill the government pays the same week, after
// which the order stands forever regardless, makes the unilateral track the
// cheapest durable instrument on the board.
// An order routed to fifty states and to none of the sixteen cells those states
// are made of, so signing price controls moved a map and left every household
// in the country with no memory of it — while the whole constituency model sat
// waiting on a channel nothing but a scenario reply ever reached.
describe("an order lands on people, not only on states", () => {
  it("writes cohort memory when the catalogue entry carries a domestic signature", () => {
    const campaign = enacted(governing(), STABILIZATION_ACT);
    const packet = packetOf(signOrder(campaign, CHARTER, "order-price-controls", streams));
    const cohortEffects = packet.effects.filter((effect) => effect.kind === "cohort");
    expect(cohortEffects.length).toBeGreaterThan(0);
    const signed = apply(campaign, packet);
    const moved = Object.values(signed.cohorts).filter((strains) => strains.length > 0);
    expect(moved.length).toBeGreaterThan(0);
  });

  it("gives every cohort strain the order's own reason sentence and its signature as the cause", () => {
    const campaign = enacted(governing(), STABILIZATION_ACT);
    const packet = packetOf(signOrder(campaign, CHARTER, "order-price-controls", streams));
    const order = executiveOrder("order-price-controls")!;
    for (const effect of packet.effects) {
      if (effect.kind !== "cohort" || !effect.addStrain) continue;
      expect(effect.addStrain.cause).toBe(order.domestic!.signature);
      expect(effect.addStrain.reason).toBe(order.domestic!.reason);
    }
  });

  it("separates two cells of the same axis, rather than moving the country evenly", () => {
    const campaign = enacted(governing(), STABILIZATION_ACT);
    const signed = apply(campaign, packetOf(signOrder(campaign, CHARTER, "order-price-controls", streams)));
    const weights = COHORT_IDS.map((cohort) => netStrain(signed.cohorts[cohort] ?? []));
    expect(new Set(weights).size).toBeGreaterThan(1);
  });

  it("writes no cohort memory for an order the catalogue gives no signature", () => {
    const campaign = governing();
    const order = EXECUTIVE_ORDERS.find((entry) => entry.domestic === undefined)!;
    const result = signOrder(campaign, CHARTER, order.id, streams);
    if (!result.ok) return;
    expect(result.packet.effects.some((effect) => effect.kind === "cohort")).toBe(false);
  });
});

describe("what the courts do about it", () => {
    it("opens a case on a contested order rather than closing the story", () => {
      const campaign = { ...atCampaignTurn(governing(), 8), orders: contestedOrders(8) };
      const result = signOrder(campaign, CHARTER, "order-border-controls", streams);
      if (!result.ok || !result.contested) throw new Error("expected a contested order");
      expect(result.record.review?.status).toBe("pending");
      expect(result.record.review!.dueTurn).toBeGreaterThan(campaign.turn);
    });

    it("leaves an uncontested order with no case to answer", () => {
      const campaign = withPriorityBacklog(governing());
      // Whichever of the available orders this seed happens not to challenge:
      // what is being asserted is the shape of an unchallenged record, and
      // pinning it to one order id would be pinning it to one draw.
      const uncontested = availableOrders(campaign).filter((order) => order.id !== "order-entry-suspension")
        .map((order) => signOrder(campaign, CHARTER, order.id, streams))
        .find((result) => result.ok && !result.contested);
      if (!uncontested?.ok) throw new Error("expected at least one uncontested order");
      expect(uncontested.record.review).toBeUndefined();
    });

    it("undoes what a struck-down order did, and does not refund what it cost", () => {
      const campaign = withPriorityBacklog({ ...atCampaignTurn(governing(), 8), orders: contestedOrders(8) });
      const signed = apply(withCourtBench(campaign), packetOf(signOrder(withCourtBench(campaign), CHARTER, CONTESTED_BORROWER, contestedRoll)));
      const debtBefore = signed.nations[signed.founding.nation]!.stats.economy.debt;
      expect(debtBefore).toBe(campaign.nations[campaign.founding.nation]!.stats.economy.debt);

      // Wound forward to the week the bench comes back. The ruling is seeded on
      // the record's own id, so this is the same answer on every replay.
      const after = courtToFinal(signed);
      const ruled = after.orders.at(-1)!.review!;
      expect(ruled.status).not.toBe("pending");
      expect(ruled.ruledTurn).toBeGreaterThanOrEqual(signed.orders.at(-1)!.review!.dueTurn);
      // The ruling is a case the player can read: the same holding, every
      // seated justice's vote, and an opinion in fixed sentences.
      const courtCase = after.judiciary.cases.find((entry) => entry.id === `case:${after.orders.at(-1)!.id}`)!;
      expect(courtCase).toBeDefined();
      expect(courtCase.holding).toBe(ruled.status);
      expect(courtCase.ruledTurn).toBe(ruled.ruledTurn);
      expect(courtCase.opinion.majority.length).toBeGreaterThan(40);
      expect(courtCase.question.length).toBeGreaterThan(10);
      if (ruled.status === "struck-down") {
        // The already-funded contract and deliveries remain on record after the ruling.
        expect(after.nations[after.founding.nation]!.stats.economy.debt).toBeCloseTo(debtBefore, 6);
        expect(after.orders.at(-1)?.defenseContract?.supplier).toBeDefined();
        expect(after.player.metrics.standing).toBeLessThan(signed.player.metrics.standing);
      }
    });

    it("weighs a bench harder against an order that reaches further", () => {
      expect(strikeDownChance(CHARTER, executiveOrder("order-emergency-construction")!)).toBeGreaterThan(
        strikeDownChance(CHARTER, executiveOrder("order-border-controls")!),
      );
    });

    it("uses seated justices when a bench is provided", () => {
      const campaign = buildCampaign();
      const bench = benchMembersForReview(campaign);
      const order = executiveOrder("order-emergency-construction")!;
      expect(strikeDownChance(CHARTER, order, bench)).toBeGreaterThanOrEqual(0.05);
      expect(strikeDownChance(CHARTER, order, bench)).toBeLessThanOrEqual(0.9);
    });
  });

// The largest distortion the unilateral track carried: an order whose
// substance is a rule changed the country the instant the pen left the page,
// which made the fast instrument also the total one.
describe("a rule takes as long as a rule takes", () => {
  const borderControl = (campaign: Campaign) =>
    campaign.nations[campaign.founding.nation]!.stats.security.borderControl;

  /** Sign a rule-shaped order and hand back the campaign the week after. */
  function ordered(): Campaign {
    const campaign = governing();
    return apply(campaign, packetOf(signOrder(campaign, CHARTER, "order-border-controls", streams)));
  }

  it("changes nothing in the country on the week it is signed", () => {
    const before = governing();
    const signed = ordered();
    expect(borderControl(signed)).toBe(borderControl(before));
    // What it has done is start a proceeding, and cost the money it costs to
    // start one.
    expect(signed.pendingRules).toHaveLength(1);
    expect(signed.pendingRules[0]!.status).toBe("pending");
    expect(signed.pendingRules[0]!.effectiveTurn).toBe(before.turn + RULEMAKING_TURNS);
    expect(signed.player.metrics.treasury).toBeLessThan(before.player.metrics.treasury);
  });

  it("lands the whole of it the week the rule is final, and not before", () => {
    const before = governing();
    const signed = ordered();
    const eve = { ...signed, turn: signed.pendingRules[0]!.effectiveTurn - 1 };
    expect(rulemakingPhase(eve)).toHaveLength(0);

    const due = { ...signed, turn: signed.pendingRules[0]!.effectiveTurn };
    const after = rulemakingPhase(due).reduce(apply, due);
    expect(after.pendingRules[0]!.status).toBe("in-effect");
    expect(borderControl(after)).toBeGreaterThan(borderControl(before));
    // And it lands once: the proceeding is finished, so the week after is a
    // quiet week.
    const later = { ...after, turn: after.turn + 1 };
    expect(rulemakingPhase(later)).toHaveLength(0);
  });

  it("answers which proceeding an order has running, newest signature first", () => {
    const signed = ordered();
    expect(latestRuleForOrder(signed, "order-border-controls")?.id).toBe(signed.pendingRules[0]!.id);
    // A desk asking about an order nobody has signed gets nothing, not a throw.
    expect(latestRuleForOrder(signed, "order-price-controls")).toBeUndefined();

    // The same order signed a second time later in the term: the clock on the
    // page is the new proceeding's, not the one that has already run out.
    const again = apply(
      { ...signed, turn: signed.turn + 20 },
      packetOf(signOrder({ ...signed, turn: signed.turn + 20 }, CHARTER, "order-border-controls", streams)),
    );
    expect(latestRuleForOrder(again, "order-border-controls")!.signedTurn).toBe(signed.turn + 20);
  });

  it("leaves an order that binds on signature alone — a priority order is not a proceeding", () => {
    const campaign = governing();
    const ready = withPriorityBacklog(campaign);
    const signed = apply(ready, packetOf(signOrder(ready, CHARTER, "order-defense-production", streams)));
    expect(signed.pendingRules).toHaveLength(0);
  });

  it("stays a rule the bench reaches first, rather than undoing what never landed", () => {
    const campaign = withCourtBench({ ...atCampaignTurn(governing(), 8), orders: contestedOrders(8) });
    const signed = apply(campaign, packetOf(signOrder(campaign, CHARTER, "order-border-controls", streams)));
    const record = signed.orders.at(-1)!;
    expect(record.review?.status).toBe("pending");

    const after = courtToFinal(signed);
    if (after.orders.at(-1)!.review!.status !== "struck-down") return;

    expect(after.pendingRules[0]!.status).toBe("canceled");
    // Nothing was undone, because nothing had happened: the country is exactly
    // where the signature left it, and the standing is still spent.
    expect(borderControl(after)).toBe(borderControl(campaign));
    expect(after.player.metrics.standing).toBeLessThan(signed.player.metrics.standing);
    // A stayed proceeding does not then go on to take effect.
    const later = { ...after, turn: after.turn + RULEMAKING_TURNS };
    expect(rulemakingPhase(later)).toHaveLength(0);
    expect(borderControl(later)).toBe(borderControl(campaign));
  });
});

describe("the resolution of disapproval", () => {
  /** A campaign whose border rule has been final for a week. */
  function ruleInEffect(): Campaign {
    const campaign = governing();
    const signed = apply(campaign, packetOf(signOrder(campaign, CHARTER, "order-border-controls", streams)));
    const due = { ...signed, turn: signed.pendingRules[0]!.effectiveTurn };
    return rulemakingPhase(due).reduce(apply, due);
  }

  it("reaches the agenda only once a rule has actually landed", () => {
    const campaign = governing();
    expect(billsOnTheAgenda(campaign).map((act) => act.id)).not.toContain(DISAPPROVAL_ACT);
    const landed = ruleInEffect();
    expect(billsOnTheAgenda(landed).map((act) => act.id)).toContain(DISAPPROVAL_ACT);
    // And falls off it again once the window has run: a rule nobody moved
    // against inside sixty days is a rule that stands.
    const late = { ...landed, turn: landed.turn + DISAPPROVAL_WINDOW_TURNS + 1 };
    expect(billsOnTheAgenda(late).map((act) => act.id)).not.toContain(DISAPPROVAL_ACT);
  });

  it("undoes the rule and bars the President from writing it again", () => {
    const landed = ruleInEffect();
    const nation = landed.founding.nation;
    const borderAfterRule = landed.nations[nation]!.stats.security.borderControl;

    const disapproval = billsOnTheAgenda(landed).find((act) => act.id === DISAPPROVAL_ACT)!;
    const bill: Bill = {
      id: `bill:${DISAPPROVAL_ACT}:${landed.turn}`,
      act: DISAPPROVAL_ACT,
      title: disapproval.title,
      sponsor: disapproval.sponsor,
      introducedTurn: landed.turn,
      status: "on-the-desk",
      passage: [],
      target: disapproval.targetsOrder!(landed),
    };
    expect(bill.target).toBe("order-border-controls");

    const onTheDesk = { ...landed, bills: { ...landed.bills, [bill.id]: bill } };
    // The President signs their own rule away, which is the honest test of the
    // instrument: a veto is the interesting decision, and a veto is the
    // existing path.
    const enacted = apply(onTheDesk, packetOf(signBill(onTheDesk, bill.id)));
    const after = rulemakingPhase(enacted).reduce(apply, enacted);

    expect(after.pendingRules[0]!.status).toBe("disapproved");
    expect(after.nations[nation]!.stats.security.borderControl).toBeLessThan(borderAfterRule);
    // The reissue bar, through the same statute-book reading every other
    // closure is enforced by.
    const availability = orderAvailability(after, executiveOrder("order-border-controls")!);
    expect(availability.ok).toBe(false);
    if (!availability.ok) expect(availability.missing).toContain(disapproval.title);
    // And it is undone once, not every week thereafter.
    const later = { ...after, turn: after.turn + 1 };
    expect(rulemakingPhase(later)).toHaveLength(0);
  });

  it("is a bill, so the President may return it and Congress may answer", () => {
    const landed = ruleInEffect();
    const bill: Bill = {
      id: `bill:${DISAPPROVAL_ACT}:${landed.turn}`,
      act: DISAPPROVAL_ACT,
      title: legislativeAct(DISAPPROVAL_ACT)!.title,
      sponsor: "opposition",
      introducedTurn: landed.turn,
      status: "on-the-desk",
      passage: [],
      target: "order-border-controls",
    };
    const onTheDesk = { ...landed, bills: { ...landed.bills, [bill.id]: bill } };
    const vetoed = apply(
      onTheDesk,
      packetOf(vetoBill(onTheDesk, bill.id, "The rule is what the emergency requires.")),
    );
    // Returned, not enacted: the rule stands until Congress can find two thirds.
    expect(rulemakingPhase(vetoed)).toHaveLength(0);
    expect(projectOverride(vetoed, vetoed.bills[bill.id]!)).toHaveLength(2);
  });
});

describe("order deeds", () => {
  it("stamps deed:order:<band>:landed the moment it is signed, banded on OrderDomain", () => {
    const campaign = withReliefRequest(governing());
    const controls = signOrder(campaign, CHARTER, "order-border-controls", streams); // security -> mid
    const relief = signOrder(campaign, CHARTER, "order-relief-program", streams, reliefSubject(campaign)); // civil -> low
    if (!controls.ok || !relief.ok) throw new Error("expected both to be signable");
    expect(flagsOf(controls.packet)).toContain(deedFlag("order", "mid", "landed"));
    expect(flagsOf(relief.packet)).toContain(deedFlag("order", "low", "landed"));
    expect(flagsOf(controls.packet)).toContain(flagMarker(deedFlag("order", "mid", "landed"), campaign.turn));
  });

  it("stamps only the unbound form — an order names no counterparty nation", () => {
    const campaign = governing();
    const result = signOrder(campaign, CHARTER, "order-border-controls", streams);
    if (!result.ok) throw new Error("expected the order to be signable");
    expect(flagsOf(result.packet).filter((flag) => flag.startsWith("deed-toward:") || flag.startsWith("deed-from:"))).toEqual([]);
  });

  it("keeps deed:order:<band>:landed and adds deed:order:<band>:failed the turn a struck-down order is ruled on", () => {
    const struck = Array.from({ length: 12 }, (_, index) => index + 8).flatMap((turn) => {
      const campaign = withCourtBench({ ...atCampaignTurn(governing(), turn), orders: contestedOrders(8) });
      return EXECUTIVE_ORDERS.filter((order) => order.id !== "order-energy-leasing" && order.id !== "order-entry-suspension").map((order) => {
        const availability = orderAvailability(campaign, order);
        if (!availability.ok) return undefined;
        const signed = apply(campaign, packetOf(signOrder(campaign, CHARTER, order.id, streams)));
        if (signed.orders.at(-1)?.review?.dueTurn === undefined) return undefined;
        const after = courtToFinal(signed);
        const ruled = after.orders.at(-1)!.review!;
        return ruled.status === "struck-down" ? { signed, after, band: ORDER_DOMAIN_BAND[order.domain] } : undefined;
      });
    }).find((result) => result !== undefined);
    if (!struck) throw new Error("expected at least one order in the catalogue to be struck down under a stacked record");

    expect(struck.signed.player.flags[deedFlag("order", struck.band, "landed")]).toBe(true);
    expect(struck.after.player.flags[deedFlag("order", struck.band, "landed")]).toBe(true);
    expect(struck.after.player.flags[deedFlag("order", struck.band, "failed")]).toBe(true);
  });

  it("is a fact, not a tally: applying the same signing packet twice leaves the same flag record", () => {
    const campaign = governing();
    const result = signOrder(campaign, CHARTER, "order-border-controls", streams);
    if (!result.ok) throw new Error("expected the order to be signable");
    const once = apply(campaign, result.packet);
    const twice = apply(once, result.packet);
    expect(twice.player.flags).toEqual(once.player.flags);
    expect(once.player.flags[deedFlag("order", "mid", "landed")]).toBe(true);
  });
});

describe("domestic signatures on the catalogue", () => {
  function stateLeanDelta(packet: EffectPacket, state: string): number {
    return packet.effects
      .filter((effect): effect is Extract<Effect, { kind: "state" }> => effect.kind === "state" && effect.state === state)
      .reduce((sum, effect) => sum + (effect.deltas?.lean ?? 0), 0);
  }

  function marked(packet: EffectPacket, state: string, signature: string): boolean {
    return packet.effects.some(
      (effect) =>
        effect.kind === "state" && effect.state === state && effect.addMark?.signature === signature,
    );
  }

  it("routes defense priorities through the industrial belt and leaves a mark", () => {
    const campaign = withPriorityBacklog(governing());
    const packet = packetOf(signOrder(campaign, CHARTER, "order-defense-production", streams));
    // Authored characters concentrate industrial weight in MI/OH/IN/PA; HI does not clear the floor.
    expect(Math.abs(stateLeanDelta(packet, "MI"))).toBeGreaterThan(0);
    expect(Math.abs(stateLeanDelta(packet, "PA"))).toBeGreaterThan(0);
    expect(Math.abs(stateLeanDelta(packet, "OH"))).toBeGreaterThan(0);
    expect(Math.abs(stateLeanDelta(packet, "IN"))).toBeGreaterThan(0);
    expect(stateLeanDelta(packet, "HI")).toBe(0);
    expect(marked(packet, "MI", "order:defense-production")).toBe(true);
    const after = apply(campaign, packet);
    expect(after.states.MI!.marks.some((mark) => mark.signature === "order:defense-production")).toBe(true);
  });

  it("routes staple price controls through farm states, not the mills", () => {
    const campaign = enacted(governing(), STABILIZATION_ACT);
    const packet = packetOf(signOrder(campaign, CHARTER, "order-price-controls", streams));
    expect(Math.abs(stateLeanDelta(packet, "IA"))).toBeGreaterThan(0);
    expect(Math.abs(stateLeanDelta(packet, "KS"))).toBeGreaterThan(0);
    expect(stateLeanDelta(packet, "HI")).toBe(0);
    expect(stateLeanDelta(packet, "MI")).toBe(0);
    expect(marked(packet, "IA", "order:price-controls")).toBe(true);
  });

  it("leaves an order without a domestic signature unrouted", () => {
    const packet = packetOf(signOrder(governing(), CHARTER, "order-border-controls", streams));
    expect(packet.effects.some((effect) => effect.kind === "state")).toBe(false);
  });
});

// What each order that borrows says it costs, in USD millions, as its own
// catalogue entry states it. Written here rather than read off the entry, so a
// debt delta that drifts from the sentence beside it fails.
const STATED_COST_USD_M: Readonly<Record<string, number>> = {};

describe("what an order adds to the national debt", () => {
  const founded = foundedForBalance("orders-debt").campaign;
  const us = founded.founding.nation;
  const debtOf = (campaign: Campaign) => campaign.nations[us]!.stats.economy.debt;
  const borrowing = EXECUTIVE_ORDERS.filter((order) => (order.nationEffects["economy.debt"] ?? 0) !== 0);
  const written = (effects: readonly Effect[]) =>
    debtOf(apply(founded, { source: "simulate", actor: "world", turn: founded.turn, narration: { summary: "An order lands." }, effects: [...effects] })) - debtOf(founded);

  it("states a cost for every order that writes the debt", () => {
    expect(borrowing.map((order) => order.id).sort()).toEqual(Object.keys(STATED_COST_USD_M).sort());
  });

  for (const order of EXECUTIVE_ORDERS.filter((entry) => entry.id in STATED_COST_USD_M)) {
    it(`adds ${order.id} to the debt within twice the cost it states`, () => {
      const stated = STATED_COST_USD_M[order.id]!;
      const added = written(orderStatEffects(founded, order.nationEffects));
      expect(added, `${order.id} adds ${Math.round(added)}M against ${stated}M stated`).toBeGreaterThanOrEqual(stated / 2);
      expect(added).toBeLessThanOrEqual(stated * 2);
    });
  }

  it("never un-borrows money a struck-down or disapproved order already spent", () => {
    for (const order of borrowing) {
      expect(written(negatedStatEffects(founded, order.nationEffects)), order.id).toBe(0);
    }
  });
});

describe("a relief allocation under an enacted appropriation", () => {
  it("records the allocation without charging Treasury or debt a second time", () => {
    const { campaign: founded } = foundedForBalance("rule-borrowing");
    const campaign = withReliefRequest(founded);
    const us = campaign.founding.nation;
    const signed = signOrder(campaign, CHARTER, "order-relief-program", createRngStreams(campaign.seed), reliefSubject(campaign));
    if (!signed.ok) throw new Error(`the relief order was refused: ${signed.reason}`);
    const landed = apply(campaign, signed.packet);
    expect(landed.pendingRules).toHaveLength(campaign.pendingRules.length);
    const economy = campaign.nations[us]!.stats.economy;
    const added = landed.nations[us]!.stats.economy.debt - economy.debt;
    expect(added).toBe(0);
    expect(landed.player.metrics.treasury).toBe(campaign.player.metrics.treasury);
    expect(signed.record.subject).toMatchObject({ kind: "state", billId: "bill:disaster-recovery", amount: Math.round(0.0015 * economy.gdp) });
  });
});
