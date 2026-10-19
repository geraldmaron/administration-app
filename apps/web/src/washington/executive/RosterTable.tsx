import type { Campaign } from "@admin/engine";
import { chairRead, personFile, place } from "@admin/player-core";
import { Collection, Portrait, Steps, SortHeader, SortPicker, Tag, sortRows, useSort, type SortOption, type SortState, type SortValue } from "@admin/ui-web";
import { faceOf } from "../../media/faces";
import { Door } from "../../shell/Door";
import { toneOf } from "../../shell/valence";
import { InstitutionMark, NomineeBadge, StaffingBadge } from "./StaffingBadge";
import type { RosterRow } from "./roster";

function Holder({ campaign, row }: { readonly campaign: Campaign; readonly row: RosterRow }) {
  const { node } = row;
  // A confirmed chair is the default and says nothing; only a chair held some other way carries a tag.
  const held = node.staffing === "confirmed" ? null : <StaffingBadge staffing={node.staffing} />;
  const nominee = row.nominee ? <NomineeBadge nominee={row.nominee} /> : null;
  if (!node.holder) {
    return (
      <span className="register__holder">
        <span className="register__holder-meta">
          {held}
          {nominee ?? <span className="register__none">No nominee named</span>}
        </span>
      </span>
    );
  }
  const face = faceOf(campaign, node.holder, node.holderName);
  return (
    <span className="register__holder">
      <Portrait name={face.name} {...(face.src ? { src: face.src } : {})} monogram={face.monogram} size="sm" decorative />
      <span className="register__holder-text">
        <Door href={place.person(node.holder)}>{face.name}</Door>
        {held || nominee ? (
          <span className="register__holder-meta">
            {held}
            {nominee}
          </span>
        ) : null}
      </span>
    </span>
  );
}

function Read({ campaign, row }: { readonly campaign: Campaign; readonly row: RosterRow }) {
  const holder = row.node.holder;
  const person = holder ? campaign.people[holder]?.base : undefined;
  if (!holder || !person) return <span className="register__none">—</span>;
  const file = personFile(campaign, holder);
  return <div className="register__readings">{file?.readings.filter((reading) => reading.key === "loyalty" || reading.key === "competence").map((reading) => <Steps key={reading.key} label={reading.label} lit={reading.band + 1} word={reading.word} tone={toneOf(reading.stance)} showBand />)}</div>;
}

function Waiting({ row }: { readonly row: RosterRow }) {
  const { node } = row;
  const backlog = row.backlog !== undefined && row.backlog > 0 ? row.backlog : 0;
  if (node.alerts.length === 0 && backlog === 0) return null;
  return (
    <div className="register__waits">
      {node.alerts.length > 0 ? (
        <ul aria-label="Waiting on you">
          {node.alerts.map((alert) => (
            <li key={alert.kind}>
              <Tag tone="risk">{alert.text}</Tag>
            </li>
          ))}
        </ul>
      ) : null}
      {backlog > 0 ? <span className="register__backlog">{backlog} awaiting delivery</span> : null}
    </div>
  );
}

function RosterLine({ campaign, row }: { readonly campaign: Campaign; readonly row: RosterRow }) {
  const { node } = row;
  return (
    <tr className="register__row ui-row-target" data-staffing={node.staffing} data-alert={node.alerts.length > 0 ? "true" : undefined} data-depth={row.depth}>
      <th scope="row" className="register__office" data-label="Office">
        <div className="register__officebox">
          <InstitutionMark institution={node.institution} emblem={node.emblem} size={28} />
          <span>
            <Door href={node.href} className="ui-row-link">
              {node.name}
            </Door>
            {node.title !== node.name ? <span className="register__title" title={node.title}>{node.title}</span> : null}
          </span>
        </div>
      </th>
      <td data-label="Holder">
        <Holder campaign={campaign} row={row} />
      </td>
      <td data-label="Read">
        <Read campaign={campaign} row={row} />
      </td>
      <td data-label="Needs you">
        {node.alerts.length === 0 && !(row.backlog && row.backlog > 0) ? <span className="register__none">No open matters</span> : <Waiting row={row} />}
      </td>
    </tr>
  );
}

/** "order" is the org-chart order; it has no header, so nothing is re-sorted until a column is pressed. */
type RosterSort = "order" | "office" | "holder" | "read" | "needs";

const SORT_OPTIONS: readonly SortOption<RosterSort>[] = [
  { key: "office", label: "Office" },
  { key: "holder", label: "Holder" },
  { key: "read", label: "Read" },
  { key: "needs", label: "Needs you" },
];

const READ_RANK = { good: 3, watch: 2, bad: 1 } as const;

function rosterValues(campaign: Campaign): Readonly<Record<RosterSort, (row: RosterRow) => SortValue>> {
  return {
    order: () => 0,
    office: (row) => row.node.name,
    holder: (row) => row.node.holderName,
    read: (row) => {
      const person = row.node.holder ? campaign.people[row.node.holder]?.base : undefined;
      return person ? READ_RANK[chairRead(person).tone] : undefined;
    },
    needs: (row) => row.node.alerts.length + (row.backlog !== undefined && row.backlog > 0 ? 1 : 0),
  };
}

/** An agency answers to the department above it, so sorting moves each department with its agencies and orders the agencies within it. */
function sortedRows(rows: readonly RosterRow[], sort: SortState<RosterSort>, values: Readonly<Record<RosterSort, (row: RosterRow) => SortValue>>): readonly RosterRow[] {
  if (sort.key === "order") return rows;
  const groups = rows.reduce<RosterRow[][]>((acc, row) => (row.depth === 0 || acc.length === 0 ? [...acc, [row]] : [...acc.slice(0, -1), [...acc[acc.length - 1]!, row]]), []);
  const ordered = sortRows(groups, sort, Object.fromEntries((Object.keys(values) as RosterSort[]).map((key) => [key, (group: RosterRow[]) => values[key](group[0]!)])) as Record<RosterSort, (group: RosterRow[]) => SortValue>);
  return ordered.flatMap(([lead, ...agencies]) => [lead!, ...sortRows(agencies, sort, values)]);
}

/**
 * Every chair on four columns: the office, who holds it and how, one read of
 * the holder, and what waits on the President. An agency sits under the
 * department it answers to.
 */
export function RosterTable({ campaign, rows, caption }: { readonly campaign: Campaign; readonly rows: readonly RosterRow[]; readonly caption: string }) {
  const [sort, onSort, setSort] = useSort<RosterSort>({ key: "order", direction: "ascending" });
  const shown = sortedRows(rows, sort, rosterValues(campaign));
  return (
    <div className="executive-register">
      <SortPicker options={SORT_OPTIONS} sort={sort} onSort={setSort} />
      <table className="register__table">
        <caption className="ui-visually-hidden">{caption}</caption>
        <thead>
          <tr>
            <SortHeader label="Office" sortKey="office" sort={sort} onSort={onSort} />
            <SortHeader label="Holder" sortKey="holder" sort={sort} onSort={onSort} />
            <SortHeader label="Read" sortKey="read" sort={sort} onSort={onSort} first="descending" />
            <SortHeader label="Needs you" sortKey="needs" sort={sort} onSort={onSort} first="descending" />
          </tr>
        </thead>
        <Collection
          as="tbody"
          columns={4}
          items={shown}
          initial={15}
          noun="chairs"
          resetKey={`${caption}:${sort.key}:${sort.direction}`}
          render={(row) => <RosterLine key={`${row.node.institution}:${row.node.office}`} campaign={campaign} row={row} />}
        />
      </table>
    </div>
  );
}
