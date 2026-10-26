import { useState } from "react";
import { Redirect, router } from "expo-router";
import { InlineField } from "@admin/ui/forms";
import {
  Pane,
  Reading,
  Tag,
  Zone,
  Empty,
  ErrorState,
  Key,
  LawHelp,
  Loading,
  MONTH_KEY,
  MonthGrid,
  Peek,
  ReadingFrame,
  TermTimeline,
  markKeyEntries,
  meterKeyEntries,
  sparklineKey,
  type DayCell,
  type KeyEntry,
  type MeterMark,
  View,
  BenchmarkChart,
  Button,
  Column,
  CompareMatrix,
  DocParagraph,
  Document,
  HelpButton,
  LegalCitation,
  Meter,
  Page,
  RelatedRail,
  Row,
  Sheet,
  SignatureBlock,
  Sparkline,
  Surface,
  Text,
  Theme,
  Seal,
  SealNotice,
  Masthead,
} from "@admin/ui";
import { Hemicycle, PositionRidges, RollChart, rollKeyEntries, seatKeyEntries, type SeatView } from "@admin/ui/legislature";
import { FanChart, ResultView, fanKeyEntries, type FanLine } from "@admin/ui/review";
import { StackedBar, segmentKeyEntries, type BarSegment } from "@admin/ui/news";
import { BarRow, BarScale, ShareBar } from "@admin/ui/world";
import { TieMap, tieKeyEntries, type TieMapProps } from "@admin/ui/dossier";
import { PRESS_OUTLETS } from "@admin/engine";
import { sealFor } from "@admin/player-core";
import { isDevelopmentBuild } from "../../../src/shell/build-flavor";

// The design system's live inventory: every component in the states it is
// meant to be judged in, drawn with sample figures. It is a review surface,
// reachable from Settings, never a place the game sends a President.

const WEEKS = Array.from({ length: 12 }, (_, i) => `Wk ${i + 1}`);
const pct = (v: number) => `${Math.round(v * 100)}%`;
const SAMPLE_WAR_POWERS = {
  title: "War powers",
  meaning: "The President commands the armed forces, but Congress declares war and funds it. Committing forces to hostilities starts a clock that Congress can stop.",
  steps: [
    "Consult Congress before introducing forces into hostilities, where possible.",
    "Report to the Speaker and the President pro tempore within 48 hours.",
    "Withdraw within 60 days (plus 30 for safe withdrawal) unless Congress authorizes the use of force or extends the period.",
  ],
  law: [
    { cite: "U.S. Const. art. II, §2, cl. 1", title: "Commander in Chief Clause", summary: "Makes the President commander in chief of the armed forces." },
    { cite: "U.S. Const. art. I, §8, cl. 11", title: "Declare War Clause", summary: "Gives Congress the power to declare war." },
    { cite: "50 U.S.C. §§1541–1548", title: "War Powers Resolution", summary: "Requires the 48-hour report and ends unauthorized hostilities after 60 days." },
  ],
};

function SpecimenGroup({ title, children }: { readonly title: string; readonly children: React.ReactNode }) {
  return (
    <Column gap="md">
      <Text variant="eyebrow" tone="secondary">
        {title}
      </Text>
      {children}
    </Column>
  );
}

const EVERY_KIND: readonly KeyEntry[] = [
  { id: "swatch", kind: "swatch", label: "Swatch: a part of a whole", ink: "accent", figure: 12 },
  { id: "line", kind: "line", label: "Line: a series", ink: "accent", weight: 3 },
  { id: "dash", kind: "dash", label: "Dash: a comparison", ink: "colorSecondary" },
  { id: "band", kind: "line", label: "Band: a likely range", ink: "colorSecondary", band: true },
  { id: "dot", kind: "dot", label: "Dot: a member", ink: "partyDem" },
  { id: "tick", kind: "tick", label: "Tick: a line the rules act on", ink: "danger", dash: "3 1.5" },
  { id: "ring", kind: "ring", label: "Ring: already passed", ink: "colorTertiary" },
  { id: "shape", kind: "shape", shape: "square", label: "Square: stops time", ink: "danger" },
];
const APPROVAL_MARKS: readonly MeterMark[] = [
  { id: "low", label: "Your low 39%", at: 0.39, kind: "record" },
  { id: "avg", label: "Postwar average 54%", at: 0.54, kind: "historical" },
  { id: "floor", label: "Removal pressure 35%", at: 0.35, kind: "gate" },
];
const PARTIES = [
  { party: "democrat" as const, seats: 47, label: "Democrats" },
  { party: "independent" as const, seats: 2, label: "Independents" },
  { party: "republican" as const, seats: 51, label: "Republicans" },
];
const SEATS: readonly SeatView[] = PARTIES.flatMap((p) => Array.from({ length: p.seats }, (_, i) => ({ id: `${p.party}-${i}`, party: p.party, leader: i === 0 })));
const ROLLS = [52, 48, 61, 50, 67, 44].map((yeas, i) => ({ id: `r${i}`, yeas, nays: 100 - yeas, required: i === 4 ? 67 : 51, passed: yeas >= (i === 4 ? 67 : 51), ...(i < 4 ? { byParty: { democrat: { yea: Math.min(47, yeas), nay: Math.max(0, 47 - yeas) }, independent: { yea: 1, nay: 1 }, republican: { yea: Math.max(0, yeas - 48), nay: 51 - Math.max(0, yeas - 48) } } } : {}) }));
const FAN: readonly FanLine[] = [
  { id: "base", label: "Today's course", baseline: true, index: 0, points: [0.45, 0.45, 0.44, 0.44].map((m) => ({ low: m - 0.02, median: m, high: m + 0.02 })) },
  { id: "a", label: "Sign the bill", baseline: false, index: 0, points: [0.45, 0.46, 0.48, 0.49].map((m, i) => ({ low: m - 0.01 * (i + 1), median: m, high: m + 0.01 * (i + 1) })) },
];
const TIES: Omit<TieMapProps, "onOpen"> = {
  subject: { name: "Elena Ruiz", x: 50, y: 50 },
  height: 220,
  headings: [{ label: "Direct ties", y: 110 }],
  nodes: [
    { id: "n1", name: "Marcus Hale", x: 20, y: 150, kind: "Former colleague", tone: "good", reach: 2, spoken: "Marcus Hale, on good terms. Open their profile" },
    { id: "n2", name: "Dana Okafor", x: 80, y: 150, kind: "Rival", tone: "bad", reach: 1, spoken: "Dana Okafor, at odds. Open their profile" },
  ],
  links: [
    { id: "l1", from: { x: 50, y: 50 }, to: { x: 20, y: 150 }, evidence: "recorded", tone: "good", strength: 0.7 },
    { id: "l2", from: { x: 50, y: 50 }, to: { x: 80, y: 150 }, evidence: "inferred", tone: "bad", strength: 0.4 },
  ],
  label: "Elena Ruiz's public ties",
};
const SEGMENTS: readonly BarSegment[] = [
  { key: "critical", count: 7, label: "Critical", ink: "danger" },
  { key: "even", count: 9, label: "Even-handed", ink: "colorTertiary" },
  { key: "friendly", count: 4, label: "Friendly", ink: "successInk" },
];
const MONTH: readonly (readonly DayCell[])[] = Array.from({ length: 5 }, (_, w) =>
  Array.from({ length: 7 }, (_, d) => {
    const day = w * 7 + d + 1;
    const marks = day === 9 ? [{ id: "a", urgency: "hard" as const }] : day === 16 ? [{ id: "b", urgency: "soft" as const }, { id: "c", urgency: "ambient" as const }] : day === 23 ? [{ id: "d", urgency: "ambient" as const }] : [];
    return { key: `2029-03-${String(day).padStart(2, "0")}`, day: ((day - 1) % 31) + 1, inMonth: day <= 31, today: day === 12, marks };
  }),
);
const READ_APPROVAL = { meaning: "The bar is the share of adults who approve of you. Each tick is something to judge it against.", steps: ["Read the figure at the right.", "Find the tick nearest the end of the bar, and see whether the bar has passed it.", "Red dashes are lines the rules act on. Crossing one changes what Congress can do."], term: { label: "caucus break", onOpen: () => router.push("/handbook/terms?at=caucus-break" as never) } };

/** Every drawn reading as a screen should compose it: framed, keyed, with its help. */
function ReadingSpecimens() {
  const [month, setMonth] = useState<string>();
  return (
    <>
      <SpecimenGroup title="Key">
        <Surface>
          <Key entries={EVERY_KIND} title="every kind of mark" />
        </Surface>
      </SpecimenGroup>
      <SpecimenGroup title="Reading frames">
        <Surface>
          <Column gap="xl">
            <ReadingFrame title="Approval compared with past presidents" unit="% of adults" period="This week" legend={meterKeyEntries(APPROVAL_MARKS, 0.47)} help={READ_APPROVAL}>
              <Meter label="Approval" value={0.47} figure="47%" unit="of adults" marks={APPROVAL_MARKS} />
            </ReadingFrame>
            <ReadingFrame title="Approval, recent weeks" unit="% of adults" period="Last 12 weeks" legend={sparklineKey("good", 4)} help={{ meaning: "The line is approval week by week. The dashed stretch is your predecessor's last weeks, and the arrow shows which way it moved since you took office." }}>
              <Sparkline values={[0.41, 0.43, 0.42, 0.44, 0.45, 0.43, 0.46, 0.47]} splitAt={4} valence="good" width={200} height={40} label="Approval rose from 44% to 47% over your term" />
            </ReadingFrame>
            <ReadingFrame title="Projected approval" unit="% of adults" period="Next 3 weeks" legend={fanKeyEntries(FAN)} help={{ meaning: "Each line is the middle of 200 simulated runs for one option, and the shading is where most runs ended up. The dashed line is what happens if you sign nothing." }}>
              <FanChart title="Approval" lines={FAN} startLabel="Today" endLabel="April 2" format={pct} />
            </ReadingFrame>
            <ReadingFrame title="This week's coverage" unit="stories" period="This week" legend={segmentKeyEntries(SEGMENTS)} help={{ meaning: "Each part of the bar is as wide as the number of stories with that tone." }}>
              <StackedBar label="This week's stories by tone" segments={SEGMENTS} />
            </ReadingFrame>
            <ReadingFrame title="War powers clock and trade shares" unit="share of the whole" legend={[{ id: "fill", kind: "swatch", label: "Filled: share used", ink: "warningInk" }, ...markKeyEntries([{ kind: "gate" }])]} help={{ meaning: "Each bar runs from nothing at the left to the whole at the right." }}>
              <ShareBar value={0.68} valence="watch" label="41 of 60 days used" mark={0.5} markLabel="Half the window" />
              <BarScale from="0%" to="100%" unit="Share of imports" />
              <BarRow label="Canada" value={0.31} figure="31%" />
              <BarRow label="Mexico" value={0.27} figure="27%" />
            </ReadingFrame>
          </Column>
        </Surface>
      </SpecimenGroup>
      <SpecimenGroup title="Chamber readings">
        <Surface>
          <Column gap="xl">
            <ReadingFrame title="The Senate" unit="seats of 100" legend={seatKeyEntries(PARTIES, { leaders: true, majority: 51 })} pressHint="Press a seat to open the senator's file" help={{ meaning: "Each dot is one seat, colored by party. The dashed spoke marks the 51st seat.", term: READ_APPROVAL.term }}>
              <View maxWidth={560} width="100%" alignSelf="center">
                <Hemicycle label="Senate: 47 Democrats, 2 independents, 51 Republicans" seats={SEATS} majority={51} onSeat={() => undefined} />
              </View>
            </ReadingFrame>
            <ReadingFrame title="Roll calls this session" unit="votes of 100" period="Oldest to newest" legend={rollKeyEntries(ROLLS)} pressHint="Press a column to open that vote" help={{ meaning: "Each column is one vote. Yes votes rise above the line, no votes fall below it, and the gold tick is what the question needed." }}>
              <RollChart label="Six roll calls" entries={ROLLS} seats={100} onEntry={() => undefined} keyed={false} />
            </ReadingFrame>
            <PositionRidges label="Where senators stand" groups={[{ party: "democrat", positions: [-0.8, -0.6, -0.5, -0.4, -0.2] }, { party: "republican", positions: [0.2, 0.4, 0.5, 0.6, 0.9] }]} you={-0.1} band={{ from: -0.3, to: 0.1 }} />
          </Column>
        </Surface>
      </SpecimenGroup>
      <SpecimenGroup title="Time and ties">
        <Surface>
          <Column gap="xl">
            <TermTimeline title="Your term" progress={0.3} caption="Week 62 of 208" marks={[{ id: "a", label: "Inauguration", dateLabel: "Jan 20, 2029", position: 0, past: true }, { id: "m", label: "Midterms", dateLabel: "Nov 3, 2030", position: 0.45, past: false }, { id: "e", label: "Election", dateLabel: "Nov 7, 2032", position: 0.96, past: false }]} />
            <ReadingFrame title="March 2029" legend={MONTH_KEY} pressHint="Press a day to list what falls on it" help={{ meaning: "Each mark on a day is one dated matter, and its shape says how urgent it is." }}>
              <MonthGrid weekdays={["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]} weeks={MONTH} {...(month ? { selected: month } : {})} onSelect={setMonth} keyed={false} />
            </ReadingFrame>
            <ReadingFrame title="Elena Ruiz's public ties" legend={tieKeyEntries(TIES)} pressHint="Press a face to open that person's file" help={{ meaning: "Faces are people with a public tie to the subject. A ring's color says how they get along, and a line's style says how staff know it." }}>
              <TieMap {...TIES} keyed={false} onOpen={() => undefined} />
            </ReadingFrame>
          </Column>
        </Surface>
      </SpecimenGroup>
    </>
  );
}

/** Waiting, empty and failed states, the quick look, the one result, and the law beside an act. */
/** The desk's own pieces: a pane, readings that change shape with their room, values edited where they are read, and zones. */
function DeskSpecimens() {
  const [release, setRelease] = useState(4.25);
  const [posture, setPosture] = useState("watch");
  const [note, setNote] = useState("Fuel prices first");
  return (
    <SpecimenGroup title="Desk">
      <Pane kicker="Since you took office" title="How the country is doing" actions={<Tag tone="info">Weekly</Tag>}>
        <Row gap="md" wrap>
          <Reading name="Approval" value="52%" delta={{ text: "1.8 pts", direction: "up", better: "up" }} period="since inauguration" source="Tracking poll" minWidth={220} history={<Sparkline values={[0.49, 0.5, 0.5, 0.51, 0.52]} valence="good" />} />
          <Reading name="Inflation" value="2.9%" basis="estimate" delta={{ text: "0.3 pts", direction: "up", better: "down" }} source="Nowcast" minWidth={180} />
          <Reading name="Growth next quarter" value="2.1%" basis="forecast" source="Council of Economic Advisers" minWidth={160} onPress={() => undefined} />
        </Row>
      </Pane>
      <Pane title="Levers you hold" kicker="Edit in place" band="gold">
        <Row gap="md" between wrap>
          <Text variant="label" tone="secondary">Strategic reserve release, million barrels a day</Text>
          <InlineField label="Reserve release" value={release} baseline={4.25} step={0.25} min={0} max={10} onChange={setRelease} />
        </Row>
        <Row gap="md" between wrap>
          <Text variant="label" tone="secondary">Posture toward Caspia</Text>
          <InlineField kind="choice" label="Posture" value={posture} baseline="watch" onChange={setPosture} options={[{ value: "engage", label: "Engage" }, { value: "watch", label: "Watch" }, { value: "pressure", label: "Pressure" }]} />
        </Row>
        <Row gap="md" between wrap>
          <Text variant="label" tone="secondary">Briefing order</Text>
          <InlineField kind="text" label="Briefing order" value={note} onChange={setNote} immediate hint="A view setting: sets at once" />
        </Row>
      </Pane>
      <Row gap="sm" wrap>
        <Tag tone="success">Ahead</Tag>
        <Tag tone="danger">Behind</Tag>
        <Tag tone="warning">Due in 3 days</Tag>
        <Tag tone="info">Briefing</Tag>
        <Tag tone="pending">Draft</Tag>
        <Tag tone="authority">Signed</Tag>
      </Row>
      <Row gap="md" wrap top>
        {(["desk", "paper", "situation"] as const).map((zone) => (
          <View key={zone} flex={1} minWidth={240}>
            <Pane zone={zone} kicker={zone} title={zone === "desk" ? "On the desk" : zone === "paper" ? "On paper" : "Situation room"}>
              <Reading name="Senate votes in hand" value="51" delta={{ text: "2", direction: "up", better: "up" }} period="whip count" minWidth={0} />
              <Row gap="sm" wrap>
                <Tag tone="success">Ahead</Tag>
                <Button kind="primary">Act</Button>
              </Row>
            </Pane>
          </View>
        ))}
      </Row>
      <Zone zone="theater" fill>
        <View padding="lg" borderRadius="card" borderWidth={1} borderColor="borderColorStrong">
          <Text variant="label" tone="secondary">The theater zone: the deepest ground, where the map and its overlays sit.</Text>
        </View>
      </Zone>
    </SpecimenGroup>
  );
}

function StateSpecimens() {
  return (
    <SpecimenGroup title="States, quick look and result">
      <Row gap="md" wrap top>
        <Surface flexGrow={1} flexBasis={260}>
          <Loading title="Reading the cables" detail="This takes a moment on a slow connection." />
        </Surface>
        <Surface flexGrow={1} flexBasis={260}>
          <Empty title="No orders signed yet" detail="Orders you sign appear here with their status." action={{ label: "Draft an order", onPress: () => undefined, icon: "order" }} />
        </Surface>
        <Surface flexGrow={1} flexBasis={260}>
          <ErrorState title="The save could not be read" detail="Your last good save is still there." action={{ label: "Try again", onPress: () => undefined }} />
        </Surface>
      </Row>
      <Surface>
        <Row gap="sm" wrap>
          <Text variant="body">Sponsored by</Text>
          <Peek name="Sen. Marcus Hale" role="Senator from Ohio · Majority whip" readings={<Meter label="Votes with you" value={0.62} figure="62%" unit="of roll calls" />} onOpen={() => undefined} />
        </Row>
      </Surface>
      <ResultView title="Executive order signed: Securing Critical Mineral Supply Chains" verdict={{ word: "Signed", tone: "success", icon: "statusIssued" }} summary="The order takes effect today. Commerce reports back in 30 days." readings={<Meter label="Supply security" value={0.58} figure="58%" unit="of the need met" />} next={<Button kind="primary" icon="brief">Back to the Brief</Button>} secondary={<Button kind="secondary" icon="record">Open the Record entry</Button>} />
      <LawHelp presentation="card" title="Defense Production Act" meaning={SAMPLE_WAR_POWERS.meaning} lede="Priorities and allocations for national defense. Congress must be told." law={[{ cite: "50 U.S.C. §4511(a)", title: "Priorities and allocations", summary: "Lets the President require contracts be accepted and put first." }]} />
    </SpecimenGroup>
  );
}

function Specimens() {
  const [sheet, setSheet] = useState(false);
  return (
    <Column gap="2xl">
      <SpecimenGroup title="Type">
        <Text variant="hero">Hero 60, ceremony</Text>
        <Text variant="headline">Headline 30. Their offensive crossed the border</Text>
        <Text variant="voice">Voice 19. "We will not be the first to move."</Text>
        <Text variant="display">Page title 28</Text>
        <Text variant="heading">Heading 20</Text>
        <Text variant="title">Title 17</Text>
        <Text variant="body">Body 15. The reading size for every paragraph the President reads.</Text>
        <Text variant="label">Label 13</Text>
        <Text variant="caption" tone="secondary">
          Caption 12
        </Text>
        <Text variant="figureXl">52.4%</Text>
        <Text variant="clock">MON 20 JAN 2029 · WEEK 1</Text>
        <Text variant="document">Document 18. Paper in the fiction.</Text>
      </SpecimenGroup>
      <SpecimenGroup title="Actions">
        <Row gap="sm" wrap>
          <Button kind="primary" icon="sign">
            Sign the order
          </Button>
          <Button kind="seal" icon="statusIssued">
            Take the oath
          </Button>
          <Button kind="secondary" icon="review">
            Review terms
          </Button>
          <Button kind="quiet" icon="schedule">
            Calendar
          </Button>
          <Button kind="danger" icon="instrumentMilitary">
            Authorize strike
          </Button>
          <Button kind="secondary" disabled>
            Held
          </Button>
        </Row>
        <Row gap="sm" wrap>
          <Tag tone="success" icon="favorable">
            Ahead of target
          </Tag>
          <Tag tone="warning" icon="caution">
            Watch
          </Tag>
          <Tag tone="danger" icon="adverse">
            Below the floor
          </Tag>
          <Tag tone="info">In committee</Tag>
          <Tag tone="authority" icon="law">
            Statutory
          </Tag>
        </Row>
      </SpecimenGroup>
      <SpecimenGroup title="Readings">
        <Surface>
          <Row gap="xl" wrap top>
            <Reading name="Approval" value="47%" icon="graph" delta={{ text: "2 pts", direction: "up", better: "up" }} period="since last week" source="Weekly tracking poll, n=1,500" minWidth={220} history={<Sparkline values={[0.44, 0.45, 0.43, 0.45, 0.47]} valence="good" />} />
            <Reading name="Inflation" value="3.4%" icon="economyInflation" delta={{ text: "0.3 pts", direction: "up", better: "down" }} period="year over year" standing="watch" />
            <Reading name="Deficit" value="$1.9T" icon="budget" delta={{ text: "$40B", direction: "down", better: "down" }} period="annualized" />
          </Row>
        </Surface>
        <Meter label="Approval compared with past presidents" value={0.47} figure="47%" marks={[{ id: "floor", label: "Removal pressure below 35%", at: 0.35, kind: "gate" }, { id: "avg", label: "Postwar average 54%", at: 0.54, kind: "historical" }]} />
      </SpecimenGroup>
      <DeskSpecimens />
      <ReadingSpecimens />
      <StateSpecimens />
      <SpecimenGroup title="Benchmark chart">
        <Surface>
          <BenchmarkChart
            title="Approval: you, past presidents and the floor"
            unit="% of adults"
            period="Weekly, this term"
            help={{ meaning: "Your line is the heavy blue one. Each other line ends in its name. Red dashes are the floor the rules act on, and the green shading is the healthy range." }}
            x={WEEKS}
            format={pct}
            domain={[0.2, 0.8]}
            series={[
              { id: "you", label: "You", kind: "self", values: [0.52, 0.51, 0.5, 0.49, 0.47, 0.48, 0.46, 0.45, 0.47, 0.47, null, null] },
              { id: "h1", label: "Average first term", kind: "history", values: [0.58, 0.57, 0.57, 0.56, 0.55, 0.55, 0.54, 0.54, 0.53, 0.53, 0.52, 0.52] },
            ]}
            benchmarks={[{ id: "floor", label: "Removal pressure", value: 0.35, kind: "gate" }, { id: "honeymoon", label: "Healthy range", band: [0.5, 0.65], kind: "target" }]}
          />
        </Surface>
        <Surface>
          <BenchmarkChart
            title="GDP growth: the U.S. against peers"
            x={["2025", "2026", "2027", "2028", "2029"]}
            format={(v) => `${v.toFixed(1)}%`}
            series={[
              { id: "us", label: "United States", kind: "self", values: [2.8, 2.1, 1.9, 2.4, 2.6] },
              { id: "de", label: "Germany", kind: "peer", values: [0.2, 0.8, 1.1, 1.3, 1.2] },
              { id: "jp", label: "Japan", kind: "peer", values: [0.6, 0.9, 1.0, 0.7, 0.8] },
              { id: "in", label: "India", kind: "peer", values: [6.5, 6.8, 6.3, 6.6, 6.4] },
            ]}
            benchmarks={[{ id: "g7", label: "G7 median", value: 1.1, kind: "historical" }]}
          />
        </Surface>
      </SpecimenGroup>
      <SpecimenGroup title="Compare matrix">
        <CompareMatrix
          title="Five countries, four numbers"
          metrics={[
            { id: "gdp", label: "GDP growth", better: "up", format: (v) => `${v.toFixed(1)}%`, benchmark: { label: "G7", value: 1.1 } },
            { id: "inf", label: "Inflation", better: "down", format: (v) => `${v.toFixed(1)}%` },
            { id: "stab", label: "Stability", better: "up", format: (v) => `${Math.round(v)}` },
            { id: "mil", label: "Readiness", better: "up", format: (v) => `${Math.round(v)}` },
          ]}
          rows={[
            { id: "us", label: "United States", self: true, values: { gdp: 2.6, inf: 3.4, stab: 71, mil: 88 } },
            { id: "cn", label: "China", values: { gdp: 4.6, inf: 0.4, stab: 64, mil: 81 } },
            { id: "de", label: "Germany", values: { gdp: 1.2, inf: 2.2, stab: 78, mil: 52 } },
            { id: "in", label: "India", values: { gdp: 6.4, inf: 4.9, stab: 58, mil: 66 } },
            { id: "br", label: "Brazil", values: { gdp: 2.0, inf: 4.4, stab: 55, mil: null } },
            { id: "g7", label: "G7 median", reference: true, values: { gdp: 1.1, inf: 2.6, stab: 74, mil: 61 } },
          ]}
        />
      </SpecimenGroup>
      <SpecimenGroup title="Documents and classification">
        <Document issuer="The White House" kind="Executive Order" title="Securing Critical Mineral Supply Chains" date="January 21, 2029" seal={<Seal spec={sealFor("SEAL-WHITE-HOUSE")} size={72} label="The White House" />} footer={<SignatureBlock name="President" office="The President of the United States" signed="January 21, 2029" />}>
          <DocParagraph>By the authority vested in me as President by the Constitution and the laws of the United States of America, including the Defense Production Act of 1950, it is hereby ordered as follows.</DocParagraph>
          <LegalCitation citation={{ cite: "50 U.S.C. §4511(a)", title: "Defense Production Act, priorities and allocations" }} onPress={() => setSheet(true)} />
        </Document>
        <Document issuer="Office of the Director of National Intelligence" kind="The President's Daily Brief" date="March 3, 2029" level="topSecret" caveat="NOFORN" reference="PDB-2029-0303" seal={<Seal spec={sealFor("INST-ODNI")} size={72} label="Office of the Director of National Intelligence" />}>
          <DocParagraph level="secret">Satellite imagery shows armor moving toward the northern border crossings over the past 72 hours.</DocParagraph>
          <DocParagraph level="topSecretSci">A sensitive source reports the decision to cross has not yet been taken.</DocParagraph>
          <DocParagraph level="unclassified">Public reporting in the region has not yet noticed the movement.</DocParagraph>
        </Document>
      </SpecimenGroup>
      <SpecimenGroup title="Emblems">
        <Row gap="lg" wrap>
          {["SEAL-PRESIDENT", "INST-STATE", "INST-TREASURY", "INST-DOD", "INST-DOJ", "INST-DHS", "INST-CIA", "INST-FED", "INST-ARMY", "ORG-NATO", "ORG-EU", "ORG-G7"].map((id) => (
            <Column key={id} gap="xs" alignItems="center" width={112}>
              <Seal spec={sealFor(id)} size={96} label={id} />
              <Seal spec={sealFor(id)} size={28} />
            </Column>
          ))}
        </Row>
        <Column gap="sm">
          {PRESS_OUTLETS.slice(0, 6).map((outlet) => (
            <Masthead key={outlet.id} spec={sealFor(outlet.id)} name={outlet.name} size="compact" />
          ))}
        </Column>
        <SealNotice />
      </SpecimenGroup>
      <SpecimenGroup title="Context and help">
        <Row gap="sm" wrap>
          <Text variant="body">Introducing forces into hostilities</Text>
          <HelpButton content={SAMPLE_WAR_POWERS} />
        </Row>
        <RelatedRail items={[{ id: "a", label: "Secretary of Defense", detail: "Advises on force posture", icon: "departmentDefense", onPress: () => setSheet(true) }, { id: "b", label: "Senate Armed Services Committee", detail: "Would hear an authorization", icon: "subjectChamber", onPress: () => setSheet(true) }]} />
        <Button kind="secondary" onPress={() => setSheet(true)}>
          Open a sheet
        </Button>
        <Sheet open={sheet} onClose={() => setSheet(false)} title="Defense Production Act" eyebrow="Authority">
          <Text>Lets the President require businesses to accept and prioritize contracts necessary for national defense.</Text>
        </Sheet>
      </SpecimenGroup>
    </Column>
  );
}

function CatalogPage() {
  return (
    <Page eyebrow="Design system" icon="layerBlocs" title="Component catalog" lede="Every component in the states it is judged in, in the active theme and on the situation-room surface.">
      <Specimens />
      <Theme name="situation">
        <Surface level="sunken" pad="xl" radius="sheet">
          <Column gap="lg">
            <Text variant="eyebrow" tone="gold">
              Situation room surface
            </Text>
            <Row gap="xl" wrap top>
              <Reading name="Forces deployed" value="12,400" icon="unitGroundFormation" delta={{ text: "3,100", direction: "up", tone: "watch" }} period="this week" />
              <Reading name="War Powers clock" value="Day 41 of 60" icon="pending" standing="watch" />
            </Row>
            <Button kind="primary" icon="review">
              Convene the National Security Council
            </Button>
          </Column>
        </Surface>
      </Theme>
    </Page>
  );
}

/** The design-system specimens are for the people who build the game, so a shipped build sends the address to the Brief. */
export default function Catalog() {
  if (!isDevelopmentBuild) return <Redirect href="/brief" />;
  return <CatalogPage />;
}
