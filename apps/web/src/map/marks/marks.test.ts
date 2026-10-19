import { describe, expect, it } from "vitest";
import type { NationId } from "@admin/world";
import { openingHarnessCampaign, stagedHarnessCampaign } from "../harness/fixture";
import { capMarks, clusterMarks, clusterName, rovingStep, CLUSTER_RADIUS_PX, MARK_CAP, type PlacedMark } from "./cluster";
import { detachedState } from "../detach";
import { forceMarks, forceZoomFor, incidentMarks, nationPlaceMarks, placeMarks, type MarkPoint } from "./sources";

function mark(id: string, kind: MarkPoint["kind"] = "incident", weight = 1): MarkPoint {
  return { id, kind, label: id, where: "Somewhere", lon: 0, lat: 0, weight, members: [id] };
}

function at(m: MarkPoint, x: number, y: number): PlacedMark {
  return { mark: m, x, y };
}

describe("clustering", () => {
  it("merges marks of a kind within the radius and keeps the rest apart", () => {
    const clusters = clusterMarks([at(mark("a", "incident", 3), 100, 100), at(mark("b"), 110, 105), at(mark("c"), 100 + CLUSTER_RADIUS_PX * 2, 100)]);
    expect(clusters).toHaveLength(2);
    const merged = clusters.find((c) => c.members.length === 2)!;
    expect(merged.key).toBe("a");
    expect(merged.x).toBeCloseTo(105);
    expect(merged.weight).toBe(4);
  });

  it("never merges an incident with a force", () => {
    expect(clusterMarks([at(mark("a"), 100, 100), at(mark("f", "force"), 100, 100)])).toHaveLength(2);
  });

  it("is stable for the same input", () => {
    const placed = [at(mark("b"), 10, 10), at(mark("a"), 12, 12), at(mark("c"), 300, 10)];
    expect(clusterMarks(placed)).toEqual(clusterMarks([...placed].reverse()));
  });

  it("draws about 25, heaviest first, in reading order, and holds back the rest", () => {
    const placed = Array.from({ length: 40 }, (_, i) => at(mark(`m${i}`, "incident", i), (i % 8) * 100, Math.floor(i / 8) * 100));
    const { shown, hidden } = capMarks(clusterMarks(placed));
    expect(shown).toHaveLength(MARK_CAP);
    expect(hidden).toHaveLength(15);
    expect(Math.min(...shown.map((c) => c.weight))).toBeGreaterThan(Math.max(...hidden.map((c) => c.weight)));
    for (let i = 1; i < shown.length; i++) expect(shown[i]!.y > shown[i - 1]!.y || (shown[i]!.y === shown[i - 1]!.y && shown[i]!.x >= shown[i - 1]!.x)).toBe(true);
  });

  it("names a cluster for assistive technology", () => {
    const [single] = clusterMarks([at(mark("Flooding"), 0, 0)]);
    expect(clusterName(single!)).toBe("Flooding, Somewhere");
    const [group] = clusterMarks([at(mark("Flooding", "incident", 2), 0, 0), at(mark("Wildfire"), 1, 1)]);
    expect(clusterName(group!)).toBe("2 incidents, including Flooding");
  });
});

describe("roving focus", () => {
  it("wraps with the arrows and jumps with Home and End", () => {
    expect(rovingStep(0, "ArrowRight", 3)).toBe(1);
    expect(rovingStep(2, "ArrowDown", 3)).toBe(0);
    expect(rovingStep(0, "ArrowLeft", 3)).toBe(2);
    expect(rovingStep(1, "ArrowUp", 3)).toBe(0);
    expect(rovingStep(1, "Home", 3)).toBe(0);
    expect(rovingStep(0, "End", 3)).toBe(2);
    expect(rovingStep(0, "Enter", 3)).toBeNull();
    expect(rovingStep(0, "ArrowRight", 0)).toBeNull();
  });
});

describe("mark sources", () => {
  it("pins every live incident through placeOf, each on a finite point", () => {
    const marks = incidentMarks(stagedHarnessCampaign());
    expect(marks.length).toBeGreaterThanOrEqual(12);
    expect(marks.every((m) => Number.isFinite(m.lon) && Number.isFinite(m.lat) && m.label.length > 0)).toBe(true);
    expect(new Set(marks.map((m) => m.id)).size).toBe(marks.length);
    expect(incidentMarks(openingHarnessCampaign())).toEqual([]);
  });

  it("shows state and foreign executive orders at their subjects, but not construction orders", () => {
    const opening = openingHarnessCampaign();
    const campaign = {
      ...opening,
      orders: [
        { id: "order-state:1", order: "order-relief-program", subject: { kind: "state" as const, state: "OH" as const, cause: "wildfire" as const, declarationId: "stafford:OH", billId: "bill:recovery", amount: 10 }, turn: 1, contested: false, challengeChance: 0 },
        { id: "order-foreign:1", order: "order-border-controls", subject: { kind: "foreign" as const, nation: "FRA" as NationId, declarationId: "d1" }, turn: 1, contested: false, challengeChance: 0 },
        { id: "order-construction:1", order: "order-emergency-construction", subject: { kind: "construction" as const, sourceId: "x", declarationId: "d1", amount: 1 }, turn: 1, contested: false, challengeChance: 0 },
      ],
    };
    const marks = incidentMarks(campaign);
    expect(marks.map((mark) => mark.id)).toEqual(["incident:order:order-foreign:1", "incident:order:order-state:1"]);
    expect(marks[0]).toMatchObject({ kind: "incident", where: "France" });
    expect(marks[1]).toMatchObject({ kind: "incident" });
    expect(marks[1]!.label).toContain("Executive order:");
  });

  it("clusters forces by zoom through player-core: fewer markers far out than up close", () => {
    const campaign = openingHarnessCampaign();
    const far = forceMarks(campaign, "world");
    const close = forceMarks(campaign, "close");
    expect(far.length).toBeGreaterThan(0);
    expect(close.length).toBeGreaterThan(far.length);
    expect(far.flatMap((m) => m.members).sort()).toEqual(close.flatMap((m) => m.members).sort());
  });

  it("pins a detached state's capitol and its largest metros, the capitol first and heavier", () => {
    const marks = placeMarks("TX");
    expect(marks[0]).toMatchObject({ id: "capitol:TX", kind: "capitol", where: "Austin" });
    const metros = marks.filter((m) => m.kind === "metro");
    expect(metros.length).toBeGreaterThan(1);
    expect(metros.every((m) => m.weight < marks[0]!.weight)).toBe(true);
    expect(placeMarks("XX")).toEqual([]);
  });

  it("pins places only for a selection that detaches exactly one state", () => {
    expect(detachedState("state:CO")).toBe("CO");
    expect(detachedState("state:CO|district:CO-03")).toBe("CO");
    expect(detachedState("state:CO|state:UT")).toBeUndefined();
    expect(detachedState("nation:FRA")).toBeUndefined();
    expect(detachedState(undefined)).toBeUndefined();
  });

  it("picks the force zoom from the camera's zoom level", () => {
    expect(forceZoomFor(0)).toBe("world");
    expect(forceZoomFor(2)).toBe("region");
    expect(forceZoomFor(5)).toBe("close");
  });
});

describe("a selected government's places", () => {
  it("pins its capital as a capitol and its other cities as metros", () => {
    const marks = nationPlaceMarks("IRN");
    const capital = marks.filter((mark) => mark.kind === "capitol");
    expect(capital.map((mark) => mark.where)).toEqual(["Tehran"]);
    expect(marks.filter((mark) => mark.kind === "metro").map((mark) => mark.label)).toContain("Mashhad metro");
    expect(marks.every((mark) => Number.isFinite(mark.lon) && Number.isFinite(mark.lat))).toBe(true);
  });
});

