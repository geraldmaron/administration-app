import { AuthorityHelp } from "../../help/AuthorityHelp";
import { useState, type ReactNode } from "react";
import { underDeclaredEmergency, type Campaign, type ConditionKind, type LocaleActId } from "@admin/engine";
import { REVIEW_WEEKS, homeActOptions, localeActOptions, localeMatters, localeWaiting, place, type LocaleActOption, type LocaleMatter } from "@admin/player-core";
import type { StateId } from "@admin/world";
import { CompareAuthorize, EmptyState, Gauge, Icon, buttonClass, type CompareOption, type CompareRow, type IconBadgeTone, type IconName } from "@admin/ui-web";
import { actsChoice, useChoiceProjection } from "../../modeling/ChoiceProjection";
import { Door } from "../../shell/Door";
import { MapView } from "../../map/MapView";
import { Screen } from "../../shell/Screen";
import { LocaleReceipt } from "./LocaleReceipt";
import { useLocaleAct, type LocaleDone } from "./use-locale-act";

/** Each act's one named verb. */
const VERBS: Readonly<Record<LocaleActId, string>> = {
  relief: "Send the relief",
  "request-deployment": "Ask the governor",
  federalize: "Federalize the Guard",
  waiver: "Grant the waiver",
  review: "Order the review",
  "property-surge": "Surge officers to protect property",
  "immigration-operation": "Launch the immigration operation",
  "task-force": "Stand up the task force",
  proclaim: "Proclaim the order to disperse",
  troops: "Send in the troops",
  priority: "Set the investigative priority",
  surveil: "Order the surveillance",
  "surveil-under-order": "Surveil under the court order",
};

function requestCell(option: LocaleActOption, matter: LocaleMatter): ReactNode {
  if (!matter.request) return <span className="cell-none">Nothing was asked</span>;
  if (option.answers) return <strong className="cell-good">Answers it</strong>;
  if (option.defers) return <span>Buys {REVIEW_WEEKS} more weeks</span>;
  return <span className="cell-none">Leaves it open</span>;
}

/**
 * The chance that force or collection aimed at Americans goes wrong: a
 * shooting, a clash, an exposure. Only the odds are shown; whether it happens
 * is read on the receipt.
 */
function RiskCell({ option }: { readonly option: LocaleActOption }) {
  if (!option.risk) return <span className="cell-none">No force or collection involved</span>;
  const { odds, recent, erratic } = option.risk;
  return (
    <span className="cell-risk">
      <Gauge shape="meter" label="Chance of an incident" labelHidden value={odds} valueText={`${Math.round(odds * 100)}%`} tone={odds >= 0.4 ? "bad" : "watch"} />
      <span className="cell-risk__note">
        {option.unprovoked ? "With no unrest to answer, it reads as overreach. " : ""}
        {recent > 0 ? `${recent} recent ${recent === 1 ? "act" : "acts"} like it raise the odds and the weight.` : "A death or an exposure becomes a scandal."}
        {erratic ? " Another in a row reads as reflex, and costs on its own." : ""}
      </span>
    </span>
  );
}

const COERCION_LOOK: Readonly<Partial<Record<string, { readonly icon: IconName; readonly accent: IconBadgeTone }>>> = {
  federalize: { icon: "unitGroundFormation", accent: "red" },
  "property-surge": { icon: "departmentInvestigation", accent: "red" },
  "immigration-operation": { icon: "departmentInvestigation", accent: "red" },
  "task-force": { icon: "departmentInvestigation", accent: "red" },
  proclaim: { icon: "unitGroundFormation", accent: "red" },
  "surveil-under-order": { icon: "intel", accent: "red" },
  troops: { icon: "instrumentMilitary", accent: "red" },
  surveil: { icon: "intel", accent: "red" },
};

function rowsFor(options: readonly LocaleActOption[], matter: LocaleMatter | undefined): readonly CompareRow[] {
  const cells = (cell: (option: LocaleActOption) => ReactNode) => Object.fromEntries(options.map((option) => [option.id, cell(option)]));
  return [
    { label: "What it does", kind: "lead", cells: cells((option) => <span>{option.summary}</span>) },
    { label: "Cost now", icon: "budget", cells: cells((option) => <strong className="cell-money" data-stance="adverse">{option.costText}</strong>) },
    {
      label: "Standing at home",
      icon: "mapPin",
      cells: cells((option) => <span data-stance={option.standing > 0 ? "adverse" : undefined}>{option.standingText}{option.unrequested ? " (the state did not ask)" : ""}</span>),
    },
    ...(matter
      ? [{ label: "The state's request", icon: "dispatch" as const, cells: cells((option) => requestCell(option, matter)) }]
      : []),
    { label: "The governor", icon: "subjectPerson", cells: cells((option) => <span>{option.assent ?? "Not needed"}</span>) },
    ...(options.some((option) => option.risk)
      ? [{ label: "If it goes wrong", icon: "caution" as const, cells: cells((option) => <RiskCell option={option} />) }]
      : []),
  ];
}

function compareOptions(options: readonly LocaleActOption[]): readonly CompareOption[] {
  return options.map((option) => ({ id: option.id, label: option.name, ...(COERCION_LOOK[option.id] ?? {}), ...(option.locked ? { unavailable: `Not available: ${option.locked}` } : {}) }));
}

/** The acts as a choice to project, each rebuilt on the run's own copy by the same option list its commit reads its packet from. */
function localeChoice(title: string, options: readonly LocaleActOption[], state: StateId, cause: ConditionKind | undefined) {
  return actsChoice(title, "waiting", "Waiting: nothing is sent.", options.map((option) => ({ id: option.id, label: option.name, ...(option.locked ? { refused: option.locked } : { act: { act: "locale" as const, state, option: option.id, ...(cause ? { cause } : {}) } }) })));
}

function Situation({ campaign, state, matter }: { readonly campaign: Campaign; readonly state: StateId; readonly matter: LocaleMatter }) {
  const declared = underDeclaredEmergency(campaign, state);
  return (
    <section className="locale-situation" aria-labelledby="locale-situation-title">
      <h2 id="locale-situation-title" className="brief-section__title">
        <Icon name="caution" size={20} /> The situation
      </h2>
      {matter.request ? <p className="locale-situation__request">{matter.request.reason}</p> : <p className="locale-situation__request">The state has not asked Washington for anything over this.</p>}
      {matter.severity !== undefined ? <Gauge shape="meter" label="How severe" value={matter.severity} valueText={`${Math.round(matter.severity * 100)}%`} tone={matter.severity >= 0.7 ? "risk" : "reading"} /> : null}
      <p className="brief-section__note">{declared ? "An emergency declaration reaches this state." : "No emergency declaration reaches this state."}</p>
    </section>
  );
}

function Desk({ campaign, state, matter, onDone }: { readonly campaign: Campaign; readonly state: StateId; readonly matter: LocaleMatter; readonly onDone: (done: LocaleDone) => void }) {
  const options = localeActOptions(campaign, state, matter.cause);
  const waiting = localeWaiting(campaign, state, matter.cause);
  const [selected, setSelected] = useState<string | undefined>(undefined);
  const act = useLocaleAct(campaign, state, onDone);
  const chosen = options.find((option) => option.id === selected);
  const name = campaign.states[state]?.base.name ?? state;
  const projection = useChoiceProjection(campaign, localeChoice(`${matter.title} in ${name}`, options, state, matter.cause), selected);
  return (
    <Screen icon="dispatch" title={`${matter.title} in ${name}`} eyebrow="Act on a state" screenClass="workspace" camera={`state:${state}`}>
      <div className="locale-desk">
        <MapView title={`${name} by approval`} lens="approval" camera={`state:${state}`} selection={`state:${state}`} height={320} />
        <AuthorityHelp topic="domestic-force" compact />
        <CompareAuthorize
          title="Compare the acts"
          options={compareOptions(options)}
          rows={rowsFor(options, matter)}
          selected={selected}
          onSelect={setSelected}
          verb={chosen ? VERBS[chosen.id] : "Choose an act"}
          tone={chosen?.id === "federalize" ? "danger" : "commit"}
          onAuthorize={() => chosen && void act.take(chosen)}
          review={chosen ? `${chosen.name} for ${name}: ${chosen.costText} now. It goes on your Record.` : undefined}
          {...(waiting ? { baselineReview: waiting.line } : {})}
          busy={act.busy}
          docked
          {...(projection ? { projection } : {})}
        />
        {act.problem ? (
          <p className="decision__problem" role="alert">
            {act.problem}
          </p>
        ) : null}
        <Situation campaign={campaign} state={state} matter={matter} />
        <Door href={place.state(state)} className={buttonClass("ghost", "sm")}>
          Back to {name}
        </Door>
      </div>
    </Screen>
  );
}

/**
 * Force or collection sent into a state on the President's own initiative,
 * with no unrest there to answer: the same cards, priced
 * as the overreach the country will read it as.
 */
function PowerDesk({ campaign, state, onDone }: { readonly campaign: Campaign; readonly state: StateId; readonly onDone: (done: LocaleDone) => void }) {
  const options = homeActOptions(campaign, state);
  const name = campaign.states[state]?.base.name ?? state;
  const [selected, setSelected] = useState<string | undefined>(undefined);
  const act = useLocaleAct(campaign, state, onDone);
  const chosen = options.find((option) => option.id === selected);
  const projection = useChoiceProjection(campaign, localeChoice(`Federal power in ${name}`, options, state, undefined), selected);
  return (
    <Screen icon="shield" title={`Federal power in ${name}`} eyebrow="Act on a state" screenClass="workspace" camera={`state:${state}`}>
      <div className="locale-desk">
        <MapView title={`${name} by approval`} lens="approval" camera={`state:${state}`} selection={`state:${state}`} height={320} />
        <p className="brief-section__note">
          The comparison retains these proposed capabilities for context, but they are unavailable. Generic unrest or an emergency declaration does not establish a federal law-enforcement mission or military authority. The required factual and legal prerequisites are not modeled.
        </p>
        <AuthorityHelp topic="domestic-force" compact />
        <CompareAuthorize
          title="Compare sending federal power"
          options={compareOptions(options)}
          rows={rowsFor(options, undefined)}
          selected={selected}
          onSelect={setSelected}
          verb={chosen ? VERBS[chosen.id] : "Choose an act"}
          tone="danger"
          onAuthorize={() => chosen && void act.take(chosen)}
          review={chosen ? `${chosen.name} for ${name}, unprovoked: ${chosen.costText} now and ${chosen.standingText} of standing. It goes on your Record.` : undefined}
          busy={act.busy}
          docked
          {...(projection ? { projection } : {})}
        />
        {act.problem ? (
          <p className="decision__problem" role="alert">
            {act.problem}
          </p>
        ) : null}
        <Door href={place.state(state)} className={buttonClass("ghost", "sm")}>
          Back to {name}
        </Door>
      </div>
    </Screen>
  );
}

/** Federal power sent unprompted, then its receipt. */
export function PowerActDesk({ campaign, state }: { readonly campaign: Campaign; readonly state: StateId }) {
  const [done, setDone] = useState<LocaleDone | undefined>();
  if (done) return <LocaleReceipt state={state} done={done} />;
  return <PowerDesk campaign={campaign} state={state} onDone={setDone} />;
}

/** One locale act against one matter in one state: every act beside waiting, authorized once, then its receipt. */
export function LocaleActDesk({ campaign, state, cause }: { readonly campaign: Campaign; readonly state: StateId; readonly cause: ConditionKind }) {
  const [done, setDone] = useState<LocaleDone | undefined>();
  const matter = localeMatters(campaign, state).find((entry) => entry.cause === cause);
  if (done) return <LocaleReceipt state={state} done={done} />;
  if (!matter) {
    const name = campaign.states[state]?.base.name ?? state;
    return (
      <Screen title={`Nothing to answer in ${name}`} eyebrow="Act on a state" screenClass="workspace" camera={`state:${state}`}>
        <EmptyState icon="emptyInbox" title="This matter is not open">
          It ended, or it was answered. <Door href={place.state(state)}>Back to {name}</Door>
        </EmptyState>
      </Screen>
    );
  }
  return <Desk campaign={campaign} state={state} matter={matter} onDone={setDone} />;
}
