import { View } from "@tamagui/core";
import { Column, Row } from "../primitives/Stack";
import { Text } from "../primitives/Text";

export type VoteCountProps = {
  /** "House", "Senate, to override". */
  readonly name: string;
  readonly seats: number;
  /** The line the question needs: a majority, three-fifths, two-thirds. */
  readonly required: number;
  /** What the line is, in words: "two-thirds to override". */
  readonly requiredLabel?: string;
  /** A vote the Journal recorded: the only count drawn as a fact. */
  readonly recorded?: { readonly yeas: number; readonly nays: number; readonly passed: boolean };
  /** Support nobody has committed to: drawn as a hatched range, never a forecast. */
  readonly range?: { readonly lower: number; readonly upper: number };
};

const share = (votes: number, seats: number) => `${(Math.max(0, Math.min(votes, seats)) / Math.max(1, seats)) * 100}%` as const;

/**
 * A count against its benchmark: the seats as a track, the line the question
 * needs as a tick, and either the recorded yeas and nays (solid) or the
 * unresolved range (open), so a projection never reads as a result.
 */
export function VoteCount({ name, seats, required, requiredLabel, recorded, range }: VoteCountProps) {
  const words = recorded
    ? `${recorded.yeas} yes, ${recorded.nays} no, ${required} needed, ${recorded.passed ? "passed" : "failed"}`
    : range
      ? `${range.lower} to ${range.upper} votes still undecided, ${required} of ${seats} needed`
      : `${required} of ${seats} needed, support not known yet`;
  return (
    <Column gap="2xs" role="img" aria-label={`${name}: ${words}${requiredLabel ? `, ${requiredLabel}` : ""}.`}>
      <Row between gap="sm">
        <Text variant="label">{name}</Text>
        <Text variant="caption" tone={recorded ? (recorded.passed ? "success" : "danger") : "secondary"} weight={recorded ? "strong" : "regular"}>
          {recorded ? `${recorded.yeas}–${recorded.nays} ${recorded.passed ? "passed" : "failed"}` : "Not voted yet"}
        </Text>
      </Row>
      <View position="relative" height={12} borderRadius="chip" backgroundColor="borderColor" marginTop={4}>
        {recorded ? <View position="absolute" left={0} top={0} bottom={0} width={share(recorded.yeas, seats)} backgroundColor={recorded.passed ? "successInk" : "accent"} borderRadius="chip" /> : null}
        {recorded ? <View position="absolute" right={0} top={0} bottom={0} width={share(recorded.nays, seats)} backgroundColor="colorTertiary" borderRadius="chip" /> : null}
        {range ? <View position="absolute" left={share(range.lower, seats)} width={share(range.upper - range.lower, seats)} top={0} bottom={0} borderWidth={1} borderStyle="dashed" borderColor="colorSecondary" backgroundColor="pendingFill" borderRadius="chip" /> : null}
        <View position="absolute" left={share(required, seats)} top={-5} bottom={-5} width={3} marginLeft={-1.5} backgroundColor="gold" />
      </View>
      <Text variant="caption" tone="secondary">
        {required} of {seats} needed{requiredLabel ? ` (${requiredLabel})` : ""}
        {range && !recorded ? ` · ${range.lower}–${range.upper} undecided` : ""}
      </Text>
    </Column>
  );
}
