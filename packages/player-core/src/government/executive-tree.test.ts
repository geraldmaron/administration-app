import { describe, expect, it } from "vitest";
import { apply, dismissMinister, officeDef, type Campaign } from "@admin/engine";
import type { RoleId } from "@admin/world";
import { openingCampaign } from "../__fixtures__/opening.js";
import { attentionTree, executivePins, executiveTree, nodeNeedsAttention, type ExecutiveNode } from "./executive-tree.js";
import { officeFile } from "./office-file.js";

const TREASURY = "role-treasury-minister" as RoleId;

function emptied(campaign: Campaign, role: RoleId): Campaign {
  const dismissal = dismissMinister(campaign, role);
  if (!dismissal.ok) throw new Error(dismissal.reason);
  return apply(campaign, dismissal.packet);
}

function allNodes(campaign: Campaign): readonly ExecutiveNode[] {
  return executiveTree(campaign).flatMap((section) => section.nodes.flatMap((node) => [node, ...node.children]));
}

describe("the executive tree", () => {
  const campaign = openingCampaign({ seedText: "w6-executive-tree" });

  it("seats the fifteen departments in order of precedence, State first, each door a catalog office", () => {
    const departments = executiveTree(campaign).find((section) => section.key === "departments")!;
    expect(departments.nodes).toHaveLength(15);
    expect(departments.nodes[0]!.institution).toBe("INST-STATE");
    for (const node of allNodes(campaign).filter((entry) => entry.office !== "press")) {
      expect(officeDef(node.office as never), node.href).toBeDefined();
      expect(node.href).toBe(`/washington/office/${encodeURIComponent(node.office)}`);
    }
  });

  it("hangs each agency under its department and names who holds every filled chair", () => {
    const dhs = allNodes(campaign).find((node) => node.institution === "INST-DHS")!;
    expect(dhs.children.map((child) => child.institution)).toContain("INST-FEMA");
    for (const node of allNodes(campaign).filter((entry) => entry.staffing !== "vacant")) {
      expect(node.holderName, node.name).toBeTruthy();
      expect(node.competence?.word, node.name).toBeTruthy();
    }
  });

  it("reads a dismissed Secretary's chair as held by the deputy who steps up, and keeps it in the needs-attention cut", () => {
    const before = allNodes(campaign).find((node) => node.institution === "INST-TREASURY")!;
    const after = emptied(campaign, TREASURY);
    const treasury = allNodes(after).find((node) => node.institution === "INST-TREASURY")!;
    expect(treasury.staffing).toBe("acting");
    expect(treasury.holder).not.toBe(before.holder);
    expect(nodeNeedsAttention(treasury)).toBe(true);
    const cut = attentionTree(executiveTree(after)).flatMap((section) => section.nodes);
    expect(cut.some((node) => node.institution === "INST-TREASURY")).toBe(true);
    expect(cut.every((node) => nodeNeedsAttention(node) || node.children.length > 0)).toBe(true);
  });

  it("pins every chair with a sourced headquarters once, and none without one", () => {
    const pins = executivePins(campaign);
    expect(pins.find((pin) => pin.institution === "INST-DOD")?.site?.name).toBe("The Pentagon");
    expect(pins.some((pin) => pin.institution === "INST-TSA")).toBe(false);
    expect(new Set(pins.map((pin) => pin.institution)).size).toBe(pins.length);
  });
});

describe("an office's file", () => {
  const campaign = openingCampaign({ seedText: "w6-office-file" });

  it("frames the headquarters, names the holder and offers the cabinet lever on a Secretary's chair", () => {
    const file = officeFile(campaign, "OFF-DEFENSE-SEC")!;
    expect(file.camera).toBe("office:INST-DOD");
    expect(file.site).toEqual({ kind: "sourced", name: "The Pentagon", state: "VA" });
    expect(file.lever).toBe("cabinet");
    expect(file.holderName).toBeTruthy();
    expect(file.commands.length).toBeGreaterThan(0);
    expect(file.agencies.map((agency) => agency.institution)).toContain("INST-JCS");
  });

  it("says why an office has no site, and gives an agency only the acting lever", () => {
    const file = officeFile(campaign, "OFF-TSA-HEAD")!;
    expect(file.site.kind).toBe("none");
    expect(file.lever).toBe("acting");
    expect(file.commands).toHaveLength(0);
  });

  it("refuses an id the catalog does not seat", () => {
    expect(officeFile(campaign, "OFF-NOWHERE")).toBeUndefined();
  });
});
