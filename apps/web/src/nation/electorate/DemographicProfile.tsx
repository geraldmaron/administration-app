import type { CohortAxisId } from "@admin/world";
import type { DemographicAxis, DemographicCell } from "@admin/player-core";
import { Bar, Icon, type IconName } from "@admin/ui-web";
import "./demographics.css";
import { percent } from "./draw";

/** A gap this wide is called out; narrower ones are within the source's own rounding. */
const CALLOUT = 0.03;

export const AXIS_ICON: Readonly<Record<CohortAxisId, IconName>> = {
  age: "schedule",
  class: "budget",
  schooling: "departmentEducation",
  place: "mapPin",
  work: "departmentLabor",
  race: "layerBlocs",
  sex: "subjectPerson",
  nativity: "world",
  disability: "departmentHealthHumanServices",
  veteran: "departmentVeteransAffairs",
};

type Section = { readonly id: string; readonly title: string; readonly icon: IconName; readonly axes: readonly CohortAxisId[] };

const SECTIONS: readonly Section[] = [
  { id: "who", title: "Who lives here", icon: "subjectPerson", axes: ["age", "sex", "race", "nativity"] },
  { id: "living", title: "How they live", icon: "building", axes: ["class", "schooling", "place", "work"] },
  { id: "service", title: "Health and service", icon: "departmentHealthHumanServices", axes: ["disability", "veteran"] },
];

/**
 * Tenths where whole points would hide a real difference: states sit between
 * about 47 and 53 percent women, which whole percents print as 50 almost
 * everywhere, and a gap under half a point would read as level.
 */
function precise(axis: CohortAxisId, gap: number): boolean {
  return axis === "sex" || (Math.round(gap * 100) === 0 && Math.abs(gap) >= 0.0005);
}

const share = (value: number, tenths: boolean): string => (tenths ? `${(Math.round(value * 1000) / 10).toFixed(1)}%` : percent(value));

export function gapText(gap: number, tenths = false): string {
  const points = tenths ? Math.round(gap * 1000) / 10 : Math.round(gap * 100);
  if (points === 0) return "level";
  return `${points > 0 ? "▲ +" : "▼ −"}${tenths ? Math.abs(points).toFixed(1) : Math.abs(points)} pts`;
}

/** A gap against the U.S., said as one: the comparison is named on every row rather than left to a key. */
function versusUs(gap: number, tenths: boolean): string {
  const text = gapText(gap, tenths);
  return text === "level" ? "Same as U.S." : `${text} vs U.S.`;
}

function direction(gap: number): "over" | "under" | "level" {
  return Math.round(gap * 100) > 0 ? "over" : Math.round(gap * 100) < 0 ? "under" : "level";
}

/** The group that most sets the state apart on this axis, if any does. Sex is two mirrored cells and is left unremarked. */
function standoutOf(axis: DemographicAxis): DemographicCell | undefined {
  if (axis.axis === "sex") return undefined;
  const best = [...axis.cells].sort((a, b) => Math.abs(b.gap) - Math.abs(a.gap))[0];
  return best && Math.abs(best.gap) >= CALLOUT ? best : undefined;
}

/** One group: the bar is this place's share, the tick on it the U.S. share, both printed, and the gap between them in words. */
function Cell({ cell, top, axis }: { readonly cell: DemographicCell; readonly top: number; readonly axis: CohortAxisId }) {
  const called = Math.abs(cell.gap) >= CALLOUT;
  const tenths = precise(axis, cell.gap);
  return (
    <li className="dp-cell" data-direction={direction(cell.gap)} data-called={called ? "true" : undefined}>
      <p className="dp-cell__name">{cell.name}</p>
      <span className="dp-cell__plot">
        <Bar label={`${cell.name}: ${share(cell.state, tenths)} here, ${share(cell.nation, tenths)} in the U.S.`} value={cell.state / top} tone="reading" marks={[{ at: cell.nation / top, label: `U.S. ${share(cell.nation, tenths)}` }]} />
      </span>
      <p className="dp-cell__figure">
        <strong>{share(cell.state, tenths)}</strong>
        <span className="dp-cell__nation">U.S. {share(cell.nation, tenths)}</span>
      </p>
      <p className="dp-cell__gap">{versusUs(cell.gap, tenths)}</p>
    </li>
  );
}

function Axis({ axis }: { readonly axis: DemographicAxis }) {
  // One scale per axis, up to its largest share, so a small group is not a hairline beside a large one.
  const top = Math.max(...axis.cells.flatMap((cell) => [cell.state, cell.nation]), 0.01);
  const standout = standoutOf(axis);
  return (
    <section className="dp-axis" aria-label={axis.name}>
      <h4 className="dp-axis__title">
        <Icon name={AXIS_ICON[axis.axis]} size={16} />
        <span>{axis.name}</span>
      </h4>
      {standout ? (
        <p className="dp-axis__call" data-direction={direction(standout.gap)}>
          {standout.gap > 0 ? "Most over-represented" : "Most under-represented"}: <strong>{standout.name}</strong>, {versusUs(standout.gap, false).replace("▲ ", "").replace("▼ ", "")}
        </p>
      ) : null}
      <ul className="dp-axis__rows">
        {axis.cells.map((cell) => (
          <Cell key={cell.cohort} cell={cell} top={top} axis={axis.axis} />
        ))}
      </ul>
    </section>
  );
}

function Key({ name }: { readonly name: string }) {
  return (
    <p className="dp-key" aria-hidden="true">
      <span className="dp-key__swatch" data-tone="state" /> The bar: share of {name}'s residents
      <span className="dp-key__tick" /> The tick: the same share across the U.S.
    </p>
  );
}

/**
 * A place's people on each of the ten axes against the country: the bar is this
 * place's share and the tick on it the U.S. share, on one scale per axis, both
 * printed, with the gap beside them in points. Composition is a fact about the people and
 * not a judgment, so nothing here is colored good or bad.
 *
 * `grouped` sets the ten axes in three titled sections; without it they sit in
 * one grid, which is how the public-opinion map shows a picked state.
 */
export function DemographicProfile({ name, axes, grouped = false }: { readonly name: string; readonly axes: readonly DemographicAxis[] | undefined; readonly grouped?: boolean }) {
  if (!axes) return <p className="elec-note">The dataset carries no population breakdown for {name}.</p>;
  const byId = new Map(axes.map((axis) => [axis.axis, axis] as const));
  return (
    <div className="dp">
      <Key name={name} />
      {grouped ? (
        SECTIONS.map((section) => (
          <section key={section.id} className="dp-section" aria-label={section.title}>
            <h3 className="dp-section__title">
              <Icon name={section.icon} size={18} /> {section.title}
            </h3>
            <div className="dp-axes">
              {section.axes.flatMap((id) => {
                const axis = byId.get(id);
                return axis ? [<Axis key={id} axis={axis} />] : [];
              })}
            </div>
          </section>
        ))
      ) : (
        <div className="dp-axes">
          {axes.map((axis) => (
            <Axis key={axis.axis} axis={axis} />
          ))}
        </div>
      )}
    </div>
  );
}
