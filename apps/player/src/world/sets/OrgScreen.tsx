import { useState } from "react";
import { place, type OrgCommitment, type OrgMember, type OrgScreenReading } from "@admin/player-core";
import { Pane, Tag, Button, Column, Empty, EntityLink, Field, Icon, Page, ReadingFrame, Row, Select, SealNotice, Text } from "@admin/ui";
import { Segments, StateChip } from "@admin/ui/world";
import { BackButton } from "../../shell/BackButton";
import { CiteById, FlagOf, MapPanelSlot, NationName, RowTo, SealOf, TopicLaw, go, stanceValence } from "../parts";

const COUNTS = [
  { key: "favorable", label: "trust you", valence: "good" },
  { key: "neutral", label: "are neutral", valence: "info" },
  { key: "caution", label: "are wary", valence: "watch" },
  { key: "adverse", label: "are hostile", valence: "bad" },
  { key: "unread", label: "we can't tell", valence: "neutral" },
] as const;

function Alignment({ reading }: { readonly reading: OrgScreenReading }) {
  const { alignment } = reading;
  const valence = alignment.warm >= 0.66 ? "good" : alignment.warm >= 0.4 ? "watch" : "bad";
  return (
    <Pane title="How members feel about you" icon="layerBlocs">
      {alignment.readable > 0 ? (
        <Row gap="sm" wrap>
          <Text variant="figure" tone={valence === "good" ? "success" : valence === "watch" ? "warning" : "danger"}>
            {alignment.counts.favorable + alignment.counts.neutral}
          </Text>
          <Text variant="title" tone="secondary">
            of {alignment.readable}
          </Text>
          <Text variant="body" flex={1} minWidth={200}>
            other members trust you or are neutral. {alignment.word}.
          </Text>
        </Row>
      ) : (
        <Row gap="xs">
          <Icon name="hidden" size={16} tone="colorTertiary" />
          <Text variant="body" tone="secondary">We can't tell yet how these members feel about you, so none of them count as for you or against you.</Text>
        </Row>
      )}
      <ReadingFrame title="Members by how they feel about you" unit="Count of members" help={{ meaning: "The bar splits the members by how they see the United States. Each color's share of the bar is that share of the members, and the key gives the exact counts. Members our intelligence agencies can't read are counted as unknown, not as for or against you." }}>
        <Segments label="Members by how they feel about you" keyed parts={COUNTS.map((entry) => ({ key: entry.key, count: alignment.counts[entry.key], word: entry.label, valence: entry.valence }))} />
      </ReadingFrame>
      {reading.trade ? <Text variant="body" tone="secondary">{reading.trade}</Text> : null}
      {reading.scope ? <Text variant="body" tone="secondary">{reading.scope}</Text> : null}
    </Pane>
  );
}

const MEMBERS_FIRST = 12;

function MemberRow({ member, first }: { readonly member: OrgMember; readonly first: boolean }) {
  return (
    <RowTo first={first} href={place.country(member.nation)} label={`Open ${member.name}'s file`} flexDirection="row" flexWrap="wrap" alignItems="center" gap="sm" paddingVertical="xs" paddingHorizontal="xs">
      <Column flexGrow={1} flexShrink={1} flexBasis={180} minWidth={0}>
        <NationName nation={member.nation} name={member.name} />
      </Column>
      {member.us ? <Tag tone="info">You</Tag> : null}
      {member.atWar ? <Tag tone="danger" icon="conflict">At war</Tag> : null}
      {member.us ? null : <StateChip valence={stanceValence(member.stance)} icon={member.stance === "unread" ? "hidden" : member.stance === "adverse" ? "caution" : member.stance === "favorable" ? "approve" : "neutral"}>{member.word}</StateChip>}
    </RowTo>
  );
}

function Members({ reading }: { readonly reading: OrgScreenReading }) {
  const [all, setAll] = useState(false);
  return (
    <Pane title="Members, by how they feel about you" icon="flag" count={reading.members.length}>
      <Column role="group" aria-label="Members">
        {(all ? reading.members : reading.members.slice(0, MEMBERS_FIRST)).map((member, index) => (
          <MemberRow key={member.nation} member={member} first={index === 0} />
        ))}
      </Column>
      {reading.members.length > MEMBERS_FIRST ? (
        <Button kind="quiet" size="compact" onPress={() => setAll((open) => !open)}>
          {all ? "Show fewer" : `Show all ${reading.members.length} members`}
        </Button>
      ) : null}
    </Pane>
  );
}

function Calls({ reading }: { readonly reading: OrgScreenReading }) {
  if (reading.calls.length === 0) return null;
  return (
    <Pane title="An ally under attack" icon="conflict" band="danger">
      <Column role="group" aria-label="Wars against an ally">
        {reading.calls.map((call, index) => (
          <RowTo key={call.conflict} first={index === 0} href={place.war(call.conflict)} label={`Open the war: ${call.aggressor} against ${call.ally}`} flexDirection="row" flexWrap="wrap" alignItems="center" gap="sm" paddingVertical="sm" paddingHorizontal="xs">
            <Icon name="conflict" size={18} tone="danger" />
            <Text variant="label" flexGrow={1} flexShrink={1}>
              {`${call.aggressor} against ${call.ally}`}
            </Text>
            <StateChip valence={call.answered ? "good" : "watch"} icon={call.answered ? "favorable" : "caution"}>{call.answered ? "Answered" : "Waiting on you"}</StateChip>
            <Icon name="chevron" size={16} tone="colorTertiary" />
          </RowTo>
        ))}
      </Column>
    </Pane>
  );
}

const COMMITMENT_STATUS: Readonly<Record<OrgCommitment["status"], string>> = { proposed: "Proposed", active: "Active", suspended: "Paused", "wound-down": "Ended" };

const COMMITMENTS_FIRST = 8;

/** The treaty text a body's own pledge rests on, where the registry holds it. */
const BODY_LAW: Readonly<Record<string, string>> = { "ORG-NATO": "north-atlantic-treaty-art5" };

function Commitments({ reading }: { readonly reading: OrgScreenReading }) {
  const [all, setAll] = useState(false);
  const body = BODY_LAW[reading.id];
  return (
    <Pane title="Commitments" icon="shield" count={reading.commitments.length} line="The United States has made these promises to this body and its members." actions={body ? <CiteById id={body} compact /> : <TopicLaw topic="treaties" />}>
      {reading.commitments.length === 0 ? (
        <Text variant="body" tone="secondary">The United States hasn't made any promises to this group or its members.</Text>
      ) : (
        (all ? reading.commitments : reading.commitments.slice(0, COMMITMENTS_FIRST)).map((commitment) => (
          <Row key={commitment.id} gap="sm" wrap>
            <Text variant="body" flex={1} minWidth={200}>
              {commitment.line}
            </Text>
            <Tag tone={commitment.status === "active" ? "success" : commitment.status === "suspended" ? "warning" : "outline"}>{COMMITMENT_STATUS[commitment.status]}</Tag>
            <Text variant="caption" tone="secondary">
              {commitment.toward === "body" ? "To the whole group" : "To one member"}
            </Text>
          </Row>
        ))
      )}
      {reading.commitments.length > COMMITMENTS_FIRST ? (
        <Button kind="quiet" size="compact" onPress={() => setAll((open) => !open)}>
          {all ? "Show fewer" : `Show all ${reading.commitments.length}`}
        </Button>
      ) : null}
      <EntityLink label="Open national security" icon="shield" href={place.security()} onPress={() => go(place.security())} />
    </Pane>
  );
}

/** Engaging a member or pledging to one is done on that government's own act workspace, which this opens at the member picked. */
function Engage({ reading, member, onMember }: { readonly reading: OrgScreenReading; readonly member?: string; readonly onMember: (member: string) => void }) {
  const others = reading.members.filter((entry) => !entry.us);
  if (others.length === 0) return null;
  const nation = member ? others.find((entry) => entry.nation === member)?.nation : others[0]?.nation;
  const name = others.find((entry) => entry.nation === nation)?.name;
  return (
    <Pane title="Reach out to a member" icon="summit" line="Diplomacy with this body proceeds through its member governments.">
      <Field label="The member">
        {(control) => <Select {...control} label="The member" value={nation} onChange={onMember} options={others.map((entry) => ({ value: entry.nation as string, label: entry.name, visual: <FlagOf nation={entry.nation} name={entry.name} height={14} /> }))} />}
      </Field>
      {member && !nation ? <Text variant="body" tone="warning" role="status">That country is not a member of this group.</Text> : null}
      {nation && name ? (
        <Row>
          <Button kind="primary" icon="dispatch" onPress={() => go(place.countryAct(nation))}>
            {`Reach out to ${name}`}
          </Button>
        </Row>
      ) : null}
    </Pane>
  );
}

/** An international body: its emblem, its members on the map, how they stand, the United States' seat and what is pledged. */
export function OrgScreen({ reading, member, onMember }: { readonly reading: OrgScreenReading; readonly member?: string; readonly onMember: (member: string) => void }) {
  return (
    <Page title={reading.name} eyebrow={`${reading.kind} · ${reading.members.length} members`} icon="building" lede={reading.usRole} emblem={<SealOf id={reading.id} name={reading.name} size={72} label={`Emblem of the ${reading.name}`} />} actions={<BackButton parent={place.world()} parentLabel="World" />} wide>
      <Calls reading={reading} />
      <Row gap="xl" top wrap>
        <Column flexBasis={420} flexGrow={1} flexShrink={1} minWidth={0} maxWidth="100%" gap="lg">
          <MapPanelSlot title={`The ${reading.name} on the map`} lens={`body:${reading.id}`} camera={`set:${reading.set}`} selection={reading.set} note="Members are highlighted.">
            <Row gap="xs" wrap>
              {reading.members.map((entry) => (
                <FlagOf key={entry.nation} nation={entry.nation} name={entry.name} height={16} />
              ))}
            </Row>
          </MapPanelSlot>
          <Alignment reading={reading} />
        </Column>
        <Column flexBasis={420} flexGrow={1} flexShrink={1} minWidth={0} maxWidth="100%" gap="lg">
          <Members reading={reading} />
        </Column>
      </Row>
      <Commitments reading={reading} />
      <Engage reading={reading} {...(member ? { member } : {})} onMember={onMember} />
      <Pane title={`About the ${reading.name}`} icon="record">
        <Text variant="body">{reading.history}</Text>
        <SealNotice />
      </Pane>
    </Page>
  );
}

export function NoSuchOrg() {
  return (
    <Page title="Organization not found" eyebrow="World · organizations" icon="building" actions={<BackButton parent={place.world()} parentLabel="World" />}>
      <Empty title="The game doesn't track that organization" />
    </Page>
  );
}
