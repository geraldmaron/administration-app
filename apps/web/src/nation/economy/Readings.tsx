import type { Campaign } from "@admin/engine";
import { CYCLE_PHASE_ORDER, ECONOMY_HISTORY_RATES, cycleReading, economyHistory, economyReading, type EconomyHistoryRate, type EconomyMeasure } from "@admin/player-core";
import { Card, CardContent, Choice, EvidencePanel, Icon, Series, Tag, type IconName } from "@admin/ui-web";
import { valenceOf } from "../../shell/valence";
import { domainOf } from "./scale";
import { Drivers } from "./Drivers";
import { Compare } from "./Compare";
import type { EconomyBasis, MarketPatch, MarketSearch } from "./market-search";

const PHASE_VALENCE = { expansion: "good", peak: "watch", contraction: "bad", trough: "watch" } as const;

const PHASE_WORDS = { expansion: "Expansion", peak: "Peak", contraction: "Contraction", trough: "Trough" } as const;

/** The business cycle as a loop with the economy's place on it marked; a loop has no phase already done. */
export function Cycle({ campaign }: { readonly campaign: Campaign }) {
  const cycle = cycleReading(campaign);
  return (
    <section className="eco-panel" aria-labelledby="economy-cycle">
      <h2 id="economy-cycle" className="eco-panel__title">
        The business cycle
      </h2>
      <ol className="cycle" aria-label={`The business cycle: ${cycle.word}, ${cycle.weeksInPhase} weeks in this phase`}>
        {CYCLE_PHASE_ORDER.map((phase) => (
          <li key={phase} className="cycle__phase" data-current={phase === cycle.phase ? "true" : undefined} data-valence={PHASE_VALENCE[phase]}>
            {PHASE_WORDS[phase]}
          </li>
        ))}
      </ol>
      <p className="nation-note">
        {cycle.word} {cycle.weeksInPhase === 1 ? "One week" : `${cycle.weeksInPhase} weeks`} in this phase. The four phases repeat; the mark is where the economy sits today.
      </p>
    </section>
  );
}

const GLYPH: Readonly<Record<EconomyHistoryRate, IconName>> = { unemployment: "economyUnemployment", inflation: "economyInflation", growth: "economyGrowth" };

function RateSummary({ campaign, rate, selected, onSelect }: { readonly campaign: Campaign; readonly rate: EconomyHistoryRate; readonly selected: boolean; readonly onSelect: () => void }) {
  const reading = economyReading(campaign, rate);
  if (!reading) return null;
  return <li><button type="button" className="economic-signal" data-selected={selected || undefined} aria-pressed={selected} onClick={onSelect}>
    <span className="economic-signal__name"><Icon name={GLYPH[rate]} size={20} /><span>{reading.tile.caption}</span></span>
    <span className="economic-signal__value ui-valence-ink" data-valence={valenceOf(reading.tile.stance)}>{reading.tile.figure}</span>
    <span className="economic-signal__change">{reading.tile.change ? <span className="ui-valence-ink" data-valence={reading.tile.change.better ? "good" : "bad"}>{reading.tile.change.up ? "▲" : "▼"} {reading.tile.change.text}</span> : reading.tile.stanceWord}<span> · {reading.startFigure} at the oath</span></span>
  </button></li>;
}

function Rate({ campaign, rate, historyWindow, onWindow }: { readonly campaign: Campaign; readonly rate: EconomyHistoryRate; readonly historyWindow: "term" | "published"; readonly onWindow: (next: "term" | "published") => void }) {
  const reading = economyReading(campaign, rate);
  const history = economyHistory(campaign, rate);
  if (!reading) return null;
  const points = historyWindow === "term" ? history.points.filter((point) => point.kind === "played") : history.points;
  // No line may invent a monthly history across the unpublished interval before the oath.
  const values = points.map((point) => point.kind === "projected" ? null : point.value);
  const known = values.filter((value): value is number => value !== null);
  const rest = reading.rest?.percent;
  const domain = domainOf(rest === undefined ? known : [...known, rest]);
  const first = points[0];
  const last = points[points.length - 1];
  return <div id={`measure-${rate}`} className="economic-history">
    <Choice legend="History window" layout="segments" value={historyWindow} onChange={(next) => onWindow(next as "term" | "published")} options={[{ value: "term", label: "This administration" }, { value: "published", label: "Published context" }]} />
    {points.length > 0 ? <Series key={`${rate}:${historyWindow}`} label={`${history.label}, ${historyWindow === "term" ? "this administration" : "published and since the oath"}`} values={values} domain={domain} positions={points.map((point) => point.at)} labels={points.map((point) => point.kind === "projected" ? "Unobserved bridge before the oath" : point.label)} timeRange={first && last ? [first.label, last.label] : ["", ""]} format={(value) => `${value.toFixed(1)}%`} variant="area" unitLabel="Percent · actual observation dates" showDomain interactive={historyWindow === "term"} {...(historyWindow === "published" ? { splitAt: history.points.filter((point) => point.kind !== "played").length, splitLabel: "agency history, with the unpublished bridge omitted" } : {})} {...(rest !== undefined && reading.rest ? { reference: { value: rest, label: `Model resting reference: ${reading.rest.figure} (${reading.rest.source}, ${reading.rest.year}). This is not a forecast.` } } : {})} /> : <p className="nation-note">No weekly observation has been recorded in this administration.</p>}
    <div className="economic-history__foot">
      {reading.approval.length > 0 ? <p className="nation-note">Approval contribution: {reading.approval.map((term) => `${term.label.toLowerCase()} ${term.points >= 0 ? "+" : "−"}${Math.abs(term.points).toFixed(1)} pts`).join("; ")}.</p> : null}
      <EvidencePanel title={`${history.label}: source and interpretation`} label="Source & interpretation"><p className="nation-note">{history.source}</p><p>The published series, the opening assumptions and the simulated presidency are different evidence. The unobserved interval before the oath is omitted from the plotted line; no missing monthly values are invented.</p><p>Driver contributions sum to a modeled target. The current rate closes part of that gap over time; a target is not a dated forecast.</p></EvidencePanel>
    </div>
  </div>;
}

/** The current reading, oath baseline and model reference remain in view for every evidence basis. */
function RateContext({ campaign, rate }: { readonly campaign: Campaign; readonly rate: EconomyHistoryRate }) {
  const reading = economyReading(campaign, rate);
  if (!reading) return null;
  return <dl className="economic-benchmarks" aria-label="Selected rate context">
    <div><dt>Current weekly</dt><dd>{reading.tile.figure}</dd><span>Simulated reading</span></div>
    <div><dt>At the oath</dt><dd>{reading.startFigure}</dd><span>Opening baseline</span></div>
    <div><dt>Model resting reference</dt><dd>{reading.rest?.figure ?? "Not assessed"}</dd><span>{reading.rest ? `${reading.rest.source} ${reading.rest.year} · not a policy target` : "No reference is held"}</span></div>
  </dl>;
}

/** A selected rate owns its comparisons, evidence and modeled contributions. */
export function Rates({ campaign, measure, onMeasure, historyWindow, onWindow, basis, onBasis, comparisonWindow, onComparisonWindow, peerSearch, onPeerChange }: { readonly campaign: Campaign; readonly measure?: EconomyMeasure | undefined; readonly onMeasure: (rate: EconomyHistoryRate) => void; readonly historyWindow?: "term" | "published" | undefined; readonly onWindow: (next: "term" | "published") => void; readonly basis: EconomyBasis; readonly onBasis: (basis: EconomyBasis) => void; readonly comparisonWindow: string; readonly onComparisonWindow: (id: string) => void; readonly peerSearch: Pick<MarketSearch, "peers" | "peerWindow">; readonly onPeerChange: (patch: MarketPatch) => void }) {
  const selected = ECONOMY_HISTORY_RATES.find((rate) => rate === measure) ?? "unemployment";
  const selectedWindow = historyWindow ?? (economyHistory(campaign, selected).points.some((point) => point.kind === "played") ? "term" : "published");
  return <section className="economic-observatory" aria-labelledby="economy-rates">
    <h2 id="economy-rates" className="eco-panel__title">Leading measures</h2>
    <ul className="economic-signals">{ECONOMY_HISTORY_RATES.map((rate) => <RateSummary key={rate} campaign={campaign} rate={rate} selected={selected === rate} onSelect={() => onMeasure(rate)} />)}</ul>
    <Card className="economic-investigation"><CardContent className="economic-investigation__body">
      <div className="economic-evidence">
        <div className="economic-history__head"><h3 className="eco-panel__title"><Icon name={GLYPH[selected]} size={20} />{economyHistory(campaign, selected).label}</h3><Tag>{basis === "history" ? "Observed history" : basis === "countries" ? "World Bank reference" : "US record comparison"}</Tag></div>
        <RateContext campaign={campaign} rate={selected} />
        <Choice legend="Evidence basis" layout="segments" value={basis} onChange={onBasis} options={[{ value: "us-record", label: "US record" }, { value: "history", label: "Observed history" }, { value: "countries", label: "Countries" }]} />
        {basis === "history" ? <Rate campaign={campaign} rate={selected} historyWindow={selectedWindow} onWindow={onWindow} /> : <Compare campaign={campaign} rate={selected} countries={basis === "countries"} windowId={comparisonWindow} onWindow={onComparisonWindow} peerSearch={peerSearch} onPeerChange={onPeerChange} />}
      </div>
      <Drivers campaign={campaign} rate={selected} embedded />
    </CardContent></Card>
  </section>;
}
