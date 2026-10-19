import type { Campaign } from "@admin/engine";
import { nodeNeedsAttention, pendingNominee, type ExecutiveNode, type ExecutiveSection, type ExecutiveSectionKey, type PendingNominee } from "@admin/player-core";

export type { PendingNominee };

export type RosterRow = {
  readonly node: ExecutiveNode;
  /** 0 for a lead chair, 1 for an agency under it. */
  readonly depth: 0 | 1;
  /** A name the Senate has in front of it for this chair, which is not the person in it. */
  readonly nominee?: PendingNominee;
  /** Items awaiting delivery in the body under the chair. */
  readonly backlog?: number;
  readonly needsYou: boolean;
};

export type RosterScope = {
  readonly key: ExecutiveSectionKey;
  readonly title: string;
  readonly lead: string;
  readonly rows: readonly RosterRow[];
};

export type StaffingSummary = {
  readonly total: number;
  readonly confirmed: number;
  readonly acting: number;
  readonly vacant: number;
  readonly nominees: number;
  readonly waiting: number;
  readonly needYou: number;
};

function rowOf(campaign: Campaign, node: ExecutiveNode, depth: 0 | 1): RosterRow {
  const nominee = pendingNominee(campaign, node);
  const runtime = campaign.institutions[node.institution];
  return {
    node,
    depth,
    ...(nominee ? { nominee } : {}),
    ...(runtime && node.office !== "press" ? { backlog: Math.round(runtime.backlog) } : {}),
    needsYou: nodeNeedsAttention(node),
  };
}

/** Each section as flat rows, a lead chair followed by the agencies under it, so a roster reads down one set of columns. */
export function rosterScopes(campaign: Campaign, sections: readonly ExecutiveSection[]): readonly RosterScope[] {
  return sections.map((section) => ({
    key: section.key,
    title: section.title,
    lead: section.lead,
    rows: section.nodes.flatMap((node) => [rowOf(campaign, node, 0), ...node.children.map((child) => rowOf(campaign, child, 1))]),
  }));
}

export function staffingSummary(scopes: readonly RosterScope[]): StaffingSummary {
  const rows = scopes.flatMap((scope) => scope.rows);
  const count = (test: (row: RosterRow) => boolean) => rows.filter(test).length;
  return {
    total: rows.length,
    confirmed: count((row) => row.node.staffing === "confirmed"),
    acting: count((row) => row.node.staffing === "acting"),
    vacant: count((row) => row.node.staffing === "vacant"),
    nominees: count((row) => row.nominee !== undefined),
    waiting: count((row) => row.node.alerts.length > 0),
    needYou: count((row) => row.needsYou),
  };
}

/** The scope narrowed to the chairs that need the President. */
export function onlyNeedingYou(scope: RosterScope): RosterScope {
  return { ...scope, rows: scope.rows.filter((row) => row.needsYou) };
}

/** The chairs most worth opening first: anything with something waiting, then empty chairs, then acting ones. */
export function urgentRows(scopes: readonly RosterScope[]): readonly RosterRow[] {
  const weight = (row: RosterRow) => (row.node.alerts.length > 0 ? 0 : row.node.staffing === "vacant" ? 1 : 2);
  return scopes
    .flatMap((scope) => scope.rows)
    .filter((row) => row.needsYou)
    .sort((a, b) => weight(a) - weight(b));
}

/**
 * Why a chair needs the President, in what the row's badges do not already
 * say: the staffing tag says vacant or acting and the nominee badge names the
 * nominee, so this carries the alerts, who is acting, and whether anyone has
 * been named to fill the chair.
 */
export function urgencyReason(row: RosterRow): string {
  const alerts = row.node.alerts.map((alert) => alert.text);
  const acting = row.node.staffing === "acting" && row.node.holderName ? `${row.node.holderName} is filling in` : undefined;
  const unnamed = row.node.staffing !== "confirmed" && !row.nominee ? "Nobody nominated" : undefined;
  return [...alerts, ...(acting ? [acting] : []), ...(unnamed ? [unnamed] : [])].join(". ");
}

/** Chairs outside the section tree, such as the agencies under one office, as roster rows. */
export function rosterRowsOf(campaign: Campaign, nodes: readonly ExecutiveNode[]): readonly RosterRow[] {
  return nodes.map((node) => rowOf(campaign, node, 1));
}
