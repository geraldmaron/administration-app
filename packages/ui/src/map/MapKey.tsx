import { View, useMedia } from "@tamagui/core";
import { Pressable } from "../primitives/Button";
import { Key } from "../data/Key";
import type { KeyEntry } from "../data/key-entries";
import { Column, Row } from "../primitives/Stack";
import { Text } from "../primitives/Text";
import { MAP_COLORS } from "./style";
import type { MapLegend, MapMix, MapRow } from "./types";

/** One color as a small square, the way the key and the list both show it. */
export function Swatch({ color, size = 14 }: { readonly color: string; readonly size?: number }) {
  return <View width={size} height={size} borderRadius={3} backgroundColor={color as never} borderWidth={1} borderColor="borderColorStrong" aria-hidden />;
}

/** A mixed value as a bar in proportion: a split delegation's seats side by side. */
function MixBar({ mix }: { readonly mix: MapMix }) {
  const total = mix.weights.reduce((sum, weight) => sum + weight, 0);
  return (
    <Row width={56} height={10} borderRadius={2} overflow="hidden" borderWidth={1} borderColor="borderColorStrong" aria-hidden>
      {mix.colors.map((color, index) => {
        const weight = mix.weights[index] ?? 0;
        return weight > 0 && total > 0 ? <View key={`${color}-${index}`} flex={weight / total} height="100%" backgroundColor={color as never} /> : null;
      })}
    </Row>
  );
}

const PIN_ENTRIES: readonly KeyEntry[] = [
  { id: "needs", kind: "dot", label: "Solid dot: waiting for your answer", ink: { color: MAP_COLORS.alert } },
  { id: "declared", kind: "ring", label: "Hollow ring: emergency declared", ink: { color: MAP_COLORS.gold }, weight: 3 },
];

/** What the pins on a map mean, drawn as the dots themselves. */
export function PinKey() {
  return <Key entries={PIN_ENTRIES} label="Pins on the map" />;
}

/** The legend as the map's key: what each color reads, under the lens's name. */
export function MapKey({ legend }: { readonly legend: MapLegend }) {
  return <Key title={legend.title} label={`${legend.title}: key`} entries={legend.entries.map((entry) => ({ id: entry.label, kind: "swatch", label: entry.label, ink: { color: entry.color } }))} />;
}

interface MapListProps {
  readonly rows: readonly MapRow[];
  readonly title: string;
  readonly rowNoun: string;
  readonly selected?: string;
  readonly onSelect: (regionKey: string) => void;
}

interface ListRowProps {
  readonly row: MapRow;
  readonly rank: number;
  readonly selected: boolean;
  readonly keyWidth: number;
  readonly stacked: boolean;
  readonly onSelect: (regionKey: string) => void;
}

/** One ranked row: the rank, its color, the region and its value; on a phone the value sits under the name. */
function ListRow({ row, rank, selected, keyWidth, stacked, onSelect }: ListRowProps) {
  const value = (
    <Text variant="caption" tone="secondary" flex={1}>
      {row.value}
    </Text>
  );
  return (
    <Pressable
      role="link"
      aria-label={`${rank}. ${row.label}: ${row.value}`}
      aria-current={selected ? "true" : undefined}
      onPress={() => onSelect(row.regionKey)}
      paddingVertical="xs"
      paddingHorizontal="sm"
      backgroundColor={selected ? { default: "infoFill", hover: "surfaceHover" } : { default: "transparent", hover: "surfaceHover", press: "backgroundPress" }}
    >
      <Row gap="sm" top={stacked}>
        <Text variant="caption" tone="tertiary" tabular width={28} textAlign="right">
          {rank}
        </Text>
        <View width={keyWidth} paddingTop={stacked ? 3 : 0}>
          {row.mix ? <MixBar mix={row.mix} /> : <Swatch color={row.fill} />}
        </View>
        {stacked ? (
          <Column flex={1} minWidth={0}>
            <Text variant="label">{row.label}</Text>
            {value}
          </Column>
        ) : (
          <>
            <Text variant="label" width={200} numberOfLines={1}>
              {row.label}
            </Text>
            {value}
          </>
        )}
      </Row>
    </Pressable>
  );
}

/** The same rows as a ranked list: every region the lens reads, highest first, each a door to its screen. */
export function MapList({ rows, title, rowNoun, selected, onSelect }: MapListProps) {
  const media = useMedia();
  const keyWidth = rows.some((row) => row.mix) ? 56 : 14;
  if (rows.length === 0) {
    return (
      <Text variant="body" tone="secondary">
        No {rowNoun} to show yet.
      </Text>
    );
  }
  return (
    <Column role="list" aria-label={`${title}, highest first`}>
      {rows.map((row, index) => (
        <View key={row.regionKey} role="listitem">
          <ListRow row={row} rank={index + 1} selected={row.regionKey === selected} keyWidth={keyWidth} stacked={media.phone} onSelect={onSelect} />
        </View>
      ))}
    </Column>
  );
}
