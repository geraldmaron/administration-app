import { useMemo } from "react";
import type { Campaign } from "@admin/engine";
import { delegationReading, place, type DelegationReading } from "@admin/player-core";
import { Collection, Icon, SortHeader, SortPicker, sortRows, useSort, type SortOption, type SortValue } from "@admin/ui-web";
import { STATE_IDS } from "@admin/world";
import { Door } from "../../shell/Door";
import { valenceOf } from "../../shell/valence";
import { StateName } from "../../media/StateName";

type DelegationKey = "name" | "house" | "senate" | "standing";

const DELEGATION_VALUE: Readonly<Record<DelegationKey, (row: DelegationReading) => SortValue>> = {
  name: (row) => row.name,
  house: (row) => row.house.seats,
  senate: (row) => (row.senators.length === 0 ? undefined : senateWords(row)),
  standing: (row) => row.standing.value,
};

const DELEGATION_OPTIONS: readonly SortOption<DelegationKey>[] = [
  { key: "house", label: "House seats" },
  { key: "standing", label: "Toward you" },
  { key: "name", label: "State" },
  { key: "senate", label: "Senate" },
];

function houseWords(reading: DelegationReading): string {
  const { house } = reading;
  if (house.seats === 0) return "No voting member";
  const parts = [`${house.democrat} D`, `${house.republican} R`, ...(house.independent > 0 ? [`${house.independent} I`] : [])];
  return `${parts.join(", ")} of ${house.seats}`;
}

function senateWords(reading: DelegationReading): string {
  return reading.senators.length === 0 ? "No senators" : reading.senators.map((senator) => senator.party).join(" and ");
}

/** Every state's bloc in Congress, in one ranked table: the delegation's seats and how it regards the administration. */
export function Delegations({ campaign }: { readonly campaign: Campaign }) {
  const readings = useMemo(() => STATE_IDS.flatMap((id) => delegationReading(campaign, id) ?? []), [campaign]);
  const [sort, onSort, setSort] = useSort<DelegationKey>({ key: "house", direction: "descending" });
  const rows = useMemo(() => sortRows(readings, sort, DELEGATION_VALUE, (a, b) => a.name.localeCompare(b.name)), [readings, sort]);
  return (
    <section className="hill-section" aria-labelledby="congress-delegation">
      <h3 id="congress-delegation" className="hill-subtitle">
        <Icon name="flag" size={16} /> State delegations
      </h3>
      {rows.length === 0 ? (
        <p className="hill-note">No delegation has been seated yet.</p>
      ) : (
        <div className="hill-sortable">
          <SortPicker options={DELEGATION_OPTIONS} sort={sort} onSort={setSort} />
          <table className="data-table ui-table--stack">
            <caption className="ui-visually-hidden">State delegations. Select a column heading to sort.</caption>
            <thead>
              <tr>
                <SortHeader label="State" sortKey="name" sort={sort} onSort={onSort} />
                <SortHeader label="House" sortKey="house" sort={sort} onSort={onSort} first="descending" />
                <SortHeader label="Senate" sortKey="senate" sort={sort} onSort={onSort} />
                <SortHeader label="Toward you" sortKey="standing" sort={sort} onSort={onSort} first="descending" align="end" className="data-table__num" />
              </tr>
            </thead>
            <Collection
              as="tbody"
              columns={4}
              items={rows}
              initial={10}
              noun="delegations"
              resetKey={`${sort.key}:${sort.direction}`}
              render={(reading) => (
                <tr key={reading.state} className="ui-row-target">
                  <th scope="row" data-label="State">
                    <Door href={place.state(reading.state)} className="ui-row-link">
                      <StateName id={reading.state} name={reading.name} />
                    </Door>
                  </th>
                  <td data-label="House">{houseWords(reading)}</td>
                  <td data-label="Senate">{senateWords(reading)}</td>
                  <td data-label="Toward you" className="data-table__num">
                    <span className="ui-valence-ink" data-valence={valenceOf(reading.standing.stance)}>
                      {reading.standing.word}
                    </span>{" "}
                    {reading.standing.percent}
                  </td>
                </tr>
              )}
            />
          </table>
        </div>
      )}
    </section>
  );
}
