import { View } from "@tamagui/core";
import { Key } from "../data/Key";
import type { InkRole } from "../icons/Icon";

export type BarPart = { readonly key: string; readonly label: string; readonly value: number; readonly ink: InkRole };

const pct = (value: number): `${number}%` => `${Math.round(Math.max(0, Math.min(1, value)) * 10000) / 100}%`;

/**
 * One figure as the sum it is: its parts stacked from zero, and what it is
 * losing hatched over the end of them, so the solid run stops exactly at the
 * figure. The track runs 0 to 100%.
 */
export function StackBar({ parts, figure, label }: { readonly parts: readonly BarPart[]; readonly figure: number; readonly label: string }) {
  const built = Math.min(1, parts.reduce((sum, part) => sum + part.value, 0));
  const lost = Math.max(0, built - figure);
  return (
    <View role="img" aria-label={label} height={12} borderRadius="pill" backgroundColor="borderColor" overflow="hidden" flexDirection="row" position="relative">
      {parts.map((part) => (
        <View key={part.key} width={pct(part.value)} height={12} backgroundColor={part.ink} />
      ))}
      {lost > 0.0005 ? <View position="absolute" top={0} bottom={0} left={pct(figure)} width={pct(lost)} backgroundColor="dangerSoft" borderLeftWidth={2} borderLeftColor="danger" /> : null}
    </View>
  );
}

/** A key for a drawn bar: only the parts it uses, each with its ink. Kept for the screens that draw it; new work passes swatch entries to a frame. */
export function BarKey({ items, label = "What the colors mean" }: { readonly items: readonly { readonly key: string; readonly label: string; readonly ink: InkRole }[]; readonly label?: string }) {
  return <Key entries={items.map((item) => ({ id: item.key, kind: "swatch", label: item.label, ink: item.ink }))} label={label} />;
}

export type DistributionPart = { readonly key: string; readonly count: number; readonly label: string; readonly ink: InkRole };

/** How a whole splits: one track in proportion, and each part's count in words beside its ink. */
export function Distribution({ parts, label }: { readonly parts: readonly DistributionPart[]; readonly label: string }) {
  return (
    <View gap="xs">
      <View role="img" aria-label={`${label}: ${parts.map((part) => `${part.count} ${part.label}`).join(", ")}`} height={10} borderRadius="pill" overflow="hidden" flexDirection="row" backgroundColor="borderColor">
        {parts
          .filter((part) => part.count > 0)
          .map((part) => (
            <View key={part.key} flexGrow={part.count} flexBasis={0} height={10} backgroundColor={part.ink} />
          ))}
      </View>
      <Key entries={parts.map((part) => ({ id: part.key, kind: "dot", label: part.label, ink: part.ink, figure: part.count }))} label={`Key: ${label}`} />
    </View>
  );
}
