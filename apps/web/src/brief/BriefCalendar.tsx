import { useState } from "react";
import type { Campaign, GameDate } from "@admin/engine";
import { formatDate, runningClocks } from "@admin/player-core";
import { Button, Icon, Tag } from "@admin/ui-web";
import { Door } from "../shell/Door";
import "./calendar.css";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const dateKey = (date: GameDate) => `${date.year}-${date.month}-${date.day}`;
const fromUTC = (date: Date): GameDate => ({ year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate() });

/** Actual institutional dates, with no invented presidential appointments. */
export function BriefCalendar({ campaign }: { readonly campaign: Campaign }) {
  const [month, setMonth] = useState({ year: campaign.calendar.year, month: campaign.calendar.month });
  const [selected, setSelected] = useState(campaign.calendar);
  const clocks = runningClocks(campaign).filter((clock) => clock.due !== undefined);
  const first = new Date(Date.UTC(month.year, month.month - 1, 1));
  const count = new Date(Date.UTC(month.year, month.month, 0)).getUTCDate();
  const cells = Array.from({ length: Math.ceil((first.getUTCDay() + count) / 7) * 7 }, (_, index) => fromUTC(new Date(Date.UTC(month.year, month.month - 1, index - first.getUTCDay() + 1))));
  const events = clocks.filter((clock) => dateKey(clock.due!) === dateKey(selected));
  const shift = (step: number) => setMonth(fromUTC(new Date(Date.UTC(month.year, month.month - 1 + step, 1))));
  return (
    <section className="brief-calendar" aria-labelledby="brief-calendar-title">
      <div className="brief-calendar__month">
        <header className="brief-calendar__toolbar">
          <h2 id="brief-calendar-title">{first.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" })}</h2>
          <div>
            <Button kind="ghost" aria-label="Previous month" onClick={() => shift(-1)}>‹</Button>
            <Button kind="secondary" onClick={() => { setMonth(campaign.calendar); setSelected(campaign.calendar); }}>Today</Button>
            <Button kind="ghost" aria-label="Next month" onClick={() => shift(1)}>›</Button>
          </div>
        </header>
        <div className="brief-calendar__grid" role="group" aria-label="Calendar dates">
          {WEEKDAYS.map((day) => <span key={day} className="brief-calendar__weekday">{day}</span>)}
          {cells.map((date) => {
            const due = clocks.filter((clock) => dateKey(clock.due!) === dateKey(date));
            return <button type="button" key={dateKey(date)} aria-pressed={dateKey(date) === dateKey(selected)} aria-current={dateKey(date) === dateKey(campaign.calendar) ? "date" : undefined} data-outside={date.month !== month.month ? "true" : undefined} onClick={() => setSelected(date)} aria-label={`${formatDate(date)}, ${due.length} scheduled ${due.length === 1 ? "item" : "items"}`}>
              <span>{date.day}</span>
              {due.length > 0 ? <span className="brief-calendar__event"><Icon name="pending" size={12} /><span>{due.length} due</span></span> : null}
            </button>;
          })}
        </div>
      </div>
      <section className="brief-calendar__agenda" aria-labelledby="brief-agenda-date">
        <h3 id="brief-agenda-date">{formatDate(selected)}</h3>
        <p className="brief-section__note">Effective dates and institutional review windows recorded by the simulation.</p>
        {events.length === 0 ? <p>No recorded deadline on this date.</p> : <ul>{events.map((clock) => <li key={clock.id}><Door className="brief-calendar__appointment" href={clock.href}><Tag tone={clock.urgency === "due" ? "risk" : "neutral"} icon="pending">{clock.urgency === "due" ? "Due" : "Scheduled"}</Tag><strong>{clock.title}</strong><span className="brief-calendar__event-note">{clock.line}</span><Icon name="chevron" size={16} /></Door></li>)}</ul>}
      </section>
    </section>
  );
}
