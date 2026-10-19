import { useMemo, useState } from "react";
import type { Campaign, CommodityId } from "@admin/engine";
import { commodityBoard, commodityDetail, commodityPriceFigure, equityReading, fedReading, formatDate, isCommodityKey, place, releaseTimeline, sealFor, type CommodityRow } from "@admin/player-core";
import { BenchmarkChart, Button, CardGrid, CardLink, Column, EntityLink, Icon, Pressable, ReadingFrame, Row, Seal, Select, Sheet, Slider, Surface, Text } from "@admin/ui";
import { Collection, DataTable, Diverging, Track, shareSegments, sortRows, type SortState } from "@admin/ui/nation";
import { StackedBar, segmentKeyEntries } from "@admin/ui/news";
import { Panel } from "@admin/ui/world";
import { go } from "../../shell/navigate";
import { COMMODITY_GLYPH } from "../glyphs";
import { VALENCE_TEXT, valenceOf } from "../format";
import { LawTopicHelp } from "../Law";

export type CommoditySort = "registry" | "name" | "change" | "stocks";
export type MarketState = { readonly measure?: string; readonly observation?: number; readonly sort?: CommoditySort; readonly direction?: "ascending" | "descending" };
export type MarketPatch = { readonly [K in keyof MarketState]?: MarketState[K] | undefined };

const DIRECTION = { up: "↑", down: "↓", flat: "▬" } as const;
const changeOf = (row: CommodityRow): number => row.points[row.points.length - 1]!.value / row.points[0]!.value - 1;
const pct = (share: number): string => `${Math.round(share * 1000) / 10}%`;

/** One commodity's recorded history, replayable observation by observation; nothing past the latest observation is drawn. */
function Pulse({ row, observation, onObservation }: { readonly row: CommodityRow; readonly observation: number | undefined; readonly onObservation: (index: number) => void }) {
  const last = row.points.length - 1;
  const index = Math.min(observation ?? last, last);
  const point = row.points[index]!;
  return (
    <Panel title={row.name} icon={COMMODITY_GLYPH[row.id]} lede={`Latest price · ${row.stance === "adverse" ? "Moving the wrong way" : row.stance === "favorable" ? "Moving the right way" : row.stance === "caution" ? "Worth watching" : "No big change"}`}>
      <Row gap="md" wrap>
        <Text variant="figure" tabular>
          {row.figure}
        </Text>
        <Text variant="label" tone={VALENCE_TEXT[valenceOf(row.stance)]}>
          {DIRECTION[row.changeDirection]} {row.sinceOath}
        </Text>
      </Row>
      <BenchmarkChart title={`${row.name} by week`} unit="Price in the unit it is quoted in" period="Week by week, from your oath" help={{ meaning: "The line is this price week by week. Move the slider to step back through past weeks. The dashed line is what came after the week you picked." }} x={row.points.map((entry) => entry.label)} format={(value) => commodityPriceFigure(row.id, value)} series={[{ id: "recorded", label: "Recorded", kind: "self", values: row.points.map((entry, at) => (at <= index ? entry.value : null)) }, ...(index < last ? [{ id: "later", label: "Later weeks", kind: "history" as const, values: row.points.map((entry, at) => (at >= index ? entry.value : null)) }] : [])]} />
      {last > 0 ? <Slider label="Step through past weeks" value={index} min={0} max={last} step={1} onChange={onObservation} valueText={`${point.label}: ${commodityPriceFigure(row.id, point.value)}`} /> : null}
      <Text variant="caption" tone="secondary">
        Showing {point.label} at {commodityPriceFigure(row.id, point.value)}. You can only step through weeks that already happened. Prices are worked out from recorded index numbers.
      </Text>
      <Surface level="sunken" pad="md">
        <Text variant="eyebrow" tone="secondary">
          Where this comes from
        </Text>
        <Text variant="caption">{row.provenance}</Text>
        <Text variant="caption">
          {row.reader}. {row.cause ? `Pushing on it now: ${row.cause}.` : "Nothing is pushing on it right now."}
        </Text>
      </Surface>
    </Panel>
  );
}

/** Current relationships: who supplies it, what moves it now, and what it feeds. */
function Detail({ campaign, id, onCommodity }: { readonly campaign: Campaign; readonly id: CommodityId; readonly onCommodity: (id: CommodityId) => void }) {
  const detail = commodityDetail(campaign, id);
  const leaders = detail.suppliers.slice(0, 3);
  const others = detail.suppliers.slice(3).reduce((sum, supplier) => sum + supplier.share, 0);
  const assigned = detail.suppliers.reduce((sum, supplier) => sum + supplier.share, 0);
  const unassigned = Math.max(0, 1 - assigned);
  const supply = shareSegments([...leaders.map((supplier) => ({ id: supplier.nation, label: supplier.name, share: supplier.share, figure: pct(supplier.share) })), ...(others > 0 ? [{ id: "others", label: "Other suppliers", share: others, figure: pct(others) }] : []), ...(unassigned > 0.0001 ? [{ id: "unassigned", label: "No country listed", share: unassigned, figure: pct(unassigned), muted: true }] : [])]);
  return (
    <Column gap="lg">
      <Panel title="Who supplies it" icon="world" lede="Each country's share of world supply right now. Every bar runs from 0 to 100%.">
        <ReadingFrame title="World supply by country" unit="% of the world's supply" legend={segmentKeyEntries(supply)} pressHint="Press a country below to open its file." help={{ meaning: "The bar is all of the world's supply of this good, cut into each top supplier's share. Other suppliers are grouped together." }}>
        <StackedBar label="World supply" segments={supply} height={14} />
        <Collection items={detail.suppliers} initial={5} noun="suppliers" empty="No suppliers are listed for this one." render={(supplier) => (
          <CardLink key={supplier.nation} pad="sm" radius="chip" minHeight={44} justifyContent="center" label={`Open ${supplier.name}'s file. ${pct(supplier.share)} of world supply`} href={place.country(supplier.nation)} onPress={() => go(place.country(supplier.nation))}>
            <Row gap="sm">
              <Text variant="label" flexBasis={120} flexShrink={1} minWidth={90}>{supplier.name}</Text>
              <Track value={supplier.share} label={`${supplier.name}: ${pct(supplier.share)} of world supply`} />
              <Text variant="label" minWidth={56} textAlign="right">{pct(supplier.share)}</Text>
              <Icon name="chevron" size={14} tone="colorTertiary" />
            </Row>
          </CardLink>
        )} />
        </ReadingFrame>
        {unassigned > 0.0001 ? <Text variant="caption" tone="secondary">The game links {pct(assigned)} of world supply to a country. The other {pct(unassigned)} isn't tied to any one country.</Text> : null}
        <Text variant="label">Stored supply compared with normal: {Math.round(detail.row.stocks * 100)}%</Text>
      </Panel>
      <Panel title="From supplier to you" icon="graph" lede={`Who supplies it → ${detail.row.name.toLowerCase()} → who feels it at home. This shows how they connect, not how much each part matters.`}>
        <CardGrid columns={{ phone: 1, tablet: 1, desktop: 1, wide: 1 }}>
          <Surface level="raised" pad="sm" flexGrow={1}>
            <Text variant="eyebrow" tone="secondary">Top suppliers</Text>
            {leaders.map((supplier) => <EntityLink key={supplier.nation} label={supplier.name} href={place.country(supplier.nation)} onPress={() => go(place.country(supplier.nation))} />)}
          </Surface>
          <Surface level="raised" pad="sm" flexGrow={1}>
            <Icon name={COMMODITY_GLYPH[id]} size={24} tone="gold" />
            <Text variant="label">{detail.row.name}</Text>
            <Text variant="caption" tone="secondary">{detail.family}</Text>
          </Surface>
          {detail.exposureHref ? (
            <CardLink level="raised" pad="sm" flexGrow={1} label={`Open who feels it at home: ${detail.row.reader}`} href={detail.exposureHref!} onPress={() => go(detail.exposureHref!)}>
              <Row gap="sm">
                <Column flex={1} flexBasis="auto" gap="2xs">
                  <Text variant="eyebrow" tone="secondary">Who feels it at home</Text>
                  <Text variant="label">{detail.row.reader}</Text>
                </Column>
                <Icon name="chevron" size={14} tone="colorTertiary" />
              </Row>
            </CardLink>
          ) : (
            <Surface level="raised" pad="sm" flexGrow={1}>
              <Text variant="eyebrow" tone="secondary">Who feels it at home</Text>
              <Text variant="label">{detail.row.reader}</Text>
            </Surface>
          )}
        </CardGrid>
        <Text variant="label">What's moving it now</Text>
        <Collection items={detail.shocks} initial={4} noun="pressures" empty="Nothing is disrupting supply this week." render={(shock) => (
          <Row key={shock.cause} gap="xs" top>
            <Icon name="caution" size={16} tone="warningInk" />
            <Column flex={1}>
              <Text variant="label">{shock.cause}</Text>
              <Text variant="caption" tone="secondary">{shock.share}</Text>
            </Column>
          </Row>
        )} />
        {detail.shocks.length > 0 ? <Text variant="caption" tone="tertiary">These problems can overlap, so we don't add them up into one total loss.</Text> : null}
        {detail.inputs.length > 0 ? (
          <Column gap="2xs">
            <Text variant="label">Costs that reach it later</Text>
            {detail.inputs.map((input) => (
              <CardLink key={input.id} pad="sm" radius="chip" minHeight={44} justifyContent="center" label={`Look at ${input.text}`} onPress={() => onCommodity(input.id)}>
                <Row gap="sm">
                  <Icon name={COMMODITY_GLYPH[input.id]} size={16} tone="gold" />
                  <Text variant="label" flex={1} flexBasis="auto">{input.text}</Text>
                  <Icon name="chevron" size={14} tone="colorTertiary" />
                </Row>
              </CardLink>
            ))}
          </Column>
        ) : null}
      </Panel>
    </Column>
  );
}

/** Percentage changes share a scale even when the underlying quote units differ. */
function ChangeComparison({ rows, selected, onSelect }: { readonly rows: readonly CommodityRow[]; readonly selected: CommodityId; readonly onSelect: (id: CommodityId) => void }) {
  const bound = Math.max(0.05, ...rows.map((row) => Math.abs(changeOf(row))));
  return (
    <Panel title="Which prices are moving" icon="graph" lede={`How much each price has changed since you took office, all on the same scale (±${(bound * 100).toFixed(1)}%). Left means falling and right means rising. A rise isn't always bad, and a fall isn't always good.`}>
      <ReadingFrame title="Price change since you took office" unit="% change, all on one scale" legend={[{ id: "change", kind: "swatch", label: "Each bar is a price's change: right is a rise, left is a fall", ink: "accent" }]} pressHint="Press a commodity to look at it above." help={{ meaning: "Each row is one price. The bar starts at a center line and grows right for a rise and left for a fall. A rise isn't always bad, and a fall isn't always good." }}>
      {rows.map((row) => (
        <Pressable key={row.id} role="radio" aria-checked={row.id === selected} aria-label={`${row.name}: ${(changeOf(row) * 100).toFixed(1)}% since you took office`} onPress={() => onSelect(row.id)} flexDirection="row" alignItems="center" gap="sm" padding="2xs" backgroundColor={row.id === selected ? "infoFill" : "transparent"}>
          <Icon name={COMMODITY_GLYPH[row.id]} size={16} tone="colorSecondary" />
          <Text variant="caption" width={120}>{row.name}</Text>
          <Diverging value={changeOf(row)} scale={bound} tone="reading" />
          <Text variant="caption" weight="strong" minWidth={56} textAlign="right">{changeOf(row) > 0 ? "+" : ""}{(changeOf(row) * 100).toFixed(1)}%</Text>
        </Pressable>
      ))}
      </ReadingFrame>
    </Panel>
  );
}

function Board({ rows, sort, onSort, onSelect }: { readonly rows: readonly CommodityRow[]; readonly sort: SortState<CommoditySort>; readonly onSort: (sort: SortState<CommoditySort>) => void; readonly onSelect: (id: CommodityId) => void }) {
  const shown = sort.key === "registry" ? rows : sortRows(rows, sort, { registry: () => 0, name: (row) => row.name, change: changeOf, stocks: (row) => row.stocks });
  return (
    <Panel id="economy-commodities" title="All commodities" icon="sectorPortsShipping" lede="Commodities are raw goods like oil, grain, and metals. Each price uses its own unit, so compare how much prices changed, not the prices themselves.">
      <DataTable<CommodityRow, CommoditySort>
        caption="Every commodity with its price, change since you took office, and stored supply"
        rows={shown}
        rowKey={(row) => row.id}
        sort={sort}
        onSort={onSort}
        noun="commodities"
        initial={20}
        columns={[
          { id: "name", label: "Commodity", sortKey: "name", render: (row) => <Column><EntityLink icon={COMMODITY_GLYPH[row.id]} label={row.name} onPress={() => onSelect(row.id)} /><Text variant="caption" tone="tertiary">{row.reader}</Text></Column> },
          { id: "price", label: "Price / index", align: "end", render: (row) => <Text variant="label" tabular>{row.figure}</Text> },
          { id: "change", label: "Since you took office", sortKey: "change", first: "descending", align: "end", render: (row) => <Text variant="label" tone={VALENCE_TEXT[valenceOf(row.stance)]}>{DIRECTION[row.changeDirection]} {row.sinceOath.replace(/ since the oath$/, "")}</Text> },
          { id: "stocks", label: "Stored vs. normal", sortKey: "stocks", align: "end", render: (row) => <Text variant="label" tabular>{Math.round(row.stocks * 100)}% of normal</Text> },
        ]}
      />
    </Panel>
  );
}

/** The Federal Reserve: its rate, chair and lean, the next meeting, and every decision this term as a step. */
function Fed({ campaign }: { readonly campaign: Campaign }) {
  const [open, setOpen] = useState(false);
  const fed = fedReading(campaign);
  return (
    <Panel title="The Fed's interest rate" emblem={<Seal spec={sealFor("INST-FED")} size={40} />} lede={`${fed.chair}. ${fed.lean}.${fed.pressure ? ` ${fed.pressure}` : ""}`}>
      <Row gap="md" wrap>
        <Text variant="figure" tabular>{fed.rate}</Text>
        <Text variant="label" tone="secondary">Next decision {fed.nextMeeting}</Text>
      </Row>
      {fed.steps.length > 1 ? <BenchmarkChart title="Rate decisions so far" unit="% interest rate" period="At each Fed meeting this term" help={{ meaning: "The solid line is the rate the Fed set at each meeting. The dashed line is the rate it was aiming for." }} x={fed.steps.map((step) => step.date)} format={(value) => `${value.toFixed(2)}%`} series={[{ id: "rate", label: "Interest rate", kind: "self", values: fed.steps.map((step) => step.rate) }, { id: "target", label: "Target", kind: "history", values: fed.steps.map((step) => step.target) }]} /> : <Text variant="caption" tone="secondary">{fed.steps.length === 1 ? `The Fed has made 1 decision so far, setting the rate at ${fed.steps[0]!.rate.toFixed(2)}%.` : "The Fed hasn't made a rate decision yet this term."}</Text>}
      <LawTopicHelp topic="central-bank" compact />
      {fed.steps.length > 0 ? <Button kind="secondary" size="compact" icon="schedule" onPress={() => setOpen(true)}>Federal Reserve decisions</Button> : null}
      <Sheet open={open} onClose={() => setOpen(false)} title="Federal Reserve decisions" eyebrow="During your term">
        <Text variant="body" tone="secondary">The Federal Reserve sets its interest rate on its own, without orders from you.</Text>
        <Collection items={[...fed.steps].reverse()} initial={6} noun="meetings" render={(step) => <Text key={step.date} variant="body"><Text weight="strong">{step.date}:</Text> rate {step.rate.toFixed(2)}%, target {step.target.toFixed(2)}%</Text>} />
      </Sheet>
    </Panel>
  );
}

/** The stock index, 100 at the oath, with the line this week would have to fall through for a crash. */
function Equities({ campaign }: { readonly campaign: Campaign }) {
  const equity = equityReading(campaign);
  return (
    <Panel id="economy-markets" title="Stock index" icon="graph" lede={`${equity.weekMove}${equity.crashed ? " · a crash" : ""}`}>
      <Text variant="figure" tone={VALENCE_TEXT[valenceOf(equity.stance)]} tabular>{equity.figure}</Text>
      <BenchmarkChart title="By week, starting at 100 when you took office" unit="Index points, 100 = the day you took office" period="Week by week" help={{ meaning: "The line is the stock index. The gold line is 100, where it stood when you took office. The red dotted line is the level a fall this week would have to reach to count as a crash." }} x={equity.points.map((point) => point.label)} format={(value) => value.toFixed(1)} series={[{ id: "index", label: "Index", kind: "self", values: equity.points.map((point) => point.value) }]} benchmarks={[{ id: "crash", label: `A fall to ${equity.crashLine.toFixed(1)} this week would be a crash`, value: equity.crashLine, kind: "danger" }, { id: "oath", label: "When you took office", value: 100, kind: "historical" }]} />
    </Panel>
  );
}

/** What the agencies published over the last eight weeks and when each kind comes next. */
function Releases({ campaign }: { readonly campaign: Campaign }) {
  const timeline = releaseTimeline(campaign);
  const rows = [...timeline.next.map((entry) => ({ key: `next-${entry.kind}`, label: entry.label, date: `${entry.date}, in ${-entry.daysAgo} ${entry.daysAgo === -1 ? "day" : "days"}`, figure: "Coming" })), ...[...timeline.past].reverse().map((entry) => ({ key: `past-${entry.kind}-${entry.date}`, label: entry.label, date: entry.date, figure: entry.figure ?? "Before your term" }))];
  return (
    <Panel title="Economic reports" icon="schedule">
      <DataTable caption="Reports coming up and just out" rows={rows} rowKey={(row) => row.key} noun="releases" initial={12} columns={[{ id: "label", label: "Release", render: (row) => <Text variant="label">{row.label}</Text> }, { id: "date", label: "Date", render: (row) => <Text variant="caption">{row.date}</Text> }, { id: "figure", label: "Figure", align: "end", render: (row) => <Text variant="label" tabular>{row.figure}</Text> }]} />
    </Panel>
  );
}

/** The markets: one commodity investigated at a time, the board across all of them, the Fed, the stock index and the release calendar. */
export function Markets({ campaign, state, onChange }: { readonly campaign: Campaign; readonly state: MarketState; readonly onChange: (patch: MarketPatch) => void }) {
  const rows = useMemo(() => commodityBoard(campaign).flatMap((family) => family.rows), [campaign]);
  const selected: CommodityId = state.measure && isCommodityKey(state.measure) ? state.measure : "crude";
  const detail = useMemo(() => commodityDetail(campaign, selected), [campaign, selected]);
  const choose = (measure: CommodityId) => onChange({ measure, observation: undefined });
  return (
    <Column gap="lg">
      <Surface level="raised" pad="lg" accentEdge="gold">
        <Row gap="md" top>
          <Icon name={COMMODITY_GLYPH[selected]} size={32} tone="gold" />
          <Column flex={1} gap="2xs">
            <Text variant="eyebrow" tone="secondary">As of {formatDate(campaign.calendar)}</Text>
            <Text variant="title">{detail.row.reader}</Text>
            <Text variant="body" tone="secondary">{detail.shocks.length > 0 ? `Supply has ${detail.shocks.length} ${detail.shocks.length === 1 ? "problem" : "problems"} right now. Look at its price history and who supplies it.` : "Supply is steady right now. You can still look at its price history, who supplies it, and what feeds its price."}</Text>
          </Column>
        </Row>
      </Surface>
      <Select label="Commodity" options={rows.map((row) => ({ value: row.id, label: row.name }))} value={selected} onChange={choose} />
      <Row gap="lg" wrap top>
        <Column flex={3} minWidth={300}>
          <Pulse key={selected} row={detail.row} observation={state.observation} onObservation={(observation) => onChange({ observation })} />
        </Column>
        <Column flex={2} minWidth={300}>
          <Detail campaign={campaign} id={selected} onCommodity={choose} />
        </Column>
      </Row>
      <ChangeComparison rows={rows} selected={selected} onSelect={choose} />
      <Board rows={rows} sort={{ key: state.sort ?? "registry", direction: state.direction ?? "ascending" }} onSort={(next) => onChange({ sort: next.key, direction: next.direction })} onSelect={choose} />
      <Row gap="lg" wrap top>
        <Column flex={1} minWidth={300}><Fed campaign={campaign} /></Column>
        <Column flex={1} minWidth={300}><Equities campaign={campaign} /></Column>
      </Row>
      <Releases campaign={campaign} />
    </Column>
  );
}
