import { describe, expect, it } from "vitest";
import { CHARTER_PRESIDENTIAL_REPUBLIC } from "@admin/world";
import { foundedForBalance } from "./balance-harness.js";
import { apply } from "./effects.js";
import { judicialReviewPhase } from "./judicial-review.js";
import { constitutionalGround, lawAuthorizesOrder } from "./legislation.js";
import { makeCampaignSeed } from "./rng.js";
import { statutoryMatterId } from "./statutory-matters.js";
import { addDays } from "./clock.js";
import type { Campaign } from "./state.js";
import type { Bill } from "./state-legislature.js";
import type { ExecutiveOrderRecord } from "./state-orders.js";

const bill: Bill = { id: "bill:act-defense-authorization:1", act: "act-defense-authorization",
  title: "The Annual Defense Authorization Act", sponsor: "bipartisan", introducedTurn: 1,
  status: "law", passage: [], enactedBy: "unsigned", resolvedTurn: 2 };
const order: ExecutiveOrderRecord = { id: "order-defense-production:3", order: "order-defense-production",
  turn: 3, contested: false, challengeChance: 0 };
const id = statutoryMatterId(bill.id, order.id);
const phase = judicialReviewPhase(CHARTER_PRESIDENTIAL_REPUBLIC);
const founding = foundedForBalance("statutory-bench").campaign;

function baseline(seed = "statutory-matter"): Campaign {
  return { ...founding, seed: makeCampaignSeed(seed), turn: 3,
    bills: { ...founding.bills, [bill.id]: bill }, orders: [...founding.orders, order] };
}

function tryRun(state: Campaign): Campaign | undefined {
  for (let week = 0; week < 16; week += 1) {
    state = phase(state).reduce(apply, state);
    if (state.judiciary.cases.some((entry) => entry.id === id)) return state;
    state = { ...state, turn: state.turn + 1 };
  }
  return undefined;
}

function run(state: Campaign): Campaign {
  const finished = tryRun(state);
  if (!finished) throw new Error("statutory matter did not reach a disposition");
  return finished;
}

describe("Congress's industrial-base grant under challenge", () => {
  it("puts granted Supreme review on an argument and opinion calendar", () => {
    let granted: Campaign | undefined;
    for (let n = 0; n < 100 && !granted; n += 1) {
      let state = baseline(`statutory-calendar-${n}`);
      for (let week = 0; week < 8; week += 1) {
        state = phase(state).reduce(apply, state);
        const proceeding = state.judiciary.proceedings?.find((entry) => entry.id === id);
        if (proceeding?.stage === "supreme-merits") {
          granted = state;
          break;
        }
        state = { ...state, turn: state.turn + 1, calendar: addDays(state.calendar, 7) };
      }
    }
    expect(granted).toBeDefined();
    const proceeding = granted?.judiciary.proceedings?.find((entry) => entry.id === id);
    expect(proceeding?.calendar?.status).toBe("scheduled");
    expect(proceeding?.nextTurn).toBe(proceeding?.calendar?.argumentTurn);
    expect(proceeding?.calendar?.opinionTurn).toBeGreaterThan(proceeding?.calendar?.argumentTurn ?? 0);
    expect(granted?.judiciary.cases.find((entry) => entry.id === id)).toBeUndefined();
  });

  it("makes interim plaintiff relief consequential while a denial leaves the order's movement in force", () => {
    let stayed: Campaign | undefined;
    let denied: Campaign | undefined;
    for (let n = 0; n < 450 && (!stayed || !denied); n += 1) {
      let state = baseline(`statutory-interim-${n}`);
      const nation = state.nations[state.founding.nation]!;
      state = { ...state, nations: { ...state.nations, [state.founding.nation]: { ...nation,
        stats: { ...nation.stats, security: { ...nation.stats.security, borderControl: 0.4 } } } },
        orders: [{ ...order, nationContribution: { "security.borderControl": 0.12 } }] };
      state = apply(state, { source: "simulate", actor: "world", turn: state.turn,
        narration: { summary: "The signed order moves border capacity." }, effects: [
          { kind: "nationStat", nation: state.founding.nation, setStats: { security: { borderControl: 0.52 } },
            requestedDelta: { path: "security.borderControl", amount: 0.12, ownerId: order.id } },
        ] });
      for (let week = 0; week < 4; week += 1) {
        state = phase(state).reduce(apply, state);
        const proceeding = state.judiciary.proceedings?.find((entry) => entry.id === id);
        if (proceeding?.interim) {
          if (proceeding.interim === "party-stayed") stayed = state;
          else denied = state;
          break;
        }
        state = { ...state, turn: state.turn + 1 };
      }
    }
    expect(stayed?.judiciary.proceedings?.find((entry) => entry.id === id)?.partyRelief?.active).toBe(true);
    expect(stayed?.judiciary.proceedings?.find((entry) => entry.id === id)?.partyRelief?.outstanding["security.borderControl"]).toBeGreaterThan(0);
    expect(denied?.judiciary.proceedings?.find((entry) => entry.id === id)?.partyRelief).toBeUndefined();
  });
  it("requires an enacted law and an actual priority order before manufacturers have an injury", () => {
    const state = baseline();
    expect(phase({ ...state, orders: [] })).toEqual([]);
    expect(phase({ ...state, bills: {} })).toEqual([]);
    expect(phase({ ...state, orders: [{ ...order, contested: true, review: { dueTurn: 5, status: "pending" } }] })
      .flatMap((packet) => packet.effects).some((effect) => effect.kind === "courtProceeding" && effect.set.subject.kind === "statutory-authority")).toBe(false);
    const filed = phase(state).reduce(apply, state);
    const proceeding = filed.judiciary.proceedings?.find((entry) => entry.id === id);
    expect(proceeding?.subject.kind).toBe("statutory-authority");
    expect(proceeding?.matter?.parties).toHaveLength(2);
    expect(proceeding?.matter?.injury).toMatch(/contracts/);
    expect(phase(filed)).toEqual([]);
  });

  it("binds a repeated annual authorization to the grant in force when the order was signed", () => {
    const newer = { ...bill, id: "bill:act-defense-authorization:4", introducedTurn: 4, resolvedTurn: 4 };
    const laterOrder = { ...order, id: "order-defense-production:5", turn: 5 };
    const base = baseline();
    const state = { ...base, turn: 5, bills: { ...base.bills, [newer.id]: newer }, orders: [laterOrder] };
    const filed = phase(state).reduce(apply, state);
    const matters = filed.judiciary.proceedings?.filter((entry) => entry.subject.kind === "statutory-authority") ?? [];
    expect(matters).toHaveLength(1);
    expect(matters[0]?.subject.kind === "statutory-authority" && matters[0].subject.billId).toBe(newer.id);
  });

  it("records the distinct lower and discretionary-appeal stages without rewriting old opinions", () => {
    const state = baseline();
    const historical = { id: "old-opinion", order: "order-border-controls", question: "Old question.",
      ground: "silent" as const, filedTurn: 1, dueTurn: 2, ruledTurn: 3, holding: "upheld" as const,
      votes: [], opinion: { majority: "Already decided." } };
    const final = run({ ...state, judiciary: { ...state.judiciary, cases: [...state.judiciary.cases, historical] } });
    const proceeding = final.judiciary.proceedings?.find((entry) => entry.id === id);
    const ruling = final.judiciary.cases.find((entry) => entry.id === id);
    expect(proceeding?.history.map((moment) => moment.stage)).toContain("lower-merits");
    expect(proceeding?.history.map((moment) => moment.stage)).toContain("appeal");
    expect(ruling?.subject?.kind).toBe("statutory-authority");
    expect(ruling?.matter?.jurisdiction).toMatch(/Federal-question/);
    expect(final.judiciary.cases.find((entry) => entry.id === "old-opinion")).toEqual(historical);
    expect(JSON.parse(JSON.stringify(ruling))).toEqual(ruling);
  });

  it("limits only the named authorization after a Supreme merits construction; party relief does not do so", () => {
    let broad: Campaign | undefined;
    let limited: Campaign | undefined;
    for (let n = 0; n < 450 && (!broad || !limited); n += 1) {
      const final = tryRun(baseline(`statutory-outcome-${n}`));
      if (!final) continue;
      const relief = final.judiciary.cases.find((entry) => entry.id === id)?.procedure?.relief;
      if (relief === "statutory-construction") broad = final;
      if (relief === "party-specific") limited = final;
    }
    expect(broad).toBeDefined();
    expect(limited).toBeDefined();
    expect(constitutionalGround(broad!, order.order)).toBe("silent");
    expect(lawAuthorizesOrder(broad!, order.order)).toBeUndefined();
    expect(constitutionalGround(limited!, order.order)).toBe("authorized");
    expect(lawAuthorizesOrder(limited!, order.order)?.id).toBe(bill.id);
    expect(run(broad!)).toEqual(broad);
  });
});
