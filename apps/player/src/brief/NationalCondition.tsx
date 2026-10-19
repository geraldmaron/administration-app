import type { Campaign } from "@admin/engine";
import { approvalBreakdown, formatDate, nowReadings, place, type NowReading } from "@admin/player-core";
import { CardGrid, Column, Icon, Meter, Pressable, ReadingFrame, Row, Section, Sparkline, Surface, Text, meterKeyEntries, sparklineKey, type IconName, type KeyEntry, type MeterMark } from "@admin/ui";
import { termDoor } from "../handbook/term-door";
import { go } from "../shell/navigate";
import { readingMarks } from "./reading-marks";

const GLYPH: Readonly<Record<NowReading["key"], IconName>> = {
  approval: "ballot",
  treasury: "budget",
  stability: "building",
  militaryReadiness: "shield",
  standing: "world",
};

const UNIT: Readonly<Record<NowReading["key"], string>> = {
  approval: "% of adults",
  treasury: "billions of dollars",
  stability: "% on a 0 to 100 scale",
  militaryReadiness: "% of full readiness",
  standing: "% on a 0 to 100 scale",
};

const DELTA_TONE = { up: "success", down: "danger", flat: "secondary" } as const;
const ARROW = { up: "▲", down: "▼", flat: "▬" } as const;

function weeksOf(reading: NowReading): string {
  const own = reading.trail.length - reading.inherited - 1;
  return own <= 0 ? "Since you took office" : `Last ${own} ${own === 1 ? "week" : "weeks"} of your term${reading.inherited > 0 ? ", with the weeks before it dashed" : ""}`;
}

function Head({ reading, href }: { readonly reading: NowReading; readonly href: string }) {
  return (
    <Pressable role="link" aria-label={`${reading.label} ${reading.figure}. See its history and what moves it`} href={href} onPress={() => go(href)} borderRadius="card">
      <Column gap="xs">
        <Row between>
          <Row gap="xs">
            <Icon name={GLYPH[reading.key]} size={18} tone="colorSecondary" />
            <Text variant="label" tone="secondary" role="heading" aria-level={3}>
              {reading.label}
            </Text>
          </Row>
          <Row gap="xs">
            {reading.stance === "adverse" ? <Text variant="caption" weight="strong" tone="danger">LOW</Text> : reading.stance === "caution" ? <Text variant="caption" weight="strong" tone="warning">WATCH</Text> : null}
            <Icon name="chevron" size={14} tone="colorTertiary" />
          </Row>
        </Row>
        <Text variant="figure" tabular>
          {reading.figure}
        </Text>
        {reading.week ? (
          <Text variant="caption" tone={DELTA_TONE[reading.week.direction]}>
            {ARROW[reading.week.direction]} {reading.week.direction === "flat" ? "Flat" : reading.week.text.replace(/^[+−-]/, "")} this week
          </Text>
        ) : (
          <Text variant="caption" tone="tertiary">
            Your first week isn't over yet, so there's nothing to compare.
          </Text>
        )}
        <Text variant="caption" tone="tertiary">
          {UNIT[reading.key]}
        </Text>
      </Column>
    </Pressable>
  );
}

function Reading({ reading, marks }: { readonly reading: NowReading; readonly marks: readonly MeterMark[] }) {
  const href = reading.key === "approval" ? place.electorate() : reading.href;
  return (
    <Surface level="raised" pad="md" flexGrow={1} role="group" aria-label={`${reading.label}: ${reading.figure}`}>
      <Column gap="md" flexGrow={1}>
        <Head reading={reading} href={href} />
        <Sparkline values={reading.trail} splitAt={reading.inherited} valence="neutral" width={176} height={36} label={`${reading.label}, ${weeksOf(reading).toLowerCase()}`} />
        {reading.key !== "treasury" ? <Meter label="Today" value={reading.fraction} figure={reading.figure} marks={marks} tone="accent" /> : null}
      </Column>
    </Surface>
  );
}

/** One key for the whole row: the line, its arrow, and every kind of tick any card draws, with the gate said in plain words. */
function rowKey(readings: readonly NowReading[], marksOf: (reading: NowReading) => readonly MeterMark[]): readonly KeyEntry[] {
  const ticks = readings.flatMap((reading) => meterKeyEntries(marksOf(reading), reading.fraction));
  const unique = ticks.filter((entry, i) => ticks.findIndex((other) => other.id === entry.id) === i);
  return [...sparklineKey("neutral", Math.max(...readings.map((reading) => reading.inherited))), ...unique.map((entry) => (entry.id === "mark:gate" ? { ...entry, label: "Collapse line: at or under it, removal pressure builds" } : entry))];
}

const HELP = {
  meaning: "Each card is one national reading. Its figure is today's value and the arrow says how it moved this week. The line under it is the last weeks of your term, with the weeks before you took office dashed. The bar is today's figure against its reference ticks. On approval they show where past presidents' polls stood. On the others they show your own term's low and high, and the lines where things start to break down.",
  steps: ["Read the figure and its arrow at the top of a card.", "Follow the line to see whether it is climbing or falling.", "Find the tick nearest the end of the bar. It is the reference that matters most right now.", "Press a card's name to see its history and what moves it."],
} as const;

/** The national condition: five readings, each a path over the weeks and, where it has reference lines, today's figure against them, read with one key. */
export function NationalCondition({ campaign }: { readonly campaign: Campaign }) {
  const readings = nowReadings(campaign);
  const drag = approvalBreakdown(campaign).drag;
  const marks = new Map(readings.map((reading) => [reading.key, reading.key === "treasury" ? [] : readingMarks(campaign, reading.key)] as const));
  const marksOf = (reading: NowReading): readonly MeterMark[] => marks.get(reading.key) ?? [];
  return (
    <Section id="country" icon="flag" title="How the country is doing" helper={`As of ${formatDate(campaign.calendar)}. Each change is since last week. Press a reading's name to see what moves it.`}>
      <ReadingFrame level="label" title="Five readings, week by week" unit="Each card names its own unit" period={weeksOf(readings[0]!)} legend={rowKey(readings, marksOf)} help={{ ...HELP, term: termDoor("approval-rating", "approval rating") }}>
        <CardGrid columns={{ phone: 1, tablet: 2, desktop: 3, wide: 5 }}>
          {readings.map((reading) => (
            <Reading key={reading.key} reading={reading} marks={marksOf(reading)} />
          ))}
        </CardGrid>
      </ReadingFrame>
      {drag ? (
        <Surface level="raised" pad="md" accentEdge="danger">
          <Row gap="sm" top>
            <Icon name="adverse" size={18} tone="danger" />
            <Text variant="label" weight="regular" flex={1}>
              Pulling your approval down: {drag.cause.toLowerCase()}. It shows up in how people rate {drag.driver.toLowerCase()}.
            </Text>
          </Row>
        </Surface>
      ) : null}
    </Section>
  );
}
