import { formatRatio, localeIncident, place, readingMoves, stateApprovalReading } from "@admin/player-core";
import type { StateId } from "@admin/world";
import { Receipt, buttonClass, Icon } from "@admin/ui-web";
import { Door } from "../../shell/Door";
import { Moves } from "../../shell/Moves";
import { MapView } from "../../map/MapView";
import { Screen } from "../../shell/Screen";
import type { LocaleDone } from "./use-locale-act";

const DONE_WORDS = {
  relief: "Relief sent",
  "request-deployment": "The governor was asked to deploy the Guard",
  federalize: "The Guard was federalized",
  waiver: "A waiver was granted",
  review: "A federal review was ordered",
  "property-surge": "Federal officers were surged to protect property",
  "immigration-operation": "An immigration operation was launched",
  "task-force": "A federal task force was stood up",
  proclaim: "An order to disperse was proclaimed",
  troops: "Active-duty troops were sent in",
  priority: "An investigative priority was set",
  surveil: "Surveillance was ordered",
  "surveil-under-order": "Surveillance began under a court order",
} as const;

/** What the state's open requests became: answered, deferred, or still waiting. */
function requestLine(done: LocaleDone, state: StateId): string {
  const before = done.before.states[state]?.claims.length ?? 0;
  const after = done.after.states[state]?.claims ?? [];
  if (after.length < before) return "Answered. The state remembers being helped.";
  if (done.option.defers) return "Still open, with more time before the silence counts.";
  return before > 0 ? "Still open." : "Nothing was asked.";
}

/** The proof a locale act was taken: what it cost, what became of the state's request, what moved, and the Record entry. */
export function LocaleReceipt({ state, done }: { readonly state: StateId; readonly done: LocaleDone }) {
  const name = done.after.states[state]?.base.name ?? state;
  const moves = readingMoves(done.before, done.after);
  const approval = stateApprovalReading(done.after, state);
  const incident = done.option.risk ? (localeIncident(done.before, state, done.option.id, !done.option.unprovoked) ?? "Nothing went wrong this time.") : undefined;
  return (
    <Screen icon="approve" title={name} eyebrow="Act taken" screenClass="workspace" camera={`state:${state}`}>
      <div className="locale-desk locale-desk--done">
        <MapView title={`${name} after the act`} lens="delta" camera={`state:${state}`} selection={`state:${state}`} note="Where approval moved since the act was taken." height={320} />
        <Receipt
          title={`${DONE_WORDS[done.option.id]}: ${name}`}
          date={done.date}
          lines={[
            { label: "Charged", value: done.option.costText },
            { label: "Standing at home", value: done.option.standingText },
            ...(incident ? [{ label: "What happened", value: incident }] : []),
            { label: "The state's request", value: requestLine(done, state) },
            ...(approval ? [{ label: "Approval here now", value: formatRatio(approval.approval) }] : []),
          ]}
          record={done.saveError ? `It stands, but this device did not save it: ${done.saveError}` : "It is on your Record."}
        >
          {done.eventId ? (
            <Door href={place.event(done.eventId)} className={buttonClass("primary", "sm")}>
              Open the Record entry
            </Door>
          ) : null}
          <Door href={place.state(state)} className={buttonClass("secondary", "sm")}>
            Back to {name}
          </Door>
          <Door href={place.brief()} className={buttonClass("ghost", "sm")}>
            Back to the Brief
          </Door>
        </Receipt>
        <section aria-labelledby="locale-moved">
          <h2 id="locale-moved" className="brief-section__title">
            <Icon name="graph" size={20} /> What it moved
          </h2>
          <Moves moves={moves} none="No national reading moved right away. The state's answer reaches its approval as the weeks run." />
          <p className="brief-section__note">The map shows the change in approval by state, from before the act to now.</p>
        </section>
      </div>
    </Screen>
  );
}
