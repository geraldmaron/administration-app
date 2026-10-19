import type { ReactNode } from "react";
import type { ProjectRow, ProjectsReading, ServiceRow, ServiceTone, ServicesReading } from "@admin/player-core";
import { HelpTip, Collection, SortHeader, SortPicker, sortRows, useSort, type SortOption, type SortValue } from "@admin/ui-web";
import { Door } from "../../shell/Door";
import { InstitutionMark } from "./StaffingBadge";
import "../congress/tables.css";
import "./services.css";

const SIGNS: Readonly<Record<ServiceTone, string>> = { good: "✓", watch: "⚠", bad: "▼", neutral: "" };

/** Worst first when sorted ascending, so a status column opens on what needs a President. */
const TONE_RANK: Readonly<Record<ServiceTone, number>> = { bad: 0, watch: 1, neutral: 2, good: 3 };

const pct = (value: number) => `${Math.round(value * 100)}%`;
const weeks = (value: number) => (value < 10 ? value.toFixed(1) : `${Math.round(value)}`);

function Status({ tone, label }: { readonly tone: ServiceTone; readonly label: string }) {
  return (
    <span className="ui-valence-chip" data-valence={tone}>
      {SIGNS[tone] ? `${SIGNS[tone]} ` : ""}
      {label}
    </span>
  );
}

/** What a screen reader hears for one bar: how much is waiting and how long. */
function spoken(row: ServiceRow): string {
  const ages = row.ages.map((age) => `${age.label.toLowerCase()}: ${weeks(age.weeks)} weeks of intake${age.late ? ", late" : ""}`).join("; ");
  return `${weeks(row.pendingWeeks)} weeks of intake waiting. ${ages}.`;
}

/**
 * What is waiting, stacked by how long it has waited, on one scale for every
 * row so the services compare: the cases still within their standard in blue,
 * the late ones in amber, and those waiting half a year or more in red.
 */
function AgeBar({ row, scale }: { readonly row: ServiceRow; readonly scale: number }) {
  return (
    <span className="exec-services__bar" role="img" aria-label={spoken(row)}>
      {row.ages.map((age) =>
        age.weeks > 0 ? <span key={age.key} data-age={age.key} data-late={age.late ? "true" : undefined} title={`${age.label}: ${weeks(age.weeks)} weeks of intake`} style={{ inlineSize: `${(age.weeks / scale) * 100}%` }} /> : null,
      )}
    </span>
  );
}

function Name({ href, emblem, name, department, children }: { readonly href: string; readonly emblem: string; readonly name: string; readonly department: string; readonly children?: ReactNode }) {
  return (
    <span className="exec-services__name">
      <InstitutionMark institution={department} emblem={emblem} size={28} />
      <span>
        {href ? (
          <Door href={href} className="ui-row-link">
            {name}
          </Door>
        ) : (
          name
        )}
        {children}
      </span>
    </span>
  );
}

type ServiceKey = "service" | "status" | "waiting" | "late" | "wrong" | "refused";

const SERVICE_OPTIONS: readonly SortOption<ServiceKey>[] = [
  { key: "status", label: "Status" },
  { key: "waiting", label: "Weeks waiting" },
  { key: "late", label: "Late" },
  { key: "wrong", label: "Decided wrong" },
  { key: "refused", label: "Refused" },
  { key: "service", label: "Service" },
];

const SERVICE_VALUE: Readonly<Record<ServiceKey, (row: ServiceRow) => SortValue>> = {
  service: (row) => row.name,
  status: (row) => TONE_RANK[row.tone],
  waiting: (row) => (row.status === "opening" ? undefined : row.pendingWeeks),
  late: (row) => (row.status === "opening" ? undefined : row.lateShare),
  wrong: (row) => row.wrongShare,
  refused: (row) => row.refusedShare,
};

function rate(value: number | undefined) {
  return value === undefined ? <span className="cell-quiet">—</span> : pct(value);
}

function ServiceLine({ row, scale }: { readonly row: ServiceRow; readonly scale: number }) {
  const opening = row.status === "opening";
  return (
    <tr className="ui-row-target exec-services__row" data-tone={row.tone}>
      <th scope="row" data-label="Service">
        <Name href={row.href} emblem={row.emblem} name={row.name} department={row.department}>
          <span className="data-table__sub">{row.owner === row.department ? row.department : `${row.department} · ${row.owner}`}</span>

          {opening || row.status === "keeping-up" ? null : (
            <HelpTip label={`Service response: ${row.name}`}><p>{row.why}</p><p>{row.action}</p></HelpTip>
          )}
        </Name>
      </th>
      <td data-label="Status">
        <Status tone={row.tone} label={row.statusLabel} />
      </td>
      <td data-label="Waiting, by age">{opening ? <span className="cell-quiet">Not yet tracked</span> : <AgeBar row={row} scale={scale} />}</td>
      <td data-label="Weeks waiting" className="data-table__num">
        <strong className="ui-valence-ink" data-valence={row.tone}>
          {opening ? "—" : weeks(row.pendingWeeks)}
        </strong>
      </td>
      <td data-label="Late" className="data-table__num">
        {opening ? rate(undefined) : pct(row.lateShare)}
        {opening ? null : <span className="data-table__sub">past {row.standardWeeks} weeks</span>}
      </td>
      <td data-label="Decided wrong" className="data-table__num">
        {rate(row.wrongShare)}
      </td>
      <td data-label="Refused" className="data-table__num">
        {rate(row.refusedShare)}
      </td>
    </tr>
  );
}

function Services({ reading }: { readonly reading: ServicesReading }) {
  const [sort, onSort, setSort] = useSort<ServiceKey>({ key: "status", direction: "ascending" });
  const order = new Map(reading.rows.map((row, index) => [row.id, index] as const));
  const rows = sortRows(reading.rows, sort, SERVICE_VALUE, (a, b) => order.get(a.id)! - order.get(b.id)!);
  return (
    <div className="exec-table">
      <SortPicker options={SERVICE_OPTIONS} sort={sort} onSort={setSort} />
      <table className="executive-service-table exec-services__table">
        <caption className="ui-visually-hidden">Department services. Select a column heading to sort.</caption>
        <thead>
          <tr>
            <SortHeader label="Service" sortKey="service" sort={sort} onSort={onSort} />
            <SortHeader label="Status" sortKey="status" sort={sort} onSort={onSort} />
            <th scope="col">Waiting, by age</th>
            <SortHeader label="Weeks" detail="waiting" sortKey="waiting" sort={sort} onSort={onSort} first="descending" align="end" />
            <SortHeader label="Late" sortKey="late" sort={sort} onSort={onSort} first="descending" align="end" />
            <SortHeader label="Wrong" detail="of decisions" sortKey="wrong" sort={sort} onSort={onSort} first="descending" align="end" />
            <SortHeader label="Refused" detail="of decisions" sortKey="refused" sort={sort} onSort={onSort} first="descending" align="end" />
          </tr>
        </thead>
        <Collection as="tbody" columns={7} items={rows} initial={8} noun="services" resetKey={`${sort.key}:${sort.direction}`} render={(row) => <ServiceLine key={row.id} row={row} scale={reading.scaleWeeks} />} />
      </table>
    </div>
  );
}

/** The projects underway, by stage, on one scale for every program: in review in gold, being built in blue, past plan in red. */
function StageBar({ row, scale }: { readonly row: ProjectRow; readonly scale: number }) {
  const said = row.stages.map((stage) => `${stage.label.toLowerCase()}: ${stage.count}`).join("; ");
  return (
    <span className="exec-services__bar" role="img" aria-label={`${row.underway} ${row.unit} underway. ${said}.`}>
      {row.stages.map((stage) => (stage.count > 0 ? <span key={stage.key} data-stage={stage.key} title={`${stage.label}: ${stage.count}`} style={{ inlineSize: `${(stage.count / scale) * 100}%` }} /> : null))}
    </span>
  );
}

type ProgramKey = "program" | "status" | "underway" | "ready";

const PROGRAM_OPTIONS: readonly SortOption<ProgramKey>[] = [
  { key: "status", label: "Status" },
  { key: "underway", label: "Underway" },
  { key: "ready", label: "Next award through review" },
  { key: "program", label: "Program" },
];

const PROGRAM_VALUE: Readonly<Record<ProgramKey, (row: ProjectRow) => SortValue>> = {
  program: (row) => row.name,
  status: (row) => TONE_RANK[row.tone],
  underway: (row) => (row.status === "opening" ? undefined : row.underway),
  ready: (row) => (row.status === "opening" ? undefined : row.nextAwardReady),
};

function ProgramLine({ row, scale }: { readonly row: ProjectRow; readonly scale: number }) {
  const opening = row.status === "opening";
  return (
    <tr className="ui-row-target exec-services__row" data-tone={row.tone}>
      <th scope="row" data-label="Program">
        <Name href={row.href} emblem={row.emblem} name={row.name} department={row.department}>
          <span className="data-table__sub">{row.reviewer ? `${row.department} · reviewed by ${row.reviewer}` : row.department}</span>

          {opening || row.status === "on-schedule" ? null : (
            <HelpTip label={`Service response: ${row.name}`}><p>{row.why}</p><p>{row.action}</p></HelpTip>
          )}
        </Name>
      </th>
      <td data-label="Status">
        <Status tone={row.tone} label={row.statusLabel} />
      </td>
      <td data-label="Underway, by stage">{opening ? <span className="cell-quiet">Not yet tracked</span> : <StageBar row={row} scale={scale} />}</td>
      <td data-label="Underway" className="data-table__num">
        <strong className="ui-valence-ink" data-valence={row.tone}>
          {opening ? "—" : row.underway}
        </strong>
        {opening ? null : <span className="data-table__sub">{row.unit}</span>}
      </td>
      <td data-label="Finished" className="data-table__num">
        {opening ? "—" : row.completed}
        {opening || row.completedLate === 0 ? null : <span className="data-table__sub">{row.completedLate} late</span>}
      </td>
      <td data-label="Next award" className="data-table__num">
        {opening ? "—" : pct(row.nextAwardReady)}
        {opening ? null : <span className="data-table__sub">{row.plannedWeeks}-week plan</span>}
      </td>
    </tr>
  );
}

/** The grant programs: awards that clear another body's review, then are built. */
function Programs({ reading }: { readonly reading: ProjectsReading }) {
  const [sort, onSort, setSort] = useSort<ProgramKey>({ key: "status", direction: "ascending" });
  const order = new Map(reading.rows.map((row, index) => [row.id, index] as const));
  const rows = sortRows(reading.rows, sort, PROGRAM_VALUE, (a, b) => order.get(a.id)! - order.get(b.id)!);
  return (
    <>
      <h3 id="exec-programs" className="exec-services__subheading">
        Grant programs
      </h3>
      <p className="exec__note">{reading.summary}</p>
      <ul className="exec-services__legend" aria-hidden="true">
        <li data-stage="review">In review</li>
        <li data-stage="build">Being built</li>
        <li data-stage="late">Past plan</li>
      </ul>
      <div className="exec-table">
        <SortPicker options={PROGRAM_OPTIONS} sort={sort} onSort={setSort} />
        <table className="executive-service-table exec-services__table" aria-labelledby="exec-programs">
          <thead>
            <tr>
              <SortHeader label="Program" sortKey="program" sort={sort} onSort={onSort} />
              <SortHeader label="Status" sortKey="status" sort={sort} onSort={onSort} />
              <th scope="col">Underway, by stage</th>
              <SortHeader label="Underway" sortKey="underway" sort={sort} onSort={onSort} first="descending" align="end" />
              <th scope="col" className="data-table__num">
                Finished
              </th>
              <SortHeader label="Next award" detail="through review" sortKey="ready" sort={sort} onSort={onSort} first="descending" align="end" />
            </tr>
          </thead>
          <Collection as="tbody" columns={6} items={rows} initial={8} noun="programs" resetKey={`${sort.key}:${sort.direction}`} render={(row) => <ProgramLine key={row.id} row={row} scale={reading.scale} />} />
        </table>
      </div>
    </>
  );
}

/**
 * The departments' case work: each service, whether it is keeping up, how long
 * its cases have waited, what it gets wrong, why, and who to look to. Each
 * service is read on its own scale of a normal week's intake, so the rates are
 * compared row by row and never pooled.
 */
export function ServicesPanel({ reading }: { readonly reading: ServicesReading }) {
  return (
    <section id="exec-services" className="exec-services exec-panel" aria-labelledby="exec-services-title" tabIndex={-1}>
      <h2 id="exec-services-title" className="exec__heading">
        What the departments deliver
      </h2>
      <p className="exec-panel__lede">{reading.summary}</p>
      <ul className="exec-services__legend" aria-hidden="true">
        <li data-age="fresh">Within its standard</li>
        <li data-age="quarter" data-late="true">Past its standard</li>
        <li data-age="half" data-late="true">Over 26 weeks</li>
        <li>In weeks of normal intake</li>
      </ul>
      <Services reading={reading} />
      <Programs reading={reading.projects} />
    </section>
  );
}
