import type { ReactNode } from "react";
import { inheritedRowsStillHeld, type Campaign, type EffectActor, type MetricSet } from "@admin/engine";
import { METRIC_MEANINGS, METRIC_PROVENANCE, formatMoney, formatRatio, nowReadings, place, recordRows } from "@admin/player-core";
import { Collection, Series } from "@admin/ui-web";
import { EntryRow, moveScales } from "../record/EntryRow";
import { toneOf, valenceOf } from "./valence";
import "./metric-reading.css";

/** The scale a reading is drawn on: its own span, so a quiet term still shows its moves; a ratio is rounded out to whole 5-point steps and money is padded a tenth either side, never below zero. */
function domainFor(metric: keyof MetricSet, values: readonly number[]): readonly [number, number] {
  if (metric === "treasury") {
    const low = Math.min(...values);
    const high = Math.max(...values);
    const pad = (high - low) * 0.1 || high * 0.05 || 1;
    return [Math.max(0, low - pad), high + pad];
  }
  const floor = Math.max(0, Math.floor(Math.min(...values) * 20) / 20);
  return [floor, Math.min(1, Math.max(Math.ceil(Math.max(...values) * 20) / 20, floor + 0.1))];
}

const say = (metric: keyof MetricSet) => (metric === "treasury" ? formatMoney : formatRatio);

/**
 * One national reading where it is decided: the settled figure and its move,
 * its week-by-week series with the inherited quarter set apart, and what it
 * means. The Brief, the Digest and this panel read the same `nowReadings`, so
 * the figure cannot differ between them.
 */
export function MetricReading({ campaign, metric, titleId, children }: { readonly campaign: Campaign; readonly metric: keyof MetricSet; readonly titleId: string; readonly children?: ReactNode }) {
  const reading = nowReadings(campaign).find((entry) => entry.key === metric);
  if (!reading) return null;
  const [low, high] = domainFor(metric, reading.trail);
  const format = say(metric);
  const valence = valenceOf(reading.stance);
  const week = reading.week;
  return (
    <section className="metric-panel" aria-labelledby={titleId}>
      <h2 id={titleId} className="metric-panel__title">
        {reading.label}
      </h2>
      <div className="metric-panel__read">
        <div className="metric-panel__figure">
          <p className="metric-panel__value ui-valence-ink" data-valence={valence}>
            {reading.figure}
          </p>
          {week ? (
            <p className="metric-panel__week ui-valence-ink" data-valence={week.direction === "flat" ? "neutral" : week.direction === "up" ? "good" : "bad"}>
              <span aria-hidden="true">{week.direction === "up" ? "▲" : week.direction === "down" ? "▼" : "▬"}</span> {week.text} <span className="metric-panel__period">on last week</span>
            </p>
          ) : (
            <p className="metric-panel__period">No closed week of this term yet.</p>
          )}
        </div>
        <Series
          label={`${reading.label}, week by week (scale ${format(low)} to ${format(high)})`}
          values={reading.trail}
          domain={[low, high]}
          format={format}
          splitAt={inheritedRowsStillHeld(campaign.turn)}
          splitLabel="the quarter before you took office"
          tone={toneOf(reading.stance)}
        />
      </div>
      <p className="metric-panel__note">{METRIC_MEANINGS[metric]}</p>
      {children}
      <p className="metric-panel__source">{METRIC_PROVENANCE[metric]}</p>
    </section>
  );
}

/**
 * The record's entries that moved one reading, newest first. Each row draws
 * only this reading's move, so every bar in the list is the same reading on one scale.
 */
export function MetricActs({ campaign, metric, actor, titleId, title, empty }: { readonly campaign: Campaign; readonly metric: keyof MetricSet; readonly actor?: EffectActor; readonly titleId: string; readonly title: string; readonly empty: string }) {
  const rows = recordRows(campaign, actor)
    .filter((row) => row.moves.some((move) => move.key === metric))
    .map((row) => ({ ...row, moves: row.moves.filter((move) => move.key === metric) }));
  const scales = moveScales(rows);
  return (
    <section className="metric-panel" aria-labelledby={titleId}>
      <h2 id={titleId} className="metric-panel__title">
        {title}
      </h2>
      <Collection items={rows} initial={6} noun="entries" as="ol" className="rec-rows" empty={empty} render={(row) => <EntryRow key={row.id} row={row} href={place.event(row.id)} scales={scales} />} />
    </section>
  );
}
