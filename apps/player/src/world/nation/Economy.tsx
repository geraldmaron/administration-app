import { useState } from "react";
import { place, type NationFile, type NationVital, type TradeSectorRow } from "@admin/player-core";
import { Badge, Button, Column, Icon, Pressable, ReadingFrame, Row, Segmented, Stat, StatGrid, Surface, Text } from "@admin/ui";
import { BarScale, PairedBars, Panel, ShareBar, StateChip, StepReading, Unread } from "@admin/ui/world";
import { BandFrame, FlagOf, RowTo, TopicLaw, go, stanceValence } from "../parts";
import { compareHref } from "../../compare/subjects";
import { NATION_METRICS } from "../compare";
import { countryActHref } from "../params";
import { barPercent, rowsToShow, tradeGlyph, tradeKey, tradeScale } from "../trade";
import { PowerStats } from "./Figures";
import { VITAL_GLYPH } from "./Overview";

const SECTORS_FIRST = 8;
const PARTNERS_FIRST = 8;

function Vital({ vital }: { readonly vital: NationVital }) {
  if (vital.unread) return <Unread>{`${vital.caption}: unknown. Our intelligence agencies don't know enough yet about the people who run this country.`}</Unread>;
  return <StepReading icon={VITAL_GLYPH[vital.key]} label={vital.caption} lit={vital.level ?? 2} word={vital.word} valence={stanceValence(vital.stance)} {...(vital.line ? { caption: vital.line } : {})} />;
}

type SectorSort = "ranked" | "goods" | "imports" | "exports" | "tariff";

const SECTOR_VALUE: Readonly<Record<SectorSort, (row: TradeSectorRow) => number | string>> = {
  ranked: (row) => row.imports + row.exports,
  goods: (row) => row.name,
  imports: (row) => row.imports,
  exports: (row) => row.exports,
  tariff: (row) => row.tariffPercent,
};

function sorted(rows: readonly TradeSectorRow[], key: SectorSort): readonly TradeSectorRow[] {
  const value = SECTOR_VALUE[key];
  return [...rows].sort((a, b) => {
    const left = value(a);
    const right = value(b);
    return typeof left === "number" && typeof right === "number" ? right - left : String(left).localeCompare(String(right));
  });
}

function SectorRow({ row, scale, picked, onPick }: { readonly row: TradeSectorRow; readonly scale: number; readonly picked: boolean; readonly onPick: (sector: string | undefined) => void }) {
  return (
    <Pressable onPress={() => onPick(picked ? undefined : row.sector)} role="button" aria-pressed={picked} aria-label={`${row.name}: we buy ${row.importsText} and sell ${row.exportsText} a year, tariff ${row.tariffPercent > 0 ? `${row.tariffPercent}%` : "none"}`} padding="sm" borderRadius="control" borderWidth={picked ? 2 : 1} borderColor={picked ? "accent" : "borderColor"} backgroundColor={picked ? "infoFill" : { default: "surface", hover: "surfaceHover" }}>
      <Row gap="md" wrap>
        <Row gap="sm" width={220} flexShrink={1}>
          <Icon name={tradeGlyph(row)} size={22} tone="colorSecondary" />
          <Text variant="label" flex={1}>
            {row.name}
          </Text>
          {picked ? <Badge status="info">Selected</Badge> : null}
        </Row>
        <PairedBars buy={barPercent(row.imports, scale)} sell={barPercent(row.exports, scale)} />
        <Row gap="md" wrap maxWidth="100%">
          <Stat label="US imports / year" value={row.importsText} size="title" minWidth={110} />
          <Stat label="US exports / year" value={row.exportsText} size="title" minWidth={110} />
          <Stat label="Tariff now" value={row.tariffPercent > 0 ? `${row.tariffPercent}%` : "None"} size="title" minWidth={110} />
        </Row>
      </Row>
    </Pressable>
  );
}

function SelectedGoods({ file, sector }: { readonly file: NationFile; readonly sector: string | undefined }) {
  const row = file.trade.sectors.find((entry) => entry.sector === sector);
  if (!row) {
    return (
      <Text variant="body" tone="secondary">
        Pick a kind of goods to see how much we trade and what you can do about it.
      </Text>
    );
  }
  return (
    <Surface level="raised" pad="md" accentEdge="accent" role="region" aria-label={`${row.name}: selected goods`}>
      <Column gap="sm">
        <Row gap="sm" wrap>
          <Icon name={tradeGlyph(row)} size={24} tone="accent" />
          <Text variant="title" flex={1}>
            {row.name}
          </Text>
          <TopicLaw topic="tariffs" />
        </Row>
        <Text variant="body">
          The United States buys {row.importsText} and sells {row.exportsText} a year. The tariff, a tax on these goods when they come in, is {row.tariffPercent}% now.
        </Text>
        {row.tariffable && row.imports > 0 ? (
          <Row>
            <Button kind="primary" size="compact" icon="subjectTrade" onPress={() => go(countryActHref(file.nation, { option: "tariff", sector: row.sector }, { view: "economy", sector: row.sector }))}>
              {`Set up a tariff on ${row.name}`}
            </Button>
          </Row>
        ) : (
          <Text variant="body" tone="secondary">
            {row.tariffable ? "We don't buy any of these goods from them, so there's nothing to tariff." : "These goods are handled with licenses and export rules, not tariffs."}
          </Text>
        )}
        <Text variant="caption" tone="tertiary">
          Next you'll pick the rate, see what it would do, and review it. Nothing happens until you approve it.
        </Text>
      </Column>
    </Surface>
  );
}

function Sectors({ file, sector, onSector }: { readonly file: NationFile; readonly sector: string | undefined; readonly onSector: (sector: string | undefined) => void }) {
  const { trade } = file;
  const scale = tradeScale(trade.sectors);
  const [sort, setSort] = useState<SectorSort>("ranked");
  const rows = sorted(trade.sectors, sort);
  const [shown, setShown] = useState(rowsToShow(rows, SECTORS_FIRST, sector));
  return (
    <Panel title={`Goods traded with ${file.name}, a year`} icon="subjectTrade" count={trade.sectors.length} lede="Very small amounts still get a small bar, and each card shows the exact number.">
      <SelectedGoods file={file} sector={sector} />
      {trade.sectors.length === 0 ? (
        <Text variant="body" tone="secondary">The United States doesn't trade any goods with {file.name}.</Text>
      ) : (
        <>
          <Segmented label="Sort by" value={sort} onChange={setSort} options={[{ value: "ranked", label: "Trade value" }, { value: "goods", label: "Name" }, { value: "imports", label: "US imports" }, { value: "exports", label: "US exports" }, { value: "tariff", label: "Tariff" }]} />
          <ReadingFrame title="Trade by kind of goods" unit="Dollars a year, every pair of bars on one scale" legend={tradeKey(`The United States buys from ${file.name}`, `The United States sells to ${file.name}`)} pressHint="Press a kind of goods to select it." help={{ meaning: "Each pair of bars is one kind of goods. The top bar is what the United States buys from this country and the bottom bar is what it sells. All the bars share one scale, so you can compare any two, and the exact amounts are printed on each card." }}>
            <Column gap="xs" role="list" aria-label={`Goods traded with ${file.name}`}>
              {rows.slice(0, shown).map((row) => (
                <SectorRow key={row.sector} row={row} scale={scale} picked={row.sector === sector} onPick={onSector} />
              ))}
            </Column>
          </ReadingFrame>
          {rows.length > shown ? (
            <Button kind="secondary" size="compact" icon="expandPanel" onPress={() => setShown(rows.length)}>
              {`Show all ${rows.length} kinds of goods`}
            </Button>
          ) : null}
        </>
      )}
    </Panel>
  );
}

function Partners({ file }: { readonly file: NationFile }) {
  const { partners } = file.trade;
  const [all, setAll] = useState(false);
  return (
    <Panel title={`Where ${file.name} sends its trade`} icon="world" lede="Each country's share of its trade in a year." count={partners.length}>
      {partners.length === 0 ? (
        <Text variant="body" tone="secondary">No one country stands out. Its trade is spread across many partners.</Text>
      ) : (
        <ReadingFrame title="Share of its trade by country" unit="Share of its trade in a year" pressHint="Press a country to open its file." help={{ meaning: "Each bar is one country's share of this government's trade in a year. The scale runs from none to all of it, and the figure at the right is the exact share." }}>
          <BarScale from="0%" to="100%" unit="Of its trade" labelWidth={200} />
          <Column role="group" aria-label="Trade partners">
            {(all ? partners : partners.slice(0, PARTNERS_FIRST)).map((partner, index) => (
              <RowTo key={partner.nation} first={index === 0} href={partner.href} label={`${partner.name}, ${partner.shareText} of its trade. Open its file`} flexDirection="row" alignItems="center" gap="sm" paddingVertical="xs" paddingHorizontal="xs">
                <Row gap="xs" width={200} flexShrink={1}>
                  <FlagOf nation={partner.nation} name={partner.name} height={16} />
                  <Text variant="label" numberOfLines={1} flexShrink={1}>
                    {partner.name}
                  </Text>
                </Row>
                <ShareBar value={partner.share} />
                <Text variant="caption" weight="strong" minWidth={48} textAlign="right">
                  {partner.shareText}
                </Text>
              </RowTo>
            ))}
          </Column>
        </ReadingFrame>
      )}
      {partners.length > PARTNERS_FIRST ? (
        <Button kind="quiet" size="compact" onPress={() => setAll((open) => !open)}>
          {all ? "Show fewer" : `Show all ${partners.length}`}
        </Button>
      ) : null}
    </Panel>
  );
}

/** The direction of goods flows is an accounting comparison, not a welfare verdict. */
function balanceWord(imports: number, exports: number): string {
  const gap = exports - imports;
  return Math.abs(gap) < 1 ? "We buy and sell about the same" : gap > 0 ? "We sell more than we buy" : "We buy more than we sell";
}

/** How the country is doing, then its trade with the United States by goods and with the world by partner. */
export function EconomyView({ file, sector, onSector }: { readonly file: NationFile; readonly sector: string | undefined; readonly onSector: (sector: string | undefined) => void }) {
  const { trade } = file;
  return (
    <Column gap="lg">
      <Panel title="How its economy is doing" icon="economyGrowth">
        <PowerStats power={file.power} />
        <BandFrame title="How its economy is doing" meaning="Each bar has steps and the word beside it says which step the reading is on. More steps is better for the country, and the color follows the word. These are estimates, not official figures.">
          {file.vitals.map((vital) => (
            <Vital key={vital.key} vital={vital} />
          ))}
        </BandFrame>
        <Row>
          <Button kind="secondary" size="compact" icon="graph" onPress={() => go(compareHref({ metric: NATION_METRICS[0] ?? "growth", subjects: [{ kind: "self" }, { kind: "nation", id: file.nation }], window: "term" }))}>
            {`Compare ${file.name} with the United States`}
          </Button>
        </Row>
      </Panel>
      <Panel title="Trade with the United States, a year" icon="subjectTrade">
        <StatGrid>
          <Stat label="Share of US goods trade" value={trade.usShareText ?? "None"} size="heading" />
          <Stat label="You buy" value={trade.importsText} period="a year" size="heading" />
          <Stat label="You sell" value={trade.exportsText} period="a year" size="heading" />
        </StatGrid>
        <Row gap="sm" wrap>
          <StateChip valence="neutral">{balanceWord(trade.imports, trade.exports)}</StateChip>
          <Text variant="body" flex={1} minWidth={200}>
            {trade.balanceLine}
          </Text>
        </Row>
      </Panel>
      <Sectors file={file} sector={sector} onSector={onSector} />
      <Partners file={file} />
      <Row>
        <Button kind="secondary" size="compact" icon="economyGrowth" onPress={() => go(place.economyView("trade"))}>
          See all US trade
        </Button>
      </Row>
    </Column>
  );
}
