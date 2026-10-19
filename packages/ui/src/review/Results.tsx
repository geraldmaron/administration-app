import { createContext, useContext, useState, type ReactNode } from "react";
import { View } from "@tamagui/core";
import { ChoiceMark } from "../forms/ChoiceList";
import { Icon, type IconName } from "../icons/Icon";
import { Pressable } from "../primitives/Button";
import { Column, Row } from "../primitives/Stack";
import { Text } from "../primitives/Text";
import { stickyHead } from "./sticky";
import { Pips, valenceFill, valenceText, type ReadingValence } from "../world/Readings";

// A choice as a results list: one row per option, the same drawn readings in
// the same place on every row (the chance it works, the money, the time, the
// biggest move), so a difference is read straight down the list instead of
// hunted for across cards. A row is pressed anywhere to pick it; the compare
// check at its end is its own target. A locked row is drawn disabled and
// carries what it waits on under its name instead of a press. There is no
// row for doing nothing: today is the zero every reading is drawn from, and
// not acting is approving nothing.
//
// The list lays its rows out by its own width, not the window's, because the
// navigation rail takes a different share of the window at each size: on one
// line when there is room for every reading, otherwise the readings wrap under
// the name, two to a line on a phone.

type Layout = "line" | "wide-stack" | "stack";

const LayoutContext = createContext<{ readonly layout: Layout; readonly headed: boolean }>({ layout: "stack", headed: false });

/** Whether a reading sits under a column head that already names it, so it need not say its own label. */
const HeadedContext = createContext(false);

const LINE_AT = 1060;
const WIDE_STACK_AT = 560;

/** The widths of the reading slots on one line, so each reading sits in the same column on every row. */
const SLOT = { odds: 132, money: 184, time: 112, move: 200 } as const;

/** The leading column a row's compare check sits in, so the check reads as selecting the row it starts. */
const CHECK = 52;

export type ResultReadings = {
  readonly odds?: ReactNode;
  readonly money?: ReactNode;
  readonly time?: ReactNode;
  /** The biggest thing it moves, or what it starts. */
  readonly move?: ReactNode;
};

export type ResultHeads = { readonly name: string; readonly odds: string; readonly money: string; readonly time: string; readonly move: string };

/** A reading column the list can be ordered by. */
export type ResultSortKey = "odds" | "money" | "time" | "move";

export type ResultSort = {
  readonly key: ResultSortKey | undefined;
  readonly onSort: (key: ResultSortKey) => void;
};

export type ResultsListProps = {
  /** The list's name for a screen reader. */
  readonly label: string;
  /** Column heads, pinned over the rows when they sit on one line; each reading names itself otherwise. */
  readonly heads?: ResultHeads;
  /** Makes the heads order the list: pressing one sorts by it, best first. */
  readonly sort?: ResultSort;
  readonly children: ReactNode;
};

function Head({ text, width, column, sort }: { readonly text: string; readonly width?: number; readonly column?: ResultSortKey; readonly sort?: ResultSort }) {
  const size = width ? { width } : { flex: 1, minWidth: 0 };
  if (!column || !sort) {
    return (
      <Text variant="eyebrow" tone="secondary" {...size} numberOfLines={1} aria-hidden>
        {text}
      </Text>
    );
  }
  const on = sort.key === column;
  return (
    <Pressable onPress={() => sort.onSort(column)} role="button" aria-pressed={on} aria-label={on ? `Sorted by ${text.toLowerCase()}. Press to show the list in its usual order.` : `Sort by ${text.toLowerCase()}, best first`} {...size} flexDirection="row" alignItems="center" gap={4} minHeight={28} borderRadius="control" backgroundColor={{ default: "transparent", hover: "surfaceHover" }}>
      <Text variant="eyebrow" tone={on ? "primary" : "secondary"} numberOfLines={1} flexShrink={1}>
        {text}
      </Text>
      <View style={{ transform: [{ rotate: "90deg" }] }}>
        <Icon name="chevron" size={12} tone={on ? "accent" : "colorTertiary"} />
      </View>
    </Pressable>
  );
}

function Heads({ heads, sort }: { readonly heads: ResultHeads; readonly sort?: ResultSort }) {
  return (
    <Row paddingVertical="xs" paddingRight="md" backgroundColor="background" borderBottomWidth={1} borderBottomColor="borderColorStrong" style={stickyHead}>
      {/* Every headed list's rows lead with a compare check, so the heads hold its column open and then match the row's own inset. */}
      <View width={CHECK} />
      <Row flex={1} gap="lg" paddingLeft="md">
        <Head text={heads.name} />
        <Head text={heads.odds} width={SLOT.odds} column="odds" {...(sort ? { sort } : {})} />
        <Head text={heads.money} width={SLOT.money} column="money" {...(sort ? { sort } : {})} />
        <Head text={heads.time} width={SLOT.time} column="time" {...(sort ? { sort } : {})} />
        <Head text={heads.move} width={SLOT.move} column="move" {...(sort ? { sort } : {})} />
      </Row>
    </Row>
  );
}

/** Rows that share one set of reading slots, laid out by the list's own width. */
export function ResultsList({ label, heads, sort, children }: ResultsListProps) {
  const [width, setWidth] = useState(0);
  const layout: Layout = width >= LINE_AT ? "line" : width >= WIDE_STACK_AT ? "wide-stack" : "stack";
  return (
    <LayoutContext.Provider value={{ layout, headed: Boolean(heads) && layout === "line" }}>
      <Column gap="sm" role="list" aria-label={label} onLayout={(event: { nativeEvent: { layout: { width: number } } }) => setWidth(event.nativeEvent.layout.width)}>
        {heads && layout === "line" ? <Heads heads={heads} {...(sort ? { sort } : {})} /> : null}
        {children}
      </Column>
    </LayoutContext.Provider>
  );
}

function Slot({ layout, width, children }: { readonly layout: Layout; readonly width: number; readonly children: ReactNode }) {
  const { headed } = useContext(LayoutContext);
  if (layout === "line") {
    return (
      <HeadedContext.Provider value={headed}>
        <View width={width}>{children ?? null}</View>
      </HeadedContext.Provider>
    );
  }
  if (children === undefined || children === null) return null;
  return (
    <View flexBasis={layout === "wide-stack" ? "22%" : "44%"} flexGrow={1} minWidth={layout === "wide-stack" ? 120 : 132}>
      {children}
    </View>
  );
}

function ReadingSlots({ layout, readings }: { readonly layout: Layout; readonly readings: ResultReadings }) {
  return (
    <>
      <Slot layout={layout} width={SLOT.odds}>{readings.odds}</Slot>
      <Slot layout={layout} width={SLOT.money}>{readings.money}</Slot>
      <Slot layout={layout} width={SLOT.time}>{readings.time}</Slot>
      <Slot layout={layout} width={SLOT.move}>{readings.move}</Slot>
    </>
  );
}

export type ResultRowProps = {
  readonly label: string;
  readonly icon?: IconName;
  /** A short line under the name: what kind of act it is. */
  readonly note?: string;
  /** How its changes split for and against the President, drawn under the name. */
  readonly verdict?: { readonly good: number; readonly bad: number };
  readonly readings?: ResultReadings;
  /** Everything else the option does, drawn compactly under the main line: what it moves, who reacts, what could go wrong. */
  readonly impact?: ReactNode;
  /** The full detail the Details control opens in place. */
  readonly detail?: ReactNode;
  /** Picked: drawn with the selection ring. */
  readonly selected?: boolean;
  /** Pressing anywhere on an open row picks it. */
  readonly onPress?: () => void;
  /** The press's words for a screen reader: "Plan Forward Deploy". */
  readonly pressLabel?: string;
  /** Why it can't be taken, in a word or two ("Locked", "Under way"); the row is drawn disabled. */
  readonly locked?: { readonly word: string; readonly icon?: IconName };
  readonly check?: { readonly on: boolean; readonly onToggle: () => void; readonly label: string };
  /** Set under the readings: a locked row's path. It may hold its own controls, so a locked row has no row press. */
  readonly below?: ReactNode;
};

/**
 * How an option's changes split: a solid bar of the moves in the President's
 * favor beside the ones against, with the count, so a row says at a glance
 * whether it mostly helps before any one reading is read.
 */
export function Verdict({ good, bad }: { readonly good: number; readonly bad: number }) {
  const total = good + bad;
  if (total === 0) return null;
  const words = bad === 0 ? `${good} for you` : good === 0 ? `${bad} against you` : `${good} for · ${bad} against`;
  return (
    <Row gap="xs" role="img" aria-label={`Changes: ${good} in your favor, ${bad} against you`}>
      <Row width={56} height={6} borderRadius={2} overflow="hidden" gap={1} aria-hidden>
        {good > 0 ? <View flex={good} height={6} backgroundColor="successInk" /> : null}
        {bad > 0 ? <View flex={bad} height={6} backgroundColor="danger" /> : null}
      </Row>
      <Text variant="caption" weight="strong" tone={bad > good ? "danger" : good > bad ? "success" : "secondary"} numberOfLines={1} aria-hidden>
        {words}
      </Text>
    </Row>
  );
}

function Name({ label, icon, note, locked, inRow, verdict }: Pick<ResultRowProps, "label" | "icon" | "note" | "locked" | "verdict"> & { readonly inRow: boolean }) {
  const glyph = locked?.icon ?? (locked ? "locked" : icon);
  // Beside the readings the name takes the spare width; stacked over them, flex would squeeze its height to nothing.
  return (
    <Column gap="2xs" {...(inRow ? { flex: 1 } : {})} minWidth={0}>
      <Row gap="xs">
        {glyph ? <Icon name={glyph} size={18} tone={locked ? "colorTertiary" : "gold"} weight="fill" /> : null}
        <Text variant="body" weight="medium" tone={locked ? "secondary" : "primary"} flexShrink={1}>
          {label}
        </Text>
        {locked ? (
          <Text variant="caption" weight="strong" tone="tertiary">
            {locked.word}
          </Text>
        ) : null}
      </Row>
      {note ? (
        <Text variant="caption" tone="tertiary" numberOfLines={1}>
          {note}
        </Text>
      ) : null}
      {verdict ? <Verdict good={verdict.good} bad={verdict.bad} /> : null}
    </Column>
  );
}

/** The compare check, leading the row it selects, with its word under the mark so it reads as a control. */
function Check({ check }: { readonly check: NonNullable<ResultRowProps["check"]> }) {
  return (
    <Pressable onPress={check.onToggle} role="checkbox" aria-checked={check.on} aria-label={check.label} width={CHECK} alignItems="center" gap={2} paddingTop="md" paddingLeft="sm" backgroundColor="transparent">
      <ChoiceMark selected={check.on} shape="check" />
      <Text variant="caption" tone={check.on ? "accent" : "tertiary"}>
        Compare
      </Text>
    </Pressable>
  );
}

/** The card's last line: opens the staff's full findings in place, under everything the row already shows. */
function Disclosure({ label, open, onPress, indent }: { readonly label: string; readonly open: boolean; readonly onPress: () => void; readonly indent: boolean }) {
  return (
    <Pressable onPress={onPress} role="button" aria-expanded={open} aria-label={`${open ? "Hide" : "Show"} details for ${label}`} flexDirection="row" alignItems="center" gap="xs" paddingHorizontal="md" paddingVertical="xs" {...(indent ? { marginLeft: CHECK } : {})} backgroundColor={{ default: "transparent", hover: "backgroundPress" }}>
      <Icon name={open ? "restorePanel" : "expandPanel"} size={14} tone="accent" />
      <Text variant="caption" weight="strong" tone="accent">
        {open ? "Hide details" : "Details: every finding from the staff"}
      </Text>
    </Pressable>
  );
}

function Body({ layout, props }: { readonly layout: Layout; readonly props: ResultRowProps }) {
  const readings = props.readings ?? {};
  const name = <Name label={props.label} inRow={layout === "line"} {...(props.icon ? { icon: props.icon } : {})} {...(props.note ? { note: props.note } : {})} {...(props.locked ? { locked: props.locked } : {})} {...(props.verdict ? { verdict: props.verdict } : {})} />;
  return (
    <Column gap="md" padding="md" flexGrow={1} minWidth={0} minHeight={layout === "line" ? 76 : undefined} justifyContent="center">
      {layout === "line" ? (
        <Row gap="lg">
          {name}
          <ReadingSlots layout={layout} readings={readings} />
        </Row>
      ) : (
        <>
          {name}
          <Row gap="lg" rowGap="md" wrap>
            <ReadingSlots layout={layout} readings={readings} />
          </Row>
        </>
      )}
      {props.impact ? (
        <View borderTopWidth={1} borderTopColor="borderColor" paddingTop="md">
          {props.impact}
        </View>
      ) : null}
      {props.below ?? null}
    </Column>
  );
}

/** One option in a results list: one card, its compare check leading it and its details opening at its foot. */
export function ResultRow(props: ResultRowProps) {
  const { layout } = useContext(LayoutContext);
  const [open, setOpen] = useState(false);
  const { selected, locked, onPress, check, detail } = props;
  const body = <Body layout={layout} props={props} />;
  const main =
    onPress && !locked ? (
      <Pressable onPress={onPress} role="button" aria-pressed={selected ?? false} aria-label={props.pressLabel ?? props.label} flex={1} minWidth={0} backgroundColor="transparent">
        {body}
      </Pressable>
    ) : (
      <View flex={1} minWidth={0} aria-label={locked ? `${props.label}, ${locked.word}` : props.label}>
        {body}
      </View>
    );
  return (
    <View role="listitem" borderRadius="card" borderWidth={selected ? 2 : 1} borderStyle={locked ? "dashed" : "solid"} borderColor={selected ? "accent" : locked ? "borderColorStrong" : "borderColor"} backgroundColor={locked ? "background" : onPress ? { default: "surface", hover: "surfaceHover" } : "surface"} overflow="hidden" {...(locked ? { "aria-disabled": true } : {})}>
      <Row alignItems="stretch">
        {check ? <Check check={check} /> : null}
        {main}
      </Row>
      {detail ? <Disclosure label={props.label} open={open} onPress={() => setOpen(!open)} indent={Boolean(check)} /> : null}
      {open && detail ? (
        <View paddingHorizontal="md" paddingBottom="md" {...(check ? { marginLeft: CHECK } : {})}>
          {detail}
        </View>
      ) : null}
    </View>
  );
}

const STEP_WORDS = 5;

/** The height every reading's drawn mark sits in, so marks line up across the slots of a row and down the rows of a list. */
const TRACK = 10;

export type MetricProps = {
  /** What it measures, set small over the figure, so a reading names itself wherever it lands. */
  readonly label: string;
  readonly icon?: IconName;
  /** The reading itself: a figure or a short word. */
  readonly figure: string;
  readonly valence?: ReadingValence;
  /** The drawn mark under the figure. A slot with none keeps the track's height, so the next row's figures stay level. */
  readonly track?: ReactNode;
  /** What a screen reader hears; the label and figure when not given. */
  readonly spoken?: string;
  /** The label differs row to row (which reading moved), so a column head can't stand in for it: under a head it is set beneath the track. */
  readonly named?: boolean;
};

/**
 * The one shape every reading in a results row takes: what it measures and its
 * glyph, the figure in the ink of what it means for the President, then its
 * mark on a track of fixed height. Odds, money, time and every change are the
 * same three lines, so a difference reads straight across a row and down a list.
 */
export function Metric({ label, icon, figure, valence = "neutral", track, spoken, named }: MetricProps) {
  const headed = useContext(HeadedContext);
  const ink = valenceFill(valence);
  return (
    <Column gap={3} minWidth={0} paddingLeft="sm" borderLeftWidth={3} borderLeftColor={valence === "neutral" ? "borderColor" : ink} role="img" aria-label={spoken ?? `${label}: ${figure}`}>
      {headed ? null : (
        <Text variant="caption" tone="tertiary" numberOfLines={1} aria-hidden>
          {label}
        </Text>
      )}
      <Row gap="xs" aria-hidden>
        {icon ? <Icon name={icon} size={16} tone={ink} weight="fill" /> : null}
        <Text variant="label" weight="strong" tone={valenceText(valence)} tabular numberOfLines={2} flexShrink={1}>
          {figure}
        </Text>
      </Row>
      <View height={TRACK} justifyContent="center" aria-hidden>
        {track ?? null}
      </View>
      {headed && named ? (
        <Text variant="caption" tone="tertiary" numberOfLines={1} aria-hidden>
          {label}
        </Text>
      ) : null}
    </Column>
  );
}

/** The chance it works on five steps, the word over them in the same ink. */
export function OddsSteps({ step, word, figure, valence, label = "Chance it works" }: { readonly step: number; readonly word: string; readonly figure?: string; readonly valence: ReadingValence; readonly label?: string }) {
  return <Metric label={label} icon="graph" figure={figure ?? word} valence={valence} spoken={`${label}: ${figure ? `${figure}, ${word.toLowerCase()}` : word}`} track={<Pips lit={step} steps={STEP_WORDS} valence={valence} size={7} />} />;
}

/** An act that happens once ordered: the top step, said as such. */
export function CertainOdds() {
  return <OddsSteps step={STEP_WORDS} word="Certain" figure="100%" valence="good" />;
}

/** When it lands, as a figure in the same shape as every other reading. */
export function TimeReading({ text, label = "Takes effect" }: { readonly text: string; readonly label?: string }) {
  return <Metric label={label} icon="schedule" figure={text} valence="info" />;
}

/**
 * Money on one scale shared by the list: the solid part is paid now, the
 * outlined part is the bill that keeps coming (four weeks of it), so an act
 * that bills every week can't read cheaper than one paid once by leaving its
 * bill out. Spending is in the caution ink, money coming in in the success
 * ink, and an act that costs nothing reads $0 on an empty track.
 */
export function MoneyBar({ now, weekly = 0, scale, text, incoming, label = "Cost" }: { readonly now: number; readonly weekly?: number; readonly scale: number; readonly text: string; readonly incoming?: boolean; readonly label?: string }) {
  const share = (value: number): `${number}%` => `${Math.max(0, Math.min(1, scale > 0 ? value / scale : 0)) * 100}%`;
  const free = !incoming && now === 0 && weekly === 0;
  const valence: ReadingValence = incoming ? "good" : free ? "neutral" : "watch";
  const ink = valenceFill(valence);
  return (
    <Metric
      label={incoming ? "Brings in" : label}
      icon="budget"
      figure={free ? "$0" : text}
      valence={valence}
      spoken={`${incoming ? "Brings in" : label}: ${free ? "nothing" : text}`}
      track={
        <Row height={7} borderRadius={2} backgroundColor="borderColor" overflow="hidden">
          {incoming ? <View height={7} width="100%" backgroundColor={ink} /> : null}
          {now > 0 ? <View height={7} width={share(now)} minWidth={3} backgroundColor={ink} /> : null}
          {weekly > 0 ? <View height={7} width={share(weekly * MONTH_WEEKS)} borderWidth={1.5} borderColor={ink} backgroundColor="surface" /> : null}
        </Row>
      }
    />
  );
}

/** How many weeks of a recurring bill the money bar draws. */
export const MONTH_WEEKS = 4;

/** The scale a list's money bars share: the largest of now plus four weeks of the bill. */
export function moneyScale(amounts: readonly { readonly now: number; readonly weekly?: number }[]): number {
  return Math.max(1, ...amounts.map((amount) => amount.now + (amount.weekly ?? 0) * MONTH_WEEKS));
}

/**
 * One change from today on the scale every option shares: a zero line in the
 * middle stands for today, a rise draws to its right and a fall to its left,
 * in the ink of what the change means for the President.
 */
export function ChangeBar({ label, word, figure, icon, share, rises, valence }: { readonly label: string; readonly word: string; readonly figure?: string; readonly icon?: IconName; readonly share: number; readonly rises: boolean; readonly valence: ReadingValence }) {
  const half: `${number}%` = `${Math.max(0.04, Math.min(1, share)) * 50}%`;
  return (
    <Metric
      label={label}
      named
      {...(icon ? { icon } : {})}
      figure={`${rises ? "▲" : "▼"} ${figure ?? word}`}
      valence={valence}
      spoken={`${label}: ${figure ? `${figure}, ${word.toLowerCase()}` : word}`}
      track={
        <View height={7} borderRadius={2} backgroundColor="borderColor" position="relative">
          <View position="absolute" top={0} bottom={0} width={half} {...(rises ? { left: "50%" } : { right: "50%" })} backgroundColor={valenceFill(valence)} borderRadius={2} />
          <View position="absolute" top={-2} bottom={-2} left="50%" width={2} marginLeft={-1} backgroundColor="color" />
        </View>
      }
    />
  );
}
