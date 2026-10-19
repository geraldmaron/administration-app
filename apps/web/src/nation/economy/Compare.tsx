import type { Campaign } from "@admin/engine";
import { comparisonView, type EconomyHistoryRate } from "@admin/player-core";
import { EvidencePanel, Field, NativeSelect, Tag } from "@admin/ui-web";
import { SeriesChart, type ChartSeries } from "../../shell/compare";
import type { MarketPatch, MarketSearch } from "./market-search";
import { ComparePeers, DEFAULT_PEERS } from "./ComparePeers";
import { eraOf, windowYears } from "./compare-windows";
import "./compare.css";

const RATE_WORDS: Readonly<Record<EconomyHistoryRate, string>> = { unemployment: "Unemployment", inflation: "Inflation", growth: "Growth" };
const percent = (value: number): string => `${value.toFixed(1)}%`;

function gapWords(gap: number): string {
  if (Math.abs(gap) < 0.05) return "Level with the published line";
  return `Yours is ${Math.abs(gap).toFixed(1)} points ${gap > 0 ? "below" : "above"} the published line`;
}

/** One synchronized rate, with published and played observations on the same percentage/month axes. */
function AgainstUnitedStates({ campaign, rate, windowId, onWindow }: { readonly campaign: Campaign; readonly rate: EconomyHistoryRate; readonly windowId: string; readonly onWindow: (id: string) => void }) {
  const view = comparisonView(campaign, rate, windowId);
  const approximate = view.verdict.status === "transform" && view.verdict.approximate;
  const era = eraOf(view.selected.label);
  const series: readonly ChartSeries[] = view.series.map((entry) => ({
    id: entry.id,
    label: entry.evidence === "observed" ? `${entry.label} (published)` : `${entry.label} (simulated)`,
    short: entry.id === "played" ? "This presidency" : "United States",
    tone: entry.id === "played" ? "played" : "reference",
    points: entry.points.map((point) => ({ x: point.month, y: point.value, label: point.label })),
  }));
  return <>
    <Field label="Historical US window">{(control) => <NativeSelect {...control} value={view.selected.id} onChange={(event) => onWindow(event.target.value)}>{view.windows.map((window) => <option key={window.id} value={window.id} disabled={!window.available}>{windowYears(window.label)}{window.available ? "" : " · not covered"}</option>)}</NativeSelect>}</Field>
    <div className="economic-comparison__flags"><Tag>{rate === "growth" ? "Quarterly comparison" : "Monthly comparison"}</Tag>{era ? <span className="nation-note">{era}</span> : null}{approximate ? <Tag tone="caution" icon="caution">Approximate comparison</Tag> : null}</div>
    {view.unavailable ? <p className="nation-note" role="status">This stretch can't be drawn: {view.unavailable}</p> : <SeriesChart label={`${RATE_WORDS[rate]}, ${view.selected.label}`} xLabel="Months since the start" format={percent} formatGap={gapWords} series={series} empty="No comparable observations are held for this stretch." />}
    {view.series[1] && view.series[1].points.length === 0 && !view.unavailable ? <p className="nation-note" role="status">Your {rate === "growth" ? "quarterly" : "monthly"} comparison starts after a full {rate === "growth" ? "quarter" : "month"} of this presidency. Use the current weekly reading above until then.</p> : null}
    <p className="nation-note">Published United States record and this presidency share percentage and elapsed-month axes. These are different calendar periods, not a causal test.</p>
    <EvidencePanel title={`${RATE_WORDS[rate]}: comparison method`} label="Method & comparability"><p>{view.basis}</p>{view.verdict.status === "transform" ? <ul>{view.verdict.steps.map((step) => <li key={step}>{step}</li>)}</ul> : null}{approximate && rate === "inflation" ? <p>Your inflation is an annual rate; the published line is a twelve-month change. Their comparison is approximate.</p> : null}<p>{view.caution}</p></EvidencePanel>
  </>;
}

/** Benchmark basis belongs to the selected signal; it has no independent default measure. */
export function Compare({ campaign, rate, countries, windowId, onWindow, peerSearch, onPeerChange }: { readonly campaign: Campaign; readonly rate: EconomyHistoryRate; readonly countries: boolean; readonly windowId: string; readonly onWindow: (id: string) => void; readonly peerSearch: Pick<MarketSearch, "peers" | "peerWindow">; readonly onPeerChange: (patch: MarketPatch) => void }) {
  const peers = { peers: peerSearch.peers ?? DEFAULT_PEERS, windowId: peerSearch.peerWindow ?? "2007-2012", onPeers: (peers: readonly string[]) => onPeerChange({ peers }), onWindow: (peerWindow: string) => onPeerChange({ peerWindow }) };
  return <div className="economic-comparison">{countries ? <><p className="nation-note">World Bank reference: real countries and historical calendar years, not simulated governments.</p><ComparePeers rate={rate} {...peers} /><EvidencePanel title="Population growth: real-country reference" label="Population growth reference"><ComparePeers rate="population" {...peers} /></EvidencePanel></> : <AgainstUnitedStates campaign={campaign} rate={rate} windowId={windowId} onWindow={onWindow} />}</div>;
}
