import type { Bill, Campaign } from "@admin/engine";
import { place, sealFor, type HillPostReading } from "@admin/player-core";
import { Badge, Card, Column, Meter, Page, ReadingFrame, Row, Seal, Text } from "@admin/ui";
import { BackButton } from "../shell/BackButton";
import { MOOD_MARKS, moodFrame } from "./mood";
import { LobbyActs } from "./BillActs";
import { useActCommit } from "./commit";
import { STANCE_METER } from "./Record";
import { Door, Note, Paged, ProjectionBadge } from "./parts";

/** The person, their assessed position and the actual request stay beside the outreach choice. */
export function PostScreen({ campaign, post, bill }: { readonly campaign: Campaign; readonly post: HillPostReading; readonly bill?: Bill }) {
  const acts = useActCommit(campaign);
  return (
    <Page eyebrow={post.chamberName.replace(/^the /, "The ")} icon="subjectChamber" title={post.title} lede={post.brief} emblem={<Seal spec={sealFor(post.chamber === "house" ? "SEAL-HOUSE" : "SEAL-SENATE")} size={64} label={post.chamberName} />} actions={<BackButton parent="/washington/congress" parentLabel="Congress" />}>
      <Row gap="xl" top wrap>
        <Column flex={1} minWidth={280}>
          <Card title="Who holds this post" icon="subjectPerson">
            {post.holderId ? <Door href={place.person(post.holderId)} title={post.name} detail={post.title} icon="subjectPerson" badge={<Badge status="outline">{post.side}</Badge>} /> : (
              <Column gap="2xs">
                <Text variant="title">{post.name}</Text>
                <Text variant="caption" tone="secondary">{post.title}</Text>
                <Row><Badge status="outline">{post.side}</Badge></Row>
              </Column>
            )}
            {post.homeState && post.homeStateName ? <Door href={place.state(post.homeState)} title={post.homeStateName} detail="Their home state" icon="mapPin" /> : null}
          </Card>
        </Column>
        <Column flex={1} minWidth={280}>
          <Card title="How they feel about you" icon="layerLean" actions={<ProjectionBadge />}>
            <ReadingFrame {...moodFrame("Their mood toward you", true)}>
              <Meter label="Their mood toward you" value={post.standing.value} figure={`${post.standing.percent}, ${post.standing.word.toLowerCase()}`} tone={STANCE_METER[post.standing.stance]} marks={MOOD_MARKS} />
            </ReadingFrame>
            <Text variant="caption">{post.following}.</Text>
            <Note tone="tertiary">How they feel about you rubs off on the members they lead. It's a reading of their mood, not a promise of their vote.</Note>
            {post.pending ? <Badge status="info" icon="pending">{post.pending}</Badge> : null}
          </Card>
        </Column>
      </Row>
      <Card title="The request" icon="dossier">
        <Text variant="body">{post.brief}</Text>
        {bill ? <Door href={place.bill(bill.id)} title={bill.title} detail="Open the bill" icon="dossier" /> : <Note>This request isn't about a bill or a nominee. It's about this member and the chamber they lead.</Note>}
      </Card>
      <Card id="post-lobby" title="Reach out to them" icon="summit">
        <LobbyActs campaign={campaign} acts={acts} post={post.id} />
      </Card>
      <Card title={`Past outreach · ${post.history.length}`} icon="record">
        <Paged items={post.history} initial={5} noun="approaches" empty="You haven't reached out to this member yet." render={(row) => (
          <Column key={row.id} gap="2xs" paddingVertical="xs" borderBottomWidth={1} borderColor="borderColor">
            <Row between gap="sm"><Text variant="label">{row.approach}</Text><Badge status={row.landed ? "success" : "danger"} icon={row.landed ? "approve" : "adverse"}>{row.landed ? "Worked" : "Didn't work"}</Badge></Row>
            <Text variant="caption" tone="secondary">{row.when}</Text>
            <Text variant="caption">{row.account}</Text>
          </Column>
        )} />
      </Card>
      {acts.reviewSheet}
    </Page>
  );
}
