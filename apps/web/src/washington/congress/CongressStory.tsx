import { useMemo } from "react";
import type { Campaign } from "@admin/engine";
import {
  place,
  type CongressChamber,
  type HillCommittee,
  type HillLeader,
  type RollHistoryEntry,
  type TermTally,
} from "@admin/player-core";
import { Button, Collection, Gauge, Icon, HelpTip, PartyMark, Portrait, SortHeader, SortPicker, sortRows, useSort, type SortOption, type SortValue } from "@admin/ui-web";
import { faceOf } from "../../media/faces";
import { Door } from "../../shell/Door";
import { toneOf } from "../../shell/valence";
import { useDrawnLinks } from "../../shell/drawn-links";
import "./congress-story.css";

const TALLY_KINDS: readonly { readonly key: keyof TermTally; readonly label: string }[] = [
  { key: "signed", label: "Signed into law" },
  { key: "unsigned", label: "Law without your signature" },
  { key: "overridden", label: "Passed over your veto" },
  { key: "vetoed", label: "Vetoed and sustained" },
  { key: "died", label: "Died in Congress" },
  { key: "pending", label: "Still moving" },
];

/** Every bill of the term as one tile, colored by what it came to. */
export function TermStrip({ tally }: { readonly tally: TermTally }) {
  const total = TALLY_KINDS.reduce((sum, kind) => sum + tally[kind.key], 0);
  return (
    <figure className="hill-term">
      <figcaption>Your record with this Congress <span>{total === 0 ? "no bill yet" : `${total} ${total === 1 ? "bill" : "bills"}`}</span></figcaption>
      {total > 0 ? (
        <div className="hill-term__tiles" role="img" aria-label={TALLY_KINDS.filter((kind) => tally[kind.key] > 0).map((kind) => `${kind.label} ${tally[kind.key]}`).join(", ")}>
          {TALLY_KINDS.flatMap((kind) => Array.from({ length: tally[kind.key] }, (_, i) => <span key={`${kind.key}-${i}`} data-kind={kind.key} />))}
        </div>
      ) : null}
      <ul className="hill-term__legend">
        {TALLY_KINDS.map((kind) => (
          <li key={kind.key} data-kind={kind.key} data-zero={tally[kind.key] === 0 ? "true" : undefined}><span className="hill-term__swatch" aria-hidden="true" />{kind.label} <strong>{tally[kind.key]}</strong></li>
        ))}
      </ul>
    </figure>
  );
}

function LeaderCard({ leader, campaign }: { readonly leader: HillLeader; readonly campaign: Campaign }) {
  const face = leader.personId ? faceOf(campaign, leader.personId, leader.name) : undefined;
  return (
    <li className={leader.personId ? "hill-leader ui-card-door" : "hill-leader"}>
      <Portrait name={leader.name} {...(face?.src ? { src: face.src } : {})} monogram={face?.monogram ?? "?"} size="md" party={leader.party} decorative />
      <div className="hill-leader__who">
        <span className="hill-leader__title"><PartyMark party={leader.party} size={12} /> {leader.title}</span>
        {leader.personId ? <Door href={place.person(leader.personId)} className="hill-leader__name ui-card-door__link text-foreground no-underline hover:no-underline">{leader.name}</Door> : <span className="hill-leader__name">{leader.name}</span>}
        <span className="hill-leader__following">{leader.following}</span>
        <Button asChild kind="secondary" size="sm"><Door href={leader.href} className="hill-leader__outreach">{leader.pending ? `Outreach under way: ${leader.pending}` : "Legislative outreach"}<Icon name="chevron" size={14} /></Door></Button>
      </div>
      <Gauge label={`${leader.name} toward you`} value={leader.standing.value} valueText={`${leader.standing.word} ${leader.standing.percent}`} tone={toneOf(leader.standing.stance)} shape="meter" labelHidden />
    </li>
  );
}

type CommitteeKey = "name" | "chair" | "inquiry" | "standing";

const COMMITTEE_VALUE: Readonly<Record<CommitteeKey, (row: HillCommittee) => SortValue>> = {
  name: (row) => shortCommittee(row.name),
  chair: (row) => row.chair,
  inquiry: (row) => row.inquiries.length,
  standing: (row) => row.standing.value,
};

const COMMITTEE_OPTIONS: readonly SortOption<CommitteeKey>[] = [
  { key: "inquiry", label: "Open investigations" },
  { key: "standing", label: "Toward you" },
  { key: "name", label: "Committee" },
  { key: "chair", label: "Chair" },
];

const shortCommittee = (name: string) => name.replace(/^(Select )?Committee on (the )?/, "");

/** Every committee on one scale of how it regards the administration, as a table that opens with investigations first and sorts by any column. */
function CommitteeTable({ committees, campaign }: { readonly committees: readonly HillCommittee[]; readonly campaign: Campaign }) {
  const [sort, onSort, setSort] = useSort<CommitteeKey>({ key: "inquiry", direction: "descending" });
  const rows = sortRows(committees, sort, COMMITTEE_VALUE, (a, b) => a.standing.value - b.standing.value || a.name.localeCompare(b.name));
  return (
    <div className="hill-sortable">
      <SortPicker options={COMMITTEE_OPTIONS} sort={sort} onSort={setSort} />
      <table className="hill-committees ui-table--stack">
        <caption className="ui-visually-hidden">Committees. Select a column heading to sort.</caption>
        <thead>
          <tr>
            <SortHeader label="Committee" sortKey="name" sort={sort} onSort={onSort} />
            <SortHeader label="Chair" sortKey="chair" sort={sort} onSort={onSort} />
            <SortHeader label="Investigating you" sortKey="inquiry" sort={sort} onSort={onSort} first="descending" />
            <SortHeader label={<span className="hill-committees__ends"><span>Against you</span><span>Even</span><span>With you</span></span>} sortKey="standing" sort={sort} onSort={onSort} />
          </tr>
        </thead>
        <tbody>
          {rows.map((committee) => {
            const face = committee.chairId ? faceOf(campaign, committee.chairId, committee.chair) : undefined;
            return (
              <tr key={committee.id} className={committee.chairHref ? "ui-row-target" : undefined} data-inquiry={committee.inquiries.length > 0 ? "true" : undefined}>
                <th scope="row" data-label="Committee">{shortCommittee(committee.name)}</th>
                <td data-label="Chair">
                  <span className="hill-committees__chair">
                    {committee.chair ? <Portrait name={committee.chair} {...(face?.src ? { src: face.src } : {})} monogram={face?.monogram ?? "?"} size="sm" decorative /> : null}
                    {committee.chair && committee.chairHref ? <Door href={committee.chairHref} className="ui-row-link text-foreground no-underline hover:no-underline">{committee.chair}</Door> : <span className="hill-depth__unknown">No chair seated</span>}
                  </span>
                </td>
                <td data-label="Investigating you">
                  {committee.inquiries.length > 0 ? <span className="hill-committees__inquiry">{committee.inquiries.join("; ")}</span> : <span className="hill-depth__unknown">No</span>}
                </td>
                <td data-label="Toward you">
                  <span className="hill-committees__reading">
                    <span className="hill-committees__scale" role="img" aria-label={`${committee.standing.word} toward you, ${committee.standing.percent}`}>
                      <span className="hill-committees__fill" data-tone={toneOf(committee.standing.stance)}
                        style={{ insetInlineStart: `${Math.min(committee.standing.value, 0.5) * 100}%`, inlineSize: `${Math.abs(committee.standing.value - 0.5) * 100}%` }} />
                      <span className="hill-committees__even" />
                      <span className="hill-committees__dot" style={{ insetInlineStart: `${committee.standing.value * 100}%` }} />
                    </span>
                    <span className="hill-committees__value">{committee.standing.word} {committee.standing.percent}</span>
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** The people a President deals with by name: the leaders, then the committee chairs, investigations first. */
export function LeadersAndChairs({ campaign, leaders, committees }: { readonly campaign: Campaign; readonly leaders: readonly HillLeader[]; readonly committees: readonly HillCommittee[] }) {
  return (
    <section className="hill-card" aria-labelledby="hill-people-title">
      <div className="hill-card__title">
        <h2 id="hill-people-title">The people who run it</h2>
        <HelpTip label="About leaders and chairs">The meter is each leader's and committee's reading of your administration, the same figure their floor and committee stages run on. Open a leader to call, trade or campaign with them.</HelpTip>
      </div>
      <ul className="hill-leaders">{leaders.map((leader) => <LeaderCard key={leader.id} leader={leader} campaign={campaign} />)}</ul>
      <h3 className="hill-subhead">Committees</h3>
      <CommitteeTable committees={committees} campaign={campaign} />
    </section>
  );
}

const LANE_H = 110;

/** One chamber's roll calls across the term: yeas rise and nays fall from the axis, split by party, against the line each needed. */
function RollLane({ entries, seats, label }: { readonly entries: readonly RollHistoryEntry[]; readonly seats: number; readonly label: string }) {
  const step = Math.max(18, Math.min(56, Math.floor(640 / Math.max(1, entries.length))));
  const width = Math.max(200, entries.length * step + 8);
  const half = LANE_H / 2;
  const h = (count: number) => (count / seats) * half;
  const open = useDrawnLinks();
  return (
    <div className="hill-rolls__lane">
      <h3>{label} <span>{entries.length} recorded</span></h3>
      {entries.length === 0 ? <p className="hill-note">No roll call recorded yet.</p> : (
        <div className="hill-rolls__scroll">
          <svg className="hill-rolls__chart" viewBox={`0 0 ${width} ${LANE_H + 4}`} style={{ inlineSize: `${width}px` }} role="img" aria-label={`${label}: ${entries.filter((entry) => entry.passed).length} of ${entries.length} recorded votes carried.`} onClick={open}>
            <line className="hill-rolls__axis" x1={0} x2={width} y1={half + 2} y2={half + 2} />
            {entries.map((entry, i) => {
              const x = 4 + i * step;
              const parties = (["democrat", "independent", "republican"] as const);
              let up = half + 2;
              let down = half + 2;
              return (
                <a key={entry.key} href={entry.href} tabIndex={-1} className="hill-rolls__vote" data-passed={entry.passed ? "true" : undefined}>
                  <title>{`${entry.date}, ${entry.question}: ${entry.title}. ${entry.yeas} yea, ${entry.nays} nay; ${entry.required} needed; ${entry.passed ? "carried" : "failed"}.`}</title>
                  {entry.byParty ? parties.flatMap((party) => {
                    const yea = h(entry.byParty![party].yea);
                    const nay = h(entry.byParty![party].nay);
                    up -= yea;
                    const top = up;
                    const bottom = down;
                    down += nay;
                    return [
                      <rect key={`${party}-y`} data-party={party} x={x} y={top} width={step - 4} height={yea} />,
                      <rect key={`${party}-n`} data-party={party} data-nay="true" x={x} y={bottom} width={step - 4} height={nay} />,
                    ];
                  }) : (
                    <>
                      <rect className="hill-rolls__total" x={x} y={half + 2 - h(entry.yeas)} width={step - 4} height={h(entry.yeas)} />
                      <rect className="hill-rolls__total" data-nay="true" x={x} y={half + 2} width={step - 4} height={h(entry.nays)} />
                    </>
                  )}
                  <line className="hill-rolls__need" x1={x - 1} x2={x + step - 3} y1={half + 2 - h(entry.required)} y2={half + 2 - h(entry.required)} />
                </a>
              );
            })}
          </svg>
        </div>
      )}
    </div>
  );
}

type RollKey = "date" | "bill" | "chamber" | "question" | "margin";

const ROLL_VALUE: Readonly<Record<RollKey, (row: RollHistoryEntry) => SortValue>> = {
  date: (row) => row.turn,
  bill: (row) => row.title,
  chamber: (row) => row.chamber,
  question: (row) => row.question,
  margin: (row) => row.yeas - row.required,
};

const ROLL_OPTIONS: readonly SortOption<RollKey>[] = [
  { key: "date", label: "Date" },
  { key: "margin", label: "Margin over the line" },
  { key: "bill", label: "Bill" },
  { key: "chamber", label: "Chamber" },
  { key: "question", label: "Question" },
];

/** Every recorded roll call of the term as a table, newest first, sortable and paged. */
function RollTable({ history }: { readonly history: readonly RollHistoryEntry[] }) {
  const [sort, onSort, setSort] = useSort<RollKey>({ key: "date", direction: "descending" });
  const rows = useMemo(() => sortRows(history, sort, ROLL_VALUE, (a, b) => a.key.localeCompare(b.key)), [history, sort]);
  return (
    <div className="hill-sortable">
      <SortPicker options={ROLL_OPTIONS} sort={sort} onSort={setSort} />
      <table className="data-table ui-table--stack hill-rolls__table">
        <caption className="ui-visually-hidden">Every recorded roll call this term. Select a column heading to sort.</caption>
        <thead>
          <tr>
            <SortHeader label="Date" sortKey="date" sort={sort} onSort={onSort} first="descending" />
            <SortHeader label="Bill" sortKey="bill" sort={sort} onSort={onSort} />
            <SortHeader label="Chamber" sortKey="chamber" sort={sort} onSort={onSort} />
            <SortHeader label="Question" sortKey="question" sort={sort} onSort={onSort} />
            <SortHeader label="Result" detail="Margin over the line" sortKey="margin" sort={sort} onSort={onSort} first="descending" align="end" className="data-table__num" />
          </tr>
        </thead>
        <Collection as="tbody" columns={5} items={rows} initial={8} noun="roll calls" resetKey={`${sort.key}:${sort.direction}`}
          render={(entry) => (
            <tr key={entry.key} className="ui-row-target" data-passed={entry.passed ? "true" : undefined}>
              <td data-label="Date">{entry.date}</td>
              <th scope="row" data-label="Bill"><Door href={entry.href} className="ui-row-link text-foreground no-underline hover:no-underline">{entry.title}</Door></th>
              <td data-label="Chamber">{entry.chamber === "house" ? "House" : "Senate"}</td>
              <td data-label="Question">{entry.question}</td>
              <td data-label="Result" className="data-table__num"><strong className="hill-rolls__result">{entry.yeas}–{entry.nays} {entry.passed ? "carried" : "failed"}</strong> <span className="cell-quiet">{entry.required} needed</span></td>
            </tr>
          )} />
      </table>
    </div>
  );
}

/** Every roll call of the term, drawn oldest to newest, then listed in full. */
export function RollRecord({ history, chambers, tally }: { readonly history: readonly RollHistoryEntry[]; readonly chambers: readonly CongressChamber[]; readonly tally: TermTally }) {
  return (
    <section className="hill-card" aria-labelledby="hill-rolls-title">
      <div className="hill-card__title">
        <h2 id="hill-rolls-title">The term's record</h2>
        <HelpTip label="About the roll-call record">
          Each column is one recorded vote, oldest at the left. Press one to open its bill. Yeas rise above the line and nays fall below it, in party colors, sized as a share of the chamber. The gold tick is the number the question needed. A pale column is a total the record kept without member names.
        </HelpTip>
      </div>
      <TermStrip tally={tally} />
      <div className="hill-rolls">
        {chambers.map((chamber) => (
          <RollLane key={chamber.chamber} label={chamber.name.replace(/^the /, "The ")} seats={chamber.seats} entries={history.filter((entry) => entry.chamber === chamber.chamber)} />
        ))}
      </div>
      {history.length > 0 ? <RollTable history={history} /> : null}
    </section>
  );
}
