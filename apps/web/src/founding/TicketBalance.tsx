import { stateRegion, type RunningMateCandidate } from "@admin/engine";
import { attributeVerdict } from "@admin/player-core";
import { IDEOLOGY_AXES, IDEOLOGY_AXIS_POLES, stateById, type IdeologyAxis } from "@admin/world";
import { Steps } from "@admin/ui-web";
import { ticketReasons, type TicketTop } from "./ticket-reasons";

// A running mate set against the top of the ticket, drawn: where each of you
// is from, where each of you stands, how far apart your ages are, and how much
// they have done. The same facts the shortlist is ranked on, so the picture
// and the order agree; the sentences they replace stay as each reading's name.

const SHORT_AXIS: Readonly<Record<IdeologyAxis, string>> = {
  economicLeftRight: "Economy",
  authLibertarian: "Authority",
  nationalistGlobalist: "World",
};

const REGION_WORD: Readonly<Record<string, string>> = { northeast: "Northeast", midwest: "Midwest", south: "South", west: "West" };

/** The two ends of the age line: the youngest and oldest a ticket plausibly carries. */
const AGE_FLOOR = 35;
const AGE_CEILING = 85;

const at = (value: number) => `${((value + 1) / 2) * 100}%`;
const onAgeLine = (age: number) => `${((Math.min(AGE_CEILING, Math.max(AGE_FLOOR, age)) - AGE_FLOOR) / (AGE_CEILING - AGE_FLOOR)) * 100}%`;

/** Four quarters of the competence scale, so experience reads as steps rather than a figure. */
function experienceSteps(competence: number): number {
  return Math.min(4, Math.max(1, Math.ceil(competence * 4)));
}

export function TicketBalance({ top, candidate }: { readonly top: TicketTop; readonly candidate: RunningMateCandidate }) {
  const reasons = ticketReasons(top, candidate);
  const mate = candidate.homeState;
  const { person } = candidate;
  const region = stateRegion(mate);
  return (
    <span className="ticket-balance">
      <span className="ticket-balance__part">
        <span className="ticket-balance__axis-name">Home</span>
        <span className="ticket-balance__caption">{mate ? `${stateById.get(mate)?.name ?? mate}${region ? ` · ${REGION_WORD[region] ?? region}` : ""}` : "Home not known"}</span>
      </span>
      <span className="ticket-balance__part ticket-balance__beliefs" role="img" aria-label={reasons.find((line) => line.startsWith("Politics")) ?? "Politics"}>
        {IDEOLOGY_AXES.map((axis) => (
          <span key={axis} className="ticket-balance__axis" title={`${IDEOLOGY_AXIS_POLES[axis].negative} to ${IDEOLOGY_AXIS_POLES[axis].positive}`}>
            <span className="ticket-balance__axis-name">{SHORT_AXIS[axis]}</span>
            <span className="ticket-balance__track">
              <span className="ticket-balance__tick" data-who="you" style={{ insetInlineStart: at(top.ideology[axis]) }} />
              <span className="ticket-balance__tick" data-who="mate" style={{ insetInlineStart: at(person.ideology[axis]) }} />
            </span>
          </span>
        ))}
      </span>
      <span className="ticket-balance__part" role="img" aria-label={reasons.find((line) => line.includes("years")) ?? `Age ${person.age}, you are ${top.age}`}>
        <span className="ticket-balance__axis-name">Age</span>
        <span className="ticket-balance__track">
          <span className="ticket-balance__tick" data-who="you" style={{ insetInlineStart: onAgeLine(top.age) }} />
          <span className="ticket-balance__tick" data-who="mate" style={{ insetInlineStart: onAgeLine(person.age) }} />
        </span>
        <span className="ticket-balance__caption">
          {person.age} · you {top.age}
        </span>
      </span>
      <span className="ticket-balance__part">
        <Steps label="Experience" lit={experienceSteps(person.competence)} steps={4} word={attributeVerdict(person.competence)} />
      </span>
    </span>
  );
}

/** What the two colors on every card mean, said once above the list. */
export function TicketKey() {
  return (
    <p className="ticket-key">
      <span className="ticket-key__swatch" data-who="you" /> You
      <span className="ticket-key__swatch" data-who="mate" /> Running mate
    </p>
  );
}
