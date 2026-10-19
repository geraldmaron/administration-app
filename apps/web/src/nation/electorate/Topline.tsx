import { useState } from "react";
import type { Campaign } from "@admin/engine";
import { Series, Sheet, Tag } from "@admin/ui-web";
import { approvalBreakdown, nowReadings, type ApprovalDrag, type BlocTopline, type JudgmentReading, type JudgmentRow, type OpinionTrends, type ToplineView } from "@admin/player-core";
import { Blocs } from "./Blocs";
import { Course } from "./Course";
import { ApprovalRuler, ReadingBar, deltaValence, percent, signedPoints, stanceValence } from "./draw";

type JudgmentProps = {
  readonly row: JudgmentRow;
  readonly campaign: Campaign;
  readonly trends: OpinionTrends;
  readonly drag: ApprovalDrag | undefined;
  /** Where the country's board is taking this judgment, and why the week made it louder. */
  readonly outlook: JudgmentReading | undefined;
};

function Judgment({ row, campaign, trends, drag, outlook }: JudgmentProps) {
  const [open, setOpen] = useState(false);
  const valence = stanceValence(row.stance);
  const target = outlook && Math.abs(outlook.target - outlook.value) >= 0.005 ? outlook.target : undefined;
  return (
    <li className="opinion-judgment ui-card-door" data-valence={valence}>
      <h4><button type="button" className="ui-card-door__link" onClick={() => setOpen(true)} aria-haspopup="dialog">{row.label}</button></h4>
      <strong className="opinion-judgment__figure ui-valence-ink" data-valence={valence}>{row.figure}<small>{row.word}</small></strong>
      <ReadingBar value={row.value} valence={valence} {...(target === undefined ? {} : { target })} />
      <span className="opinion-judgment__weight">{percent(row.weight)} of this week's judgment</span>
      {row.salient ? <Tag tone="caution">In focus this week</Tag> : null}
      {drag ? <Tag tone="risk">Falling fastest</Tag> : null}
      <Course campaign={campaign} start={trends.start} series={trends.judgments.find((series) => series.id === row.driver)} label={`${row.label}, week by week`} />
      <Sheet open={open} onClose={() => setOpen(false)} title={row.label} lead={row.meaning} placement="side">
        <ReadingBar value={row.value} valence={valence} {...(target === undefined ? {} : { target })} />
        <p><strong>{row.figure}</strong> · {row.word}{target === undefined ? "" : ` · heading to ${percent(target)}`}</p>
        <p>{percent(row.weight)} of the overall judgment this week. The six weights sum to 100%.</p>
        {row.causeDetail ? <p>{row.causeDetail}</p> : null}
        {outlook && outlook.louder.length > 0 ? <p>In focus this week: {outlook.louder.join("; ")}.</p> : null}
        {drag ? <p>Falling fastest: {drag.cause}.</p> : null}
        <Course campaign={campaign} start={trends.start} series={trends.judgments.find((series) => series.id === row.driver)} label={`${row.label}, week by week`} />
      </Sheet>
    </li>
  );
}

/** The settled figure is the series' own last point, so the headline, the line and the Brief can never disagree. */
export function settledApproval(topline: ToplineView, campaign: Campaign): number {
  return topline.series[topline.series.length - 1] ?? campaign.player.metrics.approval;
}

/**
 * Approval in one place: the settled figure every screen quotes, the tracking
 * poll drawn as a sample of it with its error, the term's series, the three
 * blocs it adds up to and the six judgments behind it, each with what the week
 * weighs it at.
 */
export function Topline({ topline, blocs, campaign, trends }: { readonly topline: ToplineView; readonly blocs: BlocTopline; readonly campaign: Campaign; readonly trends: OpinionTrends }) {
  const { poll, series, inherited, sinceOath, judgments } = topline;
  const headline = nowReadings(campaign).find((reading) => reading.key === "approval");
  const settled = settledApproval(topline, campaign);
  const stance = headline?.stance ?? "neutral";
  const valence = stanceValence(stance);
  const breakdown = approvalBreakdown(campaign);
  const drag = breakdown.drag;
  const low = Math.min(...series);
  const high = Math.max(...series);
  // The scale is the series' own span, rounded out to whole points and named in the label, so a quiet term still shows its moves.
  const floor = Math.max(0, Math.floor(low * 20) / 20);
  const domain: readonly [number, number] = [floor, Math.min(1, Math.max(Math.ceil(high * 20) / 20, floor + 0.1))];
  return (
    <section className="elec-panel" aria-labelledby="elec-topline">
      <h2 id="elec-topline" className="elec-panel__title">
        Approval, settled and sampled
      </h2>
      <div className="elec-topline">
        <div className="elec-topline__read">
          <ApprovalRuler settled={settled} valence={valence} poll={poll} />
          <ul className="elec-legend" aria-label="What the two marks on the bar are">
            <li>
              <span className="elec-key elec-key--settled ui-valence-ink" data-valence={valence} aria-hidden="true" />
              <span>
                <strong>Approval {percent(settled)}</strong> is the settled figure the Brief and removal pressure all use.
              </span>
            </li>
            <li>
              <span className="elec-key elec-key--poll" aria-hidden="true" />
              <span>
                <strong>
                  This week's poll {poll.figure} {poll.margin}
                </strong>{" "}
                is a sample of it: {poll.range}.
              </span>
            </li>
          </ul>
        </div>
        <div className="elec-topline__series">
          <Series label={`Approval, settled, week by week (scale ${percent(domain[0])} to ${percent(domain[1])})`} values={series} domain={domain} format={percent} splitAt={inherited} splitLabel="the predecessor's quarter, reconstructed" />
          {sinceOath !== undefined ? (
            <p className="elec-topline__since ui-valence-ink" data-valence={deltaValence(sinceOath)}>
              {signedPoints(sinceOath)} since the oath
            </p>
          ) : (
            <p className="elec-note">No governed week has closed yet, so there is no change to draw.</p>
          )}
        </div>
      </div>
      <Blocs blocs={blocs} valence={valence} campaign={campaign} trends={trends} />
      <h3 className="elec-subtitle">The six judgments</h3>
      <p className="elec-note">Select a judgment to inspect its meaning, modeled direction and recorded course. Weights explain its contribution to the headline.</p>
      <ul className="opinion-judgments" aria-label="The six judgments approval is made of">
        {judgments.map((row) => <Judgment key={row.driver} row={row} campaign={campaign} trends={trends} drag={drag?.driver === row.label ? drag : undefined} outlook={breakdown.judgments.find((entry) => entry.driver === row.driver)} />)}
      </ul>
      <p className="elec-note">Hairlines mark the 25, 45 and 65 percent cuts between the bands; a bright tick marks where a judgment is heading. Weights sum to 100 percent.</p>
    </section>
  );
}
