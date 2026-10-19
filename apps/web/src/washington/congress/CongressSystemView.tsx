import { useMemo, useState, type ReactNode } from "react";
import { campaignDay, type Campaign } from "@admin/engine";
import {
  BILL_LANES,
  FLOOR_GROUP_TITLE,
  appropriationReading,
  chamberStandings,
  congressSystem,
  dispositionReading,
  electionCountdownReading,
  extensionNotices,
  hillCommittees,
  hillLeaders,
  nextSenateClass,
  place,
  presidentLean,
  rollHistory,
  termTally,
  warPowersReading,
  type CongressSeat,
  type CongressSystem,
  type NextSenateClass,
} from "@admin/player-core";
import { NativeSelect, Button, BarRows, HelpTip, Icon, Tag } from "@admin/ui-web";
import { MapView } from "../../map/MapView";
import { Door } from "../../shell/Door";
import { ExplainerNote } from "../../shell/ExplainerNote";
import { valenceOf } from "../../shell/valence";
import { ChamberPanel, voteOf, type CongressSelection, type SeatMode } from "./ChamberSeats";
import { WhereYouStand } from "./AisleView";
import { LeadersAndChairs, RollRecord } from "./CongressStory";
import { senateNominations } from "./senate-nominations";
import { aisleFromSearch, withAisle, type CongressSearch, type CongressChange } from "./search";
import "./congress-system.css";

const HILL_LENSES = [
  { id: "house", label: "House" },
  { id: "senate", label: "Senate" },
  { id: "delegation-warmth", label: "Toward you" },
] as const;

/** Funding this close to running out is the President's business this week. */
const FUNDING_WATCH_WEEKS = 8;

/**
 * Congress as one system, each fact in one place. It opens on the week: what
 * waits on the President and how the Hill regards the administration. Then the
 * chambers as their members sit beside where they come from, where the
 * President stands among them, the bills on their path, the term's record and
 * the people who run it. The tabs below hold the full working lists.
 */
export function CongressSystemView({ campaign, search, onSearch }: { readonly campaign: Campaign; readonly search?: CongressSearch; readonly onSearch?: CongressChange }) {
  const system = useMemo(() => congressSystem(campaign), [campaign]);
  const story = useMemo(() => ({
    tally: termTally(campaign),
    history: rollHistory(campaign),
    leaders: hillLeaders(campaign),
    committees: hillCommittees(campaign),
    senateClass: nextSenateClass(campaign),
    you: presidentLean(campaign),
  }), [campaign]);
  const [localSelection, setLocalSelection] = useState<CongressSelection>({});
  const [localMode, setLocalMode] = useState<SeatMode>("party");
  const [localLens, setLocalLens] = useState("house");
  const selection = search ? { state: search.state, seat: search.seat } : localSelection;
  const mode = search?.color ?? localMode;
  const lens = search?.map ?? localLens;
  const setSelection = (next: CongressSelection) => onSearch ? onSearch({ ...search, state: next.state, seat: next.seat }) : setLocalSelection(next);
  const setMode = (next: SeatMode) => onSearch ? onSearch({ ...search, color: next }) : setLocalMode(next);
  const setLens = (next: string) => onSearch ? onSearch({ ...search, map: next as CongressSearch["map"] }) : setLocalLens(next);
  const house = system.chambers.find((chamber) => chamber.chamber === "house")!;
  const senate = system.chambers.find((chamber) => chamber.chamber === "senate")!;
  const anyRoll = system.chambers.some((chamber) => chamber.lastRoll);
  return (
    <div className="hill-system">
      <HillWeek campaign={campaign} system={system} {...(story.senateClass ? { senateClass: story.senateClass } : {})} />
      <section className="hill-card" aria-labelledby="hill-seats-title">
        <div className="hill-card__title">
          <h2 id="hill-seats-title">The chambers</h2>
          <HelpTip label="About the seating chart">
            Each mark is a sitting member, seated left to right by party and then by the economic position on their public record. Press one to open that member's file. Gold rings are the leaders you deal with by name. Switch to the last recorded vote to see how every member voted on the newest roll call each chamber took. Choose a state in the member list to light its members everywhere.
          </HelpTip>
          <div className="hill-switch" role="group" aria-label="Color the seats by">
            <button type="button" aria-pressed={mode === "party"} onClick={() => setMode("party")}>Party</button>
            <button type="button" aria-pressed={mode === "vote"} disabled={!anyRoll} title={anyRoll ? undefined : "Neither chamber has recorded a roll call yet"} onClick={() => setMode("vote")}>Last recorded vote</button>
          </div>
        </div>
        <div className="hill-system__canvas">
          <div className="hill-system__chambers">
            <ChamberPanel chamber={house} mode={mode} selection={selection} onSelect={setSelection} />
            <ChamberPanel chamber={senate} mode={mode} selection={selection} onSelect={setSelection} />
          </div>
          <div className="hill-system__side">
            <SelectionCard system={system} mode={mode} selection={selection} onSelect={setSelection} />
          </div>
        </div>
      </section>
      <MapView title="Where the members come from" lens={lens} lenses={HILL_LENSES} onLens={setLens} camera="us" selection={selection.state ? `state:${selection.state}` : undefined} height={460}
        onChoose={(ref) => ref.startsWith("state:") && setSelection({ state: ref.slice("state:".length) })}
        note="Each state in the party of its delegation, in proportion where it is split. Choose a state here or in the member list to light its delegation." />
      <WhereYouStand campaign={campaign} chambers={system.chambers} you={story.you} lenses={search ? { house: aisleFromSearch(search, "house"), senate: aisleFromSearch(search, "senate") } : undefined} onLens={onSearch ? (chamber, next) => { void onSearch(withAisle(search ?? {}, chamber, next)); } : undefined} {...(story.senateClass ? { senateClass: story.senateClass } : {})} />
      <BillFlow system={system} />
      <RollRecord history={story.history} chambers={system.chambers} tally={story.tally} />
      <LeadersAndChairs campaign={campaign} leaders={story.leaders} committees={story.committees} />
    </div>
  );
}

type WeekItem = { readonly key: string; readonly kind: "desk" | "clock" | "funding" | "quiet"; readonly body: ReactNode };

function weekItems(campaign: Campaign, system: CongressSystem): readonly WeekItem[] {
  const desk = system.bills.filter((bill) => bill.lane === "desk");
  const floor = system.bills.filter((bill) => bill.lane === "floor");
  const nominations = senateNominations(campaign, campaignDay(campaign)).before;
  const war = warPowersReading(campaign);
  const money = appropriationReading(campaign);
  return [
    ...desk.map((bill): WeekItem => ({ key: bill.id, kind: "desk", body: <><Door href={bill.href}>{bill.title}</Door>: {bill.line}</> })),
    ...(war.unauthorized.length > 0 ? [{ key: "war", kind: "clock" as const, body: <><strong>{war.headline}.</strong> {war.detail}</> }] : []),
    ...extensionNotices(campaign).map((notice): WeekItem => ({ key: notice.id, kind: "clock", body: <>{notice.line} <Door href={notice.home}>Open the War Powers paper</Door>.</> })),
    ...(money.windowWeeks > 0 && money.weeksLeft <= FUNDING_WATCH_WEEKS ? [{ key: "funding", kind: "funding" as const, body: <><strong>{money.headline}.</strong> {money.detail}</> }] : []),
    { key: "floor", kind: "quiet", body: floor.length === 0 ? "No bill is on either floor this week." : <>{floor.length === 1 ? "One bill is" : `${floor.length} bills are`} on the floor: {floor.map((bill, i) => <span key={bill.id}>{i > 0 ? ", " : ""}<Door href={bill.href}>{bill.title}</Door></span>)}.</> },
    { key: "nominations", kind: "quiet", body: nominations.length === 0 ? "No nominee of yours is before the Senate." : <>{nominations.length === 1 ? "One nominee is" : `${nominations.length} nominees are`} before the Senate. <Button asChild kind="secondary" className="justify-between py-3 text-left"><Door href={`${place.congress()}?view=nominations`}>See the nominations</Door></Button>.</> },
  ];
}

/** The week on the Hill: what waits on the President, how the Hill regards the administration, and when the voters next weigh in. */
function HillWeek({ campaign, system, senateClass }: { readonly campaign: Campaign; readonly system: CongressSystem; readonly senateClass?: NextSenateClass }) {
  const items = weekItems(campaign, system);
  const urgent = items.filter((item) => item.kind !== "quiet").length;
  const desk = items.filter((item) => item.kind === "desk").length;
  const room = dispositionReading(campaign);
  const election = electionCountdownReading(campaign);
  return (
    <section className="hill-week" aria-labelledby="hill-week-title" data-urgent={urgent > 0 ? "true" : undefined}>
      <header className="hill-week__heading">
        <h2 id="hill-week-title"><Icon name="subjectCapitol" size={18} /> Congressional operating picture</h2>
        <span>Disposition · 0–100% · even at 50%</span>
      </header>
      <BarRows label="Congressional disposition toward the administration" labelWidth="10rem" slim figureInk rows={[
        { id: "congress", label: "Congress", value: room.value, figure: room.percent, tone: valenceOf(room.stance), marks: [{ at: 0.5, label: "Even at 50%" }], spoken: `Congress: ${room.percent}, ${room.word}. ${room.verdict}` },
        ...chamberStandings(campaign).map((row) => ({ id: row.chamber, label: row.name.replace(/^the /, ""), value: row.standing.value, figure: row.standing.percent, tone: valenceOf(row.standing.stance), marks: [{ at: 0.5, label: "Even at 50%" }], spoken: `${row.name}: ${row.standing.percent}, ${row.standing.word}` })),
      ]} />
      <p className="hill-week__interpretation">{room.word}. {room.verdict} Disposition is not a vote forecast.</p>
      <nav className="hill-week__workload" aria-label="Congressional workload">
        <Button asChild kind="secondary" className="justify-between py-3 text-left"><Door href={`${place.congress()}?view=bills`}><Icon name="gavel" size={20} /><span className="flex-1">Bills on the floor</span><Tag tone="neutral">{system.bills.filter((bill) => bill.lane === "floor").length}</Tag></Door></Button>
        <Button asChild kind="secondary" className="justify-between py-3 text-left"><Door href={`${place.congress()}?view=nominations`}><Icon name="appoint" size={20} /><span className="flex-1">Nominees in review</span><Tag tone="neutral">{senateNominations(campaign, campaignDay(campaign)).before.length}</Tag></Door></Button>
        <Button asChild kind="secondary" className="justify-between py-3 text-left"><Door href={`${place.congress()}?view=bills`}><Icon name="sign" size={20} /><span className="flex-1">Awaiting signature</span><Tag tone={desk > 0 ? "caution" : "neutral"}>{desk}</Tag></Door></Button>
      </nav>
      <div className="hill-week__needs">
        {urgent > 0 ? <>
          <h3 className="hill-week__title"><Icon name={desk > 0 ? "sign" : "caution"} size={16} />{desk > 0 ? `${desk} ${desk === 1 ? "bill awaits" : "bills await"} signature` : "Action required"}</h3>
          <ul className="hill-week__list">{items.filter((item) => item.kind !== "quiet").map((item) => <li key={item.key} data-kind={item.kind}>{item.body}</li>)}</ul>
        </> : null}
        {election ? (
          <p className="hill-week__clock">
            <strong>{election.headline}.</strong> Every House seat{senateClass ? ` and the Class ${senateClass.seatClass} Senate seats` : ""} face the voters.
          </p>
        ) : null}
      </div>

    </section>
  );
}

type CardProps = { readonly system: CongressSystem; readonly mode: SeatMode; readonly selection: CongressSelection; readonly onSelect: (selection: CongressSelection) => Promise<void> | void };

function MemberLine({ member, system, mode }: { readonly member: CongressSeat; readonly system: CongressSystem; readonly mode: SeatMode }) {
  const roll = system.chambers.find((chamber) => chamber.chamber === member.chamber)?.lastRoll;
  const vote = mode === "vote" && roll ? voteOf(roll, member.seat) : undefined;
  return (
    <>
      <span className="hill-pick__dot" data-party={member.party} aria-hidden="true" />
      <span className="hill-pick__who">
        {member.href ? <Door href={member.href} className="ui-row-link">{member.name}</Door> : member.name}
        <span>{member.chamber === "house" ? `House, ${member.seat}` : `Senate${member.seatClass ? `, class ${member.seatClass}` : ""}`}{member.post ? ` · ${member.post}` : ""}{member.vacant ? " · seat awaits replacement" : ""}</span>
      </span>
      {vote ? <span className="hill-pick__vote" data-vote={vote}>{vote === "none" ? "No recorded vote" : vote === "yea" ? "Yea" : "Nay"}</span> : null}
    </>
  );
}

/** The selected seat, or every member from the selected state, with a state picker for keyboard and screen-reader use. */
function SelectionCard({ system, mode, selection, onSelect }: CardProps) {
  const members = system.chambers.flatMap((chamber) => chamber.members);
  const state = selection.state;
  const delegation = state ? system.delegations.find((entry) => entry.state === state) : undefined;
  const from = state ? members.filter((member) => member.state === state).sort((a, b) => a.chamber.localeCompare(b.chamber) || a.seat.localeCompare(b.seat)) : [];
  return (
    <section className="hill-pick" aria-live="polite" aria-labelledby="hill-pick-title">
      <h3 id="hill-pick-title">{delegation ? delegation.name : "Choose a state"}</h3>
      <label className="hill-pick__field">
        <span>Show a state's members</span>
        <NativeSelect className="ui-input" value={state ?? ""} onChange={(event) => onSelect(event.target.value ? { state: event.target.value } : {})}>
          <option value="">All states</option>
          {system.delegations.map((entry) => <option key={entry.state} value={entry.state}>{entry.name}</option>)}
        </NativeSelect>
      </label>
      {delegation ? (
        <>
          <p className="hill-note">Delegation {delegation.standing.word.toLowerCase()} toward you ({delegation.standing.percent}).</p>
          <ul className="hill-pick__list">
            {from.map((member) => (
              <li key={member.seat} data-selected={selection.seat === member.seat ? "true" : undefined} {...(member.href ? { className: "ui-row-target" } : {})}>
                <MemberLine member={member} system={system} mode={mode} />
              </li>
            ))}
          </ul>
          <button type="button" className="hill-link" onClick={() => onSelect({})}>Clear the selection</button>
        </>
      ) : (
        <p className="hill-note">Choose a state here to light its members in both chambers and on the map below, and list them. Press any seat to open that member's file.</p>
      )}
    </section>
  );
}

/** Every bill in the chambers on the one path it travels, counted once where it stands. */
function BillFlow({ system }: { readonly system: CongressSystem }) {
  const live = system.bills.length;
  return (
    <section className="hill-card" aria-labelledby="hill-flow-title">
      <div className="hill-card__title">
        <h2 id="hill-flow-title">Bills in Congress</h2>
        <Door href={`${place.congress()}?view=bills`} className="hill-card__action">Propose a bill</Door>
      </div>
      <p className="hill-note">{live === 0 ? "No bill is moving in either chamber." : `${live} ${live === 1 ? "bill is" : "bills are"} moving, each counted once where it stands. A bill that stalls three times dies.`}</p>
      <ol className="hill-flow" aria-label="Bill path">
        {BILL_LANES.map((lane) => {
          const bills = system.bills.filter((bill) => bill.lane === lane);
          return (
            <li key={lane} className="hill-flow__lane" data-lane={lane} data-empty={bills.length === 0 ? "true" : undefined}>
              <h3 className="hill-flow__name"><span>{FLOOR_GROUP_TITLE[lane]}</span><strong>{bills.length}</strong></h3>
              <ul className="hill-flow__bills" aria-label={`Path: ${FLOOR_GROUP_TITLE[lane]}`}>
                {bills.map((bill) => (
                  <li key={bill.id} className="ui-row-target"><Door href={bill.href} className="ui-row-link">{bill.title}</Door><span>{bill.sponsor}</span></li>
                ))}
              </ul>
            </li>
          );
        })}
      </ol>
      <ExplainerNote id="bill-to-law" />
    </section>
  );
}
