import { View } from "@tamagui/core";
import { Row } from "../primitives/Stack";
import { Text } from "../primitives/Text";

/** What a reading means for the President, drawn as the fill's ink; `reading` is plain data. */
export type TrackTone = "good" | "watch" | "bad" | "neutral" | "reading";

export const TRACK_INK = { good: "goodInk", watch: "warningInk", bad: "badInk", neutral: "colorTertiary", reading: "accent" } as const;

export type TrackMark = { readonly at: number; readonly label: string; readonly strong?: boolean };

const clamp = (value: number): number => Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
const pct = (value: number): `${number}%` => `${clamp(value) * 100}%`;

export type TrackProps = {
  /** Where the reading sits on the track, 0 to 1. */
  readonly value: number;
  readonly tone?: TrackTone;
  /** Lines laid on the same track: a majority, a gate, the national figure. */
  readonly marks?: readonly TrackMark[];
  /** A signed reading drawn from a baseline (0.5 for a reading either side of even) rather than from the start. */
  readonly from?: number;
  /** A range drawn behind a dot, such as a poll's margin of error. */
  readonly band?: readonly [number, number];
  /** Where the reading is heading: a bright tick. */
  readonly target?: number;
  /** Hairlines at fixed cuts, so the eye can tell which band a reading sits in. */
  readonly cuts?: readonly number[];
  /** Spoken in place of the drawing; omit when the row beside it already says the figure. */
  readonly label?: string;
  readonly slim?: boolean;
};

/**
 * A reading as a position on a track, with the lines it is judged against
 * laid on the same track. The figure is always printed beside it by the
 * caller; the drawing shows size and standing before the figure is read.
 */
export function Track({ value, tone = "reading", marks = [], from, band, target, cuts = [], label, slim }: TrackProps) {
  const height = slim ? 6 : 10;
  const start = from === undefined ? 0 : Math.min(clamp(from), clamp(value));
  const end = from === undefined ? clamp(value) : Math.max(clamp(from), clamp(value));
  return (
    <View
      position="relative"
      height={height + 8}
      justifyContent="center"
      flexGrow={1}
      minWidth={60}
      {...(label ? { role: "img" as const, "aria-label": label } : { "aria-hidden": true })}
    >
      <View height={height} borderRadius="pill" backgroundColor="borderColor" overflow="hidden">
        {band ? (
          <View position="absolute" top={0} bottom={0} left={pct(Math.min(...band))} width={pct(Math.abs(band[1] - band[0]))} backgroundColor={TRACK_INK[tone]} opacity={0.3} />
        ) : (
          <View position="absolute" top={0} bottom={0} left={pct(start)} width={pct(end - start)} backgroundColor={TRACK_INK[tone]} />
        )}
        {cuts.map((cut) => (
          <View key={cut} position="absolute" top={0} bottom={0} left={pct(cut)} width={1} backgroundColor="surface" opacity={0.8} />
        ))}
      </View>
      {band ? <View position="absolute" left={pct(value)} marginLeft={-5} width={10} height={10} borderRadius="pill" backgroundColor={TRACK_INK[tone]} borderWidth={2} borderColor="surface" /> : null}
      {marks.map((mark) => (
        <View key={`${mark.label}-${mark.at}`} position="absolute" top={0} bottom={0} left={pct(mark.at)} width={mark.strong ? 3 : 2} marginLeft={-1} backgroundColor={mark.strong ? "color" : "colorSecondary"} />
      ))}
      {target === undefined ? null : <View position="absolute" top={-1} bottom={-1} left={pct(target)} width={3} marginLeft={-1} backgroundColor="gold" />}
    </View>
  );
}

/** A track with its name before it and its figure after it, the way a table row or a card reads a reading. */
export function TrackRow({ name, figure, tone = "reading", ...track }: TrackProps & { readonly name: string; readonly figure: string }) {
  return (
    <Row gap="sm" role="group" aria-label={`${name}: ${figure}`}>
      <Text variant="label" tone="secondary" width={140} numberOfLines={2}>
        {name}
      </Text>
      <Track tone={tone} {...track} />
      <Text variant="label" weight="strong" tabular minWidth={64} textAlign="right">
        {figure}
      </Text>
    </Row>
  );
}

/**
 * A signed amount from a center axis: right for a gain, left for a loss, each
 * length to scale with the largest beside it. The words beside it carry the
 * figure and the sign, so the bar is never the only cue.
 */
export function Diverging({ value, scale, tone }: { readonly value: number; readonly scale: number; readonly tone?: TrackTone }) {
  const size = Math.min(50, (Math.abs(value) / Math.max(scale, Number.EPSILON)) * 50);
  const ink = TRACK_INK[tone ?? (value > 0 ? "good" : value < 0 ? "bad" : "neutral")];
  return (
    <View position="relative" height={12} flexGrow={1} minWidth={60} aria-hidden>
      <View position="absolute" top={0} bottom={0} left="50%" width={1} backgroundColor="borderColorStrong" />
      <View position="absolute" top={2} bottom={2} borderRadius="chip" backgroundColor={ink} {...(value < 0 ? { right: "50%" as const } : { left: "50%" as const })} width={`${size}%`} />
    </View>
  );
}
