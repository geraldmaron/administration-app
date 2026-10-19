import type { MarkKind, MarkPoint } from "./sources";

/** A mark where it falls on screen. */
export interface PlacedMark {
  readonly mark: MarkPoint;
  readonly x: number;
  readonly y: number;
}

/** Marks close enough on screen to be one button. */
export interface MarkCluster {
  readonly key: string;
  readonly kind: MarkKind;
  readonly x: number;
  readonly y: number;
  readonly members: readonly MarkPoint[];
  readonly weight: number;
}

/** About 25 marks are drawn at once; the rest are behind "N more". */
export const MARK_CAP = 25;
/** Two marks of a kind nearer than this on screen merge. */
export const CLUSTER_RADIUS_PX = 28;

/**
 * Greedy clustering in screen space: marks are taken heaviest first and each
 * joins the first cluster of its kind within the radius of that cluster's
 * seed, else seeds its own. Incidents and forces never merge. The order and
 * the keys are stable for the same input, so focus survives a re-cluster.
 */
export function clusterMarks(placed: readonly PlacedMark[], radius = CLUSTER_RADIUS_PX): readonly MarkCluster[] {
  const order = [...placed].sort((a, b) => b.mark.weight - a.mark.weight || a.mark.id.localeCompare(b.mark.id));
  const seeds: { kind: MarkKind; x: number; y: number; members: PlacedMark[] }[] = [];
  for (const entry of order) {
    const seed = seeds.find((s) => s.kind === entry.mark.kind && Math.hypot(s.x - entry.x, s.y - entry.y) <= radius);
    if (seed) seed.members.push(entry);
    else seeds.push({ kind: entry.mark.kind, x: entry.x, y: entry.y, members: [entry] });
  }
  return seeds.map((seed) => {
    const weight = seed.members.reduce((sum, m) => sum + Math.max(0, m.mark.weight), 0);
    const x = seed.members.reduce((sum, m) => sum + m.x, 0) / seed.members.length;
    const y = seed.members.reduce((sum, m) => sum + m.y, 0) / seed.members.length;
    return { key: seed.members[0]?.mark.id ?? "", kind: seed.kind, x, y, members: seed.members.map((m) => m.mark), weight };
  });
}

/** The clusters drawn (heaviest first, then put in reading order for the keyboard) and how many are held back. */
export function capMarks(clusters: readonly MarkCluster[], cap = MARK_CAP): { readonly shown: readonly MarkCluster[]; readonly hidden: readonly MarkCluster[] } {
  const ranked = [...clusters].sort((a, b) => b.weight - a.weight || a.key.localeCompare(b.key));
  const shown = ranked.slice(0, cap).sort((a, b) => a.y - b.y || a.x - b.x || a.key.localeCompare(b.key));
  return { shown, hidden: ranked.slice(cap) };
}

/** The roving-tabindex step for a key in a list of `count`: arrows wrap, Home and End jump; null for any other key. */
export function rovingStep(current: number, key: string, count: number): number | null {
  if (count === 0) return null;
  switch (key) {
    case "ArrowRight":
    case "ArrowDown":
      return (current + 1) % count;
    case "ArrowLeft":
    case "ArrowUp":
      return (current - 1 + count) % count;
    case "Home":
      return 0;
    case "End":
      return count - 1;
    default:
      return null;
  }
}

/** A cluster's accessible name: one mark by its label and place, several by their count and the first. */
export function clusterName(cluster: MarkCluster): string {
  const first = cluster.members[0];
  if (!first) return "";
  if (cluster.members.length === 1) return `${first.label}, ${first.where}`;
  const noun = { force: "force groups", incident: "incidents", capitol: "capitols", metro: "metros", office: "offices" }[cluster.kind];
  return `${cluster.members.length} ${noun}, including ${first.label}`;
}
