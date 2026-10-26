import { useMemo, useState } from "react";
import { createRngStreams, openConversation, type Campaign } from "@admin/engine";
import { scenarioOccurrenceKey, type CastScenario } from "@admin/content";
import { beatsWithoutParticularRestatement, briefMatters, decisionCamera, decisionComparison, pendingConversations, place, scenarioDispositions, scenarioMatterId, silenceLine, type MatterClock, type ScenarioDispositionKind } from "@admin/player-core";
import { Button, Column, HelpButton, Icon, Loading, Page, Row, Section, Segmented, Sticky, Surface, Text, useMedia } from "@admin/ui";
import { CompareAuthorize } from "@admin/ui/review";
import { useOpenAuthority } from "../law/AuthorityProvider";
import { BackButton } from "../shell/BackButton";
import { termRelated } from "../handbook/term-door";
import { ReviewBoundary } from "../review/PresidentialReview";
import { useDecisionActs, type Decided } from "./acts";
import { answerAuthorities } from "./authority";
import { AnswerLaw } from "./AnswerLaw";
import { choiceOptions, counterpartName, dangerOf, reviewOf, verbOf } from "./choices";
import { Counsel } from "./Counsel";
import { DecisionReceipt } from "./DecisionReceipt";
import { DecisionRelated } from "./DecisionRelated";
import { decisionLetterhead } from "./letterhead";
import { Problem, go, useCarryingOut } from "./parts";
import { useChoiceProjection } from "./projection/ChoiceProjection";
import { kindIcon } from "./ScenarioTags";
import { Background, Briefing, Status } from "./Situation";

export type DecisionView = "advisers" | "background";

const HOW_IT_WORKS = {
  title: "How decisions work",
  meaning: "While a decision waits on your desk, time stops until you answer it, put it off, or decline it. Each row shows what one answer changes from today, and the line above them says what not answering costs. The numbers are your staff's best guesses right now.",
  steps: [
    "Pick an answer to read it in full. Picking one doesn't commit you to anything.",
    "Press the button with the action's name to see your final review.",
    "Confirm it. If things changed since you read it, nothing goes through, and you can take another look.",
    "The receipt shows what changed, and your choice goes on your Record.",
  ],
};

function Dispositions({ campaign, cast, busy, onDispose }: { readonly campaign: Campaign; readonly cast: CastScenario; readonly busy: boolean; readonly onDispose: (kind: ScenarioDispositionKind) => void }) {
  const dispositions = scenarioDispositions(campaign, cast);
  if (dispositions.length === 0) return null;
  return (
    <Section icon="schedule" title="Other ways to handle it">
      {dispositions.map((disposition) => (
        <Row key={disposition.kind} gap="md" wrap top>
          <Button kind={disposition.kind === "defer" ? "secondary" : "danger"} size="compact" icon={disposition.kind === "defer" ? "schedule" : "caution"} disabled={busy || disposition.unavailable !== undefined} onPress={() => onDispose(disposition.kind)}>
            {disposition.label}
          </Button>
          <Text variant="caption" tone="secondary" flex={1} minWidth={200}>
            {disposition.unavailable ?? disposition.detail}
          </Text>
        </Row>
      ))}
    </Section>
  );
}

function useDesk(campaign: Campaign, cast: CastScenario) {
  const thread = useMemo(() => openConversation(campaign, cast.script, createRngStreams(campaign.seed)), [campaign, cast]);
  const comparison = useMemo(() => decisionComparison(campaign, cast.script, thread.replies, counterpartName(campaign, cast)), [campaign, cast, thread]);
  const beats = useMemo(() => beatsWithoutParticularRestatement(thread.beats, cast.def.particulars), [thread, cast]);
  const head = useMemo(() => decisionLetterhead(campaign, cast, thread.beats), [campaign, cast, thread]);
  const clock = briefMatters(campaign).find((matter) => matter.id === scenarioMatterId(scenarioOccurrenceKey(cast)))?.clock;
  return { thread, comparison, beats, head, clock };
}

function deskLede(clock: MatterClock | undefined): string {
  if (!clock) return "No deadline, and time stays held until you answer.";
  return `${clock.left} ${clock.unit}${clock.left === 1 ? "" : "s"} left to answer, and time stays held until you do.`;
}

function DecisionDesk({ campaign, cast, view, onView, onDone }: { readonly campaign: Campaign; readonly cast: CastScenario; readonly view: DecisionView; readonly onView: (view: DecisionView) => void; readonly onDone: (decided: Decided) => void }) {
  const media = useMedia();
  const openLaw = useOpenAuthority();
  const { thread, comparison, beats, head, clock } = useDesk(campaign, cast);
  const [selected, setSelected] = useState<string | undefined>(undefined);
  const acts = useDecisionActs(campaign, cast, onDone);
  const reply = thread.replies.find((entry) => entry.option.id === selected);
  const projection = useChoiceProjection(campaign, { kind: "decision", id: cast.def.id }, selected);
  const options = useMemo(() => choiceOptions(comparison).map((option) => {
    const answer = thread.replies.find((entry) => entry.option.id === option.id);
    const cited = answer ? answerAuthorities(answer, campaign) : [];
    return cited.length > 0 ? { ...option, foot: <AnswerLaw cited={cited} onOpen={openLaw} /> } : option;
  }), [comparison, thread, openLaw, campaign]);
  const sideBody = <Column gap="lg"><Status cast={cast} {...(clock ? { clock } : {})} /><DecisionRelated campaign={campaign} cast={cast} head={head} selection={decisionCamera(cast).selection} /></Column>;
  const side = media.desktop ? <Sticky width={360}>{sideBody}</Sticky> : <Column width="100%">{sideBody}</Column>;
  return (
    <Page icon={kindIcon(cast)} eyebrow={`Decision · ${head.issuer}`} title={cast.script.subject} lede={deskLede(clock)} actions={<HelpButton content={{ ...HOW_IT_WORKS, related: termRelated("put-off", "put off") }} label="How decisions work" />}>
      <Row><BackButton parent={place.brief()} parentLabel="Brief" /></Row>
      <Row gap="xl" top wrap={!media.desktop}>
        <Column flex={1} minWidth={0} gap="lg">
          <Briefing campaign={campaign} cast={cast} beats={beats} head={head} />
        </Column>
        {side}
      </Row>
      <Surface level="flat" pad="none">
        <Row gap="xs" top>
          <Icon name="info" size={16} tone="colorSecondary" />
          <Text variant="caption" tone="secondary" flex={1}>
            These numbers are your staff's best guesses, not results. Any borrowing for a program is a guess too, and the Record shows what was actually borrowed.
          </Text>
        </Row>
      </Surface>
      <CompareAuthorize title="Compare the answers" options={options} selected={selected} onSelect={setSelected} verb={verbOf(reply)} tone={dangerOf(reply) ? "danger" : "commit"} onAuthorize={() => reply && void acts.answer(reply)} {...(reviewOf(reply) ? { review: reviewOf(reply)! } : {})} waiting={silenceLine(campaign, cast)} busy={acts.busy} {...(projection ? { projection } : {})} />
      <Problem words={acts.problem} />
      <Dispositions campaign={campaign} cast={cast} busy={acts.busy} onDispose={(kind) => void acts.dispose(kind)} />
      <Section icon={view === "background" ? "archive" : "microphone"} title="Advice and background">
        <Segmented label="Show" options={[{ value: "advisers", label: "Advisers", icon: "microphone" }, { value: "background", label: "Background and history", icon: "archive" }]} value={view} onChange={onView} />
        {view === "background" ? <Background campaign={campaign} cast={cast} beats={beats} /> : reply ? <Counsel campaign={campaign} script={cast.script} reply={reply} /> : <Text variant="body" tone="secondary">Your advisers weigh in on the answer you pick.</Text>}
      </Section>
    </Page>
  );
}

function NotWaiting({ campaign }: { readonly campaign: Campaign }) {
  const next = pendingConversations(campaign)[0];
  return (
    <Page icon="decision" eyebrow="Decision" title="This decision isn't waiting on you" lede="It was answered, put off, or withdrawn, or it belongs to a different administration.">
      <Row gap="sm" wrap>
        {next ? (
          <Button kind="primary" icon="decision" onPress={() => go(place.decision(scenarioOccurrenceKey(next)))}>
            Open the decision that's waiting
          </Button>
        ) : (
          <BackButton parent={place.brief()} parentLabel="Brief" />
        )}
        <Button kind="quiet" icon="record" onPress={() => go(place.record())}>
          Open the Record
        </Button>
      </Row>
    </Page>
  );
}

/** A decision on the President's desk: the briefing, every answer as its change from today, and the receipt once it is decided. */
export function Decision({ campaign, id, view, onView }: { readonly campaign: Campaign; readonly id: string; readonly view: DecisionView; readonly onView: (view: DecisionView) => void }) {
  const [decided, setDecided] = useState<Decided | undefined>();
  const cast = pendingConversations(campaign).find((entry) => scenarioOccurrenceKey(entry) === id);
  // The save takes the decision off the desk a moment before its result arrives; a page that held it says it is being carried out, not that it was never there.
  const carrying = useCarryingOut(cast !== undefined);
  // The review outlives the desk: its result stays open over the receipt that replaces the desk.
  return (
    <ReviewBoundary>
      {decided ? <DecisionReceipt campaign={campaign} decided={decided} here={place.decision(id)} /> : cast ? <DecisionDesk campaign={campaign} cast={cast} view={view} onView={onView} onDone={setDecided} /> : carrying ? <Loading title="Carrying out your answer" /> : <NotWaiting campaign={campaign} />}
    </ReviewBoundary>
  );
}
