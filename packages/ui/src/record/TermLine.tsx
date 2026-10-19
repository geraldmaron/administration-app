import { View } from "@tamagui/core";
import { Column, Row } from "../primitives/Stack";
import { Text } from "../primitives/Text";

export type TermMark = { readonly key: string; readonly at: number; readonly label: string; readonly tone: "favorable" | "adverse" | "neutral" };

const INK = { favorable: "successInk", adverse: "danger", neutral: "gold" } as const;

/**
 * A term as one line from the oath to its end, every mark at its day. A
 * picture of where the term was crowded and where it was quiet; the list
 * beside it names each mark.
 */
export function TermLine({ marks, span, from, to }: { readonly marks: readonly TermMark[]; readonly span: number; readonly from: string; readonly to: string }) {
  const at = (mark: TermMark): `${number}%` => `${Math.min(100, Math.max(0, (mark.at / Math.max(1, span)) * 100))}%`;
  return (
    <Column gap="xs" role="img" aria-label={`${marks.length} moments marked from ${from} to ${to}. The list names each one.`}>
      <View height={28} position="relative" justifyContent="center">
        <View height={2} backgroundColor="borderColorStrong" />
        {marks.map((mark) => (
          <View key={mark.key} position="absolute" left={at(mark)} marginLeft={-6} width={12} height={12} borderRadius="pill" backgroundColor={INK[mark.tone]} borderWidth={2} borderColor="surface" />
        ))}
      </View>
      <Row between>
        <Text variant="caption" tone="secondary">
          {from}
        </Text>
        <Text variant="caption" tone="secondary">
          {to}
        </Text>
      </Row>
    </Column>
  );
}

export type ShiftView = { readonly label: string; readonly from: number; readonly to: number; readonly fromText: string; readonly toText: string; readonly change: string; readonly tone: "good" | "bad" | "neutral"; readonly zero?: number };

const SHIFT_INK = { good: "successInk", bad: "danger", neutral: "accent" } as const;

/** Where a reading stood at the start and at the end, on one track: the span between them is the change. */
export function ShiftRow({ shift }: { readonly shift: ShiftView }) {
  const low = Math.min(shift.from, shift.to);
  const high = Math.max(shift.from, shift.to);
  return (
    <Column gap="xs" role="group" aria-label={`${shift.label}: ${shift.fromText} to ${shift.toText}, ${shift.change}`}>
      <Row between gap="sm" wrap>
        <Text variant="label">{shift.label}</Text>
        <Text variant="label" tabular>
          {shift.fromText} → {shift.toText}
        </Text>
      </Row>
      <View height={12} borderRadius="pill" backgroundColor="borderColor" position="relative">
        <View position="absolute" top={0} bottom={0} left={`${low * 100}%`} width={`${Math.max(0.01, high - low) * 100}%`} backgroundColor={SHIFT_INK[shift.tone]} borderRadius="pill" opacity={0.8} />
        <View position="absolute" top={-3} height={18} width={2} left={`${shift.from * 100}%`} backgroundColor="colorSecondary" />
        <View position="absolute" top={-3} height={18} width={3} left={`${shift.to * 100}%`} backgroundColor="color" />
        {shift.zero !== undefined ? <View position="absolute" top={-5} height={22} width={1} left={`${shift.zero * 100}%`} backgroundColor="borderColorStrong" /> : null}
      </View>
      <Text variant="caption" tone={shift.tone === "good" ? "success" : shift.tone === "bad" ? "danger" : "secondary"}>
        {shift.change}
      </Text>
    </Column>
  );
}

/** Counts a history would print, each figure large over its words; a zero is drawn quieter. */
export function Tally({ items }: { readonly items: readonly { readonly label: string; readonly count: number }[] }) {
  return (
    <Row gap="md" wrap>
      {items.map((item) => (
        <Column key={item.label} gap="2xs" flexBasis={150} flexGrow={1} padding="md" borderRadius="card" borderWidth={1} borderColor="borderColor" opacity={item.count === 0 ? 0.7 : 1}>
          <Text variant="figure" tabular tone={item.count === 0 ? "tertiary" : "primary"}>
            {item.count}
          </Text>
          <Text variant="caption" tone="secondary">
            {item.label}
          </Text>
        </Column>
      ))}
    </Row>
  );
}
