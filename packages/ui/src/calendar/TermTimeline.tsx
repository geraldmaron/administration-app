import { useState } from "react";
import { View } from "@tamagui/core";
import { Key } from "../data/Key";
import { TERM_KEY } from "../data/key-entries";
import { Column, Row } from "../primitives/Stack";
import { Text } from "../primitives/Text";

export type TermMarkView = { readonly id: string; readonly label: string; readonly dateLabel: string; readonly position: number; readonly past: boolean };

const INSET = 2;
const LABEL_WIDTH = 120;
const LABEL_GAP = 8;
const LANE_HEIGHT = 56;
const TRACK_HEIGHT = 14;
const TICK_HEIGHT = 22;

type Placed = { readonly mark: TermMarkView; readonly above: boolean; readonly left: number; readonly rightAligned: boolean };

/**
 * Each label starts at its mark and runs toward the middle of the track, and
 * neighbors alternate above and below it. Returns null when two labels on one
 * side would still collide, so the caller falls back to a plain list.
 */
function place(marks: readonly TermMarkView[], width: number): readonly Placed[] | null {
  const inner = width - INSET * 2;
  const placed = marks.map((mark, index) => {
    const x = INSET + Math.max(0, Math.min(1, mark.position)) * inner;
    const rightAligned = x + LABEL_WIDTH > width;
    return { mark, above: index % 2 === 0, left: rightAligned ? x - LABEL_WIDTH : x, rightAligned };
  });
  for (const side of [true, false]) {
    const row = placed.filter((p) => p.above === side).sort((a, b) => a.left - b.left);
    const crowded = row.some((p, i) => i > 0 && p.left < row[i - 1]!.left + LABEL_WIDTH + LABEL_GAP);
    if (crowded) return null;
  }
  return placed;
}

function MarkLabel({ mark }: { readonly mark: TermMarkView }) {
  return (
    <>
      <Text variant="caption" weight="strong" tone={mark.past ? "tertiary" : "primary"}>
        {mark.label}
      </Text>
      <Text variant="caption" tone="secondary">
        {mark.dateLabel}
      </Text>
    </>
  );
}

const HEAD = 10;
const NUMBERED_HEAD = 18;

/** The milestone's number, drawn the way its pin is: filled ahead, hollow once passed. */
function MarkNumber({ mark, index }: { readonly mark: TermMarkView; readonly index: number }) {
  const ink = mark.past ? "colorTertiary" : "accent";
  return (
    <View width={NUMBERED_HEAD} height={NUMBERED_HEAD} borderRadius="pill" borderWidth={2} borderColor={ink} backgroundColor={mark.past ? "surface" : ink} alignItems="center" justifyContent="center">
      <Text variant="caption" weight="strong" tabular color={mark.past ? "colorTertiary" : "accentInk"}>
        {index + 1}
      </Text>
    </View>
  );
}

/**
 * A milestone's mark on the track: a tick with a head, filled while it is
 * still ahead and hollow once it has passed, so the two differ by shape as
 * well as ink. When the names cannot sit at their marks, each head carries the
 * number the list below gives it.
 */
function MarkPin({ mark, index, numbered, top }: { readonly mark: TermMarkView; readonly index: number; readonly numbered: boolean; readonly top: number }) {
  const ink = mark.past ? "colorTertiary" : "accent";
  const head = numbered ? NUMBERED_HEAD : HEAD;
  return (
    <View position="absolute" left={`${Math.max(0, Math.min(1, mark.position)) * 100}%`} top={top} marginLeft={-head / 2} width={head} height={TICK_HEIGHT + (numbered ? NUMBERED_HEAD - HEAD : 0)} alignItems="center">
      {numbered ? <MarkNumber mark={mark} index={index} /> : <View width={HEAD} height={HEAD} borderRadius="pill" borderWidth={2} borderColor={ink} backgroundColor={mark.past ? "surface" : ink} />}
      <View width={2} flex={1} backgroundColor={ink} />
    </View>
  );
}

/** The term as one track: how far it has run, and where the elections and milestones fall on it, with the key for both. */
export function TermTimeline({ title, progress, caption, marks, keyed = true }: { readonly title: string; readonly progress: number; readonly caption: string; readonly marks: readonly TermMarkView[]; readonly keyed?: boolean }) {
  const [width, setWidth] = useState(0);
  const pct = (v: number) => `${Math.max(0, Math.min(1, v)) * 100}%` as const;
  const placed = width > 0 ? place(marks, width) : null;
  const hasAbove = placed?.some((p) => p.above) ?? false;
  const hasBelow = placed?.some((p) => !p.above) ?? false;
  const trackTop = hasAbove ? LANE_HEIGHT : 0;
  return (
    <Column gap="sm" role="group" aria-label={`${title}. ${caption}`}>
      <Row between wrap gap="sm">
        <Text variant="title">{title}</Text>
        <Text variant="caption" tone="secondary">
          {caption}
        </Text>
      </Row>
      <View position="relative" marginTop={placed ? "sm" : "lg"} height={placed ? trackTop + TICK_HEIGHT + (hasBelow ? LANE_HEIGHT : 0) : TRACK_HEIGHT} onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
        <View position="absolute" left={0} right={0} top={trackTop + (TICK_HEIGHT - TRACK_HEIGHT) / 2} height={TRACK_HEIGHT} borderRadius="pill" backgroundColor="borderColor">
          <View height={TRACK_HEIGHT} borderRadius="pill" width={pct(progress)} backgroundColor="goldRule" />
        </View>
        <View position="absolute" left={INSET} right={INSET} top={trackTop} height={TICK_HEIGHT}>
          {marks.map((mark, index) => (
            <MarkPin key={mark.id} mark={mark} index={index} numbered={!placed} top={placed ? 0 : -(NUMBERED_HEAD - HEAD) - 4} />
          ))}
        </View>
        {placed?.map(({ mark, above, left, rightAligned }) => (
          <Column
            key={mark.id}
            position="absolute"
            left={left}
            width={LABEL_WIDTH}
            {...(above ? { top: 0, height: LANE_HEIGHT - 4, justifyContent: "flex-end" } : { top: trackTop + TICK_HEIGHT + 4 })}
            gap="2xs"
            alignItems={rightAligned ? "flex-end" : "flex-start"}
            {...(rightAligned ? { borderRightWidth: 1, paddingRight: "xs" } : { borderLeftWidth: 1, paddingLeft: "xs" })}
            borderColor={mark.past ? "colorTertiary" : "accent"}
          >
            <MarkLabel mark={mark} />
          </Column>
        ))}
      </View>
      {placed ? null : (
        <Row gap="lg" wrap>
          {marks.map((mark, index) => (
            <Row key={mark.id} gap="xs" top minWidth={110}>
              <MarkNumber mark={mark} index={index} />
              <Column gap="2xs">
                <MarkLabel mark={mark} />
              </Column>
            </Row>
          ))}
        </Row>
      )}
      {keyed ? <Key entries={TERM_KEY} label={`Key: ${title}`} /> : null}
    </Column>
  );
}
