import { useState } from "react";
import type { Campaign, ConditionKind } from "@admin/engine";
import { homeActOptions, localeActOptions, localeMatters, localeWaiting, type LocaleActOption, type LocaleMatter, type LocaleWaiting } from "@admin/player-core";
import type { StateId } from "@admin/world";
import { Badge, Button, Column, Icon, Pressable, ReadingFrame, Row, Sheet, Surface, Text, View } from "@admin/ui";
import { CompareChoices, Track } from "@admin/ui/nation";
import { ActDone, ActProblem } from "../ActDone";
import { useNationAct, type NationAct } from "../act";
import { LawTopicHelp } from "../Law";
import type { ReviewLine } from "../presidential-review-seam";
import { weeks } from "../format";
import { toneKey } from "../keys";
import { COERCION_ICON, VERBS, optionsFor, receiptLines, requestCell, rowsFor, take } from "../state/locale-acts";

/** The review's terms beyond what it does and what it costs, so a press on the row reviews everything the row drew. */
function reviewLines(option: LocaleActOption, matter: LocaleMatter | undefined): readonly ReviewLine[] {
  return [
    { label: "International standing", value: option.standingText },
    ...(matter ? [{ label: "The state's request", value: requestCell(option, matter) }] : []),
    { label: "The governor", value: option.assent ?? "Doesn't need their OK" },
    ...(option.risk ? [{ label: "Chance of an incident", value: `${Math.round(option.risk.odds * 100)}%` }] : []),
  ];
}

/** An act's price, what it does to the state's request, the governor's part and its odds, drawn the same in every row. */
function ActReadings({ option, matter }: { readonly option: LocaleActOption; readonly matter: LocaleMatter | undefined }) {
  return (
    <Column gap="xs">
        <Row gap="xs" wrap>
          <Badge status="outline" icon="budget">
            {option.costText}
          </Badge>
          {matter?.request ? <Badge status={option.answers ? "success" : option.defers ? "warning" : "outline"}>{requestCell(option, matter)}</Badge> : null}
          {option.assent ? <Badge status="outline" icon="subjectPerson">{option.assent}</Badge> : null}
        </Row>
        {option.risk ? (
          <Row gap="sm">
            <Text variant="caption" tone="secondary" width={128}>
              Chance of an incident
            </Text>
            <View flex={1}>
              <Track value={option.risk.odds} tone={option.risk.odds >= 0.4 ? "bad" : "watch"} slim />
            </View>
            <Text variant="caption" weight="strong" tabular width={40} textAlign="right">
              {Math.round(option.risk.odds * 100)}%
            </Text>
          </Row>
        ) : null}
    </Column>
  );
}

/** One act as a row of results: its name and what it does, then its price, the governor's part and its odds drawn beside it. A press opens the review. */
function ActRow({ option, matter, onTake, busy }: { readonly option: LocaleActOption; readonly matter: LocaleMatter | undefined; readonly onTake: () => void; readonly busy: boolean }) {
  const locked = option.locked !== undefined;
  const body = (
    <Column gap="xs" alignSelf="stretch">
      <Row gap="sm" top>
        <Icon name={COERCION_ICON[option.id] ?? "sign"} size={18} tone={locked ? "colorTertiary" : "gold"} />
        <Column gap="2xs" flex={1} minWidth={0}>
          <Text variant="label" tone={locked ? "secondary" : "primary"}>
            {option.name}
          </Text>
          <Text variant="caption" tone="secondary" numberOfLines={3}>
            {option.summary}
          </Text>
        </Column>
        {locked ? null : <Icon name="chevron" size={14} tone="colorTertiary" />}
      </Row>
      <ActReadings option={option} matter={matter} />
      {locked ? (
        <Text variant="caption" tone="warning">
          Not available right now. {option.locked}
        </Text>
      ) : null}
    </Column>
  );
  if (locked) {
    return (
      <Surface level="base" pad="sm" role="listitem" opacity={0.85}>
        {body}
      </Surface>
    );
  }
  return (
    <Pressable role="button" aria-label={`${VERBS[option.id]}. ${option.summary} Cost ${option.costText}. Opens the review.`} aria-disabled={busy} onPress={busy ? undefined : onTake} padding="sm" borderWidth={1} borderColor="borderColor" borderRadius="card" backgroundColor={{ default: "surface", hover: "surfaceHover", press: "backgroundPress" }}>
      {body}
    </Pressable>
  );
}

function MatterPicker({ matters, chosen, onCause }: { readonly matters: readonly LocaleMatter[]; readonly chosen: LocaleMatter; readonly onCause: (cause: ConditionKind) => void }) {
  if (matters.length < 2) return null;
  return (
    <Row gap="xs" wrap role="radiogroup" aria-label="Which problem to answer">
      {matters.map((matter) => {
        const on = matter.cause === chosen.cause;
        return (
          <Pressable key={matter.cause} role="radio" aria-checked={on} onPress={() => onCause(matter.cause)} paddingVertical="xs" paddingHorizontal="sm" borderRadius="pill" borderWidth={1} borderColor={on ? "accent" : "borderColor"} backgroundColor={on ? { default: "accentFill", hover: "accentFillHover" } : { default: "surface", hover: "surfaceHover" }}>
            <Text variant="caption" weight="strong" color={on ? "accentInk" : "color"}>
              {matter.title}
            </Text>
          </Pressable>
        );
      })}
    </Row>
  );
}

function Situation({ matter }: { readonly matter: LocaleMatter }) {
  return (
    <Column gap="xs">
      <Text variant="label" weight="regular">
        {matter.request ? `${matter.request.reason} You have ${weeks(matter.request.weeksLeft)} to answer.` : "The state hasn't asked you for help with this."}
      </Text>
      {matter.severity !== undefined ? (
        <ReadingFrame title="How bad it is" unit="% of the worst damage it could do" legend={toneKey({ watch: "Under 70%", bad: "70% or more: severe" })} help={{ meaning: "The bar is how much damage this problem does, as a share of the worst it could do. It turns red at 70%." }}>
          <Row gap="sm">
            <View flex={1}>
              <Track value={matter.severity} tone={matter.severity >= 0.7 ? "bad" : "watch"} slim />
            </View>
            <Text variant="caption" weight="strong" tabular width={40} textAlign="right">
              {Math.round(matter.severity * 100)}%
            </Text>
          </Row>
        </ReadingFrame>
      ) : null}
    </Column>
  );
}

type CompareProps = { readonly open: boolean; readonly onClose: () => void; readonly name: string; readonly options: readonly LocaleActOption[]; readonly matter: LocaleMatter | undefined; readonly waiting: LocaleWaiting | undefined; readonly unprovoked: boolean; readonly onTake: (option: LocaleActOption) => void; readonly busy: boolean };

/** Every choice as its change from today, over the page; authorizing closes it and opens the same review a row does. */
function CompareSheet({ open, onClose, name, options, matter, waiting, unprovoked, onTake, busy }: CompareProps) {
  const [selected, setSelected] = useState<string | undefined>(undefined);
  const chosen = options.find((option) => option.id === selected);
  return (
    <Sheet open={open} onClose={onClose} wide eyebrow={name} title={unprovoked ? "Compare sending federal forces" : "Compare your choices"}>
      <Column gap="md">
        <LawTopicHelp topic="domestic-force" compact />
        <CompareChoices
          title={matter ? matter.title : `Federal forces in ${name}`}
          options={optionsFor(options)}
          rows={rowsFor(options, matter)}
          selected={selected}
          onSelect={setSelected}
          verb={chosen ? VERBS[chosen.id] : "Pick a choice"}
          danger={unprovoked || chosen?.id === "federalize"}
          onAuthorize={() => chosen && onTake(chosen)}
          {...(chosen ? { review: `${chosen.name} for ${name}. Cost now: ${chosen.costText}. It goes on your Record.` } : {})}
          {...(waiting ? { waiting: waiting.line } : {})}
          busy={busy}
        />
      </Column>
    </Sheet>
  );
}

type ActsProps = { readonly campaign: Campaign; readonly state: StateId; readonly cause?: ConditionKind; readonly onCause: (cause: ConditionKind) => void };

function useStateActs(campaign: Campaign, state: StateId, cause: ConditionKind | undefined) {
  const matters = localeMatters(campaign, state);
  const matter = matters.find((entry) => entry.cause === cause) ?? matters[0];
  const name = campaign.states[state]?.base.name ?? state;
  const options = matter ? localeActOptions(campaign, state, matter.cause) : homeActOptions(campaign, state);
  const waiting = matter ? localeWaiting(campaign, state, matter.cause) : undefined;
  return { matters, matter, name, options, waiting };
}

/** Starts an act the way the act desk does: the same take(), the same review, the same commit. */
function starter(act: NationAct, name: string, matter: LocaleMatter | undefined, remember: (option: LocaleActOption) => void) {
  return (option: LocaleActOption) => {
    remember(option);
    take(act, option, name, reviewLines(option, matter));
  };
}

function ListControls({ unprovoked, showing, onShowing, canCompare, onCompare }: { readonly unprovoked: boolean; readonly showing: boolean; readonly onShowing: () => void; readonly canCompare: boolean; readonly onCompare: () => void }) {
  return (
      <Row gap="sm" wrap>
        {unprovoked ? (
          <Button kind="quiet" size="compact" icon={showing ? "close" : "shield"} onPress={() => onShowing()}>
            {showing ? "Hide federal forces" : "Show federal forces"}
          </Button>
        ) : null}
        {canCompare ? (
          <Button kind="secondary" size="compact" icon="graph" onPress={() => onCompare()}>
            Compare with waiting
          </Button>
        ) : null}
      </Row>
  );
}

/**
 * What the President can do about one state, in place: the matter waiting,
 * every federal act as a row with its price and odds, a comparison with
 * waiting over the page, the review, and the receipt once it is done. The
 * President never leaves the Nation page to act.
 */
export function StateActs({ campaign, state, cause, onCause }: ActsProps) {
  const act = useNationAct(campaign);
  const { matters, matter, name, options, waiting } = useStateActs(campaign, state, cause);
  const [taken, setTaken] = useState<LocaleActOption | undefined>(undefined);
  const [comparing, setComparing] = useState(false);
  const [showForces, setShowForces] = useState(false);
  const start = starter(act, name, matter, setTaken);
  if (act.done) {
    return (
      <Column gap="md">
        {act.layer}
        <ActDone done={{ ...act.done, lines: receiptLines(act.done, state, taken) }} onBack={act.dismiss} backLabel={`Back to ${name}`} />
      </Column>
    );
  }
  const unprovoked = matter === undefined;
  const listed = unprovoked && !showForces ? [] : options;
  return (
    <Column gap="sm">
      {act.layer}
      <Row between gap="sm" wrap>
        <Text variant="label">{unprovoked ? "Federal forces" : "What you can do"}</Text>
        {matter ? <Badge status={matter.request ? "warning" : "outline"}>{matter.request ? "The state asked" : "Not asked"}</Badge> : null}
      </Row>
      {matter ? <MatterPicker matters={matters} chosen={matter} onCause={onCause} /> : null}
      {matter ? <Situation matter={matter} /> : <Text variant="caption" tone="secondary">{`Nothing in ${name} needs an answer from you right now. Sending in federal forces without a reason looks like going too far, so these are here to compare.`}</Text>}
      <ReadingFrame title="Chance of an incident, act by act" unit="% chance something goes wrong" legend={toneKey({ watch: "Under 40%", bad: "40% or more" })} pressHint="Press an act to review it." help={{ meaning: "Sending force or collecting information on Americans can go wrong. The bar is the chance of an incident for each act, filled further for a worse chance. Whether it happens is shown on the receipt." }}>
        <Column gap="xs" role="list" aria-label={`Acts for ${name}`}>
          {listed.map((option) => (
            <ActRow key={option.id} option={option} matter={matter} busy={act.busy} onTake={() => start(option)} />
          ))}
        </Column>
      </ReadingFrame>
      <ListControls unprovoked={unprovoked} showing={showForces} onShowing={() => setShowForces((was) => !was)} canCompare={listed.length > 0} onCompare={() => setComparing(true)} />
      <ActProblem problem={act.problem} />
      <CompareSheet
        open={comparing}
        onClose={() => setComparing(false)}
        name={name}
        options={options}
        matter={matter}
        waiting={waiting}
        unprovoked={unprovoked}
        busy={act.busy}
        onTake={(option) => {
          setComparing(false);
          start(option);
        }}
      />
    </Column>
  );
}
