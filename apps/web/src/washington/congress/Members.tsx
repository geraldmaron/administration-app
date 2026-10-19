import { useMemo, useState } from "react";
import { usPartyWord, type Campaign } from "@admin/engine";
import { place } from "@admin/player-core";
import { NativeSelect, Card, CardContent, CardHeader, Collection, Field, Icon, Input, PartyMark, SortHeader, SortPicker, sortRows, useSort, nextSort, type SortState, type SortOption, type SortValue } from "@admin/ui-web";
import { Door } from "../../shell/Door";
import type { CongressSearch, CongressChange } from "./search";

type MemberRow = {
  readonly member: NonNullable<Campaign["congress"]["members"]>[number];
  readonly name: string;
  readonly stateName: string;
  readonly alive: boolean;
};

type MemberKey = "name" | "seat" | "state" | "party" | "class";

const MEMBER_VALUE: Readonly<Record<MemberKey, (row: MemberRow) => SortValue>> = {
  name: (row) => row.name,
  seat: (row) => `${row.member.chamber === "house" ? "1" : "0"}${row.member.seat}`,
  state: (row) => row.stateName,
  party: (row) => usPartyWord(row.member.party),
  class: (row) => row.member.seatClass,
};

const MEMBER_OPTIONS: readonly SortOption<MemberKey>[] = [
  { key: "name", label: "Name" },
  { key: "seat", label: "Chamber and seat" },
  { key: "state", label: "State" },
  { key: "party", label: "Party" },
  { key: "class", label: "Senate class" },
];

/** The voting seats and their current holders as one sortable, searchable table; historical roll calls keep their own people. */
export function Members({ campaign, search, onSearch }: { readonly campaign: Campaign; readonly search?: CongressSearch; readonly onSearch?: CongressChange }) {
  const [localChamber, setLocalChamber] = useState("all");
  const [localQuery, setLocalQuery] = useState("");
  const [localSort, localOnSort, setLocalSort] = useSort<MemberKey>({ key: "name", direction: "ascending" });
  const chamber = search ? search.chamber ?? "all" : localChamber;
  const query = search ? search.q ?? "" : localQuery;
  const sort: SortState<MemberKey> = search ? { key: search.sort ?? "name", direction: search.direction ?? "ascending" } : localSort;
  const setChamber = (next: string) => onSearch ? onSearch({ ...search, chamber: next === "all" ? undefined : next as "house" | "senate" }) : setLocalChamber(next);
  const setQuery = (next: string) => onSearch ? onSearch({ ...search, q: next || undefined }) : setLocalQuery(next);
  const setSort = (next: SortState<MemberKey>) => onSearch ? onSearch({ ...search, sort: next.key, direction: next.direction }) : setLocalSort(next);
  const onSort: typeof localOnSort = onSearch ? (key, first) => { void setSort(nextSort(sort, key, first)); } : localOnSort;
  const members = campaign.congress.members ?? [];
  const all = useMemo(() => members.map((member): MemberRow => {
    const person = campaign.people[member.person];
    return { member, name: person?.base.name ?? "Unrecorded member", stateName: campaign.states[member.state]?.base.name ?? member.state, alive: person?.alive ?? false };
  }), [members, campaign]);
  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const matched = all.filter((row) => (chamber === "all" || row.member.chamber === chamber)
      && `${row.name} ${row.stateName} ${row.member.seat} ${usPartyWord(row.member.party)}`.toLowerCase().includes(needle));
    return sortRows(matched, sort, MEMBER_VALUE, (a, b) => a.member.seat.localeCompare(b.member.seat));
  }, [all, chamber, query, sort]);
  return (
    <Card role="region" aria-labelledby="congress-members"><CardHeader>
      <h2 id="congress-members" className="hill-section__title"><Icon name="subjectPerson" size={20} /> Voting members</h2>
      <p className="hill-note">{members.length} recorded seats. Open a member's file to read their experience and relationships.</p>
      </CardHeader><CardContent className="grid gap-4"><div className="grid gap-3 sm:grid-cols-[minmax(8rem,1fr)_minmax(0,3fr)]"><Field label="Chamber">{(control) => <NativeSelect {...control} className="ui-input" value={chamber} onChange={(event) => setChamber(event.target.value)}>
        <option value="all">Both chambers</option><option value="house">House</option><option value="senate">Senate</option>
      </NativeSelect>}</Field>
      <Field label="Find a member" hint="Search by name, state, seat or party.">{(control) => <Input {...control} maxLength={120} type="search" className="ui-input" value={query} onChange={(event) => setQuery(event.target.value)} />}</Field></div>
      <p className="hill-note" role="status">{rows.length} matching seats</p>
      {members.length === 0 ? <p className="hill-note">This save has no recorded individual membership yet.</p> : rows.length === 0 ? <p className="hill-note">No members match these filters.</p> : (
        <div className="hill-sortable">
          <SortPicker options={MEMBER_OPTIONS} sort={sort} onSort={setSort} />
          <table className="data-table ui-table--stack">
            <caption className="ui-visually-hidden">Voting members. Select a column heading to sort.</caption>
            <thead>
              <tr>
                <SortHeader label="Member" sortKey="name" sort={sort} onSort={onSort} />
                <SortHeader label="Chamber and seat" sortKey="seat" sort={sort} onSort={onSort} />
                <SortHeader label="State" sortKey="state" sort={sort} onSort={onSort} />
                <SortHeader label="Party" sortKey="party" sort={sort} onSort={onSort} />
                <SortHeader label="Senate class" sortKey="class" sort={sort} onSort={onSort} />
              </tr>
            </thead>
            <Collection as="tbody" columns={5} items={rows} initial={20} noun="members" resetKey={`${chamber}:${query}:${sort.key}:${sort.direction}`}
              render={(row) => (
                <tr key={row.member.seat} className="ui-row-target" data-party={row.member.party}>
                  <th scope="row" data-label="Member">
                    <Door href={place.person(row.member.person)} className="ui-row-link">{row.name}</Door>
                    {!row.alive ? <span className="data-table__sub">Deceased; seat awaits replacement</span> : null}
                  </th>
                  <td data-label="Chamber and seat">{row.member.chamber === "house" ? "House" : "Senate"} · {row.member.seat}</td>
                  <td data-label="State">{row.stateName}</td>
                  <td data-label="Party"><PartyMark party={row.member.party} size={12} /> {usPartyWord(row.member.party)}</td>
                  <td data-label="Senate class">{row.member.seatClass ? `Class ${row.member.seatClass}` : <span className="cell-quiet">House seat</span>}</td>
                </tr>
              )} />
          </table>
        </div>
      )}
    </CardContent></Card>
  );
}
