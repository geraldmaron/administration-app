import { useMemo } from "react";
import type { Campaign } from "@admin/engine";
import { caseFile, caseProcess, place, sealFor, type CaseFile } from "@admin/player-core";
import { Badge, Card, Column, OpinionPaper, Page, Row, Seal, Stamp, Text, View } from "@admin/ui";
import { fileNumber } from "@admin/ui/dossier";
import { Authority } from "../congress/ActChooser";
import { useActCommit } from "../congress/commit";
import { Missing } from "../congress/Missing";
import { Door, MainAndRail, Note, RowLink } from "../congress/parts";
import { PersonName } from "../dossier/PersonPeek";
import { BackButton } from "../shell/BackButton";
import { CasePath, Identity, Issue, LowerBench, MatterDetails, Related, ReviewActions } from "./CaseParts";
import { StrikeMeter } from "./Docket";
import { LAW, caseStatusWords, dueWords, forumOf, forumSeal } from "./model";

function holdingLine(file: CaseFile): string {
  const verb = file.status === "struck-down" ? "struck down" : "upheld";
  if (file.dismissedAtThreshold) return "The court dismissed the challenge without deciding whether the order was lawful.";
  if (file.appeal === "equally-divided") return `The Supreme Court divided evenly, so the lower court's judgment ${file.status === "struck-down" ? "striking down" : "upholding"} the challenged action stands. The Supreme Court did not decide the question.`;
  if (file.subject?.kind === "fair-housing-enforcement") return `The provider-specific claim was ${file.status === "struck-down" ? "proved" : "not proved"}.`;
  if (file.subject?.kind === "wage-hour-enforcement") return "The named employer owes worker-specific overtime and liquidated damages.";
  if (file.subject?.kind === "unlawful-surveillance") return "The aggrieved person's §1810 damages claim was proved.";
  if (file.endReason) return `The court ${verb} the order${file.split ? `, ${file.split}` : ""}. The order no longer has any effect.`;
  return `The order is ${verb}${file.split ? `, ${file.split}` : ""}.`;
}

/** The ruling as an issued page under the forum's seal when decided; the open question and the staff projection when not. */
function Holding({ file }: { readonly file: CaseFile }) {
  if (file.status === "pending") {
    return (
      <Card title="The open question" icon="pending">
        <Text variant="body">{file.question}</Text>
        {file.strikeChance !== undefined ? <StrikeMeter chance={file.strikeChance} caption={dueWords(file)} /> : null}
        <Note>{file.lower ? (file.lower.enforcement === "in-force" ? "The lower court's ruling blocks the order for now. Asking a higher court to review it doesn't pause that ruling." : "A lower court has ruled, but its ruling is paused during the appeal. There's no final decision yet.") : "No court has ruled yet. Your staff's estimate isn't a ruling, and it can change when the justices or the laws change."}</Note>
      </Card>
    );
  }
  const statutory = file.subject?.kind === "statutory-authority";
  const status = caseStatusWords(file);
  const relief = statutory && file.relief ? (file.relief === "statutory-construction" ? " The Supreme Court narrows this bill's named authorization for the production-priority order. Other provisions remain in force." : " Relief applies only to the named plaintiff suppliers. The national statutory grant remains in force.") : "";
  const judge = (name: string): string => `${file.forum === "supreme" || file.forum === undefined ? "Justice" : "Judge"} ${name.trim().split(/\s+/).at(-1) ?? name}`;
  const opinion = !statutory && file.opinion ? { text: file.opinion.majority, forCourt: file.forum !== "lower" && file.appeal !== "equally-divided", ...(file.majorityAuthor ? { author: judge(file.majorityAuthor) } : {}) } : undefined;
  return (
    <OpinionPaper
      court={forumOf(file)}
      {...(file.forum === "supreme" || file.forum === undefined ? { term: termOf(file.ruled) } : {})}
      docket={docketOf(file.id, file.ruled)}
      caption={`In re ${file.orderName}`}
      decided={`Decided ${file.ruled ?? "on a date not recorded"}`}
      holding={`${statutory ? (file.opinion?.majority ?? holdingLine(file)) : holdingLine(file)}${relief}`}
      {...(opinion ? { opinion } : {})}
      {...(!statutory && file.opinion?.dissent ? { dissent: { text: file.opinion.dissent, ...(file.dissentAuthor ? { author: judge(file.dissentAuthor) } : {}) } } : {})}
      stamp={<Stamp tone={status.status === "danger" ? "refused" : status.status === "success" ? "law" : "pending"}>{status.label}</Stamp>}
    />
  );
}

const yearOf = (date: string | undefined): number | undefined => {
  const match = date ? /(\d{4})/.exec(date) : null;
  return match ? Number(match[1]) : undefined;
};

/** The Court sits in terms that open in October, so a ruling in March 2030 belongs to October Term, 2029. */
function termOf(ruled: string | undefined): string {
  const year = yearOf(ruled);
  if (year === undefined) return "October Term";
  const autumn = ruled ? /^(October|November|December)/.test(ruled) : false;
  return `October Term, ${autumn ? year : year - 1}`;
}

/** A docket number that stays the same for the same case: "No. 29–4417". */
function docketOf(id: string, ruled: string | undefined): string {
  const year = yearOf(ruled);
  return `No. ${year === undefined ? "" : `${String(year % 100).padStart(2, "0")}–`}${fileNumber(id).slice(-4)}`;
}

const personIdOf = (href: string | undefined): string | undefined => {
  const match = href ? /\/person\/([^/?]+)/.exec(href) : null;
  return match ? decodeURIComponent(match[1]!) : undefined;
};

/** One justice's vote: the whole row opens their file when there is one. */
function JusticeVote({ campaign, vote }: { readonly campaign: Campaign; readonly vote: CaseFile["votes"][number] }) {
  const verdict = vote.vote === "strike" ? "Strike down" : "Uphold";
  const body = (
    <Row between gap="sm">
      <PersonName campaign={campaign} id={personIdOf(vote.href)} name={vote.name} role="Justice of the Supreme Court" />
      <Badge status={vote.vote === "strike" ? "danger" : "success"} icon={vote.vote === "strike" ? "statusBlocked" : "statusIssued"}>{verdict}</Badge>
    </Row>
  );
  return vote.href ? <RowLink label={`Open ${vote.name}'s file. Voted to ${verdict.toLowerCase()}`} href={vote.href}>{body}</RowLink> : <View padding="sm">{body}</View>;
}

/** The nine seats as they voted on this case: each recorded vote filled by its direction, a seat with no recorded vote hollow, never guessed. */
function BenchPositions({ campaign, file }: { readonly campaign: Campaign; readonly file: CaseFile }) {
  const bySeat = new Map(file.votes.map((vote) => [vote.seat, vote]));
  const seats = [...new Set([...Array.from({ length: 9 }, (_, index) => index + 1), ...file.votes.map((vote) => vote.seat)])].sort((a, b) => a - b);
  const strikes = file.votes.filter((vote) => vote.vote === "strike").length;
  const pendingWords = ["fair-housing-enforcement", "state-election-access", "wage-hour-enforcement", "unlawful-surveillance"].includes(file.subject?.kind ?? "") ? "This case is in a lower federal court. The Supreme Court hasn't scheduled a vote on it." : file.stage === "circuit-merits" || (file.circuit && file.stage !== "supreme-merits") ? "The appeals judges' votes show up here when they rule. The Supreme Court hasn't agreed to take the case." : file.stage === "supreme-merits" ? "Each justice's vote shows up here on the day the Supreme Court rules." : "The Supreme Court hasn't scheduled a vote on this case yet.";
  return (
    <Card title="How the justices voted" icon="gavel">
      {file.status === "pending" ? <><Note>{pendingWords}</Note><Door href={place.courts()} title="See the justices" icon="court" /></> : file.votes.length === 0 ? <Note>{file.forum === "lower" || file.forum === "circuit" ? "The Supreme Court didn't vote on this case." : "This older ruling didn't keep each justice's vote."}</Note> : (
        <>
          <Row gap="xs" aria-hidden>
            {seats.map((seat) => {
              const vote = bySeat.get(seat)?.vote;
              return <View key={seat} width={26} height={26} borderRadius="pill" borderWidth={2} borderColor={vote === "strike" ? "danger" : vote === "uphold" ? "successInk" : "borderColorStrong"} backgroundColor={vote === "strike" ? "danger" : vote === "uphold" ? "successInk" : "transparent"} />;
            })}
          </Row>
          <Text variant="caption">{strikes} to strike down, {file.votes.length - strikes} to uphold{seats.length > file.votes.length ? `, ${seats.length - file.votes.length} with no vote on record` : ""}. At least six justices have to take part for the Court to rule. {file.votes.length >= 6 ? "This ruling had enough." : "This record shows fewer than six."}</Text>
          {file.votes.map((vote) => (
            <JusticeVote key={vote.seat} campaign={campaign} vote={vote} />
          ))}
        </>
      )}
    </Card>
  );
}

/** One case: where it stands and what governs, the answer owed, the record, the holding or pending question, the bench and the history. */
export function CaseScreen({ campaign, id }: { readonly campaign: Campaign; readonly id: string }) {
  const file = useMemo(() => caseFile(campaign, id), [campaign, id]);
  const process = useMemo(() => caseProcess(campaign, id), [campaign, id]);
  const acts = useActCommit(campaign);
  if (!file) return <Missing eyebrow="Courts" title="Case not found" line="We couldn't find a case with that name about any of your orders." back="/washington/courts" backLabel="Courts" />;
  const status = caseStatusWords(file);
  return (
    <Page eyebrow="Federal court case" icon="court" title={file.orderName} lede={file.question} emblem={<Seal spec={sealFor(forumSeal(file))} size={64} label={forumOf(file)} />} actions={<BackButton parent={`${place.courts()}?view=docket`} parentLabel="All cases" />}>
      <Row gap="sm" wrap>
        <Badge status={status.status} icon="gavel">{status.label}</Badge>
        <Badge status="outline" icon="record">{`Case number · ${file.id}`}</Badge>
        <Authority cite={LAW.limits} compact />
      </Row>
      {process ? <CasePath process={process} contested={file.matter?.authority ?? file.orderName} ground={file.groundWords} /> : null}
      <ReviewActions campaign={campaign} id={file.id} acts={acts} />
      <MainAndRail
        main={<>
          {file.matter ? <MatterDetails file={file} /> : <><Identity file={file} /><Issue file={file} /></>}
          <LowerBench campaign={campaign} file={file} />
        </>}
        rail={<Column gap="xl" width="100%">
          <Holding file={file} />
          <BenchPositions campaign={campaign} file={file} />
          {file.matter ? null : <Related file={file} />}
        </Column>}
      />
      <Card title="What's happened so far" icon="record">
        {file.timeline.map((moment) => (
          <Row key={moment.date + moment.text} gap="md" top paddingVertical="2xs" borderBottomWidth={1} borderColor="borderColor">
            <Text variant="caption" weight="strong" minWidth={120}>{moment.date}</Text>
            <Text variant="caption" flex={1}>{moment.text}</Text>
          </Row>
        ))}
      </Card>
      {acts.reviewSheet}
    </Page>
  );
}
