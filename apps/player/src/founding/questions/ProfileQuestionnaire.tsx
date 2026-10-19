import { useState } from "react";
import { resolveAdministrationParty, scoreLeadershipAnswers } from "@admin/engine";
import { GOVERNING_STYLE_WORDS, LEADERSHIP_QUESTIONS, QUESTION_AREA_GLYPH, type LeadershipQuestion } from "@admin/player-core";
import { IDEOLOGY_AXES, IDEOLOGY_AXIS_POLES, type IdeologyAxis } from "@admin/world";
import { Button, Column, Icon, Pressable, Row, Surface, Text, View, isIconName, type IconName } from "@admin/ui";
import { needsLeadershipReview, withLeader, type FoundingDraft } from "../draft";
import { STYLE_GLYPH } from "../glyphs";
import { PartyChoice } from "../stages/PoliticsStage";
import { ChoiceAnswer, RankAnswer, ScaleAnswer, SplitAnswer } from "./Answers";

type Props = { readonly draft: FoundingDraft; readonly update: (change: (draft: FoundingDraft) => FoundingDraft) => void };

const COUNT = LEADERSHIP_QUESTIONS.length;

function areaGlyph(question: LeadershipQuestion): IconName {
  const glyph = QUESTION_AREA_GLYPH[question.area];
  return isIconName(glyph) ? glyph : "review";
}

/** Twenty marks, one per question, filled when answered; a press goes to that question. */
function Progress({ answers, index, onGo }: { readonly answers: readonly (number | null)[]; readonly index: number; readonly onGo: (at: number) => void }) {
  const answered = answers.filter((value) => value !== null).length;
  return (
    <Row gap="2xs" role="list" aria-label={`Questions, ${answered} of ${COUNT} answered`}>
      {LEADERSHIP_QUESTIONS.map((question, at) => {
        const done = answers[at] !== null && answers[at] !== undefined;
        return (
          <Pressable key={question.id} role="button" flex={1} height={32} justifyContent="center" backgroundColor="transparent" borderRadius="chip" aria-current={at === index ? "step" : undefined} aria-label={`Question ${at + 1}, ${question.area}${done ? ", answered" : ""}`} onPress={() => onGo(at)}>
            <View height={at === index ? 10 : 6} borderRadius="pill" backgroundColor={at === index ? "gold" : done ? "accentFill" : "borderColorStrong"} />
          </Pressable>
        );
      })}
    </Row>
  );
}

/** Where one belief sits between its two poles, drawn from the center outward. A reading, not a control. */
export function AxisReading({ axis, value }: { readonly axis: IdeologyAxis; readonly value: number }) {
  const poles = IDEOLOGY_AXIS_POLES[axis];
  const from = Math.min(50, 50 + value * 50);
  return (
    <Column gap="2xs" role="img" aria-label={`${poles.caption}: ${value === 0 ? "center" : `${Math.round(Math.abs(value) * 100)}% toward ${value < 0 ? poles.negative : poles.positive}`}`}>
      <Text variant="label">{poles.caption}</Text>
      <Row gap="sm">
        <Text variant="caption" tone="secondary" width={88}>
          {poles.negative}
        </Text>
        <View flex={1} height={12} borderRadius="chip" backgroundColor="backgroundStrong" borderWidth={1} borderColor="borderColor" position="relative" aria-hidden>
          <View position="absolute" top={-4} bottom={-4} left="50%" width={2} backgroundColor="borderColorStrong" />
          <View position="absolute" top={0} bottom={0} left={`${from}%`} width={`${Math.abs(value) * 50}%`} backgroundColor="accentFill" />
          <View position="absolute" top={-5} bottom={-5} left={`${50 + value * 50}%`} x={-1} width={3} backgroundColor="color" />
        </View>
        <Text variant="caption" tone="secondary" width={88} textAlign="right">
          {poles.positive}
        </Text>
      </Row>
    </Column>
  );
}

/** An answer in words: the option it lands on, and how firmly when it sits between two. */
function answerLine(question: LeadershipQuestion, value: number): string {
  if (Number.isInteger(value)) return question.options[value + 1]!;
  return `Leaning toward: ${question.options[value < 0 ? 0 : 2]}`;
}

function AnswerList({ values }: { readonly values: readonly number[] }) {
  const [open, setOpen] = useState(false);
  return (
    <Column gap="sm">
      <Button kind="quiet" icon={open ? "restorePanel" : "expandPanel"} onPress={() => setOpen(!open)}>
        {open ? "Hide your 20 answers" : "Show your 20 answers"}
      </Button>
      {open
        ? LEADERSHIP_QUESTIONS.map((entry, at) => (
            <Column key={entry.id} gap="2xs">
              <Text variant="label">{`${at + 1}. ${entry.prompt}`}</Text>
              <Text variant="caption" tone="secondary">
                {answerLine(entry, values[at] ?? 0)}
              </Text>
            </Column>
          ))
        : null}
    </Column>
  );
}

/** The profile the answers produced: read, not edited. Only the party, which no answer decides, is chosen here. */
function DerivedProfile({ draft, update, onRevisit }: Props & { readonly onRevisit: () => void }) {
  const answers = draft.leader.leadershipAnswers!;
  const profile = scoreLeadershipAnswers(answers);
  const words = GOVERNING_STYLE_WORDS[profile.style];
  return (
    <Column gap="xl">
      <Text variant="heading" role="heading" aria-level={3}>
        What your answers add up to
      </Text>
      <Column gap="md" role="group" aria-label="Your beliefs">
        {IDEOLOGY_AXES.map((axis) => (
          <AxisReading key={axis} axis={axis} value={profile.ideology[axis]} />
        ))}
      </Column>
      <Surface level="raised" pad="lg" accentEdge="gold">
        <Row gap="md" top>
          <Icon name={STYLE_GLYPH[profile.style]} size={40} tone="gold" weight="fill" />
          <Column flex={1} gap="2xs">
            <Text variant="eyebrow" tone="secondary">
              Governing style
            </Text>
            <Text variant="title">{words.label}</Text>
            <Text variant="caption" tone="secondary">
              {words.detail}
            </Text>
          </Column>
        </Row>
      </Surface>
      <Row gap="xs">
        <Icon name="locked" size={18} tone="colorSecondary" />
        <Text variant="caption" tone="secondary" flex={1}>
          Your answers set these. If you'd like something different, go back and change your answers.
        </Text>
      </Row>
      <PartyChoice draft={draft} update={update} suggested={resolveAdministrationParty(profile.ideology)} help="Your answers don't pick your party. You choose it yourself." />
      <AnswerList values={answers.values} />
      <Button kind="secondary" icon="return" onPress={onRevisit}>
        Change your answers
      </Button>
    </Column>
  );
}

function Answer({ question, at, draft, update }: { readonly question: LeadershipQuestion; readonly at: number } & Props) {
  const value = draft.questionnaire?.[at] ?? undefined;
  const set = (score: number | undefined, order?: readonly number[]) =>
    update((current) => ({
      ...current,
      questionnaire: Array.from({ length: COUNT }, (_, index) => (index === at ? (score ?? null) : (current.questionnaire?.[index] ?? null))),
      ...(order ? { questionnaireRanks: { ...current.questionnaireRanks, [question.id]: order } } : {}),
    }));
  const props = { question, value: value === null ? undefined : value, onAnswer: (score: number) => set(score) };
  switch (question.format) {
    case "choice":
      return <ChoiceAnswer {...props} />;
    case "scale":
      return <ScaleAnswer {...props} />;
    case "split":
      return <SplitAnswer {...props} />;
    case "rank":
      return <RankAnswer question={question} order={draft.questionnaireRanks?.[question.id] ?? []} onRank={(order, score) => set(score, order)} />;
  }
}

function QuestionHead({ question, index }: { readonly question: LeadershipQuestion; readonly index: number }) {
  return (
    <Row gap="md" top>
      <View width={52} height={52} borderRadius="pill" backgroundColor="goldFill" alignItems="center" justifyContent="center">
        <Icon name={areaGlyph(question)} size={28} tone="goldInk" weight="fill" />
      </View>
      <Column flex={1} gap="2xs">
        <Text variant="label" tone="secondary" tabular>
          {question.area} · Question {index + 1} of {COUNT}
        </Text>
        <Text variant="title" role="heading" aria-level={3}>
          {question.prompt}
        </Text>
      </Column>
    </Row>
  );
}

/** Twenty questions, one at a time; the beliefs and the governing style are read from them and never set by hand. */
export function ProfileQuestionnaire({ draft, update }: Props) {
  const [index, setIndex] = useState(0);
  const [reviewing, setReviewing] = useState(!needsLeadershipReview(draft));
  const answers = Array.from({ length: COUNT }, (_, at) => draft.questionnaire?.[at] ?? null);
  const answered = answers.filter((value) => value !== null).length;
  const question = LEADERSHIP_QUESTIONS[index]!;
  const apply = () => {
    if (answered !== COUNT) return;
    const leadershipAnswers = { version: 2 as const, values: answers.map((value) => value!) };
    const profile = scoreLeadershipAnswers(leadershipAnswers);
    update((current) => withLeader(current, { ideology: profile.ideology, governingStyle: profile.style, leadershipAnswers }));
    setReviewing(true);
  };
  const revisit = () => {
    setIndex(0);
    setReviewing(false);
  };
  if (reviewing && draft.leader.leadershipAnswers) return <DerivedProfile draft={draft} update={update} onRevisit={revisit} />;
  return (
    <Surface level="base" pad="lg" role="region" aria-label="Leadership questionnaire">
      <Column gap="lg">
        <Progress answers={answers} index={index} onGo={setIndex} />
        <QuestionHead question={question} index={index} />
        <Answer key={question.id} question={question} at={index} draft={draft} update={update} />
        <Row gap="sm" wrap between>
          <Button kind="quiet" icon="return" disabled={index === 0} onPress={() => setIndex(index - 1)}>
            Previous question
          </Button>
          {index < COUNT - 1 ? (
            <Button kind="primary" iconAfter="chevron" disabled={answers[index] === null} onPress={() => setIndex(index + 1)}>
              Next question
            </Button>
          ) : (
            <Button kind="primary" disabled={answered !== COUNT} onPress={apply}>
              See what your answers add up to
            </Button>
          )}
        </Row>
        {draft.leader.leadershipAnswers && !needsLeadershipReview(draft) ? (
          <Button kind="quiet" onPress={() => setReviewing(true)}>
            Back to what your answers add up to
          </Button>
        ) : null}
        <Text variant="caption" tone="secondary">
          There are no right or wrong answers. Your beliefs and the way you lead are worked out from what you pick here, so there's no other place to set them.
        </Text>
      </Column>
    </Surface>
  );
}
