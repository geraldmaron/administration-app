import { useMemo, useState } from "react";
import type { Campaign } from "@admin/engine";
import type { NationId } from "@admin/world";
import { CYCLE_PHASE_ORDER, bilateralTradePartners, cycleReading, deficitDriverReading, formatMoney, householdReadings, place, stateEconomyBoard, tradeBalance, type BilateralTrade, type HouseholdReading, type StateEconomyRow } from "@admin/player-core";
import { Pane, Button, CardGrid, Column, Icon, ReadingFrame, Row, Sparkline, Surface, Text, View, sparklineKey, type IconName } from "@admin/ui";
import { DataTable, FigureBand, TrackRow, sortRows, type SortState } from "@admin/ui/nation";
import { Position } from "../budget/Books";
import { go } from "../../shell/navigate";
import { toneKey } from "../keys";
import { VALENCE_TEXT, valenceOf } from "../format";
import { DriverTable } from "./Rates";

const PHASE_WORDS = { expansion: "Growing", peak: "Peak", contraction: "Shrinking", trough: "Low point" } as const;
const PHASE_INK = { expansion: "successInk", peak: "warningInk", contraction: "danger", trough: "warningInk" } as const;

/** The business cycle as a loop with the economy's place on it marked; a loop has no phase already done. */
export function Cycle({ campaign }: { readonly campaign: Campaign }) {
  const cycle = cycleReading(campaign);
  return (
    <Pane title="The business cycle" icon="graph" line={`The business cycle is the economy's repeating loop of growing and shrinking. ${cycle.word} It has been there for ${cycle.weeksInPhase === 1 ? "1 week" : `${cycle.weeksInPhase} weeks`}, and the dot marks it below.`}>
      <CardGrid columns={{ phone: 2, tablet: 4, desktop: 4, wide: 4 }} gap="sm" role="list" aria-label={`The business cycle. ${cycle.word} ${cycle.weeksInPhase} weeks so far.`}>
        {CYCLE_PHASE_ORDER.map((phase) => {
          const current = phase === cycle.phase;
          return (
            <View key={phase} role="listitem" flexGrow={1} padding="sm" justifyContent="center" borderRadius="chip" borderWidth={current ? 2 : 1} borderColor={current ? PHASE_INK[phase] : "borderColor"} backgroundColor={current ? "surfaceRaised" : "surface"}>
              <Text variant="label" tone={current ? "primary" : "tertiary"} center>
                {current ? "● " : ""}
                {PHASE_WORDS[phase]}
              </Text>
            </View>
          );
        })}
      </CardGrid>
    </Pane>
  );
}

const BILL_GLYPH: Readonly<Record<HouseholdReading["key"], IconName>> = { pump: "commodityRefinedFuel", grocery: "sectorFoodProcessing", "home-energy": "sectorUtilities" };

function Bill({ reading }: { readonly reading: HouseholdReading }) {
  const values = reading.points.filter((point) => point.kind !== "projected").map((point) => point.value);
  const ahead = reading.points.filter((point) => point.kind === "projected");
  const valence = valenceOf(reading.stance);
  return (
    <Surface level="raised" pad="md" flexGrow={1}>
      <Column gap="xs">
        <Row gap="xs">
          <Icon name={BILL_GLYPH[reading.key]} size={18} tone="gold" />
          <Text variant="label">{reading.label}</Text>
        </Row>
        <Row gap="sm" between>
          <Text variant="heading" tone={VALENCE_TEXT[valence]} tabular>
            {reading.figure}
          </Text>
          {values.length > 1 ? <Sparkline values={values} valence={valence} /> : null}
        </Row>
        <Text variant="caption" tone="secondary">
          {reading.sinceOath}
        </Text>
        {values.length > 1 ? null : <Text variant="caption" tone="tertiary">There aren't enough weeks yet to show a trend.</Text>}
        {ahead.length > 0 ? (
          <Text variant="caption" tone="info">
            Where it's likely headed: {ahead.map((point) => point.value.toFixed(2)).join(" → ")} {reading.unit}. This is the game's estimate, not what has happened.
          </Text>
        ) : null}
        <Text variant="caption" tone="tertiary">
          {reading.lag}
        </Text>
      </Column>
    </Surface>
  );
}

/** The pump, the grocery bill and the heating and power bill, each with the weeks its lag has already decided. */
export function Household({ campaign }: { readonly campaign: Campaign }) {
  return (
    <Pane id="economy-household" title="What families pay" icon="building">
      <ReadingFrame title="What families pay, week by week" unit="Price per unit, in dollars" legend={[...toneKey({ good: "Getting cheaper", watch: "Worth watching", bad: "Getting dearer" }), ...sparklineKey("neutral")]} help={{ meaning: "Each card is a price a household feels. The small line is that price week by week, and the arrow at its end shows which way it moved. The words under the figure say how much it has changed since you took office." }}>
        <CardGrid columns={{ phone: 1, tablet: 1, desktop: 3, wide: 3 }}>
          {householdReadings(campaign).map((reading) => (
            <Bill key={reading.key} reading={reading} />
          ))}
        </CardGrid>
      </ReadingFrame>
    </Pane>
  );
}

type PartnerSort = "name" | "exports" | "imports" | "share";

/** The balance of goods trade and the partners behind it, each partner's goods in both directions. */
export function Trade({ campaign }: { readonly campaign: Campaign }) {
  const trade = tradeBalance(campaign);
  const larger = Math.max(trade.imports, trade.exports, 1);
  const [sort, setSort] = useState<SortState<PartnerSort>>({ key: "share", direction: "descending" });
  const found = useMemo(() => (Object.keys(campaign.nations) as NationId[]).flatMap((id): BilateralTrade[] => {
    const row = bilateralTradePartners(campaign, id);
    return row && row.imports + row.exports > 0 ? [row] : [];
  }), [campaign]);
  // The share is each partner's slice of the same total, so ranking by the total ranks the share.
  const partners = useMemo(() => sortRows(found, sort, { name: (row) => row.name, exports: (row) => row.exports, imports: (row) => row.imports, share: (row) => row.imports + row.exports }, (a, b) => a.name.localeCompare(b.name)), [found, sort]);
  return (
    <Column gap="lg">
      <Pane title="Trade in goods" icon="subjectTrade" line="What the US buys from and sells to every country, counting the tariffs and embargoes in place now. A tariff is a tax on goods from abroad, and an embargo stops trade. You set both on each country's page.">
        <FigureBand label="Goods trade" items={[{ label: "Goods per year", value: `${trade.balance < 0 ? "Deficit of " : "Surplus of "}${formatMoney(Math.abs(trade.balance))}`, note: "What we sell minus what we buy" }]} />
        <ReadingFrame title="Goods sold and bought, per year" unit="Dollars per year, both bars on one scale" legend={[{ id: "bar", kind: "swatch", label: "Bar length: the longer of the two fills the track", ink: "accent" }]} help={{ meaning: "Two bars on the same scale, one for what the country sells abroad and one for what it buys. The longer bar is the bigger flow, and the difference is the trade balance." }}>
          <TrackRow name="Sold abroad (exports)" figure={formatMoney(trade.exports)} value={trade.exports / larger} />
          <TrackRow name="Bought from abroad (imports)" figure={formatMoney(trade.imports)} value={trade.imports / larger} />
        </ReadingFrame>
      </Pane>
      <Pane title="Partners" icon="world">
        <DataTable<BilateralTrade, PartnerSort>
          caption="Yearly trade in goods with each country"
          rows={partners}
          rowKey={(row) => row.nation}
          sort={sort}
          onSort={setSort}
          initial={10}
          noun="partners"
          empty="The United States isn't trading goods with any country right now."
          rowPress={{ href: (row) => place.country(row.nation), onPress: (row) => go(place.country(row.nation)), label: (row) => `Open ${row.name}'s file` }}
          columns={[
            { id: "name", label: "Partner", sortKey: "name", render: (row) => <Text variant="label">{row.name}</Text> },
            { id: "exports", label: "Sold to them", sortKey: "exports", first: "descending", align: "end", render: (row) => <Text variant="label" tabular>{row.exportsText}</Text> },
            { id: "imports", label: "Bought from them", sortKey: "imports", first: "descending", align: "end", render: (row) => <Text variant="label" tabular>{row.importsText}</Text> },
            { id: "share", label: "Share of all US trade in goods", sortKey: "share", first: "descending", align: "end", render: (row) => <Text variant="label" tabular>{row.usShareText ?? "Not known"}</Text> },
          ]}
        />
      </Pane>
    </Column>
  );
}

type StateSort = "name" | "unemployment" | "jobsGap" | "pricesGap" | "output";
const percentOne = (rate: number): string => `${(rate * 100).toFixed(1)}%`;
const signedPoints = (rate: number): string => `${rate < 0 ? "−" : "+"}${(Math.abs(rate) * 100).toFixed(1)} pts`;
const signedRatio = (ratio: number): string => `${ratio < 0 ? "−" : "+"}${(Math.abs(ratio) * 100).toFixed(0)}%`;

/** A state worse off than the country reads as bad, better as good; a gap under the published precision is level. */
function Gap({ value, text }: { readonly value: number; readonly text: string }) {
  const level = Math.abs(value) < 0.0005;
  return (
    <Text variant="label" tone={level ? "primary" : value > 0 ? "danger" : "success"} tabular>
      {level ? "" : value > 0 ? "▲ " : "▼ "}
      {text}
    </Text>
  );
}

/** Every state's jobs, prices and output against the country, ranked by the measure picked; model readings, not surveys. */
export function ByState({ campaign }: { readonly campaign: Campaign }) {
  const [sort, setSort] = useState<SortState<StateSort>>({ key: "unemployment", direction: "descending" });
  const board = useMemo(() => stateEconomyBoard(campaign), [campaign]);
  const ranked = useMemo(() => sortRows(board.rows, sort, { name: (row: StateEconomyRow) => row.name, unemployment: (row) => row.unemployment, jobsGap: (row) => row.jobsGap, pricesGap: (row) => row.pricesGap, output: (row) => row.output }, (a, b) => a.name.localeCompare(b.name)), [board, sort]);
  if (board.rows.length === 0) return null;
  return (
    <Pane title="By state" icon="mapPin" line={`Unemployment across the country is ${percentOne(board.nationalUnemployment)}. Each state's number starts there and adds that state's usual difference from the country.`}>
      <DataTable<StateEconomyRow, StateSort>
        caption="States by jobs, prices, and what they produce"
        rows={ranked}
        rowKey={(row) => row.state}
        sort={sort}
        onSort={setSort}
        initial={10}
        noun="states"
        rowPress={{ href: (row) => place.state(row.state), onPress: (row) => go(place.state(row.state)), label: (row) => `Open ${row.name}` }}
        columns={[
          { id: "name", label: "State", sortKey: "name", render: (row) => <Text variant="label">{row.name}</Text> },
          { id: "unemployment", label: "Unemployment", sortKey: "unemployment", first: "descending", align: "end", render: (row) => <Text variant="label" tabular>{percentOne(row.unemployment)}</Text> },
          { id: "jobsGap", label: "Compared with the country", sortKey: "jobsGap", first: "descending", align: "end", render: (row) => <Gap value={row.jobsGap} text={signedPoints(row.jobsGap)} /> },
          { id: "pricesGap", label: "Cost of living compared with the country", sortKey: "pricesGap", first: "descending", align: "end", render: (row) => <Gap value={row.pricesGap} text={signedRatio(row.pricesGap)} /> },
          { id: "output", label: "Value produced per year", sortKey: "output", first: "descending", align: "end", render: (row) => <Text variant="label" tabular>{formatMoney(row.output)}</Text> },
        ]}
      />
    </Pane>
  );
}

/** The public finances as the economy reads them: the federal position, and what put this year's balance where it is. */
export function Finances({ campaign }: { readonly campaign: Campaign }) {
  const deficit = deficitDriverReading(campaign);
  return (
    <Column gap="lg">
      <Position campaign={campaign} />
      {deficit ? (
        <Pane title="What's behind this year's deficit or surplus" icon="domesticLedger">
          <DriverTable title="This year's balance" summary={deficit.balance} rows={deficit.rows} goodWhen="up" />
        </Pane>
      ) : null}
      <Row>
        <Button kind="secondary" size="compact" icon="budget" onPress={() => go(place.budget())}>
          See the full budget
        </Button>
      </Row>
    </Column>
  );
}
