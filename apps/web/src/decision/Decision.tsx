import { useMemo, useState } from "react";
import { createRngStreams, openConversation, type Campaign, type ReplyProjection } from "@admin/engine";
import { scenarioOccurrenceKey, type CastScenario } from "@admin/content";
import {
  beatsWithoutParticularRestatement,
  briefMatters,
  decisionComparison,
  decisionOutcomes,
  pendingConversations,
  scenarioDispositions,
  scenarioMatterId,
  silenceLine,
  type DecisionComparison,
} from "@admin/player-core";
import { Button, CompareAuthorize, EmptyState, Icon, Tabs, buttonClass, type CompareOption, type IconBadgeTone, type IconName } from "@admin/ui-web";
import { Door } from "../shell/Door";
import { Screen } from "../shell/Screen";
import { FirstRun } from "../walkthrough/FirstRun";
import { useDecisionActs, type Decided } from "./acts";
import { Counsel } from "./Counsel";
import { DecisionReceipt } from "./DecisionReceipt";
import { useChoiceProjection } from "../modeling/ChoiceProjection";
import { Background, Situation } from "./Situation";

export type DecisionView = "advisers" | "background";

const upperFirst = (text: string): string => text.charAt(0).toUpperCase() + text.slice(1);

function counterpartName(campaign: Campaign, cast: CastScenario): string {
  const nation = campaign.nations[cast.counterpart];
  return nation && cast.counterpart !== campaign.founding.nation ? nation.base.identity.name : "The public";
}

const TONE_LOOK: Readonly<Record<string, { readonly icon: IconName; readonly accent: IconBadgeTone }>> = {
  firm: { icon: "escalate", accent: "red" },
  coercive: { icon: "instrumentMilitary", accent: "red" },
  conciliatory: { icon: "summit", accent: "blue" },
  principled: { icon: "law", accent: "gold" },
  evasive: { icon: "hidden", accent: "neutral" },
};
const FALLBACK_LOOK: { readonly icon: IconName; readonly accent: IconBadgeTone } = { icon: "decision", accent: "blue" };

/** Each answer as one row of the results list, with its cost, odds, moves and worst case drawn from the same comparison. */
function choiceOptions(comparison: DecisionComparison): readonly CompareOption[] {
  const outcomes = decisionOutcomes(comparison);
  return comparison.options.map((option, index) => ({
    id: option.id,
    label: upperFirst(option.tone),
    ...(TONE_LOOK[option.tone] ?? FALLBACK_LOOK),
    outcome: outcomes[index]!,
    ...(option.locked ? { unavailable: `Not available: ${option.locked}` } : {}),
  }));
}

function Dispositions({ campaign, cast, busy, onDispose }: { readonly campaign: Campaign; readonly cast: CastScenario; readonly busy: boolean; readonly onDispose: (kind: ReturnType<typeof scenarioDispositions>[number]["kind"]) => void }) {
  const dispositions = scenarioDispositions(campaign, cast);
  if (dispositions.length === 0) return null;
  return (
    <section className="dispositions" aria-labelledby="decision-without">
      <h2 id="decision-without" className="situation__label">
        <Icon name="schedule" size={18} /> Without answering
      </h2>
      <ul className="dispositions__list">
        {dispositions.map((disposition) => (
          <li key={disposition.kind} className="disposition">
            <Button kind={disposition.kind === "defer" ? "secondary" : "danger"} size="sm" icon={<Icon name={disposition.kind === "defer" ? "schedule" : "caution"} size={16} />} disabled={busy || disposition.unavailable !== undefined} onClick={() => onDispose(disposition.kind)}>
              {disposition.label}
            </Button>
            <p className="disposition__detail">{disposition.unavailable ?? disposition.detail}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

function reviewOf(reply: ReplyProjection | undefined): string | undefined {
  if (!reply) return undefined;
  const timing = reply.timing?.days ? ` It runs on its own clock (${reply.timing.label.toLowerCase()}). Some costs apply right away.` : "";
  return `You will say: “${reply.option.text}”${timing} Your answer and its costs go on the Record.`;
}

function DecisionDesk({ campaign, cast, view, onView, onDone }: { readonly campaign: Campaign; readonly cast: CastScenario; readonly view: DecisionView; readonly onView: (view: DecisionView) => void; readonly onDone: (decided: Decided) => void }) {
  const thread = useMemo(() => openConversation(campaign, cast.script, createRngStreams(campaign.seed)), [campaign, cast]);
  const comparison = useMemo(() => decisionComparison(campaign, cast.script, thread.replies, counterpartName(campaign, cast)), [campaign, cast, thread]);
  const options = useMemo(() => choiceOptions(comparison), [comparison]);
  const [selected, setSelected] = useState<string | undefined>(undefined);
  const acts = useDecisionActs(campaign, cast, onDone);
  const reply = thread.replies.find((entry) => entry.option.id === selected);
  const projection = useChoiceProjection(campaign, { kind: "decision", id: cast.def.id }, selected);
  const clock = briefMatters(campaign).find((matter) => matter.id === scenarioMatterId(scenarioOccurrenceKey(cast)))?.clock;
  const beats = beatsWithoutParticularRestatement(thread.beats, cast.def.particulars);
  return (
    <Screen icon="decision" title={cast.script.subject} eyebrow="Decision" screenClass="workspace" camera="us">
      <div className="decision">
        <Situation campaign={campaign} cast={cast} beats={beats} {...(clock ? { clock } : {})} />
        <p className="decision__legend">
          The moves are estimates from your staff&rsquo;s current model, not outcomes. Program borrowing is an estimate; the Record shows what was booked. Picking a row commits nothing until you press the button at the bottom.
        </p>
        <CompareAuthorize
          title="Compare the answers"
          options={options}
          rows={[]}
          selected={selected}
          onSelect={setSelected}
          verb={reply?.timing?.days ? "Start preparing" : "Give this answer"}
          onAuthorize={() => reply && void acts.answer(reply)}
          review={reviewOf(reply)}
          baselineReview={silenceLine(campaign, cast)}
          busy={acts.busy}
          docked
          {...(projection ? { projection } : {})}
        />
        {acts.problem ? (
          <p className="decision__problem" role="alert">
            {acts.problem}
          </p>
        ) : null}
        <Dispositions campaign={campaign} cast={cast} busy={acts.busy} onDispose={(kind) => void acts.dispose(kind)} />
        <Tabs
          label="Counsel and evidence"
          tabs={[
            { id: "advisers", label: "Advisers", icon: "microphone" },
            { id: "background", label: "Background and history", icon: "archive" },
          ]}
          selected={view}
          onSelect={(id) => onView(id === "background" ? "background" : "advisers")}
        >
          {view === "background" ? (
            <Background campaign={campaign} cast={cast} beats={beats} />
          ) : reply ? (
            <Counsel campaign={campaign} script={cast.script} reply={reply} />
          ) : (
            <p className="moves__none">Pick an answer in the comparison to hear what your advisers say about it.</p>
          )}
        </Tabs>
      </div>
      <FirstRun />
    </Screen>
  );
}

function NotWaiting({ campaign }: { readonly campaign: Campaign }) {
  const next = pendingConversations(campaign)[0];
  return (
    <Screen title="This decision is not waiting" eyebrow="Decision" screenClass="workspace" camera="us">
      <EmptyState icon="emptyInbox" title="Nothing to answer here">
        It was answered, put off or withdrawn, or it belongs to another administration.{" "}
        {next ? <Door className={buttonClass("primary")} href={`/brief/decision/${encodeURIComponent(scenarioOccurrenceKey(next))}`}>Open the decision that is waiting</Door> : <Door href="/brief" className={buttonClass("secondary")}>Back to the Brief</Door>}
      </EmptyState>
      <p>
        <Door href="/record" className={buttonClass("ghost", "sm")}>
          Open the Record
        </Door>
      </p>
    </Screen>
  );
}

/** A decision on the President's desk: the situation, every answer against leaving it, and the receipt once it is decided. */
export function Decision({ campaign, id, view, onView }: { readonly campaign: Campaign; readonly id: string; readonly view: DecisionView; readonly onView: (view: DecisionView) => void }) {
  const [decided, setDecided] = useState<Decided | undefined>();
  const cast = pendingConversations(campaign).find((entry) => scenarioOccurrenceKey(entry) === id);
  if (decided) return <DecisionReceipt campaign={campaign} decided={decided} />;
  if (!cast) return <NotWaiting campaign={campaign} />;
  return <DecisionDesk campaign={campaign} cast={cast} view={view} onView={onView} onDone={setDecided} />;
}
