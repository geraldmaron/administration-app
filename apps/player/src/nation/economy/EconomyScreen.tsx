import type { Campaign } from "@admin/engine";
import { ECONOMY_HISTORY_RATES, cycleReading, place, sealFor, type EconomyMeasure } from "@admin/player-core";
import { Tag, CardGrid, CardLink, Column, Icon, Page, Row, Seal, Text, type IconName } from "@admin/ui";
import { ViewTabs } from "@admin/ui/nation";
import { Levers } from "./Levers";
import { Markets } from "./Markets";
import { ByState, Cycle, Finances, Household, Trade } from "./Panels";
import { DEFAULT_PEERS, Rates } from "./Rates";
import type { EconomySearch, EconomyView } from "./search";
import { PendingCard } from "../../shell/Pending";

type Patch = { readonly [K in keyof EconomySearch]?: EconomySearch[K] | undefined };

const PATHS: readonly { readonly view: EconomyView; readonly icon: IconName; readonly name: string; readonly note: string }[] = [
  { view: "markets", icon: "graph", name: "Markets & supply", note: "Prices of oil, grain, metals, and other raw goods, and who supplies them" },
  { view: "trade", icon: "world", name: "Trade & exposure", note: "What the US buys from and sells to each country, and what changes it" },
  { view: "finances", icon: "budget", name: "Budget and debt", note: "What the government takes in, spends, and owes" },
  { view: "levers", icon: "order", name: "What you can do", note: "Compare what you can do about prices and what each choice costs" },
];

function Overview({ campaign, search, onSearch }: { readonly campaign: Campaign; readonly search: EconomySearch; readonly onSearch: (patch: Patch) => void }) {
  const rate = ECONOMY_HISTORY_RATES.find((entry) => entry === search.measure);
  return (
    <Column gap="lg">
      <Rates
        campaign={campaign}
        {...(rate ? { measure: rate as EconomyMeasure } : {})}
        onMeasure={(measure) => onSearch({ measure })}
        {...(search.historyWindow ? { historyWindow: search.historyWindow } : {})}
        onWindow={(historyWindow) => onSearch({ historyWindow })}
        basis={search.basis ?? "us-record"}
        onBasis={(basis) => onSearch({ basis })}
        comparisonWindow={search.comparisonWindow ?? "2017-2019"}
        onComparisonWindow={(comparisonWindow) => onSearch({ comparisonWindow })}
        peers={search.peers ?? DEFAULT_PEERS}
        onPeers={(peers) => onSearch({ peers })}
        peerWindow={search.peerWindow ?? "2007-2012"}
        onPeerWindow={(peerWindow) => onSearch({ peerWindow })}
      />
      <CardGrid columns={{ phone: 1, tablet: 2, desktop: 4, wide: 4 }} role="list" aria-label="Look closer at the economy">
        {PATHS.map((path) => (
          <CardLink href={`${place.economy()}?view=${path.view}`} key={path.view} role="link" label={`Open ${path.name}. ${path.note}`} onPress={() => onSearch({ view: path.view, measure: undefined, observation: undefined })} flexGrow={1} pad="md" gap="2xs">
            <Row gap="xs">
              <Icon name={path.icon} size={20} tone="gold" />
              <Text variant="label" flex={1}>
                {path.name}
              </Text>
              <Icon name="chevron" size={14} tone="colorTertiary" />
            </Row>
            <Text variant="caption" tone="secondary">
              {path.note}
            </Text>
          </CardLink>
        ))}
      </CardGrid>
      <Household campaign={campaign} />
      <Cycle campaign={campaign} />
      <ByState campaign={campaign} />
    </Column>
  );
}

/**
 * The national economy: the leading measures and what is moving them, set
 * against the published record, real countries and the governments in play;
 * then the markets, trade, the public finances and the President's levers.
 */
export function EconomyScreen({ campaign, search, onSearch }: { readonly campaign: Campaign; readonly search: EconomySearch; readonly onSearch: (patch: Patch) => void }) {
  const view = search.view ?? "overview";
  const cycle = cycleReading(campaign);
  return (
    <Page eyebrow="Council of Economic Advisers" icon="economyGrowth" title="Economy" emblem={<Seal spec={sealFor("INST-TREASURY")} size={72} />} actions={<Tag tone="info" icon="economyGrowth">{cycle.word}</Tag>}>
      <ViewTabs<EconomyView>
        label="Economy sections"
        tabs={[
          { id: "overview", label: "Overview" },
          { id: "markets", label: "Markets" },
          { id: "trade", label: "Trade" },
          { id: "finances", label: "Budget and debt" },
          { id: "levers", label: "What you can do" },
        ]}
        selected={view}
        onSelect={(next) => onSearch({ view: next === "overview" ? undefined : next, measure: undefined, observation: undefined })}
      />
      {view === "markets" ? (
        <Markets campaign={campaign} state={{ ...(search.measure ? { measure: search.measure } : {}), ...(search.observation !== undefined ? { observation: search.observation } : {}), ...(search.sort ? { sort: search.sort } : {}), ...(search.direction ? { direction: search.direction } : {}) }} onChange={(patch) => onSearch(patch as Patch)} />
      ) : view === "trade" ? (
        <Column gap="lg">
          <PendingCard campaign={campaign} title="Trade investigations under way" only={(item) => item.about.some((key) => key.startsWith("sector:"))} />
          <Trade campaign={campaign} />
        </Column>
      ) : view === "finances" ? (
        <Finances campaign={campaign} />
      ) : view === "levers" ? (
        <Levers campaign={campaign} />
      ) : (
        <Overview campaign={campaign} search={search} onSearch={onSearch} />
      )}
    </Page>
  );
}
