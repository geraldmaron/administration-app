import type { Campaign, CourtOrderStatus } from "@admin/engine";
import { courtOrderOptions, type CourtOrderOption } from "@admin/player-core";
import type { StateId } from "@admin/world";
import { Column, Icon, Pressable, ReadingFrame, Row, Surface, Tag, Text, View, type KeyEntry, type TagTone } from "@admin/ui";
import { TrackRow } from "@admin/ui/nation";
import { StackedBar, type BarSegment } from "@admin/ui/news";
import { ActDone, ActProblem } from "../ActDone";
import { useNationAct, type NationAct } from "../act";
import { LawDoor } from "./act-terms";

// Seeking a court order: the President asks, the Attorney General decides
// whether Justice files, and a judge decides whether to grant it. Each kind is
// one row with the court's likely answer drawn, the strength of the case, how
// long the court takes, how long a granted order runs, what it opens on this
// desk, and what became of the last application. The court's answer is never
// shown before it is given.

const ODDS_INK = { granted: "goodInk", narrowed: "warningInk", denied: "badInk" } as const;

const ODDS_KEY: readonly KeyEntry[] = [
  { id: "granted", kind: "swatch", label: "Granted as asked", ink: ODDS_INK.granted },
  { id: "narrowed", kind: "swatch", label: "Granted, narrower", ink: ODDS_INK.narrowed },
  { id: "denied", kind: "swatch", label: "Refused", ink: ODDS_INK.denied },
  { id: "case", kind: "swatch", label: "Strength of the case", ink: "accent" },
];

const STATUS: Readonly<Record<CourtOrderStatus, { readonly tone: TagTone; readonly word: string }>> = {
  pending: { tone: "pending", word: "Waiting on the court" },
  granted: { tone: "success", word: "Granted" },
  narrowed: { tone: "warning", word: "Granted, narrower" },
  denied: { tone: "danger", word: "Refused" },
  expired: { tone: "outline", word: "Ran out" },
};

const LEANING: Readonly<Record<NonNullable<CourtOrderOption["bench"]>["leaning"], string>> = {
  "your way": "leans your way",
  "against you": "leans against you",
  even: "is evenly split",
};

function oddsSegments(option: CourtOrderOption): readonly BarSegment[] {
  const { granted, narrowed, denied } = option.odds;
  return [
    { key: "granted", count: granted, label: "Granted as asked", ink: ODDS_INK.granted, figure: `${granted}%` },
    { key: "narrowed", count: narrowed, label: "Granted, narrower", ink: ODDS_INK.narrowed, figure: `${narrowed}%` },
    { key: "denied", count: denied, label: "Refused", ink: ODDS_INK.denied, figure: `${denied}%` },
  ];
}

const oddsWords = (option: CourtOrderOption): string => `Granted ${option.odds.granted}%, narrower ${option.odds.narrowed}%, refused ${option.odds.denied}%`;
const verbOf = (option: CourtOrderOption): string => (option.renewal ? "Ask Justice to renew it" : "Ask Justice to apply");

/** One application put to the review with every term its row drew, then committed through the act path. */
function seek(act: NationAct, name: string, option: CourtOrderOption): void {
  const files = option.attorneyGeneral === undefined || option.attorneyGeneral === "carried";
  void act.run(
    () => {
      if (!option.packet) throw new Error(option.locked ?? "Justice can't file this application right now.");
      return {
        packet: option.packet,
        title: files ? `Justice applied to the court: ${option.name}, ${name}` : `Justice didn't file: ${option.name}, ${name}`,
        lines: [{ label: "What happened", value: option.packet.narration.summary }],
        ...(files ? {} : { outcome: "refused" as const }),
      };
    },
    {
      tier: "confirm",
      title: `${option.name} for ${name}`,
      lines: [
        { label: "Court", value: option.court },
        { label: "The law", value: `${option.authority.cite}, ${option.authority.name}` },
        { label: "The court's likely answer", value: oddsWords(option) },
        { label: "Strength of the case", value: `${option.evidence.score}%` },
        { label: "The court answers in", value: option.decisionText },
        { label: "A granted order runs", value: option.termText },
        { label: "What it opens", value: option.enables },
        ...(option.attorneyGeneralText ? [{ label: "The Attorney General", value: option.attorneyGeneralText }] : []),
      ],
      verb: verbOf(option),
    },
  );
}

/** The court's likely answer split on one bar, and the strength of the case the court weighs, figures beside both. */
function OrderOdds({ option }: { readonly option: CourtOrderOption }) {
  return (
    <Column gap="xs" flexGrow={1} flexBasis={240} minWidth={200}>
      <StackedBar label={`${option.name}, the court's likely answer`} segments={oddsSegments(option)} height={12} />
      <Text variant="caption" tone="secondary" tabular>
        {`Granted ${option.odds.granted}% · Narrower ${option.odds.narrowed}% · Refused ${option.odds.denied}%`}
      </Text>
      <TrackRow name="Strength of the case" figure={`${option.evidence.score}%`} value={option.evidence.score / 100} tone="reading" slim />
    </Column>
  );
}

function KindHead({ option, open }: { readonly option: CourtOrderOption; readonly open: boolean }) {
  return (
    <Column gap="xs">
      <Row gap="md" rowGap="sm" wrap top>
        <Row gap="sm" top flexGrow={1} flexBasis={220} minWidth={0}>
          <Icon name="court" size={18} tone={open ? "gold" : "colorTertiary"} />
          <Column gap="2xs" flex={1} minWidth={0}>
            <Text variant="label" tone={open ? "primary" : "secondary"}>
              {option.name}
            </Text>
            <Text variant="caption" tone="secondary">{`From ${option.court}. It answers in ${option.decisionText.toLowerCase()}. It runs ${option.termText}.`}</Text>
            {option.bench ? <Text variant="caption" tone="secondary">{`The bench at ${option.bench.court} ${LEANING[option.bench.leaning]}.`}</Text> : null}
          </Column>
        </Row>
        {open ? <OrderOdds option={option} /> : null}
      </Row>
      {open && option.attorneyGeneralText ? (
        <Text variant="caption" tone={option.attorneyGeneral === "carried" ? "secondary" : "warning"}>
          {option.attorneyGeneralText}
        </Text>
      ) : null}
      {open ? (
        <Row gap="xs" alignSelf="flex-end">
          <Text variant="label" tone="accent">{verbOf(option)}</Text>
          <Icon name="chevron" size={14} tone="accent" />
        </Row>
      ) : (
        <Text variant="caption" tone="warning">{`Not available right now. ${option.locked ?? "Justice can't file it this week."}`}</Text>
      )}
    </Column>
  );
}

/** What the case rests on, one fact a line, under the row. */
function Evidence({ option }: { readonly option: CourtOrderOption }) {
  if (option.evidence.lines.length === 0) return null;
  return (
    <Column gap="2xs" role="list" aria-label="What the case rests on">
      {option.evidence.lines.map((line) => (
        <Row key={line} gap="xs" role="listitem">
          <View width={6} height={6} borderRadius="pill" backgroundColor="colorTertiary" aria-hidden />
          <Text variant="caption" tone="secondary" flex={1}>
            {line}
          </Text>
        </Row>
      ))}
    </Column>
  );
}

type KindRowProps = { readonly option: CourtOrderOption; readonly busy: boolean; readonly onSeek: () => void };

/** One kind of order: a press on its head opens the review; its law, what it opens and its last application sit under it. */
function KindRow({ option, busy, onSeek }: KindRowProps) {
  const open = option.locked === undefined && option.packet !== undefined;
  const latest = option.latest;
  const head = <KindHead option={option} open={open} />;
  return (
    <View role="listitem" borderRadius="card" borderWidth={1} borderStyle={open ? "solid" : "dashed"} borderColor={open ? "borderColor" : "borderColorStrong"} backgroundColor={open ? "surface" : "background"} overflow="hidden">
      {open ? (
        <Pressable role="button" aria-label={`${verbOf(option)}: ${option.name}. ${oddsWords(option)}. Opens the review.`} aria-disabled={busy} onPress={busy ? undefined : onSeek} padding="md" backgroundColor={{ default: "transparent", hover: "surfaceHover", press: "backgroundPress" }}>
          {head}
        </Pressable>
      ) : (
        <View padding="md" aria-disabled>
          {head}
        </View>
      )}
      <Column gap="xs" paddingHorizontal="md" paddingBottom="md">
        <Text variant="caption">{latest?.enables ?? option.enables}</Text>
        <Evidence option={option} />
        {latest ? (
          <Row gap="sm" wrap>
            <Tag tone={STATUS[latest.status].tone}>{STATUS[latest.status].word}</Tag>
            <Text variant="caption" tone="secondary" flex={1} minWidth={160}>
              {latest.statusText}
            </Text>
          </Row>
        ) : null}
        <LawDoor cite={option.authority.cite} title={option.authority.name} />
      </Column>
    </View>
  );
}

/**
 * Every court order Justice can seek for one state, each with the court's
 * likely answer, the strength of the case, its clock and its term; a press puts
 * the application to the review and commits it through the same act path as
 * every other act here.
 */
export function CourtOrders({ campaign, state }: { readonly campaign: Campaign; readonly state: StateId }) {
  const act = useNationAct(campaign);
  const name = campaign.states[state]?.base.name ?? state;
  if (act.done) {
    return (
      <Column gap="md">
        {act.layer}
        <ActDone done={act.done} onBack={act.dismiss} backLabel="Back to the court orders" />
      </Column>
    );
  }
  const options = courtOrderOptions(campaign, state);
  return (
    <Surface level="raised" pad="md" role="region" aria-label={`Seek a court order for ${name}`}>
      {act.layer}
      <Column gap="sm">
        <Row gap="xs">
          <Icon name="gavel" size={18} tone="gold" />
          <Text variant="title" role="heading" aria-level={3} flex={1}>
            Seek a court order
          </Text>
        </Row>
        <Text variant="caption" tone="secondary">
          {`You can ask the Attorney General to apply. Only a judge can grant an order, and only on the facts the law asks for. Surveillance in ${name} and some uses of troops wait on one.`}
        </Text>
        <ReadingFrame level="label" title="The court's likely answer" unit="% chance, before the court rules" legend={ODDS_KEY} pressHint="Press an application to review it." help={{ meaning: "Each split bar is the chance for one application: granted as asked, granted but narrower than asked, or refused. The slim bar under it is how strong the case is, from the evidence the court weighs. The answer comes on the court's own clock and is only known once the court gives it." }}>
          <Column gap="sm" role="list" aria-label={`Court orders for ${name}`}>
            {options.map((option) => (
              <KindRow key={option.kind} option={option} busy={act.busy} onSeek={() => seek(act, name, option)} />
            ))}
          </Column>
        </ReadingFrame>
        <ActProblem problem={act.problem} />
      </Column>
    </Surface>
  );
}
