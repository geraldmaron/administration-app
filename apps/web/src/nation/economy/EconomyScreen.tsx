import type { Campaign } from "@admin/engine";
import { cycleReading, type EconomyMeasure } from "@admin/player-core";
import { Icon, Tabs, Tag } from "@admin/ui-web";
import { Screen } from "../../shell/Screen";
import { ByState } from "./ByState";
import { useNationCommit } from "./commit";
import { Finances } from "./Finances";
import { Household, Trade } from "./Household";
import { Levers } from "./Levers";
import { Markets } from "./Markets";
import { Cycle, Rates } from "./Readings";
import type { EconomyView, MarketPatch, MarketSearch } from "./market-search";
import "./economy.css";

export { ECONOMY_VIEWS, isEconomyView } from "./market-search";
export type { EconomyView } from "./market-search";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "markets", label: "Markets" },
  { id: "trade", label: "Trade" },
  { id: "finances", label: "Public finances" },
  { id: "levers", label: "Market levers" },
] as const;

export type EconomyScreenProps = {
  readonly campaign: Campaign;
  readonly view: EconomyView;
  readonly onView: (view: EconomyView) => void;
  /** The measure a door named, such as the rate a release just printed; drawn selected and brought into view. */
  readonly measure?: EconomyMeasure | undefined;
  readonly market: MarketSearch;
  readonly onMarket: (patch: MarketPatch) => void;
};

/**
 * The national economy: a few leading measures and what is moving them first,
 * then the markets, trade, the public finances and the President's market
 * levers each in their own view. Jobs, prices and output by state are a ranked
 * table in the overview.
 */
export function EconomyScreen({ campaign, view, onView, measure, market, onMarket }: EconomyScreenProps) {
  const acts = useNationCommit(campaign);
  const cycle = cycleReading(campaign);
  return (
    <Screen icon="economyGrowth" title="Economy" eyebrow="Nation · work, prices and output" lede="Track conditions, inspect the modeled transmission channels, and follow exposure into markets, partners and policy." screenClass="workspace" measure="data" camera="us">
      <div className="nation-room economy">
        <Tabs label="Views of the economy" compact tabs={TABS} selected={view} onSelect={(next) => onView(next as EconomyView)}>
          {view === "markets" ? (
            <Markets campaign={campaign} measure={measure} search={market} onChange={onMarket} />
          ) : view === "trade" ? (
            <Trade campaign={campaign} />
          ) : view === "finances" ? (
            <Finances campaign={campaign} />
          ) : view === "levers" ? (
            <section className="eco-panel" aria-labelledby="economy-levers">
              <h2 id="economy-levers" className="eco-panel__title">
                Your levers on the markets
              </h2>
              <Levers campaign={campaign} acts={acts} />
            </section>
          ) : (
            <>
              <header className="economy-brief">
                <Tag icon="economyGrowth">{cycle.word}</Tag>
              </header>
              <Rates campaign={campaign} measure={measure} onMeasure={(next) => onMarket({ measure: next })} historyWindow={market.historyWindow} onWindow={(historyWindow) => onMarket({ historyWindow })} basis={market.basis ?? "us-record"} onBasis={(basis) => onMarket({ basis })} comparisonWindow={market.comparisonWindow ?? "2017-2019"} onComparisonWindow={(comparisonWindow) => onMarket({ comparisonWindow })} peerSearch={market} onPeerChange={onMarket} />
              <div className="economy-paths" aria-label="Investigate the economy">
                {[
                  { view: "markets" as const, icon: "graph" as const, name: "Markets & supply", note: "Commodity prices, stocks, suppliers and input connections" },
                  { view: "trade" as const, icon: "world" as const, name: "Trade & exposure", note: "Partner flows and the country actions that change them" },
                  { view: "finances" as const, icon: "budget" as const, name: "Public finances", note: "Revenue, spending, debt and the federal balance" },
                  { view: "levers" as const, icon: "order" as const, name: "Presidential levers", note: "Compare available interventions and their tradeoffs" },
                ].map((path) => <button key={path.view} type="button" className="economy-path" onClick={() => onView(path.view)}><Icon name={path.icon} size={22} /><span><strong>{path.name}</strong><small>{path.note}</small></span><span aria-hidden="true">→</span></button>)}
              </div>
              <div className="economy-households"><Household campaign={campaign} /><Cycle campaign={campaign} /></div>
              <ByState campaign={campaign} />
            </>
          )}
        </Tabs>
      </div>
    </Screen>
  );
}
