import { useId } from "react";
import { SCALE_STOPS, SPLIT_SHARES, rankScore, scaleScore, scaleStop, splitScore, splitShares, type LeadershipQuestion } from "@admin/player-core";
import { Button, Column, Pressable, Row, Text, View, useMedia } from "@admin/ui";
import { ChoiceList, Legend, Slider, useRoving } from "@admin/ui/forms";

// The four ways a leadership question is answered. Each hands back one score
// from -1 to +1 and reads its own state back from that score, except a
// ranking, whose order is kept beside the score because two orders can share
// one score.

export type AnswerProps = {
  readonly question: LeadershipQuestion;
  readonly value: number | undefined;
  readonly onAnswer: (score: number) => void;
};

/** One of the three, as cards. */
export function ChoiceAnswer({ question, value, onAnswer }: AnswerProps) {
  return (
    <ChoiceList
      label="Pick the one you'd choose"
      minCardWidth={240}
      value={value === undefined ? undefined : String(value)}
      options={question.options.map((label, at) => ({ value: String(at - 1), label }))}
      onChange={(next) => onAnswer(Number(next))}
    />
  );
}

const STOP_WORDS = ["All the way", "Strongly", "Somewhat", "Halfway between", "Somewhat", "Strongly", "All the way"] as const;
const MIDDLE = (SCALE_STOPS - 1) / 2;
const STOPS = Array.from({ length: SCALE_STOPS }, (_, stop) => stop);

function stopName(question: LeadershipQuestion, stop: number): string {
  if (stop === MIDDLE) return `${STOP_WORDS[stop]}: ${question.options[1]}`;
  return `${STOP_WORDS[stop]} toward: ${question.options[stop < MIDDLE ? 0 : 2]}`;
}

/** A place on a line between the first answer and the third, with the second at its middle. */
export function ScaleAnswer({ question, value, onAnswer }: AnswerProps) {
  const legend = useId();
  const media = useMedia();
  const chosen = value === undefined ? undefined : scaleStop(value);
  const roving = useRoving(STOPS, chosen, (stop) => onAnswer(scaleScore(stop)));
  return (
    <Column gap="sm">
      <Legend id={legend} label="Place yourself on the line" />
      <Row between gap="md" top>
        <Text variant="caption" flex={1}>
          {question.options[0]}
        </Text>
        {media.phone ? null : (
          <Text variant="caption" tone="secondary" flex={1} center>
            {question.options[1]}
          </Text>
        )}
        <Text variant="caption" flex={1} textAlign="right">
          {question.options[2]}
        </Text>
      </Row>
      <Row between role="radiogroup" aria-labelledby={legend} position="relative">
        <View position="absolute" left={22} right={22} top="50%" height={2} backgroundColor="borderColorStrong" aria-hidden />
        {STOPS.map((stop) => {
          const selected = chosen === stop;
          return (
            <Pressable key={stop} role="radio" ref={roving.refFor(stop)} aria-checked={selected} aria-label={stopName(question, stop)} tabIndex={roving.tabIndexFor(stop)} onKeyDown={roving.keyDownFor(stop)} onPress={() => onAnswer(scaleScore(stop))} width={44} height={44} borderRadius="pill" alignItems="center" justifyContent="center" backgroundColor="transparent">
              <View width={selected ? 28 : 20} height={selected ? 28 : 20} borderRadius="pill" borderWidth={2} borderStyle={stop === MIDDLE ? "dashed" : "solid"} borderColor={selected ? "accent" : "borderColorStrong"} backgroundColor={selected ? "accentFill" : "surface"} />
            </Pressable>
          );
        })}
      </Row>
    </Column>
  );
}

/** Ten shares of effort divided between the first answer and the third, drawn as the ten blocks they are. */
export function SplitAnswer({ question, value, onAnswer }: AnswerProps) {
  const first = value === undefined ? SPLIT_SHARES / 2 : splitShares(value);
  const second = SPLIT_SHARES - first;
  return (
    <Column gap="sm" opacity={1}>
      <Text variant="label">Split your effort between the two</Text>
      <Row between gap="md" top>
        <Column flex={1} gap="2xs">
          <Text variant="figure" tone="accent">
            {first}
          </Text>
          <Text variant="caption">{question.options[0]}</Text>
        </Column>
        <Column flex={1} gap="2xs" alignItems="flex-end">
          <Text variant="figure" tone="gold">
            {second}
          </Text>
          <Text variant="caption" textAlign="right">
            {question.options[2]}
          </Text>
        </Column>
      </Row>
      <Row gap="2xs" aria-hidden opacity={value === undefined ? 0.4 : 1}>
        {Array.from({ length: SPLIT_SHARES }, (_, at) => (
          <View key={at} flex={1} height={18} borderRadius="chip" backgroundColor={at < first ? "accentFill" : "goldRule"} />
        ))}
      </Row>
      <Slider label="How you split your effort" min={0} max={SPLIT_SHARES} value={second} valueText={`${first} to the first, ${second} to the second`} onChange={(next) => onAnswer(splitScore(SPLIT_SHARES - next))} />
      {value === undefined ? (
        <Button size="compact" kind="quiet" onPress={() => onAnswer(splitScore(first))}>
          Keep an even split
        </Button>
      ) : null}
      <Text variant="caption" tone="secondary">
        An even split means the middle choice. {question.options[1]}
      </Text>
    </Column>
  );
}

const PLACE = ["first", "second", "last"] as const;

/** The three put in order by pressing them most wanted first; the last is placed for you. */
export function RankAnswer({ question, order, onRank }: { readonly question: LeadershipQuestion; readonly order: readonly number[]; readonly onRank: (order: readonly number[], score: number | undefined) => void }) {
  const press = (option: number) => {
    if (order.includes(option)) return;
    const next = [...order, option];
    const complete = next.length === 2 ? [...next, [0, 1, 2].find((at) => !next.includes(at))!] : next;
    onRank(complete, complete.length === 3 ? rankScore(complete) : undefined);
  };
  return (
    <Column gap="sm">
      <Text variant="label">Put them in order. Press the one you want most, then your next choice. The last one fills in for you.</Text>
      <Column gap="xs" role="list">
        {question.options.map((label, option) => {
          const place = order.indexOf(option);
          return (
            <Pressable key={label} role="button" aria-pressed={place !== -1} aria-label={`${label}${place === -1 ? "" : `, ranked ${PLACE[place]}`}`} onPress={() => press(option)} flexDirection="row" alignItems="center" gap="md" padding="sm" minHeight="hit" borderWidth={1} borderColor={place === -1 ? "borderColorStrong" : "accent"} backgroundColor={{ default: place === -1 ? "surface" : "infoFill", hover: "surfaceHover" }}>
              <View width={32} height={32} borderRadius="pill" borderWidth={place === -1 ? 2 : 0} borderStyle="dashed" borderColor="borderColorStrong" backgroundColor={place === 0 ? "goldFill" : place === -1 ? "transparent" : "accentFill"} alignItems="center" justifyContent="center" aria-hidden>
                <Text variant="label" tone={place === 0 ? "goldInk" : "inverse"} tabular>
                  {place === -1 ? "" : place + 1}
                </Text>
              </View>
              <Text variant="body" flex={1}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </Column>
      {order.length > 0 ? (
        <Button size="compact" kind="quiet" onPress={() => onRank([], undefined)}>
          Start over
        </Button>
      ) : null}
    </Column>
  );
}
