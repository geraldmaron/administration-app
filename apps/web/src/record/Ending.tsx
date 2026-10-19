import type { Campaign } from "@admin/engine";
import {
  closestCalls,
  electorsReading,
  finaleChamberParties,
  finaleReading,
  formatRatio,
  legacyReading,
  place,
  type FinaleContest,
  type FinaleReading,
  type LegacyMark,
  type LegacyReading,
} from "@admin/player-core";
import { Collection, EmptyState, Gauge, Hemicycle, Series, Tag, buttonClass } from "@admin/ui-web";
import { Door } from "../shell/Door";
import { Screen } from "../shell/Screen";
import { KIND_WORD } from "./legacy-words";
import "./record.css";

function Night({ campaign, contest }: { readonly campaign: Campaign; readonly contest: FinaleContest }) {
  const electors = electorsReading(campaign, contest);
  return (
    <section aria-labelledby="ending-night" className="rec-section">
      <h2 id="ending-night" className="rec-section__title">The final electoral calls</h2>
      {electors.total > 0 ? <Hemicycle label="The Electoral College" parties={electors.parties} majority={electors.majority} verdict={electors.verdict} /> : null}
      <Gauge shape="meter" label="Share of the two-way popular vote" value={contest.share} valueText={formatRatio(contest.share)} tone="identity" marks={[{ at: 0.5, label: "Even" }]} />
      {contest.opponent ? <p className="rec-note">{contest.opponent.introduction}</p> : null}
      {electors.splitStates > 0 ? <p className="rec-note">{electors.splitStates} {electors.splitStates === 1 ? "state split its electors" : "states split their electors"} by district.</p> : null}
      <h3 className="rec-subhead">Where it came down to</h3>
      <Collection
        items={closestCalls(contest)}
        initial={8}
        noun="states, narrowest margin first"
        className="rec-items"
        render={(row) => (
          <li key={row.state} className="rec-item" data-for-you={row.forYou ? "true" : "false"}>
            <p className="rec-item__title">
              {row.name} <Tag tone={row.forYou ? "good" : "risk"}>{row.forYou ? "Carried" : "Lost"}</Tag>
            </p>
            <p className="rec-when">
              {row.electoralVotes} electoral {row.electoralVotes === 1 ? "vote" : "votes"}. {row.margin}.
            </p>
          </li>
        )}
      />
    </section>
  );
}

function Chambers({ finale }: { readonly finale: FinaleReading }) {
  return (
    <section aria-labelledby="ending-chambers" className="rec-section">
      <h2 id="ending-chambers" className="rec-section__title">The Congress the next President meets</h2>
      <div className="rec-chambers">
        {finale.chambers.map((chamber) => (
          <Hemicycle
            key={chamber.chamber}
            label={chamber.name}
            parties={finaleChamberParties(chamber)}
            majority={Math.floor((chamber.composition.administration + chamber.composition.opposition + chamber.composition.independent) / 2) + 1}
            {...(chamber.swing !== undefined ? { verdict: chamber.swing === 0 ? "The last election moved no seats." : `The last election moved ${Math.abs(chamber.swing)} seats ${chamber.swing > 0 ? "toward" : "away from"} the administration.` } : {})}
          />
        ))}
      </div>
    </section>
  );
}

function Term({ legacy }: { readonly legacy: LegacyReading }) {
  const first = legacy.approval[0];
  const last = legacy.approval.at(-1);
  return (
    <section aria-labelledby="ending-term" className="rec-section">
      <h2 id="ending-term" className="rec-section__title">From the oath to the last day</h2>
      <p className="rec-note">
        {legacy.from} to {legacy.to}, {Math.max(1, Math.round(legacy.span / 7))} weeks.
      </p>
      {first && last ? (
        <>
          <Gauge shape="meter" label="Approval on the last day" value={last.value / 100} valueText={formatRatio(last.value / 100)} tone="identity" marks={[{ at: first.value / 100, label: `At the oath, ${formatRatio(first.value / 100)}` }]} caption={`${formatRatio(first.value / 100)} at the oath`} />
          {legacy.approval.length > 2 ? <Series label="Approval, week by week" values={legacy.approval.map((point) => point.value / 100)} format={formatRatio} /> : null}
        </>
      ) : null}
      <p className="rec-note">{legacy.laws.line} {legacy.promises.line}</p>
    </section>
  );
}

function Successor({ finale }: { readonly finale: FinaleReading }) {
  if (!finale.successor) return null;
  return (
    <section aria-labelledby="ending-successor" className="rec-section">
      <h2 id="ending-successor" className="rec-section__title">{finale.successor.name} takes the oath</h2>
      {finale.successor.lines.map((line) => (
        <p key={line} className="rec-note">{line}</p>
      ))}
    </section>
  );
}

function KeyDecisions({ marks }: { readonly marks: readonly LegacyMark[] }) {
  return (
    <section aria-labelledby="ending-decisions" className="rec-section">
      <h2 id="ending-decisions" className="rec-section__title">Key decisions and consequences</h2>
      <Collection
        items={[...marks].reverse()}
        initial={6}
        noun="marks on the term, latest first"
        as="ol"
        className="rec-items"
        empty="Nothing marks the term."
        render={(mark) => (
          <li key={mark.key} className="rec-item" data-tone={mark.tone}>
            <p className="rec-item__title">{mark.label}</p>
            <p className="rec-when">
              <Tag tone={mark.tone === "adverse" ? "risk" : mark.tone === "favorable" ? "good" : "neutral"}>{KIND_WORD[mark.kind]}</Tag> <time>{mark.date}</time>
            </p>
          </li>
        )}
      />
    </section>
  );
}

/** How the presidency ended: the outcome and why, the electors counted, the decisions that marked the term and the Congress left behind. */
export function Ending({ campaign }: { readonly campaign: Campaign }) {
  const finale = finaleReading(campaign);
  const legacy = legacyReading(campaign);
  if (!finale || !legacy) {
    return (
      <Screen title="The presidency is in session" icon="record" eyebrow="The ending" screenClass="workspace" camera="us">
        <div className="rec-ending">
          <section className="rec-section">
            <EmptyState icon="emptyRecord" title="There is no ending to read yet">
              The ending is written when the term closes. <Door href={place.brief()}>Back to the Brief</Door>
            </EmptyState>
          </section>
        </div>
      </Screen>
    );
  }
  return (
    <Screen title={finale.title} icon="record" eyebrow={`The ending · ${finale.when}`} lede={finale.opening} screenClass="workspace" camera="us">
      <div className="rec-ending">
        <p>
          <a className="rec-skip" href="#ending-next">Skip to what comes next</a>
        </p>
        {finale.account ? <p className="rec-account">{finale.account}</p> : null}
        {finale.contest ? <Night campaign={campaign} contest={finale.contest} /> : null}
        <Successor finale={finale} />
        <KeyDecisions marks={legacy.marks} />
        <Term legacy={legacy} />
        <Chambers finale={finale} />
        <p className="rec-closing">{finale.closing}</p>
        <nav id="ending-next" className="rec-next" aria-label="What comes next" tabIndex={-1}>
          <Door href={place.legacy()} className={buttonClass("primary")}>
            Read the legacy
          </Door>
          <Door href={place.record()} className={buttonClass("secondary")}>
            Open the Record
          </Door>
          <Door href={place.administrations()} className={buttonClass("ghost")}>
            Your administrations
          </Door>
        </nav>
      </div>
    </Screen>
  );
}
