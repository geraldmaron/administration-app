import { useId } from "react";
import { SCALE_STOPS, SPLIT_SHARES, rankScore, scaleScore, scaleStop, splitScore, splitShares, type LeadershipQuestion } from "@admin/player-core";
import { Button, Choice } from "@admin/ui-web";

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
    <Choice
      legend="Choose the trade-off you would accept"
      layout="cards"
      className="profile-answers"
      value={value === undefined ? undefined : String(value)}
      options={question.options.map((label, at) => ({ value: String(at - 1), label }))}
      onChange={(next) => onAnswer(Number(next))}
    />
  );
}

const STOP_WORDS = ["All the way", "Strongly", "Somewhat", "Halfway between", "Somewhat", "Strongly", "All the way"] as const;

function stopName(question: LeadershipQuestion, stop: number): string {
  const middle = (SCALE_STOPS - 1) / 2;
  if (stop === middle) return `${STOP_WORDS[stop]}: ${question.options[1]}`;
  return `${STOP_WORDS[stop]} toward: ${question.options[stop < middle ? 0 : 2]}`;
}

/** A place on a line between the first answer and the third, with the second at its middle. */
export function ScaleAnswer({ question, value, onAnswer }: AnswerProps) {
  const name = useId();
  const chosen = value === undefined ? undefined : scaleStop(value);
  return (
    <fieldset className="answer-scale">
      <legend className="ui-field__label">Place yourself on the line</legend>
      <div className="answer-scale__anchors">
        <p data-end="first">{question.options[0]}</p>
        <p data-end="middle">{question.options[1]}</p>
        <p data-end="last">{question.options[2]}</p>
      </div>
      <div className="answer-scale__track">
        {Array.from({ length: SCALE_STOPS }, (_, stop) => (
          <label key={stop} className="answer-scale__stop" data-checked={chosen === stop ? "true" : undefined} data-middle={stop === (SCALE_STOPS - 1) / 2 ? "true" : undefined}>
            <input type="radio" name={name} checked={chosen === stop} onChange={() => onAnswer(scaleScore(stop))} />
            <span className="ui-visually-hidden">{stopName(question, stop)}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/** Ten shares of effort divided between the first answer and the third, drawn as the ten blocks they are. */
export function SplitAnswer({ question, value, onAnswer }: AnswerProps) {
  const id = useId();
  const first = value === undefined ? SPLIT_SHARES / 2 : splitShares(value);
  const second = SPLIT_SHARES - first;
  return (
    <div className="answer-split" data-unanswered={value === undefined ? "true" : undefined}>
      <p className="ui-field__label" id={`${id}-legend`}>
        Divide ten shares of your effort between the two
      </p>
      <div className="answer-split__sides">
        <p className="answer-split__side" data-side="first">
          <strong>{first}</strong> {question.options[0]}
        </p>
        <p className="answer-split__side" data-side="last">
          <strong>{second}</strong> {question.options[2]}
        </p>
      </div>
      <div className="answer-split__bar" aria-hidden="true">
        {Array.from({ length: SPLIT_SHARES }, (_, at) => (
          <span key={at} data-side={at < first ? "first" : "last"} />
        ))}
      </div>
      <input
        className="ui-input ui-input--range"
        type="range"
        min={0}
        max={SPLIT_SHARES}
        value={second}
        aria-labelledby={`${id}-legend`}
        aria-valuetext={`${first} to the first, ${second} to the second`}
        onChange={(event) => onAnswer(splitScore(SPLIT_SHARES - Number(event.target.value)))}
      />
      {value === undefined ? (
        <Button size="sm" kind="ghost" onClick={() => onAnswer(splitScore(first))}>
          Keep an even split
        </Button>
      ) : null}
      <p className="stage-note">Even shares is the middle course: {question.options[1].charAt(0).toLowerCase() + question.options[1].slice(1)}</p>
    </div>
  );
}

const PLACE = ["First", "Second", "Last"] as const;

/** The three put in order by pressing them most wanted first; the last is placed for you. */
export function RankAnswer({ question, order, onRank }: { readonly question: LeadershipQuestion; readonly order: readonly number[]; readonly onRank: (order: readonly number[], score: number | undefined) => void }) {
  const press = (option: number) => {
    if (order.includes(option)) return;
    const next = [...order, option];
    const complete = next.length === 2 ? [...next, [0, 1, 2].find((at) => !next.includes(at))!] : next;
    onRank(complete, complete.length === 3 ? rankScore(complete) : undefined);
  };
  return (
    <div className="answer-rank">
      <p className="ui-field__label">Put them in order: press the one you want most, then the next</p>
      <ol className="answer-rank__list">
        {question.options.map((label, option) => {
          const place = order.indexOf(option);
          return (
            <li key={label}>
              <button type="button" className="answer-rank__option" data-place={place === -1 ? undefined : place} aria-pressed={place !== -1} onClick={() => press(option)}>
                <span className="answer-rank__badge" aria-hidden="true">
                  {place === -1 ? "" : place + 1}
                </span>
                <span>{label}</span>
                {place === -1 ? null : <span className="ui-visually-hidden">, ranked {PLACE[place]!.toLowerCase()}</span>}
              </button>
            </li>
          );
        })}
      </ol>
      {order.length > 0 ? (
        <Button size="sm" kind="ghost" onClick={() => onRank([], undefined)}>
          Start the order again
        </Button>
      ) : null}
    </div>
  );
}
