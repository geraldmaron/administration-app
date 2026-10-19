import type { ReactNode } from "react";
import { bestBuilderFor, formatMoney, formatSignedPoints, type ActFamily, type ActMoney, type AssessmentCell, type AssessmentItem, type EffectMark, type OptionView, type Prerequisite, type Requirement } from "@admin/player-core";
import { Button, CardGrid, Column, Icon, Meter, ReadingFrame, Row, Text, View, useMedia, type IconName, type KeyEntry } from "@admin/ui";
import { FlagOf } from "../parts";
import { CertainOdds, ChangeBar, Metric, MoneyBar, OddsSteps, TimeReading, type ResultReadings, type ResultSortKey } from "@admin/ui/review";
import { Pips, Unread, valenceText, type ReadingValence } from "@admin/ui/world";

// One mapping from a player-core option to what its row draws, so a row in
// the list, a row in the comparison and the plan read the same numbers the
// same way. Every reading is a change from today: money from $0, each move
// from a line that stands for today, the odds as the chance the change
// happens. Nothing here is authored; the figures are the engine's.

export const FAMILY_ICON: Readonly<Record<ActFamily, IconName>> = {
  meet: "summit",
  sign: "sign",
  assist: "instrumentAssistance",
  tariff: "subjectTrade",
  diplomatic: "instrumentDiplomatic",
  justice: "departmentJustice",
  economic: "instrumentEconomic",
  covert: "instrumentCovert",
  military: "instrumentMilitary",
  congress: "subjectCapitol",
};

// The engine's likelihood words and the meeting forecast's, on five steps.
const STEP: Readonly<Record<string, number>> = { remote: 1, unlikely: 2, "roughly even": 3, "could go either way": 3, likely: 4, "almost certain": 5 };
const STANCE_VALENCE: Readonly<Record<string, ReadingValence>> = { favorable: "good", caution: "watch", adverse: "bad" };

const capital = (word: string) => word.charAt(0).toUpperCase() + word.slice(1);

// The odds as a figure, only as fine as the forecast behind them: the engine's
// own chance where it computes one, else the band of chances a likelihood word
// stands for, and whether a government would accept is only ever forecast as
// which side of even it falls.
const LIKELIHOOD_RANGE: Readonly<Record<string, string>> = { remote: "Under 15%", unlikely: "15–40%", "roughly even": "40–60%", likely: "60–85%", "almost certain": "Over 85%" };
const WILLINGNESS_RANGE: Readonly<Record<string, string>> = { likely: "Over 50%", "could go either way": "About 50%", unlikely: "Under 50%" };

function oddsFigure(odds: { readonly label: string; readonly word: string; readonly chance?: number }): string | undefined {
  if (odds.chance !== undefined) return `${Math.round(odds.chance * 100)}%`;
  const word = odds.word.toLowerCase();
  return odds.label === "Would they accept" ? WILLINGNESS_RANGE[word] : LIKELIHOOD_RANGE[word];
}

/** Each reading an act can move, by the glyph that names it. */
const MARK_ICON: Readonly<Record<string, IconName>> = {
  theirTrust: "layerTrust",
  ourTrust: "layerTrust",
  tension: "conflict",
  alignment: "layerBlocs",
  threat: "shield",
  reliance: "subjectTrade",
  approval: "ballot",
  stability: "building",
  militaryReadiness: "instrumentMilitary",
  standing: "world",
};

/** A change as signed points on its reading's hundred-point scale, the same unit every reading in the list uses. */
const markFigure = (mark: EffectMark): string => `${formatSignedPoints(mark.delta)} pts`;

/** A figure short enough for a reading slot: "$29M", "$1.2B". */
const money = (usdMillions: number) => formatMoney(usdMillions);

/** The money in words: what it spends now, what it bills each week, or what it brings in a year. */
export function moneyText(amount: ActMoney | undefined): string {
  if (!amount) return "No money";
  if (amount.perYearIn) return `+${money(amount.perYearIn)} a year`;
  if (amount.now > 0 && amount.weekly > 0) return `${money(amount.now)} + ${money(amount.weekly)} a week`;
  if (amount.weekly > 0) return `${money(amount.weekly)} a week`;
  return amount.now > 0 ? money(amount.now) : "No money";
}

/** The same money said in full, for the plan and the review. */
export function moneySentence(amount: ActMoney | undefined): string {
  if (!amount) return "No money";
  if (amount.perYearIn) return `Brings in about ${money(amount.perYearIn)} a year`;
  if (amount.now > 0 && amount.weekly > 0) return `${money(amount.now)} now, then ${money(amount.weekly)} a week while it lasts`;
  return amount.now > 0 ? `${money(amount.now)} now` : "No money";
}

/** The largest moves first, so a short list keeps what matters. */
export const byReach = (marks: readonly EffectMark[]): readonly EffectMark[] => [...marks].sort((a, b) => b.share - a.share);

export function Change({ mark }: { readonly mark: EffectMark }) {
  return <ChangeBar label={mark.label} word={mark.word} figure={markFigure(mark)} {...(MARK_ICON[mark.key] ? { icon: MARK_ICON[mark.key] } : {})} share={mark.share} rises={mark.delta > 0} valence={mark.good ? "good" : "bad"} />;
}

/** Every move an option makes, largest first, on the scale every option shares. */
export function Changes({ view, limit }: { readonly view: OptionView; readonly limit?: number }) {
  const marks = byReach(view.effects?.marks ?? []);
  if (marks.length === 0) {
    return (
      <Text variant="caption" tone="tertiary">
        {view.option.ref.kind === "tariff" ? "Moves prices and trade, shown in the plan." : view.option.ref.kind === "authorization" ? "Changes nothing until Congress votes." : "No change we can read ahead of time."}
      </Text>
    );
  }
  const shown = limit ? marks.slice(0, limit) : marks;
  return (
    <Column gap="xs" role="list" aria-label={view.effects!.when}>
      <Text variant="eyebrow" tone="tertiary">
        {view.effects!.when}
      </Text>
      {shown.map((mark) => (
        <Column key={mark.key} role="listitem">
          <Change mark={mark} />
        </Column>
      ))}
    </Column>
  );
}

/** What a row draws in its slots. `scale` is the money every row in the same list is drawn against. */
export function readingsOf(view: OptionView, scale: number): ResultReadings {
  const { preview } = view;
  const odds = preview.odds;
  return {
    odds: odds ? <OddsSteps step={STEP[odds.word.toLowerCase()] ?? 3} word={capital(odds.word)} {...(oddsFigure(odds) ? { figure: oddsFigure(odds)! } : {})} valence={STANCE_VALENCE[odds.stance] ?? "info"} label={odds.label} /> : <CertainOdds />,
    money: <MoneyBar now={preview.money?.now ?? 0} weekly={preview.money?.weekly ?? 0} scale={scale} text={moneyText(preview.money)} {...(preview.money?.perYearIn ? { incoming: true } : {})} />,
    time: <TimeReading text={preview.short.timing} />,
    move: moveOf(view),
  };
}

function moveOf(view: OptionView) {
  const { preview } = view;
  const top = byReach(view.effects?.marks ?? [])[0];
  return preview.warning ? (
      <Metric label="Warning" icon="caution" figure={preview.warning} valence="bad" spoken={`Warning: ${preview.warning}`} />
    ) : top ? (
      <Change mark={top} />
    ) : (
      <Metric label="Biggest change" figure="After first report" spoken={`Biggest change: ${preview.note ?? "known after the first report"}`} />
    );
}

/** The money scale for a set of rows: the largest of now plus four weeks of the bill. */
export { moneyScale } from "@admin/ui/review";

// Trust runs -1..1 and tension 0..1; a meter's track is 0..1.
const onTrack = (requirement: Requirement, value: number) => (requirement.reading === "tension" ? value : (value + 1) / 2);

const NEED_KEY: readonly KeyEntry[] = [
  { id: "need", kind: "tick", label: "What this option needs", ink: "successInk", weight: 3 },
  { id: "step", kind: "tick", label: "Where it would stand after the first step", ink: "gold" },
];

function Need({ requirement, step, by }: { readonly requirement: Requirement; readonly step?: number; readonly by?: string }) {
  if (requirement.have === undefined) return <Unread>{`${requirement.label}: we don't have a read yet. It needs to reach ${requirement.needWord}.`}</Unread>;
  const marks = [
    { id: "need", label: `Needs ${requirement.needWord}`, at: onTrack(requirement, requirement.need), kind: "target" as const },
    ...(step && by && !requirement.met ? [{ id: "step", label: `After ${by}`, at: onTrack(requirement, requirement.have + step), kind: "historical" as const }] : []),
  ];
  return <Meter label={requirement.label} value={onTrack(requirement, requirement.have)} figure={requirement.met ? `${requirement.haveWord}, enough` : requirement.haveWord === requirement.needWord ? `${requirement.haveWord}, just short` : `${requirement.haveWord}, needs ${requirement.needWord}`} tone={requirement.met ? "successInk" : "warningInk"} marks={marks} />;
}

/** A locked option's way in: each reading against its floor, and the one act that gets there first. */
export function LockedPath({ prerequisite, reason, onFirst }: { readonly prerequisite?: Prerequisite; readonly reason?: string; readonly onFirst?: (builder: string) => void }) {
  if (!prerequisite) {
    return (
      <Text variant="caption" tone="secondary">
        {reason ?? "You can't do this one this week."}
      </Text>
    );
  }
  const first = prerequisite.builders[0];
  return (
    <Column gap="sm">
      {prerequisite.buildable ? (
        <ReadingFrame title="Where each reading stands against what it needs" unit="Each reading on its own scale, from worst to best" legend={NEED_KEY} help={{ meaning: "Each bar is where a reading stands today. The green tick is the level this option needs, so the bar has to reach it. The gold tick, where shown, is where the reading would stand after the first act that builds toward it." }}>
          {prerequisite.requirements.map((requirement) => {
            const best = bestBuilderFor(prerequisite, requirement.reading);
            return <Need key={requirement.reading} requirement={requirement} {...(best ? { step: best.steps[requirement.reading]!, by: best.option.name.toLowerCase() } : {})} />;
          })}
        </ReadingFrame>
      ) : null}
      <Text variant="caption" tone="secondary">
        {prerequisite.line}
      </Text>
      {first && onFirst ? (
        <Row>
          <Button kind="secondary" size="compact" icon="chevron" onPress={() => onFirst(first.option.id)}>
            {`${first.option.name} first`}
          </Button>
        </Row>
      ) : null}
    </Column>
  );
}

// One width for every cell under a row, so the same reading sits in the same
// column on every option instead of stretching to whatever space is left. A
// phone takes two to a line.
const CELL = { phone: 140, other: 200 } as const;

function Cell({ children }: { readonly children: ReactNode }) {
  const media = useMedia();
  return (
    <View width={media.phone ? CELL.phone : CELL.other} maxWidth="100%" role="listitem">
      {children}
    </View>
  );
}

/** Everything else an open option changes from today, and what it starts. The staff's findings open with Details. */
export function Impact({ view }: { readonly view: OptionView }) {
  // The largest change already sits in the row's last slot.
  const marks = byReach(view.effects?.marks ?? []).slice(1);
  const notes = view.effects?.notes ?? [];
  if (marks.length === 0 && notes.length === 0) {
    if ((view.effects?.marks.length ?? 0) > 0) return null;
    return (
      <Text variant="caption" tone="secondary">
        {view.option.ref.kind === "engagement" ? "How much it moves depends on their answer, which comes right away." : "The staff can't read its effects ahead of time. They show up in the first report."}
      </Text>
    );
  }
  return (
    <Column gap="md">
      {marks.length > 0 ? (
        <Row gap="lg" rowGap="md" wrap role="list" aria-label={view.effects?.when ?? "What it changes"}>
          {marks.map((mark) => (
            <Cell key={mark.key}>
              <Change mark={mark} />
            </Cell>
          ))}
        </Row>
      ) : null}
      {notes.map((note) => (
        <Row key={note} gap="xs" top>
          <Icon name="subjectCapitol" size={14} tone="warningInk" />
          <Text variant="caption" tone="warning" flex={1}>
            {note}
          </Text>
        </Row>
      ))}
    </Column>
  );
}

// The findings that say what could go against the President, drawn in the danger ink.
const BAD = new Set(["If it goes wrong", "If they decline", "Escalation", "Civilian exposure", "Could it leak", "Chance they hit back"]);

// A long list (every government that reacts) keeps its first few; the count says the rest.
const SHOWN = 4;

// What a finding's lines lead with: the chance on five steps, or the government by its flag.
const STEP_WORD = ["Remote", "Unlikely", "Even", "Likely", "Almost certain"] as const;

/** A line as its lead and the rest: "China, trading partner: China notices…" or "Remote: somebody steals…". */
function split(text: string): { readonly head: string; readonly body?: string } {
  const at = text.indexOf(": ");
  return at > 0 && at < 48 ? { head: text.slice(0, at), body: text.slice(at + 2) } : { head: text };
}

/** One reason under a finding: what it is about in strong ink, led by its mark, with the sentence under it. */
function Line({ item, danger }: { readonly item: AssessmentItem; readonly danger: boolean }) {
  const { head, body } = split(item.text);
  const valence: ReadingValence = item.stance ? (STANCE_VALENCE[item.stance] ?? "neutral") : danger ? "bad" : "neutral";
  return (
    <Row gap="sm" top role="listitem" aria-label={item.text}>
      <View width={28} paddingTop="xs" alignItems="flex-start" aria-hidden>
        {item.nation ? <FlagOf nation={item.nation} name={head} height={14} /> : item.likelihood !== undefined ? <Pips lit={item.likelihood} steps={5} valence={valence === "neutral" ? "info" : valence} size={4} /> : <View width={6} height={6} borderRadius="pill" backgroundColor="borderColorStrong" marginTop="xs" />}
      </View>
      <Column flex={1} minWidth={0} gap="2xs" aria-hidden>
        <Text variant="caption" weight={body ? "strong" : "regular"} tone={item.likelihood !== undefined ? valenceText(valence) : "primary"} numberOfLines={body ? 1 : 3}>
          {item.likelihood !== undefined && !body ? STEP_WORD[item.likelihood - 1] : head}
        </Text>
        {body ? (
          <Text variant="caption" tone="secondary" numberOfLines={2}>
            {body}
          </Text>
        ) : null}
      </Column>
    </Row>
  );
}

/**
 * One staff finding in the shape of every reading on the row: its name, the
 * finding as a figure in its stance's ink, its chance on five steps where it is
 * one, then the reasons under it, each led by a flag or its own chance.
 */
export function Finding({ label, cell }: { readonly label: string; readonly cell: AssessmentCell }) {
  const danger = BAD.has(label);
  const valence: ReadingValence = cell.stance ? (STANCE_VALENCE[cell.stance] ?? "neutral") : danger ? "watch" : "neutral";
  // A line that only repeats the finding (the one office consulted) says nothing more.
  const lines: readonly AssessmentItem[] = (cell.items ?? (cell.detail ?? []).map((text) => ({ text }))).filter((item) => item.text !== cell.text);
  return (
    <Column gap="sm" role="listitem">
      <Metric label={label} {...(danger ? { icon: "caution" as const } : {})} figure={cell.text} valence={valence} {...(cell.likelihood !== undefined ? { track: <Pips lit={cell.likelihood} valence={valence === "neutral" ? "info" : valence} size={6} /> } : {})} />
      {lines.length > 0 ? (
        <Column gap="xs" role="list" aria-label={label}>
          {lines.slice(0, SHOWN).map((item) => (
            <Line key={item.text} item={item} danger={danger} />
          ))}
          {lines.length > SHOWN ? <Text variant="caption" tone="tertiary" paddingLeft="2xl">{`and ${lines.length - SHOWN} more`}</Text> : null}
        </Column>
      ) : null}
    </Column>
  );
}

// The findings the row already draws in its own readings, so Details doesn't say them twice.
const ON_THE_ROW = new Set(["What it does", "Chance it works", "Cost now", "When", "Would they accept", "Would they sign", "Congress says yes", "Senate approval", "Chance they hit back"]);

/** Every finding the staff has on an option beyond what its row shows, opened in place from its row. */
export function Detail({ view }: { readonly view: OptionView }) {
  const rows = (view.assessment?.rows ?? []).filter((row) => !ON_THE_ROW.has(row.label));
  return (
    <Column gap="md" role="list" aria-label={`${view.option.name} in detail`}>
      {view.preview.basis ? (
        <Row gap="xs" top>
          <Icon name="info" size={14} tone="colorTertiary" />
          <Text variant="caption" tone="tertiary" flex={1}>
            {view.preview.basis}
          </Text>
        </Row>
      ) : null}
      <CardGrid columns={{ phone: 1, tablet: 2, desktop: 3, wide: 3 }} gap="xl">
        {rows.map((row) => (
          <Finding key={row.label} label={row.label} cell={row.act} />
        ))}
      </CardGrid>
    </Column>
  );
}

/** How an option's changes split for and against the President. */
export function verdictOf(view: OptionView): { readonly good: number; readonly bad: number } {
  const marks = view.effects?.marks ?? [];
  return { good: marks.filter((mark) => mark.good).length, bad: marks.filter((mark) => !mark.good).length };
}

// A chance the President wants high, except where it is the chance of the other side hitting back.
const AGAINST_YOU = new Set(["Chance they hit back"]);

/** The odds as a chance in 0..1: the engine's own where the preview carries it, else the middle of its word's band. */
function chanceOf(view: OptionView): number {
  const odds = view.preview.odds;
  if (!odds) return 1;
  const chance = odds.chance ?? ((STEP[odds.word.toLowerCase()] ?? 3) - 0.5) / 5;
  return AGAINST_YOU.has(odds.label) ? 1 - chance : chance;
}

/** Days until it lands: the preview's own figure where it carries one, else read off its short timing; never is last. */
function daysOf(view: OptionView): number {
  if (view.preview.days !== undefined) return view.preview.days;
  const timing = view.preview.short.timing;
  if (timing === "Now") return 0;
  const days = /^(\d+) days?$/.exec(timing);
  const weeks = /^(\d+) wk$/.exec(timing);
  return days ? Number(days[1]) : weeks ? Number(weeks[1]) * 7 : Number.POSITIVE_INFINITY;
}

/** Four weeks of what an option costs, in USD millions; money coming in counts against it. */
function costOf(view: OptionView): number {
  const money = view.preview.money;
  if (!money) return 0;
  return money.now + money.weekly * 4 - (money.perYearIn ?? 0) / 13;
}

/** An option's place under a sort, larger first: the better chance, the lower cost, the sooner, the larger move in your favor. */
export function sortValue(view: OptionView, key: ResultSortKey): number {
  if (key === "odds") return chanceOf(view);
  if (key === "money") return -costOf(view);
  if (key === "time") return -daysOf(view);
  const top = byReach(view.effects?.marks ?? [])[0];
  return top ? (top.good ? 1 : -1) * top.share : 0;
}

export type OptionFilter = "helps" | "free" | "open";

export const FILTER_WORDS: Readonly<Record<OptionFilter, string>> = { helps: "Helps more than it hurts", free: "Costs nothing", open: "Can do now" };

export function passes(view: OptionView, filter: OptionFilter): boolean {
  if (filter === "open") return view.preview.state === "open";
  if (filter === "free") return costOf(view) <= 0;
  const { good, bad } = verdictOf(view);
  return good > bad;
}
