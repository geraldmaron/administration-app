import type { Campaign } from "@admin/engine";
import { formatDate, pendingAbout, place, weekLabel, type NationFile, type StandingTrend, type TrendChange } from "@admin/player-core";
import { Pane, BenchmarkChart, Button, CardLink, Column, Icon, ReadingFrame, Row, Sparkline, Text, View, type IconName, type KeyEntry } from "@admin/ui";
import { StateChip, StepReading, Unread } from "@admin/ui/world";
import { selectDateOfTurn } from "@admin/engine";
import { BandFrame, CardTo, RELATIONSHIP_BANDS, RELATIONSHIP_LADDER, go, stanceValence } from "../parts";
import { termDoor } from "../../handbook/term-door";
import { PendingRows } from "../../shell/Pending";
import { COUNTRY_VIEW_LABELS, regionName, type CountryView } from "../params";
import { TRUST_BAND_AXIS_TICKS, bandWordAt, trustOnBandAxis } from "../trust-axis";
import { countryPriorities, type CountryPriority } from "../priorities";

function Leader({ file }: { readonly file: NationFile }) {
  const { leader } = file;
  if (!leader.person) {
    return (
      <Text variant="body" tone="secondary">
        Our intelligence agencies can't say who's in charge here this week.
      </Text>
    );
  }
  const initials = leader.person.name
    .split(/\s+/)
    .map((word) => word[0] ?? "")
    .join("")
    .slice(0, 2);
  const person = leader.person;
  return (
    <CardTo href={place.person(person.id as string)} label={`Open ${person.name}'s file`} pad="md" flexDirection="row" alignItems="flex-start" gap="md">
      <View width={56} height={56} borderRadius="pill" backgroundColor="surfaceRaised" borderWidth={2} borderColor="goldRule" alignItems="center" justifyContent="center" aria-hidden>
        <Text variant="title" tone="secondary">
          {initials}
        </Text>
      </View>
      <Column flexGrow={1} flexShrink={1} flexBasis={0} minWidth={0} gap="2xs">
        <Text variant="eyebrow" tone="secondary">
          {leader.title ?? "Leader"}
        </Text>
        <Text variant="title">{person.name}</Text>
        {file.inOfficeSince ? (
          <Row gap="xs">
            <Icon name="dossier" size={14} tone="colorSecondary" />
            <Text variant="caption" tone="secondary">
              {file.inOfficeSince}
            </Text>
          </Row>
        ) : null}
        {file.nextSelection ? (
          <Row gap="xs">
            <Icon name="schedule" size={14} tone="colorSecondary" />
            <Text variant="caption" tone="secondary">
              {file.nextSelection}
            </Text>
          </Row>
        ) : null}
      </Column>
      <Icon name="chevron" size={18} tone="colorTertiary" />
    </CardTo>
  );
}

type TrendLine = { readonly id: string; readonly label: string; readonly icon: IconName; readonly change: TrendChange; readonly risingIsGood: boolean };

function trendLines(trend: StandingTrend): readonly TrendLine[] {
  const lines: readonly (TrendLine | undefined)[] = [
    trend.theirs ? { id: "theirs", label: "They trust us", icon: "layerTrust", change: trend.theirs, risingIsGood: true } : undefined,
    trend.ours ? { id: "ours", label: "We trust them", icon: "subjectPerson", change: trend.ours, risingIsGood: true } : undefined,
    trend.tension ? { id: "tension", label: "Tension", icon: "conflict", change: trend.tension, risingIsGood: false } : undefined,
  ];
  return lines.filter((line): line is TrendLine => line !== undefined);
}

const TREND_KEY: readonly KeyEntry[] = [
  { id: "good", kind: "line", label: "Moved the way you'd want", ink: "goodInk" },
  { id: "bad", kind: "line", label: "Moved the wrong way", ink: "badInk" },
  { id: "flat", kind: "line", label: "Steady", ink: "accent" },
];

/** The quarter's move on each side of the relationship, drawn as a slope, said as a word. */
function TrendRows({ lines }: { readonly lines: readonly TrendLine[] }) {
  return (
    <ReadingFrame title="How each side moved over 13 weeks" unit="Last 13 weeks, trust and tension on their own scales" legend={TREND_KEY} help={{ meaning: "Each small line is one reading's last 13 weeks, and its arrow shows which way it ended. Rising trust is good and rising tension is bad, so the ink says whether the move helped you.", term: termDoor("their-trust", "Their trust in you") }}>
      <Column gap="xs">
        {lines.map((line) => {
          const move = line.change.change13;
          const moved = move !== undefined && move !== 0;
          const valence: "good" | "bad" | "neutral" = !moved ? "neutral" : (move > 0) === line.risingIsGood ? "good" : "bad";
          return (
            <Row key={line.id} gap="sm" wrap>
              <Row gap="xs" width={120}>
                <Icon name={line.icon} size={16} tone="colorSecondary" />
                <Text variant="label" tone="secondary">
                  {line.label}
                </Text>
              </Row>
              <Sparkline values={line.change.points.map((point) => point.value)} valence={valence} width={96} height={24} />
              <Text variant="caption" weight="strong" tone={valence === "good" ? "success" : valence === "bad" ? "danger" : "secondary"}>
                {move === undefined ? "Less than 13 weeks of history" : !moved ? "▬ Steady over 13 weeks" : `${move > 0 ? "▲ Up" : "▼ Down"} over 13 weeks`}
              </Text>
            </Row>
          );
        })}
      </Column>
    </ReadingFrame>
  );
}

/**
 * The relationship's history: each side's trust week by week, from the one
 * record the campaign keeps of it. A record opened mid-game says where it
 * starts instead of implying a longer one.
 */
function RelationshipHistory({ campaign, trend }: { readonly campaign: Campaign; readonly trend: StandingTrend }) {
  const lines = trendLines(trend);
  if (lines.length === 0) return null;
  const trust = lines.filter((line) => line.id !== "tension");
  const turns = [...new Set(trust.flatMap((line) => line.change.points.map((point) => point.turn)))].sort((a, b) => a - b);
  const since = trend.start.since;
  const startNote = trend.start.fromOath ? undefined : since === undefined ? trend.start.note : `History starts ${formatDate(selectDateOfTurn(campaign, since))}`;
  return (
    <Column gap="sm">
      {turns.length > 1 ? (
        <BenchmarkChart
          title="How much each side trusts the other, week by week"
          x={turns.map(weekLabel)}
          series={trust.map((line) => ({ id: line.id, label: line.label, kind: line.id === "ours" ? "self" : "peer", ...(line.id === "ours" ? { ink: "gold" as const } : {}), values: turns.map((turn) => {
            const point = line.change.points.find((entry) => entry.turn === turn);
            return point ? trustOnBandAxis(point.value) : null;
          }) }))}
          format={bandWordAt}
          ticks={TRUST_BAND_AXIS_TICKS}
          domain={[0, 1]}
          height={180}
          better="up"
          unit="Trust, from hostile at the bottom to trusting at the top"
          period="Week by week"
          help={{ meaning: "The thick line is how much the United States trusts them. The thinner line is how much they trust the United States. Higher is better.", term: termDoor("their-trust", "Their trust in you") }}
        />
      ) : null}
      <TrendRows lines={lines} />
      {startNote ? (
        <Text variant="caption" tone="tertiary">
          {startNote}
        </Text>
      ) : null}
    </Column>
  );
}

/** What the President is waiting on with this country, each with the time it has left. */
function PendingWith({ campaign, file }: { readonly campaign: Campaign; readonly file: NationFile }) {
  const items = pendingAbout(campaign, `nation:${file.nation}`);
  if (items.length === 0) return null;
  return (
    <View id="pending" gap="xs">
      <Text variant="label" tone="secondary">
        Waiting on an answer
      </Text>
      <PendingRows items={items} label="Waiting on an answer" />
    </View>
  );
}

/** Where the two governments stand now: their view of you, your read of them and the tension between you. */
function RelationshipNow({ campaign, file }: { readonly campaign: Campaign; readonly file: NationFile }) {
  const { standing } = file;
  return (
    <Pane title="Where things stand" icon="layerTrust">
      <BandFrame title="How you and they see each other" meaning={RELATIONSHIP_BANDS} unit={RELATIONSHIP_LADDER} term={{ id: "their-trust", label: "Their trust in you" }}>
        {standing.theirs ? <StepReading icon="layerTrust" label={standing.theirs.caption} lit={standing.theirs.trust.level} word={standing.theirs.trust.word} valence={stanceValence(standing.theirs.trust.stance)} /> : <Unread>We don't know yet how they see you. Our intelligence agencies haven't been able to tell.</Unread>}
        {standing.ours ? <StepReading icon="subjectPerson" label={standing.ours.caption} lit={standing.ours.trust.level} word={standing.ours.trust.word} valence={stanceValence(standing.ours.trust.stance)} /> : null}
        {standing.tension ? <StepReading icon="conflict" label="Tension between you" lit={standing.tension.level} word={standing.tension.word} valence={stanceValence(standing.tension.stance)} /> : null}
      </BandFrame>
      <PendingWith campaign={campaign} file={file} />
      <RelationshipHistory campaign={campaign} trend={standing.trend} />
    </Pane>
  );
}

const PRIORITY_GLYPH: Readonly<Record<CountryPriority["tone"], IconName>> = { risk: "adverse", caution: "caution", neutral: "info" };
const PRIORITY_EDGE = { risk: "danger", caution: "warning", neutral: undefined } as const;

const priorityAction = (item: CountryPriority): string => (item.href ? "Open the war" : `Review ${COUNTRY_VIEW_LABELS[item.view].toLowerCase()}`);

function Priorities({ file, onView }: { readonly file: NationFile; readonly onView: (view: CountryView) => void }) {
  const items = countryPriorities(file);
  return (
    <Pane title="What needs attention" icon="caution" count={items.length}>
      {items.length === 0 ? (
        <Text variant="body" tone="secondary">
          Nothing needs your attention here. There's no war, trade penalty, promise, or tension with this country.
        </Text>
      ) : (
        <Column gap="sm" role="group" aria-label="What needs attention">
          {items.map((item) => (
            <CardLink key={item.id} onPress={() => (item.href ? go(item.href) : onView(item.view))} label={`${item.text} ${priorityAction(item)}`} pad="sm" {...(PRIORITY_EDGE[item.tone] ? { accentEdge: PRIORITY_EDGE[item.tone] } : {})}>
              <Row gap="sm" wrap>
                <Icon name={PRIORITY_GLYPH[item.tone]} size={16} tone={item.tone === "risk" ? "danger" : item.tone === "caution" ? "warningInk" : "colorSecondary"} />
                <Text variant="label" weight="regular" flexGrow={1} flexShrink={1} flexBasis={180}>
                  {item.text}
                </Text>
                <Row gap="2xs">
                  <Text variant="caption" weight="strong" tone="accent">
                    {priorityAction(item)}
                  </Text>
                  <Icon name="chevron" size={16} tone="accent" />
                </Row>
              </Row>
            </CardLink>
          ))}
        </Column>
      )}
    </Pane>
  );
}

/** The government's overall stance toward you as one chip, with a war as its own, so the file opens on a verdict. */
export function StanceChip({ file }: { readonly file: NationFile }) {
  if (file.atWarWith.length > 0) return <StateChip valence="bad" icon="conflict">At war</StateChip>;
  const theirs = file.standing.theirs;
  if (!theirs) return <StateChip valence="neutral" icon="hidden">Unknown</StateChip>;
  const valence = stanceValence(theirs.trust.stance);
  return (
    <StateChip valence={valence} icon={valence === "good" ? "favorable" : valence === "bad" ? "adverse" : valence === "watch" ? "caution" : "neutral"}>
      {theirs.trust.word}
    </StateChip>
  );
}

/** Identity that stays visible on every view: the flag, where it sits, its verdict, and its alerts. */
export function CountryIdentity({ file, onOverview }: { readonly file: NationFile; readonly onOverview?: () => void }) {
  const alerts = countryPriorities(file).filter((item) => item.tone !== "neutral");
  return (
    <Row gap="md" wrap>
      <StanceChip file={file} />
      <Text variant="label" tone="secondary">
        {file.leader.government} · {regionName(file.leader.region)} · Capital: {file.leader.capital}
      </Text>
      {onOverview && alerts.length > 0 ? (
        <Button kind="quiet" size="compact" icon={alerts.some((item) => item.tone === "risk") ? "adverse" : "caution"} iconAfter="chevron" onPress={onOverview}>
          {`${alerts.length} ${alerts.length === 1 ? "alert" : "alerts"} for this country`}
        </Button>
      ) : null}
    </Row>
  );
}

/** The overview's head: the leader, the relationship now and over time, and what needs attention. */
export function CountryHead({ campaign, file, onView }: { readonly campaign: Campaign; readonly file: NationFile; readonly onView: (view: CountryView) => void }) {
  return (
    <Column gap="lg">
      <RelationshipNow campaign={campaign} file={file} />
      <Pane id="country-leader" title="Head of government" icon="subjectPerson">
        <Leader file={file} />
      </Pane>
      <Priorities file={file} onView={onView} />
    </Column>
  );
}
