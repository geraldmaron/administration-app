import { useMemo, useState } from "react";
import { daysBetween, type Campaign } from "@admin/engine";
import { ARC_DISPOSITION_WORDS, METRIC_LABELS, PLEDGE_WARNING_DAYS, compareSeries, formatDate, formatRatio, impactReports, inheritedQuarter, isInheritedRow, polarizationReading, selectArcReading, selectPromises, selfVersus, type ArcRow, type CompareMetricId, type PromiseRow } from "@admin/player-core";
import { BenchmarkChart, CardGrid, CardLink, Column, Empty, Icon, Meter, Reading, ReadingFrame, Row, Surface, Tag, Text, meterKeyEntries } from "@admin/ui";
import { CompareDoor } from "../compare/CompareDoor";
import { termDoor } from "../handbook/term-door";
import { go } from "../shell/navigate";
import { formatReading, termCourse } from "./course";
import { ArcSheet, ImpactReportList } from "./Investigations";
import { RecordArea } from "./Panel";

const PLEDGE = { open: { word: "Open", tone: "outline" }, kept: { word: "Kept", tone: "success" }, broken: { word: "Broken", tone: "danger" } } as const;

function pledgeWhen(campaign: Campaign, pledge: PromiseRow): { readonly when: string; readonly due: boolean } {
  const dueIn = daysBetween(campaign.calendar, pledge.dueDate);
  const due = pledge.status === "open" && dueIn <= PLEDGE_WARNING_DAYS;
  const when = pledge.status === "open" ? `Due ${formatDate(pledge.dueDate)}${due ? (dueIn < 0 ? ", overdue" : `, in ${dueIn} ${dueIn === 1 ? "day" : "days"}`) : ""}` : pledge.settledDate ? formatDate(pledge.settledDate) : "";
  return { when, due };
}

/** An open promise with somewhere to act on it is one door across the whole card; a settled one only reads. */
function Pledge({ campaign, pledge }: { readonly campaign: Campaign; readonly pledge: PromiseRow }) {
  const { when, due } = pledgeWhen(campaign, pledge);
  const edge = due ? "warning" : pledge.status === "kept" ? "success" : pledge.status === "broken" ? "danger" : undefined;
  const door = pledge.status === "open" ? pledge.door : undefined;
  const body = (
    <Column gap="xs">
      <Row gap="sm" wrap><Text variant="label" flex={1} minWidth={200}>{pledge.title}</Text><Tag tone={PLEDGE[pledge.status].tone}>{PLEDGE[pledge.status].word}</Tag>{due ? <Tag tone="warning">Due soon</Tag> : null}</Row>
      <Text variant="caption" tone="secondary">{`${when}${pledge.firstHundredDays ? " · first 100 days" : ""}`}</Text>
      {pledge.status === "open" && pledge.keptWhen ? <Text variant="caption" tone="secondary">{pledge.keptWhen}</Text> : null}
      {door ? <Row gap="2xs"><Text variant="label" tone="accent">{door.label}</Text><Icon name="chevron" size={14} tone="accent" /></Row> : null}
    </Column>
  );
  if (!door) return <Surface pad="md" {...(edge ? { accentEdge: edge } : {})}>{body}</Surface>;
  return <CardLink pad="md" {...(edge ? { accentEdge: edge } : {})} label={`${pledge.title}. ${door.label}`} href={door.href} onPress={() => go(door.href)}>{body}</CardLink>;
}

/** The platform's promises, soonest due first, with the share kept so far; one falling due within two weeks is marked. */
export function Promises({ campaign }: { readonly campaign: Campaign }) {
  const pledges = selectPromises(campaign);
  if (pledges.length === 0) return <Empty title="No promises were made" detail="Your campaign didn't make any promises, so there's nothing to track here." />;
  const kept = pledges.filter((pledge) => pledge.status === "kept").length;
  const broken = pledges.filter((pledge) => pledge.status === "broken").length;
  return (
    <RecordArea id="promises" icon="sign" title="Your promises" lede={`${kept} kept, ${broken} broken and ${pledges.length - kept - broken} still open of the ${pledges.length} you made.`}>
      <ReadingFrame
        title="Promises kept"
        unit="Share of the promises you made"
        period="Since the campaign"
        legend={[{ id: "kept", kind: "swatch", label: "Kept", ink: "successInk", figure: kept }, { id: "rest", kind: "swatch", label: "Broken or still open", ink: "borderColorStrong", figure: pledges.length - kept }]}
        help={{ meaning: "The filled part of the bar is the share of your promises you have kept. A promise you broke still counts against you with the voters it was made to.", steps: ["Read the words on the right for the exact count of kept, broken and open promises.", "The empty part is every promise not kept yet, broken or still open."], term: termDoor("pledge", "Pledge") }}
      >
        <Meter label="Kept" value={kept / pledges.length} figure={`${kept} kept, ${broken} broken, ${pledges.length - kept - broken} open`} tone="successInk" />
      </ReadingFrame>
      {pledges.map((pledge) => <Pledge key={pledge.id} campaign={campaign} pledge={pledge} />)}
    </RecordArea>
  );
}

function ArcItem({ arc, onOpen }: { readonly arc: ArcRow; readonly onOpen: () => void }) {
  return (
    <CardLink role="button" pad="md" label={`Open the storyline: ${arc.title}`} onPress={onOpen}>
      <Column gap="2xs">
        <Text variant="label">{arc.title}</Text>
        <Text variant="caption" tone="secondary">{`${arc.counterpart} · ${arc.weeks} ${arc.weeks === 1 ? "week" : "weeks"} · ${arc.chapters} ${arc.chapters === 1 ? "decision" : "decisions"}${arc.disposition && arc.closedDate ? ` · ${ARC_DISPOSITION_WORDS[arc.disposition]}, ${formatDate(arc.closedDate)}` : ` · since ${formatDate(arc.openedDate)}`}`}</Text>
      </Column>
    </CardLink>
  );
}

/** Stories the President has been through: those still running, then those that ended and how. */
export function Arcs({ campaign }: { readonly campaign: Campaign }) {
  const arcs = selectArcReading(campaign);
  const [selected, setSelected] = useState<ArcRow | undefined>(undefined);
  if (arcs.running.length + arcs.finished.length === 0) return <Empty title="No storylines yet" detail="One starts when a decision of yours sets off a story that lasts for weeks." />;
  return (
    <RecordArea id="storylines" icon="record" title="Storylines" lede={arcs.quietSince ? `Nothing has ended since ${formatDate(arcs.quietSince)}.` : undefined}>
      <Text variant="eyebrow" tone="secondary">Ongoing</Text>
      {arcs.running.length === 0 ? <Empty title="No storylines are ongoing" /> : arcs.running.map((arc) => <ArcItem key={arc.family} arc={arc} onOpen={() => setSelected(arc)} />)}
      <Text variant="eyebrow" tone="secondary">Ended</Text>
      {arcs.finished.length === 0 ? <Empty title="No storyline has ended yet" /> : arcs.finished.map((arc) => <ArcItem key={arc.family} arc={arc} onOpen={() => setSelected(arc)} />)}
      <ArcSheet campaign={campaign} arc={selected} onClose={() => setSelected(undefined)} />
    </RecordArea>
  );
}

const STANDING_METRICS: readonly CompareMetricId[] = ["approval", "stability", "standing"];

/** This presidency now against the oath, four weeks ago and every defined historical line, one reading at a time. */
export function SelfComparison({ campaign, metrics = STANDING_METRICS }: { readonly campaign: Campaign; readonly metrics?: readonly CompareMetricId[] }) {
  return (
    <CardGrid columns={{ phone: 1, tablet: 1, desktop: 3, wide: 3 }}>
      {metrics.map((id) => {
        const versus = selfVersus(campaign, id);
        return (
          <Column key={id} gap="sm" flexGrow={1}>
            <Reading name={versus.label} value={versus.now === undefined ? "No number yet" : formatReading(versus.format, versus.now)} size="heading" minWidth={0} />
            {versus.unavailable ? <Text variant="caption" tone="secondary">{versus.unavailable}</Text> : null}
            {versus.comparisons.map((row) => (
              <Row key={row.id} gap="sm" top>
                <Tag tone={row.standing === "better" ? "success" : row.standing === "worse" ? "danger" : "outline"}>{row.standing === "better" ? "Better" : row.standing === "worse" ? "Worse" : row.standing === "level" ? "Same" : "No difference"}</Tag>
                <Text variant="caption" flex={1}>{`${row.label}: ${row.sentence}`}</Text>
              </Row>
            ))}
          </Column>
        );
      })}
    </CardGrid>
  );
}

/** Approval across the kept history, the predecessor's quarter drawn as its own line and labeled as theirs, with the historical lines beside it. */
export function TermApproval({ campaign }: { readonly campaign: Campaign }) {
  const course = useMemo(() => termCourse(campaign.player.metricHistory.map((row) => row.approval), (i) => isInheritedRow(campaign, i), campaign.turn - 1), [campaign]);
  const benchmarks = useMemo(() => compareSeries(campaign, "approval", [{ kind: "self" }], "term").benchmarks, [campaign]);
  if (course.x.length < 2) return <Empty title="Your approval chart shows up once your first week is over" />;
  return (
    <BenchmarkChart
      title="Approval, week by week"
      door={<CompareDoor metric="approval" />}
      unit="% of adults who approve"
      period="Since before you took office"
      help={{ meaning: "Your approval rating each week, with the quarter before you took office drawn as a separate line. The other lines are what past presidents reached.", steps: ["Follow the line from left to right to see which way you are heading.", "Compare it with the benchmark lines to see how far ahead or behind you are."], term: termDoor("approval-rating", "approval rating") }}
      x={course.x}
      domain={[0, 1]}
      better="up"
      format={formatRatio}
      series={[
        ...(course.inheritedWeeks > 0 ? [{ id: "inherited", label: "Before you took office (estimated)", values: course.inherited, kind: "history" as const }] : []),
        { id: "own", label: "Your term", values: course.own, kind: "self" as const },
      ]}
      benchmarks={benchmarks}
    />
  );
}

/** How divided the country is against the 2020s level, what this administration added or healed, and what the drift costs. */
function Polarization({ campaign }: { readonly campaign: Campaign }) {
  const reading = polarizationReading(campaign);
  const pct = (share: number) => `${share > 0 ? "+" : share < 0 ? "−" : ""}${Math.abs(Math.round(share * 100))}%`;
  const drifts = reading.series.map((value) => value - reading.anchor);
  const eraMarks = [{ id: "era", label: "The 2020s level", at: reading.anchorAt, kind: "historical" as const }];
  return (
    <RecordArea id="polarization" icon="graph" title="Polarization" lede={`Polarization is how split the country is. In one term, you can move it anywhere from ${pct(reading.driftMin)} to ${pct(reading.driftMax)} compared with the 2020s.`}>
      <ReadingFrame title="How divided the country is" unit="Change from the 2020s level" period="Right now" legend={[{ id: "level", kind: "swatch", label: "How divided the country is", ink: "warningInk" }, ...meterKeyEntries(eraMarks, reading.position)]} help={{ meaning: "The filled part of the bar is how split the country is now. The gold line is the 2020s level. The figure is how far above or below that line you are.", term: termDoor("polarization", "Polarization") }}>
        <Meter label="Compared with the 2020s" value={reading.position} figure={pct(reading.againstEra)} tone="warningInk" marks={eraMarks} />
      </ReadingFrame>
      {drifts.length > 1 ? <BenchmarkChart title="How divided, week by week" unit="Change from the 2020s level" period="Your term" help={{ meaning: "Each point is how far the country's division sat above or below the 2020s level that week. Down means the country is coming together.", term: termDoor("polarization", "Polarization") }} x={drifts.map((_, i) => `W${i + 1}`)} series={[{ id: "drift", label: "Your term", values: drifts, kind: "self" }]} benchmarks={[{ id: "era", label: "The 2020s level", value: 0, kind: "historical" }]} domain={[reading.driftMin, reading.driftMax]} format={pct} better="down" height={180} /> : null}
      <Text variant="body">{`Your decisions added ${pct(reading.addedByUs)}. Events you didn't control added ${pct(reading.addedByTheWorld)}. Moments that brought people together changed it by ${pct(-reading.healed)}.${reading.heaviest ? ` Your biggest single decision: ${reading.heaviest.description}` : ""} At this level, people in your own party react ${Math.round(reading.ownIdentifierMovement.now * 100)}% as much as independents do to the same news.`}</Text>
    </RecordArea>
  );
}

/** The quarter before the oath, which the Record reconstructs and says is modeled. */
function Inherited({ campaign }: { readonly campaign: Campaign }) {
  const quarter = inheritedQuarter(campaign);
  if (!quarter) return null;
  return (
    <RecordArea id="inherited" icon="archive" title="Before you took office" lede={`The ${quarter.weeks} weeks before your oath belong to the President before you. The game estimates them from where things stood on the day you took office. They're estimates, not records.`}>
      <Tag tone="pending" icon="archive">The last President's record</Tag>
      <Row gap="md" wrap>
        {quarter.moves.map((move) => <Reading key={move.metric} name={METRIC_LABELS[move.metric]} value={`${formatRatio(move.from)} to ${formatRatio(move.to)}`} basis="estimate" source="The last President's quarter" />)}
      </Row>
    </RecordArea>
  );
}

/** Where the country stands: approval across the term against history and the predecessor, the President against their own past, division, and the inherited quarter. */
export function Standing({ campaign }: { readonly campaign: Campaign }) {
  return (
    <Column gap="lg">
      <RecordArea id="compared" icon="graph" title="Compared with past presidents" lede="Your approval against the months before you took office and against past presidents.">
        <TermApproval campaign={campaign} />
        <SelfComparison campaign={campaign} />
      </RecordArea>
      <Polarization campaign={campaign} />
      <Inherited campaign={campaign} />
    </Column>
  );
}

/** What the agencies assessed, for the last ninety days. */
export function Assessments({ campaign }: { readonly campaign: Campaign }) {
  const reports = impactReports(campaign, { withinDays: 90 });
  if (reports.length === 0) return <Empty title="No damage reports in the last 90 days" detail="A government agency writes one when something harmful happens and it first counts the damage." />;
  return (
    <RecordArea id="damage-reports" icon="caution" title="Damage reports, last 90 days">
      <ImpactReportList campaign={campaign} reports={reports} />
    </RecordArea>
  );
}
