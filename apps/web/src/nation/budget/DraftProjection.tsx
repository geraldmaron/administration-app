import type { ReactNode } from "react";
import { formatMoney, formatRatio, type AuthorityFlow, type BudgetDraftReading } from "@admin/player-core";
import { Bar, Icon, Tag, type IconName } from "@admin/ui-web";
import { MoveText, type Valence } from "../../shell/valence";
import { pointChange } from "./AllocationEditor";

const ACCOUNT_GLYPH: Readonly<Record<string, IconName>> = { diplomatic: "instrumentDiplomatic", economic: "instrumentEconomic", covert: "instrumentCovert", military: "instrumentMilitary" };

/** The weeks scale a funded authority is drawn on: a year, the span an appropriation is written for. */
const AUTHORITY_SCALE_WEEKS = 52;

type Drafted = Extract<BudgetDraftReading, { ok: true }>;

/** Weeks the authority lasts at a flow's draw, in words. */
export function lastsWords(flow: AuthorityFlow): string {
  if (flow.lapsed) return "Nothing is released while appropriations have lapsed";
  if (!Number.isFinite(flow.turnsFunded)) return "The weekly release covers it";
  return `${Math.round(flow.turnsFunded)} weeks, then arrears`;
}

function weeklyDraw(flow: AuthorityFlow): string {
  return `${formatMoney(flow.accountsDraw + flow.commitmentsDraw)} above upkeep, of ${formatMoney(flow.release)} released a week`;
}

/** The tradeoffs the numbers themselves carry: what the money draws, how long the authority lasts, and what it buys next. */
export function Tradeoffs({ reading }: { readonly reading: Drafted }) {
  const { inForce, draft } = reading.flow;
  return (
    <section className="budget-section" aria-labelledby="budget-tradeoffs" aria-live="polite">
      <h2 id="budget-tradeoffs" className="budget-section__title">
        Material tradeoffs
      </h2>
      <div className="budget-versus" role="table" aria-label="The book in force against your proposal">
        <div className="budget-versus__head" role="row">
          <span role="columnheader">Measure</span>
          <span role="columnheader">Book in force</span>
          <span role="columnheader">Your proposal</span>
        </div>
        <VersusRow icon="schedule" label="Drawn each week" a={<DrawCell flow={inForce} label="Book in force" />} b={<DrawCell flow={draft} label="Your proposal" />} />
        <VersusRow icon="pending" label="How long the authority lasts" a={<LastsCell flow={inForce} label="Book in force" />} b={<LastsCell flow={draft} label="Your proposal" />} />
        <VersusRow icon="budget" label="Draw beyond upkeep, a year" a={<ClaimCell flow={inForce} />} b={<ClaimCell flow={draft} />} />
      </div>
      {reading.horizons.length > 0 ? <Horizons rows={reading.horizons} /> : null}
    </section>
  );
}

function VersusRow({ icon, label, a, b }: { readonly icon: IconName; readonly label: string; readonly a: ReactNode; readonly b: ReactNode }) {
  return (
    <div className="budget-versus__row" role="row">
      <span className="budget-versus__label" role="rowheader">
        <Icon name={icon} size={20} className="budget-versus__icon" />
        {label}
      </span>
      <span className="budget-versus__cell" role="cell" data-label="Book in force">{a}</span>
      <span className="budget-versus__cell" role="cell" data-label="Your proposal">{b}</span>
    </div>
  );
}

/** The week's draw above upkeep against what the week releases: over the line is red. */
function DrawCell({ flow, label }: { readonly flow: AuthorityFlow; readonly label: string }) {
  const draw = flow.accountsDraw + flow.commitmentsDraw;
  const share = flow.release > 0 ? Math.max(0, draw) / flow.release : 0;
  const tone: Valence = draw > flow.release ? "bad" : share > 0.85 ? "watch" : "good";
  return (
    <>
      <span className="budget-figure">{formatMoney(Math.abs(draw))}</span>
      <Bar label={`${label}: ${weeklyDraw(flow)}`} value={share} tone={tone} marks={[{ at: 1, label: `${formatMoney(flow.release)} released a week` }]} />
      <span className="budget-cap">of {formatMoney(flow.release)} released a week</span>
    </>
  );
}

function LastsCell({ flow, label }: { readonly flow: AuthorityFlow; readonly label: string }) {
  const covered = !flow.lapsed && !Number.isFinite(flow.turnsFunded);
  const weeks = covered ? AUTHORITY_SCALE_WEEKS : flow.lapsed ? 0 : flow.turnsFunded;
  const tone: Valence = covered ? "good" : weeks >= AUTHORITY_SCALE_WEEKS ? "good" : "bad";
  return (
    <>
      <span className="budget-figure">{flow.lapsed ? "Closed" : covered ? "Covered" : `${Math.round(flow.turnsFunded)} weeks`}</span>
      <Bar label={`${label}: ${lastsWords(flow)}`} value={weeks / AUTHORITY_SCALE_WEEKS} tone={tone} />
      <span className="budget-cap">{flow.lapsed ? "Nothing is released while appropriations have lapsed" : covered ? "The weekly release covers it" : "then arrears"}</span>
    </>
  );
}

function ClaimCell({ flow }: { readonly flow: AuthorityFlow }) {
  if (Math.abs(flow.annualClaim) < 1) {
    return (
      <>
        <span className="budget-figure">None</span>
        <span className="budget-cap">Holds every account where it stands</span>
      </>
    );
  }
  const drawing = flow.annualClaim > 0;
  return (
    <>
      <span className="budget-figure">
        <MoveText delta={drawing ? 1 : -1} valence={drawing ? "watch" : "good"}>
          {formatMoney(Math.abs(flow.annualClaim))}
        </MoveText>
      </span>
      <span className="budget-cap">
        {drawing ? "Draws" : "Saves"} beyond upkeep, {formatRatio(Math.abs(flow.shareOfDiscretionary))} of discretionary outlays
      </span>
    </>
  );
}

/** Weeks to open each next rung, in force against the proposal, on one shared axis per row; a quicker proposal is marked in favor. */
function Horizons({ rows }: { readonly rows: Drafted["horizons"] }) {
  const longest = Math.max(1, ...rows.flatMap((row) => [row.nowTurns ?? 0, row.draftTurns ?? 0]));
  return (
    <>
      <h3 className="budget-section__subtitle">What the money buys next</h3>
      <ul className="budget-horizons">
        {rows.map((row) => {
          const faster = row.nowTurns !== undefined && row.draftTurns !== undefined && row.draftTurns < row.nowTurns;
          const slower = row.nowTurns !== undefined && row.draftTurns !== undefined && row.draftTurns > row.nowTurns;
          const tone: Valence = faster ? "good" : slower || (row.nowTurns !== undefined && row.draftTurns === undefined) ? "bad" : "neutral";
          return (
            <li key={row.account} className="budget-horizon">
              <Icon name={ACCOUNT_GLYPH[row.account] ?? "budget"} size={24} className="budget-glyph" />
              <span className="budget-horizon__name">
                <strong>{row.milestone}</strong>
                <span className="budget-cap">{row.accountName}, {row.capability}</span>
                <RungProgress row={row} />
              </span>
              <span className="budget-horizon__bars">
                <HorizonBar label="In force" turns={row.nowTurns} longest={longest} tone="neutral" />
                <HorizonBar label="Proposal" turns={row.draftTurns} longest={longest} tone={tone} />
              </span>
            </li>
          );
        })}
      </ul>
    </>
  );
}

/** How far its own figure has climbed toward the rung's gate, a share of the distance from nothing to the requirement. */
function RungProgress({ row }: { readonly row: Drafted["horizons"][number] }) {
  if (!(row.required > 0)) return null;
  const share = Math.min(1, Math.max(0, row.current / row.required));
  const words = `${formatRatio(share)} of the way to ${row.milestone}`;
  return (
    <span className="budget-horizon__progress">
      <Bar label={`${row.capability}: ${words}`} value={share} tone="reading" slim marks={[{ at: 1, label: `${row.milestone} opens here` }]} />
      <span className="budget-cap">{words}</span>
    </span>
  );
}

function HorizonBar({ label, turns, longest, tone }: { readonly label: string; readonly turns: number | undefined; readonly longest: number; readonly tone: Valence }) {
  const words = turns === undefined ? "Not climbing" : `${turns} weeks`;
  return (
    <span className="budget-horizon__bar">
      <span className="budget-cap">{label}</span>
      <Bar label={`${label}: ${words}`} value={turns === undefined ? 0 : turns / longest} tone={tone} />
      <span className="budget-horizon__figure">{words}</span>
    </span>
  );
}

/** The floor's count on every line the proposal changes, chamber by chamber, as the staff assess it before any vote. */
export function CongressionalResponse({ reading }: { readonly reading: Drafted }) {
  const { floor } = reading;
  const lines = floor.accounts.map((entry) => ({
    account: entry.account,
    name: reading.accounts.find((row) => row.account === entry.account)?.name ?? entry.account,
    house: entry.votes.find((vote) => vote.chamber === "house"),
    senate: entry.votes.find((vote) => vote.chamber === "senate"),
  }));
  return (
    <section className="budget-section" aria-labelledby="budget-response">
      <h2 id="budget-response" className="budget-section__title">
        Congressional response <Tag tone="neutral">Assessment</Tag>
      </h2>
      <p className="budget-note">Member support is not recorded. These are the votes each changed line needs, not a forecast of support.</p>
      {lines.length === 0 ? (
        <p className="budget-note">No line differs from the book in force, so there is nothing to vote.</p>
      ) : (
        <ul className="budget-votes">
          {lines.map((line) => {
            return (
              <li key={line.account} className="budget-vote" data-valence="neutral">
                <span className="budget-vote__name">
                  <Icon name={ACCOUNT_GLYPH[line.account] ?? "domesticLedger"} size={24} className="budget-glyph" />
                  {line.name}
                </span>
                <ChamberThreshold chamber="House" vote={line.house} />
                <ChamberThreshold chamber="Senate" vote={line.senate} />
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

type Vote = NonNullable<Drafted["floor"]["accounts"][number]["votes"][number]>;

/** Passage requirements are known even when no member support has been recorded. */
function ChamberThreshold({ chamber, vote }: { readonly chamber: string; readonly vote: Vote | undefined }) {
  return <div className="budget-vote__chamber">
    <span className="budget-vote__chamber-name">{chamber}</span>
    {vote ? <><span><strong>{vote.required}</strong> votes to pass</span>{vote.cloture ? <span className="budget-cap">{vote.cloture.required} to end debate</span> : null}</> : <span className="budget-cap">Not assessed</span>}
  </div>;
}

/** The proposal's headline against the book in force, kept in view while the lines are edited. */
/** The funding date is left to the Funding card and the footer, which already carry it. */
export function ProposalSummary({ reading }: { readonly reading: Drafted }) {
  const { draft, inForce } = reading.totals;
  return (
    <div className="budget-summary" aria-live="polite">
      <span className="budget-summary__figure">
        <strong>{(draft * 100).toFixed(2)}%</strong>
        <span className="budget-cap">of national income a year</span>
      </span>
      {reading.floor.accounts.length === 0 ? (
        <span className="budget-summary__still">
          <Icon name="neutral" size={20} />
          Same as the book in force
        </span>
      ) : (
        <>
          <span className="budget-summary__figure">
            <MoveText delta={draft - inForce} valence="neutral">
              <strong>{pointChange(draft - inForce)}</strong>
            </MoveText>
            <span className="budget-cap">against the book in force</span>
          </span>
          <span className="ui-valence-chip" data-valence="neutral">Congressional support unresolved</span>
        </>
      )}
    </div>
  );
}
