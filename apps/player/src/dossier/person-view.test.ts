import { describe, expect, it } from "vitest";
import { executiveTree, personFile, publicScopeGraph } from "@admin/player-core";
import { opening } from "./opening.test-fixture";
import { networkParams, networkSearch } from "./network-search";
import { VISUAL_CAP, isFormalHub, tieMap } from "./network-view";
import { careerBands, houseOf, houseSeal, personViewOf, vitalsOf } from "./person-view";

const campaign = opening();
const holders = executiveTree(campaign).flatMap((section) => section.nodes.flatMap((node) => (node.holder ? [node.holder] : [])));
const files = holders.flatMap((id) => personFile(campaign, id) ?? []);

describe("the person file", () => {
  it("names the house and its seal for every seated officer", () => {
    expect(files.length).toBeGreaterThan(5);
    for (const file of files) {
      expect(houseOf(file.dossier.standing).length).toBeGreaterThan(0);
      expect(houseSeal(file.dossier.standing)?.id).toBeTruthy();
    }
  });

  it("draws every career band inside its track, ending at today's age", () => {
    for (const file of files) {
      for (const band of careerBands(file)) {
        expect(band.from).toBeGreaterThanOrEqual(0);
        expect(band.from + band.width).toBeLessThanOrEqual(100.0001);
      }
      expect(vitalsOf(file)[0]).toEqual({ icon: "subjectPerson", label: "Age", value: String(file.age) });
    }
  });

  it("reads the view from the address", () => {
    expect(personViewOf("network")).toBe("network");
    expect(personViewOf("nope")).toBe("overview");
  });
});

describe("the relationship map", () => {
  it("places every face on the plot and joins only faces it drew", () => {
    const file = files.find((entry) => entry.circle.length > 0) ?? files[0]!;
    const graph = publicScopeGraph(campaign, [file.person.id, ...file.circle.map((row) => row.otherId)]);
    const map = tieMap(campaign, file.person.id, graph, "immediate", VISUAL_CAP, false);
    for (const node of map.nodes) {
      expect(node.x).toBeGreaterThanOrEqual(0);
      expect(node.x).toBeLessThanOrEqual(100);
      expect(node.y).toBeLessThan(map.height);
    }
    expect(map.label).toContain(file.person.name);
  });

  it("draws formal scopes as membership, never as personal trust", () => {
    expect(isFormalHub("committee:x")).toBe(true);
    expect(isFormalHub("immediate")).toBe(false);
  });

  it("keeps the map's settings in the address and refuses what it does not offer", () => {
    const search = { scope: "committee:a", subject: "P1", query: "x", contact: "y", evidence: "recorded" as const, count: 12 };
    const written = Object.fromEntries(Object.entries(networkParams(search)).filter(([, value]) => value !== undefined));
    expect(networkSearch(written)).toEqual(search);
    expect(networkSearch({ evidence: "secret", count: "99" })).toEqual({});
  });
});
