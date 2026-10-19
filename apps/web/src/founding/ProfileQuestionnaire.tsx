import { useEffect, useRef, useState } from "react";
import { resolveAdministrationParty, scoreLeadershipAnswers, type AdministrationParty } from "@admin/engine";
import { GOVERNING_STYLE_WORDS, LEADERSHIP_QUESTIONS, QUESTION_AREA_GLYPH, ticketConsequence, ticketLabel, type LeadershipQuestion } from "@admin/player-core";
import { IDEOLOGY_AXES, IDEOLOGY_AXIS_POLES, type IdeologyAxis } from "@admin/world";
import { Button, Choice, EvidencePanel, Icon, IconBadge, type IconName } from "@admin/ui-web";
import { needsLeadershipReview, withLeader, type FoundingDraft } from "./draft";
import { PartyMark, STYLE_GLYPH } from "./glyphs";
import { ChoiceAnswer, RankAnswer, ScaleAnswer, SplitAnswer } from "./questions/Answers";
import "./questions/questions.css";

type Props = { readonly draft: FoundingDraft; readonly update: (change: (draft: FoundingDraft) => FoundingDraft) => void };

const COUNT = LEADERSHIP_QUESTIONS.length;
const PARTIES: readonly AdministrationParty[] = ["democrat", "republican", "independent"];

function areaGlyph(question: LeadershipQuestion): IconName {
  return (QUESTION_AREA_GLYPH[question.area] ?? "review") as IconName;
}

/** Twenty marks, one per question, filled when answered; a press goes to that question. */
function Progress({ answers, index, onGo }: { readonly answers: readonly (number | null)[]; readonly index: number; readonly onGo: (at: number) => void }) {
  const answered = answers.filter((value) => value !== null).length;
  return (
    <nav className="question-progress" aria-label={`Questions, ${answered} of ${COUNT} answered`}>
      <ol>
        {LEADERSHIP_QUESTIONS.map((question, at) => (
          <li key={question.id}>
            <button
              type="button"
              className="question-progress__mark"
              data-answered={answers[at] !== null && answers[at] !== undefined ? "true" : undefined}
              aria-current={at === index ? "step" : undefined}
              aria-label={`Question ${at + 1}, ${question.area}${answers[at] !== null && answers[at] !== undefined ? ", answered" : ""}`}
              onClick={() => onGo(at)}
            />
          </li>
        ))}
      </ol>
    </nav>
  );
}

/** Where one belief sits between its two poles, drawn from the center outward. A reading, not a control. */
export function AxisReading({ axis, value }: { readonly axis: IdeologyAxis; readonly value: number }) {
  const poles = IDEOLOGY_AXIS_POLES[axis];
  const from = Math.min(50, 50 + value * 50);
  const width = Math.abs(value) * 50;
  return (
    <div className="axis-reading" role="img" aria-label={`${poles.caption}: ${value === 0 ? "center" : `${Math.round(Math.abs(value) * 100)}% toward ${value < 0 ? poles.negative : poles.positive}`}`}>
      <span className="axis-reading__caption">{poles.caption}</span>
      <span className="axis-reading__pole">{poles.negative}</span>
      <span className="axis-reading__track">
        <span className="axis-reading__fill" style={{ insetInlineStart: `${from}%`, inlineSize: `${width}%` }} />
        <span className="axis-reading__mark" style={{ insetInlineStart: `${50 + value * 50}%` }} />
      </span>
      <span className="axis-reading__pole">{poles.positive}</span>
    </div>
  );
}

/** The profile the answers produced: read, not edited. Only the party, which no answer decides, is chosen here. */
function DerivedProfile({ draft, update, onRevisit }: Props & { readonly onRevisit: () => void }) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => heading.current?.focus(), []);
  const answers = draft.leader.leadershipAnswers!;
  const profile = scoreLeadershipAnswers(answers);
  const words = GOVERNING_STYLE_WORDS[profile.style];
  const suggested = resolveAdministrationParty(profile.ideology);
  return (
    <div className="setup-profile derived-profile">
      <h3 ref={heading} tabIndex={-1}>
        <Icon name="dossier" size={20} /> What your answers add up to
      </h3>
      <section className="derived-profile__beliefs" aria-label="Your beliefs">
        {IDEOLOGY_AXES.map((axis) => (
          <AxisReading key={axis} axis={axis} value={profile.ideology[axis]} />
        ))}
      </section>
      <section className="derived-profile__style" aria-label="Your governing style">
        <IconBadge name={STYLE_GLYPH[profile.style]} size={48} tone="gold" />
        <div>
          <p className="derived-profile__kicker">Governing style</p>
          <p className="derived-profile__style-name">{words.label}</p>
          <p className="stage-note">{words.detail}</p>
        </div>
      </section>
      <p className="derived-profile__locked">
        <Icon name="locked" size={18} /> These come from your answers. To change them, change the answers.
      </p>
      <Choice
        legend="Party"
        hint="No answer decides your party. It is yours to choose."
        layout="cards"
        className="party-cards"
        value={draft.leader.party}
        options={PARTIES.map((party) => {
          const label = ticketLabel(party, undefined);
          return { value: party, label, visual: <PartyMark party={party} />, detail: `${ticketConsequence(label)}${suggested === party ? " Where your economics point." : ""}` };
        })}
        onChange={(party) => update((current) => withLeader(current, { party }))}
      />
      <EvidencePanel title="The 20 answers behind this profile">
        <ol className="profile-answer-list">
          {LEADERSHIP_QUESTIONS.map((entry, at) => (
            <li key={entry.id}>
              <strong>{entry.prompt}</strong>
              <p>{answerLine(entry, answers.values[at] ?? 0)}</p>
            </li>
          ))}
        </ol>
      </EvidencePanel>
      <Button kind="ghost" onClick={onRevisit}>
        Change your answers
      </Button>
    </div>
  );
}

/** An answer in words: the option it lands on, and how firmly when it sits between two. */
function answerLine(question: LeadershipQuestion, value: number): string {
  if (Number.isInteger(value)) return question.options[value + 1]!;
  return `Leaning toward: ${question.options[value < 0 ? 0 : 2]}`;
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

export function ProfileQuestionnaire({ draft, update }: Props) {
  const [index, setIndex] = useState(0);
  const [reviewing, setReviewing] = useState(!needsLeadershipReview(draft));
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (!reviewing) heading.current?.focus();
  }, [index, reviewing]);
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
  if (reviewing && draft.leader.leadershipAnswers) {
    return (
      <DerivedProfile
        draft={draft}
        update={update}
        onRevisit={() => {
          setIndex(0);
          setReviewing(false);
        }}
      />
    );
  }
  const current = answers[index] !== null;
  return (
    <section className="setup-profile questionnaire" aria-label="Leadership questionnaire">
      <Progress answers={answers} index={index} onGo={setIndex} />
      <div className="question-head">
        <IconBadge name={areaGlyph(question)} size={48} tone="gold" />
        <div>
          <p className="question-head__area">
            {question.area} · Question {index + 1} of {COUNT}
          </p>
          <h3 ref={heading} tabIndex={-1} className="question-head__prompt">
            {question.prompt}
          </h3>
        </div>
      </div>
      <Answer key={question.id} question={question} at={index} draft={draft} update={update} />
      <div className="setup-question-actions">
        <Button kind="ghost" disabled={index === 0} onClick={() => setIndex(index - 1)}>
          Previous question
        </Button>
        {index < COUNT - 1 ? (
          <Button kind="primary" disabled={!current} onClick={() => setIndex(index + 1)}>
            Next question
          </Button>
        ) : (
          <Button kind="primary" disabled={answered !== COUNT} onClick={apply}>
            See what your answers add up to
          </Button>
        )}
      </div>
      {draft.leader.leadershipAnswers && !needsLeadershipReview(draft) ? (
        <Button kind="ghost" onClick={() => setReviewing(true)}>
          Back to what your answers add up to
        </Button>
      ) : null}
      <p className="stage-note">There is no right answer. Your beliefs and governing style are read from these answers and cannot be set by hand.</p>
    </section>
  );
}
