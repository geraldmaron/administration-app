import { EvidencePanel, Flag } from "@admin/ui-web";
import { MAX_PEERS, PEER_GROUP, peerComparisonView, type PeerMeasure } from "@admin/player-core";
import { SeriesChart, type ChartSeries } from "../../shell/compare";
import { Segmented } from "../../shell/compare/Segmented";
import { eraOf, windowOptions } from "./compare-windows";
import { nationFlagUrl } from "../../media/flags";

export const DEFAULT_PEERS = ["USA", "GBR", "DEU"] as const;
const RATE_WORDS: Readonly<Record<PeerMeasure, string>> = {
  unemployment: "Unemployment",
  inflation: "Inflation",
  growth: "Growth",
  population: "Population growth",
};

const percent = (value: number): string => `${value.toFixed(1)}%`;

/**
 * Real countries beside each other in the World Bank's published record, over
 * calendar years. These are not the campaign's simulated governments.
 */
export function ComparePeers({ rate, peers, windowId, onPeers, onWindow }: { readonly rate: PeerMeasure; readonly peers: readonly string[]; readonly windowId: string; readonly onPeers: (peers: readonly string[]) => void; readonly onWindow: (id: string) => void }) {
  const view = peerComparisonView(rate, peers, windowId);
  const full = peers.length >= MAX_PEERS;
  const toggle = (id: string, on: boolean) => onPeers(on ? [...peers, id] : peers.filter((peer) => peer !== id));
  const era = eraOf(view.selected.label);
  const series: readonly ChartSeries[] = view.series.map((entry, index) => ({
    id: entry.id,
    label: entry.evidence === "estimated" ? `${entry.name} (estimate)` : entry.name,
    short: entry.name,
    tone: "reference",
    variant: (index % 4) as 0 | 1 | 2 | 3,
    points: entry.points.map((point) => ({ x: point.year, y: point.value, label: point.label })),
  }));
  return (
    <>
      <fieldset className="compare__peers">
        <legend>
          Countries <span className="compare__count">{peers.length} of {MAX_PEERS} chosen, at least two</span>
        </legend>
        <div className="compare__chips">
          {PEER_GROUP.map((peer) => {
            const on = peers.includes(peer.id);
            const variant = on ? peers.indexOf(peer.id) % 4 : undefined;
            return (
              <label key={peer.id} className="compare__chip" data-on={on ? "true" : undefined} data-variant={variant} data-disabled={!on && full ? "true" : undefined}>
                <input type="checkbox" checked={on} disabled={!on && full} onChange={(event) => toggle(peer.id, event.target.checked)} />
                <span className="compare__swatch" aria-hidden="true" />
                <Flag name={peer.name} src={nationFlagUrl(peer.id)} height={14} decorative />
                {peer.name}
              </label>
            );
          })}
        </div>
      </fieldset>
      <Segmented legend="Years" options={windowOptions(view.windows, "not covered for these countries")} value={view.selected.id} onChange={onWindow} />
      {era ? <p className="cmp-era">{era}</p> : null}
      {view.unavailable ? (
        <p className="nation-note" role="status">
          This can't be drawn: {view.unavailable}
        </p>
      ) : (
        <SeriesChart label={`${RATE_WORDS[rate]}, ${view.selected.label}`} xLabel="Year" format={percent} series={series} />
      )}
      <p className="cmp-source">Source: World Bank, World Development Indicators, by calendar year. Real countries, not the countries in your game.</p>
      <EvidencePanel title={`${RATE_WORDS[rate]}: international comparison basis`} label="Source & comparison basis">
        <p>{view.basis}</p>
        <p>World Bank, World Development Indicators, licensed Creative Commons Attribution 4.0. Attributed to The World Bank Group and the original providers.</p>
        <p>{view.caution}</p>
      </EvidencePanel>
    </>
  );
}
