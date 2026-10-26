import { useMemo, useState } from "react";
import { COVERAGE_TONES, COVERAGE_TONE_WORD, formatRatio, place, sealFor, type DeskRow, type WeekCoverage } from "@admin/player-core";
import { CardGrid, CardLink, Column, Empty, EntityLink, Masthead, Meter, ReadingFrame, Row, Surface, Tag, Text, View, type KeyEntry } from "@admin/ui";
import { Segmented } from "@admin/ui/forms";
import { WeekColumns, segmentKeyEntries, type BarSegment, type WeekColumn } from "@admin/ui/news";
import { termDoor } from "../handbook/term-door";
import { feedHref } from "./press-params";
import { TONE_SEGMENTS } from "./PressKpis";
import { go, outletLean } from "./story-parts";

const HEADING = { warming: { word: "Warming to you", tone: "success" }, cooling: { word: "Cooling on you", tone: "danger" }, settled: { word: "Steady", tone: "outline" } } as const;
const STANCE_INK = { hostile: "danger", skeptical: "warningInk", neutral: "accent", friendly: "successInk" } as const;

const STANCE_KEY: readonly KeyEntry[] = [
  { id: "hostile", kind: "swatch", label: "Hostile", ink: STANCE_INK.hostile },
  { id: "skeptical", kind: "swatch", label: "Skeptical", ink: STANCE_INK.skeptical },
  { id: "neutral", kind: "swatch", label: "Even-handed", ink: STANCE_INK.neutral },
  { id: "friendly", kind: "swatch", label: "Friendly", ink: STANCE_INK.friendly },
];

type Sort = "hostile" | "reach" | "week" | "name";
const SORTS: readonly { readonly value: Sort; readonly label: string }[] = [
  { value: "hostile", label: "Least friendly first" },
  { value: "reach", label: "Audience" },
  { value: "week", label: "This week" },
  { value: "name", label: "Name" },
];

function sorted(desks: readonly DeskRow[], sort: Sort): readonly DeskRow[] {
  if (sort === "hostile") return desks;
  const value = { reach: (desk: DeskRow) => -desk.reachShare, week: (desk: DeskRow) => -desk.thisWeek, name: () => 0 }[sort];
  return [...desks].sort((a, b) => value(a) - value(b) || a.name.localeCompare(b.name));
}

function segmentsOf(week: WeekCoverage): readonly BarSegment[] {
  return [
    ...COVERAGE_TONES.map((tone) => ({ key: tone, count: week[tone], label: COVERAGE_TONE_WORD[tone], ink: TONE_SEGMENTS[tone] })),
    { key: "other", count: week.other, label: "From the White House or intelligence agencies", ink: TONE_SEGMENTS.other },
  ];
}

function spoken(week: WeekCoverage): string {
  if (week.total === 0) return `Week ${week.week}: no stories`;
  const parts = segmentsOf(week).filter((part) => part.count > 0).map((part) => `${part.count} ${part.label.toLowerCase()}`);
  return `Week ${week.week}: ${week.total} ${week.total === 1 ? "story" : "stories"}, ${parts.join(", ")}. Open that week's stories`;
}

/** Every recent week as one column split by how the filing desks leaned; a column opens that week's stories. */
export function CoverageWeeks({ weeks, selected }: { readonly weeks: readonly WeekCoverage[]; readonly selected?: number }) {
  const columns: readonly WeekColumn[] = weeks.map((week) => ({ key: week.week, label: String(week.week), segments: segmentsOf(week), total: week.total, spoken: spoken(week), current: week.current }));
  const totals = segmentsOf(weeks.reduce((sum, week) => ({ ...sum, critical: sum.critical + week.critical, even: sum.even + week.even, friendly: sum.friendly + week.friendly, other: sum.other + week.other }), { week: 0, critical: 0, even: 0, friendly: 0, other: 0, total: 0, current: false }));
  const any = weeks.some((week) => week.total > 0);
  return (
    <Surface>
      <Column gap="md">
        {any ? (
          <ReadingFrame
            title="Stories about you each week"
            unit="Stories"
            period="Recent weeks"
            level={2}
            legend={[...segmentKeyEntries(totals.filter((part) => part.count > 0)), { id: "now", kind: "swatch", label: "Outline: this week", ink: "gold", hollow: true }]}
            pressHint="Press a column to read that week's stories."
            help={{ meaning: "Each column is one week of stories about you, colored by how friendly each news outlet was. The scale on the left is the number of stories.", steps: ["Look for the week the colors changed.", "Press that week's column to read its stories."], term: termDoor("press-corps", "Press corps") }}
          >
            <WeekColumns columns={columns} {...(selected !== undefined ? { selected } : {})} onSelect={(week) => go(feedHref({ week }))} />
          </ReadingFrame>
        ) : (
          <>
            <Text variant="heading" role="heading" aria-level={2}>
              Stories each week
            </Text>
            <Empty title="No stories about you yet" detail="This chart shows up after a news outlet writes its first story about you." icon="press" />
          </>
        )}
      </Column>
    </Surface>
  );
}

/** The outlet's newest story, its own door so it does not fight the card, which opens all of the outlet's stories. */
function LatestStory({ headline, index }: { readonly headline: string; readonly index: number }) {
  return (
    <Column gap="2xs" alignItems="flex-start">
      <Text variant="caption" tone="tertiary">Latest story</Text>
      <EntityLink label={headline} icon="press" href={place.dispatch(String(index))} onPress={() => go(place.dispatch(String(index)))} />
    </Column>
  );
}

function DeskBody({ desk }: { readonly desk: DeskRow }) {
  const heading = HEADING[desk.heading];
  const lean = outletLean(desk.id);
  return (
    <Column gap="sm" flexGrow={1}>
      <Masthead spec={sealFor(desk.id, desk.name)} name={desk.name} size="compact" />
      <Text variant="caption" tone="secondary">
        {desk.format}
        {desk.region ? `, ${desk.region}` : ""}
        {lean ? ` · ${lean}` : ""}
      </Text>
      <Meter label="How it feels about you" value={desk.disposition} figure={desk.stanceWord} tone={STANCE_INK[desk.stance]} />
      <Row gap="sm" wrap>
        <Tag tone={heading.tone}>{heading.word}</Tag>
        <Text variant="caption" tone="secondary" flex={1} minWidth={160}>
          {desk.why}
        </Text>
      </Row>
      <Meter label="Audience" value={desk.reachOfWidest} figure={`${formatRatio(desk.reachShare)} of adults each week`} tone="accent" />
      <Text variant="caption" tone="tertiary">
        {desk.credibility}. Read most by {desk.readers.slice(0, 2).join(" and ") || "a broad audience"}.
      </Text>
      <View flexGrow={1} />
      <Text variant="label">{`${desk.thisWeek} ${desk.thisWeek === 1 ? "story" : "stories"} this week, ${desk.filed} in all`}</Text>
      {desk.last ? <LatestStory headline={desk.last.headline} index={desk.last.index} /> : null}
    </Column>
  );
}

/** An outlet that has filed opens its stories from anywhere on the card; one that has filed nothing has nowhere to go. */
function DeskCard({ desk }: { readonly desk: DeskRow }) {
  if (desk.filed === 0) {
    return (
      <Surface pad="md" flexGrow={1} role="group" aria-label={desk.name}>
        <DeskBody desk={desk} />
      </Surface>
    );
  }
  return (
    <CardLink pad="md" flexGrow={1} label={`Open the stories from ${desk.name}`} href={feedHref({ outlet: desk.id })} onPress={() => go(feedHref({ outlet: desk.id }))}>
      <DeskBody desk={desk} />
    </CardLink>
  );
}

/** The weeks of coverage, then every desk on the same readings: where it stands, which way it is heading, who reads it and what it filed. */
export function DesksView({ desks, weeks, selectedWeek }: { readonly desks: readonly DeskRow[]; readonly weeks: readonly WeekCoverage[]; readonly selectedWeek?: number }) {
  const [sort, setSort] = useState<Sort>("hostile");
  const ordered = useMemo(() => sorted(desks, sort), [desks, sort]);
  return (
    <Column gap="xl">
      <CoverageWeeks weeks={weeks} {...(selectedWeek !== undefined ? { selected: selectedWeek } : {})} />
      <Column id="press-desks" gap="md">
        <Row between wrap gap="sm">
          <Column gap="2xs" flex={1} minWidth={240}>
            <Text variant="heading" role="heading" aria-level={2}>
              News outlets that cover you
            </Text>
            <Text variant="caption" tone="secondary">
              {`${desks.length} news outlets: ${desks.filter((desk) => desk.heading === "warming").length} warming to you, ${desks.filter((desk) => desk.heading === "cooling").length} cooling.`}
            </Text>
          </Column>
          <Segmented label="Sort outlets" options={SORTS} value={sort} onChange={setSort} />
        </Row>
        <ReadingFrame
          title="How each news outlet feels about you, and who reads it"
          unit="Goodwill toward you, 0 to 100%, and share of adults who read it each week"
          period="Now"
          legend={[...STANCE_KEY, { id: "audience", kind: "swatch", label: "Audience: share of adults it reaches each week", ink: "accent" }]}
          pressHint="Press an outlet to read its stories."
          help={{ meaning: "Each card has two bars. The first is how much goodwill the outlet has toward you, and its word comes from where the bar ends: Hostile under 30%, Skeptical up to 45%, Even-handed up to 62%, Friendly above that. The second is how many adults the outlet reaches in a week.", term: termDoor("press-corps", "Press corps") }}
        >
          <CardGrid columns={{ phone: 1, tablet: 2, desktop: 2, wide: 3 }}>
            {ordered.map((desk) => (
              <DeskCard key={desk.id} desk={desk} />
            ))}
          </CardGrid>
        </ReadingFrame>
      </Column>
    </Column>
  );
}
