import { Card } from "@admin/ui-web";
import { type WarScreenReading } from "@admin/player-core";
import { Collection, IconLabel } from "@admin/ui-web";

export function WarForces({ reading }: { readonly reading: WarScreenReading }) {
  return <Card role="region" className="war-panel" aria-labelledby="war-forces">
    <div className="war-section-head"><h2 id="war-forces"><IconLabel icon="shield" size={20}>Forces in the theater</IconLabel></h2><span className="war-note">{reading.forces.length} recorded {reading.forces.length === 1 ? "placement" : "placements"}</span></div>
    <p className="war-note">A placement is not total combat strength. Personnel are shown only as recorded bands; no side-by-side order of battle is exposed in this reading.</p>
    {reading.forces.length ? <div className="war-table-wrap"><table className="war-force-table" aria-label="Recorded theater force placements"><thead><tr><th scope="col">Placement / zone</th><th scope="col">Service</th><th scope="col">Personnel band</th><th scope="col">Location evidence</th></tr></thead><tbody>{reading.forces.map((force) => <tr key={force.id}>
      <th scope="row"><strong>{force.label}</strong><span className="war-note">{force.zoneName}</span></th><td>{force.service ?? "Not recorded"}</td><td>{force.band ?? "Not recorded"}</td><td>{force.precision === "installation" ? "Sourced installation" : "Zone only · representative point"}</td>
    </tr>)}</tbody></table></div> : <div className="war-empty"><IconLabel icon="mapPin" size={22}>No force placements recorded for this theater</IconLabel><p>Absence of a placement is not evidence that either side has no armed forces.</p></div>}
  </Card>;
}

export function WarRecord({ reading }: { readonly reading: WarScreenReading }) {
  const beats = [...reading.beats].reverse();
  return <Card role="region" className="war-panel" aria-labelledby="war-beats">
    <div className="war-section-head"><h2 id="war-beats"><IconLabel icon="record" size={20}>History</IconLabel></h2><span className="war-note">Latest recorded event first</span></div>
    <Collection as="ol" items={beats} initial={6} noun="events" className="war-timeline" render={(beat, index) => <li key={`${index}-${beat.date}-${beat.description}`}><span className="war-timeline__point" aria-hidden="true" /><span className="war-kicker">{beat.date}</span><p>{beat.description}</p></li>} empty="No events have been recorded in this war yet." />
  </Card>;
}
