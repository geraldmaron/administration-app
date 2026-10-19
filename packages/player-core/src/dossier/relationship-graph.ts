import { knownPersonContacts, personNetworkFor, type Campaign, type PersonCooperation } from "@admin/engine";
import type { PersonConnection, PersonId } from "@admin/world";

export type PublicGraphLink = {
  readonly id: string;
  readonly from: PersonId;
  readonly to: PersonId;
  readonly evidence: "inferred" | "recorded";
  readonly biography?: PersonConnection;
  readonly contact?: PersonCooperation;
};

export type PublicScopeGraph = {
  readonly members: readonly PersonId[];
  readonly links: readonly PublicGraphLink[];
  readonly adjacency: ReadonlyMap<PersonId, readonly PublicGraphLink[]>;
};

export type PublicGraphNode = { readonly id: PersonId; readonly depth: 1 | 2; readonly ring: 1 | 2; readonly slot: number };
export type PublicGraphNeighborhood = {
  readonly nodes: readonly PublicGraphNode[];
  readonly links: readonly PublicGraphLink[];
  readonly reachable: number;
};

export type PublicGraphReach = { readonly value: number; readonly unit: "accepted outgoing issue contacts" | "formal posts held" };

/** Scope membership is applied before ranking or rendering any personal link. */
export function publicScopeGraph(campaign: Campaign, members: readonly PersonId[], issueActId?: string): PublicScopeGraph {
  const allowed = new Set(members);
  const biographies = issueActId === undefined ? personNetworkFor(campaign.people, campaign.seed, true) : [];
  const links: PublicGraphLink[] = [
    ...biographies.filter((edge) => allowed.has(edge.from) && allowed.has(edge.to)).map((edge) => ({
      id: `inferred:${edge.from}:${edge.to}:${edge.kind}:${edge.provenance}`,
      from: edge.from, to: edge.to, evidence: "inferred" as const, biography: edge,
    })),
    ...knownPersonContacts(campaign).filter((edge) => allowed.has(edge.from) && allowed.has(edge.to)
      && (issueActId === undefined || edge.actId === issueActId)).map((edge) => ({
      id: `recorded:${edge.from}:${edge.to}:${edge.actId}`,
      from: edge.from, to: edge.to, evidence: "recorded" as const, contact: edge,
    })),
  ].sort((a, b) => a.id.localeCompare(b.id));
  const adjacency = new Map<PersonId, PublicGraphLink[]>();
  for (const member of members) adjacency.set(member, []);
  for (const link of links) {
    adjacency.get(link.from)?.push(link);
    adjacency.get(link.to)?.push(link);
  }
  return { members, links, adjacency };
}

function other(link: PublicGraphLink, person: PersonId): PersonId {
  return link.from === person ? link.to : link.from;
}

function formalPosts(campaign: Campaign, scopeId: string, person: PersonId): number {
  if (scopeId.startsWith("institution:")) return Object.entries(campaign.institutions)
    .filter(([id, office]) => id === scopeId.slice(12) && office.leader === person).length;
  if (scopeId.startsWith("committee:")) {
    const committee = campaign.congress.committees[scopeId.slice(10)];
    return Number(committee?.chair === person) + Number(committee?.ranking === person);
  }
  const chamber = scopeId.startsWith("chamber:") ? scopeId.slice(8) : undefined;
  const seats = (campaign.congress.members ?? []).filter((seat) => seat.person === person && (!chamber || seat.chamber === chamber)).length;
  const leadership = campaign.congress.leadership.filter((post) => post.person === person && (!chamber || post.chamber === chamber)).length;
  const committees = Object.values(campaign.congress.committees).filter((seat) => seat.chair === person || seat.ranking === person).length;
  const institutions = chamber ? 0 : Object.values(campaign.institutions).filter((office) => office.leader === person).length;
  return seats + leadership + committees + institutions;
}

/** Observable access within the selected public scope, never a trust or control score. */
export function publicGraphReach(campaign: Campaign, graph: PublicScopeGraph, scopeId: string, person: PersonId): PublicGraphReach {
  if (!graph.members.includes(person)) return { value: 0, unit: "accepted outgoing issue contacts" };
  if (/^(institution:|committee:|chamber:|federal$)/.test(scopeId)) {
    return { value: formalPosts(campaign, scopeId, person), unit: "formal posts held" };
  }
  const contacts = new Set(graph.links.filter((link) => link.contact && link.from === person).map((link) => link.to));
  return { value: contacts.size, unit: "accepted outgoing issue contacts" };
}

function weight(links: readonly PublicGraphLink[]): number {
  return links.reduce((score, link) => score + (link.evidence === "recorded" ? 4 : 1 + (link.biography?.strength ?? 0)), 0);
}

function neighbors(graph: PublicScopeGraph, person: PersonId): readonly { readonly id: PersonId; readonly score: number }[] {
  const linked = new Map<PersonId, PublicGraphLink[]>();
  for (const edge of graph.adjacency.get(person) ?? []) {
    const id = other(edge, person);
    const ties = linked.get(id) ?? [];
    ties.push(edge);
    linked.set(id, ties);
  }
  return [...linked].map(([id, ties]) => ({ id, score: weight(ties) }))
    .sort((a, b) => b.score - a.score || String(a.id).localeCompare(String(b.id)));
}

const INNER_SLOTS = [0, 3, 1, 4, 2, 5] as const;
const OUTER_SLOTS = [0, 5, 2, 7, 1, 6, 3, 8, 4, 9] as const;

/** One ranked sequence and fixed slots make each expansion a stable prefix. */
function rankedNodes(graph: PublicScopeGraph, selected: PersonId): readonly PublicGraphNode[] {
  const direct = neighbors(graph, selected);
  const directIds = new Set(direct.map((entry) => entry.id));
  const candidates = new Map<PersonId, number>();
  for (const first of direct) for (const second of neighbors(graph, first.id)) {
    if (second.id === selected || directIds.has(second.id)) continue;
    candidates.set(second.id, Math.max(candidates.get(second.id) ?? 0, first.score + second.score));
  }
  const second = [...candidates].map(([id, score]) => ({ id, score }))
    .sort((a, b) => b.score - a.score || String(a.id).localeCompare(String(b.id)));
  const ordered: { readonly id: PersonId; readonly depth: 1 | 2 }[] = [];
  const chosenDirect = new Set<PersonId>();
  const chosenSecond = new Set<PersonId>();
  let directIndex = 0;
  const addDirect = (count: number) => {
    for (let added = 0; added < count && directIndex < direct.length; added += 1) {
      const id = direct[directIndex++]!.id;
      chosenDirect.add(id);
      ordered.push({ id, depth: 1 });
    }
  };
  const addSecond = (count: number) => {
    for (const entry of second) {
      if (count === 0) break;
      if (chosenSecond.has(entry.id) || !(graph.adjacency.get(entry.id) ?? [])
        .some((edge) => chosenDirect.has(other(edge, entry.id)))) continue;
      chosenSecond.add(entry.id);
      ordered.push({ id: entry.id, depth: 2 });
      count -= 1;
    }
  };
  for (const target of [8, 12, 16]) {
    addDirect(target === 8 ? 4 : 2);
    addSecond(target === 8 ? 4 : 2);
    while (ordered.length < target && (directIndex < direct.length || chosenSecond.size < second.length)) {
      const before = ordered.length;
      addDirect(1);
      if (ordered.length < target) addSecond(1);
      if (ordered.length === before) break;
    }
  }
  let inner = 0;
  let outer = 0;
  return ordered.map((node) => {
    if (node.depth === 1 && inner < INNER_SLOTS.length || outer >= OUTER_SLOTS.length) {
      return { ...node, ring: 1 as const, slot: INNER_SLOTS[inner++]! };
    }
    return { ...node, ring: 2 as const, slot: OUTER_SLOTS[outer++]! };
  });
}

/** Prioritizes recorded contacts and real two-hop paths without padding. */
export function publicGraphNeighborhood(graph: PublicScopeGraph, selected: PersonId, limit: number): PublicGraphNeighborhood {
  const nodes = rankedNodes(graph, selected).slice(0, Math.max(0, Math.min(16, Math.floor(limit))));
  const displayed = new Set([selected, ...nodes.map((node) => node.id)]);
  const direct = neighbors(graph, selected);
  const directIds = new Set(direct.map((entry) => entry.id));
  const secondIds = new Set(direct.flatMap((entry) => neighbors(graph, entry.id).map((next) => next.id))
    .filter((id) => id !== selected && !directIds.has(id)));
  return { nodes, links: graph.links.filter((edge) => displayed.has(edge.from) && displayed.has(edge.to)),
    reachable: directIds.size + secondIds.size };
}
