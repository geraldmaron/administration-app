import { describe, expect, it } from "vitest";
import { EXECUTIVE_ORDERS, apply, createRngStreams, orderAvailability, projectOrder, signOrder, type Campaign } from "@admin/engine";
import { openingCampaign } from "../__fixtures__/opening";
import { charterOf } from "../campaign/founding-options";
import { ORDER_SIGN, orderCamera, orderDesk, orderReview } from "./order-desk";
import { orderCountsByDomain, orderPipeline, orderSignatures } from "./order-pipeline";

const base = openingCampaign();
const charter = charterOf(base);

function signed(campaign: Campaign, orderId: string): Campaign {
  const result = signOrder(campaign, charter, orderId, createRngStreams(campaign.seed));
  if (!result.ok) throw new Error(result.reason);
  return apply(campaign, result.packet);
}

describe("orderPipeline", () => {
  it("files every catalogue order once, as ready to sign or shut", () => {
    const stages = orderPipeline(base);
    const catalogue = stages.filter((stage) => stage.stage === "desk" || stage.stage === "shut").flatMap((stage) => stage.rows.map((row) => row.order));
    expect([...catalogue].sort()).toEqual(EXECUTIVE_ORDERS.map((order) => order.id).sort());
    for (const stage of stages) expect(stage.rows.length).toBeGreaterThan(0);
  });

  it("puts a signed rule in rulemaking with the weeks until it lands", () => {
    const after = signed(base, "order-border-controls");
    const rule = after.pendingRules.find((entry) => entry.order === "order-border-controls")!;
    const row = orderPipeline(after).find((stage) => stage.stage === "rulemaking" || stage.stage === "court")!.rows.find((entry) => entry.order === "order-border-controls")!;
    const record = after.orders.find((entry) => entry.order === "order-border-controls")!;
    if (record.review?.status === "pending") {
      expect(row.stage).toBe("court");
    } else {
      expect(row.stage).toBe("rulemaking");
      expect(row.weeks).toBe(rule.effectiveTurn - after.turn);
    }
    expect(orderSignatures(after, "order-border-controls")).toHaveLength(1);
  });

  it("links each signature to its exact record and archives a rescinded signature", () => {
    const after = signed(base, "order-border-controls");
    const record = after.orders.find((entry) => entry.order === "order-border-controls")!;
    expect(orderSignatures(after, record.order)[0]!.href).toBe(`/nation/policy/order/${record.order}?record=${encodeURIComponent(record.id)}`);
    const ended = { ...after, orders: after.orders.map((entry) => entry.id === record.id ? { ...entry, rescindedTurn: after.turn, endReason: "rescinded" as const } : entry) };
    const row = orderSignatures(ended, record.order)[0]!;
    expect(row.stage).toBe("undone");
    expect(row.line).toContain("Rescinded");
    expect(row.line).toContain("Earlier spending and court records remain");
  });

  it("files a struck-down order as undone", () => {
    const after = signed(base, "order-border-controls");
    const struck = { ...after, orders: after.orders.map((record) => ({ ...record, review: { dueTurn: after.turn, status: "struck-down" as const } })) };
    expect(orderSignatures(struck, "order-border-controls")[0]!.stage).toBe("undone");
  });
});

describe("orderDesk", () => {
  it("is undefined for an order the catalogue does not have", () => {
    expect(orderDesk(base, charter, "order-nothing")).toBeUndefined();
  });

  it("reads signing as its change from today, with the odds signOrder rolls against", () => {
    const desk = orderDesk(base, charter, "order-border-controls")!;
    expect(desk.comparison.columns.map((column) => column.id)).toEqual([ORDER_SIGN]);
    const chance = projectOrder(base, charter, desk.order).challengeChance;
    expect(desk.projection.challengeChance).toBe(chance);
    expect(desk.comparison.rows.find((row) => row.id === "challenge")!.cells[0]!.text).toContain(`${Math.round(chance * 100)}%`);
    for (const row of desk.comparison.rows) expect(row.cells).toHaveLength(1);
    expect(orderReview(desk)).toMatch(/^You will sign tighten border controls\./);
  });

  it("locks an emergency power in a quiet week, with the engine's reason", () => {
    const desk = orderDesk(base, charter, "order-asset-seizure")!;
    expect(orderAvailability(base, desk.order).ok).toBe(false);
    expect(desk.available).toBe(false);
    expect(desk.missing).toContain("named foreign threat");
    expect(desk.comparison.columns[0]!.locked).toBe(`Needs ${desk.missing}`);
  });

  it("frames the states an order lands on, or the country", () => {
    const relief = orderDesk(base, charter, "order-relief-program")!;
    expect(relief.states.length).toBeGreaterThan(0);
    expect(orderCamera(relief)).toMatch(/^set:state:/);
    expect(orderCamera({ states: [] })).toBe("us");
  });
});

describe("orderCountsByDomain", () => {
  it("counts every pipeline row once, under the order's own domain and stage", () => {
    const counts = orderCountsByDomain(base);
    const rows = orderPipeline(base).flatMap((stage) => stage.rows);
    const total = counts.flatMap((entry) => Object.values(entry.byStage)).reduce((a, b) => a + b, 0);
    expect(total).toBe(rows.length);
    for (const entry of counts) {
      const wanted = EXECUTIVE_ORDERS.filter((order) => order.domain === entry.domain).length;
      expect(entry.byStage.desk + entry.byStage.shut).toBe(wanted);
    }
  });
});
