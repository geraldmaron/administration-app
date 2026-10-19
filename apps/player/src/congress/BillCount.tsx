import type { Bill, Campaign, ChamberVote } from "@admin/engine";
import { CHAMBER_TITLE, formatDate, place, type WhipCount } from "@admin/player-core";
import { Card, Column, ReadingFrame, Row, Text } from "@admin/ui";
import { VoteCount } from "@admin/ui/legislature";
import { lineWords } from "./model";
import { Note, Paged, ProjectionBadge, RowLink } from "./parts";
import { PersonName } from "../dossier/PersonPeek";
import { voteFrame } from "./mood";

const ALIGNMENT: Readonly<Record<"favorable" | "adverse" | "mixed" | "unknown", string>> = { favorable: "Leans your way on the issues", adverse: "Leans against you on the issues", mixed: "Mixed on the issues", unknown: "Views on the issues not known" };

const nameOf = (campaign: Campaign, person: string, fallback: string) => campaign.people[person as keyof Campaign["people"]]?.base.name ?? fallback;

function Recorded({ votes, heading }: { readonly votes: readonly ChamberVote[]; readonly heading: string }) {
  if (votes.length === 0) return null;
  return (
    <Column gap="sm">
      <Text variant="eyebrow" tone="secondary">{heading}</Text>
      {votes.map((vote) => (
        <VoteCount key={vote.chamber} name={CHAMBER_TITLE[vote.chamber]} seats={vote.yeas + vote.nays} required={vote.required} requiredLabel={lineWords(vote.required, vote.yeas + vote.nays, heading.includes("override"))} recorded={{ yeas: vote.yeas, nays: vote.nays, passed: vote.passed }} />
      ))}
    </Column>
  );
}

function Members({ campaign, vote, label }: { readonly campaign: Campaign; readonly vote: ChamberVote; readonly label: string }) {
  if (!vote.rollCall) return <Note>{label} was kept as a total only, so there's no list of how each member voted.</Note>;
  return (
    <Column gap="xs">
      <Text variant="label">{label}</Text>
      {vote.castingVote ? <Note>Vice President {nameOf(campaign, vote.castingVote.person, "presiding")} broke a tie by voting {vote.castingVote.yea ? "yea" : "nay"}. That vote is in addition to the senators below.</Note> : null}
      <Paged items={vote.rollCall} initial={12} noun="recorded votes" render={(row) => (
        <RowLink key={row.seat} label={`Open ${nameOf(campaign, row.person, "this member")}'s file. Voted ${row.yea ? "yea" : "nay"}`} href={place.person(row.person)}>
          <Row gap="sm" between>
            <Row gap="xs" flexShrink={1}><PersonName campaign={campaign} id={row.person} name={nameOf(campaign, row.person, "Unknown member")} /><Text variant="caption" tone="secondary">{row.seat}</Text></Row>
            <Text variant="caption" weight="strong" tone={row.yea ? "success" : "danger"}>{row.yea ? "Yea" : "Nay"}</Text>
          </Row>
        </RowLink>
      )} />
    </Column>
  );
}

/** Only stored completed votes are listed member by member, never the member-level forecast. */
function RollCalls({ campaign, bill }: { readonly campaign: Campaign; readonly bill: Bill }) {
  const votes = [
    ...(bill.text?.initialPassage ?? []).map((vote) => ({ vote, label: `${CHAMBER_TITLE[vote.chamber]}, first version` })),
    ...bill.passage.map((vote) => ({ vote, label: `${CHAMBER_TITLE[vote.chamber]}, vote to pass` })),
    ...(bill.override ?? []).map((vote) => ({ vote, label: `${CHAMBER_TITLE[vote.chamber]}, vote to override the veto` })),
  ].filter(({ vote }) => vote.recordedTurn !== undefined || vote.cloture?.recordedTurn !== undefined);
  if (votes.length === 0) return null;
  return (
    <Column gap="md">
      <Text variant="label">How each member voted</Text>
      {votes.map(({ vote, label }) => (
        <Column key={label} gap="sm">
          {vote.cloture?.recordedTurn !== undefined ? <Members campaign={campaign} vote={vote.cloture} label={`${label}, vote to end debate`} /> : null}
          {vote.recordedTurn !== undefined ? <Members campaign={campaign} vote={vote} label={label} /> : null}
        </Column>
      ))}
    </Column>
  );
}

/** Votes ahead as unresolved ranges against the line each chamber needs, or the votes as the Journal recorded them. */
export function BillCount({ campaign, bill, whip }: { readonly campaign: Campaign; readonly bill: Bill; readonly whip: WhipCount }) {
  const projected = whip.question !== "recorded";
  const against = whip.question === "override";
  return (
    <Card title={projected ? "Votes ahead" : "How the chambers voted"} icon="ballot" actions={projected ? <ProjectionBadge /> : undefined}>
      <ReadingFrame {...voteFrame(projected ? "Votes each chamber needs, and what is still open" : "How each chamber voted")}>
      <Column gap="md">
      {bill.status === "on-the-desk" ? <Recorded votes={bill.passage} heading="Vote to pass it" /> : null}
      {projected
        ? whip.assessment.map((assessment) => (
            <Column key={assessment.chamber} gap="sm">
              <VoteCount name={`${CHAMBER_TITLE[assessment.chamber]}${against ? ", to override" : ""}`} seats={assessment.seats} required={assessment.required} requiredLabel={lineWords(assessment.required, assessment.seats, against)} range={assessment.interval} />
              <Note tone="tertiary">
                Anywhere from {assessment.interval.lower} to {assessment.interval.upper} votes, because no one has promised their vote yet.{assessment.clotureRequired ? ` Ending debate takes ${assessment.clotureRequired}.` : ""} Last checked {formatDate(assessment.asOf)}. {assessment.provenance}
              </Note>
              <Paged items={assessment.members} initial={6} noun="members" render={(member) => (
                <RowLink key={member.seat} label={`Open ${nameOf(campaign, member.person, "this member")}'s file`} href={place.person(member.person)}>
                  <Column gap="2xs">
                    <Row gap="sm" between wrap>
                      <PersonName campaign={campaign} id={member.person} name={nameOf(campaign, member.person, "Unknown member")} />
                      <Text variant="caption" tone="secondary">{member.seat} · {ALIGNMENT[member.alignment]}</Text>
                    </Row>
                    <Text variant="caption">{member.basis.join(". ")}. They haven't said how they'll vote.</Text>
                    {member.priorVote ? <Text variant="caption" tone="secondary">On a related bill, they voted {member.priorVote.yea ? "yea" : "nay"} on {member.priorVote.title} in week {member.priorVote.turn}.</Text> : null}
                  </Column>
                </RowLink>
              )} />
              {assessment.lobbying.map((record) => <Note key={`${record.turn}:${record.account}`}>Your outreach in week {record.turn}. {record.account}</Note>)}
            </Column>
          ))
        : (
          <>
            <Recorded votes={whip.chambers.map((chamber) => chamber.vote)} heading="The vote" />
            {bill.override?.length ? <Recorded votes={bill.override} heading="Vote to override the veto" /> : null}
          </>
        )}
      </Column>
      </ReadingFrame>
      <RollCalls campaign={campaign} bill={bill} />
    </Card>
  );
}
