import { useState } from "react";
import { selectFamilyRun, type Campaign } from "@admin/engine";
import { ARC_DISPOSITION_WORDS, formatDate, formatMoney, place, recordEntry, type ArcRow, type ImpactReportRow } from "@admin/player-core";
import { Button, Collection, Flag, Icon, Sheet, Tag, buttonClass } from "@admin/ui-web";
import { Door } from "../shell/Door";
import { nationFlagUrl, stateFlagUrl } from "../media/flags";

/** A dealt chapter is linked only when the preserved case names that exact scenario. */
export function ArcInvestigation({ campaign, arc, onClose }: { readonly campaign: Campaign; readonly arc: ArcRow | undefined; readonly onClose: () => void }) {
  const run = arc ? selectFamilyRun(campaign, arc.family) : undefined;
  return <Sheet open={arc !== undefined} onClose={onClose} title={arc?.title ?? "Story arc"} lead={arc ? `${arc.counterpart} · ${arc.chapters} decisions · ${arc.weeks} weeks` : undefined} placement="side">
    {arc && run ? <div className="rec-stack">
      <dl className="rec-facts"><div><dt>Opened</dt><dd>{formatDate(arc.openedDate)}</dd></div><div><dt>Status</dt><dd>{arc.disposition ? ARC_DISPOSITION_WORDS[arc.disposition] : "Running"}</dd></div>{arc.closedDate ? <div><dt>Closed</dt><dd>{formatDate(arc.closedDate)}</dd></div> : null}</dl>
      <nav className="rec-context-actions" aria-label="Arc subjects"><Door className={buttonClass("secondary", "sm")} href={run.counterpart === campaign.founding.nation ? place.nation() : place.country(run.counterpart)}><Flag name={arc.counterpart} src={nationFlagUrl(run.counterpart)} height={16} decorative />{arc.counterpart}</Door>{run.place ? <Door className={buttonClass("secondary", "sm")} href={place.state(run.place.state)}><Flag name={campaign.states[run.place.state]?.base.name ?? run.place.state} src={stateFlagUrl(run.place.state)} height={16} decorative />{campaign.states[run.place.state]?.base.name ?? run.place.state}</Door> : null}</nav>
      <h3 className="rec-subhead">Recorded chapters</h3>
      <Collection as="ol" items={run.beats} initial={8} noun="chapters" className="rec-items" render={(scenario, index) => {
        const file = Object.values(campaign.cases ?? {}).find((candidate) => candidate.contentPin?.scenarioId === scenario);
        return <li key={`${scenario}:${index}`} className={`rec-item${file ? " ui-row-target" : ""}`}>
          {file ? <Door href={place.decision(scenario)} className="ui-row-link">{file.title}</Door> : <strong>Chapter {index + 1}</strong>}
          <p className="rec-when">{file ? `${formatDate(file.raisedAt)} · ${file.status}` : "The dealt chapter is recorded, but its original briefing was not preserved."}</p>
        </li>;
      }} />
    </div> : null}
  </Sheet>;
}

/** Only filed assessments cross this boundary; running impact totals are deliberately unread. */
export function ImpactInvestigation({ campaign, report, onClose }: { readonly campaign: Campaign; readonly report: ImpactReportRow | undefined; readonly onClose: () => void }) {
  const event = report ? Object.values(campaign.impactEvents ?? {}).find((candidate) => candidate.spec.id === report.id) : undefined;
  const cause = event?.causedBy ? recordEntry(campaign, event.causedBy) : undefined;
  const range = (low: number, high: number) => `${low.toLocaleString("en-US")}–${high.toLocaleString("en-US")}`;
  return <Sheet open={report !== undefined} onClose={onClose} title={report?.title ?? "Agency assessment"} lead={report ? `${report.nationName} · ${report.stage}` : undefined} placement="side">
    {report && event ? <div className="rec-stack">
      <dl className="rec-facts"><div><dt>Latest report</dt><dd>{formatDate(report.reported)}</dd></div><div><dt>Confidence</dt><dd><Tag tone="identity">{report.confidence}</Tag></dd></div><div><dt>Site</dt><dd>{report.site}</dd></div><div><dt>Filed reports retained</dt><dd>{report.revisions}</dd></div></dl>
      <section><h3 className="rec-subhead">Evidence basis</h3><p>{report.basis}</p></section>
      <nav className="rec-context-actions" aria-label="Assessment context"><Door className={buttonClass("secondary", "sm")} href={event.spec.nation === campaign.founding.nation ? place.nation() : place.country(event.spec.nation)}><Flag name={report.nationName} src={nationFlagUrl(event.spec.nation)} height={16} decorative />{report.nationName}</Door>{cause ? <Door className={buttonClass("secondary", "sm")} href={place.event(cause.id)} aria-label={`Originating act: ${cause.description}`}><Icon name="record" size={16} />Originating act</Door> : <span className="rec-note">No preserved originating Record entry.</span>}</nav>
      <section><h3 className="rec-subhead">Filed report history</h3><p className="rec-note">Ranges are reported estimates. Revisions can change confidence and estimates; they are not the simulation’s internal totals.</p>
        <Collection as="ol" items={event.reports} initial={6} noun="filed reports" className="rec-items" render={(file) => <li key={file.revision} className="rec-item"><strong>{formatDate(file.date)} · Revision {file.revision}</strong><p className="rec-when">{file.stage} · {file.confidence} confidence</p><dl className="rec-facts"><div><dt>Reported deaths</dt><dd>{range(file.deaths.low, file.deaths.high)}</dd></div><div><dt>Injured or severely ill</dt><dd>{range(file.injured.low, file.injured.high)}</dd></div><div><dt>People without services</dt><dd>{range(file.serviceDisruption.low, file.serviceDisruption.high)}</dd></div><div><dt>Estimated economic loss</dt><dd>{formatMoney(file.lossUSDm.low)}–{formatMoney(file.lossUSDm.high)}</dd></div></dl><p className="rec-note">{file.basis}</p></li>} />
      </section>
    </div> : null}
  </Sheet>;
}

/** One assessment card and inspector contract, wherever a preserved report appears. */
export function ImpactReportList({ campaign, reports, initial = 6 }: { readonly campaign: Campaign; readonly reports: readonly ImpactReportRow[]; readonly initial?: number }) {
  const [selected, setSelected] = useState<ImpactReportRow | undefined>(undefined);
  return <>
    <Collection items={reports} initial={initial} noun="assessments" className="rec-items" empty="No agency assessment followed this entry." render={(report) => <li key={report.id} className="rec-item ui-card-door">
      <Button kind="ghost" className="rec-investigate ui-card-door__link" onClick={() => setSelected(report)}>{report.title}</Button>
      <div className="rec-report__identity"><span>{report.nationName}</span><Tag tone="neutral" icon="pending">{report.stage}</Tag><Tag tone="identity">{report.confidence} confidence</Tag></div>
      <time className="rec-when">{formatDate(report.reported)}</time>
      <dl className="rec-facts">{report.figures.map((figure) => <div key={figure.label}><dt>{figure.label}</dt><dd>{figure.range}</dd></div>)}</dl>
    </li>} />
    <ImpactInvestigation campaign={campaign} report={selected} onClose={() => setSelected(undefined)} />
  </>;
}
