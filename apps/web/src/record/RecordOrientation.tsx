import { formatDate, type TimelineReading } from "@admin/player-core";
import { Icon } from "@admin/ui-web";
import { Door } from "../shell/Door";
import { recordHref, type RecordSearch } from "./search";

/** The unselected pane explains a real investigation path without silently choosing a record. */
export function RecordOrientation({ reading, search }: { readonly reading: TimelineReading; readonly search: RecordSearch }) {
  return <section className="rec-orientation" aria-labelledby="record-orientation-title">
    <p className="rec-orientation__kicker"><Icon name="record" size={24} />The administration's memory</p>
    <h2 id="record-orientation-title">Follow an act through its consequences</h2>
    <p className="rec-note">Select an entry to compare its terms, the readings before and after, and the recorded chain of causes and consequences.</p>
    <ol className="rec-investigation" aria-label="How to read an entry"><li><Icon name="sign" size={20} /><strong>The act</strong><span>Who acted, when and on what terms</span></li><li><Icon name="graph" size={20} /><strong>The change</strong><span>Readings and assessments actually recorded</span></li><li><Icon name="dossier" size={20} /><strong>The connection</strong><span>Subjects, earlier causes and later consequences</span></li></ol>
    <h3 className="rec-subhead">Start with a recent entry</h3>
    <ul className="rec-links">{reading.rows.slice(0, 3).map((row) => <li key={row.id} className="ui-row-target"><Door className="ui-row-link" href={recordHref({ ...search, entry: row.id })}>{row.headline}</Door><time className="rec-when">{formatDate(row.date)}</time></li>)}</ul>
    {reading.rows.length === 0 ? <p className="rec-note">No entries match the current filters. Change a filter to follow another thread.</p> : null}
  </section>;
}
