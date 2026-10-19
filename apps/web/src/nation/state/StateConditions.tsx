import { CLAIM_WINDOW_MAX_TURNS } from "@admin/engine";
import type { StateDossier } from "@admin/player-core";
import { Gauge, Icon } from "@admin/ui-web";
import { ConditionList } from "./Conditions";

/** A request's meter runs over the longest window one opens with, in weeks. */
const REQUEST_WINDOW_WEEKS = CLAIM_WINDOW_MAX_TURNS;

function Requests({ dossier }: { readonly dossier: StateDossier }) {
  if (dossier.claims.length === 0) return null;
  return (
    <ul className="request-list" aria-label="What the state has asked for">
      {dossier.claims.map((claim) => (
        <li key={claim.signature} className="request-line">
          <p className="request-line__reason">
            <Icon name="pending" size={16} /> {claim.reason}
          </p>
          <Gauge
            shape="meter"
            label="Time left to answer"
            value={Math.min(1, claim.weeksLeft / REQUEST_WINDOW_WEEKS)}
            valueText={`${claim.weeksLeft} ${claim.weeksLeft === 1 ? "week" : "weeks"} left`}
            tone={claim.weeksLeft <= 2 ? "bad" : claim.weeksLeft <= 4 ? "watch" : "reading"}
          />
        </li>
      ))}
    </ul>
  );
}

function Memory({ dossier }: { readonly dossier: StateDossier }) {
  if (dossier.marks.length === 0) return <p className="brief-section__note">The state holds nothing for or against you yet.</p>;
  return (
    <ul className="memory-list" aria-label="What the state remembers">
      {dossier.marks.map((mark, index) => (
        <li key={`${mark.signature}-${index}`} className="memory-line" data-valence={mark.forYou ? "good" : "bad"}>
          <Icon name={mark.forYou ? "favorable" : "adverse"} size={16} />
          <span>
            <span className="memory-line__side ui-valence-ink" data-valence={mark.forYou ? "good" : "bad"}>{mark.forYou ? "For you" : "Against you"}:</span> {mark.reason}
          </span>
        </li>
      ))}
    </ul>
  );
}

/** What the state is living through, what it has asked Washington for, the emergencies reaching it, and what it remembers. */
export function StateConditions({ dossier }: { readonly dossier: StateDossier }) {
  return (
    <section id="state-conditions" className="state-section" aria-labelledby="state-conditions-title">
      <h2 id="state-conditions-title" className="brief-section__title">
        <Icon name="caution" size={20} /> Conditions
      </h2>
      <ConditionList conditions={dossier.conditions} none={`${dossier.name} is living through no condition this week.`} />
      <Requests dossier={dossier} />
      {dossier.emergencies.length > 0 ? (
        <ul className="condition-list">
          {dossier.emergencies.map((emergency) => (
            <li key={emergency.id} className="condition-line" data-stance="caution">
              <p className="condition-line__title">{emergency.title}</p>
              <p className="condition-line__where">
                {emergency.statewide ? "Declared for this state" : "Declared for the whole country"}. Lapses in {emergency.weeksLeft} {emergency.weeksLeft === 1 ? "week" : "weeks"} unless renewed.
              </p>
            </li>
          ))}
        </ul>
      ) : null}
      <Memory dossier={dossier} />
    </section>
  );
}
