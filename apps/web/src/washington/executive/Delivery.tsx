import { BUILT_LABELS, formatRatio, type BranchDelivery, type BuiltKey, type DeliveryRow } from "@admin/player-core";
import { Collection, SortHeader, SortPicker, sortRows, useSort, type GaugeTone, type SortOption, type SortValue } from "@admin/ui-web";
import { Door } from "../../shell/Door";
import { InstitutionMark, StaffingBadge } from "./StaffingBadge";
import "../congress/tables.css";
import "./delivery.css";

const LEGEND: readonly BuiltKey[] = ["capacity", "staffing", "budget", "morale", "leader"];

function toneOf(value: number): GaugeTone {
  return value >= 0.6 ? "good" : value >= 0.4 ? "watch" : "bad";
}

const pct = (value: number) => `${Math.round(value * 100)}`;

/** What a screen reader hears for one bar: the figure, what builds it and what comes off it, in points. */
function spoken(row: DeliveryRow): string {
  const built = row.built.map((part) => `${part.label.toLowerCase()} ${pct(part.value)}`).join(", ");
  const lost = row.lost.map((part) => `${pct(part.value)} to ${part.label.toLowerCase()}`).join(", ");
  return `Delivering ${formatRatio(row.quality)}. Built from ${built}.${lost ? ` Losing ${lost}.` : " Nothing coming off it."}`;
}

const lostTotal = (row: DeliveryRow): number => row.lost.reduce((sum, part) => sum + part.value, 0);

/**
 * One body's delivery as the sum it is: the inputs stacked from zero to what
 * the body could deliver, and what it is losing hatched over the end of them,
 * so the solid part stops exactly at the figure. Each bar runs 0 to 100%.
 */
export function DeliveryBar({ row }: { readonly row: DeliveryRow }) {
  const built = row.built.reduce((sum, part) => sum + part.value, 0);
  const lost = Math.min(1, built) - row.quality;
  return (
    <span className="exec-delivery__bar" role="img" aria-label={spoken(row)}>
      {row.built.map((part) => (
        <span key={part.key} data-part={part.key} title={`${part.label} ${pct(part.value)}`} style={{ inlineSize: `${part.value * 100}%` }} />
      ))}
      {lost > 0.0005 ? <span className="exec-delivery__lost" style={{ insetInlineStart: `${row.quality * 100}%`, inlineSize: `${lost * 100}%` }} /> : null}
    </span>
  );
}

/** Only the parts some row actually draws, so the key never names a color the table does not use. */
export function DeliveryLegend({ rows }: { readonly rows: readonly DeliveryRow[] }) {
  const drawn = new Set(rows.flatMap((row) => row.built.map((part) => part.key)));
  const losing = rows.some((row) => row.lost.length > 0);
  return (
    <ul className="exec-delivery__legend" aria-hidden="true">
      {LEGEND.filter((key) => drawn.has(key)).map((key) => (
        <li key={key} data-part={key}>
          {BUILT_LABELS[key]}
        </li>
      ))}
      {losing ? <li data-part="lost">Lost to an open chair, backlog, politicization or a weak head</li> : null}
      <li data-part="short">Short of full delivery</li>
    </ul>
  );
}

type Key = "office" | "delivery" | "lost";

const VALUE: Readonly<Record<Key, (row: DeliveryRow) => SortValue>> = {
  office: (row) => row.name,
  delivery: (row) => row.quality,
  lost: lostTotal,
};

const OPTIONS: readonly SortOption<Key>[] = [
  { key: "delivery", label: "Delivery" },
  { key: "lost", label: "Points lost" },
  { key: "office", label: "Office" },
];

function Line({ row }: { readonly row: DeliveryRow }) {
  const lost = Math.round(lostTotal(row) * 100);
  return (
    <tr className="ui-row-target" data-tone={toneOf(row.quality)}>
      <th scope="row" data-label="Office">
        <span className="exec-delivery__name">
          <InstitutionMark institution={row.institution} emblem={row.emblem} size={28} />
          <Door href={row.href} className="ui-row-link">
            {row.name}
          </Door>
          {row.staffing === "confirmed" ? null : <StaffingBadge staffing={row.staffing} />}
        </span>
      </th>
      <td data-label="Delivery">
        <DeliveryBar row={row} />
      </td>
      <td data-label="Figure" className="data-table__num exec-delivery__figure">
        {formatRatio(row.quality)}
      </td>
      <td data-label="Points lost" className="data-table__num" data-zero={lost === 0 ? "true" : undefined}>
        {lost === 0 ? "0" : `−${lost}`}
      </td>
      <td data-label="Why" className="exec-delivery__why">
        {row.reason}
      </td>
    </tr>
  );
}

/**
 * Every top-level office, sortable, each drawn as the parts that make its
 * figure. The branch dial is in the headline row; this is where its parts are
 * read office by office.
 */
export function Delivery({ reading, bodiesCounted }: { readonly reading: BranchDelivery; readonly bodiesCounted: number }) {
  const [sort, onSort, setSort] = useSort<Key>({ key: "delivery", direction: "ascending" });
  const rows = sortRows(reading.rows, sort, VALUE, (a, b) => a.name.localeCompare(b.name));
  return (
    <section id="exec-delivery" className="exec-delivery exec-panel" aria-labelledby="exec-delivery-title" tabIndex={-1}>
      <h2 id="exec-delivery-title" className="exec__heading">
        Delivery by office
      </h2>
      <p className="exec-panel__lede">{reading.sentence}</p>
      <p className="exec__note">
        The branch figure, {formatRatio(reading.quality)}, weights {bodiesCounted} bodies by staff. These {reading.rows.length} are the top-level offices among them; agencies under a department count in the branch figure but are read in the department's file.
      </p>
      <DeliveryLegend rows={reading.rows} />
      <div className="exec-table">
        <SortPicker options={OPTIONS} sort={sort} onSort={setSort} />
        <table className="executive-delivery-table exec-delivery__table">
          <caption className="ui-visually-hidden">Delivery by office. Select a column heading to sort.</caption>
          <thead>
            <tr>
              <SortHeader label="Office" sortKey="office" sort={sort} onSort={onSort} />
              <th scope="col">Built from, less what it loses</th>
              <SortHeader label="Delivery" sortKey="delivery" sort={sort} onSort={onSort} align="end" />
              <SortHeader label="Lost" detail="points" sortKey="lost" sort={sort} onSort={onSort} first="descending" align="end" />
              <th scope="col">Why</th>
            </tr>
          </thead>
          <Collection as="tbody" columns={5} items={rows} initial={10} noun="offices" resetKey={`${sort.key}:${sort.direction}`} render={(row) => <Line key={row.institution} row={row} />} />
        </table>
      </div>
    </section>
  );
}
