import type { CourtSystem, CourtSystemCase } from "@admin/player-core";
import { HelpTip, Icon } from "@admin/ui-web";
import { Door } from "../../shell/Door";
import type { CourtSelection } from "./CircuitChips";
import { LANES, LANE_WORDS, circuitWords, weeksWords } from "./court-words";

type FlowProps = { readonly system: CourtSystem; readonly selection: CourtSelection; readonly onSelect: (selection: CourtSelection) => void };

/** Every live case on the one path it travels, counted once at its current step, and the recent decisions at its end. */
export function CaseFlow({ system, selection, onSelect }: FlowProps) {
  const live = system.lanes.filed + system.lanes.injunction + system.lanes.circuit + system.lanes.emergency + system.lanes.review;
  return (
    <section className="court-panel" aria-labelledby="court-flow-title">
      <div className="court-panel__title">
        <h2 id="court-flow-title">Where each case stands</h2>
        <HelpTip label="About the case path">Each case is counted once, at its current step. A case can return to the district court on remand. A stay application is separate from the appeal it pauses.</HelpTip>
      </div>
      <p className="court-flow__summary">
        {live === 0 ? "No case is live." : `${live} live ${live === 1 ? "case" : "cases"}`}
        {selection.circuit ? <> · showing the {circuitWords(selection.circuit)} <button type="button" className="court-link" onClick={() => onSelect({})}>Show all</button></> : null}
      </p>
      {live === 0 && system.decided.length === 0 ? <div className="court-flow__empty"><Icon name="court" size={24} /><div><strong>The docket is clear</strong><p>New filings will appear with their court, next date and any answer required from you.</p><p className="court-flow__route">District court <span aria-hidden="true">→</span> Circuit appeal <span aria-hidden="true">→</span> Supreme Court review</p><p>Appeals and review are not automatic. Interim relief and stays are shown separately when requested.</p></div></div> : <>
      <ul className="court-stages" aria-label="Case counts by stage">{LANES.map((lane) => <li key={lane}><span>{LANE_WORDS[lane]}</span><strong>{system.lanes[lane]}</strong></li>)}</ul>
      <ol className="court-flow" aria-label="Case path">
        {LANES.map((lane) => <FlowLane key={lane} lane={lane} system={system} selection={selection} onSelect={onSelect} />)}
      </ol></>}
    </section>
  );
}

function FlowLane({ lane, system, selection, onSelect }: FlowProps & { readonly lane: (typeof LANES)[number] }) {
  const number = new Map(system.cases.map((entry, index) => [entry.id, index + 1]));

  const cases = system.cases.filter((entry) => entry.lane === lane);
  if (lane === "decision" ? system.decided.length === 0 : cases.length === 0) return null;
  return (
            <li key={lane} className="court-flow__lane" data-lane={lane} data-empty={(lane === "decision" ? system.lanes.decision : cases.length) === 0 ? "true" : undefined}>
              <h3 className="court-flow__name">
                <span>{LANE_WORDS[lane]}</span>
                <strong>{lane === "decision" ? system.lanes.decision : cases.length}</strong>
              </h3>
              {lane === "decision" ? (
                <ul className="court-flow__decided">
                  {system.decided.map((entry) => (
                    <li key={entry.href} className="ui-row-target"><Door href={entry.href} className="ui-row-link">{entry.title}</Door><span>{entry.upheld ? "Upheld" : "Set aside"}{entry.split ? `, ${entry.split}` : ""} · {entry.ruled}</span></li>
                  ))}
                </ul>
              ) : (
                <ul className="court-flow__cases">
                  {cases.map((entry) => <FlowCase key={entry.id} entry={entry} number={number.get(entry.id) ?? 0} selection={selection} onSelect={onSelect} />)}
                </ul>
              )}
            </li>
          );

}

function FlowCase({ entry, number, selection, onSelect }: { readonly entry: CourtSystemCase; readonly number: number } & Pick<FlowProps, "selection" | "onSelect">) {
  const dimmed = (selection.circuit !== undefined && entry.circuit !== selection.circuit) || (selection.caseId !== undefined && selection.caseId !== entry.id);
  return (
    <li className="court-case" data-selected={selection.caseId === entry.id ? "true" : undefined} data-dimmed={dimmed ? "true" : undefined}>
      <button type="button" className="court-case__pick" aria-pressed={selection.caseId === entry.id} aria-label={`Show case ${number} on the calendar and its circuit on the map`}
        onClick={() => onSelect(selection.caseId === entry.id ? {} : { ...(entry.circuit ? { circuit: entry.circuit } : {}), caseId: entry.id })}>
        {number}
      </button>
      <Door href={entry.href} className="court-case__body">
        <strong className="court-case__title">{entry.title}</strong>
        <span className="court-case__forum">{entry.forum}</span>
        <span className="court-case__next">Next: {entry.next.date}, {weeksWords(entry.next.weeks)}</span>
        {entry.response ? <span className="court-case__flag" data-kind="response">Your answer due {entry.response.date}</span> : null}
        {entry.stayPending ? <span className="court-case__flag" data-kind="stay">Stay pending; no decision date set</span> : null}
      </Door>
    </li>
  );
}
