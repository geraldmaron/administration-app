import { describe, expect, it } from "vitest";
import type { Campaign } from "@admin/engine";
import type { ExecutiveNode, ExecutiveSection } from "@admin/player-core";
import { onlyNeedingYou, rosterScopes, staffingSummary, urgencyReason, urgentRows } from "./roster";

function node(office: string, over: Partial<ExecutiveNode> = {}): ExecutiveNode {
  return { institution: `INST-${office}` as never, office, name: office, abbr: office, title: office, href: `/washington/office/${office}`, emblem: "building", staffing: "confirmed", alerts: [], children: [], ...over };
}

const campaign = {
  nominations: { n1: { office: "ACTING", stage: "hearing", nominee: "P1" }, n2: { office: "DONE", stage: "withdrawn", nominee: "P2" } },
  institutions: { "INST-CONF": { backlog: 4.4 } },
  people: { P1: { base: { id: "P1", name: "Pat Nominee" } }, P2: { base: { id: "P2", name: "Old Name" } } },
} as unknown as Campaign;

const sections: readonly ExecutiveSection[] = [
  { key: "departments", title: "Departments", lead: "", nodes: [node("CONF", { children: [node("AGENCY", { staffing: "vacant" })] }), node("ACTING", { staffing: "acting", holder: "H1" as never }), node("DONE", { staffing: "vacant" })] },
  { key: "white-house", title: "White House", lead: "", nodes: [node("ASK", { alerts: [{ kind: "proposal", text: "1 request waiting" }] })] },
];

describe("the executive roster", () => {
  const scopes = rosterScopes(campaign, sections);

  it("lists a department's agencies directly under it, one level in", () => {
    expect(scopes[0]!.rows.map((row) => [row.node.office, row.depth])).toEqual([["CONF", 0], ["AGENCY", 1], ["ACTING", 0], ["DONE", 0]]);
  });

  it("keeps a pending nominee apart from the chair's own state and ignores ended nominations", () => {
    const acting = scopes[0]!.rows.find((row) => row.node.office === "ACTING")!;
    expect(acting.node.staffing).toBe("acting");
    expect(acting.nominee).toEqual({ name: "Pat Nominee", stage: "in hearing" });
    expect(scopes[0]!.rows.find((row) => row.node.office === "DONE")!.nominee).toBeUndefined();
  });

  it("reports workload only where the body is tracked", () => {
    expect(scopes[0]!.rows[0]!.backlog).toBe(4);
    expect(scopes[0]!.rows[1]!.backlog).toBeUndefined();
  });

  it("counts acting and vacant chairs separately from confirmed ones", () => {
    expect(staffingSummary(scopes)).toEqual({ total: 5, confirmed: 2, acting: 1, vacant: 2, nominees: 1, waiting: 1, needYou: 4 });
  });

  it("narrows to the chairs that need the President, and ranks waiting matters before empty chairs before acting ones", () => {
    expect(onlyNeedingYou(scopes[0]!).rows.map((row) => row.node.office)).toEqual(["AGENCY", "ACTING", "DONE"]);
    expect(urgentRows(scopes).map((row) => row.node.office)).toEqual(["ASK", "AGENCY", "DONE", "ACTING"]);
  });

  it("says why a chair needs the President without repeating its staffing tag or nominee badge", () => {
    const acting = scopes[0]!.rows.find((row) => row.node.office === "ACTING")!;
    expect(urgencyReason(acting)).toBe("");
    expect(urgencyReason({ ...acting, node: { ...acting.node, holderName: "Lee Deputy" } })).toBe("Lee Deputy is acting");
    const { nominee, ...unnamed } = acting;
    void nominee;
    expect(urgencyReason({ ...unnamed, node: { ...acting.node, staffing: "vacant" } })).toBe("No nominee named");
  });
});
