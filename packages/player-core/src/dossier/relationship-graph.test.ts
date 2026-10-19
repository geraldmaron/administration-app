import { describe, expect, it } from "vitest";
import type { Campaign, PersonCooperation } from "@admin/engine";
import type { PersonId } from "@admin/world";
import { openingCampaign } from "../__fixtures__/opening";
import { publicGraphNeighborhood, publicGraphReach, publicScopeGraph, type PublicGraphLink, type PublicScopeGraph } from "./relationship-graph";

const id = (value: string) => value as PersonId;

function recorded(from: PersonId, to: PersonId, actId = "act-equal-protection"): PublicGraphLink {
  const contact: PersonCooperation = { from, to, actId, accepted: true,
    date: { year: 2029, month: 1, day: 1 }, account: "Accepted a conversation; no vote was promised." };
  return { id: `recorded:${from}:${to}:${actId}`, from, to, evidence: "recorded", contact };
}

function graph(members: readonly PersonId[], links: readonly PublicGraphLink[]): PublicScopeGraph {
  const adjacency = new Map<PersonId, PublicGraphLink[]>(members.map((person) => [person, []]));
  for (const link of links) {
    adjacency.get(link.from)?.push(link);
    adjacency.get(link.to)?.push(link);
  }
  return { members, links, adjacency };
}

describe("public relationship graph", () => {
  it("ranks recorded contact first and keeps a genuine two-step path visible", () => {
    const [a, b, c, d] = [id("a"), id("b"), id("c"), id("d")];
    const links = [recorded(a, b), recorded(b, c),
      { id: "inferred:a:d", from: a, to: d, evidence: "inferred" as const }];
    const view = publicGraphNeighborhood(graph([a, b, c, d], links), a, 8);
    expect(view.nodes[0]?.id).toBe(b);
    expect(view.nodes.map(({ id, depth }) => ({ id, depth }))).toContainEqual({ id: c, depth: 2 });
    expect(view.links.map((link) => link.id)).toContain(links[1]!.id);
    expect(view.reachable).toBe(3);
  });

  it("filters both edge sources to scope membership and issue-specific recorded contact", () => {
    const base = openingCampaign();
    const [a, b, outside] = base.congress.members!.slice(0, 3).map((member) => member.person);
    const links = [recorded(a!, b!), recorded(b!, outside!), recorded(a!, b!, "act-clean-grid")];
    const campaign: Campaign = { ...base, congress: { ...base.congress, lobbying: [{ id: "graph-test", approach: "call", turn: base.turn,
      landed: true, account: "Recorded issue conversations", cooperation: links.map((link) => link.contact!) }] } };
    const scope = publicScopeGraph(campaign, [a!, b!], "act-equal-protection");
    expect(scope.links).toHaveLength(1);
    expect(scope.links[0]?.contact?.actId).toBe("act-equal-protection");
    expect(scope.links[0]?.from).toBe(a);
    expect(scope.links[0]?.to).toBe(b);
    expect(publicGraphNeighborhood(scope, a!, 8).nodes.map(({ id, depth }) => ({ id, depth }))).toEqual([{ id: b, depth: 1 }]);
    expect(publicGraphReach(campaign, scope, "issue:bill", a!)).toEqual({ value: 1, unit: "accepted outgoing issue contacts" });
    expect(publicGraphReach(campaign, scope, "issue:bill", b!)).toEqual({ value: 0, unit: "accepted outgoing issue contacts" });
    const allIssues = publicScopeGraph(campaign, [a!, b!]);
    expect(allIssues.links.filter((link) => link.contact).map((link) => link.contact?.actId)).toEqual([
      "act-clean-grid", "act-equal-protection",
    ]);
    expect(allIssues.adjacency.get(a!)?.filter((link) => link.contact)).toHaveLength(2);
  });

  it("keeps each visible node in the same fixed slot as the map expands, including a direct-only scope", () => {
    const source = id("source");
    const others = Array.from({ length: 16 }, (_, index) => id(`official-${index}`));
    const network = graph([source, ...others], others.map((person) => recorded(source, person)));
    const small = publicGraphNeighborhood(network, source, 8);
    const medium = publicGraphNeighborhood(network, source, 12);
    const large = publicGraphNeighborhood(network, source, 16);
    expect(medium.nodes.slice(0, 8)).toEqual(small.nodes);
    expect(large.nodes.slice(0, 12)).toEqual(medium.nodes);
    expect(new Set(large.nodes.map((node) => `${node.ring}:${node.slot}`)).size).toBe(16);
    expect(large.nodes.every((node) => node.depth === 1)).toBe(true);
  });

  it("reveals a two-step path found through a lower-ranked direct neighbor", () => {
    const source = id("source");
    const direct = Array.from({ length: 8 }, (_, index) => id(`direct-${index}`));
    const second = id("second");
    const network = graph([source, ...direct, second], [
      ...direct.map((person) => recorded(source, person)),
      recorded(direct[4]!, second),
    ]);
    const view = publicGraphNeighborhood(network, source, 8);
    expect(view.nodes).toContainEqual(expect.objectContaining({ id: direct[4], depth: 1 }));
    expect(view.nodes).toContainEqual(expect.objectContaining({ id: second, depth: 2 }));
    expect(view.links).toContainEqual(expect.objectContaining({ from: direct[4], to: second }));
  });
});
