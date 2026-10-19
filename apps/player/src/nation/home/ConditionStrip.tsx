import type { ReactNode } from "react";
import type { Campaign } from "@admin/engine";
import { nowReadings, place, polarizationReading, type NationOverview, type NowReading, type OpinionTrends, type ToplineView } from "@admin/player-core";
import { CardGrid, Column, Icon, Meter, Pressable, ReadingFrame, Row, Surface, Text, meterKeyEntries, type IconName } from "@admin/ui";
import { Track } from "@admin/ui/nation";
import { compareHref } from "../../compare/subjects";
import { CompareDoor } from "../../compare/CompareDoor";
import { VALENCE_TEXT, VALENCE_TRACK, againstEraWords, percent, signedPercent, signedPoints, valenceOf, type Valence } from "../format";
import { readingMarks } from "../../brief/reading-marks";
import { go } from "../../shell/navigate";
import { termDoor } from "../../handbook/term-door";

/** The settled figure is the series' own last point, so the headline, the line and the Brief can never disagree. */
export function settledApproval(topline: ToplineView, campaign: Campaign): number {
  return topline.series[topline.series.length - 1] ?? campaign.player.metrics.approval;
}

const METER_TONE: Readonly<Record<Valence, "successInk" | "warningInk" | "danger" | "accent">> = { good: "successInk", watch: "warningInk", bad: "danger", neutral: "accent" };

function weekWords(reading: NowReading | undefined): string {
  const week = reading?.week;
  if (!week) return "Your first week isn't over yet, so there's nothing to compare.";
  return week.direction === "flat" ? "▬ Same as last week" : `${week.direction === "up" ? "▲" : "▼"} ${week.text.replace(/^[+−-]/, "")} since last week`;
}

type TileProps = { readonly icon: IconName; readonly label: string; readonly figure: string; readonly valence: Valence; readonly move: string; readonly children: ReactNode; readonly href?: string; readonly onPress?: () => void; readonly door?: string };

/** One reading, the same anatomy in every tile: the head (label, figure, its move) is the door, and the drawn reading below it sits in its own frame so its key and help are never inside a link. */
function ConditionTile({ icon, label, figure, valence, move, children, href, onPress, door }: TileProps) {
  const head = (
    <Column gap="xs">
      <Row gap="xs">
        <Icon name={icon} size={18} tone="colorSecondary" />
        <Text variant="label" tone="secondary" flex={1}>
          {label}
        </Text>
        <Text variant="heading" tone={VALENCE_TEXT[valence]} tabular>
          {figure}
        </Text>
        {onPress ? <Icon name="chevron" size={14} tone="colorTertiary" /> : null}
      </Row>
      <Text variant="caption" tone={valence === "neutral" ? "secondary" : VALENCE_TEXT[valence]}>
        {move}
      </Text>
    </Column>
  );
  return (
    <Surface level="raised" pad="md" flexGrow={1} role="group" aria-label={`${label}: ${figure}`}>
      <Column gap="md" flexGrow={1}>
        {onPress ? (
          <Pressable href={href} role={href ? "link" : "button"} aria-label={`${label}: ${figure}. ${door ?? ""}`} onPress={onPress} borderRadius="card">
            {head}
          </Pressable>
        ) : (
          head
        )}
        <Column flexGrow={1} justifyContent="flex-end">
          {children}
        </Column>
      </Column>
    </Surface>
  );
}

type StripProps = { readonly campaign: Campaign; readonly overview: NationOverview; readonly topline: ToplineView; readonly trends: OpinionTrends; readonly onCall: () => void };

/**
 * The country in four readings of one size: approval and stability against
 * their marks, how divided the country is against the 2020s, and the electoral
 * votes you would carry against the 270 that win.
 */
export function ConditionStrip({ campaign, overview, topline, trends, onCall }: StripProps) {
  const readings = nowReadings(campaign);
  const approval = readings.find((reading) => reading.key === "approval");
  const stability = readings.find((reading) => reading.key === "stability");
  const settled = settledApproval(topline, campaign);
  const approvalValence = valenceOf(approval?.stance);
  const stabilityValence = valenceOf(stability?.stance);
  const division = polarizationReading(campaign);
  const change = trends.polarization.change13 ?? trends.polarization.change4;
  const points = change === undefined ? 0 : Math.round(change * 100);
  const { forYou, total, needed } = overview.electoral;
  const winning: Valence = forYou >= needed ? "good" : forYou >= needed - 40 ? "watch" : "bad";
  const approvalMarks = readingMarks(campaign, "approval");
  const approvalValue = approval?.fraction ?? settled;
  const stabilityMarks = readingMarks(campaign, "stability");
  const stabilityValue = stability?.fraction ?? 0;
  return (
    <CardGrid columns={{ phone: 1, tablet: 2, desktop: 4, wide: 4 }} gap="md" role="list" aria-label="How the country is doing">
      <ConditionTile icon="ballot" label="Your approval" figure={percent(settled)} valence={approvalValence} move={weekWords(approval)} door="Compare it over time" href={compareHref({ metric: "approval", subjects: [{ kind: "self" }, { kind: "self-at", turn: 1 }], window: "term" })} onPress={() => go(compareHref({ metric: "approval", subjects: [{ kind: "self" }, { kind: "self-at", turn: 1 }], window: "term" }))}>
        <ReadingFrame title="Against past presidents" unit="% of adults" legend={meterKeyEntries(approvalMarks, approvalValue)} help={{ meaning: "The bar is the share of adults who approve of you. Each tick is a point to judge it by, such as where past presidents stood and the lines where Congress and your own party start to react.", steps: ["Read the figure on the right of the bar.", "Look at the ticks nearest the end of the bar and check if you are past them."], term: termDoor("approval-rating", "approval rating") }}>
          <Meter label="Today" value={approvalValue} figure={percent(settled)} marks={approvalMarks} tone={METER_TONE[approvalValence]} />
        </ReadingFrame>
      </ConditionTile>
      <ConditionTile icon="building" label="Stability at home" figure={stability?.figure ?? "Not known"} valence={stabilityValence} move={weekWords(stability)} door="See its history and what moves it" href={place.metric("stability")} onPress={() => go(place.metric("stability"))}>
        <ReadingFrame door={<CompareDoor metric="stability" />} title="Against your term so far" unit="% on a 0 to 100 scale" legend={meterKeyEntries(stabilityMarks, stabilityValue)} help={{ meaning: "How steady the country feels, from calm to near collapse. The ticks show your term's low and high, and the line below which things start to break down.", steps: ["Read the figure on the right of the bar.", "A red dashed line is a level where the rules start to act."], term: termDoor("political-stability", "political stability") }}>
          <Meter label="Today" value={stabilityValue} figure={stability?.figure ?? ""} marks={stabilityMarks} tone={METER_TONE[stabilityValence]} />
        </ReadingFrame>
      </ConditionTile>
      <ConditionTile icon="layerLean" label="How divided the country is" figure={signedPercent(division.againstEra)} valence={points > 0 ? "bad" : points < 0 ? "good" : "neutral"} move={`${againstEraWords(division.againstEra)}${change === undefined || points === 0 ? "" : `, ${points > 0 ? "▲" : "▼"} ${signedPoints(change).replace(/^[+−]/, "")} lately`}`}>
        <ReadingFrame title="Against the 2020s" unit="% above or below the 2020s level" legend={[{ id: "era", kind: "tick", label: "The 2020s level", ink: "color", weight: 3 }]} help={{ meaning: "How far apart Americans' opinions sit, compared with the 2020s. The figure is a difference from that level, so 0% means the country is as divided as it was then.", term: termDoor("polarization", "polarization") }}>
          <Track value={division.position} tone="neutral" marks={[{ at: division.anchorAt, label: "2020s level", strong: true }]} label={`Division ${againstEraWords(division.againstEra)}`} />
        </ReadingFrame>
      </ConditionTile>
      <ConditionTile icon="election" label="Electoral votes you'd win" figure={`${forYou}`} valence={winning} move={`You need ${needed} of ${total} to win`} door="Color the map by who would win" onPress={onCall}>
        <ReadingFrame title="Toward the 270 that win" unit={`of ${total} votes`} legend={[{ id: "win", kind: "tick", label: `${needed} votes wins`, ink: "color", weight: 3 }]} help={{ meaning: `The bar is the electoral votes you would carry if the election were held today. The line is ${needed}, the number that wins.` }}>
          <Track value={forYou / total} tone={VALENCE_TRACK[winning]} marks={[{ at: needed / total, label: `${needed} to win`, strong: true }]} label={`${forYou} of ${total} electoral votes. ${needed} wins.`} />
        </ReadingFrame>
      </ConditionTile>
    </CardGrid>
  );
}
