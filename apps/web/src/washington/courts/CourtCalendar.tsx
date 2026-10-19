import { COURT_HORIZON_WEEKS, type CourtEvent, type CourtEventKind, type CourtSystem } from "@admin/player-core";
import { HelpTip } from "@admin/ui-web";
import { useMediaQuery } from "../../app/display";
import { Door } from "../../shell/Door";
import { useDrawnLinks } from "../../shell/drawn-links";
import type { CourtSelection } from "./CircuitChips";
import { weeksWords } from "./court-words";

const KIND_WORDS: Readonly<Record<CourtEventKind, string>> = {
  response: "Your answer is due",
  step: "Next step on the court's calendar",
  argument: "Argument before the Supreme Court",
  "opinion-target": "Usual late-June opinion target",
};

const ROW: Readonly<Record<CourtEventKind, number>> = { response: 34, step: 58, argument: 82, "opinion-target": 82 };

/** The chart's width in its own units: a phone draws it narrower so its words stay at reading size. */
function scaleFor(compact: boolean) {
  const width = compact ? 400 : 1000;
  return { width, x: (weeks: number): number => 12 + (Math.min(Math.max(weeks, 0), COURT_HORIZON_WEEKS) / COURT_HORIZON_WEEKS) * (width - 24) };
}

/**
 * The coming year as the courts will spend it: the October term shaded, each
 * dated event placed on its week, the President's own deadlines on the top
 * row. Only dates the record holds appear; a stay decision with no date is
 * said in words beside its case, not drawn here.
 */
export function CourtCalendar({ system, selection }: { readonly system: CourtSystem; readonly selection: CourtSelection }) {
  const ahead = system.events.filter((event) => event.weeks <= COURT_HORIZON_WEEKS);
  const later = system.events.length - ahead.length;
  const compact = useMediaQuery("(max-width: 47.99em)");
  const { width, x } = scaleFor(compact);
  const open = useDrawnLinks();
  return (
    <section className="court-panel court-calendar" aria-labelledby="court-calendar-title">
      <div className="court-panel__title">
        <h2 id="court-calendar-title">The year ahead</h2>
        <HelpTip label="About the court calendar">The Supreme Court hears ordinary arguments in its October term and usually issues opinions by late June; emergency applications are decided at any time. Only dates the record holds are drawn.</HelpTip>
      </div>
      <svg className="court-calendar__chart" viewBox={`0 0 ${width} 112`} role="img" aria-label={`${ahead.length} dated court events in the next ${COURT_HORIZON_WEEKS} weeks`} onClick={open}>
        {system.terms.map((term) => (
          <g key={term.label}>
            <rect x={x(term.start.weeks)} y="14" width={Math.max(0, x(term.end.weeks) - x(term.start.weeks))} height="84" className="court-calendar__term" />
            <text x={x(Math.max(term.start.weeks, 0)) + 6} y="26" className="court-calendar__term-label">{compact ? `OT ${term.label.slice(-4)}` : term.label}</text>
          </g>
        ))}
        {system.months.map((month, index) => (
          <g key={`${month.label}:${month.weeks}`}>
            <line x1={x(month.weeks)} x2={x(month.weeks)} y1="96" y2="100" className="court-calendar__tick" />
            {!compact || index % 3 === 0 ? <text x={x(month.weeks)} y="110" className="court-calendar__axis" textAnchor="middle">{month.label}</text> : null}
          </g>
        ))}
        <line x1={x(0)} x2={x(0)} y1="10" y2="100" className="court-calendar__today" />
        {ahead.map((event) => (
          <a key={`${event.caseId}:${event.kind}`} href={event.href} tabIndex={-1} className="court-calendar__event" data-kind={event.kind} data-dimmed={selection.caseId && selection.caseId !== event.caseId ? "true" : undefined}>
            <EventMark event={event} cx={x(event.weeks)} />
            <title>{`${event.date}: ${event.title}`}</title>
          </a>
        ))}
      </svg>
      {system.events.length === 0 ? (
        <p className="court-empty">No court date is set.</p>
      ) : (
        <ol className="court-calendar__list">
          {system.events.map((event) => (
            <li key={`${event.caseId}:${event.kind}`} data-kind={event.kind} data-selected={selection.caseId === event.caseId ? "true" : undefined}>
              <Door href={event.href} className="justice-agenda-row"><span className="court-calendar__when">
                <strong>{event.date}</strong> <span>{weeksWords(event.weeks)}</span>
              </span>
              <span className="court-calendar__what">
                <span className="court-calendar__glyph" aria-hidden="true" />
                <small>{KIND_WORDS[event.kind]}</small><strong>{event.title}</strong>
              </span></Door>
            </li>
          ))}
        </ol>
      )}
      {later > 0 ? <p className="nation-note">{later} {later === 1 ? "date falls" : "dates fall"} beyond the chart&rsquo;s year and {later === 1 ? "is" : "are"} listed above.</p> : null}
    </section>
  );
}

function EventMark({ event, cx }: { readonly event: CourtEvent; readonly cx: number }) {
  const cy = ROW[event.kind];
  if (event.kind === "response") return <polygon points={`${cx},${cy - 9} ${cx + 9},${cy} ${cx},${cy + 9} ${cx - 9},${cy}`} className="court-calendar__mark" />;
  if (event.kind === "opinion-target") return <rect x={cx - 7} y={cy - 7} width="14" height="14" className="court-calendar__mark" />;
  return <circle cx={cx} cy={cy} r="7" className="court-calendar__mark" />;
}
