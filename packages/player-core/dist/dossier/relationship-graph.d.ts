import { type Campaign, type PersonCooperation } from "@admin/engine";
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
export type PublicGraphNode = {
    readonly id: PersonId;
    readonly depth: 1 | 2;
    readonly ring: 1 | 2;
    readonly slot: number;
};
export type PublicGraphNeighborhood = {
    readonly nodes: readonly PublicGraphNode[];
    readonly links: readonly PublicGraphLink[];
    readonly reachable: number;
};
export type PublicGraphReach = {
    readonly value: number;
    readonly unit: "accepted outgoing issue contacts" | "formal posts held";
};
/** Scope membership is applied before ranking or rendering any personal link. */
export declare function publicScopeGraph(campaign: Campaign, members: readonly PersonId[], issueActId?: string): PublicScopeGraph;
/** Observable access within the selected public scope, never a trust or control score. */
export declare function publicGraphReach(campaign: Campaign, graph: PublicScopeGraph, scopeId: string, person: PersonId): PublicGraphReach;
/** Prioritizes recorded contacts and real two-hop paths without padding. */
export declare function publicGraphNeighborhood(graph: PublicScopeGraph, selected: PersonId, limit: number): PublicGraphNeighborhood;
