import { View } from "@tamagui/core";
import { Tag } from "../primitives/Tag";
import { Column, Row } from "../primitives/Stack";
import { Text } from "../primitives/Text";
import { initialsVariant } from "../review/Voice";
import { READ_INK, type ReadTone } from "./read-ink";

export { READ_INK, type ReadTone };

const TEXT_TONE = { good: "success", fair: "info", watch: "warning", bad: "danger", neutral: "secondary", "pressure-low": "tertiary", "pressure-near": "gold", "pressure-past": "gold" } as const;

/**
 * A reading drawn as the band it falls in, never as the figure behind it:
 * steps on a meter, the word beside it. Nothing in the office hands a
 * President a number for a person.
 */
export function BandSteps({ label, lit, word, tone, steps = 4, labelHidden, caption }: { readonly label: string; readonly lit: number; readonly word: string; readonly tone: ReadTone; readonly steps?: number; readonly labelHidden?: boolean; readonly caption?: string }) {
  return (
    <Column gap="2xs" role="meter" aria-label={`${label}: ${word}`} aria-valuenow={lit} aria-valuemin={0} aria-valuemax={steps}>
      <Row gap="sm" between>
        {labelHidden ? null : (
          <Text variant="caption" tone="secondary">
            {label}
          </Text>
        )}
        <Text variant="label" tone={TEXT_TONE[tone]}>
          {word}
        </Text>
      </Row>
      <Row gap="2xs">
        {Array.from({ length: steps }, (_, index) => (
          <View key={index} flex={1} height={8} borderRadius="pill" backgroundColor={index < lit ? READ_INK[tone] : "borderColor"} />
        ))}
      </Row>
      {caption ? (
        <Text variant="caption" tone="tertiary">
          {caption}
        </Text>
      ) : null}
    </Column>
  );
}

/** A graded reading is a dot; a reading that is pressure toward a mark, not a grade, is a diamond, so the two never read as one scale. */
export type PipView = { readonly key: string; readonly label: string; readonly word: string; readonly tone: ReadTone; readonly shape?: "dot" | "diamond" };

/** One reading's mark: a dot for a grade, a diamond for pressure toward a mark. */
export function PipMark({ pip, size = 9 }: { readonly pip: PipView; readonly size?: number }) {
  const diamond = pip.shape === "diamond";
  const side = diamond ? size - 1 : size;
  return <View width={side} height={side} flexShrink={0} borderRadius={diamond ? 1 : "pill"} backgroundColor={READ_INK[pip.tone]} {...(diamond ? { transform: [{ rotate: "45deg" }], marginHorizontal: 1 } : {})} aria-hidden />;
}

/** A holder's read in one mark: a pip per reading that decides whether the chair holds, and the deciding word. */
export function ReadBadge({ word, tone, pips }: { readonly word: string; readonly tone: ReadTone; readonly pips: readonly PipView[] }) {
  return (
    <Row gap="xs" aria-label={`Assessment: ${word}. ${pips.map((pip) => `${pip.label} ${pip.word}`).join(", ")}`}>
      <Row gap={3}>
        {pips.map((pip) => (
          <PipMark key={pip.key} pip={pip} />
        ))}
      </Row>
      <Text variant="caption" weight="strong" tone={TEXT_TONE[tone]}>
        {word}
      </Text>
    </Row>
  );
}

/**
 * The same pips spelled out, where a card has room: each mark with the trait
 * it stands for and its word, so the dots never have to be decoded from a key.
 */
export function TraitReadout({ pips }: { readonly pips: readonly PipView[] }) {
  return (
    <View flexDirection="row" flexWrap="wrap" columnGap="lg" rowGap="xs" role="list" aria-label="Assessment by trait">
      {pips.map((pip) => (
        <Row key={pip.key} gap="xs" flexGrow={1} flexBasis="40%" minWidth={150} role="listitem" aria-label={`${pip.label}: ${pip.word}`}>
          <PipMark pip={pip} size={10} />
          <Text variant="caption" tone="secondary">
            {pip.label}
          </Text>
          <Text variant="caption" weight="strong" tone={TEXT_TONE[pip.tone]} flexShrink={1}>
            {pip.word}
          </Text>
        </Row>
      ))}
    </View>
  );
}

export type Staffing = "confirmed" | "acting" | "vacant";

const STAFFING = {
  confirmed: { status: "success", icon: "approve", label: "Confirmed" },
  acting: { status: "warning", icon: "pending", label: "Acting" },
  vacant: { status: "danger", icon: "emptyCabinet", label: "Vacant" },
} as const;

/** Each way a chair is held has its own word, tone and glyph, so an acting officer never reads as a confirmed one. */
export function StaffingBadge({ staffing }: { readonly staffing: Staffing }) {
  const look = STAFFING[staffing];
  return (
    <Tag tone={look.status} icon={look.icon}>
      {look.label}
    </Tag>
  );
}

/** Initials in a disc or rounded square: the stand-in for a face where a person has no drawn face. */
export function Monogram({ name, size = 48, muted, square }: { readonly name: string; readonly size?: number; readonly muted?: boolean; readonly square?: boolean }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase())
    .filter((char) => /[A-Z]/.test(char));
  const mark = initials.length > 1 ? `${initials[0]}${initials.at(-1)}` : (initials[0] ?? "?");
  return (
    <View width={size} height={size} borderRadius={square ? "control" : "pill"} backgroundColor={muted ? "backgroundStrong" : "infoFill"} borderWidth={1} borderColor={muted ? "borderColor" : "goldRule"} alignItems="center" justifyContent="center" aria-hidden>
      <Text variant={initialsVariant(size)} tone={muted ? "tertiary" : "info"}>
        {mark}
      </Text>
    </View>
  );
}
