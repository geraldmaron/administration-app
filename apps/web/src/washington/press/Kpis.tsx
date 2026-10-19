import type { ReactNode } from "react";
import { COVERAGE_TONE_WORD, formatRatio, type PressKpis } from "@admin/player-core";
import { Bar, Stat, StatRow, Icon, type IconName } from "@admin/ui-web";
import { Door } from "../../shell/Door";
import { feedHref, pressHref, pressViewForSection } from "./press-search";

type Tone = "good" | "watch" | "bad";

type Segment = { readonly key: string; readonly count: number; readonly word: string };

/** A set divided into its parts on one bar, each part its count; the words are what a screen reader hears. */
function Segments({ parts, label }: { readonly parts: readonly Segment[]; readonly label: string }) {
  const spoken = `${label}: ${parts.map((part) => `${part.count} ${part.word}`).join(", ")}.`;
  return (
    <span className="pr-segments" role="img" aria-label={spoken}>
      {parts.map((part) => (part.count > 0 ? <span key={part.key} data-segment={part.key} style={{ flexGrow: part.count }} /> : null))}
    </span>
  );
}

type TileProps = {
  readonly icon: IconName;
  readonly label: string;
  readonly tone?: Tone | undefined;
  readonly figure: ReactNode;
  readonly unit?: string;
  readonly reading?: ReactNode;
  readonly caption: ReactNode;
  readonly jumpTo?: string;
  readonly door?: string;
};

function Tile({ icon, label, tone, figure, unit, reading, caption, jumpTo, door }: TileProps) {
  const name = (
    <>
      <Icon name={icon} size={16} /> {label}
    </>
  );
  return (
    <li className="pr-kpi ui-row-target" data-tone={tone} data-door={jumpTo || door ? "true" : undefined}>
      <Stat layout="comparison" heading size="heading" {...(tone ? { tone } : {})}
        compact={typeof figure !== "number" && (typeof figure !== "string" || !/^[\d.,%$]/.test(figure))}
        label={jumpTo || door ? <Door className="ui-row-link" href={door ?? pressHref({ view: pressViewForSection(jumpTo!) }, jumpTo)}>{name}</Door> : name}
        value={<>{figure}{unit ? <small>{unit}</small> : null}</>}
        {...(reading ? { reading } : {})} period={caption} />
    </li>
  );
}

function standingTone(value: number): Tone {
  return value >= 0.55 ? "good" : value >= 0.4 ? "watch" : "bad";
}

function weekTile(kpis: PressKpis) {
  const { week, criticalShare } = kpis;
  if (!week || criticalShare === undefined) {
    return <Tile icon="press" label="This week's lean" figure="None" caption="No desk has filed a story yet this week." jumpTo="press-weeks" />;
  }
  const tone: Tone = criticalShare >= 0.5 ? "bad" : criticalShare >= 0.3 ? "watch" : "good";
  const parts: readonly Segment[] = [
    { key: "critical", count: week.critical, word: COVERAGE_TONE_WORD.critical.toLowerCase() },
    { key: "even", count: week.even, word: COVERAGE_TONE_WORD.even.toLowerCase() },
    { key: "friendly", count: week.friendly, word: COVERAGE_TONE_WORD.friendly.toLowerCase() },
  ];
  return (
    <Tile
      icon="press"
      label="This week's lean"
      tone={tone}
      figure={formatRatio(criticalShare)}
      unit="critical"
      reading={<Segments label="This week's desk stories" parts={parts} />}
      caption={`${week.critical} critical, ${week.even} even-handed, ${week.friendly} friendly.`}
      door={feedHref({ week: week.week })}
    />
  );
}

function volumeCaption(kpis: PressKpis): string {
  if (kpis.earlierAverage === undefined) return "No earlier week to read it against.";
  const typical = kpis.earlierAverage < 10 ? kpis.earlierAverage.toFixed(1) : String(Math.round(kpis.earlierAverage));
  return `${typical} in a typical recent week.`;
}

/**
 * Three relevant readings per workspace. Each tile opens its actual context;
 * coverage and response do not compete for the first screen on a phone.
 */
export function PressKpisBand({ kpis, section = "coverage" }: { readonly kpis: PressKpis; readonly section?: "coverage" | "response" }) {
  const { secretary } = kpis;
  const silenceTone: Tone = kpis.silenceWeeks > kpis.silenceLimit ? "bad" : kpis.silenceWeeks > kpis.silenceLimit / 2 ? "watch" : "good";
  return (
    <section className="pr-kpis-wrap" aria-label="The press at a glance">
      <StatRow as="ul" layout="comparison" className="pr-kpis">
        {section === "coverage" ? <><Tile
          icon="press"
          label="Corps toward you"
          tone={standingTone(kpis.standing.value)}
          figure={kpis.standing.percent}
          reading={<Bar label={`The corps toward you is ${kpis.standing.percent}, even at 50%`} value={kpis.standing.value} tone={standingTone(kpis.standing.value)} marks={[{ at: 0.5, label: "Even" }]} />}
          caption={`${kpis.hostileDesks} of ${kpis.deskCount} desks hostile; ${kpis.warming} warming, ${kpis.cooling} cooling.`}
          jumpTo="press-desks"
        />
        {weekTile(kpis)}
        <Tile icon="record" label="Stories filed" figure={kpis.week?.total ?? 0} unit="this week" caption={volumeCaption(kpis)} jumpTo="press-feed" /></> : <>
        <Tile
          icon="caution"
          label="Running stories"
          tone={kpis.running > 0 ? "watch" : "good"}
          figure={kpis.running}
          unit={kpis.running === 1 ? "story" : "stories"}
          caption={kpis.hottest ? `Hottest: ${kpis.hottest}` : "None is running against the administration."}
          jumpTo="press-stories"
        />
        <Tile icon="microphone" label="Since a question" tone={silenceTone} figure={kpis.silenceWeeks} unit={kpis.silenceWeeks === 1 ? "week" : "weeks"} caption={kpis.silence} jumpTo="press-respond" />
        <Tile
          icon="appoint"
          label="Press secretary"
          tone={secretary?.read?.tone}
          figure={<span className="pr-kpi__name">{secretary ? secretary.name : "No one seated"}</span>}
          caption={secretary ? `${secretary.read ? `${secretary.read.word}. ` : ""}${secretary.spent ? "Has already taken one for you; briefs at half." : "Ready at the podium."}` : "The President briefs alone."}
          {...(secretary ? { door: secretary.href } : { jumpTo: "press-respond" })}
        /></>}
      </StatRow>
    </section>
  );
}
