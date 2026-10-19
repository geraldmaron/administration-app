import type { Bill, Campaign, ChamberVote } from "@admin/engine";
import { CHAMBER_TITLE, place } from "@admin/player-core";
import { Collection } from "@admin/ui-web";
import { RecordedTally } from "./Tally";
import { Door } from "../../shell/Door";

function RecordedMembers({ campaign, vote, label }: { readonly campaign: Campaign; readonly vote: ChamberVote; readonly label: string }) {
  const rows = vote.rollCall;
  if (!rows) return <p className="hill-note">{label} is a historical tally with no individual roll call.</p>;
  return <section className="hill-roll-detail" aria-label={label}>
    <h4>{label}</h4>
    <RecordedTally votes={[vote]} heading="Recorded member vote" />
    {vote.castingVote ? <p className="hill-note">Vice President <Door href={place.person(vote.castingVote.person)}>{campaign.people[vote.castingVote.person]?.base.name ?? "Unrecorded presiding officer"}</Door>: {vote.castingVote.yea ? "Yea" : "Nay"} casting vote, additional to the senators below.</p> : null}
    <Collection items={rows} initial={12} noun="recorded votes" className="ledger" render={(row) => <li key={row.seat} className="ledger__row ui-row-target">
      <div className="ledger__head"><Door href={place.person(row.person)} className="ui-row-link">{campaign.people[row.person]?.base.name ?? "Unrecorded member"}</Door><strong>{row.yea ? "Yea" : "Nay"}</strong></div>
      <p className="ledger__line">{row.seat}</p>
    </li>} />
  </section>;
}

/** Only stored completed votes are exposed here, never the member-level forecast. */
export function RollCalls({ campaign, bill }: { readonly campaign: Campaign; readonly bill: Bill }) {
  const votes = [
    ...(bill.text?.initialPassage ?? []).map((vote) => ({ vote, label: `${CHAMBER_TITLE[vote.chamber]} initial text` })),
    ...bill.passage.map((vote) => ({ vote, label: `${CHAMBER_TITLE[vote.chamber]} passage` })),
    ...(bill.override ?? []).map((vote) => ({ vote, label: `${CHAMBER_TITLE[vote.chamber]} override` })),
  ].filter(({ vote }) => vote.recordedTurn !== undefined || vote.cloture?.recordedTurn !== undefined);
  if (votes.length === 0) return null;
  return <div className="hill-room">
    <h3 className="hill-subtitle">Recorded roll calls</h3>
    {votes.map(({ vote, label }) => <div key={label}>
      {vote.cloture?.recordedTurn !== undefined ? <RecordedMembers campaign={campaign} vote={vote.cloture} label={`${label}: cloture`} /> : null}
      {vote.recordedTurn !== undefined ? <RecordedMembers campaign={campaign} vote={vote} label={label} /> : null}
    </div>)}
  </div>;
}
