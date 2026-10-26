import { useMemo, useState } from "react";
import type { Campaign } from "@admin/engine";
import { agenda, buildCalendar, calendarMonth, formatDate, termTimeline, type CalendarEvent } from "@admin/player-core";
import { Agenda, Button, Column, MONTH_KEY, MonthGrid, Page, ReadingFrame, Row, Section, Segmented, TERM_KEY, TermTimeline, Text, type AgendaDayView } from "@admin/ui";
import { useOpenAuthority } from "../../../src/law/AuthorityProvider";
import { dateKey, dayLabel, eventRow, relativeDays } from "../../../src/calendar/rows";
import { InTerm } from "../../../src/shell/InTerm";
import { go } from "../../../src/shell/navigate";
import { refDoors } from "../../../src/shell/RefDoors";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"] as const;

function useAgendaDays(campaign: Campaign, events: readonly CalendarEvent[], days: number, onlyKey?: string): readonly AgendaDayView[] {
  const openAuthority = useOpenAuthority();
  const actions = { go, cite: openAuthority, refs: (event: CalendarEvent) => refDoors(campaign, event.entityRefs) };
  return agenda(events, campaign.calendar, days)
    .filter((day) => !onlyKey || dateKey(day.date) === onlyKey)
    .map((day) => ({ key: dateKey(day.date), label: dayLabel(day.date), relative: relativeDays(campaign, day.date), rows: day.events.map((event) => eventRow(event, actions)) }));
}

function Term({ campaign }: { readonly campaign: Campaign }) {
  const term = termTimeline(campaign);
  return (
    <ReadingFrame title="Where you are in your term" unit="Days of a four-year term" period="From the oath to the last day" legend={TERM_KEY} help={{ meaning: "The track is your whole term, from the oath to the last day. The gold part is the time you have already served. Each marker is a date that matters, such as an election or a milestone, and its name and date sit beside it.", steps: ["Find where the gold ends. That is today.", "Markers to the right are still ahead. Hollow markers to the left have passed."] }}>
      <TermTimeline
        title={`Term ${term.termNumber}`}
        progress={term.progress}
        caption={`Day ${term.dayOfTerm} · ${term.daysLeft} days left · ends ${formatDate(term.end)}`}
        marks={term.marks.map((mark) => ({ id: mark.kind, label: mark.label, dateLabel: formatDate(mark.date), position: mark.position, past: mark.past }))}
        keyed={false}
      />
    </ReadingFrame>
  );
}

function MonthView({ campaign, events }: { readonly campaign: Campaign; readonly events: readonly CalendarEvent[] }) {
  const [cursor, setCursor] = useState({ year: campaign.calendar.year, month: campaign.calendar.month });
  const [selected, setSelected] = useState(dateKey(campaign.calendar));
  const month = calendarMonth(events, cursor.year, cursor.month);
  const today = dateKey(campaign.calendar);
  const step = (by: number) => setCursor(({ year, month: m }) => ({ year: year + Math.floor((m - 1 + by) / 12), month: ((((m - 1 + by) % 12) + 12) % 12) + 1 }));
  const weeks = month.weeks.map((week) => week.map((day) => ({ key: dateKey(day.date), day: day.date.day, inMonth: day.inMonth, today: dateKey(day.date) === today, marks: day.events.map((event) => ({ id: event.id, urgency: event.urgency })) })));
  const days = useAgendaDays(campaign, events, 4000, selected).filter((day) => day.key === selected);
  return (
    <Column gap="md">
      <Row between>
        <Button kind="quiet" size="compact" icon="return" label="Previous month" onPress={() => step(-1)} />
        <Text variant="title">
          {MONTHS[cursor.month - 1]} {cursor.year}
        </Text>
        <Button kind="quiet" size="compact" icon="chevron" label="Next month" onPress={() => step(1)} />
      </Row>
      <ReadingFrame title={`Dated matters in ${MONTHS[cursor.month - 1]} ${cursor.year}`} unit="One mark for each dated matter" period={`${MONTHS[cursor.month - 1]} ${cursor.year}`} legend={MONTH_KEY} pressHint="Press a day to see what falls on it." help={{ meaning: "Each day shows a mark for every dated matter that falls on it. The shape and color say how much it matters. A square stops time, a dot needs your answer and a ring is only on the calendar. Today is filled in blue." }}>
        <MonthGrid weekdays={WEEKDAYS} weeks={weeks} selected={selected} onSelect={setSelected} keyed={false} />
      </ReadingFrame>
      <Agenda days={days} empty="Nothing is scheduled for this day." />
    </Column>
  );
}

function CalendarScreen({ campaign }: { readonly campaign: Campaign }) {
  const [view, setView] = useState<"agenda" | "month">("agenda");
  const events = useMemo(() => buildCalendar(campaign), [campaign]);
  const upcoming = useAgendaDays(campaign, events, 120);
  const hard = events.filter((event) => event.urgency === "hard").length;
  return (
    <Page
      eyebrow="Office of the Staff Secretary"
      icon="schedule"
      title="Calendar"
      lede={`${events.length} dates to watch before your term ends${hard ? `. ${hard} of them ${hard === 1 ? "pauses" : "pause"} time when ${hard === 1 ? "it arrives" : "they arrive"}` : ""}.`}
      actions={<Segmented label="Show" options={[{ value: "agenda", label: "Agenda", icon: "ballot" }, { value: "month", label: "Month", icon: "schedule" }]} value={view} onChange={setView} />}
    >
      <Term campaign={campaign} />
      {view === "agenda" ? (
        <Section id="next-120-days" icon="schedule" title="Next 120 days" helper="Dated matters, soonest first.">
          <Agenda days={upcoming} empty="Nothing is coming up in the next 120 days." />
        </Section>
      ) : (
        <MonthView campaign={campaign} events={events} />
      )}
    </Page>
  );
}

export default function CalendarRoute() {
  return <InTerm>{(campaign) => <CalendarScreen campaign={campaign} />}</InTerm>;
}
