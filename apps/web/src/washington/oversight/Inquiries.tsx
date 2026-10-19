import { useState } from "react";
import type { InquiryPipeline, InquiryRow } from "@admin/player-core";
import { Bar, Button, Card, HelpTip, Icon, Sheet, Tag } from "@admin/ui-web";
import { InstitutionMark } from "../executive/StaffingBadge";

export type InquiryDirection = "received" | "directed";
const WORDS = {
  received: { title: "Inquiries into your administration", none: "No inquiry into your administration is open. Inspectors general and congressional committees initiate their own inquiries.", noun: "inquiries into you" },
  directed: { title: "Reviews you directed", none: "No review you directed is open. A directive requesting a review can open one.", noun: "reviews you directed" },
} as const;

function MatterCard({ row, onSelect }: { readonly row: InquiryRow; readonly onSelect: (row: InquiryRow) => void }) {
  return <li><Card><button type="button" className="inquiry-card" onClick={() => onSelect(row)} data-obstructed={row.obstructed || undefined}>
    <span className="inquiry-card__source">{row.institution ? <InstitutionMark institution={row.institution} emblem="review" size={28} /> : <Icon name="subjectCapitol" size={24} />}<span>{row.source}</span><Icon name="review" size={16} /></span>
    <strong>{row.subject}</strong>
    <span className="inquiry-card__tags"><Tag icon={row.public ? "press" : "review"}>{row.public ? "Public" : "Not yet public"}</Tag>{row.obstructed ? <Tag tone="risk" icon="caution">Inspector interference recorded</Tag> : null}</span>
    <span className="inquiry-card__date">{row.nextMove ? `Next movement · ${row.nextMove}` : `Opened · ${row.opened}`}</span>
  </button></Card></li>;
}

/** A stage board and a focused record share exact inquiry identity; opening a card never commits an act. */
export function Inquiries({ pipeline, direction }: { readonly pipeline: InquiryPipeline; readonly direction: InquiryDirection }) {
  const [selected, setSelected] = useState<InquiryRow>();
  const [archive, setArchive] = useState(false);
  const words = WORDS[direction];
  const mine = (row: InquiryRow) => row.received === (direction === "received");
  const stages = pipeline.stages.map((stage) => ({ ...stage, matters: stage.matters.filter(mine) }));
  const closed = pipeline.closed.filter(mine);
  const open = stages.reduce((sum, stage) => sum + stage.matters.length, 0);
  return <section className="nation-section inquiry-workspace" aria-labelledby={`oversight-inquiries-${direction}`}>
    <header className="oversight-section-head"><h2 id={`oversight-inquiries-${direction}`}><Icon name="review" size={20} /> {words.title}</h2>{closed.length ? <Button kind="secondary" size="sm" onClick={() => setArchive(true)}>Closed · {closed.length}</Button> : null}</header>
    {direction === "received" ? <div className="inquiry-pressure"><span><strong>{Math.round(pipeline.pressure * 100)}%</strong> Modeled congressional pressure <HelpTip label="About oversight pressure">Only public inquiries into your administration contribute to this modeled index. This is not vote support, a probability, or a factual real-world measurement.</HelpTip></span><Bar label="Oversight pressure as share of modeled maximum" value={pipeline.pressure} tone="bad" /></div> : null}
    <ol className="inquiry-stage-strip" aria-label="Inquiry stages">{stages.map((stage) => <li key={stage.stage}><strong>{stage.matters.length}</strong><span>{stage.label}</span><Bar label={`${stage.label}: ${stage.matters.length} of ${open} open matters`} value={open ? stage.matters.length / open : 0} /></li>)}</ol>
    {open === 0 ? <div className="oversight-empty"><Icon name="review" size={28} /><strong>No open {words.noun}</strong><p>{words.none}</p></div> : <div className="inquiry-board">{stages.filter((stage) => stage.matters.length).map((stage) => <section key={stage.stage} className="inquiry-board__lane" aria-label={stage.label}><h3>{stage.label}<span>{stage.matters.length}</span></h3><ul>{stage.matters.map((row) => <MatterCard key={row.id} row={row} onSelect={setSelected} />)}</ul></section>)}</div>}
    <Sheet open={!!selected} onClose={() => setSelected(undefined)} title={selected?.subject ?? "Inquiry record"} placement="side" lead={selected?.source}>
      {selected ? <div className="inquiry-record"><Tag icon="review">{selected.stageWord}</Tag><dl><div><dt>Opened</dt><dd>{selected.opened}</dd></div><div><dt>Next movement</dt><dd>{selected.nextMove ?? "No future date recorded"}</dd></div><div><dt>Visibility</dt><dd>{selected.public ? "Public" : "Not yet public"}</dd></div></dl><h3>Latest recorded evidence</h3><p>{selected.latest}</p>{selected.obstructed ? <p role="note">Action against this inspector is recorded as interference. The inquiry continues.</p> : null}<p className="nation-note">{selected.received ? "This body controls its own inquiry. Opening the record does not obstruct or close it." : "This review follows your directive. Its recorded stage, rather than the directive alone, shows its progress."}</p></div> : null}
    </Sheet>
    <Sheet open={archive} onClose={() => setArchive(false)} title={`Closed ${words.noun}`} placement="wide"><ul className="inquiry-archive">{closed.map((row) => <li key={row.id}><strong>{row.subject}</strong><Tag>{row.stageWord}</Tag><span>{row.source} · Opened {row.opened}</span><p>{row.latest}</p></li>)}</ul></Sheet>
  </section>;
}
