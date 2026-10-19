import { useState } from "react";
import type { Campaign } from "@admin/engine";
import { ECONOMY_HISTORY_RATES, MAX_PEERS, PEER_GROUP, comparisonView, economyHistory, economyReading, peerComparisonView, peerSet, rateDriverReadings, type DriverRow, type EconomyHistoryRate, type EconomyMeasure, type PeerMeasure } from "@admin/player-core";
import { BenchmarkChart, Badge, CardGrid, CheckCard, Column, Icon, Pressable, ReadingFrame, Row, Segmented, Select, Sheet, Button, Text, type IconName, type ReadingHelp } from "@admin/ui";
import { Track } from "@admin/ui/nation";
import { Panel } from "@admin/ui/world";
import { CompareChart } from "../../compare/CompareChart";
import { CompareDoor } from "../../compare/CompareDoor";
import { VALENCE_TEXT, VALENCE_TRACK, valenceOf } from "../format";
import { markEntry, toneKey } from "../keys";
import { alignSeries } from "./align";

const GLYPH: Readonly<Record<EconomyHistoryRate, IconName>> = { unemployment: "economyUnemployment", inflation: "economyInflation", growth: "economyGrowth" };
const RATE_WORDS: Readonly<Record<PeerMeasure, string>> = { unemployment: "Unemployment", inflation: "Inflation", growth: "Growth", population: "Population growth" };
const pct = (value: number): string => `${value.toFixed(1)}%`;

const RATE_UNITS: Readonly<Record<PeerMeasure, string>> = { unemployment: "% of the workforce without a job", inflation: "% price rise over 12 months", growth: "% yearly growth in output", population: "% yearly growth in people" };

const chartHelp = (what: string): ReadingHelp => ({ meaning: what, steps: ["Find the thick line, which is your term in the game.", "Read each line's name and latest figure at the right edge.", "Press Table to see every figure."] });

export type EconomyBasis = "us-record" | "history" | "countries" | "world";
export const DEFAULT_PEERS = ["USA", "GBR", "DEU"] as const;

const windowYears = (label: string): string => (label.split(" · ")[0] ?? label).replace(" to ", "–");
const eraOf = (label: string): string | undefined => {
  const era = label.split(" · ")[1];
  return era ? era.charAt(0).toUpperCase() + era.slice(1) : undefined;
};

function Method({ title, lines }: { readonly title: string; readonly lines: readonly string[] }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button kind="quiet" size="compact" icon="info" onPress={() => setOpen(true)}>
        How this is compared
      </Button>
      <Sheet open={open} onClose={() => setOpen(false)} title={title} eyebrow="How it works">
        {lines.map((line) => (
          <Text key={line} variant="body">
            {line}
          </Text>
        ))}
      </Sheet>
    </>
  );
}

/** One rate on the same percentage and elapsed-month axes as a stretch of the published United States record. */
function AgainstUnitedStates({ campaign, rate, windowId, onWindow }: { readonly campaign: Campaign; readonly rate: EconomyHistoryRate; readonly windowId: string; readonly onWindow: (id: string) => void }) {
  const view = comparisonView(campaign, rate, windowId);
  const approximate = view.verdict.status === "transform" && view.verdict.approximate;
  const aligned = alignSeries(view.series.map((entry) => entry.points.map((point) => ({ at: point.month, label: `Month ${point.month}`, value: point.value }))));
  const played = view.series.find((entry) => entry.id === "played");
  return (
    <Column gap="sm">
      <Select label="Years from US history" options={view.windows.map((window) => ({ value: window.id, label: `${windowYears(window.label)}${window.available ? "" : " · no data"}`, disabled: !window.available }))} value={view.selected.id} onChange={onWindow} />
      <Row gap="xs" wrap>
        <Badge status="outline">{rate === "growth" ? "Compared by quarter" : "Compared by month"}</Badge>
        {eraOf(view.selected.label) ? <Text variant="caption" tone="secondary">{eraOf(view.selected.label)}</Text> : null}
        {approximate ? <Badge status="warning" icon="caution">Rough comparison</Badge> : null}
      </Row>
      {view.unavailable ? (
        <Text variant="body" tone="secondary" role="status">
          We can&rsquo;t draw these years. {view.unavailable}
        </Text>
      ) : (
        <BenchmarkChart title={`${RATE_WORDS[rate]}, ${view.selected.label}`} unit={RATE_UNITS[rate]} period={`${rate === "growth" ? "By quarter" : "By month"} from the start of each stretch`} help={chartHelp("Your term in the game is drawn against a stretch of the real United States record, both counted from their first month and on the same percent scale. They happened in different years, so the lines show how the two compare, not what caused what.")} x={aligned.x} format={pct} better={rate === "growth" ? "up" : "down"} series={view.series.map((entry, index) => ({ id: entry.id, label: entry.id === "played" ? "Your term (in the game)" : "United States (real record)", kind: entry.id === "played" ? "self" : "history", values: aligned.values[index] ?? [] }))} />
      )}
      {played && played.points.length === 0 && !view.unavailable ? (
        <Text variant="caption" tone="secondary" role="status">
          Your first full {rate === "growth" ? "quarter" : "month"} isn't over yet, so there's nothing to compare. Until then, use this week's number above.
        </Text>
      ) : null}
      <Text variant="caption" tone="tertiary">
        Both lines count months from the start and use the same percent scale. They happened in different years, so this can't tell you what caused what.
      </Text>
      <Method title={`How we compare ${RATE_WORDS[rate].toLowerCase()}`} lines={[view.basis, ...(view.verdict.status === "transform" ? view.verdict.steps : []), ...(approximate && rate === "inflation" ? ["Your inflation number is a yearly pace. The real record shows the change over the past 12 months. They're close but not the same, so treat this as a rough comparison."] : []), view.caution]} />
    </Column>
  );
}

/** Real countries beside each other in the World Bank's published record, by calendar year; not the campaign's simulated governments. */
export function ComparePeers({ rate, peers, windowId, onPeers, onWindow }: { readonly rate: PeerMeasure; readonly peers: readonly string[]; readonly windowId: string; readonly onPeers: (peers: readonly string[]) => void; readonly onWindow: (id: string) => void }) {
  const view = peerComparisonView(rate, peers, windowId);
  const full = peers.length >= MAX_PEERS;
  const aligned = alignSeries(view.series.map((entry) => entry.points.map((point) => ({ at: point.year, label: String(point.year), value: point.value }))));
  return (
    <Column gap="sm">
      <Text variant="label">
        Countries · {peers.length} of {MAX_PEERS} picked (pick at least 2)
      </Text>
      <Row gap="xs" wrap>
        {PEER_GROUP.map((peer) => {
          const on = peers.includes(peer.id);
          return (
            <Column key={peer.id} flexBasis={150} flexGrow={1}>
              <CheckCard label={peer.name} checked={on} disabled={!on && full} onChange={(checked) => onPeers(checked ? [...peers, peer.id] : peers.filter((id) => id !== peer.id))} />
            </Column>
          );
        })}
      </Row>
      <Segmented label="Years" options={view.windows.map((window) => ({ value: window.id, label: `${windowYears(window.label)}${window.available ? "" : " (no data)"}` }))} value={view.selected.id} onChange={onWindow} />
      {eraOf(view.selected.label) ? <Text variant="caption" tone="secondary">{eraOf(view.selected.label)}</Text> : null}
      {view.unavailable ? (
        <Text variant="body" tone="secondary" role="status">
          We can&rsquo;t draw this. {view.unavailable}
        </Text>
      ) : (
        <BenchmarkChart title={`${RATE_WORDS[rate]}, ${view.selected.label}`} unit={RATE_UNITS[rate]} period="By calendar year" help={chartHelp("Each line is one real country in the World Bank record, year by year. Lines marked estimate are partly estimated. These are real countries, not the ones in your game.")} x={aligned.x} format={pct} series={view.series.map((entry, index) => ({ id: entry.id, label: entry.evidence === "estimated" ? `${entry.name} (estimate)` : entry.name, kind: "peer", values: aligned.values[index] ?? [] }))} />
      )}
      <Text variant="caption" tone="tertiary">
        Source: World Bank, World Development Indicators, by calendar year, licensed Creative Commons Attribution 4.0. These are real countries, not the ones in your game.
      </Text>
      <Method title={`How we compare ${RATE_WORDS[rate].toLowerCase()} across countries`} lines={[view.basis, view.caution]} />
    </Column>
  );
}

/** This week's figure, where it started and its normal level, as marks on one track so three equal numbers do not read as three rows of nothing. */
function Standing({ reading, rate }: { readonly reading: NonNullable<ReturnType<typeof economyReading>>; readonly rate: EconomyHistoryRate }) {
  const now = reading.tile.series[reading.tile.series.length - 1] ?? 0;
  const start = reading.tile.series[0] ?? now;
  const rest = reading.rest ? reading.rest.percent / 100 : undefined;
  const values = [now, start, ...(rest === undefined ? [] : [rest])];
  const low = Math.min(0, ...values);
  const high = Math.max(Number.EPSILON, ...values) * 1.25;
  const at = (value: number): number => (value - low) / Math.max(high - low, Number.EPSILON);
  const tone = valenceOf(reading.tile.stance);
  const summary = `${reading.tile.figure} this week, ${reading.startFigure} when you took office${reading.rest ? `, ${reading.rest.figure} normal level` : ""}`;
  return (
    <ReadingFrame
      door={<CompareDoor metric={rate} />}
      title={`${RATE_WORDS[rate]} now, at the start and at its normal level`}
      unit={RATE_UNITS[rate]}
      legend={[...toneKey({ [tone === "neutral" ? "reading" : tone]: `This week: ${reading.tile.figure}` }), { id: "start", kind: "tick", label: `When you took office: ${reading.startFigure}`, ink: "colorSecondary", weight: 2 }, ...(reading.rest ? [{ id: "rest", kind: "tick" as const, label: `Normal level: ${reading.rest.figure}`, ink: "color" as const, weight: 3 }] : [])]}
      help={{ meaning: `The bar is this week's figure. One line is where it stood when you took office, and the other is its normal level, where it tends to settle. The word on each card compares this week with the start. Fair means little has changed, Rising or Falling shows the way it is heading, and Biting, Hurting, Slowing or Shrinking mean it is hurting people.` }}
    >
      <Column gap="xs">
        <Text variant="body">{summary}.</Text>
        <Track value={at(now)} tone={VALENCE_TRACK[tone]} marks={[{ at: at(start), label: "When you took office" }, ...(rest === undefined ? [] : [{ at: at(rest), label: "Normal level", strong: true }])]} label={summary} />
        {reading.rest ? <Text variant="caption" tone="secondary">{`Normal level from ${reading.rest.source}, ${reading.rest.year}. It isn't a goal you must hit.`}</Text> : null}
      </Column>
    </ReadingFrame>
  );
}

/** The rate's own course, published context and since the oath; the unpublished bridge before the oath is never drawn as data. */
function Observed({ campaign, rate, historyWindow, onWindow }: { readonly campaign: Campaign; readonly rate: EconomyHistoryRate; readonly historyWindow: "term" | "published"; readonly onWindow: (next: "term" | "published") => void }) {
  const reading = economyReading(campaign, rate);
  const history = economyHistory(campaign, rate);
  if (!reading) return null;
  const points = historyWindow === "term" ? history.points.filter((point) => point.kind === "played") : history.points;
  return (
    <Column gap="sm">
      <Segmented label="Time span" value={historyWindow} onChange={onWindow} options={[{ value: "term", label: "Your term" }, { value: "published", label: "With past years" }]} />
      {points.length > 0 ? (
        <BenchmarkChart
          door={<CompareDoor metric={rate} />}
          title={`${history.label}, ${historyWindow === "term" ? "your term" : "past years and your term"}`}
          unit={RATE_UNITS[rate]}
          period={historyWindow === "term" ? "Month by month, this term" : "Past years, then month by month this term"}
          help={chartHelp("The thick line is your term in the game. The thinner line is the official record from before you took office. The gold line is the normal level this rate tends to settle at, not a goal you must hit.")}
          x={points.map((point) => (point.kind === "projected" ? "No data before you took office" : point.label))}
          format={pct}
          better={rate === "growth" ? "up" : "down"}
          series={[
            ...(historyWindow === "published" ? [{ id: "recorded", label: "Official record", kind: "history" as const, values: points.map((point) => (point.kind === "recorded" ? point.value : null)) }] : []),
            { id: "played", label: "Your term", kind: "self" as const, values: points.map((point) => (point.kind === "played" ? point.value : null)) },
          ]}
          {...(reading.rest ? { benchmarks: [{ id: "rest", label: `Normal level ${reading.rest.figure}`, value: reading.rest.percent, kind: "historical" as const }] } : {})}
        />
      ) : (
        <Text variant="body" tone="secondary">
          Your first week isn't over yet, so there's nothing to show.
        </Text>
      )}
      {reading.approval.length > 0 ? <Text variant="caption" tone="secondary">Effect on your approval: {reading.approval.map((term) => `${term.label.toLowerCase()} ${term.points >= 0 ? "+" : "−"}${Math.abs(term.points).toFixed(1)} pts`).join(", ")}.</Text> : null}
      <Method title={`${history.label}: where the numbers come from`} lines={[history.source, "The real record, the numbers the game starts with, and your term in the game come from different places. The chart skips the gap before you took office, and it doesn't make up any missing months.", "The causes on this screen add up to where the game is pushing this rate. The rate moves part of the way there over time. That point isn't a promise of where the rate will be on any date.", ...(reading.rest ? [`Normal level: ${reading.rest.figure} (${reading.rest.source}, ${reading.rest.year}). It's where this rate tends to settle, not a forecast.`] : [])]} />
    </Column>
  );
}

const DRIVER_HELP: ReadingHelp = { meaning: "Each bar is one cause. A bar to the right pushes the figure up and a bar to the left pushes it down, in percentage points. These are the game's estimates, not a record of past changes." };

function driverKey(goodWhen: "up" | "down" | undefined) {
  return [markEntry("none", "No effect"), ...(goodWhen ? toneKey({ good: "Pushes it the better way", bad: "Pushes it the worse way" }) : toneKey({ neutral: "Pushes it up or down" }))];
}

const isZero = (row: DriverRow): boolean => !/[1-9]/.test(row.figure);

/** The parts of one figure, signed in the row's own unit, each on a zero-centered bar shared across the rates. */
export function DriverTable({ title, summary, rows, goodWhen, span, bare = false }: { readonly title: string; readonly summary: string; readonly rows: readonly DriverRow[]; readonly goodWhen?: "up" | "down"; readonly span?: number; readonly bare?: boolean }) {
  const scale = span ?? Math.max(Number.EPSILON, ...rows.map((row) => Math.abs(row.amount)));
  const table = (
    <Column gap="xs" flexGrow={1} flexBasis={280}>
      <Text variant="label">{title}</Text>
      <Text variant="caption" tone="secondary">
        {summary}
      </Text>
      {rows.map((row) => {
        const valence = goodWhen && !isZero(row) ? ((row.amount > 0) === (goodWhen === "up") ? "good" : "bad") : "neutral";
        return (
          <Row key={row.source} gap="sm">
            <Text variant="caption" width={140} numberOfLines={2}>
              {row.label}
            </Text>
            <Track value={0.5 + Math.max(-1, Math.min(1, row.amount / scale)) / 2} from={0.5} tone={valence === "neutral" ? "neutral" : valence} marks={[{ at: 0.5, label: "No effect" }]} slim />
            <Text variant="caption" weight="strong" tone={VALENCE_TEXT[valence]} minWidth={72} textAlign="right">
              {valence === "neutral" ? "" : row.amount > 0 ? "▲ " : "▼ "}
              {row.figure}
            </Text>
          </Row>
        );
      })}
    </Column>
  );
  return bare ? table : <ReadingFrame title={title} unit="Percentage points" legend={driverKey(goodWhen)} help={DRIVER_HELP}>{table}</ReadingFrame>;
}

/** What moved a rate, as the engine attributes it. Parts sum to where the rate is heading, not where it stands. */
export function Drivers({ campaign, rate }: { readonly campaign: Campaign; readonly rate?: EconomyHistoryRate }) {
  const all = rateDriverReadings(campaign);
  const readings = rate ? all.filter((reading) => reading.rate === rate) : all;
  if (readings.length === 0) return null;
  const span = Math.max(0.1, ...all.flatMap((reading) => reading.rows.map((row) => Math.abs(row.amount))));
  return (
    <Column gap="sm">
      <Text variant="caption" tone="secondary">
        Each cause pushes the rate up or down, and together they set where it's heading. The rate gets there over time.
      </Text>
      <ReadingFrame title="What's moving it" unit="Percentage points" legend={driverKey(rate === "growth" || !rate ? "up" : "down")} help={DRIVER_HELP}>
        <Row gap="lg" wrap top>
          {readings.map((reading) => (
            <DriverTable bare key={reading.rate} title={RATE_WORDS[reading.rate]} summary={`Now ${reading.now}, heading to ${reading.heading}`} rows={reading.rows} goodWhen={reading.rate === "growth" ? "up" : "down"} span={span} />
          ))}
        </Row>
      </ReadingFrame>
    </Column>
  );
}

export type RatesProps = {
  readonly campaign: Campaign;
  readonly measure?: EconomyMeasure;
  readonly onMeasure: (rate: EconomyHistoryRate) => void;
  readonly historyWindow?: "term" | "published";
  readonly onWindow: (next: "term" | "published") => void;
  readonly basis: EconomyBasis;
  readonly onBasis: (basis: EconomyBasis) => void;
  readonly comparisonWindow: string;
  readonly onComparisonWindow: (id: string) => void;
  readonly peers: readonly string[];
  readonly onPeers: (peers: readonly string[]) => void;
  readonly peerWindow: string;
  readonly onPeerWindow: (id: string) => void;
};

/** The three leading measures, the selected one's context, its comparisons on the chosen basis, and what is moving it. */
export function Rates(props: RatesProps) {
  const { campaign, measure, onMeasure, basis, onBasis } = props;
  const selected = ECONOMY_HISTORY_RATES.find((rate) => rate === measure) ?? "unemployment";
  const reading = economyReading(campaign, selected);
  const history = economyHistory(campaign, selected);
  const historyWindow = props.historyWindow ?? (history.points.some((point) => point.kind === "played") ? "term" : "published");
  return (
    <Panel title="Key numbers" icon="economyGrowth">
      <CardGrid columns={{ phone: 1, tablet: 3, desktop: 3, wide: 3 }} role="radiogroup" aria-label="Key numbers">
        {ECONOMY_HISTORY_RATES.map((rate) => {
          const entry = economyReading(campaign, rate);
          if (!entry) return null;
          const on = rate === selected;
          return (
            <Pressable key={rate} role="radio" aria-checked={on} onPress={() => onMeasure(rate)} flexGrow={1} padding="md" gap="2xs" borderRadius="card" borderWidth={on ? 2 : 1} borderColor={on ? "accent" : "borderColor"} backgroundColor={{ default: on ? "infoFill" : "surface", hover: "surfaceHover" }}>
              <Row gap="xs">
                <Icon name={GLYPH[rate]} size={18} tone="gold" />
                <Text variant="label">{entry.tile.caption}</Text>
              </Row>
              <Text variant="heading" tone={VALENCE_TEXT[valenceOf(entry.tile.stance)]} tabular>
                {entry.tile.figure}
              </Text>
              <Text variant="caption" tone="secondary">
                {entry.tile.change ? `${entry.tile.change.up ? "▲" : "▼"} ${entry.tile.change.text}` : entry.tile.stanceWord} · {entry.startFigure} when you took office
              </Text>
            </Pressable>
          );
        })}
      </CardGrid>
      {reading ? <Standing reading={reading} rate={selected} /> : null}
      <Segmented<EconomyBasis> label="Compare with" value={basis} onChange={onBasis} options={[{ value: "us-record", label: "US history" }, { value: "history", label: "Over time" }, { value: "countries", label: "Real countries" }, { value: "world", label: "Countries in your game" }]} />
      {basis === "history" ? (
        <Observed campaign={campaign} rate={selected} historyWindow={historyWindow} onWindow={props.onWindow} />
      ) : basis === "countries" ? (
        <Column gap="md">
          <Text variant="caption" tone="secondary">These are real countries, year by year, from World Bank records. They aren't the countries in your game.</Text>
          <ComparePeers rate={selected} peers={props.peers} windowId={props.peerWindow} onPeers={props.onPeers} onWindow={props.onPeerWindow} />
          <Text variant="title">Population growth in real countries</Text>
          <ComparePeers rate="population" peers={props.peers} windowId={props.peerWindow} onPeers={props.onPeers} onWindow={props.onPeerWindow} />
        </Column>
      ) : basis === "world" ? (
        <Column gap="sm">
          <Text variant="caption" tone="secondary">These are other G7 countries in your game. The G7 is a group of seven large, wealthy democracies. The game keeps week-by-week history only for your country, so the others show just this week's number.</Text>
          <CompareChart campaign={campaign} metric={selected} subjects={[{ kind: "self" }, ...peerSet(campaign, "g7").nations.slice(0, 4).map((id) => ({ kind: "nation" as const, id }))]} window="term" />
        </Column>
      ) : (
        <AgainstUnitedStates campaign={campaign} rate={selected} windowId={props.comparisonWindow} onWindow={props.onComparisonWindow} />
      )}
      <Drivers campaign={campaign} rate={selected} />
    </Panel>
  );
}
