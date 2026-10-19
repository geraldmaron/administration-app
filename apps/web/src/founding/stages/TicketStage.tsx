import { useId } from "react";
import { FOUNDING_MANDATES, type FoundingMandate } from "@admin/engine";
import { Choice } from "@admin/ui-web";
import { withMandate, withRunningMate, type FoundingDraft, type ResolvedFounding } from "../draft";
import { MandateMark } from "../glyphs";
import { HomeMap } from "../HomeMap";
import { CandidateCard, Commits } from "../parts";
import { TicketBalance, TicketKey } from "../TicketBalance";

type Update = (change: (draft: FoundingDraft) => FoundingDraft) => void;

const MANDATE_LABEL: Readonly<Record<FoundingMandate, string>> = {
  landslide: "A landslide",
  comfortable: "A comfortable win",
  narrow: "A narrow win",
  "popular-vote-loss": "Won the Electoral College, lost the popular vote",
};

const COUNT = "count";

function RunningMates({ draft, resolved, update }: { readonly draft: FoundingDraft; readonly resolved: ResolvedFounding; readonly update: Update }) {
  const name = useId();
  const top = { age: draft.leader.age, ideology: draft.leader.ideology, ...(draft.leader.homeState ? { homeState: draft.leader.homeState } : {}) };
  if (resolved.runningMates.length === 0) {
    return <p className="stage-note">Nobody on the bench shares this ticket, so the Vice President's chair would open empty.</p>;
  }
  return (
    <fieldset className="candidates">
      <legend className="ui-field__label">Running mate</legend>
      <TicketKey />
      {resolved.runningMates.map((candidate) => (
        <CandidateCard
          key={candidate.person.id}
          name={name}
          person={candidate.person}
          checked={resolved.seated.runningMate === candidate.person.id}
          onChoose={() => update((current) => withRunningMate(current, candidate.person.id))}
          fit={candidate.band}
          crossesTheAisle={candidate.crossesTheAisle}
          extra={<TicketBalance top={top} candidate={candidate} />}
          withSeat
        />
      ))}
    </fieldset>
  );
}

/** Who runs beside the President, and the mandate the ticket won by. */
export function TicketStage({ draft, resolved, update }: { readonly draft: FoundingDraft; readonly resolved: ResolvedFounding; readonly update: Update }) {
  return (
    <div className="stage-grid">
      <div className="stage-grid__main">
        <Commits>Your running mate becomes Vice President and breaks ties in the Senate. The size of your win decides the Congress you arrive with.</Commits>
        <RunningMates draft={draft} resolved={resolved} update={update} />
      </div>
      <div className="stage-grid__side">
        <HomeMap title="Where the ticket is from" you={draft.leader.homeState} mate={resolved.runningMates.find((candidate) => candidate.person.id === resolved.seated.runningMate)?.homeState} bench={resolved.runningMates.flatMap((candidate) => candidate.homeState ?? [])} note="You in gold, your running mate in blue, and the other candidates' states in a deeper blue." />
        <Choice
          legend="How the country voted"
          layout="cards"
          className="mandate-cards"
          value={draft.mandate ?? COUNT}
          options={[{ value: COUNT, label: "Let the count decide", detail: "Chance decides the margin.", visual: <MandateMark mandate={undefined} /> }, ...FOUNDING_MANDATES.map((value) => ({ value, label: MANDATE_LABEL[value], visual: <MandateMark mandate={value} /> }))]}
          onChange={(value) => update((current) => withMandate(current, value === COUNT ? undefined : (value as FoundingMandate)))}
        />
      </div>
    </div>
  );
}
