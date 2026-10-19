import { useMemo, useState } from "react";
import type { Campaign, ConflictSide } from "@admin/engine";
import { callComparison, callPacket, endComparison, endPacket, INTENSITY_BANDS, joinComparison, joinPacket, place, type WarAuthorization, type WarCompact, type WarMeter, type WarScreenReading, type WarSide } from "@admin/player-core";
import { Badge, Button, CardGrid, Column, Empty, Icon, Page, ReadingFrame, Row, Surface, Text, Theme, View, useMedia } from "@admin/ui";
import { Beat, Panel, ShareBar, Unread } from "@admin/ui/world";
import { BackButton } from "../../shell/BackButton";
import { ActsReceipt, SetAct, useWorldActs, type WorldActs } from "../acts";
import { topicAuthorities } from "../law";
import { CardTo, FlagOf, MapPanelSlot, NationName, RowTo, splitColumn, TopicLaw } from "../parts";
import { AuthorizationAct, WarPowersSection } from "./WarPowers";

const score = (value: number) => `${Math.round(value * 100)}`;
const SETTLEMENT = { likely: "Likely", close: "Could go either way", unlikely: "Unlikely" } as const;
const sidesOf = (reading: WarScreenReading) => [reading.sides.defender, reading.sides.aggressor];

function Principal({ side }: { readonly side: WarSide }) {
  const principal = side.members.find((member) => member.role === "principal") ?? side.members[0];
  const body = (
    <Column gap="xs" alignItems="center">
      <Text variant="eyebrow" tone="secondary">
        {side.label}
      </Text>
      {principal ? (
        <>
          <FlagOf nation={principal.nation} name={principal.name} height={40} />
          <Text variant="label" textAlign="center">
            {principal.name}
          </Text>
        </>
      ) : (
        <Text variant="label">Main country unknown</Text>
      )}
      <Text variant="caption" tone="secondary">
        {side.members.length} {side.members.length === 1 ? "country" : "countries"} taking part
      </Text>
    </Column>
  );
  if (!principal) return <Column flexGrow={1} flexBasis={140} minWidth={140} padding="sm">{body}</Column>;
  return (
    <CardTo href={place.country(principal.nation)} label={`Open ${principal.name}'s file`} pad="sm" flexGrow={1} flexBasis={140} minWidth={140}>
      {body}
    </CardTo>
  );
}

const INTENSITY_CUTS = INTENSITY_BANDS.filter((band) => band.from > 0);
const INTENSITY_KEY = [{ id: "cuts", kind: "tick" as const, label: `Cuts between ${INTENSITY_BANDS.map((band) => band.word).reverse().join(", ")}, at ${INTENSITY_CUTS.map((band) => Math.round(band.from * 100)).reverse().join(", ")} of 100`, ink: "color" as const }];

/** The intensity bar with the shared ladder's cuts drawn across it, so the word beside the figure can be checked against the mark. */
function IntensityBar({ reading }: { readonly reading: WarScreenReading }) {
  return (
    <Column gap="2xs">
      <View position="relative">
        <ShareBar value={reading.intensity.value} valence={reading.intensity.word === "Intense" ? "bad" : "watch"} label={`How heavy the fighting is: ${reading.intensity.word}. Staff estimate ${score(reading.intensity.value)} of 100`} />
        {INTENSITY_CUTS.map((band) => <View key={band.word} position="absolute" top={-3} left={`${band.from * 100}%`} width={2} height={14} x={-1} backgroundColor="color" aria-hidden />)}
      </View>
    </Column>
  );
}

/** The state of the war on the situation-room surface: who fights whom, how hot, where the United States stands, and for how long. */
function WarOverview({ reading }: { readonly reading: WarScreenReading }) {
  const role = reading.usRole === "outside" ? "Not fighting" : `${reading.usRole === "principal" ? "Main party" : "Joined"} · ${reading.usSide === "defender" ? "defending side" : "attacking side"}`;
  return (
    <Theme name={reading.over ? "paper" : "situation"}>
      <Surface id="war-state" level="base" pad="lg" radius="sheet" role="region" aria-label="State of the war">
        <Column gap="lg">
          <Row between wrap gap="sm">
            <Row gap="sm">
              <Icon name="conflict" size={22} tone="danger" weight="fill" />
              <Text variant="title" role="heading" aria-level={2}>
                State of the war
              </Text>
            </Row>
            <Badge status={reading.over ? "outline" : "danger"}>{reading.statusWord}</Badge>
          </Row>
          <Row gap="md" wrap>
            <Principal side={reading.sides.defender} />
            <Text variant="heading" tone="tertiary" aria-hidden>
              ·
            </Text>
            <Principal side={reading.sides.aggressor} />
          </Row>
          <CardGrid columns={{ phone: 1, tablet: 1, desktop: 3, wide: 3 }} gap="xl">
            <Column gap="xs" flexGrow={1}>
              <Text variant="eyebrow" tone="secondary">
                Fighting intensity
              </Text>
              <Text variant="figure">
                {score(reading.intensity.value)}
                <Text variant="caption" tone="secondary">
                  /100 · {reading.intensity.word}
                </Text>
              </Text>
              <ReadingFrame title="How heavy the fighting is" unit="Staff estimate, 0 to 100" legend={INTENSITY_KEY} help={{ meaning: "The bar fills as the fighting gets heavier. The word is the reading: Held is under 15 of 100, Simmering 15 to 39, Hot 40 to 69 and Intense 70 or more. It is a staff estimate, not a count of the dead and wounded." }}>
                <IntensityBar reading={reading} />
              </ReadingFrame>
            </Column>
            <Column gap="xs" flexGrow={1}>
              <Text variant="eyebrow" tone="secondary">
                United States
              </Text>
              <Text variant="title">{role}</Text>
              <Text variant="caption" tone="tertiary">
                {reading.usRole === "outside" ? "Joining would be a separate decision for you" : "Your decisions and legal authority are below"}
              </Text>
            </Column>
            <Column gap="xs" flexGrow={1}>
              <Text variant="eyebrow" tone="secondary">
                Conflict record
              </Text>
              <Text variant="title">{reading.age || "Began before you took office"}</Text>
              <Text variant="caption" tone="tertiary">
                {reading.beats.length} recorded {reading.beats.length === 1 ? "event" : "events"}
              </Text>
            </Column>
          </CardGrid>
        </Column>
      </Surface>
    </Theme>
  );
}

function SideReading({ meter, label, adverse = false }: { readonly meter: WarMeter | undefined; readonly label: string; readonly adverse?: boolean }) {
  return (
    <Column gap="2xs" flexGrow={1}>
      <Text variant="caption" tone="secondary">
        {label}
      </Text>
      {meter ? (
        <>
          <Text variant="label" weight="strong">
            {score(meter.value)}/100 · {meter.word}
          </Text>
          <ShareBar value={meter.value} valence={adverse ? "watch" : "info"} label={`${label}: staff estimate ${score(meter.value)} of 100, ${meter.word}`} />
        </>
      ) : (
        <Unread>Unknown</Unread>
      )}
    </Column>
  );
}

function SideEvidence({ side }: { readonly side: WarSide }) {
  return (
    <Surface level="raised" pad="md" flexGrow={1} accentEdge={side.side === "aggressor" ? "danger" : "accent"} role="region" aria-label={side.label}>
      <Column gap="md">
        <Text variant="title">{side.label}</Text>
        <ReadingFrame title="War support and war weariness" unit="Staff estimates, 0 to 100" help={{ meaning: "Each bar is a staff estimate from 0 to 100. Support at home reads Firm at 60 or more, Wavering from 35 to 59 and Thin below that. War weariness reads Spent at 60 or more, Wearing from 30 to 59 and Fresh below that. Neither is a poll or the odds of winning." }}>
          <CardGrid columns={{ phone: 1, tablet: 2, desktop: 2, wide: 2 }} gap="lg">
            <SideReading label="War support at home" meter={side.support} />
            <SideReading label="War weariness" meter={side.exhaustion} adverse />
          </CardGrid>
        </ReadingFrame>
        <Column gap="2xs">
          <Text variant="eyebrow" tone="secondary">Losses so far</Text>
          <Text variant="body">{side.casualties ?? "No estimate of losses yet"}</Text>
        </Column>
        <Column role="group" aria-label={`${side.label}: countries`}>
          {side.members.map((member, index) => (
            <RowTo key={member.nation} first={index === 0} href={place.country(member.nation)} label={`Open ${member.name}'s file`} gap="2xs" paddingVertical="xs" paddingHorizontal="xs">
              <Row gap="sm" wrap>
                <NationName nation={member.nation} name={member.name} />
                <Text variant="caption" tone="secondary">
                  {member.role === "principal" ? "Main party" : "Joined"}
                  {member.us ? " · United States" : ""}
                </Text>
              </Row>
              {member.reasons.map((reason) => (
                <Text key={reason} variant="caption" tone="secondary">
                  {reason}
                </Text>
              ))}
              {member.committed.map((line) => (
                <Row key={line} gap="xs">
                  <Icon name="shield" size={14} tone="colorSecondary" />
                  <Text variant="caption" flexShrink={1}>{line}</Text>
                </Row>
              ))}
            </RowTo>
          ))}
        </Column>
        {side.likely.length > 0 ? (
          <Column gap="xs">
            <Text variant="eyebrow" tone="secondary">Countries that may join · staff estimate</Text>
            {side.likely.map((joiner, index) => (
              <RowTo key={joiner.nation} first={index === 0} href={place.country(joiner.nation)} label={`Open ${joiner.name}'s file`} flexDirection="row" alignItems="center" gap="sm" paddingVertical="xs" paddingHorizontal="xs">
                <NationName nation={joiner.nation} name={joiner.name} />
                <Text variant="caption" tone="secondary">
                  {joiner.forecast === "likely" ? "Likely" : "Could go either way"}
                </Text>
              </RowTo>
            ))}
          </Column>
        ) : null}
      </Column>
    </Surface>
  );
}

const BEATS_FIRST = 6;

function History({ reading }: { readonly reading: WarScreenReading }) {
  const beats = [...reading.beats].reverse();
  const [shown, setShown] = useState(BEATS_FIRST);
  return (
    <Panel title="History" icon="record" count={beats.length} lede="Newest first.">
      {beats.length === 0 ? <Empty title="Nothing has happened in this war yet" /> : null}
      {beats.slice(0, shown).map((beat, index) => (
        <Beat key={`${index}-${beat.date}-${beat.description}`} date={beat.date}>
          {beat.description}
        </Beat>
      ))}
      {beats.length > shown ? (
        <Button kind="quiet" size="compact" onPress={() => setShown(beats.length)}>
          {`Show all ${beats.length} events`}
        </Button>
      ) : null}
    </Panel>
  );
}

function Forces({ reading }: { readonly reading: WarScreenReading }) {
  if (reading.forces.length === 0) return <Unread>We don't know of any troop placements here. That doesn't mean either side has no military.</Unread>;
  return (
    <Panel title="Troops in the area" icon="shield" count={reading.forces.length} lede="These are the troop placements we know about. They don't show each side's full strength, and troop numbers are shown as rough ranges.">
      {reading.forces.map((force) => (
        <Row key={force.id} gap="md" wrap paddingVertical="xs" borderTopWidth={1} borderTopColor="borderColor">
          <Column flexBasis={200} flexGrow={1}>
            <Text variant="label">{force.label}</Text>
            <Text variant="caption" tone="secondary">{force.zoneName}</Text>
          </Column>
          <Text variant="caption" width={120}>{force.service ?? "Branch unknown"}</Text>
          <Text variant="caption" width={140}>{force.band ?? "Size unknown"}</Text>
          <Text variant="caption" tone="secondary" width={180}>{force.precision === "installation" ? "Known base" : "General area only"}</Text>
        </Row>
      ))}
    </Panel>
  );
}

type Decide = { readonly campaign: Campaign; readonly reading: WarScreenReading; readonly acts: WorldActs };

function JoinAct({ campaign, reading, acts }: Decide) {
  const comparison = useMemo(() => joinComparison(campaign, reading.id), [campaign, reading.id]);
  if (!comparison) return null;
  return <SetAct title="Join this war or stay out" comparison={comparison} acts={acts} tone="danger" packet={(option) => joinPacket(campaign, reading.id, option as ConflictSide)} receiptTitle={(column) => `${column.label}: troops sent`} law={topicAuthorities("war-powers")} />;
}

function EndAct({ campaign, reading, acts }: Decide) {
  const role = reading.usRole === "joined" ? "joined" : "principal";
  const comparison = useMemo(() => endComparison(campaign, reading.id, role, reading.peace ? reading.peace.forecast : undefined), [campaign, reading.id, role, reading.peace]);
  return <SetAct title={role === "joined" ? "Leave this war or stay in" : "Ways to end this war, or let it go on"} comparison={comparison} acts={acts} packet={(option) => endPacket(campaign, reading.id, option)} receiptTitle={(column) => column.label} law={topicAuthorities("diplomacy").slice(0, 1)} />;
}

function CompactAct({ campaign, reading, compact, acts }: Decide & { readonly compact: WarCompact }) {
  const comparison = useMemo(() => callComparison(campaign, reading.id, compact.org, compact.name, compact.answers), [campaign, reading.id, compact]);
  return <SetAct title={`Call on the ${compact.name} or keep fighting alone`} comparison={comparison} acts={acts} packet={() => callPacket(campaign, compact.org, reading.id)} receiptTitle={() => `${compact.name} called`} law={topicAuthorities("treaties").slice(0, 1)} />;
}

function AuthorizationNote({ authorization }: { readonly authorization: WarAuthorization }) {
  return <Text variant="body" tone="secondary">{authorization.state === "covered" ? `${authorization.title ?? "An authorization"} covers force against ${authorization.name}.` : `Congress is considering a vote to approve force against ${authorization.name}. The vote happens when you continue.`}</Text>;
}

/** Every decision the war offers: entering, asking Congress first, ending it, calling the allies. */
function Decisions({ campaign, reading, acts }: Decide) {
  if (reading.over) return <Unread>This war is over. You can still look back at what happened and who took part, but there are no more decisions to make.</Unread>;
  return (
    <Column gap="lg">
      {reading.usRole === "outside" ? <JoinAct campaign={campaign} reading={reading} acts={acts} /> : null}
      {reading.usRole === "outside" && reading.authorizations.length > 0 ? (
        <Panel title="Asking Congress to approve force" icon="gavel" emblem={<Icon name="subjectCapitol" size={22} tone="gold" />}>
          {reading.authorizations.map((authorization) => (authorization.state === "open" ? <AuthorizationAct key={authorization.nation} campaign={campaign} authorization={authorization} acts={acts} /> : <AuthorizationNote key={authorization.nation} authorization={authorization} />))}
        </Panel>
      ) : null}
      {reading.usRole !== "outside" ? (
        <Column gap="sm">
          {reading.peace ? <Text variant="body">{reading.peace.offered ? `${reading.peace.counterpart} has offered peace terms. ` : ""}{reading.peace.reasoning}</Text> : null}
          <EndAct campaign={campaign} reading={reading} acts={acts} />
        </Column>
      ) : null}
      {reading.compacts.map((compact) => (compact.called ? <Text key={compact.org} variant="body" tone="secondary">The {compact.name} has been asked to help in this war. Each member country gives its answer next week.</Text> : <CompactAct key={compact.org} campaign={campaign} reading={reading} compact={compact} acts={acts} />))}
    </Column>
  );
}

/** A war: its state on the situation-room surface, the sides and their evidence, the forces placed, the decisions and the War Powers clocks, and its history. */
export function WarScreen({ campaign, reading }: { readonly campaign: Campaign; readonly reading: WarScreenReading }) {
  const media = useMedia();
  const acts = useWorldActs(campaign, `set:${reading.set}`);
  return (
    <Page title={reading.title} eyebrow="World · war" icon="conflict" actions={<><BackButton parent={place.world()} parentLabel="World" /><TopicLaw topic="war-powers" /></>} wide>
      <ActsReceipt acts={acts} again="Back to the war" />
      <WarOverview reading={reading} />
      <Row gap="xl" top wrap={!media.desktop}>
        <Column {...splitColumn(media.desktop, 1)}>
          <MapPanelSlot title="Where the war is and who's in it" lens={acts.committed ? "delta" : `sides:${reading.id}`} marks="forces" camera={`set:${reading.set}`} selection={reading.set} note="Each side has its own color. The map shows who's taking part and where troops are, not the front line or who holds what ground.">
            {sidesOf(reading).map((side) => (
              <Row key={side.side} gap="xs" wrap>
                <Text variant="label" width={140}>{side.label}</Text>
                {side.members.map((member) => <FlagOf key={member.nation} nation={member.nation} name={member.name} height={16} />)}
              </Row>
            ))}
          </MapPanelSlot>
        </Column>
        <Column {...splitColumn(media.desktop, 1)}>
          <Panel title="Why it started and how it might end" icon="review">
            <Text variant="eyebrow" tone="secondary">Cause</Text>
            <Text variant="body">{reading.cause}</Text>
            <Text variant="eyebrow" tone="secondary">Chance of a peace deal · staff estimate</Text>
            {reading.peace ? <Text variant="body"><Text variant="body" weight="strong">{SETTLEMENT[reading.peace.forecast]}. </Text>{reading.peace.offered ? `${reading.peace.counterpart} has offered peace terms. ` : ""}{reading.peace.reasoning}</Text> : <Text variant="body" tone="secondary">Your staff can't yet say whether this war is likely to end in a deal.</Text>}
          </Panel>
        </Column>
      </Row>
      <Panel title="The parties" icon="shield" lede="Support and war weariness are your staff's estimates, from 0 to 100. They aren't polls, military strength, or the odds of winning. If our intelligence agencies can't read a side, it shows as unknown.">
        <CardGrid columns={{ phone: 1, tablet: 1, desktop: 2, wide: 2 }} gap="lg">
          {sidesOf(reading).map((side) => <SideEvidence key={side.side} side={side} />)}
        </CardGrid>
      </Panel>
      <Forces reading={reading} />
      <Panel id="war-join" title="Your decisions" icon="order" lede="What you do in the war and what Congress approves are separate. Each choice shows what it changes from today, and you'll review it before it goes through." aside={<TopicLaw topic="war-powers" />}>
        <Decisions campaign={campaign} reading={reading} acts={acts} />
      </Panel>
      <WarPowersSection campaign={campaign} papers={reading.papers} acts={acts} />
      <History reading={reading} />
    </Page>
  );
}

export function NoSuchWar() {
  return (
    <Page title="No such war" eyebrow="World · war" icon="conflict" actions={<BackButton parent={place.world()} parentLabel="World" />}>
      <Empty title="We couldn't find that war" />
    </Page>
  );
}
