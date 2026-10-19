import { Card } from "@admin/ui-web";
import { EvidencePanel } from "@admin/ui-web";
import { useState } from "react";
import type { Campaign } from "@admin/engine";
import type { NationId } from "@admin/world";
import { collectionRecipients, collectionReports, shareReportChoices, shareReportOrder, type CollectionReportRow } from "@admin/player-core";
import { Button, Collection, Field } from "@admin/ui-web";
import type { NationCommit } from "../../nation/economy/commit";
import { ActFrame } from "./ActFrame";
import { asSentence, ConfidenceMeter, NameLink, PanelHeading } from "./parts";
import type { SecurityAct } from "./security-act";

function Report({ row, onOpen }: { readonly row: CollectionReportRow; readonly onOpen: (act: SecurityAct) => void }) {
  return (
    <li className="sec-report ui-row-target" data-stale={row.stale ? "true" : undefined}>
      <div className="sec-report__head">
        <h3 className="sec-report__title">
          <NameLink href={row.href}>{row.target}</NameLink>: {row.status}
        </h3>
        <ConfidenceMeter confidence={row.confidence === "Not recorded" ? undefined : row.confidence} />
        <Button kind="secondary" size="sm" onClick={() => onOpen({ kind: "share-report", id: row.id })}>Review sharing</Button>
      </div>
      <p className="sec-report__question">{row.question}</p>
      {row.focus ? <p className="sec__note">Focus: {row.focus}.</p> : null}
      {row.note ? <p className="sec__note">Recorded note: {asSentence(row.note)}</p> : null}
      <p className="sec__note">Filed {row.filed}. Source confidence: {row.confidence}. This report-level assessment is not the certainty of each finding or a probability. {row.stale ? "Older reporting; current conditions may differ." : "Within the current collection cycle."}</p>
      <p className="sec-report__summary">{row.summary}</p>
      <ul className="ledger__plain">
        {row.findings.map((finding, index) => <li key={`${finding.topic}:${index}`}>{finding.observation} <span className="sec__note">Source: {finding.source}.</span></li>)}
      </ul>
      <EvidencePanel title={`${row.target}: report limitations and sharing`} label="Sources, gaps and sharing">
        <ul className="ledger__plain">
          {row.gaps.map((gap) => <li key={gap}>{gap}</li>)}
          <li>{row.exposure}</li>
          {row.shared.length ? row.shared.map((share, index) => <li key={`${share.recipient}:${share.date}:${index}`}>
            Shared {share.findings.length ? `${share.findings.length} finding${share.findings.length === 1 ? "" : "s"}` : "this report"} with {share.recipient} on {share.date}.
            {share.findings.length > 0 && <ul className="ledger__plain">{share.findings.map((finding, findingIndex) => <li key={`${finding}:${findingIndex}`}>{finding}</li>)}</ul>}
          </li>) : <li>Kept within the administration.</li>}
        </ul>
      </EvidencePanel>
    </li>
  );
}

/** Reports stay in the order they were filed, newest first: the date is the order, so no column sorts them. */
export function CollectionReports({ campaign, onOpen }: { readonly campaign: Campaign; readonly onOpen: (act: SecurityAct) => void }) {
  return (
    <Card role="region" className="sec-panel" aria-labelledby="collection-reports">
      <PanelHeading id="collection-reports" icon="intel">Intelligence reports</PanelHeading>
      <p className="sec__note">What collection actually returned. Reports keep the assessment made when they were filed, including after a tasking closes.</p>
      <Collection items={collectionReports(campaign)} initial={6} noun="reports" className="sec-reports" empty="No reports have been filed. Task collection or review surveillance from a country or state dossier." render={(row) => <Report key={row.id} row={row} onOpen={onOpen} />} />
    </Card>
  );
}

export function ShareReportPanel({ campaign, id, acts, onClose }: { readonly campaign: Campaign; readonly id: string; readonly acts: NationCommit; readonly onClose: () => void }) {
  const report = collectionReports(campaign).find((row) => row.id === id);
  const recipients = collectionRecipients(campaign, id);
  const [recipient, setRecipient] = useState<NationId | undefined>();
  const [findingIndexes, setFindingIndexes] = useState<readonly number[]>([]);
  const selected = recipients.find((entry) => entry.id === recipient);
  const selectedFindings = report?.findings.length ? findingIndexes : undefined;
  return (
    <ActFrame
      tier="full" title="Share an intelligence report" table={shareReportChoices(campaign, id, recipient, selectedFindings)} acts={acts} onClose={onClose}
      verb={() => "Send this report"}
      review={() => `${selected?.name ?? "The recipient"} receives the selected findings it does not already hold from the report filed ${report?.filed ?? "earlier"}, with its confidence preserved.`}
      baselineReview="The report remains within the administration."
      commission={() => ({ title: `Intelligence shared with ${selected?.name ?? "the recipient"}`, lines: [{ label: "Report", value: report?.question ?? "" }], packet: () => {
        if (!recipient) throw new Error("Choose a recipient.");
        return shareReportOrder(campaign, id, recipient, selectedFindings);
      } })}>
      <p className="nation-note">{report?.target}: {report?.question}. One report can be sent to several governments through separate recorded decisions.</p>
      <Field label="Recipient government" hint={selected?.reason ?? "Review the recipient and the limits before authorizing."}>
        {(props) => <select {...props} className="ui-input" value={recipient ?? ""} onChange={(event) => setRecipient(event.target.value ? event.target.value as NationId : undefined)}>
          <option value="">Choose a recipient</option>
          {recipients.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}
        </select>}
      </Field>
      {report?.findings.length ? <fieldset>
        <legend>Findings to disclose</legend>
        <p className="nation-note">Choose exactly what this government receives. The remaining findings and report gaps stay within the administration.</p>
        {report.findings.map((finding, index) => <label key={`${finding.topic}:${index}`} className="collection-share-finding">
          <input type="checkbox" checked={findingIndexes.includes(index)} onChange={(event) => setFindingIndexes(event.target.checked
            ? [...findingIndexes, index].sort((a, b) => a - b) : findingIndexes.filter((value) => value !== index))} />
          <span>{finding.observation} <span className="nation-note">Source: {finding.source}.</span></span>
        </label>)}
      </fieldset> : <p className="nation-note">This report has no itemized findings. Its dated no-result assessment is shared as a whole.</p>}
    </ActFrame>
  );
}
