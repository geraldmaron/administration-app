import { useMemo, useState } from "react";
import type { Campaign } from "@admin/engine";
import { courtDocket, courtSystem, place, type CourtSystem, type CourtSystemCase } from "@admin/player-core";
import { Button, Card, HelpTip, Icon, Sheet } from "@admin/ui-web";
import { MapView, type RegionPin } from "../../map/MapView";
import { Door } from "../../shell/Door";
import { Docket } from "./Docket";
import { CaseFlow } from "./CaseFlow";
import { AgreementMatrix, CourtBench } from "./CourtBench";
import { CourtCalendar } from "./CourtCalendar";
import { CircuitChips, circuitSelection, type CourtSelection } from "./CircuitChips";
import { LANES, LANE_WORDS, weeksWords } from "./court-words";
import type { CourtsView } from "./views";
import "./court-system.css";
import "./justice-workspace.css";

/**
 * The bench, docket and appointments each get one focused workspace.
 * Jurisdiction is a contextual comparison over the same recorded cases.
 */
export function CourtSystemView({ campaign, mode = "docket" }: { readonly campaign: Campaign; readonly mode?: CourtsView }) {
  const system = useMemo(() => courtSystem(campaign), [campaign]);
  const [selection, setSelection] = useState<CourtSelection>({});
  const [jurisdiction, setJurisdiction] = useState(false);
  const pins = useMemo(() => casePins(system.cases), [system]);
  const live = system.cases.length;
  const responses = system.cases.filter((entry) => entry.response).length;
  const open = system.justices.filter((entry) => entry.vacant).length;
  return <div className="court-system justice-workspace">
    <Card className="justice-command" aria-label="Judicial operating picture">
      <div className="justice-command__identity"><Icon name="court" size={32} /><div><span className="justice-kicker">Federal judiciary</span><strong>Independent review. Presidential response.</strong></div><HelpTip label="Judicial independence">Courts decide cases independently. Appointing party and economic lean describe the bench; neither determines a ruling. A request for review or a stay does not itself suspend a judgment.</HelpTip></div>
      <dl className="justice-readings"><div><dt>Live cases</dt><dd>{live}</dd></div><div data-attention={responses > 0 || undefined}><dt>Your response</dt><dd>{responses}</dd></div><div><dt>Seats filled</dt><dd>{system.justices.length - open}<small> / {system.justices.length}</small></dd></div><div><dt>Next court date</dt><dd className="justice-readings__date">{system.events[0]?.date ?? "Not scheduled"}</dd></div></dl>
    </Card>
    <NeedsYou system={system} />
    {mode !== "nominations" ? <div className="justice-workspace__body">
      <div className="justice-workspace__main">
        {mode === "bench" ? <CourtBench system={system} /> : <><ul className="court-stages" aria-label="Case counts by stage">{LANES.map((lane) => <li key={lane} data-lane={lane}><span>{LANE_WORDS[lane]}</span><strong>{system.lanes[lane]}</strong></li>)}</ul><Docket docket={courtDocket(campaign)} /></>}
        {mode === "bench" ? <AgreementMatrix system={system} /> : <CourtCalendar system={system} selection={selection} />}
      </div>
      <aside className="justice-workspace__context" aria-label="Court context">
        <section className="court-panel"><h2>Federal jurisdiction</h2><p>Trace the filing forum, circuit and cases from the same court record.</p><Button kind="secondary" onClick={() => setJurisdiction(true)}><Icon name="court" size={16} /> Explore circuits</Button><dl className="justice-readings"><div><dt>Circuits</dt><dd>{system.circuits.length}</dd></div><div><dt>Open Supreme Court seats</dt><dd>{open}</dd></div></dl></section>
        {mode === "bench" ? <CourtCalendar system={system} selection={selection} /> : <CourtBench system={system} />}
      </aside>
    </div> : null}
    <Sheet open={jurisdiction} onClose={() => setJurisdiction(false)} title="Federal courts · jurisdiction" placement="wide" lead="Select a circuit to connect geography with its live cases. Appointing party is a composition measure, not a forecast.">
      <div className="court-system"><MapView title="Where cases are filed" lens="circuits" camera="us" regionPins={pins} selection={circuitSelection(system.circuits, selection.circuit)} height={360} onChoose={(ref) => { const circuit = system.circuits.find((entry) => entry.states.includes(ref.slice("state:".length))); if (circuit) setSelection(selection.circuit === circuit.name ? {} : { circuit: circuit.name }); }} note="Circuit colors show the balance of appointing parties among active judges. The record does not predict how any judge will rule." /><CircuitChips circuits={system.circuits} selection={selection} onSelect={setSelection} /><CaseFlow system={system} selection={selection} onSelect={setSelection} /></div>
    </Sheet>
  </div>;
}

/** The President's own deadlines first; then what is pending without a date; then the next date the courts hold. */
function NeedsYou({ system }: { readonly system: CourtSystem }) {
  const answers = system.cases.filter((entry) => entry.response).sort((a, b) => a.response!.turn - b.response!.turn);
  const stays = system.cases.filter((entry) => entry.stayPending);
  const open = system.justices.filter((justice) => justice.vacant);
  const unnamed = open.filter((justice) => !justice.pending).length;
  return <section className="court-needs" aria-labelledby="court-needs-title" data-urgent={answers.length > 0 || undefined} data-waiting={answers.length === 0 && unnamed > 0 || undefined}>
    <h2 id="court-needs-title" className="court-needs__title"><Icon name={answers.length > 0 ? "decision" : "court"} size={20} />{answers.length ? "Your response is required" : unnamed ? "A judicial nomination is available" : "No court response requires action"}</h2>
    <ul className="court-needs__list">
      {answers.map((entry) => <li key={entry.id} data-kind="response"><Door className="justice-attention-row" href={entry.href}><Icon name="decision" size={20} /><span><strong>{entry.title}</strong><span>Answer due {entry.response!.date} · {weeksWords(entry.response!.weeks)}. Without an answer, the lower judgment becomes final.</span></span><span aria-hidden="true">→</span></Door></li>)}
      {open.length ? <li data-kind="seat"><Door className="justice-attention-row" href={`${place.courts()}?view=nominations`}><Icon name="appoint" size={20} /><span><strong>{open.length} open Supreme Court {open.length === 1 ? "seat" : "seats"}</strong><span>{unnamed ? `${unnamed} awaiting your nominee` : "Your nominee is before the Senate"}</span></span><span aria-hidden="true">→</span></Door></li> : null}
      {stays.map((entry) => <li key={entry.id} data-kind="stay"><Door className="justice-attention-row" href={entry.href}><Icon name="pending" size={20} /><span><strong>{entry.title}</strong><span>Stay application pending · no decision date set</span></span><span aria-hidden="true">→</span></Door></li>)}
    </ul>
  </section>;
}

/** Each live case at the state it was filed in, opening the case; a case whose forum is not recorded stays on the path below only. */
function casePins(cases: readonly CourtSystemCase[]): readonly RegionPin[] {
  return cases.flatMap((entry) => (entry.state ? [{ id: entry.id, label: entry.title, where: entry.state, weight: 1, href: entry.href, region: `state:${entry.state}` }] : []));
}
