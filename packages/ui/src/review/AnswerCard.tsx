import type { ReactNode } from "react";
import { View, useMedia } from "@tamagui/core";
import { ChoiceMark } from "../forms/ChoiceList";
import { Icon } from "../icons/Icon";
import { Badge } from "../primitives/Badge";
import { Pressable } from "../primitives/Button";
import { Column, Row } from "../primitives/Stack";
import { Text } from "../primitives/Text";
import { Pips, valenceFill, valenceText, type ReadingValence } from "../world/Readings";
import { alignedMoves } from "./outcome-moves";
import { spent, type OutcomeScales } from "./outcome-readings";
import { Verdict } from "./Results";
import type { CompareOption, EffectTone, EffectView, OutcomeView } from "./types";

// One answer to a decision as a card, picture first: the answer's mark and
// name, its own words, then one band of drawn readings in the same three
// places on every card (the chance it works, the money, and every reading any
// answer moves), so a difference is read straight down the list. The whole
// card is the pick.

const VALENCE: Readonly<Record<EffectTone, ReadingValence>> = { favorable: "good", caution: "watch", adverse: "bad", neutral: "neutral" };

/** The fixed widths of the first two readings on a wide card, so they line up card to card. */
const ODDS_WIDTH = 150;
const MONEY_WIDTH = 190;

function Eyebrow({ children }: { readonly children: string }) {
  return (
    <Text variant="eyebrow" tone="secondary" numberOfLines={1}>
      {children}
    </Text>
  );
}

function OddsReading({ outcome }: { readonly outcome: OutcomeView }) {
  const share = outcome.odds?.share ?? 1;
  const word = outcome.odds ? outcome.odds.word.charAt(0).toUpperCase() + outcome.odds.word.slice(1) : "Certain";
  const valence: ReadingValence = share >= 0.6 ? "good" : share >= 0.4 ? "watch" : "bad";
  const steps = Math.max(1, Math.min(5, Math.round(share * 5)));
  return (
    <Column gap="xs" role="img" aria-label={`Chance it works: ${word}, ${steps} of 5 steps`}>
      <Eyebrow>Chance it works</Eyebrow>
      <Text variant="label" weight="strong" tone={valenceText(valence)}>
        {word}
      </Text>
      <Pips lit={steps} steps={5} valence={valence} size={8} />
    </Column>
  );
}

function MoneyReading({ outcome, scale }: { readonly outcome: OutcomeView; readonly scale: number }) {
  const money = spent(outcome);
  const free = money.now === 0;
  const valence: ReadingValence = free ? "neutral" : money.incoming ? "good" : "watch";
  const share = `${Math.max(free ? 0 : 0.04, Math.min(1, scale > 0 ? money.now / scale : 0)) * 100}%` as const;
  // The label already says which way the money goes, so the figure drops the producer's trailing "in".
  const words = free ? "No money" : money.incoming ? outcome.cost.text.replace(/\s+in$/i, "") : outcome.cost.text;
  return (
    <Column gap="xs" role="img" aria-label={`${money.incoming ? "Brings in" : "Costs"}: ${words}`}>
      <Eyebrow>{money.incoming ? "Brings in" : "Costs"}</Eyebrow>
      <Text variant="label" weight="strong" tone={valenceText(valence)} tabular numberOfLines={1}>
        {words}
      </Text>
      <View height={8} borderRadius="pill" backgroundColor="borderColor" overflow="hidden">
        <View height={8} width={share} backgroundColor={valenceFill(valence)} />
      </View>
    </Column>
  );
}

/** One reading moved, on the scale every answer shares: the line in the middle is today, a rise draws right and a fall left. */
function MoveLine({ effect, share, largest, compact }: { readonly effect: EffectView; readonly share: number; readonly largest: boolean; readonly compact: boolean }) {
  const valence = VALENCE[effect.tone];
  const still = effect.value === 0;
  const half: `${number}%` = `${Math.max(0.04, Math.min(1, share)) * 50}%`;
  const word = still ? "No change" : `${effect.value > 0 ? "▲" : "▼"} ${effect.text}`;
  return (
    <View flexDirection={compact ? "column" : "row"} alignItems={compact ? "stretch" : "center"} gap={compact ? 4 : "sm"} role="img" aria-label={`${effect.label}: ${still ? "no change" : effect.text}${largest ? ", the largest move" : ""}`}>
      <Row gap="xs" width={compact ? undefined : 132} minWidth={0}>
        <Text variant="caption" weight={largest ? "strong" : undefined} tone={largest ? "primary" : "secondary"} numberOfLines={1} flexShrink={1}>
          {effect.label}
        </Text>
        {largest ? <Badge status="outline">Largest</Badge> : null}
      </Row>
      <Row gap="sm" {...(compact ? {} : { flex: 1 })} minWidth={0}>
        <View flex={1} height={8} borderRadius="pill" backgroundColor="borderColor" position="relative" aria-hidden>
          {still ? null : <View position="absolute" top={0} bottom={0} width={half} {...(effect.value > 0 ? { left: "50%" } : { right: "50%" })} backgroundColor={valenceFill(valence)} />}
          <View position="absolute" top={-3} bottom={-3} left="50%" width={2} marginLeft={-1} backgroundColor="color" />
        </View>
        <Text variant="caption" weight="strong" tone={still ? "tertiary" : valenceText(valence)} width={compact ? 130 : 128} numberOfLines={1}>
          {word}
        </Text>
      </Row>
    </View>
  );
}

function Moves({ outcome, scales, compact }: { readonly outcome: OutcomeView; readonly scales: OutcomeScales; readonly compact: boolean }) {
  const moves = alignedMoves(outcome, scales.readings, scales.reach);
  if (moves.length === 0) return null;
  return (
    // Stacked under the other readings on a phone, a flexed column would collapse to no height.
    <Column gap="sm" {...(compact ? {} : { flex: 1 })} minWidth={0}>
      <Eyebrow>What it moves from today</Eyebrow>
      {moves.map(({ effect, largest }) => (
        <MoveLine key={effect.metric} effect={effect} largest={largest} compact={compact} share={(scales.reach.get(effect.unit) ?? 0) > 0 ? Math.abs(effect.value) / scales.reach.get(effect.unit)! : 0} />
      ))}
    </Column>
  );
}

/** The band of drawn readings: odds and money side by side, the moves beside them on a wide card and under them on a narrow one. */
function ReadingBand({ outcome, scales }: { readonly outcome: OutcomeView; readonly scales: OutcomeScales }) {
  const media = useMedia();
  const narrow = Boolean(media.phone);
  const firstTwo = (
    <Row gap="lg" {...(narrow ? {} : { flexShrink: 0 })}>
      <View width={narrow ? undefined : ODDS_WIDTH} flex={narrow ? 1 : undefined}>
        <OddsReading outcome={outcome} />
      </View>
      <View width={narrow ? undefined : MONEY_WIDTH} flex={narrow ? 1 : undefined}>
        <MoneyReading outcome={outcome} scale={scales.money} />
      </View>
    </Row>
  );
  return (
    <View flexDirection={narrow ? "column" : "row"} gap="lg" padding="md" borderRadius="control" backgroundColor="background" borderWidth={1} borderColor="borderColor">
      {firstTwo}
      {narrow ? null : <View width={1} alignSelf="stretch" backgroundColor="borderColor" />}
      <Moves outcome={outcome} scales={scales} compact={narrow} />
    </View>
  );
}

function verdictOf(outcome: OutcomeView | undefined): { readonly good: number; readonly bad: number } {
  const effects = outcome?.effects ?? [];
  return { good: effects.filter((effect) => effect.value !== 0 && effect.tone === "favorable").length, bad: effects.filter((effect) => effect.value !== 0 && effect.tone === "adverse").length };
}

export type AnswerCardProps = {
  readonly option: CompareOption;
  readonly scales: OutcomeScales;
  readonly selected: boolean;
  readonly onSelect: () => void;
  /** Said under the readings once the answer is picked, or always for an answer without an outcome. */
  readonly below?: ReactNode;
  /** A lock that is not shared by every answer, said on the card itself. */
  readonly lock?: string;
};

export function AnswerCard({ option, scales, selected, onSelect, below, lock }: AnswerCardProps) {
  const locked = option.unavailable !== undefined;
  const verdict = verdictOf(option.outcome);
  return (
    <Pressable
      role="button"
      aria-pressed={selected}
      aria-label={`Pick ${option.label}${locked ? ". Locked; you can still read it" : ""}`}
      onPress={onSelect}
      padding={selected ? 15 : "md"}
      borderRadius="card"
      borderWidth={selected ? 2 : 1}
      borderStyle={locked ? "dashed" : "solid"}
      borderColor={selected ? "accent" : { default: "borderColor", hover: "borderColorHover" }}
      backgroundColor={selected ? "infoFill" : { default: "surface", hover: "surfaceHover" }}
    >
      <Column gap="md">
        <Row gap="md" top>
          <View width={44} height={44} borderRadius="pill" backgroundColor={locked ? "backgroundStrong" : "goldFill"} alignItems="center" justifyContent="center" flexShrink={0}>
            <Icon name={locked ? "locked" : (option.icon ?? "decision")} size={22} tone={locked ? "colorTertiary" : "goldInk"} weight="fill" />
          </View>
          <Column flex={1} gap="xs" minWidth={0}>
            <Row gap="sm" wrap>
              <Text variant="title" tone={locked ? "secondary" : "primary"}>
                {option.label}
              </Text>
              {option.recommended ? <Badge status="gold">Recommended</Badge> : null}
            </Row>
            {typeof option.lead === "string" ? (
              <Text variant="body" tone="secondary" serif numberOfLines={selected ? undefined : 2}>
                {`“${option.lead}”`}
              </Text>
            ) : (option.lead ?? null)}
            {lock ? (
              <Text variant="caption" tone="warning">
                {lock}
              </Text>
            ) : null}
          </Column>
          <ChoiceMark selected={selected} shape="radio" />
        </Row>
        {option.outcome ? <ReadingBand outcome={option.outcome} scales={scales} /> : null}
        {verdict.good + verdict.bad > 0 ? <Verdict good={verdict.good} bad={verdict.bad} /> : null}
        {below ?? null}
      </Column>
    </Pressable>
  );
}
