import { Text } from "../primitives/Text";

export type Direction = "up" | "down" | "flat";
export type Tone = "good" | "watch" | "bad" | "neutral";

export type Delta = {
  /** Already formatted: "+2 pts". */
  readonly text: string;
  readonly direction: Direction;
  /** Whether the move helps the President; with `better` instead, the tone follows from the direction. */
  readonly tone?: Tone;
  readonly better?: "up" | "down";
};

const ARROW: Record<Direction, string> = { up: "▲", down: "▼", flat: "▬" };
const SPOKEN: Record<Direction, string> = { up: "up", down: "down", flat: "unchanged" };
const TONE_INK = { good: "success", watch: "warning", bad: "danger", neutral: "secondary" } as const;

export function toneOf(delta: Delta): Tone {
  if (delta.tone) return delta.tone;
  if (!delta.better || delta.direction === "flat") return "neutral";
  return delta.direction === delta.better ? "good" : "bad";
}

/** A signed move: arrow, words, and what it is measured against. Never color alone. */
export function DeltaText({ delta, period }: { readonly delta: Delta; readonly period?: string }) {
  const tone = toneOf(delta);
  return (
    <Text variant="label" tone={TONE_INK[tone]} aria-label={`${SPOKEN[delta.direction]} ${delta.text}${period ? ` ${period}` : ""}`}>
      {ARROW[delta.direction]} {delta.text}
      {period ? (
        <Text variant="caption" tone="tertiary" weight="regular">
          {" "}
          {period}
        </Text>
      ) : null}
    </Text>
  );
}
