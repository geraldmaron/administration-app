import { useState } from "react";
import { SCANDAL_RESPONSE_LABELS, respondToScandal, scandalAnswer, scandalCounselRead, selectDateOfTurn, selectScandalBoard, selectPerson, selectScandals, sentenceCase, type Campaign, type Scandal } from "@admin/engine";
import { formatDate, formatRatio, place, roleTitle, sealFor } from "@admin/player-core";
import { CardLink, Column, Icon, Masthead, Meter, Page, ReadingFrame, Row, Section, Tag, Text, useMedia } from "@admin/ui";
import { CompareAuthorize, Stages } from "@admin/ui/review";
import { PersonFace } from "../dossier/PersonFace";
import { feedHref } from "../news/press-params";
import { ReviewBoundary } from "../review/PresidentialReview";
import { BackButton } from "../shell/BackButton";
import { termDoor } from "../handbook/term-door";
import { useAuthorize } from "../review/use-authorize";
import { FactGrid } from "@admin/ui/record";
import { Problem, RowLink, go } from "./parts";
import { ResultBody } from "./ResultPage";
import { actsChoice, useChoiceProjection } from "./projection/ChoiceProjection";
import { LANDED, READS, READ_STEP, READ_WORDS, SILENCE_LINE, STAGES, STAGE_WORDS, scandalAlternatives, scandalOptions, verbOf } from "./scandal-model";

type Board = ReturnType<typeof selectScandalBoard>[number] | undefined;

const HEAT_KEY = [{ id: "heat", kind: "swatch", label: "How hot the story is", ink: "danger" }, { id: "track", kind: "swatch", label: "Room left to cool", ink: "borderColorStrong" }] as const;

function Heat({ scandal, weeks }: { readonly scandal: Scandal; readonly weeks?: number }) {
  const at = STAGES.indexOf(scandal.stage);
  return (
    <Section icon="press" title="Where the story stands">
      <ReadingFrame title="How hot the story is" unit="% of its peak attention" period="This week" legend={HEAT_KEY} help={{ meaning: "The bar is how much attention the story is getting right now. The steps under it show which stage it is in: breaking, developing, fading, then over.", steps: ["A fuller bar means more reporters are asking.", "A story moves through the stages on its own unless something feeds it.", "Your answer changes how fast it cools."], term: termDoor("scandal", "scandal") }}>
        <Meter label="How hot it is" value={scandal.stage === "resolved" ? 0 : scandal.intensity} figure={scandal.stage === "resolved" ? "Over" : formatRatio(scandal.intensity)} tone="danger" />
        <Stages label={`Stage: ${STAGE_WORDS[scandal.stage]}`} stages={STAGES.map((stage, index) => ({ id: stage, label: STAGE_WORDS[stage], state: index < at ? "done" : index === at ? "now" : "ahead" }))} />
      </ReadingFrame>
      {weeks !== undefined ? <Text variant="caption" tone="secondary">{weeks === 0 ? "Broke this week" : `In the news for ${weeks} ${weeks === 1 ? "week" : "weeks"}`}</Text> : null}
    </Section>
  );
}

function Named({ campaign, scandal }: { readonly campaign: Campaign; readonly scandal: Scandal }) {
  const implicated = scandal.implicated;
  if (!implicated) return <Text variant="body" tone="secondary">The story doesn't name anyone in your government. It's about the White House as a whole.</Text>;
  const name = selectPerson(campaign, implicated.person)?.base.name ?? "A former official";
  return (
    <CardLink label={`Open ${name}'s file`} href={place.person(implicated.person)} onPress={() => go(place.person(implicated.person))} pad="sm" flexDirection="row" alignItems="center" gap="md" minHeight={44}>
      <PersonFace campaign={campaign} id={implicated.person} name={name} size={44} />
      <Column flex={1}>
        <Text variant="label">{name}</Text>
        <Text variant="caption" tone="secondary">
          {implicated.role ? roleTitle(implicated.role) : "Used to work in your administration"}
        </Text>
      </Column>
      <Icon name="chevron" size={16} tone="colorTertiary" />
    </CardLink>
  );
}

function Allegations({ campaign, scandal }: { readonly campaign: Campaign; readonly scandal: Scandal }) {
  return (
    <Section icon="caution" title="What the papers are saying" actions={<Tag tone="warning">Alleged</Tag>}>
      <Text variant="document">{scandal.context ?? "The papers have the accusation but not the full story yet."}</Text>
      <Named campaign={campaign} scandal={scandal} />
      <Text variant="caption" tone="secondary">These are claims in the press. None of it is proven until it's confirmed.</Text>
    </Section>
  );
}

function Established({ campaign, scandal, board }: { readonly campaign: Campaign; readonly scandal: Scandal; readonly board: Board }) {
  const weeks = board?.weeksRunning;
  return (
    <Section icon="approve" title="What we know for sure" actions={<Tag tone="success">Known</Tag>}>
      <FactGrid
        items={[
          { label: "Broke", value: scandal.brokeTurn >= 0 ? formatDate(selectDateOfTurn(campaign, scandal.brokeTurn)) : "Not dated" },
          { label: "Running", value: weeks === undefined ? "Not known" : weeks === 0 ? "This week" : `${weeks} ${weeks === 1 ? "week" : "weeks"}` },
          { label: "Stage", value: STAGE_WORDS[scandal.stage] },
          { label: "Who's keeping it going", value: board ? `${board.keptAliveBy.name} (how hostile to you: ${formatRatio(board.keptAliveBy.hostility)})` : "No news outlet is pushing it" },
        ]}
      />
      {board ? (
        <RowLink label={`See what ${board.keptAliveBy.name} is printing`} href={feedHref({ outlet: board.keptAliveBy.id })} onPress={() => go(feedHref({ outlet: board.keptAliveBy.id }))}>
          <Icon name="press" size={16} tone="colorSecondary" />
          <Text variant="label" flexShrink={1}>{`What ${board.keptAliveBy.name} is printing`}</Text>
        </RowLink>
      ) : null}
    </Section>
  );
}

function Assessment({ campaign, scandal }: { readonly campaign: Campaign; readonly scandal: Scandal }) {
  const read = scandalCounselRead(campaign.seed, scandal.id, scandal.charge);
  return (
    <Section icon="review" title="What your lawyer thinks the papers really have" actions={<Tag tone="info">Assessment</Tag>}>
      <Row gap="xs" wrap role="list" aria-label="Your lawyer's view">
        {READS.map((step) => (
          <Tag key={step} tone={step === read ? "info" : "outline"} {...(step === read ? { icon: "review" as const } : {})}>
            {READ_STEP[step]}
          </Tag>
        ))}
      </Row>
      <Text variant="body">{`${READ_WORDS[read]} This is your lawyer's opinion, not a proven fact.`}</Text>
    </Section>
  );
}

/** Committing an answer against the campaign it was read on. */
function useScandalAnswer(campaign: Campaign, scandal: Scandal) {
  const { busy, problem, authorize } = useAuthorize(campaign);
  const [answered, setAnswered] = useState<{ readonly date?: string; readonly eventId?: string; readonly saveError?: string }>({});
  async function answer(selected: string) {
    const verb = verbOf(selected);
    if (!verb) return;
    const authorized = await authorize(() => {
      const result = respondToScandal(campaign, scandal, verb);
      if (!result.ok) throw new Error(result.reason);
      return { packet: result.packet };
    }, { tier: "full", title: `Answer: ${SCANDAL_RESPONSE_LABELS[verb]}`, lines: [{ label: "Scandal", value: scandal.subject }], verb: "Give this answer", danger: verb !== "come-clean" }, { camera: "dc" });
    if (!authorized) return;
    setAnswered({ date: authorized.date, ...(authorized.eventId ? { eventId: authorized.eventId } : {}), ...(authorized.saveError ? { saveError: authorized.saveError } : {}) });
  }
  return { busy, problem, ...answered, answer };
}

type Acts = ReturnType<typeof useScandalAnswer>;

function Answers({ campaign, scandal, acts }: { readonly campaign: Campaign; readonly scandal: Scandal; readonly acts: Acts }) {
  const [selected, setSelected] = useState<string | undefined>(undefined);
  const projection = useChoiceProjection(campaign, actsChoice(scandal.subject, "letting the story run", "If you don't answer, the story keeps running.", scandalAlternatives(campaign, scandal)), selected);
  const verb = selected ? verbOf(selected) : undefined;
  return (
    <>
      <Assessment campaign={campaign} scandal={scandal} />
      <CompareAuthorize title="Compare the answers" options={scandalOptions(campaign, scandal)} selected={selected} onSelect={setSelected} verb="Give this answer" tone={verb && verb !== "come-clean" ? "danger" : "commit"} onAuthorize={() => selected && void acts.answer(selected)} review="You can only answer each story once, so this answer is final." waiting={SILENCE_LINE} busy={acts.busy} {...(projection ? { projection } : {})} />
      <Problem words={acts.problem} />
    </>
  );
}

function Answered({ campaign, scandal, answered, acts }: { readonly campaign: Campaign; readonly scandal: Scandal; readonly answered: NonNullable<ReturnType<typeof scandalAnswer>>; readonly acts: Acts }) {
  return <ResultBody campaign={campaign} title={`Answered: ${SCANDAL_RESPONSE_LABELS[answered.verb]}`} date={acts.date ?? ""} saveError={acts.saveError} eventId={acts.eventId} here={place.scandal(scandal.id)} lines={[{ label: "How it landed", value: LANDED[answered.price] }]} />;
}

/**
 * A running story about the administration: what is alleged apart from what
 * is established, its timeline, counsel's read of the file as an assessment,
 * and the three answers against staying silent.
 */
function ScandalScreen({ campaign, scandal }: { readonly campaign: Campaign; readonly scandal: Scandal }) {
  const media = useMedia();
  const acts = useScandalAnswer(campaign, scandal);
  const board = selectScandalBoard(campaign).find((row) => row.scandal.id === scandal.id);
  const answered = scandalAnswer(campaign, scandal.id, scandal.charge);
  const masthead = board ? <Masthead spec={sealFor(board.keptAliveBy.id, board.keptAliveBy.name)} name={board.keptAliveBy.name} size="compact" /> : undefined;
  return (
    <Page icon="press" eyebrow="A running story" title={sentenceCase(scandal.subject)} {...(masthead && !media.phone ? { emblem: masthead } : {})}>
      <Row><BackButton parent={place.brief()} parentLabel="Brief" /></Row>
      {masthead && media.phone ? masthead : null}
      <Heat scandal={scandal} {...(board ? { weeks: board.weeksRunning } : {})} />
      <Row gap="lg" top wrap>
        <Column flexGrow={1} flexShrink={1} flexBasis={320} minWidth={0}>
          <Allegations campaign={campaign} scandal={scandal} />
        </Column>
        <Column flexGrow={1} flexShrink={1} flexBasis={320} minWidth={0}>
          <Established campaign={campaign} scandal={scandal} board={board} />
        </Column>
      </Row>
      {answered ? <Answered campaign={campaign} scandal={scandal} answered={answered} acts={acts} /> : scandal.stage === "resolved" ? null : <Answers campaign={campaign} scandal={scandal} acts={acts} />}
    </Page>
  );
}

function NoSuchStory() {
  return (
    <Page icon="press" eyebrow="A running story" title="We couldn't find this story" lede="It may have wrapped up already.">
      <Row><BackButton parent={place.brief()} parentLabel="Brief" /></Row>
    </Page>
  );
}

export function Story({ campaign, id }: { readonly campaign: Campaign; readonly id: string }) {
  const scandal = selectScandals(campaign).find((story) => story.id === id);
  return <ReviewBoundary>{scandal ? <ScandalScreen campaign={campaign} scandal={scandal} /> : <NoSuchStory />}</ReviewBoundary>;
}
