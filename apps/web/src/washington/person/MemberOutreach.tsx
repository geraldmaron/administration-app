import { useState } from "react";
import { availableIssueBrokers, issueMemberOutreach, selectBillsInProgress, type Campaign } from "@admin/engine";
import { type PersonFile, type PricedOption } from "@admin/player-core";
import { Field } from "@admin/ui-web";
import type { PersonId } from "@admin/world";
import { ActCompare } from "../executive/ActCompare";
import type { useChairActs } from "../executive/acts";

/** The existing person desk authorizes a conversation, not an invented promise of a vote. */
export function MemberOutreach({ campaign, file, acts }: { readonly campaign: Campaign; readonly file: PersonFile; readonly acts: ReturnType<typeof useChairActs> }) {
  const bills = selectBillsInProgress(campaign);
  const [billId, setBillId] = useState(bills[0]?.id ?? "");
  const [broker, setBroker] = useState("");
  if (!campaign.congress.members?.some((member) => member.person === file.person.id) || !campaign.people[file.person.id]?.alive) return null;
  const bill = campaign.bills[billId];
  const brokers = bill ? availableIssueBrokers(campaign, bill).filter((id) => id !== file.person.id) : [];
  const validBroker = brokers.includes(broker as PersonId) ? broker as PersonId : undefined;
  const prepared = bill ? issueMemberOutreach(campaign, file.person.id, bill.id, validBroker) : undefined;
  const options: readonly PricedOption[] = [
    { id: "request", label: validBroker ? "Authorize a broker's coalition effort" : "Ask the member directly", ...(prepared?.ok ? { price: { cost: { standing: validBroker ? -0.02 : -0.01 }, risks: [] }, follows: [validBroker ? "Uses both outreach slots today. Responses are due in three days." : "Uses one of two outreach slots today. A response is due tomorrow.", "Member support remains unknown until recorded; accepted dialogue does not guarantee a vote."] } : { unavailable: prepared?.reason ?? "Choose a live bill first." }) },
  ];
  return <section className="exec-acts" aria-labelledby="member-outreach">
    <h2 id="member-outreach" className="exec__heading">Legislative outreach</h2>
    <Field label="Proposal">{(control) => <select {...control} className="ui-input" value={billId} onChange={(event) => { setBillId(event.target.value); setBroker(""); }}><option value="">Choose a bill</option>{bills.map((entry) => <option key={entry.id} value={entry.id}>{entry.title}</option>)}</select>}</Field>
    <Field label="Route" hint="A broker can approach recorded issue contacts; each person makes an independent choice.">{(control) => <select {...control} className="ui-input" value={broker} onChange={(event) => setBroker(event.target.value)}><option value="">Direct presidential call</option>{brokers.map((id) => <option key={id} value={id}>{campaign.people[id]?.base.name}</option>)}</select>}</Field>
    <ActCompare campaign={campaign} title="Ask for their support" options={options} verbs={{ request: "Authorize outreach" }} busy={acts.busy} onAuthorize={() => void acts.run(`Outreach to ${file.person.name}`, () => issueMemberOutreach(campaign, file.person.id, billId, validBroker), { tier: "confirm", title: `Request ${file.person.name}'s support` }, [{ label: "Proposal", value: bill?.title ?? "" }])} />
  </section>;
}
