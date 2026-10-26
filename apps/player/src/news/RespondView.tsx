import { useMemo, useState } from "react";
import { executiveOrder, framedThisWeek, type Campaign, type DecisionFramingKey } from "@admin/engine";
import {
  PRESS_ACTIONS,
  formatRatio,
  framingComparison,
  framingOffers,
  framingPacket,
  orderAuthorityRecord,
  place,
  podiumReading,
  pressActComparison,
  pressActPacket,
  pressCoverageTrend,
  pressDesks,
  pressHistory,
  runningStories,
  sealFor,
  takeTheHitComparison,
  takeTheHitPacket,
  type RunningStory,
} from "@admin/player-core";
import { CardLink, Column, Empty, EntityLink, Icon, Meter, ReadingFrame, Row, Seal, Sparkline, Sticky, Surface, Tag, Text, sparklineKey, useMedia } from "@admin/ui";
import { Segmented, Select } from "@admin/ui/forms";
import { termDoor } from "../handbook/term-door";
import { PressAct, type PressCommit } from "./PressAct";
import { feedHref } from "./press-params";
import { go } from "./story-parts";

/** A podium act rests on the President's executive power; no statute governs speaking to the press. */
const PODIUM_AUTHORITY = "U.S. Const. art. II, §1";

type Issue = "week" | "order" | "hit";

const STAGE_TONE = { breaking: "danger", developing: "warning", fading: "outline", resolved: "outline" } as const;

function PodiumBody({ podium }: { readonly podium: ReturnType<typeof podiumReading> }) {
  return (
    <Row gap="md" top>
      <Icon name="microphone" size={32} tone="gold" weight="fill" />
      <Column gap="xs" flex={1}>
        <Row gap="2xs">
          <Text variant="label" flex={1}>{podium.secretary ? `${podium.secretary.name}, Press Secretary` : "You don't have a press secretary, so you'll face the press yourself."}</Text>
          {podium.secretary ? <Icon name="chevron" size={16} tone="colorTertiary" /> : null}
        </Row>
        <Text variant="body">{podium.subject}</Text>
        <Text variant="caption" tone="secondary">{podium.silence}</Text>
      </Column>
    </Row>
  );
}

/** With a press secretary in the job, the whole card opens their file; without one there is nowhere to go. */
function Podium({ campaign }: { readonly campaign: Campaign }) {
  const podium = podiumReading(campaign);
  const secretary = podium.secretary;
  if (!secretary) {
    return (
      <Surface level="raised" accentEdge="gold">
        <PodiumBody podium={podium} />
      </Surface>
    );
  }
  return (
    <CardLink level="raised" accentEdge="gold" label={`Open ${secretary.name}'s file`} href={place.person(secretary.id)} onPress={() => go(place.person(secretary.id))}>
      <PodiumBody podium={podium} />
    </CardLink>
  );
}

function StoryRow({ story, oldest }: { readonly story: RunningStory; readonly oldest: number }) {
  return (
    <Column gap="xs">
    <CardLink pad="md" label={`Open the story, ${story.subject}`} href={story.href} onPress={() => go(story.href)} {...(story.stage === "breaking" ? { accentEdge: "danger" as const } : story.stage === "developing" ? { accentEdge: "warning" as const } : {})}>
      <Column gap="sm">
        <Row gap="sm" wrap>
          <Tag tone={STAGE_TONE[story.stage]}>{story.stageWord}</Tag>
          <Text variant="caption" tone="secondary">{story.age}</Text>
        </Row>
        <Text variant="label">{story.subject}</Text>
        <Meter label="Heat" value={story.heat} figure={formatRatio(story.heat)} tone="danger" />
        {story.weeks !== undefined ? <Meter label="Age compared with the oldest story" value={story.weeks / Math.max(1, oldest)} figure={`${story.weeks} of ${oldest} weeks`} tone="accent" /> : null}

      </Column>
    </CardLink>
        <Row gap="sm" wrap>
          <Text variant="caption" tone="secondary">Kept alive by</Text>
          <EntityLink label={story.keptAliveBy.name} icon="press" href={feedHref({ outlet: story.keptAliveBy.id })} onPress={() => go(feedHref({ outlet: story.keptAliveBy.id }))} />
        </Row>
    </Column>
  );
}

/** The stories still running against the administration, hottest first, each a door to the page where it is answered. */
function Running({ campaign }: { readonly campaign: Campaign }) {
  const stories = useMemo(() => runningStories(campaign), [campaign]);
  const oldest = Math.max(1, ...stories.map((story) => story.weeks ?? 0));
  return (
    <Column gap="sm">
      <Text variant="heading" role="heading" aria-level={2}>Ongoing stories</Text>
      <Text variant="caption" tone="secondary">{stories.length === 0 ? "The press isn't pressing you on anything." : `${stories.length} ${stories.length === 1 ? "story is" : "stories are"} running against you, hottest first.`}</Text>
      {stories.length === 0 ? <Surface level="sunken"><Empty title="No stories are going against you" detail="Nothing is running against you right now." icon="press" /></Surface> : stories.map((story) => <StoryRow key={story.id} story={story} oldest={oldest} />)}
    </Column>
  );
}

function PressPlays({ campaign, acts }: { readonly campaign: Campaign; readonly acts: PressCommit }) {
  const desks = pressDesks(campaign);
  const [desk, setDesk] = useState<string | undefined>(desks[0]?.id);
  const comparison = useMemo(() => pressActComparison(campaign, desk), [campaign, desk]);
  const terms = desks.length > 0 ? <Column gap="2xs"><Text variant="label" tone="secondary">News outlet for an interview or story</Text><Text variant="caption" tone="tertiary">A press conference reaches every news outlet, no matter which one you pick.</Text><Select label="News outlet for an interview or story" value={desk} onChange={setDesk} options={desks.map((entry) => ({ value: entry.id, label: entry.name, visual: <Seal spec={sealFor(entry.id, entry.name)} size={28} /> }))} /></Column> : undefined;
  return (
    <PressAct campaign={campaign} id="press" title="Compare your options" comparison={comparison} acts={acts} cite={PODIUM_AUTHORITY} again="Compare again" terms={terms} packet={(option) => {
      const kind = PRESS_ACTIONS.find((entry) => entry === option);
      if (!kind) throw new Error("Pick an option first.");
      return pressActPacket(campaign, kind, desk);
    }} />
  );
}

/** The law an order rests on, which explaining it does not change. */
function orderCite(campaign: Campaign, recordId: string): string {
  const order = campaign.orders.find((record) => record.id === recordId)?.order;
  const authority = order ? executiveOrder(order)?.authority : undefined;
  return (authority ? orderAuthorityRecord(authority)?.cite : undefined) ?? PODIUM_AUTHORITY;
}

function Framing({ campaign, acts }: { readonly campaign: Campaign; readonly acts: PressCommit }) {
  const offers = framingOffers(campaign);
  const [record, setRecord] = useState<string | undefined>(offers[0]?.id);
  const picked = offers.find((offer) => offer.id === record) ?? offers[0];
  const received = acts.committed?.by === "framing";
  if (!picked && !received) {
    return <Text variant="body" tone="secondary">{framedThisWeek(campaign) ? "You've already explained one order this week." : "There's no order from the last two weeks left to explain."}</Text>;
  }
  const terms = offers.length > 0 ? <Column gap="2xs"><Text variant="label" tone="secondary">Order to explain</Text><Select label="Order to explain" value={picked?.id} onChange={setRecord} options={offers.map((offer) => ({ value: offer.id, label: offer.name, detail: `Signed ${offer.signed}. ${offer.weeksLeft === 0 ? "This is the last week to explain it." : `${offer.weeksLeft} more week${offer.weeksLeft === 1 ? "" : "s"} to explain it.`}` }))} /></Column> : undefined;
  return (
    <PressAct key={picked?.id ?? "framed"} campaign={campaign} id="framing" title={picked ? `Compare how to explain ${picked.name}` : "Compare ways to explain it"} comparison={framingComparison(campaign, picked?.id ?? "")} acts={acts} cite={orderCite(campaign, picked?.id ?? "")} again="Back to orders to explain" terms={terms} packet={(option) => framingPacket(campaign, picked?.id ?? "", option as DecisionFramingKey)} receiptTitle={(column) => `Explained as ${column.label.toLowerCase()}: ${picked?.name ?? "the order"}`} />
  );
}

function TakeTheHit({ campaign, acts }: { readonly campaign: Campaign; readonly acts: PressCommit }) {
  const comparison = useMemo(() => takeTheHitComparison(campaign), [campaign]);
  return <PressAct campaign={campaign} id="hit" title="Compare sending the press secretary" comparison={comparison} acts={acts} cite={PODIUM_AUTHORITY} danger again="Back to Press" packet={() => takeTheHitPacket(campaign)} />;
}

/** Every time the administration went in front of the press, with which way those outings have been running. */
function Outings({ campaign }: { readonly campaign: Campaign }) {
  const trend = pressCoverageTrend(campaign);
  const history = pressHistory(campaign);
  return (
    <Column gap="sm">
      <Text variant="heading" role="heading" aria-level={2}>Your press appearances</Text>
      {trend ? (
        <ReadingFrame title="How your press appearances have gone" unit="How kindly the coverage that followed was" period="Your appearances so far" legend={sparklineKey(trend.tone === "favorable" ? "good" : trend.tone === "adverse" ? "bad" : "neutral")} help={{ meaning: "Each point is one time you or your press secretary faced the press, drawn by how kindly the coverage that followed treated you. The arrow shows which way the appearances have been heading.", term: termDoor("press-briefing", "Press briefing") }}>
          <Row gap="md">
            <Sparkline values={trend.values} valence={trend.tone === "favorable" ? "good" : trend.tone === "adverse" ? "bad" : "neutral"} width={160} height={36} />
            <Text variant="body" tone="secondary" flex={1}>{trend.summary}</Text>
          </Row>
        </ReadingFrame>
      ) : <Text variant="body" tone="secondary">Fewer than two appearances so far, so there is no trend yet.</Text>}
      {history.length === 0 ? <Text variant="caption" tone="secondary">Nobody from your White House has faced the press yet.</Text> : null}
      {history.slice(0, 8).map((row) => (
        <Row key={row.id} gap="sm" top>
          <Tag tone={row.wentWell ? "success" : "danger"} icon={row.wentWell ? "favorable" : "adverse"}>{row.wentWell ? "Went well" : "Went badly"}</Tag>
          <Column flex={1} gap="2xs">
            <Text variant="label">{`${row.play}${row.desk ? ` with ${row.desk}` : ""}`}<Text variant="caption" tone="tertiary">{`  ${row.when}`}</Text></Text>
            <Text variant="caption" tone="secondary">{row.summary}</Text>
          </Column>
        </Row>
      ))}
    </Column>
  );
}

const SHORT_ISSUE: Readonly<Record<Issue, string>> = { week: "Press event", order: "An order", hit: "Take the blame" };

const ISSUES: readonly { readonly value: Issue; readonly label: string }[] = [
  { value: "week", label: "Talk to the press" },
  { value: "order", label: "Explain a recent order" },
  { value: "hit", label: "Let your press secretary take the blame" },
];

/** The one place the President acts on the press: the podium, the stories running, the response compared against saying nothing, and the record of outings. */
export function RespondView({ campaign, acts }: { readonly campaign: Campaign; readonly acts: PressCommit }) {
  const media = useMedia();
  const [issue, setIssue] = useState<Issue>("week");
  const respond = (
    <Column gap="lg" flex={1} minWidth={0}>
      <Text variant="heading" role="heading" aria-level={2}>Respond to the press</Text>
      <Podium campaign={campaign} />
      <Segmented label="What do you want to do?" options={media.wide ? ISSUES : ISSUES.map((issue) => ({ ...issue, label: SHORT_ISSUE[issue.value] }))} value={issue} onChange={setIssue} />
      {issue === "week" ? <PressPlays campaign={campaign} acts={acts} /> : null}
      {issue === "order" ? <Framing campaign={campaign} acts={acts} /> : null}
      {issue === "hit" ? <TakeTheHit campaign={campaign} acts={acts} /> : null}
      <Outings campaign={campaign} />
    </Column>
  );
  return (
    <Row gap="xl" top wrap={!media.desktop}>
      {respond}
      {media.desktop ? (
        <Sticky width={380}>
          <Running campaign={campaign} />
        </Sticky>
      ) : (
        <Column width="100%">
          <Running campaign={campaign} />
        </Column>
      )}
    </Row>
  );
}
