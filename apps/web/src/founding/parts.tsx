import type { ReactNode } from "react";
import { usPartyOfPerson } from "@admin/engine";
import { monogramFor, roleTitle } from "@admin/player-core";
import type { Person } from "@admin/world";
import { Portrait, type PortraitSize } from "@admin/ui-web";

// The pieces every founding stage draws a person with.

const FIT_WORD: Readonly<Record<string, string>> = { strong: "Strongest fit", good: "Good fit", fair: "Fair fit", poor: "Poor fit" };

/** Candidate identity uses the shared redacted portrait until approved imagery is available. */
export function PersonFace({ person, size = "md", decorative = true }: { readonly person: Person; readonly size?: PortraitSize; readonly decorative?: boolean }) {
  const party = usPartyOfPerson(person);
  return (
    <Portrait
      name={person.name}
      size={size}
      decorative={decorative}
      monogram={monogramFor(person.name)}
      redacted
      {...(party ? { party } : {})}
    />
  );
}

const PARTY_WORD: Readonly<Record<string, string>> = { democrat: "Democrat", republican: "Republican", independent: "Independent" };

/** "Democrat · Age 58 · Ohio": who someone is, in the words a card leads with. */
export function personLine(person: Person, withSeat = false): string {
  const party = usPartyOfPerson(person);
  const seat = withSeat ? person.eligibleRoles[0] : undefined;
  return [party ? PARTY_WORD[party] : undefined, seat ? roleTitle(seat as string) : undefined, `Age ${person.age}`, person.birthplace].filter(Boolean).join(" · ");
}

export type CandidateCardProps = {
  readonly name: string;
  readonly person: Person;
  readonly checked: boolean;
  readonly onChoose: () => void;
  readonly fit?: string;
  readonly crossesTheAisle?: boolean;
  readonly reasons?: readonly string[];
  readonly withSeat?: boolean;
  readonly extra?: ReactNode;
};

/** One name on a shortlist, chosen by its radio button, with the face and the reasons it is offered. */
export function CandidateCard({ name, person, checked, onChoose, fit, crossesTheAisle, reasons = [], withSeat = false, extra }: CandidateCardProps) {
  return (
    <label className="candidate" data-checked={checked ? "true" : undefined}>
      <input type="radio" name={name} checked={checked} onChange={onChoose} />
      <PersonFace person={person} />
      <span className="candidate__text">
        <span className="candidate__name">{person.name}</span>
        <span className="candidate__line">{personLine(person, withSeat)}</span>
        <span className="candidate__marks">
          {fit ? <span className="candidate__mark">{FIT_WORD[fit] ?? fit}</span> : null}
          {crossesTheAisle ? <span className="candidate__mark candidate__mark--aisle">Crosses the aisle</span> : null}
        </span>
        {reasons.length > 0 ? (
          <span className="candidate__reasons">
            {reasons.map((reason) => (
              <span key={reason}>{reason}</span>
            ))}
          </span>
        ) : null}
        {extra}
      </span>
    </label>
  );
}

/** A stage's opening line: what this stage commits the President to. */
export function Commits({ children }: { readonly children: ReactNode }) {
  return (
    <p className="commits">
      <span className="commits__label">What this commits you to</span>
      {children}
    </p>
  );
}
