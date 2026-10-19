import { COVERAGE_TONE_WORD, formatRatio, type PressKpis } from "@admin/player-core";
import { CardGrid, Column, Meter, ReadingFrame, markKeyEntries, type MeterMark, type Tone } from "@admin/ui";
import { StackedBar, segmentKeyEntries, type BarSegment } from "@admin/ui/news";
import { Tile } from "@admin/ui/world";
import { termDoor } from "../handbook/term-door";
import { pressHref, type PressView } from "./press-params";
import { go } from "./story-parts";

const METER = { good: "successInk", watch: "warningInk", bad: "danger", neutral: "accent" } as const;

const STANDING_WORD = { good: "Friendly", watch: "Mixed", bad: "Hostile", neutral: "Unknown" } as const;
const STANDING_MARKS: readonly MeterMark[] = [{ id: "hostile", label: "Hostile under 40%", at: 0.4, kind: "gate" }, { id: "friendly", label: "Friendly from 55%", at: 0.55, kind: "target" }];

const standingTone = (value: number): Tone => (value >= 0.55 ? "good" : value >= 0.4 ? "watch" : "bad");

export const TONE_SEGMENTS = { critical: "danger", even: "pendingInk", friendly: "successInk", other: "infoInk" } as const;

function weekSegments(week: NonNullable<PressKpis["week"]>): readonly BarSegment[] {
  return (["critical", "even", "friendly"] as const).map((tone) => ({ key: tone, count: week[tone], label: COVERAGE_TONE_WORD[tone], ink: TONE_SEGMENTS[tone] }));
}

function volumeCaption(kpis: PressKpis): string {
  if (kpis.earlierAverage === undefined) return "There's no earlier week to compare with yet.";
  const typical = kpis.earlierAverage < 10 ? kpis.earlierAverage.toFixed(1) : String(Math.round(kpis.earlierAverage));
  return `A typical recent week had ${typical}.`;
}

/** Returns an array, not a fragment, so the grid sees each tile as its own cell. */
function CoverageTiles({ kpis, open }: { readonly kpis: PressKpis; readonly open: (view: PressView, href?: string) => void }) {
  const { week, criticalShare } = kpis;
  const leanTone: Tone = criticalShare === undefined ? "neutral" : criticalShare >= 0.5 ? "bad" : criticalShare >= 0.3 ? "watch" : "good";
  return [
      <Tile key="1" icon="press" label="How reporters feel about you" figure={STANDING_WORD[standingTone(kpis.standing.value)]} valence={standingTone(kpis.standing.value)} reading={<ReadingFrame title="Reporters' goodwill toward you" unit="% of the most goodwill, 0 to 100" period="Now, all outlets averaged" legend={markKeyEntries(STANDING_MARKS)} help={{ meaning: "The bar is the average of what every news outlet thinks of you. Under 40% reads as hostile, 55% and up as friendly, and in between as mixed. The fill is colored to match.", term: termDoor("press-corps", "the press corps") }}><Meter label="Goodwill" value={kpis.standing.value} figure={kpis.standing.percent} tone={METER[standingTone(kpis.standing.value)]} marks={STANDING_MARKS} /></ReadingFrame>} caption={`${kpis.hostileDesks} of ${kpis.deskCount} news outlets hostile. ${kpis.warming} warming, ${kpis.cooling} cooling.`} href={pressHref({ view: "desks" })} onPress={() => open("desks")} />,
      <Tile key="2" icon="press" label="This week's tone" figure={criticalShare === undefined ? "None" : formatRatio(criticalShare)} unit={criticalShare === undefined ? undefined : "critical"} valence={leanTone} reading={week ? <ReadingFrame title="This week's stories by tone" unit="Stories filed about you this week" legend={segmentKeyEntries(weekSegments(week))} help={{ meaning: "Each story a news outlet filed about you this week is sorted by its tone. The bar is split in proportion to the count in each, and the key gives the count.", term: termDoor("press-story-spreads", "how stories spread") }}><StackedBar label="This week's stories by tone" segments={weekSegments(week)} /></ReadingFrame> : undefined} caption={week ? `${week.critical} critical, ${week.even} even-handed, ${week.friendly} friendly.` : "No stories about you yet this week."} href={pressHref({ view: "feed", week: week?.week })} onPress={() => open("feed", week ? String(week.week) : undefined)} />,
      <Tile key="3" icon="record" label="Stories" figure={String(kpis.week?.total ?? 0)} unit="this week" caption={volumeCaption(kpis)} href={pressHref({ view: "feed" })} onPress={() => open("feed")} />,
  ];
}

function ResponseTiles({ kpis, open }: { readonly kpis: PressKpis; readonly open: (view: PressView, href?: string) => void }) {
  const silenceTone: Tone = kpis.silenceWeeks > kpis.silenceLimit ? "bad" : kpis.silenceWeeks > kpis.silenceLimit / 2 ? "watch" : "good";
  const { secretary } = kpis;
  return [
      <Tile key="4" icon="caution" label="Ongoing stories" figure={String(kpis.running)} unit={kpis.running === 1 ? "story" : "stories"} valence={kpis.running > 0 ? "watch" : "good"} caption={kpis.hottest ? `Biggest: ${kpis.hottest}` : "No stories are going against you right now."} href={pressHref({ view: "respond" })} onPress={() => open("respond")} />,
      <Tile key="5" icon="microphone" label="Since you took questions" figure={String(kpis.silenceWeeks)} unit={kpis.silenceWeeks === 1 ? "week" : "weeks"} valence={silenceTone} reading={<ReadingFrame title="Weeks without taking questions" unit={`Weeks, with the limit at ${kpis.silenceLimit}`} period="Since your last briefing" legend={markKeyEntries([{ kind: "gate" }])} help={{ meaning: "The bar counts the weeks since you last took reporters' questions. Past the dashed line, your silence becomes the story.", term: termDoor("press-briefing", "a press briefing") }}><Meter label="Weeks without questions" value={Math.min(1, kpis.silenceWeeks / (kpis.silenceLimit * 1.5))} figure={`${kpis.silenceWeeks} of ${kpis.silenceLimit}`} tone={METER[silenceTone]} marks={[{ id: "limit", label: `After ${kpis.silenceLimit} weeks, reporters start writing about your silence`, at: 1 / 1.5, kind: "gate" }]} /></ReadingFrame>} caption={kpis.silence} href={pressHref({ view: "respond" })} onPress={() => open("respond")} />,
      <Tile key="6" icon="appoint" label="Press secretary" figure={secretary ? secretary.name : "No one in the job"} valence={secretary?.read?.tone ?? "neutral"} caption={secretary ? `${secretary.read ? `${secretary.read.word}. ` : ""}${secretary.spent ? "Already took the blame for you once, so reporters trust them half as much." : "Ready to speak for you."}` : "You'll have to face the press yourself."} href={secretary?.href ?? pressHref({ view: "respond" })} onPress={() => (secretary ? go(secretary.href) : open("respond"))} />,
  ];
}

/** The press in the six numbers a President reads first, each a door to where it is read in full. */
export function PressKpisBand({ kpis, section, open }: { readonly kpis: PressKpis; readonly section: "coverage" | "response"; readonly open: (view: PressView, week?: string) => void }) {
  return (
    <Column gap="sm" role="region" aria-label="The press at a glance">
      <CardGrid columns={{ phone: 1, tablet: 3, desktop: 3, wide: 3 }}>
        {section === "coverage" ? CoverageTiles({ kpis, open }) : ResponseTiles({ kpis, open })}
      </CardGrid>
    </Column>
  );
}
