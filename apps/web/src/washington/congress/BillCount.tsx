import type { Bill, Campaign } from "@admin/engine";
import { CHAMBER_TITLE, formatDate, place, type WhipCount } from "@admin/player-core";
import { Card, CardContent, CardHeader, Collection, EvidencePanel, Icon, Tag } from "@admin/ui-web";
import { Door } from "../../shell/Door";
import { CountMeter, RecordedTally } from "./Tally";
import { RollCalls } from "./RollCall";

type Assessment = WhipCount["assessment"][number];

function PublicEvidence({ campaign, assessment }: { readonly campaign: Campaign; readonly assessment: Assessment }) {
  return <EvidencePanel title={`${CHAMBER_TITLE[assessment.chamber]} · public member evidence`} label={`${assessment.members.length} member assessments`}>
    <p>{assessment.provenance}</p><p>As of {formatDate(assessment.asOf)}.</p>
    <Collection items={assessment.members} initial={10} noun="member assessments" className="ledger" render={(member) => <li key={member.seat} className="ledger__row ui-row-target">
      <div className="ledger__head"><Door href={place.person(member.person)} className="ui-row-link text-foreground no-underline hover:no-underline">{campaign.people[member.person]?.base.name ?? "Unrecorded member"}</Door><Tag tone="neutral">{member.seat} · {member.alignment} policy context</Tag></div>
      <p className="ledger__line">{member.basis.join(". ")}. Vote commitment unknown.</p>
      {member.priorVote ? <p className="ledger__line">Recorded related vote: {member.priorVote.yea ? "yea" : "nay"} on {member.priorVote.title}, turn {member.priorVote.turn}.</p> : null}
    </li>} />
    {assessment.lobbying.length ? <section aria-label="Your recorded outreach"><h4>Your recorded outreach</h4>{assessment.lobbying.map((record, index) => <p key={index} className="text-sm">Turn {record.turn}: {record.account}</p>)}</section> : null}
  </EvidencePanel>;
}

/** Unresolved support is a full range, never a fabricated vote prediction. */
export function BillCount({ campaign, bill, whip }: { readonly campaign: Campaign; readonly bill: Bill; readonly whip: WhipCount }) {
  const projected = whip.question !== "recorded";
  return <Card role="region" aria-labelledby="bill-count"><CardHeader><h2 id="bill-count" className="m-0 flex items-center gap-2 text-base font-semibold"><Icon name="ballot" size={18} />{projected ? "Votes ahead" : "How the chambers voted"}</h2></CardHeader><CardContent className="grid gap-4">
    {bill.status === "on-the-desk" ? <RecordedTally votes={bill.passage} heading="Recorded vote on passage" /> : null}
    {projected ? whip.assessment.map((assessment) => <section key={assessment.chamber} className="grid gap-3 border-b border-border pb-4 last:border-0" aria-label={`${CHAMBER_TITLE[assessment.chamber]} public support assessment`}>
      <h3 className="m-0 text-sm font-semibold">{CHAMBER_TITLE[assessment.chamber]} · Support unknown</h3>
      <CountMeter count={{ chamber: assessment.chamber, name: CHAMBER_TITLE[assessment.chamber], yeas: assessment.interval.lower, required: assessment.required, seats: assessment.seats, passed: false }} against={whip.question === "override"} />
      <p className="m-0 text-xs text-muted-foreground">{assessment.interval.lower}–{assessment.interval.upper} unresolved votes.{assessment.clotureRequired ? ` ${assessment.clotureRequired} needed to end debate.` : ""} As of {formatDate(assessment.asOf)}.</p>
      <PublicEvidence campaign={campaign} assessment={assessment} />
    </section>) : <><RecordedTally votes={whip.chambers.map((chamber) => chamber.vote)} />{bill.override?.length ? <RecordedTally votes={bill.override} heading="Recorded vote on the override" /> : null}</>}
    <RollCalls campaign={campaign} bill={bill} />
  </CardContent></Card>;
}
