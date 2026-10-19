import { formatRatio, place, type DeskRow } from "@admin/player-core";
import { Bar, Collection, Gauge, SortHeader, SortPicker, Tag, sortRows, useSort, type SortOption, type TagTone } from "@admin/ui-web";
import { Door } from "../../shell/Door";
import { toneOf } from "../../shell/valence";
import { feedHref } from "./press-search";

const HEADING_WORD = { warming: "Warming to you", cooling: "Cooling on you", settled: "Settled" } as const;
const HEADING_TONE: Readonly<Record<keyof typeof HEADING_WORD, TagTone>> = { warming: "good", cooling: "risk", settled: "neutral" };

/** "order" is hostile end first; it has no header, so nothing is re-sorted until a column is pressed. */
type DeskSort = "order" | "desk" | "stance" | "heading" | "reach" | "week";

const OPTIONS: readonly SortOption<DeskSort>[] = [
  { key: "desk", label: "Desk" },
  { key: "stance", label: "Stance toward you" },
  { key: "heading", label: "Heading" },
  { key: "reach", label: "Reach" },
  { key: "week", label: "This week" },
];

const HEADING_RANK = { cooling: 0, settled: 1, warming: 2 } as const;

const VALUE = {
  order: () => 0,
  desk: (desk: DeskRow) => desk.name,
  stance: (desk: DeskRow) => desk.disposition,
  heading: (desk: DeskRow) => HEADING_RANK[desk.heading],
  reach: (desk: DeskRow) => desk.reachShare,
  week: (desk: DeskRow) => desk.thisWeek,
} as const;

function DeskLine({ desk }: { readonly desk: DeskRow }) {
  return (
    <tr className="pr-desk ui-row-target" data-stance={desk.tone}>
      <th scope="row" data-label="Desk">
        <Door href={feedHref({ outlet: desk.id })} className="ui-row-link pr-desk__name">
          {desk.name}
        </Door>
        <span className="pr-note">
          {desk.format}
          {desk.region ? `, ${desk.region}` : ""}
        </span>
      </th>
      <td data-label="Stance toward you">
        <Gauge shape="meter" stacked label="Stance toward you" labelHidden value={desk.disposition} valueText={desk.stanceWord} tone={toneOf(desk.tone)} />
      </td>
      <td data-label="Heading" title={desk.why}>
        {desk.heading === "settled" ? <span className="pr-note">{HEADING_WORD.settled}</span> : <Tag tone={HEADING_TONE[desk.heading]}>{HEADING_WORD[desk.heading]}</Tag>}
      </td>
      <td data-label="Reach">
        <div className="pr-reach">
          <Bar label={`Reaches ${formatRatio(desk.reachShare)} of American adults each week, ${formatRatio(desk.reachOfWidest)} of the widest desk`} value={desk.reachOfWidest} tone="reading" slim />
          <span className="pr-note">{formatRatio(desk.reachShare)} of adults</span>
        </div>
      </td>
      <td data-label="This week" className="pr-num">
        <span>
          {desk.thisWeek}
          <span className="pr-note"> of {desk.filed} filed</span>
        </span>
      </td>
      <td data-label="Last story">
        {desk.last ? (
          <Door href={place.dispatch(String(desk.last.index))} className="pr-desk__last">
            {desk.last.headline}
          </Door>
        ) : (
          <span className="pr-note">Nothing filed yet</span>
        )}
      </td>
    </tr>
  );
}

/**
 * Every desk on the same columns, hostile end first: where it stands, the way
 * the record is taking it, how many read it, what it filed this week and its
 * latest story. The desk's name opens its stories in the feed below.
 */
export function Desks({ desks }: { readonly desks: readonly DeskRow[] }) {
  const [sort, onSort, setSort] = useSort<DeskSort>({ key: "order", direction: "ascending" });
  const ordered = sort.key === "order" ? desks : sortRows(desks, sort, VALUE, (a, b) => a.name.localeCompare(b.name));
  return (
    <section id="press-desks" aria-labelledby="press-desks-title" tabIndex={-1} className="pr-panel">
      <div className="pr-panel__head">
        <h2 id="press-desks-title" className="pr-heading">
          The desks covering you
        </h2>
        <p className="pr-note">{desks.length} desks, hostile end first. Pause on a heading for the reason behind it.</p>
      </div>
      <SortPicker options={OPTIONS} sort={sort} onSort={setSort} />
      <table className="pr-table">
        <caption className="ui-visually-hidden">Desks covering the administration</caption>
        <thead>
          <tr>
            <SortHeader label="Desk" sortKey="desk" sort={sort} onSort={onSort} />
            <SortHeader label="Stance toward you" sortKey="stance" sort={sort} onSort={onSort} />
            <SortHeader label="Heading" sortKey="heading" sort={sort} onSort={onSort} />
            <SortHeader label="Reach" sortKey="reach" sort={sort} onSort={onSort} first="descending" />
            <SortHeader label="This week" sortKey="week" sort={sort} onSort={onSort} first="descending" />
            <th scope="col">Last story</th>
          </tr>
        </thead>
        <Collection as="tbody" columns={6} items={ordered} initial={12} noun="desks" resetKey={`${sort.key}:${sort.direction}`} render={(desk) => <DeskLine key={desk.id} desk={desk} />} />
      </table>
    </section>
  );
}
