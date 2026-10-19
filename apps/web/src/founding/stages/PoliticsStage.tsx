import { ideologyConviction, resolveAdministrationParty, type AdministrationParty } from "@admin/engine";
import { IDEOLOGY_AXES, IDEOLOGY_AXIS_POLES, type IdeologyAxis } from "@admin/world";
import { ticketConsequence, ticketLabel } from "@admin/player-core";
import { Choice, Field, Gauge } from "@admin/ui-web";
import { withLeader, type FoundingDraft } from "../draft";
import { PartyMark } from "../glyphs";
import { Commits } from "../parts";

type Update = (change: (draft: FoundingDraft) => FoundingDraft) => void;

const PARTIES: readonly AdministrationParty[] = ["democrat", "republican", "independent"];

/** How far from the center a position sits, in words: the ends of an axis are where conviction lives. */
function leanWord(value: number, axis: IdeologyAxis): string {
  const poles = IDEOLOGY_AXIS_POLES[axis];
  const pole = value < 0 ? poles.negative : poles.positive;
  const magnitude = Math.abs(value);
  if (magnitude < 0.15) return "Center";
  if (magnitude < 0.45) return `Leans ${pole}`;
  if (magnitude < 0.75) return pole;
  return `Firmly ${pole}`;
}

function convictionWord(conviction: number): string {
  if (conviction < 0.2) return "Pragmatist";
  if (conviction < 0.45) return "Committed";
  if (conviction < 0.7) return "Conviction politician";
  return "Ideologue";
}

function Axis({ axis, draft, update }: { readonly axis: IdeologyAxis; readonly draft: FoundingDraft; readonly update: Update }) {
  const poles = IDEOLOGY_AXIS_POLES[axis];
  const value = draft.leader.ideology[axis];
  return (
    <Field label={poles.caption} hint={leanWord(value, axis)}>
      {(props) => (
        <div className="axis">
          <span className="axis__pole">{poles.negative}</span>
          <input
            {...props}
            className="ui-input ui-input--range"
            type="range"
            min={-1}
            max={1}
            step={0.05}
            value={value}
            aria-valuetext={leanWord(value, axis)}
            onChange={(event) => update((current) => withLeader(current, { ideology: { ...current.leader.ideology, [axis]: Number(event.target.value) } }))}
          />
          <span className="axis__pole">{poles.positive}</span>
        </div>
      )}
    </Field>
  );
}

/** The party, chosen outright, and the three axes of what the President believes. */
export function PoliticsStage({ draft, update }: { readonly draft: FoundingDraft; readonly update: Update }) {
  const suggested = resolveAdministrationParty(draft.leader.ideology);
  const conviction = ideologyConviction(draft.leader.ideology);
  return (
    <div className="stage-grid">
      <div className="stage-grid__main">
        <Commits>Congress reads your party from the first week. Your beliefs decide who on the bench fits beside you on the ticket, the staff and the cabinet.</Commits>
        <Choice
          legend="Party"
          layout="cards"
          value={draft.leader.party}
          options={PARTIES.map((party) => {
            const label = ticketLabel(party, undefined);
            return { value: party, label, visual: <PartyMark party={party} />, detail: `${ticketConsequence(label)}${suggested === party ? " Where your economics point." : ""}` };
          })}
          onChange={(party) => update((current) => withLeader(current, { party }))}
        />
        <fieldset className="axes">
          <legend className="ui-field__label">Beliefs</legend>
          {IDEOLOGY_AXES.map((axis) => (
            <Axis key={axis} axis={axis} draft={draft} update={update} />
          ))}
        </fieldset>
      </div>
      <div className="stage-grid__side">
        <Gauge label="Conviction" value={conviction} valueText={convictionWord(conviction)} caption="How far from the center your three positions sit, taken together." />
      </div>
    </div>
  );
}
