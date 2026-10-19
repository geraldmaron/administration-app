import type { Campaign } from "@admin/engine";
import { COMPARE_METRICS, COMPARE_METRIC_IDS, compareSnapshot, peerSet, type CompareMetricId, type FormatKind, type PeerRule, type SnapshotRow, type Subject } from "@admin/player-core";
import type { NationId } from "@admin/world";

// A foreign government set beside the United States and the President's chosen
// company, on every reading the comparison engine can take of a government.
// The engine decides what each government's figure is and whether the
// services can read it; this file only arranges the rows and keeps the
// refusals in words, so an empty cell always says why.

/** The readings a foreign government carries in this game: no approval, no budget authority, no recorded course. */
export const NATION_METRICS: readonly CompareMetricId[] = COMPARE_METRIC_IDS.filter((id) => COMPARE_METRICS[id].subjects.includes("nation"));

export type MatrixColumn = {
  readonly id: CompareMetricId;
  readonly label: string;
  readonly format: FormatKind;
  readonly better: "up" | "down";
  readonly benchmark?: { readonly label: string; readonly value: number };
  readonly assessed: boolean;
};

export type MatrixEntry = {
  readonly id: string;
  readonly label: string;
  /** The government the row stands for, for its flag and its file. */
  readonly nation: NationId;
  readonly values: Readonly<Record<string, number | null>>;
  readonly self: boolean;
  /** The government whose file this is. */
  readonly focus: boolean;
};

export type Refusal = { readonly id: string; readonly label: string; readonly reason: string };

export type DossierMatrix = {
  readonly peers: { readonly label: string; readonly basis: string; readonly empty?: string };
  readonly columns: readonly MatrixColumn[];
  readonly rows: readonly MatrixEntry[];
  readonly refusals: readonly Refusal[];
};

function nationOf(campaign: Campaign, row: SnapshotRow): NationId {
  return row.subject.kind === "nation" ? row.subject.id : campaign.founding.nation;
}

/** Each row's empty cells, one line per distinct reason, naming the readings it covers. */
export function refusalsOf(rows: readonly SnapshotRow[], labels: Readonly<Partial<Record<CompareMetricId, string>>>): readonly Refusal[] {
  return rows.flatMap((row) => {
    const byReason = new Map<string, string[]>();
    for (const [metric, reason] of Object.entries(row.reasons) as [CompareMetricId, string][]) byReason.set(reason, [...(byReason.get(reason) ?? []), labels[metric] ?? metric]);
    return [...byReason.entries()].map(([reason, metrics], index) => ({ id: `${row.id}:${index}`, label: `${row.label} · ${metrics.join(", ")}`, reason }));
  });
}

/** The United States, this government and the peer set the rule names, on every reading a government carries. */
export function dossierMatrix(campaign: Campaign, nation: NationId, rule: PeerRule): DossierMatrix {
  const peers = peerSet(campaign, rule);
  const subjects: readonly Subject[] = [{ kind: "self" }, { kind: "nation", id: nation }, ...peers.nations.filter((id) => id !== nation).map((id): Subject => ({ kind: "nation", id }))];
  const snapshot = compareSnapshot(campaign, NATION_METRICS, subjects);
  const labels = Object.fromEntries(snapshot.metrics.map((metric) => [metric.id, metric.label]));
  return {
    peers: { label: peers.label, basis: peers.basis, ...(peers.empty ? { empty: peers.empty } : {}) },
    columns: snapshot.metrics.map((metric) => ({
      id: metric.id,
      label: metric.label,
      format: metric.format,
      better: metric.better,
      ...(metric.benchmark ? { benchmark: metric.benchmark } : {}),
      assessed: COMPARE_METRICS[metric.id].visibility === "assessed",
    })),
    rows: snapshot.rows.map((row) => {
      const id = nationOf(campaign, row);
      return { id: row.id, label: row.label, nation: id, values: row.values, self: row.self === true, focus: id === nation };
    }),
    refusals: refusalsOf(snapshot.rows, labels),
  };
}
