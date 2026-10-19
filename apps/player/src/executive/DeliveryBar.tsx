import { BUILT_LABELS, formatRatio, type DeliveryRow } from "@admin/player-core";
import type { KeyEntry } from "@admin/ui";
import { StackBar } from "@admin/ui/dossier";
import { BUILT_INK } from "./present";

const pct = (value: number): string => `${Math.round(value * 100)}`;

/** What a screen reader hears for one bar: the figure, what builds it and what comes off it, in points. */
export function deliveryWords(row: DeliveryRow): string {
  const built = row.built.map((part) => `${part.label.toLowerCase()} ${pct(part.value)}`).join(", ");
  const lost = row.lost.map((part) => `${pct(part.value)} to ${part.label.toLowerCase()}`).join(", ");
  return `Getting ${formatRatio(row.quality)} of its work done. Made up of ${built}.${lost ? ` Losing ${lost}.` : " Nothing is being lost."}`;
}

/** One body's delivery as the sum it is: its inputs stacked, what it loses shaded over their end. */
export function DeliveryBar({ row }: { readonly row: DeliveryRow }) {
  return <StackBar parts={row.built.map((part) => ({ key: part.key, label: part.label, value: part.value, ink: BUILT_INK[part.key] }))} figure={row.quality} label={deliveryWords(row)} />;
}

/** Only the parts some row actually draws, so the key never names an ink the bars do not use; the lost share is drawn the way the bar draws it, a solid danger fill behind a red edge. */
export function deliveryKeyEntries(rows: readonly DeliveryRow[]): readonly KeyEntry[] {
  const drawn = new Set(rows.flatMap((row) => row.built.map((part) => part.key)));
  const keys = (["capacity", "staffing", "budget", "morale", "leader"] as const).filter((key) => drawn.has(key));
  const losing = rows.some((row) => row.lost.length > 0);
  return [
    ...keys.map((key): KeyEntry => ({ id: key, kind: "swatch", label: BUILT_LABELS[key], ink: BUILT_INK[key] })),
    ...(losing
      ? ([
          { id: "lost", kind: "swatch", label: "Lost to an empty top job, piled-up work, politics, or a weak leader", ink: "dangerSoft" },
          { id: "edge", kind: "tick", label: "A red edge marks where the delivered share stops", ink: "danger", weight: 2 },
        ] as const)
      : []),
  ];
}
