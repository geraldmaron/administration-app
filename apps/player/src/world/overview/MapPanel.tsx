import { useState } from "react";
import { READING_LEGENDS, WORLD_READINGS, WORLD_REGIONS, WORLD_REGION_NAMES, readingCell, tallyStances, type ReadingTone, type WorldGovernment, type WorldReadingId, type WorldRegionId } from "@admin/player-core";
import { Button, CardGrid, CardLink, Column, KeySample, Pressable, ReadingFrame, Row, Text, View, swatchEntries } from "@admin/ui";
import { Panel, Segments, valenceFill, type ReadingValence } from "@admin/ui/world";
import { MapPanelSlot, NationChip, FlagOf, go } from "../parts";
import { stanceParts } from "./stance-parts";

const LENS: Readonly<Record<WorldReadingId, string>> = { standing: "relations", trend: "world-trend", alignment: "world-alignment", trade: "trade-share", forces: "forces" };
const SHORT: Readonly<Record<WorldReadingId, string>> = { standing: "Views of us", trend: "Trend", alignment: "Sides", trade: "Trade", forces: "US forces" };
const NOTES: Readonly<Record<WorldReadingId, string>> = {
  standing: "How each country sees the United States. Unread means our intelligence agencies can't tell yet.",
  trend: "Whether each country has come to trust the United States more or less over the last four weeks.",
  alignment: "How closely each country lines up with the United States in world affairs.",
  trade: "How much of our trade in goods is with each country.",
  forces: "Where American troops are, with bigger marks for more people.",
};

const TONE_VALENCE: Readonly<Record<ReadingTone, ReadingValence>> = {
  favorable: "good",
  "lean-favorable": "good",
  neutral: "info",
  caution: "watch",
  adverse: "bad",
  unread: "neutral",
  "seq-1": "neutral",
  "seq-2": "info",
  "seq-3": "info",
  "seq-4": "info",
  none: "neutral",
};

const SHOWN = 10;

/** One step of the reading's key: its swatch, its word, how many governments fall in it, and their flags. */
function LegendStep({ word, tone, rows }: { readonly word: string; readonly tone: ReadingTone; readonly rows: readonly WorldGovernment[] }) {
  const [all, setAll] = useState(false);
  const shown = all ? rows : rows.slice(0, SHOWN);
  return (
    <Column gap="xs" paddingVertical="sm" borderTopWidth={1} borderTopColor="borderColor">
      <Row gap="sm">
        <View opacity={tone === "seq-2" ? 0.55 : tone === "seq-3" ? 0.75 : 1}>
          <KeySample entry={{ id: tone, kind: "swatch", label: word, ink: valenceFill(TONE_VALENCE[tone]) }} />
        </View>
        <Text variant="label" flex={1}>
          {word}
        </Text>
        <Text variant="label" weight="strong" tabular>
          {rows.length}
        </Text>
      </Row>
      {rows.length > 0 ? (
        <Row gap="xs" wrap>
          {shown.map((row) => (
            <NationChip key={row.nation} nation={row.nation} name={row.name} />
          ))}
          {rows.length > SHOWN ? (
            <Button kind="quiet" size="compact" onPress={() => setAll((open) => !open)}>
              {all ? "Show fewer" : `${rows.length - SHOWN} more`}
            </Button>
          ) : null}
        </Row>
      ) : null}
    </Column>
  );
}

/**
 * The one shared map, colored by the reading chosen; until the map lands, its
 * key read as a list from the same rows: each step, how many governments, and
 * their flags, every flag a door to its file.
 */
export function MapPanel({ governments, reading, onReading, region }: { readonly governments: readonly WorldGovernment[]; readonly reading: WorldReadingId; readonly onReading: (reading: WorldReadingId) => void; readonly region: WorldRegionId | null }) {
  const byLens = new Map(WORLD_READINGS.map((id) => [LENS[id], id] as const));
  const rows = region ? governments.filter((government) => government.region === region) : governments;
  const cells = rows.map((row) => ({ row, cell: readingCell(row, reading) }));
  return (
    <MapPanelSlot
      title="The world"
      lens={LENS[reading]}
      camera={region ? `set:${rows.map((government) => `nation:${government.nation}`).join("|")}` : "world"}
      note={`${NOTES[reading]}${region ? ` Showing only ${WORLD_REGION_NAMES[region]}.` : ""}`}
      lenses={WORLD_READINGS.map((id) => ({ id: LENS[id], label: SHORT[id] }))}
      onLens={(id) => onReading(byLens.get(id) ?? "standing")}
    >
      <Column role="list" aria-label={`Countries by ${SHORT[reading].toLowerCase()}`}>
        {READING_LEGENDS[reading].map((step) => (
          <LegendStep key={step.tone} word={step.word} tone={step.tone} rows={cells.filter((entry) => entry.cell.tone === step.tone).map((entry) => entry.row)} />
        ))}
      </Column>
    </MapPanelSlot>
  );
}

/** Where the governments stand by part of the world; choosing one filters the map and the table. */
export function Regions({ governments, region, onRegion }: { readonly governments: readonly WorldGovernment[]; readonly region: WorldRegionId | null; readonly onRegion: (region: WorldRegionId | null) => void }) {
  return (
    <Panel title="By part of the world" icon="layerBlocs">
      <ReadingFrame title="How each part of the world sees the United States" unit="Countries in each part, by how they see us" legend={swatchEntries(stanceParts(tallyStances(governments)).map((part) => ({ key: part.key, label: part.word, ink: valenceFill(part.valence as ReadingValence) })))} pressHint="Press a part of the world to show only its countries on the map and in the table." help={{ meaning: "Each bar is one part of the world, split by how its governments see the United States. The bar's length is not a score. Each color's share of the bar is that share of its countries." }}>
        <CardGrid columns={{ phone: 1, tablet: 2, desktop: 3, wide: 3 }} gap="lg">
          {WORLD_REGIONS.map((id) => {
            const rows = governments.filter((government) => government.region === id);
            const counts = tallyStances(rows);
            const atWar = rows.filter((government) => government.atWar).length;
            const notable = rows.filter((government) => government.atWar || government.stance === "adverse").slice(0, 4);
            const current = region === id;
            return (
              <CardLink
                key={id}
                onPress={() => onRegion(current ? null : id)}
                role="button"
                aria-pressed={current}
                label={`${WORLD_REGION_NAMES[id]}: ${rows.length} countries. ${current ? "Showing only this region. Press to show every region" : "Show only this region"}`}
                flexGrow={1}
                pad="md"
                borderWidth={current ? 2 : 1}
                {...(current ? { borderColor: "accent", backgroundColor: "infoFill" } : {})}
              >
                <Column gap="sm" flexGrow={1}>
                  <Row between>
                    <Text variant="label">{WORLD_REGION_NAMES[id]}</Text>
                    <Text variant="label" weight="strong" tabular>
                      {rows.length}
                    </Text>
                  </Row>
                  <Segments label={WORLD_REGION_NAMES[id]} parts={stanceParts(counts)} />
                  <View flexGrow={1} />
                  <Row between gap="sm">
                    <Text variant="caption" tone={atWar > 0 ? "danger" : "secondary"}>
                      {atWar > 0 ? `${atWar} at war with the US` : counts.adverse > 0 ? `${counts.adverse} hostile` : "None hostile"}
                    </Text>
                    <Row gap="2xs">
                      {notable.map((government) => (
                        <Pressable key={government.nation} href={government.href} onPress={() => go(government.href)} role="link" aria-label={`${government.name}: ${government.atWar ? "at war with the US" : government.standingWord}`} borderRadius="chip">
                          <FlagOf nation={government.nation} name={government.name} height={14} />
                        </Pressable>
                      ))}
                    </Row>
                  </Row>
                </Column>
              </CardLink>
            );
          })}
        </CardGrid>
      </ReadingFrame>
    </Panel>
  );
}
