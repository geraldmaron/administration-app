import { useState } from "react";
import type { Campaign } from "@admin/engine";
import { equityReading, fedReading, releaseTimeline, type EconomyMeasure } from "@admin/player-core";
import { Button, Collection, Sheet, Series, Stat, Icon } from "@admin/ui-web";
import { valenceOf } from "../../shell/valence";
import { MarketWorkspace } from "./MarketWorkspace";
import type { MarketPatch, MarketSearch } from "./market-search";
import { useSelectedMeasure } from "./selected-measure";
import { domainOf } from "./scale";

/** The Federal Reserve: its rate, chair and lean, the next meeting, and every decision this term as a step. */
function Fed({ campaign, selected }: { readonly campaign: Campaign; readonly selected: boolean }) {
  const mark = useSelectedMeasure<HTMLLIElement>(selected);
  const [historyOpen, setHistoryOpen] = useState(false);
  const fed = fedReading(campaign);
  const rates = fed.steps.map((step) => step.rate);
  return (
    <li {...mark} id="measure-policy-rate" className="eco-bill">
      <Stat
        label={
          <>
            <Icon name="departmentCentralBank" size={18} /> The Fed&rsquo;s rate
          </>
        }
        value={fed.rate}
        period={`Next decision ${fed.nextMeeting}`}
        reading={
          rates.length > 1 ? (
            <Series label="Recorded rate decisions" variant="step" positions={fed.steps.map((step) => step.at)} labels={fed.steps.map((step) => step.date)} timeRange={[fed.steps[0]!.date, fed.steps[fed.steps.length - 1]!.date]} unitLabel="Policy rate · held between recorded decisions" values={rates} domain={domainOf(rates)} format={(value) => `${value.toFixed(2)}%`} />
          ) : (
            <p className="nation-note">{rates.length === 1 ? `One decision on the record so far, at ${fed.steps[0]!.rate.toFixed(2)}%.` : "No decision on the record yet this term."}</p>
          )
        }
      />
      <p className="nation-note">
        {fed.chair}. {fed.lean}.{fed.pressure ? ` ${fed.pressure}` : ""}
      </p>
      {fed.steps.length > 0 ? (
        <><Button kind="secondary" size="sm" onClick={() => setHistoryOpen(true)}>Federal Reserve decisions</Button><Sheet open={historyOpen} onClose={() => setHistoryOpen(false)} title="Federal Reserve decisions" lead="Recorded policy decisions in this presidency. The Federal Reserve sets its rate independently.">
          <Collection items={[...fed.steps].reverse()} initial={6} noun="meetings" className="eco-commodity__list" render={(step) => <li key={step.date}><strong>{step.date}:</strong> rate {step.rate.toFixed(2)}%, target {step.target.toFixed(2)}%</li>} />
        </Sheet></>
      ) : null}
    </li>
  );
}

/** The stock index, 100 at the oath, with the line this week would have to fall through for a crash. */
function Equities({ campaign }: { readonly campaign: Campaign }) {
  const equity = equityReading(campaign);
  const values = equity.points.map((point) => point.value);
  return (
    <li className="eco-bill" data-stance={equity.stance} data-valence={valenceOf(equity.stance)}>
      <Stat
        label={
          <>
            <Icon name="graph" size={18} /> Stock index
          </>
        }
        value={<span className="ui-valence-ink eco-figure" data-valence={valenceOf(equity.stance)}>{equity.figure}</span>}
        period={`${equity.weekMove}${equity.crashed ? " · a crash" : ""}`}
        reading={<Series label="By week, 100 at the oath" values={values} domain={domainOf([...values, equity.crashLine])} format={(value) => value.toFixed(1)} reference={{ value: equity.crashLine, label: `Dotted line: a fall to ${equity.crashLine.toFixed(1)} this week would be a crash.` }} />}
      />
    </li>
  );
}

/** What the agencies published over the last eight weeks, each with its figure, and when each kind comes next. */
function Calendar({ campaign }: { readonly campaign: Campaign }) {
  const timeline = releaseTimeline(campaign);
  const past = [...timeline.past].reverse();
  return (
    <section className="eco-panel" aria-labelledby="economy-calendar">
      <h2 id="economy-calendar" className="eco-panel__title">
        Release calendar
      </h2>
      <div className="eco-table-wrap">
        <table className="eco-table">
          <caption className="ui-visually-hidden">Coming and recent releases</caption>
          <thead>
            <tr>
              <th scope="col">Release</th>
              <th scope="col">Date</th>
              <th scope="col" className="eco-table__num">Figure</th>
            </tr>
          </thead>
          <tbody>
            {timeline.next.map((entry) => (
              <tr key={`next-${entry.kind}`}>
                <th scope="row">{entry.label}</th>
                <td>
                  {entry.date}, in {-entry.daysAgo} {entry.daysAgo === -1 ? "day" : "days"}
                </td>
                <td className="eco-table__num">Coming</td>
              </tr>
            ))}
            {past.map((entry) => (
              <tr key={`past-${entry.kind}-${entry.date}`}>
                <th scope="row">{entry.label}</th>
                <td>{entry.date}</td>
                <td className="eco-table__num">{entry.figure ?? "Before your term"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/** The markets: the Fed and the stock index, the release calendar and every commodity. */
export function Markets({ campaign, measure, search, onChange }: { readonly campaign: Campaign; readonly measure?: EconomyMeasure | undefined; readonly search: MarketSearch; readonly onChange: (patch: MarketPatch) => void }) {
  return (
    <>
      <MarketWorkspace campaign={campaign} search={search} onChange={onChange} />
      <section className="eco-panel" aria-labelledby="economy-markets">
        <h2 id="economy-markets" className="eco-panel__title">
          Rates and equities
        </h2>
        <ul className="eco-measures">
          <Fed campaign={campaign} selected={measure === "policy-rate"} />
          <Equities campaign={campaign} />
        </ul>
      </section>
      <Calendar campaign={campaign} />
    </>
  );
}
