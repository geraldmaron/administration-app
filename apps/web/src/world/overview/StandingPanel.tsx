import { Card } from "@admin/ui-web";
import { useMemo } from "react";
import { inheritedRowsStillHeld, type Campaign } from "@admin/engine";
import { METRIC_MEANINGS, METRIC_PROVENANCE, formatDate, formatRatio, formatTrustBand, nowReadings, place, standingMoves, type WorldDesk } from "@admin/player-core";
import { Collection, Bar, Icon, Series } from "@admin/ui-web";
import { EntryRow, moveScales } from "../../record/EntryRow";
import { MoveText, toneOf, valenceOf } from "../../shell/valence";

/**
 * International Standing: the one reading that says how other governments see
 * the administration. Where it stands, its weekly course, what each side of
 * the ledger has done to it, and the Record entries that moved it.
 */
export function StandingPanel({ campaign, desk }: { readonly campaign: Campaign; readonly desk: WorldDesk }) {
  const reading = nowReadings(campaign).find((entry) => entry.key === "standing");
  const moves = useMemo(() => standingMoves(campaign), [campaign]);
  const scales = useMemo(() => moveScales(moves.rows), [moves]);
  if (!reading) return null;
  const history = [...campaign.player.metricHistory.map((row) => row.standing), reading.value];
  return (
    <Card role="region" id="wd-standing" aria-labelledby="wd-standing-title" tabIndex={-1} className="wd-panel wd-standing">
      <h2 id="wd-standing-title" className="wd-panel__title"><Icon name="graph" size={20} /> International Standing</h2>
      <p className="wd-lede">{METRIC_MEANINGS.standing}</p>
      <div className="wd-standing__grid">
        <div className="wd-standing__now">
          <p className="wd-standing__figure"><strong>{reading.figure}</strong><span>as of {formatDate(campaign.calendar)}</span></p>
          <p className="wd-muted">{reading.week ? <MoveText delta={reading.week.direction === "flat" ? 0 : reading.week.delta}>{reading.week.text} this week</MoveText> : "No closed week of this term yet"}</p>
          <Bar label={`International standing ${reading.figure}`} value={reading.fraction} tone={valenceOf(reading.stance)} />
          <dl className="wd-standing__tally">
            <div><dt>Moves that raised it</dt><dd className="ui-valence-ink" data-valence="good">{moves.lifted.text} <span>in {moves.lifted.count}</span></dd></div>
            <div><dt>Moves that cost it</dt><dd className="ui-valence-ink" data-valence="bad">{moves.cost.text} <span>in {moves.cost.count}</span></dd></div>
          </dl>
          <p className="wd-muted">{METRIC_PROVENANCE.standing}.</p>
        </div>
        <div className="wd-standing__charts">
          <Series label="International Standing by week" values={history} domain={[0, 1]} format={formatRatio} splitAt={inheritedRowsStillHeld(campaign.turn)} splitLabel="the quarter before you took office" tone={toneOf(reading.stance)} />
          {desk.trustSeries.length > 1 ? (
            <figure className="wd-standing__figure-chart">
              <figcaption>How the {desk.kpis.standing.read} governments the services read see you, on average</figcaption>
              <Series label="Average view of the United States by week" values={desk.trustSeries} domain={[0, 1]} format={formatTrustBand} />
            </figure>
          ) : null}
        </div>
      </div>
      <h3 className="wd-subtitle">What moved it</h3>
      <Collection
        items={moves.rows}
        initial={6}
        noun="entries"
        as="ol"
        className="rec-rows"
        empty="Nothing in the Record has moved it yet. The world moves it every week anyway."
        render={(row) => <EntryRow key={row.id} row={row} href={place.event(row.id)} scales={scales} />}
      />
    </Card>
  );
}
