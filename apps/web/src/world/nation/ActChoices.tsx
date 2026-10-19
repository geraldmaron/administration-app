import { useId } from "react";
import type { ActFamily, ActGoal, ActWorkspace, FamilyView, OptionView } from "@admin/player-core";
import { Choice, Icon, type IconName } from "@admin/ui-web";

const FAMILY_MARK: Readonly<Record<ActFamily, IconName>> = {
  meet: "summit",
  sign: "sign",
  assist: "instrumentAssistance",
  tariff: "subjectTrade",
  diplomatic: "instrumentDiplomatic",
  justice: "departmentJustice",
  economic: "instrumentEconomic",
  covert: "instrumentCovert",
  military: "instrumentMilitary",
  congress: "subjectCapitol",
};

// The engine's five likelihood words, lowest first, so the odds draw as pips lit to their step.
const LIKELIHOOD_STEP: Readonly<Record<string, number>> = { remote: 1, unlikely: 2, "roughly even": 3, likely: 4, "almost certain": 5 };

const STATE_MARK: Readonly<Record<Exclude<OptionView["preview"]["state"], "open">, { readonly icon: IconName; readonly word: string }>> = {
  held: { icon: "locked", word: "Not open" },
  underway: { icon: "pending", word: "Under way" },
  done: { icon: "approve", word: "Done" },
};

function Odds({ odds }: { readonly odds: NonNullable<OptionView["preview"]["odds"]> }) {
  const step = LIKELIHOOD_STEP[odds.word];
  return (
    <span className="act-reading act-odds" data-stance={odds.stance}>
      {step ? (
        <span className="act-odds__pips" aria-hidden="true">
          {[1, 2, 3, 4, 5].map((pip) => (
            <span key={pip} data-lit={pip <= step ? "true" : undefined} />
          ))}
        </span>
      ) : null}
      <span>
        {odds.label}: <strong>{odds.word.charAt(0).toUpperCase() + odds.word.slice(1)}</strong>
      </span>
    </span>
  );
}

/** What an act card says under its name: the odds as pips, then the money and the wait each with its mark, or why it cannot be taken. */
function Readings({ view }: { readonly view: OptionView }) {
  const { preview } = view;
  if (preview.state !== "open") {
    const mark = STATE_MARK[preview.state];
    return (
      <span className="act-readings">
        <span className="act-reading act-reading--held">
          <Icon name={mark.icon} size={14} weight="bold" /> {mark.word}
        </span>
        <span className="act-reading__why">{preview.reason ?? "It is not available this week."}</span>
      </span>
    );
  }
  return (
    <span className="act-readings">
      {preview.odds ? <Odds odds={preview.odds} /> : null}
      <span className="act-reading">
        <Icon name="budget" size={14} weight="bold" /> {preview.short.cost === "None" ? "No money" : preview.short.cost}
      </span>
      <span className="act-reading">
        <Icon name="schedule" size={14} weight="bold" /> {preview.short.timing === "Now" ? "Right away" : preview.short.timing}
      </span>
      {preview.warning ? (
        <span className="act-reading act-reading--warning">
          <Icon name="conflict" size={14} weight="bold" /> {preview.warning}
        </span>
      ) : null}
    </span>
  );
}

/** Objectives stay compact so the selected plan remains the primary working surface. */
export function Objective({ view, onGoal }: { readonly view: ActWorkspace; readonly onGoal: (goal: ActGoal) => void }) {
  return <Choice legend="Objective" layout="segments" className="act-objective" value={view.goal} onChange={onGoal}
    options={view.goals.map((goal) => ({ value: goal.goal, label: `${goal.name} · ${goal.open} open` }))} />;
}

function Family({ family, chosen, onOption }: { readonly family: FamilyView; readonly chosen: string | undefined; readonly onOption: (id: string) => void }) {
  return (
    <Choice
      legend={
        <span className="act-family__legend">
          <Icon name={FAMILY_MARK[family.family]} size={16} />
          <span>{family.name}</span>
        </span>
      }
      layout="cards"
      className="act-family ui-choice--raised"
      value={family.options.some((entry) => entry.option.id === chosen) ? chosen : undefined}
      onChange={onOption}
      options={family.options.map((entry) => ({
        value: entry.option.id,
        label: entry.option.name,
        detail: <Readings view={entry} />,
      }))}
    />
  );
}

/** Step two: the instrument. Every act that serves the objective, its odds, money and wait set beside the others'. */
export function Instruments({ view, onOption }: { readonly view: ActWorkspace; readonly onOption: (id: string) => void }) {
  const heading = useId();
  if (!view.goal) return null;
  const copy = view.goals.find((goal) => goal.goal === view.goal);
  return (
    <section className="act-step" aria-labelledby={heading}>
      <h2 id={heading} className="act-section-title">{copy?.line ?? "Choose an action"}</h2>
      {view.families.map((family) => (
        <Family key={family.family} family={family} chosen={view.chosen?.option.id} onOption={onOption} />
      ))}
    </section>
  );
}
