import { View } from "@tamagui/core";
import { Pressable } from "../primitives/Button";
import { Column, Row } from "../primitives/Stack";
import { Text } from "../primitives/Text";
import type { BarSegment } from "./StackedBar";

export type WeekColumn = {
  readonly key: number;
  /** Under the column: "12". */
  readonly label: string;
  /** Bottom first. */
  readonly segments: readonly BarSegment[];
  readonly total: number;
  /** The whole column in words, for a screen reader and a tooltip. */
  readonly spoken: string;
  readonly current?: boolean;
};

/** A round top for the scale whose midpoint is a whole number, so both gridlines carry a label a reader can trust. */
export function scaleTop(tallest: number): number {
  const step = tallest <= 10 ? 2 : tallest <= 40 ? 4 : 10;
  return Math.max(step, Math.ceil(tallest / step) * step);
}

const PLOT = 140;

function Gridlines({ top }: { readonly top: number }) {
  return (
    <View position="absolute" left={0} right={0} top={0} height={PLOT} pointerEvents="none">
      {[top, top / 2, 0].map((tick) => (
        <View key={tick} position="absolute" left={0} right={0} top={PLOT - (tick / top) * PLOT} height={1} backgroundColor={tick === 0 ? "borderColorStrong" : "borderColor"} />
      ))}
    </View>
  );
}

function Axis({ top }: { readonly top: number }) {
  return (
    <View width={28} height={PLOT} position="relative" aria-hidden>
      {[top, top / 2, 0].map((tick) => (
        <Text key={tick} variant="caption" tone="tertiary" tabular position="absolute" right={4} top={PLOT - (tick / top) * PLOT - 8}>
          {tick}
        </Text>
      ))}
    </View>
  );
}

function Bar({ column, top, selected, onSelect }: { readonly column: WeekColumn; readonly top: number; readonly selected: boolean; readonly onSelect?: (key: number) => void }) {
  return (
    <Pressable
      onPress={onSelect ? () => onSelect(column.key) : undefined}
      disabled={!onSelect}
      role={onSelect ? "button" : "img"}
      aria-label={column.spoken}
      aria-pressed={onSelect ? selected : undefined}
      flex={1}
      minWidth={8}
      alignItems="stretch"
      gap="2xs"
      borderRadius="chip"
      backgroundColor={selected ? "surfaceHover" : { default: "transparent", hover: "surfaceHover" }}
    >
      <View height={PLOT} justifyContent="flex-end" paddingHorizontal={2}>
        <View height={(column.total / top) * PLOT} flexDirection="column-reverse" borderTopLeftRadius={3} borderTopRightRadius={3} overflow="hidden" borderWidth={column.current ? 1 : 0} borderColor="gold">
          {column.segments.map((segment) => (segment.count > 0 ? <View key={segment.key} flexGrow={segment.count} flexBasis={0} backgroundColor={segment.ink} /> : null))}
        </View>
      </View>
      <Text variant="caption" tone={column.current || selected ? "primary" : "tertiary"} weight={column.current || selected ? "strong" : "regular"} center numberOfLines={1}>
        {column.label}
      </Text>
    </Pressable>
  );
}

/**
 * Recent weeks as stacked columns on one scale, so the week the coverage
 * turned is seen before a date is read. A column can select its week.
 * At least a quarter of slots are drawn so a young term does not read as
 * three slabs.
 */
export function WeekColumns({ columns, selected, onSelect, minSlots = 13 }: { readonly columns: readonly WeekColumn[]; readonly selected?: number; readonly onSelect?: (key: number) => void; readonly minSlots?: number }) {
  const top = scaleTop(Math.max(1, ...columns.map((column) => column.total)));
  const empty = Math.max(0, minSlots - columns.length);
  return (
    <Row top gap="2xs">
      <Axis top={top} />
      <Column flex={1} position="relative">
        <Gridlines top={top} />
        <Row top gap={2} position="relative" zIndex={1}>
          {columns.map((column) => (
            <Bar key={column.key} column={column} top={top} selected={selected === column.key} onSelect={onSelect} />
          ))}
          {Array.from({ length: empty }, (_, i) => (
            <View key={`empty-${i}`} flex={1} minWidth={8} />
          ))}
        </Row>
      </Column>
    </Row>
  );
}
