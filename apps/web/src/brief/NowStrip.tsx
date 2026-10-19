import { useState } from "react";
import type { Campaign } from "@admin/engine";
import { approvalBreakdown, formatMoney, formatDate, nowReadings, place, type NowReading } from "@admin/player-core";
import { Bar, Button, Icon, Series, Sparkline, Tag, type IconName } from "@admin/ui-web";
import { Door } from "../shell/Door";
import { valenceOf } from "../shell/valence";

const GLYPH: Readonly<Record<NowReading["key"], IconName>> = {
  approval: "ballot",
  treasury: "budget",
  stability: "building",
  militaryReadiness: "shield",
  standing: "world",
};

const UNIT: Readonly<Record<NowReading["key"], string>> = {
  approval: "% of Americans approving",
  treasury: "dollars Congress has given you to spend",
  stability: "% on a scale of calm and order",
  militaryReadiness: "% on a scale of readiness",
  standing: "% on a scale of how others see you",
};

const ARROW = { up: "▲", down: "▼", flat: "" } as const;
/** Every reading here is better higher, so a rise is in the President's favor. */
const MOVE_VALENCE = { up: "good", down: "bad", flat: "neutral" } as const;

/** The week's move, signed by its arrow: "▲ 0.7 pts". The section says once that it is week on week. */
function Change({ reading }: { readonly reading: NowReading }) {
  if (!reading.week) return <span className="now__week">—</span>;
  const { direction, text } = reading.week;
  if (direction === "flat") return <span className="now__week" data-direction="flat">Flat</span>;
  return (
    <span className="now__week ui-valence-ink" data-direction={direction} data-valence={MOVE_VALENCE[direction]}>
      <span aria-hidden="true">{ARROW[direction]}</span> {text.replace(/^[+−-]/, "")}
      <span className="ui-visually-hidden"> {direction === "up" ? "up" : "down"} this week</span>
    </span>
  );
}

/** Only a reading that needs attention is flagged; a sound one says so by its color and line. */
function Flagged({ reading }: { readonly reading: NowReading }) {
  if (reading.stance === "adverse") return <Tag tone="risk">Low</Tag>;
  if (reading.stance === "caution") return <Tag tone="caution">Watch</Tag>;
  return null;
}

/**
 * The national condition in one surface: five readings, each with its value,
 * unit, period and the week's move, opening its own page. Approval's cause
 * is named beneath when something is dragging it.
 */
export function NowStrip({ campaign }: { readonly campaign: Campaign }) {
  const readings = nowReadings(campaign);
  const drag = approvalBreakdown(campaign).drag;
  const [key, setKey] = useState<NowReading["key"]>("approval");
  const selected = readings.find((reading) => reading.key === key) ?? readings[0]!;
  return (
    <section className="now" aria-labelledby="now-title">
      <h2 id="now-title" className="brief-section__title">
        <Icon name="active" size={20} /> National condition
      </h2>
      <p className="brief-section__note">As of {formatDate(campaign.calendar)}, with each reading's move since last week.</p>
      <ul className="now__list">
        {readings.map((reading) => (
          <li key={reading.key} className="now__row ui-row-target" data-stance={reading.stance}>
            <span className="now__label">
              <Door href={reading.key === "approval" ? place.electorate() : reading.href} className="now__name ui-row-link text-foreground no-underline hover:no-underline" aria-label={`${reading.label}, ${UNIT[reading.key]}: open its history and drivers`}>
                <Icon name={GLYPH[reading.key]} size={18} /> {reading.label}
              </Door>
              <Flagged reading={reading} />
            </span>
            <span className="now__figure ui-valence-ink" data-valence={valenceOf(reading.stance)} title={UNIT[reading.key]}>{reading.figure}</span>
            <Bar value={reading.fraction} tone={valenceOf(reading.stance)} mode="level" slim />
            <Sparkline values={reading.trail} splitAt={reading.inherited} valence={valenceOf(reading.stance)} />
            <Change reading={reading} />
          </li>
        ))}
      </ul>
      <div className="now-history">
        <div className="now-history__choices" role="group" aria-label="Explore national history">{readings.map((reading) => <Button key={reading.key} kind={reading.key === key ? "primary" : "secondary"} size="sm" aria-pressed={reading.key === key} onClick={() => setKey(reading.key)}><Icon name={GLYPH[reading.key]} size={16} />{reading.label}</Button>)}</div>
        <div className="now-history__evidence ui-card-door"><Series key={selected.key} label={`${selected.label}: recorded readings`} values={selected.trail} domain={selected.key === "treasury" ? [Math.min(0, ...selected.trail), Math.max(1, ...selected.trail)] : [0, 1]} format={selected.key === "treasury" ? formatMoney : (value) => `${Math.round(value * 100)}%`} unitLabel={selected.key === "treasury" ? "Available spending authority · US dollars" : UNIT[selected.key]} showDomain splitAt={selected.inherited} splitLabel="the inherited quarter" /><Door className="now-history__destination ui-card-door__link" href={selected.key === "approval" ? place.electorate() : selected.href} aria-label={`${selected.label}: open the underlying evidence and drivers`}><Icon name="chevron" size={16} /> {selected.label} evidence</Door></div>
      </div>
      {drag ? (
        <p className="now__drag">
          <Icon name="adverse" size={16} /> Pulling approval down: {drag.cause.toLowerCase()}, through {drag.driver.toLowerCase()}.
        </p>
      ) : null}
    </section>
  );
}
