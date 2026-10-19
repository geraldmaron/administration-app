import { View } from "@tamagui/core";
import { Key } from "../data/Key";
import type { KeyEntry } from "../data/key-entries";
import type { InkRole } from "../icons/Icon";
import { Text } from "../primitives/Text";

/** The ink a segment is drawn in: a theme role, so the bar reads on every ground. */
export type SegmentInk = InkRole;

/** `figure` replaces the count in the key where the count is a weight rather than a tally ("$1.2T", "41%"). */
export type BarSegment = { readonly key: string; readonly count: number; readonly label: string; readonly ink: SegmentInk; readonly figure?: string };

/** What a set of segments says to a screen reader and under the bar: "3 critical, 1 even-handed". */
export function segmentWords(segments: readonly BarSegment[]): string {
  const shown = segments.filter((segment) => segment.count > 0);
  return shown.length === 0 ? "nothing" : shown.map((segment) => (segment.figure ? `${segment.label} ${segment.figure}` : `${segment.count} ${segment.label.toLowerCase()}`)).join(", ");
}

/** A stacked bar's key: each part's swatch, words and count (or figure). */
export function segmentKeyEntries(segments: readonly BarSegment[]): readonly KeyEntry[] {
  return segments.map((segment) => ({ id: segment.key, kind: "swatch", label: segment.label, ink: segment.ink, figure: segment.figure ?? segment.count }));
}

export type StackedBarProps = {
  readonly label: string;
  readonly segments: readonly BarSegment[];
  readonly height?: number;
  /** One line across the bar at a share of it, named under the bar: "270 to win". */
  readonly mark?: { readonly at: number; readonly label: string };
  /** Print the parts' key under the bar; off when the bar sits in a frame that keys it, or a row that says the counts. */
  readonly keyed?: boolean;
};

/**
 * A whole divided into its parts on one bar, each part as wide as its count.
 * The words are always given: the bar is the picture, never the only record.
 */
export function StackedBar({ label, segments, height = 10, mark, keyed = false }: StackedBarProps) {
  const total = segments.reduce((sum, segment) => sum + segment.count, 0);
  const bar = (
    <View role="img" aria-label={`${label}: ${segmentWords(segments)}${mark ? `, ${mark.label}` : ""}.`} flexDirection="row" height={height} borderRadius="pill" overflow="hidden" backgroundColor="borderColor" gap={total > 0 ? 2 : 0}>
      {segments.map((segment) => (segment.count > 0 ? <View key={segment.key} flexGrow={segment.count} flexBasis={0} backgroundColor={segment.ink} /> : null))}
    </View>
  );
  if (!mark && !keyed) return bar;
  const left: `${number}%` = mark ? `${Math.min(100, Math.max(0, mark.at * 100))}%` : "0%";
  return (
    <View gap="2xs">
      <View position="relative">
        {bar}
        {mark ? <View position="absolute" top={-4} bottom={-4} width={2} marginLeft={-1} left={left} backgroundColor="color" /> : null}
      </View>
      {mark ? (
        <Text variant="caption" tone="secondary" aria-hidden>
          {mark.label}
        </Text>
      ) : null}
      {keyed ? <Key entries={segmentKeyEntries(segments)} label={`Key: ${label}`} /> : null}
    </View>
  );
}

/** The key under a stacked chart. Kept for screens that draw their own bars; new work passes `segmentKeyEntries` to a frame or sets `keyed`. */
export function SegmentLegend({ segments }: { readonly segments: readonly BarSegment[] }) {
  return <Key entries={segmentKeyEntries(segments)} label="What the colors mean" />;
}
