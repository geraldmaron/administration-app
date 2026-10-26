import { useState } from "react";
import { liveProclamation, type Campaign, type ConditionKind, type LocaleActGroup } from "@admin/engine";
import { homeActOptions, localeActOptions, localeMatters, localeWaiting, type LocaleActOption, type LocaleMatter, type LocaleWaiting } from "@admin/player-core";
import type { StateId } from "@admin/world";
import { Tag, Button, Column, Icon, Pressable, ReadingFrame, Row, Sheet, Surface, Text, View } from "@admin/ui";
import { CompareChoices, Track } from "@admin/ui/nation";
import { ActDone, ActProblem } from "../ActDone";
import { useNationAct, type NationAct } from "../act";
import { LawTopicHelp } from "../Law";
import type { ReviewLine } from "../presidential-review-seam";
import { weeks } from "../format";
import { toneKey } from "../keys";
import { COERCION_ICON, VERBS, isForceAct, offered, optionsFor, receiptLines, requestCell, rowsFor, take } from "../state/locale-acts";
import { LawDoor, LawDoors, RefusedByLaw, StepsLine } from "../state/act-terms";
import { CourtOrders } from "../state/CourtOrders";
import { LiveMissions } from "../state/LiveMissions";

/** The review's terms beyond what it does and what it costs, so a press on the row reviews everything the row drew. */
function reviewLines(option: LocaleActOption, matter: LocaleMatter | undefined): readonly ReviewLine[] {
  return [
    { label: "International standing", value: option.standingText },
    ...(matter ? [{ label: "The state's request", value: requestCell(option, matter) }] : []),
    { label: "The governor", value: option.assent ?? "Doesn't need their OK" },
    ...(option.risk ? [{ label: "Chance of an incident", value: `${Math.round(option.risk.odds * 100)}%` }] : []),
  ];
}

/** One chance drawn as a slim track with its figure, at the same place in every row so the eye reads it down the list. */
function OddsLine({ name, odds, cut }: { readonly name: string; readonly odds: number; readonly cut: number }) {
  return (
    <Row gap="sm" role="group" aria-label={`${name}: ${Math.round(odds * 100)}%`}>
      <Text variant="caption" tone="secondary" width={128}>
        {name}
      </Text>
      <View flex={1}>
        <Track value={odds} tone={odds >= cut ? "bad" : "watch"} slim />
      </View>
      <Text variant="caption" weight="strong" tabular width={40} textAlign="right">
        {Math.round(odds * 100)}%
      </Text>
    </Row>
  );
}

/** An act's price, what it does to the state's request, the governor's part and its odds, drawn the same in every row. */
function ActReadings({ option, matter }: { readonly option: LocaleActOption; readonly matter: LocaleMatter | undefined }) {
  return (
    <Column gap="xs">
      <Row gap="xs" wrap>
        <Tag tone="outline" icon="budget">
          {option.costText}
        </Tag>
        {option.commitment ? <Tag tone="outline" icon="unitGroundFormation">{`${option.commitment.weeklyText} a week`}</Tag> : null}
        {matter?.request ? <Tag tone={option.answers ? "success" : option.defers ? "warning" : "outline"}>{requestCell(option, matter)}</Tag> : null}
        {option.assent ? <Tag tone="outline" icon="subjectPerson">{option.assent}</Tag> : null}
      </Row>
      {option.risk ? <OddsLine name="Chance of an incident" odds={option.risk.odds} cut={0.4} /> : null}
      {option.litigation ? <OddsLine name="Chance someone sues" odds={option.litigation.filingChance} cut={0.4} /> : null}
    </Column>
  );
}

/** Under the press target: the law the act rests on as its own door, and the troop act's steps. */
function ActFoot({ option, proclaimed }: { readonly option: LocaleActOption; readonly proclaimed: boolean }) {
  if (!option.authority && !option.step) return null;
  return (
    <Column gap="xs" paddingHorizontal="sm" paddingBottom="sm">
      {option.step ? <StepsLine option={option} proclaimed={proclaimed} /> : null}
      {option.authority ? <LawDoor cite={option.authority.cite} title={option.authority.name} /> : null}
    </Column>
  );
}

type ActRowProps = { readonly option: LocaleActOption; readonly matter: LocaleMatter | undefined; readonly proclaimed: boolean; readonly onTake: () => void; readonly busy: boolean };

/** One act as a row of results: its name and what it does, then its price, the governor's part and its odds drawn beside it. A press opens the review. */
function ActRow({ option, matter, proclaimed, onTake, busy }: ActRowProps) {
  const locked = option.locked !== undefined;
  const force = isForceAct(option.id);
  const body = (
    <Column gap="xs" alignSelf="stretch">
      <Row gap="sm" top>
        <Icon name={COERCION_ICON[option.id]} size={18} tone={locked ? "colorTertiary" : force ? "danger" : "gold"} />
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
  return (
    <Surface level="base" pad="none" role="listitem" overflow="hidden" {...(force ? { accentEdge: "danger" as const } : {})} {...(locked ? { opacity: 0.85 } : {})}>
      {locked ? (
        <View padding="sm">{body}</View>
      ) : (
        <Pressable role="button" aria-label={`${VERBS[option.id]}. ${option.summary} Cost ${option.costText}. Opens the review.`} aria-disabled={busy} onPress={busy ? undefined : onTake} padding="sm" backgroundColor={{ default: "transparent", hover: "surfaceHover", press: "backgroundPress" }}>
          {body}
        </Pressable>
      )}
      <ActFoot option={option} proclaimed={proclaimed} />
    </Surface>
  );
}

const GROUP_WORDS: Readonly<Record<LocaleActGroup, string>> = {
  relief: "Relief and time",
  enforcement: "Federal law enforcement",
  military: "The military",
  investigation: "Investigation and surveillance",
};

/** The options in their groups, in the engine's order, each group named once above its rows. */
function grouped(options: readonly LocaleActOption[]): readonly { readonly group: LocaleActGroup; readonly options: readonly LocaleActOption[] }[] {
  const order = [...new Set(options.map((option) => option.group))];
  return order.map((group) => ({ group, options: options.filter((option) => option.group === group) }));
}

function MatterPicker({ matters, chosen, onCause }: { readonly matters: readonly LocaleMatter[]; readonly chosen: LocaleMatter; readonly onCause: (cause: ConditionKind) => void }) {
  if (matters.length < 2) return null;
  return (
    <Row gap="xs" wrap role="radiogroup" aria-label="Which problem to answer">
      {matters.map((matter) => {
        const on = matter.cause === chosen.cause;
        return (
          <Pressable key={matter.cause} role="radio" aria-checked={on} onPress={() => onCause(matter.cause)} minHeight={44} justifyContent="center" paddingVertical="xs" paddingHorizontal="sm" borderRadius="pill" borderWidth={1} borderColor={on ? "accent" : "borderColor"} backgroundColor={on ? { default: "accentFill", hover: "accentFillHover" } : { default: "surface", hover: "surfaceHover" }}>
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

type CompareProps = { readonly open: boolean; readonly onClose: () => void; readonly name: string; readonly options: readonly LocaleActOption[]; readonly matter: LocaleMatter | undefined; readonly waiting: LocaleWaiting | undefined; readonly unprovoked: boolean; readonly proclaimed: boolean; readonly onTake: (option: LocaleActOption) => void; readonly busy: boolean };

/** Every choice as its change from today, over the page; authorizing closes it and opens the same review a row does. */
function CompareSheet({ open, onClose, name, options, matter, waiting, unprovoked, proclaimed, onTake, busy }: CompareProps) {
  const [selected, setSelected] = useState<string | undefined>(undefined);
  const chosen = options.find((option) => option.id === selected);
  return (
    <Sheet open={open} onClose={onClose} wide eyebrow={name} title={unprovoked ? "Compare sending federal forces" : "Compare your choices"}>
      <Column gap="md">
        <LawTopicHelp topic="domestic-force" compact />
        <CompareChoices
          title={matter ? matter.title : `Federal forces in ${name}`}
          options={optionsFor(options)}
          rows={rowsFor(options, matter, proclaimed)}
          selected={selected}
          onSelect={setSelected}
          verb={chosen ? VERBS[chosen.id] : "Nothing chosen yet"}
          danger={unprovoked || (chosen ? isForceAct(chosen.id) : false)}
          footnote={<LawDoors options={options} />}
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
  const choices = offered(options);
  const refused = options.filter((option) => option.refusedByLaw);
  const listed = unprovoked && !showForces ? [] : choices;
  const proclaimed = liveProclamation(campaign, state) !== undefined;
  return (
    <Column gap="sm">
      {act.layer}
      <Row between gap="sm" wrap>
        <Text variant="label">{unprovoked ? "Federal forces" : "What you can do"}</Text>
        {matter ? <Tag tone={matter.request ? "warning" : "outline"}>{matter.request ? "The state asked" : "Not asked"}</Tag> : null}
      </Row>
      {matter ? <MatterPicker matters={matters} chosen={matter} onCause={onCause} /> : null}
      {matter ? <Situation matter={matter} /> : <Text variant="caption" tone="secondary">{`Nothing in ${name} needs an answer from you right now. Routine federal enforcement can still go in, and people will read it as your choice rather than a response.`}</Text>}
      <ReadingFrame title="Risks, act by act" unit="% chance" legend={toneKey({ watch: "Under 40%", bad: "40% or more" })} pressHint="Press an act to review it." help={{ meaning: "Sending force or collecting information on Americans can go wrong, and an order can be taken to court. Each bar is a chance for that act: an incident, or a lawsuit against the order. A fuller bar is a worse chance. Whether either happens is shown later, never before you act." }}>
        <Column gap="sm" role="list" aria-label={`Acts for ${name}`}>
          {grouped(listed).map((entry) => (
            <Column key={entry.group} gap="xs">
              {listed.length > 2 ? <Text variant="caption" weight="strong" tone="secondary">{GROUP_WORDS[entry.group]}</Text> : null}
              {entry.options.map((option) => (
                <ActRow key={option.id} option={option} matter={matter} proclaimed={proclaimed} busy={act.busy} onTake={() => start(option)} />
              ))}
            </Column>
          ))}
        </Column>
      </ReadingFrame>
      {listed.length > 0 ? refused.map((option) => <RefusedByLaw key={option.id} option={option} />) : null}
      <ListControls unprovoked={unprovoked} showing={showForces} onShowing={() => setShowForces((was) => !was)} canCompare={listed.length > 0} onCompare={() => setComparing(true)} />
      <ActProblem problem={act.problem} />
      <LiveMissions campaign={campaign} state={state} />
      <CourtOrders campaign={campaign} state={state} />
      <CompareSheet
        open={comparing}
        onClose={() => setComparing(false)}
        name={name}
        options={choices}
        matter={matter}
        waiting={waiting}
        unprovoked={unprovoked}
        proclaimed={proclaimed}
        busy={act.busy}
        onTake={(option) => {
          setComparing(false);
          start(option);
        }}
      />
    </Column>
  );
}
