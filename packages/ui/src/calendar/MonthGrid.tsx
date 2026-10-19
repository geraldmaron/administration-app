import { View, useMedia } from "@tamagui/core";
import { Key, KeySample } from "../data/Key";
import { URGENCY_KEY } from "../data/key-entries";
import { Pressable } from "../primitives/Button";
import { Column, Row } from "../primitives/Stack";
import { Text } from "../primitives/Text";
import type { DayCell, Urgency } from "./types";

const URGENCIES: readonly Urgency[] = ["hard", "soft", "ambient"];

/** The key for the month's marks: each urgency's shape and word, in the agenda's words. */
export const MONTH_KEY = URGENCIES.map((urgency) => URGENCY_KEY[urgency]);

/**
 * A month of whole weeks. Each day carries a mark per dated matter, its shape
 * and ink the urgency (a square stops time, a dot needs you, a ring is on the
 * calendar), counted in words for a screen reader; pressing a day selects it
 * so the agenda below can show what falls on it. The key prints under the
 * grid unless the screen keys it elsewhere.
 */
export function MonthGrid({ weekdays, weeks, selected, onSelect, keyed = true }: { readonly weekdays: readonly string[]; readonly weeks: readonly (readonly DayCell[])[]; readonly selected?: string; readonly onSelect: (key: string) => void; readonly keyed?: boolean }) {
  const media = useMedia();
  const height = media.phone ? 52 : 76;
  return (
    <Column gap="sm">
      <View borderWidth={1} borderColor="borderColor" borderRadius="card" overflow="hidden" backgroundColor="surface">
        <Row backgroundColor="surfaceRaised" aria-hidden>
          {weekdays.map((day) => (
            <View key={day} flex={1} paddingVertical="xs" alignItems="center">
              <Text variant="caption" weight="strong" tone="secondary">
                {media.phone ? day.slice(0, 1) : day}
              </Text>
            </View>
          ))}
        </Row>
        {weeks.map((week) => (
          <Row key={week[0]?.key} borderTopWidth={1} borderTopColor="borderColor">
            {week.map((cell) => (
              <Day key={cell.key} cell={cell} height={height} selected={cell.key === selected} onSelect={onSelect} />
            ))}
          </Row>
        ))}
      </View>
      {keyed ? <Key entries={MONTH_KEY} label="What the marks on a day mean" /> : null}
    </Column>
  );
}

/** One day: its number (today ringed in the accent) and a mark per dated matter, at most four drawn. */
function Day({ cell, height, selected, onSelect }: { readonly cell: DayCell; readonly height: number; readonly selected: boolean; readonly onSelect: (key: string) => void }) {
  const hard = cell.marks.filter((mark) => mark.urgency === "hard").length;
  return (
    <Pressable
      flex={1}
      height={height}
      borderRadius={0}
      padding="xs"
      aria-pressed={selected}
      aria-label={`${cell.key}${cell.today ? ", today" : ""}: ${cell.marks.length === 0 ? "nothing scheduled" : `${cell.marks.length} scheduled ${cell.marks.length === 1 ? "item" : "items"}${hard ? `, ${hard} that stop time` : ""}`}`}
      onPress={() => onSelect(cell.key)}
      backgroundColor={selected ? "infoFill" : { default: "transparent", hover: "surfaceHover" }}
      borderLeftWidth={1}
      borderLeftColor="borderColor"
      opacity={cell.inMonth ? 1 : 0.45}
    >
      <View width={24} height={24} borderRadius="pill" alignItems="center" justifyContent="center" backgroundColor={cell.today ? "accentFill" : "transparent"}>
        <Text variant="caption" weight={cell.today ? "strong" : "regular"} tone={cell.today ? "inverse" : "primary"} tabular>
          {cell.day}
        </Text>
      </View>
      <Row gap="2xs" wrap marginTop="2xs">
        {cell.marks.slice(0, 4).map((mark) => (
          <KeySample key={mark.id} entry={URGENCY_KEY[mark.urgency]} size={9} />
        ))}
        {cell.marks.length > 4 ? (
          <Text variant="caption" tone="tertiary">
            +{cell.marks.length - 4}
          </Text>
        ) : null}
      </Row>
    </Pressable>
  );
}
