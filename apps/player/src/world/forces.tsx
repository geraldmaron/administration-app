import type { CountedHolding } from "@admin/player-core";
import type { ForceAssetId } from "@admin/world";
import { Column, Icon, ReadingFrame, Row, Text, swatchEntries } from "@admin/ui";
import { Segments, SortTable, type TableColumn } from "@admin/ui/world";
import { assetGlyph, figureWords, unitNoun } from "./glyphs";

/** A count already worded ("4 destroyers") with its asset's glyph before it. */
export function AssetLine({ unitType, text }: { readonly unitType: ForceAssetId; readonly text: string }) {
  return (
    <Row gap="xs">
      <Icon name={assetGlyph(unitType)} size={18} tone="colorSecondary" />
      <Text variant="label" weight="regular">
        {text}
      </Text>
    </Row>
  );
}

/** One asset's fielded force split into free, abroad and not ready; the counts share a unit, so the parts add to the whole. */
function Posture({ holding }: { readonly holding: CountedHolding }) {
  return (
    <Segments
      label={holding.label}
      parts={[
        { key: "free", count: holding.available, word: "available this week", valence: "good" },
        { key: "abroad", count: holding.committed, word: "abroad", valence: "abroad" },
        { key: "resting", count: holding.belowReadiness, word: "not ready", valence: "bad" },
      ]}
    />
  );
}

const POSTURE_KEY = swatchEntries([
  { key: "free", label: "Available this week", ink: "successInk" },
  { key: "abroad", label: "Abroad", ink: "accent" },
  { key: "resting", label: "Not ready", ink: "danger" },
]);

const n = (count: number) => count.toLocaleString("en-US");

function columns(drawn: boolean): readonly TableColumn<CountedHolding>[] {
  const base: TableColumn<CountedHolding>[] = [
    {
      id: "asset",
      label: "Type",
      width: 240,
      sort: (holding) => holding.label,
      render: (holding) => (
        <Column gap="2xs">
          <Row gap="xs">
            <Icon name={assetGlyph(holding.unitType)} size={22} tone="colorSecondary" />
            <Text variant="label">{holding.label}</Text>
          </Row>
          <Text variant="caption" tone="tertiary">
            Counted in {unitNoun(holding.unitType, 2)}
          </Text>
        </Column>
      ),
    },
    // Counts are in each asset's own unit, so ranking a column would set ships against troops; only the asset name sorts.
    { id: "fielded", label: "Total", width: 130, render: (holding) => <Text variant="label" tabular>{figureWords(holding.unitType, holding.total)}</Text> },
    { id: "abroad", label: "Abroad", width: 90, align: "end", render: (holding) => <Text variant="label" tabular>{n(holding.committed)}</Text> },
    { id: "free", label: "Available", width: 90, align: "end", render: (holding) => <Text variant="label" tabular tone={holding.available > 0 ? "success" : "secondary"}>{n(holding.available)}</Text> },
    { id: "resting", label: "Not ready", width: 100, align: "end", render: (holding) => <Text variant="label" tabular tone={holding.belowReadiness > 0 ? "danger" : "secondary"}>{holding.belowReadiness > 0 ? "▼ " : ""}{n(holding.belowReadiness)}</Text> },
  ];
  return drawn ? [...base, { id: "week", label: "This week", width: 180, render: (holding) => <Posture holding={holding} /> }] : base;
}

/**
 * What a force fields, one asset per row, in the asset's own unit: fielded,
 * abroad, free this week and not ready this week. The unit is named on every
 * row, so no reader compares hulls with formations down a column.
 */
export function HoldingsTable({ holdings, caption, drawn = false }: { readonly holdings: readonly CountedHolding[]; readonly caption: string; readonly drawn?: boolean }) {
  const table = <SortTable caption={caption} columns={columns(drawn)} rows={holdings} rowKey={(holding) => `${holding.branch}:${holding.unitType}`} empty="We don't have a detailed count of its forces." page={30} />;
  if (!drawn) return table;
  return (
    <ReadingFrame title="Each type this week" unit="Share of that type's own count" legend={POSTURE_KEY} help={{ meaning: "Each bar splits one type of force three ways: available this week, abroad, and not ready. The three add up to the type's whole count, and the numbers in the columns are the same split." }}>
      {table}
    </ReadingFrame>
  );
}
