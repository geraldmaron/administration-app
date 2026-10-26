import { useState } from "react";
import { liveProclamation, underDeclaredEmergency, type Campaign, type ConditionKind } from "@admin/engine";
import { formatRatio, homeActOptions, localeActOptions, localeMatters, localeWaiting, place, stateApprovalReading, type LocaleActOption, type LocaleMatter, type LocaleWaiting } from "@admin/player-core";
import type { StateId } from "@admin/world";
import { Button, Column, Page, ReadingFrame, Text } from "@admin/ui";
import { CompareChoices, TrackRow } from "@admin/ui/nation";
import { BackButton } from "../../shell/BackButton";
import { back, go } from "../../shell/navigate";
import { ActDone, ActProblem } from "../ActDone";
import { useNationAct, type DoneAct } from "../act";
import { stateEyebrow } from "../format";
import { VERBS, isForceAct, offered, optionsFor, receiptLines, rowsFor, take } from "./locale-acts";
import { LawDoors, RefusedByLaw } from "./act-terms";
import { CourtOrders } from "./CourtOrders";
import { LiveMissions } from "./LiveMissions";
import { markEntry, toneKey } from "../keys";
import { LawTopicHelp } from "../Law";
import { MapPanelSlot } from "../MapPanelSlot";

type DeskProps = { readonly campaign: Campaign; readonly state: StateId; readonly title: string; readonly options: readonly LocaleActOption[]; readonly matter?: LocaleMatter; readonly waiting?: LocaleWaiting | undefined; readonly unprovoked?: boolean };

function Desk({ campaign, state, title, options, matter, waiting, unprovoked }: DeskProps) {
  const [selected, setSelected] = useState<string | undefined>(undefined);
  const act = useNationAct(campaign);
  const name = campaign.states[state]?.base.name ?? state;
  const choices = offered(options);
  const refused = options.filter((option) => option.refusedByLaw);
  const chosen = choices.find((option) => option.id === selected);
  const unrestHere = unprovoked === true && localeMatters(campaign, state).some((entry) => entry.cause === "unrest");
  if (act.done) return <LocaleReceipt state={state} done={act.done} option={chosen} />;
  return (
    <Page eyebrow={stateEyebrow(state, name)} icon={unprovoked ? "shield" : "dispatch"} title={title}>
      {act.layer}
      <MapPanelSlot title={`${name} by approval`} lens="approval" camera={`state:${state}`} selection={`state:${state}`}>
        <Situation campaign={campaign} state={state} matter={matter} />
      </MapPanelSlot>
      {unrestHere ? (
        <Column gap="sm">
          <Text variant="body" tone="secondary">
            There is civil unrest in {name}. The choices that answer it, including the steps the law grants only against disorder, are on its own page.
          </Text>
          <Button kind="secondary" size="compact" iconAfter="chevron" onPress={() => go(place.stateAct(state, "unrest"))}>
            Answer the civil unrest
          </Button>
        </Column>
      ) : null}
      {unprovoked && !unrestHere ? (
        <Text variant="body" tone="secondary">
          Nothing here is asking for an answer. Routine federal enforcement can still go in on your say-so, and people will read it as your choice rather than a response. Force aimed at disorder waits until there is disorder to answer, and each step after that waits on the law that grants it.
        </Text>
      ) : null}
      <LawTopicHelp topic="domestic-force" compact />
      <CompareChoices
        title={unprovoked ? "Compare sending federal forces" : "Compare your choices"}
        options={optionsFor(choices)}
        rows={rowsFor(choices, matter, liveProclamation(campaign, state) !== undefined)}
        selected={selected}
        onSelect={setSelected}
        verb={chosen ? VERBS[chosen.id] : "Nothing chosen yet"}
        danger={unprovoked || (chosen ? isForceAct(chosen.id) : false)}
        onAuthorize={() => chosen && take(act, chosen, name)}
        {...(chosen ? { review: unprovoked ? `${chosen.name} for ${name}, without being asked. Cost now: ${chosen.costText}, and ${chosen.standingText} of international standing. It goes on your Record.` : `${chosen.name} for ${name}. Cost now: ${chosen.costText}. It goes on your Record.` } : {})}
        {...(waiting ? { waiting: waiting.line } : {})}
        footnote={<LawDoors options={choices} />}
        busy={act.busy}
      />
      {refused.map((option) => (
        <RefusedByLaw key={option.id} option={option} />
      ))}
      <ActProblem problem={act.problem} />
      <LiveMissions campaign={campaign} state={state} />
      <CourtOrders campaign={campaign} state={state} />
      <BackButton parent={place.state(state)} parentLabel={name} />
    </Page>
  );
}

function Situation({ campaign, state, matter }: { readonly campaign: Campaign; readonly state: StateId; readonly matter: LocaleMatter | undefined }) {
  const approval = stateApprovalReading(campaign, state);
  return (
    <Column gap="sm">
      {matter ? <Text variant="body">{matter.request ? matter.request.reason : "The state hasn't asked you for help with this."}</Text> : null}
      <ReadingFrame title="How bad it is and how the state sees you" unit="% of the worst damage, and % of the state who approve" legend={[markEntry("half", "Half the state"), ...toneKey({ bad: "Severe: 70% or more", reading: "Other readings" })]} help={{ meaning: "The first bar is how much damage the problem does as a share of the worst it could do. The second is the share of people in the state who approve of you, with a line at half the state." }}>
        <Column gap="xs">
          {matter?.severity !== undefined ? <TrackRow name="How severe" figure={`${Math.round(matter.severity * 100)}%`} value={matter.severity} tone={matter.severity >= 0.7 ? "bad" : "reading"} /> : null}
          {approval ? <TrackRow name="Approval here" figure={formatRatio(approval.approval)} value={approval.approval} marks={[{ at: 0.5, label: "Half the state" }]} /> : null}
        </Column>
      </ReadingFrame>
      <Text variant="caption" tone="secondary">
        {underDeclaredEmergency(campaign, state) ? "An emergency declaration covers this state." : "No emergency declaration covers this state."}
      </Text>
    </Column>
  );
}

/** The proof a locale act was taken: cost, what became of the state's request, what went wrong if anything, and what moved. */
function LocaleReceipt({ state, done, option }: { readonly state: StateId; readonly done: DoneAct; readonly option: LocaleActOption | undefined }) {
  const name = done.after.states[state]?.base.name ?? state;
  const lines = receiptLines(done, state, option);
  return (
    <Page eyebrow={stateEyebrow(state, name)} icon="approve" title={name}>
      <ActDone done={{ ...done, lines }} onBack={() => back(place.state(state))} backLabel={`Back to ${name}`} />
    </Page>
  );
}

/** One locale act against one matter in one state: every act as its change from today, authorized once, then its receipt. */
export function LocaleActDesk({ campaign, state, cause }: { readonly campaign: Campaign; readonly state: StateId; readonly cause: ConditionKind }) {
  const matter = localeMatters(campaign, state).find((entry) => entry.cause === cause);
  const name = campaign.states[state]?.base.name ?? state;
  if (!matter) {
    return (
      <Page eyebrow={stateEyebrow(state, name)} title={`Nothing to answer in ${name}`} lede="This has already ended, or it has been answered.">
        <BackButton parent={place.state(state)} parentLabel={name} />
      </Page>
    );
  }
  return <Desk campaign={campaign} state={state} title={`${matter.title} in ${name}`} options={localeActOptions(campaign, state, matter.cause)} matter={matter} waiting={localeWaiting(campaign, state, matter.cause)} />;
}

/** Force or collection sent into a state on the President's own initiative, priced as the overreach the country will read it as. */
export function PowerActDesk({ campaign, state }: { readonly campaign: Campaign; readonly state: StateId }) {
  const name = campaign.states[state]?.base.name ?? state;
  return <Desk campaign={campaign} state={state} title={`Federal forces in ${name}`} options={homeActOptions(campaign, state)} unprovoked />;
}
