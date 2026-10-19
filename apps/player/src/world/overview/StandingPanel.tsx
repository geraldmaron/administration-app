import { useMemo, useState } from "react";
import type { Campaign } from "@admin/engine";
import { METRIC_MEANINGS, METRIC_PROVENANCE, averageTrustSeries, formatDate, nowReadings, place, standingMoves, weekLabel, type WorldDesk } from "@admin/player-core";
import { BenchmarkChart, Button, Column, DeltaText, Row, Stat, Text, useMedia } from "@admin/ui";
import { Panel } from "@admin/ui/world";
import { CompareChart } from "../../compare/CompareChart";
import { termDoor } from "../../handbook/term-door";
import { RowTo } from "../parts";
import { TRUST_BAND_AXIS_TICKS, bandWordAt, trustOnBandAxis } from "../trust-axis";

const FIRST = 6;

/** The Record entries that moved the reading, newest first, each its own door. */
function WhatMovedIt({ campaign }: { readonly campaign: Campaign }) {
  const moves = useMemo(() => standingMoves(campaign), [campaign]);
  const [shown, setShown] = useState(FIRST);
  if (moves.rows.length === 0) {
    return (
      <Text variant="body" tone="secondary">
        Nothing on your Record has changed it yet. Events around the world still move it a little every week.
      </Text>
    );
  }
  return (
    <Column gap="sm">
      <Column role="group" aria-label="What changed International Standing">
        {moves.rows.slice(0, shown).map((row) => {
          const move = row.moves[0];
          return (
            <RowTo key={row.id} href={place.event(row.id)} label={`Open the Record entry: ${row.headline}`} flexDirection="row" flexWrap="wrap" alignItems="flex-start" gap="md" paddingVertical="sm" paddingHorizontal="xs">
              <Text variant="caption" tone="tertiary" width={96}>
                {formatDate(row.date)}
              </Text>
              <Column flex={1} minWidth={200} gap="2xs">
                <Text variant="label">{row.headline}</Text>
                <Text variant="caption" tone="secondary">
                  {row.actorWord}
                </Text>
              </Column>
              {move ? <DeltaText delta={{ text: move.text, direction: move.delta > 0 ? "up" : move.delta < 0 ? "down" : "flat", better: "up" }} /> : null}
            </RowTo>
          );
        })}
      </Column>
      {moves.rows.length > shown ? (
        <Button kind="secondary" size="compact" icon="expandPanel" onPress={() => setShown((count) => count + FIRST)}>
          {`Show more (${moves.rows.length - shown} more)`}
        </Button>
      ) : null}
    </Column>
  );
}

/**
 * International Standing: the one reading that says how other governments see
 * the administration. Where it stands against its benchmarks and its own
 * record, how the read governments see you on average, what each side of the
 * ledger has done to it, and the Record entries that moved it.
 */
export function StandingPanel({ campaign, desk }: { readonly campaign: Campaign; readonly desk: WorldDesk }) {
  const media = useMedia();
  const reading = nowReadings(campaign).find((entry) => entry.key === "standing");
  const moves = useMemo(() => standingMoves(campaign), [campaign]);
  const subjects = useMemo(() => [{ kind: "self" as const }], []);
  const trust = useMemo(() => averageTrustSeries(campaign, desk.governments), [campaign, desk.governments]);
  if (!reading) return null;
  return (
    <Panel title="International Standing" icon="graph" lede={METRIC_MEANINGS.standing}>
      <Row gap="xl" wrap top>
        <Column gap="md" flexBasis={260} flexGrow={1} maxWidth="100%">
          <Row>
            <Stat label={`As of ${formatDate(campaign.calendar)}`} value={reading.figure} size="figure" source={`${METRIC_PROVENANCE.standing}.`} {...(reading.week ? { delta: { text: reading.week.text, direction: reading.week.direction, better: "up" as const }, period: "this week" } : { period: "Your first week isn't over yet" })} />
          </Row>
          <Row gap="md" wrap>
            <Stat label="What raised it" value={moves.lifted.text} period={`in ${moves.lifted.count}`} size="title" standing="good" />
            <Stat label="What lowered it" value={moves.cost.text} period={`in ${moves.cost.count}`} size="title" standing="bad" />
          </Row>
        </Column>
        <Column gap="md" flexBasis={media.desktop ? 560 : 300} flexGrow={2} minWidth={0} maxWidth="100%">
          <CompareChart campaign={campaign} metric="standing" subjects={subjects} window="term" title="International Standing over your term, with lines to compare against" height={220} />
          {trust.length > 1 ? (
            <BenchmarkChart
              title={`How ${desk.kpis.standing.read} countries see you, on average`}
              x={trust.map((point) => weekLabel(point.turn))}
              series={[{ id: "trust", label: "Average view of the United States", values: trust.map((point) => trustOnBandAxis(point.value * 2 - 1)), kind: "self" }]}
              format={bandWordAt}
              ticks={TRUST_BAND_AXIS_TICKS}
              domain={[0, 1]}
              height={180}
              better="up"
              unit="Average trust of the countries we can read, from hostile at the bottom to trusting at the top"
              period="Week by week, this term"
              help={{ meaning: "The line is the average of how much each country we can read trusts the United States, week by week. Countries we can't read yet are left out, so the average can shift when we start reading more of them.", term: termDoor("trust-in-us", "What moves a country's trust in you") }}
            />
          ) : null}
        </Column>
      </Row>
      <Text variant="title" role="heading" aria-level={3}>
        What changed it
      </Text>
      <WhatMovedIt campaign={campaign} />
    </Panel>
  );
}
