import { useState } from "react";
import { Field, NativeSelect } from "@admin/ui-web";
import type { Campaign } from "@admin/engine";
import type { CrosstabGroup, CrosstabRow, OpinionTrends, TrendSeries } from "@admin/player-core";
import { Course, recordStartDate } from "./Course";
import { deltaValence, moveGlyph, percent, signedPoints, stanceValence } from "./draw";

type CutDomain = { readonly low: number; readonly high: number; readonly step: number };

const at = (value: number, domain: CutDomain): number => ((value - domain.low) / (domain.high - domain.low)) * 100;
const cellsOf = (domain: CutDomain): number => Math.round((domain.high - domain.low) / domain.step);

function ticks(domain: CutDomain): readonly number[] {
  return Array.from({ length: cellsOf(domain) + 1 }, (_, index) => domain.low + index * domain.step);
}

function Strip({ row, topline, domain }: { readonly row: CrosstabRow; readonly topline: number; readonly domain: CutDomain }) {
  const valence = stanceValence(row.stance);
  const from = at(Math.min(row.support, topline), domain);
  const to = at(Math.max(row.support, topline), domain);
  const cells = cellsOf(domain);
  return (
    <span className="elec-strip" data-valence={valence} style={{ "--cells": cells } as React.CSSProperties} aria-hidden="true">
      <span className="elec-strip__ref" style={{ insetInlineStart: `${at(topline, domain)}%` }} />
      <span className="elec-strip__stem" style={{ insetInlineStart: `${from}%`, inlineSize: `${to - from}%` }} />
      <span className="elec-strip__dot" style={{ insetInlineStart: `${at(row.support, domain)}%` }} />
    </span>
  );
}

function CutRow({ row, topline, domain, campaign, trends, series }: { readonly row: CrosstabRow; readonly topline: number; readonly domain: CutDomain; readonly campaign: Campaign; readonly trends: OpinionTrends; readonly series: TrendSeries | undefined }) {
  const valence = stanceValence(row.stance);
  const gap = row.support - topline;
  const share = row.share;
  return (
    <li className="elec-cut" data-valence={valence}>
      <p className="elec-cut__name">{row.name}</p>
      <p className="elec-cut__share">
        <span className="elec-minibar" aria-hidden="true">
          <span style={{ inlineSize: `${(share ?? 0) * 100}%` }} />
        </span>
        <span className="elec-cut__share-figure">
          {share === undefined ? "Not recorded" : percent(share)}
          {share === undefined ? null : <span className="elec-cut__share-label"> of the country</span>}
        </span>
      </p>
      <Strip row={row} topline={topline} domain={domain} />
      <p className="elec-figure ui-valence-ink" data-valence={valence}>
        {row.figure}
        <span className="ui-visually-hidden">, {row.word}</span>
      </p>
      <p className="elec-cut__gap ui-valence-ink" data-valence={deltaValence(gap)}>
        {moveGlyph(gap)} {signedPoints(gap)}
        <span className="ui-visually-hidden"> against the country</span>
      </p>
      <Course campaign={campaign} start={trends.start} series={series} label={`${row.name}, week by week`} quiet />
    </li>
  );
}

function spread(group: CrosstabGroup): number {
  const values = group.rows.map((row) => row.support);
  return Math.max(...values) - Math.min(...values);
}

/**
 * The ten ways a pollster cuts the country, on one shared axis. Each group's
 * dot is where it stands, the vertical line is the country across the cuts, and
 * the stem between them is the gap. The bar beside a name is its share of the country.
 */
export function Cuts({ groups, topline: reference, campaign, trends, selectedGroup, onGroup }: { readonly selectedGroup?: string | undefined; readonly onGroup?: ((group: string) => void) | undefined; readonly groups: readonly CrosstabGroup[]; readonly topline: number; readonly campaign: Campaign; readonly trends: OpinionTrends }) {
  const [selected, setSelected] = useState(groups[0]?.id ?? "");
  const active = groups.find((group) => group.id === (selectedGroup ?? selected)) ?? groups[0];
  if (!active) return null;
  const recordShort = !trends.start.fromOath || [...trends.cohorts].every((series) => series.points.length < 2);
  const courses = new Map(trends.cohorts.map((series) => [series.id, series] as const));
  const domain: CutDomain = { low: 0, high: 1, step: 0.1 };
  return (
    <section className="elec-panel elec-cuts" aria-labelledby="elec-cuts">
      <h2 id="elec-cuts" className="elec-panel__title">
        Community comparison
      </h2>
      <Field label="Compare communities by" hint="Each category is a different view of the same country. Categories overlap; do not add their population shares together.">{(control) => <NativeSelect {...control} value={active.id} onChange={(event) => { setSelected(event.target.value); onGroup?.(event.target.value); }}>{groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}</NativeSelect>}</Field>
      <p className="elec-note">Support uses the full 0–100% range. The vertical marker shows national approval at {percent(reference)}; the short connecting line shows each community's gap.</p>
      <div className="elec-cuts__axis elec-cut" aria-hidden="true">
        <span className="elec-cuts__axis-label">Group</span>
        <span className="elec-cuts__axis-label">Share of country</span>
        <span className="elec-cuts__ticks">
          {ticks(domain).map((tick, index, all) => (
            <span key={tick} className="elec-cuts__tick" data-edge={index === 0 ? "start" : index === all.length - 1 ? "end" : undefined} style={{ insetInlineStart: `${at(tick, domain)}%` }}>
              {Math.round(tick * 100)}%
            </span>
          ))}
        </span>
        <span className="elec-cuts__axis-label elec-cuts__axis-label--end">Support</span>
        <span className="elec-cuts__axis-label elec-cuts__axis-label--end">Vs country</span>
        <span className="elec-cuts__axis-label">Course</span>
      </div>
      {[active].map((group) => (
        <div key={group.id} className="elec-cutgroup">
          <h3 className="elec-cutgroup__title">
            {group.name}
            <span className="elec-cutgroup__spread">Spread {Math.round(spread(group) * 100)} {Math.round(spread(group) * 100) === 1 ? "pt" : "pts"}</span>
          </h3>
          <ul className="elec-cutlist" aria-label={group.name}>
            {group.rows.map((row) => (
              <CutRow key={row.id} row={row} topline={reference} domain={domain} campaign={campaign} trends={trends} series={courses.get(row.id)} />
            ))}
          </ul>
        </div>
      ))}
      <p className="elec-note">
        {recordShort ? `The course column draws from the weeks recorded so far; the record starts ${recordStartDate(campaign, trends.start)}. ` : ""}The line in each strip is the country across these cuts, {percent(reference)}. Every group is the national mood read through that group's own priorities, plus what it remembers of this administration, so a gap here is about the group and not a second poll. The scale is in steps of {Math.round(domain.step * 100)} points and starts at {percent(domain.low)}; it is the same in every strip.
      </p>
    </section>
  );
}
