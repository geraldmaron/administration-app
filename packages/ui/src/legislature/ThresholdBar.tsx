import { View } from "@tamagui/core";
import { Icon } from "../icons/Icon";
import { Column, Row } from "../primitives/Stack";
import { Text } from "../primitives/Text";
import { PARTY_INK, type Party } from "./types";

export type ThresholdLine = {
  readonly id: string;
  /** "Pass a bill", "End a filibuster", "Override a veto". */
  readonly label: string;
  readonly votes: number;
  readonly cleared: boolean;
  /** "Caucus clears it alone", "12 short alone". */
  readonly note: string;
};

export type ThresholdBarProps = {
  readonly label: string;
  readonly seats: number;
  readonly ours: { readonly party: Party; readonly seats: number; readonly name: string };
  readonly theirs: { readonly party: Party; readonly seats: number };
  readonly unrecorded?: number;
  readonly lines: readonly ThresholdLine[];
};

/**
 * One side's seats against every line a chamber counts by: its seats fill
 * from the left, the other side's from the right, and each line is a tick at
 * the vote it takes, so a reader sees at once which benchmarks the side clears
 * alone and by how much it falls short of the rest.
 */
export function ThresholdBar({ label, seats, ours, theirs, unrecorded = 0, lines }: ThresholdBarProps) {
  const at = (votes: number) => `${(Math.min(votes, seats) / Math.max(1, seats)) * 100}%` as const;
  return (
    <Column gap="sm">
      <View role="img" aria-label={`${label}: ${ours.name} ${ours.seats}, other side ${theirs.seats} of ${seats}. ${lines.map((line) => `${line.label} at ${line.votes}, ${line.note}`).join(". ")}.`}>
        <View position="relative" height={20} aria-hidden>
          {lines.map((line) => (
            <View key={line.id} position="absolute" top={0} left={at(line.votes)} marginLeft={-15} width={30} alignItems="center">
              <Text variant="caption" weight="strong" tabular tone={line.cleared ? "success" : "primary"}>
                {line.votes}
              </Text>
            </View>
          ))}
        </View>
        <View position="relative" height={16} borderRadius="chip" backgroundColor="borderColor" overflow="hidden">
          <View position="absolute" left={0} top={0} bottom={0} width={at(ours.seats)} backgroundColor={PARTY_INK[ours.party]} />
          <View position="absolute" right={0} top={0} bottom={0} width={at(theirs.seats)} backgroundColor={PARTY_INK[theirs.party]} />
          {lines.map((line) => (
            <View key={line.id} position="absolute" left={at(line.votes)} top={0} bottom={0} width={2} marginLeft={-1} backgroundColor={line.cleared ? "successInk" : "color"} />
          ))}
        </View>
      </View>
      <Row between wrap gap="sm">
        <Text variant="caption">
          <Text variant="caption" weight="strong" tabular>{ours.seats}</Text> {ours.name}
        </Text>
        {unrecorded > 0 ? <Text variant="caption" tone="tertiary">{unrecorded} unrecorded</Text> : null}
        <Text variant="caption">
          <Text variant="caption" weight="strong" tabular>{theirs.seats}</Text> other side
        </Text>
      </Row>
      <Column gap="2xs">
        {lines.map((line) => (
          <Row key={line.id} gap="sm">
            <Icon name={line.cleared ? "approve" : "pending"} size={14} tone={line.cleared ? "successInk" : "colorTertiary"} />
            <Text variant="caption" flex={1}>
              {line.label} <Text variant="caption" weight="strong" tabular>{line.votes}</Text>
            </Text>
            <Text variant="caption" tone={line.cleared ? "success" : "secondary"}>
              {line.note}
            </Text>
          </Row>
        ))}
      </Column>
    </Column>
  );
}
