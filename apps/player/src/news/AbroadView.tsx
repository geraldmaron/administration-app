import type { CoverageBand } from "@admin/engine";
import { sealFor, type AbroadRow } from "@admin/player-core";
import { CardGrid, CardLink, Column, Empty, Icon, Masthead, ReadingFrame, Row, Surface, Tag, Text, View } from "@admin/ui";
import { StackedBar, segmentKeyEntries } from "@admin/ui/news";
import { go } from "./story-parts";

const BAND = {
  hostile: { word: "Hostile", tone: "danger", ink: "danger" },
  cool: { word: "Skeptical", tone: "warning", ink: "warningInk" },
  neutral: { word: "Even-handed", tone: "outline", ink: "pendingInk" },
  warm: { word: "Warm", tone: "success", ink: "successInk" },
} as const;

const BANDS: readonly CoverageBand[] = ["hostile", "cool", "neutral", "warm"];

/** What the world's papers filed about the administration this week, the coolest first, with how the whole foreign press leaned. */
export function AbroadView({ rows }: { readonly rows: readonly AbroadRow[] }) {
  if (rows.length === 0) {
    return (
      <Surface level="sunken">
        <Empty title="No foreign news about you yet" detail="No newspaper in another country has written about you yet." icon="press" />
      </Surface>
    );
  }
  const segments = BANDS.map((band) => ({ key: band, count: rows.filter((row) => row.band === band).length, label: BAND[band].word, ink: BAND[band].ink }));
  return (
    <Column gap="lg">
      <Surface>
        <Column gap="sm">
          <Text variant="heading" role="heading" aria-level={2}>News from other countries</Text>
          <Text variant="caption" tone="secondary">{`${rows.length} foreign news ${rows.length === 1 ? "outlet" : "outlets"} filed on you this week.`}</Text>
          <ReadingFrame
            title="How foreign news covered you this week"
            unit="Foreign news outlets"
            period="This week"
            legend={segmentKeyEntries(segments)}
            help={{ meaning: "Each part of the bar is the foreign news outlets that wrote about you in one tone, as wide as how many of them did. Hostile and Skeptical outlets were critical, Even-handed ones were balanced, and Warm ones were favorable.", steps: ["Compare the widths to see which tone most outlets took.", "Open a card below to read one outlet's story and its country's file."] }}
          >
            <StackedBar label="How foreign news covered you this week" segments={segments} height={14} />
          </ReadingFrame>
        </Column>
      </Surface>
      <CardGrid columns={{ phone: 1, tablet: 2, desktop: 2, wide: 3 }}>
        {rows.map((row) => (
          <CardLink key={row.outletId} pad="md" flexGrow={1} label={`${row.outlet}, ${BAND[row.band].word.toLowerCase()}. Open ${row.nation.name}'s file`} href={row.nation.href} onPress={() => go(row.nation.href)}>
            <Column gap="sm" flexGrow={1}>
              <Masthead spec={sealFor(row.outletId, row.outlet)} name={row.outlet} size="compact" />
              <Row gap="sm" wrap>
                <Tag tone={BAND[row.band].tone}>{BAND[row.band].word}</Tag>
                <Row gap="2xs">
                  <Icon name="flag" size={14} tone="colorSecondary" />
                  <Text variant="label" tone="secondary">{row.nation.name}</Text>
                </Row>
              </Row>
              <Text variant="headline">{row.lede}</Text>
              <View flexGrow={1} />
              <Text variant="caption" tone="secondary">{row.caption}</Text>
              <Text variant="caption" tone="tertiary">{row.signature}</Text>
            </Column>
          </CardLink>
        ))}
      </CardGrid>
    </Column>
  );
}
