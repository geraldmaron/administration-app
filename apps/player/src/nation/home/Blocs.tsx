import type { Campaign } from "@admin/engine";
import type { BlocHold, BlocMove, BlocReading, BlocTopline, OpinionTrends } from "@admin/player-core";
import { Badge, CardGrid, Column, ReadingFrame, Row, Surface, Text, sparklineKey } from "@admin/ui";
import { StackedBar } from "@admin/ui/news";
import { Diverging, Track } from "@admin/ui/nation";
import { VALENCE_TEXT, VALENCE_TRACK, percent, signValence, signedTenths, tenths, valenceOf, type Valence } from "../format";
import { toneKey } from "../keys";
import { Course } from "./Course";

type Driver = { readonly key: string; readonly label: string; readonly delta: number };

/** Diverging rows of what moved a bloc, each against the largest of them so the bars compare. */
function Drivers({ rows, label }: { readonly rows: readonly Driver[]; readonly label: string }) {
  const reach = Math.max(...rows.map((row) => Math.abs(row.delta)), 0.0001);
  return (
    <Column gap="2xs" role="list" aria-label={label}>
      {rows.map((row) => {
        const valence = signValence(tenths(row.delta));
        return (
          <Row key={row.key} gap="sm" role="listitem">
            <Text variant="caption" flex={1} minWidth={120}>
              {row.label}
            </Text>
            <Diverging value={row.delta} scale={reach} />
            <Text variant="caption" weight="strong" tone={VALENCE_TEXT[valence]} minWidth={72} textAlign="right">
              {row.delta > 0 ? "▲" : row.delta < 0 ? "▼" : "▬"} {signedTenths(row.delta)}
            </Text>
          </Row>
        );
      })}
    </Column>
  );
}

const withMove = (rows: readonly (BlocMove | BlocHold)[]): readonly Driver[] => rows.filter((row) => Math.abs(row.delta) >= 0.0005);

function turnoutWords(bloc: BlocReading): string | undefined {
  const gap = Math.round((bloc.turnout.now - bloc.turnout.habit) * 100);
  if (gap === 0) return undefined;
  return gap < 0 ? `About ${percent(bloc.turnout.now)} of this group would vote right now. That's ${Math.abs(gap)} points fewer than usual.` : `About ${percent(bloc.turnout.now)} of this group would vote right now. That's ${gap} points more than usual.`;
}

function Bloc({ bloc, campaign, trends }: { readonly bloc: BlocReading; readonly campaign: Campaign; readonly trends: OpinionTrends }) {
  const valence = valenceOf(bloc.stance);
  const moves = bloc.week ? withMove(bloc.week.moves) : [];
  const holds = withMove(bloc.holds);
  const turnout = turnoutWords(bloc);
  return (
    <Surface level="raised" pad="md" flexGrow={1}>
      <Column gap="sm">
        <Row gap="sm" wrap>
          <Text variant="label" flex={1}>
            {bloc.name}
          </Text>
          {bloc.base ? <Badge status="info">Your base</Badge> : null}
        </Row>
        <Row gap="sm">
          <Text variant="caption" tone="secondary" width={110}>
            {percent(bloc.share)} of the country
          </Text>
          <Track value={bloc.share} tone="neutral" slim />
        </Row>
        <Row gap="sm">
          <Text variant="heading" tone={VALENCE_TEXT[valence]} tabular>
            {percent(bloc.approval)}
          </Text>
          <Text variant="caption" tone="secondary">
            {bloc.word}
          </Text>
        </Row>
        <Track value={bloc.approval} tone={VALENCE_TRACK[valence]} cuts={[0.25, 0.45, 0.65]} />
        <Course campaign={campaign} start={trends.start} series={trends.blocs.find((series) => series.id === bloc.id)} label={`${bloc.name}, week by week`} />
        <Text variant="caption">
          Adds <Text variant="caption" weight="strong">{tenths(bloc.contribution)}</Text> points to your approval. This group is {percent(bloc.share)} of the country, and {percent(bloc.approval)} of them approve.
        </Text>
        {moves.length > 0 ? <Drivers rows={moves} label={`What changed for ${bloc.name} this week`} /> : bloc.week ? <Text variant="caption" tone="secondary">Nothing changed for this group this week.</Text> : null}
        {holds.length > 0 ? <Drivers rows={holds} label={`What keeps ${bloc.name} where they are`} /> : null}
        {bloc.id === "independent" ? null : (
          <Text variant="caption" tone="secondary">
            When news breaks, this group shifts {percent(bloc.responsiveness)} as much as independents do.
          </Text>
        )}
        {turnout ? (
          <Text variant="caption" tone="secondary">
            {turnout}
          </Text>
        ) : null}
      </Column>
    </Surface>
  );
}

// Each bloc's slice of the headline takes a role in turn; the key's words carry each figure.
const SLICE = ["accent", "gold", "infoInk"] as const;

/** The headline as the three blocs it adds up to: each one's share and approval, what moved it, and the sum. */
export function Blocs({ blocs, valence, campaign, trends }: { readonly blocs: BlocTopline; readonly valence: Valence; readonly campaign: Campaign; readonly trends: OpinionTrends }) {
  const total = blocs.blocs.map((bloc) => tenths(bloc.contribution));
  return (
    <Column gap="sm">
      <Text variant="label">Three groups make up your approval</Text>
      <Text variant="caption" tone="secondary">
        Your approval comes from three groups of voters. For each group, take its share of the country and multiply by how many in it approve, then add the three together. People who lean toward a party count with that party.
      </Text>
      <ReadingFrame
        title="Each group's share and approval"
        unit="% of the country, and % of the group who approve"
        legend={[...toneKey({ good: "Most of the group approves", watch: "The group is split or wary", bad: "Most of the group disapproves", neutral: "Share of the country (short bar)" }), ...sparklineKey("neutral")]}
        help={{ meaning: "Each card is one group of voters. The short bar is how much of the country it is. The long bar is how many of the group approve, with thin lines at 25%, 45% and 65%. Under it, bars to the right moved the group toward you and bars to the left moved it away." }}
      >
        <CardGrid columns={{ phone: 1, tablet: 2, desktop: 3, wide: 3 }}>
          {blocs.blocs.map((bloc) => (
            <Bloc key={bloc.id} bloc={bloc} campaign={campaign} trends={trends} />
          ))}
        </CardGrid>
      </ReadingFrame>
      <Surface level="sunken" pad="md">
        <Column gap="xs">
          <Row between>
            <Text variant="label">Your approval</Text>
            <Text variant="heading" tone={VALENCE_TEXT[valence]} tabular>
              {percent(blocs.headline)}
            </Text>
          </Row>
          <StackedBar label="Your approval, by group" segments={blocs.blocs.map((bloc, index) => ({ key: bloc.id, count: Math.max(0, bloc.contribution), label: bloc.name, ink: SLICE[index % SLICE.length]!, figure: `${total[index]!.toFixed(1)} pts` }))} height={12} keyed />
          <Text variant="caption" tone="secondary">
            {blocs.blocs.map((bloc, index) => `${bloc.name} ${total[index]!.toFixed(1)}`).join(" + ")} = {tenths(blocs.headline).toFixed(1)} points. The Brief uses this number, and so does the pressure to remove you from office.
          </Text>
        </Column>
      </Surface>
    </Column>
  );
}
