import { Card } from "@admin/ui-web";
import { EvidencePanel } from "@admin/ui-web";
import type { Campaign } from "@admin/engine";
import { METRIC_MEANINGS, METRIC_PROVENANCE, POSTURE_WORDS, formatRatio, place, recordRows, type ReadinessReading } from "@admin/player-core";
import { Bar, Collection, Gauge, Series } from "@admin/ui-web";
import { EntryRow, moveScales } from "../../record/EntryRow";
import { Door } from "../../shell/Door";
import { MoveText, toneOf } from "../../shell/valence";
import { PanelHeading, StatusChip } from "./parts";

const POSTURE_TONE = { routine: "good", heightened: "watch", surge: "bad" } as const;

/** The President's own entries that moved this reading, each drawn on one scale so equal bars are equal moves. */
function ActsThatMoved({ campaign }: { readonly campaign: Campaign }) {
  const rows = recordRows(campaign, "player")
    .filter((row) => row.moves.some((move) => move.key === "militaryReadiness"))
    .map((row) => ({ ...row, moves: row.moves.filter((move) => move.key === "militaryReadiness") }));
  const scales = moveScales(rows);
  return (
    <Collection
      items={rows}
      initial={5}
      noun="entries"
      as="ol"
      className="rec-rows"
      empty="None of your acts has moved it yet. The services and the world move it every week anyway."
      render={(row) => <EntryRow key={row.id} row={row} href={place.event(row.id)} scales={scales} />}
    />
  );
}

/** The weekly charge each raised command puts on the reading, on one scale so a surge reads three times a heightened posture. */
function Charges({ reading }: { readonly reading: ReadinessReading }) {
  const widest = Math.max(...reading.charges.map((charge) => charge.cost), 0);
  if (reading.charges.length === 0) return <p className="sec__note">Every command stands at routine, so nothing is being charged to readiness each week.</p>;
  return (
    <ul className="sec-charges" aria-label="Weekly readiness charged by each command above routine">
      {reading.charges.map((charge) => (
        <li key={charge.id} className="sec-charge ui-row-target">
          <Door href={charge.href} className="ui-row-link sec-charge__name">
            {charge.abbr}
          </Door>
          <StatusChip tone={POSTURE_TONE[charge.posture]}>{POSTURE_WORDS[charge.posture]}</StatusChip>
          <Bar value={widest > 0 ? charge.cost / widest : 0} tone={POSTURE_TONE[charge.posture]} slim />
          <span className="sec-charge__figure">−{(charge.cost * 100).toFixed(1)} pts a week</span>
        </li>
      ))}
    </ul>
  );
}

/**
 * Military readiness at home: the reading, its weeks, the one weekly charge the
 * desk can name exactly, and the President's acts that moved it. The Brief's
 * tile and every other link to the reading land here.
 */
export function Readiness({ campaign, reading }: { readonly campaign: Campaign; readonly reading: ReadinessReading }) {
  const { reading: now } = reading;
  const week = now.week;
  return (
    <Card role="region" id="sec-readiness" aria-labelledby="sec-readiness-title" tabIndex={-1} className="sec-panel">
      <PanelHeading id="sec-readiness-title" icon="shield">
        Military readiness
      </PanelHeading>
      <p className="sec__lead">{METRIC_MEANINGS.militaryReadiness}</p>
      <div className="sec-readiness__evidence">
      <div className="sec-readiness__head">
        <p className="sec-readiness__figure">
          <span className="sec-readiness__label">Available readiness</span>
          <span>{week ? <MoveText delta={week.direction === "flat" ? 0 : week.delta}>{week.text} this week</MoveText> : "No closed week of this term yet"}</span>
        </p>
        <div className="sec-readiness__gauge">
          <Gauge shape="ring" label="Military readiness" value={now.fraction} valueText={now.figure} tone={toneOf(now.stance)} />
        </div>
      </div>
      <Series label="Military readiness by week" values={now.trail} format={formatRatio} showDomain compact unitLabel="Readiness · 0–100%" splitAt={now.inherited} splitLabel="the quarter before you took office" />
      </div>
      <EvidencePanel title="Readiness evidence" label="Investigate readiness drivers">
      <h3 className="sec__subheading">What takes it down every week</h3>
      <Charges reading={reading} />
      {reading.weeklyCost > 0 ? <p className="sec__note">Together the postures take {(reading.weeklyCost * 100).toFixed(1)} points a week. Each command’s own page sets its posture.</p> : null}
      <p className="sec__note">Source: {METRIC_PROVENANCE.militaryReadiness}.</p>
      <h3 className="sec__subheading">What your acts did to it</h3>
      <ActsThatMoved campaign={campaign} />
      </EvidencePanel>
    </Card>
  );
}
