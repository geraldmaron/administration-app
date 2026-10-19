import { View, styled } from "@tamagui/core";
import type { FieldControl } from "./Field";

export const Frame = styled(View, {
  name: "Slider",
  role: "slider",
  tabIndex: 0,
  cursor: "pointer",
  position: "relative",
  height: "hit",
  justifyContent: "center",
  borderRadius: "control",
  outlineColor: "outlineColor",
  outlineStyle: "solid",
  outlineOffset: 2,
  outlineWidth: { default: 0, "focus-visible": 2 },
});

export const THUMB = 24;

export type SliderProps = Partial<FieldControl> & {
  readonly value: number;
  readonly min: number;
  readonly max: number;
  readonly step?: number;
  readonly onChange: (value: number) => void;
  /** The value in words, read instead of the bare number. */
  readonly valueText: string;
  /** Required when no Field labels the slider. */
  readonly label?: string;
  /** Fill from the middle, for a scale with a center (left to right politics), not from the start. */
  readonly centered?: boolean;
};

export function snap(raw: number, min: number, max: number, step: number): number {
  const clamped = Math.min(max, Math.max(min, raw));
  return Number((Math.round((clamped - min) / step) * step + min).toFixed(4));
}

export type Key = { readonly key: string; preventDefault(): void };

export function keyedValue(key: string, value: number, min: number, max: number, step: number): number | undefined {
  const page = Math.max(step, (max - min) / 10);
  const moves: Readonly<Record<string, number>> = { ArrowRight: value + step, ArrowUp: value + step, ArrowLeft: value - step, ArrowDown: value - step, PageUp: value + page, PageDown: value - page, Home: min, End: max };
  return moves[key] === undefined ? undefined : snap(moves[key]!, min, max, step);
}

/** The track, its fill and the thumb, drawn the same on every platform; only the way a press becomes a value differs. */
export function SliderParts({ fraction, centered, width }: { readonly fraction: number; readonly centered: boolean | undefined; readonly width: number }) {
  const center = centered ? 0.5 : 0;
  return (
    <>
      <View pointerEvents="none" position="relative" height={6} borderRadius="pill" backgroundColor="borderColorStrong">
        <View position="absolute" top={0} bottom={0} left={`${Math.min(center, fraction) * 100}%`} width={`${Math.abs(fraction - center) * 100}%`} borderRadius="pill" backgroundColor="accent" />
        {centered ? <View position="absolute" top={-5} left="50%" marginLeft={-1} width={2} height={16} backgroundColor="borderColorStrong" /> : null}
      </View>
      <View pointerEvents="none" position="absolute" top="50%" marginTop={-THUMB / 2} left={Math.min(Math.max(0, width - THUMB), Math.max(0, fraction * width - THUMB / 2))} width={THUMB} height={THUMB} borderRadius="pill" backgroundColor="accentInk" borderWidth={3} borderColor="accent" shadowColor="shadowColor" shadowOpacity={1} shadowRadius={4} />
    </>
  );
}
