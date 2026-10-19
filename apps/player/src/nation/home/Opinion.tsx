import type { Campaign } from "@admin/engine";
import { polarizationReading, type MostImportantProblem, type OpinionTrends, type PolarizationReading } from "@admin/player-core";
import { Card, Column, Empty, ReadingFrame, Row, Sparkline, Text, sparklineKey } from "@admin/ui";
import { Track } from "@admin/ui/nation";
import { againstEraWords, percent, signedPercent, signedPoints, signedTenths } from "../format";
import { markEntry, toneKey } from "../keys";
import { termDoor } from "../../handbook/term-door";
import { recordStartDate } from "./Course";

function cost(reading: PolarizationReading): readonly string[] {
  const { now, atEra } = reading.ownIdentifierMovement;
  const effect = Math.round(reading.headlineEffect * 1000) / 10;
  return [
    `In a divided country, your own party sticks with you more, and the other party sticks against you more. When news breaks, people in your party shift ${percent(now)} as much as independents do${Math.round(now * 100) === Math.round(atEra * 100) ? "" : `, compared with ${percent(atEra)} in the 2020s`}. Independents react the way they always have, so more of any swing in your approval comes from them.`,
    effect === 0 ? "Compared with the 2020s, today's division doesn't change your approval." : `Compared with the 2020s, today's division ${effect > 0 ? "adds" : "takes"} ${Math.abs(effect).toFixed(1)} points ${effect > 0 ? "to" : "from"} your approval this week.`,
  ];
}

/**
 * How divided the country is, as the stock the engine holds: the 2020s level
 * every campaign opens at, this administration's drift from it, and what that
 * drift costs. A rise makes the parties firmer and the record matter less.
 */
export function Polarization({ campaign, trends }: { readonly campaign: Campaign; readonly trends: OpinionTrends }) {
  const series = trends.polarization;
  const values = series.points.map((point) => point.value);
  const change = series.change13 ?? series.change4;
  const period = series.change13 !== undefined ? "in 13 weeks" : "in 4 weeks";
  const reading = polarizationReading(campaign);
  const note = values.length < 2 || !trends.start.fromOath ? `Tracked since ${recordStartDate(campaign, trends.start)}.` : againstEraWords(reading.againstEra);
  return (
    <Card title="How divided the country is" icon="layerLean">
      <Row gap="lg" wrap>
        <Column gap="2xs" minWidth={180}>
          <Text variant="caption" tone="secondary">
            Division compared with the 2020s
          </Text>
          <Text variant="figure" tabular>
            {signedPercent(reading.againstEra)}
          </Text>
          {change !== undefined ? (
            <Text variant="label" tone={Math.round(change * 100) > 0 ? "danger" : Math.round(change * 100) < 0 ? "success" : "secondary"}>
              {signedPoints(change)} {period}
            </Text>
          ) : null}
          <Text variant="caption" tone="tertiary">
            {note}
          </Text>
        </Column>
        {values.length > 1 ? <Sparkline values={values} valence="neutral" width={200} height={48} /> : null}
      </Row>
      <ReadingFrame title="Division since you took office" unit="% above or below the 2020s level" period={values.length > 1 ? "Week by week, from the oath" : undefined} legend={[markEntry("era", "The 2020s level"), ...(values.length > 1 ? sparklineKey("neutral") : [])]} help={{ meaning: "The bar shows where division sits between the least and the most it has been while you've been in office. The line is the 2020s level every game starts at.", term: termDoor("polarization", "polarization") }}>
      <Column gap="2xs">
        <Track value={reading.position} tone="neutral" marks={[{ at: reading.anchorAt, label: "2020s level", strong: true }]} label={`How division has changed while you've been in office: ${againstEraWords(reading.againstEra)}, on a scale from ${signedPercent(reading.driftMin)} to ${signedPercent(reading.driftMax)}`} />
        <Row between>
          <Text variant="caption" tone="secondary">
            Less divided {signedPercent(reading.driftMin)}
          </Text>
          <Text variant="caption" tone="secondary">
            More divided {signedPercent(reading.driftMax)}
          </Text>
        </Row>
      </Column>
      </ReadingFrame>
      {cost(reading).map((line) => (
        <Text key={line} variant="body">
          {line}
        </Text>
      ))}
      <Text variant="caption" tone="secondary">
        Division added so far: {signedTenths(reading.addedByUs)} from your decisions and {signedTenths(reading.addedByTheWorld)} from other events. Eased since then: {signedTenths(-reading.healed)}.
        {reading.heaviest ? ` Biggest single increase: ${reading.heaviest.description}` : " No single event has added to it yet."} Left alone, division slowly settles back toward the 2020s level. About half the gap closes in two years.
      </Text>
    </Card>
  );
}

/** The most-important-problem question, every judgment ranked by the share of the week's dissatisfaction it carries. */
export function Problems({ problems }: { readonly problems: readonly MostImportantProblem[] }) {
  const longest = Math.max(...problems.map((problem) => problem.share), 0.0001);
  return (
    <Card title="What people are most unhappy about" icon="caution" helper="Each bar shows how much of people's unhappiness this week comes from that one thing.">
      {problems.length === 0 ? (
        <Empty icon="caution" title="Nothing is dragging down your approval" detail="No single cause is carrying people's unhappiness this week. A cause appears here when it does." />
      ) : (
        <ReadingFrame title="Share of this week's unhappiness, by cause" unit="% of all unhappiness" legend={toneKey({ bad: "The biggest cause", watch: "Other causes" })} help={{ meaning: "Bars are scaled to the biggest cause, so the longest bar is the one most dragging down your approval. The figure beside each is its true share." }}>
        <Column gap="sm" role="list">
          {problems.map((problem, index) => (
            <Row key={problem.driver} gap="md" top role="listitem">
              <Text variant="heading" tone={index === 0 ? "danger" : "tertiary"} width={28}>
                {index + 1}
              </Text>
              <Column flex={1} gap="2xs">
                <Text variant="label">
                  {problem.label}
                  {problem.salient ? <Text variant="caption" tone="warning"> · in the news this week</Text> : null}
                </Text>
                <Track value={problem.share / longest} tone={index === 0 ? "bad" : "watch"} slim />
                {problem.causeDetail ? (
                  <Text variant="caption" tone="secondary">
                    {problem.causeDetail}
                  </Text>
                ) : null}
              </Column>
              <Text variant="label" weight="strong" tabular>
                {problem.figure}
              </Text>
            </Row>
          ))}
        </Column>
        </ReadingFrame>
      )}
    </Card>
  );
}
